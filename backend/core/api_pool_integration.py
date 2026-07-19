"""
API Pool Integration - 集成 API 池到登錄流程

這個模塊提供：
1. 自動分配 API 的輔助函數
2. 登錄成功/失敗時的 API 池更新
3. 與現有 main.py 的無縫集成
4. 智能錯誤處理和重試策略
5. 🆕 雙池支持：先 API 池，再代理池

使用方式：
    from core.api_pool_integration import get_api_for_login, report_login_result
    
    # 登錄前
    api = get_api_for_login(phone, use_platform_api=True)
    if api:
        api_id = api.api_id
        api_hash = api.api_hash
    
    # 登錄後
    report_login_result(phone, success=True)
"""

import sys
import time
from typing import Optional, Dict, Any, Tuple

# 🆕 優先使用 SQLite 基礎的 API 池管理器（admin/api_pool.py）
_use_sqlite_api_pool = False
try:
    from admin.api_pool import get_api_pool_manager as get_sqlite_api_pool
    _use_sqlite_api_pool = True
    print("[ApiPoolIntegration] Using SQLite-based API pool manager", file=sys.stderr)
except ImportError:
    get_sqlite_api_pool = None

# 回退到舊的內存 API 池
from core.api_pool import (
    get_api_pool,
    ApiCredential,
    ApiPoolManager
)

# 導入錯誤處理器
try:
    from core.login_error_handler import (
        get_error_handler,
        analyze_login_error,
        format_error_response,
        ErrorInfo,
        ErrorCategory,
        RetryStrategy
    )
except ImportError:
    get_error_handler = None
    analyze_login_error = None
    format_error_response = None
    ErrorInfo = None
    ErrorCategory = None
    RetryStrategy = None

# 導入告警服務
try:
    from core.api_alerts import get_alert_service
except ImportError:
    get_alert_service = None


# 緩存：記錄每個手機號使用的 API
_phone_api_map: Dict[str, str] = {}

# 🛡️ Stage：QR 登入從 API 池成功分配的次數（自後端啟動起累計，重啟後歸零）
# 用途：在決定是否默認開啟 TG_QR_USE_API_POOL 前，先觀察小流量下 QR 登入
# 走池分配的實際發生次數是否符合預期，作為「該不該把默認值改成開」的觀測依據。
_qr_pool_allocation_count: int = 0


def record_qr_pool_allocation() -> None:
    """QR 登入成功從平台 API 池分配到專屬憑據時調用，供可觀測性統計使用。"""
    global _qr_pool_allocation_count
    _qr_pool_allocation_count += 1


def get_qr_pool_allocation_count() -> int:
    """獲取 QR 登入從池分配成功的累計次數（自啟動起）。"""
    return _qr_pool_allocation_count


def get_api_for_login(
    phone: str,
    use_platform_api: bool = False,
    provided_api_id: Optional[str] = None,
    provided_api_hash: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], str]:
    """
    為登錄獲取 API 憑據（雙池策略：優先使用 SQLite API 池）
    
    Args:
        phone: 手機號
        use_platform_api: 是否使用平台 API 池
        provided_api_id: 用戶提供的 API ID（如果有）
        provided_api_hash: 用戶提供的 API Hash（如果有）
    
    Returns:
        (api_id, api_hash, source) 元組
        - source: 'user' | 'platform' | 'platform_sqlite' | 'fallback'
    """
    # 如果用戶提供了 API，優先使用
    if provided_api_id and provided_api_hash:
        print(f"[ApiPoolIntegration] 使用用戶提供的 API: {provided_api_id}", file=sys.stderr)
        return (provided_api_id, provided_api_hash, 'user')
    
    # 如果請求使用平台 API
    if use_platform_api:
        # 🆕 優先使用 SQLite API 池
        if _use_sqlite_api_pool and get_sqlite_api_pool:
            try:
                sqlite_pool = get_sqlite_api_pool()
                success, msg, result = sqlite_pool.allocate_api(account_phone=phone)
                
                if success and result:
                    api_id = result['api_id']
                    api_hash = result['api_hash']
                    _phone_api_map[phone] = api_id
                    print(f"[ApiPoolIntegration] 從 SQLite API 池分配: {api_id} -> {phone}", file=sys.stderr)
                    return (api_id, api_hash, 'platform_sqlite')
                else:
                    print(f"[ApiPoolIntegration] SQLite API 池分配失敗: {msg}", file=sys.stderr)
            except Exception as e:
                print(f"[ApiPoolIntegration] SQLite API 池錯誤: {e}", file=sys.stderr)
        
        # 回退到內存 API 池
        pool = get_api_pool()
        api = pool.allocate_api(phone)
        
        if api:
            # 記錄手機號和 API 的關聯
            _phone_api_map[phone] = api.api_id
            print(f"[ApiPoolIntegration] 從內存 API 池分配: {api.api_id} -> {phone}", file=sys.stderr)
            return (api.api_id, api.api_hash, 'platform')
        else:
            # 池為空時使用 Telegram Desktop 公共 API 作為後備（與前端 usePlatformApi 一致）
            print(f"[ApiPoolIntegration] 平台池為空，使用 Telegram Desktop 公共 API", file=sys.stderr)
            fallback_id = '2040'
            fallback_hash = 'b18441a1ff607e10a989891a5462e627'
            _phone_api_map[phone] = fallback_id
            return (fallback_id, fallback_hash, 'fallback')
    
    # 既沒有用戶 API 也不使用平台 API
    print(f"[ApiPoolIntegration] ⚠️ 未指定 API 來源", file=sys.stderr)
    return (None, None, 'none')


def report_login_success(phone: str):
    """
    報告登錄成功
    
    Args:
        phone: 手機號
    """
    api_id = _phone_api_map.get(phone)
    if api_id:
        # 🆕 同時報告給 SQLite API 池
        if _use_sqlite_api_pool and get_sqlite_api_pool:
            try:
                sqlite_pool = get_sqlite_api_pool()
                sqlite_pool.report_success(api_id)
            except Exception as e:
                print(f"[ApiPoolIntegration] SQLite 報告成功錯誤: {e}", file=sys.stderr)
        
        pool = get_api_pool()
        pool.report_success(api_id)
        print(f"[ApiPoolIntegration] 登錄成功報告: {phone} -> API {api_id}", file=sys.stderr)


def report_login_error(phone: str, error: str) -> Dict[str, Any]:
    """
    報告登錄失敗
    
    Args:
        phone: 手機號
        error: 錯誤信息
    
    Returns:
        處理後的錯誤信息（包含重試建議）
    """
    api_id = _phone_api_map.get(phone)
    
    # 分析錯誤
    error_info = None
    if analyze_login_error:
        error_info = analyze_login_error(error, phone)
        print(f"[ApiPoolIntegration] 錯誤分析: {error_info.category.value} - {error_info.user_message}", 
              file=sys.stderr)
    
    # 報告給 API 池
    if api_id:
        pool = get_api_pool()
        pool.report_error(api_id, error, phone)
        print(f"[ApiPoolIntegration] 登錄失敗報告: {phone} -> API {api_id}: {error}", file=sys.stderr)
        
        # 如果錯誤建議切換 API，嘗試切換
        if error_info and error_info.should_switch_api:
            print(f"[ApiPoolIntegration] 建議切換 API，嘗試分配新的 API", file=sys.stderr)
            # 釋放當前 API
            pool.release_api(api_id)
            _phone_api_map.pop(phone, None)
    
    # 觸發告警（如果是嚴重錯誤）
    if error_info and get_alert_service and api_id:
        alert_service = get_alert_service()
        if error_info.category in [ErrorCategory.API_INVALID, ErrorCategory.API_DISABLED]:
            alert_service.alert_api_unhealthy(api_id, error)
    
    # 返回格式化的錯誤信息
    if format_error_response:
        return format_error_response(error, phone)
    
    return {'success': False, 'error': error}


def release_api_for_phone(phone: str):
    """
    釋放手機號佔用的 API 資源
    
    Args:
        phone: 手機號
    """
    api_id = _phone_api_map.pop(phone, None)
    if api_id:
        # 🆕 同時從 SQLite API 池釋放
        if _use_sqlite_api_pool and get_sqlite_api_pool:
            try:
                sqlite_pool = get_sqlite_api_pool()
                sqlite_pool.release_api(phone)
            except Exception as e:
                print(f"[ApiPoolIntegration] SQLite 釋放 API 錯誤: {e}", file=sys.stderr)
        
        pool = get_api_pool()
        pool.release_api(api_id)
        print(f"[ApiPoolIntegration] 釋放 API: {phone} -> {api_id}", file=sys.stderr)


def get_api_for_phone(phone: str) -> Optional[str]:
    """
    獲取手機號當前使用的 API ID
    
    Args:
        phone: 手機號
    
    Returns:
        API ID 或 None
    """
    return _phone_api_map.get(phone)


def bind_phone_to_api(phone: str, api_id: str):
    """
    手動綁定手機號和 API
    
    Args:
        phone: 手機號
        api_id: API ID
    """
    _phone_api_map[phone] = api_id
    print(f"[ApiPoolIntegration] 手動綁定: {phone} -> {api_id}", file=sys.stderr)


# ==================== 用於 main.py 集成的包裝函數 ====================

def process_login_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    處理登錄請求的 payload，自動填充 API 憑據和代理（雙池分配）
    
    登錄流程：
    1. 先從 API 對接池獲取 api_id + api_hash
    2. 再從代理池獲取獨立 IP（如果啟用）
    3. 每個帳號 = 一組 API + 一個 IP，雙重隔離
    
    Args:
        payload: 原始請求 payload
    
    Returns:
        處理後的 payload（包含 API 憑據和代理）
    """
    phone = payload.get('phone', '')
    use_platform_api = payload.get('usePlatformApi', False)
    provided_api_id = payload.get('apiId')
    provided_api_hash = payload.get('apiHash')
    
    # ========== Step 1: 從 API 對接池獲取憑據 ==========
    api_id, api_hash, source = get_api_for_login(
        phone=phone,
        use_platform_api=use_platform_api,
        provided_api_id=provided_api_id,
        provided_api_hash=provided_api_hash
    )
    
    # 更新 payload
    if api_id and api_hash:
        payload['apiId'] = api_id
        payload['apiHash'] = api_hash
        payload['_api_source'] = source
        print(f"[ApiPoolIntegration] Step 1 完成: API 分配 {api_id} -> {phone}", file=sys.stderr)
    elif source == 'none' and use_platform_api:
        # 平台 API 池為空，返回錯誤
        payload['_api_error'] = 'API 池暫時無可用資源，請稍後重試或使用自己的 API'
        return payload
    
    # ========== Step 2: 從代理池獲取獨立 IP ==========
    # 只有當未提供代理時才自動分配
    if not payload.get('proxy') and payload.get('useProxyPool', True):
        try:
            from admin.proxy_pool import get_proxy_pool
            proxy_pool = get_proxy_pool()
            
            # 先檢查是否已有綁定的代理
            existing_proxy = proxy_pool.get_proxy_for_account(phone=phone)
            if existing_proxy:
                payload['proxy'] = existing_proxy.to_url()
                payload['_proxy_source'] = 'existing'
                print(f"[ApiPoolIntegration] Step 2 完成: 使用已綁定代理 -> {phone}", file=sys.stderr)
            else:
                # 分配新代理（account_id 暫時使用手機號作為標識）
                account_id = payload.get('account_id', phone)
                assigned_proxy = proxy_pool.assign_proxy_to_account(
                    account_id=str(account_id),
                    phone=phone
                )
                if assigned_proxy:
                    payload['proxy'] = assigned_proxy.to_url()
                    payload['_proxy_source'] = 'pool'
                    print(f"[ApiPoolIntegration] Step 2 完成: 代理分配 {assigned_proxy.host}:{assigned_proxy.port} -> {phone}", file=sys.stderr)
                else:
                    # 代理池為空，記錄警告但不阻止登錄
                    print(f"[ApiPoolIntegration] Step 2 跳過: 代理池無可用代理，將使用直連", file=sys.stderr)
                    payload['_proxy_warning'] = '代理池無可用資源，將使用直連（風控風險較高）'
        except ImportError:
            print(f"[ApiPoolIntegration] Step 2 跳過: 代理池模塊未載入", file=sys.stderr)
        except Exception as e:
            print(f"[ApiPoolIntegration] Step 2 錯誤: {e}", file=sys.stderr)
    else:
        print(f"[ApiPoolIntegration] Step 2 跳過: 已提供代理或禁用代理池", file=sys.stderr)
    
    return payload


def handle_login_callback(phone: str, success: bool, error: str = None):
    """
    處理登錄回調
    
    Args:
        phone: 手機號
        success: 是否成功
        error: 錯誤信息（如果失敗）
    """
    if success:
        report_login_success(phone)
    else:
        report_login_error(phone, error or 'Unknown error')


# ==================== API 池管理命令 ====================

async def add_api_to_pool(
    api_id: str,
    api_hash: str,
    name: str = "",
    max_accounts: int = 15
) -> Dict[str, Any]:
    """
    添加 API 到池中（管理員操作）
    
    Args:
        api_id: API ID
        api_hash: API Hash
        name: API 名稱
        max_accounts: 最大賬號數
    
    Returns:
        結果字典
    """
    pool = get_api_pool()
    
    # 檢查是否已存在
    existing = pool.get_api(api_id)
    if existing:
        return {
            'success': False,
            'error': f'API {api_id} 已存在'
        }
    
    api = pool.add_api(
        api_id=api_id,
        api_hash=api_hash,
        name=name,
        max_accounts=max_accounts
    )
    
    return {
        'success': True,
        'api': api.to_dict()
    }


async def remove_api_from_pool(api_id: str) -> Dict[str, Any]:
    """
    從池中移除 API（管理員操作）
    """
    pool = get_api_pool()
    success = pool.remove_api(api_id)
    
    return {
        'success': success,
        'error': None if success else f'API {api_id} 不存在'
    }


async def get_pool_status() -> Dict[str, Any]:
    """
    獲取 API 池狀態

    🛡️ 附帶回傳 qr_allocations_since_startup：QR 登入從池分配成功的累計次數，
    供管理後台在評估「是否默認開啟 TG_QR_USE_API_POOL」時作為觀測指標。
    """
    pool = get_api_pool()
    status = pool.get_pool_status()
    try:
        status['qr_allocations_since_startup'] = get_qr_pool_allocation_count()
    except Exception:
        pass
    return status

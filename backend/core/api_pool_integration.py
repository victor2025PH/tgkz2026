"""
API Pool Integration - 集成 API 池到登錄流程

這個模塊提供：
1. 自動分配 API 的輔助函數
2. 登錄成功/失敗時的 API 池更新
3. 與現有 main.py 的無縫集成
4. 智能錯誤處理和重試策略

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


def get_api_for_login(
    phone: str,
    use_platform_api: bool = False,
    provided_api_id: Optional[str] = None,
    provided_api_hash: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], str]:
    """
    為登錄獲取 API 憑據
    
    Args:
        phone: 手機號
        use_platform_api: 是否使用平台 API 池
        provided_api_id: 用戶提供的 API ID（如果有）
        provided_api_hash: 用戶提供的 API Hash（如果有）
    
    Returns:
        (api_id, api_hash, source) 元組
        - source: 'user' | 'platform' | 'fallback'
    """
    # 如果用戶提供了 API，優先使用
    if provided_api_id and provided_api_hash:
        print(f"[ApiPoolIntegration] 使用用戶提供的 API: {provided_api_id}", file=sys.stderr)
        return (provided_api_id, provided_api_hash, 'user')
    
    # 如果請求使用平台 API
    if use_platform_api:
        pool = get_api_pool()
        api = pool.allocate_api(phone)
        
        if api:
            # 記錄手機號和 API 的關聯
            _phone_api_map[phone] = api.api_id
            print(f"[ApiPoolIntegration] 從平台池分配 API: {api.api_id} -> {phone}", file=sys.stderr)
            return (api.api_id, api.api_hash, 'platform')
        else:
            print(f"[ApiPoolIntegration] ⚠️ 平台 API 池為空或已滿", file=sys.stderr)
            # 返回 None，讓調用者處理
            return (None, None, 'none')
    
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
    處理登錄請求的 payload，自動填充 API 憑據
    
    Args:
        payload: 原始請求 payload
    
    Returns:
        處理後的 payload（包含 API 憑據）
    """
    phone = payload.get('phone', '')
    use_platform_api = payload.get('usePlatformApi', False)
    provided_api_id = payload.get('apiId')
    provided_api_hash = payload.get('apiHash')
    
    # 獲取 API
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
    elif source == 'none' and use_platform_api:
        # 平台 API 池為空，返回錯誤
        payload['_api_error'] = 'API 池暫時無可用資源，請稍後重試或使用自己的 API'
    
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
    """
    pool = get_api_pool()
    return pool.get_pool_status()

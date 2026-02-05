"""
API Pool Manager - 平台 API 池管理服務

設計原則：
1. 用戶無需了解 API 概念
2. 平台維護 API 池，自動分配
3. 限制每個 API 的賬號數量
4. 監控 API 健康狀態

使用方式：
- 手機號登入時，自動從 API 池分配一個可用的 API
- 每個 API 有使用上限（默認 15 個賬號）
- API 出問題時自動標記為不可用
"""

import sys
import time
import asyncio
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import logging

# 导入健康检查和统计服务
try:
    from backend.core.api_health import get_health_checker, get_load_balancer, HealthStatus
    from backend.core.api_stats import get_stats_service, EventType
except ImportError:
    try:
        from core.api_health import get_health_checker, get_load_balancer, HealthStatus
        from core.api_stats import get_stats_service, EventType
    except ImportError:
        get_health_checker = None
        get_load_balancer = None
        get_stats_service = None
        HealthStatus = None
        EventType = None

logger = logging.getLogger(__name__)


class ApiStatus(Enum):
    """API 狀態"""
    ACTIVE = "active"           # 正常使用
    FULL = "full"               # 已達上限
    DISABLED = "disabled"       # 已禁用
    ERROR = "error"             # 出錯（暫時不可用）
    COOLDOWN = "cooldown"       # 冷卻期


@dataclass
class ApiCredential:
    """API 憑據"""
    id: int
    api_id: str
    api_hash: str
    name: str = ""
    status: ApiStatus = ApiStatus.ACTIVE
    max_accounts: int = 15
    current_accounts: int = 0
    priority: int = 50          # 優先級（越高越優先分配）
    error_count: int = 0
    last_error: str = ""
    last_error_at: float = 0
    cooldown_until: float = 0
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    
    @property
    def is_available(self) -> bool:
        """是否可用"""
        if self.status not in [ApiStatus.ACTIVE]:
            return False
        if self.current_accounts >= self.max_accounts:
            return False
        if self.cooldown_until > time.time():
            return False
        return True
    
    @property
    def usage_ratio(self) -> float:
        """使用率"""
        if self.max_accounts == 0:
            return 1.0
        return self.current_accounts / self.max_accounts
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'api_id': self.api_id,
            'api_hash': self.api_hash[:8] + '...' if self.api_hash else '',
            'name': self.name,
            'status': self.status.value,
            'max_accounts': self.max_accounts,
            'current_accounts': self.current_accounts,
            'usage_ratio': self.usage_ratio,
            'priority': self.priority,
            'is_available': self.is_available,
            'error_count': self.error_count
        }


@dataclass
class PoolConfig:
    """API 池配置"""
    default_max_accounts: int = 15      # 每個 API 默認最大賬號數
    error_threshold: int = 5            # 錯誤閾值（超過後禁用）
    cooldown_seconds: int = 300         # 出錯後冷卻時間（5分鐘）
    health_check_interval: int = 60     # 健康檢查間隔


class ApiPoolManager:
    """
    API 池管理器
    
    職責：
    1. 維護 API 池
    2. 自動分配 API 給新賬號
    3. 監控 API 健康狀態
    4. 處理 API 錯誤和冷卻
    """
    
    def __init__(
        self,
        config: Optional[PoolConfig] = None,
        event_callback: Optional[Callable[[str, Any], None]] = None
    ):
        self.config = config or PoolConfig()
        self.event_callback = event_callback
        
        # API 池（內存緩存）
        self._apis: Dict[int, ApiCredential] = {}
        self._api_by_id: Dict[str, int] = {}  # api_id -> internal id
        
        # 統計
        self._allocation_count = 0
        self._error_count = 0
        
        # 是否已從數據庫加載
        self._loaded = False
        
        print("[ApiPoolManager] 初始化 API 池管理器", file=sys.stderr)
    
    async def initialize(self, db=None):
        """
        初始化 - 從數據庫加載 API 池
        """
        if db:
            await self._load_from_db(db)
        else:
            # 如果沒有數據庫，使用默認 API（臨時方案）
            self._add_default_apis()
        
        self._loaded = True
        print(f"[ApiPoolManager] ✅ 初始化完成，共 {len(self._apis)} 個 API", file=sys.stderr)
    
    def _add_default_apis(self):
        """添加默認 API（用於開發/測試）"""
        # 注意：生產環境應該從數據庫加載
        # 這裡添加一些示例 API
        default_apis = [
            # 這些應該是平台自己申請的 API
            # 格式：(api_id, api_hash, name, max_accounts)
            # 暫時留空，由管理員手動添加
        ]
        
        for i, (api_id, api_hash, name, max_acc) in enumerate(default_apis):
            api = ApiCredential(
                id=i + 1,
                api_id=api_id,
                api_hash=api_hash,
                name=name,
                max_accounts=max_acc
            )
            self._apis[api.id] = api
            self._api_by_id[api_id] = api.id
    
    async def _load_from_db(self, db):
        """從數據庫加載 API 池"""
        try:
            # 查詢 platform_apis 表
            apis = await db.fetch_all("""
                SELECT * FROM platform_apis WHERE is_active = 1
            """)
            
            for row in apis:
                api = ApiCredential(
                    id=row['id'],
                    api_id=str(row['api_id']),
                    api_hash=row['api_hash'],
                    name=row.get('name', ''),
                    status=ApiStatus(row.get('status', 'active')),
                    max_accounts=row.get('max_accounts', 15),
                    current_accounts=row.get('current_accounts', 0),
                    priority=row.get('priority', 50),
                    error_count=row.get('error_count', 0),
                    created_at=row.get('created_at', time.time())
                )
                self._apis[api.id] = api
                self._api_by_id[api.api_id] = api.id
            
            print(f"[ApiPoolManager] 從數據庫加載 {len(self._apis)} 個 API", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPoolManager] 從數據庫加載失敗: {e}", file=sys.stderr)
            # 失敗時不添加默認 API，等待管理員配置
    
    # ==================== 核心分配邏輯 ====================
    
    def allocate_api(self, phone: str = None) -> Optional[ApiCredential]:
        """
        分配一個可用的 API
        
        策略：
        1. 優先選擇健康的 API
        2. 優先選擇使用率最低的 API
        3. 考慮優先級
        4. 使用負載均衡器
        
        Args:
            phone: 手機號（可選，用於一致性哈希）
        
        Returns:
            分配的 API 憑據，如果沒有可用則返回 None
        """
        available_apis = [api for api in self._apis.values() if api.is_available]
        
        if not available_apis:
            print("[ApiPoolManager] ⚠️ 沒有可用的 API", file=sys.stderr)
            self._emit_event('pool.exhausted', {'reason': 'no_available_api'})
            return None
        
        # 🆕 使用健康檢查過濾
        if get_health_checker:
            health_checker = get_health_checker()
            healthy_apis = [
                api for api in available_apis
                if health_checker.is_healthy(api.api_id)
            ]
            if healthy_apis:
                available_apis = healthy_apis
            else:
                print("[ApiPoolManager] ⚠️ 沒有健康的 API，使用所有可用的", file=sys.stderr)
        
        # 🆕 使用負載均衡器選擇
        if get_load_balancer and len(available_apis) > 1:
            load_balancer = get_load_balancer()
            api_ids = [api.api_id for api in available_apis]
            selected_id = load_balancer.select_api(api_ids)
            if selected_id:
                selected = next((api for api in available_apis if api.api_id == selected_id), None)
                if selected:
                    available_apis = [selected]
        
        # 傳統排序：優先級高 + 使用率低
        available_apis.sort(key=lambda a: (-a.priority, a.usage_ratio))
        
        # 選擇第一個（最優）
        selected = available_apis[0]
        
        # 更新使用計數
        selected.current_accounts += 1
        selected.updated_at = time.time()
        
        # 檢查是否已滿
        if selected.current_accounts >= selected.max_accounts:
            selected.status = ApiStatus.FULL
        
        self._allocation_count += 1
        
        print(f"[ApiPoolManager] ✅ 分配 API: {selected.name or selected.api_id} "
              f"({selected.current_accounts}/{selected.max_accounts})", file=sys.stderr)
        
        self._emit_event('api.allocated', {
            'api_id': selected.api_id,
            'current_accounts': selected.current_accounts,
            'max_accounts': selected.max_accounts
        })
        
        # 🆕 記錄統計
        if get_stats_service and EventType:
            stats = get_stats_service()
            stats.record_event(EventType.API_ALLOCATED, selected.api_id, phone or '')
        
        return selected
    
    def release_api(self, api_id: str) -> bool:
        """
        釋放一個 API 的使用計數
        
        Args:
            api_id: API ID
        
        Returns:
            是否成功釋放
        """
        internal_id = self._api_by_id.get(api_id)
        if not internal_id or internal_id not in self._apis:
            return False
        
        api = self._apis[internal_id]
        if api.current_accounts > 0:
            api.current_accounts -= 1
            api.updated_at = time.time()
            
            # 如果之前是 FULL，現在有空間了
            if api.status == ApiStatus.FULL and api.current_accounts < api.max_accounts:
                api.status = ApiStatus.ACTIVE
            
            print(f"[ApiPoolManager] 釋放 API: {api.name or api_id} "
                  f"({api.current_accounts}/{api.max_accounts})", file=sys.stderr)
            return True
        
        return False
    
    def report_error(self, api_id: str, error: str, phone: str = "") -> None:
        """
        報告 API 錯誤
        
        Args:
            api_id: API ID
            error: 錯誤信息
            phone: 手機號（用於統計）
        """
        internal_id = self._api_by_id.get(api_id)
        if not internal_id or internal_id not in self._apis:
            return
        
        api = self._apis[internal_id]
        api.error_count += 1
        api.last_error = error
        api.last_error_at = time.time()
        api.updated_at = time.time()
        
        self._error_count += 1
        
        # 🆕 記錄健康檢查
        if get_health_checker:
            health_checker = get_health_checker()
            health_checker.record_failure(api_id, error)
        
        # 🆕 記錄統計
        if get_stats_service and EventType:
            stats = get_stats_service()
            stats.record_login_failed(api_id, phone, error)
            stats.record_api_error(api_id, error)
        
        # 檢查是否達到錯誤閾值
        if api.error_count >= self.config.error_threshold:
            api.status = ApiStatus.ERROR
            api.cooldown_until = time.time() + self.config.cooldown_seconds
            print(f"[ApiPoolManager] ⚠️ API 進入冷卻期: {api.name or api_id}", file=sys.stderr)
            
            self._emit_event('api.cooldown', {
                'api_id': api_id,
                'error': error,
                'cooldown_seconds': self.config.cooldown_seconds
            })
        
        print(f"[ApiPoolManager] API 錯誤: {api.name or api_id} - {error} "
              f"(錯誤次數: {api.error_count})", file=sys.stderr)
    
    def report_success(self, api_id: str, phone: str = "", response_time: float = 0.0) -> None:
        """
        報告 API 成功使用
        
        Args:
            api_id: API ID
            phone: 手機號（用於統計）
            response_time: 響應時間（秒）
        """
        internal_id = self._api_by_id.get(api_id)
        if not internal_id or internal_id not in self._apis:
            return
        
        api = self._apis[internal_id]
        
        # 成功使用，重置錯誤計數
        if api.error_count > 0:
            api.error_count = max(0, api.error_count - 1)  # 逐步恢復
        
        # 如果在冷卻中但現在成功了，提前恢復
        if api.status == ApiStatus.ERROR:
            api.status = ApiStatus.ACTIVE
            api.cooldown_until = 0
            print(f"[ApiPoolManager] ✅ API 恢復正常: {api.name or api_id}", file=sys.stderr)
        
        # 🆕 記錄健康檢查
        if get_health_checker:
            health_checker = get_health_checker()
            health_checker.record_success(api_id, response_time)
        
        # 🆕 記錄統計
        if get_stats_service and EventType:
            stats = get_stats_service()
            stats.record_login_success(api_id, phone)
    
    # ==================== 管理接口 ====================
    
    def add_api(
        self,
        api_id: str,
        api_hash: str,
        name: str = "",
        max_accounts: int = 15,
        priority: int = 50
    ) -> ApiCredential:
        """
        添加新的 API 到池中
        """
        # 生成內部 ID
        internal_id = len(self._apis) + 1
        while internal_id in self._apis:
            internal_id += 1
        
        api = ApiCredential(
            id=internal_id,
            api_id=api_id,
            api_hash=api_hash,
            name=name or f"API-{api_id[:6]}",
            max_accounts=max_accounts,
            priority=priority
        )
        
        self._apis[internal_id] = api
        self._api_by_id[api_id] = internal_id
        
        print(f"[ApiPoolManager] 添加 API: {api.name} (最大 {max_accounts} 賬號)", file=sys.stderr)
        
        self._emit_event('api.added', api.to_dict())
        
        return api
    
    def remove_api(self, api_id: str) -> bool:
        """
        從池中移除 API
        """
        internal_id = self._api_by_id.get(api_id)
        if not internal_id:
            return False
        
        api = self._apis.pop(internal_id, None)
        self._api_by_id.pop(api_id, None)
        
        if api:
            print(f"[ApiPoolManager] 移除 API: {api.name or api_id}", file=sys.stderr)
            self._emit_event('api.removed', {'api_id': api_id})
            return True
        
        return False
    
    def disable_api(self, api_id: str) -> bool:
        """禁用 API"""
        internal_id = self._api_by_id.get(api_id)
        if not internal_id or internal_id not in self._apis:
            return False
        
        self._apis[internal_id].status = ApiStatus.DISABLED
        return True
    
    def enable_api(self, api_id: str) -> bool:
        """啟用 API"""
        internal_id = self._api_by_id.get(api_id)
        if not internal_id or internal_id not in self._apis:
            return False
        
        api = self._apis[internal_id]
        if api.current_accounts >= api.max_accounts:
            api.status = ApiStatus.FULL
        else:
            api.status = ApiStatus.ACTIVE
        return True
    
    # ==================== 查詢接口 ====================
    
    def get_api(self, api_id: str) -> Optional[ApiCredential]:
        """獲取指定的 API"""
        internal_id = self._api_by_id.get(api_id)
        if internal_id:
            return self._apis.get(internal_id)
        return None
    
    def get_all_apis(self) -> List[ApiCredential]:
        """獲取所有 API"""
        return list(self._apis.values())
    
    def get_available_apis(self) -> List[ApiCredential]:
        """獲取所有可用的 API"""
        return [api for api in self._apis.values() if api.is_available]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        total = len(self._apis)
        available = len(self.get_available_apis())
        full = len([a for a in self._apis.values() if a.status == ApiStatus.FULL])
        error = len([a for a in self._apis.values() if a.status == ApiStatus.ERROR])
        disabled = len([a for a in self._apis.values() if a.status == ApiStatus.DISABLED])
        
        total_capacity = sum(a.max_accounts for a in self._apis.values())
        total_used = sum(a.current_accounts for a in self._apis.values())
        
        return {
            'total_apis': total,
            'available_apis': available,
            'full_apis': full,
            'error_apis': error,
            'disabled_apis': disabled,
            'total_capacity': total_capacity,
            'total_used': total_used,
            'usage_ratio': total_used / total_capacity if total_capacity > 0 else 0,
            'allocation_count': self._allocation_count,
            'error_count': self._error_count
        }
    
    def get_pool_status(self) -> Dict[str, Any]:
        """獲取池狀態（用於儀表盤）"""
        return {
            'stats': self.get_stats(),
            'apis': [api.to_dict() for api in self._apis.values()]
        }
    
    # ==================== 內部方法 ====================
    
    def _emit_event(self, event_type: str, data: Any):
        """發送事件"""
        if self.event_callback:
            try:
                self.event_callback(event_type, data)
            except Exception as e:
                print(f"[ApiPoolManager] 事件發送失敗: {e}", file=sys.stderr)


# ==================== 全局實例 ====================

_api_pool: Optional[ApiPoolManager] = None


def get_api_pool() -> ApiPoolManager:
    """獲取全局 API 池管理器"""
    global _api_pool
    if _api_pool is None:
        _api_pool = ApiPoolManager()
    return _api_pool


async def init_api_pool(
    db=None,
    config: Optional[PoolConfig] = None,
    event_callback: Optional[Callable] = None
) -> ApiPoolManager:
    """初始化全局 API 池"""
    global _api_pool
    _api_pool = ApiPoolManager(config=config, event_callback=event_callback)
    await _api_pool.initialize(db)
    return _api_pool

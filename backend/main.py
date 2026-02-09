"""
TG-Matrix Backend Main Entry Point
Handles communication with Electron via stdin/stdout
"""
import sys
import os
import io

# 🔧 P0: 強制設置 stdin/stdout/stderr 為 UTF-8 編碼（解決 Windows GBK 問題）
if sys.platform == 'win32':
    # 🆕 設置 stdin 為 UTF-8（關鍵：接收來自 Electron 的中文關鍵詞）
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
    # 設置 stdout 為 UTF-8，並忽略編碼錯誤
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

# 🔧 立即輸出啟動信號（用於診斷）
print('{"event":"backend-starting","payload":{"status":"initializing"}}', flush=True)
sys.stderr.write("[Backend] ===== Python backend starting =====\n")
sys.stderr.flush()

import json
import asyncio
import gc
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pathlib import Path
# ========== 🔧 Phase 3 優化：內存優化導入 ==========
# 只在啟動時加載必需的核心模塊，其他模塊延遲加載

# 第一層：絕對核心模塊（啟動時必須加載，約 50MB）
from database import db
from config import config, IS_DEV_MODE
from telegram_client import TelegramClientManager
from message_queue import MessageQueue, MessagePriority
from error_handler import init_error_handler, handle_error, AppError, ErrorType
from message_ack import init_ack_manager, get_ack_manager
from text_utils import safe_json_dumps, sanitize_text, sanitize_dict, format_chat_info, format_user_info
from cache_manager import init_cache_manager, get_cache_manager

# 第二層：輕量核心工具（約 10MB）
from validators import (
    validate_account, validate_keyword, validate_template, 
    validate_campaign, validate_group_url,
    AccountValidator, KeywordValidator, TemplateValidator,
    CampaignValidator, GroupValidator, ValidationError
)
from flood_wait_handler import flood_handler, safe_telegram_call

# ========== 🔧 以下模塊全部延遲加載 ==========
# 使用 lazy_imports 管理器進行延遲加載，節省約 300-400MB 內存

from lazy_imports import lazy_imports, get_lazy_imports

# 註冊所有非核心模塊（只註冊，不加載）
# === Telegram 服務 ===
lazy_imports.register('private_message_poller')
lazy_imports.register('group_message_poller')
lazy_imports.register('group_join_service')
lazy_imports.register('member_extraction_service')
lazy_imports.register('qr_auth_manager')
lazy_imports.register('ip_binding_manager')

# === AI 和知識庫（最大內存消耗者）===
lazy_imports.register('ai_context_manager')
lazy_imports.register('ai_auto_chat')
lazy_imports.register('vector_memory')
lazy_imports.register('auto_funnel_manager')

# === 監控和分析 ===
lazy_imports.register('connection_monitor')
lazy_imports.register('resource_discovery')
lazy_imports.register('discussion_watcher')
lazy_imports.register('performance_monitor')
lazy_imports.register('enhanced_health_monitor')

# === 搜索服務 ===
lazy_imports.register('fulltext_search')
lazy_imports.register('group_search_service')
lazy_imports.register('jiso_search_service')

# === 營銷和廣告 ===
lazy_imports.register('batch_operations')
lazy_imports.register('credential_scraper')
lazy_imports.register('ad_template')
lazy_imports.register('ad_manager')
lazy_imports.register('ad_broadcaster')
lazy_imports.register('ad_scheduler')
lazy_imports.register('ad_analytics')
lazy_imports.register('user_tracker')
lazy_imports.register('user_analytics')
lazy_imports.register('campaign_orchestrator')
lazy_imports.register('multi_channel_stats')
lazy_imports.register('marketing_outreach_service')
lazy_imports.register('marketing_task_service')

# === 協作和腳本 ===
lazy_imports.register('script_engine')
lazy_imports.register('collaboration_coordinator')
lazy_imports.register('multi_role_manager')

# === 設備和代理 ===
lazy_imports.register('device_fingerprint')
lazy_imports.register('proxy_manager')
lazy_imports.register('warmup_manager')
lazy_imports.register('proxy_rotation_manager')
lazy_imports.register('behavior_simulator')

# === 其他 ===
lazy_imports.register('backup_manager')
lazy_imports.register('queue_optimizer')
lazy_imports.register('scheduler')
lazy_imports.register('error_recovery_manager')
lazy_imports.register('alert_manager')
lazy_imports.register('smart_alert_manager')
lazy_imports.register('db_optimizer')
lazy_imports.register('memory_monitor')


# ========== 延遲加載的模塊獲取函數 ==========
def _get_module(name: str):
    """安全獲取延遲加載的模塊"""
    return lazy_imports.get(name)


# 為向後兼容創建模塊代理變量
# 這些變量在首次訪問時才會加載實際模塊
class _LazyModuleProxy:
    """延遲模塊代理，首次訪問時加載"""
    def __init__(self, module_name: str, attr_name: str = None):
        self._module_name = module_name
        self._attr_name = attr_name
        self._loaded = None
    
    def _load(self):
        if self._loaded is None:
            module = _get_module(self._module_name)
            if self._attr_name:
                self._loaded = getattr(module, self._attr_name, module)
            else:
                self._loaded = module
        return self._loaded
    
    def __getattr__(self, name):
        return getattr(self._load(), name)
    
    def __call__(self, *args, **kwargs):
        return self._load()(*args, **kwargs)


# 🔧 向後兼容的延遲代理
# Telegram 服務
private_message_poller = _LazyModuleProxy('private_message_poller', 'private_message_poller')
group_join_service = _LazyModuleProxy('group_join_service', 'group_join_service')
member_extraction_service = _LazyModuleProxy('member_extraction_service', 'member_extraction_service')

# AI 服務
ai_context = _LazyModuleProxy('ai_context_manager', 'ai_context')
ai_auto_chat = _LazyModuleProxy('ai_auto_chat', 'ai_auto_chat')
vector_memory = _LazyModuleProxy('vector_memory', 'vector_memory')
auto_funnel = _LazyModuleProxy('auto_funnel_manager', 'auto_funnel')

# 監控服務
connection_monitor = _LazyModuleProxy('connection_monitor', 'connection_monitor')
resource_discovery = _LazyModuleProxy('resource_discovery', 'resource_discovery')
discussion_watcher = _LazyModuleProxy('discussion_watcher', 'discussion_watcher')

# 搜索服務
group_search_service = _LazyModuleProxy('group_search_service', 'group_search_service')
jiso_search_service = _LazyModuleProxy('jiso_search_service', 'jiso_search_service')

# 營銷服務
marketing_outreach_service = _LazyModuleProxy('marketing_outreach_service', 'marketing_outreach_service')

# 調度器
scheduler = _LazyModuleProxy('scheduler', 'scheduler')


# 延遲加載的初始化函數獲取器
def get_init_group_poller():
    return _get_module('group_message_poller').init_group_poller

def get_group_poller():
    return _get_module('group_message_poller').get_group_poller

def get_init_qr_auth_manager():
    return _get_module('qr_auth_manager').init_qr_auth_manager

def get_qr_auth_manager_func():
    return _get_module('qr_auth_manager').get_qr_auth_manager

def get_init_ip_binding_manager():
    return _get_module('ip_binding_manager').init_ip_binding_manager

def get_ip_binding_manager_func():
    return _get_module('ip_binding_manager').get_ip_binding_manager

def get_init_performance_monitor():
    return _get_module('performance_monitor').init_performance_monitor

def get_init_search_engine():
    return _get_module('fulltext_search').init_search_engine

def get_search_engine():
    return _get_module('fulltext_search').get_search_engine

def get_init_batch_operations():
    return _get_module('batch_operations').init_batch_operations

def get_batch_ops():
    return _get_module('batch_operations').get_batch_ops

def get_init_credential_scraper():
    return _get_module('credential_scraper').init_credential_scraper

def get_credential_scraper():
    return _get_module('credential_scraper').get_credential_scraper

def get_init_ad_template_manager():
    return _get_module('ad_template').init_ad_template_manager

def get_ad_template_manager():
    return _get_module('ad_template').get_ad_template_manager

def get_init_ad_manager():
    return _get_module('ad_manager').init_ad_manager

def get_ad_manager():
    return _get_module('ad_manager').get_ad_manager

def get_init_ad_broadcaster():
    return _get_module('ad_broadcaster').init_ad_broadcaster

def get_ad_broadcaster():
    return _get_module('ad_broadcaster').get_ad_broadcaster

def get_init_ad_scheduler():
    return _get_module('ad_scheduler').init_ad_scheduler

def get_ad_scheduler():
    return _get_module('ad_scheduler').get_ad_scheduler

def get_init_ad_analytics():
    return _get_module('ad_analytics').init_ad_analytics

def get_ad_analytics():
    return _get_module('ad_analytics').get_ad_analytics

def get_init_user_tracker():
    return _get_module('user_tracker').init_user_tracker

def get_user_tracker():
    return _get_module('user_tracker').get_user_tracker

def get_init_user_analytics():
    return _get_module('user_analytics').init_user_analytics

def get_user_analytics():
    return _get_module('user_analytics').get_user_analytics

def get_init_campaign_orchestrator():
    return _get_module('campaign_orchestrator').init_campaign_orchestrator

def get_campaign_orchestrator():
    return _get_module('campaign_orchestrator').get_campaign_orchestrator

def get_init_multi_channel_stats():
    return _get_module('multi_channel_stats').init_multi_channel_stats

def get_multi_channel_stats():
    return _get_module('multi_channel_stats').get_multi_channel_stats

def get_init_marketing_task_service():
    return _get_module('marketing_task_service').init_marketing_task_service

def get_marketing_task_service():
    return _get_module('marketing_task_service').get_marketing_task_service

def get_init_script_engine():
    return _get_module('script_engine').init_script_engine

def get_script_engine():
    return _get_module('script_engine').get_script_engine

def get_init_collaboration_coordinator():
    return _get_module('collaboration_coordinator').init_collaboration_coordinator

def get_collaboration_coordinator():
    return _get_module('collaboration_coordinator').get_collaboration_coordinator

def get_multi_role_manager():
    return _get_module('multi_role_manager').get_multi_role_manager


# 其他模塊初始化函數
def get_init_alert_manager():
    return _get_module('alert_manager').init_alert_manager

def get_init_db_optimizer():
    return _get_module('db_optimizer').init_db_optimizer

def get_init_memory_monitor():
    return _get_module('memory_monitor').init_memory_monitor

def get_init_group_poller():
    return _get_module('group_message_poller').init_group_poller


# 類型提示的類獲取器
def get_QRAuthManager():
    return _get_module('qr_auth_manager').QRAuthManager

def get_IPBindingManager():
    return _get_module('ip_binding_manager').IPBindingManager

def get_CredentialScraper():
    return _get_module('credential_scraper').CredentialScraper

def get_EnhancedHealthMonitor():
    return _get_module('enhanced_health_monitor').EnhancedHealthMonitor

def get_Anomaly():
    return _get_module('enhanced_health_monitor').Anomaly

def get_BatchOperationManager():
    return _get_module('batch_operations').BatchOperationManager

def get_SpintaxGenerator():
    return _get_module('ad_template').SpintaxGenerator

def get_GroupJoinService():
    return _get_module('group_join_service').GroupJoinService

def get_MemberExtractionService():
    return _get_module('member_extraction_service').MemberExtractionService

def get_VectorMemorySystem():
    return _get_module('vector_memory').VectorMemorySystem

def get_AutoFunnelManager():
    return _get_module('auto_funnel_manager').AutoFunnelManager

def get_DiscoveredResource():
    return _get_module('resource_discovery').DiscoveredResource

def get_MarketingOutreachService():
    return _get_module('marketing_outreach_service').MarketingOutreachService

def get_TaskScheduler():
    return _get_module('scheduler').TaskScheduler

def get_QueueOptimizer():
    return _get_module('queue_optimizer').QueueOptimizer

def get_BackupManager():
    return _get_module('backup_manager').BackupManager

def get_ProxyManager():
    return _get_module('proxy_manager').ProxyManager

def get_ProxyConfig():
    return _get_module('proxy_manager').ProxyConfig

def get_WarmupManager():
    return _get_module('warmup_manager').WarmupManager

def get_ProxyRotationManager():
    return _get_module('proxy_rotation_manager').ProxyRotationManager

def get_RotationReason():
    return _get_module('proxy_rotation_manager').RotationReason

def get_ProxyRotationConfig():
    return _get_module('proxy_rotation_manager').ProxyRotationConfig

def get_BehaviorSimulator():
    return _get_module('behavior_simulator').BehaviorSimulator

def get_BehaviorConfig():
    return _get_module('behavior_simulator').BehaviorConfig

def get_DeviceFingerprintGenerator():
    return _get_module('device_fingerprint').DeviceFingerprintGenerator


# 錯誤恢復模塊（延遲加載）
def get_ErrorRecoveryManager():
    try:
        return _get_module('error_recovery_manager').ErrorRecoveryManager
    except:
        return None

RecoveryAction = None
ErrorCategory = None


# 🆕 Phase 2: 命令路由器整合（延遲檢測）
ROUTER_AVAILABLE = False
def check_router_available():
    global ROUTER_AVAILABLE
    try:
        from api.router_integration import setup_command_router, try_route_command
        ROUTER_AVAILABLE = True
        return True
    except ImportError as e:
        print(f"[Backend] Command router not available: {e}", file=sys.stderr)
        ROUTER_AVAILABLE = False
        return False


# ============================================================
# 🆕 Phase 3: 命令別名註冊表 (Command Alias Registry)
# ============================================================
# 解決前端命令名 ≠ 後端 handler 方法名的問題
# 格式: { 'frontend-command-name': ('module.path', 'function_name') }
# 所有別名在此集中管理，避免散落在 551 個 handler 方法中
# ============================================================
COMMAND_ALIAS_REGISTRY: Dict[str, tuple] = {
    # === 監控群組相關 ===
    'add-monitored-group':      ('domain.groups.handlers_impl', 'handle_add_monitored_group'),
    'remove-monitored-group':   ('domain.groups.handlers_impl', 'handle_remove_group'),
    'pause-monitored-group':    ('domain.automation.monitoring_handlers_impl', 'handle_pause_monitoring'),
    'resume-monitored-group':   ('domain.automation.monitoring_handlers_impl', 'handle_resume_monitoring'),
    
    # === 加入群組相關 ===
    'join-and-monitor':         ('domain.groups.handlers_impl', 'handle_join_and_monitor_resource'),
    'join-resource':            ('domain.groups.handlers_impl', 'handle_join_resource'),
    
    # === 預留擴展點 (新增別名只需在此添加一行) ===
}

# 未知命令追蹤器 — 用於診斷前端發送了哪些未註冊的命令
_unknown_command_counter: Dict[str, int] = {}
_UNKNOWN_CMD_LOG_THRESHOLD = 3  # 同一未知命令每 N 次才記一次日誌


# 🆕 Phase 8: 使用統一的日誌脫敏工具（延遲導入）
def get_mask_phone():
    from core.logging import mask_phone
    return mask_phone

def get_mask_sensitive():
    from core.logging import mask_sensitive
    return mask_sensitive

# 兼容性別名
def mask_phone(phone):
    return get_mask_phone()(phone)

def mask_sensitive_log(data):
    return get_mask_sensitive()(data)


# ========== 內存優化狀態報告 ==========
print(f"[Backend] 🚀 Phase 3 內存優化已啟用", file=sys.stderr)
print(f"[Backend] 📊 已註冊 {len(lazy_imports._modules)} 個延遲加載模塊", file=sys.stderr)


class BackendService:
    """Main backend service handling commands and events"""
    
    def __init__(self):
        self.is_monitoring = False
        self.running = True
        self.telegram_manager = TelegramClientManager(event_callback=self.send_event)
        self.background_tasks = []  # Track background tasks
        self.last_reset_date = None  # Track last daily reset date
        
        # Initialize message queue (will be connected to database in initialize())
        self.message_queue = None
        self.alert_manager = None
        
        # Proxy rotation manager (will be initialized in initialize())
        self.proxy_rotation_manager: Optional[ProxyRotationManager] = None
        
        # Enhanced health monitor (will be initialized in initialize())
        self.enhanced_health_monitor: Optional[EnhancedHealthMonitor] = None
        
        # Queue optimizer (will be initialized in initialize())
        self.queue_optimizer: Optional[QueueOptimizer] = None
        
        # Error recovery manager (will be initialized in initialize())
        self.error_recovery_manager: Optional[ErrorRecoveryManager] = None
        
        # Backup manager (will be initialized in initialize())
        self.backup_manager: Optional[Any] = None
        
        # Smart alert manager (will be initialized in initialize())
        self.smart_alert_manager: Optional[Any] = None
        
        # QR Auth Manager for QR code login
        self.qr_auth_manager: Optional[QRAuthManager] = None
        
        # IP Binding Manager for IP stickiness (Phase 2)
        self.ip_binding_manager: Optional[IPBindingManager] = None
        
        # Credential Scraper for native API credentials (Phase 2)
        self.credential_scraper: Optional[CredentialScraper] = None

        # Cache for frequently accessed data (TTL: 30 seconds)
        # 🔧 Phase 1 優化：添加緩存大小限制
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self._cache_ttl = timedelta(seconds=30)
        self._max_cache_size = 500  # 最多緩存 500 個條目
    
    def _invalidate_cache(self, cache_key: str):
        """Invalidate a specific cache entry"""
        self._cache.pop(cache_key, None)
        self._cache_timestamps.pop(cache_key, None)
    
    async def _send_accounts_updated(self, owner_user_id: str = None):
        """🔧 安全地獲取帳號並發送 accounts-updated 事件（多租戶安全）
        
        Args:
            owner_user_id: 帳號擁有者 ID。如果未提供，嘗試從租戶上下文獲取。
        """
        # 嘗試獲取租戶 ID
        tenant_id = owner_user_id
        if not tenant_id:
            try:
                from core.tenant_context import get_current_tenant
                t = get_current_tenant()
                if t and t.user_id:
                    tenant_id = t.user_id
            except (ImportError, Exception):
                pass
        
        # 獲取帳號（按租戶過濾）
        accounts = await db.get_all_accounts(owner_user_id=tenant_id)
        
        # 清除緩存
        self._cache.pop("accounts", None)
        self._cache_timestamps.pop("accounts", None)
        
        # 發送事件（帶租戶 ID 過濾廣播）
        self.send_event("accounts-updated", accounts, tenant_id=tenant_id)
    
    # ==================== 配額檢查輔助方法 ====================
    
    async def check_quota(
        self, 
        quota_type: str, 
        amount: int = 1,
        owner_user_id: str = None
    ) -> Dict[str, Any]:
        """
        檢查配額是否足夠
        
        Args:
            quota_type: 配額類型（daily_messages, ai_calls, tg_accounts 等）
            amount: 需要消耗的數量
            owner_user_id: 用戶 ID（可選，Electron 模式可省略）
        
        Returns:
            {'allowed': bool, 'result': QuotaCheckResult dict}
        """
        # Electron 模式跳過配額檢查
        if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
            return {'allowed': True, 'unlimited': True}
        
        # 獲取用戶 ID
        user_id = owner_user_id
        if not user_id:
            try:
                from core.tenant_context import get_user_id
                user_id = get_user_id()
            except:
                pass
        
        if not user_id:
            # 無法確定用戶，允許操作（降級處理）
            return {'allowed': True, 'unknown_user': True}
        
        try:
            from core.quota_service import get_quota_service
            service = get_quota_service()
            result = service.check_quota(user_id, quota_type, amount)
            return {'allowed': result.allowed, 'result': result.to_dict()}
        except Exception as e:
            print(f"[Backend] Quota check error: {e}", file=sys.stderr)
            return {'allowed': True, 'error': str(e)}
    
    async def consume_quota(
        self, 
        quota_type: str, 
        amount: int = 1,
        owner_user_id: str = None,
        context: str = None
    ) -> bool:
        """
        消耗配額
        
        Args:
            quota_type: 配額類型
            amount: 消耗數量
            owner_user_id: 用戶 ID
            context: 操作上下文
        
        Returns:
            是否成功
        """
        # Electron 模式跳過
        if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
            return True
        
        user_id = owner_user_id
        if not user_id:
            try:
                from core.tenant_context import get_user_id
                user_id = get_user_id()
            except:
                pass
        
        if not user_id:
            return True
        
        try:
            from core.quota_service import get_quota_service
            service = get_quota_service()
            success, _ = service.consume_quota(user_id, quota_type, amount, context)
            return success
        except Exception as e:
            print(f"[Backend] Quota consume error: {e}", file=sys.stderr)
            return True
    
    def send_quota_exceeded_error(
        self, 
        event_name: str, 
        quota_type: str,
        quota_result: Dict[str, Any]
    ):
        """發送配額不足錯誤事件"""
        self.send_event(event_name, {
            'success': False,
            'error': quota_result.get('message', f'{quota_type} 配額已用盡'),
            'code': 'QUOTA_EXCEEDED',
            'quota_type': quota_type,
            'quota': quota_result,
            'upgrade_suggestion': quota_result.get('upgrade_suggestion', '升級會員等級可獲得更多配額')
        })
    
    def _cleanup_cache(self):
        """🔧 Phase 1 優化：清理過期和超出限制的緩存"""
        now = datetime.now()
        
        # 1. 清理過期條目
        expired_keys = [
            key for key, ts in self._cache_timestamps.items()
            if now - ts > self._cache_ttl
        ]
        for key in expired_keys:
            self._invalidate_cache(key)
        
        # 2. 如果仍超出限制，移除最舊的條目
        if len(self._cache) > self._max_cache_size:
            sorted_keys = sorted(
                self._cache_timestamps.keys(),
                key=lambda k: self._cache_timestamps.get(k, datetime.min)
            )
            keys_to_remove = sorted_keys[:len(self._cache) - self._max_cache_size + 50]
            for key in keys_to_remove:
                self._invalidate_cache(key)
    
    async def initialize(self):
        """Initialize the backend service"""
        # 確保 sys 在函數開頭導入（避免後續 import sys 導致的 UnboundLocalError）
        import sys
        import traceback
        import time
        
        init_start_time = time.time()
        print("[Backend] ========== Starting initialization ==========", file=sys.stderr)
        
        # 🔧 P10-2: 環境變量校驗（啟動時）
        try:
            from core.env_validator import validate_on_startup
            validate_on_startup()
        except Exception as env_err:
            print(f"[Backend] EnvValidator: {env_err}", file=sys.stderr)
        
        # Initialize error handler
        def error_log_callback(error_type: str, message: str, details: Dict[str, Any]):
            """Callback for error logging"""
            log_type = "error"
            if error_type == ErrorType.NETWORK_ERROR.value:
                log_type = "warning"
            elif error_type == ErrorType.VALIDATION_ERROR.value:
                log_type = "warning"
            
            self.send_log(f"[{error_type}] {message}", log_type)
        
        init_error_handler(error_log_callback)
        
        # Initialize acknowledgment manager
        await init_ack_manager()
        
        # Initialize performance monitor
        def performance_event_callback(event_type: str, data: Any):
            """Callback for performance events"""
            if event_type == "performance-metric":
                # Send metric to frontend
                self.send_event("performance-metric", data)
            elif event_type == "performance-alert":
                # Send alert to frontend
                self.send_event("performance-alert", data)
                # Also log as warning
                alerts = data.get("alerts", [])
                if alerts:
                    self.send_log(f"Performance alert: {', '.join(alerts)}", "warning")
        
        performance_monitor = get_init_performance_monitor()(performance_event_callback)
        await performance_monitor.start()
        
        # Initialize cache manager
        cache_manager = init_cache_manager(default_ttl=300)  # 5分鐘默認TTL
        await cache_manager.start_cleanup_task()
        self.send_log("Cache manager initialized", "info")
        
        # Initialize database
        await db.initialize()
        await db.connect()
        
        # Initialize full-text search engine
        try:
            from config import DATABASE_PATH
            search_engine = get_init_search_engine()(str(DATABASE_PATH))
            # 異步重建索引（不阻塞啟動），如果資料庫損壞則跳過
            async def safe_rebuild_index():
                try:
                    await search_engine.rebuild_index()
                except Exception as e:
                    error_str = str(e).lower()
                    if "malformed" in error_str or "corrupt" in error_str or "database disk image" in error_str:
                        import sys
                        print(f"[Backend] Database corruption detected, skipping search index rebuild: {e}", file=sys.stderr)
                        self.send_log("資料庫損壞，跳過搜索索引重建", "warning")
                    else:
                        import sys
                        print(f"[Backend] Error rebuilding search index: {e}", file=sys.stderr)
            asyncio.create_task(safe_rebuild_index())
            self.send_log("全文搜索引擎已初始化", "success")
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize search engine: {e}", file=sys.stderr)
            self.send_log(f"全文搜索引擎初始化失敗: {str(e)}", "warning")
        
        # Initialize migration manager (after database is ready)
        from migrations.migration_manager import init_migration_manager, get_migration_manager
        from pathlib import Path
        try:
            # 首先建立異步數據庫連接（遷移系統需要）
            await db.connect()
            print("[Backend] Async database connection established for migrations", file=sys.stderr)
            
            migrations_dir = Path(__file__).parent / "migrations"
            init_migration_manager(db, migrations_dir)
            migration_manager = get_migration_manager()
            if migration_manager:
                await migration_manager.initialize()
                # 🔧 P0: 優化 - 只檢查版本，迁移在後台執行（不阻塞啟動）
                current_version = await migration_manager.get_current_version()
                pending = await migration_manager.get_pending_migrations()
                print(f"[Backend] Database version: {current_version}, pending migrations: {len(pending)}", file=sys.stderr)
                if pending:
                    self.send_log(f"Found {len(pending)} pending migration(s), running in background...", "info")
                    # 🔧 P0: 後台執行遷移，不阻塞啟動
                    async def background_migrate():
                        try:
                            success = await migration_manager.migrate()
                            if success:
                                self.send_log("✓ Migrations applied successfully", "success")
                            else:
                                self.send_log("⚠ Some migrations completed with warnings", "warning")
                        except Exception as mig_err:
                            import sys
                            print(f"[Backend] Background migration error: {mig_err}", file=sys.stderr)
                            self.send_log(f"⚠ Migration error: {str(mig_err)[:100]}", "warning")
                    asyncio.create_task(background_migrate())
                else:
                    print(f"[Backend] Database is up to date (version {current_version})", file=sys.stderr)
        except Exception as e:
            import traceback
            print(f"[Backend] Error initializing migration system: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self.send_log(f"遷移系統初始化失敗: {str(e)}", "warning")
        
        # Initialize alert manager (after database is ready)
        def alert_notification_callback(alert):
            """Callback for alert notifications"""
            # Send alert to frontend
            self.send_event("alert-triggered", {
                "id": alert.id,
                "type": alert.alert_type.value,
                "level": alert.level.value,
                "message": alert.message,
                "details": alert.details,
                "timestamp": alert.timestamp.isoformat()
            })
            # Also log
            log_type = "warning" if alert.level.value in ["warning", "info"] else "error"
            self.send_log(f"[告警] {alert.message}", log_type)
        
        self.alert_manager = get_init_alert_manager()(db, alert_notification_callback)
        await self.alert_manager.start()
        
        # 🔧 P6-3: 配額變更實時推送 — 註冊回調
        try:
            from core.quota_service import get_quota_service
            _qs = get_quota_service()
            
            def _on_quota_change(user_id, quota_type, action, payload):
                """配額變更時推送到前端（WebSocket + IPC）"""
                self.send_event('quota-updated', {
                    'user_id': user_id,
                    'quota_type': quota_type,
                    'action': action,
                    **payload
                })
            
            _qs.on_quota_change(_on_quota_change)
            print("[Backend] Quota change notification registered", file=sys.stderr)
        except Exception as e:
            print(f"[Backend] Failed to register quota change callback: {e}", file=sys.stderr)
        
        # ========== 優化：延遲執行備份和清理任務（不阻塞啟動） ==========
        async def delayed_maintenance_tasks():
            """延遲執行的維護任務，避免阻塞啟動"""
            await asyncio.sleep(5)  # 等待 5 秒後再執行，確保應用已完成載入
            
            # 啟動備份（延遲執行）
            if self.backup_manager:
                try:
                    await self.backup_manager.create_backup(backup_type='startup', compress=True)
                    self.send_log("✓ 啟動備份已創建（延遲）", "success")
                except Exception as e:
                    self.send_log(f"啟動備份失敗: {str(e)}", "warning")
            
            # 清理舊備份
            try:
                removed_count = backup_manager.cleanup_old_backups()
                if removed_count > 0:
                    self.send_log(f"Cleaned up {removed_count} old backup(s)", "info")
            except Exception as e:
                pass  # 靜默處理清理錯誤
            
            # 日誌輪轉和清理
            try:
                log_rotator = get_log_rotator()
                rotated_files = log_rotator.rotate_all_logs()
                if rotated_files:
                    self.send_log(f"Rotated {len(rotated_files)} log file(s)", "info")
                
                removed_logs = log_rotator.cleanup_old_logs()
                if removed_logs > 0:
                    self.send_log(f"Cleaned up {removed_logs} old log file(s)", "info")
            except Exception as e:
                pass  # 靜默處理輪轉錯誤
            
            # 🔧 Phase 1 優化：首次 GC 清理
            gc.collect()
            self.send_log("✓ 初始垃圾回收完成", "info")
            
            # 🔧 Phase 3 優化：數據庫索引優化
            try:
                from config import DATABASE_PATH
                optimizer = await get_init_db_optimizer()(str(DATABASE_PATH))
                index_result = await optimizer.create_indexes()
                if index_result.get('total_created', 0) > 0:
                    self.send_log(f"✓ 創建了 {index_result['total_created']} 個數據庫索引", "info")
            except Exception as e:
                print(f"[Backend] 數據庫索引優化失敗: {e}", file=sys.stderr)
        
        # 🔧 Phase 1+2 優化：定時內存清理任務
        async def periodic_memory_cleanup():
            """定時內存清理任務，每 5 分鐘執行一次"""
            while True:
                await asyncio.sleep(300)  # 5 分鐘
                try:
                    # 1. 清理緩存
                    self._cleanup_cache()
                    
                    # 2. 🔧 Phase 2: 清理閒置的 Telegram 客戶端
                    if self.telegram_manager:
                        idle_cleaned = await self.telegram_manager.cleanup_idle_clients()
                        if idle_cleaned > 0:
                            print(f"[MemoryCleanup] 已清理 {idle_cleaned} 個閒置客戶端", file=sys.stderr)
                    
                    # 3. 🔧 P4-4: 清理超時的配額預留（防止配額被永久佔用）
                    try:
                        from core.quota_service import get_quota_service
                        qs = get_quota_service()
                        cleanup_result = qs.cleanup_expired_reservations(timeout_seconds=300)
                        if cleanup_result.get('cleaned', 0) > 0:
                            print(f"[QuotaCleanup] 已釋放 {cleanup_result['cleaned']} 個超時預留", file=sys.stderr)
                    except Exception as qe:
                        print(f"[QuotaCleanup] 清理失敗: {qe}", file=sys.stderr)
                    
                    # 🔧 P7-5: WAL checkpoint（定期將 WAL 日誌合併到主數據庫）
                    try:
                        from core.db_utils import get_connection
                        with get_connection() as wal_conn:
                            # PASSIVE checkpoint：不阻塞其他連接
                            result = wal_conn.execute('PRAGMA wal_checkpoint(PASSIVE)').fetchone()
                            if result and result[1] > 0:  # result[1] = pages written
                                print(f"[WALCheckpoint] Checkpointed {result[1]} pages", file=sys.stderr)
                    except Exception as we:
                        print(f"[WALCheckpoint] Error: {we}", file=sys.stderr)
                    
                    # 4. 強制垃圾回收
                    collected = gc.collect()
                    
                    # 5. 記錄內存使用情況
                    try:
                        import psutil
                        process = psutil.Process()
                        memory_mb = process.memory_info().rss / 1024 / 1024
                        print(f"[MemoryCleanup] GC 回收 {collected} 個對象，當前內存: {memory_mb:.1f}MB", file=sys.stderr)
                    except ImportError:
                        print(f"[MemoryCleanup] GC 回收 {collected} 個對象", file=sys.stderr)
                except Exception as e:
                    print(f"[MemoryCleanup] 清理失敗: {e}", file=sys.stderr)
        
        # 🔧 Phase 3 + P7-5 優化：每日數據庫維護任務
        async def daily_db_maintenance():
            """每日數據庫維護任務（含完整性驗證和 TRUNCATE checkpoint）"""
            await asyncio.sleep(3600)  # 首次延遲 1 小時執行
            while True:
                try:
                    from db_optimizer import get_db_optimizer
                    optimizer = get_db_optimizer()
                    if optimizer:
                        # 清理過期數據
                        cleanup_result = await optimizer.cleanup_expired_data()
                        total = cleanup_result.get('total_cleaned', 0)
                        if total > 0:
                            print(f"[DBMaintenance] 清理了 {total} 條過期數據", file=sys.stderr)
                        
                        # 更新統計信息
                        await optimizer.analyze()
                except Exception as e:
                    print(f"[DBMaintenance] 維護失敗: {e}", file=sys.stderr)
                
                # P15-2: 清理過期消息隊列記錄
                try:
                    cleaned = await db.cleanup_old_queue_messages(days=7)
                    if cleaned > 0:
                        print(f"[DBMaintenance] Queue cleanup: removed {cleaned} old messages", file=sys.stderr)
                except Exception as qe:
                    print(f"[DBMaintenance] Queue cleanup error: {qe}", file=sys.stderr)
                
                # 🔧 P7-5: 每日 WAL TRUNCATE checkpoint + 完整性驗證
                try:
                    from core.db_utils import get_connection
                    with get_connection() as maint_conn:
                        # TRUNCATE checkpoint（每日凌晨，可以短暫阻塞寫入）
                        wal_result = maint_conn.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
                        if wal_result:
                            print(
                                f"[DBMaintenance] WAL TRUNCATE: "
                                f"busy={wal_result[0]}, log={wal_result[1]}, checkpointed={wal_result[2]}",
                                file=sys.stderr
                            )
                        
                        # 快速完整性檢查
                        integrity = maint_conn.execute('PRAGMA quick_check').fetchone()
                        if integrity and integrity[0] == 'ok':
                            print("[DBMaintenance] Database integrity: OK", file=sys.stderr)
                        else:
                            print(f"[DBMaintenance] ⚠ Integrity issue: {integrity}", file=sys.stderr)
                            self.send_log("⚠ 數據庫完整性檢查異常", "warning")
                except Exception as we:
                    print(f"[DBMaintenance] WAL/integrity check error: {we}", file=sys.stderr)
                
                await asyncio.sleep(86400)  # 24 小時
        
        # 創建後台任務（不等待完成）
        asyncio.create_task(delayed_maintenance_tasks())
        asyncio.create_task(periodic_memory_cleanup())
        asyncio.create_task(daily_db_maintenance())
        
        # 🔧 Phase 2 優化：初始化內存監控器
        try:
            async def memory_cleanup_callback():
                """內存緊急清理回調"""
                self._cleanup_cache()
                if self.telegram_manager:
                    await self.telegram_manager.cleanup_idle_clients()
            
            await get_init_memory_monitor()(
                event_callback=self.send_event,
                cleanup_callback=memory_cleanup_callback
            )
            print("[Backend] ✓ 內存監控器已啟動", file=sys.stderr)
        except Exception as e:
            print(f"[Backend] ⚠ 內存監控器初始化失敗: {e}", file=sys.stderr)
        
        # Initialize queue optimizer (消息发送队列优化)
        self.queue_optimizer = get_QueueOptimizer()(
            max_batch_size=10,
            batch_interval_seconds=5.0,
            min_send_interval=2.0,
            max_send_interval=10.0
        )
        
        # Initialize message queue with database and optimizer
        self.message_queue = MessageQueue(
            send_callback=self._queue_send_callback,
            database=db,
            optimizer=self.queue_optimizer
        )
        
        # ========== 優化：並行初始化子系統 ==========
        import time
        parallel_init_start = time.time()
        print("[Backend] Starting parallel subsystem initialization...", file=sys.stderr)
        
        # 第一批並行初始化（核心管理器）
        await asyncio.gather(
            self._initialize_proxy_rotation_manager(),      # 智能代理轮换
            self._initialize_enhanced_health_monitor(),     # 账户健康监控增强
            self._initialize_error_recovery(),              # 错误恢复和自动重试
            self._initialize_auto_funnel(),                 # 全自动销售漏斗
            self._initialize_ai_auto_chat(),                # AI自动聊天
            self._initialize_vector_memory(),               # 向量化记忆系统
            return_exceptions=True  # 防止單個失敗影響其他
        )
        
        # 第二批並行初始化（業務系統，依賴第一批）
        await asyncio.gather(
            self._initialize_scheduler(),                   # 自动化任务调度器
            self._initialize_batch_operations(),            # 批量操作系統
            self._initialize_ad_system(),                   # 廣告發送系統
            self._initialize_user_tracking(),               # 用戶追蹤系統
            self._initialize_campaign_system(),             # 營銷活動協調器
            self._initialize_multi_role_system(),           # 多角色協作系統
            return_exceptions=True
        )
        
        parallel_init_duration = time.time() - parallel_init_start
        print(f"[Backend] ✓ Parallel subsystem initialization completed in {parallel_init_duration:.3f}s", file=sys.stderr)
        
        # 🆕 Phase 2: 初始化命令路由器
        if ROUTER_AVAILABLE:
            try:
                router = setup_command_router(self)
                print(f"[Backend] ✓ Command router initialized with {len(router.get_commands())} commands", file=sys.stderr)
            except Exception as e:
                print(f"[Backend] ⚠ Command router initialization failed: {e}", file=sys.stderr)
        
        # 🆕 Phase3: 啟動時驗證命令別名註冊表
        self._validate_command_alias_registry()
        
        # Register private message handlers for already logged-in Sender accounts
        await self._register_existing_sender_handlers()
        
        # ========== 優化：後台執行非關鍵啟動任務 ==========
        async def background_startup_tasks():
            """後台執行的非關鍵啟動任務，不阻塞主啟動流程"""
            await asyncio.sleep(2)  # 等待主要初始化完成
            
            # Sync leads to user_profiles (one-time migration)
            try:
                await self._sync_leads_to_user_profiles()
            except Exception as e:
                import sys
                print(f"[Backend] Background sync leads error: {e}", file=sys.stderr)
            
            # 一致性檢查（後台執行）
            try:
                await self._startup_consistency_check()
            except Exception as e:
                import sys
                print(f"[Backend] Background consistency check error: {e}", file=sys.stderr)
            
            # 🆕 P2: 數據庫健康守護
            try:
                import os as _os
                from services.db_health_guard import get_db_health_guard
                data_dir = _os.environ.get('DATA_DIR', '/app/data')
                self._db_health_guard = get_db_health_guard(data_dir)
                await self._db_health_guard.start()
            except Exception as e:
                import sys
                print(f"[Backend] DB Health Guard start error: {e}", file=sys.stderr)
            
            # 🆕 代理供應商自動同步（Phase 2）
            try:
                from admin.proxy_sync import get_sync_service
                proxy_sync_svc = get_sync_service()
                await proxy_sync_svc.start_auto_sync()
                import sys
                print("[Backend] ✓ Proxy provider auto-sync started", file=sys.stderr)
            except Exception as e:
                import sys
                print(f"[Backend] Proxy auto-sync start error: {e}", file=sys.stderr)
        
        # 創建後台任務（不等待完成）
        asyncio.create_task(background_startup_tasks())
        
        # 🔧 P11-3: 設置異常→告警橋接（AnomalyDetection → AlertService）
        try:
            from core.observability_bridge import setup_anomaly_alert_bridge
            setup_anomaly_alert_bridge()
        except Exception as bridge_err:
            print(f"[Backend] ObservabilityBridge setup: {bridge_err}", file=sys.stderr)
        

        # ── Build ServiceContext (shared dependency container for domain handlers) ──
        try:
            from service_context import ServiceContext, set_service_context
            ctx = ServiceContext(
                db=db,
                telegram_manager=self.telegram_manager,
                send_event=self.send_event,
                send_log=self.send_log,
                message_queue=self.message_queue,
                alert_manager=self.alert_manager,
                backup_manager=self.backup_manager,
                smart_alert_manager=self.smart_alert_manager,
                proxy_rotation_manager=self.proxy_rotation_manager,
                enhanced_health_monitor=self.enhanced_health_monitor,
                queue_optimizer=self.queue_optimizer,
                error_recovery_manager=self.error_recovery_manager,
                qr_auth_manager=self.qr_auth_manager,
                ip_binding_manager=self.ip_binding_manager,
                credential_scraper=self.credential_scraper,
                batch_ops=getattr(self, 'batch_ops', None),
                send_accounts_updated=self._send_accounts_updated,
                save_session_metadata=self._save_session_metadata,
                invalidate_cache=self._invalidate_cache,
                start_log_batch_mode=self.start_log_batch_mode,
                stop_log_batch_mode=self.stop_log_batch_mode,
                cache=self._cache,
                cache_timestamps=self._cache_timestamps,
                backend_service=self,
            )
            self._service_context = ctx
            set_service_context(ctx)
            print(f"[Backend] ServiceContext initialized", file=sys.stderr)
        except Exception as ctx_err:
            print(f"[Backend] ServiceContext init error: {ctx_err}", file=sys.stderr)

        total_init_time = time.time() - init_start_time
        print(f"[Backend] ========== Initialization complete in {total_init_time:.3f}s ==========", file=sys.stderr)
        self.send_log(f"✓ 後端初始化完成 ({total_init_time:.2f}s)", "success")
        
        # 🆕 發送數據路徑信息到前端（便於調試）
        try:
            from config import DATABASE_DIR, DATABASE_PATH, SESSIONS_DIR, IS_DEV_MODE
            data_info = {
                "isDevMode": IS_DEV_MODE,
                "databaseDir": str(DATABASE_DIR),
                "databasePath": str(DATABASE_PATH),
                "sessionsDir": str(SESSIONS_DIR),
                "databaseExists": DATABASE_PATH.exists()
            }
            self.send_event("data-paths-info", data_info)
            
            mode_str = "開發模式" if IS_DEV_MODE else "生產模式"
            self.send_log(f"📁 {mode_str} - 數據目錄: {DATABASE_DIR}", "info")
            
            # 🆕 檢測是否有其他位置的數據需要遷移
            if IS_DEV_MODE:
                # 開發模式下，檢查 AppData 是否有數據
                import os
                appdata_path = os.environ.get('TG_DATA_DIR', '')
                if appdata_path:
                    appdata_db = Path(appdata_path) / "tgmatrix.db"
                    if appdata_db.exists() and not DATABASE_PATH.exists():
                        self.send_log(f"⚠️ 發現 AppData 中有數據庫，但本地目錄為空。可能需要遷移數據。", "warning")
                        self.send_event("data-migration-hint", {
                            "sourceDir": appdata_path,
                            "targetDir": str(DATABASE_DIR),
                            "message": "發現其他位置有數據，是否需要遷移？"
                        })
        except Exception as e:
            print(f"[Backend] Error sending data paths info: {e}", file=sys.stderr)
    
    async def _sync_leads_to_user_profiles(self):
        """同步現有的 leads 到 user_profiles 表"""
        try:
            # 先確保 user_profiles 表存在
            await db._connection.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    funnel_stage TEXT DEFAULT 'new',
                    interest_level INTEGER DEFAULT 1,
                    last_interaction TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db._connection.commit()
            
            leads = await db.get_all_leads()
            synced_count = 0
            
            for lead in leads:
                user_id = str(lead.get('userId', lead.get('user_id', '')))
                if not user_id:
                    continue
                    
                # 檢查是否已存在
                profile = await db.get_user_profile(user_id)
                if not profile:
                    await db._connection.execute("""
                        INSERT INTO user_profiles 
                        (user_id, username, first_name, last_name, funnel_stage, interest_level, created_at)
                        VALUES (?, ?, ?, ?, 'new', 1, CURRENT_TIMESTAMP)
                    """, (
                        user_id,
                        lead.get('username', ''),
                        lead.get('firstName', lead.get('first_name', '')),
                        lead.get('lastName', lead.get('last_name', ''))
                    ))
                    synced_count += 1
            
            if synced_count > 0:
                await db._connection.commit()
                self.send_log(f"📊 已同步 {synced_count} 個 Lead 到漏斗系統", "info")
                
        except Exception as e:
            import sys
            print(f"[Backend] Error syncing leads to user_profiles: {e}", file=sys.stderr)
    
    async def _startup_consistency_check(self):
        """
        啟動時一致性檢查：
        1. 掃描有 session 文件但無數據庫記錄的「孤立」帳號
        2. 嘗試使用 metadata.json 自動恢復
        3. 向前端發送恢復提示事件
        """
        import sys
        import json
        from pathlib import Path
        from config import SESSIONS_DIR
        
        try:
            print("[Backend] Starting consistency check...", file=sys.stderr)
            
            # 獲取所有 session 文件
            session_files = list(SESSIONS_DIR.glob("*.session"))
            
            if not session_files:
                print("[Backend] No session files found, skipping consistency check", file=sys.stderr)
                return
            
            # 獲取數據庫中的帳號
            existing_accounts = await db.get_all_accounts()
            existing_phones = set()
            for acc in existing_accounts:
                phone = acc.get('phone', '')
                safe_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
                existing_phones.add(safe_phone)
                existing_phones.add(phone)
            
            # 查找孤立的 session
            orphan_sessions = []
            auto_recoverable = []
            
            for session_file in session_files:
                phone = session_file.stem
                # 跳過臨時文件
                if phone.endswith('-journal') or phone.startswith('.'):
                    continue
                
                # 檢查是否在數據庫中
                if phone not in existing_phones and f"+{phone}" not in existing_phones:
                    # 檢查是否有 metadata 文件
                    metadata_path = SESSIONS_DIR / f"{phone}.metadata.json"
                    metadata = None
                    
                    if metadata_path.exists():
                        try:
                            with open(metadata_path, 'r', encoding='utf-8') as f:
                                metadata = json.load(f)
                        except Exception:
                            pass
                    
                    session_info = {
                        "phone": phone,
                        "hasMetadata": metadata is not None,
                        "metadata": metadata
                    }
                    
                    orphan_sessions.append(session_info)
                    
                    if metadata:
                        auto_recoverable.append(session_info)
            
            if orphan_sessions:
                print(f"[Backend] Found {len(orphan_sessions)} orphan session(s), {len(auto_recoverable)} auto-recoverable", file=sys.stderr)
                
                # 自動恢復有 metadata 的帳號
                recovered_count = 0
                for session_info in auto_recoverable:
                    try:
                        metadata = session_info['metadata']
                        phone = metadata.get('phone', f"+{session_info['phone']}")
                        
                        # 使用 add_account 方法插入到正確的數據庫（tgmatrix.db）
                        account_data = {
                            'phone': phone,
                            'apiId': metadata.get('apiId'),
                            'apiHash': metadata.get('apiHash'),
                            'firstName': metadata.get('firstName', ''),
                            'lastName': metadata.get('lastName', ''),
                            'username': metadata.get('username', ''),
                            'telegramId': metadata.get('telegramId', ''),
                            'role': metadata.get('role', 'Unassigned'),
                            'status': 'Offline'
                        }
                        await db.add_account(account_data)
                        recovered_count += 1
                        print(f"[Backend] Auto-recovered account: {mask_phone(phone)}", file=sys.stderr)
                    except Exception as e:
                        print(f"[Backend] Failed to auto-recover {mask_phone(session_info['phone'])}: {e}", file=sys.stderr)
                
                if recovered_count > 0:
                    self.send_log(f"🔄 已自動恢復 {recovered_count} 個帳號", "success")
                
                # 還有無法自動恢復的帳號，發送事件給前端
                remaining_orphans = [s for s in orphan_sessions if not s.get('hasMetadata')]
                if remaining_orphans:
                    self.send_event("orphan-sessions-detected", {
                        "count": len(remaining_orphans),
                        "sessions": remaining_orphans,
                        "message": f"發現 {len(remaining_orphans)} 個無法自動恢復的 Session 文件"
                    })
            else:
                print("[Backend] No orphan sessions found, database is consistent", file=sys.stderr)
                
        except Exception as e:
            import sys
            print(f"[Backend] Error in consistency check: {e}", file=sys.stderr)
    
    def _validate_command_alias_registry(self):
        """Phase3: 啟動時驗證命令別名註冊表中的所有條目"""
        import importlib
        valid = 0
        invalid = 0
        for cmd, (module_path, func_name) in COMMAND_ALIAS_REGISTRY.items():
            try:
                mod = importlib.import_module(module_path)
                fn = getattr(mod, func_name, None)
                if fn and callable(fn):
                    valid += 1
                else:
                    invalid += 1
                    print(f"[Backend] ⚠ Alias registry: {cmd} → {module_path}.{func_name} NOT FOUND", file=sys.stderr)
            except ImportError as ie:
                invalid += 1
                print(f"[Backend] ⚠ Alias registry: {cmd} → module {module_path} IMPORT ERROR: {ie}", file=sys.stderr)
        
        total = len(COMMAND_ALIAS_REGISTRY)
        print(f"[Backend] ✓ Command alias registry: {valid}/{total} valid, {invalid} invalid", file=sys.stderr)
        
        if invalid > 0:
            print(f"[Backend] ⚠ {invalid} alias entries have broken targets! Check above for details.", file=sys.stderr)
    
    async def _register_existing_sender_handlers(self):
        """為已登錄的發送帳號註冊私信處理器"""
        try:
            accounts = await db.get_all_accounts()
            for account in accounts:
                if account.get('status') == 'Online':
                    phone = account.get('phone')
                    account_role = account.get('role', 'Unassigned')
                    try:
                        await self.telegram_manager.register_private_message_handler(
                            phone=phone,
                            account_role=account_role
                        )
                        self.send_log(f"已為帳號 {phone} ({account_role}) 註冊私信處理器", "info")
                    except Exception as e:
                        self.send_log(f"註冊私信處理器失敗 ({phone}): {e}", "warning")
        except Exception as e:
            self.send_log(f"註冊現有發送帳號處理器錯誤: {e}", "warning")
    
    async def _initialize_auto_funnel(self):
        """Initialize auto funnel manager"""
        try:
            # Set callbacks
            auto_funnel.set_callbacks(
                send_callback=self._funnel_send_callback,
                log_callback=self.send_log,
                event_callback=self.send_event
            )
            
            # Start auto funnel
            await auto_funnel.start()
            self.send_log("[AutoFunnel] 全自动销售漏斗已启动", "success")
        except Exception as e:
            self.send_log(f"[AutoFunnel] 初始化失败: {e}", "error")
    
    async def _initialize_ai_auto_chat(self):
        """Initialize AI auto chat service"""
        try:
            # Initialize AI auto chat
            await ai_auto_chat.initialize()
            
            # Set callbacks
            async def ai_send_callback(account_phone: str, target_user_id: str, 
                                       message: str, source_group: str = None,
                                       username: str = None):
                """AI 自動回復發送回調"""
                try:
                    # 檢查用戶是否已互動（決定是否計入限額）
                    has_interacted = await self._user_has_interacted(target_user_id)
                    
                    # 檢查帳號限額（未互動用戶）
                    if not has_interacted:
                        account = await db.get_account_by_phone(account_phone)
                        if account:
                            if account.get('dailySendCount', 0) >= account.get('dailySendLimit', 50):
                                self.send_log(f"帳號 {account_phone} 已達每日發送限額，無法自動回復", "warning")
                                return False
                    
                    # 使用消息隊列發送
                    # 🔧 FIX: 添加 target_username 參數
                    await self.message_queue.add_message(
                        phone=account_phone,
                        user_id=target_user_id,
                        text=message,
                        source_group=source_group,
                        target_username=username,  # 🆕 用戶名備選
                        priority=MessagePriority.NORMAL
                    )
                    
                    # 更新每日計數（僅未互動用戶）
                    if not has_interacted:
                        account = await db.get_account_by_phone(account_phone)
                        if account:
                            await db.update_account(account.get('id'), {
                                'dailySendCount': account.get('dailySendCount', 0) + 1
                            })
                    
                    # 保存 AI 回復到聊天歷史
                    await db.add_chat_message(
                        user_id=target_user_id,
                        role='assistant',
                        content=message,
                        account_phone=account_phone,
                        source_group=source_group
                    )
                    
                    return True
                except Exception as e:
                    self.send_log(f"AI 自動回復發送失敗: {e}", "error")
                    return False
            
            ai_auto_chat.set_callbacks(
                send_callback=ai_send_callback,
                log_callback=self.send_log,
                event_callback=self.send_event
            )
            
            self.send_log("[AIAutoChat] AI 自動聊天服務已初始化", "success")
        except Exception as e:
            self.send_log(f"[AIAutoChat] 初始化失败: {e}", "error")
    
    async def _funnel_send_callback(self, target_user_id: str, message: str, 
                                     is_follow_up: bool = False, **kwargs):
        """Callback for auto funnel to send messages"""
        try:
            # 🔧 FIX: 從數據庫獲取用戶的 source_group 和 username
            source_group = kwargs.get('source_group', '')
            target_username = kwargs.get('username', '')
            
            # 如果沒有傳入，嘗試從 leads 表查詢
            if not source_group or not target_username:
                lead = await db.fetch_one(
                    "SELECT source_group_url, source_group, username FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                    (str(target_user_id),)
                )
                if lead:
                    if not source_group:
                        source_group = lead.get('source_group_url') or lead.get('source_group', '')
                    if not target_username:
                        target_username = lead.get('username', '')
            
            # Find an available sender account
            accounts = await db.get_all_accounts()
            sender = None
            for acc in accounts:
                if acc['status'] == 'Online' and acc['role'] == 'Sender':
                    sender = acc
                    break
            
            if not sender:
                # Find any online account
                for acc in accounts:
                    if acc['status'] == 'Online':
                        sender = acc
                        break
            
            if sender:
                await self.message_queue.add_message(
                    phone=sender['phone'],
                    user_id=target_user_id,
                    text=message,
                    source_group=source_group,      # 🆕 來源群組
                    target_username=target_username, # 🆕 用戶名備選
                    priority=MessagePriority.NORMAL
                )
                return True
            return False
        except Exception as e:
            self.send_log(f"[AutoFunnel] 发送失败: {e}", "error")
            return False
    
    async def _initialize_vector_memory(self):
        """Initialize vector memory system"""
        try:
            await vector_memory.initialize(use_neural=False)  # 默认使用简单嵌入
            self.send_log("[VectorMemory] 向量化记忆系统已启动", "success")
        except Exception as e:
            self.send_log(f"[VectorMemory] 初始化失败: {e}", "error")
    
    async def _initialize_scheduler(self):
        """Initialize task scheduler"""
        try:
            # Set callbacks
            scheduler.set_log_callback(self.send_log)
            scheduler.set_task_callback('follow_up', self._funnel_send_callback)
            
            # Start scheduler
            await scheduler.start()
            self.send_log("[Scheduler] 自动化任务调度器已启动", "success")
        except Exception as e:
            self.send_log(f"[Scheduler] 初始化失败: {e}", "error")
    
    async def _initialize_batch_operations(self):
        """Initialize batch operations manager"""
        try:
            self.batch_ops = await get_init_batch_operations()(db, self.send_event)
            self.send_log("[BatchOps] 批量操作系統已啟動", "success")
        except Exception as e:
            self.send_log(f"[BatchOps] 初始化失敗: {e}", "error")
            self.batch_ops = None
    
    async def _initialize_ad_system(self):
        """Initialize ad system (廣告發送系統)"""
        try:
            # Initialize ad template manager
            await get_init_ad_template_manager()(db)
            
            # Initialize ad manager
            await get_init_ad_manager()(db, self.send_event)
            
            # Initialize ad broadcaster
            get_init_ad_broadcaster()(
                telegram_manager=self.telegram_manager,
                db=db,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # Initialize ad scheduler
            ad_scheduler = get_init_ad_scheduler()(
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            await ad_scheduler.start()
            
            # Initialize ad analytics
            get_init_ad_analytics()(db)
            
            self.send_log("[AdSystem] 廣告發送系統已啟動", "success")
        except Exception as e:
            self.send_log(f"[AdSystem] 初始化失敗: {e}", "error")
    
    async def _initialize_user_tracking(self):
        """Initialize user tracking system (用戶追蹤系統)"""
        try:
            # Initialize user tracker
            await get_init_user_tracker()(
                db=db,
                telegram_manager=self.telegram_manager,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # Initialize user analytics
            get_init_user_analytics()(db)
            
            self.send_log("[UserTracker] 用戶追蹤系統已啟動", "success")
        except Exception as e:
            self.send_log(f"[UserTracker] 初始化失敗: {e}", "error")
    
    async def _initialize_campaign_system(self):
        """Initialize campaign orchestrator and multi-channel stats"""
        try:
            # Initialize campaign orchestrator
            await get_init_campaign_orchestrator()(
                db=db,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # Initialize multi-channel stats
            get_init_multi_channel_stats()(db)
            
            self.send_log("[Campaign] 營銷活動系統已啟動", "success")
        except Exception as e:
            self.send_log(f"[Campaign] 初始化失敗: {e}", "error")
    
    async def _initialize_multi_role_system(self):
        """Initialize multi-role collaboration system"""
        try:
            # Initialize multi-role manager
            await _get_module('multi_role_manager').init_multi_role_manager(
                db=db,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # Initialize script engine
            await get_init_script_engine()(
                db=db,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # Initialize collaboration coordinator
            await get_init_collaboration_coordinator()(
                db=db,
                telegram_manager=self.telegram_manager,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            
            # 🆕 P1-1: Initialize marketing task service
            marketing_task_svc = await get_init_marketing_task_service()(
                db=db,
                event_callback=self.send_event,
                log_callback=self.send_log
            )
            # Link with collaboration coordinator
            coordinator = get_collaboration_coordinator()
            if coordinator:
                marketing_task_svc.set_collaboration_coordinator(coordinator)
            
            self.send_log("[MultiRole] 多角色協作系統已啟動", "success")
            self.send_log("[MarketingTask] 統一營銷任務服務已啟動", "success")
        except Exception as e:
            self.send_log(f"[MultiRole] 初始化失敗: {e}", "error")
    
    async def _initialize_enhanced_health_monitor(self):
        """Initialize enhanced health monitor"""
        try:
            # Create alert callback
            def alert_callback(anomaly: Anomaly):
                """告警回调函数"""
                # 发送告警事件到前端
                self.send_event("health-anomaly-detected", {
                    "account_id": anomaly.account_id,
                    "phone": anomaly.phone,
                    "anomaly_type": anomaly.anomaly_type,
                    "severity": anomaly.severity,
                    "message": anomaly.message,
                    "current_value": anomaly.current_value,
                    "threshold": anomaly.threshold,
                    "timestamp": anomaly.timestamp.isoformat(),
                    "details": anomaly.details
                })
                
                # 记录日志
                log_type = "error" if anomaly.severity == "critical" else "warning"
                self.send_log(f"[健康监控] 账户 {anomaly.phone}: {anomaly.message}", log_type)
                
                # 如果严重，也发送到告警管理器
                if anomaly.severity in ['high', 'critical']:
                    if self.alert_manager:
                        try:
                            from alert_manager import AlertType, AlertLevel
                            alert_type = AlertType.ACCOUNT_HEALTH
                            level = AlertLevel.CRITICAL if anomaly.severity == 'critical' else AlertLevel.WARNING
                            self.alert_manager.create_alert(
                                alert_type=alert_type,
                                level=level,
                                message=anomaly.message,
                                details={
                                    "account_id": anomaly.account_id,
                                    "phone": anomaly.phone,
                                    "anomaly_type": anomaly.anomaly_type,
                                    "current_value": anomaly.current_value,
                                    "threshold": anomaly.threshold,
                                    **anomaly.details
                                }
                            )
                        except Exception as e:
                            import sys
                            print(f"[EnhancedHealthMonitor] Error creating alert: {e}", file=sys.stderr)
            
            # Initialize enhanced health monitor
            self.enhanced_health_monitor = get_EnhancedHealthMonitor()(
                alert_callback=alert_callback,
                check_interval_seconds=300  # 5 分钟检查一次
            )
            
            import sys
            print("[Backend] Enhanced health monitor initialized", file=sys.stderr)
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize enhanced health monitor: {e}", file=sys.stderr)
            # Don't fail initialization if health monitor fails
            self.enhanced_health_monitor = None
    
    async def _initialize_proxy_rotation_manager(self):
        """Initialize proxy rotation manager"""
        try:
            # Callback to update account proxy in database
            async def update_proxy_callback(account_id: int, phone: str, new_proxy: str):
                """更新账户代理的回调函数"""
                await db.update_account(account_id, {"proxy": new_proxy})
                import sys
                print(f"[ProxyRotationManager] Updated proxy for account {mask_phone(phone)}: {new_proxy[:30]}...", file=sys.stderr)
            
            # Initialize proxy rotation manager with empty pool (will be populated dynamically)
            self.proxy_rotation_manager = get_ProxyRotationManager()(
                proxy_pool=[],  # Empty pool, will be populated from accounts
                config=None,  # Use default config
                health_check_callback=None
            )
            
            # Set update callback
            self.proxy_rotation_manager.update_proxy_callback = update_proxy_callback
            
            import sys
            print("[Backend] Proxy rotation manager initialized", file=sys.stderr)
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize proxy rotation manager: {e}", file=sys.stderr)
            # Don't fail initialization if proxy rotation manager fails
            self.proxy_rotation_manager = None
    
    async def _initialize_error_recovery(self):
        """Initialize error recovery manager"""
        try:
            # Reconnect client callback
            async def reconnect_client(account_id: int, phone: str):
                """重新连接客户端的回调函数"""
                try:
                    # Disconnect and reconnect the client
                    if phone in self.telegram_manager.clients:
                        client = self.telegram_manager.clients[phone]
                        if client.is_connected:
                            await client.disconnect()
                        await client.connect()
                        return True
                    return False
                except Exception as e:
                    import sys
                    print(f"[ErrorRecovery] Failed to reconnect client for {mask_phone(phone)}: {e}", file=sys.stderr)
                    return False
            
            # Rotate proxy callback
            async def rotate_proxy(account_id: int, phone: str):
                """切换代理的回调函数"""
                if self.proxy_rotation_manager:
                    try:
                        account = await db.get_account(account_id)
                        if account:
                            current_proxy = account.get('proxy')
                            new_proxy = await self.proxy_rotation_manager.rotate_proxy(
                                phone=phone,
                                current_proxy=current_proxy,
                                reason=get_RotationReason().ERROR
                            )
                            if new_proxy:
                                await db.update_account(account_id, {"proxy": new_proxy})
                                return new_proxy
                    except Exception as e:
                        import sys
                        print(f"[ErrorRecovery] Failed to rotate proxy for {mask_phone(phone)}: {e}", file=sys.stderr)
                return None
            
            # Relogin callback
            async def relogin_account(account_id: int, phone: str):
                """重新登录账户的回调函数"""
                try:
                    account = await db.get_account(account_id)
                    if account:
                        result = await self.telegram_manager.login_account(
                            phone=phone,
                            api_id=account.get('apiId'),
                            api_hash=account.get('apiHash'),
                            proxy=account.get('proxy'),
                            two_factor_password=account.get('twoFactorPassword')
                        )
                        return result.get('success', False)
                except Exception as e:
                    import sys
                    print(f"[ErrorRecovery] Failed to relogin account {mask_phone(phone)}: {e}", file=sys.stderr)
                return False
            
            # Initialize error recovery manager
            def log_callback(message: str, level: str = "info"):
                self.send_log(f"[錯誤恢復] {message}", level)
            
            # 兼容兩個版本的 ErrorRecoveryManager
            try:
                # 嘗試使用 error_recovery_manager (新版本，接受 log_callback)
                ErrorRecoveryManagerClass = get_ErrorRecoveryManager()
                if ErrorRecoveryManagerClass:
                    self.error_recovery_manager = ErrorRecoveryManagerClass(log_callback=log_callback)
                else:
                    self.error_recovery_manager = None
            except TypeError:
                # 如果失敗，可能是 error_recovery (舊版本，不接受 log_callback)
                # 使用舊版本的參數
                ErrorRecoveryManagerClass = get_ErrorRecoveryManager()
                if ErrorRecoveryManagerClass:
                    self.error_recovery_manager = ErrorRecoveryManagerClass()
                else:
                    self.error_recovery_manager = None
            
            import sys
            print("[Backend] Error recovery manager initialized", file=sys.stderr)
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize error recovery manager: {e}", file=sys.stderr)
            # Don't fail initialization if error recovery manager fails
            self.error_recovery_manager = None
        
        # Initialize backup manager
        try:
            from config import DATABASE_PATH
            
            backup_dir = Path(DATABASE_PATH).parent / "backups"
            BackupManagerClass = get_BackupManager()
            self.backup_manager = BackupManagerClass(
                db_path=Path(DATABASE_PATH),
                backup_dir=backup_dir,
                log_callback=lambda msg, level="info": self.send_log(f"[備份] {msg}", level)
            )
            
            # 啟動定期備份（每24小時一次）
            await self.backup_manager.start_scheduled_backups(interval_hours=24)
            
            import sys
            print("[Backend] Backup manager initialized", file=sys.stderr)
            self.send_log("備份管理器已初始化（每24小時自動備份）", "success")
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize backup manager: {e}", file=sys.stderr)
            self.backup_manager = None
        
        # Initialize smart alert manager
        try:
            SmartAlertManagerClass = _get_module('smart_alert_manager').SmartAlertManager
            self.smart_alert_manager = SmartAlertManagerClass(db)
            import sys
            print("[Backend] Smart alert manager initialized", file=sys.stderr)
            self.send_log("智能告警管理器已初始化", "success")
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize smart alert manager: {e}", file=sys.stderr)
            self.smart_alert_manager = None
        
        # Initialize QR Auth Manager for QR code login
        try:
            # 檢查依賴庫是否可用
            from qr_auth_manager import HAS_TELETHON, HAS_QRCODE
            print(f"[Backend] QR Auth dependencies: HAS_TELETHON={HAS_TELETHON}, HAS_QRCODE={HAS_QRCODE}", file=sys.stderr)
            
            if not HAS_TELETHON:
                print("[Backend] Warning: telethon library not available for QR login", file=sys.stderr)
                self.send_log("telethon 庫未安裝，QR 登入功能不可用", "warning")
            if not HAS_QRCODE:
                print("[Backend] Warning: qrcode library not available for QR login", file=sys.stderr)
                self.send_log("qrcode 庫未安裝，QR 登入功能不可用", "warning")
            
            # 🔧 修復：使用統一的 SESSIONS_DIR 配置
            from config import SESSIONS_DIR
            sessions_dir = str(SESSIONS_DIR)
            print(f"[Backend] Initializing QR Auth manager with sessions_dir: {sessions_dir}", file=sys.stderr)
            
            # 創建 QR 登入事件回調函數，處理 qr-login-account-ready 事件
            def qr_event_callback(event_name: str, payload: Any):
                # 發送事件到前端
                self.send_event(event_name, payload)
                
                # 處理 qr-login-account-ready 事件：將帳號添加到數據庫
                if event_name == "qr-login-account-ready":
                    # 使用 asyncio 在事件循環中執行異步操作
                    asyncio.create_task(self._handle_qr_login_account_ready(payload))
            
            self.qr_auth_manager = get_init_qr_auth_manager()(sessions_dir, qr_event_callback)
            await self.qr_auth_manager.start()
            print("[Backend] QR Auth manager initialized successfully", file=sys.stderr)
            self.send_log("QR 掃碼登入管理器已初始化", "success")
        except Exception as e:
            print(f"[Backend] Failed to initialize QR auth manager: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            self.qr_auth_manager = None
        
        # Initialize IP Binding Manager (Phase 2)
        try:
            data_dir = str(Path(config.DATA_PATH))
            self.ip_binding_manager = get_init_ip_binding_manager()(data_dir, self.send_event)
            import sys
            print("[Backend] IP Binding manager initialized", file=sys.stderr)
            self.send_log("IP 粘性綁定管理器已初始化", "success")
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize IP binding manager: {e}", file=sys.stderr)
            self.ip_binding_manager = None
        
        # Initialize Credential Scraper (Phase 2)
        try:
            # 🔧 修復：使用統一的 SESSIONS_DIR 配置
            sessions_dir = str(SESSIONS_DIR)
            data_dir = str(Path(config.DATA_PATH))
            
            # Database callback for saving credential logs
            async def save_credential_log(log):
                try:
                    await db.add_credential_log(
                        account_id=log.account_id,
                        phone=log.phone,
                        action=log.action,
                        api_id=log.api_id,
                        api_hash=log.api_hash,
                        status=log.status,
                        error_message=log.error_message,
                        details_json=log.details_json
                    )
                except Exception as e:
                    print(f"[Backend] Error saving credential log: {e}", file=sys.stderr)
            
            self.credential_scraper = get_init_credential_scraper()(
                sessions_dir, data_dir, self.send_event, save_credential_log
            )
            import sys
            print("[Backend] Credential scraper initialized", file=sys.stderr)
            self.send_log("API 憑據獲取器已初始化", "success")
        except Exception as e:
            import sys
            print(f"[Backend] Failed to initialize credential scraper: {e}", file=sys.stderr)
            self.credential_scraper = None

    async def _user_has_interacted(self, user_id: str) -> bool:
        """
        檢查用戶是否已互動過（用於發送限額豁免）
        
        Args:
            user_id: 用戶ID
        
        Returns:
            True 如果用戶已互動過，False 否則
        """
        try:
            # 檢查聊天歷史中是否有用戶發送的消息
            cursor = await db._connection.execute("""
                SELECT COUNT(*) as count FROM chat_history 
                WHERE user_id = ? AND role = 'user'
            """, (user_id,))
            row = await cursor.fetchone()
            user_message_count = row['count'] if row else 0
            
            # 如果用戶發送過至少一條消息，視為已互動
            return user_message_count > 0
        except Exception as e:
            import sys
            print(f"[Backend] Error checking user interaction: {e}", file=sys.stderr)
            return False
    
    async def _queue_send_callback(self, phone: str, user_id: str, text: str, attachment: Any = None, source_group: Optional[str] = None, target_username: Optional[str] = None) -> Dict[str, Any]:
        """
        Callback function for MessageQueue to actually send messages via Telegram
        
        Args:
            phone: Account phone number
            user_id: Target user ID
            text: Message text
            attachment: Optional attachment (path string or {name, type, dataUrl} object)
            source_group: Optional source group ID/URL
            target_username: Optional target username (fallback)
            
        Returns:
            Dict with 'success' (bool) and optionally 'error' (str)
        """
        import sys
        attachment_info = f"attachment={type(attachment).__name__}" if attachment else "no attachment"
        if attachment and isinstance(attachment, dict):
            attachment_info = f"attachment={{name={attachment.get('name')}, type={attachment.get('type')}}}"
        print(f"[Backend] _queue_send_callback called: phone={phone}, user_id={user_id}, source_group={source_group}, target_username={target_username}, {attachment_info}, text={text[:50] if text else '(empty)'}...", file=sys.stderr)
        self.send_log(f"正在發送消息到 {target_username or user_id}...", "info")
        
        try:
            # Check Warmup status before sending (防封)
            account = await db.get_account_by_phone(phone)
            if account:
                # Determine message type (simplified: assume "active" for now)
                message_type = "active"  # Could be "reply_only" if replying to a message
                
                # Check if sending is allowed
                warmup_check = WarmupManager.should_allow_send(account, message_type)
                
                if not warmup_check.get('allowed'):
                    reason = warmup_check.get('reason', 'Unknown reason')
                    stage_info = warmup_check.get('current_stage')
                    
                    import sys
                    print(f"[Backend] Warmup check failed for {phone}: {reason}", file=sys.stderr)
                    if stage_info:
                        print(f"[Backend] Current stage: {stage_info.get('stage_name')} (Stage {stage_info.get('stage')})", file=sys.stderr)
                        print(f"[Backend] Daily limit: {warmup_check.get('daily_limit')}", file=sys.stderr)
                    
                    return {
                        "success": False,
                        "error": f"Warmup限制: {reason}",
                        "warmup_info": warmup_check
                    }
            
            # Send message via Pyrogram
            import time
            send_start_time = time.time()
            
            result = await self.telegram_manager.send_message(
                phone=phone,
                user_id=user_id,
                text=text,
                attachment=attachment,
                source_group=source_group,
                target_username=target_username
            )
            
            send_latency = (time.time() - send_start_time) * 1000  # 转换为毫秒
            
            print(f"[Backend] telegram_manager.send_message result: {result}", file=sys.stderr)
            
            if result.get('success'):
                self.send_log(f"✓ 消息發送成功到 {user_id}", "success")
                # Record send performance
                from performance_monitor import get_performance_monitor
                try:
                    monitor = get_performance_monitor()
                    monitor.record_send_performance(phone, send_latency)
                except:
                    pass  # Performance monitor might not be initialized
                
                # Record health metrics (账户健康监控增强)
                if self.enhanced_health_monitor:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        account_id = account.get('id')
                        self.enhanced_health_monitor.record_send_success(account_id, phone, send_latency)
                
                # Record proxy success (智能代理轮换)
                if self.proxy_rotation_manager:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        current_proxy = account.get('proxy')
                        if current_proxy:
                            self.proxy_rotation_manager.record_proxy_success(current_proxy, send_latency)
                
                return result
            else:
                # Handle flood wait
                error = result.get('error', 'Unknown error')
                self.send_log(f"✗ 消息發送失敗: {error}", "error")
                print(f"[Backend] Message send failed: {error}", file=sys.stderr)
                
                # 🔧 FIX: PEER_ID_INVALID 錯誤回退策略 - 嘗試使用其他帳號
                if 'PEER_ID_INVALID' in error or 'peer' in error.lower():
                    print(f"[Backend] PEER_ID_INVALID detected, trying fallback strategy...", file=sys.stderr)
                    
                    # 嘗試找一個在同一群組的帳號
                    fallback_result = await self._try_fallback_send(
                        original_phone=phone,
                        user_id=user_id,
                        text=text,
                        attachment=attachment,
                        source_group=source_group,
                        target_username=target_username
                    )
                    
                    if fallback_result and fallback_result.get('success'):
                        self.send_log(f"✓ 回退策略成功: 使用帳號 {fallback_result.get('used_phone')} 發送", "success")
                        return fallback_result
                    else:
                        fallback_error = fallback_result.get('error', '無可用的回退帳號') if fallback_result else '回退失敗'
                        self.send_log(f"回退策略失敗: {fallback_error}", "warning")
                
                # Record proxy error (智能代理轮换)
                if self.proxy_rotation_manager:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        account_id = account.get('id')
                        current_proxy = account.get('proxy')
                        if current_proxy:
                            self.proxy_rotation_manager.record_proxy_error(current_proxy, error)
                            
                            # 如果是代理错误，尝试自动轮换
                            if 'Proxy' in error or 'proxy' in error or 'Connection' in error:
                                try:
                                    new_proxy = await self.proxy_rotation_manager.rotate_proxy(
                                        account_id=account_id,
                                        phone=phone,
                                        reason=get_RotationReason().ERROR,
                                        preferred_country=account.get('proxyCountry')
                                    )
                                    if new_proxy and new_proxy != current_proxy:
                                        # 更新数据库中的代理
                                        await db.update_account(account_id, {'proxy': new_proxy})
                                        self.send_log(f"账户 {phone} 代理已自动轮换: {current_proxy[:30]}... -> {new_proxy[:30]}...", "info")
                                except Exception as e:
                                    import sys
                                    print(f"[Backend] Failed to auto-rotate proxy: {e}", file=sys.stderr)
                
                # Handle error with recovery manager (错误恢复和自动重试机制)
                account = await db.get_account_by_phone(phone)
                account_id = account.get('id') if account else None
                
                if account_id and self.error_recovery_manager:
                    try:
                        # 处理错误并执行恢复动作
                        error_exception = Exception(error)
                        recovery_result = await self.error_recovery_manager.handle_error(
                            account_id=str(account_id),
                            phone=phone,
                            error=error_exception,
                            attempt=0,  # 这里应该从消息队列获取实际尝试次数
                            context={
                                "user_id": user_id,
                                "message_text": text[:100] if text else None
                            }
                        )
                        
                        # 记录恢复结果
                        if recovery_result.success:
                            self.error_recovery_manager.record_recovery_success(str(account_id), recovery_result.action_taken)
                            if recovery_result.action_taken != RecoveryAction.RETRY:
                                self.send_log(f"账户 {phone} 错误恢复成功: {recovery_result.message}", "info")
                        else:
                            self.error_recovery_manager.record_recovery_failure(str(account_id), recovery_result.action_taken)
                            self.send_log(f"账户 {phone} 错误恢复失败: {recovery_result.message}", "warning")
                        
                        # 如果需要等待，更新结果中的错误信息
                        if recovery_result.retry_after:
                            result['retry_after'] = recovery_result.retry_after
                            result['recovery_action'] = recovery_result.action_taken.value
                    except Exception as e:
                        import sys
                        print(f"[Backend] Error in error recovery: {e}", file=sys.stderr)
                
                # Record health metrics (账户健康监控增强)
                if self.enhanced_health_monitor and account:
                    account_id = account.get('id')
                    self.enhanced_health_monitor.record_send_failure(account_id, phone, error, send_latency)
                
                if 'Flood wait' in error:
                    # Extract wait time from error message
                    import re
                    wait_match = re.search(r'wait (\d+) seconds', error)
                    if wait_match:
                        wait_seconds = int(wait_match.group(1))
                        
                        # Record Flood Wait (账户健康监控增强)
                        if self.enhanced_health_monitor:
                            account = await db.get_account_by_phone(phone)
                            if account:
                                account_id = account.get('id')
                                self.enhanced_health_monitor.record_flood_wait(account_id, phone, wait_seconds)
                        
                        # Update rate limiter in message queue
                        if self.message_queue and phone in self.message_queue.rate_limiters:
                            await self.message_queue.rate_limiters[phone].set_flood_wait(wait_seconds)
                
                return result
                
        except Exception as e:
            error_msg = str(e)
            # Provide user-friendly error messages
            if "not connected" in error_msg.lower() or "client not" in error_msg.lower():
                friendly_msg = f"账户 {phone} 未连接。请先登录该账户。"
            elif "flood" in error_msg.lower():
                friendly_msg = f"账户 {phone} 触发限流保护。系统将自动等待后重试。"
            elif "banned" in error_msg.lower() or "deactivated" in error_msg.lower():
                friendly_msg = f"账户 {phone} 可能被封禁或已停用。请检查账户状态。"
            else:
                friendly_msg = f"发送消息失败 ({phone}): {error_msg}"
            
            self.send_log(friendly_msg, "error")
            return {
                "success": False,
                "error": friendly_msg
            }
        
        # Restore pending messages from database
        await self.message_queue.restore_from_database()
    
    async def _try_fallback_send(
        self, 
        original_phone: str, 
        user_id: str, 
        text: str, 
        attachment: Any = None, 
        source_group: Optional[str] = None, 
        target_username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🔧 回退發送策略：當原始帳號無法發送時，嘗試使用其他帳號
        
        策略優先級：
        1. 嘗試使用監控該群組的 Listener 帳號（它們已經在群組中）
        2. 嘗試使用其他在線的 Sender 帳號
        3. 嘗試使用任何在線帳號
        """
        import sys
        print(f"[Backend] _try_fallback_send: source_group={source_group}, target_username={target_username}", file=sys.stderr)
        
        try:
            # 獲取所有在線帳號
            accounts = await db.get_all_accounts()
            online_accounts = [a for a in accounts if a.get('status') == 'Online' and a.get('phone') != original_phone]
            
            if not online_accounts:
                return {"success": False, "error": "沒有其他在線帳號可用"}
            
            # 優先級 1：找監控該群組的 Listener 帳號
            if source_group:
                # 檢查哪些帳號在這個群組中
                for acc in online_accounts:
                    if acc.get('role') == 'Listener':
                        phone = acc.get('phone')
                        print(f"[Backend] Trying Listener account: {phone}", file=sys.stderr)
                        
                        result = await self.telegram_manager.send_message(
                            phone=phone,
                            user_id=user_id,
                            text=text,
                            attachment=attachment,
                            source_group=source_group,
                            target_username=target_username
                        )
                        
                        if result.get('success'):
                            result['used_phone'] = phone
                            result['fallback_strategy'] = 'listener'
                            return result
                        else:
                            print(f"[Backend] Listener {phone} also failed: {result.get('error')}", file=sys.stderr)
            
            # 優先級 2：嘗試其他 Sender 帳號
            sender_accounts = [a for a in online_accounts if a.get('role') == 'Sender']
            for acc in sender_accounts:
                phone = acc.get('phone')
                print(f"[Backend] Trying other Sender account: {phone}", file=sys.stderr)
                
                result = await self.telegram_manager.send_message(
                    phone=phone,
                    user_id=user_id,
                    text=text,
                    attachment=attachment,
                    source_group=source_group,
                    target_username=target_username
                )
                
                if result.get('success'):
                    result['used_phone'] = phone
                    result['fallback_strategy'] = 'other_sender'
                    return result
            
            # 優先級 3：嘗試任何在線帳號（包括沒有指定角色的）
            for acc in online_accounts:
                if acc.get('role') not in ['Listener', 'Sender']:
                    phone = acc.get('phone')
                    print(f"[Backend] Trying any online account: {phone}", file=sys.stderr)
                    
                    result = await self.telegram_manager.send_message(
                        phone=phone,
                        user_id=user_id,
                        text=text,
                        attachment=attachment,
                        source_group=source_group,
                        target_username=target_username
                    )
                    
                    if result.get('success'):
                        result['used_phone'] = phone
                        result['fallback_strategy'] = 'any_account'
                        return result
            
            return {"success": False, "error": "所有帳號都無法發送"}
            
        except Exception as e:
            print(f"[Backend] _try_fallback_send error: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}
    
    async def _start_browsing_simulation(self, account_id: int, phone: str, group_urls: List[str]):
        """
        启动浏览行为模拟后台任务
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            group_urls: 群组 URL 列表
        """
        async def browsing_task():
            """浏览行为模拟任务"""
            try:
                # 获取行为模拟器
                behavior_simulator = self.telegram_manager.behavior_simulator
                
                # 获取客户端
                if phone not in self.telegram_manager.clients:
                    return
                client = self.telegram_manager.clients[phone]
                
                # 转换群组 URL 为 ID
                group_ids = []
                for group_url in group_urls:
                    try:
                        if isinstance(group_url, (int, str)) and str(group_url).lstrip('-').isdigit():
                            group_ids.append(int(group_url))
                        else:
                            chat = await client.get_chat(group_url)
                            group_ids.append(chat.id)
                    except Exception:
                        continue
                
                if not group_ids:
                    return
                
                # 持续运行浏览模拟
                while self.running:
                    try:
                        # 检查是否应该浏览
                        if behavior_simulator.should_browse_now(account_id):
                            # 模拟浏览
                            browse_result = await behavior_simulator.simulate_browsing(
                                client=client,
                                account_id=account_id,
                                group_ids=group_ids
                            )
                            
                            if browse_result.get('success'):
                                import sys
                                print(f"[BehaviorSimulator] Account {phone} browsed {browse_result.get('count', 0)} groups", file=sys.stderr)
                        
                        # 等待下次浏览（30-60 分钟）
                        delay = behavior_simulator.get_random_activity_delay()
                        await asyncio.sleep(delay)
                    
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        import sys
                        print(f"[BehaviorSimulator] Error in browsing task for {phone}: {e}", file=sys.stderr)
                        # 等待一段时间后重试
                        await asyncio.sleep(300)  # 5 分钟后重试
            
            except Exception as e:
                import sys
                print(f"[BehaviorSimulator] Browsing task failed for {phone}: {e}", file=sys.stderr)
        
        # 启动后台任务
        task = asyncio.create_task(browsing_task())
        self.background_tasks.append(task)
        import sys
        print(f"[BehaviorSimulator] Started browsing simulation for account {phone}", file=sys.stderr)
        
        # Start background tasks
        self.background_tasks.append(asyncio.create_task(self.daily_reset_task()))
        self.background_tasks.append(asyncio.create_task(self.account_health_monitor_task()))
        self.background_tasks.append(asyncio.create_task(self.queue_cleanup_task()))
        self.background_tasks.append(asyncio.create_task(self.message_confirmation_timeout_task()))
        
        # 同步 API 憑據使用計數
        try:
            from api_credential_pool import get_api_credential_pool
            data_dir = str(Path(config.DATA_PATH))
            pool = get_api_credential_pool(data_dir)
            accounts = await db.get_all_accounts()
            pool.sync_usage_counts(accounts)
            print(f"[Backend] API credential usage counts synced for {len(accounts)} accounts", file=sys.stderr)
        except Exception as e:
            print(f"[Backend] Error syncing API credential usage: {e}", file=sys.stderr)
        
        # Log startup
        await db.add_log("Backend service started", "info")
        print(safe_json_dumps({
            "event": "log-entry",
            "payload": {
                "id": int(datetime.now().timestamp() * 1000),
                "timestamp": datetime.now().isoformat() + "Z",
                "message": "Backend service started",
                "type": "info"
            }
        }), flush=True)
    
    async def safe_delete_session_file(self, session_path: Path, max_retries: int = 5, retry_delay: float = 0.5) -> bool:
        """
        Safely delete a session file with retry mechanism for Windows file locking issues
        
        Args:
            session_path: Path to the session file to delete
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
            
        Returns:
            True if file was deleted successfully, False otherwise
        """
        if not session_path.exists():
            return True  # File doesn't exist, consider it "deleted"
        
        import sys
        for attempt in range(max_retries):
            try:
                session_path.unlink()
                print(f"[Backend] Successfully deleted session file: {session_path} (attempt {attempt + 1})", file=sys.stderr)
                return True
            except PermissionError as e:
                if attempt < max_retries - 1:
                    print(f"[Backend] Session file locked, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries}): {session_path}", file=sys.stderr)
                    # Force garbage collection to release file handles
                    gc.collect()
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 1.5  # Exponential backoff
                else:
                    print(f"[Backend] Failed to delete session file after {max_retries} attempts: {e}", file=sys.stderr)
                    return False
            except Exception as e:
                print(f"[Backend] Error deleting session file: {e}", file=sys.stderr)
                return False
        
        return False
    
    async def shutdown(self):
        """Shutdown the backend service"""
        self.running = False
        
        # Stop acknowledgment manager
        try:
            ack_manager = get_ack_manager()
            await ack_manager.stop()
        except Exception as e:
            print(f"[Backend] Error stopping ack manager: {e}", file=sys.stderr)
        
        # Disconnect all Telegram clients
        try:
            await self.telegram_manager.disconnect_all()
        except Exception as e:
            print(f"[Backend] Error disconnecting clients: {e}", file=sys.stderr)
        
        # 🆕 P2: 停止數據庫健康守護
        try:
            if hasattr(self, '_db_health_guard') and self._db_health_guard:
                await self._db_health_guard.stop()
        except Exception as e:
            print(f"[Backend] Error stopping DB health guard: {e}", file=sys.stderr)
        
        # Try to log shutdown (only if database is still connected)
        try:
            if db._connection is not None:
                await db.add_log("Backend service shutting down", "info")
                await db.close()
        except Exception as e:
            print(f"[Backend] Error during database shutdown: {e}", file=sys.stderr)
    
    # HTTP Server 引用（由 HttpApiServer 設置）
    _http_server = None
    
    def send_event(self, event_name: str, payload: Any, message_id: Optional[str] = None, tenant_id: str = None):
        """
        Send an event to Electron via stdout AND broadcast to WebSocket clients
        
        Args:
            event_name: Event name
            payload: Event payload
            message_id: Optional message ID for confirmation
            tenant_id: Optional tenant ID for multi-tenant broadcast filtering
        """
        message = {
            "event": event_name,
            "payload": payload
        }
        if message_id:
            message["message_id"] = message_id
        
        # Debug logging for important events
        if event_name in ('initial-state', 'accounts-updated'):
            import sys
            print(f"[Backend] ★★★ send_event called for {event_name} ★★★", file=sys.stderr)
            if event_name == 'initial-state':
                accounts_count = len(payload.get('accounts', [])) if isinstance(payload, dict) else 0
                print(f"[Backend] initial-state payload accounts: {accounts_count}", file=sys.stderr)
            elif event_name == 'accounts-updated':
                accounts_count = len(payload) if isinstance(payload, list) else 0
                print(f"[Backend] accounts-updated payload count: {accounts_count}", file=sys.stderr)
        
        # 使用安全的 JSON 序列化，處理 emoji 和特殊字符
        try:
            json_str = safe_json_dumps(message)
            if event_name in ('initial-state', 'accounts-updated'):
                import sys
                print(f"[Backend] JSON length for {event_name}: {len(json_str)}", file=sys.stderr)
            print(json_str, flush=True)
            
            # 🆕 SaaS 模式：廣播到 WebSocket 客戶端
            if self._http_server and hasattr(self._http_server, 'broadcast'):
                import asyncio
                try:
                    # 🔧 多租戶安全：獲取當前租戶 ID 用於過濾廣播
                    broadcast_tenant_id = tenant_id
                    if not broadcast_tenant_id:
                        try:
                            from core.tenant_context import get_current_tenant
                            t = get_current_tenant()
                            if t and t.user_id:
                                broadcast_tenant_id = t.user_id
                        except (ImportError, Exception):
                            pass
                    
                    loop = asyncio.get_running_loop()
                    asyncio.ensure_future(self._http_server.broadcast(event_name, payload, tenant_id=broadcast_tenant_id))
                except RuntimeError:
                    # 如果沒有運行的事件循環，嘗試創建新任務
                    pass
                    
        except Exception as e:
            import sys
            print(f"[Backend] Error in safe_json_dumps for {event_name}: {e}", file=sys.stderr)
            # 最後的備用方案：強制 ASCII 編碼
            print(json.dumps(sanitize_dict(message), ensure_ascii=True, default=str), flush=True)
    
    # 🆕 日誌批量模式相關
    _log_batch_mode = False
    _log_batch_buffer: list = []
    
    def send_log(self, message: str, log_type: str = "info"):
        """Send a log entry event (支持批量模式)"""
        log_entry = {
            "id": int(datetime.now().timestamp() * 1000),
            "timestamp": datetime.now().isoformat() + "Z",
            "message": message,
            "type": log_type
        }
        
        # 🆕 批量模式：暫存日誌，稍後一次性發送
        if self._log_batch_mode:
            self._log_batch_buffer.append(log_entry)
            # 每累積 10 條或遇到 error/success 類型時刷新
            if len(self._log_batch_buffer) >= 10 or log_type in ('error', 'success'):
                self._flush_log_batch()
        else:
            self.send_event("log-entry", log_entry)
    
    def start_log_batch_mode(self):
        """🆕 啟動日誌批量模式（減少 IPC 調用）"""
        self._log_batch_mode = True
        self._log_batch_buffer = []
    
    def stop_log_batch_mode(self):
        """🆕 停止日誌批量模式並刷新所有緩衝日誌"""
        self._flush_log_batch()
        self._log_batch_mode = False
    
    def _flush_log_batch(self):
        """🆕 刷新日誌批量緩衝區"""
        if self._log_batch_buffer:
            # 批量發送所有日誌
            self.send_event("log-entries-batch", {
                "entries": self._log_batch_buffer
            })
            self._log_batch_buffer = []
    
    async def _save_session_metadata(self, phone: str, metadata: dict):
        """
        保存 Session Metadata 到 JSON 文件
        用於在數據庫丟失時恢復帳號
        """
        import json
        from pathlib import Path
        from config import SESSIONS_DIR
        
        # 規範化電話號碼（移除 +）
        normalized_phone = phone.replace('+', '').strip()
        
        # 🆕 使用持久化 sessions 目錄
        metadata_path = SESSIONS_DIR / f"{normalized_phone}.metadata.json"
        
        # 確保目錄存在
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 寫入 metadata
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    async def handle_command(self, command: str, payload: Any, request_id: Optional[str] = None):
        """Handle incoming commands"""
        try:
            # Register request for acknowledgment if request_id is provided
            ack_manager = get_ack_manager()
            if request_id:
                # Register the request
                await ack_manager.register_request(
                    command=command,
                    payload=payload,
                    callback=None,  # No callback needed for simple acknowledgment
                    timeout_seconds=30.0,
                    max_retries=0  # Don't retry, just acknowledge
                )
                
                # Send immediate acknowledgment
                self.send_event("command-ack", {
                    "request_id": request_id,
                    "command": command,
                    "status": "received"
                })
            
            # 🆕 Phase 7: 使用命令路由器處理所有命令
            if ROUTER_AVAILABLE:
                try:
                    # 🔧 P0: 添加命令路由日誌
                    print(f"[Backend] Processing command via router: {command}", file=sys.stderr)
                    handled, result = await try_route_command(command, payload, request_id)
                    if handled:
                        print(f"[Backend] ✓ Command handled by router: {command}", file=sys.stderr)
                        return result  # 🔧 FIX: Return the result from router
                    else:
                        print(f"[Backend] Command not handled by router, using fallback: {command}", file=sys.stderr)
                except Exception as router_error:
                    # 路由器錯誤，使用動態回退機制
                    print(f"[Backend] Router error for {command}: {router_error}, using fallback", file=sys.stderr)
            
            # 🔧 P0: 顯式處理知識庫命令（繞過路由器問題）
            if command == 'add-knowledge-base':
                print(f"[Backend] 🔧 Direct handling add-knowledge-base", file=sys.stderr)
                await self.handle_add_knowledge_base(payload or {})
                return
            elif command == 'add-knowledge-item':
                print(f"[Backend] 🔧 Direct handling add-knowledge-item", file=sys.stderr)
                await self.handle_add_knowledge_item(payload or {})
                return
            elif command == 'get-knowledge-items':
                print(f"[Backend] 🔧 Direct handling get-knowledge-items", file=sys.stderr)
                await self.handle_get_knowledge_items(payload or {})
                return
            elif command == 'ai-generate-knowledge':
                print(f"[Backend] 🔧 Direct handling ai-generate-knowledge", file=sys.stderr)
                await self.handle_ai_generate_knowledge(payload or {})
                return
            elif command == 'apply-industry-template':
                print(f"[Backend] 🔧 Direct handling apply-industry-template", file=sys.stderr)
                await self.handle_apply_industry_template(payload or {})
                return
            elif command == 'learn-from-chat-history':
                print(f"[Backend] 🔧 Direct handling learn-from-chat-history", file=sys.stderr)
                await self.handle_learn_from_chat_history(payload or {})
                return
            
            # 🧠 RAG 知識大腦 2.0 命令
            elif command == 'rag-initialize':
                print(f"[Backend] 🧠 RAG Initialize", file=sys.stderr)
                await self.handle_rag_initialize(payload or {})
                return
            elif command == 'rag-search':
                print(f"[Backend] 🧠 RAG Search", file=sys.stderr)
                await self.handle_rag_search(payload or {})
                return
            elif command == 'rag-get-stats':
                print(f"[Backend] 🧠 RAG Get Stats", file=sys.stderr)
                await self.handle_rag_get_stats(payload or {})
                return
            elif command == 'rag-add-knowledge':
                print(f"[Backend] 🧠 RAG Add Knowledge", file=sys.stderr)
                await self.handle_rag_add_knowledge(payload or {})
                return
            elif command == 'rag-record-feedback':
                print(f"[Backend] 🧠 RAG Record Feedback", file=sys.stderr)
                await self.handle_rag_record_feedback(payload or {})
                return
            elif command == 'rag-build-from-conversation':
                print(f"[Backend] 🧠 RAG Build From Conversation", file=sys.stderr)
                await self.handle_rag_build_from_conversation(payload or {})
                return
            elif command == 'rag-preview-import':
                print(f"[Backend] 🧠 RAG Preview Import (P1-2)", file=sys.stderr)
                await self.handle_rag_preview_import(payload or {})
                return
            elif command == 'rag-confirm-import':
                print(f"[Backend] 🧠 RAG Confirm Import (P1-2)", file=sys.stderr)
                await self.handle_rag_confirm_import(payload or {})
                return
            elif command == 'rag-import-url':
                print(f"[Backend] 🧠 RAG Import URL", file=sys.stderr)
                await self.handle_rag_import_url(payload or {})
                return
            elif command == 'rag-import-document':
                print(f"[Backend] 🧠 RAG Import Document", file=sys.stderr)
                await self.handle_rag_import_document(payload or {})
                return
            elif command == 'rag-cleanup':
                print(f"[Backend] 🧠 RAG Cleanup", file=sys.stderr)
                await self.handle_rag_cleanup(payload or {})
                return
            elif command == 'rag-merge-similar':
                print(f"[Backend] 🧠 RAG Merge Similar", file=sys.stderr)
                await self.handle_rag_merge_similar(payload or {})
                return
            elif command == 'rag-get-gaps':
                print(f"[Backend] 🧠 RAG Get Gaps", file=sys.stderr)
                await self.handle_rag_get_gaps(payload or {})
                return
            elif command == 'rag-resolve-gap':
                print(f"[Backend] 🧠 RAG Resolve Gap", file=sys.stderr)
                await self.handle_rag_resolve_gap(payload or {})
                return
            elif command == 'rag-ignore-gap':
                print(f"[Backend] 🧠 RAG Ignore Gap", file=sys.stderr)
                await self.handle_rag_ignore_gap(payload or {})
                return
            elif command == 'rag-delete-gap':
                print(f"[Backend] 🧠 RAG Delete Gap", file=sys.stderr)
                await self.handle_rag_delete_gap(payload or {})
                return
            elif command == 'rag-delete-gaps-batch':
                print(f"[Backend] 🧠 RAG Delete Gaps Batch", file=sys.stderr)
                await self.handle_rag_delete_gaps_batch(payload or {})
                return
            elif command == 'rag-cleanup-duplicate-gaps':
                print(f"[Backend] 🧠 RAG Cleanup Duplicate Gaps", file=sys.stderr)
                await self.handle_rag_cleanup_duplicate_gaps(payload or {})
                return
            elif command == 'rag-suggest-gap-answer':
                print(f"[Backend] 🧠 RAG Suggest Gap Answer", file=sys.stderr)
                await self.handle_rag_suggest_gap_answer(payload or {})
                return
            elif command == 'rag-get-all-knowledge':
                print(f"[Backend] 🧠 RAG Get All Knowledge", file=sys.stderr)
                await self.handle_rag_get_all_knowledge(payload or {})
                return
            elif command == 'rag-add-knowledge':
                print(f"[Backend] 🧠 RAG Add Knowledge", file=sys.stderr)
                await self.handle_rag_add_knowledge(payload or {})
                return
            elif command == 'rag-update-knowledge':
                print(f"[Backend] 🧠 RAG Update Knowledge", file=sys.stderr)
                await self.handle_rag_update_knowledge(payload or {})
                return
            elif command == 'rag-delete-knowledge':
                print(f"[Backend] 🧠 RAG Delete Knowledge", file=sys.stderr)
                await self.handle_rag_delete_knowledge(payload or {})
                return
            elif command == 'rag-delete-knowledge-batch':
                print(f"[Backend] 🧠 RAG Delete Knowledge Batch", file=sys.stderr)
                await self.handle_rag_delete_knowledge_batch(payload or {})
                return
            elif command == 'rag-get-health-report':
                print(f"[Backend] 🧠 RAG Get Health Report", file=sys.stderr)
                await self.handle_rag_get_health_report(payload or {})
                return
            elif command == 'rag-start-guided-build':
                print(f"[Backend] 🧠 RAG Start Guided Build", file=sys.stderr)
                await self.handle_rag_start_guided_build(payload or {})
                return
            
            # 🔧 P8-5: 前端審計日誌批量接收
            elif command == 'audit-log-batch':
                entries = (payload or {}).get('entries', [])
                if entries:
                    try:
                        from core.db_utils import get_connection
                        with get_connection() as conn:
                            # 確保表存在
                            conn.execute('''
                                CREATE TABLE IF NOT EXISTS frontend_audit_log (
                                    id TEXT PRIMARY KEY,
                                    action TEXT NOT NULL,
                                    severity TEXT DEFAULT 'info',
                                    user_id TEXT,
                                    details TEXT,
                                    timestamp INTEGER,
                                    received_at TEXT DEFAULT CURRENT_TIMESTAMP
                                )
                            ''')
                            # 批量插入
                            for entry in entries[:100]:
                                conn.execute(
                                    'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                                    (
                                        entry.get('id', ''),
                                        entry.get('action', 'unknown'),
                                        entry.get('severity', 'info'),
                                        str(entry.get('userId', '')),
                                        json.dumps(entry.get('details', {}), ensure_ascii=False),
                                        entry.get('timestamp', 0)
                                    )
                                )
                            conn.commit()
                        print(f"[Backend] 📝 Stored {len(entries)} frontend audit entries", file=sys.stderr)
                    except Exception as ae:
                        print(f"[Backend] Audit log batch error: {ae}", file=sys.stderr)
                return
            
            # 🆕 Phase3: 命令別名註冊表 — 在 getattr 之前優先匹配
            if command in COMMAND_ALIAS_REGISTRY:
                module_path, func_name = COMMAND_ALIAS_REGISTRY[command]
                try:
                    import importlib
                    mod = importlib.import_module(module_path)
                    alias_handler = getattr(mod, func_name, None)
                    if alias_handler and callable(alias_handler):
                        print(f"[Backend] ✓ Alias registry: {command} → {module_path}.{func_name}", file=sys.stderr)
                        if payload is not None:
                            result = await alias_handler(self, payload)
                        else:
                            result = await alias_handler(self)
                        return result
                    else:
                        print(f"[Backend] ⚠ Alias registry: {func_name} not found in {module_path}", file=sys.stderr)
                except Exception as alias_err:
                    print(f"[Backend] ⚠ Alias registry error for {command}: {alias_err}", file=sys.stderr)
            
            # 🆕 Phase 7: 動態回退機制 - 替代巨型 if-elif 鏈
            # 將命令名轉換為方法名: add-account -> handle_add_account, batch-send:start -> handle_batch_send_start
            # 🔧 P0: 同時處理 - 和 : 符號
            method_name = 'handle_' + command.replace('-', '_').replace(':', '_')
            handler = getattr(self, method_name, None)
            
            if handler is not None and callable(handler):
                # 特殊處理 graceful-shutdown
                if command == "graceful-shutdown":
                    await handler()
                    return  # Don't continue processing after shutdown
                
                # 🔧 Phase 3 修復：檢查 handler 函數是否接受 payload 參數
                import inspect
                try:
                    sig = inspect.signature(handler)
                    # 計算除 self 之外的參數數量（對於綁定方法，self 已被綁定）
                    params = list(sig.parameters.values())
                    accepts_payload = len(params) > 0
                except (ValueError, TypeError):
                    # 無法獲取簽名時，嘗試傳入 payload
                    accepts_payload = True
                
                # 調用處理器並返回結果
                if payload is not None and accepts_payload:
                    result = await handler(payload)
                else:
                    result = await handler()
                return result  # 🔧 FIX: Return the handler result
            else:
                # 🆕 Phase3: 追蹤未知命令
                _unknown_command_counter[command] = _unknown_command_counter.get(command, 0) + 1
                count = _unknown_command_counter[command]
                if count <= _UNKNOWN_CMD_LOG_THRESHOLD or count % 10 == 0:
                    print(f"[Backend] ⚠ Unknown command: {command} (count: {count})", file=sys.stderr)
                self.send_log(f"Unknown command: {command}", "warning")
                return None
            
            # 🆕 Phase 7: 舊的 if-elif 鏈（1,370+ 行）已被上方動態機制取代
            # 所有 452 個命令現在通過 CommandRouter + 動態 getattr 回退處理
            # 這大幅減少了代碼重複並提高了可維護性
        
        except Exception as e:
            # Use global error handler
            app_error = handle_error(e, {"command": command, "payload": payload})
            # Error is already logged by error handler
            
            # Send error acknowledgment if request_id provided
            if request_id:
                self.send_event("command-complete", {
                    "request_id": request_id,
                    "command": command,
                    "status": "error",
                    "error": str(app_error)
                })
            
            import traceback
            traceback.print_exc()
    
    async def handle_get_initial_state(self):
        from api.handlers.lifecycle_handlers_impl import handle_get_initial_state as _handle_get_initial_state
        return await _handle_get_initial_state(self)

    # ========== Partial Update Functions ==========
    # These functions send only the updated data instead of full state refresh
    
    async def send_keyword_sets_update(self):
        """Send only keyword sets update to frontend with deduplication and error handling"""
        try:
            keyword_sets = await db.get_all_keyword_sets()
            
            if not keyword_sets:
                # 如果沒有關鍵詞集，發送空數組
                self.send_event("keyword-sets-updated", {"keywordSets": []})
                return
            
            # 去重處理：確保沒有重複的關鍵詞集和關鍵詞
            seen_set_ids = set()  # 使用 ID 而不是名稱，因為名稱可能重複
            seen_set_names = {}  # 名稱 -> ID 映射，用於檢測重複名稱
            deduplicated_sets = []
            
            for keyword_set in keyword_sets:
                set_id = keyword_set.get('id')
                set_name = keyword_set.get('name', '')
                
                # 如果關鍵詞集 ID 已處理過，跳過（防止重複）
                if set_id in seen_set_ids:
                    continue
                seen_set_ids.add(set_id)
                
                # 如果關鍵詞集名稱已存在且 ID 不同，記錄警告但保留（因為可能確實有同名但不同的集）
                if set_name and set_name in seen_set_names:
                    if seen_set_names[set_name] != set_id:
                        import sys
                        print(f"[Backend] Warning: Duplicate keyword set name '{set_name}' with different IDs: {seen_set_names[set_name]} and {set_id}", file=sys.stderr)
                seen_set_names[set_name] = set_id
                
                # 對關鍵詞進行去重（基於 keyword + isRegex 組合）
                seen_keywords = set()
                unique_keywords = []
                for keyword in keyword_set.get('keywords', []):
                    keyword_text = keyword.get('keyword', '')
                    is_regex = keyword.get('isRegex', False)
                    keyword_id = keyword.get('id')
                    key = (keyword_text, is_regex)
                    
                    # 如果關鍵詞已存在，跳過（保留第一個）
                    if key in seen_keywords:
                        import sys
                        print(f"[Backend] Warning: Duplicate keyword '{keyword_text}' (isRegex={is_regex}) in set {set_id}, skipping", file=sys.stderr)
                        continue
                    
                    seen_keywords.add(key)
                    unique_keywords.append({
                        'id': keyword_id,
                        'keyword': keyword_text,
                        'isRegex': is_regex
                    })
                
                # 創建去重後的關鍵詞集
                deduplicated_set = {
                    'id': set_id,
                    'name': set_name,
                    'keywords': unique_keywords
                }
                deduplicated_sets.append(deduplicated_set)
            
            # 確保事件被發送
            import sys
            print(f"[Backend] Sending keyword-sets-updated event with {len(deduplicated_sets)} sets", file=sys.stderr)
            self.send_event("keyword-sets-updated", {"keywordSets": deduplicated_sets})
        except Exception as e:
            import sys
            print(f"[Backend] Error sending keyword sets update: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            # 即使出錯，也嘗試發送一個空數組或最後已知的狀態，避免前端狀態卡住
            try:
                # 嘗試獲取一個簡化的狀態
                keyword_sets = await db.get_all_keyword_sets()
                self.send_event("keyword-sets-updated", {"keywordSets": keyword_sets if keyword_sets else []})
            except:
                # 如果連這個都失敗，至少發送空數組
                self.send_event("keyword-sets-updated", {"keywordSets": []})
    
    async def send_groups_update(self):
        """Send only monitored groups update to frontend"""
        try:
            groups = await db.get_all_groups()
            self.send_event("groups-updated", {"monitoredGroups": groups})
        except Exception as e:
            print(f"[Backend] Error sending groups update: {e}", file=sys.stderr)
    
    async def send_templates_update(self):
        """Send only message templates update to frontend"""
        try:
            templates = await db.get_all_templates()
            self.send_event("templates-updated", {"messageTemplates": templates, "chatTemplates": templates})
        except Exception as e:
            print(f"[Backend] Error sending templates update: {e}", file=sys.stderr)
    
    async def send_campaigns_update(self):
        """Send only campaigns update to frontend"""
        try:
            campaigns = await db.get_all_campaigns()
            self.send_event("campaigns-updated", {"campaigns": campaigns})
        except Exception as e:
            print(f"[Backend] Error sending campaigns update: {e}", file=sys.stderr)
    
    async def send_leads_update(self):
        """Send only leads update to frontend（🆕 包含 total）"""
        try:
            # 🆕 使用 get_leads_with_total 獲取完整數據和總數
            data = await db.get_leads_with_total()
            leads = data.get('leads', [])
            total = data.get('total', len(leads))
            
            for lead in leads:
                if isinstance(lead.get('timestamp'), str):
                    pass
                else:
                    lead['timestamp'] = datetime.fromisoformat(lead['timestamp']).isoformat() + "Z"
                for interaction in lead.get('interactionHistory', []):
                    if isinstance(interaction.get('timestamp'), str):
                        pass
                    else:
                        interaction['timestamp'] = datetime.fromisoformat(interaction['timestamp']).isoformat() + "Z"
            
            self.send_event("leads-updated", {"leads": leads, "total": total})
        except Exception as e:
            print(f"[Backend] Error sending leads update: {e}", file=sys.stderr)
    
    # ========== End Partial Update Functions ==========
    
    async def _handle_qr_login_account_ready(self, payload: Dict[str, Any]):
        """
        處理 QR 登入成功事件，將帳號添加到數據庫
        
        Args:
            payload: QR 登入返回的帳號數據，包含 phone, api_id, api_hash, session_string, device_fingerprint 等
        """
        try:
            phone = payload.get('phone', '')
            api_id = payload.get('api_id') or payload.get('apiId')  # 支持兩種字段名
            api_hash = payload.get('api_hash') or payload.get('apiHash')  # 支持兩種字段名
            proxy = payload.get('proxy', '')
            session_string = payload.get('session_string', '')
            device_fingerprint = payload.get('device_fingerprint', {})
            user_info = payload.get('user_info', {})
            
            print(f"[Backend] Handling QR login account ready for {phone}", file=sys.stderr)
            print(f"[Backend] QR login payload: api_id={api_id}, api_hash={'***' if api_hash else None}", file=sys.stderr)
            
            if not phone:
                print(f"[Backend] Error: No phone number in QR login payload", file=sys.stderr)
                return
            
            # 確保 API 憑證存在（QR 登入時必須有）
            if not api_id or not api_hash:
                print(f"[Backend] Warning: Missing API credentials in QR login payload. Payload keys: {list(payload.keys())}", file=sys.stderr)
                # 嘗試從 client 獲取（如果 payload 中有 client 信息）
                # 如果還是沒有，使用默認的公共 API 憑證
                if not api_id or not api_hash:
                    print(f"[Backend] Using default public API credentials for QR login", file=sys.stderr)
                    # 使用 Telegram Desktop 的公共 API 憑證作為默認值
                    api_id = api_id or "2040"
                    api_hash = api_hash or "b18441a1ff607e10a989891a5462e627"
            
            # 檢查帳號是否已存在
            existing_account = await db.get_account_by_phone(phone)
            
            if existing_account:
                # 帳號已存在，更新相關信息
                account_id = existing_account.get('id')
                print(f"[Backend] Account {phone} already exists (ID: {account_id}), updating...", file=sys.stderr)
                
                update_data = {
                    'status': 'Online',  # QR 登入成功，設置為在線
                }
                
                # 強制更新 API 憑據（QR 登入時必須有）
                # 優先使用新的 API 憑證，如果沒有則檢查現有帳號是否有
                if api_id and api_hash:
                    update_data['apiId'] = str(api_id)
                    update_data['apiHash'] = str(api_hash)
                    print(f"[Backend] Updating API credentials: apiId={api_id}", file=sys.stderr)
                elif not existing_account.get('apiId') or not existing_account.get('apiHash'):
                    # 如果現有帳號沒有 API 憑證，使用默認公共憑證
                    print(f"[Backend] WARNING: Missing API credentials, using default public credentials", file=sys.stderr)
                    update_data['apiId'] = "2040"
                    update_data['apiHash'] = "b18441a1ff607e10a989891a5462e627"
                else:
                    # 保持現有的 API 憑證
                    print(f"[Backend] Keeping existing API credentials", file=sys.stderr)
                if proxy:
                    update_data['proxy'] = proxy
                
                # 更新設備指紋
                if device_fingerprint:
                    update_data['deviceModel'] = device_fingerprint.get('device_model', '')
                    update_data['systemVersion'] = device_fingerprint.get('system_version', '')
                    update_data['appVersion'] = device_fingerprint.get('app_version', '')
                    update_data['langCode'] = device_fingerprint.get('lang_code', '')
                    update_data['platform'] = device_fingerprint.get('platform', '')
                
                await db.update_account(account_id, update_data)
                self.send_log(f"✅ QR 登入成功，帳號 {phone} 已更新", "success")
            else:
                # 新帳號，添加到數據庫
                print(f"[Backend] Adding new account {phone} from QR login", file=sys.stderr)
                
                # 確保 API 憑證不為空（QR 登入時必須有）
                if not api_id or not api_hash:
                    print(f"[Backend] Error: Cannot add account without API credentials", file=sys.stderr)
                    self.send_log(f"❌ QR 登入失敗：缺少 API 憑證", "error")
                    return
                
                # ========== QR 登入智能角色分配 ==========
                all_accounts = await db.get_all_accounts()
                has_listener = any(a.get('role') == 'Listener' for a in all_accounts)
                has_sender = any(a.get('role') == 'Sender' for a in all_accounts)
                
                auto_role = 'Unassigned'
                role_message = None
                
                if not has_listener:
                    auto_role = 'Listener'
                    role_message = f'已自動將 {phone} 設為「監控號」（用於監控群組消息）'
                elif not has_sender:
                    auto_role = 'Sender'
                    role_message = f'已自動將 {phone} 設為「發送號」（用於發送消息給潛在客戶）'
                # ========== QR 登入智能角色分配結束 ==========

                account_data = {
                    'phone': phone,
                    'apiId': str(api_id),  # 強制轉換為字符串
                    'apiHash': str(api_hash),  # 確保不為空
                    'proxy': proxy or '',
                    'group': '',
                    'role': auto_role,  # 使用自動分配的角色
                    'status': 'Online',  # QR 登入成功，直接設置為在線
                    'twoFactorPassword': '',
                }

                print(f"[Backend] Adding account with API ID: {api_id}, API Hash: {'***' if api_hash else 'MISSING'}, role={auto_role}", file=sys.stderr)

                # 添加設備指紋
                if device_fingerprint:
                    account_data['deviceModel'] = device_fingerprint.get('device_model', '')
                    account_data['systemVersion'] = device_fingerprint.get('system_version', '')
                    account_data['appVersion'] = device_fingerprint.get('app_version', '')
                    account_data['langCode'] = device_fingerprint.get('lang_code', '')
                    account_data['platform'] = device_fingerprint.get('platform', '')

                account_id = await db.add_account(account_data)
                print(f"[Backend] Account {phone} added with ID: {account_id}", file=sys.stderr)

                # 使用 self.send_log 而不是 db.add_log（Database 類沒有這個方法）
                self.send_log(f"✅ QR 登入成功，帳號 {phone} 已添加", "success")
                
                # 顯示角色分配提示
                if role_message:
                    self.send_log(f"🎯 {role_message}", "success")
                else:
                    self.send_log(f"💡 帳號 {phone} 已登入，請在帳號管理中分配角色", "info")
            
            # 發送帳號列表更新事件
            await self._send_accounts_updated()
            
        except Exception as e:
            print(f"[Backend] Error handling QR login account ready: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_log(f"❌ QR 登入帳號處理失敗: {str(e)}", "error")

    async def handle_add_account(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_add_account as _handle_add_account
        return await _handle_add_account(self, payload)

    async def handle_send_code(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_send_code as _handle_send_code
        return await _handle_send_code(self, payload)

    async def handle_login_account(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_login_account as _handle_login_account
        return await _handle_login_account(self, payload)

    async def handle_qr_login_create(self, payload=None):
        from domain.accounts.qr_handlers_impl import handle_qr_login_create as _handle_qr_login_create
        return await _handle_qr_login_create(self, payload)

    async def handle_qr_login_status(self, payload=None):
        from domain.accounts.qr_handlers_impl import handle_qr_login_status as _handle_qr_login_status
        return await _handle_qr_login_status(self, payload)

    async def handle_qr_login_refresh(self, payload=None):
        from domain.accounts.qr_handlers_impl import handle_qr_login_refresh as _handle_qr_login_refresh
        return await _handle_qr_login_refresh(self, payload)

    async def handle_qr_login_submit_2fa(self, payload=None):
        from domain.accounts.qr_handlers_impl import handle_qr_login_submit_2fa as _handle_qr_login_submit_2fa
        return await _handle_qr_login_submit_2fa(self, payload)

    async def handle_qr_login_cancel(self, payload=None):
        from domain.accounts.qr_handlers_impl import handle_qr_login_cancel as _handle_qr_login_cancel
        return await _handle_qr_login_cancel(self, payload)

    async def handle_ip_bind(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_bind as _handle_ip_bind
        return await _handle_ip_bind(self, payload)

    async def handle_ip_unbind(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_unbind as _handle_ip_unbind
        return await _handle_ip_unbind(self, payload)

    async def handle_ip_get_binding(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_get_binding as _handle_ip_get_binding
        return await _handle_ip_get_binding(self, payload)

    async def handle_ip_get_all_bindings(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_get_all_bindings as _handle_ip_get_all_bindings
        return await _handle_ip_get_all_bindings(self, payload)

    async def handle_ip_get_statistics(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_get_statistics as _handle_ip_get_statistics
        return await _handle_ip_get_statistics(self, payload)

    async def handle_ip_verify_binding(self, payload=None):
        from domain.accounts.ip_handlers_impl import handle_ip_verify_binding as _handle_ip_verify_binding
        return await _handle_ip_verify_binding(self, payload)

    async def handle_credential_start_scrape(self, payload=None):
        from domain.accounts.credential_handlers_impl import handle_credential_start_scrape as _handle_credential_start_scrape
        return await _handle_credential_start_scrape(self, payload)

    async def handle_credential_submit_code(self, payload=None):
        from domain.accounts.credential_handlers_impl import handle_credential_submit_code as _handle_credential_submit_code
        return await _handle_credential_submit_code(self, payload)

    async def handle_credential_get_status(self, payload=None):
        from domain.accounts.credential_handlers_impl import handle_credential_get_status as _handle_credential_get_status
        return await _handle_credential_get_status(self, payload)

    async def handle_credential_get_all(self, payload=None):
        from domain.accounts.credential_handlers_impl import handle_credential_get_all as _handle_credential_get_all
        return await _handle_credential_get_all(self, payload)

    async def handle_credential_cancel_scrape(self, payload=None):
        from domain.accounts.credential_handlers_impl import handle_credential_cancel_scrape as _handle_credential_cancel_scrape
        return await _handle_credential_cancel_scrape(self, payload)

    async def handle_check_account_status(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_check_account_status as _handle_check_account_status
        return await _handle_check_account_status(self, payload)

    async def handle_update_account_data(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_update_account_data as _handle_update_account_data
        return await _handle_update_account_data(self, payload)

    async def handle_update_account(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_update_account as _handle_update_account
        return await _handle_update_account(self, payload)

    async def handle_test_proxy(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_test_proxy as _handle_test_proxy
        return await _handle_test_proxy(self, payload)

    async def handle_sync_account_info(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_sync_account_info as _handle_sync_account_info
        return await _handle_sync_account_info(self, payload)

    async def handle_logout_account(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_logout_account as _handle_logout_account
        return await _handle_logout_account(self, payload)

    async def handle_save_tags(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_save_tags as _handle_save_tags
        return await _handle_save_tags(self, payload)

    async def handle_save_groups(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_save_groups as _handle_save_groups
        return await _handle_save_groups(self, payload)

    async def handle_get_tags(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_get_tags as _handle_get_tags
        return await _handle_get_tags(self, payload)

    async def handle_get_groups(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_get_groups as _handle_get_groups
        return await _handle_get_groups(self, payload)

    async def handle_save_personas(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_save_personas as _handle_save_personas
        return await _handle_save_personas(self, payload)

    async def handle_get_personas(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_get_personas as _handle_get_personas
        return await _handle_get_personas(self, payload)

    async def handle_batch_update_accounts(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_batch_update_accounts as _handle_batch_update_accounts
        return await _handle_batch_update_accounts(self, payload)

    async def handle_bulk_assign_role(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_bulk_assign_role as _handle_bulk_assign_role
        return await _handle_bulk_assign_role(self, payload)

    async def handle_bulk_assign_group(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_bulk_assign_group as _handle_bulk_assign_group
        return await _handle_bulk_assign_group(self, payload)

    async def handle_bulk_delete_accounts(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_bulk_delete_accounts as _handle_bulk_delete_accounts
        return await _handle_bulk_delete_accounts(self, payload)

    async def handle_remove_account(self, payload=None):
        from domain.accounts.account_handlers_impl import handle_remove_account as _handle_remove_account
        return await _handle_remove_account(self, payload)

    async def check_monitoring_configuration(self) -> Dict[str, Any]:
        """
        完整配置檢查 - 在啟動監控前檢測所有必要配置
        
        Returns:
            Dict containing all check results and recommendations
        """
        checks = {
            "passed": True,
            "critical_issues": [],
            "warnings": [],
            "info": [],
            "details": {}
        }
        
        # ========== 1. 檢查監控帳號 ==========
        accounts = await db.get_all_accounts()
        listener_accounts = [a for a in accounts if a.get('role') == 'Listener']
        online_listeners = [a for a in listener_accounts if a.get('status') == 'Online']
        
        checks["details"]["listener_accounts"] = {
            "total": len(listener_accounts),
            "online": len(online_listeners),
            "accounts": [{"phone": a.get('phone'), "status": a.get('status')} for a in listener_accounts]
        }
        
        if not listener_accounts:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_LISTENER",
                "message": "沒有監控帳號（Listener 角色）",
                "fix": "在「帳戶管理」中將帳號角色設為「Listener」"
            })
        elif not online_listeners:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "LISTENER_OFFLINE",
                "message": "監控帳號全部離線",
                "fix": "點擊「登入」按鈕使監控帳號上線"
            })
        else:
            checks["info"].append(f"✓ {len(online_listeners)} 個監控帳號在線")
        
        # ========== 2. 檢查發送帳號 ==========
        sender_accounts = [a for a in accounts if a.get('role') == 'Sender']
        online_senders = [a for a in sender_accounts if a.get('status') == 'Online']
        
        checks["details"]["sender_accounts"] = {
            "total": len(sender_accounts),
            "online": len(online_senders),
            "accounts": [{"phone": a.get('phone'), "status": a.get('status'), 
                         "dailySendCount": a.get('dailySendCount', 0),
                         "dailySendLimit": a.get('dailySendLimit', 50)} for a in sender_accounts]
        }
        
        if not sender_accounts:
            checks["warnings"].append({
                "code": "NO_SENDER",
                "message": "沒有發送帳號（Sender 角色）",
                "fix": "在「帳戶管理」中將帳號角色設為「Sender」，否則無法發送消息"
            })
        elif not online_senders:
            checks["warnings"].append({
                "code": "SENDER_OFFLINE",
                "message": "發送帳號全部離線",
                "fix": "點擊「登入」按鈕使發送帳號上線，否則無法發送消息"
            })
        else:
            # Check if any sender has remaining quota
            available_senders = [s for s in online_senders 
                                if s.get('dailySendCount', 0) < s.get('dailySendLimit', 50)]
            if not available_senders:
                checks["warnings"].append({
                    "code": "SENDER_LIMIT_REACHED",
                    "message": "所有發送帳號已達每日發送限額",
                    "fix": "等待明天重置限額，或增加新的發送帳號"
                })
            else:
                checks["info"].append(f"✓ {len(available_senders)} 個發送帳號可用")
        
        # ========== 3. 檢查監控群組 ==========
        monitored_groups = await db.get_all_monitored_groups()
        
        checks["details"]["monitored_groups"] = {
            "total": len(monitored_groups),
            "groups": [{"url": g.get('url'), "keywordSetIds": g.get('keywordSetIds', [])} 
                      for g in monitored_groups]
        }
        
        if not monitored_groups:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_GROUPS",
                "message": "沒有監控群組",
                "fix": "在「自動化中心」添加要監控的群組 URL"
            })
        else:
            checks["info"].append(f"✓ {len(monitored_groups)} 個監控群組")
        
        # ========== 4. 檢查關鍵詞集 ==========
        keyword_sets = await db.get_all_keyword_sets()
        
        # 計算總關鍵詞數
        total_keywords = sum(len(ks.get('keywords', [])) for ks in keyword_sets)
        
        checks["details"]["keyword_sets"] = {
            "total": len(keyword_sets),
            "total_keywords": total_keywords,
            "sets": [{"id": ks.get('id'), "name": ks.get('name'), 
                     "keywords": ks.get('keywords', [])} for ks in keyword_sets]
        }
        
        if not keyword_sets:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_KEYWORDS",
                "message": "沒有關鍵詞集",
                "fix": "在「自動化中心」創建關鍵詞集並添加關鍵詞"
            })
        elif total_keywords == 0:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "EMPTY_KEYWORDS",
                "message": "關鍵詞集沒有任何關鍵詞",
                "fix": "在關鍵詞集中添加要監控的關鍵詞"
            })
        else:
            checks["info"].append(f"✓ {len(keyword_sets)} 個關鍵詞集，共 {total_keywords} 個關鍵詞")
        
        # ========== 5. 檢查群組與關鍵詞綁定 ==========
        groups_without_keywords = [g for g in monitored_groups if not g.get('keywordSetIds')]
        
        if groups_without_keywords and monitored_groups:
            checks["warnings"].append({
                "code": "GROUP_NO_KEYWORD",
                "message": f"{len(groups_without_keywords)} 個群組未綁定關鍵詞集",
                "fix": "在「監控群組」中為群組勾選關鍵詞集"
            })
        
        # ========== 6. 檢查舊版活動（Campaign）- 僅作為向後兼容 ==========
        # 注意：新系統使用「觸發規則」，舊版 Campaign 已被觸發規則取代
        campaigns = await db.get_all_campaigns()
        active_campaigns = [c for c in campaigns if c.get('isActive')]
        
        checks["details"]["campaigns"] = {
            "total": len(campaigns),
            "active": len(active_campaigns),
            "campaigns": [{
                "id": c.get('id'), 
                "name": c.get('name'), 
                "isActive": c.get('isActive'),
                "sourceGroupIds": c.get('trigger', {}).get('sourceGroupIds', []),
                "keywordSetIds": c.get('trigger', {}).get('keywordSetIds', []),
                "templateId": c.get('actions', [{}])[0].get('templateId', 0) if c.get('actions') else 0
            } for c in campaigns]
        }
        
        # 不再對舊版 Campaign 顯示警告，因為用戶應該使用「觸發規則」
        # 如果有舊版活動，只顯示為信息提示
        if active_campaigns:
            checks["info"].append(f"ℹ {len(active_campaigns)} 個舊版活動（建議遷移到觸發規則）")
        
        # ========== 7. 檢查消息模板 ==========
        templates = await db.get_all_templates()
        active_templates = [t for t in templates if t.get('isActive', True)]
        
        checks["details"]["templates"] = {
            "total": len(templates),
            "active": len(active_templates)
        }
        
        if not templates:
            checks["warnings"].append({
                "code": "NO_TEMPLATE",
                "message": "沒有消息模板",
                "fix": "在「自動化中心」創建消息模板"
            })
        else:
            checks["info"].append(f"✓ {len(templates)} 個消息模板")
        
        # ========== 8. 檢查 AI 設置 ==========
        ai_settings = await db.get_ai_settings()
        ai_enabled = ai_settings.get('auto_chat_enabled', 0) == 1
        ai_greeting_enabled = ai_settings.get('auto_greeting', 0) == 1
        ai_mode = ai_settings.get('auto_chat_mode', 'semi')
        
        checks["details"]["ai_settings"] = {
            "auto_chat_enabled": ai_enabled,
            "auto_greeting": ai_greeting_enabled,
            "auto_chat_mode": ai_mode
        }
        
        if ai_enabled:
            mode_names = {'full': '全自動', 'semi': '半自動', 'assist': '輔助', 'keyword': '關鍵詞觸發'}
            checks["info"].append(f"✓ AI 自動聊天已開啟 (模式: {mode_names.get(ai_mode, ai_mode)})")
            if ai_greeting_enabled:
                checks["info"].append("✓ AI 自動問候已開啟")
        else:
            checks["info"].append("ℹ AI 自動聊天未開啟（可在設置中開啟）")
        
        # ========== 檢查觸發規則 ==========
        trigger_rules = await db.get_all_trigger_rules()
        active_rules = [r for r in trigger_rules if r.get('is_active') or r.get('isActive')]
        
        checks["details"]["trigger_rules"] = {
            "total": len(trigger_rules),
            "active": len(active_rules)
        }
        
        if active_rules:
            checks["info"].append(f"✓ {len(active_rules)} 條觸發規則已啟用")
        
        # ========== 生成總結 ==========
        # 判斷是否能發送消息：有在線發送帳號 且 (有活動 或 有觸發規則 或 AI聊天已啟用)
        has_response_config = len(active_campaigns) > 0 or len(active_rules) > 0 or ai_enabled
        checks["summary"] = {
            "can_monitor": checks["passed"],
            "can_send_messages": len(online_senders) > 0 and has_response_config,
            "critical_count": len(checks["critical_issues"]),
            "warning_count": len(checks["warnings"]),
            "info_count": len(checks["info"])
        }
        
        return checks
    
    async def handle_start_monitoring(self):
        from domain.automation.monitoring_handlers_impl import handle_start_monitoring as _handle_start_monitoring
        return await _handle_start_monitoring(self)

    async def handle_stop_monitoring(self):
        from domain.automation.monitoring_handlers_impl import handle_stop_monitoring as _handle_stop_monitoring
        return await _handle_stop_monitoring(self)

    async def handle_one_click_start(self, payload=None):
        from domain.automation.monitoring_handlers_impl import handle_one_click_start as _handle_one_click_start
        return await _handle_one_click_start(self, payload)

    async def handle_one_click_stop(self):
        from domain.automation.monitoring_handlers_impl import handle_one_click_stop as _handle_one_click_stop
        return await _handle_one_click_stop(self)

    async def handle_get_system_status(self):
        from domain.automation.monitoring_handlers_impl import handle_get_system_status as _handle_get_system_status
        return await _handle_get_system_status(self)

    async def handle_get_command_diagnostics(self, payload=None):
        """Phase3: 命令診斷 — 返回別名註冊表狀態和未知命令統計"""
        diagnostics = {
            'alias_registry': {
                'total': len(COMMAND_ALIAS_REGISTRY),
                'aliases': {cmd: f"{mod}.{fn}" for cmd, (mod, fn) in COMMAND_ALIAS_REGISTRY.items()}
            },
            'unknown_commands': dict(sorted(
                _unknown_command_counter.items(),
                key=lambda x: x[1],
                reverse=True
            )[:20]),  # Top 20 unknown commands
            'unknown_total': sum(_unknown_command_counter.values()),
            'router_available': ROUTER_AVAILABLE
        }
        self.send_event("command-diagnostics", diagnostics)
        return diagnostics

    async def handle_learn_from_history(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_learn_from_history as _handle_learn_from_history
        return await _handle_learn_from_history(self, payload)

    async def handle_save_settings(self, payload=None):
        from api.handlers.settings_handlers_impl import handle_save_settings as _handle_save_settings
        return await _handle_save_settings(self, payload)

    async def handle_get_settings(self):
        from api.handlers.settings_handlers_impl import handle_get_settings as _handle_get_settings
        return await _handle_get_settings(self)

    async def handle_get_queue_status(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_get_queue_status as _handle_get_queue_status
        return await _handle_get_queue_status(self, payload)

    async def handle_get_account_health_report(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_account_health_report as _handle_get_account_health_report
        return await _handle_get_account_health_report(self, payload)

    async def handle_clear_queue(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_clear_queue as _handle_clear_queue
        return await _handle_clear_queue(self, payload)

    async def handle_pause_queue(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_pause_queue as _handle_pause_queue
        return await _handle_pause_queue(self, payload)

    async def handle_resume_queue(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_resume_queue as _handle_resume_queue
        return await _handle_resume_queue(self, payload)

    async def handle_delete_queue_message(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_delete_queue_message as _handle_delete_queue_message
        return await _handle_delete_queue_message(self, payload)

    async def handle_update_queue_message_priority(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_update_queue_message_priority as _handle_update_queue_message_priority
        return await _handle_update_queue_message_priority(self, payload)

    async def handle_get_queue_messages(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_get_queue_messages as _handle_get_queue_messages
        return await _handle_get_queue_messages(self, payload)

    async def handle_get_logs(self, payload=None):
        from api.handlers.log_handlers_impl import handle_get_logs as _handle_get_logs
        return await _handle_get_logs(self, payload)

    async def handle_export_logs(self, payload=None):
        from api.handlers.log_handlers_impl import handle_export_logs as _handle_export_logs
        return await _handle_export_logs(self, payload)

    async def handle_get_accounts(self):
        from domain.accounts.account_handlers_impl import handle_get_accounts as _handle_get_accounts
        return await _handle_get_accounts(self)

    async def handle_get_monitored_groups(self):
        from domain.automation.monitoring_handlers_impl import handle_get_monitored_groups as _handle_get_monitored_groups
        return await _handle_get_monitored_groups(self)

    async def handle_get_keyword_sets(self):
        from domain.automation.keyword_handlers_impl import handle_get_keyword_sets as _handle_get_keyword_sets
        return await _handle_get_keyword_sets(self)

    async def handle_save_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_save_keyword_set as _handle_save_keyword_set
        return await _handle_save_keyword_set(self, payload)

    async def handle_delete_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_delete_keyword_set as _handle_delete_keyword_set
        return await _handle_delete_keyword_set(self, payload)

    async def handle_bind_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_bind_keyword_set as _handle_bind_keyword_set
        return await _handle_bind_keyword_set(self, payload)

    async def handle_unbind_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_unbind_keyword_set as _handle_unbind_keyword_set
        return await _handle_unbind_keyword_set(self, payload)

    async def handle_ai_generate_message(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_generate_message as _handle_ai_generate_message
        return await _handle_ai_generate_message(self, payload)

    async def _get_default_ai_model(self) -> Optional[Dict[str, Any]]:
        """獲取默認的 AI 模型配置"""
        try:
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint,
                   is_local, is_default, is_connected
                   FROM ai_models WHERE is_default = 1 AND (api_key != '' OR is_local = 1)
                   ORDER BY priority DESC LIMIT 1"""
            )
            if model:
                return {
                    'id': model['id'],
                    'provider': model['provider'],
                    'modelName': model['model_name'],
                    'displayName': model['display_name'] or model['model_name'],
                    'apiKey': model['api_key'],
                    'apiEndpoint': model['api_endpoint'],
                    'isLocal': bool(model['is_local']),
                    'isConnected': bool(model['is_connected'])
                }
            
            # 如果沒有默認模型，嘗試獲取任何可用的模型
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint,
                   is_local, is_default, is_connected
                   FROM ai_models WHERE (api_key != '' OR is_local = 1)
                   ORDER BY priority DESC, created_at DESC LIMIT 1"""
            )
            if model:
                return {
                    'id': model['id'],
                    'provider': model['provider'],
                    'modelName': model['model_name'],
                    'displayName': model['display_name'] or model['model_name'],
                    'apiKey': model['api_key'],
                    'apiEndpoint': model['api_endpoint'],
                    'isLocal': bool(model['is_local']),
                    'isConnected': bool(model['is_connected'])
                }
            return None
        except Exception as e:
            print(f"[AI] 獲取 AI 模型失敗: {e}", file=__import__('sys').stderr)
            return None
    
    async def handle_ai_generate_text(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_generate_text as _handle_ai_generate_text
        return await _handle_ai_generate_text(self, payload)

    async def _call_ai_for_text(self, model: Dict[str, Any], prompt: str, max_tokens: int = 500) -> Optional[str]:
        """
        🆕 通用 AI 調用方法
        🔧 P0: 增加超時時間到 45 秒
        """
        import aiohttp
        import sys
        import time
        
        provider = model.get('provider', '').lower()
        api_key = model.get('apiKey', '')
        api_endpoint = model.get('apiEndpoint', '')
        model_name = model.get('modelName', '')
        is_local = model.get('isLocal', False)
        
        # 🔧 P0: 增加超時時間，與前端一致（使用配置常量）
        from config import AIConfig
        timeout = aiohttp.ClientTimeout(total=AIConfig.API_TIMEOUT_SECONDS)
        start_time = time.time()
        print(f"[AI] 開始調用: provider={provider}, model={model_name}, endpoint={api_endpoint[:50] if api_endpoint else 'default'}...", file=sys.stderr)
        
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                if is_local or provider == 'ollama' or provider == 'custom':
                    # Ollama / 本地模型
                    endpoint = api_endpoint or 'http://localhost:11434'
                    
                    # 🔧 修復: 檢查端點是否已包含 /api/chat，避免重複添加
                    if '/api/chat' in endpoint or '/api/generate' in endpoint:
                        chat_url = endpoint
                    else:
                        chat_url = f"{endpoint.rstrip('/')}/api/chat"
                    
                    print(f"[AI] 本地 AI 請求 URL: {chat_url}", file=sys.stderr)
                    
                    async with session.post(chat_url, json={
                        "model": model_name or "llama3",
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "options": {"num_predict": max_tokens}
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            return data.get('message', {}).get('content', '')
                
                elif provider == 'gemini' or provider == 'google':
                    # Google Gemini
                    endpoint = api_endpoint or 'https://generativelanguage.googleapis.com/v1beta'
                    url = f"{endpoint}/models/{model_name or 'gemini-pro'}:generateContent?key={api_key}"
                    
                    async with session.post(url, json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": max_tokens}
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            candidates = data.get('candidates', [])
                            if candidates:
                                parts = candidates[0].get('content', {}).get('parts', [])
                                if parts:
                                    return parts[0].get('text', '')
                
                elif provider == 'openai' or provider == 'gpt':
                    # OpenAI GPT
                    endpoint = api_endpoint or 'https://api.openai.com/v1'
                    url = f"{endpoint.rstrip('/')}/chat/completions"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    async with session.post(url, headers=headers, json={
                        "model": model_name or "gpt-3.5-turbo",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }) as resp:
                        elapsed = time.time() - start_time
                        if resp.status == 200:
                            data = await resp.json()
                            choices = data.get('choices', [])
                            if choices:
                                content = choices[0].get('message', {}).get('content', '')
                                print(f"[AI] ✓ OpenAI 調用成功，耗時 {elapsed:.1f}秒，返回長度 {len(content)}", file=sys.stderr)
                                return content
                        else:
                            error_text = await resp.text()
                            print(f"[AI] ⚠️ OpenAI 返回錯誤: status={resp.status}, error={error_text[:200]}", file=sys.stderr)
                
                elif provider == 'deepseek':
                    # DeepSeek
                    endpoint = api_endpoint or 'https://api.deepseek.com/v1'
                    url = f"{endpoint.rstrip('/')}/chat/completions"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    async with session.post(url, headers=headers, json={
                        "model": model_name or "deepseek-chat",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            choices = data.get('choices', [])
                            if choices:
                                return choices[0].get('message', {}).get('content', '')
                
                print(f"[AI] 不支持的 provider: {provider}", file=sys.stderr)
                return None
                
        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            print(f"[AI] ⚠️ API 調用超時: {elapsed:.1f}秒 (provider={provider})", file=sys.stderr)
            return None
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"[AI] ❌ API 調用失敗: {e} (耗時 {elapsed:.1f}秒)", file=sys.stderr)
            return None
    
    async def _generate_messages_with_ai(self, model: Dict[str, Any], topic: str, style: str, count: int) -> List[str]:
        """使用配置的 AI 生成消息"""
        import aiohttp
        
        style_descriptions = {
            'friendly': '友好親切、輕鬆自然',
            'formal': '正式商務、專業禮貌',
            'humorous': '幽默風趣、輕鬆調侃',
            'concise': '簡潔明了、直奔主題',
            'enthusiastic': '熱情洋溢、充滿活力'
        }
        
        style_desc = style_descriptions.get(style, '友好親切')
        
        prompt = f"""請生成 {count} 條不同的打招呼消息，用於在 Telegram 上向潛在客戶發送第一條消息。

主題：{topic}
風格要求：{style_desc}

要求：
1. 每條消息都要不同，但保持相同的風格
2. 消息要自然、真誠，不要像廣告
3. 使用變量 {{firstName}} 表示對方名字，{{greeting}} 表示問候語（如"早上好"）
4. 每條消息 20-50 字左右
5. 只輸出消息內容，每條消息一行，不要編號

請直接輸出 {count} 條消息："""
        
        provider = model.get('provider', '').lower()
        api_key = model.get('apiKey', '')
        api_endpoint = model.get('apiEndpoint', '')
        model_name = model.get('modelName', '')
        is_local = model.get('isLocal', False)
        
        messages = []
        
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            if is_local or provider == 'ollama' or provider == 'custom':
                # 本地 AI (Ollama)
                endpoint = api_endpoint or 'http://localhost:11434'
                chat_url = f"{endpoint.rstrip('/')}/api/chat"
                
                request_body = {
                    "model": model_name or "qwen2:7b",
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                }
                
                async with session.post(chat_url, json=request_body) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        raise Exception(f"Ollama 返回 {resp.status}")
                        
            elif provider == 'openai':
                # OpenAI API
                async with session.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': model_name or 'gpt-3.5-turbo',
                        'messages': [{'role': 'user', 'content': prompt}],
                        'max_tokens': 1000,
                        'temperature': 0.8
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        error_data = await resp.text()
                        raise Exception(f"OpenAI 返回 {resp.status}: {error_data[:100]}")
            
            else:
                # 通用 OpenAI 兼容格式
                endpoint = api_endpoint or 'http://localhost:11434/v1'
                chat_url = f"{endpoint.rstrip('/')}/chat/completions"
                
                headers = {'Content-Type': 'application/json'}
                if api_key:
                    headers['Authorization'] = f'Bearer {api_key}'
                
                async with session.post(
                    chat_url,
                    headers=headers,
                    json={
                        'model': model_name,
                        'messages': [{'role': 'user', 'content': prompt}],
                        'max_tokens': 1000,
                        'temperature': 0.8
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        raise Exception(f"API 返回 {resp.status}")
        
        return messages
    
    def _parse_ai_messages(self, content: str, count: int) -> List[str]:
        """解析 AI 返回的消息"""
        import re
        
        lines = content.strip().split('\n')
        messages = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # 移除編號（如 "1." 或 "1、" 或 "1)"）
            line = re.sub(r'^[\d]+[\.\、\)\]\:]\s*', '', line)
            line = line.strip()
            if line and len(line) > 5:  # 過濾太短的行
                messages.append(line)
        
        return messages[:count] if messages else []
    
    def _get_local_message_templates(self, topic: str, style: str, count: int) -> List[str]:
        """獲取本地消息模板（回退方案）"""
        import random
        
        style_templates = {
            'friendly': [
                "{greeting}！我是在群裡看到你的，想認識一下~",
                "Hi {firstName}！很高興能認識你，希望以後多多交流 😊",
                "{greeting}{firstName}，我覺得我們可能有共同話題，方便聊聊嗎？",
                "嗨！看到你的資料覺得很有趣，想跟你交個朋友~",
                f"{{greeting}}！我對{topic}很感興趣，看到你也在關注這個？"
            ],
            'formal': [
                "{greeting}，很高興認識您。我注意到我們可能有共同的興趣點，不知是否方便交流？",
                f"您好 {{firstName}}，冒昧打擾。我專注於{topic}領域，希望能與您建立聯繫。",
                "{greeting}，我是通過群組認識到您的。如有合作機會，期待進一步溝通。",
                "尊敬的 {firstName}，很榮幸能夠與您取得聯繫。期待未來有機會合作。",
                f"{{greeting}}，我對{topic}很感興趣，看到您也在這個領域，想向您請教。"
            ],
            'humorous': [
                "{greeting}！我不是推銷員，只是覺得你看起來很酷想認識一下 😎",
                "Hi {firstName}！命運的安排讓我們在茫茫網海中相遇 🌊",
                "{greeting}~我發誓我不是機器人，只是一個想交朋友的普通人 🤖❌",
                "嘿！如果這條消息打擾到你了，請假裝沒看到（但其實很期待你的回復）",
                "{greeting}{firstName}！人生何處不相逢，既然相遇不如加個好友？"
            ],
            'concise': [
                "{greeting}，認識一下？",
                f"Hi {{firstName}}，對{topic}有興趣嗎？",
                "{greeting}！方便聊聊嗎？",
                "你好，想跟你交流一下。",
                "{greeting}，可以認識一下嗎？"
            ],
            'enthusiastic': [
                "{greeting}！！太開心能認識你了！！🎉🎉🎉",
                "哇！{firstName}！終於找到志同道合的朋友了！！",
                f"{{greeting}}！我對{topic}超級有熱情的，希望能跟你一起討論！💪",
                "嗨嗨嗨！{firstName}！感覺我們會成為很好的朋友！✨",
                f"太棒了！{{greeting}}！一直在找對{topic}感興趣的人！"
            ]
        }
        
        templates = style_templates.get(style, style_templates['friendly'])
        messages = templates[:count]
        random.shuffle(messages)
        return messages
    
    async def handle_ai_generate_group_names(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_generate_group_names as _handle_ai_generate_group_names
        return await _handle_ai_generate_group_names(self, payload)

    async def handle_ai_generate_welcome(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_generate_welcome as _handle_ai_generate_welcome
        return await _handle_ai_generate_welcome(self, payload)

    async def handle_create_group(self, payload=None):
        from domain.groups.handlers_impl import handle_create_group as _handle_create_group
        return await _handle_create_group(self, payload)

    async def handle_group_invite_user(self, payload=None):
        from domain.groups.handlers_impl import handle_group_invite_user as _handle_group_invite_user
        return await _handle_group_invite_user(self, payload)

    async def handle_group_add_member(self, payload=None):
        from domain.groups.handlers_impl import handle_group_add_member as _handle_group_add_member
        return await _handle_group_add_member(self, payload)

    async def handle_group_send_msg(self, payload=None):
        from domain.groups.handlers_impl import handle_group_send_msg as _handle_group_send_msg
        return await _handle_group_send_msg(self, payload)

    # ==================== 🆕 P1-2: 群聊協作消息監聽 ====================
    
    # 存儲活躍的群組協作
    _active_group_collabs: Dict[str, Dict[str, Any]] = {}
    
    async def handle_group_monitor_messages(self, payload=None):
        from domain.groups.handlers_impl import handle_group_monitor_messages as _handle_group_monitor_messages
        return await _handle_group_monitor_messages(self, payload)

    async def _handle_collab_group_message(self, client, message, target_group_id: str):
        """
        🆕 處理群聊協作中的消息
        """
        import sys
        from pyrogram.enums import ChatType
        
        try:
            # 只處理群組消息
            if message.chat.type not in [ChatType.GROUP, ChatType.SUPERGROUP]:
                return
            
            # 只處理目標群組
            if str(message.chat.id) != str(target_group_id):
                return
            
            # 獲取協作配置
            collab = self._active_group_collabs.get(str(target_group_id))
            if not collab:
                return
            
            # 獲取發送者信息
            sender_id = message.from_user.id if message.from_user else None
            sender_name = message.from_user.first_name if message.from_user else "Unknown"
            message_text = message.text or message.caption or ""
            
            if not message_text:
                return
            
            # 檢查是否是角色帳號發的消息（不回覆自己）
            role_phones = [r.get('phone') for r in collab.get('roles', [])]
            for phone in role_phones:
                role_client = self.telegram_manager.clients.get(phone)
                if role_client:
                    try:
                        me = await role_client.get_me()
                        if me.id == sender_id:
                            return  # 不回覆自己
                    except:
                        pass
            
            print(f"[GroupCollab] 收到群消息: from={sender_name}, text={message_text[:50]}...", file=sys.stderr)
            
            # 🔧 P2-1: 選擇合適的角色回覆（避免所有角色同時回覆）
            responding_role = await self._select_responding_role(collab, message_text, sender_id)
            
            if not responding_role:
                print(f"[GroupCollab] 無合適角色回覆此消息", file=sys.stderr)
                return
            
            # 生成 AI 回覆
            role_phone = responding_role.get('phone')
            role_name = responding_role.get('roleName', '助手')
            role_prompt = responding_role.get('prompt', '')
            
            try:
                # 使用 AI 生成回覆
                from ai_auto_chat import ai_auto_chat
                
                # 🆕 P0-2: 搜索知識庫，獲取相關專業內容
                knowledge_context = ""
                matched_knowledge = []  # 🆕 P1-2: 記錄匹配的知識用於可視化
                
                try:
                    # 方法1: 從 RAG 系統搜索
                    from telegram_rag_system import telegram_rag
                    if telegram_rag:
                        rag_context = await telegram_rag.build_rag_context(
                            user_message=message_text,
                            user_id=str(sender_id),
                            max_items=3,
                            max_tokens=500
                        )
                        if rag_context:
                            knowledge_context = rag_context
                            matched_knowledge.append({
                                'source': 'RAG',
                                'content': rag_context[:100] + '...' if len(rag_context) > 100 else rag_context
                            })
                            print(f"[GroupCollab] 📚 從 RAG 找到相關知識", file=sys.stderr)
                    
                    # 方法2: 從知識庫表搜索（備用）
                    if not knowledge_context:
                        from database import db
                        knowledge_items = await db.search_knowledge(message_text, limit=3)
                        if knowledge_items:
                            kb_parts = ["【業務知識參考】"]
                            for item in knowledge_items:
                                kb_parts.append(f"- {item.get('title')}: {item.get('content')}")
                                # 🆕 P1-2: 記錄每條匹配的知識
                                matched_knowledge.append({
                                    'source': 'KnowledgeBase',
                                    'id': item.get('id'),
                                    'title': item.get('title'),
                                    'content': item.get('content', '')[:80]
                                })
                            knowledge_context = "\n".join(kb_parts)
                            print(f"[GroupCollab] 📚 從知識庫表找到 {len(knowledge_items)} 條知識", file=sys.stderr)
                except Exception as kb_err:
                    print(f"[GroupCollab] 知識庫搜索失敗: {kb_err}", file=sys.stderr)
                
                # 構建群聊專用 prompt（包含知識庫內容）
                group_prompt = f"""你是群組中的「{role_name}」，正在參與多角色協作服務客戶。

{role_prompt}

{knowledge_context}

【群聊規則】
1. 回覆簡短自然（10-50字），像群聊一樣
2. 不要重複其他角色說過的話
3. 從你的角色角度提供價值
4. 如果知識庫有相關內容，優先參考知識庫回答
5. 語氣輕鬆，像朋友聊天
"""
                
                # 生成回覆
                response = await ai_auto_chat._generate_response_with_prompt(
                    user_id=str(sender_id),
                    user_message=message_text,
                    custom_prompt=group_prompt,
                    usage_type='groupChat'
                )
                
                if response:
                    # 添加隨機延遲，更自然
                    import random
                    delay = random.uniform(2, 8)
                    await asyncio.sleep(delay)
                    
                    # 發送回覆
                    role_client = self.telegram_manager.clients.get(role_phone)
                    if role_client and role_client.is_connected:
                        await role_client.send_message(int(target_group_id), response)
                        
                        print(f"[GroupCollab] {role_name} 回覆: {response[:50]}...", file=sys.stderr)
                        
                        # 更新統計
                        collab['message_count'] = collab.get('message_count', 0) + 1
                        collab['last_responder'] = role_name
                        
                        # 發送事件（🆕 P1-2: 包含知識引用信息）
                        self.send_event("group:ai-reply-sent", {
                            "groupId": target_group_id,
                            "roleName": role_name,
                            "content": response,
                            "replyTo": message_text[:50],
                            "knowledgeUsed": matched_knowledge if matched_knowledge else None,
                            "hasKnowledgeRef": len(matched_knowledge) > 0
                        })
                        
            except Exception as ai_err:
                print(f"[GroupCollab] AI 回覆生成失敗: {ai_err}", file=sys.stderr)
                
        except Exception as e:
            import traceback
            print(f"[GroupCollab] 處理群消息失敗: {traceback.format_exc()}", file=sys.stderr)
    
    async def _select_responding_role(
        self, 
        collab: Dict[str, Any], 
        message: str, 
        sender_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        🆕 P2-1: 選擇合適的角色回覆（避免刷屏）
        """
        import random
        
        roles = collab.get('roles', [])
        if not roles:
            return None
        
        last_responder = collab.get('last_responder')
        
        # 規則：
        # 1. 如果只有一個角色，就用它
        # 2. 如果上次是某角色回覆，這次優先讓其他角色回覆
        # 3. 根據消息內容匹配角色（關鍵詞）
        # 🔧 Phase 8: 移除跳過概率，確保群聊協作時一定有回覆
        # 4. 不再使用隨機跳過，改為延遲回覆控制頻率
        
        # 🔧 Phase 8: 添加調試日誌
        import sys
        print(f"[GroupCollab] 🔍 選擇回覆角色: roles={len(roles)}, last_responder={last_responder}", file=sys.stderr)
        
        available_roles = roles.copy()
        
        # 優先讓不同角色回覆
        if last_responder and len(available_roles) > 1:
            available_roles = [r for r in available_roles if r.get('roleName') != last_responder]
            if not available_roles:
                available_roles = roles  # 如果過濾後沒有了，恢復全部
        
        # 根據消息內容匹配角色
        message_lower = message.lower()
        
        # 簡單的關鍵詞匹配
        keyword_role_map = {
            '價格': ['費率分析師', '顧問'],
            '多少錢': ['費率分析師', '顧問'],
            '費用': ['費率分析師', '顧問'],
            '怎麼用': ['技術支持', '客服'],
            '如何': ['技術支持', '客服'],
            '問題': ['技術支持', '客服'],
            '安全': ['安全顧問', '顧問'],
            '可靠': ['安全顧問', '顧問'],
            '推薦': ['熱心群友', '老用戶'],
            '好用': ['熱心群友', '老用戶'],
        }
        
        matched_roles = []
        for keyword, role_names in keyword_role_map.items():
            if keyword in message_lower:
                for role in available_roles:
                    if any(name in role.get('roleName', '') for name in role_names):
                        matched_roles.append(role)
        
        if matched_roles:
            return random.choice(matched_roles)
        
        # 沒有匹配的，隨機選一個
        return random.choice(available_roles) if available_roles else None

    async def handle_pause_monitoring(self, payload=None):
        from domain.automation.monitoring_handlers_impl import handle_pause_monitoring as _handle_pause_monitoring
        return await _handle_pause_monitoring(self, payload)

    async def handle_resume_monitoring(self, payload=None):
        from domain.automation.monitoring_handlers_impl import handle_resume_monitoring as _handle_resume_monitoring
        return await _handle_resume_monitoring(self, payload)

    async def handle_pause_monitored_group(self, payload=None):
        """pause-monitored-group 別名 → pause-monitoring"""
        from domain.automation.monitoring_handlers_impl import handle_pause_monitoring as _handle_pause_monitoring
        return await _handle_pause_monitoring(self, payload)

    async def handle_resume_monitored_group(self, payload=None):
        """resume-monitored-group 別名 → resume-monitoring"""
        from domain.automation.monitoring_handlers_impl import handle_resume_monitoring as _handle_resume_monitoring
        return await _handle_resume_monitoring(self, payload)

    async def handle_add_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_add_keyword_set as _handle_add_keyword_set
        return await _handle_add_keyword_set(self, payload)

    async def handle_remove_keyword_set(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_remove_keyword_set as _handle_remove_keyword_set
        return await _handle_remove_keyword_set(self, payload)

    async def handle_add_keyword(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_add_keyword as _handle_add_keyword
        return await _handle_add_keyword(self, payload)

    async def handle_remove_keyword(self, payload=None):
        from domain.automation.keyword_handlers_impl import handle_remove_keyword as _handle_remove_keyword
        return await _handle_remove_keyword(self, payload)

    async def handle_add_group(self, payload=None):
        from domain.groups.handlers_impl import handle_add_group as _handle_add_group
        return await _handle_add_group(self, payload)

    async def handle_add_monitored_group(self, payload=None):
        """add-monitored-group 的別名路由 → 統一使用 add-group 處理"""
        from domain.groups.handlers_impl import handle_add_monitored_group as _handle_add_monitored_group
        return await _handle_add_monitored_group(self, payload)

    async def handle_search_groups(self, payload=None):
        from domain.groups.handlers_impl import handle_search_groups as _handle_search_groups
        return await _handle_search_groups(self, payload)

    async def handle_join_group(self, payload=None):
        from domain.groups.handlers_impl import handle_join_group as _handle_join_group
        return await _handle_join_group(self, payload)

    async def handle_remove_group(self, payload=None):
        from domain.groups.handlers_impl import handle_remove_group as _handle_remove_group
        return await _handle_remove_group(self, payload)

    async def handle_remove_monitored_group(self, payload=None):
        """remove-monitored-group 別名 → remove-group"""
        from domain.groups.handlers_impl import handle_remove_group as _handle_remove_group
        return await _handle_remove_group(self, payload)

    async def handle_leave_group(self, payload=None):
        from domain.groups.handlers_impl import handle_leave_group as _handle_leave_group
        return await _handle_leave_group(self, payload)

    async def handle_add_template(self, payload=None):
        from domain.messaging.template_handlers_impl import handle_add_template as _handle_add_template
        return await _handle_add_template(self, payload)

    async def handle_remove_template(self, payload=None):
        from domain.messaging.template_handlers_impl import handle_remove_template as _handle_remove_template
        return await _handle_remove_template(self, payload)

    async def handle_toggle_template_status(self, payload=None):
        from domain.messaging.template_handlers_impl import handle_toggle_template_status as _handle_toggle_template_status
        return await _handle_toggle_template_status(self, payload)

    async def handle_add_campaign(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_add_campaign as _handle_add_campaign
        return await _handle_add_campaign(self, payload)

    async def handle_remove_campaign(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_remove_campaign as _handle_remove_campaign
        return await _handle_remove_campaign(self, payload)

    async def handle_toggle_campaign_status(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_toggle_campaign_status as _handle_toggle_campaign_status
        return await _handle_toggle_campaign_status(self, payload)

    async def handle_send_message(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_send_message as _handle_send_message
        return await _handle_send_message(self, payload)

    def _on_message_sent_callback(self, lead_id: int):
        """Create callback for when message is sent"""
        async def callback(message, result):
            if result.get('success'):
                await db.add_interaction(lead_id, 'Message Sent', message.text)
                await db.add_log(f"Message sent to lead {lead_id}", "success")
                
                # 🆕 自動狀態流轉：發送消息後自動變為「已聯繫」
                lead = await db.get_lead(lead_id)
                status_changed = False
                if lead and lead.get('status') == 'New':
                    await db.update_lead_status(lead_id, 'Contacted')
                    status_changed = True
                    await db.add_log(f"Lead {lead_id} 狀態自動更新: New → Contacted", "info")
                
                # Send success event
                self.send_event("message-sent", {
                    "leadId": lead_id,
                    "accountPhone": message.phone,
                    "userId": message.user_id,
                    "success": True,
                    "messageId": message.id,
                    "statusChanged": status_changed  # 🆕 通知前端狀態已變更
                })
                
                # 🆕 如果狀態變更，通知前端刷新 leads 數據
                if status_changed:
                    await self.send_leads_update()
            else:
                error = result.get('error', 'Unknown error')
                await db.add_log(f"Failed to send message to lead {lead_id}: {error}", "error")
                
                # Send failure event
                self.send_event("message-sent", {
                    "leadId": lead_id,
                    "accountPhone": message.phone,
                    "userId": message.user_id,
                    "success": False,
                    "error": error,
                    "messageId": message.id
                })
        
        return callback
    
    async def handle_send_group_message(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_send_group_message as _handle_send_group_message
        return await _handle_send_group_message(self, payload)

    async def handle_update_lead_status(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_update_lead_status as _handle_update_lead_status
        return await _handle_update_lead_status(self, payload)

    async def handle_get_leads_paginated(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_get_leads_paginated as _handle_get_leads_paginated
        return await _handle_get_leads_paginated(self, payload)

    async def handle_add_lead(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_add_lead as _handle_add_lead
        return await _handle_add_lead(self, payload)

    async def handle_add_to_dnc(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_add_to_dnc as _handle_add_to_dnc
        return await _handle_add_to_dnc(self, payload)

    async def handle_clear_logs(self):
        from api.handlers.log_handlers_impl import handle_clear_logs as _handle_clear_logs
        return await _handle_clear_logs(self)

    async def handle_load_accounts_from_excel(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_load_accounts_from_excel as _handle_load_accounts_from_excel
        return await _handle_load_accounts_from_excel(self, payload)

    async def handle_export_leads_to_excel(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_export_leads_to_excel as _handle_export_leads_to_excel
        return await _handle_export_leads_to_excel(self, payload)

    async def handle_reload_sessions_and_accounts(self):
        from domain.accounts.session_handlers_impl import handle_reload_sessions_and_accounts as _handle_reload_sessions_and_accounts
        return await _handle_reload_sessions_and_accounts(self)

    async def handle_scan_orphan_sessions(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_scan_orphan_sessions as _handle_scan_orphan_sessions
        return await _handle_scan_orphan_sessions(self, payload)

    async def handle_recover_orphan_sessions(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_recover_orphan_sessions as _handle_recover_orphan_sessions
        return await _handle_recover_orphan_sessions(self, payload)

    async def handle_import_session(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_import_session as _handle_import_session
        return await _handle_import_session(self, payload)

    async def handle_scan_tdata(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_scan_tdata as _handle_scan_tdata
        return await _handle_scan_tdata(self, payload)

    async def handle_import_tdata_account(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_import_tdata_account as _handle_import_tdata_account
        return await _handle_import_tdata_account(self, payload)

    async def handle_import_tdata_batch(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_import_tdata_batch as _handle_import_tdata_batch
        return await _handle_import_tdata_batch(self, payload)

    async def handle_get_default_tdata_path(self):
        from domain.accounts.session_handlers_impl import handle_get_default_tdata_path as _handle_get_default_tdata_path
        return await _handle_get_default_tdata_path(self)

    async def handle_export_session(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_export_session as _handle_export_session
        return await _handle_export_session(self, payload)

    async def handle_export_sessions_batch(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_export_sessions_batch as _handle_export_sessions_batch
        return await _handle_export_sessions_batch(self, payload)

    async def handle_create_backup(self, payload=None):
        from api.handlers.backup_handlers_impl import handle_create_backup as _handle_create_backup
        return await _handle_create_backup(self, payload)

    async def handle_restore_backup(self, payload=None):
        from api.handlers.backup_handlers_impl import handle_restore_backup as _handle_restore_backup
        return await _handle_restore_backup(self, payload)

    async def handle_list_backups(self):
        from api.handlers.backup_handlers_impl import handle_list_backups as _handle_list_backups
        return await _handle_list_backups(self)

    async def handle_get_backup_info(self):
        from api.handlers.backup_handlers_impl import handle_get_backup_info as _handle_get_backup_info
        return await _handle_get_backup_info(self)

    async def handle_get_performance_summary(self):
        from api.handlers.analytics_handlers_impl import handle_get_performance_summary as _handle_get_performance_summary
        return await _handle_get_performance_summary(self)

    async def handle_get_performance_metrics(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_performance_metrics as _handle_get_performance_metrics
        return await _handle_get_performance_metrics(self, payload)

    async def handle_get_sending_stats(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_sending_stats as _handle_get_sending_stats
        return await _handle_get_sending_stats(self, payload)

    async def handle_get_queue_length_history(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_get_queue_length_history as _handle_get_queue_length_history
        return await _handle_get_queue_length_history(self, payload)

    async def handle_get_account_sending_comparison(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_account_sending_comparison as _handle_get_account_sending_comparison
        return await _handle_get_account_sending_comparison(self, payload)

    async def handle_get_campaign_performance_stats(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_get_campaign_performance_stats as _handle_get_campaign_performance_stats
        return await _handle_get_campaign_performance_stats(self, payload)

    async def handle_get_alerts(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_alerts as _handle_get_alerts
        return await _handle_get_alerts(self, payload)

    async def handle_acknowledge_alert(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_acknowledge_alert as _handle_acknowledge_alert
        return await _handle_acknowledge_alert(self, payload)

    async def handle_resolve_alert(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_resolve_alert as _handle_resolve_alert
        return await _handle_resolve_alert(self, payload)

    async def handle_migration_status(self, payload=None):
        from api.handlers.migration_handlers_impl import handle_migration_status as _handle_migration_status
        return await _handle_migration_status(self, payload)

    async def handle_migrate(self, payload=None):
        from api.handlers.migration_handlers_impl import handle_migrate as _handle_migrate
        return await _handle_migrate(self, payload)

    async def handle_rollback_migration(self, payload=None):
        from api.handlers.migration_handlers_impl import handle_rollback_migration as _handle_rollback_migration
        return await _handle_rollback_migration(self, payload)

    async def run(self):
        """Main event loop - read commands from stdin"""
        await self.initialize()
        
        try:
            while self.running:
                # Read line from stdin (non-blocking)
                line = await asyncio.get_event_loop().run_in_executor(
                    None, sys.stdin.readline
                )
                
                if not line:
                    # EOF - stdin closed
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                try:
                    # Parse JSON command
                    command_data = json.loads(line)
                    command = command_data.get('command')
                    payload = command_data.get('payload', {})
                    request_id = command_data.get('request_id')  # Optional request ID for acknowledgment
                    
                    # Handle command
                    await self.handle_command(command, payload, request_id)
                
                except json.JSONDecodeError as e:
                    self.send_log(f"Invalid JSON received: {str(e)}", "error")
                except Exception as e:
                    self.send_log(f"Unexpected error: {str(e)}", "error")
                    import traceback
                    traceback.print_exc()
        
        except KeyboardInterrupt:
            pass
        finally:
            await self.shutdown()


    async def handle_test_local_ai(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_test_local_ai as _handle_test_local_ai
        return await _handle_test_local_ai(self, payload)

    async def handle_test_tts_service(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_test_tts_service as _handle_test_tts_service
        return await _handle_test_tts_service(self, payload)

    async def handle_test_stt_service(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_test_stt_service as _handle_test_stt_service
        return await _handle_test_stt_service(self, payload)

    async def handle_get_ai_settings(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_get_ai_settings as _handle_get_ai_settings
        return await _handle_get_ai_settings(self, payload)

    async def handle_save_ai_settings(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_save_ai_settings as _handle_save_ai_settings
        return await _handle_save_ai_settings(self, payload)

    async def handle_set_autonomous_mode(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_set_autonomous_mode as _handle_set_autonomous_mode
        return await _handle_set_autonomous_mode(self, payload)

    async def handle_get_customer_state(self, payload=None):
        from domain.ai.team_handlers_impl import handle_get_customer_state as _handle_get_customer_state
        return await _handle_get_customer_state(self, payload)

    async def handle_get_smart_system_stats(self, payload=None):
        from domain.ai.team_handlers_impl import handle_get_smart_system_stats as _handle_get_smart_system_stats
        return await _handle_get_smart_system_stats(self, payload)

    async def handle_get_user_memories(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_user_memories as _handle_get_user_memories
        return await _handle_get_user_memories(self, payload)

    async def handle_get_users_by_tag(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_users_by_tag as _handle_get_users_by_tag
        return await _handle_get_users_by_tag(self, payload)

    async def handle_get_customer_profile(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_customer_profile as _handle_get_customer_profile
        return await _handle_get_customer_profile(self, payload)

    async def handle_get_emotion_trend(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_emotion_trend as _handle_get_emotion_trend
        return await _handle_get_emotion_trend(self, payload)

    async def handle_get_workflow_rules(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_workflow_rules as _handle_get_workflow_rules
        return await _handle_get_workflow_rules(self, payload)

    async def handle_get_followup_tasks(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_followup_tasks as _handle_get_followup_tasks
        return await _handle_get_followup_tasks(self, payload)

    async def handle_get_learning_stats(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_learning_stats as _handle_get_learning_stats
        return await _handle_get_learning_stats(self, payload)

    async def handle_get_knowledge_gaps(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_get_knowledge_gaps as _handle_get_knowledge_gaps
        return await _handle_get_knowledge_gaps(self, payload)

    async def handle_schedule_followup(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_schedule_followup as _handle_schedule_followup
        return await _handle_schedule_followup(self, payload)

    async def handle_trigger_workflow(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_trigger_workflow as _handle_trigger_workflow
        return await _handle_trigger_workflow(self, payload)

    async def handle_generate_with_local_ai(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_generate_with_local_ai as _handle_generate_with_local_ai
        return await _handle_generate_with_local_ai(self, payload)

    async def handle_text_to_speech(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_text_to_speech as _handle_text_to_speech
        return await _handle_text_to_speech(self, payload)

    async def handle_speech_to_text(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_speech_to_text as _handle_speech_to_text
        return await _handle_speech_to_text(self, payload)

    async def handle_upload_voice_sample(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_upload_voice_sample as _handle_upload_voice_sample
        return await _handle_upload_voice_sample(self, payload)

    async def handle_delete_voice_sample(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_delete_voice_sample as _handle_delete_voice_sample
        return await _handle_delete_voice_sample(self, payload)

    async def handle_preview_voice_sample(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_preview_voice_sample as _handle_preview_voice_sample
        return await _handle_preview_voice_sample(self, payload)

    async def handle_generate_cloned_voice(self, payload=None):
        from domain.ai.voice_handlers_impl import handle_generate_cloned_voice as _handle_generate_cloned_voice
        return await _handle_generate_cloned_voice(self, payload)

    async def handle_list_voice_samples(self):
        from domain.ai.voice_handlers_impl import handle_list_voice_samples as _handle_list_voice_samples
        return await _handle_list_voice_samples(self)

    async def handle_get_ai_chat_settings(self):
        from domain.ai.chat_handlers_impl import handle_get_ai_chat_settings as _handle_get_ai_chat_settings
        return await _handle_get_ai_chat_settings(self)

    async def handle_update_ai_chat_settings(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_update_ai_chat_settings as _handle_update_ai_chat_settings
        return await _handle_update_ai_chat_settings(self, payload)

    async def handle_get_chat_history(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_get_chat_history as _handle_get_chat_history
        return await _handle_get_chat_history(self, payload)

    async def handle_get_user_context(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_get_user_context as _handle_get_user_context
        return await _handle_get_user_context(self, payload)

    async def handle_generate_ai_response(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_generate_ai_response as _handle_generate_ai_response
        return await _handle_generate_ai_response(self, payload)

    async def _call_local_ai(self, endpoint: str, model: str, system_prompt: str, user_message: str) -> str:
        """直接調用本地/遠程 AI API"""
        import aiohttp
        import time
        import socket
        from urllib.parse import urlparse
        
        print(f"[AI] _call_local_ai called with endpoint: {endpoint}, model: {model}", file=sys.stderr)
        
        # 首先進行連接診斷
        try:
            parsed = urlparse(endpoint)
            host = parsed.hostname
            port = parsed.port or (443 if parsed.scheme == 'https' else 80)
            
            print(f"[AI] Diagnosing connection to {host}:{port}...", file=sys.stderr)
            
            # 測試 TCP 連接
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result == 0:
                    print(f"[AI] ✓ TCP connection to {host}:{port} successful", file=sys.stderr)
                else:
                    print(f"[AI] ✗ TCP connection to {host}:{port} failed (error code: {result})", file=sys.stderr)
                    raise Exception(f"無法連接到 AI 服務 {host}:{port}。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否允許連接\n3. 網絡是否正常")
            except socket.gaierror as e:
                print(f"[AI] ✗ DNS resolution failed for {host}: {e}", file=sys.stderr)
                raise Exception(f"無法解析主機名 {host}。請檢查網絡設置或 DNS 配置")
            except socket.timeout:
                print(f"[AI] ✗ Connection timeout to {host}:{port}", file=sys.stderr)
                raise Exception(f"連接 {host}:{port} 超時。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否阻塞了連接\n3. 網絡路由是否正確")
            except Exception as e:
                print(f"[AI] ✗ Connection test failed: {e}", file=sys.stderr)
                raise Exception(f"連接測試失敗: {str(e)}")
        except Exception as diag_error:
            # 診斷失敗，但繼續嘗試實際請求（可能診斷有誤）
            print(f"[AI] Connection diagnosis failed, but continuing: {diag_error}", file=sys.stderr)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})
        
        # 嘗試 OpenAI 兼容格式
        request_body = {
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7
        }
        if model:
            request_body["model"] = model
        
        # 增加超時時間到 90 秒（AI 生成可能需要更長時間）
        timeout = aiohttp.ClientTimeout(total=90, connect=10)
        
        try:
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                # 嘗試 /v1/chat/completions 端點
                chat_url = endpoint.rstrip('/')
                if not chat_url.endswith('/v1/chat/completions'):
                    chat_url = chat_url.rstrip('/') + '/v1/chat/completions'
                
                print(f"[AI] Attempting to call AI endpoint: {chat_url}", file=sys.stderr)
                print(f"[AI] Request body: model={model}, messages={len(messages)}, max_tokens=500", file=sys.stderr)
                
                try:
                    request_start = time.time()
                    async with session.post(chat_url, json=request_body, timeout=timeout) as resp:
                        connect_time = time.time() - request_start
                        print(f"[AI] Connection established in {connect_time:.2f}s, status: {resp.status}", file=sys.stderr)
                        
                        if resp.status == 200:
                            data_start = time.time()
                            data = await resp.json()
                            data_time = time.time() - data_start
                            total_time = time.time() - start_time
                            
                            print(f"[AI] Response received in {data_time:.2f}s, total time: {total_time:.2f}s", file=sys.stderr)
                            
                            if 'choices' in data and len(data['choices']) > 0:
                                content = data['choices'][0].get('message', {}).get('content', '')
                                print(f"[AI] ✓ Successfully generated response (length: {len(content)})", file=sys.stderr)
                                return content
                            else:
                                print(f"[AI] ✗ Response missing 'choices' field. Full response: {data}", file=sys.stderr)
                                raise Exception(f"AI 服務返回了無效的響應格式: {list(data.keys())}")
                        else:
                            error_text = await resp.text()
                            print(f"[AI] ✗ Error response (status {resp.status}): {error_text[:500]}", file=sys.stderr)
                            raise Exception(f"AI 服務返回錯誤 (HTTP {resp.status}): {error_text[:200]}")
                            
                except asyncio.TimeoutError:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Request timeout after {elapsed:.2f}s for endpoint: {chat_url}", file=sys.stderr)
                    raise Exception(f"AI 服務響應超時（{elapsed:.1f}秒）。可能原因：\n1. AI 服務響應過慢\n2. 網絡延遲過高\n3. 模型加載中\n請檢查 AI 服務狀態")
                except aiohttp.ClientConnectorError as e:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Connection error after {elapsed:.2f}s: {e}", file=sys.stderr)
                    raise Exception(f"無法連接到 AI 服務 ({host}:{port})。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否允許連接\n3. 端點地址是否正確")
                except aiohttp.ClientError as e:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Client error after {elapsed:.2f}s: {e}", file=sys.stderr)
                    # 如果 /v1/chat/completions 失敗，嘗試直接端點
                    if chat_url != endpoint:
                        print(f"[AI] Trying direct endpoint: {endpoint}", file=sys.stderr)
                        try:
                            async with session.post(endpoint, json=request_body, timeout=timeout) as resp2:
                                if resp2.status == 200:
                                    data = await resp2.json()
                                    # 處理各種響應格式
                                    if 'choices' in data:
                                        return data['choices'][0].get('message', {}).get('content', '')
                                    elif 'response' in data:
                                        return data['response']
                                    elif 'content' in data:
                                        return data['content']
                                    elif 'text' in data:
                                        return data['text']
                                else:
                                    error_text = await resp2.text()
                                    print(f"[AI] Direct endpoint error (status {resp2.status}): {error_text[:200]}", file=sys.stderr)
                        except Exception as e2:
                            print(f"[AI] Direct endpoint also failed: {e2}", file=sys.stderr)
                    raise Exception(f"網絡錯誤: {str(e)}")
                    
        except asyncio.TimeoutError:
            raise Exception("AI 服務響應超時，請檢查服務連接或增加超時時間")
        except aiohttp.ClientError as e:
            error_msg = str(e)
            print(f"[AI] Network error: {error_msg}", file=sys.stderr)
            raise Exception(f"無法連接到 AI 服務 ({endpoint}): {error_msg}")
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"[AI] Unexpected error: {error_details}", file=sys.stderr)
            raise
            raise
    
    async def handle_add_ai_memory(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_add_ai_memory as _handle_add_ai_memory
        return await _handle_add_ai_memory(self, payload)

    async def handle_get_ai_memories(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_get_ai_memories as _handle_get_ai_memories
        return await _handle_get_ai_memories(self, payload)

    async def handle_analyze_conversation(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_analyze_conversation as _handle_analyze_conversation
        return await _handle_analyze_conversation(self, payload)

    async def handle_generate_ai_strategy(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_generate_ai_strategy as _handle_generate_ai_strategy
        return await _handle_generate_ai_strategy(self, payload)

    async def handle_save_ai_strategy(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_save_ai_strategy as _handle_save_ai_strategy
        return await _handle_save_ai_strategy(self, payload)

    async def handle_get_ai_strategies(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_get_ai_strategies as _handle_get_ai_strategies
        return await _handle_get_ai_strategies(self, payload)

    async def handle_execute_ai_strategy(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_execute_ai_strategy as _handle_execute_ai_strategy
        return await _handle_execute_ai_strategy(self, payload)

    async def _execute_ai_group_search(self, strategy: Dict[str, Any]):
        """異步執行群組搜索"""
        try:
            keywords = strategy.get('keywords', {})
            search_keywords = keywords.get('highIntent', [])[:5]  # 使用前5個高意向關鍵詞搜索
            
            total_found = 0
            for keyword in search_keywords:
                self.send_event("ai-execution-status", {
                    "isExecuting": True,
                    "phase": "searching",
                    "message": f"正在搜索關鍵詞: {keyword}..."
                })
                
                # 調用群組搜索服務
                try:
                    results = await group_search_service.search_groups(keyword, limit=10)
                    total_found += len(results) if results else 0
                    
                    self.send_event("ai-execution-stats", {
                        "groupsSearched": total_found,
                        "groupsJoined": 0,
                        "membersScanned": 0,
                        "leadsFound": 0,
                        "messagesSent": 0,
                        "responses": 0
                    })
                    
                    await asyncio.sleep(2)  # 避免頻繁請求
                except Exception as search_error:
                    print(f"[AI Strategy] Search error for {keyword}: {search_error}", file=sys.stderr)
            
            self.send_event("ai-execution-status", {
                "isExecuting": True,
                "phase": "search_complete",
                "message": f"搜索完成，共發現 {total_found} 個相關群組"
            })
            
        except Exception as e:
            print(f"[AI Strategy] Group search failed: {e}", file=sys.stderr)
            self.send_event("ai-execution-status", {
                "isExecuting": False,
                "phase": "error",
                "message": f"搜索失敗: {str(e)}"
            })
    
    async def handle_get_chat_templates(self):
        from domain.automation.template_handlers_impl import handle_get_chat_templates as _handle_get_chat_templates
        return await _handle_get_chat_templates(self)

    async def handle_save_chat_template(self, payload=None):
        from domain.automation.template_handlers_impl import handle_save_chat_template as _handle_save_chat_template
        return await _handle_save_chat_template(self, payload)

    async def handle_delete_chat_template(self, payload=None):
        from domain.automation.template_handlers_impl import handle_delete_chat_template as _handle_delete_chat_template
        return await _handle_delete_chat_template(self, payload)

    async def handle_get_trigger_rules(self):
        from domain.automation.trigger_handlers_impl import handle_get_trigger_rules as _handle_get_trigger_rules
        return await _handle_get_trigger_rules(self)

    async def handle_get_trigger_rule(self, payload=None):
        from domain.automation.trigger_handlers_impl import handle_get_trigger_rule as _handle_get_trigger_rule
        return await _handle_get_trigger_rule(self, payload)

    async def handle_save_trigger_rule(self, payload=None):
        from domain.automation.trigger_handlers_impl import handle_save_trigger_rule as _handle_save_trigger_rule
        return await _handle_save_trigger_rule(self, payload)

    async def handle_delete_trigger_rule(self, payload=None):
        from domain.automation.trigger_handlers_impl import handle_delete_trigger_rule as _handle_delete_trigger_rule
        return await _handle_delete_trigger_rule(self, payload)

    async def handle_toggle_trigger_rule(self, payload=None):
        from domain.automation.trigger_handlers_impl import handle_toggle_trigger_rule as _handle_toggle_trigger_rule
        return await _handle_toggle_trigger_rule(self, payload)

    async def handle_get_collected_users(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_get_collected_users as _handle_get_collected_users
        return await _handle_get_collected_users(self, payload)

    async def handle_get_collected_users_stats(self):
        from domain.contacts.leads_handlers_impl import handle_get_collected_users_stats as _handle_get_collected_users_stats
        return await _handle_get_collected_users_stats(self)

    async def handle_mark_user_as_ad(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_mark_user_as_ad as _handle_mark_user_as_ad
        return await _handle_mark_user_as_ad(self, payload)

    async def handle_blacklist_user(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_blacklist_user as _handle_blacklist_user
        return await _handle_blacklist_user(self, payload)

    async def handle_get_user_message_samples(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_get_user_message_samples as _handle_get_user_message_samples
        return await _handle_get_user_message_samples(self, payload)

    async def handle_recalculate_user_risk(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_recalculate_user_risk as _handle_recalculate_user_risk
        return await _handle_recalculate_user_risk(self, payload)

    async def handle_save_ai_model(self, payload=None):
        from domain.ai.model_handlers_impl import handle_save_ai_model as _handle_save_ai_model
        return await _handle_save_ai_model(self, payload)

    async def handle_get_ai_models(self):
        from domain.ai.model_handlers_impl import handle_get_ai_models as _handle_get_ai_models
        return await _handle_get_ai_models(self)

    async def handle_update_ai_model(self, payload=None):
        from domain.ai.model_handlers_impl import handle_update_ai_model as _handle_update_ai_model
        return await _handle_update_ai_model(self, payload)

    async def handle_delete_ai_model(self, payload=None):
        from domain.ai.model_handlers_impl import handle_delete_ai_model as _handle_delete_ai_model
        return await _handle_delete_ai_model(self, payload)

    async def handle_test_ai_model(self, payload=None):
        from domain.ai.model_handlers_impl import handle_test_ai_model as _handle_test_ai_model
        return await _handle_test_ai_model(self, payload)

    async def handle_set_default_ai_model(self, payload=None):
        from domain.ai.model_handlers_impl import handle_set_default_ai_model as _handle_set_default_ai_model
        return await _handle_set_default_ai_model(self, payload)

    async def handle_save_model_usage(self, payload=None):
        from domain.ai.model_handlers_impl import handle_save_model_usage as _handle_save_model_usage
        return await _handle_save_model_usage(self, payload)

    async def handle_get_model_usage(self):
        from domain.ai.model_handlers_impl import handle_get_model_usage as _handle_get_model_usage
        return await _handle_get_model_usage(self)

    async def handle_save_conversation_strategy(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_save_conversation_strategy as _handle_save_conversation_strategy
        return await _handle_save_conversation_strategy(self, payload)

    async def handle_get_conversation_strategy(self):
        from domain.ai.chat_handlers_impl import handle_get_conversation_strategy as _handle_get_conversation_strategy
        return await _handle_get_conversation_strategy(self)

    async def handle_init_knowledge_base(self):
        from domain.ai.knowledge_handlers_impl import handle_init_knowledge_base as _handle_init_knowledge_base
        return await _handle_init_knowledge_base(self)

    async def handle_get_knowledge_stats(self):
        from domain.ai.knowledge_handlers_impl import handle_get_knowledge_stats as _handle_get_knowledge_stats
        return await _handle_get_knowledge_stats(self)

    async def handle_add_document(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_add_document as _handle_add_document
        return await _handle_add_document(self, payload)

    async def handle_add_knowledge_base(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_add_knowledge_base as _handle_add_knowledge_base
        return await _handle_add_knowledge_base(self, payload)

    async def handle_add_knowledge_item(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_add_knowledge_item as _handle_add_knowledge_item
        return await _handle_add_knowledge_item(self, payload)

    async def handle_get_knowledge_items(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_get_knowledge_items as _handle_get_knowledge_items
        return await _handle_get_knowledge_items(self, payload)

    async def handle_ai_generate_knowledge(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_ai_generate_knowledge as _handle_ai_generate_knowledge
        return await _handle_ai_generate_knowledge(self, payload)

    def _parse_ai_knowledge_response(self, response: str) -> list:
        """解析 AI 生成的知識響應"""
        import json
        import re
        
        try:
            # 嘗試直接解析 JSON
            if '{' in response and '}' in response:
                # 提取 JSON 部分
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    data = json.loads(json_match.group())
                    return data.get('items', [])
        except json.JSONDecodeError:
            pass
        
        # 如果解析失敗，嘗試按行解析
        items = []
        lines = response.split('\n')
        current_category = 'custom'
        
        for line in lines:
            line = line.strip()
            if '【產品知識】' in line or '【产品知识】' in line:
                current_category = 'product'
            elif '【常見問答】' in line or '【常见问答】' in line:
                current_category = 'faq'
            elif '【銷售話術】' in line or '【销售话术】' in line:
                current_category = 'sales'
            elif '【異議處理】' in line or '【异议处理】' in line:
                current_category = 'objection'
            elif line and not line.startswith('#') and len(line) > 10:
                items.append({
                    'category': current_category,
                    'title': line[:50],
                    'content': line
                })
        
        return items[:20]  # 限制最多 20 條
    
    def _generate_default_knowledge(self, business_desc: str) -> str:
        """生成默認知識模板"""
        return f'''{{
  "items": [
    {{"category": "product", "title": "服務介紹", "content": "我們提供 {business_desc} 相關服務，致力於為客戶提供專業、高效的解決方案。"}},
    {{"category": "product", "title": "服務優勢", "content": "我們擁有專業團隊、豐富經驗，確保服務質量和客戶滿意度。"}},
    {{"category": "faq", "title": "Q: 如何開始使用？", "content": "A: 您可以直接聯繫我們的客服，我們會為您詳細介紹流程。"}},
    {{"category": "faq", "title": "Q: 服務費用如何？", "content": "A: 我們提供具有競爭力的價格，具體費用根據您的需求而定。"}},
    {{"category": "sales", "title": "開場話術", "content": "您好！很高興為您服務。請問有什麼可以幫助您的？"}},
    {{"category": "sales", "title": "優勢介紹", "content": "我們的服務已經幫助眾多客戶解決問題，您可以放心選擇。"}},
    {{"category": "objection", "title": "價格異議", "content": "我理解您對價格的關注。我們的價格是基於優質服務制定的，您可以先體驗一下。"}},
    {{"category": "objection", "title": "信任異議", "content": "我們已經服務多年，有大量成功案例，您可以查看我們的客戶評價。"}}
  ]
}}'''
    
    async def handle_apply_industry_template(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_apply_industry_template as _handle_apply_industry_template
        return await _handle_apply_industry_template(self, payload)

    async def handle_learn_from_chat_history(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_learn_from_chat_history as _handle_learn_from_chat_history
        return await _handle_learn_from_chat_history(self, payload)

    async def handle_rag_initialize(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_initialize as _handle_rag_initialize
        return await _handle_rag_initialize(self, payload)

    async def handle_rag_search(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_search as _handle_rag_search
        return await _handle_rag_search(self, payload)

    async def handle_rag_get_stats(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_get_stats as _handle_rag_get_stats
        return await _handle_rag_get_stats(self, payload)

    async def handle_rag_record_feedback(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_record_feedback as _handle_rag_record_feedback
        return await _handle_rag_record_feedback(self, payload)

    async def handle_rag_build_from_conversation(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_build_from_conversation as _handle_rag_build_from_conversation
        return await _handle_rag_build_from_conversation(self, payload)

    def _parse_rag_knowledge_response(self, response: str) -> list:
        """解析 AI 生成的知識 JSON"""
        import json
        import re
        
        # 🔧 P0 修復：空值檢查，避免 NoneType 錯誤
        if not response:
            print("[RAG] ⚠️ AI 回應為空，跳過解析", file=sys.stderr)
            return []
        
        try:
            # 嘗試提取 JSON
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                items = data.get('items', [])
                if items:
                    print(f"[RAG] ✓ JSON 解析成功，獲取 {len(items)} 條知識", file=sys.stderr)
                    return items
        except Exception as json_err:
            print(f"[RAG] JSON 解析失敗: {json_err}", file=sys.stderr)
        
        # 降級：按行解析
        items = []
        try:
            lines = response.strip().split('\n')
            current_q = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('Q:') or line.startswith('問:'):
                    current_q = line[2:].strip()
                elif line.startswith('A:') or line.startswith('答:'):
                    if current_q:
                        items.append({
                            'question': current_q,
                            'answer': line[2:].strip()
                        })
                        current_q = None
            
            if items:
                print(f"[RAG] ✓ 行解析成功，獲取 {len(items)} 條知識", file=sys.stderr)
        except Exception as line_err:
            print(f"[RAG] 行解析失敗: {line_err}", file=sys.stderr)
        
        # 🔧 P0 修復：最終容錯 - 將整個回應作為一條知識
        if not items and response.strip():
            print(f"[RAG] 使用容錯模式，將回應作為單條知識", file=sys.stderr)
            # 嘗試提取第一行作為問題，其餘作為答案
            lines = response.strip().split('\n')
            if len(lines) >= 2:
                items.append({
                    'question': lines[0][:100],  # 取前100字作為問題
                    'answer': '\n'.join(lines[1:])[:500]  # 取後續內容作為答案
                })
            else:
                items.append({
                    'question': '業務知識',
                    'answer': response.strip()[:500]
                })
        
        return items
    
    def _parse_document_to_knowledge(self, document: str) -> list:
        """
        🆕 P1-1: 直接解析文檔內容為結構化知識（🆕 P0-3: 智能分類）
        
        支持解析格式：
        - 【標題】：內容
        - 標題：內容
        - 數字. 內容
        - 問答格式
        
        自動分類：
        - product: 產品相關
        - price: 價格/費率相關
        - process: 流程/操作相關
        - faq: 常見問答
        - resource: 資源連結
        """
        import re
        
        if not document or len(document.strip()) < 10:
            return []
        
        items = []
        lines = document.strip().split('\n')
        
        # 🆕 P0-3: 分類關鍵詞映射
        category_keywords = {
            'price': ['價格', '費率', '費用', '金額', '成本', '收費', '結算', '手續費', '佣金', '返點', 'D0', 'D1', 'T+'],
            'product': ['產品', '通道', '功能', '服務', '支付', '收款', '代付', 'H5', '微信', '支付寶', 'USDT'],
            'process': ['流程', '步驟', '如何', '怎麼', '對接', '接入', '使用', '操作', '開戶', '申請'],
            'faq': ['問', '答', 'Q:', 'A:', '是否', '可以', '支持', '能不能'],
            'resource': ['群組', '頻道', '官網', '網址', 'http', 't.me', '視頻', '教程', '連結', '鏈接']
        }
        
        def classify_content(title: str, content: str) -> str:
            """根據內容自動分類"""
            combined = (title + ' ' + content).lower()
            
            # 按優先級匹配
            for category, keywords in category_keywords.items():
                for kw in keywords:
                    if kw.lower() in combined:
                        return category
            
            return 'product'  # 默認為產品知識
        
        # 模式1: 解析【】格式的結構化內容
        bracket_pattern = re.compile(r'【(.+?)】[：:]\s*(.+)')
        
        # 模式2: 解析「標題：內容」格式
        colon_pattern = re.compile(r'^([^：:]{2,15})[：:]\s*(.+)$')
        
        # 模式3: 解析「數字. 內容」格式
        number_pattern = re.compile(r'^\d+[\.、]\s*(.+)$')
        
        current_section = None
        section_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 嘗試匹配【】格式
            bracket_match = bracket_pattern.match(line)
            if bracket_match:
                # 保存之前的 section
                if current_section and section_content:
                    answer = '\n'.join(section_content)
                    items.append({
                        'question': f"{current_section}是什麼？",
                        'answer': answer,
                        'context': document[:200],
                        'category': classify_content(current_section, answer)  # 🆕 自動分類
                    })
                
                title = bracket_match.group(1).strip()
                content = bracket_match.group(2).strip()
                
                # 直接作為知識點
                if len(content) > 5:
                    items.append({
                        'question': f"{title}是多少？" if any(c.isdigit() for c in content) else f"{title}是什麼？",
                        'answer': content,
                        'context': document[:200],
                        'category': classify_content(title, content)  # 🆕 自動分類
                    })
                
                current_section = title
                section_content = [content] if content else []
                continue
            
            # 嘗試匹配「標題：內容」格式
            colon_match = colon_pattern.match(line)
            if colon_match:
                title = colon_match.group(1).strip()
                content = colon_match.group(2).strip()
                
                # 過濾常見的非知識標題
                skip_titles = ['群組', '頻道', '官網', '視頻', '網址', 'http']
                if not any(skip in title for skip in skip_titles) and len(content) > 3:
                    # 判斷問題類型
                    if any(c.isdigit() for c in content):
                        question = f"{title}是多少？"
                    elif '~' in content or '-' in content or '到' in content:
                        question = f"{title}範圍是多少？"
                    else:
                        question = f"{title}是什麼？"
                    
                    items.append({
                        'question': question,
                        'answer': content,
                        'context': document[:200],
                        'category': classify_content(title, content)  # 🆕 自動分類
                    })
                continue
            
            # 收集當前 section 的內容
            if current_section:
                section_content.append(line)
        
        # 處理最後一個 section
        if current_section and section_content:
            answer = '\n'.join(section_content)
            items.append({
                'question': f"{current_section}是什麼？",
                'answer': answer,
                'context': document[:200],
                'category': classify_content(current_section, answer)  # 🆕 自動分類
            })
        
        # 🔧 額外：提取 URL 作為資源知識
        url_pattern = re.compile(r'(https?://[^\s]+)')
        urls = url_pattern.findall(document)
        if urls:
            items.append({
                'question': '有哪些相關連結和資源？',
                'answer': '\n'.join(urls),
                'context': '相關資源連結',
                'category': 'resource'  # 🆕 資源分類
            })
        
        # 🆕 P0-3: 打印分類統計
        category_stats = {}
        for item in items:
            cat = item.get('category', 'unknown')
            category_stats[cat] = category_stats.get(cat, 0) + 1
        
        print(f"[RAG] 📄 文檔解析完成: {len(items)} 條知識", file=sys.stderr)
        print(f"[RAG] 📊 分類統計: {category_stats}", file=sys.stderr)
        return items
    
    # ==================== 🆕 P1-2: 導入預覽確認流程 ====================
    
    # 臨時存儲預覽的知識（用於確認導入）
    _pending_import_items: Dict[str, list] = {}
    
    async def handle_rag_preview_import(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_preview_import as _handle_rag_preview_import
        return await _handle_rag_preview_import(self, payload)

    async def handle_rag_confirm_import(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_confirm_import as _handle_rag_confirm_import
        return await _handle_rag_confirm_import(self, payload)

    async def handle_rag_import_url(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_import_url as _handle_rag_import_url
        return await _handle_rag_import_url(self, payload)

    async def handle_rag_import_document(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_import_document as _handle_rag_import_document
        return await _handle_rag_import_document(self, payload)

    async def handle_rag_cleanup(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_cleanup as _handle_rag_cleanup
        return await _handle_rag_cleanup(self, payload)

    async def handle_rag_merge_similar(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_merge_similar as _handle_rag_merge_similar
        return await _handle_rag_merge_similar(self, payload)

    async def handle_rag_get_gaps(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_get_gaps as _handle_rag_get_gaps
        return await _handle_rag_get_gaps(self, payload)

    async def handle_rag_resolve_gap(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_resolve_gap as _handle_rag_resolve_gap
        return await _handle_rag_resolve_gap(self, payload)

    async def handle_rag_ignore_gap(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_ignore_gap as _handle_rag_ignore_gap
        return await _handle_rag_ignore_gap(self, payload)

    async def handle_rag_delete_gap(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_delete_gap as _handle_rag_delete_gap
        return await _handle_rag_delete_gap(self, payload)

    async def handle_rag_delete_gaps_batch(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_delete_gaps_batch as _handle_rag_delete_gaps_batch
        return await _handle_rag_delete_gaps_batch(self, payload)

    async def handle_rag_cleanup_duplicate_gaps(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_cleanup_duplicate_gaps as _handle_rag_cleanup_duplicate_gaps
        return await _handle_rag_cleanup_duplicate_gaps(self, payload)

    async def handle_rag_suggest_gap_answer(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_suggest_gap_answer as _handle_rag_suggest_gap_answer
        return await _handle_rag_suggest_gap_answer(self, payload)

    async def handle_rag_get_health_report(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_get_health_report as _handle_rag_get_health_report
        return await _handle_rag_get_health_report(self, payload)

    async def handle_rag_get_all_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_get_all_knowledge as _handle_rag_get_all_knowledge
        return await _handle_rag_get_all_knowledge(self, payload)

    async def handle_rag_add_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_add_knowledge as _handle_rag_add_knowledge
        return await _handle_rag_add_knowledge(self, payload)

    async def handle_rag_update_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_update_knowledge as _handle_rag_update_knowledge
        return await _handle_rag_update_knowledge(self, payload)

    async def handle_rag_delete_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_delete_knowledge as _handle_rag_delete_knowledge
        return await _handle_rag_delete_knowledge(self, payload)

    async def handle_rag_delete_knowledge_batch(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_delete_knowledge_batch as _handle_rag_delete_knowledge_batch
        return await _handle_rag_delete_knowledge_batch(self, payload)

    async def handle_rag_start_guided_build(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_start_guided_build as _handle_rag_start_guided_build
        return await _handle_rag_start_guided_build(self, payload)

    def _get_advantages_by_industry(self, industry: str) -> list:
        """根據行業返回優勢選項"""
        common = [
            {'id': 'fast', 'label': '⚡ 速度快'},
            {'id': 'cheap', 'label': '💰 價格低'},
            {'id': 'safe', 'label': '🔒 安全可靠'},
            {'id': '24h', 'label': '🕐 24小時服務'}
        ]
        
        industry_specific = {
            'payment': [
                {'id': 'high_rate', 'label': '📈 匯率高'},
                {'id': 'multi_channel', 'label': '💳 多種收付方式'}
            ],
            'ecommerce': [
                {'id': 'quality', 'label': '✨ 品質保證'},
                {'id': 'return', 'label': '🔄 七天退換'}
            ],
            'education': [
                {'id': 'expert', 'label': '👨‍🏫 專家授課'},
                {'id': 'lifetime', 'label': '♾️ 永久有效'}
            ]
        }
        
        return common + industry_specific.get(industry, [])
    
    def _get_faq_suggestions(self, industry: str) -> list:
        """根據行業返回常見問題建議"""
        suggestions = {
            'payment': ['多久到賬？', '匯率怎麼算？', '手續費多少？', '最低金額是多少？', '安全嗎？'],
            'ecommerce': ['怎麼下單？', '多久發貨？', '可以退換嗎？', '有發票嗎？'],
            'education': ['課程多久？', '可以試聽嗎？', '有證書嗎？', '可以退款嗎？'],
            'finance': ['收益率多少？', '風險大嗎？', '隨時可取嗎？'],
            'service': ['怎麼收費？', '服務範圍是？', '有保障嗎？']
        }
        return suggestions.get(industry, ['怎麼購買？', '價格是多少？', '有售後嗎？'])
    
    async def _generate_knowledge_from_guided_answers(self, answers: dict):
        """根據引導式問答的答案生成知識"""
        import sys
        from telegram_rag_system import telegram_rag, KnowledgeType
        
        try:
            industry = answers.get('step1', 'other')
            advantages = answers.get('step2', [])
            products = answers.get('step3', '')
            faqs = answers.get('step4', '')
            style = answers.get('step5', 'friendly')
            
            total_items = 0
            
            # 發送進度
            self.send_event("rag-build-progress", {
                "progress": {"step": 1, "totalSteps": 4, "currentAction": "分析業務信息...", "itemsGenerated": 0}
            })
            
            # 1. 使用 AI 生成產品知識
            if products and ai_auto_chat:
                prompt = f"""根據以下業務描述，生成 5 條產品知識（JSON 格式）:

業務類型: {industry}
產品描述: {products}
優勢: {', '.join(advantages) if isinstance(advantages, list) else advantages}

請返回 JSON: {{"items": [{{"type": "product", "question": "...", "answer": "..."}}]}}"""
                
                response = await ai_auto_chat._generate_response_with_prompt(
                    user_id="system",
                    user_message=prompt,
                    custom_prompt=f"你是專業的知識庫生成助手。請用繁體中文，風格: {style}",
                    usage_type="knowledge"
                )
                
                items = self._parse_rag_knowledge_response(response)
                for item in items:
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.PRODUCT,
                        question=item.get('question', ''),
                        answer=item.get('answer', '')
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 2, "totalSteps": 4, "currentAction": "生成常見問答...", "itemsGenerated": total_items}
            })
            
            # 2. 根據用戶提供的 FAQ 生成答案
            if faqs:
                faq_list = [q.strip() for q in faqs.split('\n') if q.strip()]
                for faq in faq_list[:10]:
                    if ai_auto_chat:
                        answer = await ai_auto_chat._generate_response_with_prompt(
                            user_id="system",
                            user_message=f"業務：{products[:200]}\n\n問題：{faq}\n\n請給出專業回答。",
                            custom_prompt=f"你是專業客服，風格: {style}。請用繁體中文簡潔回答。",
                            usage_type="knowledge"
                        )
                    else:
                        answer = f"關於您詢問的「{faq}」，我們的回答是..."
                    
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.FAQ,
                        question=faq,
                        answer=answer
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 3, "totalSteps": 4, "currentAction": "生成銷售話術...", "itemsGenerated": total_items}
            })
            
            # 3. 生成銷售話術
            if ai_auto_chat:
                script_prompt = f"""根據以下信息，生成 5 條銷售話術:

業務: {products[:200]}
優勢: {', '.join(advantages) if isinstance(advantages, list) else advantages}

請返回 JSON: {{"items": [{{"type": "script", "question": "場景", "answer": "話術"}}]}}"""
                
                script_response = await ai_auto_chat._generate_response_with_prompt(
                    user_id="system",
                    user_message=script_prompt,
                    custom_prompt=f"你是銷售話術專家。風格: {style}",
                    usage_type="knowledge"
                )
                
                script_items = self._parse_rag_knowledge_response(script_response)
                for item in script_items:
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.SCRIPT,
                        question=item.get('question', ''),
                        answer=item.get('answer', '')
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 4, "totalSteps": 4, "currentAction": "完成！", "itemsGenerated": total_items}
            })
            
            # 完成
            self.send_event("rag-build-complete", {
                "success": True,
                "totalItems": total_items,
                "industry": industry
            })
            self.send_log(f"🧠 引導式構建完成，共 {total_items} 條知識", "success")
            
        except Exception as e:
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_event("rag-build-complete", {
                "success": False,
                "error": str(e)
            })
    
    async def handle_get_documents(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_get_documents as _handle_get_documents
        return await _handle_get_documents(self, payload)

    async def handle_delete_document(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_delete_document as _handle_delete_document
        return await _handle_delete_document(self, payload)

    async def handle_add_media(self, payload=None):
        from domain.messaging.media_handlers_impl import handle_add_media as _handle_add_media
        return await _handle_add_media(self, payload)

    async def handle_get_media(self, payload=None):
        from domain.messaging.media_handlers_impl import handle_get_media as _handle_get_media
        return await _handle_get_media(self, payload)

    async def handle_delete_media(self, payload=None):
        from domain.messaging.media_handlers_impl import handle_delete_media as _handle_delete_media
        return await _handle_delete_media(self, payload)

    async def handle_search_knowledge(self, payload=None):
        from domain.ai.knowledge_handlers_impl import handle_search_knowledge as _handle_search_knowledge
        return await _handle_search_knowledge(self, payload)

    async def handle_add_qa_pair(self, payload=None):
        from domain.ai.qa_handlers_impl import handle_add_qa_pair as _handle_add_qa_pair
        return await _handle_add_qa_pair(self, payload)

    async def handle_get_qa_pairs(self, payload=None):
        from domain.ai.qa_handlers_impl import handle_get_qa_pairs as _handle_get_qa_pairs
        return await _handle_get_qa_pairs(self, payload)

    async def handle_import_qa(self, payload=None):
        from domain.ai.qa_handlers_impl import handle_import_qa as _handle_import_qa
        return await _handle_import_qa(self, payload)

    async def handle_get_rag_context(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_get_rag_context as _handle_get_rag_context
        return await _handle_get_rag_context(self, payload)

    async def handle_get_funnel_overview(self):
        from domain.contacts.funnel_handlers_impl import handle_get_funnel_overview as _handle_get_funnel_overview
        return await _handle_get_funnel_overview(self)

    async def handle_analyze_user_message(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_analyze_user_message as _handle_analyze_user_message
        return await _handle_analyze_user_message(self, payload)

    async def handle_transition_funnel_stage(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_transition_funnel_stage as _handle_transition_funnel_stage
        return await _handle_transition_funnel_stage(self, payload)

    async def handle_get_user_journey(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_user_journey as _handle_get_user_journey
        return await _handle_get_user_journey(self, payload)

    async def handle_batch_update_stages(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_batch_update_stages as _handle_batch_update_stages
        return await _handle_batch_update_stages(self, payload)

    async def handle_add_vector_memory(self, payload=None):
        from domain.ai.memory_handlers_impl import handle_add_vector_memory as _handle_add_vector_memory
        return await _handle_add_vector_memory(self, payload)

    async def handle_search_vector_memories(self, payload=None):
        from domain.ai.memory_handlers_impl import handle_search_vector_memories as _handle_search_vector_memories
        return await _handle_search_vector_memories(self, payload)

    async def handle_get_memory_context(self, payload=None):
        from domain.ai.memory_handlers_impl import handle_get_memory_context as _handle_get_memory_context
        return await _handle_get_memory_context(self, payload)

    async def handle_summarize_conversation(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_summarize_conversation as _handle_summarize_conversation
        return await _handle_summarize_conversation(self, payload)

    async def handle_get_memory_stats(self, payload=None):
        from domain.ai.memory_handlers_impl import handle_get_memory_stats as _handle_get_memory_stats
        return await _handle_get_memory_stats(self, payload)

    async def handle_init_rag_system(self):
        from domain.ai.rag_handlers_impl import handle_init_rag_system as _handle_init_rag_system
        return await _handle_init_rag_system(self)

    async def handle_get_rag_stats(self):
        from domain.ai.rag_handlers_impl import handle_get_rag_stats as _handle_get_rag_stats
        return await _handle_get_rag_stats(self)

    async def handle_search_rag(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_search_rag as _handle_search_rag
        return await _handle_search_rag(self, payload)

    async def handle_trigger_rag_learning(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_trigger_rag_learning as _handle_trigger_rag_learning
        return await _handle_trigger_rag_learning(self, payload)

    async def handle_add_rag_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_add_rag_knowledge as _handle_add_rag_knowledge
        return await _handle_add_rag_knowledge(self, payload)

    async def handle_rag_feedback(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_rag_feedback as _handle_rag_feedback
        return await _handle_rag_feedback(self, payload)

    async def handle_reindex_conversations(self, payload=None):
        from domain.messaging.chat_handlers_impl import handle_reindex_conversations as _handle_reindex_conversations
        return await _handle_reindex_conversations(self, payload)

    async def handle_cleanup_rag_knowledge(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_cleanup_rag_knowledge as _handle_cleanup_rag_knowledge
        return await _handle_cleanup_rag_knowledge(self, payload)

    async def handle_schedule_follow_up(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_schedule_follow_up as _handle_schedule_follow_up
        return await _handle_schedule_follow_up(self, payload)

    async def handle_get_pending_tasks(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_get_pending_tasks as _handle_get_pending_tasks
        return await _handle_get_pending_tasks(self, payload)

    async def handle_cancel_scheduled_task(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_cancel_scheduled_task as _handle_cancel_scheduled_task
        return await _handle_cancel_scheduled_task(self, payload)

    async def handle_get_scheduler_stats(self):
        from domain.automation.scheduler_handlers_impl import handle_get_scheduler_stats as _handle_get_scheduler_stats
        return await _handle_get_scheduler_stats(self)

    async def handle_get_user_profile_full(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_user_profile_full as _handle_get_user_profile_full
        return await _handle_get_user_profile_full(self, payload)

    async def handle_update_user_crm(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_update_user_crm as _handle_update_user_crm
        return await _handle_update_user_crm(self, payload)

    async def handle_add_user_tag(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_add_user_tag as _handle_add_user_tag
        return await _handle_add_user_tag(self, payload)

    async def handle_remove_user_tag(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_remove_user_tag as _handle_remove_user_tag
        return await _handle_remove_user_tag(self, payload)

    async def handle_get_user_tags(self, payload=None):
        from domain.contacts.profile_handlers_impl import handle_get_user_tags as _handle_get_user_tags
        return await _handle_get_user_tags(self, payload)

    async def handle_search_chat_history(self, payload=None):
        from domain.messaging.chat_handlers_impl import handle_search_chat_history as _handle_search_chat_history
        return await _handle_search_chat_history(self, payload)

    async def handle_search_leads(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_search_leads as _handle_search_leads
        return await _handle_search_leads(self, payload)

    async def handle_rebuild_search_index(self):
        from domain.search.search_handlers_impl import handle_rebuild_search_index as _handle_rebuild_search_index
        return await _handle_rebuild_search_index(self)

    async def handle_analyze_funnel(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_analyze_funnel as _handle_analyze_funnel
        return await _handle_analyze_funnel(self, payload)

    async def handle_analyze_user_journey(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_analyze_user_journey as _handle_analyze_user_journey
        return await _handle_analyze_user_journey(self, payload)

    async def handle_get_monitoring_status(self):
        from domain.automation.monitoring_handlers_impl import handle_get_monitoring_status as _handle_get_monitoring_status
        return await _handle_get_monitoring_status(self)

    async def handle_check_monitoring_health(self):
        from domain.automation.monitoring_handlers_impl import handle_check_monitoring_health as _handle_check_monitoring_health
        return await _handle_check_monitoring_health(self)

    async def handle_rebuild_database(self):
        from api.handlers.system_handlers_impl import handle_rebuild_database as _handle_rebuild_database
        return await _handle_rebuild_database(self)

    async def handle_get_chat_history_full(self, payload=None):
        from domain.ai.chat_handlers_impl import handle_get_chat_history_full as _handle_get_chat_history_full
        return await _handle_get_chat_history_full(self, payload)

    async def handle_get_chat_list(self, payload=None):
        from domain.messaging.chat_handlers_impl import handle_get_chat_list as _handle_get_chat_list
        return await _handle_get_chat_list(self, payload)

    async def handle_send_ai_response(self, payload=None):
        from domain.messaging.chat_handlers_impl import handle_send_ai_response as _handle_send_ai_response
        return await _handle_send_ai_response(self, payload)

    async def handle_get_users_with_profiles(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_users_with_profiles as _handle_get_users_with_profiles
        return await _handle_get_users_with_profiles(self, payload)

    async def handle_get_funnel_stats(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_get_funnel_stats as _handle_get_funnel_stats
        return await _handle_get_funnel_stats(self, payload)

    async def handle_bulk_update_user_tags(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_bulk_update_user_tags as _handle_bulk_update_user_tags
        return await _handle_bulk_update_user_tags(self, payload)

    async def handle_bulk_update_user_stage(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_bulk_update_user_stage as _handle_bulk_update_user_stage
        return await _handle_bulk_update_user_stage(self, payload)

    async def handle_update_user_profile(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_update_user_profile as _handle_update_user_profile
        return await _handle_update_user_profile(self, payload)

    async def handle_batch_update_lead_status(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_batch_update_lead_status as _handle_batch_update_lead_status
        return await _handle_batch_update_lead_status(self, payload)

    async def handle_batch_add_tag(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_batch_add_tag as _handle_batch_add_tag
        return await _handle_batch_add_tag(self, payload)

    async def handle_batch_remove_tag(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_batch_remove_tag as _handle_batch_remove_tag
        return await _handle_batch_remove_tag(self, payload)

    async def handle_batch_add_to_dnc(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_batch_add_to_dnc as _handle_batch_add_to_dnc
        return await _handle_batch_add_to_dnc(self, payload)

    async def handle_batch_remove_from_dnc(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_batch_remove_from_dnc as _handle_batch_remove_from_dnc
        return await _handle_batch_remove_from_dnc(self, payload)

    async def handle_batch_update_funnel_stage(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_batch_update_funnel_stage as _handle_batch_update_funnel_stage
        return await _handle_batch_update_funnel_stage(self, payload)

    async def handle_batch_delete_leads(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_batch_delete_leads as _handle_batch_delete_leads
        return await _handle_batch_delete_leads(self, payload)

    async def handle_delete_lead(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_delete_lead as _handle_delete_lead
        return await _handle_delete_lead(self, payload)

    async def handle_invite_lead_to_collab_group(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_invite_lead_to_collab_group as _handle_invite_lead_to_collab_group
        return await _handle_invite_lead_to_collab_group(self, payload)

    async def handle_create_collab_group_for_lead(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_create_collab_group_for_lead as _handle_create_collab_group_for_lead
        return await _handle_create_collab_group_for_lead(self, payload)

    async def handle_undo_batch_operation(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_undo_batch_operation as _handle_undo_batch_operation
        return await _handle_undo_batch_operation(self, payload)

    async def handle_get_batch_operation_history(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_get_batch_operation_history as _handle_get_batch_operation_history
        return await _handle_get_batch_operation_history(self, payload)

    async def handle_get_search_history(self, payload=None):
        from domain.search.search_handlers_impl import handle_get_search_history as _handle_get_search_history
        return await _handle_get_search_history(self, payload)

    async def handle_get_search_results_by_id(self, payload=None):
        from domain.search.search_handlers_impl import handle_get_search_results_by_id as _handle_get_search_results_by_id
        return await _handle_get_search_results_by_id(self, payload)

    async def handle_get_search_statistics(self, payload=None):
        from domain.search.search_handlers_impl import handle_get_search_statistics as _handle_get_search_statistics
        return await _handle_get_search_statistics(self, payload)

    async def handle_get_resource_history(self, payload=None):
        from domain.search.resource_handlers_impl import handle_get_resource_history as _handle_get_resource_history
        return await _handle_get_resource_history(self, payload)

    async def handle_cleanup_search_history(self, payload=None):
        from domain.search.search_handlers_impl import handle_cleanup_search_history as _handle_cleanup_search_history
        return await _handle_cleanup_search_history(self, payload)

    async def handle_create_tag(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_create_tag as _handle_create_tag
        return await _handle_create_tag(self, payload)

    async def handle_delete_tag(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_delete_tag as _handle_delete_tag
        return await _handle_delete_tag(self, payload)

    async def handle_get_lead_tags(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_get_lead_tags as _handle_get_lead_tags
        return await _handle_get_lead_tags(self, payload)

    async def handle_create_ad_template(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_create_ad_template as _handle_create_ad_template
        return await _handle_create_ad_template(self, payload)

    async def handle_update_ad_template(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_update_ad_template as _handle_update_ad_template
        return await _handle_update_ad_template(self, payload)

    async def handle_delete_ad_template(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_delete_ad_template as _handle_delete_ad_template
        return await _handle_delete_ad_template(self, payload)

    async def handle_get_ad_templates(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_templates as _handle_get_ad_templates
        return await _handle_get_ad_templates(self, payload)

    async def handle_toggle_ad_template_status(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_toggle_ad_template_status as _handle_toggle_ad_template_status
        return await _handle_toggle_ad_template_status(self, payload)

    async def handle_preview_ad_template(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_preview_ad_template as _handle_preview_ad_template
        return await _handle_preview_ad_template(self, payload)

    async def handle_validate_spintax(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_validate_spintax as _handle_validate_spintax
        return await _handle_validate_spintax(self, payload)

    async def handle_create_ad_schedule(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_create_ad_schedule as _handle_create_ad_schedule
        return await _handle_create_ad_schedule(self, payload)

    async def handle_update_ad_schedule(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_update_ad_schedule as _handle_update_ad_schedule
        return await _handle_update_ad_schedule(self, payload)

    async def handle_delete_ad_schedule(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_delete_ad_schedule as _handle_delete_ad_schedule
        return await _handle_delete_ad_schedule(self, payload)

    async def handle_get_ad_schedules(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_schedules as _handle_get_ad_schedules
        return await _handle_get_ad_schedules(self, payload)

    async def handle_toggle_ad_schedule_status(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_toggle_ad_schedule_status as _handle_toggle_ad_schedule_status
        return await _handle_toggle_ad_schedule_status(self, payload)

    async def handle_run_ad_schedule_now(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_run_ad_schedule_now as _handle_run_ad_schedule_now
        return await _handle_run_ad_schedule_now(self, payload)

    async def handle_send_ad_now(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_send_ad_now as _handle_send_ad_now
        return await _handle_send_ad_now(self, payload)

    async def handle_get_ad_send_logs(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_send_logs as _handle_get_ad_send_logs
        return await _handle_get_ad_send_logs(self, payload)

    async def handle_get_ad_overview_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_overview_stats as _handle_get_ad_overview_stats
        return await _handle_get_ad_overview_stats(self, payload)

    async def handle_get_ad_template_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_template_stats as _handle_get_ad_template_stats
        return await _handle_get_ad_template_stats(self, payload)

    async def handle_get_ad_schedule_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_schedule_stats as _handle_get_ad_schedule_stats
        return await _handle_get_ad_schedule_stats(self, payload)

    async def handle_get_ad_account_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_account_stats as _handle_get_ad_account_stats
        return await _handle_get_ad_account_stats(self, payload)

    async def handle_get_ad_group_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_group_stats as _handle_get_ad_group_stats
        return await _handle_get_ad_group_stats(self, payload)

    async def handle_get_ad_daily_stats(self, payload=None):
        from domain.marketing.ad_handlers_impl import handle_get_ad_daily_stats as _handle_get_ad_daily_stats
        return await _handle_get_ad_daily_stats(self, payload)

    async def handle_add_user_to_track(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_add_user_to_track as _handle_add_user_to_track
        return await _handle_add_user_to_track(self, payload)

    async def handle_add_user_from_lead(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_add_user_from_lead as _handle_add_user_from_lead
        return await _handle_add_user_from_lead(self, payload)

    async def handle_remove_tracked_user(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_remove_tracked_user as _handle_remove_tracked_user
        return await _handle_remove_tracked_user(self, payload)

    async def handle_get_tracked_users(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_tracked_users as _handle_get_tracked_users
        return await _handle_get_tracked_users(self, payload)

    async def handle_update_user_value_level(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_update_user_value_level as _handle_update_user_value_level
        return await _handle_update_user_value_level(self, payload)

    async def handle_track_user_groups(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_track_user_groups as _handle_track_user_groups
        return await _handle_track_user_groups(self, payload)

    async def handle_batch_track_users(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_batch_track_users as _handle_batch_track_users
        return await _handle_batch_track_users(self, payload)

    async def handle_get_user_groups(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_user_groups as _handle_get_user_groups
        return await _handle_get_user_groups(self, payload)

    async def handle_get_high_value_groups(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_high_value_groups as _handle_get_high_value_groups
        return await _handle_get_high_value_groups(self, payload)

    async def handle_get_tracking_stats(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_tracking_stats as _handle_get_tracking_stats
        return await _handle_get_tracking_stats(self, payload)

    async def handle_get_tracking_logs(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_tracking_logs as _handle_get_tracking_logs
        return await _handle_get_tracking_logs(self, payload)

    async def handle_get_user_value_distribution(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_user_value_distribution as _handle_get_user_value_distribution
        return await _handle_get_user_value_distribution(self, payload)

    async def handle_get_group_overlap_analysis(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_group_overlap_analysis as _handle_get_group_overlap_analysis
        return await _handle_get_group_overlap_analysis(self, payload)

    async def handle_get_tracking_effectiveness(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_get_tracking_effectiveness as _handle_get_tracking_effectiveness
        return await _handle_get_tracking_effectiveness(self, payload)

    async def handle_create_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_create_campaign as _handle_create_campaign
        return await _handle_create_campaign(self, payload)

    async def handle_update_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_update_campaign as _handle_update_campaign
        return await _handle_update_campaign(self, payload)

    async def handle_delete_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_delete_campaign as _handle_delete_campaign
        return await _handle_delete_campaign(self, payload)

    async def handle_get_campaigns(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_get_campaigns as _handle_get_campaigns
        return await _handle_get_campaigns(self, payload)

    async def handle_get_campaign(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_get_campaign as _handle_get_campaign
        return await _handle_get_campaign(self, payload)

    async def handle_start_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_start_campaign as _handle_start_campaign
        return await _handle_start_campaign(self, payload)

    async def handle_pause_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_pause_campaign as _handle_pause_campaign
        return await _handle_pause_campaign(self, payload)

    async def handle_resume_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_resume_campaign as _handle_resume_campaign
        return await _handle_resume_campaign(self, payload)

    async def handle_stop_campaign(self, payload=None):
        from domain.marketing.campaign_handlers_impl import handle_stop_campaign as _handle_stop_campaign
        return await _handle_stop_campaign(self, payload)

    async def handle_get_campaign_logs(self, payload=None):
        from domain.automation.campaign_handlers_impl import handle_get_campaign_logs as _handle_get_campaign_logs
        return await _handle_get_campaign_logs(self, payload)

    async def handle_get_unified_overview(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_unified_overview as _handle_get_unified_overview
        return await _handle_get_unified_overview(self, payload)

    async def handle_get_daily_trends(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_daily_trends as _handle_get_daily_trends
        return await _handle_get_daily_trends(self, payload)

    async def handle_get_channel_performance(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_channel_performance as _handle_get_channel_performance
        return await _handle_get_channel_performance(self, payload)

    async def handle_get_funnel_analysis(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_get_funnel_analysis as _handle_get_funnel_analysis
        return await _handle_get_funnel_analysis(self, payload)

    async def handle_get_role_templates(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_get_role_templates as _handle_get_role_templates
        return await _handle_get_role_templates(self, payload)

    async def handle_assign_role(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_assign_role as _handle_assign_role
        return await _handle_assign_role(self, payload)

    async def handle_update_role(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_update_role as _handle_update_role
        return await _handle_update_role(self, payload)

    async def handle_remove_role(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_remove_role as _handle_remove_role
        return await _handle_remove_role(self, payload)

    async def handle_get_account_roles(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_get_account_roles as _handle_get_account_roles
        return await _handle_get_account_roles(self, payload)

    async def handle_get_all_roles(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_get_all_roles as _handle_get_all_roles
        return await _handle_get_all_roles(self, payload)

    async def handle_get_role_stats(self, payload=None):
        from domain.accounts.role_handlers_impl import handle_get_role_stats as _handle_get_role_stats
        return await _handle_get_role_stats(self, payload)

    async def handle_get_script_templates(self, payload=None):
        from domain.automation.script_handlers_impl import handle_get_script_templates as _handle_get_script_templates
        return await _handle_get_script_templates(self, payload)

    async def handle_create_script_template(self, payload=None):
        from domain.automation.script_handlers_impl import handle_create_script_template as _handle_create_script_template
        return await _handle_create_script_template(self, payload)

    async def handle_delete_script_template(self, payload=None):
        from domain.automation.script_handlers_impl import handle_delete_script_template as _handle_delete_script_template
        return await _handle_delete_script_template(self, payload)

    async def handle_start_script_execution(self, payload=None):
        from domain.automation.script_handlers_impl import handle_start_script_execution as _handle_start_script_execution
        return await _handle_start_script_execution(self, payload)

    async def handle_run_script_execution(self, payload=None):
        from domain.automation.script_handlers_impl import handle_run_script_execution as _handle_run_script_execution
        return await _handle_run_script_execution(self, payload)

    async def handle_stop_script_execution(self, payload=None):
        from domain.automation.script_handlers_impl import handle_stop_script_execution as _handle_stop_script_execution
        return await _handle_stop_script_execution(self, payload)

    async def handle_get_active_executions(self, payload=None):
        from api.handlers.system_handlers_impl import handle_get_active_executions as _handle_get_active_executions
        return await _handle_get_active_executions(self, payload)

    async def handle_get_execution_stats(self, payload=None):
        from api.handlers.system_handlers_impl import handle_get_execution_stats as _handle_get_execution_stats
        return await _handle_get_execution_stats(self, payload)

    async def handle_create_collab_group(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_create_collab_group as _handle_create_collab_group
        return await _handle_create_collab_group(self, payload)

    async def handle_add_collab_member(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_add_collab_member as _handle_add_collab_member
        return await _handle_add_collab_member(self, payload)

    async def handle_get_collab_groups(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_get_collab_groups as _handle_get_collab_groups
        return await _handle_get_collab_groups(self, payload)

    async def handle_update_collab_status(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_update_collab_status as _handle_update_collab_status
        return await _handle_update_collab_status(self, payload)

    async def handle_get_collab_stats(self, payload=None):
        from domain.multi_role.collab_handlers_impl import handle_get_collab_stats as _handle_get_collab_stats
        return await _handle_get_collab_stats(self, payload)

    async def handle_get_marketing_tasks(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_get_marketing_tasks as _handle_get_marketing_tasks
        return await _handle_get_marketing_tasks(self, payload)

    async def handle_create_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_create_marketing_task as _handle_create_marketing_task
        return await _handle_create_marketing_task(self, payload)

    async def handle_update_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_update_marketing_task as _handle_update_marketing_task
        return await _handle_update_marketing_task(self, payload)

    async def handle_delete_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_delete_marketing_task as _handle_delete_marketing_task
        return await _handle_delete_marketing_task(self, payload)

    async def handle_start_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_start_marketing_task as _handle_start_marketing_task
        return await _handle_start_marketing_task(self, payload)

    async def handle_pause_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_pause_marketing_task as _handle_pause_marketing_task
        return await _handle_pause_marketing_task(self, payload)

    async def handle_resume_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_resume_marketing_task as _handle_resume_marketing_task
        return await _handle_resume_marketing_task(self, payload)

    async def handle_complete_marketing_task(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_complete_marketing_task as _handle_complete_marketing_task
        return await _handle_complete_marketing_task(self, payload)

    async def handle_add_marketing_task_targets(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_add_marketing_task_targets as _handle_add_marketing_task_targets
        return await _handle_add_marketing_task_targets(self, payload)

    async def handle_get_marketing_task_targets(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_get_marketing_task_targets as _handle_get_marketing_task_targets
        return await _handle_get_marketing_task_targets(self, payload)

    async def handle_update_marketing_task_target(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_update_marketing_task_target as _handle_update_marketing_task_target
        return await _handle_update_marketing_task_target(self, payload)

    async def handle_assign_marketing_task_role(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_assign_marketing_task_role as _handle_assign_marketing_task_role
        return await _handle_assign_marketing_task_role(self, payload)

    async def handle_auto_assign_marketing_task_roles(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_auto_assign_marketing_task_roles as _handle_auto_assign_marketing_task_roles
        return await _handle_auto_assign_marketing_task_roles(self, payload)

    async def handle_get_marketing_task_stats(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_get_marketing_task_stats as _handle_get_marketing_task_stats
        return await _handle_get_marketing_task_stats(self, payload)

    async def handle_get_api_credentials(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_get_api_credentials as _handle_get_api_credentials
        return await _handle_get_api_credentials(self, payload)

    async def handle_add_api_credential(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_add_api_credential as _handle_add_api_credential
        return await _handle_add_api_credential(self, payload)

    async def handle_remove_api_credential(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_remove_api_credential as _handle_remove_api_credential
        return await _handle_remove_api_credential(self, payload)

    async def handle_toggle_api_credential(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_toggle_api_credential as _handle_toggle_api_credential
        return await _handle_toggle_api_credential(self, payload)

    async def handle_bulk_import_api_credentials(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_bulk_import_api_credentials as _handle_bulk_import_api_credentials
        return await _handle_bulk_import_api_credentials(self, payload)

    async def handle_get_api_recommendation(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_get_api_recommendation as _handle_get_api_recommendation
        return await _handle_get_api_recommendation(self, payload)

    async def handle_get_platform_api_usage(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_get_platform_api_usage as _handle_get_platform_api_usage
        return await _handle_get_platform_api_usage(self, payload)

    async def handle_allocate_platform_api(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_allocate_platform_api as _handle_allocate_platform_api
        return await _handle_allocate_platform_api(self, payload)

    async def handle_release_platform_api(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_release_platform_api as _handle_release_platform_api
        return await _handle_release_platform_api(self, payload)

    async def handle_admin_add_platform_api(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_admin_add_platform_api as _handle_admin_add_platform_api
        return await _handle_admin_add_platform_api(self, payload)

    async def handle_admin_list_platform_apis(self, payload=None):
        from api.handlers.api_credential_handlers_impl import handle_admin_list_platform_apis as _handle_admin_list_platform_apis
        return await _handle_admin_list_platform_apis(self, payload)

    async def handle_select_tdata_folder(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_select_tdata_folder as _handle_select_tdata_folder
        return await _handle_select_tdata_folder(self, payload)

    async def handle_parse_tdata(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_parse_tdata as _handle_parse_tdata
        return await _handle_parse_tdata(self, payload)

    async def handle_import_tdata(self, payload=None):
        from domain.accounts.session_handlers_impl import handle_import_tdata as _handle_import_tdata
        return await _handle_import_tdata(self, payload)

    async def handle_get_intent_score(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_get_intent_score as _handle_get_intent_score
        return await _handle_get_intent_score(self, payload)

    async def handle_get_smart_replies(self, payload=None):
        from domain.messaging.chat_handlers_impl import handle_get_smart_replies as _handle_get_smart_replies
        return await _handle_get_smart_replies(self, payload)

    async def handle_get_auto_tags(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_get_auto_tags as _handle_get_auto_tags
        return await _handle_get_auto_tags(self, payload)

    async def handle_predict_send_time(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_predict_send_time as _handle_predict_send_time
        return await _handle_predict_send_time(self, payload)

    async def handle_get_automation_rules(self, payload=None):
        from domain.automation.rule_handlers_impl import handle_get_automation_rules as _handle_get_automation_rules
        return await _handle_get_automation_rules(self, payload)

    async def handle_add_automation_rule(self, payload=None):
        from domain.automation.rule_handlers_impl import handle_add_automation_rule as _handle_add_automation_rule
        return await _handle_add_automation_rule(self, payload)

    async def handle_update_automation_rule(self, payload=None):
        from domain.automation.rule_handlers_impl import handle_update_automation_rule as _handle_update_automation_rule
        return await _handle_update_automation_rule(self, payload)

    async def handle_delete_automation_rule(self, payload=None):
        from domain.automation.rule_handlers_impl import handle_delete_automation_rule as _handle_delete_automation_rule
        return await _handle_delete_automation_rule(self, payload)

    async def handle_get_reminders(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_get_reminders as _handle_get_reminders
        return await _handle_get_reminders(self, payload)

    async def handle_create_reminder(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_create_reminder as _handle_create_reminder
        return await _handle_create_reminder(self, payload)

    async def handle_snooze_reminder(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_snooze_reminder as _handle_snooze_reminder
        return await _handle_snooze_reminder(self, payload)

    async def handle_complete_reminder(self, payload=None):
        from domain.automation.scheduler_handlers_impl import handle_complete_reminder as _handle_complete_reminder
        return await _handle_complete_reminder(self, payload)

    async def handle_process_stage_event(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_process_stage_event as _handle_process_stage_event
        return await _handle_process_stage_event(self, payload)

    async def handle_get_stage_flow(self, payload=None):
        from domain.contacts.funnel_handlers_impl import handle_get_stage_flow as _handle_get_stage_flow
        return await _handle_get_stage_flow(self, payload)

    async def handle_create_ab_test(self, payload=None):
        from domain.marketing.ab_handlers_impl import handle_create_ab_test as _handle_create_ab_test
        return await _handle_create_ab_test(self, payload)

    async def handle_start_ab_test(self, payload=None):
        from domain.marketing.ab_handlers_impl import handle_start_ab_test as _handle_start_ab_test
        return await _handle_start_ab_test(self, payload)

    async def handle_get_ab_test_results(self, payload=None):
        from domain.marketing.ab_handlers_impl import handle_get_ab_test_results as _handle_get_ab_test_results
        return await _handle_get_ab_test_results(self, payload)

    async def handle_analyze_attribution(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analyze_attribution as _handle_analyze_attribution
        return await _handle_analyze_attribution(self, payload)

    async def handle_analyze_account_roi(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analyze_account_roi as _handle_analyze_account_roi
        return await _handle_analyze_account_roi(self, payload)

    async def handle_analyze_time_effectiveness(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analyze_time_effectiveness as _handle_analyze_time_effectiveness
        return await _handle_analyze_time_effectiveness(self, payload)

    async def handle_predict_lead_conversion(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_predict_lead_conversion as _handle_predict_lead_conversion
        return await _handle_predict_lead_conversion(self, payload)

    async def handle_init_resource_discovery(self):
        from domain.search.resource_handlers_impl import handle_init_resource_discovery as _handle_init_resource_discovery
        return await _handle_init_resource_discovery(self)

    async def handle_search_resources(self, payload=None):
        from domain.search.resource_handlers_impl import handle_search_resources as _handle_search_resources
        return await _handle_search_resources(self, payload)

    async def handle_search_jiso(self, payload=None):
        from domain.search.search_handlers_impl import handle_search_jiso as _handle_search_jiso
        return await _handle_search_jiso(self, payload)

    async def handle_check_jiso_availability(self, payload=None):
        from domain.search.search_handlers_impl import handle_check_jiso_availability as _handle_check_jiso_availability
        return await _handle_check_jiso_availability(self, payload)

    async def handle_clear_resources(self, payload=None):
        from domain.search.resource_handlers_impl import handle_clear_resources as _handle_clear_resources
        return await _handle_clear_resources(self, payload)

    async def handle_get_search_channels(self, payload=None):
        from domain.search.search_handlers_impl import handle_get_search_channels as _handle_get_search_channels
        return await _handle_get_search_channels(self, payload)

    async def handle_add_search_channel(self, payload=None):
        from domain.search.search_handlers_impl import handle_add_search_channel as _handle_add_search_channel
        return await _handle_add_search_channel(self, payload)

    async def handle_update_search_channel(self, payload=None):
        from domain.search.search_handlers_impl import handle_update_search_channel as _handle_update_search_channel
        return await _handle_update_search_channel(self, payload)

    async def handle_delete_search_channel(self, payload=None):
        from domain.search.search_handlers_impl import handle_delete_search_channel as _handle_delete_search_channel
        return await _handle_delete_search_channel(self, payload)

    async def handle_test_search_channel(self, payload=None):
        from domain.search.search_handlers_impl import handle_test_search_channel as _handle_test_search_channel
        return await _handle_test_search_channel(self, payload)

    async def _refresh_custom_bots(self):
        """刷新自定義 Bot 列表到 jiso_search_service"""
        try:
            channels = await db.get_custom_search_channels(enabled_only=True)
            custom_bots = [ch['bot_username'] for ch in channels]
            jiso_search_service.config.custom_bots = custom_bots
            self.send_log(f"🔄 已刷新自定義 Bot 列表: {len(custom_bots)} 個", "info")
        except Exception as e:
            self.send_log(f"刷新自定義 Bot 列表失敗: {e}", "warning")

    async def handle_get_resources(self, payload=None):
        from domain.search.resource_handlers_impl import handle_get_resources as _handle_get_resources
        return await _handle_get_resources(self, payload)

    async def _auto_verify_resource_types(self, resources: list):
        """後台自動驗證資源類型"""
        import sys
        import asyncio
        
        try:
            # 找出未驗證的資源（type_verified = 0 或不存在）
            unverified = [r for r in resources if not r.get('type_verified')]
            
            if not unverified:
                return
            
            # 獲取在線帳號
            accounts = await db.get_all_accounts()
            online_phone = None
            for acc in accounts:
                if acc.get('status') == 'Online':
                    phone = acc.get('phone')
                    if phone in self.telegram_manager.clients:
                        online_phone = phone
                        break
            
            if not online_phone:
                return  # 沒有可用帳號，跳過驗證
            
            client = self.telegram_manager.clients[online_phone]
            
            # 批量驗證（每次最多 5 個，使用智能 FloodWait 處理）
            verified_count = 0
            for resource in unverified[:5]:
                try:
                    username = resource.get('username', '')
                    invite_link = resource.get('invite_link', '')
                    chat_target = username or invite_link
                    
                    if not chat_target:
                        continue
                    
                    # 🆕 使用智能 FloodWait 處理
                    await flood_handler.wait_before_operation(online_phone, 'get_chat')
                    
                    chat_info = await client.get_chat(chat_target)
                    
                    if chat_info:
                        from pyrogram.enums import ChatType
                        if chat_info.type == ChatType.CHANNEL:
                            new_type = "channel"
                        elif chat_info.type == ChatType.SUPERGROUP:
                            new_type = "supergroup"
                        elif chat_info.type == ChatType.GROUP:
                            new_type = "group"
                        else:
                            new_type = resource.get('resource_type', 'unknown')
                        
                        old_type = resource.get('resource_type', 'unknown')
                        resource_id = resource.get('id')
                        
                        # 更新數據庫
                        await db.execute(
                            "UPDATE discovered_resources SET resource_type = ?, type_verified = 1 WHERE id = ?",
                            (new_type, resource_id)
                        )
                        await db._connection.commit()
                        
                        verified_count += 1
                        
                        if new_type != old_type:
                            # 發送更新事件到前端
                            self.send_event("resource-type-verified", {
                                "success": True,
                                "resourceId": resource_id,
                                "oldType": old_type,
                                "newType": new_type,
                                "title": resource.get('title', '')
                            })
                            
                except Exception as e:
                    error_str = str(e).lower()
                    resource_id = resource.get('id')
                    username = resource.get('username', 'unknown')
                    
                    # 錯誤分類和處理
                    if 'username not found' in error_str or 'not found' in error_str:
                        # 用戶名不存在：標記為無效
                        await db.execute(
                            "UPDATE discovered_resources SET status = 'invalid', type_verified = 1, notes = ? WHERE id = ?",
                            (f"用戶名不存在: {username}", resource_id)
                        )
                        await db._connection.commit()
                        # 只在調試時輸出（避免日誌過多）
                        print(f"[Backend] Resource {resource_id}: Username not found ({username})", file=sys.stderr)
                    elif 'floodwait' in error_str:
                        # FloodWait：跳過，稍後重試
                        print(f"[Backend] FloodWait during verification, skipping remaining", file=sys.stderr)
                        break  # 停止本次驗證，避免觸發更多限制
                    elif 'peer_flood' in error_str or 'flood' in error_str:
                        # 觸發 Flood 限制，停止驗證
                        print(f"[Backend] Flood limit hit, stopping verification", file=sys.stderr)
                        break
                    elif 'forbidden' in error_str or 'access' in error_str:
                        # 權限問題：標記需要手動驗證
                        await db.execute(
                            "UPDATE discovered_resources SET notes = ? WHERE id = ?",
                            (f"需要手動驗證: 權限不足", resource_id)
                        )
                        await db._connection.commit()
                    else:
                        # 其他錯誤：只記錄日誌
                        print(f"[Backend] Auto-verify error for resource {resource_id}: {e}", file=sys.stderr)
                    continue
            
            if verified_count > 0:
                print(f"[Backend] Auto-verified {verified_count} resource types", file=sys.stderr)
                
        except Exception as e:
            print(f"[Backend] Error in auto-verify task: {e}", file=sys.stderr)
    
    async def handle_get_resource_stats(self, payload=None):
        from domain.search.resource_handlers_impl import handle_get_resource_stats as _handle_get_resource_stats
        return await _handle_get_resource_stats(self, payload)

    async def handle_add_resource_manually(self, payload=None):
        from domain.search.resource_handlers_impl import handle_add_resource_manually as _handle_add_resource_manually
        return await _handle_add_resource_manually(self, payload)

    async def handle_save_resource(self, payload=None):
        from domain.search.resource_handlers_impl import handle_save_resource as _handle_save_resource
        return await _handle_save_resource(self, payload)

    async def handle_unsave_resource(self, payload=None):
        from domain.search.resource_handlers_impl import handle_unsave_resource as _handle_unsave_resource
        return await _handle_unsave_resource(self, payload)

    async def handle_delete_resource(self, payload=None):
        from domain.search.resource_handlers_impl import handle_delete_resource as _handle_delete_resource
        return await _handle_delete_resource(self, payload)

    async def handle_delete_resources_batch(self, payload=None):
        from domain.search.resource_handlers_impl import handle_delete_resources_batch as _handle_delete_resources_batch
        return await _handle_delete_resources_batch(self, payload)

    async def handle_verify_resource_type(self, payload=None):
        from domain.search.resource_handlers_impl import handle_verify_resource_type as _handle_verify_resource_type
        return await _handle_verify_resource_type(self, payload)

    async def handle_batch_verify_resource_types(self, payload=None):
        from domain.search.resource_handlers_impl import handle_batch_verify_resource_types as _handle_batch_verify_resource_types
        return await _handle_batch_verify_resource_types(self, payload)

    async def handle_clear_all_resources(self):
        from domain.search.resource_handlers_impl import handle_clear_all_resources as _handle_clear_all_resources
        return await _handle_clear_all_resources(self)

    async def handle_add_to_join_queue(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_add_to_join_queue as _handle_add_to_join_queue
        return await _handle_add_to_join_queue(self, payload)

    async def handle_process_join_queue(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_process_join_queue as _handle_process_join_queue
        return await _handle_process_join_queue(self, payload)

    async def handle_batch_join_resources(self, payload=None):
        from domain.search.resource_handlers_impl import handle_batch_join_resources as _handle_batch_join_resources
        return await _handle_batch_join_resources(self, payload)

    async def handle_join_resource(self, payload=None):
        """join-resource: 僅加入群組，不添加到監控"""
        from domain.groups.handlers_impl import handle_join_resource as _handle_join_resource
        return await _handle_join_resource(self, payload)

    async def handle_join_and_monitor(self, payload=None):
        """join-and-monitor 別名 → join-and-monitor-resource"""
        from domain.groups.handlers_impl import handle_join_and_monitor_resource as _handle_join_and_monitor_resource
        return await _handle_join_and_monitor_resource(self, payload)

    async def handle_join_and_monitor_resource(self, payload=None):
        from domain.groups.handlers_impl import handle_join_and_monitor_resource as _handle_join_and_monitor_resource
        return await _handle_join_and_monitor_resource(self, payload)

    def _get_friendly_join_error(self, error: str) -> str:
        """將技術錯誤轉換為用戶友好的信息"""
        error_lower = error.lower()
        
        # 常見錯誤映射
        error_mappings = {
            'flood_wait': '操作過於頻繁，請稍後再試',
            'floodwait': '操作過於頻繁，請稍後再試',
            'user_already_participant': '您已經是該群組的成員',
            'invite_hash_expired': '邀請鏈接已失效或過期',
            'invite_hash_invalid': '邀請鏈接無效',
            'user_not_participant': '您不是該群組的成員',
            'chat_write_forbidden': '沒有權限發送消息到該群組',
            'peer_id_invalid': '群組 ID 無效，請檢查鏈接是否正確',
            'username_not_occupied': '找不到該群組，用戶名不存在',
            'username_invalid': '群組用戶名格式無效',
            'channel_private': '這是私有群組，需要邀請鏈接才能加入',
            'channel_invalid': '無效的頻道/群組',
            'chat_invalid': '無效的聊天',
            'no attribute': '功能暫時不可用，請重啟應用後重試',
            'not connected': '帳號未連接，請先登錄帳號',
            'account not connected': '帳號未連接，請先登錄帳號',
            '沒有可用的已連接帳號': '請先在「帳號管理」中登錄至少一個帳號',
            'timeout': '連接超時，請檢查網絡後重試',
        }
        
        for key, friendly_msg in error_mappings.items():
            if key in error_lower:
                return friendly_msg
        
        # 如果沒有匹配，返回原始錯誤（但清理技術細節）
        if 'object has no attribute' in error_lower:
            return '系統功能異常，請重啟應用後重試'
        
        return error

    async def handle_join_and_monitor_with_account(self, payload=None):
        from domain.groups.handlers_impl import handle_join_and_monitor_with_account as _handle_join_and_monitor_with_account
        return await _handle_join_and_monitor_with_account(self, payload)

    async def handle_batch_join_and_monitor(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_batch_join_and_monitor as _handle_batch_join_and_monitor
        return await _handle_batch_join_and_monitor(self, payload)

    async def handle_analyze_group_link(self, payload=None):
        from domain.automation.monitoring_handlers_impl import handle_analyze_group_link as _handle_analyze_group_link
        return await _handle_analyze_group_link(self, payload)

    async def handle_batch_refresh_member_counts(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_batch_refresh_member_counts as _handle_batch_refresh_member_counts
        return await _handle_batch_refresh_member_counts(self, payload)

    async def handle_get_group_member_count(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_get_group_member_count as _handle_get_group_member_count
        return await _handle_get_group_member_count(self, payload)

    async def handle_get_group_collected_stats(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_group_collected_stats as _handle_get_group_collected_stats
        return await _handle_get_group_collected_stats(self, payload)

    async def handle_get_collected_users_count(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_get_collected_users_count as _handle_get_collected_users_count
        return await _handle_get_collected_users_count(self, payload)

    async def handle_get_history_collection_stats(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_history_collection_stats as _handle_get_history_collection_stats
        return await _handle_get_history_collection_stats(self, payload)

    async def handle_collect_users_from_history_advanced(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_collect_users_from_history_advanced as _handle_collect_users_from_history_advanced
        return await _handle_collect_users_from_history_advanced(self, payload)

    async def handle_get_group_monitoring_status(self, payload=None):
        from domain.automation.monitoring_handlers_impl import handle_get_group_monitoring_status as _handle_get_group_monitoring_status
        return await _handle_get_group_monitoring_status(self, payload)

    async def handle_collect_users_from_history(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_collect_users_from_history as _handle_collect_users_from_history
        return await _handle_collect_users_from_history(self, payload)

    async def handle_extract_members(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_extract_members as _handle_extract_members
        return await _handle_extract_members(self, payload)

    async def handle_get_extracted_members(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_get_extracted_members as _handle_get_extracted_members
        return await _handle_get_extracted_members(self, payload)

    async def handle_get_member_stats(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_get_member_stats as _handle_get_member_stats
        return await _handle_get_member_stats(self, payload)

    async def handle_get_online_members(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_get_online_members as _handle_get_online_members
        return await _handle_get_online_members(self, payload)

    async def handle_update_member(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_update_member as _handle_update_member
        return await _handle_update_member(self, payload)

    async def handle_get_extraction_stats(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_get_extraction_stats as _handle_get_extraction_stats
        return await _handle_get_extraction_stats(self, payload)

    async def handle_start_background_extraction(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_start_background_extraction as _handle_start_background_extraction
        return await _handle_start_background_extraction(self, payload)

    async def handle_get_background_tasks(self, payload=None):
        from api.handlers.system_handlers_impl import handle_get_background_tasks as _handle_get_background_tasks
        return await _handle_get_background_tasks(self, payload)

    async def handle_clear_extraction_cache(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_clear_extraction_cache as _handle_clear_extraction_cache
        return await _handle_clear_extraction_cache(self, payload)

    async def handle_export_members(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_export_members as _handle_export_members
        return await _handle_export_members(self, payload)

    async def handle_deduplicate_members(self, payload=None):
        from domain.contacts.member_handlers_impl import handle_deduplicate_members as _handle_deduplicate_members
        return await _handle_deduplicate_members(self, payload)

    async def handle_batch_tag_members(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_batch_tag_members as _handle_batch_tag_members
        return await _handle_batch_tag_members(self, payload)

    async def handle_get_all_tags(self, payload=None):
        from domain.contacts.tag_handlers_impl import handle_get_all_tags as _handle_get_all_tags
        return await _handle_get_all_tags(self, payload)

    async def handle_get_group_profile(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_get_group_profile as _handle_get_group_profile
        return await _handle_get_group_profile(self, payload)

    async def handle_compare_groups(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_compare_groups as _handle_compare_groups
        return await _handle_compare_groups(self, payload)

    async def handle_recalculate_scores(self, payload=None):
        from api.handlers.system_handlers_impl import handle_recalculate_scores as _handle_recalculate_scores
        return await _handle_recalculate_scores(self, payload)

    async def handle_send_bulk_messages(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_send_bulk_messages as _handle_send_bulk_messages
        return await _handle_send_bulk_messages(self, payload)

    async def handle_batch_invite_to_group(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_batch_invite_to_group as _handle_batch_invite_to_group
        return await _handle_batch_invite_to_group(self, payload)

    async def handle_create_marketing_campaign(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_create_marketing_campaign as _handle_create_marketing_campaign
        return await _handle_create_marketing_campaign(self, payload)

    async def handle_start_marketing_campaign(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_start_marketing_campaign as _handle_start_marketing_campaign
        return await _handle_start_marketing_campaign(self, payload)

    async def handle_get_marketing_stats(self, payload=None):
        from domain.marketing.task_handlers_impl import handle_get_marketing_stats as _handle_get_marketing_stats
        return await _handle_get_marketing_stats(self, payload)

    async def handle_get_ollama_models(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_get_ollama_models as _handle_get_ollama_models
        return await _handle_get_ollama_models(self, payload)

    async def handle_test_ollama_connection(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_test_ollama_connection as _handle_test_ollama_connection
        return await _handle_test_ollama_connection(self, payload)

    async def handle_ollama_generate(self, payload=None):
        from domain.ai.rag_handlers_impl import handle_ollama_generate as _handle_ollama_generate
        return await _handle_ollama_generate(self, payload)

    async def handle_get_discovery_keywords(self):
        from domain.search.discovery_handlers_impl import handle_get_discovery_keywords as _handle_get_discovery_keywords
        return await _handle_get_discovery_keywords(self)

    async def handle_add_discovery_keyword(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_add_discovery_keyword as _handle_add_discovery_keyword
        return await _handle_add_discovery_keyword(self, payload)

    async def handle_get_discovery_logs(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_get_discovery_logs as _handle_get_discovery_logs
        return await _handle_get_discovery_logs(self, payload)

    async def handle_init_discussion_watcher(self):
        from domain.search.discovery_handlers_impl import handle_init_discussion_watcher as _handle_init_discussion_watcher
        return await _handle_init_discussion_watcher(self)

    async def handle_discover_discussion(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_discover_discussion as _handle_discover_discussion
        return await _handle_discover_discussion(self, payload)

    async def handle_discover_discussions_from_resources(self):
        from domain.search.discovery_handlers_impl import handle_discover_discussions_from_resources as _handle_discover_discussions_from_resources
        return await _handle_discover_discussions_from_resources(self)

    async def handle_get_channel_discussions(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_get_channel_discussions as _handle_get_channel_discussions
        return await _handle_get_channel_discussions(self, payload)

    async def handle_start_discussion_monitoring(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_start_discussion_monitoring as _handle_start_discussion_monitoring
        return await _handle_start_discussion_monitoring(self, payload)

    async def handle_stop_discussion_monitoring(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_stop_discussion_monitoring as _handle_stop_discussion_monitoring
        return await _handle_stop_discussion_monitoring(self, payload)

    async def handle_get_discussion_messages(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_get_discussion_messages as _handle_get_discussion_messages
        return await _handle_get_discussion_messages(self, payload)

    async def handle_multi_role_add_role(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_add_role as _handle_multi_role_add_role
        return await _handle_multi_role_add_role(self, payload)

    async def handle_multi_role_update_role(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_update_role as _handle_multi_role_update_role
        return await _handle_multi_role_update_role(self, payload)

    async def handle_multi_role_delete_role(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_delete_role as _handle_multi_role_delete_role
        return await _handle_multi_role_delete_role(self, payload)

    async def handle_multi_role_get_roles(self):
        from domain.multi_role.handlers_impl import handle_multi_role_get_roles as _handle_multi_role_get_roles
        return await _handle_multi_role_get_roles(self)

    async def handle_multi_role_add_script(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_add_script as _handle_multi_role_add_script
        return await _handle_multi_role_add_script(self, payload)

    async def handle_multi_role_update_script(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_update_script as _handle_multi_role_update_script
        return await _handle_multi_role_update_script(self, payload)

    async def handle_multi_role_delete_script(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_delete_script as _handle_multi_role_delete_script
        return await _handle_multi_role_delete_script(self, payload)

    async def handle_multi_role_get_scripts(self):
        from domain.multi_role.handlers_impl import handle_multi_role_get_scripts as _handle_multi_role_get_scripts
        return await _handle_multi_role_get_scripts(self)

    async def handle_multi_role_create_group(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_create_group as _handle_multi_role_create_group
        return await _handle_multi_role_create_group(self, payload)

    async def handle_multi_role_update_group(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_update_group as _handle_multi_role_update_group
        return await _handle_multi_role_update_group(self, payload)

    async def handle_multi_role_get_groups(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_get_groups as _handle_multi_role_get_groups
        return await _handle_multi_role_get_groups(self, payload)

    async def handle_multi_role_get_stats(self):
        from domain.multi_role.handlers_impl import handle_multi_role_get_stats as _handle_multi_role_get_stats
        return await _handle_multi_role_get_stats(self)

    async def handle_multi_role_export_data(self):
        from domain.multi_role.handlers_impl import handle_multi_role_export_data as _handle_multi_role_export_data
        return await _handle_multi_role_export_data(self)

    async def handle_multi_role_import_data(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_import_data as _handle_multi_role_import_data
        return await _handle_multi_role_import_data(self, payload)

    async def handle_reply_to_discussion(self, payload=None):
        from domain.search.discovery_handlers_impl import handle_reply_to_discussion as _handle_reply_to_discussion
        return await _handle_reply_to_discussion(self, payload)

    async def handle_get_discussion_stats(self):
        from domain.search.discovery_handlers_impl import handle_get_discussion_stats as _handle_get_discussion_stats
        return await _handle_get_discussion_stats(self)

    # ==================== AI Team Execution Handlers ====================
    
    # AI 團隊執行器實例
    _ai_team_executor = None
    
    def get_ai_team_executor(self):
        """獲取或創建 AI 團隊執行器"""
        if self._ai_team_executor is None:
            from ai_team_executor import AITeamExecutor
            self._ai_team_executor = AITeamExecutor(
                message_queue=self.message_queue,
                database=db,
                send_event=self.send_event,
                send_log=self.send_log
            )
        return self._ai_team_executor
    
    async def handle_ai_team_pause_execution(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_pause_execution as _handle_ai_team_pause_execution
        return await _handle_ai_team_pause_execution(self, payload)

    async def handle_ai_team_resume_execution(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_resume_execution as _handle_ai_team_resume_execution
        return await _handle_ai_team_resume_execution(self, payload)

    async def handle_ai_team_stop_execution(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_stop_execution as _handle_ai_team_stop_execution
        return await _handle_ai_team_stop_execution(self, payload)

    async def handle_ai_team_add_targets(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_add_targets as _handle_ai_team_add_targets
        return await _handle_ai_team_add_targets(self, payload)

    # ==================== Batch Send Handlers ====================
    
    _batch_send_active = False
    _batch_send_cancelled = False
    
    async def handle_batch_send_start(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_batch_send_start as _handle_batch_send_start
        return await _handle_batch_send_start(self, payload)

    async def handle_batch_send_cancel(self, payload=None):
        from domain.messaging.queue_handlers_impl import handle_batch_send_cancel as _handle_batch_send_cancel
        return await _handle_batch_send_cancel(self, payload)

    # ==================== Batch Invite Handlers ====================
    
    _batch_invite_active = False
    _batch_invite_cancelled = False
    
    async def handle_batch_invite_start(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_batch_invite_start as _handle_batch_invite_start
        return await _handle_batch_invite_start(self, payload)

    async def handle_batch_invite_cancel(self, payload=None):
        from domain.messaging.batch_handlers_impl import handle_batch_invite_cancel as _handle_batch_invite_cancel
        return await _handle_batch_invite_cancel(self, payload)

    async def handle_get_admin_groups(self, payload=None):
        from domain.groups.handlers_impl import handle_get_admin_groups as _handle_get_admin_groups
        return await _handle_get_admin_groups(self, payload)

    async def handle_unified_contacts_sync(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_sync as _handle_unified_contacts_sync
        return await _handle_unified_contacts_sync(self, payload)

    async def handle_unified_contacts_get(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_get as _handle_unified_contacts_get
        return await _handle_unified_contacts_get(self, payload)

    async def handle_unified_contacts_stats(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_stats as _handle_unified_contacts_stats
        return await _handle_unified_contacts_stats(self, payload)

    async def handle_unified_contacts_update(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_update as _handle_unified_contacts_update
        return await _handle_unified_contacts_update(self, payload)

    async def handle_unified_contacts_add_tags(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_add_tags as _handle_unified_contacts_add_tags
        return await _handle_unified_contacts_add_tags(self, payload)

    async def handle_unified_contacts_update_status(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_update_status as _handle_unified_contacts_update_status
        return await _handle_unified_contacts_update_status(self, payload)

    async def handle_unified_contacts_delete(self, payload=None):
        from domain.contacts.leads_handlers_impl import handle_unified_contacts_delete as _handle_unified_contacts_delete
        return await _handle_unified_contacts_delete(self, payload)

    async def handle_sync_resource_status_to_leads(self, payload=None):
        from domain.contacts.tracking_handlers_impl import handle_sync_resource_status_to_leads as _handle_sync_resource_status_to_leads
        return await _handle_sync_resource_status_to_leads(self, payload)

    async def handle_analytics_get_stats(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_get_stats as _handle_analytics_get_stats
        return await _handle_analytics_get_stats(self, payload)

    async def handle_analytics_get_trend(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_get_trend as _handle_analytics_get_trend
        return await _handle_analytics_get_trend(self, payload)

    async def handle_analytics_get_sources(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_get_sources as _handle_analytics_get_sources
        return await _handle_analytics_get_sources(self, payload)

    async def handle_analytics_get_hourly(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_get_hourly as _handle_analytics_get_hourly
        return await _handle_analytics_get_hourly(self, payload)

    async def handle_analytics_generate_insights(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_generate_insights as _handle_analytics_generate_insights
        return await _handle_analytics_generate_insights(self, payload)

    async def handle_analytics_export(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_analytics_export as _handle_analytics_export
        return await _handle_analytics_export(self, payload)

    async def handle_create_multi_role_group(self, payload=None):
        from domain.multi_role.handlers_impl import handle_create_multi_role_group as _handle_create_multi_role_group
        return await _handle_create_multi_role_group(self, payload)

    async def handle_multi_role_start_script(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_start_script as _handle_multi_role_start_script
        return await _handle_multi_role_start_script(self, payload)

    async def handle_multi_role_send_message(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_send_message as _handle_multi_role_send_message
        return await _handle_multi_role_send_message(self, payload)

    async def handle_multi_role_ai_reply(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_ai_reply as _handle_multi_role_ai_reply
        return await _handle_multi_role_ai_reply(self, payload)

    async def handle_multi_role_advance_stage(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_advance_stage as _handle_multi_role_advance_stage
        return await _handle_multi_role_advance_stage(self, payload)

    async def handle_multi_role_ai_plan(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_ai_plan as _handle_multi_role_ai_plan
        return await _handle_multi_role_ai_plan(self, payload)

    async def handle_multi_role_start_private_collaboration(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_start_private_collaboration as _handle_multi_role_start_private_collaboration
        return await _handle_multi_role_start_private_collaboration(self, payload)

    async def handle_multi_role_auto_create_group(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_auto_create_group as _handle_multi_role_auto_create_group
        return await _handle_multi_role_auto_create_group(self, payload)

    async def handle_multi_role_start_group_collaboration(self, payload=None):
        from domain.multi_role.handlers_impl import handle_multi_role_start_group_collaboration as _handle_multi_role_start_group_collaboration
        return await _handle_multi_role_start_group_collaboration(self, payload)

    async def handle_ai_analyze_interest(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_analyze_interest as _handle_ai_analyze_interest
        return await _handle_ai_analyze_interest(self, payload)

    async def handle_workflow_get_executions(self, payload=None):
        from domain.automation.script_handlers_impl import handle_workflow_get_executions as _handle_workflow_get_executions
        return await _handle_workflow_get_executions(self, payload)

    async def handle_ai_execution_save(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_execution_save as _handle_ai_execution_save
        return await _handle_ai_execution_save(self, payload)

    async def handle_ai_execution_get_active(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_execution_get_active as _handle_ai_execution_get_active
        return await _handle_ai_execution_get_active(self, payload)

    async def handle_ai_team_start_execution(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_start_execution as _handle_ai_team_start_execution
        return await _handle_ai_team_start_execution(self, payload)

    async def _ensure_private_poller_running(self, account_matches: list):
        """🔧 Phase 3: 確保私聊輪詢器運行以接收目標用戶回覆"""
        import sys
        
        try:
            # 獲取需要監控的帳號
            phones_to_monitor = [m.get('accountPhone') for m in account_matches if m.get('accountPhone')]
            
            if not phones_to_monitor:
                print(f"[AITeam] ⚠️ 沒有帳號需要監控私聊", file=sys.stderr)
                return
            
            print(f"[AITeam] 🔄 確保私聊輪詢器運行，監控帳號: {phones_to_monitor}", file=sys.stderr)
            
            # 獲取在線客戶端
            online_clients = {}
            for phone in phones_to_monitor:
                client = self.telegram_manager.get_client(phone)
                if client and client.is_connected:
                    online_clients[phone] = client
            
            if not online_clients:
                print(f"[AITeam] ⚠️ 沒有在線帳號可用於私聊監控", file=sys.stderr)
                return
            
            # 設置事件回調（如果尚未設置）
            if private_message_poller.event_callback is None:
                def wrapped_event_callback(event_name: str, payload: Any):
                    self.send_event(event_name, payload)
                    if event_name == "private-message-received":
                        asyncio.create_task(self.handle_ai_team_customer_reply(payload))
                private_message_poller.event_callback = wrapped_event_callback
                print(f"[AITeam] ✅ 私聊輪詢器 event_callback 已設置", file=sys.stderr)
            
            # 添加客戶端到輪詢器（如果尚未運行，會自動啟動）
            if not private_message_poller._running:
                await private_message_poller.start_polling(online_clients)
                print(f"[AITeam] ✅ 私聊輪詢器已啟動，監控 {len(online_clients)} 個帳號", file=sys.stderr)
            else:
                # 添加新帳號到現有輪詢
                for phone, client in online_clients.items():
                    if phone not in private_message_poller._clients:
                        await private_message_poller.add_client(phone, client)
                        print(f"[AITeam] ✅ 帳號 {phone} 已添加到私聊輪詢", file=sys.stderr)
            
        except Exception as e:
            print(f"[AITeam] ⚠️ 確保私聊輪詢器運行失敗: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    async def _execute_scripted_phase(self, execution_id: str):
        """執行劇本階段"""
        import sys
        
        execution = self._ai_team_executions.get(execution_id)
        if not execution:
            return
        
        strategy = execution.get('strategy', {})
        phases = strategy.get('phases', [])
        current_phase = execution.get('current_phase', 0)
        
        if current_phase >= len(phases):
            # 所有階段完成
            self.send_event("ai-team:execution-completed", {
                "executionId": execution_id,
                "totalSent": execution.get('message_count', 0),
                "totalResponses": execution.get('response_count', 0)
            })
            return
        
        phase = phases[current_phase]
        phase_name = phase.get('name', f'階段 {current_phase + 1}')
        
        print(f"[AITeam] 執行階段 {current_phase + 1}: {phase_name}", file=sys.stderr)
        self.send_event("ai-team:phase-changed", {
            "executionId": execution_id,
            "phase": current_phase,
            "phaseName": phase_name
        })
        
    async def handle_ai_team_adjust_strategy(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_adjust_strategy as _handle_ai_team_adjust_strategy
        return await _handle_ai_team_adjust_strategy(self, payload)

    async def handle_ai_team_generate_scriptless_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_generate_scriptless_message as _handle_ai_team_generate_scriptless_message
        return await _handle_ai_team_generate_scriptless_message(self, payload)

    async def _generate_ai_message(
        self,
        role_name: str,
        role_personality: str,
        role_speaking_style: str,
        prompt: str,
        context: Dict[str, Any]
    ) -> Optional[str]:
        """使用 AI 生成消息內容"""
        import sys
        
        try:
            # 獲取 AI 配置 - 🔧 修復: 使用正確的方法名
            settings = await db.get_all_settings()
            ai_provider = settings.get('ai_provider', 'gemini')
            api_key = settings.get('gemini_api_key') or settings.get('openai_api_key')
            
            if not api_key:
                # 使用預設回覆
                default_messages = [
                    f"大家好呀～",
                    f"今天天氣真不錯！",
                    f"有人在嗎？",
                    f"剛看到一個有意思的話題",
                    f"這個問題我也很感興趣",
                ]
                import random
                return random.choice(default_messages)
            
            # 調用 AI 生成
            if ai_provider == 'gemini' and settings.get('gemini_api_key'):
                return await self._call_gemini_for_message(
                    api_key=settings['gemini_api_key'],
                    prompt=prompt
                )
            elif ai_provider == 'openai' and settings.get('openai_api_key'):
                return await self._call_openai_for_message(
                    api_key=settings['openai_api_key'],
                    prompt=prompt
                )
            else:
                # 備用方案
                return f"你好，有什麼我可以幫忙的嗎？"
                
        except Exception as e:
            print(f"[AITeam] Generate AI message error: {e}", file=sys.stderr)
            return None
    
    async def _call_gemini_for_message(self, api_key: str, prompt: str) -> Optional[str]:
        """調用 Gemini 生成消息"""
        import aiohttp
        
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.8,
                            "maxOutputTokens": 150
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        return text.strip() if text else None
                    else:
                        return None
        except Exception as e:
            print(f"[AITeam] Gemini API error: {e}", file=sys.stderr)
            return None
    
    async def _call_openai_for_message(self, api_key: str, prompt: str) -> Optional[str]:
        """調用 OpenAI 生成消息"""
        import aiohttp
        
        try:
            url = "https://api.openai.com/v1/chat/completions"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 150,
                        "temperature": 0.8
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        return text.strip() if text else None
                    else:
                        return None
        except Exception as e:
            print(f"[AITeam] OpenAI API error: {e}", file=sys.stderr)
            return None
    
    async def handle_ai_team_send_scriptless_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_send_scriptless_message as _handle_ai_team_send_scriptless_message
        return await _handle_ai_team_send_scriptless_message(self, payload)

    async def handle_ai_team_conversion_signal(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_conversion_signal as _handle_ai_team_conversion_signal
        return await _handle_ai_team_conversion_signal(self, payload)

    def _calculate_typing_delay(self, content: str) -> float:
        """
        計算擬人化打字延遲（秒）
        基於消息長度和隨機因素
        """
        import random
        
        # 基礎打字速度：約 5-8 個字符/秒（考慮思考時間）
        chars_per_second = random.uniform(5, 8)
        
        # 基於消息長度計算基礎延遲
        base_delay = len(content) / chars_per_second
        
        # 最小延遲 1.5 秒，最大延遲 15 秒
        base_delay = max(1.5, min(15, base_delay))
        
        # 添加隨機波動 (±20%)
        variance = base_delay * random.uniform(-0.2, 0.2)
        
        # 額外的「思考時間」（0.5-2秒）
        think_time = random.uniform(0.5, 2.0)
        
        return base_delay + variance + think_time
    
    def _get_message_interval(self, execution: Dict[str, Any]) -> float:
        """
        獲取消息發送間隔（秒）
        基於帳號健康度和執行模式
        """
        import random
        
        mode = execution.get('mode', 'hybrid')
        message_count = execution.get('message_count', 0)
        
        # 基礎間隔
        if mode == 'scriptless':
            # 無劇本模式：更自然的間隔
            base_interval = random.uniform(30, 90)
        else:
            # 劇本模式：按設定間隔
            base_interval = random.uniform(20, 60)
        
        # 隨著消息增多，適當增加間隔（避免被認為是機器人）
        fatigue_factor = 1 + (message_count // 5) * 0.1  # 每5條消息增加10%間隔
        fatigue_factor = min(2.0, fatigue_factor)  # 最多2倍
        
        return base_interval * fatigue_factor
    
    async def handle_ai_team_customer_reply(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_customer_reply as _handle_ai_team_customer_reply
        return await _handle_ai_team_customer_reply(self, payload)

    async def handle_ai_team_send_manual_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_send_manual_message as _handle_ai_team_send_manual_message
        return await _handle_ai_team_send_manual_message(self, payload)

    async def handle_ai_team_send_private_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_send_private_message as _handle_ai_team_send_private_message
        return await _handle_ai_team_send_private_message(self, payload)

    async def handle_ai_team_request_suggestion(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_request_suggestion as _handle_ai_team_request_suggestion
        return await _handle_ai_team_request_suggestion(self, payload)

    async def _generate_ai_suggestion(self, prompt: str) -> str:
        """生成 AI 建議"""
        try:
            # 嘗試使用已配置的 AI 服務 - 🔧 修復: 使用正確的方法名
            settings = await db.get_all_settings()
            provider = settings.get('ai_provider', 'gemini')
            api_key = settings.get('gemini_api_key') or settings.get('openai_api_key')
            
            if not api_key:
                return "（需要配置 AI API 密鑰才能生成建議）"
            
            if provider == 'gemini':
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: model.generate_content(prompt)
                )
                return response.text.strip() if response.text else ""
            else:
                import openai
                client = openai.OpenAI(api_key=api_key)
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=200
                    )
                )
                return response.choices[0].message.content.strip() if response.choices else ""
                
        except Exception as e:
            print(f"[AITeam] AI suggestion generation error: {e}", file=sys.stderr)
            return ""

    async def handle_ai_team_user_completed(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_user_completed as _handle_ai_team_user_completed
        return await _handle_ai_team_user_completed(self, payload)

    async def handle_ai_team_queue_completed(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_queue_completed as _handle_ai_team_queue_completed
        return await _handle_ai_team_queue_completed(self, payload)

    async def handle_ai_team_next_user(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_next_user as _handle_ai_team_next_user
        return await _handle_ai_team_next_user(self, payload)

    async def handle_graceful_shutdown(self):
        from api.handlers.lifecycle_handlers_impl import handle_graceful_shutdown as _handle_graceful_shutdown
        return await _handle_graceful_shutdown(self)

async def main():
    """Main entry point"""
    service = BackendService()
    await service.run()


if __name__ == "__main__":
    # Run the async main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass


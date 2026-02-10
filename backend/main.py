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

# Phase 9-3: BackendService Mixins
from service import InitStartupMixin, SendQueueMixin, AiServiceMixin, ConfigExecMixin

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

# 🔧 Phase4: 嘗試立即檢測（模塊加載時）
try:
    check_router_available()
except Exception as _router_err:
    print(f"[Backend] Early router check failed: {_router_err}", file=sys.stderr)


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
    
    # === Phase3: 一鍵加入並提取 ===
    'join-and-extract':         ('domain.contacts.member_handlers_impl', 'handle_join_and_extract'),
    
    # === Phase4: 批量提取 ===
    'batch-extract-members':    ('domain.contacts.member_handlers_impl', 'handle_batch_extract_members'),
    
    # === Phase4: 消息歷史提取 ===
    'extract-active-users':     ('domain.contacts.member_handlers_impl', 'handle_extract_active_users'),
    
    # === Phase5-P0: colon 格式命令別名 ===
    # 前端用 alerts:get, 後端 handler 是 handle_get_alerts (getattr 轉換不匹配)
    'alerts:get':               ('api.handlers.analytics_handlers_impl', 'handle_get_alerts'),
    'alerts:resolve':           ('api.handlers.analytics_handlers_impl', 'handle_resolve_alert'),
    'alerts:clear':             ('api.handlers.analytics_handlers_impl', 'handle_clear_all_alerts'),
    'alerts:mark-read':         ('api.handlers.analytics_handlers_impl', 'handle_acknowledge_alert'),
    
    # === Phase6-3: 智能帳號推薦 + 重分配 ===
    'get-account-recommendations': ('domain.groups.handlers_impl', 'handle_get_account_recommendations'),
    'reassign-group-account':      ('domain.groups.handlers_impl', 'handle_reassign_group_account'),
    
    # === Phase7-2: 批量操作 ===
    'batch-add-monitored-groups':  ('domain.groups.handlers_impl', 'handle_batch_add_monitored_groups'),
    'batch-reassign-accounts':     ('domain.groups.handlers_impl', 'handle_batch_reassign_accounts'),
    'batch-bind-keywords':         ('domain.groups.handlers_impl', 'handle_batch_bind_keywords'),
    
    # === Phase8: 用戶收集（統一入口） ===
    'get-group-collected-stats':   ('api.handlers.analytics_handlers_impl', 'handle_get_group_collected_stats'),
    'collect-users-from-history':  ('domain.contacts.member_handlers_impl', 'handle_collect_users_from_history'),
    'get-history-collection-stats':('api.handlers.analytics_handlers_impl', 'handle_get_history_collection_stats'),
    
    # === Phase6-1: 數據庫性能統計 ===
    'get-db-performance':          ('api.handlers.system_handlers_impl', 'handle_get_db_performance'),
    
    # === 預留擴展點 (新增別名只需在此添加一行) ===
}

# 未知命令追蹤器 — 用於診斷前端發送了哪些未註冊的命令
_unknown_command_counter: Dict[str, int] = {}
_UNKNOWN_CMD_LOG_THRESHOLD = 3  # 同一未知命令每 N 次才記一次日誌

# 🆕 Phase4: 命令執行度量（成功/失敗/耗時）
_command_metrics: Dict[str, Dict] = {}  # {command: {success: int, failed: int, total_ms: float, last_error: str}}

# 🆕 Phase5: 路由方式追蹤 — 統計每個命令通過哪種方式路由
_routing_stats: Dict[str, int] = {
    'router': 0,     # CommandRouter 處理
    'alias': 0,      # Alias Registry 處理  
    'getattr': 0,    # getattr 動態查找
    'if_elif': 0,    # 顯式 if-elif 鏈
    'unknown': 0     # 未知命令
}

def _record_command_metric(command: str, success: bool, duration_ms: float, error: str = None):
    """記錄命令執行結果"""
    if command not in _command_metrics:
        _command_metrics[command] = {'success': 0, 'failed': 0, 'total_ms': 0.0, 'count': 0, 'last_error': None, 'route': 'unknown'}
    m = _command_metrics[command]
    m['count'] += 1
    m['total_ms'] += duration_ms
    if success:
        m['success'] += 1
    else:
        m['failed'] += 1
        m['last_error'] = error

def _record_routing(route_type: str, command: str):
    """記錄路由方式"""
    _routing_stats[route_type] = _routing_stats.get(route_type, 0) + 1
    # 確保 metric 條目已存在（可能在 _record_command_metric 之前調用）
    if command not in _command_metrics:
        _command_metrics[command] = {'success': 0, 'failed': 0, 'total_ms': 0.0, 'count': 0, 'last_error': None, 'route': route_type}
    else:
        _command_metrics[command]['route'] = route_type


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


class BackendService(InitStartupMixin, SendQueueMixin, AiServiceMixin, ConfigExecMixin):
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
        _cmd_start_time = time.time()
        _cmd_success = True
        _cmd_error = None
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
                    handled, result = await try_route_command(command, payload, request_id)
                    if handled:
                        _record_routing('router', command)
                        return result
                except Exception as router_error:
                    # 路由器錯誤，使用動態回退機制
                    print(f"[Backend] Router error for {command}: {router_error}, using fallback", file=sys.stderr)
            
            # 🔧 Phase 9-3: 知識庫/RAG 命令快速路徑（替代原 168 行 if-elif 鏈）
            # 這些命令曾因路由器問題需要顯式處理，現在用集合查找 + getattr 統一處理
            _DIRECT_BYPASS_COMMANDS = {
                'add-knowledge-base', 'add-knowledge-item', 'get-knowledge-items',
                'ai-generate-knowledge', 'apply-industry-template', 'learn-from-chat-history',
                'rag-initialize', 'rag-search', 'rag-get-stats', 'rag-add-knowledge',
                'rag-record-feedback', 'rag-build-from-conversation', 'rag-preview-import',
                'rag-confirm-import', 'rag-import-url', 'rag-import-document',
                'rag-cleanup', 'rag-merge-similar', 'rag-get-gaps', 'rag-resolve-gap',
                'rag-ignore-gap', 'rag-delete-gap', 'rag-delete-gaps-batch',
                'rag-cleanup-duplicate-gaps', 'rag-suggest-gap-answer',
                'rag-get-all-knowledge', 'rag-update-knowledge',
                'rag-delete-knowledge', 'rag-delete-knowledge-batch',
                'rag-get-health-report', 'rag-start-guided-build',
            }
            if command in _DIRECT_BYPASS_COMMANDS:
                _bypass_method = 'handle_' + command.replace('-', '_')
                _bypass_handler = getattr(self, _bypass_method, None)
                if _bypass_handler and callable(_bypass_handler):
                    _record_routing('if_elif', command)
                    await _bypass_handler(payload or {})
                    return
            
            # 🔧 P8-5: 前端審計日誌批量接收
            if command == 'audit-log-batch':
                entries = (payload or {}).get('entries', [])
                if entries:
                    try:
                        from core.db_utils import get_connection
                        with get_connection() as conn:
                            conn.execute('''
                                CREATE TABLE IF NOT EXISTS frontend_audit_log (
                                    id TEXT PRIMARY KEY, action TEXT NOT NULL,
                                    severity TEXT DEFAULT 'info', user_id TEXT,
                                    details TEXT, timestamp INTEGER,
                                    received_at TEXT DEFAULT CURRENT_TIMESTAMP
                                )
                            ''')
                            for entry in entries[:100]:
                                conn.execute(
                                    'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                                    (entry.get('id', ''), entry.get('action', 'unknown'),
                                     entry.get('severity', 'info'), str(entry.get('userId', '')),
                                     json.dumps(entry.get('details', {}), ensure_ascii=False),
                                     entry.get('timestamp', 0))
                                )
                            conn.commit()
                        print(f"[Backend] Stored {len(entries)} frontend audit entries", file=sys.stderr)
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
                        _record_routing('alias', command)
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
                _record_routing('getattr', command)
                if payload is not None and accepts_payload:
                    result = await handler(payload)
                else:
                    result = await handler()
                return result
            else:
                # 🆕 Phase3: 追蹤未知命令
                _record_routing('unknown', command)
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
            _cmd_success = False
            _cmd_error = str(e)
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
        finally:
            # 🆕 Phase4: 記錄命令執行度量
            _cmd_duration = (time.time() - _cmd_start_time) * 1000
            _record_command_metric(command, _cmd_success, _cmd_duration, _cmd_error)
    
    async def handle_get_initial_state(self):
        from api.handlers.lifecycle_handlers_impl import handle_get_initial_state as _handle_get_initial_state
        return await _handle_get_initial_state(self)

    # ========== Partial Update Functions ==========
    # These functions send only the updated data instead of full state refresh
    
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

    async def handle_ai_generate_text(self, payload=None):
        from domain.ai.generation_handlers_impl import handle_ai_generate_text as _handle_ai_generate_text
        return await _handle_ai_generate_text(self, payload)

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

    async def handle_clear_all_alerts(self, payload=None):
        from api.handlers.analytics_handlers_impl import handle_clear_all_alerts as _handle_clear_all_alerts
        return await _handle_clear_all_alerts(self, payload)

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

    async def handle_get_resources(self, payload=None):
        from domain.search.resource_handlers_impl import handle_get_resources as _handle_get_resources
        return await _handle_get_resources(self, payload)

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

    async def handle_ai_team_adjust_strategy(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_adjust_strategy as _handle_ai_team_adjust_strategy
        return await _handle_ai_team_adjust_strategy(self, payload)

    async def handle_ai_team_generate_scriptless_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_generate_scriptless_message as _handle_ai_team_generate_scriptless_message
        return await _handle_ai_team_generate_scriptless_message(self, payload)

    async def handle_ai_team_send_scriptless_message(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_send_scriptless_message as _handle_ai_team_send_scriptless_message
        return await _handle_ai_team_send_scriptless_message(self, payload)

    async def handle_ai_team_conversion_signal(self, payload=None):
        from domain.ai.team_handlers_impl import handle_ai_team_conversion_signal as _handle_ai_team_conversion_signal
        return await _handle_ai_team_conversion_signal(self, payload)

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


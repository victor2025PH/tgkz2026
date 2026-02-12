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
from message_queue import MessageQueue
from error_handler import handle_error
from message_ack import get_ack_manager
from text_utils import safe_json_dumps, sanitize_dict

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

# 🔧 P5-1: 移除了重复的 get_init_group_poller()（已在第 174 行定义）


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

# 🔧 P5-1: 移除了未使用的 RecoveryAction = None, ErrorCategory = None（已由 mixin 延迟获取器处理）


# 🆕 Phase 2: 命令路由器整合（延遲檢測）
ROUTER_AVAILABLE = False
try_route_command = None  # 🔧 Fix: 在模块级声明，避免 NameError

def check_router_available():
    global ROUTER_AVAILABLE, try_route_command
    try:
        from api.router_integration import setup_command_router, try_route_command as _trc
        ROUTER_AVAILABLE = True
        try_route_command = _trc
        return True
    except ImportError as e:
        print(f"[Backend] Command router not available: {e}", file=sys.stderr)
        ROUTER_AVAILABLE = False
        try_route_command = None
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
    
    # === 🔧 P7-3: 缺失 handler 的别名映射 ===
    # 以下命令由 Router 注册但缺少 BackendService 方法
    # 映射到已有的等效实现
    'add-tracked-user':             ('domain.contacts.tracking_handlers_impl', 'handle_add_user_to_track'),
    'update-tracked-user':          ('domain.contacts.tracking_handlers_impl', 'handle_update_user_profile'),
    'delete-tracked-user':          ('domain.contacts.tracking_handlers_impl', 'handle_remove_tracked_user'),
    'check-group-monitoring-status':('domain.automation.monitoring_handlers_impl', 'handle_get_group_monitoring_status'),
    'group-get-info':               ('domain.automation.monitoring_handlers_impl', 'handle_analyze_group_link'),
    
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


# ========== Phase 9-4: Handler Auto-Registry ==========
# Replaces 551 individual 3-line delegation stubs with compact registry.
# Each module maps to a tuple of handler method names.
# Default: method accepts payload, function name == method name.

_HANDLER_REGISTRY = {
    'api.handlers.analytics_handlers_impl': (
        'handle_get_account_health_report handle_get_performance_summary '
        'handle_get_performance_metrics handle_get_sending_stats '
        'handle_get_account_sending_comparison handle_get_alerts handle_acknowledge_alert '
        'handle_resolve_alert handle_clear_all_alerts handle_get_high_value_groups '
        'handle_get_group_overlap_analysis handle_get_unified_overview '
        'handle_get_daily_trends handle_get_channel_performance handle_analyze_attribution '
        'handle_analyze_account_roi handle_analyze_time_effectiveness '
        'handle_get_group_collected_stats handle_get_history_collection_stats '
        'handle_get_group_profile handle_compare_groups handle_analytics_get_stats '
        'handle_analytics_get_trend handle_analytics_get_sources '
        'handle_analytics_get_hourly handle_analytics_generate_insights '
        'handle_analytics_export'
    ),
    'api.handlers.api_credential_handlers_impl': (
        'handle_get_api_credentials handle_add_api_credential handle_remove_api_credential '
        'handle_toggle_api_credential handle_bulk_import_api_credentials '
        'handle_get_api_recommendation handle_get_platform_api_usage '
        'handle_allocate_platform_api handle_release_platform_api '
        'handle_admin_add_platform_api handle_admin_list_platform_apis'
    ),
    'api.handlers.backup_handlers_impl': (
        'handle_create_backup handle_restore_backup handle_list_backups '
        'handle_get_backup_info'
    ),
    'api.handlers.lifecycle_handlers_impl': 'handle_get_initial_state handle_graceful_shutdown',
    'api.handlers.log_handlers_impl': 'handle_get_logs handle_export_logs handle_clear_logs',
    'api.handlers.migration_handlers_impl': (
        'handle_migration_status handle_migrate handle_rollback_migration'
    ),
    'api.handlers.settings_handlers_impl': 'handle_save_settings handle_get_settings',
    'api.handlers.system_handlers_impl': (
        'handle_rebuild_database handle_get_active_executions handle_get_execution_stats '
        'handle_get_background_tasks handle_recalculate_scores'
    ),
    'domain.accounts.account_handlers_impl': (
        'handle_add_account handle_send_code handle_login_account '
        'handle_check_account_status handle_update_account_data handle_update_account '
        'handle_test_proxy handle_sync_account_info handle_logout_account handle_save_tags '
        'handle_save_groups handle_get_tags handle_get_groups handle_save_personas '
        'handle_get_personas handle_batch_update_accounts handle_bulk_assign_role '
        'handle_bulk_assign_group handle_bulk_delete_accounts handle_remove_account '
        'handle_get_accounts'
    ),
    'domain.accounts.credential_handlers_impl': (
        'handle_credential_start_scrape handle_credential_submit_code '
        'handle_credential_get_status handle_credential_get_all '
        'handle_credential_cancel_scrape'
    ),
    'domain.accounts.ip_handlers_impl': (
        'handle_ip_bind handle_ip_unbind handle_ip_get_binding handle_ip_get_all_bindings '
        'handle_ip_get_statistics handle_ip_verify_binding'
    ),
    'domain.accounts.qr_handlers_impl': (
        'handle_qr_login_create handle_qr_login_status handle_qr_login_refresh '
        'handle_qr_login_submit_2fa handle_qr_login_cancel'
    ),
    'domain.accounts.role_handlers_impl': (
        'handle_get_role_templates handle_assign_role handle_update_role '
        'handle_remove_role handle_get_account_roles handle_get_all_roles '
        'handle_get_role_stats'
    ),
    'domain.accounts.session_handlers_impl': (
        'handle_load_accounts_from_excel handle_reload_sessions_and_accounts '
        'handle_scan_orphan_sessions handle_recover_orphan_sessions handle_import_session '
        'handle_scan_tdata handle_import_tdata_account handle_import_tdata_batch '
        'handle_get_default_tdata_path handle_export_session handle_export_sessions_batch '
        'handle_select_tdata_folder handle_parse_tdata handle_import_tdata'
    ),
    'domain.ai.chat_handlers_impl': (
        'handle_get_ai_chat_settings handle_update_ai_chat_settings '
        'handle_get_chat_history handle_get_user_context handle_generate_ai_response '
        'handle_add_ai_memory handle_get_ai_memories handle_analyze_conversation '
        'handle_generate_ai_strategy handle_save_ai_strategy handle_get_ai_strategies '
        'handle_execute_ai_strategy handle_save_conversation_strategy '
        'handle_get_conversation_strategy handle_get_chat_history_full'
    ),
    'domain.ai.generation_handlers_impl': (
        'handle_ai_generate_message handle_ai_generate_text handle_ai_generate_group_names '
        'handle_ai_generate_welcome handle_test_local_ai handle_test_tts_service '
        'handle_test_stt_service handle_get_ai_settings handle_save_ai_settings '
        'handle_set_autonomous_mode handle_generate_with_local_ai '
        'handle_summarize_conversation handle_ai_analyze_interest handle_ai_execution_save '
        'handle_ai_execution_get_active'
    ),
    'domain.ai.knowledge_handlers_impl': (
        'handle_learn_from_history handle_get_knowledge_gaps handle_init_knowledge_base '
        'handle_get_knowledge_stats handle_add_document handle_add_knowledge_base '
        'handle_add_knowledge_item handle_get_knowledge_items handle_ai_generate_knowledge '
        'handle_apply_industry_template handle_learn_from_chat_history '
        'handle_get_documents handle_delete_document handle_search_knowledge'
    ),
    'domain.ai.memory_handlers_impl': (
        'handle_add_vector_memory handle_search_vector_memories handle_get_memory_context '
        'handle_get_memory_stats'
    ),
    'domain.ai.model_handlers_impl': (
        'handle_save_ai_model handle_get_ai_models handle_update_ai_model '
        'handle_delete_ai_model handle_test_ai_model handle_set_default_ai_model '
        'handle_save_model_usage handle_get_model_usage'
    ),
    'domain.ai.qa_handlers_impl': 'handle_add_qa_pair handle_get_qa_pairs handle_import_qa',
    'domain.ai.rag_handlers_impl': (
        'handle_rag_initialize handle_rag_search handle_rag_get_stats '
        'handle_rag_record_feedback handle_rag_build_from_conversation '
        'handle_rag_preview_import handle_rag_confirm_import handle_rag_import_url '
        'handle_rag_import_document handle_rag_cleanup handle_rag_merge_similar '
        'handle_rag_get_gaps handle_rag_resolve_gap handle_rag_ignore_gap '
        'handle_rag_delete_gap handle_rag_delete_gaps_batch '
        'handle_rag_cleanup_duplicate_gaps handle_rag_suggest_gap_answer '
        'handle_rag_get_health_report handle_rag_get_all_knowledge '
        'handle_rag_add_knowledge handle_rag_update_knowledge handle_rag_delete_knowledge '
        'handle_rag_delete_knowledge_batch handle_rag_start_guided_build '
        'handle_get_rag_context handle_init_rag_system handle_get_rag_stats '
        'handle_search_rag handle_trigger_rag_learning handle_add_rag_knowledge '
        'handle_rag_feedback handle_cleanup_rag_knowledge handle_get_ollama_models '
        'handle_test_ollama_connection handle_ollama_generate'
    ),
    'domain.ai.team_handlers_impl': (
        'handle_get_customer_state handle_get_smart_system_stats '
        'handle_ai_team_pause_execution handle_ai_team_resume_execution '
        'handle_ai_team_stop_execution handle_ai_team_add_targets '
        'handle_ai_team_start_execution handle_ai_team_adjust_strategy '
        'handle_ai_team_generate_scriptless_message handle_ai_team_send_scriptless_message '
        'handle_ai_team_conversion_signal handle_ai_team_customer_reply '
        'handle_ai_team_send_manual_message handle_ai_team_send_private_message '
        'handle_ai_team_request_suggestion handle_ai_team_user_completed '
        'handle_ai_team_queue_completed handle_ai_team_next_user'
    ),
    'domain.ai.voice_handlers_impl': (
        'handle_text_to_speech handle_speech_to_text handle_upload_voice_sample '
        'handle_delete_voice_sample handle_preview_voice_sample '
        'handle_generate_cloned_voice handle_list_voice_samples'
    ),
    'domain.automation.campaign_handlers_impl': (
        'handle_add_campaign handle_remove_campaign handle_toggle_campaign_status '
        'handle_get_campaign_performance_stats handle_get_campaigns handle_get_campaign '
        'handle_get_campaign_logs'
    ),
    'domain.automation.keyword_handlers_impl': (
        'handle_get_keyword_sets handle_save_keyword_set handle_delete_keyword_set '
        'handle_bind_keyword_set handle_unbind_keyword_set handle_add_keyword_set '
        'handle_remove_keyword_set handle_add_keyword handle_remove_keyword'
    ),
    'domain.automation.monitoring_handlers_impl': (
        'handle_start_monitoring handle_stop_monitoring handle_one_click_start '
        'handle_one_click_stop handle_get_system_status handle_get_monitored_groups '
        'handle_pause_monitoring handle_resume_monitoring handle_pause_monitored_group '
        'handle_resume_monitored_group handle_get_monitoring_status '
        'handle_check_monitoring_health handle_analyze_group_link '
        'handle_get_group_monitoring_status'
    ),
    'domain.automation.rule_handlers_impl': (
        'handle_get_automation_rules handle_add_automation_rule '
        'handle_update_automation_rule handle_delete_automation_rule'
    ),
    'domain.automation.scheduler_handlers_impl': (
        'handle_schedule_follow_up handle_get_pending_tasks handle_cancel_scheduled_task '
        'handle_get_scheduler_stats handle_get_reminders handle_create_reminder '
        'handle_snooze_reminder handle_complete_reminder'
    ),
    'domain.automation.script_handlers_impl': (
        'handle_get_script_templates handle_create_script_template '
        'handle_delete_script_template handle_start_script_execution '
        'handle_run_script_execution handle_stop_script_execution '
        'handle_workflow_get_executions'
    ),
    'domain.automation.template_handlers_impl': (
        'handle_get_chat_templates handle_save_chat_template handle_delete_chat_template'
    ),
    'domain.automation.trigger_handlers_impl': (
        'handle_get_trigger_rules handle_get_trigger_rule handle_save_trigger_rule '
        'handle_delete_trigger_rule handle_toggle_trigger_rule'
    ),
    'domain.contacts.funnel_handlers_impl': (
        'handle_get_funnel_overview handle_transition_funnel_stage '
        'handle_batch_update_stages handle_analyze_funnel handle_get_funnel_stats '
        'handle_bulk_update_user_stage handle_batch_update_funnel_stage '
        'handle_get_funnel_analysis handle_process_stage_event handle_get_stage_flow '
        'handle_get_detailed_funnel_stats'
    ),
    'domain.contacts.leads_handlers_impl': (
        'handle_update_lead_status handle_get_leads_paginated handle_add_lead '
        'handle_add_to_dnc handle_export_leads_to_excel handle_get_collected_users '
        'handle_get_collected_users_stats handle_mark_user_as_ad handle_blacklist_user '
        'handle_get_user_message_samples handle_recalculate_user_risk handle_search_leads '
        'handle_bulk_update_user_tags handle_batch_update_lead_status '
        'handle_batch_add_to_dnc handle_batch_remove_from_dnc handle_batch_delete_leads '
        'handle_delete_lead handle_get_intent_score handle_predict_lead_conversion '
        'handle_get_collected_users_count handle_unified_contacts_sync '
        'handle_unified_contacts_get handle_unified_contacts_stats '
        'handle_unified_contacts_update handle_unified_contacts_add_tags '
        'handle_unified_contacts_update_status handle_unified_contacts_delete '
        'handle_batch_update_leads handle_batch_tag_leads handle_batch_export_leads'
    ),
    'domain.contacts.member_handlers_impl': (
        'handle_batch_refresh_member_counts handle_get_group_member_count '
        'handle_collect_users_from_history_advanced handle_collect_users_from_history '
        'handle_extract_members handle_get_extracted_members handle_get_member_stats '
        'handle_get_online_members handle_update_member handle_get_extraction_stats '
        'handle_start_background_extraction handle_clear_extraction_cache '
        'handle_export_members handle_deduplicate_members'
    ),
    'domain.contacts.profile_handlers_impl': (
        'handle_get_user_memories handle_get_users_by_tag handle_get_customer_profile '
        'handle_get_emotion_trend handle_get_workflow_rules handle_get_followup_tasks '
        'handle_get_learning_stats handle_schedule_followup handle_trigger_workflow '
        'handle_add_user_tag handle_remove_user_tag handle_get_user_tags'
    ),
    'domain.contacts.tag_handlers_impl': (
        'handle_batch_add_tag handle_batch_remove_tag handle_create_tag handle_delete_tag '
        'handle_get_lead_tags handle_get_auto_tags handle_batch_tag_members '
        'handle_get_all_tags'
    ),
    'domain.contacts.tracking_handlers_impl': (
        'handle_analyze_user_message handle_get_user_journey handle_get_user_profile_full '
        'handle_update_user_crm handle_analyze_user_journey handle_get_users_with_profiles '
        'handle_update_user_profile handle_add_user_to_track handle_add_user_from_lead '
        'handle_remove_tracked_user handle_get_tracked_users '
        'handle_update_user_value_level handle_track_user_groups handle_batch_track_users '
        'handle_get_user_groups handle_get_tracking_stats handle_get_tracking_logs '
        'handle_get_user_value_distribution handle_get_tracking_effectiveness '
        'handle_sync_resource_status_to_leads'
    ),
    'domain.groups.handlers_impl': (
        'handle_create_group handle_group_invite_user handle_group_add_member '
        'handle_group_send_msg handle_group_monitor_messages handle_add_group '
        'handle_add_monitored_group handle_search_groups handle_join_group '
        'handle_remove_group handle_remove_monitored_group handle_leave_group '
        'handle_join_resource handle_join_and_monitor handle_join_and_monitor_resource '
        'handle_join_and_monitor_with_account handle_get_admin_groups'
    ),
    'domain.marketing.ab_handlers_impl': (
        'handle_create_ab_test handle_start_ab_test handle_get_ab_test_results'
    ),
    'domain.marketing.ad_handlers_impl': (
        'handle_create_ad_template handle_update_ad_template handle_delete_ad_template '
        'handle_get_ad_templates handle_toggle_ad_template_status '
        'handle_preview_ad_template handle_create_ad_schedule handle_update_ad_schedule '
        'handle_delete_ad_schedule handle_get_ad_schedules '
        'handle_toggle_ad_schedule_status handle_run_ad_schedule_now handle_send_ad_now '
        'handle_get_ad_send_logs handle_get_ad_overview_stats handle_get_ad_template_stats '
        'handle_get_ad_schedule_stats handle_get_ad_account_stats '
        'handle_get_ad_group_stats handle_get_ad_daily_stats'
    ),
    'domain.marketing.campaign_handlers_impl': (
        'handle_create_campaign handle_update_campaign handle_delete_campaign '
        'handle_start_campaign handle_pause_campaign handle_resume_campaign '
        'handle_stop_campaign'
    ),
    'domain.marketing.task_handlers_impl': (
        'handle_get_marketing_tasks handle_create_marketing_task '
        'handle_update_marketing_task handle_delete_marketing_task '
        'handle_start_marketing_task handle_pause_marketing_task '
        'handle_resume_marketing_task handle_complete_marketing_task '
        'handle_add_marketing_task_targets handle_get_marketing_task_targets '
        'handle_update_marketing_task_target handle_assign_marketing_task_role '
        'handle_auto_assign_marketing_task_roles handle_get_marketing_task_stats '
        'handle_create_marketing_campaign handle_start_marketing_campaign '
        'handle_get_marketing_stats'
    ),
    'domain.messaging.batch_handlers_impl': (
        'handle_undo_batch_operation handle_get_batch_operation_history '
        'handle_add_to_join_queue handle_process_join_queue handle_batch_join_and_monitor '
        'handle_send_bulk_messages handle_batch_invite_to_group handle_batch_invite_start '
        'handle_batch_invite_cancel'
    ),
    'domain.messaging.chat_handlers_impl': (
        'handle_reindex_conversations handle_search_chat_history handle_get_chat_list '
        'handle_send_ai_response handle_get_smart_replies'
    ),
    'domain.messaging.media_handlers_impl': 'handle_add_media handle_get_media handle_delete_media',
    'domain.messaging.queue_handlers_impl': (
        'handle_get_queue_status handle_clear_queue handle_pause_queue handle_resume_queue '
        'handle_delete_queue_message handle_update_queue_message_priority '
        'handle_get_queue_messages handle_send_message handle_send_group_message '
        'handle_get_queue_length_history handle_validate_spintax handle_predict_send_time '
        'handle_batch_send_start handle_batch_send_cancel '
        'handle_send_greeting handle_add_to_queue'
    ),
    'domain.messaging.template_handlers_impl': (
        'handle_add_template handle_remove_template handle_toggle_template_status'
    ),
    'domain.multi_role.collab_handlers_impl': (
        'handle_invite_lead_to_collab_group handle_create_collab_group_for_lead '
        'handle_create_collab_group handle_add_collab_member handle_get_collab_groups '
        'handle_update_collab_status handle_get_collab_stats'
    ),
    'domain.multi_role.handlers_impl': (
        'handle_multi_role_add_role handle_multi_role_update_role '
        'handle_multi_role_delete_role handle_multi_role_get_roles '
        'handle_multi_role_add_script handle_multi_role_update_script '
        'handle_multi_role_delete_script handle_multi_role_get_scripts '
        'handle_multi_role_create_group handle_multi_role_update_group '
        'handle_multi_role_get_groups handle_multi_role_get_stats '
        'handle_multi_role_export_data handle_multi_role_import_data '
        'handle_create_multi_role_group handle_multi_role_start_script '
        'handle_multi_role_send_message handle_multi_role_ai_reply '
        'handle_multi_role_advance_stage handle_multi_role_ai_plan '
        'handle_multi_role_start_private_collaboration handle_multi_role_auto_create_group '
        'handle_multi_role_start_group_collaboration'
    ),
    'domain.search.discovery_handlers_impl': (
        'handle_get_discovery_keywords handle_add_discovery_keyword '
        'handle_get_discovery_logs handle_init_discussion_watcher '
        'handle_discover_discussion handle_discover_discussions_from_resources '
        'handle_get_channel_discussions handle_start_discussion_monitoring '
        'handle_stop_discussion_monitoring handle_get_discussion_messages '
        'handle_reply_to_discussion handle_get_discussion_stats'
    ),
    'domain.search.resource_handlers_impl': (
        'handle_get_resource_history handle_init_resource_discovery '
        'handle_search_resources handle_clear_resources handle_get_resources '
        'handle_get_resource_stats handle_add_resource_manually handle_save_resource '
        'handle_unsave_resource handle_delete_resource handle_delete_resources_batch '
        'handle_verify_resource_type handle_batch_verify_resource_types '
        'handle_check_resources_health '
        'handle_clear_all_resources handle_batch_join_resources'
    ),
    'domain.search.search_handlers_impl': (
        'handle_rebuild_search_index handle_get_search_history '
        'handle_get_search_results_by_id handle_get_search_statistics '
        'handle_cleanup_search_history handle_search_jiso handle_check_jiso_availability '
        'handle_get_search_channels handle_add_search_channel handle_update_search_channel '
        'handle_delete_search_channel handle_test_search_channel '
        'handle_get_keyword_suggestions'
    ),
}

# Handlers that take NO payload argument (44 methods)
_NO_PAYLOAD_HANDLERS = {
    'handle_check_monitoring_health',
    'handle_clear_all_resources',
    'handle_clear_logs',
    'handle_discover_discussions_from_resources',
    'handle_get_ai_chat_settings',
    'handle_get_ai_models',
    'handle_get_backup_info',
    'handle_get_chat_templates',
    'handle_get_collected_users_stats',
    'handle_get_conversation_strategy',
    'handle_get_default_tdata_path',
    'handle_get_discovery_keywords',
    'handle_get_discussion_stats',
    'handle_get_funnel_overview',
    'handle_get_initial_state',
    'handle_get_keyword_sets',
    'handle_get_knowledge_stats',
    'handle_get_model_usage',
    'handle_get_monitored_groups',
    'handle_get_monitoring_status',
    'handle_get_performance_summary',
    'handle_get_rag_stats',
    'handle_get_scheduler_stats',
    'handle_get_settings',
    'handle_get_system_status',
    'handle_get_trigger_rules',
    'handle_graceful_shutdown',
    'handle_init_discussion_watcher',
    'handle_init_knowledge_base',
    'handle_init_rag_system',
    'handle_init_resource_discovery',
    'handle_list_backups',
    'handle_list_voice_samples',
    'handle_multi_role_export_data',
    'handle_multi_role_get_roles',
    'handle_multi_role_get_scripts',
    'handle_multi_role_get_stats',
    'handle_one_click_stop',
    'handle_rebuild_database',
    'handle_rebuild_search_index',
    'handle_reload_sessions_and_accounts',
    'handle_start_monitoring',
    'handle_stop_monitoring',
}

# Methods where impl function name differs from method name
_HANDLER_RENAMES = {
    'handle_join_and_monitor': 'handle_join_and_monitor_resource',
    'handle_pause_monitored_group': 'handle_pause_monitoring',
    'handle_remove_monitored_group': 'handle_remove_group',
    'handle_resume_monitored_group': 'handle_resume_monitoring',
}


def _register_all_handlers(cls):
    """Auto-generate handler methods on BackendService from registry."""
    import importlib

    for module_path, names_data in _HANDLER_REGISTRY.items():
        names_str = names_data if isinstance(names_data, str) else names_data
        for method_name in names_str.split():
            func_name = _HANDLER_RENAMES.get(method_name, method_name)
            takes_payload = method_name not in _NO_PAYLOAD_HANDLERS

            def _make(mp, fn, tp, mn):
                _cached = [None]
                if tp:
                    async def handler(self, payload=None):
                        if _cached[0] is None:
                            _cached[0] = getattr(importlib.import_module(mp), fn)
                        return await _cached[0](self, payload)
                else:
                    async def handler(self):
                        if _cached[0] is None:
                            _cached[0] = getattr(importlib.import_module(mp), fn)
                        return await _cached[0](self)
                handler.__name__ = mn
                handler.__qualname__ = f'BackendService.{mn}'
                return handler

            setattr(cls, method_name, _make(module_path, func_name, takes_payload, method_name))


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
        try:
            accounts = await db.get_all_accounts(owner_user_id=tenant_id)
            print(f"[_send_accounts_updated] Got {len(accounts)} accounts for tenant={tenant_id}", file=sys.stderr)
        except Exception as e:
            print(f"[_send_accounts_updated] ❌ Error getting accounts: {e}", file=sys.stderr)
            accounts = []
        
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
    
    _active_group_collabs: Dict[str, Dict[str, Any]] = {}
    
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


    _ai_team_executor = None
    
    _batch_send_active = False
    _batch_send_cancelled = False
    
    _batch_invite_active = False
    _batch_invite_cancelled = False
    

# Phase 9-4: Apply handler auto-registry
_register_all_handlers(BackendService)

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


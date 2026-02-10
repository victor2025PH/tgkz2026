"""
Phase 9-3: Initialization, startup, quota, consistency check
Extracted from BackendService in main.py.

🔧 P1 加固：補全所有從 main.py 分離後遺漏的導入
"""
import sys
import os
import gc
import json
import time
import asyncio
import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pathlib import Path
from text_utils import safe_json_dumps, sanitize_text, sanitize_dict
from flood_wait_handler import flood_handler, safe_telegram_call

# Re-use main.py's db and module accessors
from database import db
from config import config, IS_DEV_MODE

# 🔧 P1: 從原 main.py 遺漏的核心導入
from error_handler import init_error_handler, ErrorType
from message_ack import init_ack_manager
from message_queue import MessageQueue
from cache_manager import init_cache_manager

def _get_module(name: str):
    """Safe lazy module accessor."""
    from lazy_imports import lazy_imports
    return lazy_imports.get(name)


# ====================================================================
# 🔧 P1 加固：從 main.py 分離後需要的 lazy import 獲取器
# 這些函數原本在 main.py 的模塊級別定義，init_startup_mixin 的
# initialize() 方法中直接調用它們。現在需要在此重新定義。
# ====================================================================

def get_init_performance_monitor():
    return _get_module('performance_monitor').init_performance_monitor

def get_init_search_engine():
    return _get_module('fulltext_search').init_search_engine

def get_search_engine():
    return _get_module('fulltext_search').get_search_engine

def get_init_alert_manager():
    return _get_module('alert_manager').init_alert_manager

def get_init_db_optimizer():
    return _get_module('db_optimizer').init_db_optimizer

def get_init_memory_monitor():
    return _get_module('memory_monitor').init_memory_monitor

def get_init_group_poller():
    return _get_module('group_message_poller').init_group_poller

def get_group_poller():
    return _get_module('group_message_poller').get_group_poller

def get_init_qr_auth_manager():
    return _get_module('qr_auth_manager').init_qr_auth_manager

def get_init_ip_binding_manager():
    return _get_module('ip_binding_manager').init_ip_binding_manager

def get_init_credential_scraper():
    return _get_module('credential_scraper').init_credential_scraper

def get_init_batch_operations():
    return _get_module('batch_operations').init_batch_operations

def get_init_ad_template_manager():
    return _get_module('ad_template').init_ad_template_manager

def get_init_ad_manager():
    return _get_module('ad_manager').init_ad_manager

def get_init_ad_broadcaster():
    return _get_module('ad_broadcaster').init_ad_broadcaster

def get_init_ad_scheduler():
    return _get_module('ad_scheduler').init_ad_scheduler

def get_init_ad_analytics():
    return _get_module('ad_analytics').init_ad_analytics

def get_init_user_tracker():
    return _get_module('user_tracker').init_user_tracker

def get_init_user_analytics():
    return _get_module('user_analytics').init_user_analytics

def get_init_campaign_orchestrator():
    return _get_module('campaign_orchestrator').init_campaign_orchestrator

def get_init_multi_channel_stats():
    return _get_module('multi_channel_stats').init_multi_channel_stats

def get_init_marketing_task_service():
    return _get_module('marketing_task_service').init_marketing_task_service

def get_init_script_engine():
    return _get_module('script_engine').init_script_engine

def get_init_collaboration_coordinator():
    return _get_module('collaboration_coordinator').init_collaboration_coordinator

# 類型/類獲取器
def get_QueueOptimizer():
    return _get_module('queue_optimizer').QueueOptimizer

def get_ErrorRecoveryManager():
    try:
        return _get_module('error_recovery_manager').ErrorRecoveryManager
    except:
        return None

def get_BackupManager():
    return _get_module('backup_manager').BackupManager

def get_ProxyRotationManager():
    return _get_module('proxy_rotation_manager').ProxyRotationManager

def get_EnhancedHealthMonitor():
    return _get_module('enhanced_health_monitor').EnhancedHealthMonitor

def get_Anomaly():
    return _get_module('enhanced_health_monitor').Anomaly

def get_log_rotator():
    return _get_module('log_rotator').get_log_rotator

# 日誌脫敏工具
def mask_phone(phone):
    try:
        from core.logging import mask_phone as _mask_phone
        return _mask_phone(phone)
    except ImportError:
        # 降級處理：簡單脫敏
        s = str(phone)
        if len(s) > 6:
            return s[:3] + '***' + s[-3:]
        return '***'

# 命令路由器（延遲導入避免循環依賴）
ROUTER_AVAILABLE = False

def check_router_available():
    global ROUTER_AVAILABLE
    try:
        from api.router_integration import setup_command_router, try_route_command
        ROUTER_AVAILABLE = True
        return True
    except ImportError:
        ROUTER_AVAILABLE = False
        return False

def setup_command_router(*args, **kwargs):
    """延遲導入 setup_command_router"""
    from api.router_integration import setup_command_router as _setup
    return _setup(*args, **kwargs)

# 命令別名（延遲從 main.py 獲取）
def _get_command_alias_registry():
    """延遲導入避免循環依賴"""
    try:
        from main import COMMAND_ALIAS_REGISTRY
        return COMMAND_ALIAS_REGISTRY
    except ImportError:
        return {}

COMMAND_ALIAS_REGISTRY = None  # 延遲初始化

# ====================================================================
# 🔧 P3→P4: 延迟获取单例 + 模块级缓存
# 首次调用后缓存，消除 initialize() 多次子调用的重复查找开销
# ====================================================================

_cache = {}

def _get_auto_funnel():
    if 'auto_funnel' not in _cache:
        try: _cache['auto_funnel'] = _get_module('auto_funnel').auto_funnel
        except Exception: _cache['auto_funnel'] = None
    return _cache['auto_funnel']

def _get_ai_auto_chat():
    if 'ai_auto_chat' not in _cache:
        try: _cache['ai_auto_chat'] = _get_module('ai_auto_chat').ai_auto_chat
        except Exception: _cache['ai_auto_chat'] = None
    return _cache['ai_auto_chat']

def _get_vector_memory():
    if 'vector_memory' not in _cache:
        try: _cache['vector_memory'] = _get_module('vector_memory').vector_memory
        except Exception: _cache['vector_memory'] = None
    return _cache['vector_memory']

def _get_scheduler():
    if 'scheduler' not in _cache:
        try: _cache['scheduler'] = _get_module('scheduler').scheduler
        except Exception: _cache['scheduler'] = None
    return _cache['scheduler']

def _get_MessagePriority():
    if 'MessagePriority' not in _cache:
        try:
            _cache['MessagePriority'] = _get_module('message_queue').MessagePriority
        except Exception:
            from enum import IntEnum
            class _F(IntEnum):
                LOW = 0; NORMAL = 1; HIGH = 2
            _cache['MessagePriority'] = _F
    return _cache['MessagePriority']

def _get_collaboration_coordinator():
    # 不缓存 — coordinator 是动态获取的单例
    try:
        return _get_module('collaboration_coordinator').get_collaboration_coordinator()
    except Exception:
        return None

def _get_Anomaly():
    if 'Anomaly' not in _cache:
        try: _cache['Anomaly'] = _get_module('enhanced_health_monitor').Anomaly
        except Exception: _cache['Anomaly'] = None
    return _cache['Anomaly']

def _get_RotationReason():
    if 'RotationReason' not in _cache:
        try: _cache['RotationReason'] = _get_module('proxy_rotation_manager').RotationReason
        except Exception: _cache['RotationReason'] = None
    return _cache['RotationReason']

def _get_WarmupManager():
    if 'WarmupManager' not in _cache:
        try: _cache['WarmupManager'] = _get_module('warmup_manager').WarmupManager
        except Exception: _cache['WarmupManager'] = None
    return _cache['WarmupManager']


class InitStartupMixin:
    """Mixin: Initialization, startup, quota, consistency check"""

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
        
        # 🆕 Phase4: 重試路由器檢測（如果早期檢測失敗）
        if not ROUTER_AVAILABLE:
            check_router_available()
            if ROUTER_AVAILABLE:
                print("[Backend] ✓ Router available after retry", file=sys.stderr)
        
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
        global COMMAND_ALIAS_REGISTRY
        if COMMAND_ALIAS_REGISTRY is None:
            COMMAND_ALIAS_REGISTRY = _get_command_alias_registry()
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
            auto_funnel = _get_auto_funnel()
            if not auto_funnel:
                self.send_log("[AutoFunnel] 模块不可用，跳过初始化", "warning")
                return
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
            ai_auto_chat = _get_ai_auto_chat()
            if not ai_auto_chat:
                self.send_log("[AIAutoChat] 模块不可用，跳过初始化", "warning")
                return
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
                        priority=_get_MessagePriority().NORMAL
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
                    priority=_get_MessagePriority().NORMAL
                )
                return True
            return False
        except Exception as e:
            self.send_log(f"[AutoFunnel] 发送失败: {e}", "error")
            return False

    async def _initialize_vector_memory(self):
        """Initialize vector memory system"""
        try:
            vector_memory = _get_vector_memory()
            if not vector_memory:
                self.send_log("[VectorMemory] 模块不可用，跳过初始化", "warning")
                return
            await vector_memory.initialize(use_neural=False)  # 默认使用简单嵌入
            self.send_log("[VectorMemory] 向量化记忆系统已启动", "success")
        except Exception as e:
            self.send_log(f"[VectorMemory] 初始化失败: {e}", "error")

    async def _initialize_scheduler(self):
        """Initialize task scheduler"""
        try:
            scheduler = _get_scheduler()
            if not scheduler:
                self.send_log("[Scheduler] 模块不可用，跳过初始化", "warning")
                return
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
            coordinator = _get_collaboration_coordinator()
            if coordinator:
                marketing_task_svc.set_collaboration_coordinator(coordinator)
            
            self.send_log("[MultiRole] 多角色協作系統已啟動", "success")
            self.send_log("[MarketingTask] 統一營銷任務服務已啟動", "success")
        except Exception as e:
            self.send_log(f"[MultiRole] 初始化失敗: {e}", "error")

    async def _initialize_enhanced_health_monitor(self):
        """Initialize enhanced health monitor"""
        try:
            Anomaly = _get_Anomaly()
            # Create alert callback
            def alert_callback(anomaly):
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
                                reason=_get_RotationReason().ERROR
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


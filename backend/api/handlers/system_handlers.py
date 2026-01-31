"""
TG-Matrix System Handlers
系統命令處理器 - 處理系統級別的 IPC 命令
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('SystemHandlers')


def register_system_handlers(backend_service):
    """
    註冊所有系統相關的命令處理器
    """
    router = get_command_router()
    
    # ==================== 初始化 ====================
    
    @router.register('get-initial-state', category=CommandCategory.SYSTEM, description='獲取初始狀態')
    async def handle_get_initial_state(payload: Dict[str, Any], context: CommandContext):
        """獲取應用初始狀態"""
        return await backend_service.handle_get_initial_state()
    
    @router.register('graceful-shutdown', category=CommandCategory.SYSTEM, description='優雅關閉')
    async def handle_graceful_shutdown(payload: Dict[str, Any], context: CommandContext):
        """優雅關閉後端"""
        return await backend_service.handle_graceful_shutdown()
    
    # ==================== 設置 ====================
    
    @router.register('save-settings', category=CommandCategory.SETTINGS, description='保存設置')
    async def handle_save_settings(payload: Dict[str, Any], context: CommandContext):
        """保存系統設置"""
        return await backend_service.handle_save_settings(payload)
    
    @router.register('get-settings', category=CommandCategory.SETTINGS, description='獲取設置')
    async def handle_get_settings(payload: Dict[str, Any], context: CommandContext):
        """獲取系統設置"""
        return await backend_service.handle_get_settings()
    
    # ==================== 日誌 ====================
    
    @router.register('get-logs', category=CommandCategory.SYSTEM, description='獲取日誌')
    async def handle_get_logs(payload: Dict[str, Any], context: CommandContext):
        """獲取系統日誌"""
        return await backend_service.handle_get_logs(payload)
    
    @router.register('export-logs', category=CommandCategory.SYSTEM, description='導出日誌')
    async def handle_export_logs(payload: Dict[str, Any], context: CommandContext):
        """導出日誌"""
        return await backend_service.handle_export_logs(payload)
    
    @router.register('clear-logs', category=CommandCategory.SYSTEM, description='清除日誌')
    async def handle_clear_logs(payload: Dict[str, Any], context: CommandContext):
        """清除日誌"""
        return await backend_service.handle_clear_logs()
    
    # ==================== 性能監控 ====================
    
    @router.register('get-performance-summary', category=CommandCategory.ANALYTICS, description='獲取性能摘要')
    async def handle_get_performance_summary(payload: Dict[str, Any], context: CommandContext):
        """獲取性能摘要"""
        return await backend_service.handle_get_performance_summary()
    
    @router.register('get-performance-metrics', category=CommandCategory.ANALYTICS, description='獲取性能指標')
    async def handle_get_performance_metrics(payload: Dict[str, Any], context: CommandContext):
        """獲取性能指標"""
        return await backend_service.handle_get_performance_metrics(payload)
    
    @router.register('get-account-health-report', category=CommandCategory.ANALYTICS, description='獲取帳號健康報告')
    async def handle_get_account_health_report(payload: Dict[str, Any], context: CommandContext):
        """獲取帳號健康報告"""
        return await backend_service.handle_get_account_health_report(payload)
    
    # ==================== 備份 ====================
    
    @router.register('create-backup', category=CommandCategory.SYSTEM, description='創建備份')
    async def handle_create_backup(payload: Dict[str, Any], context: CommandContext):
        """創建數據備份"""
        return await backend_service.handle_create_backup(payload)
    
    @router.register('restore-backup', category=CommandCategory.SYSTEM, description='恢復備份')
    async def handle_restore_backup(payload: Dict[str, Any], context: CommandContext):
        """恢復數據備份"""
        return await backend_service.handle_restore_backup(payload)
    
    @router.register('list-backups', category=CommandCategory.SYSTEM, description='列出備份')
    async def handle_list_backups(payload: Dict[str, Any], context: CommandContext):
        """列出所有備份"""
        return await backend_service.handle_list_backups()
    
    @router.register('get-backup-info', category=CommandCategory.SYSTEM, description='獲取備份信息')
    async def handle_get_backup_info(payload: Dict[str, Any], context: CommandContext):
        """獲取備份信息"""
        return await backend_service.handle_get_backup_info()
    
    # ==================== 遷移 ====================
    
    @router.register('migration-status', category=CommandCategory.SYSTEM, description='遷移狀態')
    async def handle_migration_status(payload: Dict[str, Any], context: CommandContext):
        """獲取遷移狀態"""
        return await backend_service.handle_migration_status(payload)
    
    @router.register('migrate', category=CommandCategory.SYSTEM, description='執行遷移')
    async def handle_migrate(payload: Dict[str, Any], context: CommandContext):
        """執行數據庫遷移"""
        return await backend_service.handle_migrate(payload)
    
    @router.register('rollback-migration', category=CommandCategory.SYSTEM, description='回滾遷移')
    async def handle_rollback_migration(payload: Dict[str, Any], context: CommandContext):
        """回滾數據庫遷移"""
        return await backend_service.handle_rollback_migration(payload)
    
    # ==================== 告警 ====================
    
    @router.register('get-alerts', category=CommandCategory.SYSTEM, description='獲取告警')
    async def handle_get_alerts(payload: Dict[str, Any], context: CommandContext):
        """獲取系統告警"""
        return await backend_service.handle_get_alerts(payload)
    
    @router.register('acknowledge-alert', category=CommandCategory.SYSTEM, description='確認告警')
    async def handle_acknowledge_alert(payload: Dict[str, Any], context: CommandContext):
        """確認告警"""
        return await backend_service.handle_acknowledge_alert(payload)
    
    @router.register('resolve-alert', category=CommandCategory.SYSTEM, description='解決告警')
    async def handle_resolve_alert(payload: Dict[str, Any], context: CommandContext):
        """解決告警"""
        return await backend_service.handle_resolve_alert(payload)
    
    # ==================== API 憑證 ====================
    
    @router.register('get-api-credentials', category=CommandCategory.SETTINGS, description='獲取 API 憑證')
    async def handle_get_api_credentials(payload: Dict[str, Any], context: CommandContext):
        """獲取 API 憑證"""
        return await backend_service.handle_get_api_credentials(payload) if hasattr(backend_service, 'handle_get_api_credentials') else None
    
    @router.register('add-api-credential', category=CommandCategory.SETTINGS, description='添加 API 憑證')
    async def handle_add_api_credential(payload: Dict[str, Any], context: CommandContext):
        """添加 API 憑證"""
        return await backend_service.handle_add_api_credential(payload) if hasattr(backend_service, 'handle_add_api_credential') else None
    
    @router.register('remove-api-credential', category=CommandCategory.SETTINGS, description='刪除 API 憑證')
    async def handle_remove_api_credential(payload: Dict[str, Any], context: CommandContext):
        """刪除 API 憑證"""
        return await backend_service.handle_remove_api_credential(payload) if hasattr(backend_service, 'handle_remove_api_credential') else None
    
    @router.register('toggle-api-credential', category=CommandCategory.SETTINGS, description='切換 API 憑證狀態')
    async def handle_toggle_api_credential(payload: Dict[str, Any], context: CommandContext):
        """切換 API 憑證狀態"""
        return await backend_service.handle_toggle_api_credential(payload) if hasattr(backend_service, 'handle_toggle_api_credential') else None
    
    logger.info(f'Registered system handlers')

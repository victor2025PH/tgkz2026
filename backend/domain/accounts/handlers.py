"""
TG-Matrix Account Handlers
帳號命令處理器 - 處理所有帳號相關的 IPC 命令

這些處理器從原 main.py 中提取，保持相同的功能
"""

from typing import Dict, Any, Optional
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger, mask_phone

logger = get_logger('AccountHandlers')


def register_account_handlers(backend_service):
    """
    註冊所有帳號相關的命令處理器
    
    Args:
        backend_service: BackendService 實例，用於訪問數據庫和其他服務
    """
    router = get_command_router()
    router.set_backend_service(backend_service)
    
    # ==================== 帳號 CRUD ====================
    
    @router.register('add-account', category=CommandCategory.ACCOUNTS, description='添加新帳號')
    async def handle_add_account(payload: Dict[str, Any], context: CommandContext):
        """添加新帳號"""
        # 委託給原有的處理邏輯
        return await backend_service.handle_add_account(payload)
    
    @router.register('remove-account', category=CommandCategory.ACCOUNTS, description='刪除帳號')
    async def handle_remove_account(payload: Dict[str, Any], context: CommandContext):
        """刪除帳號"""
        return await backend_service.handle_remove_account(payload)
    
    @router.register('update-account', category=CommandCategory.ACCOUNTS, description='更新帳號信息')
    async def handle_update_account(payload: Dict[str, Any], context: CommandContext):
        """更新帳號信息"""
        return await backend_service.handle_update_account(payload)
    
    @router.register('update-account-data', category=CommandCategory.ACCOUNTS, description='更新帳號數據')
    async def handle_update_account_data(payload: Dict[str, Any], context: CommandContext):
        """更新帳號數據"""
        return await backend_service.handle_update_account_data(payload)
    
    # ==================== 登錄/登出 ====================
    
    @router.register('login-account', category=CommandCategory.ACCOUNTS, description='登錄帳號')
    async def handle_login_account(payload: Dict[str, Any], context: CommandContext):
        """登錄帳號"""
        return await backend_service.handle_login_account(payload)
    
    @router.register('logout-account', category=CommandCategory.ACCOUNTS, description='登出帳號')
    async def handle_logout_account(payload: Dict[str, Any], context: CommandContext):
        """登出帳號"""
        return await backend_service.handle_logout_account(payload)
    
    @router.register('check-account-status', category=CommandCategory.ACCOUNTS, description='檢查帳號狀態')
    async def handle_check_account_status(payload: Dict[str, Any], context: CommandContext):
        """檢查帳號狀態"""
        return await backend_service.handle_check_account_status(payload)
    
    # ==================== QR 碼登錄 ====================
    
    @router.register('qr-login-create', category=CommandCategory.ACCOUNTS, description='創建 QR 碼登錄')
    async def handle_qr_login_create(payload: Dict[str, Any], context: CommandContext):
        """創建 QR 碼登錄會話"""
        return await backend_service.handle_qr_login_create(payload)
    
    @router.register('qr-login-status', category=CommandCategory.ACCOUNTS, description='獲取 QR 登錄狀態')
    async def handle_qr_login_status(payload: Dict[str, Any], context: CommandContext):
        """獲取 QR 碼登錄狀態"""
        return await backend_service.handle_qr_login_status(payload)
    
    @router.register('qr-login-refresh', category=CommandCategory.ACCOUNTS, description='刷新 QR 碼')
    async def handle_qr_login_refresh(payload: Dict[str, Any], context: CommandContext):
        """刷新 QR 碼"""
        return await backend_service.handle_qr_login_refresh(payload)
    
    @router.register('qr-login-submit-2fa', category=CommandCategory.ACCOUNTS, description='提交 2FA 密碼')
    async def handle_qr_login_submit_2fa(payload: Dict[str, Any], context: CommandContext):
        """提交 2FA 密碼"""
        return await backend_service.handle_qr_login_submit_2fa(payload)
    
    @router.register('qr-login-cancel', category=CommandCategory.ACCOUNTS, description='取消 QR 登錄')
    async def handle_qr_login_cancel(payload: Dict[str, Any], context: CommandContext):
        """取消 QR 碼登錄"""
        return await backend_service.handle_qr_login_cancel(payload)
    
    # ==================== IP 綁定 ====================
    
    @router.register('ip-bind', category=CommandCategory.ACCOUNTS, description='綁定 IP')
    async def handle_ip_bind(payload: Dict[str, Any], context: CommandContext):
        """綁定帳號到 IP"""
        return await backend_service.handle_ip_bind(payload)
    
    @router.register('ip-unbind', category=CommandCategory.ACCOUNTS, description='解除 IP 綁定')
    async def handle_ip_unbind(payload: Dict[str, Any], context: CommandContext):
        """解除 IP 綁定"""
        return await backend_service.handle_ip_unbind(payload)
    
    @router.register('ip-get-binding', category=CommandCategory.ACCOUNTS, description='獲取 IP 綁定')
    async def handle_ip_get_binding(payload: Dict[str, Any], context: CommandContext):
        """獲取帳號的 IP 綁定"""
        return await backend_service.handle_ip_get_binding(payload)
    
    @router.register('ip-get-all-bindings', category=CommandCategory.ACCOUNTS, description='獲取所有 IP 綁定')
    async def handle_ip_get_all_bindings(payload: Dict[str, Any], context: CommandContext):
        """獲取所有 IP 綁定"""
        return await backend_service.handle_ip_get_all_bindings(payload)
    
    @router.register('ip-get-statistics', category=CommandCategory.ACCOUNTS, description='獲取 IP 統計')
    async def handle_ip_get_statistics(payload: Dict[str, Any], context: CommandContext):
        """獲取 IP 使用統計"""
        return await backend_service.handle_ip_get_statistics(payload)
    
    @router.register('ip-verify-binding', category=CommandCategory.ACCOUNTS, description='驗證 IP 綁定')
    async def handle_ip_verify_binding(payload: Dict[str, Any], context: CommandContext):
        """驗證 IP 綁定"""
        return await backend_service.handle_ip_verify_binding(payload)
    
    # ==================== 憑證抓取 ====================
    
    @router.register('credential-start-scrape', category=CommandCategory.ACCOUNTS, description='開始抓取憑證')
    async def handle_credential_start_scrape(payload: Dict[str, Any], context: CommandContext):
        """開始憑證抓取"""
        return await backend_service.handle_credential_start_scrape(payload)
    
    @router.register('credential-submit-code', category=CommandCategory.ACCOUNTS, description='提交驗證碼')
    async def handle_credential_submit_code(payload: Dict[str, Any], context: CommandContext):
        """提交憑證驗證碼"""
        return await backend_service.handle_credential_submit_code(payload)
    
    @router.register('credential-get-status', category=CommandCategory.ACCOUNTS, description='獲取抓取狀態')
    async def handle_credential_get_status(payload: Dict[str, Any], context: CommandContext):
        """獲取憑證抓取狀態"""
        return await backend_service.handle_credential_get_status(payload)
    
    @router.register('credential-get-all', category=CommandCategory.ACCOUNTS, description='獲取所有憑證')
    async def handle_credential_get_all(payload: Dict[str, Any], context: CommandContext):
        """獲取所有憑證"""
        return await backend_service.handle_credential_get_all(payload)
    
    @router.register('credential-cancel-scrape', category=CommandCategory.ACCOUNTS, description='取消抓取')
    async def handle_credential_cancel_scrape(payload: Dict[str, Any], context: CommandContext):
        """取消憑證抓取"""
        return await backend_service.handle_credential_cancel_scrape(payload)
    
    # ==================== 代理測試 ====================
    
    @router.register('test-proxy', category=CommandCategory.ACCOUNTS, description='測試代理連接')
    async def handle_test_proxy(payload: Dict[str, Any], context: CommandContext):
        """測試代理連接"""
        return await backend_service.handle_test_proxy(payload)
    
    # ==================== 同步和更新 ====================
    
    @router.register('sync-account-info', category=CommandCategory.ACCOUNTS, description='同步帳號信息')
    async def handle_sync_account_info(payload: Dict[str, Any], context: CommandContext):
        """從 Telegram 同步帳號信息"""
        return await backend_service.handle_sync_account_info(payload)
    
    # ==================== 標籤和分組 ====================
    
    @router.register('save-tags', category=CommandCategory.ACCOUNTS, description='保存標籤')
    async def handle_save_tags(payload: Dict[str, Any], context: CommandContext):
        """保存帳號標籤"""
        return await backend_service.handle_save_tags(payload)
    
    @router.register('save-groups', category=CommandCategory.ACCOUNTS, description='保存分組')
    async def handle_save_groups(payload: Dict[str, Any], context: CommandContext):
        """保存帳號分組"""
        return await backend_service.handle_save_groups(payload)
    
    @router.register('get-tags', category=CommandCategory.ACCOUNTS, description='獲取標籤')
    async def handle_get_tags(payload: Dict[str, Any], context: CommandContext):
        """獲取帳號標籤"""
        return await backend_service.handle_get_tags(payload)
    
    @router.register('get-groups', category=CommandCategory.ACCOUNTS, description='獲取分組')
    async def handle_get_groups(payload: Dict[str, Any], context: CommandContext):
        """獲取帳號分組"""
        return await backend_service.handle_get_groups(payload)
    
    # ==================== AI 人設 ====================
    
    @router.register('save-personas', category=CommandCategory.ACCOUNTS, description='保存人設')
    async def handle_save_personas(payload: Dict[str, Any], context: CommandContext):
        """保存 AI 人設"""
        return await backend_service.handle_save_personas(payload)
    
    @router.register('get-personas', category=CommandCategory.ACCOUNTS, description='獲取人設')
    async def handle_get_personas(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 人設"""
        return await backend_service.handle_get_personas(payload)
    
    # ==================== 批量操作 ====================
    
    @router.register('batch-update-accounts', category=CommandCategory.ACCOUNTS, description='批量更新帳號')
    async def handle_batch_update_accounts(payload: Dict[str, Any], context: CommandContext):
        """批量更新帳號"""
        return await backend_service.handle_batch_update_accounts(payload)
    
    @router.register('bulk-assign-role', category=CommandCategory.ACCOUNTS, description='批量分配角色')
    async def handle_bulk_assign_role(payload: Dict[str, Any], context: CommandContext):
        """批量分配角色"""
        return await backend_service.handle_bulk_assign_role(payload)
    
    @router.register('bulk-assign-group', category=CommandCategory.ACCOUNTS, description='批量分配分組')
    async def handle_bulk_assign_group(payload: Dict[str, Any], context: CommandContext):
        """批量分配分組"""
        return await backend_service.handle_bulk_assign_group(payload)
    
    @router.register('bulk-delete-accounts', category=CommandCategory.ACCOUNTS, description='批量刪除帳號')
    async def handle_bulk_delete_accounts(payload: Dict[str, Any], context: CommandContext):
        """批量刪除帳號"""
        return await backend_service.handle_bulk_delete_accounts(payload)
    
    # ==================== Session 管理 ====================
    
    @router.register('import-session', category=CommandCategory.ACCOUNTS, description='導入 Session')
    async def handle_import_session(payload: Dict[str, Any], context: CommandContext):
        """導入 Session 文件"""
        return await backend_service.handle_import_session(payload)
    
    @router.register('export-session', category=CommandCategory.ACCOUNTS, description='導出 Session')
    async def handle_export_session(payload: Dict[str, Any], context: CommandContext):
        """導出 Session 文件"""
        return await backend_service.handle_export_session(payload)
    
    @router.register('export-sessions-batch', category=CommandCategory.ACCOUNTS, description='批量導出 Session')
    async def handle_export_sessions_batch(payload: Dict[str, Any], context: CommandContext):
        """批量導出 Session 文件"""
        return await backend_service.handle_export_sessions_batch(payload)
    
    @router.register('reload-sessions-and-accounts', category=CommandCategory.ACCOUNTS, description='重新載入 Session')
    async def handle_reload_sessions_and_accounts(payload: Dict[str, Any], context: CommandContext):
        """重新載入 Session 和帳號"""
        return await backend_service.handle_reload_sessions_and_accounts()
    
    @router.register('scan-orphan-sessions', category=CommandCategory.ACCOUNTS, description='掃描孤立 Session')
    async def handle_scan_orphan_sessions(payload: Dict[str, Any], context: CommandContext):
        """掃描孤立的 Session 文件"""
        return await backend_service.handle_scan_orphan_sessions(payload)
    
    @router.register('recover-orphan-sessions', category=CommandCategory.ACCOUNTS, description='恢復孤立 Session')
    async def handle_recover_orphan_sessions(payload: Dict[str, Any], context: CommandContext):
        """恢復孤立的 Session"""
        return await backend_service.handle_recover_orphan_sessions(payload)
    
    # ==================== TData 導入 ====================
    
    @router.register('scan-tdata', category=CommandCategory.ACCOUNTS, description='掃描 TData')
    async def handle_scan_tdata(payload: Dict[str, Any], context: CommandContext):
        """掃描 TData 目錄"""
        return await backend_service.handle_scan_tdata(payload)
    
    @router.register('import-tdata-account', category=CommandCategory.ACCOUNTS, description='導入 TData 帳號')
    async def handle_import_tdata_account(payload: Dict[str, Any], context: CommandContext):
        """導入單個 TData 帳號"""
        return await backend_service.handle_import_tdata_account(payload)
    
    @router.register('import-tdata-batch', category=CommandCategory.ACCOUNTS, description='批量導入 TData')
    async def handle_import_tdata_batch(payload: Dict[str, Any], context: CommandContext):
        """批量導入 TData"""
        return await backend_service.handle_import_tdata_batch(payload)
    
    @router.register('get-default-tdata-path', category=CommandCategory.ACCOUNTS, description='獲取默認 TData 路徑')
    async def handle_get_default_tdata_path(payload: Dict[str, Any], context: CommandContext):
        """獲取默認 TData 路徑"""
        return await backend_service.handle_get_default_tdata_path()
    
    # ==================== Excel 導入導出 ====================
    
    @router.register('load-accounts-from-excel', category=CommandCategory.ACCOUNTS, description='從 Excel 載入帳號')
    async def handle_load_accounts_from_excel(payload: Dict[str, Any], context: CommandContext):
        """從 Excel 載入帳號"""
        return await backend_service.handle_load_accounts_from_excel(payload)
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.ACCOUNTS)])} account handlers')

"""
TG-Matrix Contacts Handlers
客戶命令處理器 - 處理所有客戶/線索相關的 IPC 命令
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('ContactsHandlers')


def register_contacts_handlers(backend_service):
    """
    註冊所有客戶相關的命令處理器
    """
    router = get_command_router()
    
    # ==================== 線索管理 ====================
    
    @router.register('get-leads-paginated', category=CommandCategory.CONTACTS, description='分頁獲取線索')
    async def handle_get_leads_paginated(payload: Dict[str, Any], context: CommandContext):
        """分頁獲取線索"""
        return await backend_service.handle_get_leads_paginated(payload)
    
    @router.register('add-lead', category=CommandCategory.CONTACTS, description='添加線索')
    async def handle_add_lead(payload: Dict[str, Any], context: CommandContext):
        """添加線索"""
        return await backend_service.handle_add_lead(payload)
    
    @router.register('update-lead-status', category=CommandCategory.CONTACTS, description='更新線索狀態')
    async def handle_update_lead_status(payload: Dict[str, Any], context: CommandContext):
        """更新線索狀態"""
        return await backend_service.handle_update_lead_status(payload)
    
    @router.register('delete-lead', category=CommandCategory.CONTACTS, description='刪除線索')
    async def handle_delete_lead(payload: Dict[str, Any], context: CommandContext):
        """刪除線索"""
        return await backend_service.handle_delete_lead(payload) if hasattr(backend_service, 'handle_delete_lead') else None
    
    @router.register('batch-delete-leads', category=CommandCategory.CONTACTS, description='批量刪除線索')
    async def handle_batch_delete_leads(payload: Dict[str, Any], context: CommandContext):
        """批量刪除線索"""
        return await backend_service.handle_batch_delete_leads(payload) if hasattr(backend_service, 'handle_batch_delete_leads') else None
    
    @router.register('add-to-dnc', category=CommandCategory.CONTACTS, description='添加到黑名單')
    async def handle_add_to_dnc(payload: Dict[str, Any], context: CommandContext):
        """添加到勿擾名單"""
        return await backend_service.handle_add_to_dnc(payload)
    
    # ==================== 收集用戶（廣告識別）====================
    
    @router.register('get-collected-users', category=CommandCategory.CONTACTS, description='獲取收集用戶')
    async def handle_get_collected_users(payload: Dict[str, Any], context: CommandContext):
        """獲取收集的用戶"""
        return await backend_service.handle_get_collected_users(payload)
    
    @router.register('get-collected-users-stats', category=CommandCategory.CONTACTS, description='獲取用戶統計')
    async def handle_get_collected_users_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取收集用戶統計"""
        return await backend_service.handle_get_collected_users_stats()
    
    @router.register('mark-user-as-ad', category=CommandCategory.CONTACTS, description='標記為廣告')
    async def handle_mark_user_as_ad(payload: Dict[str, Any], context: CommandContext):
        """標記用戶為廣告"""
        return await backend_service.handle_mark_user_as_ad(payload)
    
    @router.register('blacklist-user', category=CommandCategory.CONTACTS, description='拉黑用戶')
    async def handle_blacklist_user(payload: Dict[str, Any], context: CommandContext):
        """拉黑用戶"""
        return await backend_service.handle_blacklist_user(payload)
    
    @router.register('get-user-message-samples', category=CommandCategory.CONTACTS, description='獲取用戶消息樣本')
    async def handle_get_user_message_samples(payload: Dict[str, Any], context: CommandContext):
        """獲取用戶消息樣本"""
        return await backend_service.handle_get_user_message_samples(payload)
    
    @router.register('recalculate-user-risk', category=CommandCategory.CONTACTS, description='重算用戶風險')
    async def handle_recalculate_user_risk(payload: Dict[str, Any], context: CommandContext):
        """重新計算用戶風險分數"""
        return await backend_service.handle_recalculate_user_risk(payload)
    
    # ==================== 漏斗分析 ====================
    
    @router.register('get-funnel-overview', category=CommandCategory.CONTACTS, description='獲取漏斗概覽')
    async def handle_get_funnel_overview(payload: Dict[str, Any], context: CommandContext):
        """獲取漏斗概覽"""
        return await backend_service.handle_get_funnel_overview()
    
    @router.register('get-detailed-funnel-stats', category=CommandCategory.CONTACTS, description='獲取詳細漏斗統計')
    async def handle_get_detailed_funnel_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取詳細漏斗統計"""
        return await backend_service.handle_get_detailed_funnel_stats(payload) if hasattr(backend_service, 'handle_get_detailed_funnel_stats') else None
    
    @router.register('analyze-user-message', category=CommandCategory.CONTACTS, description='分析用戶消息')
    async def handle_analyze_user_message(payload: Dict[str, Any], context: CommandContext):
        """分析用戶消息"""
        return await backend_service.handle_analyze_user_message(payload)
    
    @router.register('transition-funnel-stage', category=CommandCategory.CONTACTS, description='轉換漏斗階段')
    async def handle_transition_funnel_stage(payload: Dict[str, Any], context: CommandContext):
        """轉換漏斗階段"""
        return await backend_service.handle_transition_funnel_stage(payload)
    
    @router.register('get-user-journey', category=CommandCategory.CONTACTS, description='獲取用戶旅程')
    async def handle_get_user_journey(payload: Dict[str, Any], context: CommandContext):
        """獲取用戶旅程"""
        return await backend_service.handle_get_user_journey(payload)
    
    @router.register('batch-update-stages', category=CommandCategory.CONTACTS, description='批量更新階段')
    async def handle_batch_update_stages(payload: Dict[str, Any], context: CommandContext):
        """批量更新漏斗階段"""
        return await backend_service.handle_batch_update_stages(payload)
    
    # ==================== 用戶追蹤 ====================
    
    @router.register('get-tracked-users', category=CommandCategory.CONTACTS, description='獲取追蹤用戶')
    async def handle_get_tracked_users(payload: Dict[str, Any], context: CommandContext):
        """獲取追蹤的用戶"""
        return await backend_service.handle_get_tracked_users(payload) if hasattr(backend_service, 'handle_get_tracked_users') else None
    
    @router.register('add-tracked-user', category=CommandCategory.CONTACTS, description='添加追蹤用戶')
    async def handle_add_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """添加追蹤用戶"""
        return await backend_service.handle_add_tracked_user(payload) if hasattr(backend_service, 'handle_add_tracked_user') else None
    
    @router.register('update-tracked-user', category=CommandCategory.CONTACTS, description='更新追蹤用戶')
    async def handle_update_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """更新追蹤用戶"""
        return await backend_service.handle_update_tracked_user(payload) if hasattr(backend_service, 'handle_update_tracked_user') else None
    
    @router.register('delete-tracked-user', category=CommandCategory.CONTACTS, description='刪除追蹤用戶')
    async def handle_delete_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """刪除追蹤用戶"""
        return await backend_service.handle_delete_tracked_user(payload) if hasattr(backend_service, 'handle_delete_tracked_user') else None
    
    # ==================== 統一聯繫人 ====================
    
    @router.register('unified-contacts:sync', category=CommandCategory.CONTACTS, description='同步聯繫人')
    async def handle_unified_contacts_sync(payload: Dict[str, Any], context: CommandContext):
        """同步統一聯繫人"""
        return await backend_service.handle_unified_contacts_sync(payload) if hasattr(backend_service, 'handle_unified_contacts_sync') else None
    
    @router.register('unified-contacts:get', category=CommandCategory.CONTACTS, description='獲取聯繫人')
    async def handle_unified_contacts_get(payload: Dict[str, Any], context: CommandContext):
        """獲取統一聯繫人"""
        return await backend_service.handle_unified_contacts_get(payload) if hasattr(backend_service, 'handle_unified_contacts_get') else None
    
    @router.register('unified-contacts:stats', category=CommandCategory.CONTACTS, description='聯繫人統計')
    async def handle_unified_contacts_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取統一聯繫人統計"""
        return await backend_service.handle_unified_contacts_stats(payload) if hasattr(backend_service, 'handle_unified_contacts_stats') else None
    
    # ==================== 批量操作 ====================
    
    @router.register('batch-update-leads', category=CommandCategory.CONTACTS, description='批量更新線索')
    async def handle_batch_update_leads(payload: Dict[str, Any], context: CommandContext):
        """批量更新線索"""
        return await backend_service.handle_batch_update_leads(payload) if hasattr(backend_service, 'handle_batch_update_leads') else None
    
    @router.register('batch-tag-leads', category=CommandCategory.CONTACTS, description='批量標記線索')
    async def handle_batch_tag_leads(payload: Dict[str, Any], context: CommandContext):
        """批量標記線索"""
        return await backend_service.handle_batch_tag_leads(payload) if hasattr(backend_service, 'handle_batch_tag_leads') else None
    
    @router.register('batch-export-leads', category=CommandCategory.CONTACTS, description='批量導出線索')
    async def handle_batch_export_leads(payload: Dict[str, Any], context: CommandContext):
        """批量導出線索"""
        return await backend_service.handle_batch_export_leads(payload) if hasattr(backend_service, 'handle_batch_export_leads') else None
    
    @router.register('export-leads-to-excel', category=CommandCategory.CONTACTS, description='導出線索到 Excel')
    async def handle_export_leads_to_excel(payload: Dict[str, Any], context: CommandContext):
        """導出線索到 Excel"""
        return await backend_service.handle_export_leads_to_excel(payload)
    
    # ==================== 成員提取 ====================
    
    @router.register('extract-members', category=CommandCategory.CONTACTS, description='提取成員')
    async def handle_extract_members(payload: Dict[str, Any], context: CommandContext):
        """提取群組成員"""
        return await backend_service.handle_extract_members(payload) if hasattr(backend_service, 'handle_extract_members') else None
    
    @router.register('get-extracted-members', category=CommandCategory.CONTACTS, description='獲取提取的成員')
    async def handle_get_extracted_members(payload: Dict[str, Any], context: CommandContext):
        """獲取提取的成員"""
        return await backend_service.handle_get_extracted_members(payload) if hasattr(backend_service, 'handle_get_extracted_members') else None
    
    @router.register('get-member-stats', category=CommandCategory.CONTACTS, description='獲取成員統計')
    async def handle_get_member_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取成員統計"""
        return await backend_service.handle_get_member_stats(payload) if hasattr(backend_service, 'handle_get_member_stats') else None
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.CONTACTS)])} contacts handlers')

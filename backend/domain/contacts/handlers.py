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
        if hasattr(backend_service, 'handle_delete_lead'):
            return await backend_service.handle_delete_lead(payload)
        return {'success': False, 'error': 'Not implemented: handle_delete_lead'}
    
    @router.register('batch-delete-leads', category=CommandCategory.CONTACTS, description='批量刪除線索')
    async def handle_batch_delete_leads(payload: Dict[str, Any], context: CommandContext):
        """批量刪除線索"""
        if hasattr(backend_service, 'handle_batch_delete_leads'):
            return await backend_service.handle_batch_delete_leads(payload)
        return {'success': False, 'error': 'Not implemented: handle_batch_delete_leads'}
    
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
        if hasattr(backend_service, 'handle_get_detailed_funnel_stats'):
            return await backend_service.handle_get_detailed_funnel_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_detailed_funnel_stats'}
    
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
        if hasattr(backend_service, 'handle_get_tracked_users'):
            return await backend_service.handle_get_tracked_users(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_tracked_users'}
    
    @router.register('add-tracked-user', category=CommandCategory.CONTACTS, description='添加追蹤用戶')
    async def handle_add_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """添加追蹤用戶"""
        if hasattr(backend_service, 'handle_add_tracked_user'):
            return await backend_service.handle_add_tracked_user(payload)
        return {'success': False, 'error': 'Not implemented: handle_add_tracked_user'}
    
    @router.register('update-tracked-user', category=CommandCategory.CONTACTS, description='更新追蹤用戶')
    async def handle_update_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """更新追蹤用戶"""
        if hasattr(backend_service, 'handle_update_tracked_user'):
            return await backend_service.handle_update_tracked_user(payload)
        return {'success': False, 'error': 'Not implemented: handle_update_tracked_user'}
    
    @router.register('delete-tracked-user', category=CommandCategory.CONTACTS, description='刪除追蹤用戶')
    async def handle_delete_tracked_user(payload: Dict[str, Any], context: CommandContext):
        """刪除追蹤用戶"""
        if hasattr(backend_service, 'handle_delete_tracked_user'):
            return await backend_service.handle_delete_tracked_user(payload)
        return {'success': False, 'error': 'Not implemented: handle_delete_tracked_user'}
    
    # ==================== 統一聯繫人 ====================
    
    @router.register('unified-contacts:sync', category=CommandCategory.CONTACTS, description='同步聯繫人')
    async def handle_unified_contacts_sync(payload: Dict[str, Any], context: CommandContext):
        """同步統一聯繫人"""
        if hasattr(backend_service, 'handle_unified_contacts_sync'):
            return await backend_service.handle_unified_contacts_sync(payload)
        return {'success': False, 'error': 'Not implemented: handle_unified_contacts_sync'}
    
    @router.register('unified-contacts:get', category=CommandCategory.CONTACTS, description='獲取聯繫人')
    async def handle_unified_contacts_get(payload: Dict[str, Any], context: CommandContext):
        """獲取統一聯繫人"""
        if hasattr(backend_service, 'handle_unified_contacts_get'):
            return await backend_service.handle_unified_contacts_get(payload)
        return {'success': False, 'error': 'Not implemented: handle_unified_contacts_get'}
    
    @router.register('unified-contacts:stats', category=CommandCategory.CONTACTS, description='聯繫人統計')
    async def handle_unified_contacts_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取統一聯繫人統計"""
        if hasattr(backend_service, 'handle_unified_contacts_stats'):
            return await backend_service.handle_unified_contacts_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_unified_contacts_stats'}
    
    # ==================== 批量操作 ====================
    
    @router.register('batch-update-leads', category=CommandCategory.CONTACTS, description='批量更新線索')
    async def handle_batch_update_leads(payload: Dict[str, Any], context: CommandContext):
        """批量更新線索"""
        if hasattr(backend_service, 'handle_batch_update_leads'):
            return await backend_service.handle_batch_update_leads(payload)
        return {'success': False, 'error': 'Not implemented: handle_batch_update_leads'}
    
    @router.register('batch-tag-leads', category=CommandCategory.CONTACTS, description='批量標記線索')
    async def handle_batch_tag_leads(payload: Dict[str, Any], context: CommandContext):
        """批量標記線索"""
        if hasattr(backend_service, 'handle_batch_tag_leads'):
            return await backend_service.handle_batch_tag_leads(payload)
        return {'success': False, 'error': 'Not implemented: handle_batch_tag_leads'}
    
    @router.register('batch-export-leads', category=CommandCategory.CONTACTS, description='批量導出線索')
    async def handle_batch_export_leads(payload: Dict[str, Any], context: CommandContext):
        """批量導出線索"""
        if hasattr(backend_service, 'handle_batch_export_leads'):
            return await backend_service.handle_batch_export_leads(payload)
        return {'success': False, 'error': 'Not implemented: handle_batch_export_leads'}
    
    @router.register('export-leads-to-excel', category=CommandCategory.CONTACTS, description='導出線索到 Excel')
    async def handle_export_leads_to_excel(payload: Dict[str, Any], context: CommandContext):
        """導出線索到 Excel"""
        return await backend_service.handle_export_leads_to_excel(payload)
    
    # ==================== 成員提取 ====================
    
    @router.register('extract-members', category=CommandCategory.CONTACTS, description='提取成員')
    async def handle_extract_members(payload: Dict[str, Any], context: CommandContext):
        """提取群組成員"""
        if hasattr(backend_service, 'handle_extract_members'):
            return await backend_service.handle_extract_members(payload)
        return {'success': False, 'error': 'Not implemented: handle_extract_members'}
    
    @router.register('get-extracted-members', category=CommandCategory.CONTACTS, description='獲取提取的成員')
    async def handle_get_extracted_members(payload: Dict[str, Any], context: CommandContext):
        """獲取提取的成員"""
        if hasattr(backend_service, 'handle_get_extracted_members'):
            return await backend_service.handle_get_extracted_members(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_extracted_members'}
    
    @router.register('get-member-stats', category=CommandCategory.CONTACTS, description='獲取成員統計')
    async def handle_get_member_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取成員統計"""
        if hasattr(backend_service, 'handle_get_member_stats'):
            return await backend_service.handle_get_member_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_member_stats'}
    
    # ==================== 歷史消息收集 ====================
    
    @router.register('collect-users-from-history', category=CommandCategory.CONTACTS, description='從歷史消息收集用戶')
    async def handle_collect_users_from_history(payload: Dict[str, Any], context: CommandContext):
        """從歷史消息收集用戶"""
        if hasattr(backend_service, 'handle_collect_users_from_history'):
            return await backend_service.handle_collect_users_from_history(payload)
        return {'success': False, 'error': 'Not implemented: handle_collect_users_from_history'}
    
    @router.register('collect-users-from-history-advanced', category=CommandCategory.CONTACTS, description='進階歷史消息收集')
    async def handle_collect_users_from_history_advanced(payload: Dict[str, Any], context: CommandContext):
        """進階歷史消息收集"""
        if hasattr(backend_service, 'handle_collect_users_from_history_advanced'):
            return await backend_service.handle_collect_users_from_history_advanced(payload)
        return {'success': False, 'error': 'Not implemented: handle_collect_users_from_history_advanced'}
    
    @router.register('get-history-collection-stats', category=CommandCategory.CONTACTS, description='獲取歷史收集統計')
    async def handle_get_history_collection_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取歷史收集統計"""
        if hasattr(backend_service, 'handle_get_history_collection_stats'):
            return await backend_service.handle_get_history_collection_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_history_collection_stats'}
    
    @router.register('get-group-collected-stats', category=CommandCategory.CONTACTS, description='獲取群組收集統計')
    async def handle_get_group_collected_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取群組收集統計"""
        if hasattr(backend_service, 'handle_get_group_collected_stats'):
            return await backend_service.handle_get_group_collected_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_group_collected_stats'}
    
    @router.register('get-collected-users-count', category=CommandCategory.CONTACTS, description='獲取已收集用戶數量')
    async def handle_get_collected_users_count(payload: Dict[str, Any], context: CommandContext):
        """獲取已收集用戶數量"""
        if hasattr(backend_service, 'handle_get_collected_users_count'):
            return await backend_service.handle_get_collected_users_count(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_collected_users_count'}
    
    @router.register('check-group-monitoring-status', category=CommandCategory.CONTACTS, description='檢查群組監控狀態')
    async def handle_check_group_monitoring_status(payload: Dict[str, Any], context: CommandContext):
        """檢查群組監控狀態"""
        if hasattr(backend_service, 'handle_check_group_monitoring_status'):
            return await backend_service.handle_check_group_monitoring_status(payload)
        return {'success': False, 'error': 'Not implemented: handle_check_group_monitoring_status'}
    
    # ==================== P4 優化：數據導出與管理 ====================
    
    @router.register('export-members', category=CommandCategory.CONTACTS, description='導出成員數據')
    async def handle_export_members(payload: Dict[str, Any], context: CommandContext):
        """導出成員數據"""
        if hasattr(backend_service, 'handle_export_members'):
            return await backend_service.handle_export_members(payload)
        return {'success': False, 'error': 'Not implemented: handle_export_members'}
    
    @router.register('deduplicate-members', category=CommandCategory.CONTACTS, description='去重成員數據')
    async def handle_deduplicate_members(payload: Dict[str, Any], context: CommandContext):
        """去重成員數據"""
        if hasattr(backend_service, 'handle_deduplicate_members'):
            return await backend_service.handle_deduplicate_members(payload)
        return {'success': False, 'error': 'Not implemented: handle_deduplicate_members'}
    
    @router.register('batch-tag-members', category=CommandCategory.CONTACTS, description='批量標籤成員')
    async def handle_batch_tag_members(payload: Dict[str, Any], context: CommandContext):
        """批量標籤成員"""
        if hasattr(backend_service, 'handle_batch_tag_members'):
            return await backend_service.handle_batch_tag_members(payload)
        return {'success': False, 'error': 'Not implemented: handle_batch_tag_members'}
    
    @router.register('get-all-tags', category=CommandCategory.CONTACTS, description='獲取所有標籤')
    async def handle_get_all_tags(payload: Dict[str, Any], context: CommandContext):
        """獲取所有標籤"""
        if hasattr(backend_service, 'handle_get_all_tags'):
            return await backend_service.handle_get_all_tags(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_all_tags'}
    
    @router.register('get-group-profile', category=CommandCategory.CONTACTS, description='獲取群組畫像')
    async def handle_get_group_profile(payload: Dict[str, Any], context: CommandContext):
        """獲取群組畫像"""
        if hasattr(backend_service, 'handle_get_group_profile'):
            return await backend_service.handle_get_group_profile(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_group_profile'}
    
    @router.register('compare-groups', category=CommandCategory.CONTACTS, description='比較群組')
    async def handle_compare_groups(payload: Dict[str, Any], context: CommandContext):
        """比較群組"""
        if hasattr(backend_service, 'handle_compare_groups'):
            return await backend_service.handle_compare_groups(payload)
        return {'success': False, 'error': 'Not implemented: handle_compare_groups'}
    
    @router.register('recalculate-scores', category=CommandCategory.CONTACTS, description='重新計算評分')
    async def handle_recalculate_scores(payload: Dict[str, Any], context: CommandContext):
        """重新計算評分"""
        if hasattr(backend_service, 'handle_recalculate_scores'):
            return await backend_service.handle_recalculate_scores(payload)
        return {'success': False, 'error': 'Not implemented: handle_recalculate_scores'}
    
    @router.register('get-extraction-stats', category=CommandCategory.CONTACTS, description='獲取提取統計')
    async def handle_get_extraction_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取提取統計"""
        if hasattr(backend_service, 'handle_get_extraction_stats'):
            return await backend_service.handle_get_extraction_stats(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_extraction_stats'}
    
    @router.register('start-background-extraction', category=CommandCategory.CONTACTS, description='啟動背景提取')
    async def handle_start_background_extraction(payload: Dict[str, Any], context: CommandContext):
        """啟動背景提取"""
        if hasattr(backend_service, 'handle_start_background_extraction'):
            return await backend_service.handle_start_background_extraction(payload)
        return {'success': False, 'error': 'Not implemented: handle_start_background_extraction'}
    
    @router.register('get-background-tasks', category=CommandCategory.CONTACTS, description='獲取背景任務')
    async def handle_get_background_tasks(payload: Dict[str, Any], context: CommandContext):
        """獲取背景任務"""
        if hasattr(backend_service, 'handle_get_background_tasks'):
            return await backend_service.handle_get_background_tasks(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_background_tasks'}
    
    @router.register('clear-extraction-cache', category=CommandCategory.CONTACTS, description='清除提取緩存')
    async def handle_clear_extraction_cache(payload: Dict[str, Any], context: CommandContext):
        """清除提取緩存"""
        if hasattr(backend_service, 'handle_clear_extraction_cache'):
            return await backend_service.handle_clear_extraction_cache(payload)
        return {'success': False, 'error': 'Not implemented: handle_clear_extraction_cache'}
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.CONTACTS)])} contacts handlers')

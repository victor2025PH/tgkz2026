"""
TG-Matrix Automation Handlers
自動化命令處理器 - 處理所有自動化相關的 IPC 命令
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('AutomationHandlers')


def register_automation_handlers(backend_service):
    """
    註冊所有自動化相關的命令處理器
    """
    router = get_command_router()
    
    # ==================== 監控控制 ====================
    
    @router.register('start-monitoring', category=CommandCategory.AUTOMATION, description='開始監控')
    async def handle_start_monitoring(payload: Dict[str, Any], context: CommandContext):
        """開始監控"""
        return await backend_service.handle_start_monitoring()
    
    @router.register('stop-monitoring', category=CommandCategory.AUTOMATION, description='停止監控')
    async def handle_stop_monitoring(payload: Dict[str, Any], context: CommandContext):
        """停止監控"""
        return await backend_service.handle_stop_monitoring()
    
    @router.register('get-monitoring-status', category=CommandCategory.AUTOMATION, description='獲取監控狀態')
    async def handle_get_monitoring_status(payload: Dict[str, Any], context: CommandContext):
        """獲取當前監控狀態"""
        return await backend_service.handle_get_monitoring_status()
    
    @router.register('pause-monitoring', category=CommandCategory.AUTOMATION, description='暫停監控')
    async def handle_pause_monitoring(payload: Dict[str, Any], context: CommandContext):
        """暫停監控"""
        return await backend_service.handle_pause_monitoring(payload)
    
    @router.register('resume-monitoring', category=CommandCategory.AUTOMATION, description='恢復監控')
    async def handle_resume_monitoring(payload: Dict[str, Any], context: CommandContext):
        """恢復監控"""
        return await backend_service.handle_resume_monitoring(payload)
    
    # ==================== 一鍵控制 ====================
    
    @router.register('one-click-start', category=CommandCategory.AUTOMATION, description='一鍵啟動')
    async def handle_one_click_start(payload: Dict[str, Any], context: CommandContext):
        """一鍵啟動所有服務"""
        return await backend_service.handle_one_click_start(payload)
    
    @router.register('one-click-stop', category=CommandCategory.AUTOMATION, description='一鍵停止')
    async def handle_one_click_stop(payload: Dict[str, Any], context: CommandContext):
        """一鍵停止所有服務"""
        return await backend_service.handle_one_click_stop()
    
    @router.register('get-system-status', category=CommandCategory.AUTOMATION, description='獲取系統狀態')
    async def handle_get_system_status(payload: Dict[str, Any], context: CommandContext):
        """獲取系統狀態"""
        return await backend_service.handle_get_system_status()
    
    # ==================== 關鍵詞集 ====================
    
    @router.register('get-keyword-sets', category=CommandCategory.AUTOMATION, description='獲取關鍵詞集')
    async def handle_get_keyword_sets(payload: Dict[str, Any], context: CommandContext):
        """獲取所有關鍵詞集"""
        return await backend_service.handle_get_keyword_sets()
    
    @router.register('add-keyword-set', category=CommandCategory.AUTOMATION, description='添加關鍵詞集')
    async def handle_add_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """添加關鍵詞集"""
        return await backend_service.handle_add_keyword_set(payload)
    
    @router.register('save-keyword-set', category=CommandCategory.AUTOMATION, description='保存關鍵詞集')
    async def handle_save_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """保存關鍵詞集"""
        return await backend_service.handle_save_keyword_set(payload)
    
    @router.register('remove-keyword-set', category=CommandCategory.AUTOMATION, description='刪除關鍵詞集')
    async def handle_remove_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """刪除關鍵詞集"""
        return await backend_service.handle_remove_keyword_set(payload)
    
    @router.register('delete-keyword-set', category=CommandCategory.AUTOMATION, description='刪除關鍵詞集')
    async def handle_delete_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """刪除關鍵詞集（別名）"""
        return await backend_service.handle_delete_keyword_set(payload)
    
    @router.register('add-keyword', category=CommandCategory.AUTOMATION, description='添加關鍵詞')
    async def handle_add_keyword(payload: Dict[str, Any], context: CommandContext):
        """添加關鍵詞"""
        return await backend_service.handle_add_keyword(payload)
    
    @router.register('remove-keyword', category=CommandCategory.AUTOMATION, description='刪除關鍵詞')
    async def handle_remove_keyword(payload: Dict[str, Any], context: CommandContext):
        """刪除關鍵詞"""
        return await backend_service.handle_remove_keyword(payload)
    
    @router.register('bind-keyword-set', category=CommandCategory.AUTOMATION, description='綁定關鍵詞集')
    async def handle_bind_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """綁定關鍵詞集到群組"""
        return await backend_service.handle_bind_keyword_set(payload)
    
    @router.register('unbind-keyword-set', category=CommandCategory.AUTOMATION, description='解綁關鍵詞集')
    async def handle_unbind_keyword_set(payload: Dict[str, Any], context: CommandContext):
        """解綁關鍵詞集"""
        return await backend_service.handle_unbind_keyword_set(payload)
    
    # ==================== 監控群組 ====================
    
    @router.register('get-monitored-groups', category=CommandCategory.AUTOMATION, description='獲取監控群組')
    async def handle_get_monitored_groups(payload: Dict[str, Any], context: CommandContext):
        """獲取監控群組列表"""
        return await backend_service.handle_get_monitored_groups()
    
    @router.register('add-group', category=CommandCategory.AUTOMATION, description='添加群組')
    async def handle_add_group(payload: Dict[str, Any], context: CommandContext):
        """添加監控群組"""
        return await backend_service.handle_add_group(payload)
    
    @router.register('remove-group', category=CommandCategory.AUTOMATION, description='移除群組')
    async def handle_remove_group(payload: Dict[str, Any], context: CommandContext):
        """移除監控群組"""
        return await backend_service.handle_remove_group(payload)
    
    @router.register('join-group', category=CommandCategory.AUTOMATION, description='加入群組')
    async def handle_join_group(payload: Dict[str, Any], context: CommandContext):
        """加入群組"""
        return await backend_service.handle_join_group(payload)
    
    @router.register('leave-group', category=CommandCategory.AUTOMATION, description='離開群組')
    async def handle_leave_group(payload: Dict[str, Any], context: CommandContext):
        """離開群組"""
        return await backend_service.handle_leave_group(payload)
    
    @router.register('create-group', category=CommandCategory.AUTOMATION, description='創建群組')
    async def handle_create_group(payload: Dict[str, Any], context: CommandContext):
        """創建新群組"""
        return await backend_service.handle_create_group(payload)
    
    # ==================== 觸發規則 ====================
    
    @router.register('get-trigger-rules', category=CommandCategory.AUTOMATION, description='獲取觸發規則')
    async def handle_get_trigger_rules(payload: Dict[str, Any], context: CommandContext):
        """獲取所有觸發規則"""
        return await backend_service.handle_get_trigger_rules()
    
    @router.register('get-trigger-rule', category=CommandCategory.AUTOMATION, description='獲取單個觸發規則')
    async def handle_get_trigger_rule(payload: Dict[str, Any], context: CommandContext):
        """獲取單個觸發規則"""
        return await backend_service.handle_get_trigger_rule(payload)
    
    @router.register('save-trigger-rule', category=CommandCategory.AUTOMATION, description='保存觸發規則')
    async def handle_save_trigger_rule(payload: Dict[str, Any], context: CommandContext):
        """保存觸發規則"""
        return await backend_service.handle_save_trigger_rule(payload)
    
    @router.register('delete-trigger-rule', category=CommandCategory.AUTOMATION, description='刪除觸發規則')
    async def handle_delete_trigger_rule(payload: Dict[str, Any], context: CommandContext):
        """刪除觸發規則"""
        return await backend_service.handle_delete_trigger_rule(payload)
    
    @router.register('toggle-trigger-rule', category=CommandCategory.AUTOMATION, description='切換觸發規則狀態')
    async def handle_toggle_trigger_rule(payload: Dict[str, Any], context: CommandContext):
        """切換觸發規則啟用狀態"""
        return await backend_service.handle_toggle_trigger_rule(payload)
    
    # ==================== 自動化活動 ====================
    
    @router.register('add-campaign', category=CommandCategory.AUTOMATION, description='添加活動')
    async def handle_add_campaign(payload: Dict[str, Any], context: CommandContext):
        """添加自動化活動"""
        return await backend_service.handle_add_campaign(payload)
    
    @router.register('remove-campaign', category=CommandCategory.AUTOMATION, description='刪除活動')
    async def handle_remove_campaign(payload: Dict[str, Any], context: CommandContext):
        """刪除自動化活動"""
        return await backend_service.handle_remove_campaign(payload)
    
    @router.register('toggle-campaign-status', category=CommandCategory.AUTOMATION, description='切換活動狀態')
    async def handle_toggle_campaign_status(payload: Dict[str, Any], context: CommandContext):
        """切換活動啟用狀態"""
        return await backend_service.handle_toggle_campaign_status(payload)
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.AUTOMATION)])} automation handlers')

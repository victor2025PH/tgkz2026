"""
TG-Matrix Messaging Handlers
消息命令處理器 - 處理所有消息相關的 IPC 命令
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('MessagingHandlers')


def register_messaging_handlers(backend_service):
    """
    註冊所有消息相關的命令處理器
    """
    router = get_command_router()
    
    # ==================== 消息發送 ====================
    
    @router.register('send-message', category=CommandCategory.MESSAGING, description='發送私信')
    async def handle_send_message(payload: Dict[str, Any], context: CommandContext):
        """發送私信"""
        return await backend_service.handle_send_message(payload)
    
    @router.register('send-group-message', category=CommandCategory.MESSAGING, description='發送群消息')
    async def handle_send_group_message(payload: Dict[str, Any], context: CommandContext):
        """發送群消息"""
        return await backend_service.handle_send_group_message(payload)
    
    @router.register('send-greeting', category=CommandCategory.MESSAGING, description='發送問候')
    async def handle_send_greeting(payload: Dict[str, Any], context: CommandContext):
        """發送問候消息"""
        if hasattr(backend_service, 'handle_send_greeting'):
            return await backend_service.handle_send_greeting(payload)
        return {'success': False, 'error': 'Not implemented: handle_send_greeting'}
    
    # ==================== 消息隊列 ====================
    
    @router.register('get-queue-status', category=CommandCategory.MESSAGING, description='獲取隊列狀態')
    async def handle_get_queue_status(payload: Dict[str, Any], context: CommandContext):
        """獲取消息隊列狀態"""
        return await backend_service.handle_get_queue_status(payload)
    
    @router.register('get-queue-messages', category=CommandCategory.MESSAGING, description='獲取隊列消息')
    async def handle_get_queue_messages(payload: Dict[str, Any], context: CommandContext):
        """獲取隊列中的消息"""
        return await backend_service.handle_get_queue_messages(payload)
    
    @router.register('clear-queue', category=CommandCategory.MESSAGING, description='清空隊列')
    async def handle_clear_queue(payload: Dict[str, Any], context: CommandContext):
        """清空消息隊列"""
        return await backend_service.handle_clear_queue(payload)
    
    @router.register('pause-queue', category=CommandCategory.MESSAGING, description='暫停隊列')
    async def handle_pause_queue(payload: Dict[str, Any], context: CommandContext):
        """暫停消息隊列"""
        return await backend_service.handle_pause_queue(payload)
    
    @router.register('resume-queue', category=CommandCategory.MESSAGING, description='恢復隊列')
    async def handle_resume_queue(payload: Dict[str, Any], context: CommandContext):
        """恢復消息隊列"""
        return await backend_service.handle_resume_queue(payload)
    
    @router.register('delete-queue-message', category=CommandCategory.MESSAGING, description='刪除隊列消息')
    async def handle_delete_queue_message(payload: Dict[str, Any], context: CommandContext):
        """刪除隊列中的消息"""
        return await backend_service.handle_delete_queue_message(payload)
    
    @router.register('update-queue-message-priority', category=CommandCategory.MESSAGING, description='更新消息優先級')
    async def handle_update_queue_message_priority(payload: Dict[str, Any], context: CommandContext):
        """更新消息優先級"""
        return await backend_service.handle_update_queue_message_priority(payload)
    
    @router.register('add-to-queue', category=CommandCategory.MESSAGING, description='添加到隊列')
    async def handle_add_to_queue(payload: Dict[str, Any], context: CommandContext):
        """添加消息到隊列"""
        if hasattr(backend_service, 'handle_add_to_queue'):
            return await backend_service.handle_add_to_queue(payload)
        return {'success': False, 'error': 'Not implemented: handle_add_to_queue'}
    
    # ==================== 消息模板 ====================
    
    @router.register('add-template', category=CommandCategory.MESSAGING, description='添加模板')
    async def handle_add_template(payload: Dict[str, Any], context: CommandContext):
        """添加消息模板"""
        return await backend_service.handle_add_template(payload)
    
    @router.register('remove-template', category=CommandCategory.MESSAGING, description='刪除模板')
    async def handle_remove_template(payload: Dict[str, Any], context: CommandContext):
        """刪除消息模板"""
        return await backend_service.handle_remove_template(payload)
    
    @router.register('toggle-template-status', category=CommandCategory.MESSAGING, description='切換模板狀態')
    async def handle_toggle_template_status(payload: Dict[str, Any], context: CommandContext):
        """切換模板啟用狀態"""
        return await backend_service.handle_toggle_template_status(payload)
    
    # ==================== 聊天模板 ====================
    
    @router.register('get-chat-templates', category=CommandCategory.MESSAGING, description='獲取聊天模板')
    async def handle_get_chat_templates(payload: Dict[str, Any], context: CommandContext):
        """獲取聊天模板"""
        return await backend_service.handle_get_chat_templates()
    
    @router.register('save-chat-template', category=CommandCategory.MESSAGING, description='保存聊天模板')
    async def handle_save_chat_template(payload: Dict[str, Any], context: CommandContext):
        """保存聊天模板"""
        return await backend_service.handle_save_chat_template(payload)
    
    @router.register('delete-chat-template', category=CommandCategory.MESSAGING, description='刪除聊天模板')
    async def handle_delete_chat_template(payload: Dict[str, Any], context: CommandContext):
        """刪除聊天模板"""
        return await backend_service.handle_delete_chat_template(payload)
    
    # ==================== 聊天記錄 ====================
    
    @router.register('get-chat-history', category=CommandCategory.MESSAGING, description='獲取聊天記錄')
    async def handle_get_chat_history(payload: Dict[str, Any], context: CommandContext):
        """獲取聊天記錄"""
        return await backend_service.handle_get_chat_history(payload)
    
    @router.register('get-chat-history-full', category=CommandCategory.MESSAGING, description='獲取完整聊天記錄')
    async def handle_get_chat_history_full(payload: Dict[str, Any], context: CommandContext):
        """獲取完整聊天記錄"""
        if hasattr(backend_service, 'handle_get_chat_history_full'):
            return await backend_service.handle_get_chat_history_full(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_chat_history_full'}
    
    @router.register('get-chat-list', category=CommandCategory.MESSAGING, description='獲取聊天列表')
    async def handle_get_chat_list(payload: Dict[str, Any], context: CommandContext):
        """獲取聊天列表"""
        if hasattr(backend_service, 'handle_get_chat_list'):
            return await backend_service.handle_get_chat_list(payload)
        return {'success': False, 'error': 'Not implemented: handle_get_chat_list'}
    
    # ==================== 🔧 群聊協作：群組管理 ====================
    
    @router.register('group:create', category=CommandCategory.MESSAGING, description='創建群組')
    async def handle_group_create(payload: Dict[str, Any], context: CommandContext):
        """創建 Telegram 群組（群聊協作用）"""
        # 轉換參數格式，適配現有的 handle_create_group
        adapted_payload = {
            'name': payload.get('groupName', '新群組'),
            'description': payload.get('description', ''),
            'type': 'supergroup',
            'accountPhone': payload.get('creatorPhone')
        }
        return await backend_service.handle_create_group(adapted_payload)
    
    @router.register('group:invite-user', category=CommandCategory.MESSAGING, description='邀請用戶到群組')
    async def handle_group_invite_user(payload: Dict[str, Any], context: CommandContext):
        """邀請用戶加入群組"""
        return await backend_service.handle_group_invite_user(payload)
    
    @router.register('group:add-member', category=CommandCategory.MESSAGING, description='添加成員到群組')
    async def handle_group_add_member(payload: Dict[str, Any], context: CommandContext):
        """添加成員到群組（邀請其他帳號）"""
        return await backend_service.handle_group_add_member(payload)
    
    @router.register('group:send-message', category=CommandCategory.MESSAGING, description='在群組中發送消息')
    async def handle_group_send_msg(payload: Dict[str, Any], context: CommandContext):
        """在群組中發送消息"""
        return await backend_service.handle_group_send_msg(payload)
    
    @router.register('group:get-info', category=CommandCategory.MESSAGING, description='獲取群組信息')
    async def handle_group_get_info(payload: Dict[str, Any], context: CommandContext):
        """獲取群組信息"""
        if hasattr(backend_service, 'handle_group_get_info'):
            return await backend_service.handle_group_get_info(payload)
        return {'success': False, 'error': 'Not implemented: handle_group_get_info'}
    
    @router.register('group:monitor-messages', category=CommandCategory.MESSAGING, description='監聯群組消息')
    async def handle_group_monitor_messages(payload: Dict[str, Any], context: CommandContext):
        """監聯群組消息（群聊協作用）"""
        if hasattr(backend_service, 'handle_group_monitor_messages'):
            return await backend_service.handle_group_monitor_messages(payload)
        return {'success': False, 'error': 'Not implemented: handle_group_monitor_messages'}
    
    # ==================== 🆕 P0: 操作記錄 ====================
    
    @router.register('record-action', category=CommandCategory.MESSAGING, description='記錄操作到對話記憶')
    async def handle_record_action(payload: Dict[str, Any], context: CommandContext):
        """記錄操作（群邀請、消息發送等）到對話記憶系統"""
        try:
            from conversation_memory import get_memory_service
            
            user_id = payload.get('userId')
            action_type = payload.get('actionType')
            action_details = payload.get('actionDetails', {})
            performed_by = payload.get('performedBy')
            
            if not user_id or not action_type:
                return {"success": False, "error": "缺少 userId 或 actionType"}
            
            memory_service = get_memory_service()
            success = await memory_service.record_action(
                user_id=str(user_id),
                action_type=action_type,
                action_details=action_details,
                performed_by=performed_by
            )
            
            return {"success": success}
        except Exception as e:
            logger.error(f"記錄操作失敗: {e}")
            return {"success": False, "error": str(e)}
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.MESSAGING)])} messaging handlers')

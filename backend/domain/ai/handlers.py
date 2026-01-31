"""
TG-Matrix AI Handlers
AI 命令處理器 - 處理所有 AI 相關的 IPC 命令
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('AIHandlers')


def register_ai_handlers(backend_service):
    """
    註冊所有 AI 相關的命令處理器
    """
    router = get_command_router()
    
    # ==================== AI 回應生成 ====================
    
    @router.register('generate-ai-response', category=CommandCategory.AI, description='生成 AI 回應')
    async def handle_generate_ai_response(payload: Dict[str, Any], context: CommandContext):
        """生成 AI 回應"""
        return await backend_service.handle_generate_ai_response(payload)
    
    @router.register('ai-generate-message', category=CommandCategory.AI, description='AI 生成消息')
    async def handle_ai_generate_message(payload: Dict[str, Any], context: CommandContext):
        """AI 生成消息"""
        return await backend_service.handle_ai_generate_message(payload)
    
    @router.register('ai:generate-text', category=CommandCategory.AI, description='通用 AI 文本生成')
    async def handle_ai_generate_text(payload: Dict[str, Any], context: CommandContext):
        """🆕 通用 AI 文本生成（多角色協作等模塊使用）"""
        import sys
        print(f"[AI Handlers] ai:generate-text 命令被路由到 handler", file=sys.stderr)
        return await backend_service.handle_ai_generate_text(payload)
    
    @router.register('ai-generate-group-names', category=CommandCategory.AI, description='AI 生成群名')
    async def handle_ai_generate_group_names(payload: Dict[str, Any], context: CommandContext):
        """AI 生成群組名稱"""
        return await backend_service.handle_ai_generate_group_names(payload)
    
    @router.register('ai-generate-welcome', category=CommandCategory.AI, description='AI 生成歡迎語')
    async def handle_ai_generate_welcome(payload: Dict[str, Any], context: CommandContext):
        """AI 生成歡迎語"""
        return await backend_service.handle_ai_generate_welcome(payload)
    
    # ==================== AI 設置 ====================
    
    @router.register('get-ai-chat-settings', category=CommandCategory.AI, description='獲取 AI 聊天設置')
    async def handle_get_ai_chat_settings(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 聊天設置"""
        return await backend_service.handle_get_ai_chat_settings()
    
    @router.register('update-ai-chat-settings', category=CommandCategory.AI, description='更新 AI 聊天設置')
    async def handle_update_ai_chat_settings(payload: Dict[str, Any], context: CommandContext):
        """更新 AI 聊天設置"""
        return await backend_service.handle_update_ai_chat_settings(payload)
    
    @router.register('get-ai-settings', category=CommandCategory.AI, description='獲取 AI 設置')
    async def handle_get_ai_settings(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 設置"""
        return await backend_service.handle_get_ai_settings(payload)
    
    @router.register('save-ai-settings', category=CommandCategory.AI, description='保存 AI 設置')
    async def handle_save_ai_settings(payload: Dict[str, Any], context: CommandContext):
        """保存 AI 設置"""
        return await backend_service.handle_save_ai_settings(payload)
    
    # ==================== AI 模型管理 ====================
    
    @router.register('save-ai-model', category=CommandCategory.AI, description='保存 AI 模型')
    async def handle_save_ai_model(payload: Dict[str, Any], context: CommandContext):
        """保存 AI 模型配置"""
        return await backend_service.handle_save_ai_model(payload)
    
    @router.register('get-ai-models', category=CommandCategory.AI, description='獲取 AI 模型列表')
    async def handle_get_ai_models(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 模型列表"""
        return await backend_service.handle_get_ai_models()
    
    @router.register('update-ai-model', category=CommandCategory.AI, description='更新 AI 模型')
    async def handle_update_ai_model(payload: Dict[str, Any], context: CommandContext):
        """更新 AI 模型"""
        return await backend_service.handle_update_ai_model(payload)
    
    @router.register('delete-ai-model', category=CommandCategory.AI, description='刪除 AI 模型')
    async def handle_delete_ai_model(payload: Dict[str, Any], context: CommandContext):
        """刪除 AI 模型"""
        return await backend_service.handle_delete_ai_model(payload)
    
    @router.register('test-ai-model', category=CommandCategory.AI, description='測試 AI 模型')
    async def handle_test_ai_model(payload: Dict[str, Any], context: CommandContext):
        """測試 AI 模型連接"""
        return await backend_service.handle_test_ai_model(payload)
    
    @router.register('set-default-ai-model', category=CommandCategory.AI, description='設置默認 AI 模型')
    async def handle_set_default_ai_model(payload: Dict[str, Any], context: CommandContext):
        """設置默認 AI 模型"""
        return await backend_service.handle_set_default_ai_model(payload)
    
    # ==================== AI 記憶 ====================
    
    @router.register('add-ai-memory', category=CommandCategory.AI, description='添加 AI 記憶')
    async def handle_add_ai_memory(payload: Dict[str, Any], context: CommandContext):
        """添加 AI 記憶"""
        return await backend_service.handle_add_ai_memory(payload)
    
    @router.register('get-ai-memories', category=CommandCategory.AI, description='獲取 AI 記憶')
    async def handle_get_ai_memories(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 記憶"""
        return await backend_service.handle_get_ai_memories(payload)
    
    @router.register('get-user-context', category=CommandCategory.AI, description='獲取用戶上下文')
    async def handle_get_user_context(payload: Dict[str, Any], context: CommandContext):
        """獲取用戶上下文"""
        return await backend_service.handle_get_user_context(payload)
    
    # ==================== 對話分析 ====================
    
    @router.register('analyze-conversation', category=CommandCategory.AI, description='分析對話')
    async def handle_analyze_conversation(payload: Dict[str, Any], context: CommandContext):
        """分析對話"""
        return await backend_service.handle_analyze_conversation(payload)
    
    # ==================== AI 策略 ====================
    
    @router.register('generate-ai-strategy', category=CommandCategory.AI, description='生成 AI 策略')
    async def handle_generate_ai_strategy(payload: Dict[str, Any], context: CommandContext):
        """生成 AI 策略"""
        return await backend_service.handle_generate_ai_strategy(payload)
    
    @router.register('save-ai-strategy', category=CommandCategory.AI, description='保存 AI 策略')
    async def handle_save_ai_strategy(payload: Dict[str, Any], context: CommandContext):
        """保存 AI 策略"""
        return await backend_service.handle_save_ai_strategy(payload)
    
    @router.register('get-ai-strategies', category=CommandCategory.AI, description='獲取 AI 策略')
    async def handle_get_ai_strategies(payload: Dict[str, Any], context: CommandContext):
        """獲取 AI 策略列表"""
        return await backend_service.handle_get_ai_strategies(payload)
    
    @router.register('execute-ai-strategy', category=CommandCategory.AI, description='執行 AI 策略')
    async def handle_execute_ai_strategy(payload: Dict[str, Any], context: CommandContext):
        """執行 AI 策略"""
        return await backend_service.handle_execute_ai_strategy(payload)
    
    @router.register('save-conversation-strategy', category=CommandCategory.AI, description='保存對話策略')
    async def handle_save_conversation_strategy(payload: Dict[str, Any], context: CommandContext):
        """保存對話策略"""
        return await backend_service.handle_save_conversation_strategy(payload)
    
    @router.register('get-conversation-strategy', category=CommandCategory.AI, description='獲取對話策略')
    async def handle_get_conversation_strategy(payload: Dict[str, Any], context: CommandContext):
        """獲取對話策略"""
        return await backend_service.handle_get_conversation_strategy()
    
    # ==================== 知識庫 ====================
    
    @router.register('init-knowledge-base', category=CommandCategory.AI, description='初始化知識庫')
    async def handle_init_knowledge_base(payload: Dict[str, Any], context: CommandContext):
        """初始化知識庫"""
        return await backend_service.handle_init_knowledge_base()
    
    @router.register('get-knowledge-stats', category=CommandCategory.AI, description='獲取知識庫統計')
    async def handle_get_knowledge_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取知識庫統計"""
        return await backend_service.handle_get_knowledge_stats()
    
    @router.register('search-knowledge', category=CommandCategory.AI, description='搜索知識庫')
    async def handle_search_knowledge(payload: Dict[str, Any], context: CommandContext):
        """搜索知識庫"""
        return await backend_service.handle_search_knowledge(payload)
    
    @router.register('learn-from-history', category=CommandCategory.AI, description='從歷史學習')
    async def handle_learn_from_history(payload: Dict[str, Any], context: CommandContext):
        """從聊天歷史學習"""
        return await backend_service.handle_learn_from_history(payload)
    
    @router.register('add-document', category=CommandCategory.AI, description='添加文檔')
    async def handle_add_document(payload: Dict[str, Any], context: CommandContext):
        """添加知識文檔"""
        return await backend_service.handle_add_document(payload)
    
    @router.register('add-knowledge-base', category=CommandCategory.AI, description='添加知識庫')
    async def handle_add_knowledge_base(payload: Dict[str, Any], context: CommandContext):
        """添加知識庫"""
        return await backend_service.handle_add_knowledge_base(payload)
    
    @router.register('add-knowledge-item', category=CommandCategory.AI, description='添加知識庫條目')
    async def handle_add_knowledge_item(payload: Dict[str, Any], context: CommandContext):
        """添加知識庫條目"""
        return await backend_service.handle_add_knowledge_item(payload)
    
    @router.register('get-knowledge-items', category=CommandCategory.AI, description='獲取知識庫條目')
    async def handle_get_knowledge_items(payload: Dict[str, Any], context: CommandContext):
        """獲取知識庫條目列表"""
        return await backend_service.handle_get_knowledge_items(payload)
    
    @router.register('get-documents', category=CommandCategory.AI, description='獲取文檔列表')
    async def handle_get_documents(payload: Dict[str, Any], context: CommandContext):
        """獲取知識文檔列表"""
        return await backend_service.handle_get_documents(payload)
    
    @router.register('delete-document', category=CommandCategory.AI, description='刪除文檔')
    async def handle_delete_document(payload: Dict[str, Any], context: CommandContext):
        """刪除知識文檔"""
        return await backend_service.handle_delete_document(payload)
    
    # ==================== RAG ====================
    
    @router.register('get-rag-context', category=CommandCategory.AI, description='獲取 RAG 上下文')
    async def handle_get_rag_context(payload: Dict[str, Any], context: CommandContext):
        """獲取 RAG 上下文"""
        return await backend_service.handle_get_rag_context(payload)
    
    @router.register('get-rag-stats', category=CommandCategory.AI, description='獲取 RAG 統計')
    async def handle_get_rag_stats(payload: Dict[str, Any], context: CommandContext):
        """獲取 RAG 統計"""
        return await backend_service.handle_get_rag_stats()
    
    @router.register('search-rag', category=CommandCategory.AI, description='RAG 搜索')
    async def handle_search_rag(payload: Dict[str, Any], context: CommandContext):
        """RAG 搜索"""
        return await backend_service.handle_search_rag(payload)
    
    @router.register('trigger-rag-learning', category=CommandCategory.AI, description='觸發 RAG 學習')
    async def handle_trigger_rag_learning(payload: Dict[str, Any], context: CommandContext):
        """觸發 RAG 學習"""
        return await backend_service.handle_trigger_rag_learning(payload)
    
    @router.register('add-rag-knowledge', category=CommandCategory.AI, description='添加 RAG 知識')
    async def handle_add_rag_knowledge(payload: Dict[str, Any], context: CommandContext):
        """添加 RAG 知識"""
        return await backend_service.handle_add_rag_knowledge(payload)
    
    # ==================== 本地 AI ====================
    
    @router.register('test-local-ai', category=CommandCategory.AI, description='測試本地 AI')
    async def handle_test_local_ai(payload: Dict[str, Any], context: CommandContext):
        """測試本地 AI"""
        return await backend_service.handle_test_local_ai(payload)
    
    @router.register('get-ollama-models', category=CommandCategory.AI, description='獲取 Ollama 模型')
    async def handle_get_ollama_models(payload: Dict[str, Any], context: CommandContext):
        """獲取 Ollama 模型列表"""
        return await backend_service.handle_get_ollama_models(payload) if hasattr(backend_service, 'handle_get_ollama_models') else None
    
    @router.register('test-ollama-connection', category=CommandCategory.AI, description='測試 Ollama 連接')
    async def handle_test_ollama_connection(payload: Dict[str, Any], context: CommandContext):
        """測試 Ollama 連接"""
        return await backend_service.handle_test_ollama_connection(payload) if hasattr(backend_service, 'handle_test_ollama_connection') else None
    
    # ==================== TTS/STT ====================
    
    @router.register('test-tts-service', category=CommandCategory.AI, description='測試 TTS')
    async def handle_test_tts_service(payload: Dict[str, Any], context: CommandContext):
        """測試 TTS 服務"""
        return await backend_service.handle_test_tts_service(payload)
    
    @router.register('test-stt-service', category=CommandCategory.AI, description='測試 STT')
    async def handle_test_stt_service(payload: Dict[str, Any], context: CommandContext):
        """測試 STT 服務"""
        return await backend_service.handle_test_stt_service(payload)
    
    # ==================== AI 團隊執行 ====================
    
    @router.register('ai-team:start-execution', category=CommandCategory.AI, description='啟動 AI 團隊執行')
    async def handle_ai_team_start_execution(payload: Dict[str, Any], context: CommandContext):
        """啟動 AI 團隊執行任務"""
        return await backend_service.handle_ai_team_start_execution(payload)
    
    @router.register('ai-team:send-private-message', category=CommandCategory.AI, description='AI 團隊發送私聊')
    async def handle_ai_team_send_private_message(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊發送私聊消息"""
        return await backend_service.handle_ai_team_send_private_message(payload)
    
    @router.register('ai-team:send-manual-message', category=CommandCategory.AI, description='AI 團隊手動消息')
    async def handle_ai_team_send_manual_message(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊發送手動消息"""
        return await backend_service.handle_ai_team_send_manual_message(payload)
    
    @router.register('ai-team:send-scriptless-message', category=CommandCategory.AI, description='AI 團隊無腳本消息')
    async def handle_ai_team_send_scriptless_message(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊發送無腳本模式消息"""
        return await backend_service.handle_ai_team_send_scriptless_message(payload)
    
    @router.register('ai-team:generate-scriptless-message', category=CommandCategory.AI, description='AI 生成無腳本消息')
    async def handle_ai_team_generate_scriptless_message(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊生成無腳本消息"""
        return await backend_service.handle_ai_team_generate_scriptless_message(payload)
    
    @router.register('ai-team:add-targets', category=CommandCategory.AI, description='AI 團隊添加目標')
    async def handle_ai_team_add_targets(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊添加目標用戶"""
        return await backend_service.handle_ai_team_add_targets(payload)
    
    @router.register('ai-team:adjust-strategy', category=CommandCategory.AI, description='AI 團隊調整策略')
    async def handle_ai_team_adjust_strategy(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊調整策略"""
        return await backend_service.handle_ai_team_adjust_strategy(payload)
    
    @router.register('ai-team:request-suggestion', category=CommandCategory.AI, description='AI 團隊請求建議')
    async def handle_ai_team_request_suggestion(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊請求建議"""
        return await backend_service.handle_ai_team_request_suggestion(payload)
    
    @router.register('ai-team:user-completed', category=CommandCategory.AI, description='AI 團隊用戶完成')
    async def handle_ai_team_user_completed(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊標記用戶完成"""
        return await backend_service.handle_ai_team_user_completed(payload)
    
    @router.register('ai-team:queue-completed', category=CommandCategory.AI, description='AI 團隊隊列完成')
    async def handle_ai_team_queue_completed(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊隊列完成"""
        return await backend_service.handle_ai_team_queue_completed(payload)
    
    @router.register('ai-team:next-user', category=CommandCategory.AI, description='AI 團隊下一用戶')
    async def handle_ai_team_next_user(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊處理下一用戶"""
        return await backend_service.handle_ai_team_next_user(payload)
    
    @router.register('ai-team:conversion-signal', category=CommandCategory.AI, description='AI 團隊轉化信號')
    async def handle_ai_team_conversion_signal(payload: Dict[str, Any], context: CommandContext):
        """AI 團隊轉化信號"""
        return await backend_service.handle_ai_team_conversion_signal(payload)
    
    logger.info(f'Registered {len([c for c in router.get_commands(CommandCategory.AI)])} AI handlers')

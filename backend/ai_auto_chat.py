"""
AI Auto Chat Service
Handles automatic AI-powered responses for Telegram conversations

整合 TelegramRAGSystem 實現知識增強的 AI 回覆
"""
import asyncio
import aiohttp
import random
import json
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
from database import db
from ai_context_manager import ai_context
from ai_response_strategy import AIResponseStrategyManager
from ai_quality_checker import AIQualityChecker

# 🔧 P0 優化: 導入對話記憶系統
try:
    from conversation_memory import get_memory_service
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False
    print("[AIAutoChat] 對話記憶系統未載入", file=__import__('sys').stderr)

# 導入 RAG 系統
try:
    from telegram_rag_system import telegram_rag, ConversationOutcome
    from chat_history_indexer import chat_indexer
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("[AIAutoChat] RAG 系統未載入，使用基礎模式", file=__import__('sys').stderr)


class AIAutoChatService:
    """Service for AI-powered automatic chat responses"""
    
    def __init__(self):
        self.settings = {}
        self.is_running = False
        self.send_callback: Optional[Callable] = None
        self.log_callback: Optional[Callable] = None
        self.event_callback: Optional[Callable] = None
        
        # AI endpoints (will be set from settings or ai_models table)
        self.local_ai_endpoint = ""
        self.local_ai_model = ""
        self.api_key = ""
        self.provider = "custom"
        self.model_config = {}
        
        # 策略管理器和質量檢查器
        self.strategy_manager = AIResponseStrategyManager()
        self.quality_checker = AIQualityChecker()
        
        # 🆕 P1-2: 記錄最後使用的知識（用於可視化）
        self.last_knowledge_used = []
        self.last_knowledge_source = None
        
        # 🆕 AI 自主決策引擎（無劇本化）
        self.autonomous_engine = None
        self.autonomous_mode = False  # 是否啟用自主模式
        
    async def initialize(self):
        """Initialize the service with settings from database"""
        import sys
        self.settings = await db.get_ai_settings()
        
        # 🔧 FIX: 載入模型用途分配配置
        try:
            row = await db.fetch_one(
                "SELECT value FROM ai_settings WHERE key = 'model_usage'"
            )
            if row and row.get('value'):
                self.model_usage = json.loads(row['value'])
                print(f"[AIAutoChat] ✓ 模型用途分配已載入: {self.model_usage}", file=sys.stderr)
            else:
                self.model_usage = {}
        except Exception as e:
            print(f"[AIAutoChat] 載入模型用途分配失敗: {e}", file=sys.stderr)
            self.model_usage = {}
        
        # 🔧 優先從 ai_models 表獲取已配置的 AI 模型
        try:
            # 先嘗試獲取默認模型
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint, is_local
                   FROM ai_models WHERE is_default = 1 AND (api_key != '' OR api_endpoint != '' OR is_local = 1)
                   ORDER BY id DESC LIMIT 1"""
            )
            
            # 如果沒有默認模型，獲取任何可用的模型
            if not model:
                model = await db.fetch_one(
                    """SELECT id, provider, model_name, display_name, api_key, api_endpoint, is_local
                       FROM ai_models WHERE api_key != '' OR api_endpoint != '' OR is_local = 1
                       ORDER BY id DESC LIMIT 1"""
                )
            
            if model:
                # 根據模型類型設置端點
                model_dict = dict(model) if hasattr(model, 'keys') else {
                    'id': model[0], 'provider': model[1], 'model_name': model[2],
                    'display_name': model[3], 'api_key': model[4], 'api_endpoint': model[5],
                    'is_local': model[6] if len(model) > 6 else 0
                }
                
                provider = model_dict.get('provider', '')
                api_key = model_dict.get('api_key', '')
                api_endpoint = model_dict.get('api_endpoint', '')
                model_name = model_dict.get('model_name', '')
                display_name = model_dict.get('display_name', model_name)
                is_local = model_dict.get('is_local', 0)
                
                # 設置端點
                if api_endpoint:
                    endpoint = api_endpoint
                elif provider == 'openai':
                    endpoint = 'https://api.openai.com/v1/chat/completions'
                elif provider == 'claude':
                    endpoint = 'https://api.anthropic.com/v1/messages'
                elif provider == 'gemini':
                    endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent'
                else:
                    endpoint = api_endpoint or ''
                
                if endpoint:
                    self.set_ai_config(endpoint, model_name)
                    self.api_key = api_key
                    self.provider = provider
                    self.model_config = model_dict
                    print(f"[AIAutoChat] ✓ 已從 ai_models 載入: {display_name} ({provider}), endpoint={endpoint[:50]}...", file=sys.stderr)
                else:
                    print(f"[AIAutoChat] ⚠ 模型 {display_name} 無有效端點", file=sys.stderr)
            else:
                print(f"[AIAutoChat] ⚠ ai_models 表無可用模型", file=sys.stderr)
        except Exception as e:
            print(f"[AIAutoChat] 從 ai_models 載入失敗: {e}", file=sys.stderr)
        
        # 如果 ai_models 沒有配置，fallback 到舊的 settings 表
        if not self.local_ai_endpoint and self.settings:
            endpoint = self.settings.get('local_ai_endpoint', '')
            model = self.settings.get('local_ai_model', '')
            if endpoint:
                self.set_ai_config(endpoint, model)
                print(f"[AIAutoChat] 已從 settings 載入 AI 配置: endpoint={endpoint}, model={model}", file=sys.stderr)
        
        # 🆕 初始化 AI 自主決策引擎
        try:
            from ai_autonomous_engine import get_autonomous_engine
            from intent_scorer import IntentScorer
            
            intent_scorer = IntentScorer()
            self.autonomous_engine = get_autonomous_engine(db, intent_scorer)
            
            # 檢查是否啟用自主模式
            autonomous_setting = await db.fetch_one(
                "SELECT value FROM ai_settings WHERE key = 'autonomous_mode'"
            )
            self.autonomous_mode = autonomous_setting and autonomous_setting.get('value') == '1'
            
            print(f"[AIAutoChat] ✓ AI 自主引擎已初始化, 自主模式={'啟用' if self.autonomous_mode else '關閉'}", file=sys.stderr)
        except Exception as e:
            print(f"[AIAutoChat] ⚠ AI 自主引擎初始化失敗: {e}", file=sys.stderr)
            self.autonomous_engine = None
        
    def set_ai_config(self, endpoint: str, model: str = ""):
        """Set AI endpoint configuration"""
        self.local_ai_endpoint = endpoint
        self.local_ai_model = model
    
    async def _get_recent_ai_messages(self, user_id: str, limit: int = 5) -> List[str]:
        """
        🔧 P0: 獲取最近的 AI 回覆（用於去重）
        """
        try:
            history = await db.get_chat_history(user_id, limit=limit * 2)
            ai_messages = [
                msg.get('content', '')
                for msg in history
                if msg.get('role') == 'assistant' and msg.get('content')
            ]
            return ai_messages[:limit]
        except Exception as e:
            self.log(f"[Anti-Repeat] 獲取歷史錯誤: {e}", "warning")
            return []
    
    # 話題關鍵詞映射（用於識別話題）
    TOPIC_KEYWORDS = {
        '支付方案': ['支付', '付款', '收款', '代收', '代付'],
        'U幣兌換': ['換U', 'USDT', 'U幣', '兌換', '匯率'],
        '跨境收款': ['跨境', '境外', '國際', '海外'],
        '費率報價': ['費率', '費用', '價格', '多少錢', '報價', '優惠'],
        '操作流程': ['流程', '怎麼', '如何', '步驟', '操作'],
        '安全保障': ['安全', '可靠', '保障', '保證', '信任'],
        '到賬時間': ['多久', '時間', '速度', '到賬', '多快'],
        '服務介紹': ['介紹', '什麼服務', '有什麼', '提供'],
    }
    
    def _extract_covered_topics(self, ai_messages: List[str]) -> List[str]:
        """
        🔧 P0: 從 AI 回覆中提取已涵蓋的話題
        """
        covered = set()
        all_text = ' '.join(ai_messages).lower()
        
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            if any(kw in all_text for kw in keywords):
                covered.add(topic)
        
        return list(covered)
    
    def _identify_topic(self, text: str) -> Optional[str]:
        """識別文本中的主要話題"""
        text_lower = text.lower()
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return topic
        return None
    
    async def _update_topic_tracking(self, user_id: str, user_message: str, ai_response: str):
        """
        🔧 P2: 更新話題追蹤記錄
        """
        try:
            topic = self._identify_topic(user_message)
            if not topic:
                topic = self._identify_topic(ai_response)
            
            if topic:
                # 獲取當前深度
                current_depth = await db.get_topic_depth(user_id, topic)
                new_depth = min(current_depth + 1, 5)  # 最大深度 5
                
                await db.update_topic(
                    user_id=user_id,
                    topic_name=topic,
                    depth_level=new_depth,
                    last_question=user_message[:200],
                    last_response=ai_response[:200]
                )
                self.log(f"[Topic] 更新話題 '{topic}' 深度: {current_depth} → {new_depth}")
        except Exception as e:
            self.log(f"[Topic] 話題追蹤錯誤: {e}", "warning")
    
    def _build_anti_repeat_prompt(self, covered_topics: List[str], recent_messages: List[str]) -> str:
        """
        🔧 P0: 構建防重複 Prompt
        """
        if not covered_topics and not recent_messages:
            return ""
        
        prompt_parts = ["\n【防重複約束 - 必須遵守】"]
        
        if covered_topics:
            prompt_parts.append(f"已涵蓋話題（禁止簡單重複）: {', '.join(covered_topics)}")
            prompt_parts.append("→ 如用戶追問相同話題，請提供：更深入細節 / 新角度 / 具體案例")
        
        if recent_messages:
            # 提取最近回覆的關鍵短語，避免重複
            recent_phrases = []
            for msg in recent_messages[:3]:
                # 截取前30字作為參考
                phrase = msg[:30].strip()
                if phrase:
                    recent_phrases.append(f'"{phrase}..."')
            if recent_phrases:
                prompt_parts.append(f"最近已說過（禁止重複開頭）: {'; '.join(recent_phrases)}")
        
        prompt_parts.append("→ 每輪回覆必須推進對話，不要停留在相同信息層級")
        
        return '\n'.join(prompt_parts)
    
    async def get_model_for_usage(self, usage_type: str = 'dailyChat') -> Optional[Dict[str, Any]]:
        """
        🔧 根據用途類型獲取對應的 AI 模型配置
        
        Args:
            usage_type: 用途類型 ('intentRecognition', 'dailyChat', 'multiRoleScript')
        
        Returns:
            模型配置 dict 或 None
        """
        import sys
        
        # 確保 model_usage 已載入
        if not hasattr(self, 'model_usage') or not self.model_usage:
            try:
                row = await db.fetch_one(
                    "SELECT value FROM ai_settings WHERE key = 'model_usage'"
                )
                if row and row.get('value'):
                    self.model_usage = json.loads(row['value'])
                else:
                    self.model_usage = {}
            except Exception as e:
                print(f"[AIAutoChat] 獲取 model_usage 失敗: {e}", file=sys.stderr)
                self.model_usage = {}
        
        # 獲取該用途對應的模型 ID
        model_id = self.model_usage.get(usage_type, '')
        
        if not model_id:
            print(f"[AIAutoChat] ⚠ 用途 '{usage_type}' 未配置模型，使用默認模型", file=sys.stderr)
            return None
        
        # 從 ai_models 表獲取模型配置
        try:
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint, is_local
                   FROM ai_models WHERE id = ?""",
                (model_id,)
            )
            
            if model:
                model_dict = dict(model) if hasattr(model, 'keys') else {
                    'id': model[0], 'provider': model[1], 'model_name': model[2],
                    'display_name': model[3], 'api_key': model[4], 'api_endpoint': model[5],
                    'is_local': model[6] if len(model) > 6 else 0
                }
                
                print(f"[AIAutoChat] ✓ 用途 '{usage_type}' 使用模型: {model_dict.get('display_name')} (ID={model_id}, provider={model_dict.get('provider')})", file=sys.stderr)
                return model_dict
            else:
                print(f"[AIAutoChat] ⚠ 模型 ID={model_id} 不存在", file=sys.stderr)
                return None
                
        except Exception as e:
            print(f"[AIAutoChat] 獲取模型配置失敗: {e}", file=sys.stderr)
            return None
    
    def set_callbacks(self, send_callback: Callable, log_callback: Callable = None,
                      event_callback: Callable = None):
        """Set callback functions"""
        self.send_callback = send_callback
        self.log_callback = log_callback
        self.event_callback = event_callback
    
    def log(self, message: str, level: str = "info"):
        """Log a message"""
        if self.log_callback:
            self.log_callback(message, level)
        else:
            print(f"[AIAutoChat] [{level}] {message}")
    
    def _emit_event(self, event_name: str, data: Dict[str, Any]):
        """🆕 發送事件到前端"""
        if self.event_callback:
            self.event_callback(event_name, data)
        else:
            print(f"[AIAutoChat] Event: {event_name} -> {data}", file=sys.stderr)
    
    async def update_settings(self, settings: Dict[str, Any]):
        """Update AI auto chat settings"""
        await db.update_ai_settings(settings)
        self.settings = await db.get_ai_settings()
    
    async def process_incoming_message(self, user_id: str, username: str,
                                         message: str, account_phone: str,
                                         source_group: str = None,
                                         first_name: str = None) -> Optional[str]:
        """
        Process an incoming message and generate a response if auto-chat is enabled
        
        Returns the response text if auto-reply should be sent, None otherwise
        """
        # Check if auto-chat is enabled (整數 0/1)
        auto_chat_enabled = self.settings.get('auto_chat_enabled', 0) == 1
        if not auto_chat_enabled:
            self.log(f"[AI] AI 自動聊天未啟用，跳過處理 (設置值: {self.settings.get('auto_chat_enabled', 0)})")
            return None
        
        mode = self.settings.get('auto_chat_mode', 'semi')
        self.log(f"[AI] 處理來自用戶 {user_id} 的消息，模式: {mode}")
        
        # Save incoming message to history
        await ai_context.add_message(
            user_id=user_id,
            role='user',
            content=message,
            account_phone=account_phone,
            source_group=source_group
        )
        
        # 分析消息並提取關鍵信息（自動更新用戶畫像、保存重要記憶）
        insights = await ai_context.analyze_and_extract_insights(user_id, message, role='user')
        
        # 更新基本用戶信息（用戶名、名字）
        await db.update_user_profile(user_id, {
            'username': username,
            'first_name': first_name or '',
        })
        
        # 記錄分析結果
        if insights.get('suggested_stage'):
            self.log(f"用戶 {user_id} 階段判斷: {insights['suggested_stage']}, 興趣度: {insights.get('interest_level', 0)}")
        if insights.get('auto_tags'):
            self.log(f"用戶 {user_id} 自動標籤: {', '.join(insights['auto_tags'])}")
        
        # Check conversation state
        state = await db.get_conversation_state(user_id)
        if state and not state.get('auto_reply_enabled', True):
            self.log(f"Auto-reply disabled for user {user_id}")
            return None
        
        # 使用策略管理器生成回復
        context = {
            'user_id': user_id,
            'username': username,
            'first_name': first_name,
            'conversation_count': await self._get_conversation_count(user_id),
            'funnel_stage': await self._get_funnel_stage(user_id)
        }
        
        # 使用策略生成回復
        response = await self.strategy_manager.generate_response(
            message, 
            context, 
            self
        )
        
        if not response:
            return None
        
        # 質量檢查
        quality_result = await self.quality_checker.check_quality(
            response,
            context,
            original_message=message
        )
        
        # 如果質量不足，重新生成（最多重試2次）
        if quality_result['should_regenerate']:
            self.log(f"回復質量不足（分數: {quality_result['quality_score']}），嘗試重新生成...", "warning")
            for attempt in range(2):
                retry_response = await self.strategy_manager.generate_response(
                    message,
                    context,
                    self
                )
                if retry_response:
                    retry_quality = await self.quality_checker.check_quality(
                        retry_response,
                        context,
                        original_message=message
                    )
                    if not retry_quality['should_regenerate']:
                        response = retry_response
                        self.log(f"重新生成成功（質量分數: {retry_quality['quality_score']}）", "success")
                        break
                    elif attempt == 1:
                        # 最後一次嘗試，使用更好的回復
                        if retry_quality['quality_score'] > quality_result['quality_score']:
                            response = retry_response
        
        if not response:
            return None
        
        # Handle based on mode
        if mode == 'full':
            # Full auto: send immediately with delay
            await self._delayed_send(user_id, response, account_phone, source_group, username)
            return response
        elif mode == 'semi':
            # Semi-auto: return response for human approval
            return response
        elif mode == 'assist':
            # Assist: just provide suggestion, don't send
            return response
        elif mode == 'keyword':
            # Keyword mode: only respond if certain conditions met
            # This is handled at a higher level
            return response
        
        return response
    
    async def _generate_response(self, user_id: str, user_message: str) -> Optional[str]:
        """Generate AI response using configured endpoint with RAG support"""
        return await self._generate_response_with_prompt(user_id, user_message, None)
    
    async def _generate_response_with_prompt(
        self, 
        user_id: str, 
        user_message: str, 
        custom_prompt: Optional[str] = None,
        usage_type: str = 'dailyChat'  # 🔧 FIX: 添加用途類型參數
    ) -> Optional[str]:
        """Generate AI response with custom prompt"""
        
        # 🆕 AI 自主決策引擎（無劇本化）
        autonomous_decision = None
        if self.autonomous_mode and self.autonomous_engine and usage_type == 'dailyChat':
            try:
                autonomous_decision = await self.autonomous_engine.analyze_and_decide(
                    user_id=user_id,
                    message=user_message
                )
                self.log(f"[自主引擎] 決策: action={autonomous_decision.action.value}, "
                        f"style={autonomous_decision.persona_style}, "
                        f"confidence={autonomous_decision.confidence:.2f}")
                
                # 使用自主引擎的 prompt 增強
                if not custom_prompt:
                    custom_prompt = autonomous_decision.prompt_enhancement
                
                # 處理協作觸發
                if autonomous_decision.collaboration:
                    self._emit_event('ai-collaboration-trigger', {
                        'user_id': user_id,
                        'role': autonomous_decision.collaboration.value,
                        'reasoning': autonomous_decision.reasoning
                    })
                
                # 處理創建群組
                if autonomous_decision.create_group:
                    self._emit_event('ai-create-group', {
                        'user_id': user_id,
                        'reasoning': autonomous_decision.reasoning
                    })
                
                # 處理人工通知
                if autonomous_decision.notify_human:
                    self._emit_event('ai-notify-human', {
                        'user_id': user_id,
                        'reasoning': autonomous_decision.reasoning
                    })
                    
            except Exception as e:
                self.log(f"[自主引擎] 決策失敗: {e}", "error")
        
        # 🔧 FIX: 獲取該用途對應的 AI 模型配置
        usage_model_config = await self.get_model_for_usage(usage_type)
        
        if usage_model_config:
            self.log(f"[生成回覆] ✓ 使用 '{usage_type}' 模型: {usage_model_config.get('display_name')} (ID={usage_model_config.get('id')})")
        else:
            self.log(f"[生成回覆] ⚠ '{usage_type}' 未配置專用模型，使用默認模型")
        
        # 🔧 詳細診斷日誌
        self.log(f"[生成回覆] 開始: user_id={user_id}, message={user_message[:30]}...")
        
        # 檢查是否有可用的模型
        has_model = usage_model_config or self.local_ai_endpoint
        
        if not has_model:
            self.log("[生成回覆] ❌ 無可用 AI 模型，嘗試重新初始化...", "warning")
            # 🔧 嘗試重新初始化
            await self.initialize()
            usage_model_config = await self.get_model_for_usage(usage_type)
            has_model = usage_model_config or self.local_ai_endpoint
            
            if not has_model:
                self.log("[生成回覆] ❌ 重新初始化後仍無可用模型", "error")
                return None
            self.log(f"[生成回覆] ✓ 重新初始化成功")
        
        try:
            # Build base system prompt
            if custom_prompt:
                system_prompt = custom_prompt
            else:
                system_prompt = self.settings.get('system_prompt', '')
                if not system_prompt:
                    # 🔧 P1 優化: 優化默認 prompt - 添加防重複約束 + 對話推進要求
                    system_prompt = """你是專業且友好的業務顧問。

【核心規則 - 必須遵守】
1. ⚠️ 必須直接回答用戶的問題 - 這是最重要的規則
2. 如果用戶問"你有什麼"或類似問題，必須介紹你的業務/服務
3. 根據對話歷史理解上下文，不要答非所問
4. 回覆簡短自然（20-80字），像朋友聊天
5. 語氣輕鬆專業，用"你"不用"您"
6. 可以適當用emoji，但不要太多

【業務知識】
- 我們提供：支付解決方案、跨境收款、U兌換、代收代付
- 優勢：費率低、速度快、安全可靠
- 如果用戶詢問具體價格，可以說"看量的，量大更優惠"

【🔴 對話推進規則 - 極其重要】
1. ⚠️ 禁止重複已說過的內容 - 如果你之前介紹過服務，下次要更深入
2. ⚠️ 每輪回覆必須推進對話 - 不要停留在相同信息層級
3. 如果用戶追問同一話題，提供：更具體的數字/案例/細節
4. 如果用戶說"給我方案"，給出具體方案而非泛泛介紹
5. 根據用戶的回應調整策略，不要機械重複

【對話推進示例】
- 第一次問服務 → 簡單介紹三大類
- 第二次追問 → 根據興趣深入某一類
- 第三次 → 給出具體費率/流程/案例
- 第四次 → 推動成交/要聯繫方式

【禁止行為】
- 不要說"請問還有什麼需要幫助"
- 不要反問太多，先給信息
- 不要回避問題或答非所問
- 不要生成過長回覆
- ❌ 不要重複上一條回覆的開頭或核心內容"""
            
            # === 🔧 Phase 6: 強化知識庫查詢（優先使用知識庫） ===
            knowledge_context = ""
            # 🆕 P1-2: 清空並記錄本次使用的知識
            self.last_knowledge_used = []
            self.last_knowledge_source = None
            
            # 🔧 Phase 6: 詳細日誌
            self.log(f"[Knowledge] 🔍 開始查詢知識庫，關鍵詞: {user_message[:50]}...")
            
            try:
                knowledge_items = await db.search_knowledge(user_message, limit=3)
                self.log(f"[Knowledge] 📊 ai_knowledge_base 查詢結果: {len(knowledge_items) if knowledge_items else 0} 條")
                
                if knowledge_items:
                    knowledge_parts = []
                    for item in knowledge_items:
                        title = item.get('title', '')
                        content = item.get('content', '')
                        knowledge_parts.append(f"- {title}: {content}")
                        self.log(f"[Knowledge] 📖 使用知識: {title[:30]}...")
                        # 增加使用計數
                        await db.increment_knowledge_use(item.get('id'))
                        # 🆕 P1-2: 記錄使用的知識
                        self.last_knowledge_used.append({
                            'id': item.get('id'),
                            'title': title,
                            'content': content[:100],
                            'source': 'KnowledgeBase'
                        })
                    knowledge_context = "\n【業務知識參考 - 必須使用以下信息回答】\n" + "\n".join(knowledge_parts)
                    self.last_knowledge_source = 'KnowledgeBase'
                    self.log(f"[Knowledge] ✓ 找到 {len(knowledge_items)} 條相關知識，已添加到 prompt")
                else:
                    self.log(f"[Knowledge] ⚠ ai_knowledge_base 無匹配結果，嘗試 RAG 系統...")
            except Exception as e:
                self.log(f"[Knowledge] ❌ 查詢知識庫錯誤: {e}", "warning")
            
            # === RAG: 獲取相關知識庫內容 ===
            rag_context = ""
            rag_enabled = self.settings.get('rag_enabled', True)
            self.log(f"[RAG] 🔍 RAG 查詢: enabled={rag_enabled}, RAG_AVAILABLE={RAG_AVAILABLE}")
            
            if rag_enabled:
                # 方法1：使用新的 TelegramRAG 系統（優先）
                if RAG_AVAILABLE:
                    try:
                        self.log(f"[RAG] 🔍 調用 telegram_rag.build_rag_context...")
                        rag_context = await telegram_rag.build_rag_context(
                            user_message=user_message,
                            user_id=user_id,
                            max_items=3,
                            max_tokens=800
                        )
                        if rag_context:
                            self.log(f"[RAG] ✓ TelegramRAG 找到知識: {rag_context[:80]}...")
                            # 🆕 P1-2: 記錄 RAG 知識
                            if not self.last_knowledge_source:
                                self.last_knowledge_source = 'RAG'
                            self.last_knowledge_used.append({
                                'source': 'RAG',
                                'content': rag_context[:150] + '...' if len(rag_context) > 150 else rag_context
                            })
                        else:
                            self.log(f"[RAG] ⚠ TelegramRAG 返回空結果")
                    except Exception as e:
                        self.log(f"[RAG] ❌ TelegramRAG 錯誤: {e}", "warning")
                
                # 方法2：從 knowledge_learner（備用）
                if not rag_context:
                    try:
                        from knowledge_learner import knowledge_learner
                        learned_context = await knowledge_learner.get_relevant_context(user_message, user_id)
                        if learned_context:
                            rag_context += f"\n\n{learned_context}"
                            self.log(f"[RAG] 找到學習知識", "info")
                    except Exception as e:
                        self.log(f"Knowledge learner error: {e}", "warning")
                
                # 方法3：從靜態知識庫
                if not rag_context:
                    try:
                        from knowledge_base import search_engine
                        rag_result = await search_engine.build_rag_context(user_message, max_chunks=3)
                        if rag_result:
                            rag_context += f"\n\n[知識庫參考]\n{rag_result}"
                    except Exception as e:
                        self.log(f"RAG error: {e}", "warning")
                
                if rag_context:
                    rag_context += "\n請參考以上信息回答，但不要直接複製。"
            
            # 添加知識庫和 RAG 上下文到系統提示
            full_system_prompt = system_prompt + knowledge_context + rag_context
            
            # === 🔧 P0 優化: 接入對話記憶系統 ===
            memory_context = ""
            if MEMORY_AVAILABLE:
                try:
                    memory_service = get_memory_service()
                    memory_context = await memory_service.generate_memory_prompt(user_id, user_message)
                    if memory_context:
                        full_system_prompt += f"\n\n{memory_context}"
                        self.log(f"[Memory] 載入對話記憶上下文", "info")
                except Exception as mem_err:
                    self.log(f"[Memory] 記憶系統錯誤: {mem_err}", "warning")
            
            # === 🆕 P0 優化: 載入操作上下文（群邀請等） ===
            if MEMORY_AVAILABLE:
                try:
                    memory_service = get_memory_service()
                    action_context = await memory_service.generate_action_context_prompt(user_id)
                    if action_context:
                        full_system_prompt += f"\n\n{action_context}"
                        self.log(f"[ActionContext] 載入操作上下文", "info")
                except Exception as action_err:
                    self.log(f"[ActionContext] 載入操作上下文失敗: {action_err}", "warning")
            
            # === 🆕 P2-2 優化: 載入統一對話策略（私聊/群聊協調） ===
            if MEMORY_AVAILABLE:
                try:
                    memory_service = get_memory_service()
                    strategy_context = await memory_service.get_unified_strategy_prompt(user_id, 'private')
                    if strategy_context:
                        full_system_prompt += f"\n\n{strategy_context}"
                        self.log(f"[Strategy] 載入統一對話策略", "info")
                except Exception as strat_err:
                    self.log(f"[Strategy] 載入策略失敗: {strat_err}", "warning")
            
            # === 🔧 P0 優化: 添加回覆去重機制 ===
            try:
                recent_ai_messages = await self._get_recent_ai_messages(user_id, limit=5)
                if recent_ai_messages:
                    covered_topics = self._extract_covered_topics(recent_ai_messages)
                    anti_repeat_prompt = self._build_anti_repeat_prompt(covered_topics, recent_ai_messages)
                    if anti_repeat_prompt:
                        full_system_prompt += anti_repeat_prompt
                        self.log(f"[Anti-Repeat] 已涵蓋話題: {covered_topics}", "info")
            except Exception as ar_err:
                self.log(f"[Anti-Repeat] 錯誤: {ar_err}", "warning")
            
            # === 獲取用戶畫像和漏斗階段 ===
            profile = await db.get_user_profile(user_id)
            if profile:
                stage = profile.get('funnel_stage', 'new')
                interest = profile.get('interest_level', 1)
                stage_hint = self._get_stage_prompt(stage, interest)
                if stage_hint:
                    full_system_prompt += f"\n\n[用戶階段提示]\n{stage_hint}"
            
            max_context = self.settings.get('max_context_messages', 20)
            
            # 🔧 Phase 1 診斷：追蹤上下文構建
            self.log(f"[生成回覆] 📍 準備構建上下文...")
            
            try:
                messages = await ai_context.build_context(
                    user_id=user_id,
                    system_prompt=full_system_prompt,
                    max_messages=max_context
                )
                self.log(f"[生成回覆] ✓ 上下文構建完成，消息數: {len(messages) if messages else 0}")
            except Exception as ctx_err:
                self.log(f"[生成回覆] ❌ 上下文構建失敗: {ctx_err}", "error")
                # 使用簡化的消息列表
                messages = [
                    {"role": "system", "content": full_system_prompt[:2000]},
                    {"role": "user", "content": user_message}
                ]
                self.log(f"[生成回覆] 使用簡化消息列表")
            
            # Add current message if not already in context
            if not messages or messages[-1].get('content') != user_message:
                messages.append({
                    "role": "user",
                    "content": user_message
                })
            
            # 🔧 診斷：顯示即將發送的消息
            self.log(f"[生成回覆] 📤 調用 API，消息數: {len(messages)}, prompt長度: {len(full_system_prompt)}")
            
            # 🔧 FIX: 傳遞用途對應的模型配置
            response_text = await self._call_ai_api(messages, model_config=usage_model_config)
            
            # 🔧 診斷：顯示 API 返回結果
            if response_text:
                self.log(f"[生成回覆] ✓ API 返回: {response_text[:50]}...")
            else:
                self.log(f"[生成回覆] ❌ API 返回空值", "warning")
            
            if response_text:
                # Save user message to history (永久記憶)
                await ai_context.add_message(
                    user_id=user_id,
                    role='user',
                    content=user_message
                )
                
                # Save AI response to history (永久記憶)
                await ai_context.add_message(
                    user_id=user_id,
                    role='assistant',
                    content=response_text
                )
                
                # 分析對話並自動更新漏斗階段
                await self._analyze_and_update_stage(user_id, user_message, response_text)
                
                # 提取重要信息保存為長期記憶
                await self._extract_memories(user_id, user_message, response_text)
                
                # 🔧 P2 優化: 更新話題追蹤
                await self._update_topic_tracking(user_id, user_message, response_text)
            
            return response_text
            
        except Exception as e:
            self.log(f"Error generating response: {str(e)}", "error")
            return None
    
    def _get_stage_prompt(self, stage: str, interest: int) -> str:
        """根據用戶階段返回提示"""
        prompts = {
            'new': '這是新用戶，友好問候並了解需求。',
            'contacted': '已發送過消息，等待回復中。',
            'replied': '用戶已回復，繼續深入交流。',
            'interested': f'用戶感興趣（興趣度:{interest}/5），可以介紹更多細節。',
            'negotiating': '正在洽談價格，強調價值並提供優惠。',
            'follow_up': '需要跟進，發送溫和提醒。',
            'converted': '已成交客戶，提供售後支持。',
            'churned': '用戶可能流失，保持禮貌並留下好印象。',
        }
        return prompts.get(stage, '')
    
    async def _get_conversation_count(self, user_id: str) -> int:
        """獲取對話次數"""
        try:
            cursor = await db._connection.execute("""
                SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?
            """, (user_id,))
            row = await cursor.fetchone()
            return row['count'] if row else 0
        except:
            return 0
    
    async def _get_funnel_stage(self, user_id: str) -> str:
        """獲取用戶漏斗階段"""
        try:
            profile = await db.get_user_profile(user_id)
            return profile.get('funnel_stage', 'new') if profile else 'new'
        except:
            return 'new'
    
    async def _extract_memories(self, user_id: str, message: str, ai_response: str = ""):
        """從對話中提取重要信息保存為記憶"""
        # 🆕 Phase1: 使用新的記憶服務
        if self.autonomous_engine and self.autonomous_engine.memory_service:
            try:
                await self.autonomous_engine.memory_service.extract_and_store_memories(
                    user_id, message, ai_response
                )
                return
            except Exception as e:
                print(f"[AIAutoChat] 新記憶服務失敗，使用舊版: {e}", file=sys.stderr)
        
        # 舊版邏輯（兼容）
        keywords = {
            'preference': ['喜歡', '想要', '需要', '偏好', '愛', 'like', 'want', 'prefer'],
            'fact': ['我是', '我在', '我做', '我有', '我的', "i'm", 'i am', 'my'],
        }
        
        msg_lower = message.lower()
        for mem_type, kws in keywords.items():
            if any(kw in msg_lower for kw in kws):
                await db.add_ai_memory(
                    user_id=user_id,
                    memory_type=mem_type,
                    content=message[:200],
                    importance=0.6
                )
                break
    
    async def _call_ai_api(self, messages: List[Dict[str, str]], model_config: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Call the AI API endpoint - 支持多種 AI 提供商
        
        Args:
            messages: 消息列表
            model_config: 🔧 可選的動態模型配置（覆蓋默認配置）
        """
        import sys
        print(f"[AIAutoChat] ⚡ _call_ai_api 被調用，model_config={'有' if model_config else '無'}", file=sys.stderr)
        try:
            # 🔧 FIX: 優先使用傳入的模型配置
            if model_config:
                provider = model_config.get('provider', 'custom')
                api_key = model_config.get('api_key', '')
                endpoint = model_config.get('api_endpoint', '')
                model_name = model_config.get('model_name', '')
                display_name = model_config.get('display_name', model_name)
                
                # 構建端點 URL
                if not endpoint:
                    if provider == 'openai':
                        endpoint = 'https://api.openai.com/v1/chat/completions'
                    elif provider == 'claude':
                        endpoint = 'https://api.anthropic.com/v1/messages'
                    elif provider == 'gemini':
                        endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent'
                
                self.log(f"🔧 [動態配置] 使用模型: {display_name} (provider={provider})")
            else:
                provider = getattr(self, 'provider', 'custom')
                api_key = getattr(self, 'api_key', '')
                endpoint = self.local_ai_endpoint
                model_name = self.local_ai_model
                display_name = model_name
            
            import sys
            print(f"[AIAutoChat] 📤 調用 AI API: provider={provider}, model={model_name}, endpoint={endpoint[:80] if endpoint else 'None'}...", file=sys.stderr)
            
            # 🔧 FIX: 使用 endpoint 變量而不是 self.local_ai_endpoint
            if not endpoint and provider not in ['openai', 'claude', 'gemini']:
                self.log("AI endpoint 未配置，使用備用回覆", "warning")
                return self._get_fallback_response(messages)
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                
                # ========== OpenAI API ==========
                if provider == 'openai':
                    openai_endpoint = 'https://api.openai.com/v1/chat/completions'
                    headers = {
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json'
                    }
                    
                    # 🔧 Phase 1 診斷：限制消息數量和長度
                    limited_messages = messages[-10:] if len(messages) > 10 else messages
                    total_chars = sum(len(m.get('content', '')) for m in limited_messages)
                    
                    # 🔧 Phase 2：如果消息過長，截斷
                    if total_chars > 8000:
                        self.log(f"⚠️ 消息過長 ({total_chars} 字符)，進行截斷", "warning")
                        for m in limited_messages:
                            if len(m.get('content', '')) > 2000:
                                m['content'] = m['content'][:2000] + '...[已截斷]'
                    
                    request_data = {
                        "model": model_name or "gpt-4o-mini",
                        "messages": limited_messages,
                        "max_tokens": 500,
                        "temperature": 0.7
                    }
                    
                    # 🔧 Phase 1 診斷：詳細日誌
                    self.log(f"📤 OpenAI 請求: model={model_name}, messages={len(limited_messages)}, total_chars={total_chars}")
                    self.log(f"📤 最後一條用戶消息: {limited_messages[-1].get('content', '')[:100]}...")
                    
                    async with session.post(openai_endpoint, headers=headers, json=request_data) as response:
                        response_text = await response.text()
                        
                        # 🔧 Phase 1 診斷：記錄完整響應
                        self.log(f"📥 OpenAI 響應: status={response.status}, length={len(response_text)}")
                        
                        if response.status == 200:
                            try:
                                result = json.loads(response_text)
                                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                                
                                # 🔧 Phase 1 診斷：檢查 finish_reason
                                finish_reason = result.get('choices', [{}])[0].get('finish_reason', 'unknown')
                                self.log(f"📥 finish_reason={finish_reason}")
                                
                                if content:
                                    self.log(f"✅ OpenAI 回覆成功: {content[:80]}...")
                                    return content
                                else:
                                    self.log(f"❌ OpenAI 返回空 content，完整響應: {response_text[:300]}", "warning")
                            except json.JSONDecodeError as je:
                                self.log(f"❌ OpenAI 響應 JSON 解析失敗: {je}, 原始: {response_text[:200]}", "error")
                        else:
                            self.log(f"❌ OpenAI 錯誤 {response.status}: {response_text[:200]}", "error")
                            
                            # 🔧 Phase 1：特殊錯誤處理
                            if response.status == 401:
                                self.log("❌ API Key 無效或已過期", "error")
                            elif response.status == 429:
                                self.log("❌ API 請求過於頻繁，請稍後再試", "error")
                            elif response.status == 402:
                                self.log("❌ API 餘額不足", "error")
                
                # ========== Claude API ==========
                elif provider == 'claude':
                    claude_endpoint = 'https://api.anthropic.com/v1/messages'
                    headers = {
                        'x-api-key': api_key,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    }
                    # Claude 格式轉換
                    claude_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
                    system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
                    
                    request_data = {
                        "model": model_name or "claude-3-5-sonnet-latest",  # 🔧 FIX
                        "max_tokens": 500,
                        "messages": claude_messages
                    }
                    if system_msg:
                        request_data["system"] = system_msg
                    
                    self.log(f"調用 Claude: {model_name}")
                    async with session.post(claude_endpoint, headers=headers, json=request_data) as response:
                        if response.status == 200:
                            result = await response.json()
                            content = result.get('content', [{}])[0].get('text', '')
                            if content:
                                self.log(f"✓ Claude 回覆: {content[:50]}...")
                                return content
                        else:
                            text = await response.text()
                            self.log(f"Claude 錯誤 {response.status}: {text[:100]}", "warning")
                
                # ========== Gemini API ==========
                elif provider == 'gemini':
                    gemini_model = model_name or 'gemini-1.5-flash-latest'  # 🔧 FIX
                    gemini_endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}'
                    
                    # Gemini 格式轉換
                    gemini_contents = []
                    for m in messages:
                        if m["role"] == "system":
                            continue  # Gemini 不支持 system role，會合併到第一條 user 消息
                        role = "user" if m["role"] == "user" else "model"
                        gemini_contents.append({"role": role, "parts": [{"text": m["content"]}]})
                    
                    request_data = {
                        "contents": gemini_contents,
                        "generationConfig": {"maxOutputTokens": 500, "temperature": 0.7}
                    }
                    
                    self.log(f"調用 Gemini: {gemini_model}")
                    async with session.post(gemini_endpoint, json=request_data) as response:
                        if response.status == 200:
                            result = await response.json()
                            content = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                            if content:
                                self.log(f"✓ Gemini 回覆: {content[:50]}...")
                                return content
                        else:
                            text = await response.text()
                            self.log(f"Gemini 錯誤 {response.status}: {text[:100]}", "warning")
                
                # ========== 自定義/本地 AI (OpenAI 兼容格式) ==========
                else:
                    import sys
                    print(f"[AIAutoChat] 🔧 進入 Custom AI 分支: provider={provider}, endpoint={endpoint[:80] if endpoint else 'None'}...", file=sys.stderr)
                    
                    request_data = {
                        "model": model_name or "default",  # 🔧 FIX
                        "messages": messages,
                        "max_tokens": 500,
                        "temperature": 0.7,
                        "stream": False
                    }
                    
                    print(f"[Custom AI] 準備請求: model={model_name}, messages_count={len(messages)}", file=sys.stderr)
                    
                    # 🔧 FIX: 使用 endpoint 變量
                    base_endpoint = endpoint.rstrip('/') if endpoint else ''
                    
                    if not base_endpoint:
                        self.log("[Custom AI] ❌ 無有效端點", "error")
                        return self._get_fallback_response(messages)
                    
                    endpoints_to_try = []
                    is_ollama = ':11434' in base_endpoint or '.ts.net' in base_endpoint
                    
                    if '/v1/chat/completions' in base_endpoint or '/chat/completions' in base_endpoint:
                        endpoints_to_try.append(base_endpoint)
                        self.log(f"[Custom AI] 檢測到 chat/completions 格式")
                    elif '/api/generate' in base_endpoint or '/api/chat' in base_endpoint:
                        endpoints_to_try.append(base_endpoint)
                        self.log(f"[Custom AI] 檢測到 api/chat 格式")
                        # 🔧 FIX: Ollama 需要特殊的請求格式
                        if is_ollama or '/api/chat' in base_endpoint:
                            request_data = {
                                "model": model_name or "llama3",
                                "messages": messages,
                                "stream": False,
                                "options": {"num_predict": 500}
                            }
                            self.log(f"[Custom AI] 使用 Ollama 請求格式")
                    elif is_ollama:
                        # 🔧 FIX: 檢測到 Ollama 端口，使用 /api/chat
                        endpoints_to_try = [f"{base_endpoint}/api/chat"]
                        request_data = {
                            "model": model_name or "llama3",
                            "messages": messages,
                            "stream": False,
                            "options": {"num_predict": 500}
                        }
                        self.log(f"[Custom AI] 檢測到 Ollama，使用 /api/chat 格式")
                    else:
                        endpoints_to_try = [
                            f"{base_endpoint}/v1/chat/completions",
                            f"{base_endpoint}/chat/completions",
                            base_endpoint
                        ]
                        self.log(f"[Custom AI] 將嘗試 {len(endpoints_to_try)} 個端點")
                    
                    headers = {'Content-Type': 'application/json'}
                    if api_key:
                        headers['Authorization'] = f'Bearer {api_key}'
                    
                    for endpoint in endpoints_to_try:
                        try:
                            print(f"[Custom AI] 🌐 嘗試 endpoint: {endpoint}", file=sys.stderr)
                            async with session.post(endpoint, headers=headers, json=request_data) as response:
                                print(f"[Custom AI] 📥 響應狀態: {response.status}", file=sys.stderr)
                                
                                if response.status == 200:
                                    # 🔧 診斷：先獲取原始文本
                                    raw_text = await response.text()
                                    print(f"[Custom AI] 📄 原始響應長度: {len(raw_text)}", file=sys.stderr)
                                    print(f"[Custom AI] 📄 原始響應前500字: {raw_text[:500]}", file=sys.stderr)
                                    
                                    try:
                                        import json
                                        result = json.loads(raw_text)
                                        print(f"[Custom AI] 📄 響應格式: {list(result.keys()) if isinstance(result, dict) else type(result)}", file=sys.stderr)
                                    except Exception as json_err:
                                        print(f"[Custom AI] ❌ JSON 解析失敗: {json_err}", file=sys.stderr)
                                        continue
                                    
                                    # OpenAI format
                                    if 'choices' in result:
                                        content = result['choices'][0]['message']['content']
                                        self.log(f"✓ 回覆 (OpenAI格式): {content[:50]}...")
                                        return content
                                    # Ollama format (message object)
                                    if 'message' in result:
                                        msg_obj = result['message']
                                        print(f"[Custom AI] 📄 message 類型: {type(msg_obj)}, 值: {str(msg_obj)[:200]}", file=sys.stderr)
                                        
                                        if isinstance(msg_obj, dict):
                                            content = msg_obj.get('content', '')
                                        elif isinstance(msg_obj, str):
                                            content = msg_obj  # 🔧 修復：message 可能直接是字串
                                        else:
                                            content = str(msg_obj) if msg_obj else ''
                                        
                                        print(f"[Custom AI] 📄 提取的 content: {content[:100] if content else 'EMPTY'}", file=sys.stderr)
                                        
                                        if content:
                                            self.log(f"✓ 回覆 (Ollama message格式): {content[:50]}...")
                                            return content
                                        else:
                                            print(f"[Custom AI] ❌ message 對象中 content 為空", file=sys.stderr)
                                    # Ollama format (response string)
                                    if 'response' in result:
                                        content = result['response']
                                        self.log(f"✓ 回覆 (response格式): {content[:50]}...")
                                        return content
                                    # Direct content
                                    if 'content' in result:
                                        content = result['content']
                                        self.log(f"✓ 回覆 (直接格式): {content[:50]}...")
                                        return content
                                    
                                    # 🔧 嘗試更多格式
                                    self.log(f"[Custom AI] 未識別的響應格式，嘗試解析: {str(result)[:200]}", "warning")
                                    # 嘗試遞歸查找 content
                                    if isinstance(result, dict):
                                        for key in ['text', 'output', 'result', 'generated_text']:
                                            if key in result:
                                                content = result[key]
                                                if content:
                                                    self.log(f"✓ 回覆 ({key}格式): {content[:50]}...")
                                                    return content
                                else:
                                    text = await response.text()
                                    self.log(f"[Custom AI] 錯誤 {response.status}: {text[:200]}", "warning")
                                    
                        except asyncio.TimeoutError:
                            self.log(f"[Custom AI] Endpoint {endpoint} 超時", "warning")
                            continue
                        except Exception as e:
                            self.log(f"[Custom AI] Endpoint {endpoint} 錯誤: {e}", "warning")
                            import traceback
                            traceback.print_exc(file=__import__('sys').stderr)
                            continue
            
            self.log("所有 AI endpoints 都失敗，使用備用回覆", "warning")
            return self._get_fallback_response(messages)
            
        except Exception as e:
            self.log(f"AI API 調用錯誤: {str(e)}", "error")
            return self._get_fallback_response(messages)
    
    def _get_fallback_response(self, messages: List[Dict[str, str]]) -> str:
        """當 AI 服務不可用時的備用回覆"""
        import random
        
        # 獲取最後一條用戶消息
        last_user_msg = ""
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_msg = msg.get('content', '').lower()
                break
        
        # 基於關鍵詞的簡單回覆
        if any(kw in last_user_msg for kw in ['你好', 'hi', 'hello', '嗨']):
            responses = ['你好呀～ 😊', '嗨嗨！有什麼可以幫你的嗎？', '你好！很高興認識你～']
        elif any(kw in last_user_msg for kw in ['謝謝', 'thanks', 'thank']):
            responses = ['不客氣！', '沒事的～ 😄', '很高興能幫到你！']
        elif any(kw in last_user_msg for kw in ['？', '?', '嗎', '什麼', '怎麼']):
            responses = ['讓我想想...你可以說詳細一點嗎？', '這個問題很好，我需要了解更多～', '能告訴我更多細節嗎？']
        elif any(kw in last_user_msg for kw in ['價格', '多少錢', '費用']):
            responses = ['價格會根據需求有所不同，你具體想了解哪方面的呢？', '這個要看具體需求，方便說說你的情況嗎？']
        else:
            responses = [
                '好的，我明白了～',
                '嗯嗯，繼續說？',
                '收到！還有什麼想聊的嗎？',
                '了解～ 😊',
                '好的，有什麼需要幫忙的嗎？'
            ]
        
        return random.choice(responses)
    
    async def _delayed_send(self, user_id: str, response: str, 
                             account_phone: str, source_group: str, username: str):
        """Send response with realistic delay"""
        # Calculate delay
        delay_min = self.settings.get('reply_delay_min', 2)
        delay_max = self.settings.get('reply_delay_max', 8)
        delay = random.uniform(delay_min, delay_max)
        
        # Add typing simulation delay based on message length
        typing_speed = self.settings.get('typing_speed', 50)  # chars per minute
        if typing_speed > 0:
            typing_time = len(response) / typing_speed * 60
            delay += min(typing_time, 10)  # Cap typing delay at 10 seconds
        
        self.log(f"Waiting {delay:.1f}s before sending to {username}")
        await asyncio.sleep(delay)
        
        # Send via callback
        if self.send_callback:
            try:
                result = await self.send_callback(
                    account_phone=account_phone,
                    target_user_id=user_id,
                    message=response,
                    source_group=source_group,
                    username=username
                )
                if result:
                    self.log(f"✓ Auto-replied to {username}: {response[:50]}...")
                else:
                    self.log(f"✗ Auto-reply failed for {username}", "warning")
            except Exception as e:
                self.log(f"Error in send callback: {e}", "error")
    
    async def _analyze_and_update_stage(self, user_id: str, user_msg: str, ai_response: str):
        """分析對話並自動更新漏斗階段"""
        try:
            # 獲取完整聊天歷史
            history = await db.get_chat_history(user_id, limit=20)
            
            # 使用 AI 上下文管理器分析階段
            analysis = await ai_context.analyze_conversation_stage(user_id, history)
            
            new_stage = analysis.get('stage', 'replied')
            interest = analysis.get('interest_level', 2)
            
            # 更新漏斗階段
            await db.update_funnel_stage(
                user_id=user_id, 
                stage=new_stage,
                reason=f"自動分析: {analysis.get('suggestions', [''])[0]}"
            )
            
            # 更新興趣程度
            await db.update_user_interest(user_id, interest)
            
            self.log(f"[漏斗] 用戶 {user_id} 階段更新: {new_stage}, 興趣度: {interest}/5")
            
            # 發送漏斗更新事件到前端
            if self.event_callback:
                self.event_callback("funnel-updated", {
                    "userId": user_id,
                    "stage": new_stage,
                    "stageName": analysis.get('stage_name'),
                    "interestLevel": interest,
                    "suggestions": analysis.get('suggestions', [])
                })
                
        except Exception as e:
            self.log(f"Error analyzing stage: {e}", "error")
    
    async def handle_auto_greeting(self, user_id: str, username: str,
                                     account_phone: str, source_group: str = None,
                                     first_name: str = None,
                                     triggered_keyword: str = None) -> Optional[str]:
        """
        Handle automatic greeting for new users
        
        個性化問候邏輯：
        1. 根據觸發關鍵詞選擇相關問候
        2. 識別老用戶發送不同問候
        3. 使用用戶名稱個性化
        """
        # 檢查自動問候設置 (整數 0/1)
        auto_greeting_enabled = self.settings.get('auto_greeting', 0) == 1
        if not auto_greeting_enabled:
            self.log(f"[問候] 自動問候未啟用 (設置值: {self.settings.get('auto_greeting', 0)})")
            return None
        
        self.log(f"[問候] 開始為用戶 {user_id} (@{username}) 生成問候...")
        import random
        name = first_name or username or ''
        keyword = (triggered_keyword or '').lower()
        
        # Check if we've already greeted this user (老用戶識別)
        profile = await db.get_user_profile(user_id)
        is_returning_user = profile and profile.get('total_messages', 0) > 0
        
        # 老用戶識別
        if is_returning_user:
            previous_stage = profile.get('funnel_stage', 'new')
            last_interaction = profile.get('last_interaction')
            
            # 老用戶個性化問候
            returning_greetings = [
                f"嗨 {name}！好久不見~ 😊",
                f"Hi {name}~ 又見面啦！",
                f"{name}，歡迎回來！有什麼新需求嗎？",
                f"哈囉 {name}！上次聊得怎麼樣？",
            ]
            
            # 根據之前的階段調整問候
            if previous_stage == 'interested':
                returning_greetings.append(f"{name}，上次你對這個挺感興趣的，還有什麼想了解的？")
            elif previous_stage == 'negotiating':
                returning_greetings.append(f"Hi {name}！之前聊的事情考慮得怎麼樣了？")
            
            greeting = random.choice(returning_greetings) if name else "嗨~ 歡迎回來！"
            return greeting
        
        # ========== 新用戶問候 - 根據關鍵詞個性化 ==========
        
        # 關鍵詞分類問候模板
        keyword_greetings = {
            # 換匯相關
            '換匯': [
                f"嗨 {name}！看到你對換匯有需求，請問要換什麼幣種呢？",
                f"Hi {name}~ 換匯這邊可以幫你，你想換多少？",
                f"{name}，有換匯需求嗎？今天匯率不錯喔 😊",
            ],
            '換U': [
                f"嗨 {name}！要換U嗎？USDT/CNY今天匯率很好~",
                f"Hi {name}~ U這邊有，你需要多少？",
            ],
            'usdt': [
                f"嗨 {name}！需要USDT嗎？可以聊聊~",
                f"Hi~ USDT這邊可以操作，{name}你需要買還是賣？",
            ],
            
            # 支付相關
            '支付': [
                f"嗨 {name}！看到你需要支付方面的幫助，是什麼類型的支付呢？",
                f"Hi {name}~ 支付這塊我可以幫你，是跨境還是本地的？",
            ],
            '付款': [
                f"嗨 {name}！付款這邊可以幫你處理~",
                f"Hi~ {name}有什麼付款需求嗎？",
            ],
            
            # 投資相關
            '投資': [
                f"嗨 {name}！對投資有興趣嗎？可以聊聊~",
                f"Hi {name}~ 想了解什麼類型的投資呢？",
            ],
            '理財': [
                f"嗨 {name}！理財這邊有很多選擇，你偏好什麼類型？",
            ],
            
            # 通用查詢
            '了解': [
                f"嗨 {name}！想了解什麼呢？我來給你介紹~",
                f"Hi~ {name}有什麼想了解的，盡管問！",
            ],
            '諮詢': [
                f"嗨 {name}！有什麼需要諮詢的嗎？",
                f"Hi {name}~ 這邊可以幫你解答~",
            ],
        }
        
        # 嘗試匹配關鍵詞模板
        greeting = None
        for kw, templates in keyword_greetings.items():
            if kw.lower() in keyword:
                greeting = random.choice(templates)
                break
        
        # 如果沒有匹配到關鍵詞，使用通用問候
        if not greeting:
            # 使用用戶設置的問候語
            greeting = self.settings.get('greeting_message', '')
            
            if not greeting:
                # 通用問候
                general_greetings = [
                    f"嗨 {name}！看到你的消息了 😊 有什麼可以幫你的？",
                    f"Hi {name}~ 歡迎歡迎！需要什麼服務嗎？",
                    f"哈囉 {name}！有什麼想了解的嗎？",
                    f"嗨~ 需要幫忙嗎？我這邊可以協助你 ☺️",
                ]
                greeting = random.choice(general_greetings) if name else "嗨~ 有什麼可以幫你的？"
        
        # Replace placeholders
        greeting = greeting.replace('{username}', username or '')
        greeting = greeting.replace('{firstName}', first_name or '')
        greeting = greeting.replace('{name}', name)
        greeting = greeting.replace('{keyword}', triggered_keyword or '')
        
        return greeting
    
    async def get_suggested_response(self, user_id: str, user_message: str) -> Optional[str]:
        """Get a suggested response without sending it (for assist mode)"""
        # 🔧 首先嘗試完整流程
        try:
            result = await self._generate_response(user_id, user_message)
            if result:
                return result
        except Exception as e:
            self.log(f"[get_suggested_response] 完整流程失敗: {e}", "warning")
        
        # 🔧 如果失敗，嘗試簡化的純淨模式
        self.log("[get_suggested_response] 嘗試純淨模式...", "info")
        return await self._generate_simple_response(user_message)
    
    async def _generate_simple_response(self, user_message: str) -> Optional[str]:
        """
        🔧 純淨模式：直接調用 AI API，不經過 RAG/記憶/質量檢查
        用於診斷和備用
        """
        try:
            # 確保已初始化
            if not self.local_ai_endpoint:
                await self.initialize()
            
            # 🔧 FIX: 獲取日常對話模型配置
            usage_model_config = await self.get_model_for_usage('dailyChat')
            
            has_model = usage_model_config or self.local_ai_endpoint
            if not has_model:
                self.log("[純淨模式] 無可用 AI 模型", "error")
                return None
            
            # 🔧 FIX: 優化純淨模式的 prompt - 確保回答問題
            # 先獲取最近的對話歷史
            history_context = ""
            try:
                history = await db.get_chat_history(None, limit=5)  # 獲取最近5條
                if history:
                    for msg in history[-3:]:  # 最近3條
                        role_name = "用戶" if msg.get('role') == 'user' else "助手"
                        history_context += f"{role_name}: {msg.get('content', '')}\n"
            except:
                pass
            
            # 構建帶歷史的消息列表
            system_content = """你是專業且友好的業務顧問。

【核心規則】
1. ⚠️ 必須直接回答用戶的問題
2. 如果用戶問"你有什麼"，就介紹你的業務：支付解決方案、U兌換、代收代付
3. 回覆簡短（20-60字），語氣自然像朋友
4. 不要說"請問還有什麼需要幫助"這類話"""
            
            if history_context:
                system_content += f"\n\n【最近對話參考】\n{history_context}"
            
            messages = [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_message}
            ]
            
            if usage_model_config:
                self.log(f"[純淨模式] 使用模型: {usage_model_config.get('display_name')}")
            else:
                self.log(f"[純淨模式] 使用默認模型: {getattr(self, 'provider', 'custom')}")
            
            # 🔧 FIX: 傳遞模型配置
            result = await self._call_ai_api(messages, model_config=usage_model_config)
            
            if result:
                self.log(f"[純淨模式] ✓ 成功: {result[:50]}...")
            else:
                self.log("[純淨模式] ❌ API 返回空", "warning")
            
            return result
            
        except Exception as e:
            self.log(f"[純淨模式] 錯誤: {e}", "error")
            import traceback
            traceback.print_exc(file=__import__('sys').stderr)
            return None
    
    async def regenerate_response(self, user_id: str) -> Optional[str]:
        """Regenerate the last response"""
        # Get the last user message
        history = await db.get_chat_history(user_id, limit=2)
        if not history:
            return None
        
        # Find last user message
        last_user_msg = None
        for msg in reversed(history):
            if msg['role'] == 'user':
                last_user_msg = msg['content']
                break
        
        if not last_user_msg:
            return None
        
        return await self._generate_response(user_id, last_user_msg)
    
    async def trigger_rag_learning(
        self,
        user_id: str,
        account_phone: str = "",
        outcome: str = "unknown"
    ) -> Dict[str, Any]:
        """
        觸發 RAG 學習
        在對話結束或達到一定消息數時調用
        
        Args:
            user_id: 用戶 ID
            account_phone: 帳號電話
            outcome: 對話結果
        
        Returns:
            學習結果
        """
        if not RAG_AVAILABLE:
            return {'error': 'RAG 系統不可用'}
        
        try:
            # 使用 chat_indexer 處理
            await chat_indexer.on_conversation_ended(
                user_id=user_id,
                account_phone=account_phone,
                outcome=outcome
            )
            
            return {'success': True, 'message': f'已觸發用戶 {user_id} 的 RAG 學習'}
            
        except Exception as e:
            self.log(f"觸發 RAG 學習失敗: {e}", "error")
            return {'error': str(e)}
    
    async def get_rag_statistics(self) -> Dict[str, Any]:
        """獲取 RAG 系統統計信息"""
        if not RAG_AVAILABLE:
            return {'error': 'RAG 系統不可用'}
        
        try:
            rag_stats = await telegram_rag.get_statistics()
            indexer_stats = await chat_indexer.get_indexing_statistics()
            
            return {
                'rag': rag_stats,
                'indexer': indexer_stats
            }
        except Exception as e:
            self.log(f"獲取 RAG 統計失敗: {e}", "error")
            return {'error': str(e)}
    
    async def initialize_rag_system(self) -> bool:
        """初始化 RAG 系統"""
        if not RAG_AVAILABLE:
            self.log("RAG 系統模組不可用", "warning")
            return False
        
        try:
            # 初始化 RAG 系統
            await telegram_rag.initialize()
            
            # 初始化索引服務
            await chat_indexer.initialize()
            
            # 啟動後台索引
            await chat_indexer.start_background_indexing()
            
            self.log("✓ RAG 系統初始化完成", "success")
            return True
            
        except Exception as e:
            self.log(f"RAG 系統初始化失敗: {e}", "error")
            return False
    
    def get_last_knowledge_info(self) -> dict:
        """
        🆕 P1-2: 獲取最後一次 AI 回覆使用的知識信息
        用於前端可視化顯示
        """
        return {
            'knowledgeUsed': self.last_knowledge_used,
            'source': self.last_knowledge_source,
            'hasKnowledge': len(self.last_knowledge_used) > 0
        }


# Global instance
ai_auto_chat = AIAutoChatService()


# Import List for type hints
from typing import List

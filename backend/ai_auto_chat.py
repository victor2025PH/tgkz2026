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
        
        # AI endpoints (will be set from settings)
        self.local_ai_endpoint = ""
        self.local_ai_model = ""
        
        # 策略管理器和質量檢查器
        self.strategy_manager = AIResponseStrategyManager()
        self.quality_checker = AIQualityChecker()
        
    async def initialize(self):
        """Initialize the service with settings from database"""
        self.settings = await db.get_ai_settings()
        
        # 從設置中載入 AI 端點配置
        if self.settings:
            endpoint = self.settings.get('local_ai_endpoint', '')
            model = self.settings.get('local_ai_model', '')
            if endpoint:
                self.set_ai_config(endpoint, model)
                print(f"[AIAutoChat] 已載入 AI 配置: endpoint={endpoint}, model={model}", file=__import__('sys').stderr)
        
    def set_ai_config(self, endpoint: str, model: str = ""):
        """Set AI endpoint configuration"""
        self.local_ai_endpoint = endpoint
        self.local_ai_model = model
    
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
        custom_prompt: Optional[str] = None
    ) -> Optional[str]:
        """Generate AI response with custom prompt"""
        if not self.local_ai_endpoint:
            self.log("AI endpoint not configured", "warning")
            return None
        
        try:
            # Build base system prompt
            if custom_prompt:
                system_prompt = custom_prompt
            else:
                system_prompt = self.settings.get('system_prompt', '')
                if not system_prompt:
                    system_prompt = """你是朋友般的聊天助手。回覆規則：
1. 每次回覆必須簡短（15-50字以內）
2. 像微信/Telegram聊天一樣自然
3. 可以用emoji但不要太多
4. 直接回應問題，不要囉嗦
5. 語氣輕鬆友好，像朋友聊天
6. 不要使用"您"，用"你"
7. 避免"請問還有什麼需要幫助"這類客服話術"""
            
            # === RAG: 獲取相關知識庫內容 ===
            rag_context = ""
            if self.settings.get('rag_enabled', True):
                # 方法1：使用新的 TelegramRAG 系統（優先）
                if RAG_AVAILABLE:
                    try:
                        rag_context = await telegram_rag.build_rag_context(
                            user_message=user_message,
                            user_id=user_id,
                            max_items=3,
                            max_tokens=800
                        )
                        if rag_context:
                            self.log(f"[RAG] 從 TelegramRAG 找到相關知識", "info")
                    except Exception as e:
                        self.log(f"TelegramRAG error: {e}", "warning")
                
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
            
            # 添加 RAG 上下文到系統提示
            full_system_prompt = system_prompt + rag_context
            
            # === 獲取用戶畫像和漏斗階段 ===
            profile = await db.get_user_profile(user_id)
            if profile:
                stage = profile.get('funnel_stage', 'new')
                interest = profile.get('interest_level', 1)
                stage_hint = self._get_stage_prompt(stage, interest)
                if stage_hint:
                    full_system_prompt += f"\n\n[用戶階段提示]\n{stage_hint}"
            
            max_context = self.settings.get('max_context_messages', 20)
            messages = await ai_context.build_context(
                user_id=user_id,
                system_prompt=full_system_prompt,
                max_messages=max_context
            )
            
            # Add current message if not already in context
            if not messages or messages[-1].get('content') != user_message:
                messages.append({
                    "role": "user",
                    "content": user_message
                })
            
            # Call AI endpoint
            response_text = await self._call_ai_api(messages)
            
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
                await self._extract_memories(user_id, user_message)
            
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
    
    async def _extract_memories(self, user_id: str, message: str):
        """從對話中提取重要信息保存為記憶"""
        # 檢測可能的重要信息
        keywords = {
            'preference': ['喜歡', '想要', '需要', '偏好', '愛', 'like', 'want', 'prefer'],
            'fact': ['我是', '我在', '我做', '我有', '我的', "i'm", 'i am', 'my'],
        }
        
        msg_lower = message.lower()
        for mem_type, kws in keywords.items():
            if any(kw in msg_lower for kw in kws):
                # 保存為記憶
                await db.add_ai_memory(
                    user_id=user_id,
                    memory_type=mem_type,
                    content=message[:200],
                    importance=0.6
                )
                break
    
    async def _call_ai_api(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Call the AI API endpoint"""
        try:
            self.log(f"調用 AI API: endpoint={self.local_ai_endpoint}, model={self.local_ai_model}")
            
            if not self.local_ai_endpoint:
                self.log("AI endpoint 未配置，使用備用回覆", "warning")
                return self._get_fallback_response(messages)
            
            request_data = {
                "model": self.local_ai_model or "default",
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.7,
                "stream": False
            }
            
            # 智能檢測端點格式，避免路徑重複
            base_endpoint = self.local_ai_endpoint.rstrip('/')
            endpoints_to_try = []
            
            # 檢查用戶是否已經提供完整路徑
            if '/v1/chat/completions' in base_endpoint or '/chat/completions' in base_endpoint:
                # 用戶已提供完整 OpenAI 格式路徑，優先使用
                endpoints_to_try.append(base_endpoint)
                self.log(f"檢測到完整 OpenAI 端點路徑")
            elif '/api/generate' in base_endpoint:
                # 用戶已提供完整 Ollama 格式路徑
                endpoints_to_try.append(base_endpoint)
                self.log(f"檢測到完整 Ollama 端點路徑")
            else:
                # 用戶只提供基礎 URL，嘗試多種路徑
                endpoints_to_try = [
                    f"{base_endpoint}/v1/chat/completions",
                    f"{base_endpoint}/chat/completions",
                    f"{base_endpoint}/api/generate",
                    base_endpoint
                ]
                self.log(f"基礎端點，將嘗試 {len(endpoints_to_try)} 種路徑")
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                for endpoint in endpoints_to_try:
                    try:
                        self.log(f"嘗試 endpoint: {endpoint}")
                        async with session.post(endpoint, json=request_data) as response:
                            self.log(f"API 回應狀態: {response.status}")
                            if response.status == 200:
                                result = await response.json()
                                self.log(f"API 回應格式: {list(result.keys()) if isinstance(result, dict) else type(result)}")
                                
                                # OpenAI format
                                if 'choices' in result:
                                    content = result['choices'][0]['message']['content']
                                    self.log(f"✓ 獲得回覆 (OpenAI格式): {content[:50]}...")
                                    return content
                                # Ollama format
                                if 'response' in result:
                                    content = result['response']
                                    self.log(f"✓ 獲得回覆 (Ollama格式): {content[:50]}...")
                                    return content
                                # Direct content
                                if 'content' in result:
                                    content = result['content']
                                    self.log(f"✓ 獲得回覆 (直接格式): {content[:50]}...")
                                    return content
                                
                                self.log(f"無法解析 API 回應: {str(result)[:200]}", "warning")
                            else:
                                text = await response.text()
                                self.log(f"API 錯誤 {response.status}: {text[:100]}", "warning")
                                    
                    except asyncio.TimeoutError:
                        self.log(f"Endpoint {endpoint} 超時", "warning")
                        continue
                    except Exception as e:
                        self.log(f"Endpoint {endpoint} 錯誤: {e}", "warning")
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
        return await self._generate_response(user_id, user_message)
    
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


# Global instance
ai_auto_chat = AIAutoChatService()


# Import List for type hints
from typing import List

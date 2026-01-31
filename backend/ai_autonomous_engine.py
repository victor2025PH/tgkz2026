"""
AI 自主轉化引擎
AI Autonomous Conversion Engine

無劇本化設計：AI 實時分析客戶狀態，自主決策最優策略

核心模塊：
1. 意向評估引擎 - 實時計算客戶意向分數和轉化階段
2. 動態人格系統 - 根據客戶風格自動調整說話方式
3. 策略決策器 - 每輪對話自動選擇最優策略
4. 協作觸發器 - 判斷何時引入協作角色
5. 學習優化器 - 追蹤效果並持續優化
"""

import sys
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime, timedelta
import re


# ==================== 枚舉定義 ====================

class ConversionStage(Enum):
    """轉化階段 - AI 自動判斷"""
    STRANGER = "stranger"       # 陌生 - 首次接觸
    AWARENESS = "awareness"     # 認知 - 了解產品/服務
    INTEREST = "interest"       # 興趣 - 表現出興趣
    EVALUATION = "evaluation"   # 評估 - 比較/考慮中
    INTENT = "intent"           # 意向 - 明確購買意向
    PURCHASE = "purchase"       # 成交 - 完成交易
    RETENTION = "retention"     # 留存 - 復購/維護


class CustomerStyle(Enum):
    """客戶說話風格 - 用於動態人格匹配"""
    FORMAL = "formal"           # 正式 - 用語正式
    CASUAL = "casual"           # 隨意 - 用語輕鬆
    DIRECT = "direct"           # 直接 - 開門見山
    DETAILED = "detailed"       # 詳細 - 喜歡詳細解釋
    EMOTIONAL = "emotional"     # 情感 - 表達情感豐富
    ANALYTICAL = "analytical"   # 分析 - 注重數據邏輯


class StrategyAction(Enum):
    """策略動作 - AI 可選擇的下一步"""
    GREET = "greet"                     # 問候
    ANSWER = "answer"                   # 回答問題
    PROBE = "probe"                     # 探詢需求
    PRESENT = "present"                 # 介紹產品
    HANDLE_OBJECTION = "handle_objection"  # 處理異議
    PUSH = "push"                       # 推進成交
    OFFER = "offer"                     # 提供優惠
    REFER_EXPERT = "refer_expert"       # 引入專家
    REFER_TESTIMONIAL = "refer_testimonial"  # 引入見證
    REFER_MANAGER = "refer_manager"     # 引入主管
    CREATE_GROUP = "create_group"       # 創建VIP群
    NOTIFY_HUMAN = "notify_human"       # 通知人工
    FOLLOW_UP = "follow_up"             # 跟進
    COOL_DOWN = "cool_down"             # 冷靜等待


class CollaborationRole(Enum):
    """協作角色類型"""
    EXPERT = "expert"           # 技術/產品專家
    TESTIMONIAL = "testimonial" # 老客戶見證
    MANAGER = "manager"         # 主管特批
    SUPPORT = "support"         # 客服支持


# ==================== 數據結構 ====================

@dataclass
class CustomerState:
    """客戶狀態 - AI 實時分析結果"""
    user_id: str
    
    # 意向評估
    intent_score: int = 0                           # 0-100
    conversion_stage: ConversionStage = ConversionStage.STRANGER
    
    # 風格分析
    customer_style: CustomerStyle = CustomerStyle.CASUAL
    style_confidence: float = 0.5
    
    # 情緒狀態
    sentiment: str = "neutral"                      # positive/neutral/negative
    urgency: str = "normal"                         # high/normal/low
    
    # 對話統計
    message_count: int = 0
    last_message_time: Optional[datetime] = None
    response_speed: str = "normal"                  # fast/normal/slow
    
    # 歷史行為
    asked_price: bool = False
    asked_discount: bool = False
    mentioned_competitor: bool = False
    expressed_objection: bool = False
    
    # 標籤
    tags: List[str] = field(default_factory=list)
    
    # 時間戳
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class DecisionResult:
    """AI 決策結果"""
    action: StrategyAction                          # 選擇的動作
    persona_style: str                              # 使用的人格風格
    prompt_enhancement: str                         # Prompt 增強指令
    collaboration: Optional[CollaborationRole] = None  # 是否需要協作
    create_group: bool = False                      # 是否創建群組
    notify_human: bool = False                      # 是否通知人工
    confidence: float = 0.0                         # 決策置信度
    reasoning: str = ""                             # 決策理由（用於日誌）


# ==================== AI 自主決策引擎 ====================

class AIAutonomousEngine:
    """
    AI 自主轉化引擎
    
    核心職責：
    1. 分析每條消息，更新客戶狀態
    2. 自主決策最優回覆策略
    3. 動態調整說話風格
    4. 判斷協作時機
    5. 追蹤效果並學習
    """
    
    def __init__(self, db=None, intent_scorer=None):
        self.db = db
        self.intent_scorer = intent_scorer
        
        # 客戶狀態緩存
        self._customer_states: Dict[str, CustomerState] = {}
        
        # 🆕 Phase1: 整合記憶和標籤系統
        self.memory_service = None
        self.tagging_service = None
        try:
            from conversation_memory import get_memory_service
            from auto_tagging_service import get_tagging_service
            self.memory_service = get_memory_service()
            self.tagging_service = get_tagging_service()
            print("[AIAutonomousEngine] ✓ 記憶和標籤系統已整合", file=sys.stderr)
        except ImportError as e:
            print(f"[AIAutonomousEngine] ⚠ 記憶/標籤系統導入失敗: {e}", file=sys.stderr)
        
        # 🆕 Phase2: 整合時機和工作流系統
        self.timing_service = None
        self.workflow_engine = None
        try:
            from smart_timing_service import get_timing_service
            from automation_workflow import get_workflow_engine
            self.timing_service = get_timing_service()
            self.workflow_engine = get_workflow_engine()
            print("[AIAutonomousEngine] ✓ 時機和工作流系統已整合", file=sys.stderr)
        except ImportError as e:
            print(f"[AIAutonomousEngine] ⚠ 時機/工作流系統導入失敗: {e}", file=sys.stderr)
        
        # 🆕 Phase3: 整合情緒和學習系統
        self.emotion_analyzer = None
        self.learning_service = None
        try:
            from emotion_analyzer import get_emotion_analyzer
            from knowledge_learning import get_learning_service
            self.emotion_analyzer = get_emotion_analyzer()
            self.learning_service = get_learning_service()
            print("[AIAutonomousEngine] ✓ 情緒和學習系統已整合", file=sys.stderr)
        except ImportError as e:
            print(f"[AIAutonomousEngine] ⚠ 情緒/學習系統導入失敗: {e}", file=sys.stderr)
        
        # 風格關鍵詞
        self._style_indicators = {
            CustomerStyle.FORMAL: ['您', '請問', '貴司', '敬請', '煩請', '懇請'],
            CustomerStyle.CASUAL: ['哈', '哦', '嗯', '啊', '呀', '唉', '😊', '👍'],
            CustomerStyle.DIRECT: ['直接', '快', '馬上', '立刻', '現在', '趕緊'],
            CustomerStyle.DETAILED: ['詳細', '具體', '說明', '解釋', '為什麼', '怎麼'],
            CustomerStyle.EMOTIONAL: ['太棒', '太好', '開心', '擔心', '著急', '😭', '❤️'],
            CustomerStyle.ANALYTICAL: ['數據', '比較', '對比', '優勢', '缺點', '分析']
        }
        
        # 階段轉換條件
        self._stage_thresholds = {
            ConversionStage.AWARENESS: 20,
            ConversionStage.INTEREST: 40,
            ConversionStage.EVALUATION: 55,
            ConversionStage.INTENT: 75,
            ConversionStage.PURCHASE: 90
        }
        
        # 人格模板
        self._persona_templates = {
            'friendly': {
                'style': '友好親切',
                'prompt': '你是一位友好的客服，說話親切溫暖，善用表情符號，讓客戶感到被關心。'
            },
            'professional': {
                'style': '專業嚴謹',
                'prompt': '你是一位專業顧問，說話嚴謹專業，用數據和案例說服客戶，展現專業度。'
            },
            'enthusiastic': {
                'style': '熱情積極',
                'prompt': '你是一位熱情的銷售，說話積極向上，善於發現客戶需求並推薦合適方案。'
            },
            'efficient': {
                'style': '高效簡潔',
                'prompt': '你是一位高效客服，說話簡潔明了，直接回答問題，不繞彎子。'
            }
        }
        
        print("[AIAutonomous] Engine initialized", file=sys.stderr)
    
    # ==================== 核心 API ====================
    
    async def analyze_and_decide(
        self,
        user_id: str,
        message: str,
        chat_history: List[Dict[str, str]] = None,
        context: Dict[str, Any] = None
    ) -> DecisionResult:
        """
        核心入口：分析消息並決策
        
        Args:
            user_id: 用戶ID
            message: 當前消息
            chat_history: 對話歷史
            context: 額外上下文
        
        Returns:
            DecisionResult: AI 決策結果
        """
        # 1. 獲取或創建客戶狀態
        state = await self._get_or_create_state(user_id)
        
        # 2. 分析當前消息，更新狀態
        state = await self._analyze_message(state, message, chat_history or [])
        
        # 3. 決策最優策略
        decision = await self._decide_strategy(state, message, context or {})
        
        # 🆕 Phase1: 記憶和標籤增強
        memory_prompt = ""
        tag_prompt = ""
        emotion_prompt = ""
        
        try:
            # 回憶相關記憶
            if self.memory_service:
                memory_prompt = await self.memory_service.generate_memory_prompt(user_id, message)
            
            # 獲取標籤畫像
            if self.tagging_service:
                tag_prompt = await self.tagging_service.generate_tag_prompt(user_id)
                # 自動打標
                await self.tagging_service.analyze_and_tag(
                    user_id, message, "", state.intent_score
                )
            
            # 🆕 Phase3: 情緒分析增強
            if self.emotion_analyzer:
                emotion_analysis = await self.emotion_analyzer.analyze_emotion(message, user_id)
                emotion_prompt = self.emotion_analyzer.generate_emotion_prompt(emotion_analysis)
                
                # 根據情緒調整決策
                if emotion_analysis.response_adjustments.get('push_level') == 'stop':
                    decision.action = StrategyAction.COOL_DOWN
                    decision.notify_human = True
                elif emotion_analysis.response_adjustments.get('push_level') == 'push_now':
                    decision.action = StrategyAction.PUSH
            
            # 合併到 prompt 增強
            prompts = [decision.prompt_enhancement, memory_prompt, tag_prompt, emotion_prompt]
            decision.prompt_enhancement = "\n\n".join(p for p in prompts if p).strip()
                
        except Exception as e:
            print(f"[AIAutonomousEngine] 記憶/標籤/情緒增強失敗: {e}", file=sys.stderr)
        
        # 4. 保存狀態
        await self._save_state(state)
        
        return decision
    
    async def post_response_process(
        self,
        user_id: str,
        message: str,
        ai_response: str
    ):
        """
        🆕 響應後處理：提取記憶、更新標籤、觸發工作流
        """
        try:
            # 1. 提取並存儲記憶
            if self.memory_service:
                await self.memory_service.extract_and_store_memories(
                    user_id, message, ai_response
                )
            
            # 2. 記錄用戶活動時間
            if self.timing_service:
                await self.timing_service.record_user_activity(user_id)
            
            # 3. 觸發工作流事件
            if self.workflow_engine:
                from automation_workflow import EventType
                
                # 觸發消息接收事件
                await self.workflow_engine.trigger_event(
                    EventType.MESSAGE_RECEIVED,
                    user_id,
                    {'message': message, 'response': ai_response}
                )
                
                # 檢測關鍵詞並觸發
                keywords_to_check = ['太貴', '價格', '優惠', '成交', '付款']
                for kw in keywords_to_check:
                    if kw in message:
                        await self.workflow_engine.trigger_event(
                            EventType.KEYWORD_DETECTED,
                            user_id,
                            {'keywords': message, 'keyword': kw}
                        )
                        break
                        
        except Exception as e:
            print(f"[AIAutonomousEngine] 響應後處理失敗: {e}", file=sys.stderr)
    
    async def get_customer_state(self, user_id: str) -> Optional[CustomerState]:
        """獲取客戶狀態"""
        return self._customer_states.get(user_id)
    
    async def record_outcome(
        self,
        user_id: str,
        decision: DecisionResult,
        outcome: str,  # 'positive', 'neutral', 'negative'
        conversion: bool = False
    ):
        """記錄決策結果，用於學習優化"""
        try:
            # 🆕 Phase3: 使用知識學習服務
            if self.learning_service:
                # 獲取最近對話
                chat_history = []  # 從數據庫獲取
                await self.learning_service.learn_from_conversation(
                    user_id, chat_history, outcome
                )
            
            print(f"[AIAutonomous] Recording outcome for {user_id}: {outcome}, conversion={conversion}", file=sys.stderr)
        except Exception as e:
            print(f"[AIAutonomousEngine] 記錄結果失敗: {e}", file=sys.stderr)
    
    # ==================== 狀態管理 ====================
    
    async def _get_or_create_state(self, user_id: str) -> CustomerState:
        """獲取或創建客戶狀態"""
        if user_id not in self._customer_states:
            # 嘗試從數據庫加載
            state = await self._load_state_from_db(user_id)
            if not state:
                state = CustomerState(user_id=user_id)
            self._customer_states[user_id] = state
        return self._customer_states[user_id]
    
    async def _load_state_from_db(self, user_id: str) -> Optional[CustomerState]:
        """從數據庫加載狀態"""
        if not self.db:
            return None
        try:
            # TODO: 實現數據庫加載
            pass
        except Exception as e:
            print(f"[AIAutonomous] Error loading state: {e}", file=sys.stderr)
        return None
    
    async def _save_state(self, state: CustomerState):
        """保存狀態"""
        state.updated_at = datetime.now()
        self._customer_states[state.user_id] = state
        # TODO: 持久化到數據庫
    
    # ==================== 消息分析 ====================
    
    async def _analyze_message(
        self,
        state: CustomerState,
        message: str,
        chat_history: List[Dict[str, str]]
    ) -> CustomerState:
        """分析消息，更新客戶狀態"""
        
        # 更新基本統計
        state.message_count += 1
        now = datetime.now()
        
        if state.last_message_time:
            delta = now - state.last_message_time
            if delta < timedelta(minutes=1):
                state.response_speed = "fast"
            elif delta > timedelta(hours=1):
                state.response_speed = "slow"
            else:
                state.response_speed = "normal"
        
        state.last_message_time = now
        
        # 分析客戶風格
        state = self._analyze_style(state, message)
        
        # 分析意向
        state = await self._analyze_intent(state, message)
        
        # 分析行為標記
        state = self._analyze_behaviors(state, message)
        
        # 分析情緒
        state = self._analyze_sentiment(state, message)
        
        # 更新轉化階段
        state = self._update_conversion_stage(state)
        
        return state
    
    def _analyze_style(self, state: CustomerState, message: str) -> CustomerState:
        """分析客戶說話風格"""
        style_scores = {style: 0 for style in CustomerStyle}
        
        for style, keywords in self._style_indicators.items():
            for keyword in keywords:
                if keyword in message:
                    style_scores[style] += 1
        
        # 取得分最高的風格
        max_style = max(style_scores, key=style_scores.get)
        max_score = style_scores[max_style]
        
        if max_score > 0:
            # 加權更新（考慮歷史）
            if max_style != state.customer_style:
                state.style_confidence = 0.6
            else:
                state.style_confidence = min(0.95, state.style_confidence + 0.1)
            state.customer_style = max_style
        
        return state
    
    async def _analyze_intent(self, state: CustomerState, message: str) -> CustomerState:
        """分析意向分數"""
        if self.intent_scorer:
            try:
                result = self.intent_scorer.score(message)
                # 加權更新（考慮歷史）
                state.intent_score = int(state.intent_score * 0.3 + result.score * 0.7)
            except Exception as e:
                print(f"[AIAutonomous] Intent scoring error: {e}", file=sys.stderr)
        else:
            # 簡單規則評分
            score_delta = 0
            high_intent_words = ['買', '購', '要', '需要', '多少錢', '價格', '付款', '下單']
            medium_intent_words = ['了解', '諮詢', '怎麼', '服務', '業務']
            
            for word in high_intent_words:
                if word in message:
                    score_delta += 15
            
            for word in medium_intent_words:
                if word in message:
                    score_delta += 8
            
            state.intent_score = min(100, max(0, state.intent_score + score_delta))
        
        return state
    
    def _analyze_behaviors(self, state: CustomerState, message: str) -> CustomerState:
        """分析行為標記"""
        msg_lower = message.lower()
        
        # 價格相關
        price_keywords = ['多少錢', '價格', '費用', '報價', '收費', 'price', 'cost']
        if any(k in msg_lower for k in price_keywords):
            state.asked_price = True
            if 'asked_price' not in state.tags:
                state.tags.append('asked_price')
        
        # 優惠相關
        discount_keywords = ['優惠', '折扣', '便宜', '划算', 'discount', '活動']
        if any(k in msg_lower for k in discount_keywords):
            state.asked_discount = True
            if 'price_sensitive' not in state.tags:
                state.tags.append('price_sensitive')
        
        # 競品相關
        competitor_keywords = ['別家', '其他', '競品', '對比', '比較', 'vs']
        if any(k in msg_lower for k in competitor_keywords):
            state.mentioned_competitor = True
            if 'comparing' not in state.tags:
                state.tags.append('comparing')
        
        # 異議相關
        objection_keywords = ['貴', '不需要', '考慮', '再看', '不確定', '擔心']
        if any(k in msg_lower for k in objection_keywords):
            state.expressed_objection = True
            if 'has_objection' not in state.tags:
                state.tags.append('has_objection')
        
        return state
    
    def _analyze_sentiment(self, state: CustomerState, message: str) -> CustomerState:
        """分析情緒"""
        positive_words = ['好', '棒', '讚', '謝謝', '感謝', '開心', '太好了', '👍', '😊', '❤️']
        negative_words = ['不好', '差', '失望', '生氣', '著急', '擔心', '😭', '😤', '😢']
        urgent_words = ['急', '趕', '馬上', '立刻', '儘快', '盡快']
        
        pos_count = sum(1 for w in positive_words if w in message)
        neg_count = sum(1 for w in negative_words if w in message)
        
        if pos_count > neg_count:
            state.sentiment = "positive"
        elif neg_count > pos_count:
            state.sentiment = "negative"
        else:
            state.sentiment = "neutral"
        
        if any(w in message for w in urgent_words):
            state.urgency = "high"
        
        return state
    
    def _update_conversion_stage(self, state: CustomerState) -> CustomerState:
        """根據意向分數更新轉化階段"""
        score = state.intent_score
        
        for stage, threshold in sorted(
            self._stage_thresholds.items(),
            key=lambda x: x[1],
            reverse=True
        ):
            if score >= threshold:
                state.conversion_stage = stage
                break
        else:
            state.conversion_stage = ConversionStage.STRANGER
        
        return state
    
    # ==================== 策略決策 ====================
    
    async def _decide_strategy(
        self,
        state: CustomerState,
        message: str,
        context: Dict[str, Any]
    ) -> DecisionResult:
        """決策最優策略"""
        
        # 1. 選擇動作
        action, reasoning = self._select_action(state, message)
        
        # 2. 選擇人格風格
        persona_key, persona = self._select_persona(state)
        
        # 3. 生成 Prompt 增強
        prompt_enhancement = self._generate_prompt_enhancement(state, action, persona)
        
        # 4. 判斷是否需要協作
        collaboration = self._check_collaboration_need(state, action)
        
        # 5. 判斷是否創建群組
        create_group = self._check_group_creation(state)
        
        # 6. 判斷是否通知人工
        notify_human = self._check_human_notification(state)
        
        return DecisionResult(
            action=action,
            persona_style=persona['style'],
            prompt_enhancement=prompt_enhancement,
            collaboration=collaboration,
            create_group=create_group,
            notify_human=notify_human,
            confidence=state.style_confidence,
            reasoning=reasoning
        )
    
    def _select_action(self, state: CustomerState, message: str) -> Tuple[StrategyAction, str]:
        """選擇最優動作"""
        stage = state.conversion_stage
        
        # 問號檢測
        is_question = '?' in message or '？' in message or any(
            q in message for q in ['怎麼', '如何', '什麼', '哪', '嗎', '呢']
        )
        
        # 根據階段和狀態決策
        if state.message_count == 1:
            return StrategyAction.GREET, "首次對話，使用問候"
        
        if is_question:
            return StrategyAction.ANSWER, "客戶提問，優先回答"
        
        if state.expressed_objection:
            return StrategyAction.HANDLE_OBJECTION, "客戶有異議，需要處理"
        
        if state.asked_price and not state.asked_discount:
            if state.intent_score >= 60:
                return StrategyAction.OFFER, "高意向且問價，提供優惠推進"
            else:
                return StrategyAction.PRESENT, "問價但意向不高，介紹產品價值"
        
        if state.mentioned_competitor:
            return StrategyAction.PRESENT, "提到競品，強調優勢"
        
        # 根據轉化階段決策
        stage_actions = {
            ConversionStage.STRANGER: (StrategyAction.GREET, "陌生階段，建立聯繫"),
            ConversionStage.AWARENESS: (StrategyAction.PROBE, "認知階段，探詢需求"),
            ConversionStage.INTEREST: (StrategyAction.PRESENT, "興趣階段，展示產品"),
            ConversionStage.EVALUATION: (StrategyAction.HANDLE_OBJECTION, "評估階段，解決疑慮"),
            ConversionStage.INTENT: (StrategyAction.PUSH, "意向階段，推進成交"),
            ConversionStage.PURCHASE: (StrategyAction.FOLLOW_UP, "成交後，維護關係"),
            ConversionStage.RETENTION: (StrategyAction.FOLLOW_UP, "留存階段，持續服務"),
        }
        
        return stage_actions.get(stage, (StrategyAction.ANSWER, "默認回答"))
    
    def _select_persona(self, state: CustomerState) -> Tuple[str, Dict]:
        """選擇匹配的人格風格"""
        # 根據客戶風格匹配人格
        style_persona_map = {
            CustomerStyle.FORMAL: 'professional',
            CustomerStyle.CASUAL: 'friendly',
            CustomerStyle.DIRECT: 'efficient',
            CustomerStyle.DETAILED: 'professional',
            CustomerStyle.EMOTIONAL: 'friendly',
            CustomerStyle.ANALYTICAL: 'professional'
        }
        
        persona_key = style_persona_map.get(state.customer_style, 'friendly')
        
        # 特殊情況調整
        if state.urgency == "high":
            persona_key = 'efficient'
        elif state.sentiment == "negative":
            persona_key = 'friendly'  # 負面情緒用友好風格安撫
        
        return persona_key, self._persona_templates[persona_key]
    
    def _generate_prompt_enhancement(
        self,
        state: CustomerState,
        action: StrategyAction,
        persona: Dict
    ) -> str:
        """生成 Prompt 增強指令"""
        base_prompt = persona['prompt']
        
        # 根據動作增強
        action_prompts = {
            StrategyAction.GREET: "這是首次對話，用簡短友好的方式打招呼，並詢問如何幫助。",
            StrategyAction.ANSWER: "直接回答客戶的問題，簡潔明了。",
            StrategyAction.PROBE: "用開放式問題了解客戶的具體需求，不要急於推銷。",
            StrategyAction.PRESENT: "突出產品優勢和價值，用具體案例或數據支撐。",
            StrategyAction.HANDLE_OBJECTION: "理解客戶顧慮，用事實和案例打消疑慮，展現同理心。",
            StrategyAction.PUSH: "客戶意向明確，適時推進成交，可以提及限時優惠。",
            StrategyAction.OFFER: "提供有吸引力的優惠方案，創造緊迫感。",
            StrategyAction.FOLLOW_UP: "維護客戶關係，詢問使用體驗，提供增值服務。",
            StrategyAction.COOL_DOWN: "客戶可能需要時間考慮，不要過度推銷，保持聯繫即可。",
        }
        
        action_enhancement = action_prompts.get(action, "")
        
        # 根據狀態增強
        state_enhancements = []
        
        if state.asked_price:
            state_enhancements.append("客戶已詢問過價格，可以直接討論價值和優惠。")
        
        if state.mentioned_competitor:
            state_enhancements.append("客戶在比較競品，強調我們的差異化優勢。")
        
        if state.sentiment == "negative":
            state_enhancements.append("客戶情緒不太好，語氣要更加耐心和理解。")
        
        if state.urgency == "high":
            state_enhancements.append("客戶比較著急，回覆要快速直接。")
        
        # 組合 Prompt
        full_prompt = f"""{base_prompt}

當前策略：{action_enhancement}

{"".join(f"注意：{e}" for e in state_enhancements)}

客戶當前轉化階段：{state.conversion_stage.value}
客戶意向分數：{state.intent_score}/100

請用繁體中文回覆，回覆長度適中（30-80字），自然友好。"""

        return full_prompt
    
    def _check_collaboration_need(
        self,
        state: CustomerState,
        action: StrategyAction
    ) -> Optional[CollaborationRole]:
        """判斷是否需要引入協作角色"""
        
        # 技術問題 → 引入專家
        if 'technical' in state.tags or '技術' in str(state.tags):
            return CollaborationRole.EXPERT
        
        # 質量疑慮 → 引入老客戶見證
        if state.expressed_objection and state.intent_score >= 50:
            return CollaborationRole.TESTIMONIAL
        
        # 價格僵局 → 引入主管特批
        if state.asked_discount and state.intent_score >= 70 and action == StrategyAction.OFFER:
            return CollaborationRole.MANAGER
        
        return None
    
    def _check_group_creation(self, state: CustomerState) -> bool:
        """判斷是否需要創建 VIP 群"""
        # 高意向客戶自動建群
        return state.intent_score >= 80 and state.conversion_stage in [
            ConversionStage.INTENT,
            ConversionStage.PURCHASE
        ]
    
    def _check_human_notification(self, state: CustomerState) -> bool:
        """判斷是否需要通知人工"""
        # 負面情緒持續 → 通知人工
        if state.sentiment == "negative" and state.message_count >= 3:
            return True
        
        # 高意向但卡住 → 通知人工
        if state.intent_score >= 85 and state.expressed_objection:
            return True
        
        return False


# ==================== 全局實例 ====================

_autonomous_engine: Optional[AIAutonomousEngine] = None


def get_autonomous_engine(db=None, intent_scorer=None) -> AIAutonomousEngine:
    """獲取或創建 AI 自主引擎實例"""
    global _autonomous_engine
    if _autonomous_engine is None:
        _autonomous_engine = AIAutonomousEngine(db, intent_scorer)
    return _autonomous_engine


# ==================== 測試 ====================

if __name__ == "__main__":
    async def test():
        engine = get_autonomous_engine()
        
        # 模擬對話
        messages = [
            "你好，請問你們是做什麼的？",
            "你們的服務多少錢？",
            "有點貴啊，能便宜點嗎？",
            "那好吧，我想要"
        ]
        
        for msg in messages:
            result = await engine.analyze_and_decide("test_user", msg)
            state = await engine.get_customer_state("test_user")
            
            print(f"\n消息: {msg}")
            print(f"階段: {state.conversion_stage.value}")
            print(f"意向: {state.intent_score}")
            print(f"動作: {result.action.value}")
            print(f"風格: {result.persona_style}")
            print(f"協作: {result.collaboration}")
    
    asyncio.run(test())

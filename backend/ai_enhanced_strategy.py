"""
TG-Matrix 增強版 AI 回復策略 - Phase 2 優化
Enhanced AI Response Strategy with Context Awareness and Quality Control

功能:
1. 上下文感知 - 根據對話歷史調整回復
2. 意圖識別 - 精準識別用戶意圖
3. 情感分析 - 感知用戶情緒
4. 回復質量評估 - 自動評估和優化回復
5. 個性化策略 - 根據用戶特徵定制
"""

import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class UserIntent(Enum):
    """用戶意圖類型"""
    GREETING = "greeting"           # 問候
    INQUIRY = "inquiry"             # 詢問
    OBJECTION = "objection"         # 異議
    INTEREST = "interest"           # 感興趣
    PURCHASE = "purchase"           # 購買意向
    COMPLAINT = "complaint"         # 投訴
    TECHNICAL = "technical"         # 技術問題
    URGENT = "urgent"               # 緊急
    CASUAL = "casual"               # 閒聊
    UNKNOWN = "unknown"             # 未知


class Sentiment(Enum):
    """情感類型"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    URGENT = "urgent"


@dataclass
class ConversationContext:
    """對話上下文"""
    user_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    
    # 對話狀態
    message_count: int = 0
    last_message_time: Optional[datetime] = None
    conversation_stage: str = "initial"  # initial, engaged, negotiating, closing
    
    # 歷史記錄
    recent_messages: List[Dict[str, Any]] = field(default_factory=list)
    detected_intents: List[UserIntent] = field(default_factory=list)
    sentiment_history: List[Sentiment] = field(default_factory=list)
    
    # 用戶特徵
    response_rate: float = 0.0  # 回復率
    avg_response_time: float = 0.0  # 平均回復時間
    preferred_style: str = "friendly"  # friendly, formal, casual
    topics_of_interest: List[str] = field(default_factory=list)
    
    # 標記
    is_hot_lead: bool = False
    needs_human: bool = False
    
    def add_message(self, message: str, is_outgoing: bool = False):
        """添加消息到歷史"""
        self.recent_messages.append({
            'text': message,
            'is_outgoing': is_outgoing,
            'timestamp': datetime.now()
        })
        # 只保留最近20條
        if len(self.recent_messages) > 20:
            self.recent_messages = self.recent_messages[-20:]
        
        if not is_outgoing:
            self.message_count += 1
            self.last_message_time = datetime.now()
    
    def get_conversation_summary(self) -> str:
        """獲取對話摘要"""
        if not self.recent_messages:
            return ""
        
        last_3 = self.recent_messages[-3:]
        summary = []
        for msg in last_3:
            prefix = "我方:" if msg['is_outgoing'] else "用戶:"
            summary.append(f"{prefix} {msg['text'][:50]}...")
        
        return "\n".join(summary)


class IntentClassifier:
    """意圖分類器"""
    
    # 意圖關鍵詞映射
    INTENT_KEYWORDS = {
        UserIntent.GREETING: [
            '你好', '您好', 'hi', 'hello', 'hey', '哈囉', '嗨', '早安', '晚安',
            '早上好', '下午好', '晚上好', 'good morning', 'good afternoon'
        ],
        UserIntent.INQUIRY: [
            '怎麼', '如何', '什麼', '為什麼', '怎樣', '哪', '?', '？',
            '請問', '想問', '諮詢', 'how', 'what', 'why', 'where', 'which'
        ],
        UserIntent.OBJECTION: [
            '貴', '太貴', '便宜', '價格', '多少錢', '費用', '不值', 
            '考慮', '再看看', '想想', '不確定', '猶豫', '擔心'
        ],
        UserIntent.INTEREST: [
            '感興趣', '有興趣', '想了解', '詳細介紹', '能詳細說說',
            '怎麼購買', '哪裡買', '怎麼訂', '有優惠', '打折'
        ],
        UserIntent.PURCHASE: [
            '買', '購買', '訂購', '下單', '付款', '支付', 
            '要了', '成交', '怎麼付', '發我鏈接', '給我地址'
        ],
        UserIntent.COMPLAINT: [
            '投訴', '不滿', '差評', '騙子', '垃圾', '問題', '故障',
            '壞了', '不好用', '沒用', '後悔', '退款', '退貨'
        ],
        UserIntent.TECHNICAL: [
            '怎麼用', '怎麼操作', '教程', '教我', '步驟', '設置',
            '安裝', '配置', '不會', '出錯', '報錯', 'error'
        ],
        UserIntent.URGENT: [
            '急', '緊急', '快點', '馬上', '立刻', '現在', 
            'asap', 'urgent', '等不了', '急需'
        ]
    }
    
    @classmethod
    def classify(cls, message: str, context: Optional[ConversationContext] = None) -> Tuple[UserIntent, float]:
        """
        分類用戶意圖
        
        Returns:
            (意圖類型, 置信度)
        """
        message_lower = message.lower()
        scores: Dict[UserIntent, float] = defaultdict(float)
        
        for intent, keywords in cls.INTENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in message_lower:
                    scores[intent] += 1.0
        
        # 考慮上下文
        if context and context.detected_intents:
            last_intent = context.detected_intents[-1]
            # 如果上一個意圖是異議，這個可能也是
            if last_intent == UserIntent.OBJECTION:
                scores[UserIntent.OBJECTION] += 0.5
            # 如果已經在購買階段
            if last_intent == UserIntent.PURCHASE:
                scores[UserIntent.PURCHASE] += 0.5
        
        if not scores:
            return UserIntent.CASUAL, 0.5
        
        # 找到最高分的意圖
        best_intent = max(scores.items(), key=lambda x: x[1])
        total_score = sum(scores.values())
        confidence = best_intent[1] / total_score if total_score > 0 else 0.5
        
        return best_intent[0], min(confidence, 1.0)


class SentimentAnalyzer:
    """情感分析器"""
    
    POSITIVE_WORDS = [
        '好', '棒', '讚', '喜歡', '愛', '滿意', '開心', '謝謝', '感謝',
        'good', 'great', 'love', 'like', 'thanks', 'happy', '不錯', '可以'
    ]
    
    NEGATIVE_WORDS = [
        '差', '爛', '壞', '討厭', '生氣', '失望', '憤怒', '垃圾',
        'bad', 'hate', 'angry', 'disappointed', '不好', '太差', '糟糕'
    ]
    
    URGENT_WORDS = ['急', '緊急', '馬上', '立刻', 'urgent', 'asap', '快']
    
    @classmethod
    def analyze(cls, message: str) -> Tuple[Sentiment, float]:
        """
        分析情感
        
        Returns:
            (情感類型, 強度 0-1)
        """
        message_lower = message.lower()
        
        positive_count = sum(1 for word in cls.POSITIVE_WORDS if word in message_lower)
        negative_count = sum(1 for word in cls.NEGATIVE_WORDS if word in message_lower)
        urgent_count = sum(1 for word in cls.URGENT_WORDS if word in message_lower)
        
        if urgent_count > 0:
            return Sentiment.URGENT, min(urgent_count * 0.4, 1.0)
        
        if positive_count > negative_count:
            intensity = min((positive_count - negative_count) * 0.3, 1.0)
            return Sentiment.POSITIVE, intensity
        elif negative_count > positive_count:
            intensity = min((negative_count - positive_count) * 0.3, 1.0)
            return Sentiment.NEGATIVE, intensity
        
        return Sentiment.NEUTRAL, 0.5


@dataclass
class QualityScore:
    """回復質量評分"""
    relevance: float = 0.0      # 相關性 0-1
    naturalness: float = 0.0    # 自然度 0-1
    length_score: float = 0.0   # 長度合適度 0-1
    tone_match: float = 0.0     # 語氣匹配度 0-1
    overall: float = 0.0        # 總體評分 0-1
    
    issues: List[str] = field(default_factory=list)
    
    def calculate_overall(self):
        """計算總體評分"""
        self.overall = (
            self.relevance * 0.35 +
            self.naturalness * 0.25 +
            self.length_score * 0.2 +
            self.tone_match * 0.2
        )


class ResponseQualityChecker:
    """回復質量檢查器"""
    
    # 機器人語言標記
    BOT_MARKERS = [
        '作為一個AI', '作為AI', '我是一個AI', '我是AI',
        'As an AI', "I'm an AI", 'I am an AI',
        '非常抱歉，我無法', '對不起，我沒有能力',
        '根據我的分析', '根據數據顯示'
    ]
    
    # 過度正式的語言
    OVERLY_FORMAL = [
        '敬啟者', '茲', '鑒於', '承蒙', '惠顧',
        '尊敬的客戶', '親愛的用戶'
    ]
    
    @classmethod
    def check(
        cls, 
        response: str, 
        original_message: str,
        context: Optional[ConversationContext] = None
    ) -> QualityScore:
        """
        檢查回復質量
        
        Args:
            response: AI 生成的回復
            original_message: 用戶原始消息
            context: 對話上下文
        """
        score = QualityScore()
        
        # 1. 長度檢查
        response_len = len(response)
        if response_len < 10:
            score.length_score = 0.3
            score.issues.append("回復太短")
        elif response_len > 300:
            score.length_score = 0.5
            score.issues.append("回復太長")
        elif 20 <= response_len <= 150:
            score.length_score = 1.0
        else:
            score.length_score = 0.7
        
        # 2. 自然度檢查
        bot_marker_count = sum(1 for marker in cls.BOT_MARKERS if marker.lower() in response.lower())
        formal_count = sum(1 for word in cls.OVERLY_FORMAL if word in response)
        
        if bot_marker_count > 0:
            score.naturalness = 0.2
            score.issues.append("包含機器人語言標記")
        elif formal_count > 0:
            score.naturalness = 0.5
            score.issues.append("語言過於正式")
        else:
            score.naturalness = 0.9
        
        # 3. 相關性檢查（簡單版本）
        # 檢查是否包含原始消息的關鍵詞
        original_words = set(re.findall(r'[\u4e00-\u9fff]+|\w+', original_message.lower()))
        response_words = set(re.findall(r'[\u4e00-\u9fff]+|\w+', response.lower()))
        common_words = original_words & response_words
        
        if len(original_words) > 0:
            relevance = len(common_words) / len(original_words)
            score.relevance = min(relevance * 2, 1.0)  # 放大相關性分數
        else:
            score.relevance = 0.5
        
        # 4. 語氣匹配（基於上下文）
        if context:
            if context.preferred_style == "formal" and formal_count > 0:
                score.tone_match = 0.8
            elif context.preferred_style == "casual" and formal_count == 0:
                score.tone_match = 0.9
            else:
                score.tone_match = 0.7
        else:
            score.tone_match = 0.7
        
        # 計算總體評分
        score.calculate_overall()
        
        return score
    
    @classmethod
    def should_regenerate(cls, score: QualityScore, threshold: float = 0.5) -> bool:
        """判斷是否需要重新生成"""
        return score.overall < threshold


class EnhancedAIResponseManager:
    """增強版 AI 回復管理器"""
    
    def __init__(self):
        self.contexts: Dict[str, ConversationContext] = {}
        self.intent_classifier = IntentClassifier()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.quality_checker = ResponseQualityChecker()
        
        # 策略模板
        self.strategy_templates = {
            UserIntent.GREETING: self._get_greeting_prompt,
            UserIntent.INQUIRY: self._get_inquiry_prompt,
            UserIntent.OBJECTION: self._get_objection_prompt,
            UserIntent.INTEREST: self._get_interest_prompt,
            UserIntent.PURCHASE: self._get_purchase_prompt,
            UserIntent.COMPLAINT: self._get_complaint_prompt,
            UserIntent.TECHNICAL: self._get_technical_prompt,
            UserIntent.URGENT: self._get_urgent_prompt,
            UserIntent.CASUAL: self._get_casual_prompt,
        }
    
    def get_or_create_context(self, user_id: str, **kwargs) -> ConversationContext:
        """獲取或創建對話上下文"""
        if user_id not in self.contexts:
            self.contexts[user_id] = ConversationContext(
                user_id=user_id,
                username=kwargs.get('username'),
                first_name=kwargs.get('first_name')
            )
        return self.contexts[user_id]
    
    async def process_message(
        self, 
        user_id: str,
        message: str,
        ai_service: Any,
        **kwargs
    ) -> Dict[str, Any]:
        """
        處理用戶消息並生成回復
        
        Returns:
            {
                'response': str,
                'intent': UserIntent,
                'sentiment': Sentiment,
                'quality_score': QualityScore,
                'should_escalate': bool
            }
        """
        # 獲取上下文
        context = self.get_or_create_context(user_id, **kwargs)
        context.add_message(message)
        
        # 分析意圖和情感
        intent, intent_confidence = self.intent_classifier.classify(message, context)
        sentiment, sentiment_intensity = self.sentiment_analyzer.analyze(message)
        
        # 更新上下文
        context.detected_intents.append(intent)
        context.sentiment_history.append(sentiment)
        
        # 判斷是否需要人工介入
        should_escalate = self._check_escalation(context, intent, sentiment)
        
        if should_escalate:
            context.needs_human = True
            return {
                'response': None,
                'intent': intent,
                'sentiment': sentiment,
                'quality_score': None,
                'should_escalate': True,
                'escalation_reason': '建議人工介入處理'
            }
        
        # 生成回復
        prompt = self._get_strategy_prompt(intent, context, message)
        response = await self._generate_with_retry(ai_service, user_id, message, prompt, context)
        
        # 質量評估
        quality_score = self.quality_checker.check(response, message, context)
        
        # 記錄我方回復
        if response:
            context.add_message(response, is_outgoing=True)
        
        return {
            'response': response,
            'intent': intent,
            'intent_confidence': intent_confidence,
            'sentiment': sentiment,
            'sentiment_intensity': sentiment_intensity,
            'quality_score': quality_score,
            'should_escalate': False
        }
    
    def _check_escalation(
        self, 
        context: ConversationContext, 
        intent: UserIntent,
        sentiment: Sentiment
    ) -> bool:
        """檢查是否需要升級到人工"""
        # 投訴需要人工
        if intent == UserIntent.COMPLAINT:
            return True
        
        # 連續負面情緒
        if len(context.sentiment_history) >= 3:
            recent = context.sentiment_history[-3:]
            if all(s == Sentiment.NEGATIVE for s in recent):
                return True
        
        # 對話輪次過多但無進展
        if context.message_count > 10 and context.conversation_stage == "initial":
            return True
        
        return False
    
    def _get_strategy_prompt(
        self, 
        intent: UserIntent, 
        context: ConversationContext,
        message: str
    ) -> str:
        """獲取策略提示詞"""
        template_func = self.strategy_templates.get(intent, self._get_casual_prompt)
        return template_func(context, message)
    
    async def _generate_with_retry(
        self,
        ai_service: Any,
        user_id: str,
        message: str,
        prompt: str,
        context: ConversationContext,
        max_retries: int = 2
    ) -> str:
        """生成回復（帶重試）"""
        for attempt in range(max_retries + 1):
            try:
                response = await ai_service._generate_response_with_prompt(
                    user_id, message, prompt
                )
                
                if response:
                    # 質量檢查
                    score = self.quality_checker.check(response, message, context)
                    if not self.quality_checker.should_regenerate(score):
                        return response
                    
                    # 如果需要重新生成，調整 prompt
                    if attempt < max_retries:
                        prompt = f"{prompt}\n\n注意：請用更自然的口語化方式回復，避免機器人語氣。"
                        logger.debug(f"[AI] Regenerating response (attempt {attempt + 2})")
                    else:
                        return response  # 即使質量不佳，也返回
                        
            except Exception as e:
                logger.error(f"[AI] Generation error: {e}")
                if attempt == max_retries:
                    return ""
        
        return ""
    
    # ===== 策略提示詞模板 =====
    
    def _get_greeting_prompt(self, context: ConversationContext, message: str) -> str:
        user_name = context.first_name or context.username or "朋友"
        return f"""用戶 {user_name} 發送了問候消息。
請用友好自然的方式回應，像朋友之間的聊天。
- 長度：15-30字
- 語氣：輕鬆友好
- 可以適當使用 emoji
- 不要過於正式"""
    
    def _get_inquiry_prompt(self, context: ConversationContext, message: str) -> str:
        summary = context.get_conversation_summary()
        return f"""用戶提出了問題。

對話歷史：
{summary}

用戶問題：{message}

請用簡潔明瞭的方式回答：
- 長度：30-80字
- 如果與產品相關，可適當提及優勢
- 不確定的事情不要亂說
- 保持專業但不過於正式"""
    
    def _get_objection_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶表達了顧慮或異議："{message}"

請用同理心的方式回應：
- 首先理解和認同用戶的擔心
- 不要直接反駁
- 溫和地解釋價值
- 長度：40-80字
- 可以用問題引導用戶思考"""
    
    def _get_interest_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶表達了興趣："{message}"

這是個好機會！請：
- 熱情但不過度推銷
- 提供具體有用的信息
- 引導下一步行動
- 長度：40-80字"""
    
    def _get_purchase_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶表達了購買意向！

用戶消息："{message}"

請：
- 確認用戶需求
- 提供清晰的購買指引
- 如需付款，提供支付方式
- 長度：30-60字
- 態度熱情但專業"""
    
    def _get_complaint_prompt(self, context: ConversationContext, message: str) -> str:
        # 投訴通常會升級到人工，這裡是備用
        return f"""用戶提出了投訴。

請先安撫用戶情緒：
- 表示理解和歉意
- 表示會認真處理
- 長度：30-50字
- 表示會有專人跟進"""
    
    def _get_technical_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶提出了技術問題："{message}"

請：
- 用簡單易懂的語言解釋
- 提供具體步驟
- 如果不確定，建議用戶聯繫技術支持
- 長度：40-100字"""
    
    def _get_urgent_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶表示緊急："{message}"

請：
- 表示理解緊急性
- 快速提供解決方案
- 如需要，提供聯繫方式
- 長度：30-60字
- 語氣要高效"""
    
    def _get_casual_prompt(self, context: ConversationContext, message: str) -> str:
        return f"""用戶發送了一條閒聊消息："{message}"

請用輕鬆的方式回應：
- 像朋友聊天一樣
- 長度：15-40字
- 可以適當幽默
- 自然地維持對話"""


# 全局管理器實例
_enhanced_manager: Optional[EnhancedAIResponseManager] = None


def get_enhanced_ai_manager() -> EnhancedAIResponseManager:
    """獲取全局增強版 AI 管理器"""
    global _enhanced_manager
    if _enhanced_manager is None:
        _enhanced_manager = EnhancedAIResponseManager()
    return _enhanced_manager

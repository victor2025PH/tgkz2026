"""
TG-Matrix AI 上下文管理模組
Phase C: Functionality - AI 對話增強

功能：
1. 對話上下文管理
2. 用戶畫像
3. 知識庫集成
4. 意圖識別增強
"""

import asyncio
import json
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from collections import deque

from .logging import get_logger

logger = get_logger("ai_context")


class IntentCategory(Enum):
    """意圖類別"""
    # 諮詢類
    INQUIRY_PRODUCT = "inquiry.product"
    INQUIRY_PRICE = "inquiry.price"
    INQUIRY_FEATURE = "inquiry.feature"
    INQUIRY_SUPPORT = "inquiry.support"
    
    # 購買類
    PURCHASE_INTENT = "purchase.intent"
    PURCHASE_ORDER = "purchase.order"
    PURCHASE_PAYMENT = "purchase.payment"
    
    # 投訴類
    COMPLAINT_PRODUCT = "complaint.product"
    COMPLAINT_SERVICE = "complaint.service"
    COMPLAINT_GENERAL = "complaint.general"
    
    # 閒聊類
    CHITCHAT_GREETING = "chitchat.greeting"
    CHITCHAT_FAREWELL = "chitchat.farewell"
    CHITCHAT_GENERAL = "chitchat.general"
    
    # 敏感類
    SENSITIVE_POLITICS = "sensitive.politics"
    SENSITIVE_ILLEGAL = "sensitive.illegal"
    SENSITIVE_SPAM = "sensitive.spam"
    
    # 未知
    UNKNOWN = "unknown"


class SentimentType(Enum):
    """情感類型"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


@dataclass
class ConversationTurn:
    """對話輪次"""
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    intent: Optional[IntentCategory] = None
    sentiment: Optional[SentimentType] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "intent": self.intent.value if self.intent else None,
            "sentiment": self.sentiment.value if self.sentiment else None,
            "metadata": self.metadata
        }


@dataclass
class UserProfile:
    """用戶畫像"""
    user_id: str
    
    # 基本信息
    name: Optional[str] = None
    language: str = "zh-TW"
    timezone: Optional[str] = None
    
    # 行為特征
    first_contact: Optional[datetime] = None
    last_contact: Optional[datetime] = None
    total_messages: int = 0
    avg_response_time: float = 0
    
    # 興趣標籤
    interests: List[str] = field(default_factory=list)
    topics_discussed: List[str] = field(default_factory=list)
    
    # 購買意向
    funnel_stage: str = "awareness"  # awareness, interest, decision, action
    purchase_intent_score: float = 0.0
    
    # 情感傾向
    overall_sentiment: SentimentType = SentimentType.NEUTRAL
    sentiment_history: List[Tuple[datetime, SentimentType]] = field(default_factory=list)
    
    # 自定義屬性
    custom_attributes: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "language": self.language,
            "timezone": self.timezone,
            "first_contact": self.first_contact.isoformat() if self.first_contact else None,
            "last_contact": self.last_contact.isoformat() if self.last_contact else None,
            "total_messages": self.total_messages,
            "interests": self.interests,
            "topics_discussed": self.topics_discussed,
            "funnel_stage": self.funnel_stage,
            "purchase_intent_score": self.purchase_intent_score,
            "overall_sentiment": self.overall_sentiment.value,
            "custom_attributes": self.custom_attributes
        }


@dataclass
class ConversationContext:
    """對話上下文"""
    conversation_id: str
    user_id: str
    
    # 對話歷史
    turns: deque = field(default_factory=lambda: deque(maxlen=50))
    
    # 當前狀態
    current_intent: Optional[IntentCategory] = None
    current_topic: Optional[str] = None
    awaiting_response: bool = False
    
    # 會話級變量
    session_vars: Dict[str, Any] = field(default_factory=dict)
    
    # 時間信息
    started_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    
    def add_turn(self, role: str, content: str, **kwargs):
        """添加對話輪次"""
        turn = ConversationTurn(role=role, content=content, **kwargs)
        self.turns.append(turn)
        self.last_activity = datetime.now()
        return turn
    
    def get_recent_turns(self, count: int = 10) -> List[ConversationTurn]:
        """獲取最近的對話輪次"""
        return list(self.turns)[-count:]
    
    def get_messages_for_llm(self, max_turns: int = 10) -> List[Dict[str, str]]:
        """獲取 LLM 格式的消息列表"""
        messages = []
        for turn in self.get_recent_turns(max_turns):
            messages.append({
                "role": turn.role,
                "content": turn.content
            })
        return messages
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "turns_count": len(self.turns),
            "current_intent": self.current_intent.value if self.current_intent else None,
            "current_topic": self.current_topic,
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "session_vars": self.session_vars
        }


class IntentRecognizer:
    """意圖識別器"""
    
    # 關鍵詞映射
    INTENT_KEYWORDS = {
        IntentCategory.INQUIRY_PRODUCT: [
            "產品", "商品", "物品", "什麼是", "介紹", "了解",
            "product", "item", "what is", "tell me about"
        ],
        IntentCategory.INQUIRY_PRICE: [
            "價格", "多少錢", "費用", "收費", "價錢", "cost",
            "price", "how much", "費用", "付款"
        ],
        IntentCategory.INQUIRY_FEATURE: [
            "功能", "特點", "能做什麼", "怎麼用", "如何使用",
            "feature", "how to", "can it"
        ],
        IntentCategory.PURCHASE_INTENT: [
            "買", "購買", "下單", "訂購", "想要", "需要",
            "buy", "purchase", "order", "want", "need"
        ],
        IntentCategory.COMPLAINT_GENERAL: [
            "投訴", "不滿", "問題", "太慢", "差評", "退款",
            "complaint", "refund", "problem", "issue", "bad"
        ],
        IntentCategory.CHITCHAT_GREETING: [
            "你好", "嗨", "哈囉", "早安", "午安", "晚安",
            "hello", "hi", "hey", "good morning", "good evening"
        ],
        IntentCategory.CHITCHAT_FAREWELL: [
            "再見", "拜拜", "掰掰", "bye", "goodbye", "see you"
        ],
        IntentCategory.SENSITIVE_POLITICS: [
            "政治", "選舉", "政府", "政黨", "民主", "獨立"
        ],
        IntentCategory.SENSITIVE_ILLEGAL: [
            "毒品", "賭博", "色情", "詐騙", "洗錢"
        ],
    }
    
    def recognize(self, text: str, context: Optional[ConversationContext] = None) -> Tuple[IntentCategory, float]:
        """
        識別意圖
        
        Returns:
            (意圖類別, 置信度)
        """
        text_lower = text.lower()
        scores: Dict[IntentCategory, float] = {}
        
        # 關鍵詞匹配
        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    score += 1
            if score > 0:
                scores[intent] = score / len(keywords)
        
        if not scores:
            return IntentCategory.UNKNOWN, 0.0
        
        # 返回最高分的意圖
        best_intent = max(scores, key=scores.get)
        confidence = min(scores[best_intent] * 2, 1.0)  # 調整置信度範圍
        
        return best_intent, confidence


class SentimentAnalyzer:
    """情感分析器"""
    
    POSITIVE_WORDS = [
        "好", "棒", "讚", "喜歡", "感謝", "謝謝", "開心", "滿意",
        "excellent", "great", "good", "love", "thank", "happy", "amazing"
    ]
    
    NEGATIVE_WORDS = [
        "差", "爛", "糟", "討厭", "生氣", "憤怒", "不滿", "失望",
        "bad", "terrible", "hate", "angry", "disappointed", "poor", "awful"
    ]
    
    def analyze(self, text: str) -> Tuple[SentimentType, float]:
        """
        分析情感
        
        Returns:
            (情感類型, 強度 0-1)
        """
        text_lower = text.lower()
        
        positive_count = sum(1 for word in self.POSITIVE_WORDS if word in text_lower)
        negative_count = sum(1 for word in self.NEGATIVE_WORDS if word in text_lower)
        
        if positive_count > 0 and negative_count > 0:
            return SentimentType.MIXED, 0.5
        elif positive_count > negative_count:
            intensity = min(positive_count / 3, 1.0)
            return SentimentType.POSITIVE, intensity
        elif negative_count > positive_count:
            intensity = min(negative_count / 3, 1.0)
            return SentimentType.NEGATIVE, intensity
        else:
            return SentimentType.NEUTRAL, 0.0


class ContextManager:
    """上下文管理器"""
    
    def __init__(self, max_contexts: int = 1000, context_ttl_hours: int = 24):
        self.max_contexts = max_contexts
        self.context_ttl = timedelta(hours=context_ttl_hours)
        
        # 存儲
        self._conversations: Dict[str, ConversationContext] = {}
        self._user_profiles: Dict[str, UserProfile] = {}
        
        # 輔助服務
        self.intent_recognizer = IntentRecognizer()
        self.sentiment_analyzer = SentimentAnalyzer()
        
        # 知識庫回調（外部注入）
        self._knowledge_retriever: Optional[callable] = None
    
    def set_knowledge_retriever(self, retriever: callable):
        """設置知識庫檢索回調"""
        self._knowledge_retriever = retriever
    
    def get_or_create_context(
        self,
        conversation_id: str,
        user_id: str
    ) -> ConversationContext:
        """獲取或創建對話上下文"""
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = ConversationContext(
                conversation_id=conversation_id,
                user_id=user_id
            )
            
            # 清理過期上下文
            self._cleanup_expired()
        
        return self._conversations[conversation_id]
    
    def get_context(self, conversation_id: str) -> Optional[ConversationContext]:
        """獲取對話上下文"""
        return self._conversations.get(conversation_id)
    
    def get_or_create_profile(self, user_id: str) -> UserProfile:
        """獲取或創建用戶畫像"""
        if user_id not in self._user_profiles:
            self._user_profiles[user_id] = UserProfile(
                user_id=user_id,
                first_contact=datetime.now()
            )
        
        profile = self._user_profiles[user_id]
        profile.last_contact = datetime.now()
        return profile
    
    def get_profile(self, user_id: str) -> Optional[UserProfile]:
        """獲取用戶畫像"""
        return self._user_profiles.get(user_id)
    
    async def process_user_message(
        self,
        conversation_id: str,
        user_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        處理用戶消息，返回增強的上下文信息
        
        Returns:
            {
                "context": ConversationContext,
                "profile": UserProfile,
                "intent": IntentCategory,
                "intent_confidence": float,
                "sentiment": SentimentType,
                "knowledge": List[str],
                "suggested_actions": List[str]
            }
        """
        # 獲取/創建上下文和畫像
        context = self.get_or_create_context(conversation_id, user_id)
        profile = self.get_or_create_profile(user_id)
        
        # 更新統計
        profile.total_messages += 1
        
        # 識別意圖
        intent, intent_confidence = self.intent_recognizer.recognize(message, context)
        
        # 分析情感
        sentiment, sentiment_intensity = self.sentiment_analyzer.analyze(message)
        
        # 添加到對話歷史
        context.add_turn(
            role="user",
            content=message,
            intent=intent,
            sentiment=sentiment,
            metadata={"intent_confidence": intent_confidence}
        )
        
        # 更新當前意圖
        context.current_intent = intent
        
        # 更新用戶畫像情感
        profile.sentiment_history.append((datetime.now(), sentiment))
        if len(profile.sentiment_history) > 100:
            profile.sentiment_history = profile.sentiment_history[-100:]
        
        # 檢索知識庫
        knowledge = []
        if self._knowledge_retriever:
            try:
                knowledge = await self._knowledge_retriever(message, intent)
            except Exception as e:
                logger.error(f"Knowledge retrieval failed: {e}")
        
        # 生成建議操作
        suggested_actions = self._get_suggested_actions(intent, sentiment, profile)
        
        return {
            "context": context,
            "profile": profile,
            "intent": intent,
            "intent_confidence": intent_confidence,
            "sentiment": sentiment,
            "sentiment_intensity": sentiment_intensity,
            "knowledge": knowledge,
            "suggested_actions": suggested_actions
        }
    
    def add_assistant_response(
        self,
        conversation_id: str,
        response: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """添加助手回覆"""
        context = self.get_context(conversation_id)
        if context:
            context.add_turn(
                role="assistant",
                content=response,
                metadata=metadata or {}
            )
    
    def _get_suggested_actions(
        self,
        intent: IntentCategory,
        sentiment: SentimentType,
        profile: UserProfile
    ) -> List[str]:
        """根據意圖和情感生成建議操作"""
        actions = []
        
        # 基於意圖的建議
        if intent == IntentCategory.PURCHASE_INTENT:
            actions.append("提供購買鏈接")
            actions.append("詢問具體需求")
            if profile.funnel_stage == "awareness":
                profile.funnel_stage = "interest"
        
        elif intent == IntentCategory.COMPLAINT_GENERAL:
            actions.append("表達歉意")
            actions.append("了解具體問題")
            actions.append("提供解決方案")
        
        elif intent in (IntentCategory.SENSITIVE_POLITICS, IntentCategory.SENSITIVE_ILLEGAL):
            actions.append("禮貌拒絕")
            actions.append("轉移話題")
        
        # 基於情感的建議
        if sentiment == SentimentType.NEGATIVE:
            actions.append("安撫情緒")
            actions.append("主動提供幫助")
        elif sentiment == SentimentType.POSITIVE:
            actions.append("保持熱情")
            actions.append("推進轉化")
        
        return actions
    
    def _cleanup_expired(self):
        """清理過期的上下文"""
        now = datetime.now()
        expired = [
            cid for cid, ctx in self._conversations.items()
            if now - ctx.last_activity > self.context_ttl
        ]
        
        for cid in expired:
            del self._conversations[cid]
        
        # 限制總數
        if len(self._conversations) > self.max_contexts:
            # 移除最舊的
            sorted_contexts = sorted(
                self._conversations.items(),
                key=lambda x: x[1].last_activity
            )
            for cid, _ in sorted_contexts[:len(self._conversations) - self.max_contexts]:
                del self._conversations[cid]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            "active_conversations": len(self._conversations),
            "user_profiles": len(self._user_profiles),
            "context_ttl_hours": self.context_ttl.total_seconds() / 3600,
            "max_contexts": self.max_contexts
        }


# 全局實例
_context_manager: Optional[ContextManager] = None


def init_context_manager(
    max_contexts: int = 1000,
    context_ttl_hours: int = 24
) -> ContextManager:
    """初始化上下文管理器"""
    global _context_manager
    _context_manager = ContextManager(max_contexts, context_ttl_hours)
    return _context_manager


def get_context_manager() -> Optional[ContextManager]:
    """獲取上下文管理器"""
    return _context_manager


__all__ = [
    'IntentCategory',
    'SentimentType',
    'ConversationTurn',
    'UserProfile',
    'ConversationContext',
    'IntentRecognizer',
    'SentimentAnalyzer',
    'ContextManager',
    'init_context_manager',
    'get_context_manager'
]

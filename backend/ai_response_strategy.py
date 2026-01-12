"""
AI Response Strategy Manager
智能 AI 回復策略管理器 - 根據消息類型選擇最合適的回復策略
"""
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import re


class ResponseStrategy(ABC):
    """回復策略基類"""
    
    @abstractmethod
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否應該使用此策略"""
        pass
    
    @abstractmethod
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成回復"""
        pass


class GreetingStrategy(ResponseStrategy):
    """問候策略 - 處理打招呼消息"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否為問候消息"""
        greeting_keywords = [
            '你好', '您好', 'hi', 'hello', 'hey', '哈囉', '嗨',
            '早上好', '下午好', '晚上好', 'good morning', 'good afternoon', 'good evening'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in greeting_keywords)
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成問候回復"""
        user_name = context.get('username') or context.get('first_name') or '朋友'
        custom_prompt = f"用戶 @{user_name} 發送了問候消息。請用友好的方式回應，簡短自然（15-30字），像朋友聊天一樣。"
        result = await ai_service._generate_response_with_prompt(
            context.get('user_id'),
            message,
            custom_prompt
        )
        return result or ""


class QuestionStrategy(ResponseStrategy):
    """問題回答策略 - 處理用戶提問"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否為問題"""
        question_indicators = ['?', '？', '怎麼', '如何', '什麼', '為什麼', '怎樣', '哪', '嗎', '呢']
        return any(indicator in message for indicator in question_indicators)
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成問題回答"""
        custom_prompt = "用戶提出了一個問題。請用簡潔明瞭的方式回答（30-80字），要專業但不要太正式。如果問題與我們的產品/服務相關，可以適當提及優勢。"
        result = await ai_service._generate_response_with_prompt(
            context.get('user_id'),
            message,
            custom_prompt
        )
        return result or ""


class ObjectionStrategy(ResponseStrategy):
    """異議處理策略 - 處理價格、質量等異議"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否為異議"""
        objection_keywords = [
            '貴', '便宜', '價格', '多少錢', '價錢', '費用', 'cost', 'price',
            '質量', '品質', '效果', '好用', '不好', '差', 'quality',
            '不感興趣', '不需要', '不用', '沒興趣', 'not interested',
            '考慮', '再看看', '想想', 'think', 'consider'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in objection_keywords)
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成異議處理回復"""
        custom_prompt = "用戶提出了異議或顧慮（可能是價格、質量等）。請用同理心的方式回應，不要直接反駁，而是理解用戶的擔心，然後溫和地解釋我們的優勢和價值。保持友善專業（40-100字）。"
        result = await ai_service._generate_response_with_prompt(
            context.get('user_id'),
            message,
            custom_prompt
        )
        return result or ""


class ClosingStrategy(ResponseStrategy):
    """成交策略 - 處理購買意向"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否為購買意向"""
        closing_keywords = [
            '買', '購買', '訂購', '下單', '要', '需要', 'buy', 'purchase', 'order',
            '付款', '支付', '付費', 'pay', 'payment',
            '聯繫', '聯絡', '詳情', '資料', '了解', 'contact', 'details'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in closing_keywords)
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成成交引導回復"""
        custom_prompt = "用戶表現出購買或了解意向。請用積極但不急迫的方式回應，引導用戶進一步了解或購買。可以提供聯繫方式或下一步行動建議。保持專業和熱情（40-100字）。"
        result = await ai_service._generate_response_with_prompt(
            context.get('user_id'),
            message,
            custom_prompt
        )
        return result or ""


class FollowUpStrategy(ResponseStrategy):
    """跟進策略 - 處理後續對話"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """判斷是否為跟進消息"""
        # 檢查是否有之前的對話記錄
        conversation_count = context.get('conversation_count', 0)
        return conversation_count > 1  # 不是第一次對話
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成跟進回復"""
        custom_prompt = "這是與用戶的後續對話。請基於之前的對話內容，用自然的語調繼續交流。如果之前討論過產品或服務，可以適當提及相關信息。保持連貫性和友好度（30-80字）。"
        result = await ai_service._generate_response_with_prompt(
            context.get('user_id'),
            message,
            custom_prompt
        )
        return result or ""


class DefaultStrategy(ResponseStrategy):
    """默認策略 - 處理其他情況"""
    
    async def should_use(self, message: str, context: Dict[str, Any]) -> bool:
        """默認策略總是可用"""
        return True
    
    async def generate(self, message: str, context: Dict[str, Any], ai_service: Any) -> str:
        """生成默認回復"""
        # 使用 AI 服務的默認生成方法
        return await ai_service._generate_response(
            context.get('user_id'),
            message
        )


class AIResponseStrategyManager:
    """AI 回復策略管理器"""
    
    def __init__(self):
        self.strategies: List[ResponseStrategy] = [
            GreetingStrategy(),      # 問候策略（優先級最高）
            QuestionStrategy(),      # 問題回答策略
            ObjectionStrategy(),     # 異議處理策略
            ClosingStrategy(),       # 成交策略
            FollowUpStrategy(),      # 跟進策略
            DefaultStrategy(),       # 默認策略（最後）
        ]
    
    async def select_strategy(self, message: str, context: Dict[str, Any]) -> ResponseStrategy:
        """
        根據消息內容選擇最合適的策略
        
        Args:
            message: 用戶消息
            context: 上下文信息（user_id, username, conversation_count 等）
            
        Returns:
            選定的策略
        """
        for strategy in self.strategies:
            if await strategy.should_use(message, context):
                return strategy
        
        # 如果沒有策略匹配，返回默認策略
        return DefaultStrategy()
    
    async def generate_response(
        self, 
        message: str, 
        context: Dict[str, Any], 
        ai_service: Any
    ) -> Optional[str]:
        """
        使用選定策略生成回復
        
        Args:
            message: 用戶消息
            context: 上下文信息
            ai_service: AI 服務實例
            
        Returns:
            生成的回復，如果生成失敗則返回 None
        """
        # 選擇策略
        strategy = await self.select_strategy(message, context)
        
        # 生成回復
        try:
            response = await strategy.generate(message, context, ai_service)
            return response
        except Exception as e:
            print(f"[AIResponseStrategy] Error generating response with {strategy.__class__.__name__}: {e}")
            # 如果策略失敗，嘗試使用默認策略
            if not isinstance(strategy, DefaultStrategy):
                default_strategy = DefaultStrategy()
                return await default_strategy.generate(message, context, ai_service)
            return None

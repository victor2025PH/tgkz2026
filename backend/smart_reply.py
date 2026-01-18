"""
智能回覆建議系統
Smart Reply Suggestion System

功能:
1. 根據對話上下文生成多個回覆選項
2. 支持模板和 AI 混合模式
3. 提供回覆語氣和風格選擇
4. 學習歷史成功回覆模式
"""

import sys
import random
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class ReplyTone(Enum):
    """回覆語氣"""
    PROFESSIONAL = "professional"  # 專業正式
    FRIENDLY = "friendly"          # 友好親切
    CASUAL = "casual"              # 輕鬆隨意
    URGENT = "urgent"              # 緊急促銷
    SUPPORTIVE = "supportive"      # 支持幫助


class ReplyType(Enum):
    """回覆類型"""
    GREETING = "greeting"          # 問候
    INQUIRY = "inquiry"            # 詢問需求
    PRICE = "price"                # 報價
    PROMOTION = "promotion"        # 促銷
    FOLLOWUP = "followup"          # 跟進
    CLOSING = "closing"            # 成交
    SUPPORT = "support"            # 技術支持


@dataclass
class ReplySuggestion:
    """回覆建議"""
    text: str                           # 回覆文本
    reply_type: ReplyType               # 回覆類型
    tone: ReplyTone                     # 語氣
    confidence: float                   # 置信度 0-1
    reason: str                         # 推薦理由
    variables: Dict[str, str] = None    # 可替換變量


@dataclass
class SmartReplyResult:
    """智能回覆結果"""
    suggestions: List[ReplySuggestion]  # 建議列表
    context_summary: str                # 上下文總結
    detected_intent: str                # 檢測到的意圖
    recommended_action: str             # 推薦行動
    timestamp: datetime = field(default_factory=datetime.now)


class SmartReplyGenerator:
    """智能回覆生成器"""
    
    def __init__(self):
        # 問候模板
        self.greeting_templates = {
            ReplyTone.PROFESSIONAL: [
                "您好！感謝您的關注，請問有什麼可以幫到您的？",
                "您好，歡迎諮詢！我是{agent_name}，很高興為您服務。",
                "您好！看到您對{topic}感興趣，有什麼問題可以隨時問我。",
            ],
            ReplyTone.FRIENDLY: [
                "嗨！歡迎歡迎～有什麼想了解的嗎？😊",
                "你好呀！有什麼可以幫你的嗎？",
                "Hi～看到你的消息啦，有什麼需要的嗎？",
            ],
            ReplyTone.CASUAL: [
                "嗨～",
                "你好！",
                "在呢，有事嗎？",
            ],
        }
        
        # 詢問需求模板
        self.inquiry_templates = {
            ReplyTone.PROFESSIONAL: [
                "請問您具體需要什麼服務呢？可以詳細說明一下嗎？",
                "好的，方便告訴我您的具體需求嗎？這樣我可以更好地為您推薦。",
                "了解，請問您預算大概是多少？需要什麼樣的規格？",
            ],
            ReplyTone.FRIENDLY: [
                "好哒！那你大概想要什麼樣的呢？我給你推薦推薦～",
                "沒問題！先告訴我你的需求，我幫你找最合適的！",
                "好的好的！你具體想要什麼呢？我們有很多選擇的～",
            ],
        }
        
        # 報價模板
        self.price_templates = {
            ReplyTone.PROFESSIONAL: [
                "關於價格，我們目前的報價是{price}，這是市場上非常有競爭力的價格。",
                "這款產品/服務的價格是{price}，包含{features}。",
                "報價如下：\n{price_list}\n如有疑問請隨時問我。",
            ],
            ReplyTone.FRIENDLY: [
                "價格的話是{price}哦，很划算的！",
                "這個{price}就可以搞定啦～很實惠的！",
                "我們現在{price}，比外面便宜很多呢！",
            ],
        }
        
        # 促銷模板
        self.promotion_templates = {
            ReplyTone.URGENT: [
                "🔥 限時優惠！現在下單立減{discount}！機會難得！",
                "⏰ 今日特惠最後{hours}小時！錯過要等下次活動！",
                "💥 新客戶專享價{special_price}！名額有限先到先得！",
            ],
            ReplyTone.FRIENDLY: [
                "對了，現在有個優惠活動哦～{discount}，挺划算的！",
                "正好趕上我們的活動，現在入手最合適啦～",
                "告訴你個好消息，現在有{discount}的優惠哦！",
            ],
        }
        
        # 跟進模板
        self.followup_templates = {
            ReplyTone.PROFESSIONAL: [
                "您好，之前諮詢的事情考慮得怎麼樣了？有什麼疑問我可以解答嗎？",
                "想跟進一下上次的溝通，不知道您這邊有什麼新的想法？",
                "之前給您的方案看了嗎？有需要調整的地方請告訴我。",
            ],
            ReplyTone.FRIENDLY: [
                "嗨～上次聊的那個，你考慮得怎麼樣啦？",
                "Hey！還記得我嗎？之前的那個想好了嗎？",
                "來看看你～上次的事有什麼進展嗎？",
            ],
        }
        
        # 成交模板
        self.closing_templates = {
            ReplyTone.PROFESSIONAL: [
                "好的，確認一下訂單詳情：{order_details}\n請確認無誤後我這邊安排處理。",
                "感謝您的信任！訂單已確認，接下來{next_steps}。",
                "合作愉快！請按以下方式完成付款：{payment_info}",
            ],
            ReplyTone.FRIENDLY: [
                "太棒啦！訂單我這就給你安排～",
                "搞定！接下來就等著收貨吧～有問題隨時找我！",
                "合作愉快呀！有任何問題記得找我～",
            ],
        }
        
        # 意圖到回覆類型的映射
        self.intent_reply_mapping = {
            "purchase": ReplyType.PRICE,
            "inquiry": ReplyType.INQUIRY,
            "comparison": ReplyType.PRICE,
            "complaint": ReplyType.SUPPORT,
            "support": ReplyType.SUPPORT,
            "general": ReplyType.GREETING,
        }
    
    def generate_replies(
        self,
        message: str,
        context: List[str] = None,
        intent_type: str = "general",
        intent_score: int = 50,
        tone_preference: ReplyTone = None,
        max_suggestions: int = 3
    ) -> SmartReplyResult:
        """
        生成智能回覆建議
        
        Args:
            message: 用戶消息
            context: 對話上下文
            intent_type: 意圖類型
            intent_score: 意圖分數
            tone_preference: 偏好語氣
            max_suggestions: 最大建議數量
            
        Returns:
            SmartReplyResult 回覆結果
        """
        suggestions = []
        
        # 確定回覆類型
        reply_type = self.intent_reply_mapping.get(intent_type, ReplyType.GREETING)
        
        # 確定語氣（根據意圖分數）
        if tone_preference:
            primary_tone = tone_preference
        elif intent_score >= 70:
            primary_tone = ReplyTone.PROFESSIONAL
        elif intent_score >= 40:
            primary_tone = ReplyTone.FRIENDLY
        else:
            primary_tone = ReplyTone.CASUAL
        
        # 根據回覆類型獲取模板
        templates = self._get_templates_for_type(reply_type)
        
        # 生成主要建議
        if primary_tone in templates:
            for template in templates[primary_tone][:max_suggestions]:
                suggestions.append(ReplySuggestion(
                    text=self._fill_template(template, message),
                    reply_type=reply_type,
                    tone=primary_tone,
                    confidence=0.8,
                    reason=f"基於{intent_type}意圖的{primary_tone.value}風格回覆"
                ))
        
        # 添加不同語氣的備選
        if len(suggestions) < max_suggestions:
            alt_tones = [t for t in ReplyTone if t != primary_tone and t in templates]
            for tone in alt_tones[:max_suggestions - len(suggestions)]:
                if templates.get(tone):
                    suggestions.append(ReplySuggestion(
                        text=self._fill_template(templates[tone][0], message),
                        reply_type=reply_type,
                        tone=tone,
                        confidence=0.6,
                        reason=f"備選{tone.value}風格"
                    ))
        
        # 高意向時添加促銷/成交選項
        if intent_score >= 60:
            promo_templates = self.promotion_templates.get(ReplyTone.FRIENDLY, [])
            if promo_templates:
                suggestions.append(ReplySuggestion(
                    text=self._fill_template(promo_templates[0], message),
                    reply_type=ReplyType.PROMOTION,
                    tone=ReplyTone.FRIENDLY,
                    confidence=0.7,
                    reason="高意向客戶可嘗試促銷推動"
                ))
        
        # 生成行動建議
        recommended_action = self._get_recommended_action(intent_type, intent_score)
        
        return SmartReplyResult(
            suggestions=suggestions[:max_suggestions],
            context_summary=f"用戶消息: {message[:50]}..." if len(message) > 50 else f"用戶消息: {message}",
            detected_intent=intent_type,
            recommended_action=recommended_action
        )
    
    def _get_templates_for_type(self, reply_type: ReplyType) -> Dict[ReplyTone, List[str]]:
        """獲取對應類型的模板"""
        mapping = {
            ReplyType.GREETING: self.greeting_templates,
            ReplyType.INQUIRY: self.inquiry_templates,
            ReplyType.PRICE: self.price_templates,
            ReplyType.PROMOTION: self.promotion_templates,
            ReplyType.FOLLOWUP: self.followup_templates,
            ReplyType.CLOSING: self.closing_templates,
        }
        return mapping.get(reply_type, self.greeting_templates)
    
    def _fill_template(self, template: str, message: str) -> str:
        """填充模板變量"""
        # 簡單的變量替換
        result = template
        result = result.replace("{agent_name}", "客服小助手")
        result = result.replace("{topic}", "我們的服務")
        result = result.replace("{price}", "詳情私聊")
        result = result.replace("{discount}", "8折優惠")
        result = result.replace("{hours}", "24")
        result = result.replace("{special_price}", "限時特價")
        result = result.replace("{features}", "全套服務")
        result = result.replace("{price_list}", "請私聊獲取報價單")
        result = result.replace("{order_details}", "[訂單詳情]")
        result = result.replace("{next_steps}", "我會盡快處理")
        result = result.replace("{payment_info}", "[付款方式]")
        return result
    
    def _get_recommended_action(self, intent_type: str, intent_score: int) -> str:
        """獲取推薦行動"""
        if intent_score >= 80:
            return "🔥 高意向客戶！立即跟進，提供報價和付款方式"
        elif intent_score >= 60:
            return "👍 有明確興趣，積極介紹產品優勢和優惠"
        elif intent_score >= 40:
            return "📋 耐心解答疑問，了解具體需求"
        elif intent_score >= 20:
            return "💬 保持聯繫，定期跟進"
        else:
            return "ℹ️ 記錄信息，觀察後續"


# 全局生成器實例
_generator = None

def get_smart_reply_generator() -> SmartReplyGenerator:
    """獲取全局生成器實例"""
    global _generator
    if _generator is None:
        _generator = SmartReplyGenerator()
    return _generator


async def generate_smart_replies(
    message: str,
    context: List[str] = None,
    intent_type: str = "general",
    intent_score: int = 50,
    max_suggestions: int = 3
) -> Dict[str, Any]:
    """
    生成智能回覆建議（異步接口）
    
    Returns:
        Dict 包含回覆建議
    """
    generator = get_smart_reply_generator()
    result = generator.generate_replies(
        message=message,
        context=context,
        intent_type=intent_type,
        intent_score=intent_score,
        max_suggestions=max_suggestions
    )
    
    return {
        "suggestions": [
            {
                "text": s.text,
                "type": s.reply_type.value,
                "tone": s.tone.value,
                "confidence": s.confidence,
                "reason": s.reason
            }
            for s in result.suggestions
        ],
        "context_summary": result.context_summary,
        "detected_intent": result.detected_intent,
        "recommended_action": result.recommended_action
    }

"""
意圖評分系統
Intent Scoring System

功能:
1. 分析消息內容評估購買意向
2. 基於關鍵詞和模式識別意圖強度
3. 支持自定義評分規則
4. 提供意圖分類（購買/諮詢/比價/觀望等）
"""

import re
import sys
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class IntentLevel(Enum):
    """意圖強度等級"""
    HOT = "hot"           # 熱門 - 強烈購買意向 (80-100分)
    WARM = "warm"         # 溫暖 - 明確興趣 (60-79分)
    NEUTRAL = "neutral"   # 中性 - 一般詢問 (40-59分)
    COLD = "cold"         # 冷淡 - 觀望態度 (20-39分)
    NONE = "none"         # 無意向 (0-19分)


class IntentType(Enum):
    """意圖類型"""
    PURCHASE = "purchase"       # 購買意向
    INQUIRY = "inquiry"         # 諮詢詢問
    COMPARISON = "comparison"   # 比價比較
    COMPLAINT = "complaint"     # 投訴抱怨
    SUPPORT = "support"         # 技術支持
    GENERAL = "general"         # 一般對話


@dataclass
class IntentScore:
    """意圖評分結果"""
    score: int                          # 總分 0-100
    level: IntentLevel                  # 意圖等級
    intent_type: IntentType             # 意圖類型
    confidence: float                   # 置信度 0-1
    matched_keywords: List[str]         # 匹配到的關鍵詞
    matched_patterns: List[str]         # 匹配到的模式
    breakdown: Dict[str, int]           # 分數細分
    suggestions: List[str]              # 跟進建議
    timestamp: datetime = field(default_factory=datetime.now)


class IntentScorer:
    """意圖評分器"""
    
    def __init__(self):
        # 高意向關鍵詞 (+15-25分)
        self.high_intent_keywords = {
            # 購買相關
            "想買": 25, "要買": 25, "購買": 25, "下單": 25, "付款": 25,
            "怎麼買": 20, "如何購買": 20, "哪裡買": 20, "能買嗎": 20,
            "多少錢": 18, "什麼價": 18, "價格": 15, "費用": 15,
            "需要": 15, "想要": 15, "馬上": 20, "立刻": 20, "急": 18,
            # 支付相關
            "支付": 20, "轉賬": 20, "匯款": 20, "打款": 20,
            "怎麼付": 18, "付錢": 18, "給錢": 18,
            # 交易相關
            "換U": 22, "換幣": 22, "兌換": 20, "出入金": 22,
            "USDT": 18, "BTC": 18, "ETH": 18, "加密貨幣": 15,
        }
        
        # 中意向關鍵詞 (+8-14分)
        self.medium_intent_keywords = {
            "了解": 12, "諮詢": 12, "問一下": 10, "請問": 10,
            "可以嗎": 10, "行不行": 10, "能不能": 10,
            "有沒有": 8, "是否": 8, "怎麼樣": 8,
            "服務": 10, "業務": 10, "合作": 12,
            "推薦": 10, "介紹": 10, "說明": 8,
            "安全": 12, "靠譜": 12, "可靠": 12,
            "優惠": 10, "折扣": 10, "活動": 8,
        }
        
        # 低意向關鍵詞 (+3-7分)
        self.low_intent_keywords = {
            "看看": 5, "隨便問問": 3, "先了解": 5,
            "考慮": 5, "再說": 3, "以後": 3,
            "不急": 3, "不一定": 3, "可能": 3,
        }
        
        # 負面關鍵詞 (-5-15分)
        self.negative_keywords = {
            "不需要": -15, "不要": -12, "不買": -15,
            "騙子": -20, "騙人": -20, "假的": -15,
            "太貴": -10, "太高": -8, "不值": -10,
            "算了": -10, "不用": -10, "沒興趣": -15,
            "投訴": -5, "舉報": -5,
        }
        
        # 意圖模式 (正則表達式)
        self.intent_patterns = {
            IntentType.PURCHASE: [
                (r"想(要|買|購買)", 20),
                (r"(怎麼|如何|哪裡)(買|購買|下單)", 18),
                (r"(多少|什麼)(錢|價格|價位)", 15),
                (r"(能|可以)(買|購買|下單)嗎", 18),
                (r"(馬上|立刻|現在)(要|買|需要)", 22),
            ],
            IntentType.INQUIRY: [
                (r"(請問|問一下|諮詢)", 10),
                (r"(了解|知道)(一下|下)", 8),
                (r"(有沒有|是否有)", 8),
                (r"(怎麼|如何)(操作|使用)", 10),
            ],
            IntentType.COMPARISON: [
                (r"(對比|比較|相比)", 8),
                (r"(哪個|哪家)(好|更好|便宜)", 10),
                (r"(別人|其他)(家|平台)", 8),
                (r"(優勢|區別|差別)", 8),
            ],
        }
        
        # 緊迫度模式
        self.urgency_patterns = [
            (r"(急|緊急|馬上|立刻|現在)", 15),
            (r"(今天|現在|立即)", 12),
            (r"(儘快|盡快|快點)", 10),
        ]
    
    def score_message(self, message: str, context: List[str] = None) -> IntentScore:
        """
        評估消息的意圖分數
        
        Args:
            message: 要評分的消息
            context: 上下文消息列表（可選）
            
        Returns:
            IntentScore 評分結果
        """
        if not message:
            return IntentScore(
                score=0,
                level=IntentLevel.NONE,
                intent_type=IntentType.GENERAL,
                confidence=0.0,
                matched_keywords=[],
                matched_patterns=[],
                breakdown={},
                suggestions=["消息為空，無法評分"]
            )
        
        message_lower = message.lower()
        
        # 分數細分
        breakdown = {
            "high_intent": 0,
            "medium_intent": 0,
            "low_intent": 0,
            "negative": 0,
            "pattern": 0,
            "urgency": 0,
            "context_bonus": 0
        }
        
        matched_keywords = []
        matched_patterns = []
        detected_intents = {}
        
        # 1. 關鍵詞匹配
        for keyword, score in self.high_intent_keywords.items():
            if keyword in message:
                breakdown["high_intent"] += score
                matched_keywords.append(keyword)
        
        for keyword, score in self.medium_intent_keywords.items():
            if keyword in message:
                breakdown["medium_intent"] += score
                matched_keywords.append(keyword)
        
        for keyword, score in self.low_intent_keywords.items():
            if keyword in message:
                breakdown["low_intent"] += score
                matched_keywords.append(keyword)
        
        for keyword, score in self.negative_keywords.items():
            if keyword in message:
                breakdown["negative"] += score
                matched_keywords.append(keyword)
        
        # 2. 模式匹配
        for intent_type, patterns in self.intent_patterns.items():
            for pattern, score in patterns:
                if re.search(pattern, message):
                    breakdown["pattern"] += score
                    matched_patterns.append(pattern)
                    detected_intents[intent_type] = detected_intents.get(intent_type, 0) + score
        
        # 3. 緊迫度評估
        for pattern, score in self.urgency_patterns:
            if re.search(pattern, message):
                breakdown["urgency"] += score
                matched_patterns.append(f"urgency:{pattern}")
        
        # 4. 上下文加分
        if context and len(context) > 0:
            # 多輪對話加分
            breakdown["context_bonus"] += min(len(context) * 3, 15)
        
        # 計算總分
        total_score = sum(breakdown.values())
        total_score = max(0, min(100, total_score))  # 限制在 0-100
        
        # 確定意圖等級
        level = self._get_intent_level(total_score)
        
        # 確定主要意圖類型
        intent_type = self._get_primary_intent(detected_intents, total_score)
        
        # 計算置信度
        confidence = self._calculate_confidence(matched_keywords, matched_patterns, total_score)
        
        # 生成跟進建議
        suggestions = self._generate_suggestions(level, intent_type, total_score)
        
        return IntentScore(
            score=total_score,
            level=level,
            intent_type=intent_type,
            confidence=confidence,
            matched_keywords=matched_keywords,
            matched_patterns=matched_patterns,
            breakdown=breakdown,
            suggestions=suggestions
        )
    
    def _get_intent_level(self, score: int) -> IntentLevel:
        """根據分數確定意圖等級"""
        if score >= 80:
            return IntentLevel.HOT
        elif score >= 60:
            return IntentLevel.WARM
        elif score >= 40:
            return IntentLevel.NEUTRAL
        elif score >= 20:
            return IntentLevel.COLD
        else:
            return IntentLevel.NONE
    
    def _get_primary_intent(self, detected_intents: Dict[IntentType, int], score: int) -> IntentType:
        """確定主要意圖類型"""
        if not detected_intents:
            return IntentType.GENERAL if score < 40 else IntentType.INQUIRY
        
        # 返回得分最高的意圖類型
        return max(detected_intents, key=detected_intents.get)
    
    def _calculate_confidence(self, keywords: List[str], patterns: List[str], score: int) -> float:
        """計算置信度"""
        # 基於匹配數量和分數計算置信度
        match_count = len(keywords) + len(patterns)
        
        if match_count == 0:
            return 0.1
        elif match_count <= 2:
            base_confidence = 0.3
        elif match_count <= 5:
            base_confidence = 0.6
        else:
            base_confidence = 0.8
        
        # 高分時提高置信度
        if score >= 60:
            base_confidence += 0.15
        
        return min(0.95, base_confidence)
    
    def _generate_suggestions(self, level: IntentLevel, intent_type: IntentType, score: int) -> List[str]:
        """生成跟進建議"""
        suggestions = []
        
        if level == IntentLevel.HOT:
            suggestions.append("🔥 高意向客戶，立即跟進！")
            suggestions.append("建議直接提供報價和付款方式")
            suggestions.append("可以主動詢問具體需求量")
        elif level == IntentLevel.WARM:
            suggestions.append("👍 有明確興趣，積極跟進")
            suggestions.append("提供詳細產品/服務介紹")
            suggestions.append("解答疑慮，建立信任")
        elif level == IntentLevel.NEUTRAL:
            suggestions.append("📋 一般詢問，耐心解答")
            suggestions.append("了解具體需求，針對性回覆")
            suggestions.append("可發送資料供參考")
        elif level == IntentLevel.COLD:
            suggestions.append("❄️ 觀望態度，保持聯繫")
            suggestions.append("定期跟進，不要過於頻繁")
            suggestions.append("分享案例或優惠活動")
        else:
            suggestions.append("ℹ️ 低意向，記錄備用")
        
        if intent_type == IntentType.COMPARISON:
            suggestions.append("強調競爭優勢和差異化")
        elif intent_type == IntentType.COMPLAINT:
            suggestions.append("⚠️ 注意處理投訴，優先解決問題")
        
        return suggestions


# 全局評分器實例
_scorer = None

def get_intent_scorer() -> IntentScorer:
    """獲取全局評分器實例"""
    global _scorer
    if _scorer is None:
        _scorer = IntentScorer()
    return _scorer


async def score_lead_intent(message: str, context: List[str] = None) -> Dict[str, Any]:
    """
    評估 Lead 意圖（異步接口）
    
    Returns:
        Dict 包含評分結果
    """
    scorer = get_intent_scorer()
    result = scorer.score_message(message, context)
    
    return {
        "score": result.score,
        "level": result.level.value,
        "intent_type": result.intent_type.value,
        "confidence": result.confidence,
        "matched_keywords": result.matched_keywords,
        "breakdown": result.breakdown,
        "suggestions": result.suggestions
    }

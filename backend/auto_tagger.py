"""
自動標籤系統
Auto Tagging System

功能:
1. 根據關鍵詞自動打標籤
2. 根據用戶行為打標籤
3. 根據意圖分數打標籤
4. 支持自定義標籤規則
"""

import re
import sys
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class TagCategory(Enum):
    """標籤類別"""
    INTEREST = "interest"       # 興趣標籤
    BEHAVIOR = "behavior"       # 行為標籤
    INTENT = "intent"           # 意圖標籤
    SOURCE = "source"           # 來源標籤
    STATUS = "status"           # 狀態標籤
    CUSTOM = "custom"           # 自定義標籤


@dataclass
class Tag:
    """標籤"""
    name: str
    category: TagCategory
    color: str = "#6366f1"      # 默認紫色
    priority: int = 0           # 優先級（越高越重要）
    auto_generated: bool = True # 是否自動生成


@dataclass
class TaggingResult:
    """標籤結果"""
    tags: List[Tag]
    matched_rules: List[str]
    confidence: float
    timestamp: datetime = field(default_factory=datetime.now)


class AutoTagger:
    """自動標籤器"""
    
    def __init__(self):
        # 關鍵詞到標籤的映射
        self.keyword_tags = {
            # 加密貨幣相關
            "crypto": [
                (["USDT", "BTC", "ETH", "加密", "數字貨幣", "虛擬幣", "幣圈"], 
                 Tag("加密貨幣", TagCategory.INTEREST, "#f59e0b", 8)),
                (["換U", "出金", "入金", "兌換"], 
                 Tag("交易需求", TagCategory.INTEREST, "#10b981", 9)),
            ],
            # 投資相關
            "investment": [
                (["投資", "理財", "收益", "回報", "利息"], 
                 Tag("投資興趣", TagCategory.INTEREST, "#3b82f6", 7)),
                (["股票", "基金", "期貨", "外匯"], 
                 Tag("傳統投資", TagCategory.INTEREST, "#8b5cf6", 6)),
            ],
            # 購買意向
            "purchase": [
                (["想買", "要買", "購買", "下單", "付款"], 
                 Tag("購買意向", TagCategory.INTENT, "#ef4444", 10)),
                (["多少錢", "什麼價", "價格", "報價"], 
                 Tag("詢價中", TagCategory.INTENT, "#f97316", 8)),
            ],
            # 諮詢相關
            "inquiry": [
                (["諮詢", "了解", "請問", "問一下"], 
                 Tag("諮詢中", TagCategory.BEHAVIOR, "#06b6d4", 5)),
                (["怎麼", "如何", "是什麼"], 
                 Tag("新手", TagCategory.STATUS, "#64748b", 4)),
            ],
            # 緊急程度
            "urgency": [
                (["急", "馬上", "立刻", "現在", "今天"], 
                 Tag("緊急", TagCategory.STATUS, "#dc2626", 10)),
                (["儘快", "盡快", "快點"], 
                 Tag("較急", TagCategory.STATUS, "#ea580c", 7)),
            ],
            # 負面情緒
            "negative": [
                (["騙子", "騙人", "假的", "不信"], 
                 Tag("存疑", TagCategory.STATUS, "#94a3b8", 3)),
                (["投訴", "舉報", "退款"], 
                 Tag("投訴風險", TagCategory.STATUS, "#991b1b", 9)),
            ],
        }
        
        # 意圖分數到標籤的映射
        self.intent_score_tags = [
            (80, 100, Tag("🔥 熱門", TagCategory.INTENT, "#dc2626", 10)),
            (60, 79, Tag("👍 溫暖", TagCategory.INTENT, "#f97316", 8)),
            (40, 59, Tag("💬 中性", TagCategory.INTENT, "#3b82f6", 5)),
            (20, 39, Tag("❄️ 冷淡", TagCategory.INTENT, "#64748b", 3)),
            (0, 19, Tag("⏸️ 觀望", TagCategory.INTENT, "#94a3b8", 1)),
        ]
        
        # 行為標籤規則
        self.behavior_rules = {
            "replied": Tag("已回覆", TagCategory.BEHAVIOR, "#10b981", 6),
            "multiple_inquiries": Tag("多次詢問", TagCategory.BEHAVIOR, "#8b5cf6", 7),
            "active_chatter": Tag("活躍用戶", TagCategory.BEHAVIOR, "#06b6d4", 6),
            "night_owl": Tag("夜間活躍", TagCategory.BEHAVIOR, "#6366f1", 4),
            "quick_responder": Tag("響應快", TagCategory.BEHAVIOR, "#22c55e", 5),
        }
        
        # 來源標籤
        self.source_tags = {
            "group": Tag("群組來源", TagCategory.SOURCE, "#0ea5e9", 3),
            "channel": Tag("頻道來源", TagCategory.SOURCE, "#6366f1", 3),
            "direct": Tag("直接消息", TagCategory.SOURCE, "#8b5cf6", 3),
            "referral": Tag("推薦來源", TagCategory.SOURCE, "#f59e0b", 5),
        }
    
    def tag_message(self, message: str, intent_score: int = 0) -> TaggingResult:
        """
        根據消息內容自動打標籤
        
        Args:
            message: 消息文本
            intent_score: 意圖分數
            
        Returns:
            TaggingResult 標籤結果
        """
        tags = []
        matched_rules = []
        
        # 1. 關鍵詞匹配
        for category, rules in self.keyword_tags.items():
            for keywords, tag in rules:
                for keyword in keywords:
                    if keyword.lower() in message.lower():
                        if tag not in tags:
                            tags.append(tag)
                            matched_rules.append(f"關鍵詞匹配: {keyword} -> {tag.name}")
                        break
        
        # 2. 意圖分數標籤
        for min_score, max_score, tag in self.intent_score_tags:
            if min_score <= intent_score <= max_score:
                tags.append(tag)
                matched_rules.append(f"意圖分數: {intent_score} -> {tag.name}")
                break
        
        # 3. 計算置信度
        confidence = min(0.95, 0.5 + len(matched_rules) * 0.1)
        
        # 4. 按優先級排序
        tags.sort(key=lambda t: t.priority, reverse=True)
        
        return TaggingResult(
            tags=tags,
            matched_rules=matched_rules,
            confidence=confidence
        )
    
    def tag_by_behavior(
        self,
        has_replied: bool = False,
        inquiry_count: int = 0,
        message_count: int = 0,
        is_night_active: bool = False,
        avg_response_time_seconds: float = 0
    ) -> List[Tag]:
        """
        根據用戶行為打標籤
        
        Returns:
            List[Tag] 行為標籤列表
        """
        tags = []
        
        if has_replied:
            tags.append(self.behavior_rules["replied"])
        
        if inquiry_count >= 3:
            tags.append(self.behavior_rules["multiple_inquiries"])
        
        if message_count >= 10:
            tags.append(self.behavior_rules["active_chatter"])
        
        if is_night_active:
            tags.append(self.behavior_rules["night_owl"])
        
        if avg_response_time_seconds > 0 and avg_response_time_seconds < 60:
            tags.append(self.behavior_rules["quick_responder"])
        
        return tags
    
    def tag_by_source(self, source_url: str) -> Optional[Tag]:
        """
        根據來源打標籤
        
        Args:
            source_url: 來源 URL
            
        Returns:
            Tag 來源標籤
        """
        if not source_url:
            return None
        
        source_lower = source_url.lower()
        
        if "t.me/+" in source_lower or "joinchat" in source_lower:
            return self.source_tags["group"]
        elif "t.me/" in source_lower:
            return self.source_tags["channel"]
        else:
            return self.source_tags["direct"]
    
    def get_all_tags_for_lead(
        self,
        message: str,
        intent_score: int = 0,
        source_url: str = "",
        has_replied: bool = False,
        inquiry_count: int = 0
    ) -> Dict[str, Any]:
        """
        獲取 Lead 的所有自動標籤
        
        Returns:
            Dict 包含所有標籤信息
        """
        all_tags = []
        all_rules = []
        
        # 消息標籤
        msg_result = self.tag_message(message, intent_score)
        all_tags.extend(msg_result.tags)
        all_rules.extend(msg_result.matched_rules)
        
        # 行為標籤
        behavior_tags = self.tag_by_behavior(
            has_replied=has_replied,
            inquiry_count=inquiry_count
        )
        all_tags.extend(behavior_tags)
        
        # 來源標籤
        source_tag = self.tag_by_source(source_url)
        if source_tag:
            all_tags.append(source_tag)
            all_rules.append(f"來源: {source_url} -> {source_tag.name}")
        
        # 去重並排序
        unique_tags = list({t.name: t for t in all_tags}.values())
        unique_tags.sort(key=lambda t: t.priority, reverse=True)
        
        return {
            "tags": [
                {
                    "name": t.name,
                    "category": t.category.value,
                    "color": t.color,
                    "priority": t.priority,
                    "auto_generated": t.auto_generated
                }
                for t in unique_tags
            ],
            "matched_rules": all_rules,
            "tag_count": len(unique_tags)
        }


# 全局標籤器實例
_tagger = None

def get_auto_tagger() -> AutoTagger:
    """獲取全局標籤器實例"""
    global _tagger
    if _tagger is None:
        _tagger = AutoTagger()
    return _tagger


async def auto_tag_lead(
    message: str,
    intent_score: int = 0,
    source_url: str = "",
    has_replied: bool = False,
    inquiry_count: int = 0
) -> Dict[str, Any]:
    """
    自動標籤 Lead（異步接口）
    
    Returns:
        Dict 包含標籤結果
    """
    tagger = get_auto_tagger()
    return tagger.get_all_tags_for_lead(
        message=message,
        intent_score=intent_score,
        source_url=source_url,
        has_replied=has_replied,
        inquiry_count=inquiry_count
    )

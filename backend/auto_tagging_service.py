"""
🏷️ 自動標籤系統 - Auto Tagging Service

功能：
1. AI 自動根據對話內容打標籤
2. 客戶意向自動分級 (A/B/C/D)
3. 行為特徵標記
4. 標籤畫像生成

效果：對話後自動標記「價格敏感」「決策快」「需要案例」
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from enum import Enum

# 導入數據庫
try:
    from database import db
except ImportError:
    db = None


class TagCategory(Enum):
    """標籤類別"""
    INTENT = "intent"           # 意向標籤
    BEHAVIOR = "behavior"       # 行為標籤
    PREFERENCE = "preference"   # 偏好標籤
    CONCERN = "concern"         # 關注點標籤
    PERSONALITY = "personality" # 性格標籤
    STAGE = "stage"             # 階段標籤


class IntentGrade(Enum):
    """意向等級"""
    A = "A"  # 高意向 - 準備成交
    B = "B"  # 中高意向 - 積極了解
    C = "C"  # 中意向 - 一般興趣
    D = "D"  # 低意向 - 暫無興趣
    N = "N"  # 無法判斷


@dataclass
class CustomerTag:
    """客戶標籤"""
    tag_id: str
    category: TagCategory
    name: str
    value: Any = None
    confidence: float = 1.0
    source: str = "ai_auto"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class CustomerProfile:
    """客戶畫像"""
    user_id: str
    intent_grade: IntentGrade = IntentGrade.N
    tags: List[CustomerTag] = field(default_factory=list)
    behavior_summary: str = ""
    last_active: datetime = field(default_factory=datetime.now)
    total_messages: int = 0
    avg_response_time: float = 0.0


class AutoTaggingService:
    """自動標籤服務"""
    
    def __init__(self):
        self._profiles: Dict[str, CustomerProfile] = {}
        self._initialized = False
        
        # 標籤規則定義
        self._tag_rules = {
            # 價格相關
            'price_sensitive': {
                'category': TagCategory.PREFERENCE,
                'keywords': ['太貴', '便宜', '優惠', '折扣', '劃算', '預算', '性價比'],
                'name': '價格敏感'
            },
            'budget_limited': {
                'category': TagCategory.CONCERN,
                'keywords': ['預算有限', '資金緊張', '錢不多', '量力而行'],
                'name': '預算有限'
            },
            
            # 決策相關
            'fast_decision': {
                'category': TagCategory.PERSONALITY,
                'keywords': ['馬上', '立刻', '現在', '趕緊', '今天', '儘快'],
                'name': '決策快速'
            },
            'careful_decision': {
                'category': TagCategory.PERSONALITY,
                'keywords': ['考慮', '想想', '再看看', '比較', '研究', '了解清楚'],
                'name': '謹慎決策'
            },
            
            # 需求相關
            'need_case': {
                'category': TagCategory.CONCERN,
                'keywords': ['案例', '例子', '誰用過', '效果', '反饋', '評價'],
                'name': '需要案例'
            },
            'need_demo': {
                'category': TagCategory.CONCERN,
                'keywords': ['演示', '試用', '體驗', '看看', '先試'],
                'name': '需要試用'
            },
            
            # 信任相關
            'trust_concern': {
                'category': TagCategory.CONCERN,
                'keywords': ['安全', '可靠', '保證', '擔心', '風險', '怕'],
                'name': '信任顧慮'
            },
            'brand_aware': {
                'category': TagCategory.PREFERENCE,
                'keywords': ['品牌', '大公司', '知名', '老牌'],
                'name': '品牌意識'
            },
            
            # 時間相關
            'urgent': {
                'category': TagCategory.BEHAVIOR,
                'keywords': ['急', '趕', '馬上', '立刻', '明天', '今天'],
                'name': '時間緊迫'
            },
            'not_urgent': {
                'category': TagCategory.BEHAVIOR,
                'keywords': ['不急', '以後', '再說', '過段時間', '等等'],
                'name': '不著急'
            },
            
            # 溝通風格
            'professional': {
                'category': TagCategory.PERSONALITY,
                'keywords': ['您', '貴司', '敬請', '煩請'],
                'name': '專業人士'
            },
            'casual_talker': {
                'category': TagCategory.PERSONALITY,
                'keywords': ['哈哈', '嘿', '哦', '呢', '啊'],
                'name': '輕鬆隨意'
            },
            
            # 購買信號
            'ready_to_buy': {
                'category': TagCategory.INTENT,
                'keywords': ['怎麼付款', '怎麼買', '下單', '購買', '成交', '合作'],
                'name': '準備購買'
            },
            'comparing': {
                'category': TagCategory.BEHAVIOR,
                'keywords': ['對比', '比較', '哪個好', '區別', '優勢'],
                'name': '正在比較'
            }
        }
        
        # 意向評分規則
        self._intent_signals = {
            'positive': {
                'keywords': ['好的', '可以', '行', '沒問題', '有興趣', '想要', '怎麼買'],
                'score': 10
            },
            'very_positive': {
                'keywords': ['太好了', '就這個', '成交', '下單', '付款'],
                'score': 25
            },
            'negative': {
                'keywords': ['不需要', '不要', '算了', '太貴', '再說'],
                'score': -10
            },
            'very_negative': {
                'keywords': ['不買', '沒興趣', '別煩我', '不要聯繫'],
                'score': -25
            }
        }
    
    async def initialize(self):
        """初始化，創建數據表"""
        if self._initialized:
            return
        
        try:
            # 創建標籤表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS customer_tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    tag_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value TEXT,
                    confidence REAL DEFAULT 1.0,
                    source TEXT DEFAULT 'ai_auto',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, tag_id)
                )
            """)
            
            # 創建畫像表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS customer_profiles (
                    user_id TEXT PRIMARY KEY,
                    intent_grade TEXT DEFAULT 'N',
                    intent_score INTEGER DEFAULT 0,
                    behavior_summary TEXT,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_messages INTEGER DEFAULT 0,
                    avg_response_time REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建索引
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_tags_user_id 
                ON customer_tags(user_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_tags_category 
                ON customer_tags(category)
            """)
            
            self._initialized = True
            print("[AutoTagging] ✓ 標籤系統已初始化", file=sys.stderr)
            
        except Exception as e:
            print(f"[AutoTagging] ✗ 初始化失敗: {e}", file=sys.stderr)
    
    async def analyze_and_tag(
        self,
        user_id: str,
        message: str,
        ai_response: str = "",
        intent_score: int = 50
    ) -> List[CustomerTag]:
        """分析消息並自動打標籤"""
        await self.initialize()
        
        new_tags = []
        
        # 1. 根據關鍵詞匹配標籤
        for tag_id, rule in self._tag_rules.items():
            for keyword in rule['keywords']:
                if keyword in message:
                    tag = CustomerTag(
                        tag_id=tag_id,
                        category=rule['category'],
                        name=rule['name'],
                        confidence=0.8,
                        source='keyword_match'
                    )
                    new_tags.append(tag)
                    break
        
        # 2. 計算意向評分變化
        score_delta = 0
        for signal_type, signal in self._intent_signals.items():
            for keyword in signal['keywords']:
                if keyword in message:
                    score_delta += signal['score']
        
        # 3. 更新客戶畫像
        await self._update_profile(user_id, new_tags, intent_score + score_delta)
        
        # 4. 保存標籤
        for tag in new_tags:
            await self._save_tag(user_id, tag)
        
        return new_tags
    
    async def _save_tag(self, user_id: str, tag: CustomerTag):
        """保存標籤"""
        try:
            await db.execute("""
                INSERT OR REPLACE INTO customer_tags
                (user_id, tag_id, category, name, value, confidence, source, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                user_id,
                tag.tag_id,
                tag.category.value,
                tag.name,
                json.dumps(tag.value) if tag.value else None,
                tag.confidence,
                tag.source
            ))
        except Exception as e:
            print(f"[AutoTagging] 保存標籤失敗: {e}", file=sys.stderr)
    
    async def _update_profile(
        self,
        user_id: str,
        new_tags: List[CustomerTag],
        intent_score: int
    ):
        """更新客戶畫像"""
        try:
            # 計算意向等級
            if intent_score >= 80:
                grade = IntentGrade.A
            elif intent_score >= 60:
                grade = IntentGrade.B
            elif intent_score >= 40:
                grade = IntentGrade.C
            elif intent_score >= 20:
                grade = IntentGrade.D
            else:
                grade = IntentGrade.N
            
            # 生成行為摘要
            tag_names = [t.name for t in new_tags]
            summary = "、".join(tag_names[:5]) if tag_names else ""
            
            await db.execute("""
                INSERT INTO customer_profiles (user_id, intent_grade, intent_score, behavior_summary, total_messages)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(user_id) DO UPDATE SET
                    intent_grade = excluded.intent_grade,
                    intent_score = excluded.intent_score,
                    behavior_summary = CASE 
                        WHEN excluded.behavior_summary != '' 
                        THEN excluded.behavior_summary 
                        ELSE customer_profiles.behavior_summary 
                    END,
                    total_messages = customer_profiles.total_messages + 1,
                    last_active = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, grade.value, intent_score, summary))
            
        except Exception as e:
            print(f"[AutoTagging] 更新畫像失敗: {e}", file=sys.stderr)
    
    async def get_customer_tags(self, user_id: str) -> List[Dict[str, Any]]:
        """獲取客戶標籤"""
        await self.initialize()
        
        try:
            tags = await db.fetch_all("""
                SELECT * FROM customer_tags 
                WHERE user_id = ?
                ORDER BY updated_at DESC
            """, (user_id,))
            
            return [dict(t) for t in tags] if tags else []
            
        except Exception as e:
            print(f"[AutoTagging] 獲取標籤失敗: {e}", file=sys.stderr)
            return []
    
    async def get_customer_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """獲取客戶畫像"""
        await self.initialize()
        
        try:
            profile = await db.fetch_one("""
                SELECT * FROM customer_profiles WHERE user_id = ?
            """, (user_id,))
            
            if profile:
                # 獲取標籤
                tags = await self.get_customer_tags(user_id)
                return {
                    **dict(profile),
                    'tags': tags
                }
            return None
            
        except Exception as e:
            print(f"[AutoTagging] 獲取畫像失敗: {e}", file=sys.stderr)
            return None
    
    async def generate_tag_prompt(self, user_id: str) -> str:
        """生成標籤增強 Prompt"""
        profile = await self.get_customer_profile(user_id)
        
        if not profile:
            return ""
        
        prompt_parts = ["【客戶畫像】"]
        
        # 意向等級
        grade = profile.get('intent_grade', 'N')
        grade_desc = {
            'A': '高意向客戶，準備成交',
            'B': '中高意向，積極了解中',
            'C': '一般興趣，需要培養',
            'D': '低意向，暫無購買計劃',
            'N': '新客戶，尚未評估'
        }
        prompt_parts.append(f"- 意向等級: {grade} ({grade_desc.get(grade, '')})")
        
        # 標籤
        tags = profile.get('tags', [])
        if tags:
            tag_names = [t['name'] for t in tags[:5]]
            prompt_parts.append(f"- 客戶特徵: {', '.join(tag_names)}")
        
        # 行為摘要
        summary = profile.get('behavior_summary', '')
        if summary:
            prompt_parts.append(f"- 行為摘要: {summary}")
        
        # 互動次數
        total = profile.get('total_messages', 0)
        if total > 0:
            prompt_parts.append(f"- 互動次數: {total} 次")
        
        prompt_parts.append("\n請根據客戶畫像調整溝通策略。")
        
        return "\n".join(prompt_parts)
    
    async def add_manual_tag(
        self,
        user_id: str,
        tag_name: str,
        category: str = "behavior"
    ):
        """手動添加標籤"""
        await self.initialize()
        
        tag = CustomerTag(
            tag_id=f"manual_{tag_name}_{datetime.now().timestamp()}",
            category=TagCategory(category),
            name=tag_name,
            source='manual'
        )
        
        await self._save_tag(user_id, tag)
    
    async def remove_tag(self, user_id: str, tag_id: str):
        """移除標籤"""
        try:
            await db.execute("""
                DELETE FROM customer_tags 
                WHERE user_id = ? AND tag_id = ?
            """, (user_id, tag_id))
        except Exception as e:
            print(f"[AutoTagging] 移除標籤失敗: {e}", file=sys.stderr)
    
    async def get_customers_by_tag(
        self,
        tag_name: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """根據標籤查找客戶"""
        await self.initialize()
        
        try:
            customers = await db.fetch_all("""
                SELECT DISTINCT ct.user_id, cp.intent_grade, cp.intent_score, 
                       cp.behavior_summary, cp.total_messages
                FROM customer_tags ct
                LEFT JOIN customer_profiles cp ON ct.user_id = cp.user_id
                WHERE ct.name = ?
                ORDER BY cp.intent_score DESC
                LIMIT ?
            """, (tag_name, limit))
            
            return [dict(c) for c in customers] if customers else []
            
        except Exception as e:
            print(f"[AutoTagging] 查找客戶失敗: {e}", file=sys.stderr)
            return []
    
    async def get_customers_by_grade(
        self,
        grade: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """根據意向等級查找客戶"""
        await self.initialize()
        
        try:
            customers = await db.fetch_all("""
                SELECT * FROM customer_profiles
                WHERE intent_grade = ?
                ORDER BY intent_score DESC, last_active DESC
                LIMIT ?
            """, (grade, limit))
            
            return [dict(c) for c in customers] if customers else []
            
        except Exception as e:
            print(f"[AutoTagging] 查找客戶失敗: {e}", file=sys.stderr)
            return []


# 單例
_tagging_service: Optional[AutoTaggingService] = None

def get_tagging_service() -> AutoTaggingService:
    """獲取標籤服務單例"""
    global _tagging_service
    if _tagging_service is None:
        _tagging_service = AutoTaggingService()
    return _tagging_service


# 測試
if __name__ == "__main__":
    import asyncio
    
    async def test():
        service = get_tagging_service()
        await service.initialize()
        
        user_id = "test_user_456"
        
        # 模擬對話
        tags1 = await service.analyze_and_tag(
            user_id,
            "你們的價格太貴了，有沒有優惠？我想要案例看看",
            "我們現在有促銷活動...",
            50
        )
        print("第一輪標籤:", [t.name for t in tags1])
        
        tags2 = await service.analyze_and_tag(
            user_id,
            "好的，怎麼付款？我今天就想下單",
            "付款方式有...",
            60
        )
        print("第二輪標籤:", [t.name for t in tags2])
        
        # 獲取畫像
        profile = await service.get_customer_profile(user_id)
        print("客戶畫像:", profile)
        
        # 生成 Prompt
        prompt = await service.generate_tag_prompt(user_id)
        print("標籤 Prompt:", prompt)
    
    asyncio.run(test())

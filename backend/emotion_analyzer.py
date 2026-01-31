"""
😊 情緒感知系統 - Emotion Analyzer

功能：
1. 8種細分情緒識別
2. 情緒強度評估
3. 情緒趨勢追蹤
4. 自動調整回覆策略

效果：檢測到客戶不耐煩 → 自動簡化回覆 / 加快進度
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

# 導入數據庫
try:
    from database import db
except ImportError:
    db = None


class EmotionType(Enum):
    """情緒類型 - 8種細分情緒"""
    HAPPY = "happy"             # 開心/滿意
    EXCITED = "excited"         # 興奮/期待
    CURIOUS = "curious"         # 好奇/感興趣
    NEUTRAL = "neutral"         # 中立/平淡
    CONFUSED = "confused"       # 困惑/不解
    IMPATIENT = "impatient"     # 不耐煩/著急
    SKEPTICAL = "skeptical"     # 懷疑/不信任
    ANGRY = "angry"             # 生氣/不滿


class EmotionIntensity(Enum):
    """情緒強度"""
    MILD = 1        # 輕微
    MODERATE = 2    # 中等
    STRONG = 3      # 強烈
    EXTREME = 4     # 極端


@dataclass
class EmotionAnalysis:
    """情緒分析結果"""
    primary_emotion: EmotionType
    intensity: EmotionIntensity
    secondary_emotions: List[Tuple[EmotionType, float]] = field(default_factory=list)
    confidence: float = 0.8
    indicators: List[str] = field(default_factory=list)
    suggested_response_style: str = "normal"
    response_adjustments: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EmotionTrend:
    """情緒趨勢"""
    user_id: str
    emotion_history: List[Dict[str, Any]] = field(default_factory=list)
    overall_sentiment: str = "neutral"  # positive, neutral, negative
    trend_direction: str = "stable"     # improving, stable, declining
    volatility: float = 0.0             # 情緒波動程度


class EmotionAnalyzer:
    """情緒分析器"""
    
    def __init__(self):
        self._initialized = False
        self._emotion_history: Dict[str, List[Dict]] = {}
        
        # 情緒關鍵詞和表情
        self._emotion_indicators = {
            EmotionType.HAPPY: {
                'keywords': ['太好了', '好的', '可以', '沒問題', '開心', '滿意', '感謝', '謝謝', '棒', '讚'],
                'emojis': ['😊', '😄', '🙂', '👍', '❤️', '🎉', '✨', '💕'],
                'patterns': ['好.*好', '謝+', '棒+']
            },
            EmotionType.EXCITED: {
                'keywords': ['太棒了', '太好了', '期待', '迫不及待', '終於', '真的嗎', '太讚了'],
                'emojis': ['🎉', '🥳', '😍', '🤩', '💪', '🔥', '❗'],
                'patterns': ['太.*了', '真的+', '！+']
            },
            EmotionType.CURIOUS: {
                'keywords': ['想了解', '怎麼', '什麼', '為什麼', '如何', '可以嗎', '請問', '能不能'],
                'emojis': ['🤔', '❓', '🧐'],
                'patterns': ['怎麼.*', '什麼.*', '為什麼.*']
            },
            EmotionType.NEUTRAL: {
                'keywords': ['好', '嗯', '哦', '知道了', '收到', '了解'],
                'emojis': [],
                'patterns': []
            },
            EmotionType.CONFUSED: {
                'keywords': ['不明白', '不懂', '什麼意思', '沒聽懂', '能再說一遍', '不太理解', '搞不清'],
                'emojis': ['😕', '🤷', '❓', '😶'],
                'patterns': ['不.*懂', '不.*明白', '什麼意思']
            },
            EmotionType.IMPATIENT: {
                'keywords': ['快點', '趕緊', '到底', '怎麼還', '多久', '等很久', '急', '馬上'],
                'emojis': ['😤', '😒', '🙄', '⏰', '💨'],
                'patterns': ['到底.*', '怎麼還.*', '多久.*']
            },
            EmotionType.SKEPTICAL: {
                'keywords': ['真的嗎', '不會吧', '騙人', '不相信', '懷疑', '不可能', '確定嗎', '保證嗎'],
                'emojis': ['🤨', '😑', '🙄', '🤔'],
                'patterns': ['真的.*嗎', '不會.*吧', '確定.*嗎']
            },
            EmotionType.ANGRY: {
                'keywords': ['生氣', '不滿', '太差', '垃圾', '騙子', '投訴', '退款', '差評', '無語'],
                'emojis': ['😠', '😡', '🤬', '💢', '👎'],
                'patterns': ['太.*差', '什麼.*態度', '投訴.*']
            }
        }
        
        # 情緒應對策略
        self._response_strategies = {
            EmotionType.HAPPY: {
                'style': 'enthusiastic',
                'adjustments': {
                    'tone': 'warm',
                    'pace': 'normal',
                    'emoji_usage': 'moderate',
                    'push_level': 'can_push'
                },
                'prompt_hint': '客戶心情不錯，可以適當推進銷售'
            },
            EmotionType.EXCITED: {
                'style': 'energetic',
                'adjustments': {
                    'tone': 'enthusiastic',
                    'pace': 'quick',
                    'emoji_usage': 'high',
                    'push_level': 'push_now'
                },
                'prompt_hint': '客戶非常興奮，是推進成交的好時機'
            },
            EmotionType.CURIOUS: {
                'style': 'informative',
                'adjustments': {
                    'tone': 'professional',
                    'pace': 'detailed',
                    'emoji_usage': 'low',
                    'push_level': 'educate_first'
                },
                'prompt_hint': '客戶想了解更多，提供詳細信息'
            },
            EmotionType.NEUTRAL: {
                'style': 'normal',
                'adjustments': {
                    'tone': 'friendly',
                    'pace': 'normal',
                    'emoji_usage': 'moderate',
                    'push_level': 'gentle'
                },
                'prompt_hint': '保持正常溝通節奏'
            },
            EmotionType.CONFUSED: {
                'style': 'clarifying',
                'adjustments': {
                    'tone': 'patient',
                    'pace': 'slow',
                    'emoji_usage': 'low',
                    'push_level': 'hold'
                },
                'prompt_hint': '客戶困惑，用簡單易懂的方式解釋'
            },
            EmotionType.IMPATIENT: {
                'style': 'concise',
                'adjustments': {
                    'tone': 'efficient',
                    'pace': 'quick',
                    'emoji_usage': 'minimal',
                    'push_level': 'direct'
                },
                'prompt_hint': '客戶不耐煩，簡短直接回覆，加快進度'
            },
            EmotionType.SKEPTICAL: {
                'style': 'reassuring',
                'adjustments': {
                    'tone': 'trustworthy',
                    'pace': 'measured',
                    'emoji_usage': 'low',
                    'push_level': 'build_trust'
                },
                'prompt_hint': '客戶有疑慮，提供證據和案例建立信任'
            },
            EmotionType.ANGRY: {
                'style': 'apologetic',
                'adjustments': {
                    'tone': 'empathetic',
                    'pace': 'calm',
                    'emoji_usage': 'none',
                    'push_level': 'stop'
                },
                'prompt_hint': '客戶生氣，先道歉安撫，暫停銷售，考慮轉人工'
            }
        }
    
    async def initialize(self):
        """初始化"""
        if self._initialized:
            return
        
        try:
            # 創建情緒記錄表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS emotion_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    emotion_type TEXT NOT NULL,
                    intensity INTEGER DEFAULT 2,
                    confidence REAL DEFAULT 0.8,
                    indicators TEXT,
                    message_snippet TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建情緒趨勢表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS emotion_trends (
                    user_id TEXT PRIMARY KEY,
                    overall_sentiment TEXT DEFAULT 'neutral',
                    trend_direction TEXT DEFAULT 'stable',
                    volatility REAL DEFAULT 0.0,
                    last_emotion TEXT,
                    emotion_count INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建索引
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_emotion_user_id 
                ON emotion_records(user_id, created_at)
            """)
            
            self._initialized = True
            print("[EmotionAnalyzer] ✓ 情緒分析系統已初始化", file=sys.stderr)
            
        except Exception as e:
            print(f"[EmotionAnalyzer] ✗ 初始化失敗: {e}", file=sys.stderr)
    
    async def analyze_emotion(
        self,
        message: str,
        user_id: str = None
    ) -> EmotionAnalysis:
        """分析消息情緒"""
        await self.initialize()
        
        emotion_scores: Dict[EmotionType, float] = {}
        detected_indicators: List[str] = []
        
        # 1. 關鍵詞匹配
        for emotion_type, indicators in self._emotion_indicators.items():
            score = 0.0
            
            # 檢查關鍵詞
            for keyword in indicators['keywords']:
                if keyword in message:
                    score += 1.0
                    detected_indicators.append(f"關鍵詞: {keyword}")
            
            # 檢查表情
            for emoji in indicators['emojis']:
                if emoji in message:
                    score += 0.8
                    detected_indicators.append(f"表情: {emoji}")
            
            # 檢查模式
            import re
            for pattern in indicators.get('patterns', []):
                if re.search(pattern, message):
                    score += 0.5
            
            emotion_scores[emotion_type] = score
        
        # 2. 確定主要情緒
        if not any(emotion_scores.values()):
            primary_emotion = EmotionType.NEUTRAL
        else:
            primary_emotion = max(emotion_scores, key=emotion_scores.get)
        
        # 3. 確定情緒強度
        max_score = max(emotion_scores.values()) if emotion_scores else 0
        if max_score >= 3:
            intensity = EmotionIntensity.EXTREME
        elif max_score >= 2:
            intensity = EmotionIntensity.STRONG
        elif max_score >= 1:
            intensity = EmotionIntensity.MODERATE
        else:
            intensity = EmotionIntensity.MILD
        
        # 4. 確定次要情緒
        secondary = []
        for emo, score in sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True):
            if emo != primary_emotion and score > 0:
                secondary.append((emo, score / max(max_score, 1)))
        
        # 5. 獲取應對策略
        strategy = self._response_strategies.get(primary_emotion, self._response_strategies[EmotionType.NEUTRAL])
        
        # 6. 創建分析結果
        analysis = EmotionAnalysis(
            primary_emotion=primary_emotion,
            intensity=intensity,
            secondary_emotions=secondary[:2],
            confidence=min(0.95, 0.5 + max_score * 0.15),
            indicators=detected_indicators[:5],
            suggested_response_style=strategy['style'],
            response_adjustments=strategy['adjustments']
        )
        
        # 7. 記錄情緒
        if user_id:
            await self._record_emotion(user_id, analysis, message)
        
        return analysis
    
    async def _record_emotion(
        self,
        user_id: str,
        analysis: EmotionAnalysis,
        message: str
    ):
        """記錄情緒"""
        try:
            await db.execute("""
                INSERT INTO emotion_records
                (user_id, emotion_type, intensity, confidence, indicators, message_snippet)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                analysis.primary_emotion.value,
                analysis.intensity.value,
                analysis.confidence,
                json.dumps(analysis.indicators),
                message[:100]
            ))
            
            # 更新趨勢
            await self._update_trend(user_id, analysis)
            
        except Exception as e:
            print(f"[EmotionAnalyzer] 記錄情緒失敗: {e}", file=sys.stderr)
    
    async def _update_trend(self, user_id: str, analysis: EmotionAnalysis):
        """更新情緒趨勢"""
        try:
            # 獲取現有趨勢
            existing = await db.fetch_one(
                "SELECT * FROM emotion_trends WHERE user_id = ?",
                (user_id,)
            )
            
            # 計算情緒值（正向為正，負向為負）
            emotion_value = self._get_emotion_value(analysis.primary_emotion)
            
            if existing:
                count = existing.get('emotion_count', 0) + 1
                last_emotion = existing.get('last_emotion', 'neutral')
                
                # 計算趨勢方向
                last_value = self._get_emotion_value(EmotionType(last_emotion))
                if emotion_value > last_value:
                    direction = 'improving'
                elif emotion_value < last_value:
                    direction = 'declining'
                else:
                    direction = 'stable'
                
                # 計算整體情緒
                if emotion_value > 0:
                    sentiment = 'positive'
                elif emotion_value < 0:
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'
                
                await db.execute("""
                    UPDATE emotion_trends SET
                        overall_sentiment = ?,
                        trend_direction = ?,
                        last_emotion = ?,
                        emotion_count = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (
                    sentiment,
                    direction,
                    analysis.primary_emotion.value,
                    count,
                    user_id
                ))
            else:
                sentiment = 'positive' if emotion_value > 0 else ('negative' if emotion_value < 0 else 'neutral')
                
                await db.execute("""
                    INSERT INTO emotion_trends
                    (user_id, overall_sentiment, trend_direction, last_emotion, emotion_count)
                    VALUES (?, ?, 'stable', ?, 1)
                """, (user_id, sentiment, analysis.primary_emotion.value))
                
        except Exception as e:
            print(f"[EmotionAnalyzer] 更新趨勢失敗: {e}", file=sys.stderr)
    
    def _get_emotion_value(self, emotion: EmotionType) -> int:
        """獲取情緒數值（正向正數，負向負數）"""
        values = {
            EmotionType.HAPPY: 2,
            EmotionType.EXCITED: 3,
            EmotionType.CURIOUS: 1,
            EmotionType.NEUTRAL: 0,
            EmotionType.CONFUSED: -1,
            EmotionType.IMPATIENT: -2,
            EmotionType.SKEPTICAL: -2,
            EmotionType.ANGRY: -3
        }
        return values.get(emotion, 0)
    
    async def get_emotion_trend(self, user_id: str) -> Optional[Dict[str, Any]]:
        """獲取情緒趨勢"""
        await self.initialize()
        
        try:
            trend = await db.fetch_one(
                "SELECT * FROM emotion_trends WHERE user_id = ?",
                (user_id,)
            )
            
            if trend:
                # 獲取最近的情緒記錄
                recent = await db.fetch_all("""
                    SELECT emotion_type, intensity, created_at
                    FROM emotion_records
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 10
                """, (user_id,))
                
                return {
                    'user_id': user_id,
                    'overall_sentiment': trend.get('overall_sentiment', 'neutral'),
                    'trend_direction': trend.get('trend_direction', 'stable'),
                    'last_emotion': trend.get('last_emotion', 'neutral'),
                    'emotion_count': trend.get('emotion_count', 0),
                    'recent_emotions': [dict(r) for r in recent] if recent else []
                }
            
            return None
            
        except Exception as e:
            print(f"[EmotionAnalyzer] 獲取趨勢失敗: {e}", file=sys.stderr)
            return None
    
    def generate_emotion_prompt(self, analysis: EmotionAnalysis) -> str:
        """生成情緒增強 Prompt"""
        strategy = self._response_strategies.get(
            analysis.primary_emotion,
            self._response_strategies[EmotionType.NEUTRAL]
        )
        
        prompt_parts = ["【客戶情緒分析】"]
        prompt_parts.append(f"- 當前情緒: {analysis.primary_emotion.value} (強度: {analysis.intensity.name})")
        prompt_parts.append(f"- 回覆風格: {strategy['style']}")
        prompt_parts.append(f"- 策略建議: {strategy['prompt_hint']}")
        
        adjustments = analysis.response_adjustments
        if adjustments.get('push_level') == 'stop':
            prompt_parts.append("- ⚠️ 警告: 暫停銷售推進，安撫客戶情緒")
        elif adjustments.get('push_level') == 'push_now':
            prompt_parts.append("- 💡 提示: 可以積極推進成交")
        
        return "\n".join(prompt_parts)
    
    async def get_customers_by_emotion(
        self,
        emotion: EmotionType,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """根據情緒查找客戶"""
        await self.initialize()
        
        try:
            customers = await db.fetch_all("""
                SELECT et.*, er.created_at as last_emotion_time
                FROM emotion_trends et
                LEFT JOIN emotion_records er ON et.user_id = er.user_id
                WHERE et.last_emotion = ?
                GROUP BY et.user_id
                ORDER BY er.created_at DESC
                LIMIT ?
            """, (emotion.value, limit))
            
            return [dict(c) for c in customers] if customers else []
            
        except Exception as e:
            print(f"[EmotionAnalyzer] 查找客戶失敗: {e}", file=sys.stderr)
            return []
    
    async def get_negative_emotion_customers(
        self,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """獲取負面情緒客戶（需要關注）"""
        await self.initialize()
        
        try:
            customers = await db.fetch_all("""
                SELECT * FROM emotion_trends
                WHERE overall_sentiment = 'negative'
                   OR last_emotion IN ('angry', 'impatient', 'skeptical')
                ORDER BY updated_at DESC
                LIMIT ?
            """, (limit,))
            
            return [dict(c) for c in customers] if customers else []
            
        except Exception as e:
            print(f"[EmotionAnalyzer] 獲取負面情緒客戶失敗: {e}", file=sys.stderr)
            return []


# 單例
_emotion_analyzer: Optional[EmotionAnalyzer] = None

def get_emotion_analyzer() -> EmotionAnalyzer:
    """獲取情緒分析器單例"""
    global _emotion_analyzer
    if _emotion_analyzer is None:
        _emotion_analyzer = EmotionAnalyzer()
    return _emotion_analyzer


# 測試
if __name__ == "__main__":
    import asyncio
    
    async def test():
        analyzer = get_emotion_analyzer()
        await analyzer.initialize()
        
        test_messages = [
            ("太好了！我很期待 🎉", "user1"),
            ("這個怎麼用？不太明白", "user2"),
            ("你們能快點嗎？等很久了", "user3"),
            ("價格太貴了，能便宜點嗎", "user4"),
            ("好的，收到", "user5"),
            ("什麼破東西，要投訴 😡", "user6")
        ]
        
        for msg, user_id in test_messages:
            analysis = await analyzer.analyze_emotion(msg, user_id)
            print(f"\n消息: {msg}")
            print(f"  情緒: {analysis.primary_emotion.value}")
            print(f"  強度: {analysis.intensity.name}")
            print(f"  風格: {analysis.suggested_response_style}")
            print(f"  提示: {analysis.response_adjustments}")
        
        # 獲取負面情緒客戶
        negative = await analyzer.get_negative_emotion_customers()
        print(f"\n負面情緒客戶: {len(negative)} 個")
    
    asyncio.run(test())

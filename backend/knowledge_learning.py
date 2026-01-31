"""
📚 知識庫動態學習系統 - Knowledge Dynamic Learning

功能：
1. 從優質對話自動學習話術
2. 自動發現過時/無效知識
3. 根據使用效果動態調整知識權重
4. 智能補充知識缺口

效果：AI 越用越聰明，自動積累最佳話術
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import re

# 導入數據庫
try:
    from database import db
except ImportError:
    db = None


class LearningSource(Enum):
    """學習來源"""
    CHAT_SUCCESS = "chat_success"       # 成功對話
    CHAT_FAILURE = "chat_failure"       # 失敗對話（學習避免）
    MANUAL_ADD = "manual_add"           # 手動添加
    AI_GENERATE = "ai_generate"         # AI 生成
    FEEDBACK = "feedback"               # 用戶反饋


class KnowledgeQuality(Enum):
    """知識質量"""
    EXCELLENT = 5
    GOOD = 4
    NORMAL = 3
    POOR = 2
    OUTDATED = 1


@dataclass
class LearnedKnowledge:
    """學習到的知識"""
    id: str
    question_pattern: str       # 問題模式
    answer: str                 # 回答
    source: LearningSource
    quality: KnowledgeQuality = KnowledgeQuality.NORMAL
    use_count: int = 0
    success_count: int = 0
    success_rate: float = 0.0
    keywords: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class KnowledgeGap:
    """知識缺口"""
    id: str
    question: str               # 無法回答的問題
    frequency: int = 1          # 出現頻率
    suggested_answer: str = ""  # AI 建議的答案
    status: str = "pending"     # pending, resolved, ignored
    created_at: datetime = field(default_factory=datetime.now)


class KnowledgeLearningService:
    """知識學習服務"""
    
    def __init__(self):
        self._initialized = False
        
        # 成功對話指標
        self._success_indicators = [
            '好的', '可以', '成交', '下單', '付款', '合作',
            '謝謝', '感謝', '太好了', '滿意', '沒問題'
        ]
        
        # 失敗對話指標
        self._failure_indicators = [
            '不需要', '算了', '太貴', '不買', '再說',
            '別煩', '不要聯繫', '退款', '投訴'
        ]
        
        # 問題模式提取
        self._question_patterns = [
            (r'(.*?)多少錢', 'price'),
            (r'(.*?)怎麼(.*?)', 'how'),
            (r'(.*?)是什麼', 'what'),
            (r'(.*?)為什麼', 'why'),
            (r'有沒有(.*?)', 'availability'),
            (r'可以(.*?)嗎', 'capability'),
            (r'(.*?)和(.*?)區別', 'comparison'),
        ]
    
    async def initialize(self):
        """初始化"""
        if self._initialized:
            return
        
        try:
            # 創建學習知識表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS learned_knowledge (
                    id TEXT PRIMARY KEY,
                    question_pattern TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    source TEXT DEFAULT 'chat_success',
                    quality INTEGER DEFAULT 3,
                    use_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    keywords TEXT,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建知識缺口表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_gaps (
                    id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    frequency INTEGER DEFAULT 1,
                    suggested_answer TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            """)
            
            # 創建對話效果記錄表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS chat_effectiveness (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    knowledge_id TEXT,
                    question TEXT,
                    answer TEXT,
                    outcome TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建索引
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_learned_quality 
                ON learned_knowledge(quality, success_rate)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_gaps_status 
                ON knowledge_gaps(status, frequency)
            """)
            
            self._initialized = True
            print("[KnowledgeLearning] ✓ 知識學習系統已初始化", file=sys.stderr)
            
        except Exception as e:
            print(f"[KnowledgeLearning] ✗ 初始化失敗: {e}", file=sys.stderr)
    
    async def learn_from_conversation(
        self,
        user_id: str,
        messages: List[Dict[str, str]],
        outcome: str = None
    ) -> Dict[str, Any]:
        """從對話中學習"""
        await self.initialize()
        
        result = {
            'learned_count': 0,
            'updated_count': 0,
            'gaps_found': 0
        }
        
        try:
            # 1. 判斷對話結果
            if outcome is None:
                outcome = self._determine_outcome(messages)
            
            is_success = outcome in ['success', 'positive']
            
            # 2. 提取問答對
            qa_pairs = self._extract_qa_pairs(messages)
            
            for question, answer in qa_pairs:
                if is_success:
                    # 成功對話 -> 學習話術
                    learned = await self._learn_successful_qa(question, answer)
                    if learned:
                        result['learned_count'] += 1
                else:
                    # 失敗對話 -> 降低權重或標記為失敗模式
                    updated = await self._mark_failed_qa(question, answer)
                    if updated:
                        result['updated_count'] += 1
            
            # 3. 檢測知識缺口
            gaps = await self._detect_knowledge_gaps(messages)
            result['gaps_found'] = len(gaps)
            
            # 4. 記錄對話效果
            await self._record_effectiveness(user_id, qa_pairs, outcome)
            
            return result
            
        except Exception as e:
            print(f"[KnowledgeLearning] 學習失敗: {e}", file=sys.stderr)
            return result
    
    def _determine_outcome(self, messages: List[Dict[str, str]]) -> str:
        """判斷對話結果"""
        # 檢查最後幾條消息
        last_messages = messages[-3:] if len(messages) >= 3 else messages
        
        for msg in last_messages:
            content = msg.get('content', '')
            
            # 檢查成功指標
            for indicator in self._success_indicators:
                if indicator in content:
                    return 'success'
            
            # 檢查失敗指標
            for indicator in self._failure_indicators:
                if indicator in content:
                    return 'failure'
        
        return 'neutral'
    
    def _extract_qa_pairs(
        self,
        messages: List[Dict[str, str]]
    ) -> List[Tuple[str, str]]:
        """提取問答對"""
        pairs = []
        
        for i in range(len(messages) - 1):
            current = messages[i]
            next_msg = messages[i + 1]
            
            # 用戶問 -> AI 答
            if current.get('role') == 'user' and next_msg.get('role') == 'assistant':
                question = current.get('content', '')
                answer = next_msg.get('content', '')
                
                # 過濾太短的
                if len(question) >= 5 and len(answer) >= 10:
                    pairs.append((question, answer))
        
        return pairs
    
    async def _learn_successful_qa(
        self,
        question: str,
        answer: str
    ) -> bool:
        """學習成功的問答"""
        try:
            # 提取問題模式
            pattern = self._extract_question_pattern(question)
            keywords = self._extract_keywords(question + " " + answer)
            
            knowledge_id = f"learn_{hash(pattern + answer) % 1000000}"
            
            # 檢查是否已存在
            existing = await db.fetch_one(
                "SELECT * FROM learned_knowledge WHERE id = ?",
                (knowledge_id,)
            )
            
            if existing:
                # 更新使用次數和成功率
                use_count = existing.get('use_count', 0) + 1
                success_count = existing.get('success_count', 0) + 1
                success_rate = success_count / use_count
                
                await db.execute("""
                    UPDATE learned_knowledge SET
                        use_count = ?,
                        success_count = ?,
                        success_rate = ?,
                        quality = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    use_count,
                    success_count,
                    success_rate,
                    self._calculate_quality(success_rate, use_count),
                    knowledge_id
                ))
            else:
                # 新增知識
                await db.execute("""
                    INSERT INTO learned_knowledge
                    (id, question_pattern, answer, source, keywords, use_count, success_count, success_rate)
                    VALUES (?, ?, ?, 'chat_success', ?, 1, 1, 1.0)
                """, (
                    knowledge_id,
                    pattern,
                    answer,
                    json.dumps(keywords)
                ))
            
            return True
            
        except Exception as e:
            print(f"[KnowledgeLearning] 學習問答失敗: {e}", file=sys.stderr)
            return False
    
    async def _mark_failed_qa(
        self,
        question: str,
        answer: str
    ) -> bool:
        """標記失敗的問答"""
        try:
            pattern = self._extract_question_pattern(question)
            knowledge_id = f"learn_{hash(pattern + answer) % 1000000}"
            
            existing = await db.fetch_one(
                "SELECT * FROM learned_knowledge WHERE id = ?",
                (knowledge_id,)
            )
            
            if existing:
                use_count = existing.get('use_count', 0) + 1
                success_count = existing.get('success_count', 0)  # 不增加成功次數
                success_rate = success_count / use_count if use_count > 0 else 0
                
                await db.execute("""
                    UPDATE learned_knowledge SET
                        use_count = ?,
                        success_rate = ?,
                        quality = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    use_count,
                    success_rate,
                    self._calculate_quality(success_rate, use_count),
                    knowledge_id
                ))
                return True
            
            return False
            
        except Exception as e:
            print(f"[KnowledgeLearning] 標記失敗問答失敗: {e}", file=sys.stderr)
            return False
    
    def _extract_question_pattern(self, question: str) -> str:
        """提取問題模式"""
        for pattern, category in self._question_patterns:
            if re.search(pattern, question):
                return f"[{category}] {question}"
        return question
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取關鍵詞"""
        # 簡單的關鍵詞提取
        keywords = []
        important_words = [
            '價格', '費用', '多少', '怎麼', '如何', '什麼',
            '優惠', '折扣', '時間', '速度', '安全', '保證',
            '支付', '付款', 'U', 'USDT', '收款', '匯款'
        ]
        
        for word in important_words:
            if word in text:
                keywords.append(word)
        
        return keywords[:5]
    
    def _calculate_quality(self, success_rate: float, use_count: int) -> int:
        """計算知識質量"""
        if use_count < 3:
            return KnowledgeQuality.NORMAL.value
        
        if success_rate >= 0.8:
            return KnowledgeQuality.EXCELLENT.value
        elif success_rate >= 0.6:
            return KnowledgeQuality.GOOD.value
        elif success_rate >= 0.4:
            return KnowledgeQuality.NORMAL.value
        elif success_rate >= 0.2:
            return KnowledgeQuality.POOR.value
        else:
            return KnowledgeQuality.OUTDATED.value
    
    async def _detect_knowledge_gaps(
        self,
        messages: List[Dict[str, str]]
    ) -> List[str]:
        """檢測知識缺口"""
        gaps = []
        
        for msg in messages:
            if msg.get('role') != 'user':
                continue
            
            content = msg.get('content', '')
            
            # 檢測無法回答的模式
            uncertain_patterns = [
                '不知道', '不清楚', '無法回答', '需要確認',
                '稍後回覆', '問一下', '查一下'
            ]
            
            for pattern in uncertain_patterns:
                if pattern in content:
                    await self._record_gap(content)
                    gaps.append(content)
                    break
        
        return gaps
    
    async def _record_gap(self, question: str):
        """記錄知識缺口"""
        try:
            gap_id = f"gap_{hash(question) % 1000000}"
            
            existing = await db.fetch_one(
                "SELECT * FROM knowledge_gaps WHERE id = ?",
                (gap_id,)
            )
            
            if existing:
                await db.execute("""
                    UPDATE knowledge_gaps SET frequency = frequency + 1
                    WHERE id = ?
                """, (gap_id,))
            else:
                await db.execute("""
                    INSERT INTO knowledge_gaps (id, question)
                    VALUES (?, ?)
                """, (gap_id, question))
                
        except Exception as e:
            print(f"[KnowledgeLearning] 記錄缺口失敗: {e}", file=sys.stderr)
    
    async def _record_effectiveness(
        self,
        user_id: str,
        qa_pairs: List[Tuple[str, str]],
        outcome: str
    ):
        """記錄對話效果"""
        try:
            for question, answer in qa_pairs[:3]:  # 只記錄前3對
                await db.execute("""
                    INSERT INTO chat_effectiveness
                    (user_id, question, answer, outcome)
                    VALUES (?, ?, ?, ?)
                """, (user_id, question, answer[:500], outcome))
                
        except Exception as e:
            print(f"[KnowledgeLearning] 記錄效果失敗: {e}", file=sys.stderr)
    
    async def get_best_answers(
        self,
        question: str,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """獲取最佳答案"""
        await self.initialize()
        
        try:
            keywords = self._extract_keywords(question)
            
            # 搜索匹配的知識
            answers = await db.fetch_all("""
                SELECT * FROM learned_knowledge
                WHERE quality >= 3
                ORDER BY success_rate DESC, use_count DESC
                LIMIT ?
            """, (limit * 2,))
            
            # 根據關鍵詞匹配排序
            scored = []
            for ans in answers:
                score = ans.get('success_rate', 0) * 10
                ans_keywords = json.loads(ans.get('keywords', '[]'))
                
                for kw in keywords:
                    if kw in ans_keywords or kw in ans.get('question_pattern', ''):
                        score += 5
                
                scored.append((score, dict(ans)))
            
            scored.sort(key=lambda x: x[0], reverse=True)
            
            return [item[1] for item in scored[:limit]]
            
        except Exception as e:
            print(f"[KnowledgeLearning] 獲取答案失敗: {e}", file=sys.stderr)
            return []
    
    async def get_knowledge_gaps(
        self,
        status: str = 'pending',
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """獲取知識缺口"""
        await self.initialize()
        
        try:
            gaps = await db.fetch_all("""
                SELECT * FROM knowledge_gaps
                WHERE status = ?
                ORDER BY frequency DESC
                LIMIT ?
            """, (status, limit))
            
            return [dict(g) for g in gaps] if gaps else []
            
        except Exception as e:
            print(f"[KnowledgeLearning] 獲取缺口失敗: {e}", file=sys.stderr)
            return []
    
    async def resolve_gap(
        self,
        gap_id: str,
        answer: str
    ):
        """解決知識缺口"""
        try:
            # 獲取缺口
            gap = await db.fetch_one(
                "SELECT * FROM knowledge_gaps WHERE id = ?",
                (gap_id,)
            )
            
            if gap:
                # 添加為新知識
                question = gap.get('question', '')
                pattern = self._extract_question_pattern(question)
                keywords = self._extract_keywords(question + " " + answer)
                
                await db.execute("""
                    INSERT INTO learned_knowledge
                    (id, question_pattern, answer, source, keywords)
                    VALUES (?, ?, ?, 'manual_add', ?)
                """, (
                    f"resolved_{gap_id}",
                    pattern,
                    answer,
                    json.dumps(keywords)
                ))
                
                # 標記缺口已解決
                await db.execute("""
                    UPDATE knowledge_gaps SET
                        status = 'resolved',
                        suggested_answer = ?,
                        resolved_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (answer, gap_id))
                
        except Exception as e:
            print(f"[KnowledgeLearning] 解決缺口失敗: {e}", file=sys.stderr)
    
    async def get_outdated_knowledge(
        self,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """獲取過時知識（需要更新）"""
        await self.initialize()
        
        try:
            # 質量低或成功率低的知識
            knowledge = await db.fetch_all("""
                SELECT * FROM learned_knowledge
                WHERE quality <= 2 OR (use_count >= 5 AND success_rate < 0.3)
                ORDER BY success_rate ASC
                LIMIT ?
            """, (limit,))
            
            return [dict(k) for k in knowledge] if knowledge else []
            
        except Exception as e:
            print(f"[KnowledgeLearning] 獲取過時知識失敗: {e}", file=sys.stderr)
            return []
    
    async def get_learning_stats(self) -> Dict[str, Any]:
        """獲取學習統計"""
        await self.initialize()
        
        try:
            # 總知識數
            total = await db.fetch_one(
                "SELECT COUNT(*) as count FROM learned_knowledge"
            )
            
            # 質量分佈
            quality_dist = await db.fetch_all("""
                SELECT quality, COUNT(*) as count
                FROM learned_knowledge
                GROUP BY quality
            """)
            
            # 知識缺口數
            gaps = await db.fetch_one(
                "SELECT COUNT(*) as count FROM knowledge_gaps WHERE status = 'pending'"
            )
            
            # 平均成功率
            avg_rate = await db.fetch_one(
                "SELECT AVG(success_rate) as avg FROM learned_knowledge WHERE use_count >= 3"
            )
            
            return {
                'total_knowledge': total.get('count', 0) if total else 0,
                'quality_distribution': {
                    str(q['quality']): q['count'] for q in quality_dist
                } if quality_dist else {},
                'pending_gaps': gaps.get('count', 0) if gaps else 0,
                'avg_success_rate': round(avg_rate.get('avg', 0) * 100, 1) if avg_rate and avg_rate.get('avg') else 0
            }
            
        except Exception as e:
            print(f"[KnowledgeLearning] 獲取統計失敗: {e}", file=sys.stderr)
            return {}


# 單例
_learning_service: Optional[KnowledgeLearningService] = None

def get_learning_service() -> KnowledgeLearningService:
    """獲取學習服務單例"""
    global _learning_service
    if _learning_service is None:
        _learning_service = KnowledgeLearningService()
    return _learning_service


# 測試
if __name__ == "__main__":
    import asyncio
    
    async def test():
        service = get_learning_service()
        await service.initialize()
        
        # 模擬對話
        messages = [
            {'role': 'user', 'content': '你們的服務多少錢？'},
            {'role': 'assistant', 'content': '我們的基礎方案是每月99元，包含...'},
            {'role': 'user', 'content': '好的，怎麼付款？'},
            {'role': 'assistant', 'content': '可以通過銀行轉賬或支付寶付款...'},
            {'role': 'user', 'content': '好的，成交'},
        ]
        
        # 學習
        result = await service.learn_from_conversation("user1", messages)
        print(f"學習結果: {result}")
        
        # 獲取最佳答案
        answers = await service.get_best_answers("價格多少")
        print(f"最佳答案: {len(answers)} 個")
        
        # 獲取統計
        stats = await service.get_learning_stats()
        print(f"學習統計: {stats}")
    
    asyncio.run(test())

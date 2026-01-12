"""
Vector Memory System - 向量化記憶系統
支持語義搜索的永久聊天記憶

功能:
1. 聊天記憶向量化
2. 語義相似度搜索
3. 智能記憶摘要
4. RAG 上下文增強
"""
import sys
import json
import hashlib
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from database import db


class VectorMemorySystem:
    """向量化記憶系統 - 支持本地嵌入和語義搜索"""
    
    def __init__(self):
        self._embedding_model = None
        self._embedding_dim = 384  # 默認維度
        self._model_name = "local"
        self._initialized = False
        self._use_simple_embedding = True  # 使用簡單嵌入（無需外部依賴）
        
    async def initialize(self, use_neural: bool = False):
        """
        初始化向量記憶系統
        
        Args:
            use_neural: 是否使用神經網絡嵌入（需要安裝 sentence-transformers）
        """
        if self._initialized:
            return
        
        if use_neural:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                self._embedding_dim = 384
                self._model_name = "neural"
                self._use_simple_embedding = False
                print("[VectorMemory] Using neural embeddings", file=sys.stderr)
            except ImportError:
                print("[VectorMemory] sentence-transformers not available, using simple embeddings", file=sys.stderr)
                self._use_simple_embedding = True
        
        self._initialized = True
        print(f"[VectorMemory] Initialized with {self._model_name} embeddings", file=sys.stderr)
    
    def _simple_embedding(self, text: str) -> np.ndarray:
        """
        簡單文本嵌入 - 基於 TF-IDF 和字符特徵
        適用於沒有神經網絡的環境
        """
        # 將文本轉為小寫並分詞
        text = text.lower()
        
        # 特徵提取
        features = []
        
        # 1. 字符級 n-gram 哈希特徵
        for n in [2, 3, 4]:
            ngrams = [text[i:i+n] for i in range(len(text)-n+1)]
            for ngram in ngrams:
                h = int(hashlib.md5(ngram.encode()).hexdigest()[:8], 16)
                features.append(h % self._embedding_dim)
        
        # 2. 詞級特徵
        words = text.split()
        for word in words:
            h = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
            features.append(h % self._embedding_dim)
        
        # 3. 生成稀疏向量
        embedding = np.zeros(self._embedding_dim, dtype=np.float32)
        for f in features:
            embedding[f] += 1.0
        
        # 正規化
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """獲取文本的嵌入向量"""
        if self._use_simple_embedding or self._embedding_model is None:
            return self._simple_embedding(text)
        else:
            return self._embedding_model.encode(text, convert_to_numpy=True)
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """計算餘弦相似度"""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
    
    async def add_memory(self, user_id: str, content: str, 
                         memory_type: str = 'conversation',
                         source: str = None,
                         importance: float = 0.5) -> int:
        """
        添加記憶
        
        Args:
            user_id: 用戶ID
            content: 記憶內容
            memory_type: 記憶類型 (conversation, fact, preference, summary)
            source: 來源
            importance: 重要性 (0-1)
        
        Returns:
            記憶ID
        """
        # 生成嵌入向量
        embedding = self._get_embedding(content)
        embedding_bytes = embedding.tobytes()
        
        cursor = await db._connection.execute("""
            INSERT INTO vector_memories 
            (user_id, content, embedding, memory_type, source, importance)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, content, embedding_bytes, memory_type, source, importance))
        
        await db._connection.commit()
        return cursor.lastrowid
    
    async def search_memories(self, user_id: str, query: str, 
                              limit: int = 5,
                              memory_type: str = None,
                              min_similarity: float = 0.1) -> List[Dict[str, Any]]:
        """
        語義搜索記憶
        
        Args:
            user_id: 用戶ID
            query: 搜索查詢
            limit: 返回數量
            memory_type: 過濾記憶類型
            min_similarity: 最小相似度閾值
        
        Returns:
            相關記憶列表
        """
        # 獲取查詢向量
        query_embedding = self._get_embedding(query)
        
        # 獲取用戶的所有記憶
        query_sql = """
            SELECT id, content, embedding, memory_type, importance, created_at
            FROM vector_memories
            WHERE user_id = ? AND is_active = 1
        """
        params = [user_id]
        
        if memory_type:
            query_sql += " AND memory_type = ?"
            params.append(memory_type)
        
        cursor = await db._connection.execute(query_sql, params)
        rows = await cursor.fetchall()
        
        # 計算相似度
        results = []
        for row in rows:
            memory_embedding = np.frombuffer(row['embedding'], dtype=np.float32)
            similarity = self._cosine_similarity(query_embedding, memory_embedding)
            
            if similarity >= min_similarity:
                results.append({
                    'id': row['id'],
                    'content': row['content'],
                    'memory_type': row['memory_type'],
                    'importance': row['importance'],
                    'similarity': round(similarity, 4),
                    'created_at': row['created_at'],
                })
        
        # 按相似度和重要性排序
        results.sort(key=lambda x: x['similarity'] * (1 + x['importance']), reverse=True)
        
        # 更新訪問計數
        if results:
            memory_ids = [r['id'] for r in results[:limit]]
            placeholders = ','.join(['?' for _ in memory_ids])
            await db._connection.execute(f"""
                UPDATE vector_memories 
                SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE id IN ({placeholders})
            """, memory_ids)
            await db._connection.commit()
        
        return results[:limit]
    
    async def build_context_from_memory(self, user_id: str, current_message: str,
                                         max_tokens: int = 1500) -> str:
        """
        從記憶構建 RAG 上下文
        
        Args:
            user_id: 用戶ID
            current_message: 當前消息
            max_tokens: 最大 token 數
        
        Returns:
            構建的上下文字符串
        """
        context_parts = []
        current_tokens = 0
        
        # 1. 搜索相關記憶
        memories = await self.search_memories(user_id, current_message, limit=10)
        
        for memory in memories:
            content = memory['content']
            # 估算 token（簡單按字符計算）
            tokens = len(content)
            
            if current_tokens + tokens > max_tokens:
                break
            
            memory_type_names = {
                'conversation': '對話',
                'fact': '事實',
                'preference': '偏好',
                'summary': '摘要',
            }
            type_name = memory_type_names.get(memory['memory_type'], memory['memory_type'])
            
            context_parts.append(f"[{type_name}] {content}")
            current_tokens += tokens
        
        # 2. 獲取最近的對話摘要
        cursor = await db._connection.execute("""
            SELECT summary, key_points FROM conversation_summaries
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        summary = await cursor.fetchone()
        
        if summary and current_tokens + len(summary['summary']) <= max_tokens:
            context_parts.insert(0, f"[對話摘要] {summary['summary']}")
        
        if not context_parts:
            return ""
        
        return "[用戶記憶]\n" + "\n".join(context_parts)
    
    async def summarize_conversation(self, user_id: str, 
                                      max_messages: int = 50) -> Dict[str, Any]:
        """
        生成對話摘要並保存
        
        Args:
            user_id: 用戶ID
            max_messages: 要摘要的最大消息數
        
        Returns:
            摘要結果
        """
        # 獲取最近的對話
        history = await db.get_chat_history(user_id, limit=max_messages)
        
        if not history:
            return {'success': False, 'error': 'No conversation history'}
        
        # 統計信息
        user_messages = [m for m in history if m['role'] == 'user']
        ai_messages = [m for m in history if m['role'] == 'assistant']
        
        # 提取關鍵詞（簡單實現）
        all_text = " ".join([m['content'] for m in history])
        words = all_text.split()
        word_freq = {}
        for word in words:
            if len(word) > 2:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        key_points = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        key_points = [w for w, _ in key_points]
        
        # 生成摘要（簡單版本）
        first_time = history[0].get('timestamp', '')
        last_time = history[-1].get('timestamp', '')
        
        summary = f"與用戶進行了 {len(history)} 條消息的對話。"
        summary += f"用戶發送了 {len(user_messages)} 條消息。"
        
        # 分析情感趨勢（簡單版本）
        positive_words = ['好', '喜歡', '感謝', '謝謝', 'good', 'great', 'thanks', 'like']
        negative_words = ['不', '沒', '差', '壞', 'bad', 'no', "don't", 'hate']
        
        positive_count = sum(1 for m in user_messages 
                           if any(w in m['content'].lower() for w in positive_words))
        negative_count = sum(1 for m in user_messages 
                           if any(w in m['content'].lower() for w in negative_words))
        
        total = positive_count + negative_count
        sentiment_trend = 0.5
        if total > 0:
            sentiment_trend = positive_count / total
        
        # 保存摘要
        cursor = await db._connection.execute("""
            INSERT INTO conversation_summaries 
            (user_id, summary, key_points, sentiment_trend, 
             period_start, period_end, message_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, summary, json.dumps(key_points), sentiment_trend,
            first_time, last_time, len(history)
        ))
        
        await db._connection.commit()
        
        # 同時添加為記憶
        await self.add_memory(
            user_id=user_id,
            content=summary,
            memory_type='summary',
            importance=0.8
        )
        
        return {
            'success': True,
            'summary_id': cursor.lastrowid,
            'summary': summary,
            'key_points': key_points,
            'sentiment_trend': sentiment_trend,
            'message_count': len(history),
        }
    
    async def auto_extract_facts(self, user_id: str, message: str) -> List[Dict[str, Any]]:
        """
        自動從消息中提取事實和偏好
        
        Args:
            user_id: 用戶ID
            message: 用戶消息
        
        Returns:
            提取的事實列表
        """
        extracted = []
        msg_lower = message.lower()
        
        # 事實關鍵詞模式
        fact_patterns = [
            ('fact', ['我是', '我在', '我做', '我有', '我的', "i'm", 'i am', 'i work', 'i have', 'my']),
            ('preference', ['喜歡', '想要', '需要', '偏好', '愛', 'like', 'want', 'prefer', 'love', 'need']),
            ('goal', ['想', '打算', '計劃', '希望', 'plan to', 'want to', 'hope to', 'going to']),
        ]
        
        for fact_type, keywords in fact_patterns:
            if any(kw in msg_lower for kw in keywords):
                # 提取並保存
                memory_id = await self.add_memory(
                    user_id=user_id,
                    content=message[:500],
                    memory_type=fact_type,
                    source='auto_extract',
                    importance=0.6
                )
                
                extracted.append({
                    'id': memory_id,
                    'type': fact_type,
                    'content': message[:200],
                })
        
        return extracted
    
    async def get_user_memory_stats(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶記憶統計"""
        cursor = await db._connection.execute("""
            SELECT 
                memory_type,
                COUNT(*) as count,
                AVG(importance) as avg_importance,
                SUM(access_count) as total_accesses
            FROM vector_memories
            WHERE user_id = ? AND is_active = 1
            GROUP BY memory_type
        """, (user_id,))
        
        rows = await cursor.fetchall()
        
        stats = {
            'by_type': {row['memory_type']: {
                'count': row['count'],
                'avg_importance': round(row['avg_importance'], 2),
                'total_accesses': row['total_accesses'],
            } for row in rows},
            'total_memories': sum(row['count'] for row in rows),
        }
        
        # 獲取最近摘要
        cursor = await db._connection.execute("""
            SELECT * FROM conversation_summaries
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        summary = await cursor.fetchone()
        
        if summary:
            stats['latest_summary'] = {
                'summary': summary['summary'],
                'sentiment_trend': summary['sentiment_trend'],
                'created_at': summary['created_at'],
            }
        
        return stats
    
    async def cleanup_old_memories(self, user_id: str = None, 
                                    days: int = 90,
                                    keep_important: bool = True) -> int:
        """
        清理舊記憶
        
        Args:
            user_id: 用戶ID（可選，不傳則清理所有用戶）
            days: 保留天數
            keep_important: 是否保留重要記憶
        
        Returns:
            刪除的記憶數量
        """
        query = """
            DELETE FROM vector_memories
            WHERE created_at < datetime('now', '-' || ? || ' days')
            AND is_active = 1
        """
        params = [days]
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        if keep_important:
            query += " AND importance < 0.8"
        
        cursor = await db._connection.execute(query, params)
        deleted = cursor.rowcount
        await db._connection.commit()
        
        return deleted
    
    async def merge_similar_memories(self, user_id: str, 
                                      similarity_threshold: float = 0.85) -> int:
        """
        合併相似的記憶
        
        Args:
            user_id: 用戶ID
            similarity_threshold: 相似度閾值
        
        Returns:
            合併的記憶數量
        """
        cursor = await db._connection.execute("""
            SELECT id, content, embedding, importance
            FROM vector_memories
            WHERE user_id = ? AND is_active = 1
            ORDER BY importance DESC
        """, (user_id,))
        
        rows = await cursor.fetchall()
        
        if len(rows) < 2:
            return 0
        
        merged_count = 0
        to_deactivate = []
        
        for i, row1 in enumerate(rows):
            if row1['id'] in to_deactivate:
                continue
            
            emb1 = np.frombuffer(row1['embedding'], dtype=np.float32)
            
            for row2 in rows[i+1:]:
                if row2['id'] in to_deactivate:
                    continue
                
                emb2 = np.frombuffer(row2['embedding'], dtype=np.float32)
                similarity = self._cosine_similarity(emb1, emb2)
                
                if similarity >= similarity_threshold:
                    # 標記較不重要的為非活躍
                    to_deactivate.append(row2['id'])
                    merged_count += 1
        
        if to_deactivate:
            placeholders = ','.join(['?' for _ in to_deactivate])
            await db._connection.execute(f"""
                UPDATE vector_memories SET is_active = 0
                WHERE id IN ({placeholders})
            """, to_deactivate)
            await db._connection.commit()
        
        return merged_count


# 全局實例
vector_memory = VectorMemorySystem()

"""
Knowledge Learner - 從 Telegram 聊天記錄自動學習知識
功能：
- 從成功對話中提取 Q&A
- 向量化存儲知識
- 檢索相關知識輔助 AI 回覆
- 整合 TelegramRAGSystem 進行統一知識管理

注意：此模組現已整合 TelegramRAGSystem，提供向下兼容的 API
"""
import sys
import json
import asyncio
import hashlib
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from database import db

# 導入新的 RAG 系統
try:
    from telegram_rag_system import telegram_rag, ConversationOutcome, KnowledgeType
    RAG_SYSTEM_AVAILABLE = True
except ImportError:
    RAG_SYSTEM_AVAILABLE = False
    print("[KnowledgeLearner] TelegramRAGSystem 未載入，使用獨立模式", file=sys.stderr)

# 嘗試導入向量化相關庫
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("[KnowledgeLearner] ChromaDB 未安裝，將使用簡化版本", file=sys.stderr)

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[KnowledgeLearner] SentenceTransformers 未安裝，將使用關鍵詞匹配", file=sys.stderr)


class KnowledgeLearner:
    """知識學習服務 - 從對話中自動學習"""
    
    # 成功對話的標準
    SUCCESS_STAGES = ['converted', 'interested', 'negotiating']
    
    # 知識類型
    KNOWLEDGE_TYPES = {
        'qa': 'Q&A 問答',
        'script': '話術範例',
        'product': '產品信息',
        'objection': '異議處理',
        'greeting': '開場白',
        'closing': '成交話術'
    }
    
    def __init__(self):
        self.is_initialized = False
        self.chroma_client = None
        self.collection = None
        self.embedding_model = None
        self.event_callback = None
        self._knowledge_cache: Dict[str, Dict] = {}
        
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[KnowledgeLearner] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def initialize(self):
        """初始化知識學習系統"""
        if self.is_initialized:
            return True
        
        try:
            # 初始化向量數據庫
            if CHROMADB_AVAILABLE:
                import os
                persist_dir = os.path.join(os.path.dirname(__file__), "chroma_db")
                os.makedirs(persist_dir, exist_ok=True)
                
                # 嘗試使用 PersistentClient（新版 ChromaDB 0.4.0+）
                try:
                    self.chroma_client = chromadb.PersistentClient(path=persist_dir)
                except AttributeError:
                    # 降級到舊版 API
                    self.chroma_client = chromadb.Client(Settings(
                        persist_directory=persist_dir,
                        anonymized_telemetry=False
                    ))
                
                # 獲取或創建集合
                self.collection = self.chroma_client.get_or_create_collection(
                    name="telegram_knowledge",
                    metadata={"description": "從 Telegram 對話學習的知識庫"}
                )
                self.log(f"✓ ChromaDB 已初始化，現有 {self.collection.count()} 條知識")
            
            # 初始化 Embedding 模型
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                # 使用多語言模型，支持中文
                self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                self.log("✓ Embedding 模型已載入")
            
            # 確保數據庫表存在
            await self._ensure_tables()
            
            self.is_initialized = True
            self.log("✓ 知識學習系統初始化完成", "success")
            return True
            
        except Exception as e:
            self.log(f"初始化失敗: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)
            return False
    
    async def _ensure_tables(self):
        """確保數據庫表存在"""
        await db._connection.execute("""
            CREATE TABLE IF NOT EXISTS learned_knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                context TEXT,
                source_user_id TEXT,
                source_chat_id TEXT,
                success_score REAL DEFAULT 0.5,
                use_count INTEGER DEFAULT 0,
                feedback_positive INTEGER DEFAULT 0,
                feedback_negative INTEGER DEFAULT 0,
                keywords TEXT,
                embedding_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db._connection.execute("""
            CREATE TABLE IF NOT EXISTS conversation_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT,
                outcome TEXT,
                message_count INTEGER DEFAULT 0,
                auto_rating REAL DEFAULT 0,
                manual_rating REAL,
                is_extracted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 創建索引
        try:
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_knowledge_type ON learned_knowledge(type)"
            )
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_knowledge_active ON learned_knowledge(is_active)"
            )
        except:
            pass
        
        await db._connection.commit()
    
    async def learn_from_conversation(self, user_id: str, 
                                       messages: List[Dict[str, Any]],
                                       outcome: str = None,
                                       account_phone: str = "",
                                       chat_id: str = "") -> Dict[str, Any]:
        """
        從對話中學習知識
        
        Args:
            user_id: 用戶 ID
            messages: 對話消息列表 [{role, content, timestamp}, ...]
            outcome: 對話結果 (converted/interested/churned)
            account_phone: 帳號電話
            chat_id: 聊天 ID
        
        Returns:
            學習結果統計
        """
        if not self.is_initialized:
            await self.initialize()
        
        # 優先使用新的 RAG 系統
        if RAG_SYSTEM_AVAILABLE:
            try:
                # 轉換 outcome
                outcome_enum = self._parse_outcome(outcome)
                
                # 使用 TelegramRAGSystem
                rag_result = await telegram_rag.learn_from_conversation(
                    user_id=user_id,
                    messages=messages,
                    outcome=outcome_enum,
                    account_phone=account_phone,
                    chat_id=chat_id
                )
                
                return {
                    'qa_extracted': rag_result.get('qa_extracted', 0),
                    'scripts_extracted': rag_result.get('scripts_extracted', 0),
                    'total_knowledge': rag_result.get('total_knowledge', 0),
                    'quality_score': rag_result.get('quality_score', 0),
                    'source': 'rag_system'
                }
            except Exception as e:
                self.log(f"RAG 系統學習失敗，回退到獨立模式: {e}", "warning")
        
        # 回退到獨立模式
        result = {
            'qa_extracted': 0,
            'scripts_extracted': 0,
            'total_knowledge': 0
        }
        
        if len(messages) < 2:
            return result
        
        try:
            # 評估對話質量
            quality_score = self._calculate_quality_score(messages, outcome)
            
            # 只從高質量對話中學習
            if quality_score < 0.3:
                self.log(f"對話質量較低 ({quality_score:.2f})，跳過學習")
                return result
            
            # 提取 Q&A 對
            qa_pairs = self._extract_qa_pairs(messages)
            for qa in qa_pairs:
                await self._save_knowledge(
                    type='qa',
                    question=qa['question'],
                    answer=qa['answer'],
                    context=qa.get('context', ''),
                    source_user_id=user_id,
                    success_score=quality_score
                )
                result['qa_extracted'] += 1
            
            # 提取成功話術
            if outcome in self.SUCCESS_STAGES:
                scripts = self._extract_successful_scripts(messages)
                for script in scripts:
                    await self._save_knowledge(
                        type='script',
                        question=script.get('trigger', ''),
                        answer=script['content'],
                        context=script.get('context', ''),
                        source_user_id=user_id,
                        success_score=quality_score
                    )
                    result['scripts_extracted'] += 1
            
            result['total_knowledge'] = result['qa_extracted'] + result['scripts_extracted']
            
            if result['total_knowledge'] > 0:
                self.log(f"✓ 從對話學習了 {result['total_knowledge']} 條知識 (Q&A: {result['qa_extracted']}, 話術: {result['scripts_extracted']})")
            
            return result
            
        except Exception as e:
            self.log(f"學習失敗: {e}", "error")
            return result
    
    def _parse_outcome(self, outcome_str: str) -> 'ConversationOutcome':
        """解析結果字符串為枚舉"""
        if not RAG_SYSTEM_AVAILABLE:
            return None
        
        outcome_map = {
            'converted': ConversationOutcome.CONVERTED,
            'interested': ConversationOutcome.INTERESTED,
            'negotiating': ConversationOutcome.NEGOTIATING,
            'replied': ConversationOutcome.REPLIED,
            'contacted': ConversationOutcome.CONTACTED,
            'churned': ConversationOutcome.CHURNED,
        }
        return outcome_map.get(outcome_str, ConversationOutcome.UNKNOWN) if outcome_str else ConversationOutcome.UNKNOWN
    
    def _calculate_quality_score(self, messages: List[Dict], outcome: str = None) -> float:
        """計算對話質量評分"""
        score = 0.3  # 基礎分
        
        # 根據結果加分
        if outcome == 'converted':
            score += 0.4
        elif outcome == 'interested':
            score += 0.2
        elif outcome == 'negotiating':
            score += 0.15
        
        # 根據對話長度加分（多輪對話更有價值）
        msg_count = len(messages)
        if msg_count >= 10:
            score += 0.2
        elif msg_count >= 5:
            score += 0.1
        
        # 根據用戶參與度加分
        user_msgs = [m for m in messages if m.get('role') == 'user']
        if len(user_msgs) >= 5:
            score += 0.1
        
        return min(1.0, score)
    
    def _extract_qa_pairs(self, messages: List[Dict]) -> List[Dict]:
        """從對話中提取 Q&A 對"""
        qa_pairs = []
        
        for i in range(len(messages) - 1):
            msg = messages[i]
            next_msg = messages[i + 1]
            
            # 用戶問題 → AI/人工回覆
            if msg.get('role') == 'user' and next_msg.get('role') == 'assistant':
                question = msg.get('content', '').strip()
                answer = next_msg.get('content', '').strip()
                
                # 過濾太短的內容
                if len(question) >= 5 and len(answer) >= 10:
                    # 檢查是否是問題（含問號或疑問詞）
                    question_indicators = ['?', '？', '嗎', '呢', '怎麼', '什麼', '如何', '多少', '哪', '為什麼', '能不能', '可以']
                    is_question = any(ind in question for ind in question_indicators)
                    
                    if is_question or len(question) >= 10:
                        qa_pairs.append({
                            'question': question,
                            'answer': answer,
                            'context': self._get_context(messages, i)
                        })
        
        return qa_pairs
    
    def _extract_successful_scripts(self, messages: List[Dict]) -> List[Dict]:
        """提取成功的話術"""
        scripts = []
        
        # 提取 AI/人工的回覆作為話術
        for i, msg in enumerate(messages):
            if msg.get('role') == 'assistant':
                content = msg.get('content', '').strip()
                
                # 過濾太短的回覆
                if len(content) >= 20:
                    # 獲取觸發這個回覆的用戶消息
                    trigger = ''
                    if i > 0 and messages[i-1].get('role') == 'user':
                        trigger = messages[i-1].get('content', '')
                    
                    scripts.append({
                        'trigger': trigger,
                        'content': content,
                        'context': self._get_context(messages, i)
                    })
        
        return scripts
    
    def _get_context(self, messages: List[Dict], index: int, window: int = 2) -> str:
        """獲取消息的上下文"""
        start = max(0, index - window)
        end = min(len(messages), index + window + 1)
        
        context_msgs = []
        for msg in messages[start:end]:
            role = msg.get('role', 'user')
            content = msg.get('content', '')[:100]
            context_msgs.append(f"{role}: {content}")
        
        return '\n'.join(context_msgs)
    
    async def _save_knowledge(self, type: str, question: str, answer: str,
                               context: str = '', source_user_id: str = '',
                               success_score: float = 0.5) -> Optional[int]:
        """保存知識到數據庫"""
        try:
            # 檢查是否已存在相似知識
            existing = await self._find_similar_knowledge(question)
            if existing:
                # 更新現有知識的評分
                await db._connection.execute("""
                    UPDATE learned_knowledge 
                    SET success_score = (success_score + ?) / 2,
                        use_count = use_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (success_score, existing['id']))
                await db._connection.commit()
                return existing['id']
            
            # 生成關鍵詞
            keywords = self._extract_keywords(question + ' ' + answer)
            
            # 生成 embedding ID
            embedding_id = None
            if self.collection and self.embedding_model:
                embedding_id = hashlib.md5(question.encode()).hexdigest()
                embedding = self.embedding_model.encode(question).tolist()
                
                self.collection.add(
                    embeddings=[embedding],
                    documents=[answer],
                    metadatas=[{
                        'type': type,
                        'question': question,
                        'keywords': keywords
                    }],
                    ids=[embedding_id]
                )
            
            # 保存到數據庫
            cursor = await db._connection.execute("""
                INSERT INTO learned_knowledge 
                (type, question, answer, context, source_user_id, success_score, keywords, embedding_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (type, question, answer, context, source_user_id, success_score, keywords, embedding_id))
            
            await db._connection.commit()
            return cursor.lastrowid
            
        except Exception as e:
            self.log(f"保存知識失敗: {e}", "error")
            return None
    
    async def _find_similar_knowledge(self, question: str) -> Optional[Dict]:
        """查找相似的知識"""
        keywords = self._extract_keywords(question)
        if not keywords:
            return None
        
        # 使用關鍵詞匹配
        keyword_list = keywords.split(',')
        placeholders = ' OR '.join(['keywords LIKE ?' for _ in keyword_list])
        params = [f'%{kw}%' for kw in keyword_list]
        
        cursor = await db._connection.execute(f"""
            SELECT * FROM learned_knowledge 
            WHERE is_active = 1 AND ({placeholders})
            ORDER BY success_score DESC
            LIMIT 1
        """, params)
        
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    def _extract_keywords(self, text: str) -> str:
        """提取關鍵詞"""
        # 簡單的關鍵詞提取
        import re
        
        # 移除標點符號
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # 分詞（簡單按空格和中文字符分割）
        words = []
        current_word = ''
        for char in text:
            if '\u4e00' <= char <= '\u9fff':  # 中文字符
                if current_word:
                    words.append(current_word)
                    current_word = ''
                words.append(char)
            elif char.isalnum():
                current_word += char
            else:
                if current_word:
                    words.append(current_word)
                    current_word = ''
        if current_word:
            words.append(current_word)
        
        # 過濾停用詞和短詞
        stopwords = {'的', '是', '在', '有', '和', '了', '不', '這', '那', '我', '你', '他', '她', '它', 
                     '們', '嗎', '呢', '吧', '啊', '哦', '呀', 'the', 'a', 'an', 'is', 'are', 'was', 'were'}
        keywords = [w for w in words if len(w) >= 2 and w.lower() not in stopwords]
        
        return ','.join(keywords[:10])  # 最多10個關鍵詞
    
    async def search_knowledge(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        搜索相關知識
        
        Args:
            query: 搜索查詢
            limit: 返回數量限制
        
        Returns:
            相關知識列表
        """
        if not self.is_initialized:
            await self.initialize()
        
        # 優先使用新的 RAG 系統
        if RAG_SYSTEM_AVAILABLE:
            try:
                rag_results = await telegram_rag.search(query, limit=limit)
                
                results = []
                for r in rag_results:
                    results.append({
                        'id': r.item.id,
                        'type': r.item.knowledge_type.value,
                        'question': r.item.question,
                        'answer': r.item.answer,
                        'success_score': r.item.success_score,
                        'similarity': r.similarity,
                        'source': r.source
                    })
                
                return results
            except Exception as e:
                self.log(f"RAG 搜索失敗，回退到獨立模式: {e}", "warning")
        
        results = []
        
        try:
            # 方法1：使用向量搜索（如果可用）
            if self.collection and self.embedding_model:
                query_embedding = self.embedding_model.encode(query).tolist()
                
                chroma_results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit
                )
                
                if chroma_results['ids'] and chroma_results['ids'][0]:
                    for i, doc_id in enumerate(chroma_results['ids'][0]):
                        results.append({
                            'id': doc_id,
                            'answer': chroma_results['documents'][0][i] if chroma_results['documents'] else '',
                            'metadata': chroma_results['metadatas'][0][i] if chroma_results['metadatas'] else {},
                            'distance': chroma_results['distances'][0][i] if chroma_results.get('distances') else 0,
                            'source': 'vector'
                        })
            
            # 方法2：使用關鍵詞搜索（備選）
            if len(results) < limit:
                keywords = self._extract_keywords(query)
                if keywords:
                    keyword_list = keywords.split(',')[:5]
                    conditions = ' OR '.join(['keywords LIKE ?' for _ in keyword_list])
                    params = [f'%{kw}%' for kw in keyword_list]
                    
                    cursor = await db._connection.execute(f"""
                        SELECT * FROM learned_knowledge 
                        WHERE is_active = 1 AND ({conditions})
                        ORDER BY success_score DESC, use_count DESC
                        LIMIT ?
                    """, params + [limit - len(results)])
                    
                    rows = await cursor.fetchall()
                    for row in rows:
                        row_dict = dict(row)
                        if row_dict.get('embedding_id') not in [r.get('id') for r in results]:
                            results.append({
                                'id': row_dict['id'],
                                'type': row_dict['type'],
                                'question': row_dict['question'],
                                'answer': row_dict['answer'],
                                'success_score': row_dict['success_score'],
                                'source': 'keyword'
                            })
            
            return results[:limit]
            
        except Exception as e:
            self.log(f"搜索知識失敗: {e}", "error")
            return []
    
    async def get_relevant_context(self, user_message: str, user_id: str = None) -> str:
        """
        獲取與用戶消息相關的知識上下文
        用於增強 AI 回覆
        
        Args:
            user_message: 用戶消息
            user_id: 用戶 ID（可選，用於個性化）
        
        Returns:
            相關知識的格式化文本
        """
        # 優先使用新的 RAG 系統
        if RAG_SYSTEM_AVAILABLE:
            try:
                rag_context = await telegram_rag.build_rag_context(
                    user_message=user_message,
                    user_id=user_id,
                    max_items=3,
                    max_tokens=800
                )
                if rag_context:
                    return rag_context
            except Exception as e:
                self.log(f"RAG 上下文構建失敗: {e}", "warning")
        
        # 回退到原有邏輯
        knowledge_items = await self.search_knowledge(user_message, limit=3)
        
        if not knowledge_items:
            return ""
        
        context_parts = ["【參考知識庫】"]
        
        for i, item in enumerate(knowledge_items, 1):
            if item.get('question'):
                context_parts.append(f"{i}. 問: {item['question']}")
                context_parts.append(f"   答: {item['answer'][:200]}...")
            elif item.get('answer'):
                context_parts.append(f"{i}. 參考回覆: {item['answer'][:200]}...")
        
        context_parts.append("【請參考以上知識回覆用戶】")
        
        return '\n'.join(context_parts)
    
    async def record_feedback(self, knowledge_id: int, is_positive: bool):
        """記錄知識使用反饋"""
        try:
            field = 'feedback_positive' if is_positive else 'feedback_negative'
            await db._connection.execute(f"""
                UPDATE learned_knowledge 
                SET {field} = {field} + 1,
                    use_count = use_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (knowledge_id,))
            await db._connection.commit()
        except Exception as e:
            self.log(f"記錄反饋失敗: {e}", "error")
    
    async def get_statistics(self) -> Dict[str, Any]:
        """獲取知識庫統計"""
        try:
            cursor = await db._connection.execute("""
                SELECT 
                    type,
                    COUNT(*) as count,
                    AVG(success_score) as avg_score,
                    SUM(use_count) as total_uses
                FROM learned_knowledge
                WHERE is_active = 1
                GROUP BY type
            """)
            
            rows = await cursor.fetchall()
            
            stats = {
                'by_type': {},
                'total_knowledge': 0,
                'total_uses': 0
            }
            
            for row in rows:
                row_dict = dict(row)
                type_name = self.KNOWLEDGE_TYPES.get(row_dict['type'], row_dict['type'])
                stats['by_type'][type_name] = {
                    'count': row_dict['count'],
                    'avg_score': round(row_dict['avg_score'] or 0, 2),
                    'uses': row_dict['total_uses'] or 0
                }
                stats['total_knowledge'] += row_dict['count']
                stats['total_uses'] += row_dict['total_uses'] or 0
            
            # ChromaDB 統計
            if self.collection:
                stats['vector_count'] = self.collection.count()
            
            return stats
            
        except Exception as e:
            self.log(f"獲取統計失敗: {e}", "error")
            return {'error': str(e)}


# 創建全局實例
knowledge_learner = KnowledgeLearner()

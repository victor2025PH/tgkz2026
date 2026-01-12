"""
Telegram RAG System - 從 Telegram 聊天記錄自動學習的 RAG 系統

核心功能：
1. 自動從聊天記錄中學習 Q&A、話術、產品知識
2. 向量化存儲和語義搜索
3. 智能檢索增強生成 (RAG)
4. 知識質量評分和反饋循環
5. 自動清理和合併重複知識

架構：
- ChromaDB 作為向量數據庫（可選，降級為 SQLite）
- Sentence Transformers 作為嵌入模型（可選，降級為簡單嵌入）
- SQLite 作為持久化存儲
"""
import sys
import json
import hashlib
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from database import db

# 嘗試導入可選依賴
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("[TelegramRAG] ChromaDB 未安裝，使用 SQLite 向量存儲", file=sys.stderr)

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[TelegramRAG] SentenceTransformers 未安裝，使用簡單嵌入", file=sys.stderr)


class KnowledgeType(Enum):
    """知識類型"""
    QA = "qa"                    # 問答對
    SCRIPT = "script"            # 成功話術
    PRODUCT = "product"          # 產品信息
    OBJECTION = "objection"      # 異議處理
    GREETING = "greeting"        # 開場白
    CLOSING = "closing"          # 成交話術
    FAQ = "faq"                  # 常見問題
    CUSTOM = "custom"            # 自定義


class ConversationOutcome(Enum):
    """對話結果"""
    CONVERTED = "converted"      # 已成交
    INTERESTED = "interested"    # 有興趣
    NEGOTIATING = "negotiating"  # 洽談中
    REPLIED = "replied"          # 已回復
    CONTACTED = "contacted"      # 已聯繫
    CHURNED = "churned"          # 已流失
    UNKNOWN = "unknown"          # 未知


@dataclass
class KnowledgeItem:
    """知識項目"""
    id: Optional[int] = None
    knowledge_type: KnowledgeType = KnowledgeType.QA
    question: str = ""
    answer: str = ""
    context: str = ""
    keywords: List[str] = field(default_factory=list)
    source_user_id: str = ""
    source_chat_id: str = ""
    source_account: str = ""
    success_score: float = 0.5
    use_count: int = 0
    feedback_positive: int = 0
    feedback_negative: int = 0
    embedding_id: str = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class SearchResult:
    """搜索結果"""
    item: KnowledgeItem
    similarity: float = 0.0
    source: str = "keyword"  # vector / keyword / hybrid


class TelegramRAGSystem:
    """
    Telegram RAG 系統 - 完整的檢索增強生成解決方案
    
    特性：
    1. 支持多種向量存儲後端（ChromaDB, SQLite）
    2. 支持多種嵌入模型（Sentence Transformers, 簡單哈希）
    3. 智能混合搜索（向量 + 關鍵詞）
    4. 自動學習和知識提取
    5. 質量評分和反饋循環
    """
    
    # 成功對話的結果
    SUCCESS_OUTCOMES = [
        ConversationOutcome.CONVERTED,
        ConversationOutcome.INTERESTED,
        ConversationOutcome.NEGOTIATING
    ]
    
    # 嵌入維度
    EMBEDDING_DIM = 384
    
    def __init__(self):
        self.is_initialized = False
        self.event_callback: Optional[Callable] = None
        
        # 向量存儲
        self.chroma_client = None
        self.collection = None
        self.use_chromadb = False
        
        # 嵌入模型
        self.embedding_model = None
        self.use_neural_embedding = False
        
        # 緩存
        self._embedding_cache: Dict[str, np.ndarray] = {}
        self._knowledge_cache: Dict[str, List[KnowledgeItem]] = {}
        self._cache_ttl = 300  # 5分鐘
        self._cache_timestamps: Dict[str, datetime] = {}
        
        # 配置
        self.min_question_length = 5
        self.min_answer_length = 10
        self.min_quality_score = 0.3
        self.max_similar_results = 5
        self.similarity_threshold = 0.4
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[TelegramRAG] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def initialize(self, use_chromadb: bool = True, use_neural: bool = True):
        """
        初始化 RAG 系統
        
        Args:
            use_chromadb: 是否使用 ChromaDB（否則用 SQLite）
            use_neural: 是否使用神經網絡嵌入（否則用簡單哈希）
        """
        if self.is_initialized:
            return True
        
        try:
            # 1. 初始化向量存儲
            if use_chromadb and CHROMADB_AVAILABLE:
                await self._init_chromadb()
            else:
                self.log("使用 SQLite 作為向量存儲")
            
            # 2. 初始化嵌入模型
            if use_neural and SENTENCE_TRANSFORMERS_AVAILABLE:
                await self._init_embedding_model()
            else:
                self.log("使用簡單哈希嵌入")
            
            # 3. 確保數據庫表存在
            await self._ensure_tables()
            
            self.is_initialized = True
            self.log(f"✓ RAG 系統初始化完成 (向量存儲: {'ChromaDB' if self.use_chromadb else 'SQLite'}, 嵌入: {'Neural' if self.use_neural_embedding else 'Simple'})", "success")
            return True
            
        except Exception as e:
            self.log(f"初始化失敗: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)
            return False
    
    async def _init_chromadb(self):
        """初始化 ChromaDB"""
        try:
            # 新版 ChromaDB API（0.4.0+）
            import os
            persist_dir = os.path.join(os.path.dirname(__file__), "chroma_rag_db")
            os.makedirs(persist_dir, exist_ok=True)
            
            # 嘗試使用 PersistentClient（新版）
            try:
                self.chroma_client = chromadb.PersistentClient(path=persist_dir)
            except AttributeError:
                # 降級到舊版 API
                self.chroma_client = chromadb.Client(Settings(
                    persist_directory=persist_dir,
                    anonymized_telemetry=False
                ))
            
            self.collection = self.chroma_client.get_or_create_collection(
                name="telegram_rag",
                metadata={"description": "Telegram 聊天記錄 RAG 知識庫"}
            )
            
            self.use_chromadb = True
            self.log(f"✓ ChromaDB 已初始化，現有 {self.collection.count()} 條知識")
        except Exception as e:
            self.log(f"ChromaDB 初始化失敗: {e}，降級為 SQLite", "warning")
            self.use_chromadb = False
    
    async def _init_embedding_model(self):
        """初始化嵌入模型"""
        try:
            # 使用支持中文的多語言模型
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.use_neural_embedding = True
            self.log("✓ 神經網絡嵌入模型已載入")
        except Exception as e:
            self.log(f"嵌入模型載入失敗: {e}，使用簡單嵌入", "warning")
            self.use_neural_embedding = False
    
    async def _ensure_tables(self):
        """確保數據庫表存在"""
        # RAG 知識表
        await db._connection.execute("""
            CREATE TABLE IF NOT EXISTS rag_knowledge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_type TEXT NOT NULL DEFAULT 'qa',
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                context TEXT,
                keywords TEXT,
                source_user_id TEXT,
                source_chat_id TEXT,
                source_account TEXT,
                success_score REAL DEFAULT 0.5,
                use_count INTEGER DEFAULT 0,
                feedback_positive INTEGER DEFAULT 0,
                feedback_negative INTEGER DEFAULT 0,
                embedding BLOB,
                embedding_id TEXT UNIQUE,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # RAG 學習記錄表
        await db._connection.execute("""
            CREATE TABLE IF NOT EXISTS rag_learning_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT,
                outcome TEXT,
                message_count INTEGER DEFAULT 0,
                qa_extracted INTEGER DEFAULT 0,
                scripts_extracted INTEGER DEFAULT 0,
                quality_score REAL DEFAULT 0,
                is_processed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 創建索引
        try:
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rag_knowledge_type ON rag_knowledge(knowledge_type)"
            )
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rag_knowledge_active ON rag_knowledge(is_active)"
            )
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_rag_knowledge_score ON rag_knowledge(success_score DESC)"
            )
        except:
            pass
        
        await db._connection.commit()
    
    # ==================== 嵌入方法 ====================
    
    def _compute_embedding(self, text: str) -> np.ndarray:
        """計算文本嵌入向量"""
        # 檢查緩存
        cache_key = hashlib.md5(text.encode()).hexdigest()[:16]
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]
        
        if self.use_neural_embedding and self.embedding_model:
            embedding = self.embedding_model.encode(text, convert_to_numpy=True)
        else:
            embedding = self._simple_embedding(text)
        
        # 緩存結果
        self._embedding_cache[cache_key] = embedding
        return embedding
    
    def _simple_embedding(self, text: str) -> np.ndarray:
        """簡單文本嵌入 - 基於字符 n-gram 哈希"""
        text = text.lower()
        
        features = []
        
        # 字符級 n-gram 哈希特徵
        for n in [2, 3, 4]:
            ngrams = [text[i:i+n] for i in range(len(text)-n+1)]
            for ngram in ngrams:
                h = int(hashlib.md5(ngram.encode()).hexdigest()[:8], 16)
                features.append(h % self.EMBEDDING_DIM)
        
        # 詞級特徵
        words = text.split()
        for word in words:
            h = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
            features.append(h % self.EMBEDDING_DIM)
        
        # 生成向量
        embedding = np.zeros(self.EMBEDDING_DIM, dtype=np.float32)
        for f in features:
            embedding[f] += 1.0
        
        # 正規化
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """計算餘弦相似度"""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
    
    # ==================== 知識提取方法 ====================
    
    async def learn_from_conversation(
        self,
        user_id: str,
        messages: List[Dict[str, Any]],
        outcome: ConversationOutcome = ConversationOutcome.UNKNOWN,
        account_phone: str = "",
        chat_id: str = ""
    ) -> Dict[str, Any]:
        """
        從對話中學習知識
        
        Args:
            user_id: 用戶 ID
            messages: 對話消息列表 [{role, content, timestamp}, ...]
            outcome: 對話結果
            account_phone: 帳號電話
            chat_id: 聊天 ID
        
        Returns:
            學習結果統計
        """
        if not self.is_initialized:
            await self.initialize()
        
        result = {
            'qa_extracted': 0,
            'scripts_extracted': 0,
            'objections_extracted': 0,
            'total_knowledge': 0,
            'quality_score': 0.0,
            'skipped_reason': None
        }
        
        if len(messages) < 2:
            result['skipped_reason'] = '對話太短'
            return result
        
        try:
            # 計算對話質量評分
            quality_score = self._calculate_quality_score(messages, outcome)
            result['quality_score'] = quality_score
            
            # 只從高質量對話中學習
            if quality_score < self.min_quality_score:
                result['skipped_reason'] = f'質量不足 ({quality_score:.2f} < {self.min_quality_score})'
                self.log(f"對話質量較低 ({quality_score:.2f})，跳過學習")
                return result
            
            # 1. 提取 Q&A 對
            qa_pairs = self._extract_qa_pairs(messages)
            for qa in qa_pairs:
                saved = await self._save_knowledge(
                    knowledge_type=KnowledgeType.QA,
                    question=qa['question'],
                    answer=qa['answer'],
                    context=qa.get('context', ''),
                    source_user_id=user_id,
                    source_chat_id=chat_id,
                    source_account=account_phone,
                    success_score=quality_score
                )
                if saved:
                    result['qa_extracted'] += 1
            
            # 2. 從成功對話提取話術
            if outcome in self.SUCCESS_OUTCOMES:
                scripts = self._extract_successful_scripts(messages)
                for script in scripts:
                    saved = await self._save_knowledge(
                        knowledge_type=KnowledgeType.SCRIPT,
                        question=script.get('trigger', ''),
                        answer=script['content'],
                        context=script.get('context', ''),
                        source_user_id=user_id,
                        source_chat_id=chat_id,
                        source_account=account_phone,
                        success_score=quality_score * 1.2  # 成功話術加分
                    )
                    if saved:
                        result['scripts_extracted'] += 1
            
            # 3. 提取異議處理
            objections = self._extract_objection_handling(messages)
            for obj in objections:
                saved = await self._save_knowledge(
                    knowledge_type=KnowledgeType.OBJECTION,
                    question=obj['objection'],
                    answer=obj['response'],
                    context=obj.get('context', ''),
                    source_user_id=user_id,
                    source_chat_id=chat_id,
                    source_account=account_phone,
                    success_score=quality_score
                )
                if saved:
                    result['objections_extracted'] += 1
            
            result['total_knowledge'] = (
                result['qa_extracted'] + 
                result['scripts_extracted'] + 
                result['objections_extracted']
            )
            
            # 記錄學習日誌
            await self._log_learning(user_id, result, outcome)
            
            if result['total_knowledge'] > 0:
                self.log(f"✓ 從對話學習了 {result['total_knowledge']} 條知識 " +
                        f"(Q&A: {result['qa_extracted']}, 話術: {result['scripts_extracted']}, 異議: {result['objections_extracted']})")
            
            return result
            
        except Exception as e:
            self.log(f"學習失敗: {e}", "error")
            result['skipped_reason'] = str(e)
            return result
    
    def _calculate_quality_score(
        self, 
        messages: List[Dict], 
        outcome: ConversationOutcome
    ) -> float:
        """計算對話質量評分"""
        score = 0.3  # 基礎分
        
        # 根據結果加分
        outcome_scores = {
            ConversationOutcome.CONVERTED: 0.5,
            ConversationOutcome.INTERESTED: 0.3,
            ConversationOutcome.NEGOTIATING: 0.25,
            ConversationOutcome.REPLIED: 0.1,
            ConversationOutcome.CONTACTED: 0.05,
            ConversationOutcome.CHURNED: -0.1,
        }
        score += outcome_scores.get(outcome, 0)
        
        # 根據對話長度加分
        msg_count = len(messages)
        if msg_count >= 15:
            score += 0.2
        elif msg_count >= 10:
            score += 0.15
        elif msg_count >= 5:
            score += 0.1
        
        # 根據用戶參與度加分
        user_msgs = [m for m in messages if m.get('role') == 'user']
        ai_msgs = [m for m in messages if m.get('role') == 'assistant']
        
        if len(user_msgs) >= 5:
            score += 0.1
        
        # 回復比例（用戶回復越多越好）
        if len(ai_msgs) > 0:
            reply_ratio = len(user_msgs) / len(ai_msgs)
            if reply_ratio >= 0.8:
                score += 0.1
        
        # 用戶消息平均長度
        if user_msgs:
            avg_length = sum(len(m.get('content', '')) for m in user_msgs) / len(user_msgs)
            if avg_length >= 30:
                score += 0.1
        
        return min(1.0, max(0.0, score))
    
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
                if len(question) < self.min_question_length or len(answer) < self.min_answer_length:
                    continue
                
                # 檢查是否是問題
                question_indicators = [
                    '?', '？', '嗎', '呢', '怎麼', '什麼', '如何', '多少', 
                    '哪', '為什麼', '能不能', '可以', '有沒有', '是不是',
                    'what', 'how', 'why', 'when', 'where', 'which', 'can', 'could'
                ]
                
                is_question = any(ind in question.lower() for ind in question_indicators)
                
                if is_question or len(question) >= 15:
                    qa_pairs.append({
                        'question': question,
                        'answer': answer,
                        'context': self._get_context(messages, i)
                    })
        
        return qa_pairs
    
    def _extract_successful_scripts(self, messages: List[Dict]) -> List[Dict]:
        """提取成功的話術"""
        scripts = []
        
        for i, msg in enumerate(messages):
            if msg.get('role') == 'assistant':
                content = msg.get('content', '').strip()
                
                # 過濾太短的回覆
                if len(content) < 20:
                    continue
                
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
    
    def _extract_objection_handling(self, messages: List[Dict]) -> List[Dict]:
        """提取異議處理模式"""
        objections = []
        
        # 異議關鍵詞
        objection_keywords = [
            '太貴', '不需要', '再考慮', '算了', '不行', '沒興趣',
            '下次', '以後', '不確定', '擔心', '怕', '風險',
            'too expensive', "don't need", 'not sure', 'maybe later'
        ]
        
        for i in range(len(messages) - 1):
            msg = messages[i]
            next_msg = messages[i + 1]
            
            if msg.get('role') == 'user' and next_msg.get('role') == 'assistant':
                user_content = msg.get('content', '').lower()
                
                # 檢查是否是異議
                is_objection = any(kw in user_content for kw in objection_keywords)
                
                if is_objection:
                    # 檢查後續是否有積極回復（異議被處理）
                    handled = False
                    for j in range(i + 2, min(i + 5, len(messages))):
                        if messages[j].get('role') == 'user':
                            follow_up = messages[j].get('content', '').lower()
                            positive_words = ['好', '可以', '行', 'ok', '了解', '明白', '謝謝']
                            if any(w in follow_up for w in positive_words):
                                handled = True
                                break
                    
                    if handled:
                        objections.append({
                            'objection': msg.get('content', ''),
                            'response': next_msg.get('content', ''),
                            'context': self._get_context(messages, i)
                        })
        
        return objections
    
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
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取關鍵詞"""
        import re
        
        # 移除標點符號
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # 分詞
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
        stopwords = {
            '的', '是', '在', '有', '和', '了', '不', '這', '那', '我', '你', '他', '她', '它',
            '們', '嗎', '呢', '吧', '啊', '哦', '呀', '就', '也', '都', '要', '會', '能',
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        }
        keywords = [w for w in words if len(w) >= 2 and w.lower() not in stopwords]
        
        return keywords[:15]  # 最多 15 個關鍵詞
    
    # ==================== 知識存儲方法 ====================
    
    async def _save_knowledge(
        self,
        knowledge_type: KnowledgeType,
        question: str,
        answer: str,
        context: str = '',
        source_user_id: str = '',
        source_chat_id: str = '',
        source_account: str = '',
        success_score: float = 0.5
    ) -> Optional[int]:
        """保存知識到數據庫"""
        try:
            # 生成嵌入
            combined_text = f"{question} {answer}"
            embedding = self._compute_embedding(combined_text)
            
            # 生成唯一 ID
            embedding_id = hashlib.md5(combined_text.encode()).hexdigest()
            
            # 檢查是否已存在相似知識
            existing = await self._find_similar_knowledge(question, threshold=0.85)
            if existing:
                # 更新現有知識的評分
                await db._connection.execute("""
                    UPDATE rag_knowledge 
                    SET success_score = (success_score + ?) / 2,
                        use_count = use_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (success_score, existing.id))
                await db._connection.commit()
                return existing.id
            
            # 提取關鍵詞
            keywords = self._extract_keywords(question + ' ' + answer)
            
            # 保存到 SQLite
            cursor = await db._connection.execute("""
                INSERT INTO rag_knowledge 
                (knowledge_type, question, answer, context, keywords,
                 source_user_id, source_chat_id, source_account,
                 success_score, embedding, embedding_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge_type.value, question, answer, context,
                ','.join(keywords), source_user_id, source_chat_id,
                source_account, success_score, embedding.tobytes(), embedding_id
            ))
            
            knowledge_id = cursor.lastrowid
            await db._connection.commit()
            
            # 同時保存到 ChromaDB（如果可用）
            if self.use_chromadb and self.collection:
                try:
                    self.collection.add(
                        embeddings=[embedding.tolist()],
                        documents=[answer],
                        metadatas=[{
                            'type': knowledge_type.value,
                            'question': question[:500],
                            'keywords': ','.join(keywords[:10]),
                            'score': success_score
                        }],
                        ids=[embedding_id]
                    )
                except Exception as e:
                    self.log(f"ChromaDB 保存失敗: {e}", "warning")
            
            return knowledge_id
            
        except Exception as e:
            self.log(f"保存知識失敗: {e}", "error")
            return None
    
    async def _find_similar_knowledge(
        self, 
        query: str, 
        threshold: float = 0.85
    ) -> Optional[KnowledgeItem]:
        """查找相似的知識"""
        query_embedding = self._compute_embedding(query)
        
        # 從數據庫中獲取最相似的知識
        cursor = await db._connection.execute("""
            SELECT * FROM rag_knowledge 
            WHERE is_active = 1
            ORDER BY success_score DESC
            LIMIT 50
        """)
        
        rows = await cursor.fetchall()
        
        best_match = None
        best_similarity = 0.0
        
        for row in rows:
            if row['embedding']:
                try:
                    stored_embedding = np.frombuffer(row['embedding'], dtype=np.float32)
                    similarity = self._cosine_similarity(query_embedding, stored_embedding)
                    
                    if similarity >= threshold and similarity > best_similarity:
                        best_similarity = similarity
                        best_match = KnowledgeItem(
                            id=row['id'],
                            knowledge_type=KnowledgeType(row['knowledge_type']),
                            question=row['question'],
                            answer=row['answer'],
                            success_score=row['success_score']
                        )
                except Exception as e:
                    continue
        
        return best_match
    
    # ==================== 知識搜索方法 ====================
    
    async def search(
        self,
        query: str,
        limit: int = 5,
        knowledge_type: Optional[KnowledgeType] = None,
        min_score: float = 0.3
    ) -> List[SearchResult]:
        """
        混合搜索知識
        
        Args:
            query: 搜索查詢
            limit: 返回數量
            knowledge_type: 過濾知識類型
            min_score: 最小相似度閾值
        
        Returns:
            搜索結果列表
        """
        if not self.is_initialized:
            await self.initialize()
        
        results = []
        
        try:
            # 1. 向量搜索
            vector_results = await self._vector_search(query, limit * 2, knowledge_type)
            results.extend(vector_results)
            
            # 2. 關鍵詞搜索（補充）
            if len(results) < limit:
                keyword_results = await self._keyword_search(
                    query, limit * 2, knowledge_type
                )
                
                # 去重
                existing_ids = {r.item.id for r in results}
                for kr in keyword_results:
                    if kr.item.id not in existing_ids:
                        results.append(kr)
            
            # 3. 過濾和排序
            results = [r for r in results if r.similarity >= min_score]
            results.sort(key=lambda x: x.similarity * (1 + x.item.success_score), reverse=True)
            
            # 4. 更新使用計數
            if results:
                for r in results[:limit]:
                    await self._increment_use_count(r.item.id)
            
            return results[:limit]
            
        except Exception as e:
            self.log(f"搜索失敗: {e}", "error")
            return []
    
    async def _vector_search(
        self,
        query: str,
        limit: int,
        knowledge_type: Optional[KnowledgeType] = None
    ) -> List[SearchResult]:
        """向量搜索"""
        results = []
        query_embedding = self._compute_embedding(query)
        
        # 方法1：使用 ChromaDB
        if self.use_chromadb and self.collection:
            try:
                chroma_results = self.collection.query(
                    query_embeddings=[query_embedding.tolist()],
                    n_results=limit,
                    where={"type": knowledge_type.value} if knowledge_type else None
                )
                
                if chroma_results['ids'] and chroma_results['ids'][0]:
                    for i, doc_id in enumerate(chroma_results['ids'][0]):
                        # 從數據庫獲取完整信息
                        cursor = await db._connection.execute("""
                            SELECT * FROM rag_knowledge WHERE embedding_id = ?
                        """, (doc_id,))
                        row = await cursor.fetchone()
                        
                        if row:
                            # 計算相似度（ChromaDB 返回的是距離）
                            distance = chroma_results.get('distances', [[0]])[0][i] if chroma_results.get('distances') else 0
                            similarity = max(0, 1 - distance)  # 將距離轉為相似度
                            
                            item = KnowledgeItem(
                                id=row['id'],
                                knowledge_type=KnowledgeType(row['knowledge_type']),
                                question=row['question'],
                                answer=row['answer'],
                                context=row['context'] or '',
                                keywords=row['keywords'].split(',') if row['keywords'] else [],
                                success_score=row['success_score'],
                                use_count=row['use_count']
                            )
                            
                            results.append(SearchResult(
                                item=item,
                                similarity=similarity,
                                source='vector'
                            ))
                
                return results
            except Exception as e:
                self.log(f"ChromaDB 搜索失敗: {e}", "warning")
        
        # 方法2：使用 SQLite 向量搜索
        sql = """
            SELECT * FROM rag_knowledge 
            WHERE is_active = 1 AND embedding IS NOT NULL
        """
        params = []
        
        if knowledge_type:
            sql += " AND knowledge_type = ?"
            params.append(knowledge_type.value)
        
        sql += " ORDER BY success_score DESC LIMIT 100"
        
        cursor = await db._connection.execute(sql, params)
        rows = await cursor.fetchall()
        
        for row in rows:
            try:
                stored_embedding = np.frombuffer(row['embedding'], dtype=np.float32)
                similarity = self._cosine_similarity(query_embedding, stored_embedding)
                
                if similarity >= self.similarity_threshold:
                    item = KnowledgeItem(
                        id=row['id'],
                        knowledge_type=KnowledgeType(row['knowledge_type']),
                        question=row['question'],
                        answer=row['answer'],
                        context=row['context'] or '',
                        keywords=row['keywords'].split(',') if row['keywords'] else [],
                        success_score=row['success_score'],
                        use_count=row['use_count']
                    )
                    
                    results.append(SearchResult(
                        item=item,
                        similarity=similarity,
                        source='vector'
                    ))
            except Exception:
                continue
        
        results.sort(key=lambda x: x.similarity, reverse=True)
        return results[:limit]
    
    async def _keyword_search(
        self,
        query: str,
        limit: int,
        knowledge_type: Optional[KnowledgeType] = None
    ) -> List[SearchResult]:
        """關鍵詞搜索"""
        results = []
        
        keywords = self._extract_keywords(query)
        if not keywords:
            return results
        
        # 構建查詢
        conditions = ' OR '.join(['keywords LIKE ?' for _ in keywords[:5]])
        params = [f'%{kw}%' for kw in keywords[:5]]
        
        sql = f"""
            SELECT * FROM rag_knowledge 
            WHERE is_active = 1 AND ({conditions})
        """
        
        if knowledge_type:
            sql += " AND knowledge_type = ?"
            params.append(knowledge_type.value)
        
        sql += " ORDER BY success_score DESC, use_count DESC LIMIT ?"
        params.append(limit)
        
        cursor = await db._connection.execute(sql, params)
        rows = await cursor.fetchall()
        
        for row in rows:
            # 計算關鍵詞匹配度
            stored_keywords = set(row['keywords'].split(',') if row['keywords'] else [])
            query_keywords = set(keywords)
            
            if stored_keywords:
                match_ratio = len(stored_keywords & query_keywords) / len(stored_keywords | query_keywords)
            else:
                match_ratio = 0.3
            
            item = KnowledgeItem(
                id=row['id'],
                knowledge_type=KnowledgeType(row['knowledge_type']),
                question=row['question'],
                answer=row['answer'],
                context=row['context'] or '',
                keywords=list(stored_keywords),
                success_score=row['success_score'],
                use_count=row['use_count']
            )
            
            results.append(SearchResult(
                item=item,
                similarity=match_ratio,
                source='keyword'
            ))
        
        return results
    
    async def _increment_use_count(self, knowledge_id: int):
        """增加使用計數"""
        try:
            await db._connection.execute("""
                UPDATE rag_knowledge 
                SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (knowledge_id,))
            await db._connection.commit()
        except:
            pass
    
    # ==================== RAG 上下文構建 ====================
    
    async def build_rag_context(
        self,
        user_message: str,
        user_id: str = None,
        max_items: int = 3,
        max_tokens: int = 1000
    ) -> str:
        """
        構建 RAG 上下文
        
        Args:
            user_message: 用戶消息
            user_id: 用戶 ID（用於個性化）
            max_items: 最大知識項數
            max_tokens: 最大 token 數（估算）
        
        Returns:
            格式化的 RAG 上下文
        """
        if not self.is_initialized:
            await self.initialize()
        
        # 搜索相關知識
        results = await self.search(user_message, limit=max_items * 2)
        
        if not results:
            return ""
        
        context_parts = ["【知識庫參考】"]
        current_tokens = 0
        items_added = 0
        
        for result in results:
            if items_added >= max_items:
                break
            
            item = result.item
            
            # 估算 token（中文約 1 字 = 1.5 token）
            item_tokens = int((len(item.question) + len(item.answer)) * 1.5)
            
            if current_tokens + item_tokens > max_tokens:
                break
            
            # 格式化知識項
            type_names = {
                KnowledgeType.QA: '問答',
                KnowledgeType.SCRIPT: '話術',
                KnowledgeType.PRODUCT: '產品',
                KnowledgeType.OBJECTION: '異議處理',
                KnowledgeType.GREETING: '問候',
                KnowledgeType.CLOSING: '成交',
                KnowledgeType.FAQ: 'FAQ',
            }
            type_name = type_names.get(item.knowledge_type, '參考')
            
            if item.question:
                context_parts.append(f"{items_added + 1}. [{type_name}]")
                context_parts.append(f"   問: {item.question[:200]}")
                context_parts.append(f"   答: {item.answer[:300]}")
            else:
                context_parts.append(f"{items_added + 1}. [{type_name}] {item.answer[:400]}")
            
            current_tokens += item_tokens
            items_added += 1
        
        if items_added > 0:
            context_parts.append("【請參考以上知識回覆，但不要直接複製】")
            return '\n'.join(context_parts)
        
        return ""
    
    # ==================== 反饋和優化 ====================
    
    async def record_feedback(
        self,
        knowledge_id: int,
        is_positive: bool,
        feedback_text: str = ""
    ):
        """記錄知識使用反饋"""
        try:
            field = 'feedback_positive' if is_positive else 'feedback_negative'
            
            await db._connection.execute(f"""
                UPDATE rag_knowledge 
                SET {field} = {field} + 1,
                    use_count = use_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (knowledge_id,))
            
            # 重新計算 success_score
            cursor = await db._connection.execute("""
                SELECT feedback_positive, feedback_negative FROM rag_knowledge WHERE id = ?
            """, (knowledge_id,))
            row = await cursor.fetchone()
            
            if row:
                pos = row['feedback_positive']
                neg = row['feedback_negative']
                total = pos + neg
                
                if total > 0:
                    new_score = 0.5 + 0.5 * (pos - neg) / total
                    new_score = max(0.1, min(1.0, new_score))
                    
                    await db._connection.execute("""
                        UPDATE rag_knowledge SET success_score = ? WHERE id = ?
                    """, (new_score, knowledge_id))
            
            await db._connection.commit()
            
        except Exception as e:
            self.log(f"記錄反饋失敗: {e}", "error")
    
    async def _log_learning(
        self,
        user_id: str,
        result: Dict[str, Any],
        outcome: ConversationOutcome
    ):
        """記錄學習日誌"""
        try:
            await db._connection.execute("""
                INSERT INTO rag_learning_log 
                (user_id, outcome, qa_extracted, scripts_extracted, quality_score, is_processed)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (
                user_id, outcome.value,
                result.get('qa_extracted', 0),
                result.get('scripts_extracted', 0),
                result.get('quality_score', 0)
            ))
            await db._connection.commit()
        except:
            pass
    
    # ==================== 維護方法 ====================
    
    async def cleanup_low_quality_knowledge(
        self,
        min_score: float = 0.2,
        min_uses: int = 0,
        days_old: int = 30
    ) -> int:
        """清理低質量知識"""
        try:
            cursor = await db._connection.execute("""
                DELETE FROM rag_knowledge
                WHERE is_active = 1
                AND success_score < ?
                AND use_count <= ?
                AND created_at < datetime('now', '-' || ? || ' days')
            """, (min_score, min_uses, days_old))
            
            deleted = cursor.rowcount
            await db._connection.commit()
            
            if deleted > 0:
                self.log(f"清理了 {deleted} 條低質量知識")
            
            return deleted
        except Exception as e:
            self.log(f"清理失敗: {e}", "error")
            return 0
    
    async def merge_similar_knowledge(self, similarity_threshold: float = 0.9) -> int:
        """合併相似的知識"""
        try:
            cursor = await db._connection.execute("""
                SELECT id, question, embedding, success_score
                FROM rag_knowledge
                WHERE is_active = 1 AND embedding IS NOT NULL
                ORDER BY success_score DESC
            """)
            
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
                        to_deactivate.append(row2['id'])
                        merged_count += 1
            
            if to_deactivate:
                placeholders = ','.join(['?' for _ in to_deactivate])
                await db._connection.execute(f"""
                    UPDATE rag_knowledge SET is_active = 0
                    WHERE id IN ({placeholders})
                """, to_deactivate)
                await db._connection.commit()
                self.log(f"合併了 {merged_count} 條相似知識")
            
            return merged_count
            
        except Exception as e:
            self.log(f"合併失敗: {e}", "error")
            return 0
    
    async def get_statistics(self) -> Dict[str, Any]:
        """獲取 RAG 系統統計"""
        try:
            # 按類型統計
            cursor = await db._connection.execute("""
                SELECT 
                    knowledge_type,
                    COUNT(*) as count,
                    AVG(success_score) as avg_score,
                    SUM(use_count) as total_uses,
                    SUM(feedback_positive) as total_positive,
                    SUM(feedback_negative) as total_negative
                FROM rag_knowledge
                WHERE is_active = 1
                GROUP BY knowledge_type
            """)
            
            rows = await cursor.fetchall()
            
            stats = {
                'by_type': {},
                'total_knowledge': 0,
                'total_uses': 0,
                'avg_score': 0.0,
                'chromadb_enabled': self.use_chromadb,
                'neural_embedding': self.use_neural_embedding
            }
            
            type_names = {
                'qa': 'Q&A 問答',
                'script': '成功話術',
                'product': '產品信息',
                'objection': '異議處理',
                'greeting': '開場白',
                'closing': '成交話術',
                'faq': 'FAQ',
                'custom': '自定義'
            }
            
            total_score = 0.0
            for row in rows:
                row_dict = dict(row)
                type_key = row_dict['knowledge_type']
                type_name = type_names.get(type_key, type_key)
                
                stats['by_type'][type_name] = {
                    'count': row_dict['count'],
                    'avg_score': round(row_dict['avg_score'] or 0, 2),
                    'uses': row_dict['total_uses'] or 0,
                    'positive_feedback': row_dict['total_positive'] or 0,
                    'negative_feedback': row_dict['total_negative'] or 0
                }
                stats['total_knowledge'] += row_dict['count']
                stats['total_uses'] += row_dict['total_uses'] or 0
                total_score += (row_dict['avg_score'] or 0) * row_dict['count']
            
            if stats['total_knowledge'] > 0:
                stats['avg_score'] = round(total_score / stats['total_knowledge'], 2)
            
            # ChromaDB 統計
            if self.use_chromadb and self.collection:
                stats['vector_count'] = self.collection.count()
            
            # 學習統計
            cursor = await db._connection.execute("""
                SELECT 
                    COUNT(*) as sessions,
                    SUM(qa_extracted) as total_qa,
                    SUM(scripts_extracted) as total_scripts,
                    AVG(quality_score) as avg_quality
                FROM rag_learning_log
                WHERE is_processed = 1
            """)
            learning = await cursor.fetchone()
            
            if learning:
                stats['learning'] = {
                    'sessions_processed': learning['sessions'] or 0,
                    'total_qa_extracted': learning['total_qa'] or 0,
                    'total_scripts_extracted': learning['total_scripts'] or 0,
                    'avg_quality_score': round(learning['avg_quality'] or 0, 2)
                }
            
            return stats
            
        except Exception as e:
            self.log(f"獲取統計失敗: {e}", "error")
            return {'error': str(e)}
    
    async def add_manual_knowledge(
        self,
        knowledge_type: KnowledgeType,
        question: str,
        answer: str,
        context: str = ""
    ) -> Optional[int]:
        """手動添加知識"""
        return await self._save_knowledge(
            knowledge_type=knowledge_type,
            question=question,
            answer=answer,
            context=context,
            success_score=0.7  # 手動添加的知識給較高的初始分數
        )


# 創建全局實例
telegram_rag = TelegramRAGSystem()

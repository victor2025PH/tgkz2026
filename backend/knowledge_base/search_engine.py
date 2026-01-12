"""
Knowledge Search Engine
Provides RAG-enhanced search and AI context building
支持向量嵌入和語義搜索
"""
import sys
import json
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional
from .document_manager import document_manager
from .media_manager import media_manager


class KnowledgeSearchEngine:
    """Search engine for knowledge base with RAG support and vector embeddings"""
    
    def __init__(self):
        self.doc_manager = document_manager
        self.media_manager = media_manager
        self._initialized = False
        self._embedding_model = None
        self._embedding_dim = 384
        self._use_simple_embedding = True
    
    async def initialize(self, use_neural_embeddings: bool = False):
        """Initialize search engine with optional neural embeddings"""
        if self._initialized:
            return
        
        await self.doc_manager.initialize()
        await self.media_manager.initialize(self.doc_manager._connection)
        
        # 嘗試加載神經網絡嵌入模型
        if use_neural_embeddings:
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                self._use_simple_embedding = False
                print("[SearchEngine] Using neural embeddings", file=sys.stderr)
            except ImportError:
                print("[SearchEngine] Neural embeddings not available, using simple embeddings", file=sys.stderr)
        
        self._initialized = True
        print("[SearchEngine] Initialized", file=sys.stderr)
    
    def _simple_embedding(self, text: str) -> np.ndarray:
        """簡單文本嵌入 - 基於字符特徵哈希"""
        text = text.lower()
        features = []
        
        # 字符級 n-gram 哈希
        for n in [2, 3, 4]:
            ngrams = [text[i:i+n] for i in range(len(text)-n+1)]
            for ngram in ngrams:
                h = int(hashlib.md5(ngram.encode()).hexdigest()[:8], 16)
                features.append(h % self._embedding_dim)
        
        # 詞級特徵
        for word in text.split():
            h = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
            features.append(h % self._embedding_dim)
        
        embedding = np.zeros(self._embedding_dim, dtype=np.float32)
        for f in features:
            embedding[f] += 1.0
        
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """獲取文本嵌入向量"""
        if self._use_simple_embedding or self._embedding_model is None:
            return self._simple_embedding(text)
        return self._embedding_model.encode(text, convert_to_numpy=True)
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """計算餘弦相似度"""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
    
    async def search(self, query: str, include_docs: bool = True,
                     include_images: bool = True, include_videos: bool = True,
                     limit: int = 10) -> Dict[str, Any]:
        """
        Unified search across all knowledge base resources
        """
        results = {
            "documents": [],
            "images": [],
            "videos": [],
            "qa_pairs": []
        }
        
        if include_docs:
            docs = await self.doc_manager.search_documents(query, limit=limit)
            results["documents"] = docs
        
        if include_images:
            images = await self.media_manager.search_media(query, media_type='image', limit=limit)
            results["images"] = images
        
        if include_videos:
            videos = await self.media_manager.search_media(query, media_type='video', limit=limit)
            results["videos"] = videos
        
        # Search QA pairs
        qa_pairs = await self._search_qa_pairs(query, limit=limit)
        results["qa_pairs"] = qa_pairs
        
        return results
    
    async def _search_qa_pairs(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search QA pairs"""
        cursor = await self.doc_manager._connection.execute("""
            SELECT * FROM qa_pairs 
            WHERE question LIKE ? OR answer LIKE ? OR keywords LIKE ?
            ORDER BY usage_count DESC
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", f"%{query}%", limit))
        
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def build_rag_context(self, query: str, max_chunks: int = 3,
                                 max_tokens: int = 2000,
                                 use_vector_search: bool = True) -> str:
        """
        Build RAG context from knowledge base for AI prompt
        支持向量語義搜索
        """
        context_parts = []
        total_tokens = 0
        
        # Get relevant document chunks (優先使用向量搜索)
        if use_vector_search:
            chunks = await self._vector_search_chunks(query, limit=max_chunks * 2)
        else:
            chunks = await self.doc_manager.get_relevant_chunks(query, limit=max_chunks)
        
        for chunk in chunks[:max_chunks]:
            chunk_tokens = len(chunk['content'])
            if total_tokens + chunk_tokens > max_tokens:
                break
            
            # 添加相似度分數（如果有）
            similarity = chunk.get('similarity', '')
            source_info = f"[來源: {chunk['title']}"
            if similarity:
                source_info += f", 相關度: {similarity:.2f}"
            source_info += "]"
            
            context_parts.append(f"{source_info}\n{chunk['content']}")
            total_tokens += chunk_tokens
        
        # Get relevant QA pairs (也使用向量搜索)
        qa_pairs = await self._vector_search_qa(query, limit=3)
        for qa in qa_pairs[:2]:
            qa_text = f"Q: {qa['question']}\nA: {qa['answer']}"
            qa_tokens = len(qa_text)
            if total_tokens + qa_tokens > max_tokens:
                break
            
            context_parts.append(f"[問答記錄]\n{qa_text}")
            total_tokens += qa_tokens
            
            # Increment usage count
            await self.doc_manager._connection.execute(
                "UPDATE qa_pairs SET usage_count = usage_count + 1 WHERE id = ?",
                (qa['id'],)
            )
        
        await self.doc_manager._connection.commit()
        
        if not context_parts:
            return ""
        
        return "[知識庫參考資料]\n\n" + "\n\n---\n\n".join(context_parts)
    
    async def _vector_search_chunks(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """使用向量相似度搜索文檔塊"""
        query_embedding = self._get_embedding(query)
        
        # 獲取所有塊
        cursor = await self.doc_manager._connection.execute("""
            SELECT c.id, c.content, c.chunk_index, d.title, d.category
            FROM document_chunks c
            JOIN knowledge_documents d ON c.document_id = d.id
        """)
        rows = await cursor.fetchall()
        
        if not rows:
            # 回退到關鍵詞搜索
            return await self.doc_manager.get_relevant_chunks(query, limit=limit)
        
        # 計算相似度
        results = []
        for row in rows:
            chunk_embedding = self._get_embedding(row['content'][:500])  # 限制長度
            similarity = self._cosine_similarity(query_embedding, chunk_embedding)
            
            results.append({
                'id': row['id'],
                'content': row['content'],
                'chunk_index': row['chunk_index'],
                'title': row['title'],
                'category': row['category'],
                'similarity': similarity,
            })
        
        # 按相似度排序
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results[:limit]
    
    async def _vector_search_qa(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """使用向量相似度搜索 QA 對"""
        query_embedding = self._get_embedding(query)
        
        cursor = await self.doc_manager._connection.execute("""
            SELECT * FROM qa_pairs
        """)
        rows = await cursor.fetchall()
        
        if not rows:
            return await self._search_qa_pairs(query, limit=limit)
        
        results = []
        for row in rows:
            # 結合問題和答案計算相似度
            qa_text = row['question'] + " " + row['answer'][:200]
            qa_embedding = self._get_embedding(qa_text)
            similarity = self._cosine_similarity(query_embedding, qa_embedding)
            
            results.append({
                **dict(row),
                'similarity': similarity,
            })
        
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results[:limit]
    
    async def find_relevant_media(self, query: str, 
                                   limit: int = 3) -> Dict[str, List[Dict[str, Any]]]:
        """
        Find relevant images and videos for a query
        """
        images = await self.media_manager.search_media(query, media_type='image', limit=limit)
        videos = await self.media_manager.search_media(query, media_type='video', limit=limit)
        
        return {
            "images": images,
            "videos": videos
        }
    
    async def add_qa_pair(self, question: str, answer: str,
                          category: str = "general", keywords: List[str] = None,
                          media_ids: List[int] = None) -> int:
        """Add a QA pair to the knowledge base"""
        cursor = await self.doc_manager._connection.execute("""
            INSERT INTO qa_pairs (question, answer, category, keywords, media_ids)
            VALUES (?, ?, ?, ?, ?)
        """, (
            question,
            answer,
            category,
            json.dumps(keywords or []),
            json.dumps(media_ids or [])
        ))
        
        await self.doc_manager._connection.commit()
        return cursor.lastrowid
    
    async def get_all_qa_pairs(self, category: str = None) -> List[Dict[str, Any]]:
        """Get all QA pairs"""
        query = "SELECT * FROM qa_pairs"
        params = []
        
        if category:
            query += " WHERE category = ?"
            params.append(category)
        
        query += " ORDER BY usage_count DESC, created_at DESC"
        
        cursor = await self.doc_manager._connection.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def delete_qa_pair(self, qa_id: int) -> bool:
        """Delete a QA pair"""
        await self.doc_manager._connection.execute(
            "DELETE FROM qa_pairs WHERE id = ?", (qa_id,)
        )
        await self.doc_manager._connection.commit()
        return True
    
    async def import_qa_from_csv(self, csv_path: str) -> Dict[str, Any]:
        """Import QA pairs from CSV file"""
        try:
            import csv
            
            imported = 0
            errors = []
            
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        question = row.get('question', row.get('Q', row.get('問題', '')))
                        answer = row.get('answer', row.get('A', row.get('回答', '')))
                        category = row.get('category', row.get('分類', 'general'))
                        keywords = row.get('keywords', row.get('關鍵詞', ''))
                        
                        if question and answer:
                            kw_list = [k.strip() for k in keywords.split(',') if k.strip()]
                            await self.add_qa_pair(question, answer, category, kw_list)
                            imported += 1
                    except Exception as e:
                        errors.append(str(e))
            
            return {
                "success": True,
                "imported": imported,
                "errors": errors
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def import_qa_from_json(self, json_path: str) -> Dict[str, Any]:
        """Import QA pairs from JSON file"""
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            imported = 0
            errors = []
            
            qa_list = data if isinstance(data, list) else data.get('qa_pairs', [])
            
            for item in qa_list:
                try:
                    question = item.get('question', item.get('Q', ''))
                    answer = item.get('answer', item.get('A', ''))
                    category = item.get('category', 'general')
                    keywords = item.get('keywords', [])
                    
                    if question and answer:
                        await self.add_qa_pair(question, answer, category, keywords)
                        imported += 1
                except Exception as e:
                    errors.append(str(e))
            
            return {
                "success": True,
                "imported": imported,
                "errors": errors
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        return await self.doc_manager.get_stats()
    
    async def close(self):
        """Close connections"""
        await self.doc_manager.close()


# Global instance
search_engine = KnowledgeSearchEngine()

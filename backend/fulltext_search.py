"""
Full-Text Search Engine
全文搜索引擎 - 使用 SQLite FTS5 實現高性能全文搜索
"""
import aiosqlite
import sys
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime


class FullTextSearchEngine:
    """全文搜索引擎（基於 SQLite FTS5）"""
    
    def __init__(self, db_path: str):
        """
        初始化全文搜索引擎
        
        Args:
            db_path: 數據庫文件路徑
        """
        self.db_path = db_path
        self._initialized = False
    
    async def _init_fts(self):
        """初始化 FTS 虛擬表（異步版本）"""
        if self._initialized:
            return
        
        conn = await aiosqlite.connect(self.db_path)
        
        try:
            # 創建 FTS 虛擬表（用於聊天記錄搜索）
            await conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS chat_history_fts USING fts5(
                    content,
                    user_id UNINDEXED,
                    timestamp UNINDEXED,
                    role UNINDEXED,
                    account_phone UNINDEXED,
                    content='chat_history',
                    content_rowid='id'
                )
            """)
            
            # 創建觸發器自動更新 FTS（插入）
            await conn.execute("""
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_insert AFTER INSERT ON chat_history
                BEGIN
                    INSERT INTO chat_history_fts(rowid, content, user_id, timestamp, role, account_phone)
                    VALUES (new.id, new.content, new.user_id, new.timestamp, new.role, new.account_phone);
                END;
            """)
            
            # 創建觸發器自動更新 FTS（更新）
            await conn.execute("""
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_update AFTER UPDATE ON chat_history
                BEGIN
                    UPDATE chat_history_fts 
                    SET content = new.content,
                        user_id = new.user_id,
                        timestamp = new.timestamp,
                        role = new.role,
                        account_phone = new.account_phone
                    WHERE rowid = new.id;
                END;
            """)
            
            # 創建觸發器自動更新 FTS（刪除）
            await conn.execute("""
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_delete AFTER DELETE ON chat_history
                BEGIN
                    DELETE FROM chat_history_fts WHERE rowid = old.id;
                END;
            """)
            
            # 為 Lead 創建 FTS 表
            await conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS leads_fts USING fts5(
                    username,
                    first_name,
                    last_name,
                    source_group,
                    triggered_keyword,
                    status UNINDEXED,
                    user_id UNINDEXED,
                    id UNINDEXED,
                    content='leads',
                    content_rowid='id'
                )
            """)
            
            # Lead FTS 觸發器 - 先刪除舊的（如果存在），然後創建新的
            await conn.execute("DROP TRIGGER IF EXISTS leads_fts_insert")
            await conn.execute("""
                CREATE TRIGGER leads_fts_insert AFTER INSERT ON leads
                BEGIN
                    INSERT INTO leads_fts(rowid, username, first_name, last_name, source_group, triggered_keyword, status, user_id, id)
                    VALUES (new.id, new.username, new.first_name, new.last_name, new.source_group, new.triggered_keyword, new.status, new.user_id, new.id);
                END;
            """)
            
            await conn.execute("""
                CREATE TRIGGER IF NOT EXISTS leads_fts_update AFTER UPDATE ON leads
                BEGIN
                    UPDATE leads_fts 
                    SET username = new.username,
                        first_name = new.first_name,
                        last_name = new.last_name,
                        source_group = new.source_group,
                        triggered_keyword = new.triggered_keyword,
                        status = new.status
                    WHERE rowid = new.id;
                END;
            """)
            
            await conn.execute("""
                CREATE TRIGGER IF NOT EXISTS leads_fts_delete AFTER DELETE ON leads
                BEGIN
                    DELETE FROM leads_fts WHERE rowid = old.id;
                END;
            """)
            
            await conn.commit()
            self._initialized = True
            print("[FullTextSearch] FTS5 tables and triggers created", file=sys.stderr)
            
        except aiosqlite.OperationalError as e:
            error_str = str(e).lower()
            # 靜默處理已存在或表不存在的情況
            if "already exists" not in error_str and "no such table" not in error_str:
                print(f"[FullTextSearch] Warning: {e}", file=sys.stderr)
            self._initialized = True
        except Exception as e:
            error_str = str(e).lower()
            if "no such table" not in error_str:
                print(f"[FullTextSearch] Error initializing FTS: {e}", file=sys.stderr)
            self._initialized = True  # 標記為已初始化，避免重複嘗試
        finally:
            await conn.close()
    
    async def search_chat_history(
        self,
        query: str,
        user_id: Optional[str] = None,
        account_phone: Optional[str] = None,
        role: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        搜索聊天記錄
        
        Args:
            query: 搜索查詢（支持 FTS5 語法）
            user_id: 限制用戶ID（可選）
            account_phone: 限制帳號電話（可選）
            role: 限制角色（可選）
            date_from: 開始日期（可選）
            date_to: 結束日期（可選）
            limit: 結果數量限制
            offset: 偏移量
            
        Returns:
            匹配的聊天記錄列表
        """
        await self._init_fts()
        
        # 構建 FTS 查詢
        fts_query = self._build_fts_query(query)
        
        # 構建 SQL 查詢
        sql = """
            SELECT ch.id, ch.user_id, ch.role, ch.content, ch.timestamp, 
                   ch.account_phone, ch.message_id,
                   rank
            FROM chat_history ch
            JOIN chat_history_fts fts ON ch.id = fts.rowid
            WHERE chat_history_fts MATCH ?
        """
        
        params = [fts_query]
        
        # 添加過濾條件
        if user_id:
            sql += " AND ch.user_id = ?"
            params.append(user_id)
        
        if account_phone:
            sql += " AND ch.account_phone = ?"
            params.append(account_phone)
        
        if role:
            sql += " AND ch.role = ?"
            params.append(role)
        
        if date_from:
            sql += " AND ch.timestamp >= ?"
            params.append(date_from.isoformat())
        
        if date_to:
            sql += " AND ch.timestamp <= ?"
            params.append(date_to.isoformat())
        
        # 排序和分頁
        sql += " ORDER BY rank, ch.timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        # 執行查詢
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        
        try:
            async with conn.execute(sql, params) as cursor:
                rows = await cursor.fetchall()
                
                results = []
                for row in rows:
                    results.append({
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'role': row['role'],
                        'content': row['content'],
                        'timestamp': row['timestamp'],
                        'account_phone': row['account_phone'],
                        'message_id': row['message_id'],
                        'relevance_score': row['rank'] if 'rank' in row.keys() else 0
                    })
                
                return results
                
        except Exception as e:
            print(f"[FullTextSearch] Error searching chat history: {e}", file=sys.stderr)
            return []
        finally:
            await conn.close()
    
    async def search_leads(
        self,
        query: str,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        搜索 Lead - 支持 FTS 和 LIKE 雙模式
        
        Args:
            query: 搜索查詢
            status: 限制狀態（可選）
            date_from: 開始日期（可選）
            date_to: 結束日期（可選）
            limit: 結果數量限制
            offset: 偏移量
            
        Returns:
            匹配的 Lead 列表
        """
        # 🆕 先嘗試 FTS 搜索，失敗或無結果時回退到 LIKE
        results = await self._search_leads_fts(query, status, date_from, date_to, limit, offset)
        
        if not results:
            print(f"[FullTextSearch] FTS returned 0 results, falling back to LIKE search", file=sys.stderr)
            results = await self._search_leads_like(query, status, date_from, date_to, limit, offset)
        
        return results
    
    async def _search_leads_fts(
        self,
        query: str,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """FTS5 全文搜索"""
        try:
            await self._init_fts()
            
            # 構建 FTS 查詢
            fts_query = self._build_fts_query(query)
            
            # 構建 SQL 查詢
            sql = """
                SELECT l.id, l.user_id as userId, l.username, l.first_name, l.last_name,
                       l.source_group, l.triggered_keyword, l.status, l.timestamp,
                       rank
                FROM leads l
                JOIN leads_fts fts ON l.id = fts.rowid
                WHERE leads_fts MATCH ?
            """
            
            params = [fts_query]
            
            if status:
                sql += " AND l.status = ?"
                params.append(status)
            
            if date_from:
                sql += " AND l.timestamp >= ?"
                params.append(date_from.isoformat())
            
            if date_to:
                sql += " AND l.timestamp <= ?"
                params.append(date_to.isoformat())
            
            sql += " ORDER BY rank, l.timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            # 執行查詢
            conn = await aiosqlite.connect(self.db_path)
            conn.row_factory = aiosqlite.Row
            
            try:
                async with conn.execute(sql, params) as cursor:
                    rows = await cursor.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            'id': row['id'],
                            'userId': row['userId'],
                            'username': row['username'],
                            'first_name': row['first_name'],
                            'last_name': row['last_name'],
                            'source_group': row['source_group'],
                            'triggered_keyword': row['triggered_keyword'],
                            'status': row['status'],
                            'timestamp': row['timestamp'],
                            'relevance_score': row['rank'] if 'rank' in row.keys() else 0
                        })
                    
                    return results
                    
            finally:
                await conn.close()
                
        except Exception as e:
            print(f"[FullTextSearch] FTS search error: {e}", file=sys.stderr)
            return []
    
    async def _search_leads_like(
        self,
        query: str,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """🆕 LIKE 模糊搜索回退"""
        try:
            # 構建 LIKE 查詢
            like_pattern = f"%{query}%"
            
            sql = """
                SELECT id, user_id as userId, username, first_name, last_name,
                       source_group, triggered_keyword, status, timestamp
                FROM leads
                WHERE (
                    username LIKE ? OR
                    first_name LIKE ? OR
                    last_name LIKE ? OR
                    source_group LIKE ? OR
                    triggered_keyword LIKE ? OR
                    CAST(user_id AS TEXT) LIKE ?
                )
            """
            
            params = [like_pattern, like_pattern, like_pattern, like_pattern, like_pattern, like_pattern]
            
            if status:
                sql += " AND status = ?"
                params.append(status)
            
            if date_from:
                sql += " AND timestamp >= ?"
                params.append(date_from.isoformat())
            
            if date_to:
                sql += " AND timestamp <= ?"
                params.append(date_to.isoformat())
            
            sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            # 執行查詢
            conn = await aiosqlite.connect(self.db_path)
            conn.row_factory = aiosqlite.Row
            
            try:
                async with conn.execute(sql, params) as cursor:
                    rows = await cursor.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            'id': row['id'],
                            'userId': row['userId'],
                            'username': row['username'],
                            'first_name': row['first_name'],
                            'last_name': row['last_name'],
                            'source_group': row['source_group'],
                            'triggered_keyword': row['triggered_keyword'],
                            'status': row['status'],
                            'timestamp': row['timestamp'],
                            'relevance_score': 0  # LIKE 搜索無相關性評分
                        })
                    
                    print(f"[FullTextSearch] LIKE search found {len(results)} results for '{query}'", file=sys.stderr)
                    return results
                    
            finally:
                await conn.close()
                
        except Exception as e:
            print(f"[FullTextSearch] LIKE search error: {e}", file=sys.stderr)
            return []
    
    def _build_fts_query(self, query: str) -> str:
        """
        構建 FTS5 查詢字符串
        
        Args:
            query: 用戶輸入的查詢
            
        Returns:
            FTS5 查詢字符串
        """
        # 簡單的查詢構建
        # 支持多詞搜索（AND 邏輯）
        words = query.strip().split()
        
        if not words:
            return ""
        
        # 如果查詢包含引號，保持原樣（精確匹配）
        if '"' in query:
            return query
        
        # 否則，使用 AND 邏輯組合所有詞
        # FTS5 語法：詞之間用空格表示 AND
        return " ".join(f'"{word}"' for word in words)
    
    async def rebuild_index(self):
        """重建 FTS 索引（用於初始數據導入）"""
        try:
            await self._init_fts()
        except Exception as e:
            error_str = str(e).lower()
            if "malformed" in error_str or "corrupt" in error_str:
                print(f"[FullTextSearch] Database is corrupted, skipping index rebuild: {e}", file=sys.stderr)
                return
            raise
        
        conn = await aiosqlite.connect(self.db_path, timeout=30.0)
        
        try:
            # 檢查資料庫完整性
            cursor = await conn.execute("PRAGMA integrity_check")
            result = await cursor.fetchone()
            if result and result[0] != "ok":
                print(f"[FullTextSearch] Database integrity check failed: {result[0]}, skipping index rebuild", file=sys.stderr)
                return
            
            # ========== 優化：檢查表是否存在再重建索引 ==========
            # 檢查 chat_history 表是否存在
            cursor = await conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history'"
            )
            chat_history_exists = await cursor.fetchone() is not None
            
            if chat_history_exists:
                # 重建聊天記錄索引
                try:
                    await conn.execute("DELETE FROM chat_history_fts")
                    await conn.execute("""
                        INSERT INTO chat_history_fts(rowid, content, user_id, timestamp, role, account_phone)
                        SELECT id, content, user_id, timestamp, role, account_phone
                        FROM chat_history
                    """)
                except Exception as e:
                    pass  # 靜默處理 FTS 表不存在的情況
            
            # 檢查 leads 表是否存在
            cursor = await conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='leads'"
            )
            leads_exists = await cursor.fetchone() is not None
            
            if leads_exists:
                # 重建 Lead 索引
                try:
                    await conn.execute("DELETE FROM leads_fts")
                    await conn.execute("""
                        INSERT INTO leads_fts(rowid, username, first_name, last_name, source_group, triggered_keyword, status, user_id, id)
                        SELECT id, username, first_name, last_name, source_group, triggered_keyword, status, user_id, id
                        FROM leads
                    """)
                except Exception as e:
                    pass  # 靜默處理 FTS 表不存在的情況
            
            await conn.commit()
            if chat_history_exists or leads_exists:
                print("[FullTextSearch] FTS indexes rebuilt", file=sys.stderr)
            
        except Exception as e:
            error_str = str(e).lower()
            if "malformed" in error_str or "corrupt" in error_str or "database disk image" in error_str:
                print(f"[FullTextSearch] Database corruption detected during index rebuild: {e}", file=sys.stderr)
            elif "no such table" in error_str:
                pass  # 靜默處理表不存在的情況，這是正常的
            else:
                print(f"[FullTextSearch] Error rebuilding index: {e}", file=sys.stderr)
        finally:
            await conn.close()


# 全局搜索引擎實例
_search_engine: Optional[FullTextSearchEngine] = None


def init_search_engine(db_path: str) -> FullTextSearchEngine:
    """初始化全局搜索引擎"""
    global _search_engine
    if _search_engine is None:
        _search_engine = FullTextSearchEngine(db_path)
    return _search_engine


def get_search_engine() -> FullTextSearchEngine:
    """獲取全局搜索引擎實例"""
    global _search_engine
    if _search_engine is None:
        raise RuntimeError("SearchEngine not initialized. Call init_search_engine() first.")
    return _search_engine

"""
搜索歷史記錄服務

功能：
1. 持久化搜索結果到 SQLite 數據庫
2. 標記新發現 vs 已知群組
3. 追蹤成員數變化
4. 提供搜索歷史查詢
"""

import sqlite3
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class DiscoveredResource:
    """已發現的資源"""
    id: int = 0
    telegram_id: str = ""
    username: str = ""
    title: str = ""
    description: str = ""
    member_count: int = 0
    chat_type: str = "group"
    source: str = ""
    link: str = ""
    first_seen: str = ""
    last_seen: str = ""
    seen_count: int = 1
    last_member_count: int = 0
    status: str = "active"
    keywords: str = ""
    
    # 運行時屬性（不存儲）
    is_new: bool = False
    member_change: int = 0


@dataclass
class SearchRecord:
    """搜索記錄"""
    id: int = 0
    keyword: str = ""
    search_time: str = ""
    account_phone: str = ""
    result_count: int = 0
    new_count: int = 0
    sources: str = ""
    duration_ms: float = 0


class SearchHistoryService:
    """搜索歷史服務"""
    
    def __init__(self, db_path: str = None):
        """
        初始化服務
        
        Args:
            db_path: 數據庫路徑，默認使用用戶數據目錄
        """
        if db_path is None:
            # 🆕 使用 config.py 中的持久化數據目錄
            from config import DATABASE_DIR
            data_dir = DATABASE_DIR
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "search_history.db")
        
        self.db_path = db_path
        self._init_db()
    
    def _get_conn(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """初始化數據庫表"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # 搜索記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                account_phone TEXT,
                result_count INTEGER DEFAULT 0,
                new_count INTEGER DEFAULT 0,
                sources TEXT,
                duration_ms REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 已發現資源表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS discovered_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT,
                username TEXT,
                title TEXT NOT NULL,
                description TEXT,
                member_count INTEGER DEFAULT 0,
                chat_type TEXT DEFAULT 'group',
                source TEXT,
                link TEXT,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                seen_count INTEGER DEFAULT 1,
                last_member_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                keywords TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 搜索結果關聯表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_result_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                search_id INTEGER NOT NULL,
                resource_id INTEGER NOT NULL,
                position INTEGER,
                relevance_score INTEGER DEFAULT 0,
                is_new INTEGER DEFAULT 0,
                member_count_at_search INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (search_id) REFERENCES search_history(id) ON DELETE CASCADE,
                FOREIGN KEY (resource_id) REFERENCES discovered_resources(id) ON DELETE CASCADE
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_keyword ON search_history(keyword)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_time ON search_history(search_time DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_telegram_id ON discovered_resources(telegram_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_username ON discovered_resources(username)')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_resources_unique_tid ON discovered_resources(telegram_id) WHERE telegram_id IS NOT NULL AND telegram_id != ""')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_resources_unique_username ON discovered_resources(username) WHERE username IS NOT NULL AND username != ""')
        
        conn.commit()
        conn.close()
    
    def find_existing_resource(self, telegram_id: str = None, username: str = None, title: str = None) -> Optional[Dict]:
        """
        查找已存在的資源
        
        優先級：telegram_id > username > title
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        result = None
        
        # 優先用 telegram_id 查找
        if telegram_id and str(telegram_id).strip():
            cursor.execute(
                'SELECT * FROM discovered_resources WHERE telegram_id = ?',
                (str(telegram_id),)
            )
            row = cursor.fetchone()
            if row:
                result = dict(row)
        
        # 其次用 username 查找
        if not result and username and username.strip():
            cursor.execute(
                'SELECT * FROM discovered_resources WHERE username = ?',
                (username.lower(),)
            )
            row = cursor.fetchone()
            if row:
                result = dict(row)
        
        # 最後用 title 模糊匹配（僅當前兩者都沒有時）
        if not result and title and title.strip() and len(title) > 5:
            cursor.execute(
                'SELECT * FROM discovered_resources WHERE title = ?',
                (title,)
            )
            row = cursor.fetchone()
            if row:
                result = dict(row)
        
        conn.close()
        return result
    
    def save_or_update_resource(self, resource_data: Dict) -> Tuple[int, bool, int]:
        """
        保存或更新資源
        
        Returns:
            Tuple[resource_id, is_new, member_change]
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        telegram_id = str(resource_data.get('telegram_id') or '').strip()
        username = (resource_data.get('username') or '').lower().strip()
        title = (resource_data.get('title') or '').strip()
        member_count = resource_data.get('member_count', 0) or 0
        
        # 查找已存在的資源
        existing = self.find_existing_resource(telegram_id, username, title)
        
        now = datetime.now().isoformat()
        
        if existing:
            # 更新已存在的資源
            resource_id = existing['id']
            last_member_count = existing.get('member_count', 0) or 0
            member_change = member_count - last_member_count
            seen_count = (existing.get('seen_count', 0) or 0) + 1
            
            cursor.execute('''
                UPDATE discovered_resources SET
                    title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    member_count = ?,
                    last_member_count = ?,
                    chat_type = COALESCE(?, chat_type),
                    source = COALESCE(?, source),
                    link = COALESCE(?, link),
                    last_seen = ?,
                    seen_count = ?,
                    updated_at = ?,
                    telegram_id = COALESCE(NULLIF(?, ''), telegram_id),
                    username = COALESCE(NULLIF(?, ''), username)
                WHERE id = ?
            ''', (
                title if title else None,
                resource_data.get('description'),
                member_count,
                last_member_count,
                resource_data.get('chat_type') or resource_data.get('type'),
                resource_data.get('source'),
                resource_data.get('link'),
                now,
                seen_count,
                now,
                telegram_id,
                username,
                resource_id
            ))
            
            conn.commit()
            conn.close()
            return resource_id, False, member_change
        else:
            # 創建新資源
            cursor.execute('''
                INSERT INTO discovered_resources (
                    telegram_id, username, title, description, member_count,
                    chat_type, source, link, first_seen, last_seen, seen_count,
                    last_member_count, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'active', ?, ?)
            ''', (
                telegram_id if telegram_id else None,
                username if username else None,
                title,
                resource_data.get('description'),
                member_count,
                resource_data.get('chat_type') or resource_data.get('type', 'group'),
                resource_data.get('source'),
                resource_data.get('link'),
                now,
                now,
                now,
                now
            ))
            
            resource_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return resource_id, True, 0
    
    def save_search_with_results(
        self,
        keyword: str,
        results: List[Dict],
        account_phone: str = None,
        sources: List[str] = None,
        duration_ms: float = 0
    ) -> Dict[str, Any]:
        """
        保存搜索記錄和結果
        
        Returns:
            包含統計信息的字典
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        new_count = 0
        updated_results = []
        
        # 處理每個結果
        for idx, result in enumerate(results):
            resource_id, is_new, member_change = self.save_or_update_resource(result)
            
            if is_new:
                new_count += 1
            
            # 添加標記到結果
            result['_resource_id'] = resource_id
            result['_is_new'] = is_new
            result['_member_change'] = member_change
            result['_position'] = idx + 1
            updated_results.append(result)
        
        # 保存搜索記錄
        cursor.execute('''
            INSERT INTO search_history (
                keyword, search_time, account_phone, result_count, new_count,
                sources, duration_ms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            keyword,
            now,
            account_phone,
            len(results),
            new_count,
            json.dumps(sources) if sources else None,
            duration_ms,
            now
        ))
        
        search_id = cursor.lastrowid
        
        # 保存搜索結果關聯
        for result in updated_results:
            cursor.execute('''
                INSERT INTO search_result_items (
                    search_id, resource_id, position, relevance_score,
                    is_new, member_count_at_search, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                search_id,
                result['_resource_id'],
                result['_position'],
                result.get('_relevance_score', 0),
                1 if result['_is_new'] else 0,
                result.get('member_count', 0),
                now
            ))
        
        conn.commit()
        conn.close()
        
        return {
            'search_id': search_id,
            'total_count': len(results),
            'new_count': new_count,
            'existing_count': len(results) - new_count,
            'results': updated_results
        }
    
    def get_search_history(
        self,
        keyword: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """獲取搜索歷史"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        if keyword:
            cursor.execute('''
                SELECT * FROM search_history
                WHERE keyword LIKE ?
                ORDER BY search_time DESC
                LIMIT ? OFFSET ?
            ''', (f'%{keyword}%', limit, offset))
        else:
            cursor.execute('''
                SELECT * FROM search_history
                ORDER BY search_time DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    def get_search_results(self, search_id: int) -> List[Dict]:
        """獲取某次搜索的結果"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                r.*,
                i.position,
                i.is_new,
                i.member_count_at_search,
                i.relevance_score
            FROM search_result_items i
            JOIN discovered_resources r ON i.resource_id = r.id
            WHERE i.search_id = ?
            ORDER BY i.position
        ''', (search_id,))
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    def get_resource_history(self, resource_id: int = None, username: str = None, telegram_id: str = None) -> Dict:
        """獲取資源的歷史記錄"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # 查找資源
        if resource_id:
            cursor.execute('SELECT * FROM discovered_resources WHERE id = ?', (resource_id,))
        elif username:
            cursor.execute('SELECT * FROM discovered_resources WHERE username = ?', (username,))
        elif telegram_id:
            cursor.execute('SELECT * FROM discovered_resources WHERE telegram_id = ?', (str(telegram_id),))
        else:
            conn.close()
            return None
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        
        resource = dict(row)
        resource_id = resource['id']
        
        # 獲取搜索歷史
        cursor.execute('''
            SELECT 
                s.keyword,
                s.search_time,
                i.position,
                i.member_count_at_search
            FROM search_result_items i
            JOIN search_history s ON i.search_id = s.id
            WHERE i.resource_id = ?
            ORDER BY s.search_time DESC
            LIMIT 20
        ''', (resource_id,))
        
        history = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'resource': resource,
            'search_history': history
        }
    
    def get_statistics(self) -> Dict:
        """獲取統計信息"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # 總資源數
        cursor.execute('SELECT COUNT(*) as count FROM discovered_resources')
        total_resources = cursor.fetchone()['count']
        
        # 總搜索次數
        cursor.execute('SELECT COUNT(*) as count FROM search_history')
        total_searches = cursor.fetchone()['count']
        
        # 今日新發現
        today = datetime.now().date().isoformat()
        cursor.execute(
            'SELECT COUNT(*) as count FROM discovered_resources WHERE DATE(first_seen) = ?',
            (today,)
        )
        today_new = cursor.fetchone()['count']
        
        # 熱門關鍵詞
        cursor.execute('''
            SELECT keyword, COUNT(*) as count
            FROM search_history
            GROUP BY keyword
            ORDER BY count DESC
            LIMIT 10
        ''')
        top_keywords = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'total_resources': total_resources,
            'total_searches': total_searches,
            'today_new': today_new,
            'top_keywords': top_keywords
        }
    
    def cleanup_old_records(self, days: int = 30):
        """清理舊的搜索記錄（保留資源主記錄）"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        # 刪除舊的搜索結果關聯
        cursor.execute('''
            DELETE FROM search_result_items
            WHERE search_id IN (
                SELECT id FROM search_history WHERE search_time < ?
            )
        ''', (cutoff,))
        
        # 刪除舊的搜索記錄
        cursor.execute('DELETE FROM search_history WHERE search_time < ?', (cutoff,))
        
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        
        return deleted


# 全局實例
_search_history_service: Optional[SearchHistoryService] = None


def get_search_history_service() -> SearchHistoryService:
    """獲取搜索歷史服務實例"""
    global _search_history_service
    if _search_history_service is None:
        _search_history_service = SearchHistoryService()
    return _search_history_service

"""
Migration 0013: 創建搜索歷史記錄表

用於持久化搜索結果，支持：
- 搜索歷史記錄
- 新發現 vs 已知群組標記
- 成員數變化追蹤
- 群組狀態變化追蹤
"""

from .migration_base import Migration


class Migration0013(Migration):
    """創建搜索歷史記錄表"""
    
    version = 13
    description = "創建搜索歷史記錄表"
    
    def up(self, conn):
        cursor = conn.cursor()
        
        # 1. 搜索記錄表 - 記錄每次搜索
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
        
        # 2. 已發現資源表 - 存儲所有發現過的群組/頻道
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(telegram_id),
                UNIQUE(username)
            )
        ''')
        
        # 3. 搜索結果關聯表 - 記錄每次搜索找到的資源
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
        
        # 4. 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_keyword ON search_history(keyword)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_history_time ON search_history(search_time DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_telegram_id ON discovered_resources(telegram_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_username ON discovered_resources(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_title ON discovered_resources(title)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_first_seen ON discovered_resources(first_seen)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_discovered_resources_last_seen ON discovered_resources(last_seen)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_result_items_search_id ON search_result_items(search_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_result_items_resource_id ON search_result_items(resource_id)')
        
        conn.commit()
        return True
    
    def down(self, conn):
        cursor = conn.cursor()
        cursor.execute('DROP TABLE IF EXISTS search_result_items')
        cursor.execute('DROP TABLE IF EXISTS discovered_resources')
        cursor.execute('DROP TABLE IF EXISTS search_history')
        conn.commit()
        return True


# 導出遷移類
migration = Migration0013()

"""
Migration 0005: Add Resource Discovery Tables
添加資源發現系統相關表
"""
from migrations.migration_base import Migration


class Migration0005_AddResourceDiscovery(Migration):
    """Add resource discovery tables migration"""
    
    def __init__(self):
        super().__init__(
            version=5,
            description="Add Resource Discovery Tables for Auto Group/Channel Discovery"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        connection = db._connection
        
        # 1. 發現的資源表 - 存儲發現的群組/頻道
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discovered_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_type TEXT NOT NULL,
                telegram_id TEXT UNIQUE,
                username TEXT,
                title TEXT,
                description TEXT,
                member_count INTEGER DEFAULT 0,
                activity_score REAL DEFAULT 0.5,
                relevance_score REAL DEFAULT 0.5,
                overall_score REAL DEFAULT 0.5,
                discovery_source TEXT DEFAULT 'search',
                discovery_keyword TEXT,
                discovered_by_phone TEXT,
                status TEXT DEFAULT 'discovered',
                is_public INTEGER DEFAULT 1,
                has_discussion INTEGER DEFAULT 0,
                discussion_id TEXT,
                invite_link TEXT,
                join_attempts INTEGER DEFAULT 0,
                last_join_attempt DATETIME,
                joined_at DATETIME,
                joined_by_phone TEXT,
                left_at DATETIME,
                last_checked_at DATETIME,
                last_message_at DATETIME,
                messages_per_day REAL DEFAULT 0,
                error_code TEXT,
                error_message TEXT,
                tags TEXT DEFAULT '[]',
                notes TEXT,
                metadata TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. 發現日誌表 - 記錄搜索歷史
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discovery_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                search_type TEXT DEFAULT 'keyword',
                search_query TEXT,
                account_phone TEXT,
                resources_found INTEGER DEFAULT 0,
                resources_new INTEGER DEFAULT 0,
                resources_updated INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                status TEXT DEFAULT 'completed',
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. 搜索關鍵詞配置表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discovery_keywords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                priority INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1,
                last_searched_at DATETIME,
                total_found INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 4. 資源加入隊列表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS resource_join_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_id INTEGER NOT NULL,
                assigned_phone TEXT,
                priority INTEGER DEFAULT 5,
                status TEXT DEFAULT 'pending',
                scheduled_at DATETIME,
                attempted_at DATETIME,
                completed_at DATETIME,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_id) REFERENCES discovered_resources(id)
            )
        """)
        
        # 5. 資源標籤表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS resource_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                color TEXT DEFAULT '#3b82f6',
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better query performance
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovered_resources_status 
            ON discovered_resources(status)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovered_resources_type 
            ON discovered_resources(resource_type)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovered_resources_score 
            ON discovered_resources(overall_score DESC)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovered_resources_telegram_id 
            ON discovered_resources(telegram_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discovery_logs_created 
            ON discovery_logs(created_at DESC)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_join_queue_status 
            ON resource_join_queue(status, priority DESC)
        """)
        
        await connection.commit()
    
    async def down(self, db) -> None:
        """Rollback migration (downgrade)"""
        connection = db._connection
        
        # Drop indexes first
        await connection.execute("DROP INDEX IF EXISTS idx_discovered_resources_status")
        await connection.execute("DROP INDEX IF EXISTS idx_discovered_resources_type")
        await connection.execute("DROP INDEX IF EXISTS idx_discovered_resources_score")
        await connection.execute("DROP INDEX IF EXISTS idx_discovered_resources_telegram_id")
        await connection.execute("DROP INDEX IF EXISTS idx_discovery_logs_created")
        await connection.execute("DROP INDEX IF EXISTS idx_join_queue_status")
        
        # Drop tables
        await connection.execute("DROP TABLE IF EXISTS resource_join_queue")
        await connection.execute("DROP TABLE IF EXISTS resource_tags")
        await connection.execute("DROP TABLE IF EXISTS discovery_keywords")
        await connection.execute("DROP TABLE IF EXISTS discovery_logs")
        await connection.execute("DROP TABLE IF EXISTS discovered_resources")
        
        await connection.commit()

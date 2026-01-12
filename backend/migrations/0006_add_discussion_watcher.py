"""
Migration 0006: Add Discussion Watcher Tables
添加討論組監控系統相關表
"""
from migrations.migration_base import Migration


class Migration0006_AddDiscussionWatcher(Migration):
    """Add discussion watcher tables migration"""
    
    def __init__(self):
        super().__init__(
            version=6,
            description="Add Discussion Watcher Tables for Channel Comment Monitoring"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        connection = db._connection
        
        # 1. 頻道-討論組關聯表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS channel_discussions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                channel_username TEXT,
                channel_title TEXT,
                discussion_id TEXT NOT NULL,
                discussion_username TEXT,
                discussion_title TEXT,
                is_active INTEGER DEFAULT 1,
                is_monitoring INTEGER DEFAULT 0,
                monitored_by_phone TEXT,
                linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_message_at DATETIME,
                message_count INTEGER DEFAULT 0,
                lead_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. 討論組消息記錄表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discussion_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discussion_id TEXT NOT NULL,
                channel_id TEXT,
                channel_post_id INTEGER,
                message_id INTEGER NOT NULL,
                reply_to_message_id INTEGER,
                user_id TEXT NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                message_text TEXT,
                message_type TEXT DEFAULT 'text',
                is_matched INTEGER DEFAULT 0,
                matched_keywords TEXT DEFAULT '[]',
                is_processed INTEGER DEFAULT 0,
                is_replied INTEGER DEFAULT 0,
                reply_message_id INTEGER,
                sentiment REAL DEFAULT 0.5,
                intent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. 討論組監控配置表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discussion_monitor_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_discussion_id INTEGER NOT NULL,
                auto_reply_enabled INTEGER DEFAULT 0,
                reply_template TEXT,
                reply_delay_min INTEGER DEFAULT 30,
                reply_delay_max INTEGER DEFAULT 120,
                keyword_filter_enabled INTEGER DEFAULT 1,
                keyword_sets TEXT DEFAULT '[]',
                lead_capture_enabled INTEGER DEFAULT 1,
                max_replies_per_hour INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_discussion_id) REFERENCES channel_discussions(id)
            )
        """)
        
        # 4. 討論組回復記錄表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS discussion_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discussion_id TEXT NOT NULL,
                original_message_id INTEGER NOT NULL,
                reply_message_id INTEGER NOT NULL,
                reply_text TEXT,
                replied_by_phone TEXT,
                replied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_ai_generated INTEGER DEFAULT 0,
                template_id INTEGER,
                status TEXT DEFAULT 'sent',
                error_message TEXT
            )
        """)
        
        # Create indexes
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_channel_discussions_channel 
            ON channel_discussions(channel_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_channel_discussions_discussion 
            ON channel_discussions(discussion_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discussion_messages_discussion 
            ON discussion_messages(discussion_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discussion_messages_user 
            ON discussion_messages(user_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discussion_messages_matched 
            ON discussion_messages(is_matched, is_processed)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discussion_messages_created 
            ON discussion_messages(created_at DESC)
        """)
        
        await connection.commit()
    
    async def down(self, db) -> None:
        """Rollback migration (downgrade)"""
        connection = db._connection
        
        # Drop indexes
        await connection.execute("DROP INDEX IF EXISTS idx_channel_discussions_channel")
        await connection.execute("DROP INDEX IF EXISTS idx_channel_discussions_discussion")
        await connection.execute("DROP INDEX IF EXISTS idx_discussion_messages_discussion")
        await connection.execute("DROP INDEX IF EXISTS idx_discussion_messages_user")
        await connection.execute("DROP INDEX IF EXISTS idx_discussion_messages_matched")
        await connection.execute("DROP INDEX IF EXISTS idx_discussion_messages_created")
        
        # Drop tables
        await connection.execute("DROP TABLE IF EXISTS discussion_replies")
        await connection.execute("DROP TABLE IF EXISTS discussion_monitor_config")
        await connection.execute("DROP TABLE IF EXISTS discussion_messages")
        await connection.execute("DROP TABLE IF EXISTS channel_discussions")
        
        await connection.commit()

"""
Migration 0018: 創建 user_profiles 表
"""

from .migration_base import Migration


class Migration0018(Migration):
    """創建 user_profiles 表"""
    
    version = 18
    description = "創建 user_profiles 表"
    
    async def up(self, connection):
        """執行遷移"""
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                bio TEXT,
                profile_photo TEXT,
                interest_tags TEXT,
                conversation_history TEXT,
                lead_score INTEGER DEFAULT 0,
                lead_stage TEXT DEFAULT 'new',
                source_group TEXT,
                first_contact_date TEXT,
                last_contact_date TEXT,
                total_messages INTEGER DEFAULT 0,
                sentiment_score REAL DEFAULT 0.0,
                conversion_probability REAL DEFAULT 0.0,
                notes TEXT,
                custom_fields TEXT,
                auto_follow_up_enabled INTEGER DEFAULT 1,
                preferred_contact_time TEXT,
                engagement_score REAL DEFAULT 0.0,
                last_engagement_date TEXT,
                follow_up_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """)
        
        # 創建索引
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_profiles_lead_stage ON user_profiles(lead_stage)
        """)
        await connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_profiles_lead_score ON user_profiles(lead_score)
        """)
    
    async def down(self, connection):
        """回滾遷移"""
        await connection.execute("DROP TABLE IF EXISTS user_profiles")

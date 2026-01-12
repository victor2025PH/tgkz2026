"""
Migration 0004: Add Vector Memory and Enhanced CRM Tables
添加向量記憶表和增強的用戶CRM功能
"""
from migrations.migration_base import Migration


class Migration0004_AddVectorMemoryAndCRM(Migration):
    """Add vector memory and enhanced CRM tables migration"""
    
    def __init__(self):
        super().__init__(
            version=4,
            description="Add Vector Memory and Enhanced CRM Tables"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        connection = db._connection
        # 1. 向量記憶表 - 用於 RAG 和語義搜索
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS vector_memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding BLOB,
                memory_type TEXT DEFAULT 'conversation',
                source TEXT,
                importance REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1
            )
        """)
        
        # 2. 用戶 CRM 詳細表 - 擴展用戶資料
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS user_crm (
                user_id TEXT PRIMARY KEY,
                company TEXT,
                industry TEXT,
                job_title TEXT,
                phone TEXT,
                email TEXT,
                website TEXT,
                location TEXT,
                timezone TEXT,
                language TEXT DEFAULT 'zh-TW',
                budget_range TEXT,
                decision_maker INTEGER DEFAULT 0,
                referral_source TEXT,
                competitor_mentions TEXT,
                pain_points TEXT,
                goals TEXT,
                custom_fields TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. 用戶互動記錄表 - 詳細記錄每次互動
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS user_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                interaction_type TEXT NOT NULL,
                direction TEXT DEFAULT 'inbound',
                content TEXT,
                sentiment REAL DEFAULT 0.5,
                intent TEXT,
                keywords TEXT DEFAULT '[]',
                account_phone TEXT,
                platform TEXT DEFAULT 'telegram',
                message_id TEXT,
                response_time_ms INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 4. 自動跟進任務表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS follow_up_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                scheduled_at DATETIME NOT NULL,
                message_template TEXT,
                attempt_number INTEGER DEFAULT 1,
                max_attempts INTEGER DEFAULT 3,
                status TEXT DEFAULT 'pending',
                executed_at DATETIME,
                result TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 5. 用戶標籤表 - 靈活的標籤系統
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS user_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                tag_type TEXT DEFAULT 'custom',
                auto_assigned INTEGER DEFAULT 0,
                confidence REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, tag)
            )
        """)
        
        # 6. 系統標籤定義表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS tag_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tag TEXT NOT NULL UNIQUE,
                tag_type TEXT DEFAULT 'custom',
                color TEXT DEFAULT 'blue',
                description TEXT,
                auto_rules TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 7. 對話摘要表 - 定期生成的對話摘要
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS conversation_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                key_points TEXT DEFAULT '[]',
                action_items TEXT DEFAULT '[]',
                sentiment_trend REAL DEFAULT 0.5,
                period_start DATETIME,
                period_end DATETIME,
                message_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 8. RAG 文檔嵌入表
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS document_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER,
                chunk_id INTEGER,
                embedding BLOB,
                embedding_model TEXT DEFAULT 'local',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
                FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE
            )
        """)
        
        # 添加新字段到 user_profiles
        columns_to_add = [
            ("auto_follow_up_enabled", "INTEGER DEFAULT 1"),
            ("preferred_contact_time", "TEXT"),
            ("communication_style", "TEXT"),
            ("last_purchase_at", "DATETIME"),
            ("total_purchases", "INTEGER DEFAULT 0"),
            ("average_response_time", "INTEGER DEFAULT 0"),
            ("engagement_score", "REAL DEFAULT 0.5"),
            ("lead_score", "INTEGER DEFAULT 0"),
            ("notes", "TEXT"),
        ]
        
        for column_name, column_type in columns_to_add:
            try:
                await connection.execute(f"""
                    ALTER TABLE user_profiles ADD COLUMN {column_name} {column_type}
                """)
            except Exception:
                pass  # Column might already exist
        
        # 創建索引
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_vector_memories_user ON vector_memories(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_vector_memories_type ON vector_memories(memory_type)",
            "CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_interactions_time ON user_interactions(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_status ON follow_up_tasks(status)",
            "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_scheduled ON follow_up_tasks(scheduled_at)",
            "CREATE INDEX IF NOT EXISTS idx_user_tags_user ON user_tags(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_tags_tag ON user_tags(tag)",
            "CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user ON conversation_summaries(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_document_embeddings_doc ON document_embeddings(document_id)",
        ]
        
        for index_sql in indexes:
            try:
                await connection.execute(index_sql)
            except Exception:
                pass
        
        # 插入預設標籤定義
        default_tags = [
            ('VIP', 'system', 'gold', '高價值客戶', '{"interest_level": 5, "converted": true}'),
            ('高興趣', 'auto', 'green', '表現出強烈興趣', '{"interest_level": {">=": 4}}'),
            ('需跟進', 'auto', 'orange', '需要人工跟進', '{"funnel_stage": "follow_up"}'),
            ('已流失', 'auto', 'red', '已標記流失', '{"funnel_stage": "churned"}'),
            ('新用戶', 'auto', 'blue', '新捕獲的用戶', '{"funnel_stage": "new"}'),
            ('活躍', 'auto', 'emerald', '近7天有互動', '{"last_interaction_days": {"<=": 7}}'),
            ('沉默', 'auto', 'gray', '超過14天無互動', '{"last_interaction_days": {">": 14}}'),
        ]
        
        for tag, tag_type, color, description, auto_rules in default_tags:
            try:
                await connection.execute("""
                    INSERT OR IGNORE INTO tag_definitions (tag, tag_type, color, description, auto_rules)
                    VALUES (?, ?, ?, ?, ?)
                """, (tag, tag_type, color, description, auto_rules))
            except Exception:
                pass
        
        await connection.commit()
    
    async def down(self, db) -> None:
        """Revert migration (downgrade)"""
        connection = db._connection
        tables_to_drop = [
            "vector_memories",
            "user_crm",
            "user_interactions",
            "follow_up_tasks",
            "user_tags",
            "tag_definitions",
            "conversation_summaries",
            "document_embeddings",
        ]
        
        for table in tables_to_drop:
            await connection.execute(f"DROP TABLE IF EXISTS {table}")
        
        await connection.commit()

"""
🔧 P2 優化: 創建對話話題追蹤表
用於追蹤與每個用戶已討論過的話題，避免 AI 重複相同內容
"""

from .migration_base import Migration


class Migration0015(Migration):
    """創建 conversation_topics 話題追蹤表"""
    
    version = 15
    description = "創建 conversation_topics 話題追蹤表"
    
    async def up(self, db):
        """執行遷移"""
        
        # 創建話題追蹤表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversation_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                topic_name TEXT NOT NULL,
                covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                depth_level INTEGER DEFAULT 1,
                key_points TEXT,
                last_user_question TEXT,
                last_ai_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 創建索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_topics_user 
            ON conversation_topics(user_id)
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_topics_topic 
            ON conversation_topics(topic_name)
        """)
        
        # 創建唯一約束（每個用戶每個話題只有一條記錄）
        await db.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_topics_user_topic 
            ON conversation_topics(user_id, topic_name)
        """)
        
        print("[Migration 0015] ✓ 創建 conversation_topics 表成功")
    
    async def down(self, db):
        """回滾遷移"""
        await db.execute("DROP TABLE IF EXISTS conversation_topics")
        print("[Migration 0015] ✓ 刪除 conversation_topics 表成功")


# 導出遷移實例
migration = Migration0015()

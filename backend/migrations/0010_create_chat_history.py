"""
Migration 0010: 創建 chat_history 表
修復缺失的聊天記錄主表，該表被 FTS 全文搜索觸發器引用
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from migrations.migration_base import Migration


class Migration0010_CreateChatHistory(Migration):
    """創建 chat_history 表"""
    
    def __init__(self):
        super().__init__(
            version=10,
            description="創建 chat_history 表以支持聊天記錄和 AI 對話功能"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        print(f"[Migration 0008] Creating chat_history table...", file=sys.stderr)
        
        # 創建 chat_history 表
        await db._connection.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                account_phone TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                content TEXT NOT NULL,
                message_id TEXT,
                
                -- 消息元數據
                is_read INTEGER DEFAULT 0,
                is_summarized INTEGER DEFAULT 0,
                summary_id INTEGER,
                
                -- 情感和意圖分析
                sentiment TEXT,
                intent TEXT,
                confidence REAL,
                
                -- 時間戳
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- 來源信息
                source_chat_id TEXT,
                source_chat_title TEXT,
                
                -- 關聯
                session_id TEXT,
                parent_message_id INTEGER,
                
                FOREIGN KEY (parent_message_id) REFERENCES chat_history(id)
            )
        ''')
        print(f"[Migration 0010] Created chat_history table", file=sys.stderr)
        
        # 創建索引
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_user_id 
            ON chat_history(user_id)
        ''')
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp 
            ON chat_history(timestamp)
        ''')
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_account_phone 
            ON chat_history(account_phone)
        ''')
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_session 
            ON chat_history(session_id)
        ''')
        print(f"[Migration 0008] Created indexes for chat_history", file=sys.stderr)
        
        await db._connection.commit()
        print(f"[Migration 0010] Migration completed successfully", file=sys.stderr)
    
    async def down(self, db) -> None:
        """Rollback migration (downgrade)"""
        print(f"[Migration 0010] Dropping chat_history table...", file=sys.stderr)
        
        # 刪除索引
        await db._connection.execute('DROP INDEX IF EXISTS idx_chat_history_user_id')
        await db._connection.execute('DROP INDEX IF EXISTS idx_chat_history_timestamp')
        await db._connection.execute('DROP INDEX IF EXISTS idx_chat_history_account_phone')
        await db._connection.execute('DROP INDEX IF EXISTS idx_chat_history_session')
        
        # 刪除表
        await db._connection.execute('DROP TABLE IF EXISTS chat_history')
        
        await db._connection.commit()
        print(f"[Migration 0008] Rollback completed", file=sys.stderr)


# 註冊遷移
migration = Migration0010_CreateChatHistory()

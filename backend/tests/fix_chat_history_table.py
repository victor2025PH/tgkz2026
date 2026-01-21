"""
修復缺失的 chat_history 表
直接在 tgmatrix.db 中創建表（因為 FTS 表已經在那裡）
"""

import sqlite3
import sys
from pathlib import Path

# tgmatrix.db 路徑（FTS 表所在的數據庫）
ACCOUNTS_DB_PATH = Path(__file__).parent.parent / "data" / "tgmatrix.db"

def create_chat_history_table():
    """創建 chat_history 表"""
    print(f"連接到數據庫: {ACCOUNTS_DB_PATH}")
    
    conn = sqlite3.connect(ACCOUNTS_DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 檢查表是否已存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history'")
        if cursor.fetchone():
            print("✅ chat_history 表已存在，無需創建")
            
            # 顯示表結構
            cursor.execute("PRAGMA table_info(chat_history)")
            columns = cursor.fetchall()
            print("\n現有表結構:")
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
            return
        
        print("📝 創建 chat_history 表...")
        
        # 創建 chat_history 表
        cursor.execute('''
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
        print("✅ chat_history 表創建成功")
        
        # 創建索引
        print("📝 創建索引...")
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_user_id 
            ON chat_history(user_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp 
            ON chat_history(timestamp)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_account_phone 
            ON chat_history(account_phone)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_chat_history_session 
            ON chat_history(session_id)
        ''')
        print("✅ 索引創建成功")
        
        conn.commit()
        
        # 驗證創建
        cursor.execute("PRAGMA table_info(chat_history)")
        columns = cursor.fetchall()
        print(f"\n✅ 表結構驗證（共 {len(columns)} 個欄位）:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # 檢查 FTS 表是否能正常工作
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history_fts'")
        if cursor.fetchone():
            print("\n✅ chat_history_fts 全文搜索表已存在")
            # 嘗試重建 FTS 觸發器
            print("📝 重新創建 FTS 觸發器...")
            
            # 刪除舊觸發器
            cursor.execute("DROP TRIGGER IF EXISTS chat_history_fts_insert")
            cursor.execute("DROP TRIGGER IF EXISTS chat_history_fts_update")
            cursor.execute("DROP TRIGGER IF EXISTS chat_history_fts_delete")
            
            # 創建新觸發器
            cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_insert AFTER INSERT ON chat_history
                BEGIN
                    INSERT INTO chat_history_fts(rowid, content, user_id, timestamp, role, account_phone)
                    VALUES (new.id, new.content, new.user_id, new.timestamp, new.role, new.account_phone);
                END
            ''')
            
            cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_update AFTER UPDATE ON chat_history
                BEGIN
                    UPDATE chat_history_fts 
                    SET content = new.content,
                        user_id = new.user_id,
                        timestamp = new.timestamp,
                        role = new.role,
                        account_phone = new.account_phone
                    WHERE rowid = old.id;
                END
            ''')
            
            cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS chat_history_fts_delete AFTER DELETE ON chat_history
                BEGIN
                    DELETE FROM chat_history_fts WHERE rowid = old.id;
                END
            ''')
            
            conn.commit()
            print("✅ FTS 觸發器創建成功")
        
        print("\n🎉 chat_history 表修復完成！")
        
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    create_chat_history_table()

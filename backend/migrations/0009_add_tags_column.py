"""
Migration 0009: Add tags column to accounts table
"""
import sqlite3
from pathlib import Path

def up(db_path: str = None):
    """Add tags column to accounts table"""
    # 使用 tgmatrix.db
    accounts_db = Path(__file__).parent.parent / "data" / "tgmatrix.db"
    
    if not accounts_db.exists():
        print("[Migration 0009] tgmatrix.db not found, skipping")
        return
    
    conn = sqlite3.connect(str(accounts_db))
    cursor = conn.cursor()
    
    try:
        # 檢查 accounts 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if not cursor.fetchone():
            print("[Migration 0009] accounts table not found, skipping")
            conn.close()
            return
        
        # 檢查列是否已存在
        cursor.execute("PRAGMA table_info(accounts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'tags' not in columns:
            cursor.execute("ALTER TABLE accounts ADD COLUMN tags TEXT")
            print("[Migration 0009] Added tags column")
        else:
            print("[Migration 0009] tags column already exists")
        
        conn.commit()
    except Exception as e:
        print(f"[Migration 0009] Error: {e}")
    finally:
        conn.close()

def down(db_path: str = None):
    """Remove tags column (SQLite doesn't support DROP COLUMN easily)"""
    pass

if __name__ == "__main__":
    up()

"""
Migration 0009: Add tags column to accounts table

注意：本檔案未定義 Migration 子類，不會被 migration_manager.py 的
_load_migrations() 自動載入執行，僅供手動執行一次（歷史遺留維護腳本）。
"""
import sys
import sqlite3
from pathlib import Path

# 🔧 路徑改由 config.py 統一解析（不再硬編碼 backend/data 相對路徑）
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


def _resolve_accounts_db() -> Path:
    try:
        from config import DATABASE_PATH
        return Path(DATABASE_PATH)
    except ImportError:
        # 退回原硬編碼相對路徑（config 無法導入時的後備）
        return Path(__file__).parent.parent / "data" / "tgmatrix.db"


def up(db_path: str = None):
    """Add tags column to accounts table"""
    # 使用 tgmatrix.db（維持原簽名/呼叫方式，db_path 參數維持原樣未被使用）
    accounts_db = _resolve_accounts_db()
    
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

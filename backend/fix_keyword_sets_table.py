"""修復 keyword_sets 表結構"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "tgai_server.db"

def fix_table():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # 檢查當前列
    cursor.execute('PRAGMA table_info(keyword_sets)')
    existing_columns = [c[1] for c in cursor.fetchall()]
    print(f"現有列: {existing_columns}")
    
    # 添加缺失的列
    if 'keywords' not in existing_columns:
        try:
            cursor.execute("ALTER TABLE keyword_sets ADD COLUMN keywords TEXT DEFAULT '[]'")
            print('✅ 已添加 keywords 列')
        except Exception as e:
            print(f'❌ 添加 keywords 列失敗: {e}')
    else:
        print('ℹ️ keywords 列已存在')
    
    if 'is_active' not in existing_columns:
        try:
            cursor.execute('ALTER TABLE keyword_sets ADD COLUMN is_active INTEGER DEFAULT 1')
            print('✅ 已添加 is_active 列')
        except Exception as e:
            print(f'❌ 添加 is_active 列失敗: {e}')
    else:
        print('ℹ️ is_active 列已存在')
    
    conn.commit()
    
    # 驗證結果
    cursor.execute('PRAGMA table_info(keyword_sets)')
    print(f"更新後的列: {[c[1] for c in cursor.fetchall()]}")
    
    conn.close()

if __name__ == '__main__':
    fix_table()

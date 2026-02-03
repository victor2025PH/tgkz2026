#!/usr/bin/env python3
"""
添加 owner_user_id 列到所有需要多租戶隔離的表
"""
import sqlite3
import os
from pathlib import Path

# 數據目錄
DATA_DIR = Path(os.environ.get('DATA_DIR', '/app/data'))

# 需要添加 owner_user_id 的表
TABLES_TO_MIGRATE = [
    'accounts',
    'keyword_sets', 
    'monitored_groups',
    'leads',
    'trigger_rules',
    'message_templates',
    'chat_templates',
    'campaigns',
    'logs'
]

def migrate_database(db_path: str):
    """遷移單個數據庫"""
    print(f"\n=== Migrating {db_path} ===")
    
    if not os.path.exists(db_path):
        print(f"  Database not found: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 獲取所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = [row[0] for row in cursor.fetchall()]
    print(f"  Existing tables: {existing_tables}")
    
    for table in TABLES_TO_MIGRATE:
        if table not in existing_tables:
            continue
            
        # 檢查是否已有 owner_user_id 列
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'owner_user_id' in columns:
            print(f"  ✓ {table} already has owner_user_id")
            continue
        
        # 添加 owner_user_id 列
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN owner_user_id TEXT DEFAULT 'local_user'")
            print(f"  + Added owner_user_id to {table}")
        except Exception as e:
            print(f"  ! Error adding owner_user_id to {table}: {e}")
    
    # 創建索引以加速查詢
    for table in TABLES_TO_MIGRATE:
        if table not in existing_tables:
            continue
            
        index_name = f"idx_{table}_owner_user_id"
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table}(owner_user_id)")
            print(f"  + Created index {index_name}")
        except Exception as e:
            print(f"  ! Error creating index for {table}: {e}")
    
    conn.commit()
    conn.close()
    print(f"  ✓ Migration complete for {db_path}")


def main():
    print("=" * 50)
    print("Multi-Tenant Migration Script")
    print("=" * 50)
    
    # 遷移主數據庫
    databases = [
        DATA_DIR / 'tgmatrix.db',
        DATA_DIR / 'tgai_server.db',
    ]
    
    for db in databases:
        migrate_database(str(db))
    
    print("\n" + "=" * 50)
    print("Migration Complete!")
    print("=" * 50)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
添加 owner_user_id 列到所有需要多租戶隔離的表

注意：本檔案未定義 Migration 子類，不會被 migration_manager.py 的
_load_migrations() 自動載入執行，是專供 Docker 容器內手動執行一次的維運腳本
（見 docker-compose.yml 的 volume 掛載路徑 ./data:/app/data）。

🔧 DATA_DIR 刻意保留讀取 DATA_DIR 環境變量、預設 /app/data 的寫法，不改為
config.py 解析：本腳本設計上是透過 `docker exec` 進容器直接執行，此時
config.py 依賴的 TG_DATA_DIR 等環境變量未必存在，若改用 config.DATABASE_DIR
可能與容器內實際掛載路徑不一致，風險較高。僅將實際建立連接的部分改為走
core.db_utils（合法連接模塊），不動路徑解析邏輯本身。
"""
import sys
import sqlite3
import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# 數據目錄（Docker 部署慣例路徑，見 .cursorrules「數據庫路徑解析優先級」表）
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
    
    # 🔧 改用合法連接模塊 core.db_utils，取代直接 sqlite3.connect()
    from core.db_utils import create_connection
    conn = create_connection(db_path)
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

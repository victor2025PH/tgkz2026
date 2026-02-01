"""
Migration 0021: Add Tenant Isolation
為所有業務表添加 owner_user_id 字段以支持多用戶數據隔離

Tables affected:
- accounts
- keyword_sets
- monitored_groups
- leads
- campaigns
- message_templates (chat_templates)
- trigger_rules
- extracted_members
- collected_users
- discovered_resources
"""

import sys
from migrations.migration_base import Migration


class AddTenantIsolationMigration(Migration):
    """Add owner_user_id to all business tables for multi-tenant support"""
    
    def __init__(self):
        super().__init__(
            version=21,
            description="Add tenant isolation (owner_user_id) to business tables"
        )
    
    # 需要添加 owner_user_id 的表列表
    TABLES_TO_MIGRATE = [
        'accounts',
        'keyword_sets',
        'monitored_groups',
        'leads',
        'campaigns',
        'message_templates',
        'chat_templates',
        'trigger_rules',
        'extracted_members',
        'collected_users',
        'discovered_resources',
        'knowledge_items',
        'api_credentials',
    ]
    
    async def up(self, db) -> None:
        """Apply migration: Add owner_user_id column to tables"""
        print("[Migration 0021] Starting tenant isolation migration...", file=sys.stderr)
        
        for table_name in self.TABLES_TO_MIGRATE:
            try:
                # 檢查表是否存在
                cursor = await db._connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,)
                )
                if not await cursor.fetchone():
                    print(f"[Migration 0021] Table {table_name} does not exist, skipping", file=sys.stderr)
                    continue
                
                # 檢查 owner_user_id 列是否已存在
                cursor = await db._connection.execute(f"PRAGMA table_info({table_name})")
                columns = [col[1] for col in await cursor.fetchall()]
                
                if 'owner_user_id' in columns:
                    print(f"[Migration 0021] Table {table_name} already has owner_user_id, skipping", file=sys.stderr)
                    continue
                
                # 添加 owner_user_id 列
                # 默認為 'local_user'（Electron 本地模式）或 NULL（SaaS 模式會更新）
                await db._connection.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN owner_user_id TEXT DEFAULT 'local_user'
                """)
                
                print(f"[Migration 0021] Added owner_user_id to {table_name}", file=sys.stderr)
                
            except Exception as e:
                print(f"[Migration 0021] Error migrating {table_name}: {e}", file=sys.stderr)
                # 繼續處理其他表，不中斷整個遷移
        
        # 創建索引以加速按用戶過濾的查詢
        index_tables = ['accounts', 'keyword_sets', 'monitored_groups', 'leads', 
                       'extracted_members', 'discovered_resources']
        
        for table_name in index_tables:
            try:
                cursor = await db._connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,)
                )
                if await cursor.fetchone():
                    index_name = f"idx_{table_name}_owner"
                    await db._connection.execute(f"""
                        CREATE INDEX IF NOT EXISTS {index_name} 
                        ON {table_name}(owner_user_id)
                    """)
                    print(f"[Migration 0021] Created index {index_name}", file=sys.stderr)
            except Exception as e:
                print(f"[Migration 0021] Error creating index for {table_name}: {e}", file=sys.stderr)
        
        await db._connection.commit()
        print("[Migration 0021] Tenant isolation migration completed", file=sys.stderr)
    
    async def down(self, db) -> None:
        """Revert migration: Note - SQLite doesn't support DROP COLUMN easily"""
        print("[Migration 0021] Rolling back tenant isolation...", file=sys.stderr)
        print("[Migration 0021] WARNING: SQLite doesn't support DROP COLUMN directly", file=sys.stderr)
        print("[Migration 0021] The owner_user_id columns will remain but can be ignored", file=sys.stderr)
        
        # 刪除索引
        index_tables = ['accounts', 'keyword_sets', 'monitored_groups', 'leads', 
                       'extracted_members', 'discovered_resources']
        
        for table_name in index_tables:
            try:
                index_name = f"idx_{table_name}_owner"
                await db._connection.execute(f"DROP INDEX IF EXISTS {index_name}")
                print(f"[Migration 0021] Dropped index {index_name}", file=sys.stderr)
            except Exception as e:
                print(f"[Migration 0021] Error dropping index for {table_name}: {e}", file=sys.stderr)
        
        await db._connection.commit()
        print("[Migration 0021] Rollback completed (columns remain for safety)", file=sys.stderr)

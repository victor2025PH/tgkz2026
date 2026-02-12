"""
Migration 0029: Add owner_user_id to unified_contacts

多用户一库方案：客户名单（发送控制台）数据源 unified_contacts 需按用户隔离。
- 添加 owner_user_id 列
- 历史数据回填为 'local_user'（Electron 单机可见；SaaS 多租户下不匹配任何真实用户 ID，等价于隐藏）
- 创建索引便于按 owner 过滤
"""

import sys
from migrations.migration_base import Migration


class AddOwnerToUnifiedContactsMigration(Migration):
    """Add owner_user_id to unified_contacts for tenant isolation"""

    def __init__(self):
        super().__init__(
            version=29,
            description="Add owner_user_id to unified_contacts for multi-tenant isolation"
        )

    async def up(self, db) -> None:
        print("[Migration 0029] Adding owner_user_id to unified_contacts...", file=sys.stderr)
        cursor = await db._connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='unified_contacts'"
        )
        if not await cursor.fetchone():
            print("[Migration 0029] Table unified_contacts does not exist, skipping", file=sys.stderr)
            return

        cursor = await db._connection.execute("PRAGMA table_info(unified_contacts)")
        columns = [col[1] for col in await cursor.fetchall()]
        if "owner_user_id" in columns:
            print("[Migration 0029] unified_contacts already has owner_user_id, skipping", file=sys.stderr)
            return

        await db._connection.execute("""
            ALTER TABLE unified_contacts ADD COLUMN owner_user_id TEXT DEFAULT 'local_user'
        """)
        print("[Migration 0029] Added owner_user_id to unified_contacts", file=sys.stderr)

        # 历史数据：已存在行默认为 DEFAULT 'local_user'，无需额外 UPDATE
        await db._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_unified_contacts_owner_user_id
            ON unified_contacts(owner_user_id)
        """)
        print("[Migration 0029] Created index idx_unified_contacts_owner_user_id", file=sys.stderr)
        await db._connection.commit()
        print("[Migration 0029] Completed", file=sys.stderr)

    async def down(self, db) -> None:
        print("[Migration 0029] Rollback: SQLite does not support DROP COLUMN", file=sys.stderr)
        await db._connection.execute("DROP INDEX IF EXISTS idx_unified_contacts_owner_user_id")
        await db._connection.commit()
        print("[Migration 0029] Dropped index only; owner_user_id column remains", file=sys.stderr)

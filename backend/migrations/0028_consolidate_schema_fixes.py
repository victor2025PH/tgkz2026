"""
Migration 0028: Consolidate Schema Fixes (P6-2 + P7-2)

Moves ad-hoc ALTER TABLE / CREATE TABLE fixes from database.py _migrate_db()
into the formal migration system. This ensures:
1. Schema changes are versioned and tracked
2. No reliance on legacy fallback code
3. Migration status is visible via MigrationManager

P6-2 fixes:
- chat_history: sender_id, sender_name, sender_username, chat_id
- captured_leads: CREATE TABLE
- user_profiles: subscription_tier, max_accounts, max_api_calls, status,
                 funnel_stage, interest_level, last_interaction

P7-2 fixes:
- owner_user_id column for 12 business tables (fallback for Migration 0021)
"""

import sys
from migrations.migration_base import Migration


class ConsolidateSchemaFixesMigration(Migration):
    """Consolidate P6-2 and P7-2 schema fixes into formal migration"""

    def __init__(self):
        super().__init__(
            version=28,
            description="Consolidate P6-2/P7-2 schema fixes (chat_history, captured_leads, user_profiles, owner_user_id)"
        )

    # Tables needing owner_user_id (P7-2 fallback for Migration 0021)
    TENANT_TABLES = [
        'keyword_sets', 'trigger_rules', 'message_templates',
        'chat_templates', 'collected_users', 'extracted_members',
        'monitored_groups', 'accounts', 'leads', 'campaigns',
        'discovered_resources', 'api_credentials',
    ]

    async def _table_exists(self, db, table_name: str) -> bool:
        cursor = await db._connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,)
        )
        return bool(await cursor.fetchone())

    async def _column_exists(self, db, table_name: str, column_name: str) -> bool:
        try:
            cursor = await db._connection.execute(f"PRAGMA table_info({table_name})")
            rows = await cursor.fetchall()
            cols = [r[1] for r in rows]
            return column_name in cols
        except Exception:
            return False

    async def _safe_add_column(self, db, table: str, column: str, col_type: str):
        """Add column if table exists and column doesn't"""
        if not await self._table_exists(db, table):
            print(f"  [0028] Table {table} does not exist, skipping {column}", file=sys.stderr)
            return
        if await self._column_exists(db, table, column):
            return  # Already exists
        try:
            await db._connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            print(f"  [0028] Added {table}.{column}", file=sys.stderr)
        except Exception as e:
            print(f"  [0028] Warning adding {table}.{column}: {e}", file=sys.stderr)

    async def up(self, db) -> None:
        """Apply migration"""
        print("[Migration 0028] Consolidating schema fixes...", file=sys.stderr)

        # ====== P6-2: chat_history columns ======
        print("[Migration 0028] P6-2: chat_history columns...", file=sys.stderr)
        await self._safe_add_column(db, 'chat_history', 'sender_id', 'TEXT')
        await self._safe_add_column(db, 'chat_history', 'sender_name', 'TEXT')
        await self._safe_add_column(db, 'chat_history', 'sender_username', 'TEXT')
        await self._safe_add_column(db, 'chat_history', 'chat_id', 'TEXT')

        # ====== P6-2: captured_leads table ======
        print("[Migration 0028] P6-2: captured_leads table...", file=sys.stderr)
        if not await self._table_exists(db, 'captured_leads'):
            await db._connection.execute("""
                CREATE TABLE IF NOT EXISTS captured_leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_type TEXT DEFAULT 'group_monitor',
                    source_id TEXT,
                    source_name TEXT,
                    user_id TEXT,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    bio TEXT,
                    message_text TEXT,
                    matched_keyword TEXT,
                    matched_keyword_set_id TEXT,
                    intent_score REAL DEFAULT 0,
                    status TEXT DEFAULT 'new',
                    tags TEXT DEFAULT '[]',
                    notes TEXT,
                    owner_user_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("  [0028] Created captured_leads table", file=sys.stderr)

        # ====== P6-2: user_profiles columns ======
        print("[Migration 0028] P6-2: user_profiles columns...", file=sys.stderr)
        await self._safe_add_column(db, 'user_profiles', 'subscription_tier', "TEXT DEFAULT 'free'")
        await self._safe_add_column(db, 'user_profiles', 'max_accounts', 'INTEGER DEFAULT 1')
        await self._safe_add_column(db, 'user_profiles', 'max_api_calls', 'INTEGER DEFAULT 100')
        await self._safe_add_column(db, 'user_profiles', 'status', "TEXT DEFAULT 'active'")
        await self._safe_add_column(db, 'user_profiles', 'funnel_stage', "TEXT DEFAULT 'new'")
        await self._safe_add_column(db, 'user_profiles', 'interest_level', "TEXT DEFAULT 'unknown'")
        await self._safe_add_column(db, 'user_profiles', 'last_interaction', 'TIMESTAMP')

        # ====== P7-2: owner_user_id for tenant tables ======
        print("[Migration 0028] P7-2: owner_user_id columns...", file=sys.stderr)
        for table in self.TENANT_TABLES:
            await self._safe_add_column(db, table, 'owner_user_id', 'TEXT')

        await db._connection.commit()
        print("[Migration 0028] Schema consolidation complete", file=sys.stderr)

    async def down(self, db) -> None:
        """Revert migration - SQLite doesn't support DROP COLUMN easily"""
        print("[Migration 0028] Note: SQLite does not support DROP COLUMN. "
              "Columns added by this migration will remain.", file=sys.stderr)
        # No-op: these columns are additive and safe to leave in place

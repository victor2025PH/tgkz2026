"""
Migration 0027: Enhance monitored_groups table
- Add resource_id FK to link with discovered_resources
- Add UNIQUE index on telegram_id to prevent duplicates
- Add index on link for fast lookups
- Backfill resource_id from discovered_resources via telegram_id matching
- Consolidate phone/account_phone fields
"""
from migrations.migration_base import Migration


class Migration0027_EnhanceMonitoredGroups(Migration):
    """Enhance monitored_groups with FK, unique constraints, and indexes"""

    def __init__(self):
        super().__init__(
            version=27,
            description="Enhance monitored_groups: add resource_id FK, telegram_id UNIQUE index, consolidate phone fields"
        )

    async def up(self, db) -> None:
        """Apply migration"""
        connection = db._connection

        # 1. Add resource_id column (nullable, references discovered_resources)
        try:
            await connection.execute(
                "ALTER TABLE monitored_groups ADD COLUMN resource_id INTEGER"
            )
        except Exception:
            pass  # Column may already exist

        # 2. Add sync_status column for PEER_ID_INVALID tracking
        try:
            await connection.execute(
                "ALTER TABLE monitored_groups ADD COLUMN sync_status TEXT DEFAULT 'synced'"
            )
        except Exception:
            pass

        # 3. Create unique index on telegram_id (ignore nulls/empty)
        try:
            await connection.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_mg_telegram_id_unique
                ON monitored_groups(telegram_id)
                WHERE telegram_id IS NOT NULL AND telegram_id != ''
            """)
        except Exception as e:
            # If duplicates exist, clean them up first
            print(f"[Migration 0027] UNIQUE index creation issue: {e}, attempting cleanup...")
            # Keep only the most recent entry per telegram_id
            try:
                await connection.execute("""
                    DELETE FROM monitored_groups WHERE id NOT IN (
                        SELECT MAX(id) FROM monitored_groups
                        WHERE telegram_id IS NOT NULL AND telegram_id != ''
                        GROUP BY telegram_id
                    ) AND telegram_id IS NOT NULL AND telegram_id != ''
                """)
                await connection.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_mg_telegram_id_unique
                    ON monitored_groups(telegram_id)
                    WHERE telegram_id IS NOT NULL AND telegram_id != ''
                """)
            except Exception as e2:
                print(f"[Migration 0027] Could not create unique index after cleanup: {e2}")

        # 4. Create index on link for fast lookups
        try:
            await connection.execute("""
                CREATE INDEX IF NOT EXISTS idx_mg_link
                ON monitored_groups(link)
            """)
        except Exception:
            pass

        # 5. Create index on resource_id
        try:
            await connection.execute("""
                CREATE INDEX IF NOT EXISTS idx_mg_resource_id
                ON monitored_groups(resource_id)
            """)
        except Exception:
            pass

        # 6. Backfill resource_id from discovered_resources via telegram_id
        try:
            await connection.execute("""
                UPDATE monitored_groups
                SET resource_id = (
                    SELECT dr.id FROM discovered_resources dr
                    WHERE dr.telegram_id = monitored_groups.telegram_id
                    LIMIT 1
                )
                WHERE resource_id IS NULL
                  AND telegram_id IS NOT NULL
                  AND telegram_id != ''
            """)
        except Exception as e:
            print(f"[Migration 0027] Backfill resource_id failed: {e}")

        # 7. Consolidate phone/account_phone: copy account_phone -> phone where phone is null
        try:
            await connection.execute("""
                UPDATE monitored_groups
                SET phone = account_phone
                WHERE phone IS NULL AND account_phone IS NOT NULL AND account_phone != ''
            """)
        except Exception:
            pass

        await connection.commit()

    async def down(self, db) -> None:
        """Rollback migration"""
        connection = db._connection
        try:
            await connection.execute("DROP INDEX IF EXISTS idx_mg_telegram_id_unique")
            await connection.execute("DROP INDEX IF EXISTS idx_mg_link")
            await connection.execute("DROP INDEX IF EXISTS idx_mg_resource_id")
        except Exception:
            pass
        await connection.commit()

"""
Migration 0002: Add Device Fingerprint and Proxy Management Fields
Adds device fingerprint and proxy management fields to accounts table for anti-ban protection.
"""
import sys
from migrations.migration_base import Migration


class Migration0002_AddDeviceFingerprint(Migration):
    """Add device fingerprint and proxy management fields to accounts table"""
    
    def __init__(self):
        super().__init__(
            version=2,
            description="Add device fingerprint and proxy management fields to accounts table"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade) - Add new columns to accounts table"""
        try:
            # Check if accounts table exists in this database
            # Note: accounts table is in tgmatrix.db, not tgai_server.db
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
            )
            if not await cursor.fetchone():
                print("Migration 0002: accounts table not in this database (it's in tgmatrix.db), skipping", file=sys.stderr)
                return
            
            # Check if columns already exist (for idempotency)
            cursor = await db._connection.execute("PRAGMA table_info(accounts)")
            columns = [row[1] for row in await cursor.fetchall()]
            
            # Add device fingerprint fields
            if 'device_model' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN device_model TEXT")
                print("Added device_model column", file=sys.stderr)
            
            if 'system_version' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN system_version TEXT")
                print("Added system_version column", file=sys.stderr)
            
            if 'app_version' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN app_version TEXT")
                print("Added app_version column", file=sys.stderr)
            
            if 'lang_code' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN lang_code TEXT DEFAULT 'en'")
                print("Added lang_code column", file=sys.stderr)
            
            if 'platform' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN platform TEXT DEFAULT 'android'")
                print("Added platform column", file=sys.stderr)
            
            if 'device_id' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN device_id TEXT")
                print("Added device_id column", file=sys.stderr)
            
            # Add proxy management fields
            if 'proxy_type' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN proxy_type TEXT")
                print("Added proxy_type column", file=sys.stderr)
            
            if 'proxy_country' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN proxy_country TEXT")
                print("Added proxy_country column", file=sys.stderr)
            
            if 'proxy_rotation_enabled' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN proxy_rotation_enabled INTEGER DEFAULT 0")
                print("Added proxy_rotation_enabled column", file=sys.stderr)
            
            await db._connection.commit()
            print("Migration 0002 completed successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error applying migration 0002: {e}", file=sys.stderr)
            raise
    
    async def down(self, db) -> None:
        """Revert migration (downgrade) - Remove added columns"""
        # Note: SQLite does not support DROP COLUMN directly
        # This would require recreating the table, which is complex
        # For now, we'll just log a warning
        print("Warning: SQLite does not support DROP COLUMN. Migration 0002 cannot be fully reverted.", file=sys.stderr)
        print("To revert, you would need to manually recreate the accounts table.", file=sys.stderr)


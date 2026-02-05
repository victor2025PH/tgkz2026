"""
Migration 0022: Add Fingerprint Tracking Fields
Adds fingerprint hash, version and creation time for better fingerprint persistence and tracking.
This ensures device fingerprints remain consistent and can be validated.
"""
import sys
from migrations.migration_base import Migration


class Migration0022_AddFingerprintTracking(Migration):
    """Add fingerprint tracking fields to accounts table"""
    
    def __init__(self):
        super().__init__(
            version=22,
            description="Add fingerprint tracking fields (hash, version, created_at) to accounts table"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade) - Add fingerprint tracking columns"""
        try:
            # Check if accounts table exists in this database
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
            )
            if not await cursor.fetchone():
                print("Migration 0022: accounts table not in this database, skipping", file=sys.stderr)
                return
            
            # Check if columns already exist (for idempotency)
            cursor = await db._connection.execute("PRAGMA table_info(accounts)")
            columns = [row[1] for row in await cursor.fetchall()]
            
            # Add fingerprint tracking fields
            if 'fingerprint_hash' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN fingerprint_hash TEXT")
                print("Migration 0022: Added fingerprint_hash column", file=sys.stderr)
            
            if 'fingerprint_version' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN fingerprint_version TEXT")
                print("Migration 0022: Added fingerprint_version column", file=sys.stderr)
            
            if 'fingerprint_created_at' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN fingerprint_created_at TIMESTAMP")
                print("Migration 0022: Added fingerprint_created_at column", file=sys.stderr)
            
            await db._connection.commit()
            print("Migration 0022 completed successfully", file=sys.stderr)
            
        except Exception as e:
            print(f"Error applying migration 0022: {e}", file=sys.stderr)
            raise
    
    async def down(self, db) -> None:
        """Revert migration (downgrade) - Remove added columns"""
        print("Warning: SQLite does not support DROP COLUMN. Migration 0022 cannot be fully reverted.", file=sys.stderr)


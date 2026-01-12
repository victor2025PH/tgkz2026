"""
Migration 0003: Add Warmup Fields
Adds warmup-related fields to accounts table for account warming-up functionality.
"""
import sys
from migrations.migration_base import Migration


class Migration0003_AddWarmupFields(Migration):
    """Add warmup fields to accounts table"""
    
    def __init__(self):
        super().__init__(
            version=3,
            description="Add warmup fields to accounts table"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade) - Add warmup columns to accounts table"""
        try:
            # Check if columns already exist (for idempotency)
            cursor = await db._connection.execute("PRAGMA table_info(accounts)")
            columns = [row[1] for row in await cursor.fetchall()]
            
            # Add warmup fields
            if 'warmup_enabled' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN warmup_enabled INTEGER DEFAULT 0")
                print("Added warmup_enabled column", file=sys.stderr)
            
            if 'warmup_start_date' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN warmup_start_date TIMESTAMP")
                print("Added warmup_start_date column", file=sys.stderr)
            
            if 'warmup_stage' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN warmup_stage INTEGER DEFAULT 0")
                print("Added warmup_stage column", file=sys.stderr)
            
            if 'warmup_days_completed' not in columns:
                await db._connection.execute("ALTER TABLE accounts ADD COLUMN warmup_days_completed INTEGER DEFAULT 0")
                print("Added warmup_days_completed column", file=sys.stderr)
            
            await db._connection.commit()
            print("Migration 0003 completed successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error applying migration 0003: {e}", file=sys.stderr)
            raise
    
    async def down(self, db) -> None:
        """Revert migration (downgrade) - Remove added columns"""
        # Note: SQLite does not support DROP COLUMN directly
        print("Warning: SQLite does not support DROP COLUMN. Migration 0003 cannot be fully reverted.", file=sys.stderr)
        print("To revert, you would need to manually recreate the accounts table.", file=sys.stderr)


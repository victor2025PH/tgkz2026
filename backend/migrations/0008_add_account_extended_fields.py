"""
Migration 0008: Add Extended Account Fields
Adds proxy details, nickname, notes, AI settings, and user info fields to accounts table.
"""
import sys
from migrations.migration_base import Migration


class Migration0008_AddAccountExtendedFields(Migration):
    """Add extended fields to accounts table for enhanced account management"""
    
    def __init__(self):
        super().__init__(
            version=8,
            description="Add extended account fields (proxy details, nickname, notes, AI settings)"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade) - Add new columns to accounts table"""
        # Note: This migration runs on tgai_server.db, but accounts table is in tgmatrix.db
        # We need to connect to the correct database
        import aiosqlite
        from pathlib import Path
        
        try:
            # Determine the accounts database path
            data_dir = Path(db.db_path).parent
            accounts_db_path = data_dir / 'tgmatrix.db'
            
            if not accounts_db_path.exists():
                print(f"Migration 0008: accounts database not found at {accounts_db_path}, skipping", file=sys.stderr)
                return
            
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                # Check if accounts table exists
                cursor = await conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
                )
                if not await cursor.fetchone():
                    print("Migration 0008: accounts table not found, skipping", file=sys.stderr)
                    return
                
                # Get existing columns
                cursor = await conn.execute("PRAGMA table_info(accounts)")
                existing_columns = {row[1] for row in await cursor.fetchall()}
                
                # New columns to add
                new_columns = [
                    ("proxyHost", "TEXT"),
                    ("proxyPort", "INTEGER"),
                    ("proxyUsername", "TEXT"),
                    ("proxyPassword", "TEXT"),
                    ("nickname", "TEXT"),
                    ("notes", "TEXT"),
                    ("aiEnabled", "INTEGER DEFAULT 0"),
                    ("aiModel", "TEXT"),
                    ("aiPersonality", "TEXT"),
                    ("firstName", "TEXT"),
                    ("lastName", "TEXT"),
                    ("username", "TEXT"),
                    ("bio", "TEXT"),
                    ("avatarPath", "TEXT"),
                    ("telegramId", "TEXT"),
                ]
                
                added_count = 0
                for col_name, col_type in new_columns:
                    if col_name not in existing_columns:
                        try:
                            await conn.execute(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}")
                            print(f"Migration 0008: Added {col_name} column", file=sys.stderr)
                            added_count += 1
                        except Exception as col_err:
                            # Column might already exist
                            print(f"Migration 0008: Could not add {col_name}: {col_err}", file=sys.stderr)
                
                await conn.commit()
                print(f"Migration 0008: Completed, added {added_count} new columns", file=sys.stderr)
                
        except Exception as e:
            print(f"Migration 0008: Error - {e}", file=sys.stderr)
            # Don't raise - allow migration to continue
    
    async def down(self, db) -> None:
        """Revert migration (downgrade) - Cannot easily remove columns in SQLite"""
        print("Migration 0008: SQLite does not support DROP COLUMN easily. Skipping downgrade.", file=sys.stderr)

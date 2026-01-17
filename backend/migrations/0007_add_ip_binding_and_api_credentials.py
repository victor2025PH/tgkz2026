"""
Migration 0007: Add IP Binding and API Credentials Fields
Adds fields for IP stickiness management, API credential tracking, and enhanced account management.
"""
import sys
from migrations.migration_base import Migration


class Migration0007_AddIPBindingAndAPICredentials(Migration):
    """Add IP binding and API credentials fields to accounts table, create api_credential_logs table"""
    
    def __init__(self):
        super().__init__(
            version=7,
            description="Add IP binding, API credentials, and device fingerprint management fields"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        try:
            # Check if accounts table exists in this database
            # Note: accounts table is in tgmatrix.db, not tgai_server.db
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
            )
            if not await cursor.fetchone():
                print("Migration 0007: accounts table not in this database (it's in tgmatrix.db), skipping account columns", file=sys.stderr)
                # Only create api_credential_logs table (which belongs to tgai_server.db)
                await self._create_api_credential_logs_table(db)
                return
            
            # Check existing columns in accounts table
            cursor = await db._connection.execute("PRAGMA table_info(accounts)")
            columns = [row[1] for row in await cursor.fetchall()]
            
            # ============ IP Binding Fields ============
            if 'ip_binding_id' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ip_binding_id TEXT"
                )
                print("Added ip_binding_id column", file=sys.stderr)
            
            if 'ip_bound_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ip_bound_at TEXT"
                )
                print("Added ip_bound_at column", file=sys.stderr)
            
            if 'ip_last_verified_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ip_last_verified_at TEXT"
                )
                print("Added ip_last_verified_at column", file=sys.stderr)
            
            if 'ip_fail_count' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ip_fail_count INTEGER DEFAULT 0"
                )
                print("Added ip_fail_count column", file=sys.stderr)
            
            if 'ip_is_sticky' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ip_is_sticky INTEGER DEFAULT 1"
                )
                print("Added ip_is_sticky column (default: enabled)", file=sys.stderr)
            
            # ============ API Credentials Fields ============
            if 'api_credentials_type' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN api_credentials_type TEXT DEFAULT 'public'"
                )
                print("Added api_credentials_type column (public/native)", file=sys.stderr)
            
            if 'api_credentials_obtained_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN api_credentials_obtained_at TEXT"
                )
                print("Added api_credentials_obtained_at column", file=sys.stderr)
            
            if 'native_api_id' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN native_api_id TEXT"
                )
                print("Added native_api_id column", file=sys.stderr)
            
            if 'native_api_hash' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN native_api_hash TEXT"
                )
                print("Added native_api_hash column", file=sys.stderr)
            
            # ============ Device Fingerprint Enhanced Fields ============
            if 'fingerprint_generated_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN fingerprint_generated_at TEXT"
                )
                print("Added fingerprint_generated_at column", file=sys.stderr)
            
            if 'fingerprint_hash' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN fingerprint_hash TEXT"
                )
                print("Added fingerprint_hash column", file=sys.stderr)
            
            # ============ AI Configuration Fields ============
            if 'ai_config_type' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ai_config_type TEXT DEFAULT 'global'"
                )
                print("Added ai_config_type column (global/independent)", file=sys.stderr)
            
            if 'ai_config_json' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN ai_config_json TEXT"
                )
                print("Added ai_config_json column", file=sys.stderr)
            
            # ============ Create API Credential Logs Table ============
            await db._connection.execute('''
                CREATE TABLE IF NOT EXISTS api_credential_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER NOT NULL,
                    phone TEXT NOT NULL,
                    action TEXT NOT NULL,
                    api_id TEXT,
                    api_hash TEXT,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    details_json TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts(id)
                )
            ''')
            print("Created api_credential_logs table", file=sys.stderr)
            
            # Create index for faster queries
            await db._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_api_credential_logs_account 
                ON api_credential_logs(account_id)
            ''')
            await db._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_api_credential_logs_created 
                ON api_credential_logs(created_at)
            ''')
            print("Created indexes for api_credential_logs table", file=sys.stderr)
            
            # ============ Create IP Change History Table ============
            await db._connection.execute('''
                CREATE TABLE IF NOT EXISTS ip_change_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER NOT NULL,
                    phone TEXT NOT NULL,
                    old_proxy TEXT,
                    new_proxy TEXT NOT NULL,
                    old_ip TEXT,
                    new_ip TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    changed_at TEXT NOT NULL,
                    details_json TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts(id)
                )
            ''')
            print("Created ip_change_history table", file=sys.stderr)
            
            # Create indexes
            await db._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_ip_change_history_account 
                ON ip_change_history(account_id)
            ''')
            await db._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_ip_change_history_changed 
                ON ip_change_history(changed_at)
            ''')
            print("Created indexes for ip_change_history table", file=sys.stderr)
            
            await db._connection.commit()
            print("Migration 0007 completed successfully", file=sys.stderr)
            
        except Exception as e:
            print(f"Error applying migration 0007: {e}", file=sys.stderr)
            raise
    
    async def _create_api_credential_logs_table(self, db) -> None:
        """Create api_credential_logs and ip_change_history tables"""
        # ============ Create API Credential Logs Table ============
        await db._connection.execute('''
            CREATE TABLE IF NOT EXISTS api_credential_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                phone TEXT NOT NULL,
                action TEXT NOT NULL,
                api_id TEXT,
                api_hash TEXT,
                status TEXT NOT NULL,
                error_message TEXT,
                created_at TEXT NOT NULL,
                details_json TEXT
            )
        ''')
        print("Created api_credential_logs table", file=sys.stderr)
        
        # Create index for faster queries
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_api_credential_logs_account 
            ON api_credential_logs(account_id)
        ''')
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_api_credential_logs_created 
            ON api_credential_logs(created_at)
        ''')
        print("Created indexes for api_credential_logs table", file=sys.stderr)
        
        # ============ Create IP Change History Table ============
        await db._connection.execute('''
            CREATE TABLE IF NOT EXISTS ip_change_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                phone TEXT NOT NULL,
                old_proxy TEXT,
                new_proxy TEXT NOT NULL,
                old_ip TEXT,
                new_ip TEXT NOT NULL,
                reason TEXT NOT NULL,
                changed_at TEXT NOT NULL,
                details_json TEXT
            )
        ''')
        print("Created ip_change_history table", file=sys.stderr)
        
        # Create indexes
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_ip_change_history_account 
            ON ip_change_history(account_id)
        ''')
        await db._connection.execute('''
            CREATE INDEX IF NOT EXISTS idx_ip_change_history_changed 
            ON ip_change_history(changed_at)
        ''')
        print("Created indexes for ip_change_history table", file=sys.stderr)
        
        await db._connection.commit()
        print("Migration 0007 (tables only) completed successfully", file=sys.stderr)
    
    async def down(self, db) -> None:
        """Revert migration (downgrade)"""
        print("Warning: SQLite does not support DROP COLUMN.", file=sys.stderr)
        print("To revert, you would need to manually recreate tables.", file=sys.stderr)
        
        try:
            # Drop the new tables
            await db._connection.execute("DROP TABLE IF EXISTS api_credential_logs")
            await db._connection.execute("DROP TABLE IF EXISTS ip_change_history")
            await db._connection.commit()
            print("Dropped api_credential_logs and ip_change_history tables", file=sys.stderr)
        except Exception as e:
            print(f"Error reverting migration 0007: {e}", file=sys.stderr)
            raise

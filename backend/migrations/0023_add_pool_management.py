"""
Migration 0023: Add Pool Management Fields
为账号表添加连接池管理相关字段

新增字段：
- pool_tier: 连接池层级 (hot/warm/cold)
- pool_state: 连接状态
- pool_priority: 调度优先级
- connection_quality: 连接质量评分
- consecutive_failures: 连续失败次数
- cooldown_until: 冷却结束时间
- last_active_at: 最后活跃时间
- messages_today: 今日消息数
"""
import sys
from migrations.migration_base import Migration


class Migration0023_AddPoolManagement(Migration):
    """Add pool management fields to accounts table"""
    
    def __init__(self):
        super().__init__(
            version=23,
            description="Add pool management fields (tier, state, priority, etc.) to accounts table"
        )
    
    async def up(self, db) -> None:
        """Apply migration"""
        try:
            # Check if accounts table exists
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'"
            )
            if not await cursor.fetchone():
                print("Migration 0023: accounts table not in this database, skipping", file=sys.stderr)
                return
            
            # Check existing columns
            cursor = await db._connection.execute("PRAGMA table_info(accounts)")
            columns = [row[1] for row in await cursor.fetchall()]
            
            # Pool tier (hot/warm/cold)
            if 'pool_tier' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN pool_tier TEXT DEFAULT 'cold'"
                )
                print("Migration 0023: Added pool_tier column", file=sys.stderr)
            
            # Pool state
            if 'pool_state' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN pool_state TEXT DEFAULT 'disconnected'"
                )
                print("Migration 0023: Added pool_state column", file=sys.stderr)
            
            # Priority (0-100)
            if 'pool_priority' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN pool_priority INTEGER DEFAULT 50"
                )
                print("Migration 0023: Added pool_priority column", file=sys.stderr)
            
            # Connection quality (0-1)
            if 'connection_quality' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN connection_quality REAL DEFAULT 1.0"
                )
                print("Migration 0023: Added connection_quality column", file=sys.stderr)
            
            # Consecutive failures
            if 'consecutive_failures' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN consecutive_failures INTEGER DEFAULT 0"
                )
                print("Migration 0023: Added consecutive_failures column", file=sys.stderr)
            
            # Cooldown until timestamp
            if 'cooldown_until' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN cooldown_until REAL DEFAULT 0"
                )
                print("Migration 0023: Added cooldown_until column", file=sys.stderr)
            
            # Cooldown reason
            if 'cooldown_reason' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN cooldown_reason TEXT"
                )
                print("Migration 0023: Added cooldown_reason column", file=sys.stderr)
            
            # Last active timestamp
            if 'last_active_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN last_active_at REAL DEFAULT 0"
                )
                print("Migration 0023: Added last_active_at column", file=sys.stderr)
            
            # Last message timestamp
            if 'last_message_at' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN last_message_at REAL DEFAULT 0"
                )
                print("Migration 0023: Added last_message_at column", file=sys.stderr)
            
            # Messages today
            if 'messages_today' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN messages_today INTEGER DEFAULT 0"
                )
                print("Migration 0023: Added messages_today column", file=sys.stderr)
            
            # Messages today reset date
            if 'messages_today_date' not in columns:
                await db._connection.execute(
                    "ALTER TABLE accounts ADD COLUMN messages_today_date TEXT"
                )
                print("Migration 0023: Added messages_today_date column", file=sys.stderr)
            
            # Create indexes for efficient queries
            try:
                await db._connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_accounts_pool_tier ON accounts(pool_tier)"
                )
                await db._connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_accounts_pool_state ON accounts(pool_state)"
                )
                await db._connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_accounts_priority ON accounts(pool_priority DESC)"
                )
                await db._connection.execute(
                    "CREATE INDEX IF NOT EXISTS idx_accounts_last_active ON accounts(last_active_at DESC)"
                )
                print("Migration 0023: Created indexes", file=sys.stderr)
            except Exception as idx_e:
                print(f"Migration 0023: Index creation note: {idx_e}", file=sys.stderr)
            
            await db._connection.commit()
            print("Migration 0023 completed successfully", file=sys.stderr)
            
        except Exception as e:
            print(f"Error applying migration 0023: {e}", file=sys.stderr)
            raise
    
    async def down(self, db) -> None:
        """Revert migration"""
        print("Warning: SQLite does not support DROP COLUMN. Migration 0023 cannot be fully reverted.", file=sys.stderr)


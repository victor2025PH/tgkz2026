"""
Database Migration Manager
Handles migration execution, version tracking, and rollback
"""
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import importlib.util
import sys

from migrations.migration_base import Migration
from database import Database


class MigrationManager:
    """Manages database migrations"""
    
    def __init__(self, database: Database, migrations_dir: Path):
        """
        Initialize migration manager
        
        Args:
            database: Database instance
            migrations_dir: Directory containing migration files
        """
        self.database = database
        self.migrations_dir = Path(migrations_dir)
        self.migrations_dir.mkdir(parents=True, exist_ok=True)
        self.migrations: List[Migration] = []
    
    async def initialize(self):
        """Initialize migration system (create version table if needed)"""
        await self._ensure_version_table()
        await self._load_migrations()
    
    async def _ensure_version_table(self):
        """Ensure the schema_version table exists"""
        await self.database._connection.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await self.database._connection.commit()
    
    async def _load_migrations(self):
        """Load all migration files from migrations directory"""
        self.migrations = []
        
        if not self.migrations_dir.exists():
            return
        
        # Find all Python files in migrations directory (except __init__.py and base files)
        migration_files = sorted([
            f for f in self.migrations_dir.glob("*.py")
            if f.name not in ['__init__.py', 'migration_base.py', 'migration_manager.py']
        ])
        
        for migration_file in migration_files:
            try:
                # Load migration module
                spec = importlib.util.spec_from_file_location(
                    f"migration_{migration_file.stem}",
                    migration_file
                )
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find Migration class in module
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and 
                            issubclass(attr, Migration) and 
                            attr != Migration):
                            migration = attr()
                            self.migrations.append(migration)
                            break
            except Exception as e:
                print(f"Error loading migration {migration_file.name}: {e}", file=sys.stderr)
        
        # Sort migrations by version
        self.migrations.sort(key=lambda m: m.version)
    
    async def get_current_version(self) -> int:
        """Get current database schema version"""
        cursor = await self.database._connection.execute("""
            SELECT MAX(version) as max_version FROM schema_version
        """)
        row = await cursor.fetchone()
        return row['max_version'] if row and row['max_version'] is not None else 0
    
    async def get_applied_migrations(self) -> List[Dict[str, Any]]:
        """Get list of applied migrations"""
        cursor = await self.database._connection.execute("""
            SELECT version, description, applied_at
            FROM schema_version
            ORDER BY version ASC
        """)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_pending_migrations(self) -> List[Migration]:
        """Get list of pending migrations"""
        current_version = await self.get_current_version()
        return [m for m in self.migrations if m.version > current_version]
    
    async def migrate(self, target_version: Optional[int] = None) -> bool:
        """
        Apply pending migrations
        
        Args:
            target_version: Target version to migrate to (None = latest)
        
        Returns:
            True if migrations were applied successfully
        """
        try:
            # Create backup before migration (optional, don't fail if unavailable)
            try:
                from backup_manager import get_backup_manager
                backup_manager = get_backup_manager()
                if backup_manager:
                    backup_path = backup_manager.create_backup("pre-migration")
                    print(f"Created backup before migration: {backup_path}", file=sys.stderr)
                else:
                    print("Backup manager not available, skipping backup", file=sys.stderr)
            except Exception as backup_err:
                print(f"Could not create backup before migration: {backup_err}", file=sys.stderr)
                # Continue without backup
            
            pending = await self.get_pending_migrations()
            
            if not pending:
                print("No pending migrations", file=sys.stderr)
                return True
            
            if target_version:
                pending = [m for m in pending if m.version <= target_version]
            
            if not pending:
                print(f"Already at target version {target_version}", file=sys.stderr)
                return True
            
            print(f"Applying {len(pending)} migration(s)...", file=sys.stderr)
            
            for migration in pending:
                print(f"Applying migration {migration.version}: {migration.description}", file=sys.stderr)
                try:
                    # Apply migration
                    await migration.up(self.database)
                    
                    # Record migration
                    await self.database._connection.execute("""
                        INSERT INTO schema_version (version, description, applied_at)
                        VALUES (?, ?, CURRENT_TIMESTAMP)
                    """, (migration.version, migration.description))
                    await self.database._connection.commit()
                    
                    print(f"Migration {migration.version} applied successfully", file=sys.stderr)
                except Exception as e:
                    print(f"Error applying migration {migration.version}: {e}", file=sys.stderr)
                    # Rollback transaction
                    await self.database._connection.rollback()
                    raise
            
            print("All migrations applied successfully", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Migration failed: {e}", file=sys.stderr)
            print("You can restore from backup if needed", file=sys.stderr)
            return False
    
    async def rollback(self, target_version: int) -> bool:
        """
        Rollback migrations to a specific version
        
        Args:
            target_version: Version to rollback to
        
        Returns:
            True if rollback was successful
        """
        try:
            current_version = await self.get_current_version()
            
            if current_version <= target_version:
                print(f"Already at or below target version {target_version}")
                return True
            
            # Get migrations to rollback (in reverse order)
            migrations_to_rollback = [
                m for m in reversed(self.migrations)
                if target_version < m.version <= current_version
            ]
            
            if not migrations_to_rollback:
                print("No migrations to rollback", file=sys.stderr)
                return True
            
            # Create backup before rollback (if backup_manager is available)
            try:
                from backup_manager import get_backup_manager
                backup_manager = get_backup_manager()
                if backup_manager:
                    backup_path = backup_manager.create_backup("pre-rollback")
                    print(f"Created backup before rollback: {backup_path}", file=sys.stderr)
            except Exception as e:
                print(f"Could not create backup before rollback: {e}", file=sys.stderr)
            
            print(f"Rolling back {len(migrations_to_rollback)} migration(s)...", file=sys.stderr)
            
            for migration in migrations_to_rollback:
                print(f"Rolling back migration {migration.version}: {migration.description}", file=sys.stderr)
                try:
                    # Rollback migration
                    await migration.down(self.database)
                    
                    # Remove migration record
                    await self.database._connection.execute("""
                        DELETE FROM schema_version WHERE version = ?
                    """, (migration.version,))
                    await self.database._connection.commit()
                    
                    print(f"Migration {migration.version} rolled back successfully", file=sys.stderr)
                except Exception as e:
                    print(f"Error rolling back migration {migration.version}: {e}", file=sys.stderr)
                    await self.database._connection.rollback()
                    raise
            
            print("Rollback completed successfully", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Rollback failed: {e}", file=sys.stderr)
            print("You can restore from backup if needed", file=sys.stderr)
            return False
    
    async def status(self) -> Dict[str, Any]:
        """Get migration status"""
        current_version = await self.get_current_version()
        applied = await self.get_applied_migrations()
        pending = await self.get_pending_migrations()
        
        return {
            "current_version": current_version,
            "latest_version": self.migrations[-1].version if self.migrations else 0,
            "applied_count": len(applied),
            "pending_count": len(pending),
            "applied_migrations": applied,
            "pending_migrations": [
                {"version": m.version, "description": m.description}
                for m in pending
            ]
        }


# Global migration manager instance
_migration_manager: Optional[MigrationManager] = None


def init_migration_manager(database: Database, migrations_dir: Optional[Path] = None) -> MigrationManager:
    """Initialize the global migration manager"""
    global _migration_manager
    
    if migrations_dir is None:
        from pathlib import Path
        migrations_dir = Path(__file__).parent
    
    _migration_manager = MigrationManager(database, migrations_dir)
    return _migration_manager


def get_migration_manager() -> Optional[MigrationManager]:
    """Get the global migration manager instance"""
    return _migration_manager


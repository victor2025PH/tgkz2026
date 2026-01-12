"""
Migration 0001: Initial Schema
This migration represents the initial database schema.
It's a placeholder - the actual schema is created by Database.initialize()
"""
from migrations.migration_base import Migration


class Migration0001_InitialSchema(Migration):
    """Initial database schema migration"""
    
    def __init__(self):
        super().__init__(
            version=1,
            description="Initial database schema"
        )
    
    async def up(self, db) -> None:
        """
        Apply migration (upgrade)
        Note: The actual schema is created by Database.initialize()
        This migration just records that version 1 is applied.
        """
        # Schema is already created by Database.initialize()
        # This migration just marks version 1 as applied
        pass
    
    async def down(self, db) -> None:
        """
        Revert migration (downgrade)
        This would drop all tables - use with caution!
        """
        # Drop all tables in reverse order of dependencies
        tables = [
            'alerts',
            'message_queue',
            'interactions',
            'leads',
            'do_not_contact',
            'campaigns',
            'message_templates',
            'group_keyword_sets',
            'monitored_groups',
            'keywords',
            'keyword_sets',
            'accounts',
            'logs',
            'settings'
        ]
        
        for table in tables:
            try:
                await db._connection.execute(f"DROP TABLE IF EXISTS {table}")
            except Exception as e:
                print(f"Error dropping table {table}: {e}")
        
        await db._connection.commit()


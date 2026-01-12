"""
Base class for database migrations
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class Migration(ABC):
    """Base class for database migrations"""
    
    def __init__(self, version: int, description: str):
        self.version = version
        self.description = description
    
    @abstractmethod
    async def up(self, db) -> None:
        """Apply the migration (upgrade)"""
        pass
    
    @abstractmethod
    async def down(self, db) -> None:
        """Revert the migration (downgrade)"""
        pass
    
    def __repr__(self):
        return f"Migration(version={self.version}, description='{self.description}')"


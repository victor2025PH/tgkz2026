"""
TG-Matrix Connection Pool Manager
Manages a pool of Telegram client connections for better resource utilization
"""
import asyncio
import time
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import deque

from config_loader import get_config
from error_handler import handle_error, ErrorType


class ConnectionState(Enum):
    """Connection state enumeration"""
    IDLE = "idle"
    ACTIVE = "active"
    CONNECTING = "connecting"
    DISCONNECTED = "disconnected"
    ERROR = "error"


@dataclass
class PooledConnection:
    """Represents a pooled connection"""
    phone: str
    client: Any  # Pyrogram Client instance
    state: ConnectionState = ConnectionState.IDLE
    created_at: datetime = field(default_factory=datetime.now)
    last_used: datetime = field(default_factory=datetime.now)
    use_count: int = 0
    error_count: int = 0
    last_error: Optional[str] = None
    idle_timeout: float = 300.0  # 5 minutes default


class ConnectionPool:
    """Manages a pool of Telegram client connections"""
    
    def __init__(
        self,
        max_connections_per_account: int = 3,
        max_idle_time: float = 300.0,  # 5 minutes
        max_connection_age: float = 3600.0,  # 1 hour
        cleanup_interval: float = 60.0,  # 1 minute
        event_callback: Optional[Callable[[str, Any], None]] = None
    ):
        """
        Initialize connection pool
        
        Args:
            max_connections_per_account: Maximum connections per account
            max_idle_time: Maximum idle time before closing (seconds)
            max_connection_age: Maximum age before recycling (seconds)
            cleanup_interval: Interval for cleanup task (seconds)
            event_callback: Callback for pool events
        """
        self.max_connections_per_account = max_connections_per_account
        self.max_idle_time = max_idle_time
        self.max_connection_age = max_connection_age
        self.cleanup_interval = cleanup_interval
        self.event_callback = event_callback
        
        # Pool storage: phone -> deque of PooledConnection
        self.pools: Dict[str, deque] = {}
        
        # Active connections: phone -> PooledConnection
        self.active_connections: Dict[str, PooledConnection] = {}
        
        # Lock for thread-safe operations
        self.lock = asyncio.Lock()
        
        # Background tasks
        self.running = False
        self.cleanup_task: Optional[asyncio.Task] = None
        
        # Statistics
        self.stats = {
            "total_connections_created": 0,
            "total_connections_reused": 0,
            "total_connections_closed": 0,
            "current_pool_size": 0,
            "current_active_connections": 0
        }
    
    async def start(self):
        """Start the connection pool and background tasks"""
        if not self.running:
            self.running = True
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            print("[ConnectionPool] Started.")
    
    async def stop(self):
        """Stop the connection pool and close all connections"""
        self.running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Close all connections
        async with self.lock:
            for phone, pool in self.pools.items():
                for conn in pool:
                    try:
                        if conn.client and conn.client.is_connected:
                            await conn.client.disconnect()
                    except Exception:
                        pass
            
            for conn in self.active_connections.values():
                try:
                    if conn.client and conn.client.is_connected:
                        await conn.client.disconnect()
                except Exception:
                    pass
            
            self.pools.clear()
            self.active_connections.clear()
        
        print("[ConnectionPool] Stopped.")
    
    async def get_connection(
        self,
        phone: str,
        create_func: Callable[[], Any],
        use_cache: bool = True
    ) -> Optional[PooledConnection]:
        """
        Get a connection from the pool or create a new one
        
        Args:
            phone: Phone number for the account
            create_func: Function to create a new client connection
            use_cache: Whether to use pooled connections
        
        Returns:
            PooledConnection or None if failed
        """
        async with self.lock:
            # Check if we have an idle connection in the pool
            if use_cache and phone in self.pools and self.pools[phone]:
                conn = self.pools[phone].popleft()
                
                # Check if connection is still valid
                if await self._is_connection_valid(conn):
                    conn.state = ConnectionState.ACTIVE
                    conn.last_used = datetime.now()
                    conn.use_count += 1
                    self.active_connections[phone] = conn
                    self.stats["total_connections_reused"] += 1
                    
                    if self.event_callback:
                        self.event_callback("connection-reused", {
                            "phone": phone,
                            "use_count": conn.use_count
                        })
                    
                    return conn
                else:
                    # Connection invalid, close it
                    await self._close_connection(conn)
            
            # Check if we already have an active connection
            if phone in self.active_connections:
                conn = self.active_connections[phone]
                if await self._is_connection_valid(conn):
                    conn.use_count += 1
                    self.stats["total_connections_reused"] += 1
                    return conn
                else:
                    # Remove invalid active connection
                    del self.active_connections[phone]
            
            # Check connection limit
            pool_size = len(self.pools.get(phone, deque()))
            active_count = 1 if phone in self.active_connections else 0
            
            if pool_size + active_count >= self.max_connections_per_account:
                # Pool is full, reuse existing active connection if available
                if phone in self.active_connections:
                    return self.active_connections[phone]
                # Otherwise, wait for a connection to become available
                return None
            
            # Create new connection
            try:
                client = create_func()
                if not client:
                    return None
                
                conn = PooledConnection(
                    phone=phone,
                    client=client,
                    state=ConnectionState.ACTIVE,
                    idle_timeout=self.max_idle_time
                )
                
                self.active_connections[phone] = conn
                self.stats["total_connections_created"] += 1
                self.stats["current_active_connections"] = len(self.active_connections)
                
                if self.event_callback:
                    self.event_callback("connection-created", {
                        "phone": phone
                    })
                
                return conn
            except Exception as e:
                handle_error(e, {"context": f"create_connection for {phone}"}, ErrorType.NETWORK_ERROR)
                return None
    
    async def return_connection(self, phone: str, conn: PooledConnection, keep_alive: bool = True):
        """
        Return a connection to the pool
        
        Args:
            phone: Phone number for the account
            conn: Connection to return
            keep_alive: Whether to keep connection alive in pool
        """
        async with self.lock:
            if phone not in self.active_connections or self.active_connections[phone] != conn:
                # Connection not in active list, ignore
                return
            
            # Remove from active connections
            del self.active_connections[phone]
            self.stats["current_active_connections"] = len(self.active_connections)
            
            if not keep_alive:
                # Close connection immediately
                await self._close_connection(conn)
                return
            
            # Check if connection is still valid
            if not await self._is_connection_valid(conn):
                await self._close_connection(conn)
                return
            
            # Check pool size limit
            if phone not in self.pools:
                self.pools[phone] = deque()
            
            pool_size = len(self.pools[phone])
            if pool_size >= self.max_connections_per_account - 1:
                # Pool is full, close oldest connection
                oldest = self.pools[phone].popleft()
                await self._close_connection(oldest)
            
            # Return to pool
            conn.state = ConnectionState.IDLE
            conn.last_used = datetime.now()
            self.pools[phone].append(conn)
            self.stats["current_pool_size"] = sum(len(pool) for pool in self.pools.values())
            
            if self.event_callback:
                self.event_callback("connection-returned", {
                    "phone": phone,
                    "pool_size": len(self.pools[phone])
                })
    
    async def close_connection(self, phone: str, conn: PooledConnection):
        """Close a specific connection"""
        async with self.lock:
            # Remove from active connections
            if phone in self.active_connections and self.active_connections[phone] == conn:
                del self.active_connections[phone]
                self.stats["current_active_connections"] = len(self.active_connections)
            
            # Remove from pool
            if phone in self.pools:
                try:
                    self.pools[phone].remove(conn)
                except ValueError:
                    pass
            
            await self._close_connection(conn)
    
    async def close_all_for_account(self, phone: str):
        """Close all connections for a specific account"""
        async with self.lock:
            # Close active connection
            if phone in self.active_connections:
                conn = self.active_connections[phone]
                del self.active_connections[phone]
                await self._close_connection(conn)
            
            # Close pooled connections
            if phone in self.pools:
                for conn in self.pools[phone]:
                    await self._close_connection(conn)
                del self.pools[phone]
            
            self.stats["current_active_connections"] = len(self.active_connections)
            self.stats["current_pool_size"] = sum(len(pool) for pool in self.pools.values())
    
    async def _is_connection_valid(self, conn: PooledConnection) -> bool:
        """Check if a connection is still valid"""
        if not conn.client:
            return False
        
        try:
            # Check if client is connected
            if hasattr(conn.client, 'is_connected'):
                return conn.client.is_connected
            return True
        except Exception:
            return False
    
    async def _close_connection(self, conn: PooledConnection):
        """Close a connection"""
        try:
            if conn.client and hasattr(conn.client, 'is_connected') and conn.client.is_connected:
                await conn.client.disconnect()
        except Exception as e:
            handle_error(e, {"context": f"close_connection for {conn.phone}"}, ErrorType.NETWORK_ERROR)
        finally:
            self.stats["total_connections_closed"] = self.stats.get("total_connections_closed", 0) + 1
    
    async def _cleanup_loop(self):
        """Background task to cleanup idle and old connections"""
        while self.running:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                handle_error(e, {"context": "cleanup_loop"}, ErrorType.UNKNOWN_ERROR)
                await asyncio.sleep(5)
    
    async def _cleanup_connections(self):
        """Cleanup idle and old connections"""
        async with self.lock:
            now = datetime.now()
            connections_to_close = []
            
            # Check idle connections in pools
            for phone, pool in list(self.pools.items()):
                for conn in list(pool):
                    idle_time = (now - conn.last_used).total_seconds()
                    age = (now - conn.created_at).total_seconds()
                    
                    # Close if idle too long or too old
                    if idle_time > self.max_idle_time or age > self.max_connection_age:
                        connections_to_close.append((phone, conn))
                        pool.remove(conn)
            
            # Close connections
            for phone, conn in connections_to_close:
                await self._close_connection(conn)
            
            # Update pool size stat
            self.stats["current_pool_size"] = sum(len(pool) for pool in self.pools.values())
            
            # Remove empty pools
            empty_phones = [phone for phone, pool in self.pools.items() if not pool]
            for phone in empty_phones:
                del self.pools[phone]
    
    def get_pool_stats(self, phone: Optional[str] = None) -> Dict[str, Any]:
        """Get connection pool statistics"""
        if phone:
            pool_size = len(self.pools.get(phone, deque()))
            active = 1 if phone in self.active_connections else 0
            return {
                "phone": phone,
                "pool_size": pool_size,
                "active_connections": active,
                "total_connections": pool_size + active
            }
        else:
            return {
                **self.stats,
                "pools": {
                    phone: {
                        "pool_size": len(pool),
                        "active": 1 if phone in self.active_connections else 0
                    }
                    for phone, pool in self.pools.items()
                }
            }


# Global connection pool instance
_connection_pool: Optional[ConnectionPool] = None


def init_connection_pool(event_callback: Optional[Callable[[str, Any], None]] = None) -> ConnectionPool:
    """Initialize the global connection pool"""
    global _connection_pool
    if _connection_pool is None:
        config = get_config()
        max_connections = getattr(config.monitoring, 'max_connections_per_account', 3)
        max_idle = getattr(config.monitoring, 'max_connection_idle_time', 300.0)
        
        _connection_pool = ConnectionPool(
            max_connections_per_account=max_connections,
            max_idle_time=max_idle,
            event_callback=event_callback
        )
    return _connection_pool


def get_connection_pool() -> ConnectionPool:
    """Get the global connection pool instance"""
    if _connection_pool is None:
        raise RuntimeError("ConnectionPool not initialized. Call init_connection_pool() first.")
    return _connection_pool


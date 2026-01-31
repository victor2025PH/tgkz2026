"""
TG-Matrix Connection Pool
連接池管理

提供:
- Telegram 客戶端連接池
- 數據庫連接池
- 連接健康檢查
- 自動重連
"""

import sys
import asyncio
from typing import Dict, Any, Optional, List, Callable, TypeVar
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import threading

from core.logging import get_logger

logger = get_logger('ConnectionPool')

T = TypeVar('T')


class ConnectionState(Enum):
    """連接狀態"""
    IDLE = 'idle'              # 空閒
    IN_USE = 'in_use'          # 使用中
    CONNECTING = 'connecting'   # 連接中
    DISCONNECTED = 'disconnected'  # 已斷開
    ERROR = 'error'            # 錯誤


@dataclass
class PooledConnection:
    """池化連接"""
    id: str
    connection: Any
    state: ConnectionState = ConnectionState.IDLE
    created_at: datetime = field(default_factory=datetime.now)
    last_used_at: datetime = field(default_factory=datetime.now)
    use_count: int = 0
    error_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def age_seconds(self) -> float:
        return (datetime.now() - self.created_at).total_seconds()
    
    @property
    def idle_seconds(self) -> float:
        return (datetime.now() - self.last_used_at).total_seconds()


class ConnectionPool:
    """
    通用連接池
    
    支持任何類型的連接（Telegram 客戶端、數據庫等）
    """
    
    def __init__(
        self,
        name: str,
        create_fn: Callable[..., T],
        close_fn: Optional[Callable[[T], None]] = None,
        validate_fn: Optional[Callable[[T], bool]] = None,
        min_size: int = 1,
        max_size: int = 10,
        max_idle_time: float = 300.0,  # 5 分鐘
        max_age: float = 3600.0,       # 1 小時
        retry_interval: float = 5.0,
    ):
        self.name = name
        self.create_fn = create_fn
        self.close_fn = close_fn
        self.validate_fn = validate_fn
        self.min_size = min_size
        self.max_size = max_size
        self.max_idle_time = max_idle_time
        self.max_age = max_age
        self.retry_interval = retry_interval
        
        self._pool: Dict[str, PooledConnection] = {}
        self._lock = asyncio.Lock()
        self._counter = 0
        self._closed = False
        
        # 統計
        self._stats = {
            'acquired': 0,
            'released': 0,
            'created': 0,
            'closed': 0,
            'errors': 0,
            'timeouts': 0,
        }
    
    async def initialize(self) -> None:
        """初始化連接池"""
        logger.info(f"Initializing pool: {self.name}", min_size=self.min_size)
        
        for _ in range(self.min_size):
            try:
                await self._create_connection()
            except Exception as e:
                logger.error(f"Failed to create initial connection: {e}")
    
    async def acquire(self, timeout: float = 30.0) -> Optional[T]:
        """
        獲取連接
        
        Args:
            timeout: 超時時間（秒）
            
        Returns:
            連接對象，如果超時則返回 None
        """
        if self._closed:
            raise RuntimeError("Pool is closed")
        
        start_time = datetime.now()
        
        while True:
            # 檢查超時
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed >= timeout:
                self._stats['timeouts'] += 1
                logger.warning(f"Connection acquire timeout", pool=self.name)
                return None
            
            async with self._lock:
                # 尋找可用連接
                for conn_id, pooled in self._pool.items():
                    if pooled.state == ConnectionState.IDLE:
                        # 驗證連接
                        if self.validate_fn and not self.validate_fn(pooled.connection):
                            # 連接無效，關閉並創建新的
                            await self._close_connection(conn_id)
                            continue
                        
                        # 標記為使用中
                        pooled.state = ConnectionState.IN_USE
                        pooled.last_used_at = datetime.now()
                        pooled.use_count += 1
                        self._stats['acquired'] += 1
                        
                        logger.debug(f"Connection acquired", pool=self.name, id=conn_id)
                        return pooled.connection
                
                # 沒有可用連接，嘗試創建新的
                if len(self._pool) < self.max_size:
                    try:
                        pooled = await self._create_connection()
                        pooled.state = ConnectionState.IN_USE
                        pooled.use_count += 1
                        self._stats['acquired'] += 1
                        return pooled.connection
                    except Exception as e:
                        logger.error(f"Failed to create connection: {e}")
                        self._stats['errors'] += 1
            
            # 等待後重試
            await asyncio.sleep(0.1)
    
    async def release(self, connection: T) -> None:
        """釋放連接"""
        async with self._lock:
            for conn_id, pooled in self._pool.items():
                if pooled.connection is connection:
                    pooled.state = ConnectionState.IDLE
                    pooled.last_used_at = datetime.now()
                    self._stats['released'] += 1
                    logger.debug(f"Connection released", pool=self.name, id=conn_id)
                    return
        
        logger.warning(f"Unknown connection released", pool=self.name)
    
    async def close(self) -> None:
        """關閉連接池"""
        self._closed = True
        
        async with self._lock:
            for conn_id in list(self._pool.keys()):
                await self._close_connection(conn_id)
        
        logger.info(f"Pool closed", pool=self.name)
    
    async def cleanup(self) -> int:
        """
        清理過期連接
        
        Returns:
            清理的連接數
        """
        cleaned = 0
        
        async with self._lock:
            for conn_id in list(self._pool.keys()):
                pooled = self._pool[conn_id]
                
                # 檢查是否過期
                if pooled.state == ConnectionState.IDLE:
                    if pooled.idle_seconds > self.max_idle_time:
                        await self._close_connection(conn_id)
                        cleaned += 1
                    elif pooled.age_seconds > self.max_age:
                        await self._close_connection(conn_id)
                        cleaned += 1
            
            # 確保最小連接數
            while len(self._pool) < self.min_size:
                try:
                    await self._create_connection()
                except Exception as e:
                    logger.error(f"Failed to restore min connections: {e}")
                    break
        
        if cleaned > 0:
            logger.info(f"Cleaned up connections", pool=self.name, count=cleaned)
        
        return cleaned
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        idle_count = sum(1 for p in self._pool.values() if p.state == ConnectionState.IDLE)
        in_use_count = sum(1 for p in self._pool.values() if p.state == ConnectionState.IN_USE)
        
        return {
            'name': self.name,
            'total': len(self._pool),
            'idle': idle_count,
            'in_use': in_use_count,
            'min_size': self.min_size,
            'max_size': self.max_size,
            **self._stats
        }
    
    async def _create_connection(self) -> PooledConnection:
        """創建新連接"""
        self._counter += 1
        conn_id = f"{self.name}_{self._counter}"
        
        logger.debug(f"Creating connection", pool=self.name, id=conn_id)
        
        connection = await self.create_fn() if asyncio.iscoroutinefunction(self.create_fn) else self.create_fn()
        
        pooled = PooledConnection(
            id=conn_id,
            connection=connection,
            state=ConnectionState.IDLE
        )
        
        self._pool[conn_id] = pooled
        self._stats['created'] += 1
        
        logger.info(f"Connection created", pool=self.name, id=conn_id)
        return pooled
    
    async def _close_connection(self, conn_id: str) -> None:
        """關閉連接"""
        if conn_id not in self._pool:
            return
        
        pooled = self._pool.pop(conn_id)
        
        try:
            if self.close_fn:
                if asyncio.iscoroutinefunction(self.close_fn):
                    await self.close_fn(pooled.connection)
                else:
                    self.close_fn(pooled.connection)
        except Exception as e:
            logger.error(f"Error closing connection: {e}", pool=self.name, id=conn_id)
        
        self._stats['closed'] += 1
        logger.debug(f"Connection closed", pool=self.name, id=conn_id)


class ConnectionPoolManager:
    """
    連接池管理器
    
    管理多個連接池
    """
    
    _instance: Optional['ConnectionPoolManager'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._pools = {}
                cls._instance._initialized = False
            return cls._instance
    
    def register_pool(self, pool: ConnectionPool) -> None:
        """註冊連接池"""
        self._pools[pool.name] = pool
        logger.info(f"Pool registered", name=pool.name)
    
    def get_pool(self, name: str) -> Optional[ConnectionPool]:
        """獲取連接池"""
        return self._pools.get(name)
    
    async def initialize_all(self) -> None:
        """初始化所有連接池"""
        for pool in self._pools.values():
            await pool.initialize()
        self._initialized = True
    
    async def close_all(self) -> None:
        """關閉所有連接池"""
        for pool in self._pools.values():
            await pool.close()
    
    async def cleanup_all(self) -> Dict[str, int]:
        """清理所有連接池"""
        results = {}
        for name, pool in self._pools.items():
            results[name] = await pool.cleanup()
        return results
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有連接池統計"""
        return {name: pool.get_stats() for name, pool in self._pools.items()}


# 全局實例
_pool_manager: Optional[ConnectionPoolManager] = None


def get_pool_manager() -> ConnectionPoolManager:
    """獲取連接池管理器"""
    global _pool_manager
    if _pool_manager is None:
        _pool_manager = ConnectionPoolManager()
    return _pool_manager

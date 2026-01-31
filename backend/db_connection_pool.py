"""
🔧 Phase 3 優化：SQLite 連接池和查詢優化

功能：
1. 連接池管理（減少連接開銷）
2. 查詢緩存
3. 慢查詢日誌
4. 自動重連
"""

import sys
import asyncio
import sqlite3
import time
from typing import Dict, Any, Optional, List, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from collections import OrderedDict
from datetime import datetime

try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False
    aiosqlite = None


@dataclass
class QueryStats:
    """查詢統計"""
    query: str
    count: int = 0
    total_time: float = 0.0
    max_time: float = 0.0
    last_executed: Optional[datetime] = None
    
    @property
    def avg_time(self) -> float:
        return self.total_time / self.count if self.count > 0 else 0.0


class ConnectionPool:
    """
    SQLite 連接池
    
    由於 SQLite 是文件鎖，不支持真正的連接池，
    但我們可以優化連接復用和管理。
    """
    
    def __init__(
        self,
        db_path: str,
        max_connections: int = 5,
        timeout: float = 30.0,
        slow_query_threshold: float = 0.5,  # 0.5秒以上為慢查詢
    ):
        self.db_path = db_path
        self.max_connections = max_connections
        self.timeout = timeout
        self.slow_query_threshold = slow_query_threshold
        
        # 連接池
        self._connections: List[Any] = []
        self._in_use: set = set()
        self._lock = asyncio.Lock()
        
        # 查詢統計
        self._query_stats: Dict[str, QueryStats] = {}
        self._slow_queries: List[Dict[str, Any]] = []
        self._max_slow_queries = 100
        
        # 緩存
        self._query_cache: OrderedDict = OrderedDict()
        self._cache_max_size = 200
        self._cache_ttl = 60.0  # 60秒
        self._cache_timestamps: Dict[str, float] = {}
        
        # 統計
        self._stats = {
            'connections_created': 0,
            'connections_reused': 0,
            'queries_executed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
        }
    
    async def _create_connection(self) -> Any:
        """創建新連接"""
        if not HAS_AIOSQLITE:
            raise ImportError("aiosqlite is required")
        
        conn = await aiosqlite.connect(self.db_path, timeout=self.timeout)
        conn.row_factory = aiosqlite.Row
        
        # 優化設置
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA cache_size=-64000")  # 64MB
        await conn.execute("PRAGMA busy_timeout=30000")
        await conn.execute("PRAGMA temp_store=MEMORY")  # 臨時表存內存
        await conn.execute("PRAGMA mmap_size=268435456")  # 256MB 內存映射
        
        self._stats['connections_created'] += 1
        return conn
    
    @asynccontextmanager
    async def acquire(self):
        """獲取連接"""
        async with self._lock:
            # 嘗試復用現有連接
            for conn in self._connections:
                if id(conn) not in self._in_use:
                    self._in_use.add(id(conn))
                    self._stats['connections_reused'] += 1
                    try:
                        yield conn
                    finally:
                        self._in_use.discard(id(conn))
                    return
            
            # 創建新連接（如果未達上限）
            if len(self._connections) < self.max_connections:
                conn = await self._create_connection()
                self._connections.append(conn)
                self._in_use.add(id(conn))
                try:
                    yield conn
                finally:
                    self._in_use.discard(id(conn))
                return
        
        # 等待可用連接
        while True:
            await asyncio.sleep(0.1)
            async with self._lock:
                for conn in self._connections:
                    if id(conn) not in self._in_use:
                        self._in_use.add(id(conn))
                        self._stats['connections_reused'] += 1
                        try:
                            yield conn
                        finally:
                            self._in_use.discard(id(conn))
                        return
    
    async def execute(
        self,
        query: str,
        params: tuple = (),
        use_cache: bool = False,
        cache_key: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """執行查詢"""
        # 檢查緩存
        if use_cache:
            key = cache_key or f"{query}:{params}"
            cached = self._get_cached(key)
            if cached is not None:
                self._stats['cache_hits'] += 1
                return cached
            self._stats['cache_misses'] += 1
        
        # 執行查詢
        start_time = time.time()
        
        async with self.acquire() as conn:
            cursor = await conn.execute(query, params)
            rows = await cursor.fetchall()
            result = [dict(row) for row in rows]
        
        elapsed = time.time() - start_time
        self._stats['queries_executed'] += 1
        
        # 記錄統計
        self._record_query_stats(query, elapsed)
        
        # 檢查慢查詢
        if elapsed > self.slow_query_threshold:
            self._record_slow_query(query, params, elapsed)
        
        # 緩存結果
        if use_cache:
            self._set_cached(key, result)
        
        return result
    
    async def execute_write(self, query: str, params: tuple = ()) -> int:
        """執行寫入操作"""
        start_time = time.time()
        
        async with self.acquire() as conn:
            cursor = await conn.execute(query, params)
            await conn.commit()
            rowcount = cursor.rowcount
        
        elapsed = time.time() - start_time
        self._stats['queries_executed'] += 1
        self._record_query_stats(query, elapsed)
        
        if elapsed > self.slow_query_threshold:
            self._record_slow_query(query, params, elapsed)
        
        # 清除相關緩存
        self._invalidate_cache_by_table(query)
        
        return rowcount
    
    def _get_cached(self, key: str) -> Optional[List[Dict]]:
        """獲取緩存"""
        if key in self._query_cache:
            timestamp = self._cache_timestamps.get(key, 0)
            if time.time() - timestamp < self._cache_ttl:
                # 移到最後（LRU）
                self._query_cache.move_to_end(key)
                return self._query_cache[key]
            else:
                # 過期
                del self._query_cache[key]
                del self._cache_timestamps[key]
        return None
    
    def _set_cached(self, key: str, value: List[Dict]):
        """設置緩存"""
        # LRU 淘汰
        while len(self._query_cache) >= self._cache_max_size:
            oldest_key = next(iter(self._query_cache))
            del self._query_cache[oldest_key]
            self._cache_timestamps.pop(oldest_key, None)
        
        self._query_cache[key] = value
        self._cache_timestamps[key] = time.time()
    
    def _invalidate_cache_by_table(self, query: str):
        """根據表名清除相關緩存"""
        # 提取表名
        query_upper = query.upper()
        for keyword in ['INSERT INTO', 'UPDATE', 'DELETE FROM']:
            if keyword in query_upper:
                # 清除所有緩存（簡單實現）
                self._query_cache.clear()
                self._cache_timestamps.clear()
                break
    
    def _record_query_stats(self, query: str, elapsed: float):
        """記錄查詢統計"""
        # 標準化查詢（移除參數）
        normalized = self._normalize_query(query)
        
        if normalized not in self._query_stats:
            self._query_stats[normalized] = QueryStats(query=normalized)
        
        stats = self._query_stats[normalized]
        stats.count += 1
        stats.total_time += elapsed
        stats.max_time = max(stats.max_time, elapsed)
        stats.last_executed = datetime.now()
    
    def _normalize_query(self, query: str) -> str:
        """標準化查詢（用於統計）"""
        # 簡單實現：取前100個字符
        return query[:100].strip()
    
    def _record_slow_query(self, query: str, params: tuple, elapsed: float):
        """記錄慢查詢"""
        self._slow_queries.append({
            'query': query[:200],
            'params': str(params)[:100],
            'elapsed': round(elapsed, 3),
            'timestamp': datetime.now().isoformat(),
        })
        
        # 限制數量
        if len(self._slow_queries) > self._max_slow_queries:
            self._slow_queries = self._slow_queries[-self._max_slow_queries:]
        
        print(f"[DB] ⚠️ 慢查詢 ({elapsed:.2f}s): {query[:80]}...", file=sys.stderr)
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            **self._stats,
            'pool_size': len(self._connections),
            'in_use': len(self._in_use),
            'cache_size': len(self._query_cache),
            'slow_queries': len(self._slow_queries),
        }
    
    def get_slow_queries(self, limit: int = 20) -> List[Dict]:
        """獲取慢查詢列表"""
        return self._slow_queries[-limit:]
    
    def get_top_queries(self, limit: int = 10) -> List[Dict]:
        """獲取最常執行的查詢"""
        sorted_stats = sorted(
            self._query_stats.values(),
            key=lambda x: x.count,
            reverse=True
        )[:limit]
        
        return [
            {
                'query': s.query,
                'count': s.count,
                'avg_time': round(s.avg_time, 4),
                'max_time': round(s.max_time, 4),
            }
            for s in sorted_stats
        ]
    
    async def close_all(self):
        """關閉所有連接"""
        async with self._lock:
            for conn in self._connections:
                try:
                    await conn.close()
                except Exception:
                    pass
            self._connections.clear()
            self._in_use.clear()
        print(f"[DB] 已關閉 {self._stats['connections_created']} 個連接", file=sys.stderr)


# 全局連接池
_connection_pool: Optional[ConnectionPool] = None


def get_connection_pool() -> Optional[ConnectionPool]:
    """獲取連接池"""
    return _connection_pool


async def init_connection_pool(db_path: str) -> ConnectionPool:
    """初始化連接池"""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = ConnectionPool(db_path)
        print(f"[DB] ✓ 連接池已初始化", file=sys.stderr)
    return _connection_pool

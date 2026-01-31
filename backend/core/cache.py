"""
緩存服務

優化設計：
1. 多層緩存（內存 + Redis）
2. 自動過期和刷新
3. 緩存失效策略
4. 性能監控
"""

import os
import json
import time
import asyncio
import hashlib
import logging
from typing import Optional, Any, Dict, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from functools import wraps
from collections import OrderedDict
import threading

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class CacheEntry:
    """緩存條目"""
    value: Any
    expires_at: float  # timestamp
    created_at: float = field(default_factory=time.time)
    hits: int = 0
    
    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class LRUCache:
    """
    內存 LRU 緩存
    
    線程安全的 LRU 實現
    """
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        
        # 統計
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存"""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            entry = self._cache[key]
            
            # 檢查過期
            if entry.is_expired():
                del self._cache[key]
                self._misses += 1
                return None
            
            # 移到末尾（最近使用）
            self._cache.move_to_end(key)
            entry.hits += 1
            self._hits += 1
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """設置緩存"""
        with self._lock:
            # 如果已存在，更新
            if key in self._cache:
                self._cache[key] = CacheEntry(
                    value=value,
                    expires_at=time.time() + ttl
                )
                self._cache.move_to_end(key)
                return
            
            # 清理過期條目
            self._cleanup()
            
            # 如果已滿，刪除最舊的
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
            
            # 添加新條目
            self._cache[key] = CacheEntry(
                value=value,
                expires_at=time.time() + ttl
            )
    
    def delete(self, key: str) -> bool:
        """刪除緩存"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """清空緩存"""
        with self._lock:
            self._cache.clear()
    
    def _cleanup(self) -> None:
        """清理過期條目"""
        now = time.time()
        expired = [k for k, v in self._cache.items() if v.expires_at < now]
        for key in expired:
            del self._cache[key]
    
    @property
    def stats(self) -> Dict[str, Any]:
        """統計信息"""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self._hits,
                'misses': self._misses,
                'hit_rate': f'{hit_rate:.1f}%'
            }


class RedisCache:
    """
    Redis 緩存
    
    異步 Redis 客戶端包裝
    """
    
    def __init__(self, url: str = None):
        self.url = url or os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        self._redis = None
        self._available = False
        self._prefix = 'tgm:'
    
    async def _get_redis(self):
        """獲取 Redis 連接"""
        if self._redis is not None:
            return self._redis
        
        try:
            import aioredis
            self._redis = await aioredis.from_url(
                self.url,
                encoding='utf-8',
                decode_responses=True
            )
            self._available = True
            logger.info("Redis cache connected")
            return self._redis
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            self._available = False
            return None
    
    async def get(self, key: str) -> Optional[Any]:
        """獲取緩存"""
        redis = await self._get_redis()
        if not redis:
            return None
        
        try:
            value = await redis.get(f"{self._prefix}{key}")
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.debug(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """設置緩存"""
        redis = await self._get_redis()
        if not redis:
            return False
        
        try:
            await redis.setex(
                f"{self._prefix}{key}",
                ttl,
                json.dumps(value, ensure_ascii=False)
            )
            return True
        except Exception as e:
            logger.debug(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """刪除緩存"""
        redis = await self._get_redis()
        if not redis:
            return False
        
        try:
            await redis.delete(f"{self._prefix}{key}")
            return True
        except Exception as e:
            logger.debug(f"Redis delete error: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """清除匹配模式的緩存"""
        redis = await self._get_redis()
        if not redis:
            return 0
        
        try:
            keys = await redis.keys(f"{self._prefix}{pattern}")
            if keys:
                await redis.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.debug(f"Redis clear pattern error: {e}")
            return 0
    
    @property
    def available(self) -> bool:
        return self._available


class CacheService:
    """
    統一緩存服務
    
    多層緩存：內存 -> Redis
    """
    
    _instance = None
    
    def __init__(self):
        self._memory = LRUCache(max_size=2000)
        self._redis = RedisCache()
        
        # 配置
        self._memory_ttl = 60  # 內存緩存 60 秒
        self._redis_ttl = 300  # Redis 緩存 5 分鐘
    
    @classmethod
    def get_instance(cls) -> 'CacheService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def get(self, key: str) -> Optional[Any]:
        """獲取緩存（多層）"""
        # 先檢查內存
        value = self._memory.get(key)
        if value is not None:
            return value
        
        # 再檢查 Redis
        value = await self._redis.get(key)
        if value is not None:
            # 回填內存緩存
            self._memory.set(key, value, self._memory_ttl)
            return value
        
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = None,
        memory_only: bool = False
    ) -> None:
        """設置緩存"""
        ttl = ttl or self._redis_ttl
        
        # 設置內存緩存
        self._memory.set(key, value, min(ttl, self._memory_ttl))
        
        # 設置 Redis 緩存
        if not memory_only:
            await self._redis.set(key, value, ttl)
    
    async def delete(self, key: str) -> None:
        """刪除緩存"""
        self._memory.delete(key)
        await self._redis.delete(key)
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """失效匹配模式的緩存"""
        # 清理 Redis
        count = await self._redis.clear_pattern(pattern)
        
        # 清理內存（遍歷所有鍵）
        # 注意：這在大緩存時可能較慢
        import fnmatch
        keys_to_delete = [
            k for k in self._memory._cache.keys()
            if fnmatch.fnmatch(k, pattern)
        ]
        for key in keys_to_delete:
            self._memory.delete(key)
        
        return count + len(keys_to_delete)
    
    def stats(self) -> Dict[str, Any]:
        """統計信息"""
        return {
            'memory': self._memory.stats,
            'redis_available': self._redis.available
        }


# ==================== 緩存裝飾器 ====================

def cached(
    ttl: int = 300,
    key_prefix: str = '',
    key_builder: Callable = None,
    memory_only: bool = False
):
    """
    緩存裝飾器
    
    Usage:
        @cached(ttl=60, key_prefix='user')
        async def get_user(user_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = CacheService.get_instance()
            
            # 構建緩存鍵
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # 默認鍵：前綴 + 函數名 + 參數哈希
                params = str(args) + str(sorted(kwargs.items()))
                params_hash = hashlib.md5(params.encode()).hexdigest()[:8]
                cache_key = f"{key_prefix}:{func.__name__}:{params_hash}"
            
            # 嘗試獲取緩存
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # 執行函數
            result = await func(*args, **kwargs)
            
            # 緩存結果
            if result is not None:
                await cache.set(cache_key, result, ttl, memory_only)
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache(*patterns: str):
    """
    緩存失效裝飾器
    
    Usage:
        @invalidate_cache('user:*', 'profile:*')
        async def update_user(user_id: str, data: dict):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # 失效緩存
            cache = CacheService.get_instance()
            for pattern in patterns:
                await cache.invalidate_pattern(pattern)
            
            return result
        
        return wrapper
    return decorator


# ==================== 數據庫查詢緩存 ====================

class QueryCache:
    """
    數據庫查詢緩存
    
    自動緩存 SQL 查詢結果
    """
    
    def __init__(self, cache_service: CacheService = None):
        self._cache = cache_service or CacheService.get_instance()
        self._prefix = 'query:'
    
    def query_key(self, sql: str, params: tuple = None) -> str:
        """生成查詢緩存鍵"""
        content = sql + str(params or ())
        return f"{self._prefix}{hashlib.md5(content.encode()).hexdigest()}"
    
    async def get_or_execute(
        self,
        sql: str,
        params: tuple = None,
        executor: Callable = None,
        ttl: int = 60
    ) -> Any:
        """獲取緩存或執行查詢"""
        key = self.query_key(sql, params)
        
        # 嘗試緩存
        cached = await self._cache.get(key)
        if cached is not None:
            return cached
        
        # 執行查詢
        if executor:
            result = await executor(sql, params)
            if result is not None:
                await self._cache.set(key, result, ttl)
            return result
        
        return None
    
    async def invalidate_table(self, table_name: str):
        """失效表相關緩存"""
        # 這需要更智能的緩存標籤系統
        # 簡單實現：清除所有查詢緩存
        await self._cache.invalidate_pattern(f"{self._prefix}*")


# ==================== 單例訪問 ====================

def get_cache_service() -> CacheService:
    return CacheService.get_instance()

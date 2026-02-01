"""
緩存服務

功能：
1. 多層緩存（內存 + Redis）
2. 緩存失效策略
3. 分佈式緩存鎖
4. 緩存預熱
"""

import os
import json
import logging
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
import threading
from collections import OrderedDict
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


# ==================== 緩存配置 ====================

class CacheLevel(str, Enum):
    L1_MEMORY = 'l1_memory'     # 本地內存緩存
    L2_REDIS = 'l2_redis'       # Redis 緩存
    L3_DB = 'l3_db'             # 數據庫緩存表


@dataclass
class CacheConfig:
    """緩存配置"""
    # 內存緩存
    memory_max_size: int = 10000        # 最大條目數
    memory_default_ttl: int = 300       # 默認 TTL（秒）
    
    # Redis 配置
    redis_host: str = 'localhost'
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ''
    redis_default_ttl: int = 3600       # 默認 TTL（秒）
    redis_key_prefix: str = 'tgmatrix:'
    
    # 策略
    enable_l2: bool = False             # 是否啟用 Redis
    write_through: bool = True          # 寫穿透
    read_through: bool = True           # 讀穿透


@dataclass
class CacheEntry:
    """緩存條目"""
    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime] = None
    hits: int = 0
    
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


class LRUCache:
    """LRU 內存緩存"""
    
    def __init__(self, max_size: int = 10000):
        self.max_size = max_size
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        
        # 統計
        self.hits = 0
        self.misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存"""
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self.misses += 1
                return None
            
            # 檢查過期
            if entry.is_expired():
                del self._cache[key]
                self.misses += 1
                return None
            
            # 移到末尾（最近使用）
            self._cache.move_to_end(key)
            entry.hits += 1
            self.hits += 1
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl: int = None):
        """設置緩存"""
        with self._lock:
            now = datetime.utcnow()
            expires_at = now + timedelta(seconds=ttl) if ttl else None
            
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=now,
                expires_at=expires_at
            )
            
            # 如果已存在，先刪除
            if key in self._cache:
                del self._cache[key]
            
            # 檢查容量
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)  # 刪除最舊的
            
            self._cache[key] = entry
    
    def delete(self, key: str) -> bool:
        """刪除緩存"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """清空緩存"""
        with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計"""
        with self._lock:
            total = self.hits + self.misses
            hit_rate = self.hits / total if total > 0 else 0
            
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': round(hit_rate * 100, 2)
            }
    
    def cleanup_expired(self) -> int:
        """清理過期條目"""
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            return len(expired_keys)


class CacheService:
    """緩存服務"""
    
    _instance: Optional['CacheService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, config: CacheConfig = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, config: CacheConfig = None):
        if self._initialized:
            return
        
        self.config = config or CacheConfig()
        
        # L1 內存緩存
        self._l1 = LRUCache(self.config.memory_max_size)
        
        # L2 Redis（可選）
        self._redis = None
        if self.config.enable_l2:
            self._init_redis()
        
        # 命名空間鎖
        self._namespace_locks: Dict[str, threading.RLock] = {}
        
        # 分佈式鎖
        self._distributed_locks: Dict[str, datetime] = {}
        
        self._initialized = True
        logger.info("CacheService initialized")
    
    def _init_redis(self):
        """初始化 Redis 連接"""
        try:
            import redis
            self._redis = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                password=self.config.redis_password or None,
                decode_responses=True
            )
            self._redis.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self._redis = None
    
    def _make_key(self, namespace: str, key: str) -> str:
        """生成緩存鍵"""
        return f"{namespace}:{key}"
    
    def _make_redis_key(self, key: str) -> str:
        """生成 Redis 鍵"""
        return f"{self.config.redis_key_prefix}{key}"
    
    # ==================== 基本操作 ====================
    
    def get(
        self,
        key: str,
        namespace: str = 'default'
    ) -> Optional[Any]:
        """獲取緩存"""
        full_key = self._make_key(namespace, key)
        
        # L1 查詢
        value = self._l1.get(full_key)
        if value is not None:
            return value
        
        # L2 查詢（Redis）
        if self._redis and self.config.read_through:
            try:
                redis_key = self._make_redis_key(full_key)
                cached = self._redis.get(redis_key)
                if cached:
                    value = json.loads(cached)
                    # 回寫 L1
                    self._l1.set(full_key, value, self.config.memory_default_ttl)
                    return value
            except Exception as e:
                logger.warning(f"Redis get error: {e}")
        
        return None
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: int = None,
        namespace: str = 'default'
    ):
        """設置緩存"""
        full_key = self._make_key(namespace, key)
        ttl = ttl or self.config.memory_default_ttl
        
        # L1 設置
        self._l1.set(full_key, value, ttl)
        
        # L2 設置（Redis）
        if self._redis and self.config.write_through:
            try:
                redis_key = self._make_redis_key(full_key)
                redis_ttl = ttl or self.config.redis_default_ttl
                self._redis.setex(redis_key, redis_ttl, json.dumps(value))
            except Exception as e:
                logger.warning(f"Redis set error: {e}")
    
    def delete(
        self,
        key: str,
        namespace: str = 'default'
    ) -> bool:
        """刪除緩存"""
        full_key = self._make_key(namespace, key)
        
        # L1 刪除
        deleted = self._l1.delete(full_key)
        
        # L2 刪除（Redis）
        if self._redis:
            try:
                redis_key = self._make_redis_key(full_key)
                self._redis.delete(redis_key)
            except Exception as e:
                logger.warning(f"Redis delete error: {e}")
        
        return deleted
    
    def clear_namespace(self, namespace: str):
        """清空命名空間"""
        prefix = f"{namespace}:"
        
        # L1 清空
        keys_to_delete = [
            key for key in list(self._l1._cache.keys())
            if key.startswith(prefix)
        ]
        for key in keys_to_delete:
            self._l1.delete(key)
        
        # L2 清空（Redis）
        if self._redis:
            try:
                pattern = self._make_redis_key(f"{prefix}*")
                cursor = 0
                while True:
                    cursor, keys = self._redis.scan(cursor, match=pattern, count=100)
                    if keys:
                        self._redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning(f"Redis clear namespace error: {e}")
    
    def clear_all(self):
        """清空所有緩存"""
        self._l1.clear()
        
        if self._redis:
            try:
                pattern = self._make_redis_key("*")
                cursor = 0
                while True:
                    cursor, keys = self._redis.scan(cursor, match=pattern, count=100)
                    if keys:
                        self._redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning(f"Redis clear all error: {e}")
    
    # ==================== 高級操作 ====================
    
    def get_or_set(
        self,
        key: str,
        factory: Callable[[], T],
        ttl: int = None,
        namespace: str = 'default'
    ) -> T:
        """獲取或設置緩存"""
        value = self.get(key, namespace)
        if value is not None:
            return value
        
        # 獲取命名空間鎖
        lock_key = f"{namespace}:{key}"
        if lock_key not in self._namespace_locks:
            self._namespace_locks[lock_key] = threading.RLock()
        
        with self._namespace_locks[lock_key]:
            # 雙重檢查
            value = self.get(key, namespace)
            if value is not None:
                return value
            
            # 調用工廠函數
            value = factory()
            self.set(key, value, ttl, namespace)
            return value
    
    async def get_or_set_async(
        self,
        key: str,
        factory: Callable[[], Any],
        ttl: int = None,
        namespace: str = 'default'
    ) -> Any:
        """異步獲取或設置緩存"""
        value = self.get(key, namespace)
        if value is not None:
            return value
        
        # 調用工廠函數
        if asyncio.iscoroutinefunction(factory):
            value = await factory()
        else:
            value = factory()
        
        self.set(key, value, ttl, namespace)
        return value
    
    def mget(
        self,
        keys: List[str],
        namespace: str = 'default'
    ) -> Dict[str, Any]:
        """批量獲取"""
        result = {}
        for key in keys:
            value = self.get(key, namespace)
            if value is not None:
                result[key] = value
        return result
    
    def mset(
        self,
        items: Dict[str, Any],
        ttl: int = None,
        namespace: str = 'default'
    ):
        """批量設置"""
        for key, value in items.items():
            self.set(key, value, ttl, namespace)
    
    # ==================== 分佈式鎖 ====================
    
    def acquire_lock(
        self,
        lock_name: str,
        timeout: int = 30,
        namespace: str = 'locks'
    ) -> bool:
        """獲取分佈式鎖"""
        full_key = self._make_key(namespace, lock_name)
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=timeout)
        
        # 內存鎖
        if full_key in self._distributed_locks:
            if self._distributed_locks[full_key] > now:
                return False
        
        self._distributed_locks[full_key] = expires_at
        
        # Redis 鎖
        if self._redis:
            try:
                redis_key = self._make_redis_key(f"lock:{full_key}")
                acquired = self._redis.set(redis_key, '1', nx=True, ex=timeout)
                if not acquired:
                    del self._distributed_locks[full_key]
                    return False
            except Exception as e:
                logger.warning(f"Redis lock error: {e}")
        
        return True
    
    def release_lock(
        self,
        lock_name: str,
        namespace: str = 'locks'
    ):
        """釋放分佈式鎖"""
        full_key = self._make_key(namespace, lock_name)
        
        # 內存鎖
        if full_key in self._distributed_locks:
            del self._distributed_locks[full_key]
        
        # Redis 鎖
        if self._redis:
            try:
                redis_key = self._make_redis_key(f"lock:{full_key}")
                self._redis.delete(redis_key)
            except Exception as e:
                logger.warning(f"Redis unlock error: {e}")
    
    # ==================== 緩存預熱 ====================
    
    async def warmup(
        self,
        items: Dict[str, Callable[[], Any]],
        namespace: str = 'default',
        ttl: int = None
    ):
        """緩存預熱"""
        for key, factory in items.items():
            try:
                if asyncio.iscoroutinefunction(factory):
                    value = await factory()
                else:
                    value = factory()
                self.set(key, value, ttl, namespace)
                logger.debug(f"Warmed up cache: {namespace}:{key}")
            except Exception as e:
                logger.warning(f"Warmup error for {key}: {e}")
    
    # ==================== 統計與維護 ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取緩存統計"""
        stats = {
            'l1': self._l1.get_stats(),
            'l2_enabled': self._redis is not None,
            'distributed_locks': len(self._distributed_locks)
        }
        
        if self._redis:
            try:
                info = self._redis.info('memory')
                stats['l2'] = {
                    'used_memory': info.get('used_memory_human', 'N/A'),
                    'connected': True
                }
            except:
                stats['l2'] = {'connected': False}
        
        return stats
    
    def cleanup(self) -> Dict[str, int]:
        """清理過期緩存"""
        result = {
            'l1_expired': self._l1.cleanup_expired(),
            'locks_cleaned': 0
        }
        
        # 清理過期的分佈式鎖
        now = datetime.utcnow()
        expired_locks = [
            key for key, expires_at in self._distributed_locks.items()
            if expires_at < now
        ]
        for key in expired_locks:
            del self._distributed_locks[key]
        result['locks_cleaned'] = len(expired_locks)
        
        return result


# ==================== 裝飾器 ====================

def cached(
    ttl: int = 300,
    namespace: str = 'default',
    key_builder: Callable = None
):
    """緩存裝飾器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = get_cache_service()
            
            # 構建緩存鍵
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # 默認使用函數名 + 參數哈希
                key_parts = [func.__name__]
                if args:
                    key_parts.append(hashlib.md5(str(args).encode()).hexdigest()[:8])
                if kwargs:
                    key_parts.append(hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest()[:8])
                cache_key = ':'.join(key_parts)
            
            # 嘗試從緩存獲取
            cached_value = cache.get(cache_key, namespace)
            if cached_value is not None:
                return cached_value
            
            # 調用函數
            result = func(*args, **kwargs)
            
            # 存入緩存
            cache.set(cache_key, result, ttl, namespace)
            
            return result
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            cache = get_cache_service()
            
            # 構建緩存鍵
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                key_parts = [func.__name__]
                if args:
                    key_parts.append(hashlib.md5(str(args).encode()).hexdigest()[:8])
                if kwargs:
                    key_parts.append(hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest()[:8])
                cache_key = ':'.join(key_parts)
            
            # 嘗試從緩存獲取
            cached_value = cache.get(cache_key, namespace)
            if cached_value is not None:
                return cached_value
            
            # 調用函數
            result = await func(*args, **kwargs)
            
            # 存入緩存
            cache.set(cache_key, result, ttl, namespace)
            
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return wrapper
    
    return decorator


# ==================== 單例訪問 ====================

_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """獲取緩存服務"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service

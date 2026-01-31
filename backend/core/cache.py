"""
TG-Matrix Cache Module
緩存模塊

提供:
- 查詢結果緩存
- TTL 過期
- LRU 淘汰
- 分層緩存
"""

import sys
import json
import asyncio
import hashlib
from typing import Dict, Any, Optional, Callable, TypeVar, Generic
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import OrderedDict
from functools import wraps
import threading

from core.logging import get_logger

logger = get_logger('Cache')

T = TypeVar('T')


@dataclass
class CacheEntry:
    """緩存條目"""
    key: str
    value: Any
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    hits: int = 0
    size: int = 0
    tags: list = field(default_factory=list)
    
    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at
    
    @property
    def age_seconds(self) -> float:
        return (datetime.now() - self.created_at).total_seconds()


class LRUCache:
    """
    LRU 緩存
    
    支持:
    - 最大條目數限制
    - 最大內存限制
    - TTL 過期
    - 標籤清除
    """
    
    def __init__(
        self,
        name: str = 'default',
        max_size: int = 1000,
        max_memory_mb: float = 100.0,
        default_ttl: float = 300.0,  # 5 分鐘
    ):
        self.name = name
        self.max_size = max_size
        self.max_memory = int(max_memory_mb * 1024 * 1024)
        self.default_ttl = default_ttl
        
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._current_memory = 0
        
        # 統計
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0,
            'expirations': 0,
        }
    
    def get(self, key: str) -> Optional[Any]:
        """獲取緩存值"""
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self._stats['misses'] += 1
                return None
            
            # 檢查過期
            if entry.is_expired:
                self._remove(key)
                self._stats['misses'] += 1
                self._stats['expirations'] += 1
                return None
            
            # 更新 LRU 順序
            self._cache.move_to_end(key)
            entry.hits += 1
            self._stats['hits'] += 1
            
            return entry.value
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[float] = None,
        tags: Optional[list] = None
    ) -> None:
        """設置緩存值"""
        with self._lock:
            # 計算大小
            size = self._estimate_size(value)
            
            # 確保有足夠空間
            self._ensure_space(size)
            
            # 計算過期時間
            actual_ttl = ttl if ttl is not None else self.default_ttl
            expires_at = datetime.now() + timedelta(seconds=actual_ttl) if actual_ttl > 0 else None
            
            # 如果已存在，先移除舊的
            if key in self._cache:
                self._remove(key)
            
            # 創建條目
            entry = CacheEntry(
                key=key,
                value=value,
                expires_at=expires_at,
                size=size,
                tags=tags or []
            )
            
            self._cache[key] = entry
            self._current_memory += size
            self._stats['sets'] += 1
    
    def delete(self, key: str) -> bool:
        """刪除緩存值"""
        with self._lock:
            if key in self._cache:
                self._remove(key)
                return True
            return False
    
    def clear(self) -> None:
        """清空緩存"""
        with self._lock:
            self._cache.clear()
            self._current_memory = 0
    
    def clear_by_tag(self, tag: str) -> int:
        """按標籤清除緩存"""
        with self._lock:
            to_remove = [
                key for key, entry in self._cache.items()
                if tag in entry.tags
            ]
            for key in to_remove:
                self._remove(key)
            return len(to_remove)
    
    def clear_by_prefix(self, prefix: str) -> int:
        """按前綴清除緩存"""
        with self._lock:
            to_remove = [
                key for key in self._cache.keys()
                if key.startswith(prefix)
            ]
            for key in to_remove:
                self._remove(key)
            return len(to_remove)
    
    def cleanup_expired(self) -> int:
        """清理過期條目"""
        with self._lock:
            to_remove = [
                key for key, entry in self._cache.items()
                if entry.is_expired
            ]
            for key in to_remove:
                self._remove(key)
                self._stats['expirations'] += 1
            return len(to_remove)
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        with self._lock:
            total_hits = self._stats['hits']
            total_misses = self._stats['misses']
            hit_rate = total_hits / (total_hits + total_misses) if (total_hits + total_misses) > 0 else 0
            
            return {
                'name': self.name,
                'size': len(self._cache),
                'max_size': self.max_size,
                'memory_bytes': self._current_memory,
                'max_memory_bytes': self.max_memory,
                'hit_rate': round(hit_rate, 4),
                **self._stats
            }
    
    def _remove(self, key: str) -> None:
        """移除條目（內部方法）"""
        if key in self._cache:
            entry = self._cache.pop(key)
            self._current_memory -= entry.size
    
    def _ensure_space(self, needed_size: int) -> None:
        """確保有足夠空間"""
        # 按條目數淘汰
        while len(self._cache) >= self.max_size:
            self._evict_one()
        
        # 按內存淘汰
        while self._current_memory + needed_size > self.max_memory and len(self._cache) > 0:
            self._evict_one()
    
    def _evict_one(self) -> None:
        """淘汰一個條目"""
        if self._cache:
            key = next(iter(self._cache))
            self._remove(key)
            self._stats['evictions'] += 1
    
    def _estimate_size(self, value: Any) -> int:
        """估算值的大小"""
        try:
            return len(json.dumps(value, default=str))
        except:
            return 1024  # 默認 1KB


class CacheManager:
    """
    緩存管理器
    
    管理多個緩存層
    """
    
    _instance: Optional['CacheManager'] = None
    _lock = threading.Lock()
    
    # 預定義緩存命名空間
    NAMESPACE_QUERY = 'query'       # 查詢結果
    NAMESPACE_USER = 'user'         # 用戶數據
    NAMESPACE_CONFIG = 'config'     # 配置數據
    NAMESPACE_AI = 'ai'             # AI 響應
    NAMESPACE_STATS = 'stats'       # 統計數據
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._caches = {}
                cls._instance._initialized = False
                cls._instance._default_ttl = 300.0
                cls._instance._cleanup_task = None
            return cls._instance
    
    async def start_cleanup_task(self) -> None:
        """啟動緩存清理任務（向後兼容接口）"""
        # LRU 緩存自帶過期機制，此方法為向後兼容保留
        logger.debug("Cache cleanup task started (using LRU auto-eviction)")
    
    async def stop_cleanup_task(self) -> None:
        """停止緩存清理任務（向後兼容接口）"""
        logger.debug("Cache cleanup task stopped")
    
    def initialize(self) -> None:
        """初始化預設緩存"""
        if self._initialized:
            return
        
        # 查詢緩存（高頻、短 TTL）
        self._caches[self.NAMESPACE_QUERY] = LRUCache(
            name=self.NAMESPACE_QUERY,
            max_size=5000,
            max_memory_mb=50.0,
            default_ttl=60.0  # 1 分鐘
        )
        
        # 用戶數據緩存（中頻、中 TTL）
        self._caches[self.NAMESPACE_USER] = LRUCache(
            name=self.NAMESPACE_USER,
            max_size=2000,
            max_memory_mb=30.0,
            default_ttl=300.0  # 5 分鐘
        )
        
        # 配置緩存（低頻、長 TTL）
        self._caches[self.NAMESPACE_CONFIG] = LRUCache(
            name=self.NAMESPACE_CONFIG,
            max_size=500,
            max_memory_mb=10.0,
            default_ttl=3600.0  # 1 小時
        )
        
        # AI 響應緩存（避免重複 API 調用）
        self._caches[self.NAMESPACE_AI] = LRUCache(
            name=self.NAMESPACE_AI,
            max_size=1000,
            max_memory_mb=20.0,
            default_ttl=1800.0  # 30 分鐘
        )
        
        # 統計緩存（頻繁更新）
        self._caches[self.NAMESPACE_STATS] = LRUCache(
            name=self.NAMESPACE_STATS,
            max_size=200,
            max_memory_mb=5.0,
            default_ttl=30.0  # 30 秒
        )
        
        self._initialized = True
        logger.info("Cache manager initialized")
    
    def get_cache(self, namespace: str) -> LRUCache:
        """獲取指定命名空間的緩存"""
        if namespace not in self._caches:
            # 創建新的緩存
            self._caches[namespace] = LRUCache(name=namespace)
        return self._caches[namespace]
    
    def get(self, namespace: str, key: str) -> Optional[Any]:
        """從指定命名空間獲取緩存"""
        return self.get_cache(namespace).get(key)
    
    def set(
        self, 
        namespace: str, 
        key: str, 
        value: Any, 
        ttl: Optional[float] = None,
        tags: Optional[list] = None
    ) -> None:
        """設置緩存"""
        self.get_cache(namespace).set(key, value, ttl, tags)
    
    def delete(self, namespace: str, key: str) -> bool:
        """刪除緩存"""
        return self.get_cache(namespace).delete(key)
    
    def clear_namespace(self, namespace: str) -> None:
        """清空命名空間"""
        if namespace in self._caches:
            self._caches[namespace].clear()
    
    def clear_all(self) -> None:
        """清空所有緩存"""
        for cache in self._caches.values():
            cache.clear()
    
    def cleanup_all_expired(self) -> Dict[str, int]:
        """清理所有過期條目"""
        results = {}
        for name, cache in self._caches.items():
            results[name] = cache.cleanup_expired()
        return results
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有緩存統計"""
        return {name: cache.get_stats() for name, cache in self._caches.items()}


# 全局實例
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """獲取緩存管理器"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
        _cache_manager.initialize()
    return _cache_manager


def init_cache_manager(default_ttl: int = 300) -> CacheManager:
    """
    初始化緩存管理器（向後兼容接口）
    
    Args:
        default_ttl: 默認緩存過期時間（秒）
        
    Returns:
        CacheManager 實例
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
        # 更新默認 TTL
        _cache_manager._default_ttl = float(default_ttl)
        _cache_manager.initialize()
    return _cache_manager


def cached(
    namespace: str = CacheManager.NAMESPACE_QUERY,
    ttl: Optional[float] = None,
    key_fn: Optional[Callable[..., str]] = None,
):
    """
    緩存裝飾器
    
    用法:
        @cached(namespace='query', ttl=60)
        async def get_user(user_id: str):
            return await db.fetch_user(user_id)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # 生成緩存鍵
            if key_fn:
                cache_key = key_fn(*args, **kwargs)
            else:
                # 默認使用函數名和參數的哈希
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(':'.join(key_parts).encode()).hexdigest()
            
            # 嘗試從緩存獲取
            cache = get_cache_manager()
            cached_value = cache.get(namespace, cache_key)
            
            if cached_value is not None:
                return cached_value
            
            # 執行函數
            result = await func(*args, **kwargs)
            
            # 存入緩存
            cache.set(namespace, cache_key, result, ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # 同步版本
            if key_fn:
                cache_key = key_fn(*args, **kwargs)
            else:
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(':'.join(key_parts).encode()).hexdigest()
            
            cache = get_cache_manager()
            cached_value = cache.get(namespace, cache_key)
            
            if cached_value is not None:
                return cached_value
            
            result = func(*args, **kwargs)
            cache.set(namespace, cache_key, result, ttl)
            
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

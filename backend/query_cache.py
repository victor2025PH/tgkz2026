"""
TG-Matrix Query Cache
Provides caching layer for frequently accessed database queries
"""
import time
import hashlib
import json
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import OrderedDict


@dataclass
class CacheEntry:
    """Single cache entry"""
    key: str
    value: Any
    timestamp: float
    ttl: float  # Time to live in seconds
    access_count: int = 0
    last_access: float = field(default_factory=time.time)


class QueryCache:
    """LRU cache for database queries with TTL support"""
    
    def __init__(
        self,
        max_size: int = 100,
        default_ttl: float = 300.0,  # 5 minutes default
        cleanup_interval: float = 60.0  # Cleanup every minute
    ):
        """
        Initialize query cache
        
        Args:
            max_size: Maximum number of cache entries
            default_ttl: Default time-to-live in seconds
            cleanup_interval: Interval for automatic cleanup
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cleanup_interval = cleanup_interval
        
        # LRU cache using OrderedDict
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        
        # Last cleanup time
        self.last_cleanup = time.time()
    
    def _generate_key(self, query_name: str, params: Dict[str, Any]) -> str:
        """Generate cache key from query name and parameters"""
        # Sort params for consistent key generation
        sorted_params = json.dumps(params, sort_keys=True, default=str)
        key_string = f"{query_name}:{sorted_params}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(
        self,
        query_name: str,
        params: Dict[str, Any],
        fetch_func: Optional[Callable] = None,
        ttl: Optional[float] = None
    ) -> Optional[Any]:
        """
        Get value from cache or fetch if not present
        
        Args:
            query_name: Name of the query
            params: Query parameters
            fetch_func: Function to fetch data if cache miss (optional)
            ttl: Time-to-live override (optional)
        
        Returns:
            Cached value or None if not found and no fetch_func provided
        """
        # Auto-cleanup expired entries
        self._cleanup_expired()
        
        key = self._generate_key(query_name, params)
        
        # Check cache
        if key in self.cache:
            entry = self.cache[key]
            
            # Check if expired
            if time.time() - entry.timestamp > entry.ttl:
                # Expired, remove it
                del self.cache[key]
                self.misses += 1
            else:
                # Cache hit
                entry.access_count += 1
                entry.last_access = time.time()
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                self.hits += 1
                return entry.value
        
        # Cache miss
        self.misses += 1
        
        # Fetch if function provided
        if fetch_func:
            try:
                value = fetch_func()
                
                # Store in cache
                self.set(query_name, params, value, ttl)
                
                return value
            except Exception as e:
                print(f"[QueryCache] Error fetching data for {query_name}: {e}")
                return None
        
        return None
    
    def set(
        self,
        query_name: str,
        params: Dict[str, Any],
        value: Any,
        ttl: Optional[float] = None
    ):
        """
        Store value in cache
        
        Args:
            query_name: Name of the query
            params: Query parameters
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        key = self._generate_key(query_name, params)
        ttl = ttl if ttl is not None else self.default_ttl
        
        # Remove if exists
        if key in self.cache:
            del self.cache[key]
        
        # Check if cache is full
        if len(self.cache) >= self.max_size:
            # Remove least recently used (first item)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            self.evictions += 1
        
        # Add new entry
        entry = CacheEntry(
            key=key,
            value=value,
            timestamp=time.time(),
            ttl=ttl
        )
        self.cache[key] = entry
    
    def invalidate(self, query_name: Optional[str] = None, pattern: Optional[str] = None):
        """
        Invalidate cache entries
        
        Args:
            query_name: Invalidate entries for specific query (optional)
            pattern: Invalidate entries matching pattern (optional)
        """
        keys_to_remove = []
        
        for key, entry in self.cache.items():
            # Check if matches query_name or pattern
            if query_name and key.startswith(self._generate_key(query_name, {}).split(':')[0]):
                keys_to_remove.append(key)
            elif pattern and pattern in key:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.cache[key]
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        now = time.time()
        
        # Only cleanup if enough time has passed
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        self.last_cleanup = now
        
        expired_keys = []
        for key, entry in self.cache.items():
            if now - entry.timestamp > entry.ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests
        }


# Global query cache instance
_query_cache: Optional[QueryCache] = None


def init_query_cache(max_size: int = 100, default_ttl: float = 300.0) -> QueryCache:
    """Initialize the global query cache"""
    global _query_cache
    if _query_cache is None:
        _query_cache = QueryCache(max_size=max_size, default_ttl=default_ttl)
    return _query_cache


def get_query_cache() -> QueryCache:
    """Get the global query cache instance"""
    if _query_cache is None:
        return init_query_cache()
    return _query_cache


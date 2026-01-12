"""
TG-Matrix Cache Manager
查詢結果緩存管理器，提升查詢性能
"""
import sys
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
import asyncio
import hashlib
import json


class CacheManager:
    """查詢結果緩存管理器"""
    
    def __init__(self, default_ttl: int = 300):
        """
        初始化緩存管理器
        
        Args:
            default_ttl: 默認緩存過期時間（秒），默認 5 分鐘
        """
        self.cache: Dict[str, tuple] = {}  # key -> (value, expiry_time)
        self.default_ttl = default_ttl
        self._cleanup_task: Optional[asyncio.Task] = None
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'invalidations': 0
        }
    
    async def get(self, key: str) -> Optional[Any]:
        """
        獲取緩存值
        
        Args:
            key: 緩存鍵
            
        Returns:
            緩存值，如果不存在或已過期則返回 None
        """
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                self._stats['hits'] += 1
                return value
            else:
                # 已過期，刪除
                del self.cache[key]
        
        self._stats['misses'] += 1
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        設置緩存值
        
        Args:
            key: 緩存鍵
            value: 緩存值
            ttl: 過期時間（秒），如果為 None 則使用默認值
        """
        ttl = ttl or self.default_ttl
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
        self._stats['sets'] += 1
    
    async def invalidate(self, pattern: str):
        """
        使緩存失效（支持模式匹配）
        
        Args:
            pattern: 匹配模式（如果緩存鍵包含此模式則刪除）
        """
        keys_to_delete = [k for k in self.cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self.cache[key]
        self._stats['invalidations'] += len(keys_to_delete)
    
    async def invalidate_all(self):
        """清除所有緩存"""
        count = len(self.cache)
        self.cache.clear()
        self._stats['invalidations'] += count
    
    async def get_or_set(
        self, 
        key: str, 
        fetch_func: Callable[[], Any], 
        ttl: Optional[int] = None
    ) -> Any:
        """
        獲取緩存值，如果不存在則執行函數獲取並緩存
        
        Args:
            key: 緩存鍵
            fetch_func: 獲取數據的函數（可以是同步或異步）
            ttl: 過期時間（秒）
            
        Returns:
            緩存值或函數返回的值
        """
        # 先嘗試從緩存獲取
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # 緩存未命中，執行函數獲取數據
        if asyncio.iscoroutinefunction(fetch_func):
            value = await fetch_func()
        else:
            value = fetch_func()
        
        # 緩存結果
        await self.set(key, value, ttl)
        return value
    
    def generate_key(self, prefix: str, **kwargs) -> str:
        """
        生成緩存鍵
        
        Args:
            prefix: 前綴
            **kwargs: 用於生成鍵的參數
            
        Returns:
            緩存鍵字符串
        """
        # 將參數排序後序列化，確保相同參數生成相同鍵
        params_str = json.dumps(kwargs, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        return f"{prefix}:{params_hash}"
    
    async def start_cleanup_task(self):
        """啟動定期清理任務"""
        async def cleanup():
            while True:
                await asyncio.sleep(60)  # 每分鐘清理一次
                now = datetime.now()
                expired_keys = [
                    k for k, (_, expiry) in self.cache.items()
                    if now >= expiry
                ]
                for key in expired_keys:
                    del self.cache[key]
                
                if expired_keys:
                    print(f"[CacheManager] Cleaned up {len(expired_keys)} expired cache entries", file=sys.stderr)
        
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(cleanup())
            print("[CacheManager] Cleanup task started", file=sys.stderr)
    
    async def stop_cleanup_task(self):
        """停止清理任務"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            print("[CacheManager] Cleanup task stopped", file=sys.stderr)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        獲取緩存統計信息
        
        Returns:
            統計信息字典
        """
        total_requests = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self._stats,
            'total_requests': total_requests,
            'hit_rate': round(hit_rate, 2),
            'cache_size': len(self.cache),
            'memory_usage_mb': round(sys.getsizeof(self.cache) / 1024 / 1024, 2)
        }
    
    def reset_stats(self):
        """重置統計信息"""
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'invalidations': 0
        }


# 全局緩存管理器實例
_cache_manager: Optional[CacheManager] = None


def init_cache_manager(default_ttl: int = 300) -> CacheManager:
    """
    初始化全局緩存管理器
    
    Args:
        default_ttl: 默認緩存過期時間（秒）
        
    Returns:
        CacheManager 實例
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager(default_ttl=default_ttl)
    return _cache_manager


def get_cache_manager() -> CacheManager:
    """
    獲取全局緩存管理器實例
    
    Returns:
        CacheManager 實例
        
    Raises:
        RuntimeError: 如果緩存管理器未初始化
    """
    global _cache_manager
    if _cache_manager is None:
        raise RuntimeError("CacheManager not initialized. Call init_cache_manager() first.")
    return _cache_manager

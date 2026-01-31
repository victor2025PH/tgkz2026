"""
TG-Matrix Cache Manager
向後兼容模組 - 轉發到 core.cache

此文件保留用於向後兼容，新代碼應直接使用:
    from core.cache import CacheManager, get_cache_manager, init_cache_manager
"""

# 從 core.cache 重新導出
from core.cache import (
    CacheManager,
    get_cache_manager,
    init_cache_manager,
)

__all__ = [
    'CacheManager',
    'get_cache_manager',
    'init_cache_manager',
]

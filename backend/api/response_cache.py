#!/usr/bin/env python3
"""
P14-3: Smart Response Cache for High-Frequency Read-Only Endpoints

Features:
- TTL-based in-memory cache for GET requests
- Per-endpoint configurable TTL
- Cache bypass via Cache-Control: no-cache header
- Automatic cache-key generation from path + query string
- X-Cache: HIT/MISS header for observability
- Cache stats exposed to perf_metrics
- No external dependencies
"""

import time
import hashlib
import logging
from collections import OrderedDict
from aiohttp import web

logger = logging.getLogger(__name__)


# Cache configuration: path -> TTL in seconds
# Only exact paths are cached; parameterized paths (/{id}) are NOT cached
CACHE_CONFIG = {
    # Health / system — checked every 30s by Docker HEALTHCHECK
    '/health':                      10,
    '/api/health':                  10,
    '/api/v1/health':               15,
    '/api/v1/health/live':          10,
    '/api/v1/health/ready':         10,
    '/api/v1/health/info':          30,
    '/api/v1/status':               15,
    # Membership / billing (rarely changes)
    '/api/v1/membership/levels':    300,   # 5 min
    '/api/v1/subscription/plans':   300,   # 5 min
    '/api/v1/billing/quota-packs':  300,   # 5 min
    # i18n (almost never changes)
    '/api/v1/i18n/languages':       600,   # 10 min
    '/api/v1/i18n/translations':    600,   # 10 min
    '/api/v1/timezone/list':        600,   # 10 min
    # Campaigns (changes infrequently)
    '/api/v1/campaigns/active':     120,   # 2 min
    # OpenAPI docs (regenerated on deploy)
    '/api/openapi.json':            300,   # 5 min
    '/api/v1/oauth/providers':      300,   # 5 min
}

# Max cache entries (LRU eviction)
MAX_CACHE_SIZE = 200


class ResponseCache:
    """LRU response cache with TTL support"""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._cache = OrderedDict()  # key -> (expires_at, status, headers_dict, body)
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def _make_key(self, path: str, query_string: str) -> str:
        """Generate cache key from path + query string"""
        if query_string:
            raw = f"{path}?{query_string}"
            return hashlib.md5(raw.encode()).hexdigest()[:16]
        return path

    def get(self, path: str, query_string: str = ''):
        """Try to get cached response. Returns (status, headers, body) or None."""
        key = self._make_key(path, query_string)
        entry = self._cache.get(key)
        if entry is None:
            self._misses += 1
            return None

        expires_at, status, headers, body = entry
        if time.time() > expires_at:
            # Expired
            del self._cache[key]
            self._misses += 1
            return None

        # Move to end (LRU)
        self._cache.move_to_end(key)
        self._hits += 1
        return status, headers, body

    def put(self, path: str, query_string: str, ttl: int,
            status: int, headers: dict, body: bytes):
        """Store response in cache"""
        key = self._make_key(path, query_string)
        expires_at = time.time() + ttl

        # Evict oldest if full
        while len(self._cache) >= MAX_CACHE_SIZE:
            self._cache.popitem(last=False)
            self._evictions += 1

        self._cache[key] = (expires_at, status, headers, body)

    def invalidate(self, path: str = None):
        """Invalidate cache entries. If path is None, clear all."""
        if path is None:
            self._cache.clear()
            return
        # Remove entries matching this path prefix
        keys_to_remove = [k for k in self._cache if k == path or k.startswith(path)]
        for k in keys_to_remove:
            del self._cache[k]

    def get_stats(self) -> dict:
        """Get cache statistics"""
        total = self._hits + self._misses
        return {
            'entries': len(self._cache),
            'max_size': MAX_CACHE_SIZE,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': round(self._hits / max(total, 1) * 100, 1),
            'evictions': self._evictions,
            'cached_paths': len(CACHE_CONFIG),
        }


def create_cache_middleware():
    """Create aiohttp middleware for response caching (P14-3)"""
    cache = ResponseCache.get_instance()

    @web.middleware
    async def cache_middleware(request, handler):
        # Only cache GET requests
        if request.method != 'GET':
            return await handler(request)

        path = request.path
        ttl = CACHE_CONFIG.get(path)
        if ttl is None:
            return await handler(request)

        # Allow cache bypass
        if request.headers.get('Cache-Control') == 'no-cache':
            response = await handler(request)
            response.headers['X-Cache'] = 'BYPASS'
            return response

        # Try cache
        query = request.query_string
        cached = cache.get(path, query)
        if cached is not None:
            status, headers, body = cached
            response = web.Response(status=status, body=body)
            for k, v in headers.items():
                response.headers[k] = v
            response.headers['X-Cache'] = 'HIT'
            return response

        # Cache miss — execute handler and store
        response = await handler(request)

        # Only cache successful responses
        if 200 <= response.status < 300:
            # Capture response body and headers
            resp_headers = {
                'Content-Type': response.content_type or 'application/json',
            }
            body = response.body
            if body is None and hasattr(response, 'text'):
                body = response.text.encode('utf-8') if response.text else b''
            if body is not None:
                cache.put(path, query, ttl, response.status, resp_headers, body)

        response.headers['X-Cache'] = 'MISS'
        response.headers['X-Cache-TTL'] = str(ttl)
        return response

    return cache_middleware

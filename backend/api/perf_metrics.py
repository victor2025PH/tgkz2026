#!/usr/bin/env python3
"""
P13-3 → P14-1: API Performance Metrics & Request Tracing

Features:
- X-Request-ID generation and propagation (P14-1)
- Per-endpoint response time tracking (P50, P95, P99)
- Status code distribution
- Request rate per minute
- Slowest endpoints ranking
- Slow request tracing with Request-ID correlation
- No external dependencies (pure Python, memory-based)
"""

import time
import uuid
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from aiohttp import web

logger = logging.getLogger(__name__)

# Configuration
MAX_HISTORY_MINUTES = 10       # Keep last N minutes of raw data
MAX_LATENCIES_PER_ENDPOINT = 500  # Rolling window per endpoint
SLOW_THRESHOLD_MS = 1000       # Mark as slow if > N ms

# P14-1: Request context key for X-Request-ID
REQUEST_ID_KEY = web.AppKey('request_id', str)
REQUEST_ID_HEADER = 'X-Request-ID'


def get_request_id(request) -> str:
    """Get the X-Request-ID from current request (P14-1)"""
    return request.get(REQUEST_ID_KEY, 'unknown')


class ApiMetrics:
    """Thread-safe API metrics collector (singleton)"""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        # Per-endpoint latency tracking: {endpoint: deque of (timestamp, duration_ms)}
        self._latencies = defaultdict(lambda: deque(maxlen=MAX_LATENCIES_PER_ENDPOINT))
        # Status code counters: {status_code: count}
        self._status_counts = defaultdict(int)
        # Request rate: deque of timestamps
        self._request_times = deque(maxlen=10000)
        # Total counters
        self._total_requests = 0
        self._total_errors = 0  # 4xx + 5xx
        # Slow request log
        self._slow_requests = deque(maxlen=50)
        self._start_time = time.time()

    def record(self, method: str, path: str, status: int, duration_ms: float,
               request_id: str = ''):
        """Record a request metric (P14-1: with request_id correlation)"""
        now = time.time()
        endpoint = f"{method} {self._normalize_path(path)}"

        self._latencies[endpoint].append((now, duration_ms))
        self._status_counts[status] += 1
        self._request_times.append(now)
        self._total_requests += 1

        if status >= 400:
            self._total_errors += 1

        if duration_ms > SLOW_THRESHOLD_MS:
            self._slow_requests.append({
                'endpoint': endpoint,
                'duration_ms': round(duration_ms, 1),
                'status': status,
                'request_id': request_id,
                'time': datetime.fromtimestamp(now).isoformat(),
            })

    @staticmethod
    def _normalize_path(path: str) -> str:
        """Normalize path parameters for grouping (e.g., /users/123 -> /users/{id})"""
        import re
        # Replace UUID-like and numeric path segments
        normalized = re.sub(r'/[0-9a-f]{8,}', '/{id}', path)
        normalized = re.sub(r'/\d+', '/{id}', normalized)
        return normalized

    def get_summary(self) -> dict:
        """Get a performance summary"""
        now = time.time()
        uptime = now - self._start_time

        # RPM (requests per minute) - last 60 seconds
        one_min_ago = now - 60
        recent_count = sum(1 for t in self._request_times if t > one_min_ago)

        # Top endpoints by request count
        endpoint_stats = {}
        for endpoint, latencies in self._latencies.items():
            # Filter to recent data
            recent = [d for ts, d in latencies if ts > now - MAX_HISTORY_MINUTES * 60]
            if not recent:
                continue
            recent.sort()
            n = len(recent)
            endpoint_stats[endpoint] = {
                'count': n,
                'avg_ms': round(sum(recent) / n, 1),
                'p50_ms': round(recent[n // 2], 1),
                'p95_ms': round(recent[int(n * 0.95)] if n >= 20 else recent[-1], 1),
                'p99_ms': round(recent[int(n * 0.99)] if n >= 100 else recent[-1], 1),
                'max_ms': round(recent[-1], 1),
            }

        # Sort by count descending
        top_endpoints = dict(sorted(
            endpoint_stats.items(),
            key=lambda x: -x[1]['count']
        )[:20])

        # Slowest endpoints (by p95)
        slowest = dict(sorted(
            endpoint_stats.items(),
            key=lambda x: -x[1]['p95_ms']
        )[:10])

        # Status distribution
        status_dist = dict(sorted(self._status_counts.items()))

        return {
            'uptime_seconds': round(uptime, 0),
            'total_requests': self._total_requests,
            'total_errors': self._total_errors,
            'error_rate': round(self._total_errors / max(self._total_requests, 1) * 100, 2),
            'rpm': recent_count,
            'status_distribution': status_dist,
            'top_endpoints': top_endpoints,
            'slowest_endpoints': slowest,
            'slow_requests_recent': list(self._slow_requests)[-10:],
            'collected_at': datetime.now().isoformat(),
        }


def _generate_request_id() -> str:
    """Generate a short, unique request ID (P14-1)"""
    return uuid.uuid4().hex[:12]


def create_perf_middleware():
    """Create aiohttp middleware for performance tracking + request tracing (P14-1)"""
    metrics = ApiMetrics.get_instance()

    @web.middleware
    async def perf_middleware(request, handler):
        # P14-1: Generate or reuse X-Request-ID
        req_id = request.headers.get(REQUEST_ID_HEADER, '') or _generate_request_id()
        request[REQUEST_ID_KEY] = req_id

        start = time.monotonic()
        try:
            response = await handler(request)
            duration_ms = (time.monotonic() - start) * 1000
            metrics.record(request.method, request.path, response.status,
                           duration_ms, request_id=req_id)
            # P14-1: Propagate request ID + timing in response headers
            response.headers[REQUEST_ID_HEADER] = req_id
            response.headers['X-Response-Time'] = f"{duration_ms:.1f}ms"
            return response
        except web.HTTPException as e:
            duration_ms = (time.monotonic() - start) * 1000
            metrics.record(request.method, request.path, e.status,
                           duration_ms, request_id=req_id)
            e.headers[REQUEST_ID_HEADER] = req_id
            e.headers['X-Response-Time'] = f"{duration_ms:.1f}ms"
            raise
        except Exception as e:
            duration_ms = (time.monotonic() - start) * 1000
            metrics.record(request.method, request.path, 500,
                           duration_ms, request_id=req_id)
            raise

    return perf_middleware

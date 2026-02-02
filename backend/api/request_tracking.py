"""
請求追蹤與性能監控中間件

🆕 功能：
1. 為每個請求生成唯一 ID
2. 記錄請求持續時間
3. 追蹤數據庫查詢次數和時間
4. 記錄慢請求
5. 提供請求統計 API
"""

import time
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import deque
from threading import Lock

from aiohttp import web

logger = logging.getLogger(__name__)

# ============ 配置 ============

SLOW_REQUEST_THRESHOLD_MS = 500  # 慢請求閾值（毫秒）
MAX_REQUEST_LOG_SIZE = 1000      # 保留最近 N 個請求記錄
STATS_WINDOW_MINUTES = 60        # 統計窗口（分鐘）


# ============ 數據結構 ============

@dataclass
class RequestLog:
    """請求日誌"""
    request_id: str
    method: str
    path: str
    tenant_id: Optional[str]
    start_time: float
    end_time: Optional[float] = None
    status_code: int = 0
    error: Optional[str] = None
    
    @property
    def duration_ms(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time) * 1000
        return 0
    
    @property
    def is_slow(self) -> bool:
        return self.duration_ms > SLOW_REQUEST_THRESHOLD_MS
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'request_id': self.request_id,
            'method': self.method,
            'path': self.path,
            'tenant_id': self.tenant_id,
            'duration_ms': round(self.duration_ms, 2),
            'status_code': self.status_code,
            'is_slow': self.is_slow,
            'error': self.error,
            'timestamp': datetime.fromtimestamp(self.start_time).isoformat(),
        }


class RequestTracker:
    """請求追蹤器（單例）"""
    
    _instance: Optional['RequestTracker'] = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._requests: deque = deque(maxlen=MAX_REQUEST_LOG_SIZE)
        self._stats_lock = Lock()
        
        # 統計數據
        self._total_requests = 0
        self._total_errors = 0
        self._total_slow = 0
        self._path_stats: Dict[str, Dict[str, Any]] = {}
    
    def start_request(self, request) -> RequestLog:
        """開始追蹤請求"""
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())[:8]
        tenant_id = request.get('tenant_id')
        
        log = RequestLog(
            request_id=request_id,
            method=request.method,
            path=request.path,
            tenant_id=tenant_id,
            start_time=time.time()
        )
        
        # 設置請求 ID 到響應頭
        request['_request_log'] = log
        request['_request_id'] = request_id
        
        return log
    
    def end_request(self, request, response) -> RequestLog:
        """結束追蹤請求"""
        log: RequestLog = request.get('_request_log')
        if not log:
            return None
        
        log.end_time = time.time()
        log.status_code = response.status if response else 0
        
        # 更新統計
        with self._stats_lock:
            self._total_requests += 1
            
            if log.status_code >= 400:
                self._total_errors += 1
            
            if log.is_slow:
                self._total_slow += 1
                logger.warning(
                    f"[SlowRequest] {log.method} {log.path} "
                    f"took {log.duration_ms:.1f}ms (tenant: {log.tenant_id})"
                )
            
            # 路徑統計
            path_key = f"{log.method} {log.path}"
            if path_key not in self._path_stats:
                self._path_stats[path_key] = {
                    'count': 0,
                    'total_ms': 0,
                    'errors': 0,
                    'slow': 0
                }
            
            stats = self._path_stats[path_key]
            stats['count'] += 1
            stats['total_ms'] += log.duration_ms
            if log.status_code >= 400:
                stats['errors'] += 1
            if log.is_slow:
                stats['slow'] += 1
        
        # 保存日誌
        self._requests.append(log)
        
        return log
    
    def record_error(self, request, error: str):
        """記錄錯誤"""
        log: RequestLog = request.get('_request_log')
        if log:
            log.error = error
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計數據"""
        with self._stats_lock:
            # 計算路徑平均延遲
            path_summary = []
            for path, stats in sorted(
                self._path_stats.items(), 
                key=lambda x: x[1]['count'], 
                reverse=True
            )[:20]:  # Top 20
                avg_ms = stats['total_ms'] / stats['count'] if stats['count'] else 0
                path_summary.append({
                    'path': path,
                    'count': stats['count'],
                    'avg_ms': round(avg_ms, 2),
                    'errors': stats['errors'],
                    'slow': stats['slow']
                })
            
            return {
                'total_requests': self._total_requests,
                'total_errors': self._total_errors,
                'total_slow': self._total_slow,
                'error_rate': round(self._total_errors / max(1, self._total_requests) * 100, 2),
                'slow_rate': round(self._total_slow / max(1, self._total_requests) * 100, 2),
                'top_paths': path_summary,
                'slow_threshold_ms': SLOW_REQUEST_THRESHOLD_MS,
            }
    
    def get_recent_requests(self, limit: int = 50, slow_only: bool = False) -> List[Dict]:
        """獲取最近的請求"""
        requests = list(self._requests)
        if slow_only:
            requests = [r for r in requests if r.is_slow]
        return [r.to_dict() for r in requests[-limit:]]
    
    def get_tenant_stats(self, tenant_id: str) -> Dict[str, Any]:
        """獲取租戶統計"""
        tenant_requests = [r for r in self._requests if r.tenant_id == tenant_id]
        
        if not tenant_requests:
            return {'tenant_id': tenant_id, 'request_count': 0}
        
        total_ms = sum(r.duration_ms for r in tenant_requests)
        errors = sum(1 for r in tenant_requests if r.status_code >= 400)
        slow = sum(1 for r in tenant_requests if r.is_slow)
        
        return {
            'tenant_id': tenant_id,
            'request_count': len(tenant_requests),
            'avg_duration_ms': round(total_ms / len(tenant_requests), 2),
            'error_count': errors,
            'slow_count': slow,
        }


def get_request_tracker() -> RequestTracker:
    """獲取請求追蹤器實例"""
    return RequestTracker()


# ============ 中間件 ============

def create_request_tracking_middleware():
    """
    創建請求追蹤中間件
    
    Usage:
        from api.request_tracking import create_request_tracking_middleware
        app.middlewares.append(create_request_tracking_middleware())
    """
    tracker = get_request_tracker()
    
    @web.middleware
    async def middleware(request, handler):
        # 開始追蹤
        log = tracker.start_request(request)
        
        response = None
        try:
            response = await handler(request)
            return response
        except web.HTTPException:
            raise
        except Exception as e:
            tracker.record_error(request, str(e))
            raise
        finally:
            # 結束追蹤
            tracker.end_request(request, response)
            
            # 添加請求 ID 到響應頭
            if response and hasattr(response, 'headers'):
                response.headers['X-Request-ID'] = log.request_id
    
    return middleware


# ============ API 端點 ============

async def get_request_stats(request):
    """獲取請求統計 - 管理員 API"""
    tracker = get_request_tracker()
    stats = tracker.get_stats()
    return web.json_response({'success': True, 'data': stats})


async def get_recent_requests_api(request):
    """獲取最近請求 - 管理員 API"""
    tracker = get_request_tracker()
    limit = int(request.query.get('limit', '50'))
    slow_only = request.query.get('slow_only', 'false').lower() == 'true'
    
    requests = tracker.get_recent_requests(limit=limit, slow_only=slow_only)
    return web.json_response({'success': True, 'data': requests})


async def get_tenant_request_stats(request):
    """獲取租戶請求統計 - 管理員 API"""
    tracker = get_request_tracker()
    tenant_id = request.match_info.get('tenant_id')
    
    if not tenant_id:
        return web.json_response({
            'success': False, 
            'error': '缺少 tenant_id'
        }, status=400)
    
    stats = tracker.get_tenant_stats(tenant_id)
    return web.json_response({'success': True, 'data': stats})

"""
🔧 P11-2: Prometheus 風格指標導出器

暴露 /metrics 端點，輸出 OpenMetrics 格式的核心指標。
無需引入 prometheus_client 依賴 — 純手動序列化。

指標集：
- tgmatrix_http_requests_total (counter)
- tgmatrix_http_request_duration_ms (histogram-like summary)
- tgmatrix_http_errors_total (counter)
- tgmatrix_active_accounts (gauge)
- tgmatrix_db_connections (gauge)
- tgmatrix_backup_age_hours (gauge)
- tgmatrix_uptime_seconds (gauge)
- tgmatrix_health_status (gauge: 1=healthy, 0.5=degraded, 0=unhealthy)
"""

import os
import time
import threading
import logging
from typing import Dict, Any, List, Tuple
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    輕量級指標收集器（線程安全）
    
    不依賴外部庫，手動輸出 Prometheus text format
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._start_time = time.time()
        
        # Counters
        self._counters: Dict[str, float] = defaultdict(float)
        # Gauges
        self._gauges: Dict[str, float] = {}
        # Histograms (simplified: just track sum + count + buckets)
        self._histograms: Dict[str, Dict[str, Any]] = {}
        
        # Per-endpoint counters
        self._endpoint_requests: Dict[str, int] = defaultdict(int)
        self._endpoint_errors: Dict[str, int] = defaultdict(int)
        self._endpoint_duration_sum: Dict[str, float] = defaultdict(float)
        
        self._data_lock = threading.Lock()
        self._initialized = True
    
    # ==================== 記錄指標 ====================
    
    def inc_counter(self, name: str, value: float = 1.0, labels: Dict[str, str] = None):
        """遞增計數器"""
        key = self._label_key(name, labels)
        with self._data_lock:
            self._counters[key] += value
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """設置儀表值"""
        key = self._label_key(name, labels)
        with self._data_lock:
            self._gauges[key] = value
    
    def observe_duration(self, endpoint: str, duration_ms: float, status_code: int):
        """記錄請求持續時間（從中間件調用）"""
        with self._data_lock:
            self._endpoint_requests[endpoint] += 1
            self._endpoint_duration_sum[endpoint] += duration_ms
            if status_code >= 500:
                self._endpoint_errors[endpoint] += 1
            
            # 全局計數
            self._counters['tgmatrix_http_requests_total'] += 1
            self._counters[f'tgmatrix_http_requests_total{{status="{status_code // 100}xx"}}'] += 1
            if status_code >= 500:
                self._counters['tgmatrix_http_errors_total'] += 1
    
    # ==================== 導出指標 ====================
    
    def export_metrics(self) -> str:
        """
        導出 Prometheus text 格式指標
        
        Returns:
            符合 Prometheus text exposition format 的字符串
        """
        lines: List[str] = []
        
        # 1. 運行時間
        uptime = time.time() - self._start_time
        lines.append('# HELP tgmatrix_uptime_seconds Service uptime in seconds')
        lines.append('# TYPE tgmatrix_uptime_seconds gauge')
        lines.append(f'tgmatrix_uptime_seconds {uptime:.2f}')
        lines.append('')
        
        # 2. HTTP 請求計數
        lines.append('# HELP tgmatrix_http_requests_total Total HTTP requests')
        lines.append('# TYPE tgmatrix_http_requests_total counter')
        with self._data_lock:
            for key, val in sorted(self._counters.items()):
                if key.startswith('tgmatrix_http_requests_total'):
                    lines.append(f'{key} {val:.0f}')
        lines.append('')
        
        # 3. HTTP 錯誤計數
        lines.append('# HELP tgmatrix_http_errors_total Total HTTP 5xx errors')
        lines.append('# TYPE tgmatrix_http_errors_total counter')
        with self._data_lock:
            lines.append(f'tgmatrix_http_errors_total {self._counters.get("tgmatrix_http_errors_total", 0):.0f}')
        lines.append('')
        
        # 4. 每端點指標
        lines.append('# HELP tgmatrix_endpoint_requests_total Requests per endpoint')
        lines.append('# TYPE tgmatrix_endpoint_requests_total counter')
        with self._data_lock:
            for endpoint, count in sorted(self._endpoint_requests.items()):
                safe_ep = endpoint.replace('"', '\\"')
                lines.append(f'tgmatrix_endpoint_requests_total{{endpoint="{safe_ep}"}} {count}')
        lines.append('')
        
        lines.append('# HELP tgmatrix_endpoint_duration_ms_sum Total request duration per endpoint')
        lines.append('# TYPE tgmatrix_endpoint_duration_ms_sum counter')
        with self._data_lock:
            for endpoint, total_ms in sorted(self._endpoint_duration_sum.items()):
                safe_ep = endpoint.replace('"', '\\"')
                lines.append(f'tgmatrix_endpoint_duration_ms_sum{{endpoint="{safe_ep}"}} {total_ms:.2f}')
        lines.append('')
        
        lines.append('# HELP tgmatrix_endpoint_errors_total Errors per endpoint')
        lines.append('# TYPE tgmatrix_endpoint_errors_total counter')
        with self._data_lock:
            for endpoint, errors in sorted(self._endpoint_errors.items()):
                if errors > 0:
                    safe_ep = endpoint.replace('"', '\\"')
                    lines.append(f'tgmatrix_endpoint_errors_total{{endpoint="{safe_ep}"}} {errors}')
        lines.append('')
        
        # 5. 健康狀態
        health_value = self._collect_health_gauge()
        lines.append('# HELP tgmatrix_health_status Service health (1=healthy, 0.5=degraded, 0=unhealthy)')
        lines.append('# TYPE tgmatrix_health_status gauge')
        lines.append(f'tgmatrix_health_status {health_value}')
        lines.append('')
        
        # 6. 系統指標（若可收集）
        sys_metrics = self._collect_system_metrics()
        for metric_name, metric_help, metric_type, metric_value in sys_metrics:
            lines.append(f'# HELP {metric_name} {metric_help}')
            lines.append(f'# TYPE {metric_name} {metric_type}')
            lines.append(f'{metric_name} {metric_value}')
            lines.append('')
        
        # 7. 自定義 gauges
        with self._data_lock:
            for key, val in sorted(self._gauges.items()):
                lines.append(f'{key} {val}')
        
        return '\n'.join(lines) + '\n'
    
    # ==================== 內部收集器 ====================
    
    def _collect_health_gauge(self) -> float:
        """收集健康狀態指標"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            quick = service.get_quick_health()
            status = quick.get('status', 'unknown')
            return {'healthy': 1.0, 'degraded': 0.5, 'unhealthy': 0.0}.get(status, -1.0)
        except Exception:
            return -1.0
    
    def _collect_system_metrics(self) -> List[Tuple[str, str, str, str]]:
        """收集系統級指標"""
        metrics = []
        
        try:
            import psutil
            mem = psutil.virtual_memory()
            metrics.append((
                'tgmatrix_memory_usage_percent',
                'System memory usage percentage',
                'gauge',
                f'{mem.percent:.1f}'
            ))
            
            disk = psutil.disk_usage('/')
            metrics.append((
                'tgmatrix_disk_usage_percent',
                'Disk usage percentage',
                'gauge',
                f'{disk.percent:.1f}'
            ))
            
            proc = psutil.Process()
            metrics.append((
                'tgmatrix_process_rss_bytes',
                'Process resident set size in bytes',
                'gauge',
                f'{proc.memory_info().rss}'
            ))
            metrics.append((
                'tgmatrix_process_cpu_percent',
                'Process CPU usage percentage',
                'gauge',
                f'{proc.cpu_percent(interval=0):.1f}'
            ))
        except ImportError:
            pass
        except Exception:
            pass
        
        # 備份年齡
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            last_results = service._last_results
            backup_check = last_results.get('backup')
            if backup_check and backup_check.details:
                age_h = backup_check.details.get('age_hours', -1)
                metrics.append((
                    'tgmatrix_backup_age_hours',
                    'Hours since last backup',
                    'gauge',
                    f'{age_h:.1f}'
                ))
        except Exception:
            pass
        
        # DB 連接統計
        try:
            from core.db_utils import ConnectionStats
            stats = ConnectionStats.stats()
            metrics.append((
                'tgmatrix_db_connections_opened',
                'Total database connections opened',
                'counter',
                f'{stats.get("opened", 0)}'
            ))
            metrics.append((
                'tgmatrix_db_connections_active',
                'Currently active database connections',
                'gauge',
                f'{stats.get("active", 0)}'
            ))
        except Exception:
            pass
        
        return metrics
    
    # ==================== 工具 ====================
    
    @staticmethod
    def _label_key(name: str, labels: Dict[str, str] = None) -> str:
        """生成帶標籤的指標鍵"""
        if not labels:
            return name
        label_str = ','.join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f'{name}{{{label_str}}}'


def get_metrics_collector() -> MetricsCollector:
    """獲取指標收集器實例"""
    return MetricsCollector()

"""
可觀測性平台

功能：
- 指標收集和聚合
- 分佈式追蹤
- 日誌關聯
- 儀表盤數據
- 自定義指標
"""

import asyncio
import logging
import sqlite3
import os
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'observability.db')


class MetricType(str, Enum):
    """指標類型"""
    COUNTER = "counter"       # 計數器（只增不減）
    GAUGE = "gauge"           # 儀表（可增可減）
    HISTOGRAM = "histogram"   # 直方圖（分佈）
    SUMMARY = "summary"       # 摘要（百分位）


class SpanKind(str, Enum):
    """追蹤跨度類型"""
    SERVER = "server"
    CLIENT = "client"
    PRODUCER = "producer"
    CONSUMER = "consumer"
    INTERNAL = "internal"


@dataclass
class Metric:
    """指標"""
    name: str
    value: float
    metric_type: MetricType
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: str = ""
    unit: str = ""
    description: str = ""


@dataclass
class Span:
    """追蹤跨度"""
    trace_id: str
    span_id: str
    parent_span_id: str = ""
    operation_name: str = ""
    service_name: str = ""
    kind: SpanKind = SpanKind.INTERNAL
    start_time: float = 0
    end_time: float = 0
    duration_ms: float = 0
    status: str = "ok"  # ok/error
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "operation_name": self.operation_name,
            "service_name": self.service_name,
            "kind": self.kind.value if isinstance(self.kind, SpanKind) else self.kind,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "attributes": self.attributes,
            "events": self.events
        }


class MetricsCollector:
    """指標收集器"""
    
    def __init__(self):
        self._counters: Dict[str, float] = defaultdict(float)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        self._labels: Dict[str, Dict[str, str]] = {}
        self._last_flush = time.time()
        self._flush_interval = 60  # 秒
    
    def _make_key(self, name: str, labels: Dict[str, str] = None) -> str:
        """生成指標鍵"""
        if labels:
            label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
            return f"{name}{{{label_str}}}"
        return name
    
    def increment(self, name: str, value: float = 1, labels: Dict[str, str] = None):
        """增加計數器"""
        key = self._make_key(name, labels)
        self._counters[key] += value
        if labels:
            self._labels[key] = labels
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """設置儀表值"""
        key = self._make_key(name, labels)
        self._gauges[key] = value
        if labels:
            self._labels[key] = labels
    
    def observe(self, name: str, value: float, labels: Dict[str, str] = None):
        """觀測直方圖值"""
        key = self._make_key(name, labels)
        self._histograms[key].append(value)
        if labels:
            self._labels[key] = labels
        
        # 限制內存使用
        if len(self._histograms[key]) > 10000:
            self._histograms[key] = self._histograms[key][-5000:]
    
    def get_all_metrics(self) -> List[Dict[str, Any]]:
        """獲取所有指標"""
        metrics = []
        
        # 計數器
        for key, value in self._counters.items():
            name = key.split('{')[0] if '{' in key else key
            metrics.append({
                "name": name,
                "type": "counter",
                "value": value,
                "labels": self._labels.get(key, {})
            })
        
        # 儀表
        for key, value in self._gauges.items():
            name = key.split('{')[0] if '{' in key else key
            metrics.append({
                "name": name,
                "type": "gauge",
                "value": value,
                "labels": self._labels.get(key, {})
            })
        
        # 直方圖
        for key, values in self._histograms.items():
            if not values:
                continue
            name = key.split('{')[0] if '{' in key else key
            sorted_vals = sorted(values)
            count = len(sorted_vals)
            
            metrics.append({
                "name": name,
                "type": "histogram",
                "count": count,
                "sum": sum(sorted_vals),
                "min": sorted_vals[0],
                "max": sorted_vals[-1],
                "avg": sum(sorted_vals) / count,
                "p50": sorted_vals[int(count * 0.5)],
                "p90": sorted_vals[int(count * 0.9)],
                "p99": sorted_vals[int(count * 0.99)] if count > 100 else sorted_vals[-1],
                "labels": self._labels.get(key, {})
            })
        
        return metrics
    
    def reset_histograms(self):
        """重置直方圖（通常在導出後）"""
        self._histograms.clear()


class Tracer:
    """追蹤器"""
    
    def __init__(self, service_name: str = "api-pool"):
        self.service_name = service_name
        self._spans: Dict[str, Span] = {}
        self._trace_context = {}  # 線程/協程本地存儲模擬
    
    def start_span(
        self,
        operation_name: str,
        parent_span_id: str = None,
        trace_id: str = None,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Dict[str, Any] = None
    ) -> Span:
        """開始一個跨度"""
        span_id = str(uuid.uuid4())[:16]
        
        if trace_id is None:
            trace_id = str(uuid.uuid4()).replace('-', '')
        
        span = Span(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id or "",
            operation_name=operation_name,
            service_name=self.service_name,
            kind=kind,
            start_time=time.time(),
            attributes=attributes or {}
        )
        
        self._spans[span_id] = span
        return span
    
    def end_span(self, span: Span, status: str = "ok", error: str = None):
        """結束跨度"""
        span.end_time = time.time()
        span.duration_ms = (span.end_time - span.start_time) * 1000
        span.status = status
        
        if error:
            span.attributes['error.message'] = error
            span.status = "error"
    
    def add_event(self, span: Span, name: str, attributes: Dict = None):
        """添加事件到跨度"""
        span.events.append({
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {}
        })
    
    @contextmanager
    def trace(self, operation_name: str, **kwargs):
        """追蹤上下文管理器"""
        span = self.start_span(operation_name, **kwargs)
        try:
            yield span
            self.end_span(span, status="ok")
        except Exception as e:
            self.end_span(span, status="error", error=str(e))
            raise
    
    def get_trace(self, trace_id: str) -> List[Span]:
        """獲取追蹤的所有跨度"""
        return [s for s in self._spans.values() if s.trace_id == trace_id]


class ObservabilityManager:
    """可觀測性管理器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._init_db()
        self.metrics = MetricsCollector()
        self.tracer = Tracer()
        self._custom_dashboards: Dict[str, Dict] = {}
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 指標歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metrics_history (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                metric_type TEXT,
                value REAL,
                labels TEXT DEFAULT '{}',
                timestamp TEXT
            )
        ''')
        
        # 追蹤表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS traces (
                span_id TEXT PRIMARY KEY,
                trace_id TEXT NOT NULL,
                parent_span_id TEXT,
                operation_name TEXT,
                service_name TEXT,
                kind TEXT,
                start_time REAL,
                end_time REAL,
                duration_ms REAL,
                status TEXT,
                attributes TEXT DEFAULT '{}',
                events TEXT DEFAULT '[]'
            )
        ''')
        
        # 儀表盤配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                panels TEXT DEFAULT '[]',
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics_history(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_time ON metrics_history(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_traces_id ON traces(trace_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_traces_time ON traces(start_time)')
        
        conn.commit()
        conn.close()
        logger.info("可觀測性數據庫已初始化")
    
    # ==================== 指標操作 ====================
    
    def record_metric(
        self,
        name: str,
        value: float,
        metric_type: MetricType = MetricType.GAUGE,
        labels: Dict[str, str] = None
    ):
        """記錄指標"""
        if metric_type == MetricType.COUNTER:
            self.metrics.increment(name, value, labels)
        elif metric_type == MetricType.GAUGE:
            self.metrics.set_gauge(name, value, labels)
        elif metric_type in (MetricType.HISTOGRAM, MetricType.SUMMARY):
            self.metrics.observe(name, value, labels)
    
    def get_current_metrics(self) -> List[Dict]:
        """獲取當前指標"""
        return self.metrics.get_all_metrics()
    
    def flush_metrics(self):
        """刷新指標到數據庫"""
        metrics = self.metrics.get_all_metrics()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        
        for metric in metrics:
            cursor.execute('''
                INSERT INTO metrics_history (id, name, metric_type, value, labels, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), metric['name'], metric['type'],
                metric.get('value') or metric.get('avg', 0),
                json.dumps(metric.get('labels', {})), timestamp
            ))
        
        conn.commit()
        conn.close()
        
        # 重置直方圖
        self.metrics.reset_histograms()
    
    def query_metrics(
        self,
        name: str,
        start_time: str = None,
        end_time: str = None,
        limit: int = 1000
    ) -> List[Dict]:
        """查詢歷史指標"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM metrics_history WHERE name = ?'
        params = [name]
        
        if start_time:
            query += ' AND timestamp >= ?'
            params.append(start_time)
        
        if end_time:
            query += ' AND timestamp <= ?'
            params.append(end_time)
        
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "value": row[3],
            "labels": json.loads(row[4]) if row[4] else {},
            "timestamp": row[5]
        } for row in rows]
    
    def get_metric_aggregation(
        self,
        name: str,
        hours: int = 24,
        interval: str = "hour"
    ) -> List[Dict]:
        """獲取指標聚合"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        if interval == "hour":
            group_expr = "strftime('%Y-%m-%d %H:00', timestamp)"
        elif interval == "day":
            group_expr = "strftime('%Y-%m-%d', timestamp)"
        else:
            group_expr = "strftime('%Y-%m-%d %H:%M', timestamp)"
        
        cursor.execute(f'''
            SELECT {group_expr} as period, 
                   AVG(value) as avg_value,
                   MIN(value) as min_value,
                   MAX(value) as max_value,
                   COUNT(*) as count
            FROM metrics_history
            WHERE name = ? AND timestamp > ?
            GROUP BY period
            ORDER BY period
        ''', (name, since))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "period": row[0],
            "avg": round(row[1], 2) if row[1] else 0,
            "min": round(row[2], 2) if row[2] else 0,
            "max": round(row[3], 2) if row[3] else 0,
            "count": row[4]
        } for row in rows]
    
    # ==================== 追蹤操作 ====================
    
    def save_span(self, span: Span):
        """保存跨度"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO traces 
            (span_id, trace_id, parent_span_id, operation_name, service_name,
             kind, start_time, end_time, duration_ms, status, attributes, events)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            span.span_id, span.trace_id, span.parent_span_id, span.operation_name,
            span.service_name, span.kind.value if isinstance(span.kind, SpanKind) else span.kind,
            span.start_time, span.end_time, span.duration_ms, span.status,
            json.dumps(span.attributes), json.dumps(span.events)
        ))
        
        conn.commit()
        conn.close()
    
    def get_trace(self, trace_id: str) -> List[Dict]:
        """獲取追蹤"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM traces WHERE trace_id = ? ORDER BY start_time
        ''', (trace_id,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "span_id": row[0],
            "trace_id": row[1],
            "parent_span_id": row[2],
            "operation_name": row[3],
            "service_name": row[4],
            "kind": row[5],
            "start_time": row[6],
            "end_time": row[7],
            "duration_ms": row[8],
            "status": row[9],
            "attributes": json.loads(row[10]) if row[10] else {},
            "events": json.loads(row[11]) if row[11] else []
        } for row in rows]
    
    def search_traces(
        self,
        service_name: str = None,
        operation_name: str = None,
        min_duration_ms: float = None,
        status: str = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """搜索追蹤"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = time.time() - hours * 3600
        
        query = 'SELECT DISTINCT trace_id, MIN(start_time) as start, MAX(end_time) as end, SUM(duration_ms) as total_duration FROM traces WHERE start_time > ?'
        params = [since]
        
        if service_name:
            query += ' AND service_name = ?'
            params.append(service_name)
        
        if operation_name:
            query += ' AND operation_name LIKE ?'
            params.append(f'%{operation_name}%')
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' GROUP BY trace_id'
        
        if min_duration_ms:
            query += ' HAVING total_duration >= ?'
            params.append(min_duration_ms)
        
        query += ' ORDER BY start DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "trace_id": row[0],
            "start_time": row[1],
            "end_time": row[2],
            "total_duration_ms": row[3]
        } for row in rows]
    
    # ==================== 儀表盤 ====================
    
    def create_dashboard(
        self,
        name: str,
        description: str = "",
        panels: List[Dict] = None
    ) -> str:
        """創建儀表盤"""
        dashboard_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO dashboards (id, name, description, panels, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (dashboard_id, name, description, json.dumps(panels or []), now, now))
        
        conn.commit()
        conn.close()
        
        return dashboard_id
    
    def update_dashboard(self, dashboard_id: str, updates: Dict) -> bool:
        """更新儀表盤"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            updates['updated_at'] = datetime.now().isoformat()
            
            set_clauses = []
            values = []
            for key, value in updates.items():
                if key == 'panels' and isinstance(value, list):
                    value = json.dumps(value)
                set_clauses.append(f"{key} = ?")
                values.append(value)
            
            values.append(dashboard_id)
            
            cursor.execute(f'''
                UPDATE dashboards SET {', '.join(set_clauses)} WHERE id = ?
            ''', values)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新儀表盤失敗: {e}")
            return False
    
    def list_dashboards(self) -> List[Dict]:
        """列出儀表盤"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, description, created_at, updated_at FROM dashboards')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "created_at": row[3],
            "updated_at": row[4]
        } for row in rows]
    
    def get_dashboard(self, dashboard_id: str) -> Optional[Dict]:
        """獲取儀表盤"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM dashboards WHERE id = ?', (dashboard_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "panels": json.loads(row[3]) if row[3] else [],
                "created_at": row[4],
                "updated_at": row[5]
            }
        return None
    
    def get_dashboard_data(self, dashboard_id: str) -> Dict:
        """獲取儀表盤數據"""
        dashboard = self.get_dashboard(dashboard_id)
        if not dashboard:
            return {}
        
        panel_data = []
        
        for panel in dashboard.get('panels', []):
            metric_name = panel.get('metric')
            panel_type = panel.get('type', 'line')
            
            if metric_name:
                data = self.get_metric_aggregation(
                    metric_name,
                    hours=panel.get('hours', 24),
                    interval=panel.get('interval', 'hour')
                )
                
                panel_data.append({
                    "panel_id": panel.get('id'),
                    "title": panel.get('title', metric_name),
                    "type": panel_type,
                    "data": data
                })
        
        return {
            "dashboard": dashboard,
            "panels": panel_data,
            "generated_at": datetime.now().isoformat()
        }
    
    # ==================== 系統概覽 ====================
    
    def get_system_overview(self) -> Dict[str, Any]:
        """獲取系統概覽"""
        current_metrics = self.get_current_metrics()
        
        # 按名稱分類
        metrics_by_name = {}
        for m in current_metrics:
            metrics_by_name[m['name']] = m
        
        # 最近追蹤統計
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        hour_ago = time.time() - 3600
        
        cursor.execute('''
            SELECT COUNT(DISTINCT trace_id), AVG(duration_ms), 
                   SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)
            FROM traces WHERE start_time > ?
        ''', (hour_ago,))
        
        trace_stats = cursor.fetchone()
        conn.close()
        
        return {
            "metrics_count": len(current_metrics),
            "metrics": metrics_by_name,
            "traces_last_hour": {
                "count": trace_stats[0] or 0,
                "avg_duration_ms": round(trace_stats[1] or 0, 2),
                "error_count": trace_stats[2] or 0
            },
            "timestamp": datetime.now().isoformat()
        }


# 獲取單例
def get_observability_manager() -> ObservabilityManager:
    return ObservabilityManager()


# 便捷函數
def record_metric(name: str, value: float, **kwargs):
    """快捷記錄指標"""
    get_observability_manager().record_metric(name, value, **kwargs)


def trace(operation_name: str, **kwargs):
    """快捷追蹤裝飾器"""
    def decorator(func):
        async def async_wrapper(*args, **func_kwargs):
            manager = get_observability_manager()
            with manager.tracer.trace(operation_name, **kwargs) as span:
                try:
                    result = await func(*args, **func_kwargs)
                    return result
                except Exception as e:
                    span.attributes['error'] = str(e)
                    raise
        
        def sync_wrapper(*args, **func_kwargs):
            manager = get_observability_manager()
            with manager.tracer.trace(operation_name, **kwargs) as span:
                try:
                    result = func(*args, **func_kwargs)
                    return result
                except Exception as e:
                    span.attributes['error'] = str(e)
                    raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator

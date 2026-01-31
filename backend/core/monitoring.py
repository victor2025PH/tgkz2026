"""
系統監控和告警服務

優化設計：
1. 多維度指標收集
2. 異常檢測和告警
3. 健康檢查端點
4. 指標導出（Prometheus 格式）
"""

import os
import time
import asyncio
import sqlite3
import psutil
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from collections import deque
from enum import Enum

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


class AlertStatus(str, Enum):
    ACTIVE = 'active'
    ACKNOWLEDGED = 'acknowledged'
    RESOLVED = 'resolved'


@dataclass
class SystemMetrics:
    """系統指標"""
    timestamp: str
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used_mb: float = 0.0
    memory_total_mb: float = 0.0
    disk_percent: float = 0.0
    disk_used_gb: float = 0.0
    disk_total_gb: float = 0.0
    active_connections: int = 0
    request_count: int = 0
    error_count: int = 0
    avg_response_time_ms: float = 0.0
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Alert:
    """告警"""
    id: str
    type: str
    severity: AlertSeverity
    message: str
    status: AlertStatus = AlertStatus.ACTIVE
    source: str = ''
    details: Dict = field(default_factory=dict)
    created_at: str = ''
    resolved_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['severity'] = self.severity.value
        d['status'] = self.status.value
        return d


@dataclass
class HealthCheckResult:
    """健康檢查結果"""
    name: str
    status: str  # healthy, degraded, unhealthy
    message: str = ''
    latency_ms: float = 0.0
    details: Dict = field(default_factory=dict)


class SystemMonitor:
    """系統監控服務"""
    
    _instance = None
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        # 指標歷史（內存中保留最近 1 小時）
        self._metrics_history: deque = deque(maxlen=60)
        
        # 請求統計
        self._request_count = 0
        self._error_count = 0
        self._response_times: deque = deque(maxlen=1000)
        
        # 活動連接
        self._active_connections = 0
        
        # 告警閾值
        self._thresholds = {
            'cpu_percent': 80,
            'memory_percent': 85,
            'disk_percent': 90,
            'error_rate': 0.1,  # 10%
            'response_time_ms': 5000
        }
        
        # 告警
        self._active_alerts: Dict[str, Alert] = {}
        
        # 初始化
        self._init_db()
        self._running = False
        self._monitor_task = None
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 指標歷史表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    cpu_percent REAL,
                    memory_percent REAL,
                    disk_percent REAL,
                    request_count INTEGER,
                    error_count INTEGER,
                    avg_response_time_ms REAL
                )
            ''')
            
            # 告警歷史表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    severity TEXT,
                    message TEXT,
                    status TEXT DEFAULT 'active',
                    source TEXT,
                    details TEXT,
                    created_at TEXT,
                    resolved_at TEXT
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics_history(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)')
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Monitor DB init error: {e}")
    
    # ==================== 指標收集 ====================
    
    def collect_metrics(self) -> SystemMetrics:
        """收集當前系統指標"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # 內存
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / (1024 * 1024)
            memory_total_mb = memory.total / (1024 * 1024)
            
            # 磁盤
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used_gb = disk.used / (1024 * 1024 * 1024)
            disk_total_gb = disk.total / (1024 * 1024 * 1024)
            
            # 請求統計
            avg_response_time = 0.0
            if self._response_times:
                avg_response_time = sum(self._response_times) / len(self._response_times)
            
            metrics = SystemMetrics(
                timestamp=datetime.utcnow().isoformat(),
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                memory_used_mb=memory_used_mb,
                memory_total_mb=memory_total_mb,
                disk_percent=disk_percent,
                disk_used_gb=disk_used_gb,
                disk_total_gb=disk_total_gb,
                active_connections=self._active_connections,
                request_count=self._request_count,
                error_count=self._error_count,
                avg_response_time_ms=avg_response_time
            )
            
            return metrics
        except Exception as e:
            logger.error(f"Collect metrics error: {e}")
            return SystemMetrics(timestamp=datetime.utcnow().isoformat())
    
    def record_request(self, response_time_ms: float, is_error: bool = False):
        """記錄請求"""
        self._request_count += 1
        self._response_times.append(response_time_ms)
        
        if is_error:
            self._error_count += 1
    
    def connection_opened(self):
        """連接打開"""
        self._active_connections += 1
    
    def connection_closed(self):
        """連接關閉"""
        self._active_connections = max(0, self._active_connections - 1)
    
    # ==================== 健康檢查 ====================
    
    async def health_check(self) -> Dict[str, Any]:
        """執行健康檢查"""
        checks: List[HealthCheckResult] = []
        overall_status = 'healthy'
        
        # 數據庫檢查
        db_check = await self._check_database()
        checks.append(db_check)
        if db_check.status != 'healthy':
            overall_status = 'degraded'
        
        # Redis 檢查
        redis_check = await self._check_redis()
        checks.append(redis_check)
        if redis_check.status == 'unhealthy':
            overall_status = 'degraded'
        
        # 系統資源檢查
        resource_check = self._check_resources()
        checks.append(resource_check)
        if resource_check.status != 'healthy':
            overall_status = 'degraded' if resource_check.status == 'degraded' else 'unhealthy'
        
        # 磁盤空間檢查
        disk_check = self._check_disk()
        checks.append(disk_check)
        if disk_check.status != 'healthy':
            overall_status = 'degraded' if disk_check.status == 'degraded' else 'unhealthy'
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'checks': [asdict(c) for c in checks]
        }
    
    async def _check_database(self) -> HealthCheckResult:
        """檢查數據庫"""
        start = time.time()
        try:
            conn = sqlite3.connect(self.db_path, timeout=5)
            cursor = conn.cursor()
            cursor.execute('SELECT 1')
            conn.close()
            
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                name='database',
                status='healthy',
                latency_ms=latency
            )
        except Exception as e:
            return HealthCheckResult(
                name='database',
                status='unhealthy',
                message=str(e)
            )
    
    async def _check_redis(self) -> HealthCheckResult:
        """檢查 Redis"""
        start = time.time()
        try:
            import redis
            r = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
            r.ping()
            
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                name='redis',
                status='healthy',
                latency_ms=latency
            )
        except Exception as e:
            return HealthCheckResult(
                name='redis',
                status='degraded',  # Redis 不可用時降級運行
                message=str(e)
            )
    
    def _check_resources(self) -> HealthCheckResult:
        """檢查系統資源"""
        try:
            cpu = psutil.cpu_percent()
            memory = psutil.virtual_memory().percent
            
            status = 'healthy'
            messages = []
            
            if cpu > self._thresholds['cpu_percent']:
                status = 'degraded'
                messages.append(f'CPU 使用率過高: {cpu}%')
            
            if memory > self._thresholds['memory_percent']:
                status = 'degraded'
                messages.append(f'內存使用率過高: {memory}%')
            
            return HealthCheckResult(
                name='resources',
                status=status,
                message='; '.join(messages) if messages else 'OK',
                details={'cpu_percent': cpu, 'memory_percent': memory}
            )
        except Exception as e:
            return HealthCheckResult(
                name='resources',
                status='unhealthy',
                message=str(e)
            )
    
    def _check_disk(self) -> HealthCheckResult:
        """檢查磁盤空間"""
        try:
            disk = psutil.disk_usage('/')
            
            if disk.percent > self._thresholds['disk_percent']:
                return HealthCheckResult(
                    name='disk',
                    status='degraded' if disk.percent < 95 else 'unhealthy',
                    message=f'磁盤使用率過高: {disk.percent}%',
                    details={'percent': disk.percent, 'free_gb': disk.free / (1024**3)}
                )
            
            return HealthCheckResult(
                name='disk',
                status='healthy',
                details={'percent': disk.percent, 'free_gb': disk.free / (1024**3)}
            )
        except Exception as e:
            return HealthCheckResult(
                name='disk',
                status='unhealthy',
                message=str(e)
            )
    
    # ==================== 告警管理 ====================
    
    def check_alerts(self, metrics: SystemMetrics):
        """檢查告警條件"""
        import uuid
        
        alerts_to_create = []
        alerts_to_resolve = []
        
        # CPU 告警
        cpu_alert_key = 'high_cpu'
        if metrics.cpu_percent > self._thresholds['cpu_percent']:
            if cpu_alert_key not in self._active_alerts:
                alerts_to_create.append(Alert(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    type=cpu_alert_key,
                    severity=AlertSeverity.WARNING,
                    message=f'CPU 使用率過高: {metrics.cpu_percent}%',
                    source='system_monitor',
                    created_at=datetime.utcnow().isoformat()
                ))
        elif cpu_alert_key in self._active_alerts:
            alerts_to_resolve.append(cpu_alert_key)
        
        # 內存告警
        mem_alert_key = 'high_memory'
        if metrics.memory_percent > self._thresholds['memory_percent']:
            if mem_alert_key not in self._active_alerts:
                alerts_to_create.append(Alert(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    type=mem_alert_key,
                    severity=AlertSeverity.WARNING,
                    message=f'內存使用率過高: {metrics.memory_percent}%',
                    source='system_monitor',
                    created_at=datetime.utcnow().isoformat()
                ))
        elif mem_alert_key in self._active_alerts:
            alerts_to_resolve.append(mem_alert_key)
        
        # 磁盤告警
        disk_alert_key = 'high_disk'
        if metrics.disk_percent > self._thresholds['disk_percent']:
            severity = AlertSeverity.CRITICAL if metrics.disk_percent > 95 else AlertSeverity.WARNING
            if disk_alert_key not in self._active_alerts:
                alerts_to_create.append(Alert(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    type=disk_alert_key,
                    severity=severity,
                    message=f'磁盤使用率過高: {metrics.disk_percent}%',
                    source='system_monitor',
                    created_at=datetime.utcnow().isoformat()
                ))
        elif disk_alert_key in self._active_alerts:
            alerts_to_resolve.append(disk_alert_key)
        
        # 響應時間告警
        rt_alert_key = 'slow_response'
        if metrics.avg_response_time_ms > self._thresholds['response_time_ms']:
            if rt_alert_key not in self._active_alerts:
                alerts_to_create.append(Alert(
                    id=f"alert_{uuid.uuid4().hex[:8]}",
                    type=rt_alert_key,
                    severity=AlertSeverity.WARNING,
                    message=f'平均響應時間過長: {metrics.avg_response_time_ms:.0f}ms',
                    source='system_monitor',
                    created_at=datetime.utcnow().isoformat()
                ))
        elif rt_alert_key in self._active_alerts:
            alerts_to_resolve.append(rt_alert_key)
        
        # 處理告警
        for alert in alerts_to_create:
            self._active_alerts[alert.type] = alert
            self._save_alert(alert)
            logger.warning(f"Alert created: {alert.message}")
        
        for alert_type in alerts_to_resolve:
            alert = self._active_alerts.pop(alert_type, None)
            if alert:
                alert.status = AlertStatus.RESOLVED
                alert.resolved_at = datetime.utcnow().isoformat()
                self._save_alert(alert)
                logger.info(f"Alert resolved: {alert.type}")
    
    def _save_alert(self, alert: Alert):
        """保存告警到數據庫"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            import json
            cursor.execute('''
                INSERT OR REPLACE INTO alerts 
                (id, type, severity, message, status, source, details, created_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id, alert.type, alert.severity.value, alert.message,
                alert.status.value, alert.source, json.dumps(alert.details),
                alert.created_at, alert.resolved_at
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save alert error: {e}")
    
    async def get_alerts(
        self,
        status: str = None,
        limit: int = 50
    ) -> List[Alert]:
        """獲取告警列表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if status:
                cursor.execute('''
                    SELECT * FROM alerts 
                    WHERE status = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (status, limit))
            else:
                cursor.execute('''
                    SELECT * FROM alerts 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (limit,))
            
            alerts = []
            for row in cursor.fetchall():
                import json
                alerts.append(Alert(
                    id=row['id'],
                    type=row['type'],
                    severity=AlertSeverity(row['severity']),
                    message=row['message'],
                    status=AlertStatus(row['status']),
                    source=row['source'],
                    details=json.loads(row['details']) if row['details'] else {},
                    created_at=row['created_at'],
                    resolved_at=row['resolved_at'] or ''
                ))
            
            conn.close()
            return alerts
        except Exception as e:
            logger.error(f"Get alerts error: {e}")
            return []
    
    # ==================== Prometheus 指標 ====================
    
    def get_prometheus_metrics(self) -> str:
        """獲取 Prometheus 格式指標"""
        metrics = self.collect_metrics()
        
        lines = [
            '# HELP tgmatrix_cpu_percent CPU usage percentage',
            '# TYPE tgmatrix_cpu_percent gauge',
            f'tgmatrix_cpu_percent {metrics.cpu_percent}',
            '',
            '# HELP tgmatrix_memory_percent Memory usage percentage',
            '# TYPE tgmatrix_memory_percent gauge',
            f'tgmatrix_memory_percent {metrics.memory_percent}',
            '',
            '# HELP tgmatrix_disk_percent Disk usage percentage',
            '# TYPE tgmatrix_disk_percent gauge',
            f'tgmatrix_disk_percent {metrics.disk_percent}',
            '',
            '# HELP tgmatrix_active_connections Active connections',
            '# TYPE tgmatrix_active_connections gauge',
            f'tgmatrix_active_connections {metrics.active_connections}',
            '',
            '# HELP tgmatrix_request_total Total requests',
            '# TYPE tgmatrix_request_total counter',
            f'tgmatrix_request_total {metrics.request_count}',
            '',
            '# HELP tgmatrix_error_total Total errors',
            '# TYPE tgmatrix_error_total counter',
            f'tgmatrix_error_total {metrics.error_count}',
            '',
            '# HELP tgmatrix_response_time_avg_ms Average response time',
            '# TYPE tgmatrix_response_time_avg_ms gauge',
            f'tgmatrix_response_time_avg_ms {metrics.avg_response_time_ms:.2f}',
        ]
        
        return '\n'.join(lines)
    
    # ==================== 監控循環 ====================
    
    async def start(self):
        """啟動監控"""
        if self._running:
            return
        
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("System monitor started")
    
    async def stop(self):
        """停止監控"""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("System monitor stopped")
    
    async def _monitor_loop(self):
        """監控循環"""
        while self._running:
            try:
                # 收集指標
                metrics = self.collect_metrics()
                self._metrics_history.append(metrics)
                
                # 檢查告警
                self.check_alerts(metrics)
                
                # 每分鐘保存一次歷史
                await self._save_metrics_history(metrics)
                
                # 等待 60 秒
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                await asyncio.sleep(10)
    
    async def _save_metrics_history(self, metrics: SystemMetrics):
        """保存指標歷史"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO metrics_history 
                (timestamp, cpu_percent, memory_percent, disk_percent,
                 request_count, error_count, avg_response_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics.timestamp, metrics.cpu_percent, metrics.memory_percent,
                metrics.disk_percent, metrics.request_count, metrics.error_count,
                metrics.avg_response_time_ms
            ))
            
            # 清理舊數據（保留 7 天）
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            cursor.execute('DELETE FROM metrics_history WHERE timestamp < ?', (week_ago,))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save metrics history error: {e}")


# ==================== 單例訪問 ====================

_system_monitor: Optional[SystemMonitor] = None


def get_system_monitor() -> SystemMonitor:
    global _system_monitor
    if _system_monitor is None:
        _system_monitor = SystemMonitor()
    return _system_monitor

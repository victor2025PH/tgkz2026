"""
健康檢查與高可用服務

功能：
1. 服務健康檢查
2. 依賴項監控
3. 熔斷器模式
4. 降級策略
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import threading
import time

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class HealthStatus(str, Enum):
    HEALTHY = 'healthy'
    DEGRADED = 'degraded'
    UNHEALTHY = 'unhealthy'
    UNKNOWN = 'unknown'


class CircuitState(str, Enum):
    CLOSED = 'closed'       # 正常
    OPEN = 'open'           # 熔斷
    HALF_OPEN = 'half_open' # 半開（測試中）


# ==================== 數據模型 ====================

@dataclass
class HealthCheck:
    """健康檢查結果"""
    name: str
    status: HealthStatus
    latency_ms: float = 0
    message: str = ''
    last_check: str = ''
    details: Dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'status': self.status.value,
            'latency_ms': self.latency_ms,
            'message': self.message,
            'last_check': self.last_check,
            'details': self.details
        }


@dataclass
class ServiceHealth:
    """服務健康狀態"""
    status: HealthStatus
    version: str
    uptime_seconds: float
    checks: List[HealthCheck]
    timestamp: str
    
    def to_dict(self) -> dict:
        return {
            'status': self.status.value,
            'version': self.version,
            'uptime_seconds': self.uptime_seconds,
            'checks': [c.to_dict() for c in self.checks],
            'timestamp': self.timestamp
        }


@dataclass
class CircuitBreaker:
    """熔斷器"""
    name: str
    state: CircuitState = CircuitState.CLOSED
    
    failure_threshold: int = 5          # 失敗閾值
    success_threshold: int = 3          # 半開狀態成功閾值
    timeout_seconds: int = 60           # 熔斷超時
    
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_state_change: Optional[datetime] = None
    
    def should_allow(self) -> bool:
        """是否允許請求"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # 檢查是否超時，可以嘗試半開
            if self.last_failure_time:
                elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
                if elapsed >= self.timeout_seconds:
                    self.state = CircuitState.HALF_OPEN
                    self.last_state_change = datetime.utcnow()
                    return True
            return False
        
        # HALF_OPEN 狀態允許有限請求
        return True
    
    def record_success(self):
        """記錄成功"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.last_state_change = datetime.utcnow()
        elif self.state == CircuitState.CLOSED:
            # 成功重置失敗計數
            self.failure_count = 0
    
    def record_failure(self):
        """記錄失敗"""
        self.last_failure_time = datetime.utcnow()
        
        if self.state == CircuitState.HALF_OPEN:
            # 半開狀態失敗，回到熔斷
            self.state = CircuitState.OPEN
            self.success_count = 0
            self.last_state_change = datetime.utcnow()
        elif self.state == CircuitState.CLOSED:
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.last_state_change = datetime.utcnow()
    
    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'failure_threshold': self.failure_threshold,
            'timeout_seconds': self.timeout_seconds
        }


class HealthService:
    """健康檢查服務"""
    
    _instance: Optional['HealthService'] = None
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
        
        # 服務啟動時間
        self._start_time = datetime.utcnow()
        self._version = os.environ.get('APP_VERSION', '1.0.0')
        
        # 健康檢查器
        self._health_checks: Dict[str, Callable] = {}
        
        # 熔斷器
        self._circuit_breakers: Dict[str, CircuitBreaker] = {}
        
        # 降級策略
        self._fallbacks: Dict[str, Callable] = {}
        
        # 最近檢查結果
        self._last_results: Dict[str, HealthCheck] = {}
        
        # 🔧 P10-4: 健康歷史記錄（環形緩衝區，保留最近100條）
        self._health_history: List[Dict[str, Any]] = []
        self._max_history = 100
        
        # 註冊內置檢查
        self._register_builtin_checks()
        
        self._initialized = True
        logger.info("HealthService initialized")
    
    def _register_builtin_checks(self):
        """註冊內置健康檢查"""
        
        # 🔧 P6-1: 數據庫檢查（使用統一連接工具）
        async def check_database():
            try:
                from core.db_utils import get_connection, ConnectionStats
                with get_connection() as conn:
                    conn.execute('SELECT 1')
                    
                    # 檢查 WAL 模式
                    wal_mode = conn.execute('PRAGMA journal_mode').fetchone()[0]
                    
                    # 獲取連接統計
                    conn_stats = ConnectionStats.stats()
                
                return HealthCheck(
                    name='database',
                    status=HealthStatus.HEALTHY,
                    message=f'Database OK (WAL: {wal_mode})',
                    details={
                        'journal_mode': wal_mode,
                        'connections': conn_stats
                    }
                )
            except ImportError:
                # 降級到直接連接
                try:
                    import sqlite3
                    db_path = os.environ.get(
                        'DB_PATH',
                        os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
                    )
                    conn = sqlite3.connect(db_path, timeout=5)
                    conn.execute('SELECT 1')
                    conn.close()
                    return HealthCheck(
                        name='database',
                        status=HealthStatus.HEALTHY,
                        message='Database connection OK'
                    )
                except Exception as e:
                    return HealthCheck(
                        name='database',
                        status=HealthStatus.UNHEALTHY,
                        message=str(e)
                    )
            except Exception as e:
                return HealthCheck(
                    name='database',
                    status=HealthStatus.UNHEALTHY,
                    message=str(e)
                )
        
        self.register_check('database', check_database)
        
        # 內存檢查
        async def check_memory():
            try:
                import psutil
                mem = psutil.virtual_memory()
                used_percent = mem.percent
                
                status = HealthStatus.HEALTHY
                if used_percent > 90:
                    status = HealthStatus.UNHEALTHY
                elif used_percent > 80:
                    status = HealthStatus.DEGRADED
                
                return HealthCheck(
                    name='memory',
                    status=status,
                    message=f'Memory usage: {used_percent}%',
                    details={
                        'total_gb': round(mem.total / (1024**3), 2),
                        'used_gb': round(mem.used / (1024**3), 2),
                        'percent': used_percent
                    }
                )
            except ImportError:
                return HealthCheck(
                    name='memory',
                    status=HealthStatus.UNKNOWN,
                    message='psutil not installed'
                )
            except Exception as e:
                return HealthCheck(
                    name='memory',
                    status=HealthStatus.UNKNOWN,
                    message=str(e)
                )
        
        self.register_check('memory', check_memory)
        
        # 磁盤檢查
        async def check_disk():
            try:
                import psutil
                disk = psutil.disk_usage('/')
                used_percent = disk.percent
                
                status = HealthStatus.HEALTHY
                if used_percent > 95:
                    status = HealthStatus.UNHEALTHY
                elif used_percent > 85:
                    status = HealthStatus.DEGRADED
                
                return HealthCheck(
                    name='disk',
                    status=status,
                    message=f'Disk usage: {used_percent}%',
                    details={
                        'total_gb': round(disk.total / (1024**3), 2),
                        'used_gb': round(disk.used / (1024**3), 2),
                        'free_gb': round(disk.free / (1024**3), 2),
                        'percent': used_percent
                    }
                )
            except ImportError:
                return HealthCheck(
                    name='disk',
                    status=HealthStatus.UNKNOWN,
                    message='psutil not installed'
                )
            except Exception as e:
                return HealthCheck(
                    name='disk',
                    status=HealthStatus.UNKNOWN,
                    message=str(e)
                )
        
        self.register_check('disk', check_disk)
        
        # 🔧 P5-6: 配額服務檢查
        async def check_quota_service():
            try:
                from core.quota_service import get_quota_service
                qs = get_quota_service()
                
                # 檢查緩存大小和預留數
                cache_size = len(qs._usage_cache)
                reservation_count = sum(
                    sum(v.values()) for v in qs._reservations.values()
                ) if qs._reservations else 0
                
                # 執行清理檢查
                expired_info = qs.cleanup_expired_reservations(timeout_seconds=300)
                
                return HealthCheck(
                    name='quota_service',
                    status=HealthStatus.HEALTHY,
                    message='Quota service operational',
                    details={
                        'cache_users': cache_size,
                        'active_reservations': reservation_count,
                        'expired_cleaned': expired_info.get('cleaned', 0)
                    }
                )
            except Exception as e:
                return HealthCheck(
                    name='quota_service',
                    status=HealthStatus.DEGRADED,
                    message=f'Quota service issue: {e}'
                )
        
        self.register_check('quota_service', check_quota_service)
        
        # 🔧 P5-6: 進程級指標
        async def check_process():
            try:
                import psutil
                proc = psutil.Process()
                mem_info = proc.memory_info()
                cpu_percent = proc.cpu_percent(interval=0.1)
                
                rss_mb = mem_info.rss / (1024 * 1024)
                status = HealthStatus.HEALTHY
                if rss_mb > 1024:
                    status = HealthStatus.UNHEALTHY
                elif rss_mb > 512:
                    status = HealthStatus.DEGRADED
                
                return HealthCheck(
                    name='process',
                    status=status,
                    message=f'RSS: {rss_mb:.1f}MB, CPU: {cpu_percent}%',
                    details={
                        'rss_mb': round(rss_mb, 1),
                        'vms_mb': round(mem_info.vms / (1024 * 1024), 1),
                        'cpu_percent': cpu_percent,
                        'threads': proc.num_threads(),
                        'open_files': len(proc.open_files()) if hasattr(proc, 'open_files') else -1
                    }
                )
            except ImportError:
                return HealthCheck(
                    name='process',
                    status=HealthStatus.UNKNOWN,
                    message='psutil not installed'
                )
            except Exception as e:
                return HealthCheck(
                    name='process',
                    status=HealthStatus.UNKNOWN,
                    message=str(e)
                )
        
        self.register_check('process', check_process)
        
        # 🔧 P10-4: Redis 連接檢查
        async def check_redis():
            try:
                import aioredis
                redis_url = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
                redis = await aioredis.from_url(redis_url, socket_timeout=3)
                pong = await redis.ping()
                info = await redis.info('memory')
                await redis.close()
                
                used_memory_mb = info.get('used_memory', 0) / (1024 * 1024)
                return HealthCheck(
                    name='redis',
                    status=HealthStatus.HEALTHY,
                    message=f'Redis OK, memory: {used_memory_mb:.1f}MB',
                    details={
                        'ping': pong,
                        'used_memory_mb': round(used_memory_mb, 1),
                        'connected_clients': info.get('connected_clients', 0)
                    }
                )
            except ImportError:
                return HealthCheck(
                    name='redis',
                    status=HealthStatus.UNKNOWN,
                    message='aioredis not installed (Redis check skipped)'
                )
            except Exception as e:
                # Redis 不可用 = 降級但非致命
                return HealthCheck(
                    name='redis',
                    status=HealthStatus.DEGRADED,
                    message=f'Redis unavailable: {e}'
                )
        
        self.register_check('redis', check_redis)
        
        # 🔧 P10-4: 備份狀態檢查
        async def check_backup():
            try:
                from core.backup_verifier import BackupVerifier
                db_path = os.environ.get('DATABASE_PATH', os.environ.get('DB_PATH', ''))
                if db_path:
                    backup_dir = str(os.path.join(os.path.dirname(db_path), 'backups'))
                else:
                    backup_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')
                
                from pathlib import Path
                bdir = Path(backup_dir)
                if not bdir.exists():
                    return HealthCheck(
                        name='backup',
                        status=HealthStatus.DEGRADED,
                        message='No backup directory found'
                    )
                
                # 找最新備份
                backups = sorted(
                    list(bdir.glob('**/*.db')) + list(bdir.glob('**/*.zip')),
                    key=lambda f: f.stat().st_mtime,
                    reverse=True
                )
                
                if not backups:
                    return HealthCheck(
                        name='backup',
                        status=HealthStatus.DEGRADED,
                        message='No backup files found'
                    )
                
                latest = backups[0]
                age_hours = (time.time() - latest.stat().st_mtime) / 3600
                file_size_mb = latest.stat().st_size / (1024 * 1024)
                
                status = HealthStatus.HEALTHY
                if age_hours > 48:
                    status = HealthStatus.UNHEALTHY
                elif age_hours > 25:
                    status = HealthStatus.DEGRADED
                
                return HealthCheck(
                    name='backup',
                    status=status,
                    message=f'Latest: {latest.name} ({age_hours:.1f}h ago, {file_size_mb:.1f}MB)',
                    details={
                        'latest_file': latest.name,
                        'age_hours': round(age_hours, 1),
                        'size_mb': round(file_size_mb, 1),
                        'total_backups': len(backups)
                    }
                )
            except Exception as e:
                return HealthCheck(
                    name='backup',
                    status=HealthStatus.UNKNOWN,
                    message=f'Backup check error: {e}'
                )
        
        self.register_check('backup', check_backup)
        
        # 🔧 P10-4: 數據庫查詢性能檢查
        async def check_db_performance():
            try:
                from core.db_utils import get_connection
                start_t = time.time()
                with get_connection() as conn:
                    # 簡單的 COUNT 查詢
                    conn.execute('SELECT COUNT(*) FROM sqlite_master')
                query_ms = (time.time() - start_t) * 1000
                
                status = HealthStatus.HEALTHY
                if query_ms > 500:
                    status = HealthStatus.UNHEALTHY
                elif query_ms > 100:
                    status = HealthStatus.DEGRADED
                
                return HealthCheck(
                    name='db_performance',
                    status=status,
                    message=f'Query latency: {query_ms:.1f}ms',
                    details={'query_latency_ms': round(query_ms, 1)}
                )
            except Exception as e:
                return HealthCheck(
                    name='db_performance',
                    status=HealthStatus.UNKNOWN,
                    message=str(e)
                )
        
        self.register_check('db_performance', check_db_performance)
    
    # ==================== 健康檢查 ====================
    
    def register_check(
        self,
        name: str,
        check_func: Callable[[], HealthCheck]
    ):
        """註冊健康檢查"""
        self._health_checks[name] = check_func
        logger.debug(f"Registered health check: {name}")
    
    async def check(self, name: str) -> HealthCheck:
        """執行單個健康檢查"""
        if name not in self._health_checks:
            return HealthCheck(
                name=name,
                status=HealthStatus.UNKNOWN,
                message='Check not found'
            )
        
        start = time.time()
        try:
            check_func = self._health_checks[name]
            if asyncio.iscoroutinefunction(check_func):
                result = await check_func()
            else:
                result = check_func()
            
            result.latency_ms = round((time.time() - start) * 1000, 2)
            result.last_check = datetime.utcnow().isoformat()
            
            self._last_results[name] = result
            return result
            
        except Exception as e:
            result = HealthCheck(
                name=name,
                status=HealthStatus.UNHEALTHY,
                latency_ms=round((time.time() - start) * 1000, 2),
                message=str(e),
                last_check=datetime.utcnow().isoformat()
            )
            self._last_results[name] = result
            return result
    
    async def check_all(self) -> ServiceHealth:
        """執行所有健康檢查"""
        checks = []
        
        for name in self._health_checks:
            result = await self.check(name)
            checks.append(result)
        
        # 計算總體狀態
        overall_status = HealthStatus.HEALTHY
        for check in checks:
            if check.status == HealthStatus.UNHEALTHY:
                overall_status = HealthStatus.UNHEALTHY
                break
            elif check.status == HealthStatus.DEGRADED:
                overall_status = HealthStatus.DEGRADED
        
        uptime = (datetime.utcnow() - self._start_time).total_seconds()
        
        health = ServiceHealth(
            status=overall_status,
            version=self._version,
            uptime_seconds=round(uptime, 2),
            checks=checks,
            timestamp=datetime.utcnow().isoformat()
        )
        
        # 🔧 P10-4: 記錄歷史
        self._record_history(health)
        
        return health
    
    def _record_history(self, health: ServiceHealth):
        """記錄健康歷史（環形緩衝區）"""
        entry = {
            'status': health.status.value,
            'timestamp': health.timestamp,
            'checks': {c.name: c.status.value for c in health.checks},
            'uptime': health.uptime_seconds,
        }
        self._health_history.append(entry)
        if len(self._health_history) > self._max_history:
            self._health_history = self._health_history[-self._max_history:]
    
    def get_health_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """獲取健康歷史記錄"""
        return self._health_history[-limit:]
    
    def get_quick_health(self) -> Dict[str, Any]:
        """快速健康檢查（使用緩存結果）"""
        now = datetime.utcnow()
        
        status = HealthStatus.HEALTHY
        checks = {}
        
        for name, result in self._last_results.items():
            checks[name] = result.status.value
            if result.status == HealthStatus.UNHEALTHY:
                status = HealthStatus.UNHEALTHY
            elif result.status == HealthStatus.DEGRADED and status == HealthStatus.HEALTHY:
                status = HealthStatus.DEGRADED
        
        uptime = (now - self._start_time).total_seconds()
        
        return {
            'status': status.value,
            'version': self._version,
            'uptime': round(uptime, 2),
            'checks': checks,
            'timestamp': now.isoformat()
        }
    
    # ==================== 熔斷器 ====================
    
    def get_circuit_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        timeout_seconds: int = 60
    ) -> CircuitBreaker:
        """獲取或創建熔斷器"""
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker(
                name=name,
                failure_threshold=failure_threshold,
                timeout_seconds=timeout_seconds
            )
        return self._circuit_breakers[name]
    
    async def with_circuit_breaker(
        self,
        name: str,
        func: Callable,
        fallback: Callable = None,
        *args, **kwargs
    ) -> Any:
        """使用熔斷器執行操作"""
        cb = self.get_circuit_breaker(name)
        
        if not cb.should_allow():
            logger.warning(f"Circuit breaker {name} is OPEN")
            if fallback:
                return await fallback(*args, **kwargs) if asyncio.iscoroutinefunction(fallback) else fallback(*args, **kwargs)
            raise CircuitBreakerOpenError(f"Circuit breaker {name} is open")
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            cb.record_success()
            return result
            
        except Exception as e:
            cb.record_failure()
            
            if fallback:
                logger.warning(f"Circuit breaker {name} falling back due to: {e}")
                return await fallback(*args, **kwargs) if asyncio.iscoroutinefunction(fallback) else fallback(*args, **kwargs)
            
            raise
    
    def get_all_circuit_breakers(self) -> Dict[str, dict]:
        """獲取所有熔斷器狀態"""
        return {
            name: cb.to_dict()
            for name, cb in self._circuit_breakers.items()
        }
    
    def reset_circuit_breaker(self, name: str):
        """重置熔斷器"""
        if name in self._circuit_breakers:
            cb = self._circuit_breakers[name]
            cb.state = CircuitState.CLOSED
            cb.failure_count = 0
            cb.success_count = 0
            cb.last_state_change = datetime.utcnow()
            logger.info(f"Circuit breaker {name} reset")
    
    # ==================== 降級策略 ====================
    
    def register_fallback(self, name: str, fallback_func: Callable):
        """註冊降級策略"""
        self._fallbacks[name] = fallback_func
    
    def get_fallback(self, name: str) -> Optional[Callable]:
        """獲取降級策略"""
        return self._fallbacks.get(name)
    
    # ==================== 就緒/存活探針 ====================
    
    async def liveness_probe(self) -> Dict[str, Any]:
        """存活探針（Kubernetes）"""
        return {
            'status': 'alive',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    async def readiness_probe(self) -> Dict[str, Any]:
        """就緒探針（Kubernetes）"""
        # 檢查關鍵依賴
        db_check = await self.check('database')
        
        if db_check.status == HealthStatus.UNHEALTHY:
            return {
                'status': 'not_ready',
                'reason': 'Database unavailable',
                'timestamp': datetime.utcnow().isoformat()
            }
        
        return {
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # ==================== 服務信息 ====================
    
    def get_service_info(self) -> Dict[str, Any]:
        """獲取服務信息"""
        import platform
        import sys
        
        uptime = (datetime.utcnow() - self._start_time).total_seconds()
        
        return {
            'name': 'TG Matrix API',
            'version': self._version,
            'environment': os.environ.get('ENVIRONMENT', 'production'),
            'uptime_seconds': round(uptime, 2),
            'uptime_human': self._format_uptime(uptime),
            'python_version': sys.version,
            'platform': platform.platform(),
            'started_at': self._start_time.isoformat()
        }
    
    def _format_uptime(self, seconds: float) -> str:
        """格式化運行時間"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        parts.append(f"{minutes}m")
        
        return ' '.join(parts)


class CircuitBreakerOpenError(Exception):
    """熔斷器開啟異常"""
    pass


# ==================== 裝飾器 ====================

def circuit_breaker(name: str, fallback: Callable = None):
    """熔斷器裝飾器"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            health = get_health_service()
            return await health.with_circuit_breaker(name, func, fallback, *args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            health = get_health_service()
            cb = health.get_circuit_breaker(name)
            
            if not cb.should_allow():
                if fallback:
                    return fallback(*args, **kwargs)
                raise CircuitBreakerOpenError(f"Circuit breaker {name} is open")
            
            try:
                result = func(*args, **kwargs)
                cb.record_success()
                return result
            except Exception as e:
                cb.record_failure()
                if fallback:
                    return fallback(*args, **kwargs)
                raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# ==================== 單例訪問 ====================

_health_service: Optional[HealthService] = None


def get_health_service() -> HealthService:
    """獲取健康服務"""
    global _health_service
    if _health_service is None:
        _health_service = HealthService()
    return _health_service

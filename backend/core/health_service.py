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
        
        # 註冊內置檢查
        self._register_builtin_checks()
        
        self._initialized = True
        logger.info("HealthService initialized")
    
    def _register_builtin_checks(self):
        """註冊內置健康檢查"""
        
        # 數據庫檢查
        async def check_database():
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
        
        return ServiceHealth(
            status=overall_status,
            version=self._version,
            uptime_seconds=round(uptime, 2),
            checks=checks,
            timestamp=datetime.utcnow().isoformat()
        )
    
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

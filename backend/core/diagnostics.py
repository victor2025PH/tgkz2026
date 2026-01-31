"""
系統診斷服務

優化設計：
1. 詳細健康檢查
2. 性能診斷
3. 錯誤報告
4. 系統信息收集
"""

import os
import sys
import sqlite3
import platform
import logging
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class HealthCheck:
    """健康檢查結果"""
    name: str
    status: str  # healthy, degraded, unhealthy
    message: str = ''
    latency_ms: float = 0
    details: Dict[str, Any] = None
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DiagnosticReport:
    """診斷報告"""
    timestamp: str
    overall_status: str
    checks: List[HealthCheck]
    system_info: Dict[str, Any]
    performance: Dict[str, Any]
    errors: List[Dict[str, Any]]
    recommendations: List[str]


class DiagnosticsService:
    """診斷服務"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
    
    async def run_all_checks(self) -> DiagnosticReport:
        """運行所有健康檢查"""
        checks = []
        
        # 並行運行檢查
        check_tasks = [
            self.check_database(),
            self.check_memory(),
            self.check_disk(),
            self.check_python_env(),
            self.check_critical_tables(),
            self.check_telegram_sessions(),
        ]
        
        results = await asyncio.gather(*check_tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                checks.append(HealthCheck(
                    name='unknown',
                    status='unhealthy',
                    message=str(result)
                ))
            else:
                checks.append(result)
        
        # 計算總體狀態
        if any(c.status == 'unhealthy' for c in checks):
            overall = 'unhealthy'
        elif any(c.status == 'degraded' for c in checks):
            overall = 'degraded'
        else:
            overall = 'healthy'
        
        # 收集系統信息
        system_info = self.get_system_info()
        
        # 收集性能指標
        performance = await self.get_performance_metrics()
        
        # 收集最近錯誤
        errors = await self.get_recent_errors()
        
        # 生成建議
        recommendations = self.generate_recommendations(checks, performance)
        
        return DiagnosticReport(
            timestamp=datetime.utcnow().isoformat(),
            overall_status=overall,
            checks=checks,
            system_info=system_info,
            performance=performance,
            errors=errors,
            recommendations=recommendations
        )
    
    async def check_database(self) -> HealthCheck:
        """檢查數據庫健康"""
        import time
        start = time.time()
        
        try:
            if not os.path.exists(self.db_path):
                return HealthCheck(
                    name='database',
                    status='unhealthy',
                    message='Database file not found'
                )
            
            conn = sqlite3.connect(self.db_path, timeout=5)
            cursor = conn.cursor()
            
            # 測試查詢
            cursor.execute('SELECT 1')
            cursor.fetchone()
            
            # 獲取數據庫大小
            db_size = os.path.getsize(self.db_path)
            
            # 獲取表數量
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            table_count = cursor.fetchone()[0]
            
            # 檢查完整性
            cursor.execute('PRAGMA integrity_check(1)')
            integrity = cursor.fetchone()[0]
            
            conn.close()
            
            latency = (time.time() - start) * 1000
            
            status = 'healthy'
            message = f'{table_count} tables, {db_size // 1024} KB'
            
            if integrity != 'ok':
                status = 'unhealthy'
                message = f'Integrity check failed: {integrity}'
            elif db_size > 500 * 1024 * 1024:  # > 500 MB
                status = 'degraded'
                message = f'Database size is large: {db_size // (1024*1024)} MB'
            
            return HealthCheck(
                name='database',
                status=status,
                message=message,
                latency_ms=latency,
                details={
                    'size_bytes': db_size,
                    'table_count': table_count,
                    'integrity': integrity
                }
            )
            
        except Exception as e:
            return HealthCheck(
                name='database',
                status='unhealthy',
                message=str(e),
                latency_ms=(time.time() - start) * 1000
            )
    
    async def check_memory(self) -> HealthCheck:
        """檢查內存使用"""
        try:
            import psutil
            
            memory = psutil.virtual_memory()
            process = psutil.Process(os.getpid())
            proc_memory = process.memory_info()
            
            used_percent = memory.percent
            proc_mb = proc_memory.rss / (1024 * 1024)
            
            if used_percent > 90:
                status = 'unhealthy'
                message = f'Critical memory usage: {used_percent}%'
            elif used_percent > 80:
                status = 'degraded'
                message = f'High memory usage: {used_percent}%'
            else:
                status = 'healthy'
                message = f'Memory usage: {used_percent}%'
            
            return HealthCheck(
                name='memory',
                status=status,
                message=message,
                details={
                    'total_mb': memory.total // (1024 * 1024),
                    'available_mb': memory.available // (1024 * 1024),
                    'used_percent': used_percent,
                    'process_mb': round(proc_mb, 2)
                }
            )
            
        except ImportError:
            return HealthCheck(
                name='memory',
                status='degraded',
                message='psutil not available'
            )
        except Exception as e:
            return HealthCheck(
                name='memory',
                status='unhealthy',
                message=str(e)
            )
    
    async def check_disk(self) -> HealthCheck:
        """檢查磁盤空間"""
        try:
            import psutil
            
            disk = psutil.disk_usage(os.path.dirname(self.db_path) or '/')
            used_percent = disk.percent
            free_gb = disk.free / (1024 ** 3)
            
            if used_percent > 95 or free_gb < 1:
                status = 'unhealthy'
                message = f'Critical disk space: {free_gb:.1f} GB free'
            elif used_percent > 85 or free_gb < 5:
                status = 'degraded'
                message = f'Low disk space: {free_gb:.1f} GB free'
            else:
                status = 'healthy'
                message = f'Disk space: {free_gb:.1f} GB free'
            
            return HealthCheck(
                name='disk',
                status=status,
                message=message,
                details={
                    'total_gb': round(disk.total / (1024 ** 3), 2),
                    'free_gb': round(free_gb, 2),
                    'used_percent': used_percent
                }
            )
            
        except ImportError:
            return HealthCheck(
                name='disk',
                status='degraded',
                message='psutil not available'
            )
        except Exception as e:
            return HealthCheck(
                name='disk',
                status='unhealthy',
                message=str(e)
            )
    
    async def check_python_env(self) -> HealthCheck:
        """檢查 Python 環境"""
        try:
            # 檢查關鍵依賴
            missing = []
            
            try:
                import aiohttp
            except ImportError:
                missing.append('aiohttp')
            
            try:
                import argon2
            except ImportError:
                missing.append('argon2-cffi')
            
            try:
                import cryptography
            except ImportError:
                missing.append('cryptography')
            
            if missing:
                return HealthCheck(
                    name='python_env',
                    status='degraded',
                    message=f'Missing packages: {", ".join(missing)}',
                    details={
                        'python_version': sys.version,
                        'missing_packages': missing
                    }
                )
            
            return HealthCheck(
                name='python_env',
                status='healthy',
                message=f'Python {platform.python_version()}',
                details={
                    'python_version': sys.version,
                    'platform': platform.platform()
                }
            )
            
        except Exception as e:
            return HealthCheck(
                name='python_env',
                status='unhealthy',
                message=str(e)
            )
    
    async def check_critical_tables(self) -> HealthCheck:
        """檢查關鍵表"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            critical_tables = [
                'user_profiles',
                'accounts',
                'messages',
                'usage_stats'
            ]
            
            missing = []
            table_counts = {}
            
            for table in critical_tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    table_counts[table] = count
                except sqlite3.OperationalError:
                    missing.append(table)
            
            conn.close()
            
            if missing:
                return HealthCheck(
                    name='critical_tables',
                    status='unhealthy',
                    message=f'Missing tables: {", ".join(missing)}',
                    details={'missing': missing, 'counts': table_counts}
                )
            
            return HealthCheck(
                name='critical_tables',
                status='healthy',
                message=f'{len(critical_tables)} tables OK',
                details={'counts': table_counts}
            )
            
        except Exception as e:
            return HealthCheck(
                name='critical_tables',
                status='unhealthy',
                message=str(e)
            )
    
    async def check_telegram_sessions(self) -> HealthCheck:
        """檢查 Telegram Session 狀態"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 獲取帳號統計
            cursor.execute("SELECT status, COUNT(*) FROM accounts GROUP BY status")
            status_counts = dict(cursor.fetchall())
            
            total = sum(status_counts.values())
            online = status_counts.get('online', 0)
            banned = status_counts.get('banned', 0)
            
            conn.close()
            
            if banned > total * 0.5:
                status = 'unhealthy'
                message = f'High ban rate: {banned}/{total} accounts banned'
            elif online < total * 0.5 and total > 0:
                status = 'degraded'
                message = f'Low online rate: {online}/{total} online'
            else:
                status = 'healthy'
                message = f'{online}/{total} accounts online'
            
            return HealthCheck(
                name='telegram_sessions',
                status=status,
                message=message,
                details={'status_counts': status_counts, 'total': total}
            )
            
        except Exception as e:
            return HealthCheck(
                name='telegram_sessions',
                status='degraded',
                message=str(e)
            )
    
    def get_system_info(self) -> Dict[str, Any]:
        """獲取系統信息"""
        return {
            'os': platform.system(),
            'os_version': platform.version(),
            'python_version': platform.python_version(),
            'hostname': platform.node(),
            'architecture': platform.machine(),
            'processor': platform.processor(),
            'pid': os.getpid(),
            'cwd': os.getcwd()
        }
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """獲取性能指標"""
        metrics = {}
        
        try:
            import psutil
            
            process = psutil.Process(os.getpid())
            
            metrics['cpu_percent'] = process.cpu_percent()
            metrics['memory_mb'] = process.memory_info().rss / (1024 * 1024)
            metrics['threads'] = process.num_threads()
            metrics['open_files'] = len(process.open_files())
            
            # 系統級
            metrics['system_cpu_percent'] = psutil.cpu_percent()
            metrics['system_memory_percent'] = psutil.virtual_memory().percent
            
        except ImportError:
            metrics['note'] = 'psutil not available'
        except Exception as e:
            metrics['error'] = str(e)
        
        return metrics
    
    async def get_recent_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """獲取最近錯誤"""
        errors = []
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 檢查是否有錯誤日誌表
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='error_logs'
            """)
            
            if cursor.fetchone():
                cursor.execute(f"""
                    SELECT * FROM error_logs 
                    ORDER BY created_at DESC 
                    LIMIT {limit}
                """)
                errors = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
        except Exception as e:
            logger.debug(f"Get recent errors: {e}")
        
        return errors
    
    def generate_recommendations(
        self,
        checks: List[HealthCheck],
        performance: Dict[str, Any]
    ) -> List[str]:
        """生成建議"""
        recommendations = []
        
        for check in checks:
            if check.status == 'unhealthy':
                if check.name == 'database':
                    recommendations.append('數據庫問題需要立即處理。考慮運行完整性檢查和修復。')
                elif check.name == 'memory':
                    recommendations.append('內存使用過高。考慮重啟服務或優化內存使用。')
                elif check.name == 'disk':
                    recommendations.append('磁盤空間不足。請清理不必要的文件或擴展存儲。')
                elif check.name == 'critical_tables':
                    recommendations.append('缺少關鍵數據表。請運行數據庫遷移。')
                elif check.name == 'telegram_sessions':
                    recommendations.append('Telegram 帳號封禁率過高。請檢查帳號健康狀況。')
                    
            elif check.status == 'degraded':
                if check.name == 'database':
                    recommendations.append('數據庫較大。考慮清理歷史數據或歸檔。')
                elif check.name == 'memory':
                    recommendations.append('內存使用較高。監控內存趨勢。')
                elif check.name == 'disk':
                    recommendations.append('磁盤空間有限。計劃清理或擴展。')
                elif check.name == 'python_env':
                    recommendations.append('缺少部分依賴包。請運行 pip install -r requirements.txt')
        
        # 性能建議
        if performance.get('cpu_percent', 0) > 80:
            recommendations.append('CPU 使用率高。考慮優化計算密集型操作。')
        
        if not recommendations:
            recommendations.append('系統運行正常，無需特別操作。')
        
        return recommendations
    
    async def get_quick_health(self) -> Dict[str, Any]:
        """快速健康檢查"""
        checks = await asyncio.gather(
            self.check_database(),
            self.check_memory(),
            return_exceptions=True
        )
        
        results = []
        for check in checks:
            if isinstance(check, Exception):
                results.append({'name': 'error', 'status': 'unhealthy'})
            else:
                results.append(check.to_dict())
        
        all_healthy = all(
            c.get('status') == 'healthy' 
            for c in results 
            if isinstance(c, dict)
        )
        
        return {
            'status': 'healthy' if all_healthy else 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': results
        }


# ==================== 單例訪問 ====================

_diagnostics_service: Optional[DiagnosticsService] = None


def get_diagnostics_service() -> DiagnosticsService:
    global _diagnostics_service
    if _diagnostics_service is None:
        _diagnostics_service = DiagnosticsService()
    return _diagnostics_service

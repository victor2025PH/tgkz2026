"""
P17-1: 时序指标存储 — 轻量级 SQLite 采样 + 历史查询 API

功能：
1. 每 60s 采样一次关键指标 (RPM, 错误率, P95, 缓存命中率, 活跃告警...)
2. SQLite 存储，自动保留 7 天，超期自动清理
3. /api/v1/metrics/history?period=1h|6h|24h|7d 查询接口
4. 为 admin 仪表板趋势线图提供数据源
"""

import os
import time
import sqlite3
import asyncio
import logging
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# 采样间隔和保留策略
SAMPLE_INTERVAL_SECONDS = 60    # 每 60 秒采样一次
RETENTION_DAYS = 7              # 保留 7 天
MAX_ROWS_PER_QUERY = 1000      # 单次查询最多返回行数

# 周期映射 (period -> seconds)
PERIOD_MAP = {
    '30m': 1800,
    '1h': 3600,
    '6h': 21600,
    '24h': 86400,
    '3d': 259200,
    '7d': 604800,
}


class MetricsHistory:
    """P17-1: 时序指标存储单例"""

    _instance: Optional['MetricsHistory'] = None
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

        self._db_path = self._resolve_db_path()
        self._bg_task: Optional[asyncio.Task] = None
        self._total_samples: int = 0

        self._init_db()
        self._initialized = True
        logger.info("P17-1: MetricsHistory initialized (db=%s)", self._db_path)

    @classmethod
    def get_instance(cls) -> 'MetricsHistory':
        return cls()

    # ==================== 数据库初始化 ====================

    def _init_db(self):
        """创建时序表"""
        if not self._db_path:
            return
        try:
            os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
            conn = sqlite3.connect(self._db_path)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS metrics_samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,              -- ISO 时间戳
                    epoch INTEGER NOT NULL,         -- Unix 秒 (便于范围查询)
                    rpm INTEGER DEFAULT 0,          -- 每分钟请求数
                    error_rate REAL DEFAULT 0,       -- 错误率 %
                    p95_ms REAL DEFAULT 0,           -- 全局 P95 响应时间 ms
                    avg_ms REAL DEFAULT 0,           -- 全局平均响应时间 ms
                    total_requests INTEGER DEFAULT 0,
                    total_errors INTEGER DEFAULT 0,
                    cache_hit_rate REAL DEFAULT 0,   -- 缓存命中率 %
                    cache_entries INTEGER DEFAULT 0,
                    active_alerts INTEGER DEFAULT 0,
                    rate_limit_blocks INTEGER DEFAULT 0,
                    db_size_mb REAL DEFAULT 0,
                    wal_size_mb REAL DEFAULT 0,
                    connection_leaked INTEGER DEFAULT 0
                )
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_metrics_epoch
                ON metrics_samples(epoch)
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("P17-1: Init metrics history DB failed: %s", e)

    # ==================== 采样 ====================

    def sample_now(self) -> Dict[str, Any]:
        """采集一个数据点并写入 DB"""
        point = self._collect_data_point()
        self._write_point(point)
        self._total_samples += 1
        return point

    def _collect_data_point(self) -> Dict[str, Any]:
        """从各子系统收集当前指标"""
        now = time.time()
        point = {
            'ts': datetime.utcnow().isoformat(),
            'epoch': int(now),
            'rpm': 0,
            'error_rate': 0.0,
            'p95_ms': 0.0,
            'avg_ms': 0.0,
            'total_requests': 0,
            'total_errors': 0,
            'cache_hit_rate': 0.0,
            'cache_entries': 0,
            'active_alerts': 0,
            'rate_limit_blocks': 0,
            'db_size_mb': 0.0,
            'wal_size_mb': 0.0,
            'connection_leaked': 0,
        }

        # API metrics
        try:
            from api.perf_metrics import ApiMetrics
            summary = ApiMetrics.get_instance().get_summary()
            point['rpm'] = summary.get('rpm', 0)
            point['error_rate'] = summary.get('error_rate', 0.0)
            point['total_requests'] = summary.get('total_requests', 0)
            point['total_errors'] = summary.get('total_errors', 0)
            # 计算全局 P95 — 取所有端点的加权平均
            slowest = summary.get('slowest_endpoints', {})
            if slowest:
                p95_vals = [v.get('p95_ms', 0) for v in slowest.values()]
                point['p95_ms'] = round(max(p95_vals), 1) if p95_vals else 0
            top = summary.get('top_endpoints', {})
            if top:
                total_count = sum(v.get('count', 0) for v in top.values())
                if total_count > 0:
                    weighted_avg = sum(
                        v.get('avg_ms', 0) * v.get('count', 0)
                        for v in top.values()
                    ) / total_count
                    point['avg_ms'] = round(weighted_avg, 1)
        except Exception:
            pass

        # Cache
        try:
            from api.response_cache import ResponseCache
            stats = ResponseCache.get_instance().get_stats()
            point['cache_hit_rate'] = stats.get('hit_rate', 0.0)
            point['cache_entries'] = stats.get('entries', 0)
        except Exception:
            pass

        # Alerts
        try:
            from api.alert_engine import AlertEngine
            engine = AlertEngine.get_instance()
            point['active_alerts'] = len(engine._active_alerts)
        except Exception:
            pass

        # Rate limiter
        try:
            from core.rate_limiter import get_rate_limiter
            stats = get_rate_limiter().get_stats()
            point['rate_limit_blocks'] = stats.get('blocked_requests', 0)
        except Exception:
            pass

        # DB health
        try:
            from api.db_health import DbHealthMonitor
            db_stats = DbHealthMonitor.get_instance().get_stats()
            pragma = db_stats.get('pragma', {})
            point['db_size_mb'] = pragma.get('db_size_mb', 0.0)
            point['wal_size_mb'] = pragma.get('wal_size_mb', 0.0)
            tracking = db_stats.get('connection_tracking', {})
            point['connection_leaked'] = tracking.get('potentially_leaked', 0)
        except Exception:
            pass

        return point

    def _write_point(self, point: Dict[str, Any]):
        """写入一个数据点"""
        if not self._db_path:
            return
        try:
            conn = sqlite3.connect(self._db_path, timeout=5)
            conn.execute('''
                INSERT INTO metrics_samples
                (ts, epoch, rpm, error_rate, p95_ms, avg_ms,
                 total_requests, total_errors, cache_hit_rate, cache_entries,
                 active_alerts, rate_limit_blocks, db_size_mb, wal_size_mb,
                 connection_leaked)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ''', (
                point['ts'], point['epoch'], point['rpm'], point['error_rate'],
                point['p95_ms'], point['avg_ms'], point['total_requests'],
                point['total_errors'], point['cache_hit_rate'], point['cache_entries'],
                point['active_alerts'], point['rate_limit_blocks'],
                point['db_size_mb'], point['wal_size_mb'], point['connection_leaked'],
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning("P17-1: Write metrics point failed: %s", e)

    # ==================== 查询 ====================

    def query(self, period: str = '1h', downsample: bool = True) -> Dict[str, Any]:
        """
        查询历史指标
        period: 30m|1h|6h|24h|3d|7d
        downsample: 长周期自动降采样
        """
        seconds = PERIOD_MAP.get(period, 3600)
        cutoff = int(time.time()) - seconds

        if not self._db_path or not os.path.exists(self._db_path):
            return {'points': [], 'period': period, 'count': 0}

        try:
            conn = sqlite3.connect(self._db_path, timeout=5)
            conn.row_factory = sqlite3.Row

            # 降采样策略：> 6h 按 5 分钟聚合，> 24h 按 15 分钟聚合
            if downsample and seconds > 86400:
                rows = conn.execute('''
                    SELECT
                        MIN(ts) as ts, (epoch / 900) * 900 as epoch,
                        AVG(rpm) as rpm, AVG(error_rate) as error_rate,
                        AVG(p95_ms) as p95_ms, AVG(avg_ms) as avg_ms,
                        MAX(total_requests) as total_requests,
                        MAX(total_errors) as total_errors,
                        AVG(cache_hit_rate) as cache_hit_rate,
                        AVG(cache_entries) as cache_entries,
                        MAX(active_alerts) as active_alerts,
                        MAX(rate_limit_blocks) as rate_limit_blocks,
                        AVG(db_size_mb) as db_size_mb,
                        AVG(wal_size_mb) as wal_size_mb,
                        MAX(connection_leaked) as connection_leaked
                    FROM metrics_samples WHERE epoch > ?
                    GROUP BY epoch / 900
                    ORDER BY epoch
                    LIMIT ?
                ''', (cutoff, MAX_ROWS_PER_QUERY))
            elif downsample and seconds > 21600:
                rows = conn.execute('''
                    SELECT
                        MIN(ts) as ts, (epoch / 300) * 300 as epoch,
                        AVG(rpm) as rpm, AVG(error_rate) as error_rate,
                        AVG(p95_ms) as p95_ms, AVG(avg_ms) as avg_ms,
                        MAX(total_requests) as total_requests,
                        MAX(total_errors) as total_errors,
                        AVG(cache_hit_rate) as cache_hit_rate,
                        AVG(cache_entries) as cache_entries,
                        MAX(active_alerts) as active_alerts,
                        MAX(rate_limit_blocks) as rate_limit_blocks,
                        AVG(db_size_mb) as db_size_mb,
                        AVG(wal_size_mb) as wal_size_mb,
                        MAX(connection_leaked) as connection_leaked
                    FROM metrics_samples WHERE epoch > ?
                    GROUP BY epoch / 300
                    ORDER BY epoch
                    LIMIT ?
                ''', (cutoff, MAX_ROWS_PER_QUERY))
            else:
                rows = conn.execute('''
                    SELECT * FROM metrics_samples
                    WHERE epoch > ?
                    ORDER BY epoch
                    LIMIT ?
                ''', (cutoff, MAX_ROWS_PER_QUERY))

            points = [dict(row) for row in rows.fetchall()]
            conn.close()

            return {
                'points': points,
                'period': period,
                'count': len(points),
                'total_samples': self._total_samples,
            }
        except Exception as e:
            logger.error("P17-1: Query metrics history failed: %s", e)
            return {'points': [], 'period': period, 'count': 0, 'error': str(e)}

    # ==================== 清理 ====================

    def cleanup(self):
        """清理超过保留期的数据"""
        if not self._db_path or not os.path.exists(self._db_path):
            return 0
        try:
            cutoff = int(time.time()) - RETENTION_DAYS * 86400
            conn = sqlite3.connect(self._db_path, timeout=5)
            cursor = conn.execute(
                'DELETE FROM metrics_samples WHERE epoch < ?', (cutoff,)
            )
            deleted = cursor.rowcount
            conn.commit()
            conn.close()
            if deleted > 0:
                logger.info("P17-1: Cleaned %d old metrics samples", deleted)
            return deleted
        except Exception as e:
            logger.warning("P17-1: Cleanup failed: %s", e)
            return 0

    # ==================== 后台任务 ====================

    def start_background_sampler(self, interval: int = SAMPLE_INTERVAL_SECONDS):
        """启动后台采样循环"""
        if self._bg_task and not self._bg_task.done():
            return
        self._bg_task = asyncio.create_task(self._sample_loop(interval))
        logger.info("P17-1: Metrics sampler started (interval=%ds)", interval)

    async def _sample_loop(self, interval: int):
        """后台采样循环"""
        await asyncio.sleep(45)  # 启动延迟
        cleanup_counter = 0
        while True:
            try:
                self.sample_now()
                cleanup_counter += 1
                # 每小时清理一次过期数据
                if cleanup_counter % 60 == 0:
                    self.cleanup()
            except Exception as e:
                logger.debug("P17-1: Sample loop error: %s", e)
            await asyncio.sleep(interval)

    # ==================== 辅助 ====================

    def _resolve_db_path(self) -> Optional[str]:
        """解析数据库路径 — 使用独立 DB 文件避免影响主数据库"""
        data_dir = os.environ.get('DATA_DIR', '')
        if data_dir:
            return os.path.join(data_dir, 'metrics_history.db')
        default = os.path.join(os.path.dirname(__file__), '..', 'data', 'metrics_history.db')
        return default

    def get_info(self) -> Dict[str, Any]:
        """获取存储统计信息"""
        info = {
            'total_samples': self._total_samples,
            'retention_days': RETENTION_DAYS,
            'sample_interval_seconds': SAMPLE_INTERVAL_SECONDS,
            'db_path': self._db_path,
            'background_running': self._bg_task is not None and not self._bg_task.done()
                                  if self._bg_task else False,
        }
        if self._db_path and os.path.exists(self._db_path):
            info['db_size_kb'] = round(os.path.getsize(self._db_path) / 1024, 1)
        return info


# ==================== 启动便捷函数 ====================

def start_metrics_history_sampler(interval: int = SAMPLE_INTERVAL_SECONDS):
    """在 asyncio 上下文中启动时序采样"""
    history = MetricsHistory.get_instance()
    history.start_background_sampler(interval)
    return history

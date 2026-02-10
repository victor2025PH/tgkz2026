"""
P15-2: 数据库健康监控 — 统一聚合 ConnectionPool + ConnectionStats + PRAGMA 诊断

功能：
1. 聚合连接池统计（活跃/空闲/泄漏连接）
2. 慢查询追踪（最近 N 条 + Top-N 高频查询）
3. SQLite PRAGMA 诊断（WAL 状态、page count、freelist、integrity）
4. DB 文件大小和碎片率
5. 为 /api/v1/metrics/api 和 /api/v1/metrics/db 提供数据源
"""

import os
import time
import sqlite3
import logging
import threading
from typing import Dict, Any, Optional, List
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)


class DbHealthMonitor:
    """P15-2: 数据库健康监控单例"""

    _instance: Optional['DbHealthMonitor'] = None
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

        self._db_path: Optional[str] = None
        self._last_diagnostic: Dict[str, Any] = {}
        self._last_diagnostic_time: float = 0
        self._diagnostic_cache_ttl: float = 30.0  # 30s 缓存 PRAGMA 诊断结果

        # P15-2: 查询耗时采样器（最近 500 次查询耗时，用于计算 P50/P95/P99）
        self._query_durations: deque = deque(maxlen=500)
        self._total_queries: int = 0
        self._total_query_time: float = 0.0

        self._initialized = True
        logger.info("P15-2: DbHealthMonitor initialized")

    @classmethod
    def get_instance(cls) -> 'DbHealthMonitor':
        return cls()

    def set_db_path(self, db_path: str):
        """设置数据库路径（启动时调用）"""
        self._db_path = db_path

    def record_query(self, duration_ms: float):
        """记录一次查询耗时（供外部调用）"""
        self._query_durations.append(duration_ms)
        self._total_queries += 1
        self._total_query_time += duration_ms

    # ==================== 核心统计 ====================

    def get_stats(self) -> Dict[str, Any]:
        """
        P15-2: 综合数据库健康统计
        聚合 ConnectionPool + ConnectionStats + PRAGMA + 文件信息
        """
        stats: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat(),
        }

        # 1) ConnectionPool 统计
        try:
            from db_connection_pool import get_connection_pool
            pool = get_connection_pool()
            if pool:
                pool_stats = pool.get_stats()
                stats['connection_pool'] = pool_stats
                stats['slow_queries_recent'] = pool.get_slow_queries(10)
                stats['top_queries'] = pool.get_top_queries(10)
            else:
                stats['connection_pool'] = None
        except Exception as e:
            stats['connection_pool'] = {'error': str(e)}

        # 2) ConnectionStats (同步连接泄漏追踪)
        try:
            from core.db_utils import ConnectionStats
            stats['connection_tracking'] = ConnectionStats.stats()
        except Exception:
            stats['connection_tracking'] = None

        # 3) 查询耗时分位数
        durations = sorted(self._query_durations)
        if durations:
            n = len(durations)
            stats['query_latency'] = {
                'samples': n,
                'total_queries': self._total_queries,
                'avg_ms': round(self._total_query_time / max(self._total_queries, 1), 2),
                'p50_ms': round(durations[n // 2], 2),
                'p95_ms': round(durations[int(n * 0.95)], 2),
                'p99_ms': round(durations[int(n * 0.99)], 2),
                'max_ms': round(durations[-1], 2),
            }
        else:
            stats['query_latency'] = None

        # 4) PRAGMA 诊断（带缓存）
        stats['pragma'] = self._get_pragma_diagnostics()

        # 5) 文件信息
        stats['file'] = self._get_file_info()

        return stats

    # ==================== PRAGMA 诊断 ====================

    def _get_pragma_diagnostics(self) -> Dict[str, Any]:
        """执行 SQLite PRAGMA 诊断，缓存结果避免频繁 IO"""
        now = time.time()
        if now - self._last_diagnostic_time < self._diagnostic_cache_ttl and self._last_diagnostic:
            return self._last_diagnostic

        db_path = self._resolve_db_path()
        if not db_path or not os.path.exists(db_path):
            return {'error': 'db_path not found'}

        try:
            conn = sqlite3.connect(db_path, timeout=5)
            diag = {}

            # WAL 模式
            diag['journal_mode'] = conn.execute('PRAGMA journal_mode').fetchone()[0]

            # 页面信息
            page_size = conn.execute('PRAGMA page_size').fetchone()[0]
            page_count = conn.execute('PRAGMA page_count').fetchone()[0]
            freelist_count = conn.execute('PRAGMA freelist_count').fetchone()[0]

            diag['page_size'] = page_size
            diag['page_count'] = page_count
            diag['freelist_count'] = freelist_count
            diag['db_size_mb'] = round(page_size * page_count / (1024 * 1024), 2)
            diag['fragmentation_pct'] = round(
                freelist_count / max(page_count, 1) * 100, 2
            )

            # 缓存信息
            diag['cache_size'] = conn.execute('PRAGMA cache_size').fetchone()[0]
            diag['synchronous'] = conn.execute('PRAGMA synchronous').fetchone()[0]

            # WAL 文件大小
            wal_path = db_path + '-wal'
            if os.path.exists(wal_path):
                diag['wal_size_mb'] = round(os.path.getsize(wal_path) / (1024 * 1024), 2)
            else:
                diag['wal_size_mb'] = 0

            conn.close()

            self._last_diagnostic = diag
            self._last_diagnostic_time = now
            return diag
        except Exception as e:
            return {'error': str(e)}

    # ==================== 文件信息 ====================

    def _get_file_info(self) -> Dict[str, Any]:
        """数据库文件元信息"""
        db_path = self._resolve_db_path()
        if not db_path or not os.path.exists(db_path):
            return {'error': 'db_path not found'}

        try:
            stat = os.stat(db_path)
            return {
                'path': db_path,
                'size_mb': round(stat.st_size / (1024 * 1024), 2),
                'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
        except Exception as e:
            return {'error': str(e)}

    # ==================== P16-3: 自动 WAL 维护 ====================

    WAL_CHECKPOINT_THRESHOLD_MB = 50    # WAL > 50MB 时触发 checkpoint
    FRAGMENTATION_VACUUM_THRESHOLD = 20  # 碎片率 > 20% 时建议 VACUUM
    _last_checkpoint_time: float = 0
    _last_vacuum_time: float = 0
    _checkpoint_cooldown: float = 300    # 5 分钟冷却
    _vacuum_cooldown: float = 86400      # 24 小时冷却

    def auto_maintenance(self) -> Dict[str, Any]:
        """
        P16-3: 自动数据库维护
        - WAL > 50MB → PRAGMA wal_checkpoint(TRUNCATE)
        - 碎片率 > 20% → VACUUM (仅在冷却期后)
        返回执行结果
        """
        results: Dict[str, Any] = {'actions': []}
        now = time.time()
        db_path = self._resolve_db_path()
        if not db_path or not os.path.exists(db_path):
            return results

        try:
            diag = self._get_pragma_diagnostics()

            # WAL checkpoint
            wal_mb = diag.get('wal_size_mb', 0)
            if wal_mb > self.WAL_CHECKPOINT_THRESHOLD_MB and (now - self._last_checkpoint_time > self._checkpoint_cooldown):
                try:
                    conn = sqlite3.connect(db_path, timeout=10)
                    result = conn.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
                    conn.close()
                    self._last_checkpoint_time = now
                    # Invalidate PRAGMA cache
                    self._last_diagnostic_time = 0
                    action = {
                        'type': 'wal_checkpoint',
                        'wal_size_before_mb': wal_mb,
                        'result': list(result) if result else None,
                        'timestamp': datetime.utcnow().isoformat(),
                    }
                    results['actions'].append(action)
                    logger.info("P16-3: WAL checkpoint executed (was %.1f MB)", wal_mb)
                except Exception as e:
                    logger.warning("P16-3: WAL checkpoint failed: %s", e)
                    results['actions'].append({'type': 'wal_checkpoint', 'error': str(e)})

            # VACUUM (碎片整理)
            frag = diag.get('fragmentation_pct', 0)
            if frag > self.FRAGMENTATION_VACUUM_THRESHOLD and (now - self._last_vacuum_time > self._vacuum_cooldown):
                try:
                    conn = sqlite3.connect(db_path, timeout=60)
                    conn.execute('VACUUM')
                    conn.close()
                    self._last_vacuum_time = now
                    self._last_diagnostic_time = 0
                    action = {
                        'type': 'vacuum',
                        'fragmentation_before_pct': frag,
                        'timestamp': datetime.utcnow().isoformat(),
                    }
                    results['actions'].append(action)
                    logger.info("P16-3: VACUUM executed (fragmentation was %.1f%%)", frag)
                except Exception as e:
                    logger.warning("P16-3: VACUUM failed: %s", e)
                    results['actions'].append({'type': 'vacuum', 'error': str(e)})

        except Exception as e:
            results['error'] = str(e)

        return results

    # ==================== 辅助 ====================

    def _resolve_db_path(self) -> Optional[str]:
        """解析数据库路径"""
        if self._db_path:
            return self._db_path
        # 尝试从环境变量获取
        db_path = os.environ.get('DB_PATH')
        if db_path:
            return db_path
        # 默认路径
        default = os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        if os.path.exists(default):
            return default
        return None

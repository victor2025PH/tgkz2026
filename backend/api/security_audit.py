"""
P17-2: API 安全审计 — 限流日志分析 + 异常访问模式检测

功能：
1. Top-N 被限流 IP（最近 1 小时，从 rate_limit_logs 表读取）
2. 异常访问模式检测：同一 IP 短时间内扫描大量不同端点
3. 当前封禁列表
4. 限流规则命中排行
5. 为 /api/v1/metrics/security 端点提供数据
"""

import os
import sqlite3
import logging
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class SecurityAuditor:
    """P17-2: 安全审计单例"""

    _instance: Optional['SecurityAuditor'] = None
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
        self._initialized = True
        logger.info("P17-2: SecurityAuditor initialized")

    @classmethod
    def get_instance(cls) -> 'SecurityAuditor':
        return cls()

    def generate_report(self) -> Dict[str, Any]:
        """生成安全审计报告"""
        report: Dict[str, Any] = {
            'generated_at': datetime.utcnow().isoformat(),
            'top_blocked_ips': [],
            'top_blocked_rules': [],
            'current_bans': [],
            'suspicious_patterns': [],
            'summary': {},
        }

        # 从 rate_limiter DB 读取
        db_path = self._resolve_db_path()
        if db_path and os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path, timeout=5)
                conn.row_factory = sqlite3.Row
                hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()

                # Top blocked IPs (最近 1 小时)
                rows = conn.execute('''
                    SELECT identifier, COUNT(*) as block_count,
                           GROUP_CONCAT(DISTINCT rule_name) as rules
                    FROM rate_limit_logs
                    WHERE created_at > ? AND allowed = 0
                    GROUP BY identifier
                    ORDER BY block_count DESC
                    LIMIT 20
                ''', (hour_ago,)).fetchall()
                report['top_blocked_ips'] = [
                    {
                        'ip': r['identifier'],
                        'block_count': r['block_count'],
                        'rules': r['rules'],
                    }
                    for r in rows
                ]

                # Top blocked rules
                rows = conn.execute('''
                    SELECT rule_name, COUNT(*) as count,
                           COUNT(DISTINCT identifier) as unique_ips
                    FROM rate_limit_logs
                    WHERE created_at > ? AND allowed = 0
                    GROUP BY rule_name
                    ORDER BY count DESC
                    LIMIT 15
                ''', (hour_ago,)).fetchall()
                report['top_blocked_rules'] = [
                    {
                        'rule': r['rule_name'],
                        'count': r['count'],
                        'unique_ips': r['unique_ips'],
                    }
                    for r in rows
                ]

                # 总结
                summary_row = conn.execute('''
                    SELECT
                        COUNT(*) as total_blocks,
                        COUNT(DISTINCT identifier) as unique_blocked_ips,
                        COUNT(DISTINCT rule_name) as rules_triggered
                    FROM rate_limit_logs
                    WHERE created_at > ? AND allowed = 0
                ''', (hour_ago,)).fetchone()
                report['summary'] = {
                    'total_blocks_1h': summary_row['total_blocks'] or 0,
                    'unique_blocked_ips_1h': summary_row['unique_blocked_ips'] or 0,
                    'rules_triggered_1h': summary_row['rules_triggered'] or 0,
                }

                # 异常模式检测：同一 IP 命中多条不同规则
                rows = conn.execute('''
                    SELECT identifier, COUNT(DISTINCT rule_name) as rules_hit,
                           COUNT(*) as total_blocks,
                           GROUP_CONCAT(DISTINCT rule_name) as rules
                    FROM rate_limit_logs
                    WHERE created_at > ? AND allowed = 0
                    GROUP BY identifier
                    HAVING COUNT(DISTINCT rule_name) >= 3
                    ORDER BY rules_hit DESC
                    LIMIT 10
                ''', (hour_ago,)).fetchall()
                report['suspicious_patterns'] = [
                    {
                        'ip': r['identifier'],
                        'distinct_rules_hit': r['rules_hit'],
                        'total_blocks': r['total_blocks'],
                        'rules': r['rules'],
                        'reason': 'Multi-rule trigger: possible endpoint scanning',
                    }
                    for r in rows
                ]

                conn.close()
            except Exception as e:
                report['db_error'] = str(e)

        # 当前封禁列表
        try:
            from core.rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            bans = []
            for identifier, expires_at in limiter._blacklist.items():
                bans.append({
                    'identifier': identifier,
                    'expires_at': expires_at.isoformat(),
                    'remaining_seconds': max(0, int((expires_at - datetime.utcnow()).total_seconds())),
                })
            report['current_bans'] = bans
            report['summary']['active_bans'] = len(bans)
            report['summary']['whitelist_size'] = len(limiter._whitelist)
            report['summary']['total_rules'] = len(limiter._rules)
        except Exception:
            pass

        return report

    def _resolve_db_path(self) -> Optional[str]:
        """解析 rate_limiter 的 DB 路径"""
        db_path = os.environ.get('DB_PATH')
        if db_path:
            return db_path
        default = os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        if os.path.exists(default):
            return default
        return None

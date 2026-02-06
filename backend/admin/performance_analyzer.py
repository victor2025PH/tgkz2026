"""
性能分析器

功能：
- 響應時間分析
- 吞吐量監控
- 瓶頸識別
- 性能基線
- 性能回歸檢測
- 資源利用率分析
"""

import logging
import sqlite3
import os
import json
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'performance.db')


class MetricCategory(str, Enum):
    """指標類別"""
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    RESOURCE = "resource"
    CUSTOM = "custom"


class PerformanceStatus(str, Enum):
    """性能狀態"""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    DEGRADED = "degraded"
    CRITICAL = "critical"


class BottleneckType(str, Enum):
    """瓶頸類型"""
    CPU = "cpu"
    MEMORY = "memory"
    IO = "io"
    NETWORK = "network"
    DATABASE = "database"
    API = "api"
    UNKNOWN = "unknown"


@dataclass
class PerformanceMetric:
    """性能指標"""
    id: str
    name: str
    category: MetricCategory
    value: float
    unit: str
    endpoint: str = ""
    timestamp: str = ""
    tags: Dict = field(default_factory=dict)


@dataclass
class PerformanceBaseline:
    """性能基線"""
    id: str
    metric_name: str
    endpoint: str = ""
    p50: float = 0
    p90: float = 0
    p99: float = 0
    mean: float = 0
    std: float = 0
    sample_count: int = 0
    created_at: str = ""
    expires_at: str = ""


@dataclass
class Bottleneck:
    """性能瓶頸"""
    id: str
    bottleneck_type: BottleneckType
    description: str
    impact_score: float  # 0-100
    affected_endpoints: List[str]
    evidence: Dict
    recommendation: str
    detected_at: str


class PerformanceAnalyzer:
    """性能分析器"""
    
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
        self._current_samples: Dict[str, List[float]] = defaultdict(list)
        self._sample_limit = 1000
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 性能指標表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                value REAL,
                unit TEXT,
                endpoint TEXT,
                tags TEXT DEFAULT '{}',
                timestamp TEXT
            )
        ''')
        
        # 性能基線表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_baselines (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                endpoint TEXT,
                p50 REAL,
                p90 REAL,
                p99 REAL,
                mean REAL,
                std REAL,
                sample_count INTEGER,
                created_at TEXT,
                expires_at TEXT,
                UNIQUE(metric_name, endpoint)
            )
        ''')
        
        # 瓶頸記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bottlenecks (
                id TEXT PRIMARY KEY,
                bottleneck_type TEXT,
                description TEXT,
                impact_score REAL,
                affected_endpoints TEXT DEFAULT '[]',
                evidence TEXT DEFAULT '{}',
                recommendation TEXT,
                detected_at TEXT,
                resolved_at TEXT
            )
        ''')
        
        # 性能回歸表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_regressions (
                id TEXT PRIMARY KEY,
                metric_name TEXT,
                endpoint TEXT,
                baseline_value REAL,
                current_value REAL,
                regression_percent REAL,
                detected_at TEXT,
                acknowledged INTEGER DEFAULT 0
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_perf_name ON performance_metrics(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_perf_endpoint ON performance_metrics(endpoint)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_perf_time ON performance_metrics(timestamp)')
        
        conn.commit()
        conn.close()
        logger.info("性能分析數據庫已初始化")
    
    # ==================== 指標記錄 ====================
    
    def record_metric(
        self,
        name: str,
        value: float,
        category: MetricCategory = MetricCategory.CUSTOM,
        unit: str = "ms",
        endpoint: str = "",
        tags: Dict = None
    ) -> str:
        """記錄性能指標"""
        metric_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO performance_metrics 
            (id, name, category, value, unit, endpoint, tags, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            metric_id, name, category.value, value, unit,
            endpoint, json.dumps(tags or {}), now
        ))
        
        conn.commit()
        conn.close()
        
        # 添加到當前樣本
        key = f"{name}:{endpoint}" if endpoint else name
        self._current_samples[key].append(value)
        if len(self._current_samples[key]) > self._sample_limit:
            self._current_samples[key] = self._current_samples[key][-self._sample_limit:]
        
        return metric_id
    
    def record_latency(
        self,
        endpoint: str,
        latency_ms: float,
        tags: Dict = None
    ) -> str:
        """記錄延遲"""
        return self.record_metric(
            name="latency",
            value=latency_ms,
            category=MetricCategory.LATENCY,
            unit="ms",
            endpoint=endpoint,
            tags=tags
        )
    
    def record_throughput(
        self,
        endpoint: str,
        requests_per_second: float,
        tags: Dict = None
    ) -> str:
        """記錄吞吐量"""
        return self.record_metric(
            name="throughput",
            value=requests_per_second,
            category=MetricCategory.THROUGHPUT,
            unit="req/s",
            endpoint=endpoint,
            tags=tags
        )
    
    def record_error_rate(
        self,
        endpoint: str,
        error_rate: float,
        tags: Dict = None
    ) -> str:
        """記錄錯誤率"""
        return self.record_metric(
            name="error_rate",
            value=error_rate,
            category=MetricCategory.ERROR_RATE,
            unit="%",
            endpoint=endpoint,
            tags=tags
        )
    
    # ==================== 性能分析 ====================
    
    def get_latency_stats(
        self,
        endpoint: str = None,
        hours: int = 1
    ) -> Dict[str, Any]:
        """獲取延遲統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = '''
            SELECT value FROM performance_metrics 
            WHERE name = 'latency' AND timestamp > ?
        '''
        params = [since]
        
        if endpoint:
            query += ' AND endpoint = ?'
            params.append(endpoint)
        
        cursor.execute(query, params)
        values = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if not values:
            return {"status": "no_data"}
        
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        return {
            "endpoint": endpoint or "all",
            "sample_count": n,
            "period_hours": hours,
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "mean": round(statistics.mean(values), 2),
            "median": round(statistics.median(values), 2),
            "p50": round(sorted_values[int(n * 0.5)], 2),
            "p90": round(sorted_values[int(n * 0.9)], 2),
            "p95": round(sorted_values[int(n * 0.95)], 2),
            "p99": round(sorted_values[min(int(n * 0.99), n-1)], 2),
            "std": round(statistics.stdev(values), 2) if n > 1 else 0
        }
    
    def get_throughput_stats(
        self,
        endpoint: str = None,
        hours: int = 1
    ) -> Dict[str, Any]:
        """獲取吞吐量統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = '''
            SELECT value FROM performance_metrics 
            WHERE name = 'throughput' AND timestamp > ?
        '''
        params = [since]
        
        if endpoint:
            query += ' AND endpoint = ?'
            params.append(endpoint)
        
        cursor.execute(query, params)
        values = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if not values:
            return {"status": "no_data"}
        
        return {
            "endpoint": endpoint or "all",
            "sample_count": len(values),
            "period_hours": hours,
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "mean": round(statistics.mean(values), 2),
            "current": round(values[-1], 2) if values else 0
        }
    
    def get_error_rate_stats(
        self,
        endpoint: str = None,
        hours: int = 1
    ) -> Dict[str, Any]:
        """獲取錯誤率統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = '''
            SELECT value FROM performance_metrics 
            WHERE name = 'error_rate' AND timestamp > ?
        '''
        params = [since]
        
        if endpoint:
            query += ' AND endpoint = ?'
            params.append(endpoint)
        
        cursor.execute(query, params)
        values = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        if not values:
            return {"status": "no_data"}
        
        return {
            "endpoint": endpoint or "all",
            "sample_count": len(values),
            "period_hours": hours,
            "min": round(min(values), 4),
            "max": round(max(values), 4),
            "mean": round(statistics.mean(values), 4),
            "current": round(values[-1], 4) if values else 0
        }
    
    def get_endpoint_performance(self, endpoint: str) -> Dict[str, Any]:
        """獲取端點綜合性能"""
        latency = self.get_latency_stats(endpoint)
        throughput = self.get_throughput_stats(endpoint)
        error_rate = self.get_error_rate_stats(endpoint)
        
        # 計算健康評分
        score = self._calculate_health_score(latency, throughput, error_rate)
        
        return {
            "endpoint": endpoint,
            "health_score": score,
            "status": self._score_to_status(score),
            "latency": latency,
            "throughput": throughput,
            "error_rate": error_rate,
            "analyzed_at": datetime.now().isoformat()
        }
    
    def _calculate_health_score(
        self,
        latency: Dict,
        throughput: Dict,
        error_rate: Dict
    ) -> float:
        """計算健康評分"""
        score = 100.0
        
        # 延遲扣分
        if latency.get("status") != "no_data":
            p99 = latency.get("p99", 0)
            if p99 > 5000:  # > 5s
                score -= 40
            elif p99 > 2000:  # > 2s
                score -= 25
            elif p99 > 1000:  # > 1s
                score -= 15
            elif p99 > 500:  # > 500ms
                score -= 5
        
        # 錯誤率扣分
        if error_rate.get("status") != "no_data":
            err = error_rate.get("mean", 0)
            if err > 10:  # > 10%
                score -= 40
            elif err > 5:  # > 5%
                score -= 25
            elif err > 1:  # > 1%
                score -= 10
            elif err > 0.1:  # > 0.1%
                score -= 5
        
        return max(0, min(100, score))
    
    def _score_to_status(self, score: float) -> str:
        """評分轉狀態"""
        if score >= 90:
            return PerformanceStatus.EXCELLENT.value
        elif score >= 75:
            return PerformanceStatus.GOOD.value
        elif score >= 60:
            return PerformanceStatus.ACCEPTABLE.value
        elif score >= 40:
            return PerformanceStatus.DEGRADED.value
        else:
            return PerformanceStatus.CRITICAL.value
    
    # ==================== 基線管理 ====================
    
    def create_baseline(
        self,
        metric_name: str,
        endpoint: str = "",
        hours: int = 24
    ) -> str:
        """創建性能基線"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = '''
            SELECT value FROM performance_metrics 
            WHERE name = ? AND timestamp > ?
        '''
        params = [metric_name, since]
        
        if endpoint:
            query += ' AND endpoint = ?'
            params.append(endpoint)
        
        cursor.execute(query, params)
        values = [row[0] for row in cursor.fetchall()]
        
        if not values:
            conn.close()
            return ""
        
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        baseline_id = str(uuid.uuid4())
        now = datetime.now()
        expires = now + timedelta(days=7)  # 7 天後過期
        
        cursor.execute('''
            INSERT OR REPLACE INTO performance_baselines 
            (id, metric_name, endpoint, p50, p90, p99, mean, std, sample_count, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            baseline_id, metric_name, endpoint,
            sorted_values[int(n * 0.5)],
            sorted_values[int(n * 0.9)],
            sorted_values[min(int(n * 0.99), n-1)],
            statistics.mean(values),
            statistics.stdev(values) if n > 1 else 0,
            n,
            now.isoformat(),
            expires.isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return baseline_id
    
    def get_baseline(
        self,
        metric_name: str,
        endpoint: str = ""
    ) -> Optional[Dict]:
        """獲取基線"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM performance_baselines 
            WHERE metric_name = ? AND endpoint = ? AND expires_at > ?
        ''', (metric_name, endpoint, datetime.now().isoformat()))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "metric_name": row[1],
                "endpoint": row[2],
                "p50": row[3],
                "p90": row[4],
                "p99": row[5],
                "mean": row[6],
                "std": row[7],
                "sample_count": row[8],
                "created_at": row[9],
                "expires_at": row[10]
            }
        return None
    
    def check_regression(
        self,
        metric_name: str,
        current_value: float,
        endpoint: str = "",
        threshold_percent: float = 20
    ) -> Dict[str, Any]:
        """檢查性能回歸"""
        baseline = self.get_baseline(metric_name, endpoint)
        
        if not baseline:
            return {"has_regression": False, "reason": "no_baseline"}
        
        baseline_value = baseline["mean"]
        
        if baseline_value == 0:
            return {"has_regression": False, "reason": "zero_baseline"}
        
        # 計算偏差
        deviation = (current_value - baseline_value) / baseline_value * 100
        
        # 對於延遲，值增加是回歸；對於吞吐量，值減少是回歸
        if metric_name in ["latency", "error_rate"]:
            has_regression = deviation > threshold_percent
        else:
            has_regression = deviation < -threshold_percent
        
        if has_regression:
            # 記錄回歸
            self._record_regression(
                metric_name, endpoint, baseline_value, current_value, deviation
            )
        
        return {
            "has_regression": has_regression,
            "metric_name": metric_name,
            "endpoint": endpoint,
            "baseline_value": round(baseline_value, 2),
            "current_value": round(current_value, 2),
            "deviation_percent": round(deviation, 1),
            "threshold_percent": threshold_percent
        }
    
    def _record_regression(
        self,
        metric_name: str,
        endpoint: str,
        baseline_value: float,
        current_value: float,
        deviation: float
    ):
        """記錄性能回歸"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO performance_regressions 
            (id, metric_name, endpoint, baseline_value, current_value, regression_percent, detected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), metric_name, endpoint,
            baseline_value, current_value, deviation,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def list_regressions(
        self,
        acknowledged: bool = False,
        hours: int = 24
    ) -> List[Dict]:
        """列出性能回歸"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute('''
            SELECT * FROM performance_regressions 
            WHERE detected_at > ? AND acknowledged = ?
            ORDER BY regression_percent DESC
        ''', (since, 1 if acknowledged else 0))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "metric_name": row[1],
            "endpoint": row[2],
            "baseline_value": row[3],
            "current_value": row[4],
            "regression_percent": row[5],
            "detected_at": row[6],
            "acknowledged": bool(row[7])
        } for row in rows]
    
    # ==================== 瓶頸識別 ====================
    
    def detect_bottlenecks(self) -> List[Dict]:
        """檢測性能瓶頸"""
        bottlenecks = []
        
        # 獲取各端點性能
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 過去 1 小時的數據
        since = (datetime.now() - timedelta(hours=1)).isoformat()
        
        cursor.execute('''
            SELECT DISTINCT endpoint FROM performance_metrics 
            WHERE endpoint != '' AND timestamp > ?
        ''', (since,))
        
        endpoints = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        slow_endpoints = []
        high_error_endpoints = []
        
        for endpoint in endpoints:
            perf = self.get_endpoint_performance(endpoint)
            
            # 檢查慢端點
            latency = perf.get("latency", {})
            if latency.get("p99", 0) > 2000:  # > 2s
                slow_endpoints.append({
                    "endpoint": endpoint,
                    "p99": latency.get("p99"),
                    "mean": latency.get("mean")
                })
            
            # 檢查高錯誤率
            error_rate = perf.get("error_rate", {})
            if error_rate.get("mean", 0) > 5:  # > 5%
                high_error_endpoints.append({
                    "endpoint": endpoint,
                    "error_rate": error_rate.get("mean")
                })
        
        # 生成瓶頸報告
        if slow_endpoints:
            # 分析慢端點的共同特徵
            bottleneck = self._analyze_slow_endpoints(slow_endpoints)
            if bottleneck:
                bottlenecks.append(bottleneck)
        
        if high_error_endpoints:
            bottleneck = self._analyze_error_endpoints(high_error_endpoints)
            if bottleneck:
                bottlenecks.append(bottleneck)
        
        # 保存瓶頸
        for bn in bottlenecks:
            self._save_bottleneck(bn)
        
        return bottlenecks
    
    def _analyze_slow_endpoints(self, slow_endpoints: List[Dict]) -> Optional[Dict]:
        """分析慢端點"""
        if not slow_endpoints:
            return None
        
        avg_latency = statistics.mean([e["p99"] for e in slow_endpoints])
        endpoints = [e["endpoint"] for e in slow_endpoints]
        
        # 簡單啟發式判斷瓶頸類型
        if any("db" in e.lower() or "database" in e.lower() for e in endpoints):
            bottleneck_type = BottleneckType.DATABASE
            recommendation = "檢查數據庫查詢性能，考慮添加索引或優化查詢"
        elif any("api" in e.lower() or "external" in e.lower() for e in endpoints):
            bottleneck_type = BottleneckType.API
            recommendation = "檢查外部 API 響應時間，考慮添加緩存或超時處理"
        elif avg_latency > 5000:
            bottleneck_type = BottleneckType.IO
            recommendation = "高延遲可能由 I/O 瓶頸造成，檢查磁盤或網絡"
        else:
            bottleneck_type = BottleneckType.UNKNOWN
            recommendation = "進一步分析具體原因"
        
        return {
            "id": str(uuid.uuid4()),
            "bottleneck_type": bottleneck_type.value,
            "description": f"檢測到 {len(slow_endpoints)} 個慢端點，平均 P99 延遲 {avg_latency:.0f}ms",
            "impact_score": min(100, len(slow_endpoints) * 20 + (avg_latency / 100)),
            "affected_endpoints": endpoints,
            "evidence": {"slow_endpoints": slow_endpoints},
            "recommendation": recommendation,
            "detected_at": datetime.now().isoformat()
        }
    
    def _analyze_error_endpoints(self, error_endpoints: List[Dict]) -> Optional[Dict]:
        """分析高錯誤率端點"""
        if not error_endpoints:
            return None
        
        avg_error = statistics.mean([e["error_rate"] for e in error_endpoints])
        endpoints = [e["endpoint"] for e in error_endpoints]
        
        return {
            "id": str(uuid.uuid4()),
            "bottleneck_type": BottleneckType.API.value,
            "description": f"檢測到 {len(error_endpoints)} 個高錯誤率端點，平均錯誤率 {avg_error:.1f}%",
            "impact_score": min(100, len(error_endpoints) * 15 + avg_error * 2),
            "affected_endpoints": endpoints,
            "evidence": {"error_endpoints": error_endpoints},
            "recommendation": "檢查錯誤日誌，分析失敗原因，考慮添加重試機制",
            "detected_at": datetime.now().isoformat()
        }
    
    def _save_bottleneck(self, bottleneck: Dict):
        """保存瓶頸"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO bottlenecks 
            (id, bottleneck_type, description, impact_score, affected_endpoints, evidence, recommendation, detected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            bottleneck["id"], bottleneck["bottleneck_type"],
            bottleneck["description"], bottleneck["impact_score"],
            json.dumps(bottleneck["affected_endpoints"]),
            json.dumps(bottleneck["evidence"]),
            bottleneck["recommendation"], bottleneck["detected_at"]
        ))
        
        conn.commit()
        conn.close()
    
    def list_bottlenecks(
        self,
        resolved: bool = False,
        hours: int = 24
    ) -> List[Dict]:
        """列出瓶頸"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        if resolved:
            query = 'SELECT * FROM bottlenecks WHERE resolved_at IS NOT NULL AND detected_at > ?'
        else:
            query = 'SELECT * FROM bottlenecks WHERE resolved_at IS NULL AND detected_at > ?'
        
        cursor.execute(query + ' ORDER BY impact_score DESC', (since,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "bottleneck_type": row[1],
            "description": row[2],
            "impact_score": row[3],
            "affected_endpoints": json.loads(row[4]) if row[4] else [],
            "evidence": json.loads(row[5]) if row[5] else {},
            "recommendation": row[6],
            "detected_at": row[7],
            "resolved_at": row[8]
        } for row in rows]
    
    def resolve_bottleneck(self, bottleneck_id: str) -> bool:
        """標記瓶頸已解決"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE bottlenecks SET resolved_at = ? WHERE id = ?
            ''', (datetime.now().isoformat(), bottleneck_id))
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    # ==================== 統計 ====================
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """獲取性能摘要"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        
        # 指標統計
        cursor.execute('''
            SELECT category, COUNT(*), AVG(value)
            FROM performance_metrics
            WHERE timestamp > ?
            GROUP BY category
        ''', (hour_ago,))
        
        category_stats = {}
        for row in cursor.fetchall():
            category_stats[row[0]] = {
                "count": row[1],
                "avg_value": round(row[2], 2) if row[2] else 0
            }
        
        # 活躍瓶頸
        cursor.execute('''
            SELECT COUNT(*), AVG(impact_score) FROM bottlenecks WHERE resolved_at IS NULL
        ''')
        bn_row = cursor.fetchone()
        
        # 未確認回歸
        cursor.execute('''
            SELECT COUNT(*) FROM performance_regressions WHERE acknowledged = 0 AND detected_at > ?
        ''', (hour_ago,))
        regression_count = cursor.fetchone()[0]
        
        conn.close()
        
        # 計算總體健康度
        latency_stats = self.get_latency_stats(hours=1)
        error_stats = self.get_error_rate_stats(hours=1)
        
        overall_score = self._calculate_health_score(latency_stats, {}, error_stats)
        
        return {
            "overall_health_score": overall_score,
            "overall_status": self._score_to_status(overall_score),
            "metrics_by_category": category_stats,
            "active_bottlenecks": {
                "count": bn_row[0] or 0,
                "avg_impact": round(bn_row[1] or 0, 1)
            },
            "unacknowledged_regressions": regression_count,
            "latency_summary": latency_stats,
            "error_rate_summary": error_stats,
            "timestamp": datetime.now().isoformat()
        }


# 獲取單例
def get_performance_analyzer() -> PerformanceAnalyzer:
    return PerformanceAnalyzer()

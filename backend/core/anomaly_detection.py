"""
异常检测算法模块
================

功能：
1. 基于统计的异常检测
2. 基于时间序列的异常检测
3. 多维度异常分析
4. 异常评分和排名

算法：
- Z-Score 检测
- IQR (四分位距) 检测
- 移动平均偏差检测
- 趋势突变检测
"""

import math
import time
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import logging

logger = logging.getLogger(__name__)


class AnomalyType(Enum):
    """异常类型"""
    SPIKE = "spike"           # 突增
    DROP = "drop"             # 骤降
    TREND = "trend"           # 趋势异常
    OUTLIER = "outlier"       # 离群值
    PATTERN = "pattern"       # 模式异常
    THRESHOLD = "threshold"   # 阈值异常


class Severity(Enum):
    """严重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """异常对象"""
    id: str
    metric: str
    type: AnomalyType
    severity: Severity
    value: float
    expected: float
    deviation: float
    score: float            # 0-1 异常分数
    timestamp: float
    context: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "metric": self.metric,
            "type": self.type.value,
            "severity": self.severity.value,
            "value": self.value,
            "expected": self.expected,
            "deviation": self.deviation,
            "score": self.score,
            "timestamp": self.timestamp,
            "context": self.context
        }


class MetricBuffer:
    """指标数据缓冲区"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._data: deque = deque(maxlen=max_size)
    
    def add(self, value: float, timestamp: float = None) -> None:
        if timestamp is None:
            timestamp = time.time()
        self._data.append((timestamp, value))
    
    def get_values(self, count: int = None) -> List[float]:
        if count:
            return [v for _, v in list(self._data)[-count:]]
        return [v for _, v in self._data]
    
    def get_with_timestamps(self, count: int = None) -> List[Tuple[float, float]]:
        if count:
            return list(self._data)[-count:]
        return list(self._data)
    
    def __len__(self) -> int:
        return len(self._data)


class StatisticalDetector:
    """统计检测器"""
    
    @staticmethod
    def calculate_stats(values: List[float]) -> Dict[str, float]:
        """计算基本统计量"""
        if not values:
            return {"mean": 0, "std": 0, "min": 0, "max": 0}
        
        n = len(values)
        mean = sum(values) / n
        
        variance = sum((x - mean) ** 2 for x in values) / n if n > 1 else 0
        std = math.sqrt(variance)
        
        sorted_vals = sorted(values)
        
        return {
            "mean": mean,
            "std": std,
            "min": min(values),
            "max": max(values),
            "median": sorted_vals[n // 2],
            "q1": sorted_vals[n // 4] if n >= 4 else sorted_vals[0],
            "q3": sorted_vals[3 * n // 4] if n >= 4 else sorted_vals[-1]
        }
    
    @staticmethod
    def z_score(value: float, mean: float, std: float) -> float:
        """计算 Z-Score"""
        if std == 0:
            return 0
        return (value - mean) / std
    
    @staticmethod
    def is_outlier_zscore(value: float, mean: float, std: float, threshold: float = 3.0) -> bool:
        """使用 Z-Score 检测离群值"""
        return abs(StatisticalDetector.z_score(value, mean, std)) > threshold
    
    @staticmethod
    def is_outlier_iqr(value: float, q1: float, q3: float, factor: float = 1.5) -> bool:
        """使用 IQR 检测离群值"""
        iqr = q3 - q1
        lower = q1 - factor * iqr
        upper = q3 + factor * iqr
        return value < lower or value > upper


class TrendDetector:
    """趋势检测器"""
    
    @staticmethod
    def linear_regression(values: List[float]) -> Tuple[float, float]:
        """简单线性回归，返回 (斜率, 截距)"""
        n = len(values)
        if n < 2:
            return 0, values[0] if values else 0
        
        x_mean = (n - 1) / 2
        y_mean = sum(values) / n
        
        numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        
        return slope, intercept
    
    @staticmethod
    def detect_trend_change(values: List[float], window: int = 10) -> Optional[Dict]:
        """检测趋势变化"""
        if len(values) < window * 2:
            return None
        
        # 前半部分趋势
        first_half = values[-window*2:-window]
        slope1, _ = TrendDetector.linear_regression(first_half)
        
        # 后半部分趋势
        second_half = values[-window:]
        slope2, _ = TrendDetector.linear_regression(second_half)
        
        # 趋势变化
        change = slope2 - slope1
        
        if abs(change) > 0.1:  # 显著变化
            return {
                "previous_trend": slope1,
                "current_trend": slope2,
                "change": change,
                "direction": "accelerating" if change > 0 else "decelerating"
            }
        
        return None
    
    @staticmethod
    def moving_average(values: List[float], window: int = 5) -> List[float]:
        """计算移动平均"""
        if len(values) < window:
            return values
        
        result = []
        for i in range(len(values) - window + 1):
            avg = sum(values[i:i+window]) / window
            result.append(avg)
        
        return result


class AnomalyDetector:
    """
    异常检测器
    
    整合多种检测算法，提供统一的异常检测接口
    """
    
    def __init__(
        self,
        z_threshold: float = 3.0,
        iqr_factor: float = 1.5,
        min_samples: int = 30,
        sensitivity: float = 0.5  # 0-1，越高越敏感
    ):
        self.z_threshold = z_threshold
        self.iqr_factor = iqr_factor
        self.min_samples = min_samples
        self.sensitivity = sensitivity
        
        # 指标缓冲区
        self._buffers: Dict[str, MetricBuffer] = {}
        
        # 异常历史
        self._anomalies: List[Anomaly] = []
        self._max_anomalies = 500
        
        # 统计缓存
        self._stats_cache: Dict[str, Tuple[float, Dict]] = {}  # metric -> (timestamp, stats)
        self._cache_ttl = 60  # 缓存 60 秒
        
        # 计数器
        self._anomaly_count = 0
        
        logger.info("AnomalyDetector initialized")
    
    # ==================== 数据收集 ====================
    
    def record(self, metric: str, value: float, timestamp: float = None) -> Optional[Anomaly]:
        """
        记录指标值并检测异常
        
        Args:
            metric: 指标名称
            value: 指标值
            timestamp: 时间戳
        
        Returns:
            如果检测到异常则返回 Anomaly 对象
        """
        if timestamp is None:
            timestamp = time.time()
        
        # 获取或创建缓冲区
        if metric not in self._buffers:
            self._buffers[metric] = MetricBuffer()
        
        buffer = self._buffers[metric]
        
        # 检测异常（在添加新值之前）
        anomaly = None
        if len(buffer) >= self.min_samples:
            anomaly = self._detect(metric, value, timestamp, buffer)
        
        # 添加新值
        buffer.add(value, timestamp)
        
        # 保存异常
        if anomaly:
            self._add_anomaly(anomaly)
        
        return anomaly
    
    def _detect(
        self, 
        metric: str, 
        value: float, 
        timestamp: float,
        buffer: MetricBuffer
    ) -> Optional[Anomaly]:
        """执行异常检测"""
        values = buffer.get_values()
        stats = self._get_stats(metric, values)
        
        anomaly_type = None
        severity = Severity.LOW
        score = 0
        
        # Z-Score 检测
        z = StatisticalDetector.z_score(value, stats["mean"], stats["std"])
        adjusted_threshold = self.z_threshold * (1 - self.sensitivity * 0.5)
        
        if abs(z) > adjusted_threshold:
            if z > 0:
                anomaly_type = AnomalyType.SPIKE
            else:
                anomaly_type = AnomalyType.DROP
            
            score = min(1.0, abs(z) / (adjusted_threshold * 2))
        
        # IQR 检测（补充）
        if anomaly_type is None:
            if StatisticalDetector.is_outlier_iqr(value, stats["q1"], stats["q3"], self.iqr_factor):
                anomaly_type = AnomalyType.OUTLIER
                iqr = stats["q3"] - stats["q1"]
                if iqr > 0:
                    deviation = abs(value - stats["median"]) / iqr
                    score = min(1.0, deviation / 3)
        
        # 趋势突变检测
        if anomaly_type is None and len(values) >= 20:
            trend_change = TrendDetector.detect_trend_change(values + [value])
            if trend_change and abs(trend_change["change"]) > 0.2:
                anomaly_type = AnomalyType.TREND
                score = min(1.0, abs(trend_change["change"]))
        
        if anomaly_type is None:
            return None
        
        # 确定严重程度
        if score > 0.8:
            severity = Severity.CRITICAL
        elif score > 0.6:
            severity = Severity.HIGH
        elif score > 0.4:
            severity = Severity.MEDIUM
        else:
            severity = Severity.LOW
        
        # 创建异常对象
        self._anomaly_count += 1
        
        return Anomaly(
            id=f"anomaly-{self._anomaly_count}",
            metric=metric,
            type=anomaly_type,
            severity=severity,
            value=value,
            expected=stats["mean"],
            deviation=value - stats["mean"],
            score=score,
            timestamp=timestamp,
            context={
                "z_score": z,
                "std": stats["std"],
                "sample_size": len(values)
            }
        )
    
    def _get_stats(self, metric: str, values: List[float]) -> Dict:
        """获取统计量（带缓存）"""
        now = time.time()
        
        if metric in self._stats_cache:
            cached_time, cached_stats = self._stats_cache[metric]
            if now - cached_time < self._cache_ttl:
                return cached_stats
        
        stats = StatisticalDetector.calculate_stats(values)
        self._stats_cache[metric] = (now, stats)
        
        return stats
    
    def _add_anomaly(self, anomaly: Anomaly) -> None:
        """添加异常到历史"""
        self._anomalies.append(anomaly)
        
        if len(self._anomalies) > self._max_anomalies:
            self._anomalies = self._anomalies[-self._max_anomalies:]
        
        # 发送事件
        if anomaly.severity in [Severity.HIGH, Severity.CRITICAL]:
            try:
                from core.event_emitter import event_emitter, EventType
                event_emitter.emit(EventType.ALERT_NEW, {
                    "type": f"anomaly_{anomaly.type.value}",
                    "level": "warning" if anomaly.severity == Severity.HIGH else "critical",
                    "title": f"异常检测: {anomaly.metric}",
                    "message": f"检测到 {anomaly.type.value}，值={anomaly.value:.2f}，期望={anomaly.expected:.2f}"
                })
            except:
                pass
    
    # ==================== 批量分析 ====================
    
    def analyze_batch(
        self, 
        metric: str, 
        values: List[Tuple[float, float]]  # (timestamp, value)
    ) -> List[Anomaly]:
        """批量分析数据"""
        anomalies = []
        
        for timestamp, value in values:
            anomaly = self.record(metric, value, timestamp)
            if anomaly:
                anomalies.append(anomaly)
        
        return anomalies
    
    def analyze_cross_metric(
        self, 
        metrics: Dict[str, float]
    ) -> List[Anomaly]:
        """跨指标分析"""
        anomalies = []
        timestamp = time.time()
        
        for metric, value in metrics.items():
            anomaly = self.record(metric, value, timestamp)
            if anomaly:
                anomalies.append(anomaly)
        
        # 检测指标间的异常关联
        if len(anomalies) >= 2:
            # 多个指标同时异常可能表示更严重的问题
            for anomaly in anomalies:
                if anomaly.severity == Severity.MEDIUM:
                    anomaly.severity = Severity.HIGH
                    anomaly.context["correlated_anomalies"] = len(anomalies)
        
        return anomalies
    
    # ==================== 查询接口 ====================
    
    def get_recent_anomalies(
        self,
        metric: str = None,
        severity: Severity = None,
        limit: int = 20
    ) -> List[Dict]:
        """获取最近的异常"""
        anomalies = self._anomalies
        
        if metric:
            anomalies = [a for a in anomalies if a.metric == metric]
        
        if severity:
            anomalies = [a for a in anomalies if a.severity == severity]
        
        return [a.to_dict() for a in anomalies[-limit:]][::-1]
    
    def get_anomaly_summary(self) -> Dict:
        """获取异常摘要"""
        now = time.time()
        hour_ago = now - 3600
        
        recent = [a for a in self._anomalies if a.timestamp > hour_ago]
        
        by_type = {}
        by_severity = {}
        by_metric = {}
        
        for a in recent:
            by_type[a.type.value] = by_type.get(a.type.value, 0) + 1
            by_severity[a.severity.value] = by_severity.get(a.severity.value, 0) + 1
            by_metric[a.metric] = by_metric.get(a.metric, 0) + 1
        
        return {
            "total_anomalies": len(self._anomalies),
            "last_hour": len(recent),
            "by_type": by_type,
            "by_severity": by_severity,
            "by_metric": by_metric,
            "most_affected": max(by_metric.items(), key=lambda x: x[1])[0] if by_metric else None
        }
    
    def get_metric_health(self, metric: str) -> Dict:
        """获取指标健康状态"""
        if metric not in self._buffers:
            return {"status": "unknown", "reason": "No data"}
        
        buffer = self._buffers[metric]
        values = buffer.get_values()
        
        if len(values) < self.min_samples:
            return {"status": "insufficient_data", "samples": len(values)}
        
        stats = StatisticalDetector.calculate_stats(values)
        
        # 检查最近的异常
        recent_anomalies = [
            a for a in self._anomalies 
            if a.metric == metric and time.time() - a.timestamp < 3600
        ]
        
        if any(a.severity == Severity.CRITICAL for a in recent_anomalies):
            status = "critical"
        elif any(a.severity == Severity.HIGH for a in recent_anomalies):
            status = "warning"
        elif len(recent_anomalies) > 5:
            status = "unstable"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "current": values[-1] if values else 0,
            "mean": stats["mean"],
            "std": stats["std"],
            "recent_anomalies": len(recent_anomalies),
            "sample_size": len(values)
        }


# ==================== 全局实例 ====================

_detector: Optional[AnomalyDetector] = None


def get_anomaly_detector() -> AnomalyDetector:
    """获取异常检测器"""
    global _detector
    if _detector is None:
        _detector = AnomalyDetector()
    return _detector


# ==================== 便捷函数 ====================

def detect_anomaly(metric: str, value: float) -> Optional[Anomaly]:
    """检测单个值的异常"""
    return get_anomaly_detector().record(metric, value)


def get_metric_status(metric: str) -> Dict:
    """获取指标状态"""
    return get_anomaly_detector().get_metric_health(metric)

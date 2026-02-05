"""
智能告警聚合服务
================

功能：
1. 相似告警合并
2. 告警风暴检测
3. 告警关联分析
4. 智能降噪
5. 根因推断

解决问题：
- 避免告警风暴淹没重要信息
- 减少重复告警干扰
- 关联相关问题便于排查
"""

import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import hashlib
import logging

logger = logging.getLogger(__name__)


class AggregationStrategy(Enum):
    """聚合策略"""
    EXACT = "exact"         # 完全匹配
    SIMILAR = "similar"     # 相似匹配
    TIME_WINDOW = "time"    # 时间窗口
    SOURCE = "source"       # 按来源


@dataclass
class AlertFingerprint:
    """告警指纹（用于识别相似告警）"""
    alert_type: str
    source: str        # API ID 或服务名
    level: str
    
    def to_key(self) -> str:
        return f"{self.alert_type}:{self.source}:{self.level}"
    
    def similarity_key(self) -> str:
        """相似性键（忽略具体来源）"""
        return f"{self.alert_type}:{self.level}"


@dataclass
class AggregatedAlert:
    """聚合告警"""
    id: str
    fingerprint: AlertFingerprint
    
    # 原始告警
    first_alert: Dict
    latest_alert: Dict
    alert_ids: List[str] = field(default_factory=list)
    
    # 统计
    count: int = 1
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    
    # 来源
    sources: Set[str] = field(default_factory=set)
    
    # 状态
    acknowledged: bool = False
    suppressed: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "fingerprint": self.fingerprint.to_key(),
            "type": self.fingerprint.alert_type,
            "level": self.fingerprint.level,
            "count": self.count,
            "sources": list(self.sources),
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "first_alert": self.first_alert,
            "latest_alert": self.latest_alert,
            "alert_ids": self.alert_ids[-10:],  # 最近 10 个
            "acknowledged": self.acknowledged,
            "suppressed": self.suppressed,
            "duration": self.last_seen - self.first_seen
        }


@dataclass
class AlertStormInfo:
    """告警风暴信息"""
    detected: bool = False
    start_time: float = 0
    alert_rate: float = 0    # 每分钟告警数
    total_alerts: int = 0
    affected_types: Set[str] = field(default_factory=set)
    
    def to_dict(self) -> Dict:
        return {
            "detected": self.detected,
            "start_time": self.start_time,
            "alert_rate": self.alert_rate,
            "total_alerts": self.total_alerts,
            "affected_types": list(self.affected_types),
            "duration": time.time() - self.start_time if self.detected else 0
        }


class AlertAggregator:
    """
    告警聚合器
    
    智能合并相似告警，避免告警风暴
    """
    
    def __init__(
        self,
        window_seconds: int = 300,      # 聚合时间窗口
        storm_threshold: int = 20,      # 告警风暴阈值（每分钟）
        storm_window: int = 60,         # 风暴检测窗口（秒）
        similarity_threshold: float = 0.8
    ):
        self.window_seconds = window_seconds
        self.storm_threshold = storm_threshold
        self.storm_window = storm_window
        self.similarity_threshold = similarity_threshold
        
        # 聚合存储
        self._aggregated: Dict[str, AggregatedAlert] = {}
        
        # 时间序列（用于风暴检测）
        self._alert_times: List[float] = []
        
        # 风暴状态
        self._storm: AlertStormInfo = AlertStormInfo()
        
        # 抑制规则
        self._suppression_rules: Dict[str, float] = {}  # fingerprint -> until
        
        # 关联分析
        self._correlations: Dict[str, List[str]] = defaultdict(list)
        
        # 统计
        self._stats = {
            "total_received": 0,
            "total_aggregated": 0,
            "storms_detected": 0,
            "suppressed": 0
        }
        
        logger.info("AlertAggregator initialized")
    
    # ==================== 告警处理 ====================
    
    def process_alert(self, alert: Dict) -> Optional[AggregatedAlert]:
        """
        处理新告警
        
        Returns:
            如果是新的聚合告警则返回，否则返回 None（已合并到现有）
        """
        self._stats["total_received"] += 1
        now = time.time()
        
        # 记录时间（用于风暴检测）
        self._alert_times.append(now)
        self._cleanup_old_times(now)
        
        # 检测告警风暴
        self._check_storm()
        
        # 创建指纹
        fingerprint = self._create_fingerprint(alert)
        
        # 检查抑制规则
        if self._is_suppressed(fingerprint):
            self._stats["suppressed"] += 1
            return None
        
        # 查找现有聚合
        agg_key = fingerprint.to_key()
        existing = self._find_existing(fingerprint, now)
        
        if existing:
            # 合并到现有聚合
            self._merge_alert(existing, alert, now)
            return None
        else:
            # 创建新聚合
            aggregated = self._create_aggregation(alert, fingerprint, now)
            self._aggregated[agg_key] = aggregated
            self._stats["total_aggregated"] += 1
            
            # 分析关联
            self._analyze_correlation(aggregated)
            
            return aggregated
    
    def _create_fingerprint(self, alert: Dict) -> AlertFingerprint:
        """创建告警指纹"""
        return AlertFingerprint(
            alert_type=alert.get("type", "unknown"),
            source=alert.get("api_id", alert.get("source", "system")),
            level=alert.get("level", "warning")
        )
    
    def _find_existing(self, fingerprint: AlertFingerprint, now: float) -> Optional[AggregatedAlert]:
        """查找现有的匹配聚合"""
        key = fingerprint.to_key()
        
        if key in self._aggregated:
            agg = self._aggregated[key]
            # 检查是否在时间窗口内
            if now - agg.last_seen < self.window_seconds:
                return agg
        
        # 尝试相似匹配
        sim_key = fingerprint.similarity_key()
        for agg_key, agg in self._aggregated.items():
            if agg.fingerprint.similarity_key() == sim_key:
                if now - agg.last_seen < self.window_seconds:
                    return agg
        
        return None
    
    def _merge_alert(self, aggregated: AggregatedAlert, alert: Dict, now: float) -> None:
        """合并告警到聚合"""
        aggregated.count += 1
        aggregated.last_seen = now
        aggregated.latest_alert = alert
        aggregated.alert_ids.append(alert.get("id", ""))
        aggregated.sources.add(alert.get("api_id", alert.get("source", "")))
        
        # 限制列表大小
        if len(aggregated.alert_ids) > 100:
            aggregated.alert_ids = aggregated.alert_ids[-100:]
    
    def _create_aggregation(self, alert: Dict, fingerprint: AlertFingerprint, now: float) -> AggregatedAlert:
        """创建新的聚合告警"""
        agg_id = f"agg-{int(now * 1000)}"
        
        return AggregatedAlert(
            id=agg_id,
            fingerprint=fingerprint,
            first_alert=alert,
            latest_alert=alert,
            alert_ids=[alert.get("id", "")],
            first_seen=now,
            last_seen=now,
            sources={alert.get("api_id", alert.get("source", ""))}
        )
    
    # ==================== 告警风暴检测 ====================
    
    def _cleanup_old_times(self, now: float) -> None:
        """清理旧的时间记录"""
        cutoff = now - self.storm_window
        self._alert_times = [t for t in self._alert_times if t > cutoff]
    
    def _check_storm(self) -> bool:
        """检测告警风暴"""
        if len(self._alert_times) < 2:
            if self._storm.detected:
                self._end_storm()
            return False
        
        # 计算告警速率
        duration = self._alert_times[-1] - self._alert_times[0]
        if duration <= 0:
            return False
        
        rate_per_minute = (len(self._alert_times) / duration) * 60
        
        if rate_per_minute >= self.storm_threshold:
            if not self._storm.detected:
                self._start_storm(rate_per_minute)
            else:
                self._storm.alert_rate = rate_per_minute
                self._storm.total_alerts = len(self._alert_times)
            return True
        else:
            if self._storm.detected:
                self._end_storm()
            return False
    
    def _start_storm(self, rate: float) -> None:
        """开始告警风暴"""
        self._storm = AlertStormInfo(
            detected=True,
            start_time=time.time(),
            alert_rate=rate,
            total_alerts=len(self._alert_times)
        )
        self._stats["storms_detected"] += 1
        
        logger.warning(f"Alert storm detected! Rate: {rate:.1f}/min")
        
        # 发送事件
        try:
            from core.event_emitter import event_emitter, EventType
            event_emitter.emit(EventType.ALERT_NEW, {
                "type": "alert_storm",
                "level": "urgent",
                "title": "告警风暴",
                "message": f"检测到告警风暴，速率 {rate:.1f} 条/分钟"
            })
        except:
            pass
    
    def _end_storm(self) -> None:
        """结束告警风暴"""
        if self._storm.detected:
            duration = time.time() - self._storm.start_time
            logger.info(f"Alert storm ended. Duration: {duration:.0f}s, Total: {self._storm.total_alerts}")
        
        self._storm = AlertStormInfo()
    
    def get_storm_status(self) -> Dict:
        """获取风暴状态"""
        return self._storm.to_dict()
    
    # ==================== 告警抑制 ====================
    
    def _is_suppressed(self, fingerprint: AlertFingerprint) -> bool:
        """检查告警是否被抑制"""
        key = fingerprint.to_key()
        if key in self._suppression_rules:
            if time.time() < self._suppression_rules[key]:
                return True
            else:
                del self._suppression_rules[key]
        return False
    
    def suppress_alerts(
        self, 
        alert_type: str = None,
        source: str = None,
        duration: int = 3600
    ) -> int:
        """抑制特定告警"""
        until = time.time() + duration
        count = 0
        
        for agg in self._aggregated.values():
            if alert_type and agg.fingerprint.alert_type != alert_type:
                continue
            if source and source not in agg.sources:
                continue
            
            key = agg.fingerprint.to_key()
            self._suppression_rules[key] = until
            agg.suppressed = True
            count += 1
        
        logger.info(f"Suppressed {count} alert types for {duration}s")
        return count
    
    def clear_suppression(self, key: str = None) -> int:
        """清除抑制规则"""
        if key:
            if key in self._suppression_rules:
                del self._suppression_rules[key]
                return 1
            return 0
        else:
            count = len(self._suppression_rules)
            self._suppression_rules.clear()
            return count
    
    # ==================== 关联分析 ====================
    
    def _analyze_correlation(self, aggregated: AggregatedAlert) -> None:
        """分析告警关联"""
        now = time.time()
        window = 60  # 1 分钟内的告警可能相关
        
        related = []
        for key, agg in self._aggregated.items():
            if agg.id == aggregated.id:
                continue
            
            # 时间相近
            if abs(agg.last_seen - aggregated.first_seen) < window:
                related.append(agg.id)
        
        if related:
            self._correlations[aggregated.id] = related
    
    def get_correlations(self, alert_id: str) -> List[Dict]:
        """获取相关告警"""
        if alert_id not in self._correlations:
            return []
        
        related = []
        for related_id in self._correlations[alert_id]:
            for agg in self._aggregated.values():
                if agg.id == related_id:
                    related.append(agg.to_dict())
                    break
        
        return related
    
    def infer_root_cause(self, alert_id: str) -> Optional[Dict]:
        """推断根因"""
        correlations = self.get_correlations(alert_id)
        if not correlations:
            return None
        
        # 找到最早的相关告警
        earliest = None
        for corr in correlations:
            if earliest is None or corr["first_seen"] < earliest["first_seen"]:
                earliest = corr
        
        if earliest:
            return {
                "probable_root_cause": earliest["id"],
                "type": earliest["type"],
                "first_seen": earliest["first_seen"],
                "confidence": 0.7,
                "related_count": len(correlations)
            }
        
        return None
    
    # ==================== 查询接口 ====================
    
    def get_aggregated_alerts(
        self,
        level: str = None,
        alert_type: str = None,
        limit: int = 50
    ) -> List[Dict]:
        """获取聚合告警列表"""
        now = time.time()
        
        # 清理过期的聚合
        self._cleanup_expired(now)
        
        alerts = []
        for agg in self._aggregated.values():
            if level and agg.fingerprint.level != level:
                continue
            if alert_type and agg.fingerprint.alert_type != alert_type:
                continue
            
            alerts.append(agg.to_dict())
        
        # 按最后出现时间排序
        alerts.sort(key=lambda x: x["last_seen"], reverse=True)
        
        return alerts[:limit]
    
    def _cleanup_expired(self, now: float) -> None:
        """清理过期的聚合"""
        expired_keys = []
        expire_time = self.window_seconds * 2  # 双倍窗口后过期
        
        for key, agg in self._aggregated.items():
            if now - agg.last_seen > expire_time:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._aggregated[key]
    
    def acknowledge(self, alert_id: str) -> bool:
        """确认告警"""
        for agg in self._aggregated.values():
            if agg.id == alert_id:
                agg.acknowledged = True
                return True
        return False
    
    def get_summary(self) -> Dict:
        """获取聚合摘要"""
        now = time.time()
        self._cleanup_expired(now)
        
        by_level = defaultdict(int)
        by_type = defaultdict(int)
        
        for agg in self._aggregated.values():
            by_level[agg.fingerprint.level] += 1
            by_type[agg.fingerprint.alert_type] += 1
        
        return {
            "total_aggregated": len(self._aggregated),
            "by_level": dict(by_level),
            "by_type": dict(by_type),
            "storm_status": self._storm.to_dict(),
            "suppression_count": len(self._suppression_rules),
            **self._stats
        }


# ==================== 全局实例 ====================

_aggregator: Optional[AlertAggregator] = None


def get_alert_aggregator() -> AlertAggregator:
    """获取告警聚合器"""
    global _aggregator
    if _aggregator is None:
        _aggregator = AlertAggregator()
    return _aggregator

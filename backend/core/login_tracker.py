"""
登录成功率追踪器

功能：
1. 追踪每个 API 的登录成功率
2. 追踪每个时间段的成功率
3. 识别异常模式
4. 提供趋势分析
"""

import sys
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class LoginAttempt:
    """登录尝试记录"""
    phone: str
    api_id: str
    timestamp: float = field(default_factory=time.time)
    success: bool = False
    error: str = ""
    duration: float = 0.0  # 登录耗时（秒）
    step: str = ""         # 失败的步骤（send_code, verify_code, 2fa）
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ApiSuccessRate:
    """API 成功率"""
    api_id: str
    period: str  # "1h", "24h", "7d"
    attempts: int = 0
    successes: int = 0
    failures: int = 0
    avg_duration: float = 0.0
    
    @property
    def rate(self) -> float:
        if self.attempts == 0:
            return 0.0
        return self.successes / self.attempts * 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'api_id': self.api_id,
            'period': self.period,
            'attempts': self.attempts,
            'successes': self.successes,
            'failures': self.failures,
            'success_rate': round(self.rate, 2),
            'avg_duration': round(self.avg_duration, 2)
        }


class LoginTracker:
    """
    登录追踪器
    
    职责：
    1. 记录所有登录尝试
    2. 计算成功率
    3. 识别异常
    4. 提供报告
    """
    
    def __init__(self, max_records: int = 50000):
        self.max_records = max_records
        
        # 登录记录
        self._attempts: List[LoginAttempt] = []
        
        # 进行中的登录（phone -> start_time）
        self._in_progress: Dict[str, float] = {}
        
        # 缓存的成功率
        self._rate_cache: Dict[str, Dict[str, ApiSuccessRate]] = {}
        self._cache_time: float = 0
        self._cache_ttl: float = 60  # 缓存 60 秒
        
        print("[LoginTracker] 初始化登录追踪器", file=sys.stderr)
    
    # ==================== 记录接口 ====================
    
    def start_login(self, phone: str, api_id: str) -> None:
        """开始登录"""
        self._in_progress[phone] = time.time()
        print(f"[LoginTracker] 开始登录: {phone} (API: {api_id[:8]}...)", file=sys.stderr)
    
    def complete_login(
        self,
        phone: str,
        api_id: str,
        success: bool,
        error: str = "",
        step: str = ""
    ) -> None:
        """完成登录"""
        start_time = self._in_progress.pop(phone, time.time())
        duration = time.time() - start_time
        
        attempt = LoginAttempt(
            phone=phone,
            api_id=api_id,
            success=success,
            error=error,
            duration=duration,
            step=step
        )
        
        self._attempts.append(attempt)
        
        # 清理旧记录
        if len(self._attempts) > self.max_records:
            self._attempts = self._attempts[-self.max_records:]
        
        # 清除缓存
        self._cache_time = 0
        
        status = "✅ 成功" if success else f"❌ 失败 ({error[:50]})"
        print(f"[LoginTracker] 登录完成: {phone} - {status} ({duration:.1f}s)", file=sys.stderr)
    
    def record_attempt(
        self,
        phone: str,
        api_id: str,
        success: bool,
        error: str = "",
        duration: float = 0.0,
        step: str = ""
    ) -> None:
        """直接记录登录尝试"""
        attempt = LoginAttempt(
            phone=phone,
            api_id=api_id,
            success=success,
            error=error,
            duration=duration,
            step=step
        )
        
        self._attempts.append(attempt)
        
        if len(self._attempts) > self.max_records:
            self._attempts = self._attempts[-self.max_records:]
        
        self._cache_time = 0
    
    # ==================== 成功率计算 ====================
    
    def get_success_rate(self, api_id: str = None, period: str = "24h") -> Dict[str, Any]:
        """
        获取成功率
        
        Args:
            api_id: API ID（可选，不传则返回总体）
            period: 时间段 "1h", "24h", "7d"
        
        Returns:
            成功率数据
        """
        cutoff = self._get_cutoff(period)
        
        # 筛选记录
        records = [
            a for a in self._attempts
            if a.timestamp >= cutoff and (not api_id or a.api_id == api_id)
        ]
        
        if not records:
            return {
                'period': period,
                'api_id': api_id,
                'attempts': 0,
                'successes': 0,
                'failures': 0,
                'success_rate': 0.0,
                'avg_duration': 0.0
            }
        
        successes = sum(1 for r in records if r.success)
        failures = len(records) - successes
        durations = [r.duration for r in records if r.duration > 0]
        
        return {
            'period': period,
            'api_id': api_id,
            'attempts': len(records),
            'successes': successes,
            'failures': failures,
            'success_rate': round(successes / len(records) * 100, 2),
            'avg_duration': round(sum(durations) / len(durations), 2) if durations else 0.0
        }
    
    def get_all_api_rates(self, period: str = "24h") -> List[Dict[str, Any]]:
        """获取所有 API 的成功率"""
        # 检查缓存
        if time.time() - self._cache_time < self._cache_ttl:
            if period in self._rate_cache:
                return [r.to_dict() for r in self._rate_cache[period].values()]
        
        cutoff = self._get_cutoff(period)
        
        # 按 API 分组
        api_records: Dict[str, List[LoginAttempt]] = defaultdict(list)
        for attempt in self._attempts:
            if attempt.timestamp >= cutoff:
                api_records[attempt.api_id].append(attempt)
        
        # 计算每个 API 的成功率
        results = []
        rates: Dict[str, ApiSuccessRate] = {}
        
        for api_id, records in api_records.items():
            successes = sum(1 for r in records if r.success)
            durations = [r.duration for r in records if r.duration > 0]
            
            rate = ApiSuccessRate(
                api_id=api_id,
                period=period,
                attempts=len(records),
                successes=successes,
                failures=len(records) - successes,
                avg_duration=sum(durations) / len(durations) if durations else 0.0
            )
            
            rates[api_id] = rate
            results.append(rate.to_dict())
        
        # 更新缓存
        self._rate_cache[period] = rates
        self._cache_time = time.time()
        
        # 按成功率排序
        results.sort(key=lambda x: x['success_rate'], reverse=True)
        
        return results
    
    def _get_cutoff(self, period: str) -> float:
        """获取时间段的截止时间"""
        now = time.time()
        
        if period == "1h":
            return now - 3600
        elif period == "24h":
            return now - 86400
        elif period == "7d":
            return now - 604800
        elif period == "30d":
            return now - 2592000
        else:
            return now - 86400  # 默认 24h
    
    # ==================== 趋势分析 ====================
    
    def get_hourly_trend(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取每小时趋势"""
        now = time.time()
        trends = []
        
        for i in range(hours):
            start = now - (i + 1) * 3600
            end = now - i * 3600
            
            records = [a for a in self._attempts if start <= a.timestamp < end]
            
            if records:
                successes = sum(1 for r in records if r.success)
                rate = successes / len(records) * 100
            else:
                successes = 0
                rate = 0
            
            trends.append({
                'hour': datetime.fromtimestamp(end).strftime('%H:00'),
                'attempts': len(records),
                'successes': successes,
                'failures': len(records) - successes,
                'success_rate': round(rate, 2)
            })
        
        return list(reversed(trends))
    
    def get_daily_trend(self, days: int = 7) -> List[Dict[str, Any]]:
        """获取每日趋势"""
        now = time.time()
        trends = []
        
        for i in range(days):
            start = now - (i + 1) * 86400
            end = now - i * 86400
            
            records = [a for a in self._attempts if start <= a.timestamp < end]
            
            if records:
                successes = sum(1 for r in records if r.success)
                rate = successes / len(records) * 100
            else:
                successes = 0
                rate = 0
            
            trends.append({
                'date': datetime.fromtimestamp(end).strftime('%Y-%m-%d'),
                'attempts': len(records),
                'successes': successes,
                'failures': len(records) - successes,
                'success_rate': round(rate, 2)
            })
        
        return list(reversed(trends))
    
    # ==================== 异常检测 ====================
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """检测异常模式"""
        anomalies = []
        
        # 获取当前和历史成功率
        current = self.get_success_rate(period="1h")
        baseline = self.get_success_rate(period="24h")
        
        # 成功率突然下降
        if current['attempts'] >= 10 and baseline['attempts'] >= 50:
            if current['success_rate'] < baseline['success_rate'] - 20:
                anomalies.append({
                    'type': 'success_rate_drop',
                    'message': f"成功率突然下降：过去1小时 {current['success_rate']:.1f}%，"
                               f"24小时平均 {baseline['success_rate']:.1f}%",
                    'severity': 'warning',
                    'current': current['success_rate'],
                    'baseline': baseline['success_rate']
                })
        
        # 检查各 API 的异常
        api_rates = self.get_all_api_rates(period="1h")
        for api_rate in api_rates:
            if api_rate['attempts'] >= 5:
                if api_rate['success_rate'] < 50:
                    anomalies.append({
                        'type': 'api_low_success',
                        'message': f"API {api_rate['api_id'][:8]}... 成功率过低：{api_rate['success_rate']:.1f}%",
                        'severity': 'critical' if api_rate['success_rate'] < 30 else 'warning',
                        'api_id': api_rate['api_id'],
                        'success_rate': api_rate['success_rate']
                    })
        
        # 检查登录耗时异常
        recent_durations = [
            a.duration for a in self._attempts[-100:]
            if a.duration > 0 and a.success
        ]
        if len(recent_durations) >= 10:
            avg_duration = sum(recent_durations) / len(recent_durations)
            if avg_duration > 30:  # 超过 30 秒
                anomalies.append({
                    'type': 'slow_login',
                    'message': f"登录耗时异常：平均 {avg_duration:.1f} 秒",
                    'severity': 'warning',
                    'avg_duration': avg_duration
                })
        
        return anomalies
    
    # ==================== 报告生成 ====================
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表板数据"""
        return {
            'overall': {
                '1h': self.get_success_rate(period="1h"),
                '24h': self.get_success_rate(period="24h"),
                '7d': self.get_success_rate(period="7d")
            },
            'by_api': self.get_all_api_rates(period="24h"),
            'hourly_trend': self.get_hourly_trend(hours=24),
            'daily_trend': self.get_daily_trend(days=7),
            'anomalies': self.detect_anomalies(),
            'in_progress': len(self._in_progress),
            'total_records': len(self._attempts)
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """获取摘要"""
        rate_24h = self.get_success_rate(period="24h")
        
        return {
            'total_attempts_24h': rate_24h['attempts'],
            'success_rate_24h': rate_24h['success_rate'],
            'avg_duration': rate_24h['avg_duration'],
            'active_apis': len(set(a.api_id for a in self._attempts[-1000:]))
        }


# ==================== 全局实例 ====================

_tracker: Optional[LoginTracker] = None


def get_login_tracker() -> LoginTracker:
    """获取全局登录追踪器"""
    global _tracker
    if _tracker is None:
        _tracker = LoginTracker()
    return _tracker


def track_login_start(phone: str, api_id: str) -> None:
    """追踪登录开始"""
    get_login_tracker().start_login(phone, api_id)


def track_login_complete(
    phone: str,
    api_id: str,
    success: bool,
    error: str = "",
    step: str = ""
) -> None:
    """追踪登录完成"""
    get_login_tracker().complete_login(phone, api_id, success, error, step)

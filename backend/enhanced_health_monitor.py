"""
TG-Matrix Enhanced Health Monitor
增强的账户健康监控器 - 深度分析账户健康状态，提前发现问题
"""
import asyncio
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import deque
import sys


@dataclass
class HealthMetrics:
    """账户健康指标"""
    account_id: int
    phone: str
    
    # 发送指标
    total_sends: int = 0
    successful_sends: int = 0
    failed_sends: int = 0
    send_success_rate: float = 1.0  # 发送成功率（0-1）
    
    # 响应时间指标
    response_times: deque = field(default_factory=lambda: deque(maxlen=100))  # 最近100次响应时间
    avg_response_time: float = 0.0  # 平均响应时间（毫秒）
    max_response_time: float = 0.0  # 最大响应时间（毫秒）
    min_response_time: float = float('inf')  # 最小响应时间（毫秒）
    
    # 错误指标
    error_count: int = 0
    error_rate: float = 0.0  # 错误率（0-1）
    error_types: Dict[str, int] = field(default_factory=dict)  # 错误类型统计
    
    # Flood Wait 指标
    flood_wait_count: int = 0
    flood_wait_frequency: float = 0.0  # Flood Wait 频率（0-1）
    flood_wait_times: deque = field(default_factory=lambda: deque(maxlen=50))  # 最近50次 Flood Wait 时间
    
    # 连接指标
    connection_errors: int = 0
    proxy_errors: int = 0
    auth_errors: int = 0
    
    # 时间戳
    last_update: datetime = field(default_factory=datetime.now)
    last_success: Optional[datetime] = None
    last_error: Optional[datetime] = None
    
    def update_send_success(self, response_time: float):
        """更新成功发送记录"""
        self.total_sends += 1
        self.successful_sends += 1
        self.send_success_rate = self.successful_sends / self.total_sends if self.total_sends > 0 else 1.0
        
        # 更新响应时间
        self.response_times.append(response_time)
        if len(self.response_times) > 0:
            self.avg_response_time = sum(self.response_times) / len(self.response_times)
            self.max_response_time = max(self.max_response_time, response_time)
            self.min_response_time = min(self.min_response_time, response_time)
        
        self.last_success = datetime.now()
        self.last_update = datetime.now()
        
        # 更新错误率
        self.error_rate = self.error_count / self.total_sends if self.total_sends > 0 else 0.0
    
    def update_send_failure(self, error_type: str, response_time: Optional[float] = None):
        """更新发送失败记录"""
        self.total_sends += 1
        self.failed_sends += 1
        self.send_success_rate = self.successful_sends / self.total_sends if self.total_sends > 0 else 0.0
        
        # 更新错误统计
        self.error_count += 1
        self.error_types[error_type] = self.error_types.get(error_type, 0) + 1
        
        # 更新响应时间（如果有）
        if response_time is not None:
            self.response_times.append(response_time)
            if len(self.response_times) > 0:
                self.avg_response_time = sum(self.response_times) / len(self.response_times)
        
        self.last_error = datetime.now()
        self.last_update = datetime.now()
        
        # 更新错误率
        self.error_rate = self.error_count / self.total_sends if self.total_sends > 0 else 0.0
        
        # 分类错误类型
        if 'Connection' in error_type or 'connection' in error_type:
            self.connection_errors += 1
        elif 'Proxy' in error_type or 'proxy' in error_type:
            self.proxy_errors += 1
        elif 'Auth' in error_type or 'auth' in error_type or 'Invalid' in error_type:
            self.auth_errors += 1
    
    def update_flood_wait(self, wait_seconds: int):
        """更新 Flood Wait 记录"""
        self.flood_wait_count += 1
        self.flood_wait_times.append(wait_seconds)
        self.flood_wait_frequency = self.flood_wait_count / self.total_sends if self.total_sends > 0 else 0.0
        self.last_update = datetime.now()


@dataclass
class Anomaly:
    """异常检测结果"""
    account_id: int
    phone: str
    anomaly_type: str  # 'send_success_rate', 'response_time', 'error_rate', 'flood_wait', 'connection'
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    current_value: float
    threshold: float
    timestamp: datetime = field(default_factory=datetime.now)
    details: Dict = field(default_factory=dict)


class EnhancedHealthMonitor:
    """增强的账户健康监控器"""
    
    def __init__(
        self,
        alert_callback: Optional[Callable] = None,
        check_interval_seconds: int = 300  # 5 分钟
    ):
        """
        初始化增强的健康监控器
        
        Args:
            alert_callback: 告警回调函数
            check_interval_seconds: 检查间隔（秒）
        """
        self.alert_callback = alert_callback
        self.check_interval = check_interval_seconds
        
        # 账户指标：account_id -> HealthMetrics
        self.account_metrics: Dict[int, HealthMetrics] = {}
        
        # 异常历史：account_id -> List[Anomaly]
        self.anomaly_history: Dict[int, List[Anomaly]] = {}
        
        # 阈值配置
        self.thresholds = {
            'send_success_rate_min': 0.8,  # 最小发送成功率 80%
            'response_time_max': 5000.0,    # 最大响应时间 5 秒
            'error_rate_max': 0.2,          # 最大错误率 20%
            'flood_wait_frequency_max': 0.1, # 最大 Flood Wait 频率 10%
            'connection_errors_max': 5,      # 最大连接错误次数
            'consecutive_errors_max': 3      # 最大连续错误次数
        }
    
    def get_or_create_metrics(self, account_id: int, phone: str) -> HealthMetrics:
        """获取或创建账户指标"""
        if account_id not in self.account_metrics:
            self.account_metrics[account_id] = HealthMetrics(
                account_id=account_id,
                phone=phone
            )
        return self.account_metrics[account_id]
    
    def record_send_success(self, account_id: int, phone: str, response_time: float):
        """记录成功发送"""
        metrics = self.get_or_create_metrics(account_id, phone)
        metrics.update_send_success(response_time)
    
    def record_send_failure(self, account_id: int, phone: str, error_type: str, response_time: Optional[float] = None):
        """记录发送失败"""
        metrics = self.get_or_create_metrics(account_id, phone)
        metrics.update_send_failure(error_type, response_time)
    
    def record_flood_wait(self, account_id: int, phone: str, wait_seconds: int):
        """记录 Flood Wait"""
        metrics = self.get_or_create_metrics(account_id, phone)
        metrics.update_flood_wait(wait_seconds)
    
    async def analyze_account_health(self, account_id: int, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        深度分析账户健康状态
        
        Args:
            account_id: 账户 ID
            account_data: 账户数据
        
        Returns:
            健康分析结果
        """
        phone = account_data.get('phone', '')
        metrics = self.account_metrics.get(account_id)
        
        if not metrics:
            # 如果没有指标，返回默认值
            return {
                "account_id": account_id,
                "phone": phone,
                "send_success_rate": 1.0,
                "avg_response_time": 0.0,
                "error_rate": 0.0,
                "flood_wait_frequency": 0.0,
                "ban_risk_score": 0.0,
                "is_healthy": True,
                "anomalies": []
            }
        
        # 计算封禁风险评分（0-1，越高风险越大）
        ban_risk_score = self._calculate_ban_risk_score(metrics)
        
        # 检测异常
        anomalies = await self._detect_anomalies(account_id, phone, metrics)
        
        # 判断是否健康
        is_healthy = (
            metrics.send_success_rate >= self.thresholds['send_success_rate_min'] and
            metrics.avg_response_time <= self.thresholds['response_time_max'] and
            metrics.error_rate <= self.thresholds['error_rate_max'] and
            metrics.flood_wait_frequency <= self.thresholds['flood_wait_frequency_max'] and
            ban_risk_score < 0.5 and
            len([a for a in anomalies if a.severity in ['high', 'critical']]) == 0
        )
        
        return {
            "account_id": account_id,
            "phone": phone,
            "send_success_rate": metrics.send_success_rate,
            "avg_response_time": metrics.avg_response_time,
            "max_response_time": metrics.max_response_time,
            "min_response_time": metrics.min_response_time if metrics.min_response_time != float('inf') else 0.0,
            "error_rate": metrics.error_rate,
            "flood_wait_frequency": metrics.flood_wait_frequency,
            "connection_errors": metrics.connection_errors,
            "proxy_errors": metrics.proxy_errors,
            "auth_errors": metrics.auth_errors,
            "ban_risk_score": ban_risk_score,
            "is_healthy": is_healthy,
            "anomalies": [self._anomaly_to_dict(a) for a in anomalies],
            "total_sends": metrics.total_sends,
            "successful_sends": metrics.successful_sends,
            "failed_sends": metrics.failed_sends,
            "last_success": metrics.last_success.isoformat() if metrics.last_success else None,
            "last_error": metrics.last_error.isoformat() if metrics.last_error else None
        }
    
    def _calculate_ban_risk_score(self, metrics: HealthMetrics) -> float:
        """
        计算封禁风险评分
        
        考虑因素：
        - 发送成功率
        - 错误率
        - Flood Wait 频率
        - 连接错误
        - 响应时间
        
        Returns:
            封禁风险评分（0-1，越高风险越大）
        """
        risk_score = 0.0
        
        # 发送成功率风险（成功率越低，风险越高）
        if metrics.send_success_rate < 0.5:
            risk_score += 0.4
        elif metrics.send_success_rate < 0.7:
            risk_score += 0.2
        elif metrics.send_success_rate < 0.8:
            risk_score += 0.1
        
        # 错误率风险
        if metrics.error_rate > 0.3:
            risk_score += 0.3
        elif metrics.error_rate > 0.2:
            risk_score += 0.15
        elif metrics.error_rate > 0.1:
            risk_score += 0.05
        
        # Flood Wait 频率风险
        if metrics.flood_wait_frequency > 0.2:
            risk_score += 0.2
        elif metrics.flood_wait_frequency > 0.1:
            risk_score += 0.1
        elif metrics.flood_wait_frequency > 0.05:
            risk_score += 0.05
        
        # 连接错误风险
        if metrics.connection_errors > 10:
            risk_score += 0.1
        elif metrics.connection_errors > 5:
            risk_score += 0.05
        
        # 响应时间风险（响应时间过长可能表示问题）
        if metrics.avg_response_time > 10000:  # 10 秒
            risk_score += 0.1
        elif metrics.avg_response_time > 5000:  # 5 秒
            risk_score += 0.05
        
        return min(1.0, risk_score)
    
    async def _detect_anomalies(
        self,
        account_id: int,
        phone: str,
        metrics: HealthMetrics
    ) -> List[Anomaly]:
        """
        检测账户异常行为
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            metrics: 健康指标
        
        Returns:
            异常列表
        """
        anomalies = []
        
        # 1. 检查发送成功率
        if metrics.send_success_rate < self.thresholds['send_success_rate_min']:
            severity = 'critical' if metrics.send_success_rate < 0.5 else 'high' if metrics.send_success_rate < 0.7 else 'medium'
            anomalies.append(Anomaly(
                account_id=account_id,
                phone=phone,
                anomaly_type='send_success_rate',
                severity=severity,
                message=f"发送成功率过低: {metrics.send_success_rate:.2%} (阈值: {self.thresholds['send_success_rate_min']:.2%})",
                current_value=metrics.send_success_rate,
                threshold=self.thresholds['send_success_rate_min'],
                details={
                    "total_sends": metrics.total_sends,
                    "successful_sends": metrics.successful_sends,
                    "failed_sends": metrics.failed_sends
                }
            ))
        
        # 2. 检查响应时间
        if metrics.avg_response_time > self.thresholds['response_time_max']:
            severity = 'high' if metrics.avg_response_time > 10000 else 'medium'
            anomalies.append(Anomaly(
                account_id=account_id,
                phone=phone,
                anomaly_type='response_time',
                severity=severity,
                message=f"平均响应时间过长: {metrics.avg_response_time:.0f}ms (阈值: {self.thresholds['response_time_max']:.0f}ms)",
                current_value=metrics.avg_response_time,
                threshold=self.thresholds['response_time_max'],
                details={
                    "max_response_time": metrics.max_response_time,
                    "min_response_time": metrics.min_response_time
                }
            ))
        
        # 3. 检查错误率
        if metrics.error_rate > self.thresholds['error_rate_max']:
            severity = 'critical' if metrics.error_rate > 0.5 else 'high' if metrics.error_rate > 0.3 else 'medium'
            anomalies.append(Anomaly(
                account_id=account_id,
                phone=phone,
                anomaly_type='error_rate',
                severity=severity,
                message=f"错误率过高: {metrics.error_rate:.2%} (阈值: {self.thresholds['error_rate_max']:.2%})",
                current_value=metrics.error_rate,
                threshold=self.thresholds['error_rate_max'],
                details={
                    "error_types": dict(metrics.error_types),
                    "connection_errors": metrics.connection_errors,
                    "proxy_errors": metrics.proxy_errors,
                    "auth_errors": metrics.auth_errors
                }
            ))
        
        # 4. 检查 Flood Wait 频率
        if metrics.flood_wait_frequency > self.thresholds['flood_wait_frequency_max']:
            severity = 'high' if metrics.flood_wait_frequency > 0.2 else 'medium'
            anomalies.append(Anomaly(
                account_id=account_id,
                phone=phone,
                anomaly_type='flood_wait',
                severity=severity,
                message=f"Flood Wait 频率过高: {metrics.flood_wait_frequency:.2%} (阈值: {self.thresholds['flood_wait_frequency_max']:.2%})",
                current_value=metrics.flood_wait_frequency,
                threshold=self.thresholds['flood_wait_frequency_max'],
                details={
                    "flood_wait_count": metrics.flood_wait_count,
                    "total_sends": metrics.total_sends
                }
            ))
        
        # 5. 检查连接错误
        if metrics.connection_errors > self.thresholds['connection_errors_max']:
            anomalies.append(Anomaly(
                account_id=account_id,
                phone=phone,
                anomaly_type='connection',
                severity='high' if metrics.connection_errors > 10 else 'medium',
                message=f"连接错误过多: {metrics.connection_errors} 次 (阈值: {self.thresholds['connection_errors_max']} 次)",
                current_value=float(metrics.connection_errors),
                threshold=float(self.thresholds['connection_errors_max']),
                details={
                    "connection_errors": metrics.connection_errors,
                    "proxy_errors": metrics.proxy_errors
                }
            ))
        
        # 6. 检查连续错误（基于最近错误时间）
        if metrics.last_error and metrics.last_success:
            time_since_last_success = (datetime.now() - metrics.last_success).total_seconds()
            time_since_last_error = (datetime.now() - metrics.last_error).total_seconds()
            
            # 如果最近有错误且没有成功，可能是连续错误
            if time_since_last_error < time_since_last_success and metrics.failed_sends >= self.thresholds['consecutive_errors_max']:
                anomalies.append(Anomaly(
                    account_id=account_id,
                    phone=phone,
                    anomaly_type='consecutive_errors',
                    severity='high',
                    message=f"连续错误: {metrics.failed_sends} 次失败",
                    current_value=float(metrics.failed_sends),
                    threshold=float(self.thresholds['consecutive_errors_max']),
                    details={
                        "failed_sends": metrics.failed_sends,
                        "last_error": metrics.last_error.isoformat(),
                        "last_success": metrics.last_success.isoformat() if metrics.last_success else None
                    }
                ))
        
        # 记录异常历史
        if anomalies:
            if account_id not in self.anomaly_history:
                self.anomaly_history[account_id] = []
            self.anomaly_history[account_id].extend(anomalies)
            
            # 只保留最近 100 条异常记录
            if len(self.anomaly_history[account_id]) > 100:
                self.anomaly_history[account_id] = self.anomaly_history[account_id][-100:]
            
            # 触发告警
            if self.alert_callback:
                for anomaly in anomalies:
                    if anomaly.severity in ['high', 'critical']:
                        try:
                            self.alert_callback(anomaly)
                        except Exception as e:
                            print(f"[EnhancedHealthMonitor] Error in alert callback: {e}", file=sys.stderr)
        
        return anomalies
    
    def _anomaly_to_dict(self, anomaly: Anomaly) -> Dict:
        """将异常对象转换为字典"""
        return {
            "anomaly_type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "message": anomaly.message,
            "current_value": anomaly.current_value,
            "threshold": anomaly.threshold,
            "timestamp": anomaly.timestamp.isoformat(),
            "details": anomaly.details
        }
    
    def get_anomaly_history(self, account_id: int, limit: int = 50) -> List[Dict]:
        """获取账户异常历史"""
        history = self.anomaly_history.get(account_id, [])
        return [self._anomaly_to_dict(a) for a in history[-limit:]]
    
    def get_metrics(self, account_id: int) -> Optional[HealthMetrics]:
        """获取账户指标"""
        return self.account_metrics.get(account_id)
    
    def get_all_metrics_summary(self) -> Dict[str, Any]:
        """获取所有账户指标摘要"""
        if not self.account_metrics:
            return {
                "total_accounts": 0,
                "healthy_accounts": 0,
                "unhealthy_accounts": 0,
                "avg_send_success_rate": 0.0,
                "avg_response_time": 0.0,
                "total_anomalies": 0
            }
        
        healthy_count = 0
        total_success_rate = 0.0
        total_response_time = 0.0
        total_anomalies = 0
        
        for account_id, metrics in self.account_metrics.items():
            # 简单判断是否健康
            is_healthy = (
                metrics.send_success_rate >= self.thresholds['send_success_rate_min'] and
                metrics.error_rate <= self.thresholds['error_rate_max']
            )
            if is_healthy:
                healthy_count += 1
            
            total_success_rate += metrics.send_success_rate
            total_response_time += metrics.avg_response_time
            total_anomalies += len(self.anomaly_history.get(account_id, []))
        
        account_count = len(self.account_metrics)
        
        return {
            "total_accounts": account_count,
            "healthy_accounts": healthy_count,
            "unhealthy_accounts": account_count - healthy_count,
            "avg_send_success_rate": total_success_rate / account_count if account_count > 0 else 0.0,
            "avg_response_time": total_response_time / account_count if account_count > 0 else 0.0,
            "total_anomalies": total_anomalies
        }


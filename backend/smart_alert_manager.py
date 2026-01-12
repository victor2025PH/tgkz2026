"""
Smart Alert Manager
智能告警管理器 - 自適應告警閾值、告警聚合和去重
"""
import statistics
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum


class AlertSeverity(Enum):
    """告警嚴重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AlertThreshold:
    """告警閾值配置"""
    metric: str
    threshold: float
    severity: AlertSeverity
    window_minutes: int = 60  # 時間窗口（分鐘）


class SmartAlertManager:
    """智能告警管理器"""
    
    def __init__(self, database):
        """
        初始化智能告警管理器
        
        Args:
            database: 數據庫實例
        """
        self.db = database
        self.alert_history: Dict[str, List[float]] = {}  # metric -> [values]
        self.alert_aggregation: Dict[str, Dict[str, Any]] = {}  # alert_key -> aggregation_data
        self.thresholds: Dict[str, AlertThreshold] = {}
    
    async def calculate_dynamic_threshold(
        self, 
        metric: str, 
        days: int = 30
    ) -> float:
        """
        計算動態閾值（基於歷史數據）
        
        Args:
            metric: 指標名稱
            - 'send_failure_rate': 發送失敗率
            - 'account_offline_count': 離線帳號數量
            - 'queue_length': 隊列長度
            - 'response_time': 響應時間
            - 'memory_usage': 內存使用率
            - 'cpu_usage': CPU 使用率
            
        Returns:
            動態閾值
        """
        # 獲取歷史數據（這裡簡化，實際應該從數據庫獲取）
        history = self.alert_history.get(metric, [])
        
        if len(history) < 10:
            # 數據不足，使用默認閾值
            default_thresholds = {
                'send_failure_rate': 0.1,  # 10%
                'account_offline_count': 3,
                'queue_length': 1000,
                'response_time': 5000,  # 5秒
                'memory_usage': 0.8,  # 80%
                'cpu_usage': 0.8  # 80%
            }
            return default_thresholds.get(metric, 100.0)
        
        # 計算統計值
        mean = statistics.mean(history)
        std = statistics.stdev(history) if len(history) > 1 else 0
        
        # 動態閾值 = 均值 + 2倍標準差（覆蓋 95% 的正常情況）
        threshold = mean + 2 * std
        
        # 確保閾值不會太低或太高
        min_thresholds = {
            'send_failure_rate': 0.05,  # 至少 5%
            'account_offline_count': 1,
            'queue_length': 100,
            'response_time': 1000,  # 至少 1秒
            'memory_usage': 0.5,  # 至少 50%
            'cpu_usage': 0.5  # 至少 50%
        }
        
        max_thresholds = {
            'send_failure_rate': 0.5,  # 最多 50%
            'account_offline_count': 10,
            'queue_length': 10000,
            'response_time': 30000,  # 最多 30秒
            'memory_usage': 0.95,  # 最多 95%
            'cpu_usage': 0.95  # 最多 95%
        }
        
        min_threshold = min_thresholds.get(metric, 0)
        max_threshold = max_thresholds.get(metric, float('inf'))
        
        return max(min_threshold, min(threshold, max_threshold))
    
    async def check_anomaly(
        self, 
        metric: str, 
        value: float,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        檢查異常
        
        Args:
            metric: 指標名稱
            value: 當前值
            context: 上下文信息
            
        Returns:
            異常檢查結果
        """
        # 更新歷史數據
        if metric not in self.alert_history:
            self.alert_history[metric] = []
        
        self.alert_history[metric].append(value)
        
        # 只保留最近 100 個值
        if len(self.alert_history[metric]) > 100:
            self.alert_history[metric] = self.alert_history[metric][-100:]
        
        # 計算動態閾值
        threshold = await self.calculate_dynamic_threshold(metric)
        
        # 檢查是否超過閾值
        is_anomaly = value > threshold
        
        # 計算異常程度
        if is_anomaly:
            deviation = (value - threshold) / threshold if threshold > 0 else 0
            
            if deviation > 1.0:  # 超過閾值 100%
                severity = AlertSeverity.CRITICAL
            elif deviation > 0.5:  # 超過閾值 50%
                severity = AlertSeverity.HIGH
            elif deviation > 0.2:  # 超過閾值 20%
                severity = AlertSeverity.MEDIUM
            else:
                severity = AlertSeverity.LOW
        else:
            severity = None
            deviation = 0
        
        return {
            'is_anomaly': is_anomaly,
            'value': value,
            'threshold': threshold,
            'deviation': round(deviation * 100, 2),  # 百分比
            'severity': severity.value if severity else None,
            'metric': metric
        }
    
    async def aggregate_alerts(
        self, 
        alert_type: str,
        message: str,
        time_window_minutes: int = 5
    ) -> bool:
        """
        聚合相同類型的告警（避免告警風暴）
        
        Args:
            alert_type: 告警類型
            message: 告警消息
            time_window_minutes: 時間窗口（分鐘）
            
        Returns:
            是否應該發送告警（True = 發送，False = 聚合）
        """
        alert_key = f"{alert_type}:{message}"
        now = datetime.now()
        
        if alert_key not in self.alert_aggregation:
            # 第一次出現，記錄並發送
            self.alert_aggregation[alert_key] = {
                'first_seen': now,
                'last_seen': now,
                'count': 1,
                'sent': False
            }
            return True
        
        aggregation = self.alert_aggregation[alert_key]
        
        # 檢查是否在時間窗口內
        time_since_first = (now - aggregation['first_seen']).total_seconds() / 60
        
        if time_since_first <= time_window_minutes:
            # 在時間窗口內，增加計數
            aggregation['count'] += 1
            aggregation['last_seen'] = now
            
            # 如果已經發送過，不再重複發送
            if aggregation['sent']:
                return False
            
            # 如果計數達到閾值，發送聚合告警
            if aggregation['count'] >= 3:
                aggregation['sent'] = True
                return True
            
            return False
        else:
            # 超出時間窗口，重置
            self.alert_aggregation[alert_key] = {
                'first_seen': now,
                'last_seen': now,
                'count': 1,
                'sent': False
            }
            return True
    
    async def create_smart_alert(
        self,
        metric: str,
        value: float,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        創建智能告警
        
        Args:
            metric: 指標名稱
            value: 當前值
            context: 上下文信息
            
        Returns:
            告警信息（如果需要發送），否則返回 None
        """
        # 檢查異常
        anomaly_result = await self.check_anomaly(metric, value, context)
        
        if not anomaly_result['is_anomaly']:
            return None
        
        # 構建告警消息
        severity = anomaly_result['severity']
        threshold = anomaly_result['threshold']
        deviation = anomaly_result['deviation']
        
        message = f"{metric} 異常：當前值 {value:.2f}，閾值 {threshold:.2f}，超出 {deviation}%"
        
        # 檢查是否需要聚合
        should_send = await self.aggregate_alerts(metric, message)
        
        if not should_send:
            return None
        
        # 構建告警
        alert = {
            'type': 'smart_alert',
            'metric': metric,
            'severity': severity,
            'message': message,
            'value': value,
            'threshold': threshold,
            'deviation': deviation,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }
        
        return alert
    
    async def get_alert_stats(self) -> Dict[str, Any]:
        """獲取告警統計信息"""
        thresholds = {}
        for metric, values in self.alert_history.items():
            thresholds[metric] = {
                'current_threshold': await self.calculate_dynamic_threshold(metric),
                'history_count': len(values)
            }
        
        return {
            'tracked_metrics': list(self.alert_history.keys()),
            'active_aggregations': len(self.alert_aggregation),
            'thresholds': thresholds
        }
    
    async def update_threshold(
        self,
        metric: str,
        threshold: float,
        severity: AlertSeverity = AlertSeverity.MEDIUM
    ):
        """手動更新閾值"""
        self.thresholds[metric] = AlertThreshold(
            metric=metric,
            threshold=threshold,
            severity=severity
        )
    
    def clear_aggregation(self, alert_key: Optional[str] = None):
        """清除聚合數據"""
        if alert_key:
            if alert_key in self.alert_aggregation:
                del self.alert_aggregation[alert_key]
        else:
            self.alert_aggregation.clear()

"""
錢包監控服務
Wallet Monitoring Service

Phase 3.3: 異常監控告警
- 大額交易監控
- 異常行為檢測
- 風險評分
- 告警通知

優化設計：
1. 實時監控 + 定期掃描
2. 可配置的告警規則
3. 告警分級（信息/警告/嚴重）
4. 告警聚合避免重複通知
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
import threading

from .wallet_service import get_wallet_service

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """告警嚴重程度"""
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'


class AlertType(Enum):
    """告警類型"""
    LARGE_TRANSACTION = 'large_transaction'       # 大額交易
    FREQUENT_TRANSACTIONS = 'frequent_transactions'  # 頻繁交易
    SUSPICIOUS_PATTERN = 'suspicious_pattern'     # 可疑模式
    BALANCE_ANOMALY = 'balance_anomaly'           # 餘額異常
    FAILED_TRANSACTIONS = 'failed_transactions'   # 失敗交易過多
    WALLET_FROZEN = 'wallet_frozen'               # 錢包凍結
    LARGE_REFUND = 'large_refund'                 # 大額退款


# 監控規則配置
MONITORING_RULES = {
    'large_transaction': {
        'enabled': True,
        'threshold': 50000,  # $500 以上視為大額
        'severity': AlertSeverity.WARNING.value,
        'description': '大額交易告警'
    },
    'frequent_transactions': {
        'enabled': True,
        'max_count': 50,     # 1小時內超過50筆
        'time_window': 3600,  # 1小時
        'severity': AlertSeverity.WARNING.value,
        'description': '頻繁交易告警'
    },
    'daily_consume_limit': {
        'enabled': True,
        'threshold': 100000,  # 單日消費超過 $1000
        'severity': AlertSeverity.WARNING.value,
        'description': '單日消費超限'
    },
    'large_refund': {
        'enabled': True,
        'threshold': 20000,  # $200 以上退款
        'severity': AlertSeverity.CRITICAL.value,
        'description': '大額退款告警'
    },
    'negative_balance': {
        'enabled': True,
        'threshold': 0,
        'severity': AlertSeverity.CRITICAL.value,
        'description': '餘額異常（負數）'
    }
}


@dataclass
class Alert:
    """告警記錄"""
    id: str = ''
    type: str = ''
    severity: str = AlertSeverity.INFO.value
    user_id: str = ''
    wallet_id: str = ''
    message: str = ''
    details: Dict = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    acknowledged: bool = False
    acknowledged_by: str = ''
    acknowledged_at: str = ''
    
    def __post_init__(self):
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())


class WalletMonitoringService:
    """錢包監控服務"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
        self._alerts: List[Alert] = []
        self._lock = threading.Lock()
        self._last_scan: Dict[str, datetime] = {}
    
    def _get_connection(self):
        """獲取數據庫連接"""
        return self.wallet_service._get_connection()
    
    # ==================== 實時檢測 ====================
    
    def check_transaction(
        self,
        user_id: str,
        amount: int,
        tx_type: str,
        wallet_id: str = ''
    ) -> List[Alert]:
        """
        檢查單筆交易是否觸發告警
        
        在每次交易後調用
        """
        alerts = []
        
        # 1. 大額交易檢查
        if MONITORING_RULES['large_transaction']['enabled']:
            threshold = MONITORING_RULES['large_transaction']['threshold']
            if abs(amount) >= threshold:
                alert = Alert(
                    type=AlertType.LARGE_TRANSACTION.value,
                    severity=MONITORING_RULES['large_transaction']['severity'],
                    user_id=user_id,
                    wallet_id=wallet_id,
                    message=f"大額交易: ${abs(amount)/100:.2f}",
                    details={
                        'amount': amount,
                        'type': tx_type,
                        'threshold': threshold
                    }
                )
                alerts.append(alert)
                self._add_alert(alert)
        
        # 2. 大額退款檢查
        if tx_type == 'refund' and MONITORING_RULES['large_refund']['enabled']:
            threshold = MONITORING_RULES['large_refund']['threshold']
            if abs(amount) >= threshold:
                alert = Alert(
                    type=AlertType.LARGE_REFUND.value,
                    severity=MONITORING_RULES['large_refund']['severity'],
                    user_id=user_id,
                    wallet_id=wallet_id,
                    message=f"大額退款: ${abs(amount)/100:.2f}",
                    details={
                        'amount': amount,
                        'threshold': threshold
                    }
                )
                alerts.append(alert)
                self._add_alert(alert)
        
        # 3. 頻繁交易檢查（需要查詢歷史）
        if MONITORING_RULES['frequent_transactions']['enabled']:
            freq_alerts = self._check_frequency(user_id, wallet_id)
            alerts.extend(freq_alerts)
        
        return alerts
    
    def _check_frequency(self, user_id: str, wallet_id: str) -> List[Alert]:
        """檢查交易頻率"""
        alerts = []
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            time_window = MONITORING_RULES['frequent_transactions']['time_window']
            max_count = MONITORING_RULES['frequent_transactions']['max_count']
            
            since = (datetime.now() - timedelta(seconds=time_window)).isoformat()
            
            cursor.execute('''
                SELECT COUNT(*) FROM wallet_transactions
                WHERE user_id = ? AND created_at >= ?
            ''', (user_id, since))
            
            count = cursor.fetchone()[0]
            
            if count >= max_count:
                alert = Alert(
                    type=AlertType.FREQUENT_TRANSACTIONS.value,
                    severity=MONITORING_RULES['frequent_transactions']['severity'],
                    user_id=user_id,
                    wallet_id=wallet_id,
                    message=f"頻繁交易: {count} 筆/小時",
                    details={
                        'count': count,
                        'time_window': time_window,
                        'threshold': max_count
                    }
                )
                alerts.append(alert)
                self._add_alert(alert)
                
        finally:
            conn.close()
        
        return alerts
    
    # ==================== 定期掃描 ====================
    
    def scan_anomalies(self) -> List[Alert]:
        """
        掃描系統異常
        
        定期調用（如每5分鐘）
        """
        alerts = []
        
        # 1. 檢查負餘額
        alerts.extend(self._scan_negative_balances())
        
        # 2. 檢查單日消費超限
        alerts.extend(self._scan_daily_consume_limits())
        
        # 3. 檢查凍結錢包
        alerts.extend(self._scan_frozen_wallets())
        
        return alerts
    
    def _scan_negative_balances(self) -> List[Alert]:
        """掃描負餘額錢包"""
        alerts = []
        
        if not MONITORING_RULES['negative_balance']['enabled']:
            return alerts
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, user_id, balance, bonus_balance, frozen_balance
                FROM user_wallets
                WHERE balance < 0 OR bonus_balance < 0
            ''')
            
            for row in cursor.fetchall():
                alert = Alert(
                    type=AlertType.BALANCE_ANOMALY.value,
                    severity=AlertSeverity.CRITICAL.value,
                    user_id=row['user_id'],
                    wallet_id=row['id'],
                    message=f"錢包餘額異常: 主餘額=${row['balance']/100:.2f}",
                    details={
                        'balance': row['balance'],
                        'bonus_balance': row['bonus_balance'],
                        'frozen_balance': row['frozen_balance']
                    }
                )
                alerts.append(alert)
                self._add_alert(alert)
                
        finally:
            conn.close()
        
        return alerts
    
    def _scan_daily_consume_limits(self) -> List[Alert]:
        """掃描單日消費超限"""
        alerts = []
        
        if not MONITORING_RULES['daily_consume_limit']['enabled']:
            return alerts
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            today_start = datetime.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            
            threshold = MONITORING_RULES['daily_consume_limit']['threshold']
            
            cursor.execute('''
                SELECT user_id, SUM(ABS(amount)) as total
                FROM wallet_transactions
                WHERE type = 'consume' 
                AND created_at >= ?
                GROUP BY user_id
                HAVING total >= ?
            ''', (today_start, threshold))
            
            for row in cursor.fetchall():
                # 避免重複告警（同一天同一用戶只告警一次）
                alert_key = f"daily_limit_{row['user_id']}_{datetime.now().strftime('%Y%m%d')}"
                if alert_key not in self._last_scan:
                    self._last_scan[alert_key] = datetime.now()
                    
                    alert = Alert(
                        type=AlertType.SUSPICIOUS_PATTERN.value,
                        severity=AlertSeverity.WARNING.value,
                        user_id=row['user_id'],
                        message=f"單日消費超限: ${row['total']/100:.2f}",
                        details={
                            'total_consumed': row['total'],
                            'threshold': threshold
                        }
                    )
                    alerts.append(alert)
                    self._add_alert(alert)
                    
        finally:
            conn.close()
        
        return alerts
    
    def _scan_frozen_wallets(self) -> List[Alert]:
        """掃描凍結錢包（信息級別）"""
        alerts = []
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, user_id, balance, updated_at
                FROM user_wallets
                WHERE status = 'frozen'
            ''')
            
            for row in cursor.fetchall():
                # 僅記錄，不重複告警
                alert_key = f"frozen_{row['user_id']}"
                if alert_key not in self._last_scan:
                    self._last_scan[alert_key] = datetime.now()
                    
                    alert = Alert(
                        type=AlertType.WALLET_FROZEN.value,
                        severity=AlertSeverity.INFO.value,
                        user_id=row['user_id'],
                        wallet_id=row['id'],
                        message=f"錢包已凍結，餘額: ${row['balance']/100:.2f}",
                        details={
                            'balance': row['balance'],
                            'frozen_at': row['updated_at']
                        }
                    )
                    alerts.append(alert)
                    self._add_alert(alert)
                    
        finally:
            conn.close()
        
        return alerts
    
    # ==================== 告警管理 ====================
    
    def _add_alert(self, alert: Alert):
        """添加告警"""
        with self._lock:
            self._alerts.append(alert)
            # 保留最近1000條
            if len(self._alerts) > 1000:
                self._alerts = self._alerts[-1000:]
        
        logger.warning(f"Alert: [{alert.severity}] {alert.type} - {alert.message}")
    
    def get_alerts(
        self,
        severity: str = None,
        alert_type: str = None,
        user_id: str = None,
        unacknowledged_only: bool = False,
        limit: int = 100
    ) -> List[Alert]:
        """獲取告警列表"""
        alerts = list(self._alerts)
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        if alert_type:
            alerts = [a for a in alerts if a.type == alert_type]
        
        if user_id:
            alerts = [a for a in alerts if a.user_id == user_id]
        
        if unacknowledged_only:
            alerts = [a for a in alerts if not a.acknowledged]
        
        # 按時間降序
        alerts.sort(key=lambda x: x.created_at, reverse=True)
        
        return alerts[:limit]
    
    def acknowledge_alert(self, alert_id: str, operator_id: str) -> bool:
        """確認告警"""
        with self._lock:
            for alert in self._alerts:
                if alert.id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_by = operator_id
                    alert.acknowledged_at = datetime.now().isoformat()
                    return True
        return False
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """獲取告警統計摘要"""
        with self._lock:
            total = len(self._alerts)
            unacknowledged = len([a for a in self._alerts if not a.acknowledged])
            
            by_severity = {}
            by_type = {}
            
            for alert in self._alerts:
                by_severity[alert.severity] = by_severity.get(alert.severity, 0) + 1
                by_type[alert.type] = by_type.get(alert.type, 0) + 1
            
            # 最近24小時的告警
            yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
            recent = len([a for a in self._alerts if a.created_at >= yesterday])
            
            return {
                'total': total,
                'unacknowledged': unacknowledged,
                'recent_24h': recent,
                'by_severity': by_severity,
                'by_type': by_type
            }


# ==================== 全局實例 ====================

_monitoring_service: Optional[WalletMonitoringService] = None


def get_monitoring_service() -> WalletMonitoringService:
    """獲取監控服務實例"""
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = WalletMonitoringService()
    return _monitoring_service

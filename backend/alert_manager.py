"""
TG-Matrix Alert Manager
Handles alert rules, detection, and notification
"""
import sys
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
from database import Database


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(Enum):
    """Types of alerts"""
    ERROR_RATE = "error_rate"
    QUEUE_LENGTH = "queue_length"
    ACCOUNT_HEALTH = "account_health"
    CONNECTION_DISCONNECTED = "connection_disconnected"
    PERFORMANCE_DEGRADED = "performance_degraded"
    DISK_SPACE_LOW = "disk_space_low"
    MEMORY_HIGH = "memory_high"
    CPU_HIGH = "cpu_high"


@dataclass
class AlertRule:
    """Alert rule configuration"""
    alert_type: AlertType
    level: AlertLevel
    threshold: float
    condition: str  # 'greater_than', 'less_than', 'equals'
    message_template: str
    enabled: bool = True
    cooldown_seconds: int = 300  # 5 minutes default cooldown
    check_interval_seconds: int = 180  # 🔧 Phase2: 60s→180s 降低 CPU


@dataclass
class Alert:
    """Alert instance"""
    id: Optional[int] = None
    alert_type: AlertType = None
    level: AlertLevel = None
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class AlertManager:
    """Manages alert rules, detection, and notifications"""
    
    def __init__(self, database: Database, notification_callback: Optional[Callable] = None):
        """
        Initialize alert manager
        
        Args:
            database: Database instance for storing alerts
            notification_callback: Callback function for sending notifications
        """
        self.database = database
        self.notification_callback = notification_callback
        self.rules: Dict[AlertType, AlertRule] = {}
        self.last_alert_times: Dict[str, datetime] = {}  # Track last alert time per rule
        self.running = False
        self.check_task: Optional[asyncio.Task] = None
        self.lock = asyncio.Lock()
        
        # Initialize default rules
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """Initialize default alert rules"""
        self.add_rule(AlertRule(
            alert_type=AlertType.ERROR_RATE,
            level=AlertLevel.WARNING,
            threshold=10.0,  # 10% error rate
            condition='greater_than',
            message_template="错误率超过 {threshold}%: {current_value}%",
            cooldown_seconds=300
        ))
        
        self.add_rule(AlertRule(
            alert_type=AlertType.QUEUE_LENGTH,
            level=AlertLevel.WARNING,
            threshold=100,  # 100 messages
            condition='greater_than',
            message_template="队列长度超过 {threshold}: {current_value}",
            cooldown_seconds=300
        ))
        
        self.add_rule(AlertRule(
            alert_type=AlertType.ACCOUNT_HEALTH,
            level=AlertLevel.WARNING,
            threshold=50.0,  # 50% health score
            condition='less_than',
            message_template="账户 {phone} 健康分数过低: {current_value}%",
            cooldown_seconds=600
        ))
        
        self.add_rule(AlertRule(
            alert_type=AlertType.CONNECTION_DISCONNECTED,
            level=AlertLevel.ERROR,
            threshold=0,  # Any disconnection
            condition='equals',
            message_template="账户 {phone} 连接断开",
            cooldown_seconds=60
        ))
        
        self.add_rule(AlertRule(
            alert_type=AlertType.MEMORY_HIGH,
            level=AlertLevel.WARNING,
            threshold=85.0,  # 85% memory usage
            condition='greater_than',
            message_template="内存使用率过高: {current_value}%",
            cooldown_seconds=300
        ))
        
        # CPU 使用率告警已关闭，不再提示（用户要求去除过多 CPU 提示）
        self.add_rule(AlertRule(
            alert_type=AlertType.CPU_HIGH,
            level=AlertLevel.WARNING,
            threshold=80.0,
            condition='greater_than',
            message_template="CPU 使用率过高: {current_value}%",
            cooldown_seconds=300,
            enabled=False  # 不再触发 CPU 告警
        ))
    
    def add_rule(self, rule: AlertRule):
        """Add or update an alert rule"""
        self.rules[rule.alert_type] = rule
    
    def remove_rule(self, alert_type: AlertType):
        """Remove an alert rule"""
        if alert_type in self.rules:
            del self.rules[alert_type]
    
    async def start(self):
        """Start the alert checking loop"""
        if self.running:
            return
        
        self.running = True
        self.check_task = asyncio.create_task(self._check_loop())
    
    async def stop(self):
        """Stop the alert checking loop"""
        self.running = False
        if self.check_task:
            self.check_task.cancel()
            try:
                await self.check_task
            except asyncio.CancelledError:
                pass
    
    async def _check_loop(self):
        """Main alert checking loop"""
        while self.running:
            try:
                await self.check_all_rules()
                
                # Wait for the minimum check interval
                min_interval = min(
                    (rule.check_interval_seconds for rule in self.rules.values()),
                    default=60
                )
                await asyncio.sleep(min_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in alert check loop: {e}", file=sys.stderr)
                await asyncio.sleep(60)
    
    async def check_all_rules(self):
        """Check all alert rules"""
        for alert_type, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            try:
                await self._check_rule(alert_type, rule)
            except Exception as e:
                import sys
                print(f"Error checking rule {alert_type.value}: {e}", file=sys.stderr)
    
    async def _check_rule(self, alert_type: AlertType, rule: AlertRule):
        """Check a specific alert rule"""
        # Check cooldown
        rule_key = f"{alert_type.value}_{rule.threshold}"
        if rule_key in self.last_alert_times:
            time_since_last = datetime.now() - self.last_alert_times[rule_key]
            if time_since_last.total_seconds() < rule.cooldown_seconds:
                return  # Still in cooldown
        
        # Get current value based on alert type
        current_value, details = await self._get_current_value(alert_type)
        
        if current_value is None:
            return
        
        # Check condition
        should_alert = False
        if rule.condition == 'greater_than':
            should_alert = current_value > rule.threshold
        elif rule.condition == 'less_than':
            should_alert = current_value < rule.threshold
        elif rule.condition == 'equals':
            should_alert = current_value == rule.threshold
        
        if should_alert:
            # Format message
            message = rule.message_template.format(
                threshold=rule.threshold,
                current_value=current_value,
                **details
            )
            
            # Create and send alert
            alert = Alert(
                alert_type=alert_type,
                level=rule.level,
                message=message,
                details=details
            )
            
            await self.trigger_alert(alert)
            
            # Update last alert time
            self.last_alert_times[rule_key] = datetime.now()
        else:
            # 指標已恢復：自動將該類型的未解決告警標記為已解決，避免一直提示
            try:
                n = await self.database.resolve_alerts_by_type(alert_type.value)
                if n > 0:
                    import logging
                    logging.getLogger(__name__).info(
                        "Auto-resolved %d %s alert(s) (metric recovered)",
                        n, alert_type.value
                    )
            except Exception as e:
                import sys
                print(f"Auto-resolve alerts error: {e}", file=sys.stderr)
    
    async def _get_current_value(self, alert_type: AlertType):
        """Get current value for an alert type"""
        if alert_type == AlertType.ERROR_RATE:
            # Calculate error rate from recent logs
            stats = await self.database.get_message_sending_stats(days=1)
            if stats:
                total = sum(s.get('total', 0) for s in stats)
                failed = sum(s.get('failed', 0) for s in stats)
                if total > 0:
                    error_rate = (failed / total) * 100
                    return error_rate, {"total": total, "failed": failed}
            return (None, {})
        
        elif alert_type == AlertType.QUEUE_LENGTH:
            # Get current queue length
            from message_queue import MessageQueue
            # This would need access to message_queue instance
            # For now, query from database
            cursor = await self.database._connection.execute("""
                SELECT COUNT(*) as count
                FROM message_queue
                WHERE status IN ('pending', 'processing', 'retrying')
            """)
            row = await cursor.fetchone()
            if row:
                queue_length = row['count']
                return queue_length, {"queue_length": queue_length}
            return (None, {})
        
        elif alert_type == AlertType.ACCOUNT_HEALTH:
            # Check for accounts with low health
            accounts = await self.database.get_all_accounts()
            low_health_accounts = [
                acc for acc in accounts
                if acc.get('healthScore', 100) < 50
            ]
            if low_health_accounts:
                # Return the lowest health score
                lowest = min(acc.get('healthScore', 100) for acc in low_health_accounts)
                account = next(acc for acc in low_health_accounts if acc.get('healthScore') == lowest)
                return lowest, {"phone": account.get('phone'), "account_id": account.get('id')}
            return (None, {})
        
        elif alert_type == AlertType.CONNECTION_DISCONNECTED:
            # This would be triggered manually when connection is detected as disconnected
            # Return None to skip automatic checking
            return (None, {})
        
        elif alert_type == AlertType.MEMORY_HIGH:
            # Get memory usage from performance monitor
            try:
                from performance_monitor import get_performance_monitor
                monitor = get_performance_monitor()
                if monitor:
                    summary = monitor.get_performance_summary()
                    if summary and 'memory' in summary:
                        memory_percent = summary['memory'].get('current_percent', 0)
                        return memory_percent, {"memory_percent": memory_percent}
            except:
                pass
            return (None, {})
        
        elif alert_type == AlertType.CPU_HIGH:
            # Get CPU usage from performance monitor
            try:
                from performance_monitor import get_performance_monitor
                monitor = get_performance_monitor()
                if monitor:
                    summary = monitor.get_performance_summary()
                    if summary and 'cpu' in summary:
                        cpu_percent = summary['cpu'].get('current', 0)
                        return cpu_percent, {"cpu_percent": cpu_percent}
            except:
                pass
            return (None, {})
        
        return None, {}
    
    async def trigger_alert(self, alert: Alert):
        """Trigger an alert and send notifications"""
        # Save to database
        alert_id = await self.database.add_alert(
            alert_type=alert.alert_type.value,
            level=alert.level.value,
            message=alert.message,
            details=alert.details
        )
        alert.id = alert_id
        
        # Send notification
        if self.notification_callback:
            try:
                self.notification_callback(alert)
            except Exception as e:
                print(f"Error sending alert notification: {e}", file=sys.stderr)
        
        return alert
    
    async def acknowledge_alert(self, alert_id: int):
        """Acknowledge an alert"""
        await self.database.acknowledge_alert(alert_id)
    
    async def resolve_alert(self, alert_id: int):
        """Resolve an alert"""
        await self.database.resolve_alert(alert_id)
    
    async def get_recent_alerts(self, limit: int = 50, level: Optional[AlertLevel] = None) -> List[Alert]:
        """Get recent alerts"""
        alerts_data = await self.database.get_recent_alerts(limit, level.value if level else None)
        
        alerts = []
        for alert_data in alerts_data:
            alert = Alert(
                id=alert_data['id'],
                alert_type=AlertType(alert_data['alert_type']),
                level=AlertLevel(alert_data['level']),
                message=alert_data['message'],
                details=alert_data.get('details', {}),
                timestamp=datetime.fromisoformat(alert_data['timestamp'].replace('Z', '+00:00')),
                acknowledged=bool(alert_data.get('acknowledged', False)),
                acknowledged_at=datetime.fromisoformat(alert_data['acknowledged_at'].replace('Z', '+00:00')) if alert_data.get('acknowledged_at') else None,
                resolved=bool(alert_data.get('resolved', False)),
                resolved_at=datetime.fromisoformat(alert_data['resolved_at'].replace('Z', '+00:00')) if alert_data.get('resolved_at') else None
            )
            alerts.append(alert)
        
        return alerts


# Global alert manager instance
_alert_manager: Optional[AlertManager] = None


def init_alert_manager(database: Database, notification_callback: Optional[Callable] = None) -> AlertManager:
    """Initialize the global alert manager"""
    global _alert_manager
    _alert_manager = AlertManager(database, notification_callback)
    return _alert_manager


def get_alert_manager() -> Optional[AlertManager]:
    """Get the global alert manager instance"""
    return _alert_manager


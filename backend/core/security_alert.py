"""
安全告警系統

功能：
1. 異常登入檢測
2. 攻擊行為識別
3. 風險評估
4. 告警通知
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import json
from collections import defaultdict

logger = logging.getLogger(__name__)


# ==================== 告警類型 ====================

class AlertType(str, Enum):
    # 認證相關
    BRUTE_FORCE = 'brute_force'                     # 暴力破解
    ACCOUNT_LOCKOUT = 'account_lockout'             # 賬戶鎖定
    IMPOSSIBLE_TRAVEL = 'impossible_travel'         # 不可能的移動
    NEW_DEVICE = 'new_device'                       # 新設備登入
    SUSPICIOUS_IP = 'suspicious_ip'                 # 可疑 IP
    
    # 訪問相關
    UNUSUAL_ACCESS_TIME = 'unusual_access_time'     # 異常訪問時間
    UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern'  # 異常訪問模式
    PRIVILEGE_ESCALATION = 'privilege_escalation'  # 權限提升
    
    # 數據相關
    MASS_DATA_ACCESS = 'mass_data_access'           # 大量數據訪問
    SENSITIVE_DATA_ACCESS = 'sensitive_data_access' # 敏感數據訪問
    DATA_EXFILTRATION = 'data_exfiltration'         # 數據外洩
    
    # 系統相關
    API_ABUSE = 'api_abuse'                         # API 濫用
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'     # 超過速率限制
    CONFIG_CHANGE = 'config_change'                 # 配置變更


class AlertSeverity(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


class AlertStatus(str, Enum):
    NEW = 'new'
    ACKNOWLEDGED = 'acknowledged'
    INVESTIGATING = 'investigating'
    RESOLVED = 'resolved'
    FALSE_POSITIVE = 'false_positive'


# ==================== 數據模型 ====================

@dataclass
class SecurityAlert:
    """安全告警"""
    id: str
    type: AlertType
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.NEW
    
    # 主體
    user_id: str = ''
    ip_address: str = ''
    
    # 詳情
    title: str = ''
    description: str = ''
    evidence: Dict = field(default_factory=dict)
    
    # 風險評分 (0-100)
    risk_score: int = 0
    
    # 時間
    created_at: str = ''
    acknowledged_at: str = ''
    resolved_at: str = ''
    
    # 處理
    assigned_to: str = ''
    resolution_notes: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['type'] = self.type.value
        d['severity'] = self.severity.value
        d['status'] = self.status.value
        return d


@dataclass
class DetectionRule:
    """檢測規則"""
    name: str
    alert_type: AlertType
    enabled: bool = True
    
    # 閾值
    threshold: int = 5
    time_window_seconds: int = 300
    
    # 告警
    severity: AlertSeverity = AlertSeverity.MEDIUM
    
    # 自動響應
    auto_block: bool = False
    block_duration: int = 3600


# ==================== 默認規則 ====================

DEFAULT_RULES = [
    DetectionRule(
        name='login_brute_force',
        alert_type=AlertType.BRUTE_FORCE,
        threshold=5,
        time_window_seconds=300,
        severity=AlertSeverity.HIGH,
        auto_block=True,
        block_duration=3600
    ),
    DetectionRule(
        name='rate_limit_abuse',
        alert_type=AlertType.API_ABUSE,
        threshold=10,
        time_window_seconds=60,
        severity=AlertSeverity.MEDIUM,
        auto_block=True,
        block_duration=1800
    ),
    DetectionRule(
        name='mass_data_access',
        alert_type=AlertType.MASS_DATA_ACCESS,
        threshold=100,
        time_window_seconds=60,
        severity=AlertSeverity.HIGH
    ),
]


class SecurityAlertService:
    """安全告警服務"""
    
    _instance: Optional['SecurityAlertService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        # 檢測規則
        self._rules: Dict[str, DetectionRule] = {r.name: r for r in DEFAULT_RULES}
        
        # 事件計數器（滑動窗口）
        self._counters: Dict[str, List[datetime]] = defaultdict(list)
        
        # 告警處理器
        self._handlers: List[Callable[[SecurityAlert], None]] = []
        
        # 用戶設備記錄
        self._user_devices: Dict[str, set] = defaultdict(set)
        
        # 用戶登入位置
        self._user_locations: Dict[str, List[Dict]] = defaultdict(list)
        
        self._init_db()
        self._initialized = True
        logger.info("SecurityAlertService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 安全告警表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT DEFAULT 'new',
                    user_id TEXT,
                    ip_address TEXT,
                    title TEXT,
                    description TEXT,
                    evidence TEXT,
                    risk_score INTEGER DEFAULT 0,
                    created_at TEXT,
                    acknowledged_at TEXT,
                    resolved_at TEXT,
                    assigned_to TEXT,
                    resolution_notes TEXT
                )
            ''')
            
            # 用戶設備表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    device_fingerprint TEXT,
                    device_info TEXT,
                    first_seen TEXT,
                    last_seen TEXT,
                    is_trusted INTEGER DEFAULT 0
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_user ON security_alerts(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_type ON security_alerts(type)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_status ON security_alerts(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_time ON security_alerts(created_at)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init security alert DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 告警處理器 ====================
    
    def add_handler(self, handler: Callable[[SecurityAlert], None]):
        """添加告警處理器"""
        self._handlers.append(handler)
    
    def _notify_handlers(self, alert: SecurityAlert):
        """通知所有處理器"""
        for handler in self._handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler error: {e}")
    
    # ==================== 事件檢測 ====================
    
    def record_event(
        self,
        event_type: str,
        identifier: str,
        metadata: Dict = None
    ) -> Optional[SecurityAlert]:
        """記錄事件並檢測異常"""
        now = datetime.utcnow()
        key = f"{event_type}:{identifier}"
        
        # 添加到計數器
        self._counters[key].append(now)
        
        # 檢查所有相關規則
        for rule in self._rules.values():
            if not rule.enabled:
                continue
            
            if event_type in rule.name or rule.alert_type.value in event_type:
                count = self._get_count(key, rule.time_window_seconds)
                
                if count >= rule.threshold:
                    return self._create_alert_from_rule(rule, identifier, count, metadata)
        
        return None
    
    def _get_count(self, key: str, window_seconds: int) -> int:
        """獲取時間窗口內的計數"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_seconds)
        
        # 清理過期記錄
        self._counters[key] = [ts for ts in self._counters[key] if ts > cutoff]
        
        return len(self._counters[key])
    
    def _create_alert_from_rule(
        self,
        rule: DetectionRule,
        identifier: str,
        count: int,
        metadata: Dict = None
    ) -> SecurityAlert:
        """根據規則創建告警"""
        import uuid
        
        alert = SecurityAlert(
            id=str(uuid.uuid4()),
            type=rule.alert_type,
            severity=rule.severity,
            user_id=identifier if not self._is_ip(identifier) else '',
            ip_address=identifier if self._is_ip(identifier) else '',
            title=f"{rule.alert_type.value.replace('_', ' ').title()} Detected",
            description=f"Detected {count} events in {rule.time_window_seconds}s (threshold: {rule.threshold})",
            evidence={'count': count, 'threshold': rule.threshold, 'metadata': metadata or {}},
            risk_score=self._calculate_risk_score(rule.severity, count, rule.threshold),
            created_at=datetime.utcnow().isoformat()
        )
        
        # 保存告警
        self._save_alert(alert)
        
        # 通知處理器
        self._notify_handlers(alert)
        
        # 自動響應
        if rule.auto_block:
            self._auto_block(identifier, rule.block_duration, rule.alert_type)
        
        logger.warning(f"Security alert: {alert.type.value} for {identifier}")
        
        return alert
    
    def _is_ip(self, value: str) -> bool:
        """檢查是否為 IP 地址"""
        import re
        return bool(re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', value))
    
    def _calculate_risk_score(self, severity: AlertSeverity, count: int, threshold: int) -> int:
        """計算風險評分"""
        base_scores = {
            AlertSeverity.LOW: 20,
            AlertSeverity.MEDIUM: 40,
            AlertSeverity.HIGH: 60,
            AlertSeverity.CRITICAL: 80
        }
        
        base = base_scores.get(severity, 40)
        
        # 根據超過閾值的程度增加分數
        ratio = count / threshold
        modifier = min(20, int((ratio - 1) * 10))
        
        return min(100, base + modifier)
    
    def _auto_block(self, identifier: str, duration: int, reason: AlertType):
        """自動封禁"""
        try:
            from .rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            limiter.ban(identifier, duration, f"Auto-blocked: {reason.value}")
        except Exception as e:
            logger.error(f"Auto-block error: {e}")
    
    def _save_alert(self, alert: SecurityAlert):
        """保存告警"""
        try:
            db = self._get_db()
            db.execute('''
                INSERT INTO security_alerts
                (id, type, severity, status, user_id, ip_address, title, 
                 description, evidence, risk_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id, alert.type.value, alert.severity.value, alert.status.value,
                alert.user_id, alert.ip_address, alert.title, alert.description,
                json.dumps(alert.evidence), alert.risk_score, alert.created_at
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Save alert error: {e}")
    
    # ==================== 特定檢測 ====================
    
    def check_login_failed(self, user_id: str = None, ip: str = None) -> Optional[SecurityAlert]:
        """檢測登入失敗"""
        identifier = user_id or ip
        if not identifier:
            return None
        return self.record_event('login_failed', identifier)
    
    def check_new_device(
        self,
        user_id: str,
        device_fingerprint: str,
        device_info: Dict = None,
        ip_address: str = None
    ) -> Optional[SecurityAlert]:
        """檢測新設備登入"""
        if not device_fingerprint:
            return None
        
        # 檢查是否為已知設備
        if device_fingerprint in self._user_devices.get(user_id, set()):
            return None
        
        # 查詢數據庫
        try:
            db = self._get_db()
            row = db.execute('''
                SELECT id FROM user_devices 
                WHERE user_id = ? AND device_fingerprint = ?
            ''', (user_id, device_fingerprint)).fetchone()
            
            if row:
                # 已知設備，更新最後使用時間
                db.execute('''
                    UPDATE user_devices SET last_seen = ?
                    WHERE user_id = ? AND device_fingerprint = ?
                ''', (datetime.utcnow().isoformat(), user_id, device_fingerprint))
                db.commit()
                db.close()
                
                self._user_devices[user_id].add(device_fingerprint)
                return None
            
            # 新設備，記錄並告警
            db.execute('''
                INSERT INTO user_devices (user_id, device_fingerprint, device_info, first_seen, last_seen)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user_id, device_fingerprint, json.dumps(device_info or {}),
                datetime.utcnow().isoformat(), datetime.utcnow().isoformat()
            ))
            db.commit()
            db.close()
            
            self._user_devices[user_id].add(device_fingerprint)
            
            # 創建告警
            import uuid
            alert = SecurityAlert(
                id=str(uuid.uuid4()),
                type=AlertType.NEW_DEVICE,
                severity=AlertSeverity.MEDIUM,
                user_id=user_id,
                ip_address=ip_address or '',
                title='New Device Login',
                description='Login from a new device detected',
                evidence={'device_info': device_info or {}, 'fingerprint': device_fingerprint[:16] + '...'},
                risk_score=40,
                created_at=datetime.utcnow().isoformat()
            )
            
            self._save_alert(alert)
            self._notify_handlers(alert)
            
            return alert
            
        except Exception as e:
            logger.error(f"Check new device error: {e}")
            return None
    
    def check_unusual_time(
        self,
        user_id: str,
        hour: int = None
    ) -> Optional[SecurityAlert]:
        """檢測異常訪問時間"""
        if hour is None:
            hour = datetime.utcnow().hour
        
        # 夜間訪問（0-5 點）
        if 0 <= hour < 5:
            import uuid
            alert = SecurityAlert(
                id=str(uuid.uuid4()),
                type=AlertType.UNUSUAL_ACCESS_TIME,
                severity=AlertSeverity.LOW,
                user_id=user_id,
                title='Unusual Access Time',
                description=f'Access detected at unusual hour: {hour}:00',
                evidence={'hour': hour},
                risk_score=20,
                created_at=datetime.utcnow().isoformat()
            )
            
            self._save_alert(alert)
            return alert
        
        return None
    
    # ==================== 告警管理 ====================
    
    def get_alerts(
        self,
        status: str = None,
        severity: str = None,
        alert_type: str = None,
        user_id: str = None,
        limit: int = 100
    ) -> List[SecurityAlert]:
        """獲取告警列表"""
        try:
            db = self._get_db()
            
            conditions = []
            params = []
            
            if status:
                conditions.append('status = ?')
                params.append(status)
            if severity:
                conditions.append('severity = ?')
                params.append(severity)
            if alert_type:
                conditions.append('type = ?')
                params.append(alert_type)
            if user_id:
                conditions.append('user_id = ?')
                params.append(user_id)
            
            where_clause = ' AND '.join(conditions) if conditions else '1=1'
            
            rows = db.execute(f'''
                SELECT * FROM security_alerts
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            ''', params + [limit]).fetchall()
            
            db.close()
            
            alerts = []
            for row in rows:
                alerts.append(SecurityAlert(
                    id=row['id'],
                    type=AlertType(row['type']),
                    severity=AlertSeverity(row['severity']),
                    status=AlertStatus(row['status']),
                    user_id=row['user_id'] or '',
                    ip_address=row['ip_address'] or '',
                    title=row['title'] or '',
                    description=row['description'] or '',
                    evidence=json.loads(row['evidence']) if row['evidence'] else {},
                    risk_score=row['risk_score'],
                    created_at=row['created_at'] or '',
                    acknowledged_at=row['acknowledged_at'] or '',
                    resolved_at=row['resolved_at'] or ''
                ))
            
            return alerts
            
        except Exception as e:
            logger.error(f"Get alerts error: {e}")
            return []
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """確認告警"""
        try:
            db = self._get_db()
            db.execute('''
                UPDATE security_alerts 
                SET status = ?, acknowledged_at = ?, assigned_to = ?
                WHERE id = ?
            ''', (AlertStatus.ACKNOWLEDGED.value, datetime.utcnow().isoformat(), user_id, alert_id))
            db.commit()
            db.close()
            return True
        except:
            return False
    
    def resolve_alert(self, alert_id: str, notes: str = '', false_positive: bool = False) -> bool:
        """解決告警"""
        try:
            status = AlertStatus.FALSE_POSITIVE if false_positive else AlertStatus.RESOLVED
            db = self._get_db()
            db.execute('''
                UPDATE security_alerts 
                SET status = ?, resolved_at = ?, resolution_notes = ?
                WHERE id = ?
            ''', (status.value, datetime.utcnow().isoformat(), notes, alert_id))
            db.commit()
            db.close()
            return True
        except:
            return False
    
    # ==================== 統計 ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計"""
        try:
            db = self._get_db()
            
            # 按狀態統計
            by_status = db.execute('''
                SELECT status, COUNT(*) as count 
                FROM security_alerts
                GROUP BY status
            ''').fetchall()
            
            # 按類型統計
            by_type = db.execute('''
                SELECT type, COUNT(*) as count 
                FROM security_alerts
                GROUP BY type
                ORDER BY count DESC
                LIMIT 10
            ''').fetchall()
            
            # 最近 24 小時
            day_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            recent = db.execute('''
                SELECT COUNT(*) as count FROM security_alerts
                WHERE created_at > ?
            ''', (day_ago,)).fetchone()['count']
            
            # 高危告警
            critical = db.execute('''
                SELECT COUNT(*) as count FROM security_alerts
                WHERE severity IN ('high', 'critical') AND status = 'new'
            ''').fetchone()['count']
            
            db.close()
            
            return {
                'by_status': {r['status']: r['count'] for r in by_status},
                'by_type': {r['type']: r['count'] for r in by_type},
                'last_24h': recent,
                'critical_unresolved': critical
            }
            
        except Exception as e:
            logger.error(f"Get security stats error: {e}")
            return {}


# ==================== 單例訪問 ====================

_security_alert_service: Optional[SecurityAlertService] = None


def get_security_alert_service() -> SecurityAlertService:
    """獲取安全告警服務"""
    global _security_alert_service
    if _security_alert_service is None:
        _security_alert_service = SecurityAlertService()
    return _security_alert_service

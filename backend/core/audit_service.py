"""
審計日誌服務

功能：
1. 完整操作記錄
2. 安全事件追蹤
3. 合規審計支持
4. 日誌查詢分析
"""

import os
import sqlite3
import logging
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import uuid

logger = logging.getLogger(__name__)


# ==================== 審計事件類型 ====================

class AuditCategory(str, Enum):
    AUTHENTICATION = 'authentication'   # 認證
    AUTHORIZATION = 'authorization'     # 授權
    DATA_ACCESS = 'data_access'         # 數據訪問
    DATA_MODIFY = 'data_modify'         # 數據修改
    SYSTEM = 'system'                   # 系統
    SECURITY = 'security'               # 安全
    BILLING = 'billing'                 # 計費
    ADMIN = 'admin'                     # 管理員操作


class AuditAction(str, Enum):
    # 認證
    LOGIN = 'login'
    LOGOUT = 'logout'
    LOGIN_FAILED = 'login_failed'
    PASSWORD_CHANGE = 'password_change'
    PASSWORD_RESET = 'password_reset'
    MFA_ENABLED = 'mfa_enabled'
    MFA_DISABLED = 'mfa_disabled'
    
    # 授權
    PERMISSION_GRANTED = 'permission_granted'
    PERMISSION_REVOKED = 'permission_revoked'
    ROLE_ASSIGNED = 'role_assigned'
    
    # 數據
    CREATE = 'create'
    READ = 'read'
    UPDATE = 'update'
    DELETE = 'delete'
    EXPORT = 'export'
    IMPORT = 'import'
    
    # 訂閱
    SUBSCRIPTION_CREATE = 'subscription_create'
    SUBSCRIPTION_UPGRADE = 'subscription_upgrade'
    SUBSCRIPTION_DOWNGRADE = 'subscription_downgrade'
    SUBSCRIPTION_CANCEL = 'subscription_cancel'
    
    # 支付
    PAYMENT_SUCCESS = 'payment_success'
    PAYMENT_FAILED = 'payment_failed'
    REFUND = 'refund'
    
    # 安全
    RATE_LIMITED = 'rate_limited'
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    API_KEY_CREATED = 'api_key_created'
    API_KEY_REVOKED = 'api_key_revoked'
    
    # 系統
    CONFIG_CHANGE = 'config_change'
    SERVICE_START = 'service_start'
    SERVICE_STOP = 'service_stop'


class AuditSeverity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


# ==================== 數據模型 ====================

@dataclass
class AuditLog:
    """審計日誌"""
    id: str
    timestamp: str
    
    # 事件信息
    category: AuditCategory
    action: AuditAction
    severity: AuditSeverity = AuditSeverity.INFO
    
    # 主體
    user_id: str = ''
    username: str = ''
    ip_address: str = ''
    user_agent: str = ''
    
    # 資源
    resource_type: str = ''
    resource_id: str = ''
    
    # 詳情
    description: str = ''
    old_value: Dict = field(default_factory=dict)
    new_value: Dict = field(default_factory=dict)
    metadata: Dict = field(default_factory=dict)
    
    # 結果
    success: bool = True
    error_message: str = ''
    
    # 完整性
    checksum: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['category'] = self.category.value
        d['action'] = self.action.value
        d['severity'] = self.severity.value
        return d
    
    def compute_checksum(self) -> str:
        """計算校驗和"""
        data = f"{self.id}:{self.timestamp}:{self.user_id}:{self.action.value}:{self.resource_id}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]


class AuditService:
    """審計服務"""
    
    _instance: Optional['AuditService'] = None
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
        
        # 批量寫入緩衝
        self._buffer: List[AuditLog] = []
        self._buffer_lock = threading.Lock()
        self._buffer_size = 100
        
        self._init_db()
        self._initialized = True
        logger.info("AuditService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 審計日誌表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    category TEXT NOT NULL,
                    action TEXT NOT NULL,
                    severity TEXT DEFAULT 'info',
                    user_id TEXT,
                    username TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    resource_type TEXT,
                    resource_id TEXT,
                    description TEXT,
                    old_value TEXT,
                    new_value TEXT,
                    metadata TEXT,
                    success INTEGER DEFAULT 1,
                    error_message TEXT,
                    checksum TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init audit DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 日誌記錄 ====================
    
    def log(
        self,
        category: AuditCategory,
        action: AuditAction,
        user_id: str = None,
        username: str = None,
        ip_address: str = None,
        user_agent: str = None,
        resource_type: str = None,
        resource_id: str = None,
        description: str = None,
        old_value: Dict = None,
        new_value: Dict = None,
        metadata: Dict = None,
        success: bool = True,
        error_message: str = None,
        severity: AuditSeverity = None
    ) -> str:
        """記錄審計日誌"""
        
        # 自動判斷嚴重性
        if severity is None:
            if not success:
                severity = AuditSeverity.ERROR
            elif action in [AuditAction.LOGIN_FAILED, AuditAction.SUSPICIOUS_ACTIVITY]:
                severity = AuditSeverity.WARNING
            elif action in [AuditAction.DELETE, AuditAction.PERMISSION_REVOKED]:
                severity = AuditSeverity.WARNING
            else:
                severity = AuditSeverity.INFO
        
        log_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # 脫敏處理
        if old_value:
            old_value = self._sanitize_values(old_value)
        if new_value:
            new_value = self._sanitize_values(new_value)
        
        audit_log = AuditLog(
            id=log_id,
            timestamp=now,
            category=category,
            action=action,
            severity=severity,
            user_id=user_id or '',
            username=username or '',
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            resource_type=resource_type or '',
            resource_id=resource_id or '',
            description=description or '',
            old_value=old_value or {},
            new_value=new_value or {},
            metadata=metadata or {},
            success=success,
            error_message=error_message or ''
        )
        
        audit_log.checksum = audit_log.compute_checksum()
        
        # 添加到緩衝
        with self._buffer_lock:
            self._buffer.append(audit_log)
            if len(self._buffer) >= self._buffer_size:
                self._flush_buffer()
        
        # 關鍵事件立即持久化
        if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
            self._flush_buffer()
        
        return log_id
    
    def _sanitize_values(self, data: Dict) -> Dict:
        """脫敏敏感值"""
        sensitive_keys = {'password', 'secret', 'token', 'api_key', 'credit_card'}
        result = {}
        
        for key, value in data.items():
            if key.lower() in sensitive_keys:
                result[key] = '***'
            elif isinstance(value, dict):
                result[key] = self._sanitize_values(value)
            else:
                result[key] = value
        
        return result
    
    def _flush_buffer(self):
        """刷新緩衝到數據庫"""
        with self._buffer_lock:
            if not self._buffer:
                return
            
            logs_to_write = self._buffer.copy()
            self._buffer.clear()
        
        try:
            db = self._get_db()
            for log in logs_to_write:
                db.execute('''
                    INSERT INTO audit_logs
                    (id, timestamp, category, action, severity, user_id, username,
                     ip_address, user_agent, resource_type, resource_id, description,
                     old_value, new_value, metadata, success, error_message, checksum)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    log.id, log.timestamp, log.category.value, log.action.value,
                    log.severity.value, log.user_id, log.username,
                    log.ip_address, log.user_agent, log.resource_type, log.resource_id,
                    log.description, json.dumps(log.old_value), json.dumps(log.new_value),
                    json.dumps(log.metadata), 1 if log.success else 0,
                    log.error_message, log.checksum
                ))
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Flush audit buffer error: {e}")
    
    def flush(self):
        """手動刷新緩衝"""
        self._flush_buffer()
    
    # ==================== 便捷方法 ====================
    
    def log_login(
        self,
        user_id: str,
        username: str,
        ip_address: str,
        user_agent: str = None,
        success: bool = True,
        error_message: str = None
    ):
        """記錄登入事件"""
        action = AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED
        self.log(
            category=AuditCategory.AUTHENTICATION,
            action=action,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
    
    def log_data_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: AuditAction = AuditAction.READ,
        ip_address: str = None
    ):
        """記錄數據訪問"""
        self.log(
            category=AuditCategory.DATA_ACCESS,
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address
        )
    
    def log_data_change(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: AuditAction,
        old_value: Dict = None,
        new_value: Dict = None,
        ip_address: str = None
    ):
        """記錄數據變更"""
        self.log(
            category=AuditCategory.DATA_MODIFY,
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address
        )
    
    def log_security_event(
        self,
        action: AuditAction,
        description: str,
        user_id: str = None,
        ip_address: str = None,
        severity: AuditSeverity = AuditSeverity.WARNING,
        metadata: Dict = None
    ):
        """記錄安全事件"""
        self.log(
            category=AuditCategory.SECURITY,
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            description=description,
            severity=severity,
            metadata=metadata
        )
    
    def log_admin_action(
        self,
        admin_id: str,
        admin_name: str,
        action: str,
        target_type: str,
        target_id: str,
        description: str = None,
        ip_address: str = None
    ):
        """記錄管理員操作"""
        self.log(
            category=AuditCategory.ADMIN,
            action=AuditAction.UPDATE,
            user_id=admin_id,
            username=admin_name,
            resource_type=target_type,
            resource_id=target_id,
            description=description or f"Admin action: {action}",
            ip_address=ip_address,
            metadata={'admin_action': action}
        )
    
    # ==================== 查詢 ====================
    
    def query(
        self,
        user_id: str = None,
        category: str = None,
        action: str = None,
        resource_type: str = None,
        resource_id: str = None,
        start_time: str = None,
        end_time: str = None,
        severity: str = None,
        success: bool = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """查詢審計日誌"""
        self._flush_buffer()  # 確保最新數據
        
        try:
            db = self._get_db()
            
            conditions = []
            params = []
            
            if user_id:
                conditions.append('user_id = ?')
                params.append(user_id)
            if category:
                conditions.append('category = ?')
                params.append(category)
            if action:
                conditions.append('action = ?')
                params.append(action)
            if resource_type:
                conditions.append('resource_type = ?')
                params.append(resource_type)
            if resource_id:
                conditions.append('resource_id = ?')
                params.append(resource_id)
            if start_time:
                conditions.append('timestamp >= ?')
                params.append(start_time)
            if end_time:
                conditions.append('timestamp <= ?')
                params.append(end_time)
            if severity:
                conditions.append('severity = ?')
                params.append(severity)
            if success is not None:
                conditions.append('success = ?')
                params.append(1 if success else 0)
            
            where_clause = ' AND '.join(conditions) if conditions else '1=1'
            
            rows = db.execute(f'''
                SELECT * FROM audit_logs
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            ''', params + [limit, offset]).fetchall()
            
            db.close()
            
            logs = []
            for row in rows:
                logs.append(AuditLog(
                    id=row['id'],
                    timestamp=row['timestamp'],
                    category=AuditCategory(row['category']),
                    action=AuditAction(row['action']),
                    severity=AuditSeverity(row['severity']),
                    user_id=row['user_id'] or '',
                    username=row['username'] or '',
                    ip_address=row['ip_address'] or '',
                    user_agent=row['user_agent'] or '',
                    resource_type=row['resource_type'] or '',
                    resource_id=row['resource_id'] or '',
                    description=row['description'] or '',
                    old_value=json.loads(row['old_value']) if row['old_value'] else {},
                    new_value=json.loads(row['new_value']) if row['new_value'] else {},
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    success=bool(row['success']),
                    error_message=row['error_message'] or '',
                    checksum=row['checksum'] or ''
                ))
            
            return logs
            
        except Exception as e:
            logger.error(f"Query audit logs error: {e}")
            return []
    
    def get_user_activity(self, user_id: str, days: int = 30) -> List[AuditLog]:
        """獲取用戶活動記錄"""
        start_time = (datetime.utcnow() - timedelta(days=days)).isoformat()
        return self.query(user_id=user_id, start_time=start_time)
    
    def get_security_events(self, hours: int = 24) -> List[AuditLog]:
        """獲取安全事件"""
        start_time = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        return self.query(category='security', start_time=start_time)
    
    # ==================== 統計 ====================
    
    def get_stats(self, days: int = 7) -> Dict[str, Any]:
        """獲取統計信息"""
        self._flush_buffer()
        
        try:
            db = self._get_db()
            start_time = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            # 總數
            total = db.execute('''
                SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= ?
            ''', (start_time,)).fetchone()['count']
            
            # 按類別統計
            by_category = db.execute('''
                SELECT category, COUNT(*) as count 
                FROM audit_logs WHERE timestamp >= ?
                GROUP BY category
            ''', (start_time,)).fetchall()
            
            # 按嚴重性統計
            by_severity = db.execute('''
                SELECT severity, COUNT(*) as count 
                FROM audit_logs WHERE timestamp >= ?
                GROUP BY severity
            ''', (start_time,)).fetchall()
            
            # 失敗事件
            failed = db.execute('''
                SELECT COUNT(*) as count FROM audit_logs 
                WHERE timestamp >= ? AND success = 0
            ''', (start_time,)).fetchone()['count']
            
            # 登入嘗試
            logins = db.execute('''
                SELECT action, COUNT(*) as count 
                FROM audit_logs 
                WHERE timestamp >= ? AND action IN ('login', 'login_failed')
                GROUP BY action
            ''', (start_time,)).fetchall()
            
            db.close()
            
            return {
                'total_events': total,
                'failed_events': failed,
                'by_category': {r['category']: r['count'] for r in by_category},
                'by_severity': {r['severity']: r['count'] for r in by_severity},
                'logins': {r['action']: r['count'] for r in logins},
                'period_days': days
            }
            
        except Exception as e:
            logger.error(f"Get audit stats error: {e}")
            return {}
    
    # ==================== 合規導出 ====================
    
    def export(
        self,
        start_time: str,
        end_time: str,
        format: str = 'json'
    ) -> str:
        """導出審計日誌"""
        logs = self.query(start_time=start_time, end_time=end_time, limit=10000)
        
        if format == 'json':
            return json.dumps([log.to_dict() for log in logs], indent=2)
        elif format == 'csv':
            lines = ['timestamp,category,action,user_id,resource_type,resource_id,success']
            for log in logs:
                lines.append(f"{log.timestamp},{log.category.value},{log.action.value},"
                           f"{log.user_id},{log.resource_type},{log.resource_id},{log.success}")
            return '\n'.join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")


# ==================== 單例訪問 ====================

_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """獲取審計服務"""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service

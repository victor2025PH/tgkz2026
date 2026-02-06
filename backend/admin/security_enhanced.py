"""
安全增強管理

功能：
- 基於角色的訪問控制（RBAC）
- 細粒度權限管理
- API 密鑰加密存儲
- 安全審計
- 敏感數據脫敏
- 密鑰輪換
"""

import logging
import sqlite3
import os
import json
import uuid
import hashlib
import hmac
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Set
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps

# 使用標準庫實現加密（無需外部依賴）
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'security.db')
KEY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', '.security_key')


class Permission(str, Enum):
    """權限類型"""
    # API 池權限
    API_READ = "api:read"
    API_WRITE = "api:write"
    API_DELETE = "api:delete"
    API_ALLOCATE = "api:allocate"
    
    # 租戶權限
    TENANT_READ = "tenant:read"
    TENANT_WRITE = "tenant:write"
    TENANT_DELETE = "tenant:delete"
    
    # 系統權限
    SYSTEM_CONFIG = "system:config"
    SYSTEM_AUDIT = "system:audit"
    SYSTEM_ADMIN = "system:admin"
    
    # 報表權限
    REPORT_READ = "report:read"
    REPORT_EXPORT = "report:export"


class Role(str, Enum):
    """預定義角色"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"
    API_USER = "api_user"


# 角色-權限映射
ROLE_PERMISSIONS = {
    Role.SUPER_ADMIN: {p for p in Permission},  # 所有權限
    Role.ADMIN: {
        Permission.API_READ, Permission.API_WRITE, Permission.API_DELETE, Permission.API_ALLOCATE,
        Permission.TENANT_READ, Permission.TENANT_WRITE,
        Permission.SYSTEM_CONFIG, Permission.SYSTEM_AUDIT,
        Permission.REPORT_READ, Permission.REPORT_EXPORT
    },
    Role.OPERATOR: {
        Permission.API_READ, Permission.API_WRITE, Permission.API_ALLOCATE,
        Permission.TENANT_READ,
        Permission.REPORT_READ
    },
    Role.VIEWER: {
        Permission.API_READ, Permission.TENANT_READ, Permission.REPORT_READ
    },
    Role.API_USER: {
        Permission.API_READ, Permission.API_ALLOCATE
    }
}


@dataclass
class AccessToken:
    """訪問令牌"""
    id: str
    user_id: str
    token_hash: str
    name: str = ""
    scopes: List[str] = field(default_factory=list)
    expires_at: str = ""
    last_used: str = ""
    created_at: str = ""
    is_revoked: bool = False


@dataclass
class SecurityEvent:
    """安全事件"""
    id: str
    event_type: str  # login/logout/access_denied/key_rotated/etc
    user_id: str = ""
    resource: str = ""
    action: str = ""
    result: str = ""  # success/failure
    ip_address: str = ""
    user_agent: str = ""
    details: Dict = field(default_factory=dict)
    timestamp: str = ""


class EncryptionService:
    """加密服務"""
    
    def __init__(self, key: bytes = None):
        if key:
            self._key = key
        else:
            self._key = self._load_or_create_key()
        
        self._fernet = Fernet(self._key)
    
    def _load_or_create_key(self) -> bytes:
        """加載或創建加密密鑰"""
        os.makedirs(os.path.dirname(KEY_PATH), exist_ok=True)
        
        if os.path.exists(KEY_PATH):
            with open(KEY_PATH, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(KEY_PATH, 'wb') as f:
                f.write(key)
            os.chmod(KEY_PATH, 0o600)  # 僅所有者可讀寫
            return key
    
    def encrypt(self, plaintext: str) -> str:
        """加密字符串"""
        encrypted = self._fernet.encrypt(plaintext.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')
    
    def decrypt(self, ciphertext: str) -> str:
        """解密字符串"""
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode('utf-8'))
            decrypted = self._fernet.decrypt(encrypted)
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"解密失敗: {e}")
            return ""
    
    def hash_password(self, password: str, salt: bytes = None) -> tuple:
        """哈希密碼"""
        if salt is None:
            salt = secrets.token_bytes(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key.decode(), base64.urlsafe_b64encode(salt).decode()
    
    def verify_password(self, password: str, hashed: str, salt_b64: str) -> bool:
        """驗證密碼"""
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        new_hash, _ = self.hash_password(password, salt)
        return hmac.compare_digest(new_hash, hashed)
    
    def rotate_key(self) -> bytes:
        """輪換加密密鑰"""
        old_key = self._key
        new_key = Fernet.generate_key()
        
        # 保存新密鑰
        with open(KEY_PATH, 'wb') as f:
            f.write(new_key)
        os.chmod(KEY_PATH, 0o600)
        
        self._key = new_key
        self._fernet = Fernet(new_key)
        
        return old_key


class SecurityManager:
    """安全管理器"""
    
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
        self.encryption = EncryptionService()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 用戶角色表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id TEXT PRIMARY KEY,
                roles TEXT DEFAULT '[]',
                custom_permissions TEXT DEFAULT '[]',
                tenant_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 訪問令牌表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                name TEXT,
                scopes TEXT DEFAULT '[]',
                expires_at TEXT,
                last_used TEXT,
                created_at TEXT,
                is_revoked INTEGER DEFAULT 0
            )
        ''')
        
        # 加密密鑰表（用於 API 密鑰等）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS encrypted_secrets (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                secret_type TEXT,
                encrypted_value TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TEXT,
                rotated_at TEXT
            )
        ''')
        
        # 安全事件表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                user_id TEXT,
                resource TEXT,
                action TEXT,
                result TEXT,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT DEFAULT '{}',
                timestamp TEXT
            )
        ''')
        
        # 密鑰輪換歷史
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS key_rotation_history (
                id TEXT PRIMARY KEY,
                key_type TEXT,
                rotated_by TEXT,
                rotated_at TEXT,
                affected_records INTEGER DEFAULT 0
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_token_user ON access_tokens(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_token_hash ON access_tokens(token_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_event_type ON security_events(event_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_event_time ON security_events(timestamp)')
        
        conn.commit()
        conn.close()
        logger.info("安全數據庫已初始化")
    
    # ==================== 角色權限管理 ====================
    
    def assign_role(
        self,
        user_id: str,
        roles: List[str],
        tenant_id: str = None,
        custom_permissions: List[str] = None
    ) -> bool:
        """分配角色"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO user_roles 
                (user_id, roles, custom_permissions, tenant_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, 
                    COALESCE((SELECT created_at FROM user_roles WHERE user_id = ?), ?), ?)
            ''', (
                user_id, json.dumps(roles), json.dumps(custom_permissions or []),
                tenant_id, user_id, now, now
            ))
            
            conn.commit()
            conn.close()
            
            self.log_event("role_assigned", user_id=user_id, details={"roles": roles})
            return True
        except Exception as e:
            logger.error(f"分配角色失敗: {e}")
            return False
    
    def get_user_permissions(self, user_id: str) -> Set[str]:
        """獲取用戶權限"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT roles, custom_permissions, is_active FROM user_roles WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row or not row[2]:  # 用戶不存在或未激活
            return set()
        
        roles = json.loads(row[0]) if row[0] else []
        custom = json.loads(row[1]) if row[1] else []
        
        permissions = set(custom)
        
        for role_name in roles:
            try:
                role = Role(role_name)
                permissions.update(p.value for p in ROLE_PERMISSIONS.get(role, set()))
            except ValueError:
                continue
        
        return permissions
    
    def check_permission(
        self,
        user_id: str,
        permission: Permission,
        resource_id: str = None
    ) -> bool:
        """檢查權限"""
        permissions = self.get_user_permissions(user_id)
        has_permission = permission.value in permissions
        
        # 記錄訪問檢查
        if not has_permission:
            self.log_event(
                "access_denied",
                user_id=user_id,
                resource=resource_id or "",
                action=permission.value,
                result="denied"
            )
        
        return has_permission
    
    def get_user_roles(self, user_id: str) -> Dict:
        """獲取用戶角色信息"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_roles WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "user_id": row[0],
                "roles": json.loads(row[1]) if row[1] else [],
                "custom_permissions": json.loads(row[2]) if row[2] else [],
                "tenant_id": row[3],
                "is_active": bool(row[4]),
                "created_at": row[5],
                "updated_at": row[6]
            }
        return {}
    
    # ==================== 令牌管理 ====================
    
    def create_token(
        self,
        user_id: str,
        name: str = "",
        scopes: List[str] = None,
        expires_in_days: int = 30
    ) -> tuple:
        """創建訪問令牌，返回 (token_id, raw_token)"""
        token_id = str(uuid.uuid4())
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        expires_at = (datetime.now() + timedelta(days=expires_in_days)).isoformat()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO access_tokens 
            (id, user_id, token_hash, name, scopes, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            token_id, user_id, token_hash, name,
            json.dumps(scopes or []), expires_at, datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        self.log_event("token_created", user_id=user_id, details={"token_id": token_id})
        
        return token_id, raw_token
    
    def validate_token(self, raw_token: str) -> Optional[Dict]:
        """驗證令牌"""
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, user_id, scopes, expires_at, is_revoked
            FROM access_tokens 
            WHERE token_hash = ?
        ''', (token_hash,))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
        
        token_id, user_id, scopes, expires_at, is_revoked = row
        
        # 檢查是否已撤銷
        if is_revoked:
            conn.close()
            return None
        
        # 檢查是否過期
        if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
            conn.close()
            return None
        
        # 更新最後使用時間
        cursor.execute(
            'UPDATE access_tokens SET last_used = ? WHERE id = ?',
            (datetime.now().isoformat(), token_id)
        )
        conn.commit()
        conn.close()
        
        return {
            "token_id": token_id,
            "user_id": user_id,
            "scopes": json.loads(scopes) if scopes else [],
            "expires_at": expires_at
        }
    
    def revoke_token(self, token_id: str, user_id: str = None) -> bool:
        """撤銷令牌"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            query = 'UPDATE access_tokens SET is_revoked = 1 WHERE id = ?'
            params = [token_id]
            
            if user_id:
                query += ' AND user_id = ?'
                params.append(user_id)
            
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            
            self.log_event("token_revoked", user_id=user_id or "", details={"token_id": token_id})
            return True
        except Exception:
            return False
    
    def list_tokens(self, user_id: str) -> List[Dict]:
        """列出用戶令牌"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, scopes, expires_at, last_used, created_at, is_revoked
            FROM access_tokens 
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "scopes": json.loads(row[2]) if row[2] else [],
            "expires_at": row[3],
            "last_used": row[4],
            "created_at": row[5],
            "is_revoked": bool(row[6])
        } for row in rows]
    
    # ==================== 密鑰管理 ====================
    
    def store_secret(
        self,
        owner_id: str,
        secret_type: str,
        secret_value: str,
        metadata: Dict = None
    ) -> str:
        """存儲加密密鑰"""
        secret_id = str(uuid.uuid4())
        encrypted = self.encryption.encrypt(secret_value)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO encrypted_secrets 
            (id, owner_id, secret_type, encrypted_value, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            secret_id, owner_id, secret_type, encrypted,
            json.dumps(metadata or {}), datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return secret_id
    
    def get_secret(self, secret_id: str, owner_id: str = None) -> Optional[str]:
        """獲取解密後的密鑰"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT encrypted_value, owner_id FROM encrypted_secrets WHERE id = ?'
        cursor.execute(query, (secret_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        # 如果指定了 owner_id，驗證所有權
        if owner_id and row[1] != owner_id:
            self.log_event(
                "unauthorized_secret_access",
                user_id=owner_id,
                resource=secret_id,
                result="denied"
            )
            return None
        
        return self.encryption.decrypt(row[0])
    
    def rotate_secrets(self, secret_type: str = None) -> int:
        """輪換密鑰（重新加密所有密鑰）"""
        old_key = self.encryption.rotate_key()
        old_fernet = Fernet(old_key)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT id, encrypted_value FROM encrypted_secrets'
        if secret_type:
            query += ' WHERE secret_type = ?'
            cursor.execute(query, (secret_type,))
        else:
            cursor.execute(query)
        
        rows = cursor.fetchall()
        rotated_count = 0
        
        for secret_id, encrypted in rows:
            try:
                # 用舊密鑰解密
                decrypted_bytes = base64.urlsafe_b64decode(encrypted.encode('utf-8'))
                plaintext = old_fernet.decrypt(decrypted_bytes).decode('utf-8')
                
                # 用新密鑰加密
                new_encrypted = self.encryption.encrypt(plaintext)
                
                cursor.execute('''
                    UPDATE encrypted_secrets SET encrypted_value = ?, rotated_at = ?
                    WHERE id = ?
                ''', (new_encrypted, datetime.now().isoformat(), secret_id))
                
                rotated_count += 1
            except Exception as e:
                logger.error(f"輪換密鑰 {secret_id} 失敗: {e}")
        
        # 記錄輪換歷史
        cursor.execute('''
            INSERT INTO key_rotation_history (id, key_type, rotated_at, affected_records)
            VALUES (?, ?, ?, ?)
        ''', (str(uuid.uuid4()), secret_type or "all", datetime.now().isoformat(), rotated_count))
        
        conn.commit()
        conn.close()
        
        self.log_event("key_rotated", details={"type": secret_type, "count": rotated_count})
        
        return rotated_count
    
    # ==================== 數據脫敏 ====================
    
    def mask_sensitive(self, data: Dict, fields: List[str] = None) -> Dict:
        """脫敏敏感數據"""
        default_fields = ['password', 'secret', 'token', 'api_key', 'api_hash', 'phone']
        mask_fields = set(fields or default_fields)
        
        def mask_value(value: str) -> str:
            if not value or len(value) < 4:
                return '****'
            return value[:2] + '*' * (len(value) - 4) + value[-2:]
        
        def process(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {
                    k: mask_value(str(v)) if any(f in k.lower() for f in mask_fields) else process(v)
                    for k, v in obj.items()
                }
            elif isinstance(obj, list):
                return [process(item) for item in obj]
            return obj
        
        return process(data)
    
    # ==================== 安全事件記錄 ====================
    
    def log_event(
        self,
        event_type: str,
        user_id: str = "",
        resource: str = "",
        action: str = "",
        result: str = "success",
        ip_address: str = "",
        user_agent: str = "",
        details: Dict = None
    ):
        """記錄安全事件"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events 
                (id, event_type, user_id, resource, action, result, ip_address, user_agent, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), event_type, user_id, resource, action, result,
                ip_address, user_agent, json.dumps(details or {}), datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"記錄安全事件失敗: {e}")
    
    def query_events(
        self,
        event_type: str = None,
        user_id: str = None,
        result: str = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """查詢安全事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = 'SELECT * FROM security_events WHERE timestamp > ?'
        params = [since]
        
        if event_type:
            query += ' AND event_type = ?'
            params.append(event_type)
        
        if user_id:
            query += ' AND user_id = ?'
            params.append(user_id)
        
        if result:
            query += ' AND result = ?'
            params.append(result)
        
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "event_type": row[1],
            "user_id": row[2],
            "resource": row[3],
            "action": row[4],
            "result": row[5],
            "ip_address": row[6],
            "user_agent": row[7],
            "details": json.loads(row[8]) if row[8] else {},
            "timestamp": row[9]
        } for row in rows]
    
    def get_security_summary(self) -> Dict[str, Any]:
        """獲取安全概要"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        day_ago = (datetime.now() - timedelta(days=1)).isoformat()
        
        # 最近事件統計
        cursor.execute('''
            SELECT event_type, result, COUNT(*) 
            FROM security_events 
            WHERE timestamp > ?
            GROUP BY event_type, result
        ''', (day_ago,))
        
        event_stats = {}
        for row in cursor.fetchall():
            key = f"{row[0]}_{row[1]}"
            event_stats[key] = row[2]
        
        # 失敗登錄
        cursor.execute('''
            SELECT COUNT(*) FROM security_events 
            WHERE event_type = 'login' AND result = 'failure' AND timestamp > ?
        ''', (hour_ago,))
        failed_logins = cursor.fetchone()[0]
        
        # 拒絕訪問
        cursor.execute('''
            SELECT COUNT(*) FROM security_events 
            WHERE event_type = 'access_denied' AND timestamp > ?
        ''', (hour_ago,))
        access_denied = cursor.fetchone()[0]
        
        # 活躍令牌數
        cursor.execute('''
            SELECT COUNT(*) FROM access_tokens 
            WHERE is_revoked = 0 AND (expires_at IS NULL OR expires_at > ?)
        ''', (datetime.now().isoformat(),))
        active_tokens = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "failed_logins_1h": failed_logins,
            "access_denied_1h": access_denied,
            "active_tokens": active_tokens,
            "event_stats_24h": event_stats,
            "timestamp": datetime.now().isoformat()
        }


# 裝飾器：權限檢查
def require_permission(permission: Permission):
    """權限檢查裝飾器"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise PermissionError("未提供用戶ID")
            
            manager = get_security_manager()
            if not manager.check_permission(user_id, permission):
                raise PermissionError(f"權限不足: {permission.value}")
            
            return await func(*args, user_id=user_id, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, user_id: str = None, **kwargs):
            if not user_id:
                raise PermissionError("未提供用戶ID")
            
            manager = get_security_manager()
            if not manager.check_permission(user_id, permission):
                raise PermissionError(f"權限不足: {permission.value}")
            
            return func(*args, user_id=user_id, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# 獲取單例
def get_security_manager() -> SecurityManager:
    return SecurityManager()

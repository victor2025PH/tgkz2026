"""
TG-Matrix Security Module
安全模塊

提供:
- 輸入驗證
- 請求限流
- 敏感數據加密
- API 認證
"""

import sys
import re
import hmac
import hashlib
import base64
import secrets
from typing import Dict, Any, Optional, List, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps
import threading
import json

from core.logging import get_logger

logger = get_logger('Security')


# ============ 輸入驗證 ============

class ValidationError(Exception):
    """驗證錯誤"""
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"{field}: {message}")


class InputValidator:
    """
    輸入驗證器
    
    驗證和清理用戶輸入
    """
    
    # 危險字符和模式
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # XSS
        r'javascript:',                 # JavaScript 協議
        r'on\w+\s*=',                   # 事件處理器
        r'data:text/html',              # Data URI
        r'\$\{.*?\}',                   # 模板注入
        r'{{.*?}}',                     # Angular 模板
        r'__proto__',                   # 原型污染
        r'constructor\s*\[',            # 原型污染
    ]
    
    # 電話號碼格式
    PHONE_PATTERN = re.compile(r'^\+?[1-9]\d{6,14}$')
    
    # 用戶名格式
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_]{3,30}$')
    
    # 郵箱格式
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 10000) -> str:
        """
        清理字符串輸入
        
        - 移除危險字符
        - 限制長度
        - 移除控制字符
        """
        if not isinstance(value, str):
            value = str(value)
        
        # 限制長度
        if len(value) > max_length:
            value = value[:max_length]
        
        # 移除控制字符（保留換行和制表符）
        value = ''.join(c for c in value if c >= ' ' or c in '\n\t\r')
        
        # 檢查危險模式
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Dangerous pattern detected and removed", pattern=pattern)
                value = re.sub(pattern, '', value, flags=re.IGNORECASE)
        
        return value.strip()
    
    @classmethod
    def validate_phone(cls, phone: str) -> str:
        """驗證電話號碼"""
        # 移除空格和連字符
        phone = re.sub(r'[\s\-\(\)]', '', phone)
        
        if not cls.PHONE_PATTERN.match(phone):
            raise ValidationError('phone', 'Invalid phone number format', phone)
        
        return phone
    
    @classmethod
    def validate_username(cls, username: str) -> str:
        """驗證用戶名"""
        username = username.strip()
        
        # 移除 @ 前綴
        if username.startswith('@'):
            username = username[1:]
        
        if not cls.USERNAME_PATTERN.match(username):
            raise ValidationError('username', 'Invalid username format', username)
        
        return username
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """驗證郵箱"""
        email = email.strip().lower()
        
        if not cls.EMAIL_PATTERN.match(email):
            raise ValidationError('email', 'Invalid email format', email)
        
        return email
    
    @classmethod
    def validate_int(
        cls, 
        value: Any, 
        min_val: Optional[int] = None, 
        max_val: Optional[int] = None,
        field_name: str = 'value'
    ) -> int:
        """驗證整數"""
        try:
            result = int(value)
        except (ValueError, TypeError):
            raise ValidationError(field_name, 'Must be an integer', value)
        
        if min_val is not None and result < min_val:
            raise ValidationError(field_name, f'Must be at least {min_val}', value)
        
        if max_val is not None and result > max_val:
            raise ValidationError(field_name, f'Must be at most {max_val}', value)
        
        return result
    
    @classmethod
    def validate_float(
        cls, 
        value: Any, 
        min_val: Optional[float] = None, 
        max_val: Optional[float] = None,
        field_name: str = 'value'
    ) -> float:
        """驗證浮點數"""
        try:
            result = float(value)
        except (ValueError, TypeError):
            raise ValidationError(field_name, 'Must be a number', value)
        
        if min_val is not None and result < min_val:
            raise ValidationError(field_name, f'Must be at least {min_val}', value)
        
        if max_val is not None and result > max_val:
            raise ValidationError(field_name, f'Must be at most {max_val}', value)
        
        return result
    
    @classmethod
    def validate_enum(
        cls, 
        value: str, 
        allowed: List[str],
        field_name: str = 'value'
    ) -> str:
        """驗證枚舉值"""
        if value not in allowed:
            raise ValidationError(
                field_name, 
                f'Must be one of: {", ".join(allowed)}', 
                value
            )
        return value
    
    @classmethod
    def validate_list(
        cls, 
        value: Any, 
        min_length: int = 0,
        max_length: int = 1000,
        field_name: str = 'value'
    ) -> List:
        """驗證列表"""
        if not isinstance(value, list):
            raise ValidationError(field_name, 'Must be a list', value)
        
        if len(value) < min_length:
            raise ValidationError(field_name, f'Must have at least {min_length} items', value)
        
        if len(value) > max_length:
            raise ValidationError(field_name, f'Must have at most {max_length} items', value)
        
        return value
    
    @classmethod
    def validate_dict(cls, value: Any, field_name: str = 'value') -> Dict:
        """驗證字典"""
        if not isinstance(value, dict):
            raise ValidationError(field_name, 'Must be an object', value)
        return value


# ============ 請求限流 ============

@dataclass
class RateLimitRule:
    """限流規則"""
    name: str
    max_requests: int
    window_seconds: float
    penalty_seconds: float = 0  # 超限後的懲罰時間


class RateLimiter:
    """
    請求限流器
    
    支持:
    - 滑動窗口計數
    - 多級限流規則
    - IP/用戶級別限流
    """
    
    def __init__(self):
        self._counters: Dict[str, List[datetime]] = {}
        self._blocked: Dict[str, datetime] = {}  # 被阻止的鍵及解除時間
        self._lock = threading.RLock()
        
        # 默認規則
        self._rules: Dict[str, RateLimitRule] = {
            'default': RateLimitRule('default', 100, 60.0),
            'api': RateLimitRule('api', 60, 60.0),
            'auth': RateLimitRule('auth', 5, 60.0, penalty_seconds=300.0),
            'message': RateLimitRule('message', 30, 60.0),
            'ai': RateLimitRule('ai', 20, 60.0),
        }
    
    def add_rule(self, rule: RateLimitRule) -> None:
        """添加限流規則"""
        self._rules[rule.name] = rule
    
    def check(self, key: str, rule_name: str = 'default') -> bool:
        """
        檢查是否允許請求
        
        Args:
            key: 限流鍵（如 IP、用戶 ID）
            rule_name: 規則名稱
            
        Returns:
            True 如果允許，False 如果被限流
        """
        rule = self._rules.get(rule_name, self._rules['default'])
        full_key = f"{rule_name}:{key}"
        
        with self._lock:
            now = datetime.now()
            
            # 檢查是否被阻止
            if full_key in self._blocked:
                if now < self._blocked[full_key]:
                    return False
                else:
                    del self._blocked[full_key]
            
            # 獲取或創建計數器
            if full_key not in self._counters:
                self._counters[full_key] = []
            
            counter = self._counters[full_key]
            
            # 清理過期記錄
            window_start = now - timedelta(seconds=rule.window_seconds)
            counter[:] = [t for t in counter if t > window_start]
            
            # 檢查是否超限
            if len(counter) >= rule.max_requests:
                # 應用懲罰
                if rule.penalty_seconds > 0:
                    self._blocked[full_key] = now + timedelta(seconds=rule.penalty_seconds)
                    logger.warning(f"Rate limit exceeded, blocked", key=key, rule=rule_name)
                return False
            
            # 記錄請求
            counter.append(now)
            return True
    
    def get_remaining(self, key: str, rule_name: str = 'default') -> int:
        """獲取剩餘請求數"""
        rule = self._rules.get(rule_name, self._rules['default'])
        full_key = f"{rule_name}:{key}"
        
        with self._lock:
            if full_key not in self._counters:
                return rule.max_requests
            
            now = datetime.now()
            window_start = now - timedelta(seconds=rule.window_seconds)
            current = sum(1 for t in self._counters[full_key] if t > window_start)
            
            return max(0, rule.max_requests - current)
    
    def reset(self, key: str, rule_name: str = 'default') -> None:
        """重置計數器"""
        full_key = f"{rule_name}:{key}"
        with self._lock:
            if full_key in self._counters:
                del self._counters[full_key]
            if full_key in self._blocked:
                del self._blocked[full_key]


# ============ 數據加密 ============

class DataEncryption:
    """
    數據加密工具
    
    用於加密敏感配置和憑證
    """
    
    def __init__(self, secret_key: Optional[str] = None):
        if secret_key:
            self._key = hashlib.sha256(secret_key.encode()).digest()
        else:
            # 生成隨機密鑰（應該從安全存儲中讀取）
            self._key = secrets.token_bytes(32)
    
    def encrypt(self, data: str) -> str:
        """
        加密數據
        
        使用簡單的 XOR + Base64（生產環境應使用 AES）
        """
        if not data:
            return ''
        
        # 生成 IV
        iv = secrets.token_bytes(16)
        
        # 擴展密鑰
        key_stream = self._expand_key(len(data) + 16, iv)
        
        # XOR 加密
        data_bytes = data.encode('utf-8')
        encrypted = bytes(b ^ k for b, k in zip(data_bytes, key_stream))
        
        # 組合 IV 和密文
        result = iv + encrypted
        
        return base64.b64encode(result).decode('ascii')
    
    def decrypt(self, encrypted_data: str) -> str:
        """解密數據"""
        if not encrypted_data:
            return ''
        
        try:
            # 解碼
            data = base64.b64decode(encrypted_data)
            
            # 提取 IV
            iv = data[:16]
            ciphertext = data[16:]
            
            # 擴展密鑰
            key_stream = self._expand_key(len(ciphertext), iv)
            
            # XOR 解密
            decrypted = bytes(b ^ k for b, k in zip(ciphertext, key_stream))
            
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return ''
    
    def hash_password(self, password: str, salt: Optional[str] = None) -> tuple:
        """
        哈希密碼
        
        Returns:
            (hash, salt)
        """
        if salt is None:
            salt = secrets.token_hex(16)
        
        hash_value = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        
        return base64.b64encode(hash_value).decode('ascii'), salt
    
    def verify_password(self, password: str, hash_value: str, salt: str) -> bool:
        """驗證密碼"""
        new_hash, _ = self.hash_password(password, salt)
        return hmac.compare_digest(new_hash, hash_value)
    
    def _expand_key(self, length: int, iv: bytes) -> bytes:
        """擴展密鑰流"""
        result = bytearray()
        counter = 0
        
        while len(result) < length:
            block = hashlib.sha256(self._key + iv + counter.to_bytes(4, 'big')).digest()
            result.extend(block)
            counter += 1
        
        return bytes(result[:length])


# ============ API 認證 ============

@dataclass
class APIToken:
    """API 令牌"""
    token: str
    user_id: str
    permissions: Set[str]
    created_at: datetime
    expires_at: Optional[datetime]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at


class APIAuthenticator:
    """
    API 認證器
    
    管理 API 令牌和權限
    """
    
    def __init__(self, secret_key: str = 'tg-matrix-secret'):
        self._secret_key = secret_key
        self._tokens: Dict[str, APIToken] = {}
        self._lock = threading.RLock()
    
    def generate_token(
        self,
        user_id: str,
        permissions: Optional[Set[str]] = None,
        expires_in: float = 86400.0,  # 24 小時
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """生成 API 令牌"""
        token = secrets.token_urlsafe(32)
        
        api_token = APIToken(
            token=token,
            user_id=user_id,
            permissions=permissions or {'read'},
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(seconds=expires_in) if expires_in > 0 else None,
            metadata=metadata or {}
        )
        
        with self._lock:
            self._tokens[token] = api_token
        
        logger.info(f"API token generated", user_id=user_id)
        return token
    
    def validate_token(self, token: str) -> Optional[APIToken]:
        """驗證令牌"""
        with self._lock:
            api_token = self._tokens.get(token)
            
            if api_token is None:
                return None
            
            if api_token.is_expired:
                del self._tokens[token]
                return None
            
            return api_token
    
    def revoke_token(self, token: str) -> bool:
        """撤銷令牌"""
        with self._lock:
            if token in self._tokens:
                del self._tokens[token]
                return True
            return False
    
    def revoke_user_tokens(self, user_id: str) -> int:
        """撤銷用戶的所有令牌"""
        with self._lock:
            to_remove = [
                token for token, api_token in self._tokens.items()
                if api_token.user_id == user_id
            ]
            for token in to_remove:
                del self._tokens[token]
            return len(to_remove)
    
    def check_permission(self, token: str, permission: str) -> bool:
        """檢查權限"""
        api_token = self.validate_token(token)
        if api_token is None:
            return False
        return permission in api_token.permissions or 'admin' in api_token.permissions
    
    def cleanup_expired(self) -> int:
        """清理過期令牌"""
        with self._lock:
            to_remove = [
                token for token, api_token in self._tokens.items()
                if api_token.is_expired
            ]
            for token in to_remove:
                del self._tokens[token]
            return len(to_remove)


# ============ 全局實例 ============

_rate_limiter: Optional[RateLimiter] = None
_authenticator: Optional[APIAuthenticator] = None
_encryption: Optional[DataEncryption] = None


def get_rate_limiter() -> RateLimiter:
    """獲取限流器"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


def get_authenticator() -> APIAuthenticator:
    """獲取認證器"""
    global _authenticator
    if _authenticator is None:
        _authenticator = APIAuthenticator()
    return _authenticator


def get_encryption(secret_key: Optional[str] = None) -> DataEncryption:
    """獲取加密器"""
    global _encryption
    if _encryption is None:
        _encryption = DataEncryption(secret_key)
    return _encryption


# ============ 裝飾器 ============

def rate_limited(rule_name: str = 'default', key_fn: Optional[Callable] = None):
    """
    限流裝飾器
    
    用法:
        @rate_limited('api')
        async def handle_request(payload, context):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 提取限流鍵
            if key_fn:
                key = key_fn(*args, **kwargs)
            else:
                # 默認使用 request_id 或函數名
                key = kwargs.get('request_id', func.__name__)
            
            limiter = get_rate_limiter()
            if not limiter.check(str(key), rule_name):
                raise Exception(f"Rate limit exceeded for {rule_name}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_permission(permission: str):
    """
    權限驗證裝飾器
    
    用法:
        @require_permission('admin')
        async def admin_action(payload, context):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            context = kwargs.get('context', {})
            token = context.get('token')
            
            if not token:
                raise PermissionError("Authentication required")
            
            auth = get_authenticator()
            if not auth.check_permission(token, permission):
                raise PermissionError(f"Permission denied: {permission}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def validate_input(schema: Dict[str, Any]):
    """
    輸入驗證裝飾器
    
    用法:
        @validate_input({
            'phone': {'type': 'phone', 'required': True},
            'message': {'type': 'string', 'max_length': 1000}
        })
        async def send_message(payload, context):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(payload: Dict[str, Any], *args, **kwargs):
            validated = {}
            
            for field, rules in schema.items():
                value = payload.get(field)
                required = rules.get('required', False)
                
                if value is None:
                    if required:
                        raise ValidationError(field, 'This field is required')
                    continue
                
                field_type = rules.get('type', 'string')
                
                if field_type == 'string':
                    max_len = rules.get('max_length', 10000)
                    validated[field] = InputValidator.sanitize_string(value, max_len)
                elif field_type == 'phone':
                    validated[field] = InputValidator.validate_phone(value)
                elif field_type == 'email':
                    validated[field] = InputValidator.validate_email(value)
                elif field_type == 'int':
                    validated[field] = InputValidator.validate_int(
                        value, 
                        rules.get('min'), 
                        rules.get('max'),
                        field
                    )
                elif field_type == 'float':
                    validated[field] = InputValidator.validate_float(
                        value,
                        rules.get('min'),
                        rules.get('max'),
                        field
                    )
                elif field_type == 'enum':
                    validated[field] = InputValidator.validate_enum(
                        value,
                        rules.get('values', []),
                        field
                    )
                elif field_type == 'list':
                    validated[field] = InputValidator.validate_list(
                        value,
                        rules.get('min_length', 0),
                        rules.get('max_length', 1000),
                        field
                    )
                elif field_type == 'dict':
                    validated[field] = InputValidator.validate_dict(value, field)
                else:
                    validated[field] = value
            
            # 合併未驗證的字段
            for key, value in payload.items():
                if key not in validated:
                    validated[key] = value
            
            return await func(validated, *args, **kwargs)
        
        return wrapper
    return decorator

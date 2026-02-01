"""
安全服務

功能：
1. 請求簽名驗證
2. 敏感數據加密
3. 密鑰管理
4. 安全工具函數
"""

import os
import hmac
import hashlib
import base64
import secrets
import logging
import json
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
import threading
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


# ==================== 配置 ====================

class SignatureAlgorithm(str, Enum):
    HMAC_SHA256 = 'HMAC-SHA256'
    HMAC_SHA512 = 'HMAC-SHA512'


@dataclass
class SignatureConfig:
    """簽名配置"""
    algorithm: SignatureAlgorithm = SignatureAlgorithm.HMAC_SHA256
    timestamp_tolerance: int = 300  # 時間戳容忍度（秒）
    require_nonce: bool = True      # 是否需要 nonce


# ==================== 敏感字段配置 ====================

SENSITIVE_FIELDS = {
    # 認證相關
    'password', 'password_hash', 'secret', 'api_key', 'api_secret',
    'access_token', 'refresh_token', 'auth_token', 'session_token',
    
    # 個人信息
    'ssn', 'social_security', 'id_number', 'passport',
    'credit_card', 'card_number', 'cvv', 'pin',
    
    # 聯繫方式
    'phone', 'mobile', 'telephone',
    
    # 其他敏感
    'private_key', 'encryption_key', 'master_key',
    '2fa_secret', 'totp_secret', 'recovery_codes',
}

# 需要脫敏顯示的字段
MASK_FIELDS = {
    'email': lambda v: _mask_email(v),
    'phone': lambda v: _mask_phone(v),
    'card_number': lambda v: _mask_card(v),
    'api_key': lambda v: v[:8] + '***' + v[-4:] if len(v) > 12 else '***',
}


def _mask_email(email: str) -> str:
    """郵箱脫敏"""
    if '@' not in email:
        return '***'
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        return f"**@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def _mask_phone(phone: str) -> str:
    """電話脫敏"""
    digits = re.sub(r'\D', '', phone)
    if len(digits) < 7:
        return '***'
    return digits[:3] + '****' + digits[-4:]


def _mask_card(card: str) -> str:
    """卡號脫敏"""
    digits = re.sub(r'\D', '', card)
    if len(digits) < 8:
        return '***'
    return digits[:4] + ' **** **** ' + digits[-4:]


class SecurityService:
    """安全服務"""
    
    _instance: Optional['SecurityService'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # 主密鑰
        self._master_key = os.environ.get('MASTER_KEY', self._generate_master_key())
        
        # Fernet 加密器
        self._fernet = self._create_fernet()
        
        # API 密鑰存儲
        self._api_keys: Dict[str, Dict[str, Any]] = {}
        
        # 已使用的 nonce（防重放）
        self._used_nonces: Dict[str, datetime] = {}
        
        # 簽名配置
        self.signature_config = SignatureConfig()
        
        self._initialized = True
        logger.info("SecurityService initialized")
    
    def _generate_master_key(self) -> str:
        """生成主密鑰"""
        return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    
    def _create_fernet(self) -> Fernet:
        """創建 Fernet 加密器"""
        # 從主密鑰派生 Fernet 密鑰
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'tgmatrix_salt_v1',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self._master_key.encode()))
        return Fernet(key)
    
    # ==================== 請求簽名 ====================
    
    def create_signature(
        self,
        secret_key: str,
        method: str,
        path: str,
        timestamp: str,
        body: str = '',
        nonce: str = None
    ) -> str:
        """創建請求簽名"""
        # 構建簽名字符串
        parts = [method.upper(), path, timestamp]
        if nonce:
            parts.append(nonce)
        if body:
            # 計算 body 哈希
            body_hash = hashlib.sha256(body.encode()).hexdigest()
            parts.append(body_hash)
        
        message = '\n'.join(parts)
        
        # 計算 HMAC
        if self.signature_config.algorithm == SignatureAlgorithm.HMAC_SHA256:
            signature = hmac.new(
                secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
        else:
            signature = hmac.new(
                secret_key.encode(),
                message.encode(),
                hashlib.sha512
            ).hexdigest()
        
        return signature
    
    def verify_signature(
        self,
        api_key: str,
        signature: str,
        method: str,
        path: str,
        timestamp: str,
        body: str = '',
        nonce: str = None
    ) -> Tuple[bool, str]:
        """驗證請求簽名"""
        # 獲取 API 密鑰對應的 secret
        key_info = self._api_keys.get(api_key)
        if not key_info:
            return False, 'Invalid API key'
        
        secret_key = key_info['secret']
        
        # 檢查時間戳
        try:
            ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=ts.tzinfo)
            diff = abs((now - ts).total_seconds())
            
            if diff > self.signature_config.timestamp_tolerance:
                return False, 'Timestamp expired'
        except Exception:
            return False, 'Invalid timestamp'
        
        # 檢查 nonce（防重放）
        if self.signature_config.require_nonce:
            if not nonce:
                return False, 'Nonce required'
            
            if nonce in self._used_nonces:
                return False, 'Nonce already used'
            
            self._used_nonces[nonce] = datetime.utcnow()
            self._cleanup_nonces()
        
        # 計算預期簽名
        expected = self.create_signature(
            secret_key, method, path, timestamp, body, nonce
        )
        
        # 安全比較
        if hmac.compare_digest(signature, expected):
            return True, 'OK'
        
        return False, 'Signature mismatch'
    
    def _cleanup_nonces(self):
        """清理過期的 nonce"""
        cutoff = datetime.utcnow() - timedelta(seconds=self.signature_config.timestamp_tolerance * 2)
        self._used_nonces = {
            nonce: ts for nonce, ts in self._used_nonces.items()
            if ts > cutoff
        }
    
    # ==================== API 密鑰管理 ====================
    
    def generate_api_key(self, user_id: str, name: str = '') -> Dict[str, str]:
        """生成 API 密鑰對"""
        api_key = 'tgm_' + secrets.token_urlsafe(24)
        api_secret = secrets.token_urlsafe(48)
        
        self._api_keys[api_key] = {
            'secret': api_secret,
            'user_id': user_id,
            'name': name,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return {
            'api_key': api_key,
            'api_secret': api_secret
        }
    
    def revoke_api_key(self, api_key: str) -> bool:
        """撤銷 API 密鑰"""
        if api_key in self._api_keys:
            del self._api_keys[api_key]
            return True
        return False
    
    def get_api_key_info(self, api_key: str) -> Optional[Dict[str, Any]]:
        """獲取 API 密鑰信息（不含 secret）"""
        info = self._api_keys.get(api_key)
        if info:
            return {
                'user_id': info['user_id'],
                'name': info['name'],
                'created_at': info['created_at']
            }
        return None
    
    # ==================== 數據加密 ====================
    
    def encrypt(self, data: str) -> str:
        """加密數據"""
        try:
            encrypted = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encrypt error: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """解密數據"""
        try:
            data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self._fernet.decrypt(data)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decrypt error: {e}")
            raise
    
    def encrypt_dict(self, data: Dict[str, Any], fields: List[str] = None) -> Dict[str, Any]:
        """加密字典中的指定字段"""
        result = data.copy()
        fields_to_encrypt = fields or SENSITIVE_FIELDS
        
        for key, value in result.items():
            if key.lower() in fields_to_encrypt and isinstance(value, str):
                result[key] = self.encrypt(value)
        
        return result
    
    def decrypt_dict(self, data: Dict[str, Any], fields: List[str] = None) -> Dict[str, Any]:
        """解密字典中的指定字段"""
        result = data.copy()
        fields_to_decrypt = fields or SENSITIVE_FIELDS
        
        for key, value in result.items():
            if key.lower() in fields_to_decrypt and isinstance(value, str):
                try:
                    result[key] = self.decrypt(value)
                except:
                    pass  # 可能未加密
        
        return result
    
    # ==================== 數據脫敏 ====================
    
    def mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """脫敏敏感數據"""
        result = {}
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # 完全隱藏
            if key_lower in SENSITIVE_FIELDS:
                result[key] = '***'
            # 部分脫敏
            elif key_lower in MASK_FIELDS and isinstance(value, str):
                result[key] = MASK_FIELDS[key_lower](value)
            # 遞歸處理嵌套字典
            elif isinstance(value, dict):
                result[key] = self.mask_sensitive_data(value)
            # 處理列表
            elif isinstance(value, list):
                result[key] = [
                    self.mask_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        
        return result
    
    # ==================== 密碼安全 ====================
    
    def check_password_strength(self, password: str) -> Dict[str, Any]:
        """檢查密碼強度"""
        checks = {
            'min_length': len(password) >= 8,
            'has_uppercase': bool(re.search(r'[A-Z]', password)),
            'has_lowercase': bool(re.search(r'[a-z]', password)),
            'has_number': bool(re.search(r'\d', password)),
            'has_special': bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password)),
            'no_common': password.lower() not in ['password', '12345678', 'qwerty', 'admin'],
        }
        
        passed = sum(checks.values())
        total = len(checks)
        
        if passed == total:
            strength = 'strong'
        elif passed >= 4:
            strength = 'medium'
        else:
            strength = 'weak'
        
        return {
            'strength': strength,
            'score': passed,
            'max_score': total,
            'checks': checks
        }
    
    def generate_secure_token(self, length: int = 32) -> str:
        """生成安全令牌"""
        return secrets.token_urlsafe(length)
    
    def hash_value(self, value: str, algorithm: str = 'sha256') -> str:
        """計算哈希"""
        if algorithm == 'sha256':
            return hashlib.sha256(value.encode()).hexdigest()
        elif algorithm == 'sha512':
            return hashlib.sha512(value.encode()).hexdigest()
        elif algorithm == 'md5':
            return hashlib.md5(value.encode()).hexdigest()
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
    
    # ==================== IP 安全 ====================
    
    def is_private_ip(self, ip: str) -> bool:
        """檢查是否為私有 IP"""
        import ipaddress
        try:
            addr = ipaddress.ip_address(ip)
            return addr.is_private
        except:
            return False
    
    def normalize_ip(self, ip: str) -> str:
        """標準化 IP 地址"""
        # 處理 X-Forwarded-For
        if ',' in ip:
            ip = ip.split(',')[0].strip()
        return ip
    
    # ==================== XSS/SQL 注入防護 ====================
    
    def sanitize_html(self, text: str) -> str:
        """清理 HTML 標籤"""
        import html
        # 轉義 HTML 特殊字符
        return html.escape(text)
    
    def validate_input(self, value: str, pattern: str = None) -> Tuple[bool, str]:
        """驗證輸入"""
        # 檢查 SQL 注入特徵
        sql_patterns = [
            r"('\s*OR\s+')", r"(--)", r"(;)", r"(DROP\s+TABLE)",
            r"(INSERT\s+INTO)", r"(DELETE\s+FROM)", r"(UPDATE\s+.*SET)"
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                return False, 'Potential SQL injection detected'
        
        # 檢查 XSS 特徵
        xss_patterns = [
            r"(<script)", r"(javascript:)", r"(onerror=)", r"(onload=)"
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                return False, 'Potential XSS detected'
        
        return True, 'OK'


# ==================== 單例訪問 ====================

_security_service: Optional[SecurityService] = None


def get_security_service() -> SecurityService:
    """獲取安全服務"""
    global _security_service
    if _security_service is None:
        _security_service = SecurityService()
    return _security_service

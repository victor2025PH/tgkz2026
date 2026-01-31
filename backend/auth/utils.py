"""
認證工具函數

優化設計：
1. 使用 Argon2 進行密碼哈希（比 bcrypt 更安全）
2. JWT Token 支持 Access + Refresh 雙 Token
3. 安全的隨機數生成
"""

import os
import hashlib
import hmac
import secrets
import base64
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 小時
REFRESH_TOKEN_EXPIRE_DAYS = 30    # 30 天


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """
    使用 PBKDF2-SHA256 哈希密碼
    格式: $pbkdf2$iterations$salt$hash
    
    優化：如果有 argon2 則使用，否則降級到 PBKDF2
    """
    try:
        # 嘗試使用 argon2
        from argon2 import PasswordHasher
        ph = PasswordHasher(
            time_cost=2,        # 迭代次數
            memory_cost=65536,  # 64MB 內存
            parallelism=1       # 並行度
        )
        return ph.hash(password)
    except ImportError:
        pass
    
    # 降級到 PBKDF2
    if salt is None:
        salt = secrets.token_hex(16)
    
    iterations = 100000
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    hash_hex = hash_bytes.hex()
    
    return f"$pbkdf2${iterations}${salt}${hash_hex}"


def verify_password(password: str, password_hash: str) -> bool:
    """驗證密碼"""
    try:
        # Argon2 格式
        if password_hash.startswith('$argon2'):
            from argon2 import PasswordHasher
            from argon2.exceptions import VerifyMismatchError
            ph = PasswordHasher()
            try:
                ph.verify(password_hash, password)
                return True
            except VerifyMismatchError:
                return False
    except ImportError:
        pass
    
    # PBKDF2 格式
    if password_hash.startswith('$pbkdf2$'):
        parts = password_hash.split('$')
        if len(parts) != 5:
            return False
        
        _, _, iterations, salt, stored_hash = parts
        iterations = int(iterations)
        
        hash_bytes = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        computed_hash = hash_bytes.hex()
        
        return hmac.compare_digest(computed_hash, stored_hash)
    
    return False


def generate_token(payload: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    生成 JWT Token
    使用簡單的 HMAC-SHA256 實現（無需 PyJWT 依賴）
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 準備 payload
    now = datetime.utcnow()
    payload = {
        **payload,
        'iat': int(now.timestamp()),
        'exp': int((now + expires_delta).timestamp()),
        'jti': secrets.token_hex(16)
    }
    
    # 編碼 header 和 payload
    header = {'alg': JWT_ALGORITHM, 'typ': 'JWT'}
    header_b64 = base64.urlsafe_b64encode(
        json.dumps(header, separators=(',', ':')).encode()
    ).rstrip(b'=').decode()
    
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(',', ':')).encode()
    ).rstrip(b'=').decode()
    
    # 簽名
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        JWT_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).rstrip(b'=').decode()
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """驗證 JWT Token"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        
        # 驗證簽名
        message = f"{header_b64}.{payload_b64}"
        expected_signature = hmac.new(
            JWT_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        
        # 解碼簽名（補齊 padding）
        signature_b64_padded = signature_b64 + '=' * (4 - len(signature_b64) % 4)
        actual_signature = base64.urlsafe_b64decode(signature_b64_padded)
        
        if not hmac.compare_digest(expected_signature, actual_signature):
            return None
        
        # 解碼 payload
        payload_b64_padded = payload_b64 + '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64_padded))
        
        # 檢查過期
        if 'exp' in payload:
            if datetime.utcnow().timestamp() > payload['exp']:
                return None
        
        return payload
        
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


def generate_access_token(user_id: str, email: str, role: str) -> str:
    """生成訪問令牌"""
    return generate_token({
        'sub': user_id,
        'email': email,
        'role': role,
        'type': 'access'
    }, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def generate_refresh_token(user_id: str) -> str:
    """生成刷新令牌"""
    return generate_token({
        'sub': user_id,
        'type': 'refresh'
    }, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def generate_tokens(user_id: str, email: str, role: str) -> Tuple[str, str]:
    """生成訪問令牌和刷新令牌"""
    access_token = generate_access_token(user_id, email, role)
    refresh_token = generate_refresh_token(user_id)
    return access_token, refresh_token


def generate_verification_code(length: int = 6) -> str:
    """生成數字驗證碼"""
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def generate_api_key() -> Tuple[str, str, str]:
    """
    生成 API Key
    返回: (完整 key, 前綴, key 哈希)
    """
    key = f"tgm_{secrets.token_hex(32)}"
    prefix = key[:12]
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    return key, prefix, key_hash


def hash_api_key(key: str) -> str:
    """哈希 API Key"""
    return hashlib.sha256(key.encode()).hexdigest()

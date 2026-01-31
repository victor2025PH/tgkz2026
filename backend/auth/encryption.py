"""
數據加密服務

優化設計：
1. 使用 AES-256-GCM 進行對稱加密
2. 密鑰派生使用 PBKDF2/Scrypt
3. 支持多租戶密鑰隔離
4. 安全的密鑰存儲
"""

import os
import base64
import hashlib
import secrets
import json
from typing import Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)

# 嘗試導入加密庫
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False
    logger.warning("cryptography library not available, using fallback encryption")


class EncryptionService:
    """加密服務"""
    
    # 主密鑰（從環境變量獲取）
    MASTER_KEY = os.environ.get('ENCRYPTION_KEY', '')
    
    # 鹽（用於密鑰派生）
    SALT_LENGTH = 16
    
    # Nonce 長度（GCM 模式）
    NONCE_LENGTH = 12
    
    # 密鑰長度（256 位）
    KEY_LENGTH = 32
    
    # PBKDF2 迭代次數
    ITERATIONS = 100000
    
    def __init__(self, master_key: str = None):
        """
        初始化加密服務
        
        Args:
            master_key: 主密鑰，如果未提供則使用環境變量或生成新的
        """
        if master_key:
            self.master_key = master_key
        elif self.MASTER_KEY:
            self.master_key = self.MASTER_KEY
        else:
            # 警告：生成臨時密鑰（僅用於開發）
            self.master_key = secrets.token_hex(32)
            logger.warning("Using temporary encryption key. Set ENCRYPTION_KEY env var for production!")
    
    def _derive_key(self, salt: bytes, context: str = '') -> bytes:
        """
        從主密鑰派生加密密鑰
        
        Args:
            salt: 鹽值
            context: 上下文（用於密鑰隔離）
        """
        key_material = f"{self.master_key}:{context}".encode('utf-8')
        
        if HAS_CRYPTOGRAPHY:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=self.KEY_LENGTH,
                salt=salt,
                iterations=self.ITERATIONS,
                backend=default_backend()
            )
            return kdf.derive(key_material)
        else:
            # 降級方案：使用 hashlib
            return hashlib.pbkdf2_hmac(
                'sha256',
                key_material,
                salt,
                self.ITERATIONS,
                dklen=self.KEY_LENGTH
            )
    
    def encrypt(self, plaintext: str, context: str = '') -> str:
        """
        加密字符串
        
        Args:
            plaintext: 明文
            context: 上下文（如用戶 ID，用於密鑰隔離）
        
        Returns:
            Base64 編碼的密文（格式：salt + nonce + ciphertext + tag）
        """
        if not plaintext:
            return ''
        
        # 生成隨機鹽和 nonce
        salt = secrets.token_bytes(self.SALT_LENGTH)
        nonce = secrets.token_bytes(self.NONCE_LENGTH)
        
        # 派生密鑰
        key = self._derive_key(salt, context)
        
        # 加密
        plaintext_bytes = plaintext.encode('utf-8')
        
        if HAS_CRYPTOGRAPHY:
            aesgcm = AESGCM(key)
            ciphertext = aesgcm.encrypt(nonce, plaintext_bytes, None)
        else:
            # 降級方案：XOR（不安全，僅用於開發）
            ciphertext = self._xor_encrypt(plaintext_bytes, key + nonce)
        
        # 組合：salt + nonce + ciphertext
        combined = salt + nonce + ciphertext
        
        return base64.urlsafe_b64encode(combined).decode('utf-8')
    
    def decrypt(self, ciphertext: str, context: str = '') -> Optional[str]:
        """
        解密字符串
        
        Args:
            ciphertext: Base64 編碼的密文
            context: 上下文
        
        Returns:
            明文，解密失敗返回 None
        """
        if not ciphertext:
            return ''
        
        try:
            # 解碼
            combined = base64.urlsafe_b64decode(ciphertext)
            
            # 分離 salt、nonce 和密文
            salt = combined[:self.SALT_LENGTH]
            nonce = combined[self.SALT_LENGTH:self.SALT_LENGTH + self.NONCE_LENGTH]
            encrypted = combined[self.SALT_LENGTH + self.NONCE_LENGTH:]
            
            # 派生密鑰
            key = self._derive_key(salt, context)
            
            # 解密
            if HAS_CRYPTOGRAPHY:
                aesgcm = AESGCM(key)
                plaintext_bytes = aesgcm.decrypt(nonce, encrypted, None)
            else:
                plaintext_bytes = self._xor_encrypt(encrypted, key + nonce)
            
            return plaintext_bytes.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None
    
    def _xor_encrypt(self, data: bytes, key: bytes) -> bytes:
        """簡單 XOR 加密（降級方案，不安全）"""
        key_extended = (key * (len(data) // len(key) + 1))[:len(data)]
        return bytes(a ^ b for a, b in zip(data, key_extended))
    
    def encrypt_dict(self, data: dict, context: str = '') -> str:
        """加密字典"""
        json_str = json.dumps(data, ensure_ascii=False)
        return self.encrypt(json_str, context)
    
    def decrypt_dict(self, ciphertext: str, context: str = '') -> Optional[dict]:
        """解密字典"""
        json_str = self.decrypt(ciphertext, context)
        if json_str:
            try:
                return json.loads(json_str)
            except:
                return None
        return None
    
    def encrypt_session(self, session_string: str, user_id: str) -> str:
        """
        加密 Telegram Session
        
        Args:
            session_string: Pyrogram session string
            user_id: 用戶 ID（用於密鑰隔離）
        """
        return self.encrypt(session_string, f"session:{user_id}")
    
    def decrypt_session(self, encrypted_session: str, user_id: str) -> Optional[str]:
        """解密 Telegram Session"""
        return self.decrypt(encrypted_session, f"session:{user_id}")
    
    def generate_data_key(self) -> Tuple[str, str]:
        """
        生成數據密鑰（用於大文件加密）
        
        Returns:
            (encrypted_key, plaintext_key)
        """
        plaintext_key = secrets.token_hex(32)
        encrypted_key = self.encrypt(plaintext_key, 'data_key')
        return encrypted_key, plaintext_key


class SessionEncryption:
    """
    Telegram Session 專用加密
    
    優化設計：
    1. 每個用戶使用獨立的密鑰
    2. Session 按帳號隔離
    3. 支持密鑰輪換
    """
    
    def __init__(self, encryption_service: EncryptionService = None):
        self.encryption = encryption_service or EncryptionService()
    
    def encrypt_session_data(
        self, 
        session_string: str, 
        user_id: str, 
        account_phone: str
    ) -> dict:
        """
        加密並打包 Session 數據
        
        Returns:
            {
                'encrypted_session': str,
                'metadata': {
                    'phone': str,
                    'created_at': str,
                    'version': int
                }
            }
        """
        from datetime import datetime
        
        context = f"{user_id}:{account_phone}"
        encrypted = self.encryption.encrypt(session_string, context)
        
        return {
            'encrypted_session': encrypted,
            'metadata': {
                'phone': account_phone[-4:],  # 只保留後4位
                'created_at': datetime.now().isoformat(),
                'version': 1
            }
        }
    
    def decrypt_session_data(
        self, 
        encrypted_data: dict, 
        user_id: str, 
        account_phone: str
    ) -> Optional[str]:
        """解密 Session 數據"""
        encrypted_session = encrypted_data.get('encrypted_session')
        if not encrypted_session:
            return None
        
        context = f"{user_id}:{account_phone}"
        return self.encryption.decrypt(encrypted_session, context)
    
    def rotate_encryption(
        self, 
        old_encrypted: str, 
        user_id: str, 
        account_phone: str,
        new_encryption_service: EncryptionService
    ) -> str:
        """
        密鑰輪換：使用新密鑰重新加密
        """
        # 用舊密鑰解密
        context = f"{user_id}:{account_phone}"
        plaintext = self.encryption.decrypt(old_encrypted, context)
        
        if not plaintext:
            raise ValueError("Failed to decrypt with old key")
        
        # 用新密鑰加密
        new_encryption = SessionEncryption(new_encryption_service)
        return new_encryption.encryption.encrypt(plaintext, context)


# 全局實例
_encryption_service: Optional[EncryptionService] = None
_session_encryption: Optional[SessionEncryption] = None

def get_encryption_service() -> EncryptionService:
    """獲取加密服務實例"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service

def get_session_encryption() -> SessionEncryption:
    """獲取 Session 加密實例"""
    global _session_encryption
    if _session_encryption is None:
        _session_encryption = SessionEncryption(get_encryption_service())
    return _session_encryption

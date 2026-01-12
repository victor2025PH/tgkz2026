"""
TG-Matrix Cryptographic Utilities
Handles encryption and decryption of sensitive data
"""
import base64
import os
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from pathlib import Path
from config import BASE_DIR


class CryptoManager:
    """Manages encryption and decryption of sensitive data"""
    
    def __init__(self, key: Optional[bytes] = None):
        """
        Initialize crypto manager
        
        Args:
            key: Encryption key (32 bytes). If None, will load or generate from key file.
        """
        self.key = key or self._load_or_generate_key()
        self.cipher = Fernet(self.key)
    
    def _get_key_file_path(self) -> Path:
        """Get the path to the encryption key file"""
        key_dir = BASE_DIR / "data"
        key_dir.mkdir(parents=True, exist_ok=True)
        return key_dir / ".encryption_key"
    
    def _load_or_generate_key(self) -> bytes:
        """Load encryption key from file or generate a new one"""
        key_file = self._get_key_file_path()
        
        if key_file.exists():
            # Load existing key
            try:
                with open(key_file, 'rb') as f:
                    key = f.read()
                if len(key) == 44:  # Fernet key is base64-encoded 32 bytes = 44 chars
                    return key
            except Exception as e:
                print(f"Error loading encryption key: {e}")
        
        # Generate new key
        key = Fernet.generate_key()
        
        try:
            # Save key to file with restricted permissions (Unix-like systems)
            with open(key_file, 'wb') as f:
                f.write(key)
            # Set file permissions to read-only for owner (Unix-like)
            try:
                os.chmod(key_file, 0o600)
            except OSError:
                pass  # Windows doesn't support chmod the same way
        except Exception as e:
            print(f"Error saving encryption key: {e}")
        
        return key
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt a string
        
        Args:
            data: Plain text string to encrypt
        
        Returns:
            Base64-encoded encrypted string
        """
        if not data:
            return ""
        
        try:
            encrypted_bytes = self.cipher.encrypt(data.encode('utf-8'))
            return base64.b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            print(f"Error encrypting data: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt a string
        
        Args:
            encrypted_data: Base64-encoded encrypted string
        
        Returns:
            Decrypted plain text string
        """
        if not encrypted_data:
            return ""
        
        try:
            encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            print(f"Error decrypting data: {e}")
            # Return empty string on decryption error (for backward compatibility)
            return ""
    
    def encrypt_field(self, field_value: Optional[str]) -> Optional[str]:
        """
        Encrypt a field value if it's not empty
        
        Args:
            field_value: Field value to encrypt (can be None or empty)
        
        Returns:
            Encrypted value or None/empty string
        """
        if not field_value or not field_value.strip():
            return field_value
        
        return self.encrypt(field_value)
    
    def decrypt_field(self, encrypted_value: Optional[str]) -> Optional[str]:
        """
        Decrypt a field value if it's not empty
        
        Args:
            encrypted_value: Encrypted value to decrypt (can be None or empty)
        
        Returns:
            Decrypted value or None/empty string
        """
        if not encrypted_value or not encrypted_value.strip():
            return encrypted_value
        
        decrypted = self.decrypt(encrypted_value)
        return decrypted if decrypted else encrypted_value  # Return original if decryption fails


# Global crypto manager instance
_crypto_manager: Optional[CryptoManager] = None


def get_crypto_manager() -> CryptoManager:
    """Get global crypto manager instance"""
    global _crypto_manager
    if _crypto_manager is None:
        _crypto_manager = CryptoManager()
    return _crypto_manager


def encrypt_sensitive_data(data: str) -> str:
    """Convenience function to encrypt sensitive data"""
    return get_crypto_manager().encrypt(data)


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Convenience function to decrypt sensitive data"""
    return get_crypto_manager().decrypt(encrypted_data)


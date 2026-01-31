"""
雙因素認證 (2FA)

優化設計：
1. TOTP（基於時間的一次性密碼）
2. 備用恢復碼
3. 設備記住功能
4. 安全的啟用/禁用流程
"""

import os
import hmac
import struct
import base64
import hashlib
import secrets
import sqlite3
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


# TOTP 配置
TOTP_ISSUER = "TG-Matrix"
TOTP_ALGORITHM = "SHA1"
TOTP_DIGITS = 6
TOTP_PERIOD = 30  # 秒


@dataclass
class TwoFactorConfig:
    """2FA 配置"""
    user_id: str
    enabled: bool = False
    secret: str = ''  # Base32 編碼的密鑰
    backup_codes: List[str] = field(default_factory=list)
    created_at: str = ''
    last_used: str = ''
    
    def to_dict(self) -> dict:
        return {
            'enabled': self.enabled,
            'created_at': self.created_at,
            'last_used': self.last_used,
            'backup_codes_remaining': len(self.backup_codes)
        }


@dataclass
class TrustedDevice:
    """受信任設備"""
    id: str
    user_id: str
    device_name: str
    device_fingerprint: str
    created_at: str
    last_used: str
    expires_at: str


class TwoFactorService:
    """2FA 服務"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._init_db()
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 2FA 配置表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS two_factor_config (
                    user_id TEXT PRIMARY KEY,
                    enabled INTEGER DEFAULT 0,
                    secret TEXT,
                    backup_codes TEXT,
                    created_at TEXT,
                    last_used TEXT
                )
            ''')
            
            # 受信任設備表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS trusted_devices (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    device_name TEXT,
                    device_fingerprint TEXT,
                    created_at TEXT,
                    last_used TEXT,
                    expires_at TEXT
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_devices_user ON trusted_devices(user_id)')
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"2FA DB init error: {e}")
    
    # ==================== TOTP 算法 ====================
    
    def generate_secret(self) -> str:
        """生成 TOTP 密鑰"""
        # 生成 20 字節隨機數
        random_bytes = secrets.token_bytes(20)
        # Base32 編碼
        return base64.b32encode(random_bytes).decode('utf-8').rstrip('=')
    
    def generate_totp(self, secret: str, time_offset: int = 0) -> str:
        """生成 TOTP 驗證碼"""
        # 解碼密鑰
        secret_bytes = self._decode_secret(secret)
        
        # 計算時間步
        now = int(datetime.utcnow().timestamp())
        counter = (now // TOTP_PERIOD) + time_offset
        
        # HMAC-SHA1
        counter_bytes = struct.pack('>Q', counter)
        hmac_hash = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()
        
        # 動態截斷
        offset = hmac_hash[-1] & 0x0F
        code = struct.unpack('>I', hmac_hash[offset:offset+4])[0] & 0x7FFFFFFF
        
        # 取模得到驗證碼
        return str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)
    
    def verify_totp(self, secret: str, code: str, window: int = 1) -> bool:
        """驗證 TOTP 驗證碼"""
        if not code or not secret:
            return False
        
        # 檢查當前和前後 window 個時間步
        for offset in range(-window, window + 1):
            expected = self.generate_totp(secret, offset)
            if hmac.compare_digest(expected, code):
                return True
        
        return False
    
    def _decode_secret(self, secret: str) -> bytes:
        """解碼 Base32 密鑰"""
        # 補齊填充
        padding = 8 - (len(secret) % 8)
        if padding != 8:
            secret += '=' * padding
        return base64.b32decode(secret.upper())
    
    def get_provisioning_uri(self, secret: str, email: str) -> str:
        """生成二維碼 URI"""
        return f"otpauth://totp/{TOTP_ISSUER}:{email}?secret={secret}&issuer={TOTP_ISSUER}&algorithm={TOTP_ALGORITHM}&digits={TOTP_DIGITS}&period={TOTP_PERIOD}"
    
    # ==================== 備用恢復碼 ====================
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """生成備用恢復碼"""
        codes = []
        for _ in range(count):
            # 8 位隨機數字
            code = ''.join(secrets.choice('0123456789') for _ in range(8))
            codes.append(code)
        return codes
    
    def verify_backup_code(self, user_id: str, code: str) -> bool:
        """驗證備用恢復碼"""
        config = self.get_config(user_id)
        if not config or not config.backup_codes:
            return False
        
        # 檢查碼是否存在
        if code in config.backup_codes:
            # 使用後刪除
            config.backup_codes.remove(code)
            self._save_config(config)
            return True
        
        return False
    
    # ==================== 2FA 管理 ====================
    
    def get_config(self, user_id: str) -> Optional[TwoFactorConfig]:
        """獲取 2FA 配置"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT * FROM two_factor_config WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row:
                import json
                return TwoFactorConfig(
                    user_id=row[0],
                    enabled=bool(row[1]),
                    secret=row[2] or '',
                    backup_codes=json.loads(row[3]) if row[3] else [],
                    created_at=row[4] or '',
                    last_used=row[5] or ''
                )
            return None
        except Exception as e:
            logger.error(f"Get 2FA config error: {e}")
            return None
    
    def _save_config(self, config: TwoFactorConfig):
        """保存 2FA 配置"""
        try:
            import json
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO two_factor_config 
                (user_id, enabled, secret, backup_codes, created_at, last_used)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                config.user_id,
                1 if config.enabled else 0,
                config.secret,
                json.dumps(config.backup_codes),
                config.created_at,
                config.last_used
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save 2FA config error: {e}")
    
    async def setup(self, user_id: str, email: str) -> Dict[str, Any]:
        """
        開始 2FA 設置流程
        返回密鑰和二維碼 URI（尚未啟用）
        """
        secret = self.generate_secret()
        uri = self.get_provisioning_uri(secret, email)
        
        # 保存配置（未啟用）
        config = TwoFactorConfig(
            user_id=user_id,
            enabled=False,
            secret=secret,
            created_at=datetime.utcnow().isoformat()
        )
        self._save_config(config)
        
        return {
            'success': True,
            'secret': secret,
            'qr_uri': uri
        }
    
    async def enable(self, user_id: str, code: str) -> Dict[str, Any]:
        """
        確認並啟用 2FA
        需要驗證一次 TOTP 碼
        """
        config = self.get_config(user_id)
        if not config:
            return {'success': False, 'error': '請先設置 2FA'}
        
        if config.enabled:
            return {'success': False, 'error': '2FA 已啟用'}
        
        # 驗證 TOTP
        if not self.verify_totp(config.secret, code):
            return {'success': False, 'error': '驗證碼錯誤'}
        
        # 生成備用恢復碼
        backup_codes = self.generate_backup_codes()
        
        # 啟用
        config.enabled = True
        config.backup_codes = backup_codes
        self._save_config(config)
        
        return {
            'success': True,
            'backup_codes': backup_codes,
            'message': '2FA 已成功啟用'
        }
    
    async def disable(self, user_id: str, code: str) -> Dict[str, Any]:
        """
        禁用 2FA
        需要驗證 TOTP 碼或備用碼
        """
        config = self.get_config(user_id)
        if not config or not config.enabled:
            return {'success': False, 'error': '2FA 未啟用'}
        
        # 驗證
        if not self.verify_totp(config.secret, code):
            if not self.verify_backup_code(user_id, code):
                return {'success': False, 'error': '驗證碼錯誤'}
        
        # 禁用
        config.enabled = False
        config.secret = ''
        config.backup_codes = []
        self._save_config(config)
        
        # 清理受信任設備
        await self.clear_trusted_devices(user_id)
        
        return {'success': True, 'message': '2FA 已禁用'}
    
    async def verify(
        self,
        user_id: str,
        code: str,
        device_fingerprint: str = None
    ) -> Dict[str, Any]:
        """
        驗證 2FA
        用於登入時的二次驗證
        """
        config = self.get_config(user_id)
        if not config or not config.enabled:
            return {'success': True, 'required': False}
        
        # 檢查是否是受信任設備
        if device_fingerprint:
            if await self.is_trusted_device(user_id, device_fingerprint):
                return {'success': True, 'trusted_device': True}
        
        # 驗證 TOTP
        if self.verify_totp(config.secret, code):
            # 更新最後使用時間
            config.last_used = datetime.utcnow().isoformat()
            self._save_config(config)
            
            return {'success': True}
        
        # 嘗試備用碼
        if self.verify_backup_code(user_id, code):
            return {
                'success': True,
                'used_backup_code': True,
                'backup_codes_remaining': len(self.get_config(user_id).backup_codes)
            }
        
        return {'success': False, 'error': '驗證碼錯誤'}
    
    async def regenerate_backup_codes(self, user_id: str, code: str) -> Dict[str, Any]:
        """重新生成備用恢復碼"""
        config = self.get_config(user_id)
        if not config or not config.enabled:
            return {'success': False, 'error': '2FA 未啟用'}
        
        # 驗證
        if not self.verify_totp(config.secret, code):
            return {'success': False, 'error': '驗證碼錯誤'}
        
        # 重新生成
        backup_codes = self.generate_backup_codes()
        config.backup_codes = backup_codes
        self._save_config(config)
        
        return {
            'success': True,
            'backup_codes': backup_codes
        }
    
    # ==================== 受信任設備 ====================
    
    async def add_trusted_device(
        self,
        user_id: str,
        device_name: str,
        device_fingerprint: str,
        days_valid: int = 30
    ) -> TrustedDevice:
        """添加受信任設備"""
        import uuid
        
        now = datetime.utcnow()
        device = TrustedDevice(
            id=f"dev_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            device_name=device_name,
            device_fingerprint=device_fingerprint,
            created_at=now.isoformat(),
            last_used=now.isoformat(),
            expires_at=(now + timedelta(days=days_valid)).isoformat()
        )
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO trusted_devices 
                (id, user_id, device_name, device_fingerprint, created_at, last_used, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                device.id, device.user_id, device.device_name,
                device.device_fingerprint, device.created_at,
                device.last_used, device.expires_at
            ))
            
            conn.commit()
            conn.close()
            
            return device
        except Exception as e:
            logger.error(f"Add trusted device error: {e}")
            raise
    
    async def is_trusted_device(self, user_id: str, device_fingerprint: str) -> bool:
        """檢查是否是受信任設備"""
        try:
            now = datetime.utcnow().isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id FROM trusted_devices 
                WHERE user_id = ? AND device_fingerprint = ? AND expires_at > ?
            ''', (user_id, device_fingerprint, now))
            
            row = cursor.fetchone()
            
            if row:
                # 更新最後使用時間
                cursor.execute(
                    'UPDATE trusted_devices SET last_used = ? WHERE id = ?',
                    (now, row[0])
                )
                conn.commit()
            
            conn.close()
            return row is not None
        except Exception as e:
            logger.error(f"Check trusted device error: {e}")
            return False
    
    async def get_trusted_devices(self, user_id: str) -> List[Dict]:
        """獲取用戶的受信任設備列表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, device_name, created_at, last_used, expires_at 
                FROM trusted_devices 
                WHERE user_id = ? 
                ORDER BY last_used DESC
            ''', (user_id,))
            
            devices = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return devices
        except Exception as e:
            logger.error(f"Get trusted devices error: {e}")
            return []
    
    async def remove_trusted_device(self, user_id: str, device_id: str) -> bool:
        """移除受信任設備"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'DELETE FROM trusted_devices WHERE id = ? AND user_id = ?',
                (device_id, user_id)
            )
            
            deleted = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            return deleted
        except Exception as e:
            logger.error(f"Remove trusted device error: {e}")
            return False
    
    async def clear_trusted_devices(self, user_id: str):
        """清除所有受信任設備"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'DELETE FROM trusted_devices WHERE user_id = ?',
                (user_id,)
            )
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Clear trusted devices error: {e}")


# ==================== 單例訪問 ====================

_two_factor_service: Optional[TwoFactorService] = None


def get_two_factor_service() -> TwoFactorService:
    global _two_factor_service
    if _two_factor_service is None:
        _two_factor_service = TwoFactorService()
    return _two_factor_service

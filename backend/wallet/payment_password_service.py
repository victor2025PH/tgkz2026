"""
支付密碼服務
Payment Password Service

功能：
1. 設置支付密碼
2. 驗證支付密碼
3. 修改支付密碼
4. 重置支付密碼
5. 錯誤次數限制

安全設計：
1. 密碼哈希存儲
2. 錯誤次數限制（5次鎖定）
3. 鎖定時間遞增
4. 操作日誌記錄
"""

import os
import hashlib
import secrets
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# 配置
PAY_PASSWORD_CONFIG = {
    'max_attempts': 5,              # 最大嘗試次數
    'lock_base_minutes': 15,        # 基礎鎖定時間（分鐘）
    'lock_multiplier': 2,           # 鎖定時間倍增
    'reset_token_expiry': 3600,     # 重置令牌有效期（秒）
}


@dataclass
class PayPasswordInfo:
    """支付密碼信息"""
    user_id: str = ""
    password_hash: str = ""
    salt: str = ""
    is_set: bool = False
    failed_attempts: int = 0
    locked_until: str = ""
    last_changed: str = ""
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at


class PaymentPasswordService:
    """支付密碼服務"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        import sqlite3
        self.db_path = db_path or os.path.join(
            os.path.dirname(__file__), '..', 'data', 'wallet.db'
        )
        self._init_database()
        self._initialized = True
        logger.info("PaymentPasswordService initialized")
    
    def _get_connection(self):
        import sqlite3
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_database(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payment_passwords (
                    user_id TEXT PRIMARY KEY,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    failed_attempts INTEGER DEFAULT 0,
                    locked_until TEXT,
                    last_changed TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # 操作日誌表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pay_password_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    success INTEGER DEFAULT 1,
                    detail TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_pay_pwd_user 
                ON pay_password_logs(user_id)
            ''')
            
            conn.commit()
            logger.info("Payment password tables initialized")
            
        except Exception as e:
            logger.error(f"Init payment password database error: {e}")
        finally:
            conn.close()
    
    def _hash_password(self, password: str, salt: str) -> str:
        """哈希密碼"""
        combined = f"{password}{salt}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def _generate_salt(self) -> str:
        """生成鹽值"""
        return secrets.token_hex(16)
    
    def _log_action(
        self,
        user_id: str,
        action: str,
        success: bool,
        ip_address: str = "",
        user_agent: str = "",
        detail: str = ""
    ):
        """記錄操作日誌"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO pay_password_logs
                (user_id, action, ip_address, user_agent, success, detail, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, action, ip_address, user_agent,
                1 if success else 0, detail, datetime.now().isoformat()
            ))
            conn.commit()
        except Exception as e:
            logger.error(f"Log action error: {e}")
        finally:
            conn.close()
    
    # ==================== 密碼管理 ====================
    
    def has_password(self, user_id: str) -> bool:
        """檢查用戶是否已設置支付密碼"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT 1 FROM payment_passwords WHERE user_id = ?',
                (user_id,)
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()
    
    def set_password(
        self,
        user_id: str,
        password: str,
        ip_address: str = ""
    ) -> Tuple[bool, str]:
        """
        設置支付密碼
        
        密碼要求：6位數字
        """
        # 驗證密碼格式
        if not password or len(password) != 6 or not password.isdigit():
            return False, "支付密碼必須為6位數字"
        
        # 檢查是否已設置
        if self.has_password(user_id):
            return False, "支付密碼已設置，請使用修改功能"
        
        salt = self._generate_salt()
        password_hash = self._hash_password(password, salt)
        now = datetime.now().isoformat()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO payment_passwords
                (user_id, password_hash, salt, failed_attempts,
                 last_changed, created_at, updated_at)
                VALUES (?, ?, ?, 0, ?, ?, ?)
            ''', (user_id, password_hash, salt, now, now, now))
            
            conn.commit()
            
            self._log_action(user_id, "set_password", True, ip_address)
            logger.info(f"Payment password set for user {user_id}")
            
            return True, "支付密碼設置成功"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Set payment password error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def verify_password(
        self,
        user_id: str,
        password: str,
        ip_address: str = ""
    ) -> Tuple[bool, str]:
        """
        驗證支付密碼
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM payment_passwords WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return False, "未設置支付密碼"
            
            row = dict(row)
            
            # 檢查是否鎖定
            locked_until = row.get('locked_until')
            if locked_until:
                lock_dt = datetime.fromisoformat(locked_until)
                if datetime.now() < lock_dt:
                    remaining = (lock_dt - datetime.now()).seconds // 60
                    return False, f"支付密碼已鎖定，請 {remaining} 分鐘後再試"
            
            # 驗證密碼
            password_hash = self._hash_password(password, row['salt'])
            
            if password_hash != row['password_hash']:
                # 增加失敗次數
                failed_attempts = row.get('failed_attempts', 0) + 1
                
                if failed_attempts >= PAY_PASSWORD_CONFIG['max_attempts']:
                    # 計算鎖定時間
                    lock_minutes = PAY_PASSWORD_CONFIG['lock_base_minutes']
                    locked_until = (
                        datetime.now() + timedelta(minutes=lock_minutes)
                    ).isoformat()
                    
                    cursor.execute('''
                        UPDATE payment_passwords SET
                            failed_attempts = ?,
                            locked_until = ?,
                            updated_at = ?
                        WHERE user_id = ?
                    ''', (failed_attempts, locked_until, datetime.now().isoformat(), user_id))
                    
                    conn.commit()
                    self._log_action(user_id, "verify_password", False, ip_address, detail="locked")
                    
                    return False, f"密碼錯誤次數過多，已鎖定 {lock_minutes} 分鐘"
                else:
                    cursor.execute('''
                        UPDATE payment_passwords SET
                            failed_attempts = ?,
                            updated_at = ?
                        WHERE user_id = ?
                    ''', (failed_attempts, datetime.now().isoformat(), user_id))
                    
                    conn.commit()
                    self._log_action(user_id, "verify_password", False, ip_address)
                    
                    remaining = PAY_PASSWORD_CONFIG['max_attempts'] - failed_attempts
                    return False, f"密碼錯誤，還有 {remaining} 次機會"
            
            # 驗證成功，重置失敗次數
            cursor.execute('''
                UPDATE payment_passwords SET
                    failed_attempts = 0,
                    locked_until = NULL,
                    updated_at = ?
                WHERE user_id = ?
            ''', (datetime.now().isoformat(), user_id))
            
            conn.commit()
            self._log_action(user_id, "verify_password", True, ip_address)
            
            return True, "驗證成功"
            
        except Exception as e:
            logger.error(f"Verify payment password error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def change_password(
        self,
        user_id: str,
        old_password: str,
        new_password: str,
        ip_address: str = ""
    ) -> Tuple[bool, str]:
        """
        修改支付密碼
        """
        # 驗證舊密碼
        success, message = self.verify_password(user_id, old_password, ip_address)
        if not success:
            return False, message
        
        # 驗證新密碼格式
        if not new_password or len(new_password) != 6 or not new_password.isdigit():
            return False, "新密碼必須為6位數字"
        
        # 新舊密碼不能相同
        if old_password == new_password:
            return False, "新密碼不能與舊密碼相同"
        
        # 更新密碼
        salt = self._generate_salt()
        password_hash = self._hash_password(new_password, salt)
        now = datetime.now().isoformat()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE payment_passwords SET
                    password_hash = ?,
                    salt = ?,
                    failed_attempts = 0,
                    locked_until = NULL,
                    last_changed = ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (password_hash, salt, now, now, user_id))
            
            conn.commit()
            
            self._log_action(user_id, "change_password", True, ip_address)
            logger.info(f"Payment password changed for user {user_id}")
            
            return True, "支付密碼修改成功"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Change payment password error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def reset_password(
        self,
        user_id: str,
        new_password: str,
        admin_id: str = "",
        ip_address: str = ""
    ) -> Tuple[bool, str]:
        """
        重置支付密碼（管理員操作）
        """
        # 驗證新密碼格式
        if not new_password or len(new_password) != 6 or not new_password.isdigit():
            return False, "新密碼必須為6位數字"
        
        # 更新或創建密碼
        salt = self._generate_salt()
        password_hash = self._hash_password(new_password, salt)
        now = datetime.now().isoformat()
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            if self.has_password(user_id):
                cursor.execute('''
                    UPDATE payment_passwords SET
                        password_hash = ?,
                        salt = ?,
                        failed_attempts = 0,
                        locked_until = NULL,
                        last_changed = ?,
                        updated_at = ?
                    WHERE user_id = ?
                ''', (password_hash, salt, now, now, user_id))
            else:
                cursor.execute('''
                    INSERT INTO payment_passwords
                    (user_id, password_hash, salt, failed_attempts,
                     last_changed, created_at, updated_at)
                    VALUES (?, ?, ?, 0, ?, ?, ?)
                ''', (user_id, password_hash, salt, now, now, now))
            
            conn.commit()
            
            self._log_action(
                user_id, "reset_password", True, ip_address,
                detail=f"reset by {admin_id}"
            )
            logger.info(f"Payment password reset for user {user_id} by {admin_id}")
            
            return True, "支付密碼已重置"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Reset payment password error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def remove_password(
        self,
        user_id: str,
        password: str,
        ip_address: str = ""
    ) -> Tuple[bool, str]:
        """
        移除支付密碼
        """
        # 驗證密碼
        success, message = self.verify_password(user_id, password, ip_address)
        if not success:
            return False, message
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'DELETE FROM payment_passwords WHERE user_id = ?',
                (user_id,)
            )
            conn.commit()
            
            self._log_action(user_id, "remove_password", True, ip_address)
            logger.info(f"Payment password removed for user {user_id}")
            
            return True, "支付密碼已移除"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Remove payment password error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def get_status(self, user_id: str) -> Dict[str, Any]:
        """獲取支付密碼狀態"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM payment_passwords WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return {
                    "is_set": False,
                    "is_locked": False,
                    "last_changed": None
                }
            
            row = dict(row)
            
            is_locked = False
            remaining_lock_minutes = 0
            
            locked_until = row.get('locked_until')
            if locked_until:
                lock_dt = datetime.fromisoformat(locked_until)
                if datetime.now() < lock_dt:
                    is_locked = True
                    remaining_lock_minutes = (lock_dt - datetime.now()).seconds // 60
            
            return {
                "is_set": True,
                "is_locked": is_locked,
                "remaining_lock_minutes": remaining_lock_minutes,
                "failed_attempts": row.get('failed_attempts', 0),
                "last_changed": row.get('last_changed')
            }
            
        finally:
            conn.close()


# ==================== 全局實例 ====================

_pay_password_service: Optional[PaymentPasswordService] = None


def get_pay_password_service() -> PaymentPasswordService:
    """獲取支付密碼服務實例"""
    global _pay_password_service
    if _pay_password_service is None:
        _pay_password_service = PaymentPasswordService()
    return _pay_password_service

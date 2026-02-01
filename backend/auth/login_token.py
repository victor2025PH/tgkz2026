"""
登入 Token 服務

支持多種無密碼登入方式：
1. Deep Link - 打開 Telegram App 確認登入
2. QR Code - 手機掃碼登入（Phase 2）

安全特性：
1. 64 字符隨機 Token
2. 5 分鐘過期
3. 一次性使用
4. IP 和 User-Agent 記錄
"""

import os
import secrets
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LoginTokenType(Enum):
    """登入 Token 類型"""
    DEEP_LINK = 'deep_link'
    QR_CODE = 'qr_code'


class LoginTokenStatus(Enum):
    """登入 Token 狀態"""
    PENDING = 'pending'      # 等待掃碼/確認
    SCANNED = 'scanned'      # 已掃碼，等待確認
    CONFIRMED = 'confirmed'  # 已確認登入
    EXPIRED = 'expired'      # 已過期
    CANCELLED = 'cancelled'  # 已取消


@dataclass
class LoginToken:
    """登入 Token 數據"""
    id: str
    token: str
    type: LoginTokenType
    status: LoginTokenStatus
    user_id: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = None
    expires_at: datetime = None
    confirmed_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        """檢查是否過期"""
        return datetime.utcnow() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'token': self.token,
            'type': self.type.value,
            'status': self.status.value,
            'user_id': self.user_id,
            'telegram_id': self.telegram_id,
            'telegram_username': self.telegram_username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class LoginTokenService:
    """
    登入 Token 服務
    
    提供 Deep Link 和 QR Code 登入的 Token 管理
    """
    
    # Token 有效期（秒）
    TOKEN_EXPIRY_SECONDS = 300  # 5 分鐘
    
    # Token 長度
    TOKEN_LENGTH = 32  # 生成 64 字符的 hex 字符串
    
    def __init__(self, db_path: Optional[str] = None):
        """初始化服務"""
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._init_db()
    
    def _get_db(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_tokens (
                    id TEXT PRIMARY KEY,
                    token TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL DEFAULT 'deep_link',
                    status TEXT NOT NULL DEFAULT 'pending',
                    user_id TEXT,
                    telegram_id TEXT,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    confirmed_at TIMESTAMP
                )
            ''')
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_status_expires ON login_tokens(status, expires_at)')
            
            db.commit()
            logger.info("Login tokens table initialized")
        except Exception as e:
            logger.error(f"Failed to initialize login_tokens table: {e}")
        finally:
            db.close()
    
    def generate_token(
        self,
        token_type: LoginTokenType = LoginTokenType.DEEP_LINK,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> LoginToken:
        """
        生成新的登入 Token
        
        Args:
            token_type: Token 類型
            ip_address: 請求 IP
            user_agent: 瀏覽器信息
        
        Returns:
            LoginToken 對象
        """
        import uuid
        
        token_id = str(uuid.uuid4())
        token = secrets.token_hex(self.TOKEN_LENGTH)
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.TOKEN_EXPIRY_SECONDS)
        
        login_token = LoginToken(
            id=token_id,
            token=token,
            type=token_type,
            status=LoginTokenStatus.PENDING,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at
        )
        
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO login_tokens 
                (id, token, type, status, ip_address, user_agent, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                token_id,
                token,
                token_type.value,
                LoginTokenStatus.PENDING.value,
                ip_address,
                user_agent,
                now.isoformat(),
                expires_at.isoformat()
            ))
            db.commit()
            logger.info(f"Generated login token: {token[:8]}... (type={token_type.value})")
        finally:
            db.close()
        
        return login_token
    
    def get_token(self, token: str) -> Optional[LoginToken]:
        """
        獲取 Token 信息
        
        Args:
            token: Token 字符串
        
        Returns:
            LoginToken 對象，不存在返回 None
        """
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE token = ?',
                (token,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def get_token_by_id(self, token_id: str) -> Optional[LoginToken]:
        """通過 ID 獲取 Token"""
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE id = ?',
                (token_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def confirm_token(
        self,
        token: str,
        telegram_id: str,
        telegram_username: Optional[str] = None,
        telegram_first_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        確認登入 Token（Bot 收到確認後調用）
        
        Args:
            token: Token 字符串
            telegram_id: Telegram 用戶 ID
            telegram_username: Telegram 用戶名
            telegram_first_name: Telegram 名字
            user_id: 系統用戶 ID（如果已存在）
        
        Returns:
            (success, error_message) 元組
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return False, "Token 不存在"
        
        if login_token.status != LoginTokenStatus.PENDING:
            return False, f"Token 狀態無效: {login_token.status.value}"
        
        if login_token.is_expired():
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return False, "Token 已過期，請重新獲取"
        
        # 更新 Token 狀態
        db = self._get_db()
        try:
            db.execute('''
                UPDATE login_tokens 
                SET status = ?, 
                    telegram_id = ?, 
                    telegram_username = ?,
                    telegram_first_name = ?,
                    user_id = ?,
                    confirmed_at = ?
                WHERE token = ?
            ''', (
                LoginTokenStatus.CONFIRMED.value,
                telegram_id,
                telegram_username,
                telegram_first_name,
                user_id,
                datetime.utcnow().isoformat(),
                token
            ))
            db.commit()
            logger.info(f"Login token confirmed: {token[:8]}... by TG user {telegram_id}")
            return True, None
        except Exception as e:
            logger.error(f"Failed to confirm token: {e}")
            return False, str(e)
        finally:
            db.close()
    
    def check_token_status(self, token: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        檢查 Token 狀態（前端輪詢調用）
        
        Returns:
            (status, user_data) 元組
            - status: pending/confirmed/expired
            - user_data: 確認後的用戶數據
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return 'not_found', None
        
        if login_token.is_expired() and login_token.status == LoginTokenStatus.PENDING:
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return 'expired', None
        
        if login_token.status == LoginTokenStatus.CONFIRMED:
            return 'confirmed', {
                'telegram_id': login_token.telegram_id,
                'telegram_username': login_token.telegram_username,
                'telegram_first_name': login_token.telegram_first_name,
                'user_id': login_token.user_id
            }
        
        return login_token.status.value, None
    
    def _update_status(self, token: str, status: LoginTokenStatus):
        """更新 Token 狀態"""
        db = self._get_db()
        try:
            db.execute(
                'UPDATE login_tokens SET status = ? WHERE token = ?',
                (status.value, token)
            )
            db.commit()
        finally:
            db.close()
    
    def _row_to_token(self, row) -> LoginToken:
        """將數據庫行轉換為 LoginToken 對象"""
        return LoginToken(
            id=row['id'],
            token=row['token'],
            type=LoginTokenType(row['type']),
            status=LoginTokenStatus(row['status']),
            user_id=row['user_id'],
            telegram_id=row['telegram_id'],
            telegram_username=row['telegram_username'],
            telegram_first_name=row['telegram_first_name'],
            ip_address=row['ip_address'],
            user_agent=row['user_agent'],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
            expires_at=datetime.fromisoformat(row['expires_at']) if row['expires_at'] else None,
            confirmed_at=datetime.fromisoformat(row['confirmed_at']) if row['confirmed_at'] else None
        )
    
    def cleanup_expired(self):
        """清理過期的 Token"""
        db = self._get_db()
        try:
            result = db.execute('''
                DELETE FROM login_tokens 
                WHERE expires_at < ? AND status IN (?, ?)
            ''', (
                datetime.utcnow().isoformat(),
                LoginTokenStatus.PENDING.value,
                LoginTokenStatus.EXPIRED.value
            ))
            db.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired login tokens")
        finally:
            db.close()


# 全局服務實例
_login_token_service: Optional[LoginTokenService] = None


def get_login_token_service() -> LoginTokenService:
    """獲取全局登入 Token 服務實例"""
    global _login_token_service
    if _login_token_service is None:
        _login_token_service = LoginTokenService()
    return _login_token_service

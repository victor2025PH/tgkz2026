"""
認證服務

優化設計：
1. 統一的認證接口
2. 支持多種認證方式
3. 會話管理
4. 安全審計
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import logging

from .models import User, UserSession, UserRole, AuthProvider, SUBSCRIPTION_TIERS
from .utils import (
    hash_password, verify_password, 
    generate_tokens, verify_token,
    generate_verification_code, generate_api_key
)

logger = logging.getLogger(__name__)


class AuthService:
    """認證服務"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.environ.get('DATABASE_PATH', '/app/data/tgmatrix.db')
        self.db_path = db_path
        self._init_db()
    
    def _get_db(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
        return db
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            db.executescript('''
                -- 用戶表
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    username TEXT UNIQUE,
                    password_hash TEXT,
                    display_name TEXT,
                    avatar_url TEXT,
                    auth_provider TEXT DEFAULT 'local',
                    oauth_id TEXT,
                    role TEXT DEFAULT 'free',
                    subscription_tier TEXT DEFAULT 'free',
                    subscription_expires TIMESTAMP,
                    max_accounts INTEGER DEFAULT 3,
                    max_api_calls INTEGER DEFAULT 1000,
                    is_active BOOLEAN DEFAULT 1,
                    is_verified BOOLEAN DEFAULT 0,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP,
                    two_factor_enabled BOOLEAN DEFAULT 0,
                    two_factor_secret TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login_at TIMESTAMP
                );
                
                -- 用戶會話表
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    access_token TEXT,
                    refresh_token TEXT,
                    device_id TEXT,
                    device_name TEXT,
                    device_type TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    last_activity_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                
                -- API 密鑰表
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT,
                    key_hash TEXT UNIQUE,
                    prefix TEXT,
                    scopes TEXT,
                    rate_limit INTEGER DEFAULT 100,
                    allowed_ips TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    last_used_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                
                -- 驗證碼表
                CREATE TABLE IF NOT EXISTS verification_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    email TEXT,
                    code TEXT,
                    type TEXT,
                    expires_at TIMESTAMP,
                    used BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 審計日誌表
                CREATE TABLE IF NOT EXISTS auth_audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    action TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 索引
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(access_token);
                CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
                CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
            ''')
            db.commit()
            logger.info("Auth database tables initialized")
        finally:
            db.close()
    
    # ==================== 用戶管理 ====================
    
    async def register(
        self, 
        email: str, 
        password: str, 
        username: str = None,
        display_name: str = None
    ) -> Dict[str, Any]:
        """用戶註冊"""
        db = self._get_db()
        try:
            # 檢查郵箱是否已存在
            existing = db.execute(
                "SELECT id FROM users WHERE email = ?", (email.lower(),)
            ).fetchone()
            if existing:
                return {'success': False, 'error': '該郵箱已被註冊'}
            
            # 檢查用戶名
            if username:
                existing = db.execute(
                    "SELECT id FROM users WHERE username = ?", (username.lower(),)
                ).fetchone()
                if existing:
                    return {'success': False, 'error': '該用戶名已被使用'}
            else:
                username = email.split('@')[0]
            
            # 創建用戶
            user = User(
                email=email.lower(),
                username=username.lower(),
                password_hash=hash_password(password),
                display_name=display_name or username,
                role=UserRole.FREE,
                subscription_tier='free'
            )
            
            # 設置配額
            tier = SUBSCRIPTION_TIERS.get('free', {})
            user.max_accounts = tier.get('max_accounts', 3)
            user.max_api_calls = tier.get('max_api_calls', 1000)
            
            db.execute('''
                INSERT INTO users (
                    id, email, username, password_hash, display_name,
                    role, subscription_tier, max_accounts, max_api_calls
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user.id, user.email, user.username, user.password_hash,
                user.display_name, user.role.value, user.subscription_tier,
                user.max_accounts, user.max_api_calls
            ))
            db.commit()
            
            # 生成 token
            access_token, refresh_token = generate_tokens(
                user.id, user.email, user.role.value
            )
            
            # 記錄審計
            self._log_audit(db, user.id, 'register', details={'email': email})
            
            return {
                'success': True,
                'message': '註冊成功',
                'data': {
                    'user': user.to_dict(),
                    'access_token': access_token,
                    'refresh_token': refresh_token
                }
            }
            
        except Exception as e:
            logger.exception(f"Registration error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def login(
        self, 
        email: str, 
        password: str,
        device_info: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """用戶登入"""
        db = self._get_db()
        try:
            # 查找用戶
            row = db.execute(
                "SELECT * FROM users WHERE email = ? OR username = ?",
                (email.lower(), email.lower())
            ).fetchone()
            
            if not row:
                return {'success': False, 'error': '用戶不存在'}
            
            user = User.from_dict(dict(row))
            
            # 檢查是否被鎖定
            if user.locked_until and user.locked_until > datetime.now():
                remaining = (user.locked_until - datetime.now()).seconds // 60
                return {'success': False, 'error': f'帳號已鎖定，請 {remaining} 分鐘後重試'}
            
            # 驗證密碼
            if not verify_password(password, user.password_hash):
                # 增加失敗次數
                failed = user.failed_login_attempts + 1
                locked_until = None
                
                if failed >= 5:
                    locked_until = datetime.now() + timedelta(minutes=15)
                
                db.execute(
                    "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
                    (failed, locked_until, user.id)
                )
                db.commit()
                
                self._log_audit(db, user.id, 'login_failed', 
                    details={'reason': 'wrong_password', 'attempts': failed})
                
                return {'success': False, 'error': '密碼錯誤'}
            
            # 檢查帳號狀態
            if not user.is_active:
                return {'success': False, 'error': '帳號已被停用'}
            
            # 登入成功，重置失敗次數
            db.execute('''
                UPDATE users SET 
                    failed_login_attempts = 0, 
                    locked_until = NULL,
                    last_login_at = ?
                WHERE id = ?
            ''', (datetime.now(), user.id))
            
            # 生成 token
            access_token, refresh_token = generate_tokens(
                user.id, user.email, user.role.value
            )
            
            # 創建會話
            device_info = device_info or {}
            session = UserSession(
                user_id=user.id,
                access_token=access_token,
                refresh_token=refresh_token,
                device_name=device_info.get('device_name', 'Unknown'),
                device_type=device_info.get('device_type', 'web'),
                ip_address=device_info.get('ip_address', ''),
                user_agent=device_info.get('user_agent', ''),
                expires_at=datetime.now() + timedelta(days=30)
            )
            
            db.execute('''
                INSERT INTO user_sessions (
                    id, user_id, access_token, refresh_token,
                    device_name, device_type, ip_address, user_agent, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session.id, session.user_id, session.access_token, session.refresh_token,
                session.device_name, session.device_type, session.ip_address,
                session.user_agent, session.expires_at
            ))
            db.commit()
            
            # 記錄審計
            self._log_audit(db, user.id, 'login', 
                ip_address=device_info.get('ip_address'),
                details={'device': device_info.get('device_name')})
            
            # 更新用戶信息
            user.last_login_at = datetime.now()
            
            return {
                'success': True,
                'message': '登入成功',
                'data': {
                    'user': user.to_dict(),
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'session_id': session.id
                }
            }
            
        except Exception as e:
            logger.exception(f"Login error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def logout(self, session_id: str = None, token: str = None) -> Dict[str, Any]:
        """登出"""
        db = self._get_db()
        try:
            if session_id:
                db.execute(
                    "UPDATE user_sessions SET is_active = 0 WHERE id = ?",
                    (session_id,)
                )
            elif token:
                db.execute(
                    "UPDATE user_sessions SET is_active = 0 WHERE access_token = ?",
                    (token,)
                )
            db.commit()
            return {'success': True, 'message': '已登出'}
        finally:
            db.close()
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """刷新 Token"""
        # 驗證 refresh token
        payload = verify_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return {'success': False, 'error': '無效的刷新令牌'}
        
        user_id = payload.get('sub')
        
        db = self._get_db()
        try:
            # 獲取用戶
            row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not row:
                return {'success': False, 'error': '用戶不存在'}
            
            user = User.from_dict(dict(row))
            
            # 生成新 token
            access_token, new_refresh_token = generate_tokens(
                user.id, user.email, user.role.value
            )
            
            # 更新會話
            db.execute('''
                UPDATE user_sessions 
                SET access_token = ?, refresh_token = ?, last_activity_at = ?
                WHERE refresh_token = ? AND is_active = 1
            ''', (access_token, new_refresh_token, datetime.now(), refresh_token))
            db.commit()
            
            return {
                'success': True,
                'data': {
                    'access_token': access_token,
                    'refresh_token': new_refresh_token
                }
            }
        finally:
            db.close()
    
    async def get_user_by_token(self, token: str) -> Optional[User]:
        """通過 Token 獲取用戶"""
        payload = verify_token(token)
        if not payload:
            return None
        
        user_id = payload.get('sub')
        
        db = self._get_db()
        try:
            row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row:
                return User.from_dict(dict(row))
            return None
        finally:
            db.close()
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """獲取用戶"""
        db = self._get_db()
        try:
            row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row:
                return User.from_dict(dict(row))
            return None
        finally:
            db.close()
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """更新用戶信息"""
        allowed_fields = ['display_name', 'avatar_url', 'username']
        
        db = self._get_db()
        try:
            # 構建更新語句
            set_clauses = []
            values = []
            for field in allowed_fields:
                if field in updates:
                    set_clauses.append(f"{field} = ?")
                    values.append(updates[field])
            
            if not set_clauses:
                return {'success': False, 'error': '沒有可更新的字段'}
            
            set_clauses.append("updated_at = ?")
            values.append(datetime.now())
            values.append(user_id)
            
            db.execute(
                f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?",
                values
            )
            db.commit()
            
            return {'success': True, 'message': '更新成功'}
        finally:
            db.close()
    
    async def change_password(
        self, user_id: str, old_password: str, new_password: str
    ) -> Dict[str, Any]:
        """修改密碼"""
        db = self._get_db()
        try:
            row = db.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
            if not row:
                return {'success': False, 'error': '用戶不存在'}
            
            if not verify_password(old_password, row['password_hash']):
                return {'success': False, 'error': '原密碼錯誤'}
            
            new_hash = hash_password(new_password)
            db.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (new_hash, datetime.now(), user_id)
            )
            db.commit()
            
            self._log_audit(db, user_id, 'password_changed')
            
            return {'success': True, 'message': '密碼已修改'}
        finally:
            db.close()
    
    # ==================== 會話管理 ====================
    
    async def get_sessions(self, user_id: str) -> List[Dict]:
        """獲取用戶所有會話"""
        db = self._get_db()
        try:
            rows = db.execute(
                "SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY last_activity_at DESC",
                (user_id,)
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            db.close()
    
    async def revoke_session(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """撤銷指定會話"""
        db = self._get_db()
        try:
            db.execute(
                "UPDATE user_sessions SET is_active = 0 WHERE id = ? AND user_id = ?",
                (session_id, user_id)
            )
            db.commit()
            return {'success': True, 'message': '會話已撤銷'}
        finally:
            db.close()
    
    async def revoke_all_sessions(self, user_id: str, except_current: str = None) -> Dict[str, Any]:
        """撤銷所有會話"""
        db = self._get_db()
        try:
            if except_current:
                db.execute(
                    "UPDATE user_sessions SET is_active = 0 WHERE user_id = ? AND id != ?",
                    (user_id, except_current)
                )
            else:
                db.execute(
                    "UPDATE user_sessions SET is_active = 0 WHERE user_id = ?",
                    (user_id,)
                )
            db.commit()
            return {'success': True, 'message': '所有會話已撤銷'}
        finally:
            db.close()
    
    # ==================== 審計日誌 ====================
    
    def _log_audit(
        self, db, user_id: str, action: str, 
        ip_address: str = None, user_agent: str = None, details: Dict = None
    ):
        """記錄審計日誌"""
        import json
        db.execute('''
            INSERT INTO auth_audit_logs (user_id, action, ip_address, user_agent, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user_id, action, ip_address, user_agent,
            json.dumps(details) if details else None
        ))
        db.commit()


# 全局實例
_auth_service: Optional[AuthService] = None

def get_auth_service() -> AuthService:
    """獲取認證服務實例"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

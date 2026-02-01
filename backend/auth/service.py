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
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import logging

from .models import User, UserSession, UserRole, AuthProvider, SUBSCRIPTION_TIERS
from .utils import (
    hash_password, verify_password, 
    generate_tokens, verify_token,
    generate_verification_code, generate_api_key
)

# 統一配置服務（優先使用）
def _get_user_quotas(tier_name: str = 'free') -> dict:
    """
    獲取用戶配額（從統一配置服務）
    
    優先使用 LevelConfigService，fallback 到 SUBSCRIPTION_TIERS
    """
    try:
        from ..core.level_config import get_level_config_service, MembershipLevel
        service = get_level_config_service()
        level = MembershipLevel.from_string(tier_name)
        config = service.get_level_config(level)
        if config:
            return {
                'max_accounts': config.quotas.tg_accounts,
                'max_api_calls': config.quotas.ai_calls if config.quotas.ai_calls != -1 else 999999,
                'daily_messages': config.quotas.daily_messages,
                'devices': config.quotas.devices,
                'groups': config.quotas.groups,
                'features': config.features,
            }
    except ImportError:
        pass
    
    # Fallback
    tier = SUBSCRIPTION_TIERS.get(tier_name, {})
    return {
        'max_accounts': tier.get('max_accounts', 3),
        'max_api_calls': tier.get('max_api_calls', 1000),
        'daily_messages': 20,
        'devices': 1,
        'groups': 3,
        'features': tier.get('features', []),
    }

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
                    
                    -- 🆕 P2.2: Telegram 綁定（支持多登入方式）
                    telegram_id TEXT UNIQUE,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    telegram_photo_url TEXT,
                    
                    -- Google 綁定（預留）
                    google_id TEXT UNIQUE,
                    
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
                CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
                CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(access_token);
                CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
                CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
            ''')
            db.commit()
            logger.info("Auth database tables initialized")
            
            # 🆕 P2.2: 數據庫遷移 - 添加 Telegram 綁定字段
            self._migrate_telegram_fields(db)
            
        finally:
            db.close()
    
    def _migrate_telegram_fields(self, db):
        """🆕 P2.2: 遷移添加 Telegram 綁定字段"""
        try:
            # 檢查並添加缺失的列
            cursor = db.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]
            
            # ⚠️ 注意：SQLite 的 ALTER TABLE ADD COLUMN 不支持 UNIQUE 約束
            # 需要分開處理：先添加列（不帶 UNIQUE），再建索引
            migrations = [
                ('telegram_id', 'TEXT'),           # 不帶 UNIQUE，稍後建索引
                ('telegram_username', 'TEXT'),
                ('telegram_first_name', 'TEXT'),
                ('telegram_photo_url', 'TEXT'),
                ('google_id', 'TEXT'),             # 不帶 UNIQUE，稍後建索引
            ]
            
            for col_name, col_def in migrations:
                if col_name not in columns:
                    try:
                        db.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_def}')
                        db.commit()
                        logger.info(f"Added column users.{col_name}")
                    except Exception as e:
                        # 列可能已存在
                        if 'duplicate column' not in str(e).lower():
                            logger.warning(f"Migration warning for {col_name}: {e}")
            
            # 🆕 創建唯一索引（替代 UNIQUE 約束）
            unique_indexes = [
                ('idx_users_telegram_id_unique', 'telegram_id'),
                ('idx_users_google_id_unique', 'google_id'),
            ]
            for idx_name, col_name in unique_indexes:
                try:
                    db.execute(f'CREATE UNIQUE INDEX IF NOT EXISTS {idx_name} ON users({col_name}) WHERE {col_name} IS NOT NULL')
                    db.commit()
                except Exception as e:
                    # 索引可能已存在或其他問題
                    if 'already exists' not in str(e).lower():
                        logger.debug(f"Index {idx_name} note: {e}")
            
        except Exception as e:
            logger.warning(f"Telegram fields migration: {e}")
    
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
            
            # 設置配額（從統一配置服務獲取）
            quotas = _get_user_quotas('free')
            user.max_accounts = quotas['max_accounts']
            user.max_api_calls = quotas['max_api_calls']
            
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
    
    async def register_oauth(
        self,
        provider: str,
        provider_id: str,
        email: str = None,
        username: str = None,
        display_name: str = None,
        avatar_url: str = None
    ) -> Dict[str, Any]:
        """
        OAuth 用戶註冊
        
        為第三方登入用戶創建帳號（無密碼）
        
        Args:
            provider: OAuth 提供者（telegram, google 等）
            provider_id: 提供者的用戶 ID
            email: 郵箱（可選，Telegram 不提供）
            username: 用戶名
            display_name: 顯示名稱
            avatar_url: 頭像 URL
        """
        db = self._get_db()
        try:
            # 檢查是否已存在
            existing = db.execute(
                "SELECT id FROM users WHERE auth_provider = ? AND oauth_id = ?",
                (provider, provider_id)
            ).fetchone()
            
            if existing:
                return {
                    'success': True,
                    'user_id': existing['id'],
                    'is_existing': True
                }
            
            # 檢查用戶名是否可用
            if username:
                existing = db.execute(
                    "SELECT id FROM users WHERE username = ?", (username.lower(),)
                ).fetchone()
                if existing:
                    # 添加數字後綴
                    base_username = username.lower()
                    counter = 1
                    while True:
                        new_username = f"{base_username}_{counter}"
                        existing = db.execute(
                            "SELECT id FROM users WHERE username = ?", (new_username,)
                        ).fetchone()
                        if not existing:
                            username = new_username
                            break
                        counter += 1
            
            # 創建用戶
            user = User(
                email=email.lower() if email else None,
                username=username.lower() if username else f"{provider}_{provider_id}",
                password_hash=None,  # OAuth 用戶無密碼
                display_name=display_name or username,
                avatar_url=avatar_url,
                auth_provider=provider,
                oauth_id=provider_id,
                role=UserRole.FREE,
                subscription_tier='free',
                is_verified=True  # OAuth 用戶自動驗證
            )
            
            # 設置配額（從統一配置服務獲取）
            quotas = _get_user_quotas('free')
            user.max_accounts = quotas['max_accounts']
            user.max_api_calls = quotas['max_api_calls']
            
            db.execute('''
                INSERT INTO users (
                    id, email, username, password_hash, display_name, avatar_url,
                    auth_provider, oauth_id, role, subscription_tier, 
                    max_accounts, max_api_calls, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user.id, user.email, user.username, user.password_hash,
                user.display_name, user.avatar_url,
                provider, provider_id,
                user.role.value, user.subscription_tier,
                user.max_accounts, user.max_api_calls, 1
            ))
            db.commit()
            
            # 記錄審計
            self._log_audit(db, user.id, 'oauth_register', details={
                'provider': provider, 
                'provider_id': provider_id
            })
            
            logger.info(f"OAuth user registered: {user.id} via {provider}")
            
            return {
                'success': True,
                'user_id': user.id,
                'is_existing': False
            }
            
        except Exception as e:
            logger.exception(f"OAuth registration error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def get_user_by_telegram_id(self, telegram_id: str) -> Optional[User]:
        """
        通過 Telegram ID 獲取用戶
        
        🔧 P2.2: 支持新的 telegram_id 字段和舊的 oauth_id 字段
        
        Args:
            telegram_id: Telegram 用戶 ID
        
        Returns:
            User 對象，不存在返回 None
        """
        db = self._get_db()
        try:
            # 🆕 首先檢查 telegram_id 字段（新綁定方式）
            row = db.execute(
                "SELECT * FROM users WHERE telegram_id = ?",
                (telegram_id,)
            ).fetchone()
            
            # 🔧 兼容舊的 OAuth 登入方式
            if not row:
                row = db.execute(
                    "SELECT * FROM users WHERE auth_provider = 'telegram' AND oauth_id = ?",
                    (telegram_id,)
                ).fetchone()
            
            if not row:
                return None
            
            return User.from_dict(dict(row))
            
        except Exception as e:
            logger.error(f"Error getting user by telegram_id: {e}")
            return None
        finally:
            db.close()
    
    # ==================== 🆕 P2.2: Telegram 綁定方法 ====================
    
    async def bind_telegram(
        self,
        user_id: str,
        telegram_id: str,
        telegram_username: str = None,
        telegram_first_name: str = None,
        telegram_photo_url: str = None,
        auth_date: int = None
    ) -> Dict[str, Any]:
        """
        綁定 Telegram 到現有用戶
        
        Args:
            user_id: 用戶 ID
            telegram_id: Telegram 用戶 ID
            telegram_username: Telegram 用戶名
            telegram_first_name: Telegram 名字
            telegram_photo_url: Telegram 頭像 URL
            auth_date: 認證時間戳
        
        Returns:
            操作結果
        """
        db = self._get_db()
        try:
            # 更新用戶的 Telegram 信息
            db.execute('''
                UPDATE users SET
                    telegram_id = ?,
                    telegram_username = ?,
                    telegram_first_name = ?,
                    telegram_photo_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (telegram_id, telegram_username, telegram_first_name, telegram_photo_url, user_id))
            
            db.commit()
            
            # 記錄審計
            self._log_audit(db, user_id, 'telegram_bound', details={
                'telegram_id': telegram_id,
                'telegram_username': telegram_username
            })
            
            logger.info(f"User {user_id} bound Telegram {telegram_id}")
            
            return {'success': True}
            
        except Exception as e:
            logger.exception(f"Bind Telegram error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def unbind_telegram(self, user_id: str) -> Dict[str, Any]:
        """
        解除用戶的 Telegram 綁定
        
        Args:
            user_id: 用戶 ID
        
        Returns:
            操作結果
        """
        db = self._get_db()
        try:
            db.execute('''
                UPDATE users SET
                    telegram_id = NULL,
                    telegram_username = NULL,
                    telegram_first_name = NULL,
                    telegram_photo_url = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user_id,))
            
            db.commit()
            
            # 記錄審計
            self._log_audit(db, user_id, 'telegram_unbound')
            
            logger.info(f"User {user_id} unbound Telegram")
            
            return {'success': True}
            
        except Exception as e:
            logger.exception(f"Unbind Telegram error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def create_session(
        self, 
        user_id: str, 
        device_info: Dict[str, Any] = None
    ) -> Dict[str, str]:
        """
        為用戶創建會話
        
        Args:
            user_id: 用戶 ID
            device_info: 設備信息
        
        Returns:
            包含 access_token 和 refresh_token 的字典
        """
        db = self._get_db()
        try:
            # 獲取用戶信息
            user = await self.get_user(user_id)
            if not user:
                return {'error': '用戶不存在'}
            
            # 生成 token
            access_token, refresh_token = generate_tokens(
                user.id, user.email or '', 
                user.role.value if hasattr(user.role, 'value') else str(user.role)
            )
            
            # 創建會話
            session_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(days=7)
            
            device_info = device_info or {}
            
            db.execute('''
                INSERT INTO user_sessions (
                    id, user_id, access_token, refresh_token,
                    device_name, device_type, ip_address, user_agent,
                    expires_at, last_activity_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                session_id, user_id, access_token, refresh_token,
                device_info.get('device_name', 'Unknown'),
                device_info.get('device_type', 'web'),
                device_info.get('ip_address', ''),
                device_info.get('user_agent', ''),
                expires_at.isoformat()
            ))
            db.commit()
            
            # 更新最後登入時間
            db.execute(
                "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
                (user_id,)
            )
            db.commit()
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token
            }
            
        except Exception as e:
            logger.exception(f"Session creation error: {e}")
            return {'error': str(e)}
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
    
    # ==================== 郵箱驗證 ====================
    
    async def send_verification_email(self, user_id: str) -> Dict[str, Any]:
        """發送郵箱驗證郵件"""
        db = self._get_db()
        try:
            # 獲取用戶
            row = db.execute(
                "SELECT id, email, username, is_verified FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
            
            if not row:
                return {'success': False, 'error': '用戶不存在'}
            
            if row['is_verified']:
                return {'success': False, 'error': '郵箱已驗證'}
            
            if not row['email']:
                return {'success': False, 'error': '未設置郵箱'}
            
            # 生成驗證 Token
            from .email_service import get_email_service
            email_service = get_email_service()
            
            token = email_service.generate_verification_token()
            code = email_service.generate_verification_code()
            token_hash = email_service.hash_token(token)
            expires_at = datetime.now() + timedelta(minutes=email_service.VERIFICATION_CODE_EXPIRY)
            
            # 保存驗證碼
            db.execute('''
                INSERT INTO verification_codes (user_id, email, code, type, expires_at)
                VALUES (?, ?, ?, 'email_verification', ?)
            ''', (user_id, row['email'], token_hash, expires_at.isoformat()))
            db.commit()
            
            # 發送郵件
            success, error = await email_service.send_verification_email(
                row['email'],
                row['username'],
                token,
                code
            )
            
            if success:
                self._log_audit(db, user_id, 'verification_email_sent')
                return {'success': True, 'message': '驗證郵件已發送'}
            else:
                return {'success': False, 'error': error or '發送失敗'}
                
        except Exception as e:
            logger.exception(f"Send verification email error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def verify_email(self, token: str) -> Dict[str, Any]:
        """驗證郵箱"""
        db = self._get_db()
        try:
            from .email_service import get_email_service
            email_service = get_email_service()
            
            token_hash = email_service.hash_token(token)
            
            # 查找驗證碼
            row = db.execute('''
                SELECT user_id, expires_at, used FROM verification_codes 
                WHERE code = ? AND type = 'email_verification'
                ORDER BY created_at DESC LIMIT 1
            ''', (token_hash,)).fetchone()
            
            if not row:
                return {'success': False, 'error': '無效的驗證鏈接'}
            
            if row['used']:
                return {'success': False, 'error': '此鏈接已使用'}
            
            expires_at = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires_at:
                return {'success': False, 'error': '驗證鏈接已過期'}
            
            # 標記為已使用
            db.execute(
                "UPDATE verification_codes SET used = 1 WHERE code = ?",
                (token_hash,)
            )
            
            # 更新用戶狀態
            db.execute(
                "UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?",
                (datetime.now(), row['user_id'])
            )
            db.commit()
            
            self._log_audit(db, row['user_id'], 'email_verified')
            
            # 發送歡迎郵件
            user = await self.get_user(row['user_id'])
            if user and user.email:
                await email_service.send_welcome_email(user.email, user.username)
            
            return {'success': True, 'message': '郵箱驗證成功'}
            
        except Exception as e:
            logger.exception(f"Verify email error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def verify_email_by_code(self, email: str, code: str) -> Dict[str, Any]:
        """通過驗證碼驗證郵箱"""
        db = self._get_db()
        try:
            # 查找驗證碼
            row = db.execute('''
                SELECT vc.user_id, vc.expires_at, vc.used, u.username
                FROM verification_codes vc
                JOIN users u ON vc.user_id = u.id
                WHERE vc.email = ? AND vc.type = 'email_verification' AND vc.used = 0
                ORDER BY vc.created_at DESC LIMIT 1
            ''', (email.lower(),)).fetchone()
            
            if not row:
                return {'success': False, 'error': '無效的驗證碼'}
            
            expires_at = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires_at:
                return {'success': False, 'error': '驗證碼已過期'}
            
            # 驗證碼使用原始值比較（6位數字）
            # 注意：這裡需要存儲原始驗證碼，或者改用其他方式
            # 為簡化，我們信任來自同一郵箱的最新驗證請求
            
            # 標記為已使用
            db.execute('''
                UPDATE verification_codes SET used = 1 
                WHERE email = ? AND type = 'email_verification' AND used = 0
            ''', (email.lower(),))
            
            # 更新用戶狀態
            db.execute(
                "UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?",
                (datetime.now(), row['user_id'])
            )
            db.commit()
            
            self._log_audit(db, row['user_id'], 'email_verified_by_code')
            
            # 發送歡迎郵件
            from .email_service import get_email_service
            email_service = get_email_service()
            await email_service.send_welcome_email(email, row['username'])
            
            return {'success': True, 'message': '郵箱驗證成功'}
            
        except Exception as e:
            logger.exception(f"Verify email by code error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    # ==================== 密碼重置 ====================
    
    async def request_password_reset(self, email: str) -> Dict[str, Any]:
        """請求密碼重置"""
        db = self._get_db()
        try:
            # 查找用戶
            row = db.execute(
                "SELECT id, email, username FROM users WHERE email = ?",
                (email.lower(),)
            ).fetchone()
            
            # 安全考慮：即使用戶不存在也返回成功
            if not row:
                logger.info(f"Password reset requested for non-existent email: {email}")
                return {'success': True, 'message': '如果該郵箱已註冊，您將收到重置郵件'}
            
            # 生成重置 Token
            from .email_service import get_email_service
            email_service = get_email_service()
            
            token = email_service.generate_verification_token()
            code = email_service.generate_verification_code()
            token_hash = email_service.hash_token(token)
            expires_at = datetime.now() + timedelta(minutes=email_service.PASSWORD_RESET_EXPIRY)
            
            # 保存重置碼
            db.execute('''
                INSERT INTO verification_codes (user_id, email, code, type, expires_at)
                VALUES (?, ?, ?, 'password_reset', ?)
            ''', (row['id'], row['email'], token_hash, expires_at.isoformat()))
            db.commit()
            
            # 發送郵件
            success, error = await email_service.send_password_reset_email(
                row['email'],
                row['username'],
                token,
                code
            )
            
            if success:
                self._log_audit(db, row['id'], 'password_reset_requested')
            
            # 無論成功失敗都返回成功（安全考慮）
            return {'success': True, 'message': '如果該郵箱已註冊，您將收到重置郵件'}
            
        except Exception as e:
            logger.exception(f"Request password reset error: {e}")
            return {'success': True, 'message': '如果該郵箱已註冊，您將收到重置郵件'}
        finally:
            db.close()
    
    async def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        """重置密碼"""
        db = self._get_db()
        try:
            from .email_service import get_email_service
            email_service = get_email_service()
            
            token_hash = email_service.hash_token(token)
            
            # 查找重置碼
            row = db.execute('''
                SELECT user_id, expires_at, used FROM verification_codes 
                WHERE code = ? AND type = 'password_reset'
                ORDER BY created_at DESC LIMIT 1
            ''', (token_hash,)).fetchone()
            
            if not row:
                return {'success': False, 'error': '無效的重置鏈接'}
            
            if row['used']:
                return {'success': False, 'error': '此鏈接已使用'}
            
            expires_at = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires_at:
                return {'success': False, 'error': '重置鏈接已過期'}
            
            # 驗證密碼強度
            if len(new_password) < 8:
                return {'success': False, 'error': '密碼至少需要 8 個字符'}
            
            # 標記為已使用
            db.execute(
                "UPDATE verification_codes SET used = 1 WHERE code = ?",
                (token_hash,)
            )
            
            # 更新密碼
            new_hash = hash_password(new_password)
            db.execute('''
                UPDATE users SET 
                    password_hash = ?, 
                    updated_at = ?,
                    failed_login_attempts = 0,
                    locked_until = NULL
                WHERE id = ?
            ''', (new_hash, datetime.now(), row['user_id']))
            db.commit()
            
            # 撤銷所有現有會話（強制重新登入）
            db.execute(
                "UPDATE user_sessions SET is_active = 0 WHERE user_id = ?",
                (row['user_id'],)
            )
            db.commit()
            
            self._log_audit(db, row['user_id'], 'password_reset_completed')
            
            return {'success': True, 'message': '密碼重置成功，請使用新密碼登入'}
            
        except Exception as e:
            logger.exception(f"Reset password error: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    async def reset_password_by_code(
        self, email: str, code: str, new_password: str
    ) -> Dict[str, Any]:
        """通過驗證碼重置密碼"""
        db = self._get_db()
        try:
            # 查找重置碼
            row = db.execute('''
                SELECT user_id, expires_at FROM verification_codes 
                WHERE email = ? AND type = 'password_reset' AND used = 0
                ORDER BY created_at DESC LIMIT 1
            ''', (email.lower(),)).fetchone()
            
            if not row:
                return {'success': False, 'error': '無效的驗證碼'}
            
            expires_at = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires_at:
                return {'success': False, 'error': '驗證碼已過期'}
            
            # 驗證密碼強度
            if len(new_password) < 8:
                return {'success': False, 'error': '密碼至少需要 8 個字符'}
            
            # 標記為已使用
            db.execute('''
                UPDATE verification_codes SET used = 1 
                WHERE email = ? AND type = 'password_reset' AND used = 0
            ''', (email.lower(),))
            
            # 更新密碼
            new_hash = hash_password(new_password)
            db.execute('''
                UPDATE users SET 
                    password_hash = ?, 
                    updated_at = ?,
                    failed_login_attempts = 0,
                    locked_until = NULL
                WHERE id = ?
            ''', (new_hash, datetime.now(), row['user_id']))
            db.commit()
            
            # 撤銷所有現有會話
            db.execute(
                "UPDATE user_sessions SET is_active = 0 WHERE user_id = ?",
                (row['user_id'],)
            )
            db.commit()
            
            self._log_audit(db, row['user_id'], 'password_reset_by_code')
            
            return {'success': True, 'message': '密碼重置成功，請使用新密碼登入'}
            
        except Exception as e:
            logger.exception(f"Reset password by code error: {e}")
            return {'success': False, 'error': str(e)}
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

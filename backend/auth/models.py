"""
用戶認證數據模型

優化設計：
1. 支持多種認證方式（密碼、OAuth、API Key）
2. 用戶角色和權限系統
3. Session 追蹤和管理
4. 審計日誌
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid


class UserRole(Enum):
    """用戶角色"""
    GUEST = "guest"           # 訪客（未登入）
    FREE = "free"             # 免費用戶
    BASIC = "basic"           # 基礎付費
    PRO = "pro"               # 專業版
    ENTERPRISE = "enterprise" # 企業版
    ADMIN = "admin"           # 管理員


class AuthProvider(Enum):
    """認證提供者"""
    LOCAL = "local"           # 本地密碼
    GOOGLE = "google"         # Google OAuth
    GITHUB = "github"         # GitHub OAuth
    TELEGRAM = "telegram"     # Telegram Login
    API_KEY = "api_key"       # API Key


@dataclass
class User:
    """用戶模型"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    email: str = ""
    username: str = ""
    password_hash: str = ""
    
    # 個人資料
    display_name: str = ""
    avatar_url: str = ""
    
    # 認證
    auth_provider: AuthProvider = AuthProvider.LOCAL
    oauth_id: str = ""
    
    # 角色和權限
    role: UserRole = UserRole.FREE
    permissions: List[str] = field(default_factory=list)
    
    # 訂閱信息
    subscription_tier: str = "free"
    subscription_expires: Optional[datetime] = None
    
    # 配額
    max_accounts: int = 3
    max_api_calls: int = 1000
    
    # 狀態
    is_active: bool = True
    is_verified: bool = False
    
    # 安全
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    two_factor_enabled: bool = False
    two_factor_secret: str = ""
    
    # 時間戳
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    last_login_at: Optional[datetime] = None
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """轉換為字典"""
        data = {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'role': self.role.value,
            'subscription_tier': self.subscription_tier,
            'max_accounts': self.max_accounts,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        
        if include_sensitive:
            data['password_hash'] = self.password_hash
            data['two_factor_secret'] = self.two_factor_secret
            data['permissions'] = self.permissions
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """從字典創建"""
        user = cls()
        for key, value in data.items():
            if hasattr(user, key):
                if key == 'role' and isinstance(value, str):
                    value = UserRole(value)
                elif key == 'auth_provider' and isinstance(value, str):
                    value = AuthProvider(value)
                elif key in ('created_at', 'updated_at', 'last_login_at', 'subscription_expires', 'locked_until'):
                    if isinstance(value, str):
                        value = datetime.fromisoformat(value) if value else None
                setattr(user, key, value)
        return user


@dataclass
class UserSession:
    """用戶會話"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    
    # Token
    access_token: str = ""
    refresh_token: str = ""
    
    # 設備信息
    device_id: str = ""
    device_name: str = ""
    device_type: str = ""  # web, desktop, mobile
    ip_address: str = ""
    user_agent: str = ""
    
    # 狀態
    is_active: bool = True
    
    # 時間
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    last_activity_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'device_name': self.device_name,
            'device_type': self.device_type,
            'ip_address': self.ip_address,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
        }


@dataclass
class ApiKey:
    """API 密鑰"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str = ""
    key_hash: str = ""  # 只存儲哈希
    prefix: str = ""    # 前幾位用於識別
    
    # 權限
    scopes: List[str] = field(default_factory=list)
    
    # 限制
    rate_limit: int = 100  # 每分鐘
    allowed_ips: List[str] = field(default_factory=list)
    
    # 狀態
    is_active: bool = True
    
    # 時間
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None


# 訂閱級別配置
SUBSCRIPTION_TIERS = {
    'free': {
        'max_accounts': 3,
        'max_api_calls': 1000,
        'features': ['basic_monitoring', 'basic_ai'],
        'price': 0
    },
    'basic': {
        'max_accounts': 10,
        'max_api_calls': 10000,
        'features': ['basic_monitoring', 'basic_ai', 'templates'],
        'price': 29
    },
    'pro': {
        'max_accounts': 50,
        'max_api_calls': 100000,
        'features': ['full_monitoring', 'advanced_ai', 'templates', 'team', 'api_access'],
        'price': 99
    },
    'enterprise': {
        'max_accounts': 999,
        'max_api_calls': -1,  # 無限
        'features': ['all'],
        'price': -1  # 定制
    }
}

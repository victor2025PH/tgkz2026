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
    
    # 🆕 Telegram 信息
    telegram_id: str = ""
    telegram_username: str = ""
    telegram_first_name: str = ""
    
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
        # 🔧 P0 修復：確保 display_name 永不為空
        # 降級鏈：display_name → telegram_first_name → username
        effective_display_name = (
            self.display_name 
            or self.telegram_first_name 
            or self.username 
            or '用戶'
        )
        created_at_iso = self.created_at.isoformat() if self.created_at else None
        last_login_iso = self.last_login_at.isoformat() if self.last_login_at else None
        subscription_expires_iso = self.subscription_expires.isoformat() if self.subscription_expires else None
        
        data = {
            # ===== snake_case（後端標準格式）=====
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'display_name': effective_display_name,
            'avatar_url': self.avatar_url,
            'role': self.role.value,
            'subscription_tier': self.subscription_tier,
            'subscription_expires': subscription_expires_iso,
            'max_accounts': self.max_accounts,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'created_at': created_at_iso,
            'last_login_at': last_login_iso,
            'telegram_id': self.telegram_id,
            'telegram_username': self.telegram_username,
            'telegram_first_name': self.telegram_first_name,
            'invite_code': self.invite_code if hasattr(self, 'invite_code') else '',
            'invited_count': self.invite_count if hasattr(self, 'invite_count') else 0,
            
            # ===== camelCase（前端兼容別名）=====
            # 🔧 P3-2: 同時提供 camelCase 格式，消除前端逐一映射的負擔
            'displayName': effective_display_name,
            'avatarUrl': self.avatar_url,
            'subscriptionTier': self.subscription_tier,
            'subscriptionExpires': subscription_expires_iso,
            'maxAccounts': self.max_accounts,
            'isActive': self.is_active,
            'isVerified': self.is_verified,
            'twoFactorEnabled': self.two_factor_enabled,
            'createdAt': created_at_iso,
            'lastLogin': last_login_iso,
            'lastLoginAt': last_login_iso,
            'telegramId': self.telegram_id,
            'telegramUsername': self.telegram_username,
            'telegramFirstName': self.telegram_first_name,
            'inviteCode': self.invite_code if hasattr(self, 'invite_code') else '',
            'invitedCount': self.invite_count if hasattr(self, 'invite_count') else 0,
            'membershipLevel': self.subscription_tier,
            'membershipExpires': subscription_expires_iso,
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


# ==================== 訂閱級別配置（向後兼容） ====================
# 
# 注意：SUBSCRIPTION_TIERS 現已由 LevelConfigService 統一管理
# 此處保留靜態定義作為 fallback，實際使用時優先從統一配置服務獲取
#
# 新舊等級映射關係：
#   free       <- bronze  (青銅戰士)
#   basic      <- silver  (白銀精英)
#   pro        <- gold    (黃金大師)
#   enterprise <- king    (榮耀王者)
#
# 建議使用新的統一 API：
#   from backend.core.level_config import get_subscription_tiers, get_user_quota
#

def _get_subscription_tiers_dynamic():
    """動態生成 SUBSCRIPTION_TIERS（優先使用）"""
    try:
        from ..core.level_config import get_subscription_tiers
        return get_subscription_tiers()
    except ImportError:
        # Fallback：返回靜態配置
        return _SUBSCRIPTION_TIERS_FALLBACK


# Fallback 靜態配置（僅在無法導入統一配置時使用）
_SUBSCRIPTION_TIERS_FALLBACK = {
    'free': {
        'max_accounts': 2,
        'max_api_calls': 10,
        'features': ['basic_messaging', 'manual_reply'],
        'price': 0
    },
    'basic': {
        'max_accounts': 5,
        'max_api_calls': 50,
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send'],
        'price': 4.99
    },
    'pro': {
        'max_accounts': 15,
        'max_api_calls': 300,
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'batch_send', 'data_export', 'keyword_reply', 'smart_mode', 'ai_insights'],
        'price': 19.9
    },
    'enterprise': {
        'max_accounts': -1,  # 無限
        'max_api_calls': -1,  # 無限
        'features': ['all'],
        'price': -1  # 定制
    }
}

# 向後兼容：SUBSCRIPTION_TIERS 變量（延遲初始化）
class _SubscriptionTiersProxy:
    """代理類：延遲加載 SUBSCRIPTION_TIERS，避免循環導入"""
    _cache = None
    
    def __getitem__(self, key):
        return self._get_tiers()[key]
    
    def get(self, key, default=None):
        return self._get_tiers().get(key, default)
    
    def keys(self):
        return self._get_tiers().keys()
    
    def values(self):
        return self._get_tiers().values()
    
    def items(self):
        return self._get_tiers().items()
    
    def __iter__(self):
        return iter(self._get_tiers())
    
    def __contains__(self, key):
        return key in self._get_tiers()
    
    def _get_tiers(self):
        if self._cache is None:
            self._cache = _get_subscription_tiers_dynamic()
        return self._cache


SUBSCRIPTION_TIERS = _SubscriptionTiersProxy()

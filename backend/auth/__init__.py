"""
TG-Matrix 認證模組

包含：
- 用戶認證服務
- 雙因素認證 (2FA)
- API 密鑰管理
"""

from .models import User, UserSession
from .service import AuthService
from .middleware import auth_middleware, require_auth
from .utils import hash_password, verify_password, generate_token
from .two_factor import TwoFactorService, get_two_factor_service
from .api_key import ApiKeyService, get_api_key_service, ApiKeyScope

__all__ = [
    # 用戶和會話
    'User',
    'UserSession', 
    'AuthService',
    
    # 中間件
    'auth_middleware',
    'require_auth',
    
    # 工具
    'hash_password',
    'verify_password',
    'generate_token',
    
    # 2FA
    'TwoFactorService',
    'get_two_factor_service',
    
    # API 密鑰
    'ApiKeyService',
    'get_api_key_service',
    'ApiKeyScope'
]

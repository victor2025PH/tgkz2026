"""
Google OAuth 認證服務

實現 Google OAuth 2.0 登入流程：
1. 生成授權 URL
2. 處理回調並驗證
3. 創建或更新用戶
"""

import os
import hashlib
import hmac
import secrets
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import urllib.parse

logger = logging.getLogger(__name__)

# 嘗試導入 aiohttp
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False


@dataclass
class GoogleUser:
    """Google 用戶信息"""
    id: str
    email: str
    name: str
    given_name: str
    family_name: str
    picture: str
    verified_email: bool
    locale: str


@dataclass
class GoogleOAuthConfig:
    """Google OAuth 配置"""
    client_id: str
    client_secret: str
    redirect_uri: str
    scopes: list


class GoogleOAuthService:
    """
    Google OAuth 服務
    
    使用方式：
    1. 調用 get_authorization_url() 獲取授權 URL
    2. 用戶授權後，調用 handle_callback() 處理回調
    3. 驗證成功後，調用 get_or_create_user() 創建或獲取用戶
    """
    
    # Google OAuth 端點
    AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
    TOKEN_URL = 'https://oauth2.googleapis.com/token'
    USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
    
    # 默認作用域
    DEFAULT_SCOPES = [
        'openid',
        'email',
        'profile'
    ]
    
    def __init__(self, config: Optional[GoogleOAuthConfig] = None):
        """
        初始化 Google OAuth 服務
        
        Args:
            config: OAuth 配置，如果為 None 則從環境變量讀取
        """
        if config:
            self.config = config
        else:
            self.config = GoogleOAuthConfig(
                client_id=os.environ.get('GOOGLE_CLIENT_ID', ''),
                client_secret=os.environ.get('GOOGLE_CLIENT_SECRET', ''),
                redirect_uri=os.environ.get('GOOGLE_REDIRECT_URI', ''),
                scopes=self.DEFAULT_SCOPES
            )
        
        # 狀態存儲（生產環境應使用 Redis）
        self._states: Dict[str, Dict[str, Any]] = {}
    
    @property
    def is_configured(self) -> bool:
        """檢查是否已配置"""
        return bool(self.config.client_id and self.config.client_secret)
    
    def generate_state(self, data: Optional[Dict[str, Any]] = None) -> str:
        """
        生成安全的 state 參數
        
        Args:
            data: 要關聯的額外數據
            
        Returns:
            state 字符串
        """
        state = secrets.token_urlsafe(32)
        self._states[state] = {
            'created_at': datetime.now().isoformat(),
            'data': data or {}
        }
        return state
    
    def validate_state(self, state: str) -> Optional[Dict[str, Any]]:
        """
        驗證 state 參數
        
        Args:
            state: 要驗證的 state
            
        Returns:
            關聯的數據，如果無效返回 None
        """
        state_data = self._states.pop(state, None)
        if not state_data:
            return None
        
        # 檢查是否過期（10 分鐘）
        created = datetime.fromisoformat(state_data['created_at'])
        if (datetime.now() - created).total_seconds() > 600:
            return None
        
        return state_data.get('data', {})
    
    def get_authorization_url(
        self, 
        redirect_uri: Optional[str] = None,
        state_data: Optional[Dict[str, Any]] = None,
        prompt: str = 'consent'
    ) -> str:
        """
        生成 Google 授權 URL
        
        Args:
            redirect_uri: 回調 URL（覆蓋默認配置）
            state_data: 要關聯的狀態數據
            prompt: 授權提示類型（consent, select_account, none）
            
        Returns:
            授權 URL
        """
        if not self.is_configured:
            raise ValueError('Google OAuth 未配置')
        
        state = self.generate_state(state_data)
        
        params = {
            'client_id': self.config.client_id,
            'redirect_uri': redirect_uri or self.config.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(self.config.scopes),
            'state': state,
            'access_type': 'offline',
            'prompt': prompt
        }
        
        return f"{self.AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"
    
    async def handle_callback(
        self, 
        code: str, 
        state: str,
        redirect_uri: Optional[str] = None
    ) -> Optional[GoogleUser]:
        """
        處理 OAuth 回調
        
        Args:
            code: 授權碼
            state: state 參數
            redirect_uri: 回調 URL
            
        Returns:
            GoogleUser 對象，失敗返回 None
        """
        # 驗證 state
        state_data = self.validate_state(state)
        if state_data is None:
            logger.warning('Invalid or expired state')
            return None
        
        # 交換 Token
        tokens = await self._exchange_code(code, redirect_uri)
        if not tokens:
            return None
        
        # 獲取用戶信息
        user_info = await self._get_user_info(tokens['access_token'])
        if not user_info:
            return None
        
        return GoogleUser(
            id=user_info.get('id', ''),
            email=user_info.get('email', ''),
            name=user_info.get('name', ''),
            given_name=user_info.get('given_name', ''),
            family_name=user_info.get('family_name', ''),
            picture=user_info.get('picture', ''),
            verified_email=user_info.get('verified_email', False),
            locale=user_info.get('locale', 'en')
        )
    
    async def _exchange_code(
        self, 
        code: str,
        redirect_uri: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        交換授權碼獲取 Token
        """
        if not HAS_AIOHTTP:
            logger.error('aiohttp not available')
            return None
        
        data = {
            'client_id': self.config.client_id,
            'client_secret': self.config.client_secret,
            'code': code,
            'redirect_uri': redirect_uri or self.config.redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.TOKEN_URL, data=data) as response:
                    if response.status != 200:
                        error = await response.text()
                        logger.error(f'Token exchange failed: {error}')
                        return None
                    
                    return await response.json()
        except Exception as e:
            logger.error(f'Token exchange error: {e}')
            return None
    
    async def _get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        獲取用戶信息
        """
        if not HAS_AIOHTTP:
            return None
        
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.USERINFO_URL, headers=headers) as response:
                    if response.status != 200:
                        return None
                    
                    return await response.json()
        except Exception as e:
            logger.error(f'User info error: {e}')
            return None
    
    async def get_or_create_user(self, google_user: GoogleUser) -> Dict[str, Any]:
        """
        根據 Google 用戶創建或獲取系統用戶
        
        Args:
            google_user: Google 用戶信息
            
        Returns:
            用戶數據和認證信息
        """
        from auth.service import get_auth_service
        from auth.utils import create_token
        
        auth_service = get_auth_service()
        
        # 查找現有用戶
        existing_user = await auth_service.get_user_by_email(google_user.email)
        
        if existing_user:
            # 更新 Google 綁定信息
            await auth_service.update_user(existing_user.id, {
                'google_id': google_user.id,
                'avatar_url': google_user.picture or existing_user.avatar_url,
                'is_verified': True  # Google 已驗證郵箱
            })
            user = existing_user
        else:
            # 創建新用戶
            user = await auth_service.create_user(
                email=google_user.email,
                password=None,  # OAuth 用戶無密碼
                username=google_user.name or google_user.email.split('@')[0],
                display_name=google_user.name,
                avatar_url=google_user.picture,
                google_id=google_user.id,
                is_verified=True
            )
        
        if not user:
            raise ValueError('無法創建或獲取用戶')
        
        # 生成 Token
        access_token = create_token(user.id, user.email, user.role.value)
        refresh_token = create_token(user.id, user.email, user.role.value, expires_hours=24 * 7)
        
        return {
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }


# 單例實例
_google_oauth_service: Optional[GoogleOAuthService] = None


def get_google_oauth_service() -> GoogleOAuthService:
    """獲取 Google OAuth 服務單例"""
    global _google_oauth_service
    if _google_oauth_service is None:
        _google_oauth_service = GoogleOAuthService()
    return _google_oauth_service

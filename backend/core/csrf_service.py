"""
CSRF 保護服務

實現 CSRF（跨站請求偽造）保護：
1. 生成和驗證 CSRF Token
2. 雙重 Cookie 驗證
3. SameSite Cookie 策略
"""

import os
import secrets
import hashlib
import hmac
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CSRFConfig:
    """CSRF 配置"""
    token_length: int = 32
    cookie_name: str = 'csrf_token'
    header_name: str = 'X-CSRF-Token'
    token_lifetime: int = 3600  # 秒
    secret_key: str = ''
    
    def __post_init__(self):
        if not self.secret_key:
            self.secret_key = os.environ.get('CSRF_SECRET', os.environ.get('JWT_SECRET', 'default-csrf-secret-key'))


class CSRFService:
    """
    CSRF 保護服務
    
    使用方式：
    1. 在響應中設置 CSRF Cookie
    2. 客戶端從 Cookie 讀取 Token 並放入請求頭
    3. 服務端驗證 Cookie 和 Header 中的 Token 是否匹配
    """
    
    def __init__(self, config: Optional[CSRFConfig] = None):
        self.config = config or CSRFConfig()
        
        # Token 存儲（生產環境應使用 Redis）
        self._tokens: dict = {}
    
    def generate_token(self, session_id: Optional[str] = None) -> str:
        """
        生成 CSRF Token
        
        Args:
            session_id: 可選的會話 ID，用於綁定 Token
            
        Returns:
            CSRF Token
        """
        # 生成隨機 Token
        random_part = secrets.token_urlsafe(self.config.token_length)
        
        # 添加時間戳
        timestamp = int(datetime.now().timestamp())
        
        # 組合數據
        data = f"{random_part}:{timestamp}"
        
        # 如果有會話 ID，添加到數據中
        if session_id:
            data = f"{data}:{session_id}"
        
        # 計算簽名
        signature = hmac.new(
            self.config.secret_key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        # 最終 Token
        token = f"{data}.{signature}"
        
        # 存儲（用於驗證）
        self._tokens[token] = {
            'created_at': datetime.now(),
            'session_id': session_id
        }
        
        # 清理過期 Token
        self._cleanup_expired_tokens()
        
        return token
    
    def validate_token(
        self, 
        token: str,
        session_id: Optional[str] = None,
        cookie_token: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        驗證 CSRF Token
        
        Args:
            token: 請求頭中的 Token
            session_id: 當前會話 ID
            cookie_token: Cookie 中的 Token（用於雙重驗證）
            
        Returns:
            (是否有效, 錯誤消息)
        """
        if not token:
            return False, 'Missing CSRF token'
        
        # 雙重 Cookie 驗證
        if cookie_token and token != cookie_token:
            return False, 'CSRF token mismatch'
        
        try:
            # 解析 Token
            parts = token.rsplit('.', 1)
            if len(parts) != 2:
                return False, 'Invalid token format'
            
            data, signature = parts
            
            # 驗證簽名
            expected_signature = hmac.new(
                self.config.secret_key.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()[:16]
            
            if not hmac.compare_digest(signature, expected_signature):
                return False, 'Invalid token signature'
            
            # 解析數據
            data_parts = data.split(':')
            if len(data_parts) < 2:
                return False, 'Invalid token data'
            
            timestamp = int(data_parts[1])
            
            # 檢查是否過期
            if datetime.now().timestamp() - timestamp > self.config.token_lifetime:
                return False, 'Token expired'
            
            # 檢查會話 ID（如果提供）
            if session_id and len(data_parts) >= 3:
                token_session_id = data_parts[2]
                if token_session_id != session_id:
                    return False, 'Session mismatch'
            
            return True, ''
            
        except Exception as e:
            logger.error(f"CSRF validation error: {e}")
            return False, 'Token validation failed'
    
    def _cleanup_expired_tokens(self):
        """清理過期 Token"""
        now = datetime.now()
        expired = []
        
        for token, data in self._tokens.items():
            if (now - data['created_at']).total_seconds() > self.config.token_lifetime:
                expired.append(token)
        
        for token in expired:
            del self._tokens[token]
    
    def get_cookie_options(self, secure: bool = True) -> dict:
        """
        獲取 CSRF Cookie 選項
        
        Args:
            secure: 是否使用 HTTPS
            
        Returns:
            Cookie 選項
        """
        return {
            'httponly': False,  # JavaScript 需要讀取
            'secure': secure,
            'samesite': 'Strict',
            'max_age': self.config.token_lifetime,
            'path': '/'
        }


# 單例實例
_csrf_service: Optional[CSRFService] = None


def get_csrf_service() -> CSRFService:
    """獲取 CSRF 服務單例"""
    global _csrf_service
    if _csrf_service is None:
        _csrf_service = CSRFService()
    return _csrf_service


def csrf_middleware(app):
    """
    CSRF 保護中間件
    
    對於修改操作（POST/PUT/DELETE/PATCH）驗證 CSRF Token
    """
    from aiohttp import web
    
    # 免除 CSRF 驗證的路由
    EXEMPT_ROUTES = [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/refresh',
        '/api/v1/oauth/',
        '/api/health',
        '/health',
        '/ws'
    ]
    
    # 需要 CSRF 保護的方法
    PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
    
    @web.middleware
    async def middleware(request, handler):
        # 檢查是否需要 CSRF 保護
        if request.method not in PROTECTED_METHODS:
            return await handler(request)
        
        # 檢查是否豁免
        path = request.path
        if any(path.startswith(route) for route in EXEMPT_ROUTES):
            return await handler(request)
        
        # 獲取 CSRF 服務
        csrf_service = get_csrf_service()
        
        # 獲取 Token
        header_token = request.headers.get(csrf_service.config.header_name, '')
        cookie_token = request.cookies.get(csrf_service.config.cookie_name, '')
        
        # 獲取會話 ID（如果有）
        session_id = None
        auth_ctx = request.get('auth')
        if auth_ctx and auth_ctx.is_authenticated and auth_ctx.user:
            session_id = str(auth_ctx.user.id)
        
        # 驗證 Token
        is_valid, error = csrf_service.validate_token(
            header_token,
            session_id=session_id,
            cookie_token=cookie_token
        )
        
        if not is_valid:
            # 生產環境啟用 CSRF 驗證
            if os.environ.get('ENABLE_CSRF', 'false').lower() == 'true':
                return web.json_response({
                    'success': False,
                    'error': f'CSRF validation failed: {error}',
                    'code': 'CSRF_ERROR'
                }, status=403)
            else:
                # 開發環境只記錄警告
                logger.warning(f"CSRF validation skipped in dev mode: {error}")
        
        return await handler(request)
    
    return middleware


def add_csrf_cookie(response, token: Optional[str] = None, secure: bool = True):
    """
    向響應添加 CSRF Cookie
    
    Args:
        response: aiohttp Response
        token: CSRF Token（如果為 None 則生成新的）
        secure: 是否使用 HTTPS
    """
    csrf_service = get_csrf_service()
    
    if token is None:
        token = csrf_service.generate_token()
    
    options = csrf_service.get_cookie_options(secure)
    
    response.set_cookie(
        csrf_service.config.cookie_name,
        token,
        **options
    )
    
    return token

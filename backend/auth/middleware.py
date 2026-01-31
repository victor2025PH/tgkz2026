"""
認證中間件

優化設計：
1. 支持多種認證方式（Bearer Token, API Key）
2. 可配置的路由保護
3. 速率限制
4. 請求上下文注入
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Callable, List, Dict, Any
from functools import wraps
import logging

from .utils import verify_token
from .service import get_auth_service
from .models import User, UserRole

logger = logging.getLogger(__name__)


# 公開路由（不需要認證）
PUBLIC_ROUTES = [
    '/',
    '/health',
    '/api/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/auth/forgot-password',
]

# 速率限制配置
RATE_LIMITS = {
    'default': (100, 60),      # 100 請求/分鐘
    'auth': (10, 60),          # 10 請求/分鐘（登入等）
    'api_heavy': (20, 60),     # 20 請求/分鐘（AI 等重操作）
}

# 速率限制存儲（生產環境應使用 Redis）
_rate_limit_store: Dict[str, List[float]] = {}


class AuthContext:
    """認證上下文"""
    
    def __init__(self):
        self.user: Optional[User] = None
        self.token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.is_authenticated: bool = False
        self.auth_method: str = 'none'  # token, api_key, none
    
    def has_permission(self, permission: str) -> bool:
        """檢查權限"""
        if not self.user:
            return False
        if self.user.role == UserRole.ADMIN:
            return True
        return permission in (self.user.permissions or [])
    
    def has_role(self, *roles: UserRole) -> bool:
        """檢查角色"""
        if not self.user:
            return False
        return self.user.role in roles
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user': self.user.to_dict() if self.user else None,
            'is_authenticated': self.is_authenticated,
            'auth_method': self.auth_method
        }


def extract_token(request) -> Optional[str]:
    """從請求中提取 Token"""
    # 從 Authorization header
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    
    # 從 query parameter
    if hasattr(request, 'query') and 'token' in request.query:
        return request.query['token']
    
    # 從 cookie
    cookies = request.cookies
    if 'access_token' in cookies:
        return cookies['access_token']
    
    return None


def extract_api_key(request) -> Optional[str]:
    """從請求中提取 API Key"""
    # 從 X-API-Key header
    api_key = request.headers.get('X-API-Key', '')
    if api_key:
        return api_key
    
    # 從 query parameter
    if hasattr(request, 'query') and 'api_key' in request.query:
        return request.query['api_key']
    
    return None


async def authenticate_request(request) -> AuthContext:
    """
    認證請求
    
    Returns:
        AuthContext 對象
    """
    ctx = AuthContext()
    
    # 1. 嘗試 Bearer Token 認證
    token = extract_token(request)
    if token:
        payload = verify_token(token)
        if payload:
            auth_service = get_auth_service()
            user = await auth_service.get_user(payload.get('sub'))
            if user and user.is_active:
                ctx.user = user
                ctx.token = token
                ctx.is_authenticated = True
                ctx.auth_method = 'token'
                return ctx
    
    # 2. 嘗試 API Key 認證
    api_key = extract_api_key(request)
    if api_key:
        # TODO: 驗證 API Key
        pass
    
    return ctx


def auth_middleware(app):
    """
    aiohttp 認證中間件
    
    Usage:
        app = web.Application(middlewares=[auth_middleware])
    """
    from aiohttp import web
    
    @web.middleware
    async def middleware(request, handler):
        # 檢查是否為公開路由
        path = request.path
        if any(path == route or path.startswith(route + '/') for route in PUBLIC_ROUTES):
            request['auth'] = AuthContext()
            return await handler(request)
        
        # 認證請求
        ctx = await authenticate_request(request)
        request['auth'] = ctx
        
        # 如果需要認證但未認證
        if not ctx.is_authenticated:
            # 允許某些路由在未認證時也能訪問（返回有限數據）
            if path.startswith('/api/v1/'):
                return web.json_response({
                    'success': False,
                    'error': '需要登入',
                    'code': 'UNAUTHORIZED'
                }, status=401)
        
        return await handler(request)
    
    return middleware


def require_auth(handler: Callable = None, *, 
                 roles: List[UserRole] = None,
                 permissions: List[str] = None):
    """
    裝飾器：要求認證
    
    Usage:
        @require_auth
        async def my_handler(request):
            user = request['auth'].user
            ...
        
        @require_auth(roles=[UserRole.PRO, UserRole.ADMIN])
        async def premium_handler(request):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            from aiohttp import web
            
            ctx: AuthContext = request.get('auth', AuthContext())
            
            # 檢查認證
            if not ctx.is_authenticated:
                return web.json_response({
                    'success': False,
                    'error': '需要登入',
                    'code': 'UNAUTHORIZED'
                }, status=401)
            
            # 檢查角色
            if roles and not ctx.has_role(*roles):
                return web.json_response({
                    'success': False,
                    'error': '權限不足',
                    'code': 'FORBIDDEN'
                }, status=403)
            
            # 檢查權限
            if permissions:
                for perm in permissions:
                    if not ctx.has_permission(perm):
                        return web.json_response({
                            'success': False,
                            'error': f'缺少權限: {perm}',
                            'code': 'FORBIDDEN'
                        }, status=403)
            
            return await fn(request, *args, **kwargs)
        
        return wrapper
    
    if handler is not None:
        return decorator(handler)
    return decorator


def rate_limit(limit_type: str = 'default'):
    """
    速率限制裝飾器
    
    Usage:
        @rate_limit('auth')
        async def login_handler(request):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            from aiohttp import web
            
            # 獲取限制配置
            max_requests, window = RATE_LIMITS.get(limit_type, RATE_LIMITS['default'])
            
            # 獲取客戶端標識
            client_ip = request.headers.get('X-Forwarded-For', 
                         request.headers.get('X-Real-IP', 
                         request.remote or 'unknown'))
            
            # 生成限制鍵
            key = f"{limit_type}:{client_ip}"
            
            # 檢查速率限制
            now = datetime.now().timestamp()
            window_start = now - window
            
            # 清理過期記錄
            if key in _rate_limit_store:
                _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > window_start]
            else:
                _rate_limit_store[key] = []
            
            # 檢查是否超過限制
            if len(_rate_limit_store[key]) >= max_requests:
                return web.json_response({
                    'success': False,
                    'error': '請求過於頻繁，請稍後再試',
                    'code': 'RATE_LIMITED',
                    'retry_after': int(window - (now - _rate_limit_store[key][0]))
                }, status=429)
            
            # 記錄請求
            _rate_limit_store[key].append(now)
            
            return await fn(request, *args, **kwargs)
        
        return wrapper
    
    return decorator


def require_subscription(tier: str = 'basic'):
    """
    訂閱級別檢查裝飾器
    
    Usage:
        @require_subscription('pro')
        async def pro_feature(request):
            ...
    """
    tier_levels = {'free': 0, 'basic': 1, 'pro': 2, 'enterprise': 3}
    required_level = tier_levels.get(tier, 0)
    
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            from aiohttp import web
            
            ctx: AuthContext = request.get('auth', AuthContext())
            
            if not ctx.is_authenticated:
                return web.json_response({
                    'success': False,
                    'error': '需要登入',
                    'code': 'UNAUTHORIZED'
                }, status=401)
            
            user_tier = ctx.user.subscription_tier if ctx.user else 'free'
            user_level = tier_levels.get(user_tier, 0)
            
            if user_level < required_level:
                return web.json_response({
                    'success': False,
                    'error': f'此功能需要 {tier} 或更高訂閱',
                    'code': 'SUBSCRIPTION_REQUIRED',
                    'required_tier': tier,
                    'current_tier': user_tier
                }, status=403)
            
            return await fn(request, *args, **kwargs)
        
        return wrapper
    
    return decorator

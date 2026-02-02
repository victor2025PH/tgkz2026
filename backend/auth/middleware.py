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
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/verify-email-code',
    '/api/v1/auth/reset-password-code',
    '/api/v1/auth/send-verification',
    # OAuth 路由
    '/api/oauth/telegram/authorize',
    '/api/v1/oauth/telegram',
    '/api/v1/oauth/telegram/authorize',
    '/api/v1/oauth/telegram/config',
    '/api/v1/oauth/google',
    '/api/v1/oauth/google/authorize',
    '/api/v1/oauth/providers',
    # 健康檢查
    '/api/v1/health',
    '/api/v1/health/liveness',
    '/api/v1/health/readiness',
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
    path = request.path
    
    # 🔍 調試日誌
    auth_header = request.headers.get('Authorization', '')
    logger.info(f"[AuthDebug] {path} - Auth header present: {bool(auth_header)}, value: {auth_header[:50] if auth_header else 'NONE'}...")
    
    # 1. 嘗試 Bearer Token 認證
    token = extract_token(request)
    logger.info(f"[AuthDebug] {path} - Token extracted: {bool(token)}")
    
    if token:
        payload = verify_token(token)
        logger.info(f"[AuthDebug] {path} - Token verified: {bool(payload)}, payload: {payload}")
        
        if payload:
            auth_service = get_auth_service()
            user = await auth_service.get_user(payload.get('sub'))
            logger.info(f"[AuthDebug] {path} - User found: {bool(user)}, active: {user.is_active if user else 'N/A'}")
            
            if user and user.is_active:
                ctx.user = user
                ctx.token = token
                ctx.is_authenticated = True
                ctx.auth_method = 'token'
                logger.info(f"[AuthDebug] {path} - ✅ Authentication successful for user: {user.id}")
                return ctx
            else:
                logger.warning(f"[AuthDebug] {path} - ❌ User not found or inactive")
        else:
            logger.warning(f"[AuthDebug] {path} - ❌ Token verification failed")
    else:
        logger.info(f"[AuthDebug] {path} - No token provided")
    
    # 2. 嘗試 API Key 認證
    api_key = extract_api_key(request)
    if api_key:
        # TODO: 驗證 API Key
        pass
    
    return ctx


def create_auth_middleware():
    """
    創建 aiohttp 認證中間件
    
    Usage:
        from auth.middleware import create_auth_middleware
        app.middlewares.append(create_auth_middleware())
    
    功能：
    1. 認證請求（Bearer Token / API Key）
    2. 注入認證上下文到請求
    3. 注入租戶上下文（用於數據隔離）
    4. 🆕 注入租戶數據庫連接（數據庫級隔離）
    """
    from aiohttp import web
    import os
    
    @web.middleware
    async def middleware(request, handler):
        # 導入租戶上下文模塊
        try:
            from core.tenant_context import TenantContext, set_current_tenant, clear_current_tenant
        except ImportError:
            # 如果無法導入，使用空操作
            TenantContext = None
            set_current_tenant = lambda x: None
            clear_current_tenant = lambda: None
        
        # 🆕 導入租戶數據庫管理器
        try:
            from core.tenant_database import get_tenant_db_manager, LOCAL_USER_ID
        except ImportError:
            get_tenant_db_manager = None
            LOCAL_USER_ID = 'local_user'
        
        tenant_token = None
        tenant_id = None
        
        try:
            # 檢查是否為公開路由
            path = request.path
            if any(path == route or path.startswith(route + '/') for route in PUBLIC_ROUTES):
                request['auth'] = AuthContext()
                return await handler(request)
            
            # 認證請求
            ctx = await authenticate_request(request)
            request['auth'] = ctx
            
            # 🆕 確定租戶 ID
            if ctx.is_authenticated and ctx.user:
                tenant_id = ctx.user.id
            elif os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                tenant_id = LOCAL_USER_ID
            
            # 🆕 注入租戶上下文
            if TenantContext:
                if ctx.is_authenticated and ctx.user:
                    # 已認證用戶：使用用戶 ID 進行租戶隔離
                    tenant = TenantContext(
                        user_id=ctx.user.id,
                        email=ctx.user.email or '',
                        role=ctx.user.role.value if hasattr(ctx.user.role, 'value') else str(ctx.user.role),
                        subscription_tier=ctx.user.subscription_tier or 'free',
                        max_accounts=ctx.user.max_accounts or 3,
                        max_api_calls=ctx.user.max_api_calls or 1000,
                        request_id=request.headers.get('X-Request-ID', ''),
                        ip_address=request.headers.get('X-Forwarded-For', 
                                   request.headers.get('X-Real-IP', 
                                   request.remote or ''))
                    )
                    tenant_token = set_current_tenant(tenant)
                elif os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                    # Electron 本地模式：使用本地用戶
                    tenant = TenantContext(
                        user_id='local_user',
                        role='admin',
                        subscription_tier='enterprise',
                        max_accounts=9999,
                        max_api_calls=-1
                    )
                    tenant_token = set_current_tenant(tenant)
            
            # 🆕 注入租戶數據庫連接
            if get_tenant_db_manager and tenant_id:
                db_manager = get_tenant_db_manager()
                request['tenant_db'] = db_manager.get_tenant_connection(tenant_id)
                request['system_db'] = db_manager.get_system_connection()
                request['tenant_id'] = tenant_id
            
            # 🆕 向後兼容：將 tenant 上下文也注入到 request['tenant']
            # 這樣現有使用 request.get('tenant') 的代碼仍然可以工作
            if TenantContext and tenant_token:
                from core.tenant_context import get_current_tenant
                request['tenant'] = get_current_tenant()
            
            # 如果需要認證但未認證
            if not ctx.is_authenticated:
                # Electron 模式允許無認證訪問
                if os.environ.get('ELECTRON_MODE', 'false').lower() != 'true':
                    # SaaS 模式：需要認證
                    if path.startswith('/api/v1/') and not path.startswith('/api/v1/auth/'):
                        return web.json_response({
                            'success': False,
                            'error': '需要登入',
                            'code': 'UNAUTHORIZED'
                        }, status=401)
            
            return await handler(request)
            
        finally:
            # 清理租戶上下文
            if tenant_token:
                clear_current_tenant(tenant_token)
    
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

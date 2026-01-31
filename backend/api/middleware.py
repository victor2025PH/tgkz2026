"""
API 中間件

優化設計：
1. 統一的請求處理流程
2. 租戶上下文自動注入
3. 使用量自動追蹤
4. 請求日誌和性能監控
5. 錯誤統一處理
"""

import time
import uuid
import asyncio
from typing import Optional, Callable, Dict, Any
from functools import wraps
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

# 嘗試導入 aiohttp
try:
    from aiohttp import web
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False


def create_middleware_stack():
    """
    創建中間件堆棧
    
    返回按順序執行的中間件列表
    """
    middlewares = []
    
    if HAS_AIOHTTP:
        middlewares.extend([
            request_id_middleware,
            logging_middleware,
            tenant_middleware,
            usage_tracking_middleware,
            quota_check_middleware,
            error_handling_middleware,
        ])
    
    return middlewares


# ==================== 請求 ID 中間件 ====================

@web.middleware
async def request_id_middleware(request, handler):
    """為每個請求生成唯一 ID"""
    request_id = request.headers.get('X-Request-ID', str(uuid.uuid4())[:8])
    request['request_id'] = request_id
    
    response = await handler(request)
    response.headers['X-Request-ID'] = request_id
    
    return response


# ==================== 日誌中間件 ====================

@web.middleware
async def logging_middleware(request, handler):
    """請求日誌和性能監控"""
    start_time = time.time()
    request_id = request.get('request_id', '-')
    
    # 請求日誌
    logger.info(f"[{request_id}] {request.method} {request.path}")
    
    try:
        response = await handler(request)
        
        # 響應日誌
        duration = (time.time() - start_time) * 1000
        logger.info(
            f"[{request_id}] {request.method} {request.path} "
            f"-> {response.status} ({duration:.2f}ms)"
        )
        
        # 添加性能頭
        response.headers['X-Response-Time'] = f"{duration:.2f}ms"
        
        return response
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(
            f"[{request_id}] {request.method} {request.path} "
            f"-> ERROR: {e} ({duration:.2f}ms)"
        )
        raise


# ==================== 租戶中間件 ====================

@web.middleware
async def tenant_middleware(request, handler):
    """注入租戶上下文"""
    from core.tenant_context import TenantContext, set_current_tenant, clear_current_tenant
    from auth.utils import verify_token
    
    tenant = TenantContext()
    tenant.request_id = request.get('request_id', '')
    tenant.ip_address = request.headers.get(
        'X-Forwarded-For',
        request.headers.get('X-Real-IP', request.remote or '')
    )
    
    # 從 Authorization header 獲取用戶信息
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        payload = verify_token(token)
        
        if payload:
            tenant.user_id = payload.get('sub', '')
            tenant.email = payload.get('email', '')
            tenant.role = payload.get('role', 'free')
            
            # 獲取用戶訂閱信息
            await _load_user_subscription(tenant)
    
    # Electron 模式
    if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
        tenant.user_id = 'local_user'
        tenant.role = 'admin'
        tenant.subscription_tier = 'enterprise'
        tenant.max_accounts = 9999
        tenant.max_api_calls = -1
    
    # 設置上下文
    token = set_current_tenant(tenant)
    request['tenant'] = tenant
    
    try:
        return await handler(request)
    finally:
        clear_current_tenant(token)


async def _load_user_subscription(tenant):
    """加載用戶訂閱信息"""
    try:
        from auth.service import get_auth_service
        auth_service = get_auth_service()
        user = await auth_service.get_user(tenant.user_id)
        
        if user:
            tenant.subscription_tier = user.subscription_tier
            tenant.max_accounts = user.max_accounts
            tenant.max_api_calls = user.max_api_calls
    except Exception as e:
        logger.warning(f"Failed to load user subscription: {e}")


# ==================== 使用量追蹤中間件 ====================

# 不追蹤的路徑
SKIP_TRACKING_PATHS = [
    '/health',
    '/api/health',
    '/favicon.ico',
    '/static/',
]

@web.middleware
async def usage_tracking_middleware(request, handler):
    """自動追蹤 API 使用量"""
    path = request.path
    
    # 跳過某些路徑
    if any(path.startswith(skip) for skip in SKIP_TRACKING_PATHS):
        return await handler(request)
    
    # 執行請求
    response = await handler(request)
    
    # 只追蹤成功的請求
    if response.status < 400:
        tenant = request.get('tenant')
        if tenant and tenant.user_id:
            try:
                from core.usage_tracker import get_usage_tracker
                tracker = get_usage_tracker()
                # 異步追蹤，不阻塞響應
                asyncio.create_task(
                    tracker.track_api_call(tenant.user_id, path)
                )
            except Exception as e:
                logger.warning(f"Usage tracking error: {e}")
    
    return response


# ==================== 配額檢查中間件 ====================

# 需要配額檢查的路徑
QUOTA_CHECK_PATHS = {
    '/api/v1/accounts': 'accounts',
    '/api/v1/ai/': 'api_calls',
    '/api/v1/messages/send': 'api_calls',
}

@web.middleware
async def quota_check_middleware(request, handler):
    """配額檢查"""
    path = request.path
    method = request.method
    
    # 只檢查 POST/PUT 請求
    if method not in ('POST', 'PUT'):
        return await handler(request)
    
    tenant = request.get('tenant')
    if not tenant or not tenant.user_id:
        return await handler(request)
    
    # Electron 模式跳過
    if tenant.is_electron_mode:
        return await handler(request)
    
    # 檢查是否需要配額檢查
    quota_type = None
    for check_path, q_type in QUOTA_CHECK_PATHS.items():
        if path.startswith(check_path):
            quota_type = q_type
            break
    
    if not quota_type:
        return await handler(request)
    
    # 執行配額檢查
    try:
        from core.usage_tracker import get_usage_tracker
        tracker = get_usage_tracker()
        result = await tracker.check_quota(quota_type, tenant.user_id)
        
        if not result['allowed']:
            return web.json_response({
                'success': False,
                'error': f'{quota_type} 配額已用盡',
                'code': 'QUOTA_EXCEEDED',
                'quota': result
            }, status=429)
    except Exception as e:
        logger.warning(f"Quota check error: {e}")
    
    return await handler(request)


# ==================== 錯誤處理中間件 ====================

@web.middleware
async def error_handling_middleware(request, handler):
    """統一錯誤處理"""
    try:
        return await handler(request)
    
    except web.HTTPException:
        raise
    
    except PermissionError as e:
        return web.json_response({
            'success': False,
            'error': str(e) or '權限不足',
            'code': 'FORBIDDEN'
        }, status=403)
    
    except ValueError as e:
        return web.json_response({
            'success': False,
            'error': str(e) or '參數錯誤',
            'code': 'BAD_REQUEST'
        }, status=400)
    
    except Exception as e:
        request_id = request.get('request_id', '-')
        logger.exception(f"[{request_id}] Unhandled error: {e}")
        
        return web.json_response({
            'success': False,
            'error': '服務器內部錯誤',
            'code': 'INTERNAL_ERROR',
            'request_id': request_id
        }, status=500)


# ==================== 輔助函數 ====================

def require_auth(handler: Callable = None):
    """
    裝飾器：要求認證
    
    Usage:
        @require_auth
        async def my_handler(request):
            tenant = request['tenant']
            ...
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            tenant = request.get('tenant')
            
            if not tenant or not tenant.is_authenticated:
                # Electron 模式允許
                if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                    pass
                else:
                    return web.json_response({
                        'success': False,
                        'error': '需要登入',
                        'code': 'UNAUTHORIZED'
                    }, status=401)
            
            return await fn(request, *args, **kwargs)
        
        return wrapper
    
    if handler is not None:
        return decorator(handler)
    return decorator


def require_subscription(tier: str):
    """
    裝飾器：要求訂閱級別
    
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
            tenant = request.get('tenant')
            
            # Electron 模式跳過
            if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                return await fn(request, *args, **kwargs)
            
            if not tenant or not tenant.is_authenticated:
                return web.json_response({
                    'success': False,
                    'error': '需要登入',
                    'code': 'UNAUTHORIZED'
                }, status=401)
            
            user_level = tier_levels.get(tenant.subscription_tier, 0)
            
            if user_level < required_level:
                return web.json_response({
                    'success': False,
                    'error': f'此功能需要 {tier} 或更高訂閱',
                    'code': 'SUBSCRIPTION_REQUIRED',
                    'required_tier': tier,
                    'current_tier': tenant.subscription_tier
                }, status=403)
            
            return await fn(request, *args, **kwargs)
        
        return wrapper
    
    return decorator


def require_feature(feature: str):
    """
    裝飾器：要求特定功能
    
    Usage:
        @require_feature('advanced_ai')
        async def ai_handler(request):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            tenant = request.get('tenant')
            
            # Electron 模式跳過
            if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                return await fn(request, *args, **kwargs)
            
            if tenant and tenant.check_feature(feature):
                return await fn(request, *args, **kwargs)
            
            return web.json_response({
                'success': False,
                'error': f'此功能需要升級方案',
                'code': 'FEATURE_REQUIRED',
                'required_feature': feature
            }, status=403)
        
        return wrapper
    
    return decorator

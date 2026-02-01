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
        # 嘗試導入認證中間件
        try:
            from auth.middleware import create_auth_middleware
            has_auth_middleware = True
        except ImportError:
            has_auth_middleware = False
            logger.warning("Auth middleware not found, authentication disabled")
        
        middlewares.extend([
            request_id_middleware,
            logging_middleware,
        ])
        
        # 認證中間件（必須在 tenant 之前）
        if has_auth_middleware:
            middlewares.append(create_auth_middleware())
        
        middlewares.extend([
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

# 需要配額檢查的路徑配置
# 格式: {路徑前綴: (配額類型, 消耗數量, 是否自動消耗)}
QUOTA_CHECK_PATHS = {
    # 帳號管理
    '/api/v1/accounts': ('tg_accounts', 1, False),  # 添加帳號
    
    # 消息發送
    '/api/v1/messages/send': ('daily_messages', 1, True),
    '/api/v1/messages/batch': ('daily_messages', 10, True),  # 批量消息
    '/api/v1/command': ('daily_messages', 1, False),  # 命令端點（部分命令需要）
    
    # AI 調用
    '/api/v1/ai/': ('ai_calls', 1, True),
    '/api/v1/ai/chat': ('ai_calls', 1, True),
    '/api/v1/ai/analyze': ('ai_calls', 2, True),  # 分析消耗更多
    '/api/v1/ai/generate': ('ai_calls', 3, True),  # 生成消耗更多
    
    # 群組管理
    '/api/v1/groups': ('groups', 1, False),
    
    # 關鍵詞
    '/api/v1/keywords': ('keyword_sets', 1, False),
    
    # 自動回覆
    '/api/v1/automation/rules': ('auto_reply_rules', 1, False),
    
    # 定時任務
    '/api/v1/scheduled': ('scheduled_tasks', 1, False),
}

# 需要消息配額檢查的命令
MESSAGE_QUOTA_COMMANDS = {
    'send-private-message', 'send-group-message', 'send-batch-messages',
    'reply-message', 'forward-message', 'broadcast-message'
}

# 需要 AI 配額檢查的命令
AI_QUOTA_COMMANDS = {
    'ai-analyze', 'ai-generate', 'ai-chat', 'smart-reply',
    'generate-marketing-content', 'analyze-leads'
}

@web.middleware
async def quota_check_middleware(request, handler):
    """
    配額檢查中間件（增強版）
    
    功能：
    1. 路徑級配額檢查
    2. 命令級配額檢查
    3. 自動配額消耗
    4. 詳細錯誤響應（含升級建議）
    """
    path = request.path
    method = request.method
    
    # 只檢查 POST/PUT 請求
    if method not in ('POST', 'PUT'):
        return await handler(request)
    
    tenant = request.get('tenant')
    if not tenant or not tenant.user_id:
        return await handler(request)
    
    # Electron 模式跳過配額檢查
    if getattr(tenant, 'is_electron_mode', False) or \
       os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
        return await handler(request)
    
    # 確定配額類型和數量
    quota_type = None
    quota_amount = 1
    auto_consume = False
    
    # 1. 路徑匹配
    for check_path, config in QUOTA_CHECK_PATHS.items():
        if path.startswith(check_path):
            quota_type, quota_amount, auto_consume = config
            break
    
    # 2. 命令端點特殊處理
    if path.endswith('/command') and not quota_type:
        try:
            # 嘗試讀取請求體獲取命令名
            body = await request.json()
            command = body.get('command', '')
            
            if command in MESSAGE_QUOTA_COMMANDS:
                quota_type = 'daily_messages'
                auto_consume = True
            elif command in AI_QUOTA_COMMANDS:
                quota_type = 'ai_calls'
                auto_consume = True
            
            # 恢復請求體供後續處理
            request['_body_cache'] = body
        except:
            pass
    
    if not quota_type:
        return await handler(request)
    
    # 執行配額檢查
    try:
        from core.quota_service import get_quota_service, QuotaExceededException
        service = get_quota_service()
        result = service.check_quota(tenant.user_id, quota_type, quota_amount)
        
        # 將檢查結果附加到請求
        request['quota_check'] = result
        
        if not result.allowed:
            # 配額不足，返回詳細錯誤
            return web.json_response({
                'success': False,
                'error': result.message or f'{quota_type} 配額已用盡',
                'code': 'QUOTA_EXCEEDED',
                'quota_type': quota_type,
                'quota': {
                    'limit': result.limit,
                    'used': result.used,
                    'remaining': result.remaining,
                    'percentage': result.percentage,
                    'reset_at': result.reset_at.isoformat() if result.reset_at else None
                },
                'upgrade_suggestion': result.upgrade_suggestion,
                'tier': tenant.subscription_tier
            }, status=429)
        
        # 執行請求
        response = await handler(request)
        
        # 如果請求成功且需要自動消耗配額
        if response.status < 400 and auto_consume:
            try:
                service.consume_quota(
                    tenant.user_id, 
                    quota_type, 
                    quota_amount,
                    context=f"path:{path}"
                )
            except Exception as e:
                logger.warning(f"Failed to consume quota: {e}")
        
        return response
        
    except Exception as e:
        logger.warning(f"Quota check error: {e}")
        # 配額檢查失敗不應阻止請求，降級處理
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


def require_quota(quota_type: str, amount: int = 1, auto_consume: bool = True):
    """
    裝飾器：要求配額
    
    Usage:
        @require_quota('daily_messages', 1)
        async def send_message(request):
            ...
        
        @require_quota('ai_calls', 2, auto_consume=False)
        async def ai_analyze(request):
            # 手動控制消耗
            ...
    
    Args:
        quota_type: 配額類型
        amount: 消耗數量
        auto_consume: 是否在成功後自動消耗配額
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request, *args, **kwargs):
            tenant = request.get('tenant')
            
            # Electron 模式跳過
            if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                return await fn(request, *args, **kwargs)
            
            if not tenant or not tenant.user_id:
                return web.json_response({
                    'success': False,
                    'error': '需要登入',
                    'code': 'UNAUTHORIZED'
                }, status=401)
            
            # 檢查配額
            try:
                from core.quota_service import get_quota_service
                service = get_quota_service()
                result = service.check_quota(tenant.user_id, quota_type, amount)
                
                if not result.allowed:
                    return web.json_response({
                        'success': False,
                        'error': result.message or f'{quota_type} 配額不足',
                        'code': 'QUOTA_EXCEEDED',
                        'quota_type': quota_type,
                        'quota': result.to_dict(),
                        'upgrade_suggestion': result.upgrade_suggestion
                    }, status=429)
                
                # 執行函數
                response = await fn(request, *args, **kwargs)
                
                # 自動消耗配額
                if auto_consume and getattr(response, 'status', 200) < 400:
                    service.consume_quota(
                        tenant.user_id, 
                        quota_type, 
                        amount,
                        context=f"handler:{fn.__name__}"
                    )
                
                return response
                
            except Exception as e:
                logger.warning(f"Quota check failed: {e}")
                # 配額檢查失敗不阻止請求
                return await fn(request, *args, **kwargs)
        
        return wrapper
    
    return decorator


# ==================== 配額消耗輔助函數 ====================

async def consume_quota_for_user(
    user_id: str, 
    quota_type: str, 
    amount: int = 1,
    context: str = None
) -> bool:
    """
    為用戶消耗配額
    
    用於在業務邏輯中手動消耗配額
    
    Returns:
        是否成功消耗
    """
    try:
        from core.quota_service import get_quota_service
        service = get_quota_service()
        success, result = service.consume_quota(user_id, quota_type, amount, context)
        return success
    except Exception as e:
        logger.warning(f"Failed to consume quota: {e}")
        return True  # 失敗時不阻止業務


async def check_quota_for_user(
    user_id: str, 
    quota_type: str, 
    amount: int = 1
) -> Dict[str, Any]:
    """
    檢查用戶配額
    
    Returns:
        配額檢查結果
    """
    try:
        from core.quota_service import get_quota_service
        service = get_quota_service()
        result = service.check_quota(user_id, quota_type, amount)
        return result.to_dict()
    except Exception as e:
        logger.warning(f"Failed to check quota: {e}")
        return {'allowed': True, 'unlimited': True}

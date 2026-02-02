"""
租戶請求輔助模組

🆕 優化設計：
1. 統一的請求上下文訪問
2. 類型安全的數據庫連接獲取
3. 請求追蹤和性能監控
4. 簡化 API 處理器代碼

使用方式：
    from api.tenant_request import TenantRequest, require_tenant
    
    @require_tenant
    async def my_handler(request):
        ctx = TenantRequest(request)
        
        # 獲取租戶數據庫連接
        conn = ctx.tenant_db
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts")
        
        # 獲取用戶信息
        user_id = ctx.user_id
        email = ctx.email
"""

import os
import time
import uuid
import logging
import sqlite3
from typing import Optional, Dict, Any, Callable
from functools import wraps
from datetime import datetime
from dataclasses import dataclass, field

from aiohttp import web

logger = logging.getLogger(__name__)


@dataclass
class RequestMetrics:
    """請求性能指標"""
    request_id: str
    start_time: float
    path: str
    method: str
    tenant_id: Optional[str] = None
    db_queries: int = 0
    db_time_ms: float = 0.0
    end_time: Optional[float] = None
    
    @property
    def duration_ms(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time) * 1000
        return (time.time() - self.start_time) * 1000
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'request_id': self.request_id,
            'path': self.path,
            'method': self.method,
            'tenant_id': self.tenant_id,
            'duration_ms': round(self.duration_ms, 2),
            'db_queries': self.db_queries,
            'db_time_ms': round(self.db_time_ms, 2),
        }


class TenantRequest:
    """
    租戶請求上下文包裝器
    
    提供統一的方式訪問：
    - 租戶信息（user_id, email, role 等）
    - 數據庫連接（tenant_db, system_db）
    - 請求追蹤信息
    """
    
    def __init__(self, request):
        self._request = request
        self._metrics: Optional[RequestMetrics] = None
        self._init_metrics()
    
    def _init_metrics(self):
        """初始化請求指標"""
        request_id = (
            self._request.headers.get('X-Request-ID') or 
            str(uuid.uuid4())[:8]
        )
        self._metrics = RequestMetrics(
            request_id=request_id,
            start_time=time.time(),
            path=self._request.path,
            method=self._request.method,
            tenant_id=self.user_id
        )
    
    # ============ 租戶信息 ============
    
    @property
    def tenant_context(self):
        """獲取租戶上下文對象"""
        return self._request.get('tenant')
    
    @property
    def auth_context(self):
        """獲取認證上下文對象"""
        return self._request.get('auth')
    
    @property
    def user_id(self) -> Optional[str]:
        """獲取用戶 ID"""
        # 優先從 tenant_id 獲取（新方式）
        tenant_id = self._request.get('tenant_id')
        if tenant_id:
            return tenant_id
        
        # 回退到 tenant 上下文（舊方式）
        tenant = self.tenant_context
        if tenant:
            return tenant.user_id
        
        # 回退到 auth 上下文
        auth = self.auth_context
        if auth and auth.user:
            return auth.user.id
        
        # Electron 模式
        if self.is_electron_mode:
            return 'local_user'
        
        return None
    
    @property
    def email(self) -> Optional[str]:
        """獲取用戶郵箱"""
        tenant = self.tenant_context
        if tenant:
            return tenant.email
        auth = self.auth_context
        if auth and auth.user:
            return auth.user.email
        return None
    
    @property
    def role(self) -> str:
        """獲取用戶角色"""
        tenant = self.tenant_context
        if tenant:
            return tenant.role
        auth = self.auth_context
        if auth and auth.user:
            return str(auth.user.role.value) if hasattr(auth.user.role, 'value') else str(auth.user.role)
        return 'free'
    
    @property
    def subscription_tier(self) -> str:
        """獲取訂閱等級"""
        tenant = self.tenant_context
        if tenant:
            return tenant.subscription_tier
        auth = self.auth_context
        if auth and auth.user:
            return auth.user.subscription_tier or 'free'
        return 'free'
    
    @property
    def is_authenticated(self) -> bool:
        """是否已認證"""
        if self.is_electron_mode:
            return True
        auth = self.auth_context
        return auth and auth.is_authenticated
    
    @property
    def is_admin(self) -> bool:
        """是否為管理員"""
        return self.role == 'admin'
    
    @property
    def is_electron_mode(self) -> bool:
        """是否為 Electron 本地模式"""
        return os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
    
    # ============ 數據庫連接 ============
    
    @property
    def tenant_db(self) -> sqlite3.Connection:
        """
        獲取租戶數據庫連接
        
        用於訪問租戶隔離的業務數據（accounts, leads 等）
        
        Raises:
            ValueError: 未認證或連接不可用
        """
        conn = self._request.get('tenant_db')
        if conn:
            return conn
        
        # 嘗試從數據庫管理器獲取
        try:
            from core.tenant_database import get_tenant_db_manager
            manager = get_tenant_db_manager()
            user_id = self.user_id
            if user_id:
                return manager.get_tenant_connection(user_id)
        except Exception as e:
            logger.error(f"Failed to get tenant connection: {e}")
        
        raise ValueError("租戶數據庫連接不可用，請確保已認證")
    
    @property
    def system_db(self) -> sqlite3.Connection:
        """
        獲取系統數據庫連接
        
        用於訪問全局數據（users, orders 等）
        
        Raises:
            ValueError: 連接不可用
        """
        conn = self._request.get('system_db')
        if conn:
            return conn
        
        # 嘗試從數據庫管理器獲取
        try:
            from core.tenant_database import get_tenant_db_manager
            manager = get_tenant_db_manager()
            return manager.get_system_connection()
        except Exception as e:
            logger.error(f"Failed to get system connection: {e}")
        
        raise ValueError("系統數據庫連接不可用")
    
    def get_db_for_table(self, table_name: str) -> sqlite3.Connection:
        """
        根據表名自動選擇正確的數據庫連接
        
        Args:
            table_name: 表名
        
        Returns:
            對應的數據庫連接
        """
        from core.tenant_schema import is_system_table
        
        if is_system_table(table_name):
            return self.system_db
        else:
            return self.tenant_db
    
    # ============ 查詢輔助 ============
    
    def execute(self, table: str, sql: str, params: tuple = None) -> sqlite3.Cursor:
        """
        執行查詢，自動選擇正確的數據庫
        
        Args:
            table: 表名（用於選擇數據庫）
            sql: SQL 語句
            params: 參數
        
        Returns:
            游標對象
        """
        start = time.time()
        try:
            conn = self.get_db_for_table(table)
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            return cursor
        finally:
            if self._metrics:
                self._metrics.db_queries += 1
                self._metrics.db_time_ms += (time.time() - start) * 1000
    
    def fetchall(self, table: str, sql: str, params: tuple = None) -> list:
        """執行查詢並返回所有結果"""
        cursor = self.execute(table, sql, params)
        return [dict(row) for row in cursor.fetchall()]
    
    def fetchone(self, table: str, sql: str, params: tuple = None) -> Optional[dict]:
        """執行查詢並返回單個結果"""
        cursor = self.execute(table, sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def commit(self, table: str):
        """提交事務"""
        conn = self.get_db_for_table(table)
        conn.commit()
    
    # ============ 請求追蹤 ============
    
    @property
    def request_id(self) -> str:
        """請求 ID"""
        return self._metrics.request_id if self._metrics else ''
    
    @property
    def metrics(self) -> Optional[RequestMetrics]:
        """請求指標"""
        return self._metrics
    
    def finish(self):
        """標記請求完成"""
        if self._metrics:
            self._metrics.end_time = time.time()
    
    def log_metrics(self):
        """記錄請求指標"""
        if self._metrics:
            self.finish()
            logger.info(
                f"[Request] {self._metrics.method} {self._metrics.path} "
                f"- {self._metrics.duration_ms:.1f}ms "
                f"(DB: {self._metrics.db_queries} queries, {self._metrics.db_time_ms:.1f}ms)"
            )
    
    # ============ 響應輔助 ============
    
    def success(self, data: Any = None, **kwargs) -> Dict[str, Any]:
        """構建成功響應"""
        response = {'success': True}
        if data is not None:
            response['data'] = data
        response.update(kwargs)
        response['_request_id'] = self.request_id
        return response
    
    def error(self, message: str, code: str = 'ERROR', status: int = 400) -> Dict[str, Any]:
        """構建錯誤響應"""
        return {
            'success': False,
            'error': message,
            'code': code,
            '_request_id': self.request_id,
            '_status': status
        }


# ============ 裝飾器 ============

def require_tenant(handler: Callable = None, *, 
                   require_auth: bool = True,
                   require_admin: bool = False,
                   log_metrics: bool = True):
    """
    裝飾器：要求租戶上下文
    
    自動處理：
    1. 認證檢查
    2. 權限檢查
    3. 請求追蹤
    4. 錯誤處理
    
    Usage:
        @require_tenant
        async def my_handler(request):
            ctx = TenantRequest(request)
            accounts = ctx.fetchall('accounts', "SELECT * FROM accounts")
            return web.json_response(ctx.success(accounts))
        
        @require_tenant(require_admin=True)
        async def admin_handler(request):
            ...
    """
    def decorator(fn):
        @wraps(fn)
        async def wrapper(request_or_self, request=None, *args, **kwargs):
            # 處理 self 參數（類方法）
            if request is None:
                request = request_or_self
                self = None
            else:
                self = request_or_self
            
            ctx = TenantRequest(request)
            
            try:
                # 認證檢查
                if require_auth and not ctx.is_authenticated:
                    return web.json_response({
                        'success': False,
                        'error': '需要登入',
                        'code': 'UNAUTHORIZED'
                    }, status=401)
                
                # 管理員檢查
                if require_admin and not ctx.is_admin:
                    return web.json_response({
                        'success': False,
                        'error': '需要管理員權限',
                        'code': 'FORBIDDEN'
                    }, status=403)
                
                # 執行處理器
                if self:
                    result = await fn(self, request, *args, **kwargs)
                else:
                    result = await fn(request, *args, **kwargs)
                
                return result
                
            except ValueError as e:
                logger.warning(f"Request validation error: {e}")
                return web.json_response({
                    'success': False,
                    'error': str(e),
                    'code': 'VALIDATION_ERROR'
                }, status=400)
                
            except Exception as e:
                logger.exception(f"Request handler error: {e}")
                return web.json_response({
                    'success': False,
                    'error': str(e),
                    'code': 'INTERNAL_ERROR',
                    '_request_id': ctx.request_id
                }, status=500)
                
            finally:
                if log_metrics:
                    ctx.log_metrics()
        
        return wrapper
    
    if handler is not None:
        return decorator(handler)
    return decorator


def with_tenant_db(handler: Callable):
    """
    簡化裝飾器：自動注入 TenantRequest
    
    Usage:
        @with_tenant_db
        async def my_handler(request, ctx: TenantRequest):
            accounts = ctx.fetchall('accounts', "SELECT * FROM accounts")
            return web.json_response(ctx.success(accounts))
    """
    @wraps(handler)
    async def wrapper(request_or_self, request=None, *args, **kwargs):
        if request is None:
            request = request_or_self
            self = None
        else:
            self = request_or_self
        
        ctx = TenantRequest(request)
        
        try:
            if self:
                result = await handler(self, request, ctx, *args, **kwargs)
            else:
                result = await handler(request, ctx, *args, **kwargs)
            return result
        finally:
            ctx.log_metrics()
    
    return wrapper

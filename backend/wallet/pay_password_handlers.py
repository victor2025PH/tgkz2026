"""
支付密碼 API 處理器
Payment Password API Handlers
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .payment_password_service import get_pay_password_service

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class PayPasswordHandlers:
    """支付密碼 API 處理器"""
    
    def __init__(self):
        self.pay_password_service = get_pay_password_service()
    
    def _get_client_ip(self, request: web.Request) -> str:
        xff = request.headers.get('X-Forwarded-For', '')
        if xff:
            return xff.split(',')[0].strip()
        return request.remote or ''
    
    def _verify_token(self, request: web.Request) -> Optional[Dict]:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except:
            return None
    
    def _verify_admin(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員身份（兼容主 Admin 系統）"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            is_admin = (
                payload.get('is_admin', False) or 
                payload.get('type') == 'admin' or
                payload.get('admin_id') is not None
            )
            if not is_admin:
                return None
            return payload
        except:
            return None
    
    def _require_auth(self, request: web.Request) -> Dict:
        user = self._verify_token(request)
        if not user:
            raise web.HTTPUnauthorized(
                text='{"success": false, "error": "未授權"}',
                content_type='application/json'
            )
        return user
    
    def _require_admin(self, request: web.Request) -> Dict:
        admin = self._verify_admin(request)
        if not admin:
            raise web.HTTPUnauthorized(
                text='{"success": false, "error": "需要管理員權限"}',
                content_type='application/json'
            )
        return admin
    
    def _success_response(self, data: Any = None, message: str = "success") -> web.Response:
        return web.json_response({
            "success": True,
            "message": message,
            "data": data
        })
    
    def _error_response(self, message: str, code: str = "ERROR", status: int = 400) -> web.Response:
        return web.json_response({
            "success": False,
            "error": message,
            "code": code
        }, status=status)
    
    # ==================== 用戶接口 ====================
    
    async def get_status(self, request: web.Request) -> web.Response:
        """獲取支付密碼狀態"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            status = self.pay_password_service.get_status(user_id)
            return self._success_response(status)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get pay password status error: {e}")
            return self._error_response(str(e), "STATUS_ERROR", 500)
    
    async def set_password(self, request: web.Request) -> web.Response:
        """
        設置支付密碼
        
        POST /api/wallet/pay-password/set
        {
            "password": "123456"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            password = data.get('password', '')
            
            if not password:
                return self._error_response("密碼不能為空", "MISSING_PASSWORD")
            
            success, message = self.pay_password_service.set_password(
                user_id=user_id,
                password=password,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "SET_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Set pay password error: {e}")
            return self._error_response(str(e), "SET_ERROR", 500)
    
    async def verify_password(self, request: web.Request) -> web.Response:
        """
        驗證支付密碼
        
        POST /api/wallet/pay-password/verify
        {
            "password": "123456"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            password = data.get('password', '')
            
            if not password:
                return self._error_response("密碼不能為空", "MISSING_PASSWORD")
            
            success, message = self.pay_password_service.verify_password(
                user_id=user_id,
                password=password,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response({"verified": True}, message)
            else:
                return self._error_response(message, "VERIFY_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Verify pay password error: {e}")
            return self._error_response(str(e), "VERIFY_ERROR", 500)
    
    async def change_password(self, request: web.Request) -> web.Response:
        """
        修改支付密碼
        
        POST /api/wallet/pay-password/change
        {
            "old_password": "123456",
            "new_password": "654321"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            old_password = data.get('old_password', '')
            new_password = data.get('new_password', '')
            
            if not old_password or not new_password:
                return self._error_response("密碼不能為空", "MISSING_PASSWORD")
            
            success, message = self.pay_password_service.change_password(
                user_id=user_id,
                old_password=old_password,
                new_password=new_password,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "CHANGE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Change pay password error: {e}")
            return self._error_response(str(e), "CHANGE_ERROR", 500)
    
    async def remove_password(self, request: web.Request) -> web.Response:
        """
        移除支付密碼
        
        POST /api/wallet/pay-password/remove
        {
            "password": "123456"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            password = data.get('password', '')
            
            if not password:
                return self._error_response("密碼不能為空", "MISSING_PASSWORD")
            
            success, message = self.pay_password_service.remove_password(
                user_id=user_id,
                password=password,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "REMOVE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Remove pay password error: {e}")
            return self._error_response(str(e), "REMOVE_ERROR", 500)
    
    # ==================== 管理員接口 ====================
    
    async def admin_reset_password(self, request: web.Request) -> web.Response:
        """管理員重置用戶支付密碼"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            user_id = request.match_info.get('user_id')
            if not user_id:
                return self._error_response("缺少 user_id", "MISSING_USER_ID")
            
            data = await request.json()
            new_password = data.get('new_password', '')
            
            if not new_password:
                return self._error_response("新密碼不能為空", "MISSING_PASSWORD")
            
            success, message = self.pay_password_service.reset_password(
                user_id=user_id,
                new_password=new_password,
                admin_id=admin_id,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "RESET_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin reset pay password error: {e}")
            return self._error_response(str(e), "RESET_ERROR", 500)


# ==================== 路由設置 ====================

def setup_pay_password_routes(app: web.Application):
    """設置支付密碼路由"""
    handlers = PayPasswordHandlers()
    
    # 用戶接口
    app.router.add_get('/api/wallet/pay-password/status', handlers.get_status)
    app.router.add_post('/api/wallet/pay-password/set', handlers.set_password)
    app.router.add_post('/api/wallet/pay-password/verify', handlers.verify_password)
    app.router.add_post('/api/wallet/pay-password/change', handlers.change_password)
    app.router.add_post('/api/wallet/pay-password/remove', handlers.remove_password)
    
    # 管理員接口
    app.router.add_post('/api/admin/users/{user_id}/pay-password/reset', handlers.admin_reset_password)
    
    logger.info("✅ Payment password API routes registered")


pay_password_handlers = PayPasswordHandlers()

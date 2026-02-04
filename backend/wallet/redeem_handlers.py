"""
兌換碼 API 處理器
Redeem Code API Handlers

用戶兌換和管理員管理接口
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .redeem_service import get_redeem_service

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class RedeemHandlers:
    """兌換碼 API 處理器"""
    
    def __init__(self):
        self.redeem_service = get_redeem_service()
    
    def _get_client_ip(self, request: web.Request) -> str:
        xff = request.headers.get('X-Forwarded-For', '')
        if xff:
            return xff.split(',')[0].strip()
        return request.remote or ''
    
    def _verify_token(self, request: web.Request) -> Optional[Dict]:
        """驗證 JWT Token - 使用與 auth 模塊相同的驗證邏輯"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        
        # 優先使用 auth 模塊的驗證函數（確保格式兼容）
        try:
            from auth.utils import verify_token as auth_verify_token
            return auth_verify_token(token)
        except ImportError:
            pass
        
        # 備用：使用 PyJWT
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
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
    
    async def redeem_code(self, request: web.Request) -> web.Response:
        """
        使用兌換碼
        
        POST /api/wallet/redeem
        {
            "code": "XXXX-XXXXXXXXXXXX"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            code = data.get('code', '').strip()
            
            if not code:
                return self._error_response("兌換碼不能為空", "MISSING_CODE")
            
            success, message, result = self.redeem_service.redeem(
                code=code,
                user_id=user_id,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response(result, message)
            else:
                return self._error_response(message, "REDEEM_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Redeem code error: {e}")
            return self._error_response(str(e), "REDEEM_ERROR", 500)
    
    async def get_redeem_records(self, request: web.Request) -> web.Response:
        """獲取用戶兌換記錄"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 50)
            
            records, total = self.redeem_service.get_user_records(
                user_id=user_id,
                page=page,
                page_size=page_size
            )
            
            return self._success_response({
                "records": [r.to_dict() for r in records],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total
                }
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get redeem records error: {e}")
            return self._error_response(str(e), "GET_RECORDS_ERROR", 500)
    
    # ==================== 管理員接口 ====================
    
    async def admin_create_code(self, request: web.Request) -> web.Response:
        """
        創建兌換碼
        
        POST /api/admin/redeem/create
        {
            "amount": 1000,
            "code_type": "balance",
            "bonus_amount": 100,
            "description": "新用戶禮包",
            "max_uses": 1,
            "expires_days": 30,
            "prefix": "NEW"
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            data = await request.json()
            
            amount = data.get('amount')
            code_type = data.get('code_type', 'balance')
            bonus_amount = data.get('bonus_amount', 0)
            description = data.get('description', '')
            max_uses = data.get('max_uses', 1)
            expires_days = data.get('expires_days', 30)
            prefix = data.get('prefix', '')
            
            if not amount or amount <= 0:
                return self._error_response("金額必須大於0", "INVALID_AMOUNT")
            
            success, message, code = self.redeem_service.create_code(
                amount=amount,
                code_type=code_type,
                bonus_amount=bonus_amount,
                description=description,
                max_uses=max_uses,
                expires_days=expires_days,
                created_by=admin_id,
                prefix=prefix
            )
            
            if success and code:
                return self._success_response({
                    "code": code.to_dict()
                }, message)
            else:
                return self._error_response(message, "CREATE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin create code error: {e}")
            return self._error_response(str(e), "CREATE_ERROR", 500)
    
    async def admin_batch_create(self, request: web.Request) -> web.Response:
        """
        批量創建兌換碼
        
        POST /api/admin/redeem/batch
        {
            "count": 100,
            "amount": 1000,
            ...
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            data = await request.json()
            
            count = data.get('count', 1)
            amount = data.get('amount')
            code_type = data.get('code_type', 'balance')
            bonus_amount = data.get('bonus_amount', 0)
            description = data.get('description', '')
            max_uses = data.get('max_uses', 1)
            expires_days = data.get('expires_days', 30)
            prefix = data.get('prefix', '')
            
            if not amount or amount <= 0:
                return self._error_response("金額必須大於0", "INVALID_AMOUNT")
            
            if count <= 0 or count > 1000:
                return self._error_response("數量必須在 1-1000 之間", "INVALID_COUNT")
            
            success, message, codes = self.redeem_service.batch_create_codes(
                count=count,
                amount=amount,
                code_type=code_type,
                bonus_amount=bonus_amount,
                description=description,
                max_uses=max_uses,
                expires_days=expires_days,
                created_by=admin_id,
                prefix=prefix
            )
            
            return self._success_response({
                "codes": [c.to_dict() for c in codes],
                "count": len(codes),
                "batch_id": codes[0].batch_id if codes else None
            }, message)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin batch create error: {e}")
            return self._error_response(str(e), "BATCH_ERROR", 500)
    
    async def admin_list_codes(self, request: web.Request) -> web.Response:
        """獲取兌換碼列表"""
        try:
            self._require_admin(request)
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            status = request.query.get('status')
            batch_id = request.query.get('batch_id')
            
            codes, total = self.redeem_service.get_codes(
                status=status,
                batch_id=batch_id,
                page=page,
                page_size=page_size
            )
            
            return self._success_response({
                "codes": [c.to_dict() for c in codes],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total
                }
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin list codes error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def admin_disable_code(self, request: web.Request) -> web.Response:
        """禁用兌換碼"""
        try:
            self._require_admin(request)
            
            code_id = request.match_info.get('code_id')
            if not code_id:
                return self._error_response("缺少 code_id", "MISSING_ID")
            
            success, message = self.redeem_service.disable_code(code_id)
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "DISABLE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin disable code error: {e}")
            return self._error_response(str(e), "DISABLE_ERROR", 500)
    
    async def admin_enable_code(self, request: web.Request) -> web.Response:
        """啟用兌換碼"""
        try:
            self._require_admin(request)
            
            code_id = request.match_info.get('code_id')
            if not code_id:
                return self._error_response("缺少 code_id", "MISSING_ID")
            
            success, message = self.redeem_service.enable_code(code_id)
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "ENABLE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin enable code error: {e}")
            return self._error_response(str(e), "ENABLE_ERROR", 500)


# ==================== 路由設置 ====================

def setup_redeem_routes(app: web.Application):
    """設置兌換碼路由"""
    handlers = RedeemHandlers()
    
    # 用戶接口
    app.router.add_post('/api/wallet/redeem', handlers.redeem_code)
    app.router.add_get('/api/wallet/redeem/records', handlers.get_redeem_records)
    
    # 管理員接口
    app.router.add_post('/api/admin/redeem/create', handlers.admin_create_code)
    app.router.add_post('/api/admin/redeem/batch', handlers.admin_batch_create)
    app.router.add_get('/api/admin/redeem/codes', handlers.admin_list_codes)
    app.router.add_post('/api/admin/redeem/{code_id}/disable', handlers.admin_disable_code)
    app.router.add_post('/api/admin/redeem/{code_id}/enable', handlers.admin_enable_code)
    
    logger.info("✅ Redeem API routes registered")


# 全局處理器實例
redeem_handlers = RedeemHandlers()

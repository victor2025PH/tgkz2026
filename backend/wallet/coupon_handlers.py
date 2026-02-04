"""
優惠券 API 處理器
Coupon API Handlers
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .coupon_service import get_coupon_service

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class CouponHandlers:
    """優惠券 API 處理器"""
    
    def __init__(self):
        self.coupon_service = get_coupon_service()
    
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
    
    async def get_my_coupons(self, request: web.Request) -> web.Response:
        """獲取我的優惠券"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            status = request.query.get('status')
            available_only = request.query.get('available_only', 'false').lower() == 'true'
            
            coupons = self.coupon_service.get_user_coupons(
                user_id=user_id,
                status=status,
                available_only=available_only
            )
            
            return self._success_response({
                "coupons": [c.to_dict() for c in coupons]
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get my coupons error: {e}")
            return self._error_response(str(e), "GET_ERROR", 500)
    
    async def get_applicable_coupons(self, request: web.Request) -> web.Response:
        """獲取適用的優惠券"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            business_type = request.query.get('type', '')
            amount = int(request.query.get('amount', 0))
            
            if not business_type or not amount:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            coupons = self.coupon_service.get_applicable_coupons(
                user_id=user_id,
                business_type=business_type,
                amount=amount
            )
            
            # 計算每張優惠券的優惠金額
            result = []
            for coupon in coupons:
                discount = self.coupon_service._calculate_discount(coupon, amount)
                data = coupon.to_dict()
                data['discount_amount'] = discount
                data['discount_display'] = f"${discount / 100:.2f}"
                result.append(data)
            
            return self._success_response({
                "coupons": result
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get applicable coupons error: {e}")
            return self._error_response(str(e), "GET_ERROR", 500)
    
    async def claim_coupon(self, request: web.Request) -> web.Response:
        """領取優惠券"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            template_id = data.get('template_id')
            
            if not template_id:
                return self._error_response("缺少優惠券ID", "MISSING_ID")
            
            success, message, coupon = self.coupon_service.issue_coupon(
                template_id=template_id,
                user_id=user_id
            )
            
            if success and coupon:
                return self._success_response({
                    "coupon": coupon.to_dict()
                }, message)
            else:
                return self._error_response(message, "CLAIM_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Claim coupon error: {e}")
            return self._error_response(str(e), "CLAIM_ERROR", 500)
    
    async def use_coupon(self, request: web.Request) -> web.Response:
        """使用優惠券"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            data = await request.json()
            coupon_id = data.get('coupon_id')
            order_id = data.get('order_id')
            amount = data.get('amount')
            
            if not coupon_id or not order_id or not amount:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            success, message, discount = self.coupon_service.use_coupon(
                coupon_id=coupon_id,
                user_id=user_id,
                order_id=order_id,
                amount=amount
            )
            
            if success:
                return self._success_response({
                    "discount": discount,
                    "discount_display": f"${discount / 100:.2f}"
                }, message)
            else:
                return self._error_response(message, "USE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Use coupon error: {e}")
            return self._error_response(str(e), "USE_ERROR", 500)
    
    # ==================== 管理員接口 ====================
    
    async def admin_create_template(self, request: web.Request) -> web.Response:
        """創建優惠券模板"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            data = await request.json()
            
            name = data.get('name')
            coupon_type = data.get('coupon_type', 'discount')
            value = data.get('value')
            min_amount = data.get('min_amount', 0)
            max_discount = data.get('max_discount', 0)
            applicable_types = data.get('applicable_types', [])
            description = data.get('description', '')
            valid_days = data.get('valid_days', 30)
            total_count = data.get('total_count', 0)
            
            if not name or not value:
                return self._error_response("名稱和優惠值不能為空", "MISSING_PARAMS")
            
            success, message, template = self.coupon_service.create_template(
                name=name,
                coupon_type=coupon_type,
                value=value,
                min_amount=min_amount,
                max_discount=max_discount,
                applicable_types=applicable_types,
                description=description,
                valid_days=valid_days,
                total_count=total_count,
                created_by=admin_id
            )
            
            if success and template:
                return self._success_response({
                    "template": template.to_dict()
                }, message)
            else:
                return self._error_response(message, "CREATE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin create template error: {e}")
            return self._error_response(str(e), "CREATE_ERROR", 500)
    
    async def admin_list_templates(self, request: web.Request) -> web.Response:
        """獲取優惠券模板列表"""
        try:
            self._require_admin(request)
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            status = request.query.get('status')
            
            templates, total = self.coupon_service.get_templates(
                status=status,
                page=page,
                page_size=page_size
            )
            
            return self._success_response({
                "templates": [t.to_dict() for t in templates],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total
                }
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin list templates error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def admin_issue_coupon(self, request: web.Request) -> web.Response:
        """手動發放優惠券"""
        try:
            self._require_admin(request)
            
            data = await request.json()
            template_id = data.get('template_id')
            user_id = data.get('user_id')
            
            if not template_id or not user_id:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            success, message, coupon = self.coupon_service.issue_coupon(
                template_id=template_id,
                user_id=user_id
            )
            
            if success and coupon:
                return self._success_response({
                    "coupon": coupon.to_dict()
                }, message)
            else:
                return self._error_response(message, "ISSUE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin issue coupon error: {e}")
            return self._error_response(str(e), "ISSUE_ERROR", 500)


# ==================== 路由設置 ====================

def setup_coupon_routes(app: web.Application):
    """設置優惠券路由"""
    handlers = CouponHandlers()
    
    # 用戶接口
    app.router.add_get('/api/wallet/coupons', handlers.get_my_coupons)
    app.router.add_get('/api/wallet/coupons/applicable', handlers.get_applicable_coupons)
    app.router.add_post('/api/wallet/coupons/claim', handlers.claim_coupon)
    app.router.add_post('/api/wallet/coupons/use', handlers.use_coupon)
    
    # 管理員接口
    app.router.add_post('/api/admin/coupons/templates', handlers.admin_create_template)
    app.router.add_get('/api/admin/coupons/templates', handlers.admin_list_templates)
    app.router.add_post('/api/admin/coupons/issue', handlers.admin_issue_coupon)
    
    logger.info("✅ Coupon API routes registered")


coupon_handlers = CouponHandlers()

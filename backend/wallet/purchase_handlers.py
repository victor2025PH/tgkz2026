"""
購買 API 處理器
Purchase API Handlers

提供業務購買的 HTTP API 端點：
1. 會員購買
2. IP 代理購買
3. 配額包購買
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .business_integration import get_business_service, PurchaseRequest

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class PurchaseHandlers:
    """購買 API 處理器"""
    
    def __init__(self):
        self.business_service = get_business_service()
    
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
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _require_auth(self, request: web.Request) -> Dict:
        user = self._verify_token(request)
        if not user:
            raise web.HTTPUnauthorized(
                text='{"success": false, "error": "未授權"}',
                content_type='application/json'
            )
        return user
    
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
    
    # ==================== 會員購買 ====================
    
    async def purchase_membership(self, request: web.Request) -> web.Response:
        """
        購買會員
        
        POST /api/purchase/membership
        {
            "plan_id": "pro_monthly",
            "plan_name": "專業版",
            "price": 2999,
            "tier": "pro",
            "duration_days": 30
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            plan_id = data.get('plan_id')
            plan_name = data.get('plan_name', '')
            price = data.get('price')
            tier = data.get('tier', 'basic')
            duration_days = data.get('duration_days', 30)
            
            if not plan_id or not price:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            if price < 0:
                return self._error_response("價格無效", "INVALID_PRICE")
            
            result = await self.business_service.purchase_membership(
                user_id=user_id,
                plan_id=plan_id,
                plan_name=plan_name,
                price=price,
                tier=tier,
                duration_days=duration_days,
                ip_address=self._get_client_ip(request)
            )
            
            if result.success:
                return self._success_response({
                    "order_id": result.order_id,
                    "transaction_id": result.transaction_id,
                    "membership": result.business_result.get('membership') if result.business_result else None
                }, result.message)
            else:
                return self._error_response(result.message, "PURCHASE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Purchase membership error: {e}")
            return self._error_response(str(e), "PURCHASE_ERROR", 500)
    
    # ==================== IP 代理購買 ====================
    
    async def purchase_ip_proxy(self, request: web.Request) -> web.Response:
        """
        購買 IP 代理
        
        POST /api/purchase/proxy
        {
            "package_id": "hk_static_30",
            "package_name": "香港靜態IP",
            "price": 1500,
            "region": "HK",
            "type": "static",
            "duration_days": 30
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            package_id = data.get('package_id')
            package_name = data.get('package_name', '')
            price = data.get('price')
            region = data.get('region', 'US')
            proxy_type = data.get('type', 'static')
            duration_days = data.get('duration_days', 30)
            
            if not package_id or not price:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            if price < 0:
                return self._error_response("價格無效", "INVALID_PRICE")
            
            result = await self.business_service.purchase_ip_proxy(
                user_id=user_id,
                package_id=package_id,
                package_name=package_name,
                price=price,
                region=region,
                proxy_type=proxy_type,
                duration_days=duration_days,
                ip_address=self._get_client_ip(request)
            )
            
            if result.success:
                return self._success_response({
                    "order_id": result.order_id,
                    "transaction_id": result.transaction_id,
                    "proxy": result.business_result.get('proxy') if result.business_result else None
                }, result.message)
            else:
                return self._error_response(result.message, "PURCHASE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Purchase IP proxy error: {e}")
            return self._error_response(str(e), "PURCHASE_ERROR", 500)
    
    # ==================== 配額包購買 ====================
    
    async def purchase_quota_pack(self, request: web.Request) -> web.Response:
        """
        購買配額包
        
        POST /api/purchase/quota
        {
            "pack_id": "quota_5000",
            "pack_name": "5000 配額",
            "price": 2000,
            "quota_amount": 5000,
            "bonus_amount": 500
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            pack_id = data.get('pack_id')
            pack_name = data.get('pack_name', '')
            price = data.get('price')
            quota_amount = data.get('quota_amount', 0)
            bonus_amount = data.get('bonus_amount', 0)
            
            if not pack_id or not price:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            if price < 0:
                return self._error_response("價格無效", "INVALID_PRICE")
            
            result = await self.business_service.purchase_quota_pack(
                user_id=user_id,
                pack_id=pack_id,
                pack_name=pack_name,
                price=price,
                quota_amount=quota_amount,
                bonus_amount=bonus_amount,
                ip_address=self._get_client_ip(request)
            )
            
            if result.success:
                return self._success_response({
                    "order_id": result.order_id,
                    "transaction_id": result.transaction_id,
                    "quota": result.business_result.get('quota') if result.business_result else None
                }, result.message)
            else:
                return self._error_response(result.message, "PURCHASE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Purchase quota pack error: {e}")
            return self._error_response(str(e), "PURCHASE_ERROR", 500)
    
    # ==================== 通用購買 ====================
    
    async def unified_purchase(self, request: web.Request) -> web.Response:
        """
        統一購買接口
        
        POST /api/purchase
        {
            "business_type": "membership|ip_proxy|quota_pack",
            "item_id": "...",
            "amount": 1000,
            "item_name": "...",
            "metadata": {...}
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            business_type = data.get('business_type')
            item_id = data.get('item_id')
            amount = data.get('amount')
            item_name = data.get('item_name', '')
            item_description = data.get('item_description', '')
            metadata = data.get('metadata', {})
            
            if not business_type or not item_id or amount is None:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            if business_type not in ['membership', 'ip_proxy', 'quota_pack']:
                return self._error_response("不支持的業務類型", "INVALID_BUSINESS_TYPE")
            
            if amount < 0:
                return self._error_response("金額無效", "INVALID_AMOUNT")
            
            purchase_req = PurchaseRequest(
                user_id=user_id,
                business_type=business_type,
                item_id=item_id,
                amount=amount,
                item_name=item_name,
                item_description=item_description,
                metadata=metadata,
                ip_address=self._get_client_ip(request)
            )
            
            result = await self.business_service.purchase(purchase_req)
            
            if result.success:
                return self._success_response({
                    "order_id": result.order_id,
                    "transaction_id": result.transaction_id,
                    "result": result.business_result
                }, result.message)
            else:
                return self._error_response(result.message, "PURCHASE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Unified purchase error: {e}")
            return self._error_response(str(e), "PURCHASE_ERROR", 500)


# ==================== 路由設置 ====================

def setup_purchase_routes(app: web.Application):
    """設置購買路由"""
    handlers = PurchaseHandlers()
    
    app.router.add_post('/api/purchase', handlers.unified_purchase)
    app.router.add_post('/api/purchase/membership', handlers.purchase_membership)
    app.router.add_post('/api/purchase/proxy', handlers.purchase_ip_proxy)
    app.router.add_post('/api/purchase/quota', handlers.purchase_quota_pack)
    
    logger.info("✅ Purchase API routes registered")


# 全局處理器實例
purchase_handlers = PurchaseHandlers()

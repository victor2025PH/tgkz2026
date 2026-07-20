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
            if not plan_id:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            # 🔴 服務端權威定價：忽略前端傳來的 price/tier/duration，一律用權威表解析，
            # 杜絕「1 分錢買企業版」。前端傳值僅用於篡改告警。
            from .plan_catalog import resolve_membership_plan
            plan = resolve_membership_plan(plan_id)
            if not plan:
                return self._error_response("無效或不可購買的方案", "INVALID_PLAN")
            
            client_price = data.get('price')
            if client_price is not None and int(client_price) != plan['price']:
                logger.warning(
                    f"[purchase_membership] 前端價格與權威價不符（可能篡改）: "
                    f"user={user_id}, plan={plan_id}, client={client_price}, authoritative={plan['price']}"
                )
            
            result = await self.business_service.purchase_membership(
                user_id=user_id,
                plan_id=plan_id,
                plan_name=data.get('plan_name', '') or plan['name'],
                price=plan['price'],
                tier=plan['tier'],
                duration_days=plan['duration_days'],
                ip_address=self._get_client_ip(request),
                idempotency_key=data.get('idempotency_key')
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
            if not package_id:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            # 🔴 服務端權威定價：忽略前端 price。目前代理無權威套餐表且履約關閉，
            # resolve_proxy_package 一律回 None → 購買被拒（fail-closed）。
            from .plan_catalog import resolve_proxy_package
            pkg = resolve_proxy_package(package_id)
            if not pkg:
                return self._error_response("無效或不可購買的套餐", "INVALID_PACKAGE")
            
            result = await self.business_service.purchase_ip_proxy(
                user_id=user_id,
                package_id=package_id,
                package_name=data.get('package_name', '') or pkg.get('name', ''),
                price=pkg['price'],
                region=pkg.get('region', data.get('region', 'US')),
                proxy_type=pkg.get('type', data.get('type', 'static')),
                duration_days=pkg.get('duration_days', 30),
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
            if not pack_id:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            # 🔴 服務端權威定價：忽略前端 price/quota_amount，用 QUOTA_PACKS 權威解析。
            from .plan_catalog import resolve_quota_pack
            pack = resolve_quota_pack(pack_id)
            if not pack:
                return self._error_response("無效或不可購買的配額包", "INVALID_PACK")
            
            client_price = data.get('price')
            if client_price is not None and int(client_price) != pack['price']:
                logger.warning(
                    f"[purchase_quota_pack] 前端價格與權威價不符（可能篡改）: "
                    f"user={user_id}, pack={pack_id}, client={client_price}, authoritative={pack['price']}"
                )
            
            result = await self.business_service.purchase_quota_pack(
                user_id=user_id,
                pack_id=pack_id,
                pack_name=data.get('pack_name', '') or pack['name'],
                price=pack['price'],
                quota_amount=pack['quota_amount'],
                bonus_amount=pack['bonus_amount'],
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
            item_name = data.get('item_name', '')
            item_description = data.get('item_description', '')
            metadata = data.get('metadata', {})
            
            if not business_type or not item_id:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            if business_type not in ['membership', 'ip_proxy', 'quota_pack']:
                return self._error_response("不支持的業務類型", "INVALID_BUSINESS_TYPE")
            
            # 🔴 服務端權威定價：unified 端點過去直接信任前端 amount，同樣杜絕篡改。
            # 依 business_type 走對應權威解析，price/duration 一律以權威為準。
            from .plan_catalog import resolve_membership_plan, resolve_quota_pack, resolve_proxy_package
            if business_type == 'membership':
                resolved = resolve_membership_plan(item_id)
                if resolved:
                    metadata = {**(metadata or {}), 'tier': resolved['tier'],
                                'duration_days': resolved['duration_days']}
            elif business_type == 'quota_pack':
                resolved = resolve_quota_pack(item_id)
                if resolved:
                    metadata = {**(metadata or {}), 'quota_amount': resolved['quota_amount'],
                                'bonus_amount': resolved['bonus_amount']}
            else:
                resolved = resolve_proxy_package(item_id)
            
            if not resolved:
                return self._error_response("無效或不可購買的項目", "INVALID_ITEM")
            
            client_amount = data.get('amount')
            if client_amount is not None and int(client_amount) != resolved['price']:
                logger.warning(
                    f"[unified_purchase] 前端金額與權威價不符（可能篡改）: "
                    f"user={user_id}, type={business_type}, item={item_id}, "
                    f"client={client_amount}, authoritative={resolved['price']}"
                )
            
            purchase_req = PurchaseRequest(
                user_id=user_id,
                business_type=business_type,
                item_id=item_id,
                amount=resolved['price'],
                item_name=item_name or resolved.get('name', ''),
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
    
    # ==================== 方案列表（公開，供前端展示）====================
    
    async def list_membership_plans(self, request: web.Request) -> web.Response:
        """GET /api/membership/plans — 返回權威會員方案（價格來自服務端）"""
        try:
            from .plan_catalog import list_membership_plans
            cycle = request.query.get('cycle', 'monthly')
            return self._success_response(list_membership_plans(cycle))
        except Exception as e:
            logger.error(f"List membership plans error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def list_quota_packs(self, request: web.Request) -> web.Response:
        """GET /api/quota/packs — 返回權威配額包"""
        try:
            from .plan_catalog import list_quota_packs
            return self._success_response(list_quota_packs())
        except Exception as e:
            logger.error(f"List quota packs error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def list_proxy_packages(self, request: web.Request) -> web.Response:
        """GET /api/proxy/packages — 返回權威代理套餐（目前為空，履約未開通）"""
        try:
            from .plan_catalog import list_proxy_packages
            return self._success_response(list_proxy_packages())
        except Exception as e:
            logger.error(f"List proxy packages error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def list_my_orders(self, request: web.Request) -> web.Response:
        """GET /api/purchase/orders — 當前用戶的購買訂單（對賬/歷史，需登入）"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            from .purchase_orders import get_purchase_order_store
            limit = min(int(request.query.get('limit', 50)), 200)
            offset = int(request.query.get('offset', 0))
            orders = get_purchase_order_store().list_by_user(user_id, limit, offset)
            return self._success_response(orders)
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"List my purchase orders error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)


# ==================== 路由設置 ====================

def setup_purchase_routes(app: web.Application):
    """設置購買路由"""
    handlers = PurchaseHandlers()
    
    app.router.add_post('/api/purchase', handlers.unified_purchase)
    app.router.add_post('/api/purchase/membership', handlers.purchase_membership)
    app.router.add_post('/api/purchase/proxy', handlers.purchase_ip_proxy)
    app.router.add_post('/api/purchase/quota', handlers.purchase_quota_pack)
    # 方案列表（公開）
    app.router.add_get('/api/membership/plans', handlers.list_membership_plans)
    app.router.add_get('/api/quota/packs', handlers.list_quota_packs)
    app.router.add_get('/api/proxy/packages', handlers.list_proxy_packages)
    # 購買訂單（需登入）
    app.router.add_get('/api/purchase/orders', handlers.list_my_orders)
    
    logger.info("✅ Purchase API routes registered")


# 全局處理器實例
purchase_handlers = PurchaseHandlers()

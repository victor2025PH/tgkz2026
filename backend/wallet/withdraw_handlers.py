"""
提現 API 處理器
Withdraw API Handlers

提供提現相關的 HTTP API 端點
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .withdraw_service import get_withdraw_service, WITHDRAW_CONFIG

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class WithdrawHandlers:
    """提現 API 處理器"""
    
    def __init__(self):
        self.withdraw_service = get_withdraw_service()
    
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
    
    async def get_withdraw_config(self, request: web.Request) -> web.Response:
        """獲取提現配置"""
        try:
            self._require_auth(request)
            
            return self._success_response({
                "min_amount": WITHDRAW_CONFIG['min_amount'],
                "min_display": f"${WITHDRAW_CONFIG['min_amount'] / 100:.2f}",
                "max_amount": WITHDRAW_CONFIG['max_amount'],
                "max_display": f"${WITHDRAW_CONFIG['max_amount'] / 100:.2f}",
                "daily_max": WITHDRAW_CONFIG['daily_max'],
                "daily_max_display": f"${WITHDRAW_CONFIG['daily_max'] / 100:.2f}",
                "fee_rate": WITHDRAW_CONFIG['fee_rate'],
                "fee_rate_display": f"{WITHDRAW_CONFIG['fee_rate'] * 100}%",
                "min_fee": WITHDRAW_CONFIG['min_fee'],
                "min_fee_display": f"${WITHDRAW_CONFIG['min_fee'] / 100:.2f}",
                "free_monthly_count": WITHDRAW_CONFIG['free_monthly_count'],
                "processing_time_hours": WITHDRAW_CONFIG['processing_time_hours'],
                "methods": [
                    {"id": "usdt_trc20", "name": "USDT (TRC20)", "enabled": True},
                    {"id": "usdt_erc20", "name": "USDT (ERC20)", "enabled": True},
                    {"id": "bank", "name": "銀行卡", "enabled": False}
                ]
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get withdraw config error: {e}")
            return self._error_response(str(e), "CONFIG_ERROR", 500)
    
    async def create_withdraw(self, request: web.Request) -> web.Response:
        """
        創建提現申請
        
        POST /api/wallet/withdraw/create
        {
            "amount": 10000,
            "method": "usdt_trc20",
            "address": "TYourTRC20Address"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            amount = data.get('amount')
            method = data.get('method')
            address = data.get('address', '').strip()
            
            if not amount or not method or not address:
                return self._error_response("缺少必要參數", "MISSING_PARAMS")
            
            success, message, order = self.withdraw_service.create_withdraw(
                user_id=user_id,
                amount=amount,
                method=method,
                address=address
            )
            
            if success and order:
                return self._success_response({
                    "order": order.to_dict()
                }, message)
            else:
                return self._error_response(message, "CREATE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Create withdraw error: {e}")
            return self._error_response(str(e), "CREATE_ERROR", 500)
    
    async def get_withdraw_orders(self, request: web.Request) -> web.Response:
        """獲取提現訂單列表"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 50)
            status = request.query.get('status')
            
            orders, total = self.withdraw_service.get_user_orders(
                user_id=user_id,
                status=status,
                page=page,
                page_size=page_size
            )
            
            return self._success_response({
                "orders": [o.to_dict() for o in orders],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get withdraw orders error: {e}")
            return self._error_response(str(e), "GET_ORDERS_ERROR", 500)
    
    async def get_withdraw_order(self, request: web.Request) -> web.Response:
        """獲取提現訂單詳情"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            order = self.withdraw_service.get_order(order_no)
            
            if not order:
                return self._error_response("訂單不存在", "ORDER_NOT_FOUND", 404)
            
            if order.user_id != user_id:
                return self._error_response("無權訪問此訂單", "FORBIDDEN", 403)
            
            return self._success_response({"order": order.to_dict()})
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get withdraw order error: {e}")
            return self._error_response(str(e), "GET_ORDER_ERROR", 500)
    
    async def cancel_withdraw(self, request: web.Request) -> web.Response:
        """取消提現"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            success, message = self.withdraw_service.cancel_withdraw(
                order_no, user_id
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "CANCEL_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Cancel withdraw error: {e}")
            return self._error_response(str(e), "CANCEL_ERROR", 500)
    
    # ==================== 管理員接口 ====================
    
    async def admin_list_withdraws(self, request: web.Request) -> web.Response:
        """管理員獲取提現列表"""
        try:
            self._require_admin(request)
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            status = request.query.get('status')
            
            conn = self.withdraw_service._get_connection()
            cursor = conn.cursor()
            
            try:
                conditions = []
                params = []
                
                if status:
                    conditions.append("status = ?")
                    params.append(status)
                
                where_clause = " AND ".join(conditions) if conditions else "1=1"
                
                cursor.execute(
                    f'SELECT COUNT(*) FROM withdraw_orders WHERE {where_clause}',
                    params
                )
                total = cursor.fetchone()[0]
                
                offset = (page - 1) * page_size
                cursor.execute(f'''
                    SELECT * FROM withdraw_orders 
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                ''', params + [page_size, offset])
                
                orders = []
                for row in cursor.fetchall():
                    order = self.withdraw_service._row_to_order(dict(row))
                    orders.append(order.to_dict())
                
                return self._success_response({
                    "orders": orders,
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total": total,
                        "total_pages": (total + page_size - 1) // page_size
                    }
                })
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin list withdraws error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def admin_approve_withdraw(self, request: web.Request) -> web.Response:
        """審核通過"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            success, message = self.withdraw_service.approve_withdraw(
                order_no, admin_id
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "APPROVE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin approve withdraw error: {e}")
            return self._error_response(str(e), "APPROVE_ERROR", 500)
    
    async def admin_reject_withdraw(self, request: web.Request) -> web.Response:
        """審核拒絕"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            data = await request.json()
            reason = data.get('reason', '')
            
            if not reason:
                return self._error_response("拒絕原因不能為空", "MISSING_REASON")
            
            success, message = self.withdraw_service.reject_withdraw(
                order_no, admin_id, reason
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "REJECT_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin reject withdraw error: {e}")
            return self._error_response(str(e), "REJECT_ERROR", 500)
    
    async def admin_complete_withdraw(self, request: web.Request) -> web.Response:
        """完成提現"""
        try:
            self._require_admin(request)
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            data = await request.json() if request.body_exists else {}
            tx_hash = data.get('tx_hash', '')
            
            success, message = self.withdraw_service.complete_withdraw(
                order_no, tx_hash
            )
            
            if success:
                return self._success_response(None, message)
            else:
                return self._error_response(message, "COMPLETE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Admin complete withdraw error: {e}")
            return self._error_response(str(e), "COMPLETE_ERROR", 500)


# ==================== 路由設置 ====================

def setup_withdraw_routes(app: web.Application):
    """設置提現路由"""
    handlers = WithdrawHandlers()
    
    # 用戶接口
    app.router.add_get('/api/wallet/withdraw/config', handlers.get_withdraw_config)
    app.router.add_post('/api/wallet/withdraw/create', handlers.create_withdraw)
    app.router.add_get('/api/wallet/withdraw/orders', handlers.get_withdraw_orders)
    app.router.add_get('/api/wallet/withdraw/{order_no}', handlers.get_withdraw_order)
    app.router.add_post('/api/wallet/withdraw/{order_no}/cancel', handlers.cancel_withdraw)
    
    # 管理員接口
    app.router.add_get('/api/admin/withdraws', handlers.admin_list_withdraws)
    app.router.add_post('/api/admin/withdraws/{order_no}/approve', handlers.admin_approve_withdraw)
    app.router.add_post('/api/admin/withdraws/{order_no}/reject', handlers.admin_reject_withdraw)
    app.router.add_post('/api/admin/withdraws/{order_no}/complete', handlers.admin_complete_withdraw)
    
    logger.info("✅ Withdraw API routes registered")


# 全局處理器實例
withdraw_handlers = WithdrawHandlers()

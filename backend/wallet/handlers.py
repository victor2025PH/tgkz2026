"""
錢包 API 處理器
Wallet API Handlers

提供錢包相關的 HTTP API 端點
"""

import os
import jwt
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .wallet_service import get_wallet_service, WalletServiceError
from .transaction_service import get_transaction_service
from .recharge_service import get_recharge_service
from .usdt_service import get_usdt_service
from .models import ConsumeCategory, TransactionType, RechargeStatus

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class WalletHandlers:
    """錢包 API 處理器"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
        self.transaction_service = get_transaction_service()
        self.recharge_service = get_recharge_service()
    
    def _get_client_ip(self, request: web.Request) -> str:
        """獲取客戶端 IP"""
        xff = request.headers.get('X-Forwarded-For', '')
        if xff:
            return xff.split(',')[0].strip()
        return request.remote or ''
    
    def _verify_token(self, request: web.Request) -> Optional[Dict]:
        """驗證 JWT Token"""
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
        """要求認證"""
        user = self._verify_token(request)
        if not user:
            raise web.HTTPUnauthorized(
                text='{"success": false, "error": "未授權"}',
                content_type='application/json'
            )
        return user
    
    def _success_response(self, data: Any = None, message: str = "success") -> web.Response:
        """成功響應"""
        return web.json_response({
            "success": True,
            "message": message,
            "data": data
        })
    
    def _error_response(self, message: str, code: str = "ERROR", status: int = 400) -> web.Response:
        """錯誤響應"""
        return web.json_response({
            "success": False,
            "error": message,
            "code": code
        }, status=status)
    
    # ==================== 錢包信息 ====================
    
    async def get_wallet(self, request: web.Request) -> web.Response:
        """獲取錢包信息"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            wallet = self.wallet_service.get_or_create_wallet(user_id)
            return self._success_response(wallet.to_dict())
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get wallet error: {e}")
            return self._error_response(str(e), "GET_WALLET_ERROR", 500)
    
    async def get_balance(self, request: web.Request) -> web.Response:
        """獲取餘額信息"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            balance = self.wallet_service.get_wallet_balance(user_id)
            return self._success_response(balance)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get balance error: {e}")
            return self._error_response(str(e), "GET_BALANCE_ERROR", 500)
    
    async def get_statistics(self, request: web.Request) -> web.Response:
        """獲取錢包統計"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            stats = self.wallet_service.get_statistics(user_id)
            return self._success_response(stats)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get statistics error: {e}")
            return self._error_response(str(e), "GET_STATS_ERROR", 500)
    
    # ==================== 交易記錄 ====================
    
    async def get_transactions(self, request: web.Request) -> web.Response:
        """獲取交易記錄"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            # 解析查詢參數
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            type_filter = request.query.get('type')
            category_filter = request.query.get('category')
            status_filter = request.query.get('status')
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            result = self.transaction_service.get_transactions(
                user_id=user_id,
                page=page,
                page_size=page_size,
                type_filter=type_filter,
                category_filter=category_filter,
                status_filter=status_filter,
                start_date=start_date,
                end_date=end_date
            )
            
            return self._success_response(result)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get transactions error: {e}")
            return self._error_response(str(e), "GET_TRANSACTIONS_ERROR", 500)
    
    async def get_recent_transactions(self, request: web.Request) -> web.Response:
        """獲取最近交易"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            limit = min(int(request.query.get('limit', 5)), 20)
            transactions = self.transaction_service.get_recent_transactions(user_id, limit)
            
            return self._success_response(transactions)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get recent transactions error: {e}")
            return self._error_response(str(e), "GET_RECENT_ERROR", 500)
    
    async def get_consume_analysis(self, request: web.Request) -> web.Response:
        """獲取消費分析"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            analysis = self.transaction_service.get_consume_analysis(
                user_id, start_date, end_date
            )
            
            return self._success_response(analysis)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get consume analysis error: {e}")
            return self._error_response(str(e), "GET_ANALYSIS_ERROR", 500)
    
    async def get_monthly_summary(self, request: web.Request) -> web.Response:
        """獲取月度摘要"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            months = min(int(request.query.get('months', 6)), 12)
            summary = self.transaction_service.get_monthly_summary(user_id, months)
            
            return self._success_response(summary)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get monthly summary error: {e}")
            return self._error_response(str(e), "GET_MONTHLY_ERROR", 500)
    
    async def export_transactions(self, request: web.Request) -> web.Response:
        """導出交易記錄 CSV"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            csv_content = self.transaction_service.export_to_csv(
                user_id, start_date, end_date
            )
            
            filename = f"transactions_{datetime.now().strftime('%Y%m%d')}.csv"
            
            return web.Response(
                body=csv_content.encode('utf-8-sig'),  # BOM for Excel
                content_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"'
                }
            )
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Export transactions error: {e}")
            return self._error_response(str(e), "EXPORT_ERROR", 500)
    
    # ==================== 充值套餐 ====================
    
    async def get_recharge_packages(self, request: web.Request) -> web.Response:
        """獲取充值套餐"""
        try:
            # 充值套餐可以公開訪問
            packages = self.wallet_service.get_recharge_packages()
            return self._success_response([p.to_dict() for p in packages])
            
        except Exception as e:
            logger.error(f"Get recharge packages error: {e}")
            return self._error_response(str(e), "GET_PACKAGES_ERROR", 500)
    
    # ==================== 消費接口（供其他模塊調用）====================
    
    async def consume(self, request: web.Request) -> web.Response:
        """
        消費餘額（內部 API）
        
        POST /api/wallet/consume
        {
            "amount": 500,  // 分
            "category": "ip_proxy",
            "description": "購買香港靜態IP",
            "order_id": "IP123456",
            "reference_id": "proxy_123",
            "reference_type": "static_proxy"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            amount = data.get('amount')
            if not amount or amount <= 0:
                return self._error_response("金額必須大於0", "INVALID_AMOUNT")
            
            category = data.get('category', 'other')
            description = data.get('description', '')
            order_id = data.get('order_id')
            reference_id = data.get('reference_id', '')
            reference_type = data.get('reference_type', '')
            
            success, message, transaction = self.wallet_service.consume(
                user_id=user_id,
                amount=amount,
                category=category,
                description=description,
                order_id=order_id,
                reference_id=reference_id,
                reference_type=reference_type,
                ip_address=self._get_client_ip(request)
            )
            
            if success:
                return self._success_response({
                    "transaction": transaction.to_dict() if transaction else None,
                    "new_balance": self.wallet_service.get_wallet_balance(user_id)
                }, message)
            else:
                return self._error_response(message, "CONSUME_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Consume error: {e}")
            return self._error_response(str(e), "CONSUME_ERROR", 500)
    
    async def check_balance(self, request: web.Request) -> web.Response:
        """
        檢查餘額是否足夠
        
        POST /api/wallet/check-balance
        {
            "amount": 500  // 分
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            amount = data.get('amount', 0)
            
            wallet = self.wallet_service.get_or_create_wallet(user_id)
            sufficient = wallet.available_balance >= amount
            
            return self._success_response({
                "sufficient": sufficient,
                "required": amount,
                "available": wallet.available_balance,
                "shortfall": max(0, amount - wallet.available_balance),
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Check balance error: {e}")
            return self._error_response(str(e), "CHECK_BALANCE_ERROR", 500)
    
    # ==================== 充值訂單 ====================
    
    async def create_recharge_order(self, request: web.Request) -> web.Response:
        """
        創建充值訂單
        
        POST /api/wallet/recharge/create
        {
            "amount": 3000,  // 分
            "payment_method": "usdt_trc20"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            data = await request.json()
            
            amount = data.get('amount')
            if not amount or amount < 500:  # 最低 $5
                return self._error_response("最低充值金額為 $5", "INVALID_AMOUNT")
            
            payment_method = data.get('payment_method', 'usdt_trc20')
            payment_channel = data.get('payment_channel', 'direct')
            
            success, message, order = self.recharge_service.create_order(
                user_id=user_id,
                amount=amount,
                payment_method=payment_method,
                payment_channel=payment_channel,
                ip_address=self._get_client_ip(request)
            )
            
            if success and order:
                return self._success_response({
                    "order": order.to_dict(),
                    "payment_info": self._get_payment_info(order)
                }, message)
            else:
                return self._error_response(message, "CREATE_ORDER_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Create recharge order error: {e}")
            return self._error_response(str(e), "CREATE_ORDER_ERROR", 500)
    
    def _get_payment_info(self, order) -> Dict[str, Any]:
        """根據支付方式返回支付信息"""
        info = {
            "order_no": order.order_no,
            "amount": order.amount,
            "amount_display": f"${order.amount / 100:.2f}",
            "bonus_amount": order.bonus_amount,
            "bonus_display": f"+${order.bonus_amount / 100:.2f}" if order.bonus_amount > 0 else "",
            "fee": order.fee,
            "actual_amount": order.actual_amount,
            "actual_display": f"${order.actual_amount / 100:.2f}",
            "payment_method": order.payment_method,
            "expired_at": order.expired_at,
        }
        
        # USDT 專用信息
        if order.payment_method in ['usdt_trc20', 'usdt_erc20']:
            info.update({
                "usdt_network": order.usdt_network,
                "usdt_address": order.usdt_address,
                "usdt_amount": order.usdt_amount,
                "usdt_rate": order.usdt_rate,
            })
        
        return info
    
    async def get_recharge_order(self, request: web.Request) -> web.Response:
        """獲取充值訂單詳情"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            order = self.recharge_service.get_order(order_no)
            
            if not order:
                return self._error_response("訂單不存在", "ORDER_NOT_FOUND", 404)
            
            # 驗證訂單歸屬
            if order.user_id != user_id:
                return self._error_response("無權訪問此訂單", "FORBIDDEN", 403)
            
            return self._success_response({
                "order": order.to_dict(),
                "payment_info": self._get_payment_info(order)
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get recharge order error: {e}")
            return self._error_response(str(e), "GET_ORDER_ERROR", 500)
    
    async def get_recharge_orders(self, request: web.Request) -> web.Response:
        """獲取用戶充值訂單列表"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            if not user_id:
                return self._error_response("無法識別用戶", "INVALID_USER")
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 50)
            status = request.query.get('status')
            
            orders, total = self.recharge_service.get_user_orders(
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
            logger.error(f"Get recharge orders error: {e}")
            return self._error_response(str(e), "GET_ORDERS_ERROR", 500)
    
    async def mark_recharge_paid(self, request: web.Request) -> web.Response:
        """
        用戶確認已支付
        
        POST /api/wallet/recharge/{order_no}/paid
        {
            "tx_hash": "optional_usdt_tx_hash"
        }
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            order = self.recharge_service.get_order(order_no)
            
            if not order:
                return self._error_response("訂單不存在", "ORDER_NOT_FOUND", 404)
            
            if order.user_id != user_id:
                return self._error_response("無權操作此訂單", "FORBIDDEN", 403)
            
            data = await request.json() if request.body_exists else {}
            tx_hash = data.get('tx_hash', '')
            
            success, message = self.recharge_service.mark_paid(
                order_no,
                usdt_tx_hash=tx_hash
            )
            
            if success:
                return self._success_response({"order_no": order_no}, message)
            else:
                return self._error_response(message, "MARK_PAID_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Mark recharge paid error: {e}")
            return self._error_response(str(e), "MARK_PAID_ERROR", 500)
    
    async def cancel_recharge_order(self, request: web.Request) -> web.Response:
        """取消充值訂單"""
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            order = self.recharge_service.get_order(order_no)
            
            if not order:
                return self._error_response("訂單不存在", "ORDER_NOT_FOUND", 404)
            
            if order.user_id != user_id:
                return self._error_response("無權操作此訂單", "FORBIDDEN", 403)
            
            success, message = self.recharge_service.cancel_order(order_no, "用戶取消")
            
            if success:
                return self._success_response({"order_no": order_no}, message)
            else:
                return self._error_response(message, "CANCEL_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Cancel recharge order error: {e}")
            return self._error_response(str(e), "CANCEL_ERROR", 500)
    
    async def check_recharge_status(self, request: web.Request) -> web.Response:
        """
        檢查充值訂單狀態
        用於前端輪詢
        """
        try:
            user = self._require_auth(request)
            user_id = user.get('user_id') or user.get('sub') or user.get('id')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            order = self.recharge_service.get_order(order_no)
            
            if not order:
                return self._error_response("訂單不存在", "ORDER_NOT_FOUND", 404)
            
            if order.user_id != user_id:
                return self._error_response("無權訪問此訂單", "FORBIDDEN", 403)
            
            # 檢查是否已過期
            if order.status == RechargeStatus.PENDING.value and order.expired_at:
                expired_at = datetime.fromisoformat(order.expired_at.replace('Z', '+00:00'))
                if datetime.now(expired_at.tzinfo) > expired_at:
                    self.recharge_service.expire_orders()
                    order = self.recharge_service.get_order(order_no)
            
            return self._success_response({
                "order_no": order.order_no,
                "status": order.status,
                "is_confirmed": order.status == RechargeStatus.CONFIRMED.value,
                "is_pending": order.status in [RechargeStatus.PENDING.value, RechargeStatus.PAID.value],
                "is_expired": order.status == RechargeStatus.EXPIRED.value,
                "confirmed_at": order.confirmed_at,
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Check recharge status error: {e}")
            return self._error_response(str(e), "CHECK_STATUS_ERROR", 500)
    
    # ==================== 支付回調（公開）====================
    
    async def payment_callback(self, request: web.Request) -> web.Response:
        """
        第三方支付回調（公開端點，無需認證）
        
        POST /api/wallet/callback/{provider}
        """
        try:
            provider = request.match_info.get('provider', '')
            
            if provider in ['alipay', 'wechat', 'epay']:
                # 處理第三方支付回調
                data = await request.post() if request.content_type == 'application/x-www-form-urlencoded' else await request.json()
                
                # TODO: 驗證簽名
                # TODO: 處理回調邏輯
                
                logger.info(f"Payment callback from {provider}: {data}")
                
                return web.Response(text="success")
            
            return web.Response(text="unknown provider", status=400)
            
        except Exception as e:
            logger.error(f"Payment callback error: {e}")
            return web.Response(text="error", status=500)


# ==================== 路由設置 ====================

def setup_wallet_routes(app: web.Application):
    """設置錢包路由"""
    handlers = WalletHandlers()
    
    # 錢包信息
    app.router.add_get('/api/wallet', handlers.get_wallet)
    app.router.add_get('/api/wallet/balance', handlers.get_balance)
    app.router.add_get('/api/wallet/statistics', handlers.get_statistics)
    
    # 交易記錄
    app.router.add_get('/api/wallet/transactions', handlers.get_transactions)
    app.router.add_get('/api/wallet/transactions/recent', handlers.get_recent_transactions)
    app.router.add_get('/api/wallet/transactions/export', handlers.export_transactions)
    
    # 分析統計
    app.router.add_get('/api/wallet/analysis/consume', handlers.get_consume_analysis)
    app.router.add_get('/api/wallet/analysis/monthly', handlers.get_monthly_summary)
    
    # 充值套餐
    app.router.add_get('/api/wallet/packages', handlers.get_recharge_packages)
    
    # 消費接口
    app.router.add_post('/api/wallet/consume', handlers.consume)
    app.router.add_post('/api/wallet/check-balance', handlers.check_balance)
    
    # Phase 1: 充值訂單
    app.router.add_post('/api/wallet/recharge/create', handlers.create_recharge_order)
    app.router.add_get('/api/wallet/recharge/orders', handlers.get_recharge_orders)
    app.router.add_get('/api/wallet/recharge/{order_no}', handlers.get_recharge_order)
    app.router.add_post('/api/wallet/recharge/{order_no}/paid', handlers.mark_recharge_paid)
    app.router.add_post('/api/wallet/recharge/{order_no}/cancel', handlers.cancel_recharge_order)
    app.router.add_get('/api/wallet/recharge/{order_no}/status', handlers.check_recharge_status)
    
    # 支付回調（公開）
    app.router.add_post('/api/wallet/callback/{provider}', handlers.payment_callback)
    
    logger.info("✅ Wallet API routes registered (Phase 0 + Phase 1)")


# 全局處理器實例
wallet_handlers = WalletHandlers()

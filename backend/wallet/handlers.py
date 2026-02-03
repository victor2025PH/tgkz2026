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
from .models import ConsumeCategory, TransactionType

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class WalletHandlers:
    """錢包 API 處理器"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
        self.transaction_service = get_transaction_service()
    
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
    
    logger.info("✅ Wallet API routes registered")


# 全局處理器實例
wallet_handlers = WalletHandlers()

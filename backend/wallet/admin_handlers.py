"""
管理員錢包管理 API
Admin Wallet Management Handlers

提供管理員對用戶錢包的管理功能：
1. 查看用戶錢包列表
2. 手動調賬
3. 凍結/解凍錢包
4. 審核充值訂單
5. 統計報表
"""

import os
import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from aiohttp import web

from .wallet_service import get_wallet_service
from .recharge_service import get_recharge_service
from .transaction_service import get_transaction_service
from .scheduler import get_scheduler
from .models import WalletStatus, TransactionType

logger = logging.getLogger(__name__)

# JWT 配置（管理員使用不同的 secret）
ADMIN_JWT_SECRET = os.environ.get('ADMIN_JWT_SECRET', 'tgmatrix-admin-jwt-secret')
JWT_ALGORITHM = 'HS256'


class AdminWalletHandlers:
    """管理員錢包處理器"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
        self.recharge_service = get_recharge_service()
        self.transaction_service = get_transaction_service()
    
    def _verify_admin(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員身份"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            # 檢查是否是管理員
            if not payload.get('is_admin', False):
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _require_admin(self, request: web.Request) -> Dict:
        """要求管理員認證"""
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
    
    # ==================== 錢包管理 ====================
    
    async def list_wallets(self, request: web.Request) -> web.Response:
        """
        獲取用戶錢包列表
        
        GET /api/admin/wallets?page=1&page_size=20&status=active
        """
        try:
            self._require_admin(request)
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            status = request.query.get('status')
            search = request.query.get('search', '')
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                conditions = []
                params = []
                
                if status:
                    conditions.append("status = ?")
                    params.append(status)
                
                if search:
                    conditions.append("(user_id LIKE ? OR id LIKE ?)")
                    params.extend([f'%{search}%', f'%{search}%'])
                
                where_clause = " AND ".join(conditions) if conditions else "1=1"
                
                # 獲取總數
                cursor.execute(
                    f'SELECT COUNT(*) FROM user_wallets WHERE {where_clause}',
                    params
                )
                total = cursor.fetchone()[0]
                
                # 獲取分頁數據
                offset = (page - 1) * page_size
                cursor.execute(f'''
                    SELECT * FROM user_wallets 
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                ''', params + [page_size, offset])
                
                wallets = []
                for row in cursor.fetchall():
                    wallet_dict = dict(row)
                    wallet_dict['balance_display'] = f"${wallet_dict['balance'] / 100:.2f}"
                    wallet_dict['total_display'] = f"${(wallet_dict.get('total_recharged', 0) or 0) / 100:.2f}"
                    wallets.append(wallet_dict)
                
                return self._success_response({
                    "wallets": wallets,
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
            logger.error(f"List wallets error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def get_wallet_detail(self, request: web.Request) -> web.Response:
        """獲取用戶錢包詳情"""
        try:
            self._require_admin(request)
            
            user_id = request.match_info.get('user_id')
            if not user_id:
                return self._error_response("用戶ID不能為空", "MISSING_USER_ID")
            
            wallet = self.wallet_service.get_wallet(user_id)
            if not wallet:
                return self._error_response("錢包不存在", "WALLET_NOT_FOUND", 404)
            
            # 獲取最近交易
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    SELECT * FROM wallet_transactions
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 10
                ''', (user_id,))
                
                recent_transactions = [dict(row) for row in cursor.fetchall()]
                
                # 獲取統計
                stats = self.wallet_service.get_statistics(user_id)
                
                return self._success_response({
                    "wallet": wallet.to_dict(),
                    "recent_transactions": recent_transactions,
                    "statistics": stats
                })
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get wallet detail error: {e}")
            return self._error_response(str(e), "GET_DETAIL_ERROR", 500)
    
    async def adjust_balance(self, request: web.Request) -> web.Response:
        """
        手動調賬
        
        POST /api/admin/wallets/{user_id}/adjust
        {
            "amount": 1000,  // 正數加款，負數扣款
            "reason": "系統補償"
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            user_id = request.match_info.get('user_id')
            if not user_id:
                return self._error_response("用戶ID不能為空", "MISSING_USER_ID")
            
            data = await request.json()
            amount = data.get('amount')
            reason = data.get('reason', '')
            
            if amount is None or amount == 0:
                return self._error_response("調賬金額不能為0", "INVALID_AMOUNT")
            
            # 調賬
            if amount > 0:
                # 加款
                success, message, transaction = self.wallet_service.add_balance(
                    user_id=user_id,
                    amount=amount,
                    order_id=f"ADJUST_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    description=f"管理員調賬: {reason}",
                    reference_id=admin_id,
                    reference_type="admin_adjust"
                )
            else:
                # 扣款
                success, message, transaction = self.wallet_service.consume(
                    user_id=user_id,
                    amount=abs(amount),
                    category="adjust",
                    description=f"管理員調賬: {reason}",
                    order_id=f"ADJUST_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    reference_id=admin_id,
                    reference_type="admin_adjust"
                )
            
            if success:
                logger.info(
                    f"Admin {admin_id} adjusted balance for {user_id}: "
                    f"amount={amount}, reason={reason}"
                )
                
                return self._success_response({
                    "transaction_id": transaction.id if transaction else None,
                    "new_balance": self.wallet_service.get_wallet_balance(user_id)
                }, "調賬成功")
            else:
                return self._error_response(message, "ADJUST_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Adjust balance error: {e}")
            return self._error_response(str(e), "ADJUST_ERROR", 500)
    
    async def freeze_wallet(self, request: web.Request) -> web.Response:
        """凍結錢包"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            user_id = request.match_info.get('user_id')
            if not user_id:
                return self._error_response("用戶ID不能為空", "MISSING_USER_ID")
            
            data = await request.json()
            reason = data.get('reason', '')
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    UPDATE user_wallets SET
                        status = ?,
                        updated_at = ?
                    WHERE user_id = ?
                ''', (WalletStatus.FROZEN.value, datetime.now().isoformat(), user_id))
                
                if cursor.rowcount == 0:
                    return self._error_response("錢包不存在", "WALLET_NOT_FOUND", 404)
                
                conn.commit()
                
                logger.warning(
                    f"Admin {admin_id} froze wallet for {user_id}: {reason}"
                )
                
                return self._success_response(None, "錢包已凍結")
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Freeze wallet error: {e}")
            return self._error_response(str(e), "FREEZE_ERROR", 500)
    
    async def unfreeze_wallet(self, request: web.Request) -> web.Response:
        """解凍錢包"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            user_id = request.match_info.get('user_id')
            if not user_id:
                return self._error_response("用戶ID不能為空", "MISSING_USER_ID")
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    UPDATE user_wallets SET
                        status = ?,
                        updated_at = ?
                    WHERE user_id = ?
                ''', (WalletStatus.ACTIVE.value, datetime.now().isoformat(), user_id))
                
                if cursor.rowcount == 0:
                    return self._error_response("錢包不存在", "WALLET_NOT_FOUND", 404)
                
                conn.commit()
                
                logger.info(f"Admin {admin_id} unfroze wallet for {user_id}")
                
                return self._success_response(None, "錢包已解凍")
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Unfreeze wallet error: {e}")
            return self._error_response(str(e), "UNFREEZE_ERROR", 500)
    
    # ==================== 訂單管理 ====================
    
    async def list_orders(self, request: web.Request) -> web.Response:
        """
        獲取充值訂單列表
        
        GET /api/admin/orders?page=1&status=pending
        """
        try:
            self._require_admin(request)
            
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            status = request.query.get('status')
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                conditions = []
                params = []
                
                if status:
                    conditions.append("status = ?")
                    params.append(status)
                
                where_clause = " AND ".join(conditions) if conditions else "1=1"
                
                # 獲取總數
                cursor.execute(
                    f'SELECT COUNT(*) FROM recharge_orders WHERE {where_clause}',
                    params
                )
                total = cursor.fetchone()[0]
                
                # 獲取分頁數據
                offset = (page - 1) * page_size
                cursor.execute(f'''
                    SELECT * FROM recharge_orders 
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                ''', params + [page_size, offset])
                
                orders = []
                for row in cursor.fetchall():
                    order_dict = dict(row)
                    order_dict['amount_display'] = f"${order_dict['amount'] / 100:.2f}"
                    orders.append(order_dict)
                
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
            logger.error(f"List orders error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def confirm_order(self, request: web.Request) -> web.Response:
        """
        手動確認訂單
        
        POST /api/admin/orders/{order_no}/confirm
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id', 'admin')
            
            order_no = request.match_info.get('order_no')
            if not order_no:
                return self._error_response("訂單號不能為空", "MISSING_ORDER_NO")
            
            data = await request.json() if request.body_exists else {}
            tx_hash = data.get('tx_hash', '')
            
            success, message = self.recharge_service.confirm_order(
                order_no,
                usdt_tx_hash=tx_hash,
                operator_id=admin_id
            )
            
            if success:
                logger.info(f"Admin {admin_id} confirmed order {order_no}")
                return self._success_response(None, "訂單已確認")
            else:
                return self._error_response(message, "CONFIRM_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Confirm order error: {e}")
            return self._error_response(str(e), "CONFIRM_ERROR", 500)
    
    # ==================== 統計報表 ====================
    
    async def get_dashboard(self, request: web.Request) -> web.Response:
        """獲取儀表板數據"""
        try:
            self._require_admin(request)
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                # 今日統計
                today_start = datetime.now().replace(
                    hour=0, minute=0, second=0
                ).isoformat()
                
                # 今日充值
                cursor.execute('''
                    SELECT COUNT(*), COALESCE(SUM(actual_amount), 0)
                    FROM recharge_orders
                    WHERE status = 'confirmed' AND confirmed_at >= ?
                ''', (today_start,))
                today_recharge = cursor.fetchone()
                
                # 今日消費
                cursor.execute('''
                    SELECT COUNT(*), COALESCE(SUM(ABS(amount)), 0)
                    FROM wallet_transactions
                    WHERE type = 'consume' AND created_at >= ?
                ''', (today_start,))
                today_consume = cursor.fetchone()
                
                # 待處理訂單
                cursor.execute('''
                    SELECT COUNT(*) FROM recharge_orders
                    WHERE status IN ('pending', 'paid')
                ''')
                pending_orders = cursor.fetchone()[0]
                
                # 總餘額
                cursor.execute('''
                    SELECT COALESCE(SUM(balance + bonus_balance), 0)
                    FROM user_wallets WHERE status = 'active'
                ''')
                total_balance = cursor.fetchone()[0]
                
                # 活躍錢包數
                cursor.execute('''
                    SELECT COUNT(*) FROM user_wallets
                    WHERE status = 'active'
                ''')
                active_wallets = cursor.fetchone()[0]
                
                return self._success_response({
                    "today": {
                        "recharge_count": today_recharge[0],
                        "recharge_amount": today_recharge[1],
                        "recharge_display": f"${today_recharge[1] / 100:.2f}",
                        "consume_count": today_consume[0],
                        "consume_amount": today_consume[1],
                        "consume_display": f"${today_consume[1] / 100:.2f}",
                    },
                    "pending_orders": pending_orders,
                    "total_balance": total_balance,
                    "total_balance_display": f"${total_balance / 100:.2f}",
                    "active_wallets": active_wallets
                })
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get dashboard error: {e}")
            return self._error_response(str(e), "DASHBOARD_ERROR", 500)
    
    async def get_scheduler_status(self, request: web.Request) -> web.Response:
        """獲取調度器狀態"""
        try:
            self._require_admin(request)
            
            scheduler = get_scheduler()
            status = scheduler.get_task_status()
            
            return self._success_response({
                "scheduler_running": scheduler._running,
                "tasks": status
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get scheduler status error: {e}")
            return self._error_response(str(e), "STATUS_ERROR", 500)


# ==================== 路由設置 ====================

def setup_admin_wallet_routes(app: web.Application):
    """設置管理員錢包路由"""
    handlers = AdminWalletHandlers()
    
    # 錢包管理
    app.router.add_get('/api/admin/wallets', handlers.list_wallets)
    app.router.add_get('/api/admin/wallets/{user_id}', handlers.get_wallet_detail)
    app.router.add_post('/api/admin/wallets/{user_id}/adjust', handlers.adjust_balance)
    app.router.add_post('/api/admin/wallets/{user_id}/freeze', handlers.freeze_wallet)
    app.router.add_post('/api/admin/wallets/{user_id}/unfreeze', handlers.unfreeze_wallet)
    
    # 訂單管理
    app.router.add_get('/api/admin/orders', handlers.list_orders)
    app.router.add_post('/api/admin/orders/{order_no}/confirm', handlers.confirm_order)
    
    # 儀表板
    app.router.add_get('/api/admin/wallet/dashboard', handlers.get_dashboard)
    app.router.add_get('/api/admin/wallet/scheduler', handlers.get_scheduler_status)
    
    logger.info("✅ Admin Wallet API routes registered")


# 全局處理器實例
admin_wallet_handlers = AdminWalletHandlers()

"""
充值訂單服務
Recharge Order Service

處理充值訂單的創建、查詢、確認、過期等功能

優化設計：
1. 訂單狀態機管理
2. 支持多種支付方式
3. USDT 專用字段
4. 訂單過期自動處理
5. 充值成功後自動入賬
"""

import os
import time
import uuid
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass

from .models import (
    RechargeOrder, RechargeStatus, PaymentMethod, PaymentChannel,
    RechargePackage, DEFAULT_RECHARGE_PACKAGES
)
from .wallet_service import get_wallet_service

logger = logging.getLogger(__name__)


# 支付方式手續費率
PAYMENT_FEE_RATES = {
    PaymentMethod.USDT_TRC20.value: 0.0,     # 0%
    PaymentMethod.USDT_ERC20.value: 0.0,     # 0%
    PaymentMethod.ALIPAY.value: 0.02,        # 2%
    PaymentMethod.WECHAT.value: 0.02,        # 2%
    PaymentMethod.BANK.value: 0.01,          # 1%
    PaymentMethod.REDEEM.value: 0.0,         # 0%
}

# USDT 匯率（1 USDT = ? USD）
USDT_RATE = float(os.environ.get('USDT_RATE', '1.0'))

# 訂單過期時間（分鐘）
ORDER_EXPIRE_MINUTES = 30


class RechargeServiceError(Exception):
    """充值服務錯誤"""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class RechargeService:
    """充值服務（單例）"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.wallet_service = get_wallet_service()
        self._initialized = True
        logger.info("RechargeService initialized")
    
    def _get_connection(self):
        """獲取數據庫連接"""
        return self.wallet_service._get_connection()
    
    def _generate_order_no(self) -> str:
        """生成訂單號"""
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:8].upper()
        return f"RCH{timestamp}{random_part}"
    
    def _calculate_fee(self, amount: int, payment_method: str) -> int:
        """計算手續費"""
        rate = PAYMENT_FEE_RATES.get(payment_method, 0)
        return int(amount * rate)
    
    def _get_bonus_amount(self, amount: int) -> int:
        """根據金額獲取贈送金額"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT bonus_amount FROM recharge_packages
                WHERE amount = ? AND is_active = 1
            ''', (amount,))
            
            row = cursor.fetchone()
            if row:
                return row[0]
            
            # 自定義金額無贈送
            return 0
        finally:
            conn.close()
    
    # ==================== 創建訂單 ====================
    
    def create_order(
        self,
        user_id: str,
        amount: int,
        payment_method: str,
        payment_channel: str = "direct",
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[RechargeOrder]]:
        """
        創建充值訂單
        
        Args:
            user_id: 用戶ID
            amount: 充值金額（分）
            payment_method: 支付方式
            payment_channel: 支付渠道
            ip_address: 客戶端IP
            
        Returns:
            (success, message, order)
        """
        # 驗證金額
        if amount < 500:  # 最低 $5
            return False, "最低充值金額為 $5", None
        
        if amount > 100000:  # 最高 $1000
            return False, "單筆充值上限為 $1000", None
        
        # 驗證支付方式
        valid_methods = [m.value for m in PaymentMethod]
        if payment_method not in valid_methods:
            return False, "不支持的支付方式", None
        
        # 獲取或創建錢包
        wallet = self.wallet_service.get_or_create_wallet(user_id)
        
        # 計算金額
        bonus_amount = self._get_bonus_amount(amount)
        fee = self._calculate_fee(amount, payment_method)
        actual_amount = amount + bonus_amount - fee
        
        # 創建訂單
        order = RechargeOrder(
            order_no=self._generate_order_no(),
            user_id=user_id,
            wallet_id=wallet.id,
            amount=amount,
            bonus_amount=bonus_amount,
            fee=fee,
            actual_amount=actual_amount,
            payment_method=payment_method,
            payment_channel=payment_channel,
            status=RechargeStatus.PENDING.value,
            expired_at=(datetime.now() + timedelta(minutes=ORDER_EXPIRE_MINUTES)).isoformat()
        )
        
        # USDT 支付專用處理
        if payment_method in [PaymentMethod.USDT_TRC20.value, PaymentMethod.USDT_ERC20.value]:
            order = self._setup_usdt_order(order, payment_method)
        
        # 保存訂單
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO recharge_orders
                (id, order_no, user_id, wallet_id, amount, bonus_amount, fee,
                 actual_amount, payment_method, payment_channel, status,
                 usdt_network, usdt_address, usdt_amount, usdt_rate,
                 expired_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                order.id, order.order_no, order.user_id, order.wallet_id,
                order.amount, order.bonus_amount, order.fee, order.actual_amount,
                order.payment_method, order.payment_channel, order.status,
                order.usdt_network, order.usdt_address, order.usdt_amount, order.usdt_rate,
                order.expired_at, order.created_at, order.updated_at
            ))
            
            conn.commit()
            logger.info(f"Created recharge order: {order.order_no} for user {user_id}, amount: {amount}")
            
            return True, "訂單創建成功", order
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Create order error: {e}")
            return False, f"創建訂單失敗: {str(e)}", None
        finally:
            conn.close()
    
    def _setup_usdt_order(self, order: RechargeOrder, payment_method: str) -> RechargeOrder:
        """設置 USDT 訂單專用字段"""
        # 確定網絡
        if payment_method == PaymentMethod.USDT_TRC20.value:
            order.usdt_network = "TRC20"
            # TODO: 從地址池獲取或使用 HD 錢包派生
            order.usdt_address = os.environ.get(
                'USDT_TRC20_ADDRESS',
                'TYourTRC20WalletAddressHere'
            )
        else:
            order.usdt_network = "ERC20"
            order.usdt_address = os.environ.get(
                'USDT_ERC20_ADDRESS',
                '0xYourERC20WalletAddressHere'
            )
        
        # 計算 USDT 金額（根據匯率）
        usd_amount = order.amount / 100  # 分 -> 美元
        order.usdt_amount = round(usd_amount / USDT_RATE, 2)
        order.usdt_rate = USDT_RATE
        
        return order
    
    # ==================== 查詢訂單 ====================
    
    def get_order(self, order_no: str) -> Optional[RechargeOrder]:
        """獲取訂單"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM recharge_orders WHERE order_no = ?',
                (order_no,)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_order(dict(row))
        finally:
            conn.close()
    
    def get_order_by_id(self, order_id: str) -> Optional[RechargeOrder]:
        """根據ID獲取訂單"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM recharge_orders WHERE id = ?',
                (order_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_order(dict(row))
        finally:
            conn.close()
    
    def get_user_orders(
        self,
        user_id: str,
        status: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[RechargeOrder], int]:
        """獲取用戶訂單列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            where_clause = " AND ".join(conditions)
            
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
            
            orders = [self._row_to_order(dict(row)) for row in cursor.fetchall()]
            
            return orders, total
            
        finally:
            conn.close()
    
    def get_pending_usdt_orders(self) -> List[RechargeOrder]:
        """獲取待確認的 USDT 訂單（用於監聯）"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT * FROM recharge_orders
                WHERE status IN ('pending', 'paid')
                AND payment_method IN ('usdt_trc20', 'usdt_erc20')
                AND expired_at > ?
                ORDER BY created_at ASC
            ''', (datetime.now().isoformat(),))
            
            return [self._row_to_order(dict(row)) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def _row_to_order(self, row: Dict) -> RechargeOrder:
        """轉換數據庫行為訂單對象"""
        return RechargeOrder(
            id=row.get('id', ''),
            order_no=row.get('order_no', ''),
            user_id=row.get('user_id', ''),
            wallet_id=row.get('wallet_id', ''),
            amount=row.get('amount', 0),
            bonus_amount=row.get('bonus_amount', 0),
            fee=row.get('fee', 0),
            actual_amount=row.get('actual_amount', 0),
            payment_method=row.get('payment_method', ''),
            payment_channel=row.get('payment_channel', ''),
            status=row.get('status', ''),
            usdt_network=row.get('usdt_network', ''),
            usdt_address=row.get('usdt_address', ''),
            usdt_amount=row.get('usdt_amount', 0.0),
            usdt_rate=row.get('usdt_rate', 0.0),
            usdt_tx_hash=row.get('usdt_tx_hash', ''),
            external_order_id=row.get('external_order_id', ''),
            paid_at=row.get('paid_at', ''),
            confirmed_at=row.get('confirmed_at', ''),
            expired_at=row.get('expired_at', ''),
            created_at=row.get('created_at', ''),
            updated_at=row.get('updated_at', '')
        )
    
    # ==================== 更新訂單狀態 ====================
    
    def mark_paid(
        self,
        order_no: str,
        external_order_id: str = "",
        usdt_tx_hash: str = ""
    ) -> Tuple[bool, str]:
        """
        標記訂單已支付（待確認）
        用於用戶點擊"已完成支付"或支付網關回調
        """
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status not in [RechargeStatus.PENDING.value]:
            return False, f"訂單狀態不允許此操作: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            now = datetime.now().isoformat()
            
            cursor.execute('''
                UPDATE recharge_orders SET
                    status = ?,
                    external_order_id = ?,
                    usdt_tx_hash = ?,
                    paid_at = ?,
                    updated_at = ?
                WHERE order_no = ?
            ''', (
                RechargeStatus.PAID.value,
                external_order_id or order.external_order_id,
                usdt_tx_hash or order.usdt_tx_hash,
                now,
                now,
                order_no
            ))
            
            conn.commit()
            logger.info(f"Order {order_no} marked as paid")
            
            return True, "訂單已標記為已支付"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Mark paid error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def confirm_order(
        self,
        order_no: str,
        usdt_tx_hash: str = "",
        operator_id: str = ""
    ) -> Tuple[bool, str]:
        """
        確認訂單並入賬
        USDT 交易確認達到閾值後調用，或人工審核通過後調用
        """
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status not in [RechargeStatus.PENDING.value, RechargeStatus.PAID.value]:
            return False, f"訂單狀態不允許確認: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            
            # 更新訂單狀態
            now = datetime.now().isoformat()
            
            cursor.execute('''
                UPDATE recharge_orders SET
                    status = ?,
                    usdt_tx_hash = ?,
                    confirmed_at = ?,
                    updated_at = ?
                WHERE order_no = ? AND status IN ('pending', 'paid')
            ''', (
                RechargeStatus.CONFIRMED.value,
                usdt_tx_hash or order.usdt_tx_hash,
                now,
                now,
                order_no
            ))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "訂單狀態已變更，無法確認"
            
            conn.commit()
            
            # 為用戶錢包增加餘額
            success, message, transaction = self.wallet_service.add_balance(
                user_id=order.user_id,
                amount=order.amount,
                bonus_amount=order.bonus_amount,
                order_id=order.order_no,
                description=f"充值 ({order.payment_method})",
                payment_method=order.payment_method,
                reference_id=order.id,
                reference_type="recharge_order"
            )
            
            if not success:
                # 回滾訂單狀態
                cursor.execute('''
                    UPDATE recharge_orders SET status = 'paid', confirmed_at = NULL
                    WHERE order_no = ?
                ''', (order_no,))
                conn.commit()
                return False, f"入賬失敗: {message}"
            
            logger.info(f"Order {order_no} confirmed, amount: {order.actual_amount} cents credited")
            
            return True, "充值成功"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Confirm order error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def cancel_order(self, order_no: str, reason: str = "") -> Tuple[bool, str]:
        """取消訂單"""
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status not in [RechargeStatus.PENDING.value]:
            return False, f"訂單狀態不允許取消: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE recharge_orders SET
                    status = 'cancelled',
                    updated_at = ?
                WHERE order_no = ?
            ''', (datetime.now().isoformat(), order_no))
            
            conn.commit()
            logger.info(f"Order {order_no} cancelled: {reason}")
            
            return True, "訂單已取消"
            
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
    
    def expire_orders(self) -> int:
        """
        過期超時訂單
        應由定時任務調用
        
        Returns:
            過期的訂單數量
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            now = datetime.now().isoformat()
            
            cursor.execute('''
                UPDATE recharge_orders SET
                    status = 'expired',
                    updated_at = ?
                WHERE status = 'pending'
                AND expired_at < ?
            ''', (now, now))
            
            count = cursor.rowcount
            conn.commit()
            
            if count > 0:
                logger.info(f"Expired {count} pending orders")
            
            return count
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Expire orders error: {e}")
            return 0
        finally:
            conn.close()
    
    # ==================== 統計 ====================
    
    def get_today_recharge_stats(self) -> Dict[str, Any]:
        """獲取今日充值統計"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN actual_amount ELSE 0 END), 0) as confirmed_amount,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed_count,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count
                FROM recharge_orders
                WHERE created_at >= ?
            ''', (today_start,))
            
            row = cursor.fetchone()
            
            return {
                "total_orders": row[0] if row else 0,
                "confirmed_amount": row[1] if row else 0,
                "confirmed_amount_display": f"${(row[1] or 0) / 100:.2f}",
                "confirmed_count": row[2] if row else 0,
                "pending_count": row[3] if row else 0,
            }
            
        finally:
            conn.close()


# ==================== 全局實例 ====================

_recharge_service: Optional[RechargeService] = None


def get_recharge_service() -> RechargeService:
    """獲取充值服務實例"""
    global _recharge_service
    if _recharge_service is None:
        _recharge_service = RechargeService()
    return _recharge_service

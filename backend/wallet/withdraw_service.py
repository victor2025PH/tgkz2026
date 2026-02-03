"""
提現服務
Withdraw Service

處理用戶餘額提現：
1. 提現申請
2. 提現審核
3. 提現執行
4. 提現記錄

優化設計：
1. 提現需審核
2. 手續費計算
3. 最低/最高額度
4. 提現到 USDT 地址
"""

import os
import time
import uuid
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

from .wallet_service import get_wallet_service
from .models import WalletStatus

logger = logging.getLogger(__name__)


class WithdrawStatus(Enum):
    """提現狀態"""
    PENDING = "pending"           # 待審核
    APPROVED = "approved"         # 已批准
    PROCESSING = "processing"     # 處理中
    COMPLETED = "completed"       # 已完成
    REJECTED = "rejected"         # 已拒絕
    CANCELLED = "cancelled"       # 已取消


class WithdrawMethod(Enum):
    """提現方式"""
    USDT_TRC20 = "usdt_trc20"
    USDT_ERC20 = "usdt_erc20"
    BANK = "bank"


# 提現配置
WITHDRAW_CONFIG = {
    'min_amount': 1000,             # 最低提現 $10
    'max_amount': 100000,           # 單筆最高 $1000
    'daily_max': 500000,            # 每日最高 $5000
    'fee_rate': 0.02,               # 手續費率 2%
    'min_fee': 100,                 # 最低手續費 $1
    'free_monthly_count': 2,        # 每月免費提現次數
    'processing_time_hours': 24     # 預計處理時間
}


@dataclass
class WithdrawOrder:
    """提現訂單"""
    id: str = ""
    order_no: str = ""
    user_id: str = ""
    wallet_id: str = ""
    amount: int = 0                 # 提現金額
    fee: int = 0                    # 手續費
    actual_amount: int = 0          # 實際到賬
    method: str = ""                # 提現方式
    address: str = ""               # 提現地址
    status: str = "pending"
    tx_hash: str = ""               # 交易哈希
    reject_reason: str = ""
    reviewed_by: str = ""
    reviewed_at: str = ""
    completed_at: str = ""
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "order_no": self.order_no,
            "user_id": self.user_id,
            "wallet_id": self.wallet_id,
            "amount": self.amount,
            "amount_display": f"${self.amount / 100:.2f}",
            "fee": self.fee,
            "fee_display": f"${self.fee / 100:.2f}",
            "actual_amount": self.actual_amount,
            "actual_display": f"${self.actual_amount / 100:.2f}",
            "method": self.method,
            "address": self.address,
            "status": self.status,
            "tx_hash": self.tx_hash,
            "reject_reason": self.reject_reason,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at,
            "completed_at": self.completed_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class WithdrawService:
    """提現服務"""
    
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
        self._init_database()
        self._initialized = True
        logger.info("WithdrawService initialized")
    
    def _get_connection(self):
        return self.wallet_service._get_connection()
    
    def _init_database(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS withdraw_orders (
                    id TEXT PRIMARY KEY,
                    order_no TEXT UNIQUE NOT NULL,
                    user_id TEXT NOT NULL,
                    wallet_id TEXT NOT NULL,
                    amount INTEGER NOT NULL DEFAULT 0,
                    fee INTEGER NOT NULL DEFAULT 0,
                    actual_amount INTEGER NOT NULL DEFAULT 0,
                    method TEXT NOT NULL,
                    address TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    tx_hash TEXT,
                    reject_reason TEXT,
                    reviewed_by TEXT,
                    reviewed_at TEXT,
                    completed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_withdraw_user 
                ON withdraw_orders(user_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_withdraw_status 
                ON withdraw_orders(status)
            ''')
            
            conn.commit()
            logger.info("Withdraw tables initialized")
            
        except Exception as e:
            logger.error(f"Init withdraw database error: {e}")
        finally:
            conn.close()
    
    def _generate_order_no(self) -> str:
        """生成訂單號"""
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:8].upper()
        return f"WD{timestamp}{random_part}"
    
    def _calculate_fee(self, amount: int, user_id: str) -> int:
        """計算手續費"""
        # 檢查本月免費次數
        free_count = self._get_monthly_withdraw_count(user_id)
        
        if free_count < WITHDRAW_CONFIG['free_monthly_count']:
            return 0
        
        # 計算手續費
        fee = int(amount * WITHDRAW_CONFIG['fee_rate'])
        return max(fee, WITHDRAW_CONFIG['min_fee'])
    
    def _get_monthly_withdraw_count(self, user_id: str) -> int:
        """獲取本月提現次數"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            month_start = datetime.now().replace(
                day=1, hour=0, minute=0, second=0
            ).isoformat()
            
            cursor.execute('''
                SELECT COUNT(*) FROM withdraw_orders
                WHERE user_id = ?
                AND status IN ('completed', 'processing', 'approved')
                AND created_at >= ?
            ''', (user_id, month_start))
            
            return cursor.fetchone()[0]
        finally:
            conn.close()
    
    def _get_today_withdrawn(self, user_id: str) -> int:
        """獲取今日已提現金額"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            today_start = datetime.now().replace(
                hour=0, minute=0, second=0
            ).isoformat()
            
            cursor.execute('''
                SELECT COALESCE(SUM(amount), 0) FROM withdraw_orders
                WHERE user_id = ?
                AND status IN ('completed', 'processing', 'approved', 'pending')
                AND created_at >= ?
            ''', (user_id, today_start))
            
            return cursor.fetchone()[0]
        finally:
            conn.close()
    
    # ==================== 提現申請 ====================
    
    def create_withdraw(
        self,
        user_id: str,
        amount: int,
        method: str,
        address: str
    ) -> Tuple[bool, str, Optional[WithdrawOrder]]:
        """
        創建提現申請
        
        Args:
            user_id: 用戶ID
            amount: 提現金額（分）
            method: 提現方式
            address: 提現地址
            
        Returns:
            (success, message, order)
        """
        # 驗證金額
        if amount < WITHDRAW_CONFIG['min_amount']:
            min_display = f"${WITHDRAW_CONFIG['min_amount'] / 100:.2f}"
            return False, f"最低提現金額為 {min_display}", None
        
        if amount > WITHDRAW_CONFIG['max_amount']:
            max_display = f"${WITHDRAW_CONFIG['max_amount'] / 100:.2f}"
            return False, f"單筆提現上限為 {max_display}", None
        
        # 檢查每日限額
        today_withdrawn = self._get_today_withdrawn(user_id)
        if today_withdrawn + amount > WITHDRAW_CONFIG['daily_max']:
            remaining = WITHDRAW_CONFIG['daily_max'] - today_withdrawn
            return False, f"今日提現額度剩餘 ${remaining / 100:.2f}", None
        
        # 驗證提現方式
        valid_methods = [m.value for m in WithdrawMethod]
        if method not in valid_methods:
            return False, "不支持的提現方式", None
        
        # 驗證地址
        if not address:
            return False, "提現地址不能為空", None
        
        # 獲取錢包
        wallet = self.wallet_service.get_wallet(user_id)
        if not wallet:
            return False, "錢包不存在", None
        
        if wallet.status != WalletStatus.ACTIVE.value:
            return False, "錢包已凍結，無法提現", None
        
        # 檢查餘額（只能提現主餘額，不能提現贈送餘額）
        if wallet.balance < amount:
            return False, f"可提現餘額不足，當前可提現 ${wallet.balance / 100:.2f}", None
        
        # 計算手續費
        fee = self._calculate_fee(amount, user_id)
        actual_amount = amount - fee
        
        # 創建訂單
        order = WithdrawOrder(
            order_no=self._generate_order_no(),
            user_id=user_id,
            wallet_id=wallet.id,
            amount=amount,
            fee=fee,
            actual_amount=actual_amount,
            method=method,
            address=address,
            status=WithdrawStatus.PENDING.value
        )
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 凍結提現金額
            cursor.execute('BEGIN IMMEDIATE')
            
            cursor.execute('''
                UPDATE user_wallets SET
                    balance = balance - ?,
                    frozen_balance = frozen_balance + ?,
                    updated_at = ?
                WHERE user_id = ? AND balance >= ?
            ''', (amount, amount, datetime.now().isoformat(), user_id, amount))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "餘額不足", None
            
            # 保存訂單
            cursor.execute('''
                INSERT INTO withdraw_orders
                (id, order_no, user_id, wallet_id, amount, fee, actual_amount,
                 method, address, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                order.id, order.order_no, order.user_id, order.wallet_id,
                order.amount, order.fee, order.actual_amount,
                order.method, order.address, order.status,
                order.created_at, order.updated_at
            ))
            
            conn.commit()
            
            logger.info(
                f"Withdraw created: order={order.order_no}, "
                f"user={user_id}, amount={amount}"
            )
            
            return True, "提現申請已提交", order
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Create withdraw error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    # ==================== 訂單查詢 ====================
    
    def get_order(self, order_no: str) -> Optional[WithdrawOrder]:
        """獲取訂單"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM withdraw_orders WHERE order_no = ?',
                (order_no,)
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
    ) -> Tuple[List[WithdrawOrder], int]:
        """獲取用戶提現訂單"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            where_clause = " AND ".join(conditions)
            
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
            
            orders = [self._row_to_order(dict(row)) for row in cursor.fetchall()]
            
            return orders, total
            
        finally:
            conn.close()
    
    def _row_to_order(self, row: Dict) -> WithdrawOrder:
        """轉換數據庫行為訂單對象"""
        return WithdrawOrder(
            id=row.get('id', ''),
            order_no=row.get('order_no', ''),
            user_id=row.get('user_id', ''),
            wallet_id=row.get('wallet_id', ''),
            amount=row.get('amount', 0),
            fee=row.get('fee', 0),
            actual_amount=row.get('actual_amount', 0),
            method=row.get('method', ''),
            address=row.get('address', ''),
            status=row.get('status', ''),
            tx_hash=row.get('tx_hash', ''),
            reject_reason=row.get('reject_reason', ''),
            reviewed_by=row.get('reviewed_by', ''),
            reviewed_at=row.get('reviewed_at', ''),
            completed_at=row.get('completed_at', ''),
            created_at=row.get('created_at', ''),
            updated_at=row.get('updated_at', '')
        )
    
    # ==================== 訂單操作 ====================
    
    def cancel_withdraw(self, order_no: str, user_id: str) -> Tuple[bool, str]:
        """取消提現"""
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.user_id != user_id:
            return False, "無權操作此訂單"
        
        if order.status != WithdrawStatus.PENDING.value:
            return False, f"訂單狀態不允許取消: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            
            # 解凍金額
            cursor.execute('''
                UPDATE user_wallets SET
                    balance = balance + ?,
                    frozen_balance = frozen_balance - ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (order.amount, order.amount, datetime.now().isoformat(), user_id))
            
            # 更新訂單狀態
            cursor.execute('''
                UPDATE withdraw_orders SET
                    status = 'cancelled',
                    updated_at = ?
                WHERE order_no = ?
            ''', (datetime.now().isoformat(), order_no))
            
            conn.commit()
            
            logger.info(f"Withdraw cancelled: {order_no}")
            return True, "提現已取消"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Cancel withdraw error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def approve_withdraw(
        self, 
        order_no: str, 
        admin_id: str
    ) -> Tuple[bool, str]:
        """審核通過"""
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status != WithdrawStatus.PENDING.value:
            return False, f"訂單狀態不允許審核: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            now = datetime.now().isoformat()
            
            cursor.execute('''
                UPDATE withdraw_orders SET
                    status = 'approved',
                    reviewed_by = ?,
                    reviewed_at = ?,
                    updated_at = ?
                WHERE order_no = ?
            ''', (admin_id, now, now, order_no))
            
            conn.commit()
            
            logger.info(f"Withdraw approved: {order_no} by {admin_id}")
            return True, "提現已批准"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Approve withdraw error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def reject_withdraw(
        self, 
        order_no: str, 
        admin_id: str,
        reason: str
    ) -> Tuple[bool, str]:
        """審核拒絕"""
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status != WithdrawStatus.PENDING.value:
            return False, f"訂單狀態不允許拒絕: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            now = datetime.now().isoformat()
            
            # 解凍金額
            cursor.execute('''
                UPDATE user_wallets SET
                    balance = balance + ?,
                    frozen_balance = frozen_balance - ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (order.amount, order.amount, now, order.user_id))
            
            # 更新訂單狀態
            cursor.execute('''
                UPDATE withdraw_orders SET
                    status = 'rejected',
                    reject_reason = ?,
                    reviewed_by = ?,
                    reviewed_at = ?,
                    updated_at = ?
                WHERE order_no = ?
            ''', (reason, admin_id, now, now, order_no))
            
            conn.commit()
            
            logger.info(f"Withdraw rejected: {order_no} by {admin_id}, reason: {reason}")
            return True, "提現已拒絕"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Reject withdraw error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def complete_withdraw(
        self, 
        order_no: str,
        tx_hash: str = ""
    ) -> Tuple[bool, str]:
        """完成提現"""
        order = self.get_order(order_no)
        if not order:
            return False, "訂單不存在"
        
        if order.status not in [
            WithdrawStatus.APPROVED.value, 
            WithdrawStatus.PROCESSING.value
        ]:
            return False, f"訂單狀態不允許完成: {order.status}"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            now = datetime.now().isoformat()
            
            # 扣除凍結金額
            cursor.execute('''
                UPDATE user_wallets SET
                    frozen_balance = frozen_balance - ?,
                    total_withdrawn = total_withdrawn + ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (order.amount, order.amount, now, order.user_id))
            
            # 更新訂單狀態
            cursor.execute('''
                UPDATE withdraw_orders SET
                    status = 'completed',
                    tx_hash = ?,
                    completed_at = ?,
                    updated_at = ?
                WHERE order_no = ?
            ''', (tx_hash, now, now, order_no))
            
            conn.commit()
            
            logger.info(f"Withdraw completed: {order_no}, tx={tx_hash}")
            return True, "提現已完成"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Complete withdraw error: {e}")
            return False, str(e)
        finally:
            conn.close()


# ==================== 全局實例 ====================

_withdraw_service: Optional[WithdrawService] = None


def get_withdraw_service() -> WithdrawService:
    """獲取提現服務實例"""
    global _withdraw_service
    if _withdraw_service is None:
        _withdraw_service = WithdrawService()
    return _withdraw_service

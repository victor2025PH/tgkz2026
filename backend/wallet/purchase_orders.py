"""
購買訂單審計存儲（Purchase Order Audit Store）

背景：會員/配額/代理購買（business_integration.purchase）過去只在 wallet_transactions
留下一筆扣款流水，沒有「購買訂單」語義——客服無法對賬、退款無法追溯、客戶端重試
無冪等保護。本模組提供獨立的 purchase_orders 記錄。

🔴 設計原則：審計是「旁路」，絕不阻斷購買主流程。
所有寫入都由呼叫方用 try/except 包裹（見 business_integration 的 _safe_order），
審計表本身出任何問題都只記日誌，不影響扣款/履約/退款。

冪等：purchase_orders.idempotency_key 唯一（部分索引）。若客戶端傳入相同 key 且已有
completed 訂單，可在扣款前直接返回原結果，避免「重試導致重複扣款」。不傳 key 則行為
與過去完全一致（向後兼容）。

連接：統一經 core.db_utils.create_connection（見 .cursorrules 合法連接模塊），
與 wallet_transactions 同庫（tgmatrix.db），便於對賬關聯。
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from core.db_utils import create_connection

logger = logging.getLogger(__name__)


class PurchaseOrderStatus:
    PENDING = 'pending'       # 已建單，尚未扣款/履約完成
    COMPLETED = 'completed'   # 扣款+履約成功
    REFUNDED = 'refunded'     # 履約失敗已退款
    FAILED = 'failed'         # 扣款失敗（未扣或已回滾）
    REJECTED = 'rejected'     # fail-closed 拒絕（未扣款）


class PurchaseOrderStore:
    """purchase_orders 表的輕量存儲（單例）。"""

    _instance: Optional['PurchaseOrderStore'] = None
    _initialized = False

    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        self.db_path = db_path  # None → create_connection 用預設庫（tgmatrix.db）
        self._init_db()
        self._initialized = True

    def _conn(self):
        return create_connection(self.db_path)

    def _init_db(self):
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute('''
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    order_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    business_type TEXT NOT NULL,
                    item_id TEXT,
                    item_name TEXT,
                    amount INTEGER NOT NULL DEFAULT 0,
                    tier TEXT,
                    duration_days INTEGER,
                    status TEXT NOT NULL DEFAULT 'pending',
                    transaction_id TEXT,
                    idempotency_key TEXT,
                    activation_result TEXT,
                    error_message TEXT,
                    ip_address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
                )
            ''')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_purchase_orders_user ON purchase_orders(user_id)')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)')
            # 冪等鍵普通索引（加速查重）。刻意「不」設 UNIQUE：否則「首次失敗→同鍵重試」
            # 時 create_pending 會因鍵衝突被 INSERT OR IGNORE 丟棄，導致重試那筆審計缺失。
            # 冪等改由 find_completed_by_idempotency_key 做「同鍵已成功→返回原結果」的
            # 邏輯查重（見 purchase()）；扣款層 wallet_transactions.order_id UNIQUE 作第二道防線。
            cur.execute('CREATE INDEX IF NOT EXISTS idx_purchase_orders_idem ON purchase_orders(idempotency_key)')
            conn.commit()
        finally:
            conn.close()

    # ---------------- 寫入 ----------------

    def create_pending(
        self, order_id: str, user_id: str, business_type: str,
        item_id: str = '', item_name: str = '', amount: int = 0,
        tier: str = '', duration_days: int = 0,
        idempotency_key: Optional[str] = None, ip_address: str = ''
    ) -> None:
        conn = self._conn()
        try:
            conn.execute('''
                INSERT OR IGNORE INTO purchase_orders
                (order_id, user_id, business_type, item_id, item_name, amount,
                 tier, duration_days, status, idempotency_key, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                order_id, user_id, business_type, item_id, item_name, int(amount or 0),
                tier, int(duration_days or 0), PurchaseOrderStatus.PENDING,
                idempotency_key, ip_address, datetime.now().isoformat()
            ))
            conn.commit()
        finally:
            conn.close()

    def _update_status(self, order_id: str, status: str,
                       transaction_id: str = None, activation_result: Any = None,
                       error_message: str = None) -> None:
        conn = self._conn()
        try:
            sets = ['status = ?']
            params: List[Any] = [status]
            if transaction_id is not None:
                sets.append('transaction_id = ?')
                params.append(transaction_id)
            if activation_result is not None:
                sets.append('activation_result = ?')
                params.append(json.dumps(activation_result, ensure_ascii=False, default=str))
            if error_message is not None:
                sets.append('error_message = ?')
                params.append(error_message)
            if status in (PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.REFUNDED,
                          PurchaseOrderStatus.FAILED, PurchaseOrderStatus.REJECTED):
                sets.append('completed_at = ?')
                params.append(datetime.now().isoformat())
            params.append(order_id)
            conn.execute(f"UPDATE purchase_orders SET {', '.join(sets)} WHERE order_id = ?", params)
            conn.commit()
        finally:
            conn.close()

    def mark_completed(self, order_id: str, transaction_id: str = None, activation_result: Any = None) -> None:
        self._update_status(order_id, PurchaseOrderStatus.COMPLETED,
                            transaction_id=transaction_id, activation_result=activation_result)

    def mark_refunded(self, order_id: str, reason: str = '') -> None:
        self._update_status(order_id, PurchaseOrderStatus.REFUNDED, error_message=reason)

    def mark_failed(self, order_id: str, reason: str = '') -> None:
        self._update_status(order_id, PurchaseOrderStatus.FAILED, error_message=reason)

    def mark_rejected(self, order_id: str, reason: str = '') -> None:
        # rejected 表示未扣款；先建單再標記，或直接插入 rejected
        self._update_status(order_id, PurchaseOrderStatus.REJECTED, error_message=reason)

    # ---------------- 查詢 ----------------

    def get(self, order_id: str) -> Optional[Dict[str, Any]]:
        conn = self._conn()
        try:
            row = conn.execute('SELECT * FROM purchase_orders WHERE order_id = ?', (order_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def find_completed_by_idempotency_key(self, key: str) -> Optional[Dict[str, Any]]:
        """查已完成的同冪等鍵訂單（用於重試冪等；不傳 key 時不調用）。"""
        if not key:
            return None
        conn = self._conn()
        try:
            row = conn.execute(
                "SELECT * FROM purchase_orders WHERE idempotency_key = ? AND status = ? LIMIT 1",
                (key, PurchaseOrderStatus.COMPLETED)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def list_by_user(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        conn = self._conn()
        try:
            rows = conn.execute(
                'SELECT * FROM purchase_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                (user_id, limit, offset)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def list_all(self, status: str = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """管理端對賬用：按狀態列出全部購買訂單。"""
        conn = self._conn()
        try:
            if status:
                rows = conn.execute(
                    'SELECT * FROM purchase_orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                    (status, limit, offset)
                ).fetchall()
            else:
                rows = conn.execute(
                    'SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
                    (limit, offset)
                ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


_store: Optional[PurchaseOrderStore] = None


def get_purchase_order_store() -> PurchaseOrderStore:
    global _store
    if _store is None:
        _store = PurchaseOrderStore()
    return _store

"""
兌換碼服務
Redeem Code Service

功能：
1. 兌換碼生成（管理員）
2. 兌換碼驗證與使用
3. 兌換碼批量管理
4. 兌換記錄追蹤

優化設計：
1. 唯一性校驗
2. 時效性控制
3. 使用次數限制
4. 安全防刷
"""

import os
import time
import uuid
import secrets
import string
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

from .wallet_service import get_wallet_service
from .transaction_service import get_transaction_service
from .models import TransactionType

logger = logging.getLogger(__name__)


class RedeemCodeType(Enum):
    """兌換碼類型"""
    BALANCE = "balance"           # 餘額
    MEMBERSHIP = "membership"     # 會員時長
    QUOTA = "quota"               # 配額
    COUPON = "coupon"            # 優惠券


class RedeemCodeStatus(Enum):
    """兌換碼狀態"""
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    DISABLED = "disabled"


@dataclass
class RedeemCode:
    """兌換碼"""
    id: str = ""
    code: str = ""
    code_type: str = "balance"     # 類型
    amount: int = 0                # 金額（分）或數量
    bonus_amount: int = 0          # 贈送金額
    description: str = ""
    status: str = "active"
    max_uses: int = 1              # 最大使用次數
    used_count: int = 0            # 已使用次數
    expires_at: str = ""           # 過期時間
    created_by: str = ""           # 創建者
    batch_id: str = ""             # 批次ID
    metadata: str = "{}"           # 額外數據
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
            "code": self.code,
            "code_type": self.code_type,
            "amount": self.amount,
            "amount_display": f"${self.amount / 100:.2f}",
            "bonus_amount": self.bonus_amount,
            "description": self.description,
            "status": self.status,
            "max_uses": self.max_uses,
            "used_count": self.used_count,
            "remaining_uses": self.max_uses - self.used_count,
            "expires_at": self.expires_at,
            "created_by": self.created_by,
            "batch_id": self.batch_id,
            "created_at": self.created_at
        }


@dataclass
class RedeemRecord:
    """兌換記錄"""
    id: str = ""
    code_id: str = ""
    code: str = ""
    user_id: str = ""
    amount: int = 0
    bonus_amount: int = 0
    code_type: str = ""
    ip_address: str = ""
    created_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "code_id": self.code_id,
            "code": self.code,
            "user_id": self.user_id,
            "amount": self.amount,
            "amount_display": f"${self.amount / 100:.2f}",
            "bonus_amount": self.bonus_amount,
            "code_type": self.code_type,
            "created_at": self.created_at
        }


class RedeemService:
    """兌換碼服務"""
    
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
        self.transaction_service = get_transaction_service()
        self._init_database()
        self._initialized = True
        logger.info("RedeemService initialized")
    
    def _get_connection(self):
        return self.wallet_service._get_connection()
    
    def _init_database(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 兌換碼表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS redeem_codes (
                    id TEXT PRIMARY KEY,
                    code TEXT UNIQUE NOT NULL,
                    code_type TEXT NOT NULL DEFAULT 'balance',
                    amount INTEGER NOT NULL DEFAULT 0,
                    bonus_amount INTEGER NOT NULL DEFAULT 0,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    max_uses INTEGER NOT NULL DEFAULT 1,
                    used_count INTEGER NOT NULL DEFAULT 0,
                    expires_at TEXT,
                    created_by TEXT,
                    batch_id TEXT,
                    metadata TEXT DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_redeem_code 
                ON redeem_codes(code)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_redeem_status 
                ON redeem_codes(status)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_redeem_batch 
                ON redeem_codes(batch_id)
            ''')
            
            # 兌換記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS redeem_records (
                    id TEXT PRIMARY KEY,
                    code_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    amount INTEGER NOT NULL DEFAULT 0,
                    bonus_amount INTEGER NOT NULL DEFAULT 0,
                    code_type TEXT NOT NULL,
                    ip_address TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (code_id) REFERENCES redeem_codes(id)
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_redeem_record_user 
                ON redeem_records(user_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_redeem_record_code 
                ON redeem_records(code_id)
            ''')
            
            conn.commit()
            logger.info("Redeem tables initialized")
            
        except Exception as e:
            logger.error(f"Init redeem database error: {e}")
        finally:
            conn.close()
    
    # ==================== 生成兌換碼 ====================
    
    def _generate_code(self, prefix: str = "", length: int = 12) -> str:
        """生成唯一兌換碼"""
        chars = string.ascii_uppercase + string.digits
        chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
        
        code = ''.join(secrets.choice(chars) for _ in range(length))
        
        if prefix:
            code = f"{prefix}-{code}"
        
        return code
    
    def create_code(
        self,
        amount: int,
        code_type: str = "balance",
        bonus_amount: int = 0,
        description: str = "",
        max_uses: int = 1,
        expires_days: int = 30,
        created_by: str = "",
        prefix: str = "",
        batch_id: str = ""
    ) -> Tuple[bool, str, Optional[RedeemCode]]:
        """
        創建單個兌換碼
        """
        if amount <= 0:
            return False, "金額必須大於0", None
        
        # 生成唯一碼
        max_attempts = 10
        code = None
        
        for _ in range(max_attempts):
            candidate = self._generate_code(prefix)
            if not self.get_code_by_code(candidate):
                code = candidate
                break
        
        if not code:
            return False, "無法生成唯一兌換碼", None
        
        # 計算過期時間
        expires_at = ""
        if expires_days > 0:
            expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()
        
        redeem_code = RedeemCode(
            code=code,
            code_type=code_type,
            amount=amount,
            bonus_amount=bonus_amount,
            description=description,
            max_uses=max_uses,
            expires_at=expires_at,
            created_by=created_by,
            batch_id=batch_id or str(uuid.uuid4())[:8]
        )
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO redeem_codes
                (id, code, code_type, amount, bonus_amount, description,
                 status, max_uses, used_count, expires_at, created_by,
                 batch_id, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                redeem_code.id, redeem_code.code, redeem_code.code_type,
                redeem_code.amount, redeem_code.bonus_amount,
                redeem_code.description, redeem_code.status,
                redeem_code.max_uses, redeem_code.used_count,
                redeem_code.expires_at, redeem_code.created_by,
                redeem_code.batch_id, redeem_code.metadata,
                redeem_code.created_at, redeem_code.updated_at
            ))
            
            conn.commit()
            
            logger.info(f"Redeem code created: {code}")
            return True, "兌換碼創建成功", redeem_code
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Create redeem code error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    def batch_create_codes(
        self,
        count: int,
        amount: int,
        code_type: str = "balance",
        bonus_amount: int = 0,
        description: str = "",
        max_uses: int = 1,
        expires_days: int = 30,
        created_by: str = "",
        prefix: str = ""
    ) -> Tuple[bool, str, List[RedeemCode]]:
        """
        批量創建兌換碼
        """
        if count <= 0 or count > 1000:
            return False, "數量必須在 1-1000 之間", []
        
        batch_id = f"BATCH-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
        codes = []
        
        for _ in range(count):
            success, message, code = self.create_code(
                amount=amount,
                code_type=code_type,
                bonus_amount=bonus_amount,
                description=description,
                max_uses=max_uses,
                expires_days=expires_days,
                created_by=created_by,
                prefix=prefix,
                batch_id=batch_id
            )
            
            if success and code:
                codes.append(code)
        
        if len(codes) == count:
            return True, f"成功創建 {count} 個兌換碼", codes
        else:
            return True, f"創建了 {len(codes)}/{count} 個兌換碼", codes
    
    # ==================== 兌換碼使用 ====================
    
    def redeem(
        self,
        code: str,
        user_id: str,
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        使用兌換碼
        """
        code = code.strip().upper()
        
        if not code:
            return False, "兌換碼不能為空", None
        
        # 查找兌換碼
        redeem_code = self.get_code_by_code(code)
        
        if not redeem_code:
            return False, "兌換碼不存在", None
        
        # 檢查狀態
        if redeem_code.status == RedeemCodeStatus.DISABLED.value:
            return False, "兌換碼已禁用", None
        
        if redeem_code.status == RedeemCodeStatus.USED.value:
            return False, "兌換碼已使用完畢", None
        
        if redeem_code.status == RedeemCodeStatus.EXPIRED.value:
            return False, "兌換碼已過期", None
        
        # 檢查過期
        if redeem_code.expires_at:
            expires_dt = datetime.fromisoformat(redeem_code.expires_at)
            if datetime.now() > expires_dt:
                self._update_status(redeem_code.id, RedeemCodeStatus.EXPIRED.value)
                return False, "兌換碼已過期", None
        
        # 檢查使用次數
        if redeem_code.used_count >= redeem_code.max_uses:
            self._update_status(redeem_code.id, RedeemCodeStatus.USED.value)
            return False, "兌換碼已使用完畢", None
        
        # 檢查用戶是否已使用過（同一用戶只能用一次）
        if self._has_user_redeemed(redeem_code.id, user_id):
            return False, "您已使用過此兌換碼", None
        
        # 執行兌換
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            
            # 更新使用次數
            cursor.execute('''
                UPDATE redeem_codes SET
                    used_count = used_count + 1,
                    status = CASE 
                        WHEN used_count + 1 >= max_uses THEN 'used'
                        ELSE status
                    END,
                    updated_at = ?
                WHERE id = ? AND used_count < max_uses
            ''', (datetime.now().isoformat(), redeem_code.id))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "兌換失敗，請重試", None
            
            # 根據類型執行對應操作
            result_data = {}
            
            if redeem_code.code_type == RedeemCodeType.BALANCE.value:
                # 充值餘額
                total = redeem_code.amount + redeem_code.bonus_amount
                success, msg = self.wallet_service.add_balance(
                    user_id=user_id,
                    amount=redeem_code.amount,
                    bonus_amount=redeem_code.bonus_amount
                )
                
                if not success:
                    conn.rollback()
                    return False, f"充值失敗: {msg}", None
                
                # 記錄交易
                self.transaction_service.create_transaction(
                    user_id=user_id,
                    wallet_id=self.wallet_service.get_wallet(user_id).id,
                    amount=total,
                    trans_type=TransactionType.RECHARGE.value,
                    description=f"兌換碼充值: {code}",
                    reference_id=redeem_code.id,
                    reference_type="redeem_code"
                )
                
                result_data = {
                    "type": "balance",
                    "amount": redeem_code.amount,
                    "bonus_amount": redeem_code.bonus_amount,
                    "total": total
                }
            
            elif redeem_code.code_type == RedeemCodeType.MEMBERSHIP.value:
                # TODO: 會員時長
                result_data = {
                    "type": "membership",
                    "days": redeem_code.amount
                }
            
            elif redeem_code.code_type == RedeemCodeType.QUOTA.value:
                # TODO: 配額
                result_data = {
                    "type": "quota",
                    "amount": redeem_code.amount
                }
            
            # 記錄兌換
            record = RedeemRecord(
                code_id=redeem_code.id,
                code=code,
                user_id=user_id,
                amount=redeem_code.amount,
                bonus_amount=redeem_code.bonus_amount,
                code_type=redeem_code.code_type,
                ip_address=ip_address
            )
            
            cursor.execute('''
                INSERT INTO redeem_records
                (id, code_id, code, user_id, amount, bonus_amount,
                 code_type, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.id, record.code_id, record.code,
                record.user_id, record.amount, record.bonus_amount,
                record.code_type, record.ip_address, record.created_at
            ))
            
            conn.commit()
            
            logger.info(f"Code redeemed: {code} by user {user_id}")
            
            return True, "兌換成功", result_data
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Redeem error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    def _has_user_redeemed(self, code_id: str, user_id: str) -> bool:
        """檢查用戶是否已兌換過"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT 1 FROM redeem_records
                WHERE code_id = ? AND user_id = ?
                LIMIT 1
            ''', (code_id, user_id))
            
            return cursor.fetchone() is not None
        finally:
            conn.close()
    
    def _update_status(self, code_id: str, status: str):
        """更新狀態"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE redeem_codes SET status = ?, updated_at = ?
                WHERE id = ?
            ''', (status, datetime.now().isoformat(), code_id))
            conn.commit()
        finally:
            conn.close()
    
    # ==================== 查詢方法 ====================
    
    def get_code_by_code(self, code: str) -> Optional[RedeemCode]:
        """根據兌換碼查詢"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM redeem_codes WHERE code = ?',
                (code.upper(),)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_code(dict(row))
        finally:
            conn.close()
    
    def get_codes(
        self,
        status: str = None,
        batch_id: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[RedeemCode], int]:
        """獲取兌換碼列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = []
            params = []
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            if batch_id:
                conditions.append("batch_id = ?")
                params.append(batch_id)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            cursor.execute(
                f'SELECT COUNT(*) FROM redeem_codes WHERE {where_clause}',
                params
            )
            total = cursor.fetchone()[0]
            
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM redeem_codes 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            codes = [self._row_to_code(dict(row)) for row in cursor.fetchall()]
            
            return codes, total
            
        finally:
            conn.close()
    
    def get_user_records(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[RedeemRecord], int]:
        """獲取用戶兌換記錄"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT COUNT(*) FROM redeem_records WHERE user_id = ?',
                (user_id,)
            )
            total = cursor.fetchone()[0]
            
            offset = (page - 1) * page_size
            cursor.execute('''
                SELECT * FROM redeem_records 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (user_id, page_size, offset))
            
            records = [self._row_to_record(dict(row)) for row in cursor.fetchall()]
            
            return records, total
            
        finally:
            conn.close()
    
    def disable_code(self, code_id: str) -> Tuple[bool, str]:
        """禁用兌換碼"""
        self._update_status(code_id, RedeemCodeStatus.DISABLED.value)
        return True, "已禁用"
    
    def enable_code(self, code_id: str) -> Tuple[bool, str]:
        """啟用兌換碼"""
        self._update_status(code_id, RedeemCodeStatus.ACTIVE.value)
        return True, "已啟用"
    
    def _row_to_code(self, row: Dict) -> RedeemCode:
        return RedeemCode(
            id=row.get('id', ''),
            code=row.get('code', ''),
            code_type=row.get('code_type', 'balance'),
            amount=row.get('amount', 0),
            bonus_amount=row.get('bonus_amount', 0),
            description=row.get('description', ''),
            status=row.get('status', 'active'),
            max_uses=row.get('max_uses', 1),
            used_count=row.get('used_count', 0),
            expires_at=row.get('expires_at', ''),
            created_by=row.get('created_by', ''),
            batch_id=row.get('batch_id', ''),
            metadata=row.get('metadata', '{}'),
            created_at=row.get('created_at', ''),
            updated_at=row.get('updated_at', '')
        )
    
    def _row_to_record(self, row: Dict) -> RedeemRecord:
        return RedeemRecord(
            id=row.get('id', ''),
            code_id=row.get('code_id', ''),
            code=row.get('code', ''),
            user_id=row.get('user_id', ''),
            amount=row.get('amount', 0),
            bonus_amount=row.get('bonus_amount', 0),
            code_type=row.get('code_type', ''),
            ip_address=row.get('ip_address', ''),
            created_at=row.get('created_at', '')
        )


# ==================== 全局實例 ====================

_redeem_service: Optional[RedeemService] = None


def get_redeem_service() -> RedeemService:
    """獲取兌換碼服務實例"""
    global _redeem_service
    if _redeem_service is None:
        _redeem_service = RedeemService()
    return _redeem_service

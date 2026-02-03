"""
優惠券服務
Coupon Service

功能：
1. 優惠券創建與管理
2. 優惠券發放
3. 優惠券使用
4. 使用記錄

優惠券類型：
1. 滿減券
2. 折扣券
3. 免費試用券
"""

import os
import time
import uuid
import secrets
import string
import logging
import threading
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class CouponType(Enum):
    """優惠券類型"""
    DISCOUNT = "discount"           # 折扣券（百分比）
    FIXED = "fixed"                 # 滿減券（固定金額）
    FREE_TRIAL = "free_trial"       # 免費試用


class CouponStatus(Enum):
    """優惠券狀態"""
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    DISABLED = "disabled"


@dataclass
class CouponTemplate:
    """優惠券模板"""
    id: str = ""
    name: str = ""
    coupon_type: str = "discount"
    value: int = 0                 # 折扣值或減免金額
    min_amount: int = 0            # 最低消費
    max_discount: int = 0          # 最高優惠金額
    applicable_types: str = "[]"   # 適用業務類型
    description: str = ""
    valid_days: int = 30           # 有效天數
    total_count: int = 0           # 總發放量
    issued_count: int = 0          # 已發放量
    status: str = "active"
    created_by: str = ""
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
            "name": self.name,
            "coupon_type": self.coupon_type,
            "value": self.value,
            "value_display": self._format_value(),
            "min_amount": self.min_amount,
            "min_amount_display": f"${self.min_amount / 100:.2f}",
            "max_discount": self.max_discount,
            "applicable_types": json.loads(self.applicable_types) if self.applicable_types else [],
            "description": self.description,
            "valid_days": self.valid_days,
            "total_count": self.total_count,
            "issued_count": self.issued_count,
            "remaining_count": self.total_count - self.issued_count,
            "status": self.status,
            "created_at": self.created_at
        }
    
    def _format_value(self) -> str:
        if self.coupon_type == CouponType.DISCOUNT.value:
            return f"{self.value}% OFF"
        elif self.coupon_type == CouponType.FIXED.value:
            return f"${self.value / 100:.2f}"
        else:
            return "免費試用"


@dataclass
class UserCoupon:
    """用戶優惠券"""
    id: str = ""
    template_id: str = ""
    user_id: str = ""
    code: str = ""
    coupon_type: str = "discount"
    name: str = ""
    value: int = 0
    min_amount: int = 0
    max_discount: int = 0
    applicable_types: str = "[]"
    status: str = "active"
    used_at: str = ""
    used_order_id: str = ""
    expires_at: str = ""
    created_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        is_expired = False
        if self.expires_at:
            is_expired = datetime.now() > datetime.fromisoformat(self.expires_at)
        
        return {
            "id": self.id,
            "template_id": self.template_id,
            "code": self.code,
            "coupon_type": self.coupon_type,
            "name": self.name,
            "value": self.value,
            "value_display": self._format_value(),
            "min_amount": self.min_amount,
            "min_amount_display": f"${self.min_amount / 100:.2f}",
            "max_discount": self.max_discount,
            "applicable_types": json.loads(self.applicable_types) if self.applicable_types else [],
            "status": self.status,
            "is_expired": is_expired,
            "expires_at": self.expires_at,
            "created_at": self.created_at
        }
    
    def _format_value(self) -> str:
        if self.coupon_type == CouponType.DISCOUNT.value:
            return f"{self.value}% OFF"
        elif self.coupon_type == CouponType.FIXED.value:
            return f"${self.value / 100:.2f}"
        else:
            return "免費試用"


class CouponService:
    """優惠券服務"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        import sqlite3
        self.db_path = db_path or os.path.join(
            os.path.dirname(__file__), '..', 'data', 'wallet.db'
        )
        self._init_database()
        self._initialized = True
        logger.info("CouponService initialized")
    
    def _get_connection(self):
        import sqlite3
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_database(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 優惠券模板表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    coupon_type TEXT NOT NULL DEFAULT 'discount',
                    value INTEGER NOT NULL DEFAULT 0,
                    min_amount INTEGER NOT NULL DEFAULT 0,
                    max_discount INTEGER NOT NULL DEFAULT 0,
                    applicable_types TEXT DEFAULT '[]',
                    description TEXT,
                    valid_days INTEGER NOT NULL DEFAULT 30,
                    total_count INTEGER NOT NULL DEFAULT 0,
                    issued_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'active',
                    created_by TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # 用戶優惠券表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_coupons (
                    id TEXT PRIMARY KEY,
                    template_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    code TEXT UNIQUE NOT NULL,
                    coupon_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value INTEGER NOT NULL DEFAULT 0,
                    min_amount INTEGER NOT NULL DEFAULT 0,
                    max_discount INTEGER NOT NULL DEFAULT 0,
                    applicable_types TEXT DEFAULT '[]',
                    status TEXT NOT NULL DEFAULT 'active',
                    used_at TEXT,
                    used_order_id TEXT,
                    expires_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (template_id) REFERENCES coupon_templates(id)
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_coupon_user 
                ON user_coupons(user_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_coupon_status 
                ON user_coupons(status)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_coupon_code 
                ON user_coupons(code)
            ''')
            
            conn.commit()
            logger.info("Coupon tables initialized")
            
        except Exception as e:
            logger.error(f"Init coupon database error: {e}")
        finally:
            conn.close()
    
    def _generate_code(self) -> str:
        """生成優惠券碼"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(8))
    
    # ==================== 模板管理 ====================
    
    def create_template(
        self,
        name: str,
        coupon_type: str,
        value: int,
        min_amount: int = 0,
        max_discount: int = 0,
        applicable_types: List[str] = None,
        description: str = "",
        valid_days: int = 30,
        total_count: int = 0,
        created_by: str = ""
    ) -> Tuple[bool, str, Optional[CouponTemplate]]:
        """創建優惠券模板"""
        
        if not name:
            return False, "名稱不能為空", None
        
        if value <= 0:
            return False, "優惠值必須大於0", None
        
        template = CouponTemplate(
            name=name,
            coupon_type=coupon_type,
            value=value,
            min_amount=min_amount,
            max_discount=max_discount,
            applicable_types=json.dumps(applicable_types or []),
            description=description,
            valid_days=valid_days,
            total_count=total_count,
            created_by=created_by
        )
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO coupon_templates
                (id, name, coupon_type, value, min_amount, max_discount,
                 applicable_types, description, valid_days, total_count,
                 issued_count, status, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                template.id, template.name, template.coupon_type,
                template.value, template.min_amount, template.max_discount,
                template.applicable_types, template.description,
                template.valid_days, template.total_count,
                template.issued_count, template.status,
                template.created_by, template.created_at, template.updated_at
            ))
            
            conn.commit()
            
            logger.info(f"Coupon template created: {template.id}")
            return True, "創建成功", template
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Create coupon template error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    def get_templates(
        self,
        status: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[CouponTemplate], int]:
        """獲取模板列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = []
            params = []
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            cursor.execute(
                f'SELECT COUNT(*) FROM coupon_templates WHERE {where_clause}',
                params
            )
            total = cursor.fetchone()[0]
            
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM coupon_templates 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            templates = [self._row_to_template(dict(row)) for row in cursor.fetchall()]
            
            return templates, total
            
        finally:
            conn.close()
    
    # ==================== 優惠券發放 ====================
    
    def issue_coupon(
        self,
        template_id: str,
        user_id: str
    ) -> Tuple[bool, str, Optional[UserCoupon]]:
        """發放優惠券給用戶"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 獲取模板
            cursor.execute(
                'SELECT * FROM coupon_templates WHERE id = ?',
                (template_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return False, "優惠券模板不存在", None
            
            template = self._row_to_template(dict(row))
            
            if template.status != CouponStatus.ACTIVE.value:
                return False, "優惠券模板已禁用", None
            
            if template.total_count > 0 and template.issued_count >= template.total_count:
                return False, "優惠券已發放完畢", None
            
            # 檢查用戶是否已領取
            cursor.execute('''
                SELECT 1 FROM user_coupons
                WHERE template_id = ? AND user_id = ?
                LIMIT 1
            ''', (template_id, user_id))
            
            if cursor.fetchone():
                return False, "您已領取過此優惠券", None
            
            # 創建用戶優惠券
            expires_at = (
                datetime.now() + timedelta(days=template.valid_days)
            ).isoformat()
            
            coupon = UserCoupon(
                template_id=template_id,
                user_id=user_id,
                code=self._generate_code(),
                coupon_type=template.coupon_type,
                name=template.name,
                value=template.value,
                min_amount=template.min_amount,
                max_discount=template.max_discount,
                applicable_types=template.applicable_types,
                expires_at=expires_at
            )
            
            cursor.execute('BEGIN IMMEDIATE')
            
            # 更新模板已發放量
            cursor.execute('''
                UPDATE coupon_templates SET
                    issued_count = issued_count + 1,
                    updated_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), template_id))
            
            # 插入用戶優惠券
            cursor.execute('''
                INSERT INTO user_coupons
                (id, template_id, user_id, code, coupon_type, name,
                 value, min_amount, max_discount, applicable_types,
                 status, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                coupon.id, coupon.template_id, coupon.user_id,
                coupon.code, coupon.coupon_type, coupon.name,
                coupon.value, coupon.min_amount, coupon.max_discount,
                coupon.applicable_types, coupon.status,
                coupon.expires_at, coupon.created_at
            ))
            
            conn.commit()
            
            logger.info(f"Coupon issued: {coupon.code} to user {user_id}")
            return True, "領取成功", coupon
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Issue coupon error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    # ==================== 用戶優惠券 ====================
    
    def get_user_coupons(
        self,
        user_id: str,
        status: str = None,
        available_only: bool = False
    ) -> List[UserCoupon]:
        """獲取用戶優惠券列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            if available_only:
                conditions.append("status = 'active'")
                conditions.append("expires_at > ?")
                params.append(datetime.now().isoformat())
            
            where_clause = " AND ".join(conditions)
            
            cursor.execute(f'''
                SELECT * FROM user_coupons 
                WHERE {where_clause}
                ORDER BY created_at DESC
            ''', params)
            
            coupons = [self._row_to_coupon(dict(row)) for row in cursor.fetchall()]
            
            return coupons
            
        finally:
            conn.close()
    
    def get_applicable_coupons(
        self,
        user_id: str,
        business_type: str,
        amount: int
    ) -> List[UserCoupon]:
        """獲取適用的優惠券"""
        coupons = self.get_user_coupons(user_id, available_only=True)
        applicable = []
        
        for coupon in coupons:
            # 檢查最低消費
            if coupon.min_amount > 0 and amount < coupon.min_amount:
                continue
            
            # 檢查適用類型
            types = json.loads(coupon.applicable_types) if coupon.applicable_types else []
            if types and business_type not in types:
                continue
            
            applicable.append(coupon)
        
        # 按優惠力度排序
        applicable.sort(key=lambda c: self._calculate_discount(c, amount), reverse=True)
        
        return applicable
    
    def _calculate_discount(self, coupon: UserCoupon, amount: int) -> int:
        """計算優惠金額"""
        if coupon.coupon_type == CouponType.DISCOUNT.value:
            discount = int(amount * coupon.value / 100)
            if coupon.max_discount > 0:
                discount = min(discount, coupon.max_discount)
            return discount
        elif coupon.coupon_type == CouponType.FIXED.value:
            return coupon.value
        else:
            return amount
    
    def use_coupon(
        self,
        coupon_id: str,
        user_id: str,
        order_id: str,
        amount: int
    ) -> Tuple[bool, str, int]:
        """
        使用優惠券
        
        Returns:
            (success, message, discount_amount)
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT * FROM user_coupons WHERE id = ? AND user_id = ?',
                (coupon_id, user_id)
            )
            row = cursor.fetchone()
            
            if not row:
                return False, "優惠券不存在", 0
            
            coupon = self._row_to_coupon(dict(row))
            
            if coupon.status != CouponStatus.ACTIVE.value:
                return False, "優惠券已使用或已過期", 0
            
            if coupon.expires_at:
                if datetime.now() > datetime.fromisoformat(coupon.expires_at):
                    self._update_coupon_status(coupon_id, CouponStatus.EXPIRED.value)
                    return False, "優惠券已過期", 0
            
            if coupon.min_amount > 0 and amount < coupon.min_amount:
                return False, f"訂單金額需滿 ${coupon.min_amount/100:.2f}", 0
            
            # 計算優惠金額
            discount = self._calculate_discount(coupon, amount)
            
            # 更新狀態
            cursor.execute('''
                UPDATE user_coupons SET
                    status = 'used',
                    used_at = ?,
                    used_order_id = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), order_id, coupon_id))
            
            conn.commit()
            
            logger.info(f"Coupon used: {coupon.code}, discount: {discount}")
            return True, "優惠券已使用", discount
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Use coupon error: {e}")
            return False, str(e), 0
        finally:
            conn.close()
    
    def _update_coupon_status(self, coupon_id: str, status: str):
        """更新優惠券狀態"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'UPDATE user_coupons SET status = ? WHERE id = ?',
                (status, coupon_id)
            )
            conn.commit()
        finally:
            conn.close()
    
    def _row_to_template(self, row: Dict) -> CouponTemplate:
        return CouponTemplate(
            id=row.get('id', ''),
            name=row.get('name', ''),
            coupon_type=row.get('coupon_type', 'discount'),
            value=row.get('value', 0),
            min_amount=row.get('min_amount', 0),
            max_discount=row.get('max_discount', 0),
            applicable_types=row.get('applicable_types', '[]'),
            description=row.get('description', ''),
            valid_days=row.get('valid_days', 30),
            total_count=row.get('total_count', 0),
            issued_count=row.get('issued_count', 0),
            status=row.get('status', 'active'),
            created_by=row.get('created_by', ''),
            created_at=row.get('created_at', ''),
            updated_at=row.get('updated_at', '')
        )
    
    def _row_to_coupon(self, row: Dict) -> UserCoupon:
        return UserCoupon(
            id=row.get('id', ''),
            template_id=row.get('template_id', ''),
            user_id=row.get('user_id', ''),
            code=row.get('code', ''),
            coupon_type=row.get('coupon_type', 'discount'),
            name=row.get('name', ''),
            value=row.get('value', 0),
            min_amount=row.get('min_amount', 0),
            max_discount=row.get('max_discount', 0),
            applicable_types=row.get('applicable_types', '[]'),
            status=row.get('status', 'active'),
            used_at=row.get('used_at', ''),
            used_order_id=row.get('used_order_id', ''),
            expires_at=row.get('expires_at', ''),
            created_at=row.get('created_at', '')
        )


# ==================== 全局實例 ====================

_coupon_service: Optional[CouponService] = None


def get_coupon_service() -> CouponService:
    """獲取優惠券服務實例"""
    global _coupon_service
    if _coupon_service is None:
        _coupon_service = CouponService()
    return _coupon_service

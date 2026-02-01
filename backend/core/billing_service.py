"""
配額計費服務

功能：
1. 超額計費機制
2. 配額包購買
3. 自動降級提醒
4. 付費失敗配額凍結
5. 賬單生成
6. 退款配額回收
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import json

logger = logging.getLogger(__name__)


# ==================== 數據模型 ====================

class BillingType(str, Enum):
    SUBSCRIPTION = 'subscription'  # 訂閱費用
    OVERAGE = 'overage'            # 超額費用
    QUOTA_PACK = 'quota_pack'      # 配額包
    REFUND = 'refund'              # 退款


class BillStatus(str, Enum):
    PENDING = 'pending'
    PAID = 'paid'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    REFUNDED = 'refunded'


class QuotaPackType(str, Enum):
    MESSAGES = 'messages'
    AI_CALLS = 'ai_calls'
    ACCOUNTS = 'accounts'
    COMBO = 'combo'


@dataclass
class QuotaPack:
    """配額包定義"""
    id: str
    name: str
    type: QuotaPackType
    quotas: Dict[str, int]  # 配額類型 -> 數量
    price: int              # 分為單位
    validity_days: int      # 有效期天數
    featured: bool = False
    description: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['type'] = self.type.value
        return d


@dataclass
class OverageRate:
    """超額費率"""
    quota_type: str
    unit_price: int      # 每單位價格（分）
    unit_size: int       # 單位大小（如每 100 條消息）
    min_charge: int = 0  # 最低收費
    max_charge: int = 0  # 最高收費（0=無上限）


@dataclass
class BillingItem:
    """賬單項目"""
    id: str
    user_id: str
    billing_type: BillingType
    amount: int
    currency: str = 'CNY'
    description: str = ''
    quota_type: str = ''
    quantity: int = 0
    unit_price: int = 0
    period_start: str = ''
    period_end: str = ''
    status: BillStatus = BillStatus.PENDING
    metadata: Dict = field(default_factory=dict)
    created_at: str = ''
    paid_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['billing_type'] = self.billing_type.value
        d['status'] = self.status.value
        return d


@dataclass
class UserQuotaPackage:
    """用戶購買的配額包"""
    id: str
    user_id: str
    pack_id: str
    pack_name: str
    quotas: Dict[str, int]
    remaining: Dict[str, int]
    purchased_at: str
    expires_at: str
    is_active: bool = True
    
    def to_dict(self) -> dict:
        return asdict(self)


# ==================== 配額包定義 ====================

QUOTA_PACKS: Dict[str, QuotaPack] = {
    'msg_100': QuotaPack(
        id='msg_100',
        name='消息包 100',
        type=QuotaPackType.MESSAGES,
        quotas={'daily_messages': 100},
        price=500,  # ¥5
        validity_days=30,
        description='額外 100 條每日消息配額'
    ),
    'msg_500': QuotaPack(
        id='msg_500',
        name='消息包 500',
        type=QuotaPackType.MESSAGES,
        quotas={'daily_messages': 500},
        price=2000,  # ¥20
        validity_days=30,
        featured=True,
        description='額外 500 條每日消息配額'
    ),
    'msg_2000': QuotaPack(
        id='msg_2000',
        name='消息包 2000',
        type=QuotaPackType.MESSAGES,
        quotas={'daily_messages': 2000},
        price=6000,  # ¥60
        validity_days=30,
        description='額外 2000 條每日消息配額'
    ),
    'ai_50': QuotaPack(
        id='ai_50',
        name='AI 包 50',
        type=QuotaPackType.AI_CALLS,
        quotas={'ai_calls': 50},
        price=1000,  # ¥10
        validity_days=30,
        description='額外 50 次 AI 調用'
    ),
    'ai_200': QuotaPack(
        id='ai_200',
        name='AI 包 200',
        type=QuotaPackType.AI_CALLS,
        quotas={'ai_calls': 200},
        price=3000,  # ¥30
        validity_days=30,
        featured=True,
        description='額外 200 次 AI 調用'
    ),
    'combo_starter': QuotaPack(
        id='combo_starter',
        name='入門組合包',
        type=QuotaPackType.COMBO,
        quotas={'daily_messages': 200, 'ai_calls': 50},
        price=2000,  # ¥20
        validity_days=30,
        description='消息 200 + AI 50'
    ),
    'combo_pro': QuotaPack(
        id='combo_pro',
        name='專業組合包',
        type=QuotaPackType.COMBO,
        quotas={'daily_messages': 1000, 'ai_calls': 200, 'groups': 10},
        price=8000,  # ¥80
        validity_days=30,
        featured=True,
        description='消息 1000 + AI 200 + 群組 10'
    ),
    'account_5': QuotaPack(
        id='account_5',
        name='帳號擴展包',
        type=QuotaPackType.ACCOUNTS,
        quotas={'tg_accounts': 5},
        price=5000,  # ¥50
        validity_days=90,  # 有效期更長
        description='額外 5 個 TG 帳號'
    ),
}

# ==================== 超額費率 ====================

OVERAGE_RATES: Dict[str, OverageRate] = {
    'daily_messages': OverageRate(
        quota_type='daily_messages',
        unit_price=10,    # ¥0.1 / 10 條
        unit_size=10,
        min_charge=100,   # 最低 ¥1
        max_charge=10000  # 最高 ¥100
    ),
    'ai_calls': OverageRate(
        quota_type='ai_calls',
        unit_price=50,    # ¥0.5 / 次
        unit_size=1,
        min_charge=50,
        max_charge=5000   # 最高 ¥50
    ),
}


class BillingService:
    """
    配額計費服務
    
    功能：
    1. 超額計費 - 按使用量計算超額費用
    2. 配額包 - 購買額外配額
    3. 賬單管理 - 生成和管理賬單
    4. 降級處理 - 付費失敗後的處理
    """
    
    _instance: Optional['BillingService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        self._init_db()
        self._initialized = True
        logger.info("BillingService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 賬單項目表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS billing_items (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    billing_type TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT DEFAULT 'CNY',
                    description TEXT,
                    quota_type TEXT,
                    quantity INTEGER DEFAULT 0,
                    unit_price INTEGER DEFAULT 0,
                    period_start TEXT,
                    period_end TEXT,
                    status TEXT DEFAULT 'pending',
                    metadata TEXT,
                    created_at TEXT,
                    paid_at TEXT
                )
            ''')
            
            # 用戶配額包表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_quota_packages (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    pack_id TEXT NOT NULL,
                    pack_name TEXT,
                    quotas TEXT,
                    remaining TEXT,
                    purchased_at TEXT,
                    expires_at TEXT,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # 超額使用記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS overage_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    quota_type TEXT NOT NULL,
                    date TEXT NOT NULL,
                    base_limit INTEGER,
                    pack_bonus INTEGER DEFAULT 0,
                    actual_used INTEGER,
                    overage_amount INTEGER,
                    billed INTEGER DEFAULT 0,
                    bill_id TEXT,
                    created_at TEXT
                )
            ''')
            
            # 配額凍結表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS quota_freezes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL UNIQUE,
                    freeze_type TEXT,
                    reason TEXT,
                    frozen_at TEXT,
                    unfreeze_at TEXT,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_items(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_items(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packages_user ON user_quota_packages(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_overage_user ON overage_usage(user_id, date)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init billing DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 超額計費 ====================
    
    def calculate_overage(
        self, 
        user_id: str, 
        quota_type: str,
        used: int,
        base_limit: int,
        pack_bonus: int = 0
    ) -> Dict[str, Any]:
        """
        計算超額費用
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            used: 實際使用量
            base_limit: 基礎配額限制
            pack_bonus: 配額包加成
        
        Returns:
            超額信息
        """
        total_limit = base_limit + pack_bonus
        
        if used <= total_limit or total_limit == -1:
            return {
                'overage': 0,
                'charge': 0,
                'message': '未超額'
            }
        
        overage = used - total_limit
        
        rate = OVERAGE_RATES.get(quota_type)
        if not rate:
            return {
                'overage': overage,
                'charge': 0,
                'message': f'{quota_type} 無超額費率配置'
            }
        
        # 計算費用
        units = (overage + rate.unit_size - 1) // rate.unit_size
        charge = units * rate.unit_price
        
        # 應用最低/最高限制
        if rate.min_charge and charge < rate.min_charge:
            charge = rate.min_charge
        if rate.max_charge and charge > rate.max_charge:
            charge = rate.max_charge
        
        return {
            'overage': overage,
            'units': units,
            'unit_price': rate.unit_price,
            'unit_size': rate.unit_size,
            'charge': charge,
            'charge_display': f'¥{charge / 100:.2f}',
            'message': f'超額 {overage}，費用 ¥{charge / 100:.2f}'
        }
    
    def record_overage(
        self,
        user_id: str,
        quota_type: str,
        date_str: str,
        base_limit: int,
        pack_bonus: int,
        actual_used: int,
        overage_amount: int
    ) -> bool:
        """記錄超額使用"""
        try:
            db = self._get_db()
            db.execute('''
                INSERT OR REPLACE INTO overage_usage
                (user_id, quota_type, date, base_limit, pack_bonus, actual_used, overage_amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, quota_type, date_str, base_limit, pack_bonus,
                actual_used, overage_amount, datetime.utcnow().isoformat()
            ))
            db.commit()
            db.close()
            return True
        except Exception as e:
            logger.error(f"Record overage error: {e}")
            return False
    
    def generate_overage_bill(self, user_id: str, period_start: str, period_end: str) -> Optional[BillingItem]:
        """為用戶生成超額賬單"""
        try:
            db = self._get_db()
            
            # 查詢未計費的超額記錄
            rows = db.execute('''
                SELECT quota_type, SUM(overage_amount) as total_overage
                FROM overage_usage
                WHERE user_id = ? AND date BETWEEN ? AND ? AND billed = 0
                GROUP BY quota_type
            ''', (user_id, period_start, period_end)).fetchall()
            
            if not rows:
                db.close()
                return None
            
            total_charge = 0
            items = []
            
            for row in rows:
                qt = row['quota_type']
                overage = row['total_overage']
                
                calc = self.calculate_overage(user_id, qt, overage, 0, 0)
                charge = calc.get('charge', 0)
                total_charge += charge
                items.append({
                    'quota_type': qt,
                    'overage': overage,
                    'charge': charge
                })
            
            if total_charge == 0:
                db.close()
                return None
            
            # 創建賬單
            bill_id = f"bill_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            bill = BillingItem(
                id=bill_id,
                user_id=user_id,
                billing_type=BillingType.OVERAGE,
                amount=total_charge,
                description=f'超額費用（{period_start} 至 {period_end}）',
                period_start=period_start,
                period_end=period_end,
                metadata={'items': items},
                created_at=datetime.utcnow().isoformat()
            )
            
            # 保存賬單
            db.execute('''
                INSERT INTO billing_items 
                (id, user_id, billing_type, amount, currency, description, 
                 period_start, period_end, status, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                bill.id, bill.user_id, bill.billing_type.value, bill.amount,
                bill.currency, bill.description, bill.period_start, bill.period_end,
                bill.status.value, json.dumps(bill.metadata), bill.created_at
            ))
            
            # 標記超額記錄為已計費
            db.execute('''
                UPDATE overage_usage SET billed = 1, bill_id = ?
                WHERE user_id = ? AND date BETWEEN ? AND ? AND billed = 0
            ''', (bill_id, user_id, period_start, period_end))
            
            db.commit()
            db.close()
            
            logger.info(f"Generated overage bill {bill_id} for user {user_id}, amount: {total_charge}")
            return bill
            
        except Exception as e:
            logger.error(f"Generate overage bill error: {e}")
            return None
    
    # ==================== 配額包管理 ====================
    
    def get_available_packs(self, user_tier: str = None) -> List[QuotaPack]:
        """獲取可購買的配額包"""
        packs = list(QUOTA_PACKS.values())
        
        # 可以根據用戶等級過濾
        # 例如：免費用戶不能購買帳號擴展包
        if user_tier == 'bronze':
            packs = [p for p in packs if p.type != QuotaPackType.ACCOUNTS]
        
        return packs
    
    def purchase_pack(
        self,
        user_id: str,
        pack_id: str,
        payment_method: str = 'balance'
    ) -> Dict[str, Any]:
        """購買配額包"""
        pack = QUOTA_PACKS.get(pack_id)
        if not pack:
            return {'success': False, 'error': '配額包不存在'}
        
        try:
            db = self._get_db()
            now = datetime.utcnow()
            expires_at = now + timedelta(days=pack.validity_days)
            
            # 創建購買記錄
            package_id = f"pkg_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            
            db.execute('''
                INSERT INTO user_quota_packages
                (id, user_id, pack_id, pack_name, quotas, remaining, purchased_at, expires_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (
                package_id, user_id, pack_id, pack.name,
                json.dumps(pack.quotas), json.dumps(pack.quotas),
                now.isoformat(), expires_at.isoformat()
            ))
            
            # 創建賬單
            bill_id = f"bill_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO billing_items
                (id, user_id, billing_type, amount, description, status, metadata, created_at, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                bill_id, user_id, BillingType.QUOTA_PACK.value, pack.price,
                f'購買配額包：{pack.name}', BillStatus.PAID.value,
                json.dumps({'pack_id': pack_id, 'package_id': package_id}),
                now.isoformat(), now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            logger.info(f"User {user_id} purchased pack {pack_id}")
            
            return {
                'success': True,
                'package_id': package_id,
                'pack': pack.to_dict(),
                'expires_at': expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Purchase pack error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_user_packages(self, user_id: str, active_only: bool = True) -> List[UserQuotaPackage]:
        """獲取用戶的配額包"""
        try:
            db = self._get_db()
            
            query = 'SELECT * FROM user_quota_packages WHERE user_id = ?'
            if active_only:
                query += ' AND is_active = 1 AND expires_at > ?'
                rows = db.execute(query, (user_id, datetime.utcnow().isoformat())).fetchall()
            else:
                rows = db.execute(query, (user_id,)).fetchall()
            
            db.close()
            
            packages = []
            for row in rows:
                packages.append(UserQuotaPackage(
                    id=row['id'],
                    user_id=row['user_id'],
                    pack_id=row['pack_id'],
                    pack_name=row['pack_name'],
                    quotas=json.loads(row['quotas']) if row['quotas'] else {},
                    remaining=json.loads(row['remaining']) if row['remaining'] else {},
                    purchased_at=row['purchased_at'],
                    expires_at=row['expires_at'],
                    is_active=bool(row['is_active'])
                ))
            
            return packages
            
        except Exception as e:
            logger.error(f"Get user packages error: {e}")
            return []
    
    def consume_pack_quota(
        self,
        user_id: str,
        quota_type: str,
        amount: int
    ) -> Dict[str, Any]:
        """從配額包消耗配額"""
        try:
            packages = self.get_user_packages(user_id, active_only=True)
            
            # 按過期時間排序，優先消耗快過期的
            packages.sort(key=lambda p: p.expires_at)
            
            consumed = 0
            consumed_from = []
            
            for pkg in packages:
                if quota_type not in pkg.remaining:
                    continue
                
                available = pkg.remaining[quota_type]
                if available <= 0:
                    continue
                
                take = min(available, amount - consumed)
                pkg.remaining[quota_type] -= take
                consumed += take
                consumed_from.append({'package_id': pkg.id, 'consumed': take})
                
                # 更新數據庫
                db = self._get_db()
                db.execute('''
                    UPDATE user_quota_packages SET remaining = ?
                    WHERE id = ?
                ''', (json.dumps(pkg.remaining), pkg.id))
                db.commit()
                db.close()
                
                if consumed >= amount:
                    break
            
            return {
                'requested': amount,
                'consumed': consumed,
                'remaining': amount - consumed,
                'consumed_from': consumed_from
            }
            
        except Exception as e:
            logger.error(f"Consume pack quota error: {e}")
            return {'requested': amount, 'consumed': 0, 'remaining': amount}
    
    def get_pack_bonus(self, user_id: str, quota_type: str) -> int:
        """獲取用戶的配額包加成"""
        packages = self.get_user_packages(user_id, active_only=True)
        
        total_bonus = 0
        for pkg in packages:
            if quota_type in pkg.remaining:
                total_bonus += pkg.remaining[quota_type]
        
        return total_bonus
    
    # ==================== 配額凍結 ====================
    
    def freeze_quota(
        self,
        user_id: str,
        freeze_type: str = 'payment_failed',
        reason: str = '',
        duration_hours: int = 24
    ) -> bool:
        """凍結用戶配額"""
        try:
            db = self._get_db()
            now = datetime.utcnow()
            unfreeze_at = now + timedelta(hours=duration_hours)
            
            db.execute('''
                INSERT OR REPLACE INTO quota_freezes
                (user_id, freeze_type, reason, frozen_at, unfreeze_at, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            ''', (user_id, freeze_type, reason, now.isoformat(), unfreeze_at.isoformat()))
            
            db.commit()
            db.close()
            
            logger.warning(f"Quota frozen for user {user_id}: {reason}")
            
            # 發送通知
            self._send_freeze_notification(user_id, freeze_type, reason, unfreeze_at)
            
            return True
            
        except Exception as e:
            logger.error(f"Freeze quota error: {e}")
            return False
    
    def unfreeze_quota(self, user_id: str) -> bool:
        """解凍用戶配額"""
        try:
            db = self._get_db()
            db.execute('''
                UPDATE quota_freezes SET is_active = 0
                WHERE user_id = ? AND is_active = 1
            ''', (user_id,))
            db.commit()
            db.close()
            
            logger.info(f"Quota unfrozen for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Unfreeze quota error: {e}")
            return False
    
    def is_quota_frozen(self, user_id: str) -> Dict[str, Any]:
        """檢查用戶配額是否被凍結"""
        try:
            db = self._get_db()
            row = db.execute('''
                SELECT * FROM quota_freezes
                WHERE user_id = ? AND is_active = 1 AND unfreeze_at > ?
            ''', (user_id, datetime.utcnow().isoformat())).fetchone()
            db.close()
            
            if row:
                return {
                    'frozen': True,
                    'freeze_type': row['freeze_type'],
                    'reason': row['reason'],
                    'frozen_at': row['frozen_at'],
                    'unfreeze_at': row['unfreeze_at']
                }
            
            return {'frozen': False}
            
        except Exception as e:
            logger.error(f"Check quota frozen error: {e}")
            return {'frozen': False}
    
    def _send_freeze_notification(
        self,
        user_id: str,
        freeze_type: str,
        reason: str,
        unfreeze_at: datetime
    ):
        """發送凍結通知"""
        try:
            from .realtime import notify_user
            
            notify_user(user_id, 'quota_frozen', {
                'freeze_type': freeze_type,
                'reason': reason,
                'unfreeze_at': unfreeze_at.isoformat(),
                'message': f'您的配額已被凍結：{reason}'
            })
        except Exception as e:
            logger.warning(f"Send freeze notification error: {e}")
    
    # ==================== 賬單管理 ====================
    
    def get_user_bills(
        self,
        user_id: str,
        status: str = None,
        billing_type: str = None,
        limit: int = 50
    ) -> List[BillingItem]:
        """獲取用戶賬單"""
        try:
            db = self._get_db()
            
            query = 'SELECT * FROM billing_items WHERE user_id = ?'
            params = [user_id]
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            if billing_type:
                query += ' AND billing_type = ?'
                params.append(billing_type)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = db.execute(query, params).fetchall()
            db.close()
            
            bills = []
            for row in rows:
                bills.append(BillingItem(
                    id=row['id'],
                    user_id=row['user_id'],
                    billing_type=BillingType(row['billing_type']),
                    amount=row['amount'],
                    currency=row['currency'] or 'CNY',
                    description=row['description'] or '',
                    quota_type=row['quota_type'] or '',
                    quantity=row['quantity'] or 0,
                    unit_price=row['unit_price'] or 0,
                    period_start=row['period_start'] or '',
                    period_end=row['period_end'] or '',
                    status=BillStatus(row['status']),
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    created_at=row['created_at'] or '',
                    paid_at=row['paid_at'] or ''
                ))
            
            return bills
            
        except Exception as e:
            logger.error(f"Get user bills error: {e}")
            return []
    
    def pay_bill(self, bill_id: str, payment_method: str = 'balance') -> Dict[str, Any]:
        """支付賬單"""
        try:
            db = self._get_db()
            
            row = db.execute(
                'SELECT * FROM billing_items WHERE id = ?', 
                (bill_id,)
            ).fetchone()
            
            if not row:
                db.close()
                return {'success': False, 'error': '賬單不存在'}
            
            if row['status'] == BillStatus.PAID.value:
                db.close()
                return {'success': False, 'error': '賬單已支付'}
            
            # TODO: 實際支付邏輯
            
            db.execute('''
                UPDATE billing_items SET status = ?, paid_at = ?
                WHERE id = ?
            ''', (BillStatus.PAID.value, datetime.utcnow().isoformat(), bill_id))
            
            # 解凍配額（如果之前因欠費凍結）
            user_id = row['user_id']
            freeze_info = self.is_quota_frozen(user_id)
            if freeze_info.get('frozen') and freeze_info.get('freeze_type') == 'payment_failed':
                self.unfreeze_quota(user_id)
            
            db.commit()
            db.close()
            
            logger.info(f"Bill {bill_id} paid")
            return {'success': True, 'bill_id': bill_id}
            
        except Exception as e:
            logger.error(f"Pay bill error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 退款處理 ====================
    
    def process_refund(
        self,
        user_id: str,
        original_bill_id: str,
        refund_amount: int,
        reason: str = ''
    ) -> Dict[str, Any]:
        """處理退款"""
        try:
            db = self._get_db()
            
            # 獲取原賬單
            original = db.execute(
                'SELECT * FROM billing_items WHERE id = ?',
                (original_bill_id,)
            ).fetchone()
            
            if not original:
                db.close()
                return {'success': False, 'error': '原賬單不存在'}
            
            # 創建退款賬單
            now = datetime.utcnow()
            refund_id = f"refund_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            
            db.execute('''
                INSERT INTO billing_items
                (id, user_id, billing_type, amount, description, status, metadata, created_at, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                refund_id, user_id, BillingType.REFUND.value, -refund_amount,
                f'退款：{reason}', BillStatus.PAID.value,
                json.dumps({'original_bill_id': original_bill_id, 'reason': reason}),
                now.isoformat(), now.isoformat()
            ))
            
            # 如果是配額包退款，回收配額
            if original['billing_type'] == BillingType.QUOTA_PACK.value:
                metadata = json.loads(original['metadata']) if original['metadata'] else {}
                package_id = metadata.get('package_id')
                
                if package_id:
                    db.execute('''
                        UPDATE user_quota_packages SET is_active = 0
                        WHERE id = ?
                    ''', (package_id,))
                    logger.info(f"Revoked quota package {package_id} due to refund")
            
            # 更新原賬單狀態
            db.execute('''
                UPDATE billing_items SET status = ?
                WHERE id = ?
            ''', (BillStatus.REFUNDED.value, original_bill_id))
            
            db.commit()
            db.close()
            
            logger.info(f"Processed refund {refund_id} for bill {original_bill_id}")
            
            return {
                'success': True,
                'refund_id': refund_id,
                'amount': refund_amount
            }
            
        except Exception as e:
            logger.error(f"Process refund error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 降級提醒 ====================
    
    def check_subscription_expiry(self, user_id: str) -> Dict[str, Any]:
        """檢查訂閱到期情況"""
        try:
            from .payment_service import get_payment_service
            payment = get_payment_service()
            
            subscription = payment.get_subscription(user_id)
            if not subscription:
                return {'expiring': False, 'expired': False}
            
            now = datetime.utcnow()
            end_date = datetime.fromisoformat(subscription.current_period_end.replace('Z', ''))
            
            days_remaining = (end_date - now).days
            
            if days_remaining < 0:
                return {
                    'expiring': False,
                    'expired': True,
                    'days': days_remaining,
                    'current_tier': subscription.plan_id,
                    'message': '訂閱已過期，將降級為免費版'
                }
            elif days_remaining <= 7:
                return {
                    'expiring': True,
                    'expired': False,
                    'days': days_remaining,
                    'current_tier': subscription.plan_id,
                    'renew_date': end_date.isoformat(),
                    'message': f'訂閱將在 {days_remaining} 天後到期'
                }
            
            return {'expiring': False, 'expired': False, 'days': days_remaining}
            
        except Exception as e:
            logger.error(f"Check subscription expiry error: {e}")
            return {'expiring': False, 'expired': False}
    
    def send_expiry_reminder(self, user_id: str, days_remaining: int):
        """發送到期提醒"""
        try:
            from .email_service import get_email_service
            from .realtime import notify_user
            
            email_service = get_email_service()
            
            # 發送郵件
            # email_service.send_expiry_reminder(user_id, days_remaining)
            
            # 發送應用內通知
            notify_user(user_id, 'subscription_expiring', {
                'days_remaining': days_remaining,
                'message': f'您的訂閱將在 {days_remaining} 天後到期，請及時續費'
            })
            
        except Exception as e:
            logger.warning(f"Send expiry reminder error: {e}")


# ==================== 單例訪問 ====================

_billing_service: Optional[BillingService] = None


def get_billing_service() -> BillingService:
    """獲取計費服務實例"""
    global _billing_service
    if _billing_service is None:
        _billing_service = BillingService()
    return _billing_service

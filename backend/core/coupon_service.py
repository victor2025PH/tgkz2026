"""
優惠券系統

功能：
1. 優惠券創建與管理
2. 優惠券驗證與使用
3. 促銷活動管理
4. 使用統計
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import json
import secrets
import string

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class CouponType(str, Enum):
    PERCENTAGE = 'percentage'   # 百分比折扣
    FIXED = 'fixed'             # 固定金額
    TRIAL_EXTEND = 'trial_extend'  # 試用延期
    TIER_UPGRADE = 'tier_upgrade'  # 免費升級


class CouponStatus(str, Enum):
    ACTIVE = 'active'
    EXPIRED = 'expired'
    DEPLETED = 'depleted'
    DISABLED = 'disabled'


# ==================== 數據模型 ====================

@dataclass
class Coupon:
    """優惠券"""
    id: str
    code: str
    name: str
    type: CouponType
    value: int                      # 折扣值（百分比或分）
    
    # 限制
    min_purchase: int = 0           # 最低消費（分）
    max_discount: int = 0           # 最高折扣（分），0=無限制
    applicable_tiers: List[str] = field(default_factory=list)  # 適用等級
    applicable_products: List[str] = field(default_factory=list)  # 適用產品
    
    # 使用限制
    max_uses: int = -1              # 最大使用次數，-1=無限制
    max_uses_per_user: int = 1      # 每用戶最大使用次數
    current_uses: int = 0           # 當前使用次數
    
    # 時間
    valid_from: str = ''
    valid_until: str = ''
    created_at: str = ''
    
    # 狀態
    status: CouponStatus = CouponStatus.ACTIVE
    
    # 元數據
    campaign_id: str = ''
    description: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['type'] = self.type.value
        d['status'] = self.status.value
        return d


@dataclass
class CouponUsage:
    """優惠券使用記錄"""
    id: str
    coupon_id: str
    user_id: str
    order_id: str
    discount_amount: int
    used_at: str
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Campaign:
    """促銷活動"""
    id: str
    name: str
    description: str
    
    # 時間
    start_at: str
    end_at: str
    
    # 配置
    coupon_ids: List[str] = field(default_factory=list)
    auto_apply: bool = False        # 自動應用
    banner_url: str = ''
    
    # 狀態
    is_active: bool = True
    created_at: str = ''
    
    def to_dict(self) -> dict:
        return asdict(self)


class CouponService:
    """優惠券服務"""
    
    _instance: Optional['CouponService'] = None
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
        logger.info("CouponService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 優惠券表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupons (
                    id TEXT PRIMARY KEY,
                    code TEXT UNIQUE NOT NULL,
                    name TEXT,
                    type TEXT NOT NULL,
                    value INTEGER NOT NULL,
                    min_purchase INTEGER DEFAULT 0,
                    max_discount INTEGER DEFAULT 0,
                    applicable_tiers TEXT,
                    applicable_products TEXT,
                    max_uses INTEGER DEFAULT -1,
                    max_uses_per_user INTEGER DEFAULT 1,
                    current_uses INTEGER DEFAULT 0,
                    valid_from TEXT,
                    valid_until TEXT,
                    status TEXT DEFAULT 'active',
                    campaign_id TEXT,
                    description TEXT,
                    created_at TEXT
                )
            ''')
            
            # 優惠券使用記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_usages (
                    id TEXT PRIMARY KEY,
                    coupon_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    order_id TEXT,
                    discount_amount INTEGER,
                    used_at TEXT
                )
            ''')
            
            # 促銷活動表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    description TEXT,
                    start_at TEXT,
                    end_at TEXT,
                    coupon_ids TEXT,
                    auto_apply INTEGER DEFAULT 0,
                    banner_url TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init coupon DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _generate_code(self, length: int = 8) -> str:
        """生成優惠碼"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))
    
    # ==================== 優惠券管理 ====================
    
    def create_coupon(
        self,
        name: str,
        coupon_type: CouponType,
        value: int,
        code: str = None,
        **kwargs
    ) -> Optional[Coupon]:
        """創建優惠券"""
        try:
            coupon_id = f"cpn_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
            code = code or self._generate_code()
            now = datetime.utcnow()
            
            coupon = Coupon(
                id=coupon_id,
                code=code.upper(),
                name=name,
                type=coupon_type,
                value=value,
                min_purchase=kwargs.get('min_purchase', 0),
                max_discount=kwargs.get('max_discount', 0),
                applicable_tiers=kwargs.get('applicable_tiers', []),
                applicable_products=kwargs.get('applicable_products', []),
                max_uses=kwargs.get('max_uses', -1),
                max_uses_per_user=kwargs.get('max_uses_per_user', 1),
                valid_from=kwargs.get('valid_from', now.isoformat()),
                valid_until=kwargs.get('valid_until', (now + timedelta(days=30)).isoformat()),
                campaign_id=kwargs.get('campaign_id', ''),
                description=kwargs.get('description', ''),
                created_at=now.isoformat()
            )
            
            db = self._get_db()
            db.execute('''
                INSERT INTO coupons 
                (id, code, name, type, value, min_purchase, max_discount,
                 applicable_tiers, applicable_products, max_uses, max_uses_per_user,
                 valid_from, valid_until, status, campaign_id, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                coupon.id, coupon.code, coupon.name, coupon.type.value, coupon.value,
                coupon.min_purchase, coupon.max_discount,
                json.dumps(coupon.applicable_tiers), json.dumps(coupon.applicable_products),
                coupon.max_uses, coupon.max_uses_per_user,
                coupon.valid_from, coupon.valid_until, coupon.status.value,
                coupon.campaign_id, coupon.description, coupon.created_at
            ))
            db.commit()
            db.close()
            
            logger.info(f"Created coupon {code}")
            return coupon
            
        except Exception as e:
            logger.error(f"Create coupon error: {e}")
            return None
    
    def get_coupon(self, coupon_id: str = None, code: str = None) -> Optional[Coupon]:
        """獲取優惠券"""
        try:
            db = self._get_db()
            
            if coupon_id:
                row = db.execute('SELECT * FROM coupons WHERE id = ?', (coupon_id,)).fetchone()
            elif code:
                row = db.execute('SELECT * FROM coupons WHERE code = ?', (code.upper(),)).fetchone()
            else:
                db.close()
                return None
            
            db.close()
            
            if row:
                return Coupon(
                    id=row['id'],
                    code=row['code'],
                    name=row['name'],
                    type=CouponType(row['type']),
                    value=row['value'],
                    min_purchase=row['min_purchase'] or 0,
                    max_discount=row['max_discount'] or 0,
                    applicable_tiers=json.loads(row['applicable_tiers']) if row['applicable_tiers'] else [],
                    applicable_products=json.loads(row['applicable_products']) if row['applicable_products'] else [],
                    max_uses=row['max_uses'],
                    max_uses_per_user=row['max_uses_per_user'],
                    current_uses=row['current_uses'],
                    valid_from=row['valid_from'] or '',
                    valid_until=row['valid_until'] or '',
                    status=CouponStatus(row['status']),
                    campaign_id=row['campaign_id'] or '',
                    description=row['description'] or '',
                    created_at=row['created_at'] or ''
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Get coupon error: {e}")
            return None
    
    # ==================== 優惠券驗證 ====================
    
    def validate_coupon(
        self,
        code: str,
        user_id: str,
        amount: int,
        tier: str = None,
        product_id: str = None
    ) -> Dict[str, Any]:
        """驗證優惠券"""
        coupon = self.get_coupon(code=code)
        
        if not coupon:
            return {'valid': False, 'error': '優惠碼不存在'}
        
        now = datetime.utcnow()
        
        # 檢查狀態
        if coupon.status != CouponStatus.ACTIVE:
            return {'valid': False, 'error': '優惠碼已失效'}
        
        # 檢查時間
        if coupon.valid_from:
            valid_from = datetime.fromisoformat(coupon.valid_from.replace('Z', ''))
            if now < valid_from:
                return {'valid': False, 'error': '優惠碼尚未生效'}
        
        if coupon.valid_until:
            valid_until = datetime.fromisoformat(coupon.valid_until.replace('Z', ''))
            if now > valid_until:
                return {'valid': False, 'error': '優惠碼已過期'}
        
        # 檢查最大使用次數
        if coupon.max_uses != -1 and coupon.current_uses >= coupon.max_uses:
            return {'valid': False, 'error': '優惠碼已被領完'}
        
        # 檢查用戶使用次數
        user_uses = self._get_user_coupon_uses(coupon.id, user_id)
        if user_uses >= coupon.max_uses_per_user:
            return {'valid': False, 'error': '您已使用過此優惠碼'}
        
        # 檢查最低消費
        if coupon.min_purchase > 0 and amount < coupon.min_purchase:
            return {
                'valid': False, 
                'error': f'最低消費 ¥{coupon.min_purchase / 100:.2f}'
            }
        
        # 檢查適用等級
        if coupon.applicable_tiers and tier and tier not in coupon.applicable_tiers:
            return {'valid': False, 'error': '此優惠碼不適用於當前等級'}
        
        # 檢查適用產品
        if coupon.applicable_products and product_id and product_id not in coupon.applicable_products:
            return {'valid': False, 'error': '此優惠碼不適用於當前產品'}
        
        # 計算折扣
        discount = self._calculate_discount(coupon, amount)
        
        return {
            'valid': True,
            'coupon': coupon.to_dict(),
            'discount_amount': discount,
            'final_amount': amount - discount
        }
    
    def _get_user_coupon_uses(self, coupon_id: str, user_id: str) -> int:
        """獲取用戶對某優惠券的使用次數"""
        try:
            db = self._get_db()
            row = db.execute('''
                SELECT COUNT(*) as count FROM coupon_usages 
                WHERE coupon_id = ? AND user_id = ?
            ''', (coupon_id, user_id)).fetchone()
            db.close()
            return row['count'] if row else 0
        except:
            return 0
    
    def _calculate_discount(self, coupon: Coupon, amount: int) -> int:
        """計算折扣金額"""
        if coupon.type == CouponType.PERCENTAGE:
            discount = int(amount * coupon.value / 100)
        elif coupon.type == CouponType.FIXED:
            discount = coupon.value
        else:
            discount = 0
        
        # 應用最大折扣限制
        if coupon.max_discount > 0:
            discount = min(discount, coupon.max_discount)
        
        # 不能超過訂單金額
        discount = min(discount, amount)
        
        return discount
    
    # ==================== 優惠券使用 ====================
    
    def use_coupon(
        self,
        code: str,
        user_id: str,
        order_id: str,
        amount: int
    ) -> Dict[str, Any]:
        """使用優惠券"""
        # 先驗證
        validation = self.validate_coupon(code, user_id, amount)
        if not validation['valid']:
            return {'success': False, 'error': validation['error']}
        
        coupon = self.get_coupon(code=code)
        discount = validation['discount_amount']
        
        try:
            db = self._get_db()
            now = datetime.utcnow()
            
            # 創建使用記錄
            usage_id = f"usage_{now.strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
            db.execute('''
                INSERT INTO coupon_usages (id, coupon_id, user_id, order_id, discount_amount, used_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (usage_id, coupon.id, user_id, order_id, discount, now.isoformat()))
            
            # 更新使用次數
            db.execute('''
                UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?
            ''', (coupon.id,))
            
            # 檢查是否需要更新狀態
            if coupon.max_uses != -1 and coupon.current_uses + 1 >= coupon.max_uses:
                db.execute('''
                    UPDATE coupons SET status = ? WHERE id = ?
                ''', (CouponStatus.DEPLETED.value, coupon.id))
            
            db.commit()
            db.close()
            
            logger.info(f"User {user_id} used coupon {code} for order {order_id}, discount: {discount}")
            
            return {
                'success': True,
                'discount_amount': discount,
                'final_amount': amount - discount,
                'usage_id': usage_id
            }
            
        except Exception as e:
            logger.error(f"Use coupon error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 促銷活動 ====================
    
    def create_campaign(
        self,
        name: str,
        start_at: str,
        end_at: str,
        **kwargs
    ) -> Optional[Campaign]:
        """創建促銷活動"""
        try:
            campaign_id = f"camp_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
            now = datetime.utcnow()
            
            campaign = Campaign(
                id=campaign_id,
                name=name,
                description=kwargs.get('description', ''),
                start_at=start_at,
                end_at=end_at,
                coupon_ids=kwargs.get('coupon_ids', []),
                auto_apply=kwargs.get('auto_apply', False),
                banner_url=kwargs.get('banner_url', ''),
                created_at=now.isoformat()
            )
            
            db = self._get_db()
            db.execute('''
                INSERT INTO campaigns 
                (id, name, description, start_at, end_at, coupon_ids, auto_apply, banner_url, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            ''', (
                campaign.id, campaign.name, campaign.description,
                campaign.start_at, campaign.end_at,
                json.dumps(campaign.coupon_ids), 1 if campaign.auto_apply else 0,
                campaign.banner_url, campaign.created_at
            ))
            db.commit()
            db.close()
            
            logger.info(f"Created campaign {name}")
            return campaign
            
        except Exception as e:
            logger.error(f"Create campaign error: {e}")
            return None
    
    def get_active_campaigns(self) -> List[Campaign]:
        """獲取當前活躍的促銷活動"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            rows = db.execute('''
                SELECT * FROM campaigns 
                WHERE is_active = 1 AND start_at <= ? AND end_at >= ?
                ORDER BY start_at DESC
            ''', (now, now)).fetchall()
            db.close()
            
            campaigns = []
            for row in rows:
                campaigns.append(Campaign(
                    id=row['id'],
                    name=row['name'],
                    description=row['description'] or '',
                    start_at=row['start_at'],
                    end_at=row['end_at'],
                    coupon_ids=json.loads(row['coupon_ids']) if row['coupon_ids'] else [],
                    auto_apply=bool(row['auto_apply']),
                    banner_url=row['banner_url'] or '',
                    is_active=bool(row['is_active']),
                    created_at=row['created_at'] or ''
                ))
            
            return campaigns
            
        except Exception as e:
            logger.error(f"Get active campaigns error: {e}")
            return []
    
    # ==================== 統計 ====================
    
    def get_coupon_stats(self, coupon_id: str) -> Dict[str, Any]:
        """獲取優惠券統計"""
        try:
            coupon = self.get_coupon(coupon_id=coupon_id)
            if not coupon:
                return {}
            
            db = self._get_db()
            
            # 使用統計
            row = db.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(discount_amount), 0) as total_discount
                FROM coupon_usages WHERE coupon_id = ?
            ''', (coupon_id,)).fetchone()
            
            # 每日使用趨勢
            trend = db.execute('''
                SELECT date(used_at) as date, COUNT(*) as count, SUM(discount_amount) as discount
                FROM coupon_usages 
                WHERE coupon_id = ?
                GROUP BY date(used_at)
                ORDER BY date DESC
                LIMIT 30
            ''', (coupon_id,)).fetchall()
            
            db.close()
            
            return {
                'coupon': coupon.to_dict(),
                'total_uses': row['count'],
                'total_discount': row['total_discount'],
                'remaining_uses': coupon.max_uses - coupon.current_uses if coupon.max_uses != -1 else -1,
                'daily_trend': [{'date': r['date'], 'count': r['count'], 'discount': r['discount']} for r in trend]
            }
            
        except Exception as e:
            logger.error(f"Get coupon stats error: {e}")
            return {}


# ==================== 單例訪問 ====================

_coupon_service: Optional[CouponService] = None


def get_coupon_service() -> CouponService:
    """獲取優惠券服務"""
    global _coupon_service
    if _coupon_service is None:
        _coupon_service = CouponService()
    return _coupon_service

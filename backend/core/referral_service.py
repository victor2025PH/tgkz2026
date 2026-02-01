"""
推薦獎勵系統

功能：
1. 邀請碼管理
2. 推薦追蹤
3. 獎勵發放
4. 返佣計算
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import secrets
import string

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class RewardType(str, Enum):
    CREDIT = 'credit'           # 賬戶餘額
    DISCOUNT = 'discount'       # 折扣券
    TRIAL_DAYS = 'trial_days'   # 試用天數
    QUOTA_BONUS = 'quota_bonus' # 配額加成


class ReferralStatus(str, Enum):
    PENDING = 'pending'         # 待確認
    QUALIFIED = 'qualified'     # 已符合條件
    REWARDED = 'rewarded'       # 已發放獎勵
    EXPIRED = 'expired'         # 已過期


# ==================== 數據模型 ====================

@dataclass
class ReferralConfig:
    """推薦配置"""
    # 推薦人獎勵
    referrer_reward_type: RewardType = RewardType.CREDIT
    referrer_reward_value: int = 1000  # 10元
    referrer_max_rewards: int = -1      # 無限制
    
    # 被推薦人獎勵
    referee_reward_type: RewardType = RewardType.DISCOUNT
    referee_reward_value: int = 20      # 20%折扣
    
    # 返佣設置
    commission_enabled: bool = True
    commission_rate: int = 10           # 10%
    commission_duration_days: int = 365 # 首年返佣
    
    # 資格條件
    qualify_action: str = 'first_purchase'  # first_purchase, subscription, any_purchase
    qualify_min_amount: int = 0
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['referrer_reward_type'] = self.referrer_reward_type.value
        d['referee_reward_type'] = self.referee_reward_type.value
        return d


@dataclass
class Referral:
    """推薦記錄"""
    id: str
    referrer_id: str            # 推薦人
    referee_id: str             # 被推薦人
    referral_code: str
    
    status: ReferralStatus = ReferralStatus.PENDING
    
    # 獎勵
    referrer_reward_given: bool = False
    referee_reward_given: bool = False
    referrer_reward_amount: int = 0
    referee_reward_amount: int = 0
    
    # 返佣
    total_commission: int = 0
    
    # 時間
    created_at: str = ''
    qualified_at: str = ''
    rewarded_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['status'] = self.status.value
        return d


@dataclass
class Commission:
    """返佣記錄"""
    id: str
    referral_id: str
    referrer_id: str
    referee_id: str
    
    order_id: str
    order_amount: int
    commission_rate: int
    commission_amount: int
    
    status: str = 'pending'  # pending, paid, cancelled
    created_at: str = ''
    paid_at: str = ''
    
    def to_dict(self) -> dict:
        return asdict(self)


class ReferralService:
    """推薦獎勵服務"""
    
    _instance: Optional['ReferralService'] = None
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
        
        self.config = ReferralConfig()
        self._init_db()
        self._initialized = True
        logger.info("ReferralService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 邀請碼表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS referral_codes (
                    code TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE,
                    uses_count INTEGER DEFAULT 0,
                    max_uses INTEGER DEFAULT -1,
                    created_at TEXT
                )
            ''')
            
            # 推薦記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS referrals (
                    id TEXT PRIMARY KEY,
                    referrer_id TEXT NOT NULL,
                    referee_id TEXT NOT NULL UNIQUE,
                    referral_code TEXT,
                    status TEXT DEFAULT 'pending',
                    referrer_reward_given INTEGER DEFAULT 0,
                    referee_reward_given INTEGER DEFAULT 0,
                    referrer_reward_amount INTEGER DEFAULT 0,
                    referee_reward_amount INTEGER DEFAULT 0,
                    total_commission INTEGER DEFAULT 0,
                    created_at TEXT,
                    qualified_at TEXT,
                    rewarded_at TEXT
                )
            ''')
            
            # 返佣記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS commissions (
                    id TEXT PRIMARY KEY,
                    referral_id TEXT NOT NULL,
                    referrer_id TEXT NOT NULL,
                    referee_id TEXT NOT NULL,
                    order_id TEXT,
                    order_amount INTEGER,
                    commission_rate INTEGER,
                    commission_amount INTEGER,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT,
                    paid_at TEXT
                )
            ''')
            
            # 用戶獎勵餘額表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_rewards (
                    user_id TEXT PRIMARY KEY,
                    balance INTEGER DEFAULT 0,
                    total_earned INTEGER DEFAULT 0,
                    total_withdrawn INTEGER DEFAULT 0,
                    updated_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON commissions(referrer_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init referral DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _generate_code(self, length: int = 6) -> str:
        """生成邀請碼"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))
    
    # ==================== 邀請碼管理 ====================
    
    def get_or_create_referral_code(self, user_id: str) -> str:
        """獲取或創建用戶的邀請碼"""
        try:
            db = self._get_db()
            
            # 查詢現有邀請碼
            row = db.execute(
                'SELECT code FROM referral_codes WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            
            if row:
                db.close()
                return row['code']
            
            # 創建新邀請碼
            code = self._generate_code()
            now = datetime.utcnow()
            
            db.execute('''
                INSERT INTO referral_codes (code, user_id, created_at)
                VALUES (?, ?, ?)
            ''', (code, user_id, now.isoformat()))
            
            db.commit()
            db.close()
            
            logger.info(f"Created referral code {code} for user {user_id}")
            return code
            
        except Exception as e:
            logger.error(f"Get/create referral code error: {e}")
            return ''
    
    def get_referrer_by_code(self, code: str) -> Optional[str]:
        """通過邀請碼獲取推薦人 ID"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT user_id FROM referral_codes WHERE code = ?',
                (code.upper(),)
            ).fetchone()
            db.close()
            return row['user_id'] if row else None
        except:
            return None
    
    # ==================== 推薦追蹤 ====================
    
    def track_referral(
        self,
        referral_code: str,
        referee_id: str
    ) -> Dict[str, Any]:
        """追蹤推薦（新用戶註冊時調用）"""
        try:
            referrer_id = self.get_referrer_by_code(referral_code)
            if not referrer_id:
                return {'success': False, 'error': '無效的邀請碼'}
            
            if referrer_id == referee_id:
                return {'success': False, 'error': '不能使用自己的邀請碼'}
            
            # 檢查是否已被推薦
            db = self._get_db()
            existing = db.execute(
                'SELECT id FROM referrals WHERE referee_id = ?',
                (referee_id,)
            ).fetchone()
            
            if existing:
                db.close()
                return {'success': False, 'error': '該用戶已被推薦'}
            
            # 創建推薦記錄
            now = datetime.utcnow()
            referral_id = f"ref_{now.strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
            
            db.execute('''
                INSERT INTO referrals 
                (id, referrer_id, referee_id, referral_code, status, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?)
            ''', (referral_id, referrer_id, referee_id, referral_code.upper(), now.isoformat()))
            
            # 更新邀請碼使用次數
            db.execute('''
                UPDATE referral_codes SET uses_count = uses_count + 1
                WHERE code = ?
            ''', (referral_code.upper(),))
            
            # 發放被推薦人獎勵（如果是折扣券類型）
            if self.config.referee_reward_type == RewardType.DISCOUNT:
                self._give_referee_discount(referee_id, db)
            
            db.commit()
            db.close()
            
            logger.info(f"Tracked referral: {referrer_id} -> {referee_id}")
            
            return {
                'success': True,
                'referral_id': referral_id,
                'referrer_id': referrer_id
            }
            
        except Exception as e:
            logger.error(f"Track referral error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _give_referee_discount(self, referee_id: str, db):
        """給被推薦人發放折扣券"""
        try:
            from .coupon_service import get_coupon_service, CouponType
            coupon_service = get_coupon_service()
            
            coupon = coupon_service.create_coupon(
                name='新用戶專享折扣',
                coupon_type=CouponType.PERCENTAGE,
                value=self.config.referee_reward_value,
                max_uses=1,
                max_uses_per_user=1,
                description='推薦好友專屬優惠'
            )
            
            if coupon:
                # 標記獎勵已發放
                db.execute('''
                    UPDATE referrals SET referee_reward_given = 1, referee_reward_amount = ?
                    WHERE referee_id = ? AND referee_reward_given = 0
                ''', (self.config.referee_reward_value, referee_id))
                
        except Exception as e:
            logger.warning(f"Give referee discount error: {e}")
    
    def qualify_referral(
        self,
        referee_id: str,
        purchase_amount: int = 0
    ) -> Dict[str, Any]:
        """確認推薦資格（首次購買時調用）"""
        try:
            db = self._get_db()
            
            # 獲取推薦記錄
            row = db.execute(
                'SELECT * FROM referrals WHERE referee_id = ? AND status = ?',
                (referee_id, ReferralStatus.PENDING.value)
            ).fetchone()
            
            if not row:
                db.close()
                return {'success': False, 'error': '未找到待確認的推薦記錄'}
            
            # 檢查最低金額
            if self.config.qualify_min_amount > 0 and purchase_amount < self.config.qualify_min_amount:
                db.close()
                return {'success': False, 'error': '購買金額未達標'}
            
            now = datetime.utcnow()
            referrer_id = row['referrer_id']
            referral_id = row['id']
            
            # 更新狀態
            db.execute('''
                UPDATE referrals 
                SET status = 'qualified', qualified_at = ?
                WHERE id = ?
            ''', (now.isoformat(), referral_id))
            
            # 發放推薦人獎勵
            reward_amount = self.config.referrer_reward_value
            
            if self.config.referrer_reward_type == RewardType.CREDIT:
                self._add_user_balance(referrer_id, reward_amount, db)
            
            db.execute('''
                UPDATE referrals 
                SET referrer_reward_given = 1, referrer_reward_amount = ?,
                    status = 'rewarded', rewarded_at = ?
                WHERE id = ?
            ''', (reward_amount, now.isoformat(), referral_id))
            
            db.commit()
            db.close()
            
            # 通知推薦人
            self._notify_referrer(referrer_id, reward_amount)
            
            logger.info(f"Qualified referral {referral_id}, reward: {reward_amount}")
            
            return {
                'success': True,
                'referral_id': referral_id,
                'referrer_reward': reward_amount
            }
            
        except Exception as e:
            logger.error(f"Qualify referral error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _add_user_balance(self, user_id: str, amount: int, db):
        """增加用戶獎勵餘額"""
        now = datetime.utcnow()
        db.execute('''
            INSERT INTO user_rewards (user_id, balance, total_earned, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET 
                balance = balance + ?,
                total_earned = total_earned + ?,
                updated_at = ?
        ''', (user_id, amount, amount, now.isoformat(), amount, amount, now.isoformat()))
    
    def _notify_referrer(self, referrer_id: str, reward_amount: int):
        """通知推薦人獲得獎勵"""
        try:
            from .realtime import notify_user
            notify_user(referrer_id, 'referral_reward', {
                'amount': reward_amount,
                'message': f'您獲得了 ¥{reward_amount / 100:.2f} 推薦獎勵'
            })
        except:
            pass
    
    # ==================== 返佣 ====================
    
    def calculate_commission(
        self,
        referee_id: str,
        order_id: str,
        order_amount: int
    ) -> Dict[str, Any]:
        """計算並記錄返佣"""
        if not self.config.commission_enabled:
            return {'success': False, 'commission': 0}
        
        try:
            db = self._get_db()
            
            # 獲取推薦記錄
            row = db.execute('''
                SELECT * FROM referrals 
                WHERE referee_id = ? AND status = 'rewarded'
            ''', (referee_id,)).fetchone()
            
            if not row:
                db.close()
                return {'success': False, 'commission': 0}
            
            # 檢查是否在返佣期限內
            created_at = datetime.fromisoformat(row['created_at'].replace('Z', ''))
            if (datetime.utcnow() - created_at).days > self.config.commission_duration_days:
                db.close()
                return {'success': False, 'commission': 0, 'reason': '返佣期限已過'}
            
            # 計算返佣
            commission_amount = int(order_amount * self.config.commission_rate / 100)
            
            now = datetime.utcnow()
            commission_id = f"comm_{now.strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
            
            # 記錄返佣
            db.execute('''
                INSERT INTO commissions
                (id, referral_id, referrer_id, referee_id, order_id, order_amount,
                 commission_rate, commission_amount, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            ''', (
                commission_id, row['id'], row['referrer_id'], referee_id,
                order_id, order_amount, self.config.commission_rate,
                commission_amount, now.isoformat()
            ))
            
            # 更新累計返佣
            db.execute('''
                UPDATE referrals SET total_commission = total_commission + ?
                WHERE id = ?
            ''', (commission_amount, row['id']))
            
            # 添加到餘額
            self._add_user_balance(row['referrer_id'], commission_amount, db)
            
            db.commit()
            db.close()
            
            logger.info(f"Commission {commission_amount} for referrer {row['referrer_id']}")
            
            return {
                'success': True,
                'commission_id': commission_id,
                'commission': commission_amount,
                'referrer_id': row['referrer_id']
            }
            
        except Exception as e:
            logger.error(f"Calculate commission error: {e}")
            return {'success': False, 'commission': 0}
    
    # ==================== 統計查詢 ====================
    
    def get_user_referral_stats(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶推薦統計"""
        try:
            db = self._get_db()
            
            # 邀請碼
            code_row = db.execute(
                'SELECT * FROM referral_codes WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            
            # 推薦統計
            stats_row = db.execute('''
                SELECT 
                    COUNT(*) as total_referrals,
                    SUM(CASE WHEN status = 'rewarded' THEN 1 ELSE 0 END) as qualified_referrals,
                    COALESCE(SUM(referrer_reward_amount), 0) as total_rewards,
                    COALESCE(SUM(total_commission), 0) as total_commission
                FROM referrals WHERE referrer_id = ?
            ''', (user_id,)).fetchone()
            
            # 餘額
            balance_row = db.execute(
                'SELECT * FROM user_rewards WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            
            # 最近推薦
            recent = db.execute('''
                SELECT r.*, u.email as referee_email
                FROM referrals r
                LEFT JOIN users u ON r.referee_id = u.id
                WHERE r.referrer_id = ?
                ORDER BY r.created_at DESC
                LIMIT 10
            ''', (user_id,)).fetchall()
            
            db.close()
            
            return {
                'referral_code': code_row['code'] if code_row else self.get_or_create_referral_code(user_id),
                'total_referrals': stats_row['total_referrals'] if stats_row else 0,
                'qualified_referrals': stats_row['qualified_referrals'] if stats_row else 0,
                'total_rewards': stats_row['total_rewards'] if stats_row else 0,
                'total_commission': stats_row['total_commission'] if stats_row else 0,
                'balance': balance_row['balance'] if balance_row else 0,
                'recent_referrals': [dict(r) for r in recent]
            }
            
        except Exception as e:
            logger.error(f"Get user referral stats error: {e}")
            return {}
    
    def get_user_balance(self, user_id: str) -> int:
        """獲取用戶獎勵餘額"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT balance FROM user_rewards WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            db.close()
            return row['balance'] if row else 0
        except:
            return 0


# ==================== 單例訪問 ====================

_referral_service: Optional[ReferralService] = None


def get_referral_service() -> ReferralService:
    """獲取推薦服務"""
    global _referral_service
    if _referral_service is None:
        _referral_service = ReferralService()
    return _referral_service

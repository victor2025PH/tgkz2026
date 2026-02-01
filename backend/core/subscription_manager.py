"""
訂閱生命週期管理

功能：
1. 訂閱升降級
2. 訂閱暫停/恢復
3. 試用期管理
4. 續費提醒
5. 訂閱歷史記錄
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

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class SubscriptionAction(str, Enum):
    CREATE = 'create'
    UPGRADE = 'upgrade'
    DOWNGRADE = 'downgrade'
    RENEW = 'renew'
    CANCEL = 'cancel'
    PAUSE = 'pause'
    RESUME = 'resume'
    EXPIRE = 'expire'


class SubscriptionState(str, Enum):
    TRIALING = 'trialing'
    ACTIVE = 'active'
    PAUSED = 'paused'
    PAST_DUE = 'past_due'
    CANCELLED = 'cancelled'
    EXPIRED = 'expired'


# ==================== 數據模型 ====================

@dataclass
class SubscriptionChange:
    """訂閱變更記錄"""
    id: str
    user_id: str
    action: SubscriptionAction
    from_tier: str
    to_tier: str
    from_period: str = ''
    to_period: str = ''
    reason: str = ''
    prorate_amount: int = 0  # 按比例調整金額
    effective_at: str = ''
    created_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['action'] = self.action.value
        return d


@dataclass
class UserSubscription:
    """用戶訂閱"""
    user_id: str
    tier: str
    state: SubscriptionState
    billing_cycle: str = 'monthly'  # monthly, yearly
    
    # 時間
    started_at: str = ''
    current_period_start: str = ''
    current_period_end: str = ''
    trial_end: str = ''
    paused_at: str = ''
    cancelled_at: str = ''
    
    # 配置
    cancel_at_period_end: bool = False
    auto_renew: bool = True
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['state'] = self.state.value
        return d


class SubscriptionManager:
    """訂閱生命週期管理器"""
    
    _instance: Optional['SubscriptionManager'] = None
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
        logger.info("SubscriptionManager initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 訂閱變更歷史表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS subscription_changes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    from_tier TEXT,
                    to_tier TEXT,
                    from_period TEXT,
                    to_period TEXT,
                    reason TEXT,
                    prorate_amount INTEGER DEFAULT 0,
                    effective_at TEXT,
                    created_at TEXT
                )
            ''')
            
            # 訂閱暫停記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS subscription_pauses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    paused_at TEXT,
                    resume_at TEXT,
                    reason TEXT,
                    days_remaining INTEGER,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sub_changes_user ON subscription_changes(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sub_pauses_user ON subscription_pauses(user_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init subscription DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 訂閱查詢 ====================
    
    def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """獲取用戶訂閱信息"""
        try:
            db = self._get_db()
            row = db.execute('''
                SELECT * FROM subscriptions WHERE user_id = ?
            ''', (user_id,)).fetchone()
            db.close()
            
            if row:
                return UserSubscription(
                    user_id=row['user_id'],
                    tier=row['plan_id'] or 'bronze',
                    state=SubscriptionState(row['status']) if row['status'] in [s.value for s in SubscriptionState] else SubscriptionState.ACTIVE,
                    billing_cycle='yearly' if 'year' in (row.get('billing_cycle') or '') else 'monthly',
                    started_at=row.get('created_at', ''),
                    current_period_start=row.get('current_period_start', ''),
                    current_period_end=row.get('current_period_end', ''),
                    cancel_at_period_end=bool(row.get('cancel_at_period_end', 0))
                )
            
            # 返回默認訂閱
            return UserSubscription(
                user_id=user_id,
                tier='bronze',
                state=SubscriptionState.ACTIVE
            )
            
        except Exception as e:
            logger.error(f"Get user subscription error: {e}")
            return None
    
    # ==================== 升降級 ====================
    
    def calculate_prorate(
        self,
        user_id: str,
        from_tier: str,
        to_tier: str,
        billing_cycle: str = 'monthly'
    ) -> Dict[str, Any]:
        """計算升降級按比例調整金額"""
        try:
            from .level_config import get_level_config_service
            level_service = get_level_config_service()
            
            sub = self.get_user_subscription(user_id)
            if not sub or not sub.current_period_end:
                return {'prorate_amount': 0, 'credit': 0, 'charge': 0}
            
            # 獲取價格
            from_config = level_service.get_level_config(from_tier)
            to_config = level_service.get_level_config(to_tier)
            
            if not from_config or not to_config:
                return {'prorate_amount': 0, 'credit': 0, 'charge': 0}
            
            price_key = 'price_monthly' if billing_cycle == 'monthly' else 'price_yearly'
            from_price = from_config.prices.get(price_key, 0)
            to_price = to_config.prices.get(price_key, 0)
            
            # 計算剩餘天數
            now = datetime.utcnow()
            period_end = datetime.fromisoformat(sub.current_period_end.replace('Z', ''))
            days_remaining = max(0, (period_end - now).days)
            
            # 計算每日價格
            total_days = 30 if billing_cycle == 'monthly' else 365
            from_daily = from_price / total_days
            to_daily = to_price / total_days
            
            # 計算按比例金額
            credit = int(from_daily * days_remaining)  # 退還金額
            charge = int(to_daily * days_remaining)    # 新訂閱金額
            prorate_amount = charge - credit           # 需補差價
            
            return {
                'prorate_amount': prorate_amount,
                'credit': credit,
                'charge': charge,
                'days_remaining': days_remaining,
                'from_price': from_price,
                'to_price': to_price
            }
            
        except Exception as e:
            logger.error(f"Calculate prorate error: {e}")
            return {'prorate_amount': 0, 'credit': 0, 'charge': 0}
    
    async def upgrade_subscription(
        self,
        user_id: str,
        to_tier: str,
        billing_cycle: str = 'monthly',
        apply_prorate: bool = True
    ) -> Dict[str, Any]:
        """升級訂閱"""
        try:
            sub = self.get_user_subscription(user_id)
            if not sub:
                return {'success': False, 'error': '未找到訂閱'}
            
            from_tier = sub.tier
            
            # 檢查是否為升級
            from .level_config import get_level_config_service
            level_service = get_level_config_service()
            
            if not level_service.is_higher_level(to_tier, from_tier):
                return {'success': False, 'error': '只能升級到更高等級'}
            
            # 計算按比例調整
            prorate = {'prorate_amount': 0}
            if apply_prorate:
                prorate = self.calculate_prorate(user_id, from_tier, to_tier, billing_cycle)
            
            # 更新訂閱
            now = datetime.utcnow()
            db = self._get_db()
            
            db.execute('''
                UPDATE subscriptions 
                SET plan_id = ?, billing_cycle = ?, updated_at = ?
                WHERE user_id = ?
            ''', (to_tier, billing_cycle, now.isoformat(), user_id))
            
            # 更新用戶等級
            db.execute('''
                UPDATE users 
                SET subscription_tier = ?, updated_at = ?
                WHERE id = ?
            ''', (to_tier, now.isoformat(), user_id))
            
            # 記錄變更
            change_id = f"change_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO subscription_changes
                (id, user_id, action, from_tier, to_tier, prorate_amount, effective_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                change_id, user_id, SubscriptionAction.UPGRADE.value,
                from_tier, to_tier, prorate.get('prorate_amount', 0),
                now.isoformat(), now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            # 發送通知
            self._notify_subscription_change(user_id, 'upgrade', from_tier, to_tier)
            
            logger.info(f"User {user_id} upgraded from {from_tier} to {to_tier}")
            
            return {
                'success': True,
                'from_tier': from_tier,
                'to_tier': to_tier,
                'prorate': prorate
            }
            
        except Exception as e:
            logger.error(f"Upgrade subscription error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def downgrade_subscription(
        self,
        user_id: str,
        to_tier: str,
        effective_immediately: bool = False
    ) -> Dict[str, Any]:
        """降級訂閱（默認在當前週期結束後生效）"""
        try:
            sub = self.get_user_subscription(user_id)
            if not sub:
                return {'success': False, 'error': '未找到訂閱'}
            
            from_tier = sub.tier
            
            now = datetime.utcnow()
            db = self._get_db()
            
            if effective_immediately:
                # 立即生效
                db.execute('''
                    UPDATE subscriptions 
                    SET plan_id = ?, updated_at = ?
                    WHERE user_id = ?
                ''', (to_tier, now.isoformat(), user_id))
                
                db.execute('''
                    UPDATE users 
                    SET subscription_tier = ?, updated_at = ?
                    WHERE id = ?
                ''', (to_tier, now.isoformat(), user_id))
                
                effective_at = now.isoformat()
            else:
                # 週期結束後生效（記錄待處理降級）
                effective_at = sub.current_period_end or now.isoformat()
                
                db.execute('''
                    INSERT OR REPLACE INTO subscription_pending_changes
                    (user_id, action, to_tier, effective_at, created_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, 'downgrade', to_tier, effective_at, now.isoformat()))
            
            # 記錄變更
            change_id = f"change_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO subscription_changes
                (id, user_id, action, from_tier, to_tier, effective_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                change_id, user_id, SubscriptionAction.DOWNGRADE.value,
                from_tier, to_tier, effective_at, now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            logger.info(f"User {user_id} scheduled downgrade from {from_tier} to {to_tier}")
            
            return {
                'success': True,
                'from_tier': from_tier,
                'to_tier': to_tier,
                'effective_at': effective_at,
                'immediate': effective_immediately
            }
            
        except Exception as e:
            logger.error(f"Downgrade subscription error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 暫停/恢復 ====================
    
    async def pause_subscription(
        self,
        user_id: str,
        reason: str = '',
        max_days: int = 30
    ) -> Dict[str, Any]:
        """暫停訂閱"""
        try:
            sub = self.get_user_subscription(user_id)
            if not sub:
                return {'success': False, 'error': '未找到訂閱'}
            
            if sub.state == SubscriptionState.PAUSED:
                return {'success': False, 'error': '訂閱已暫停'}
            
            now = datetime.utcnow()
            
            # 計算剩餘天數
            if sub.current_period_end:
                period_end = datetime.fromisoformat(sub.current_period_end.replace('Z', ''))
                days_remaining = max(0, (period_end - now).days)
            else:
                days_remaining = 30
            
            db = self._get_db()
            
            # 更新訂閱狀態
            db.execute('''
                UPDATE subscriptions 
                SET status = 'paused', updated_at = ?
                WHERE user_id = ?
            ''', (now.isoformat(), user_id))
            
            # 記錄暫停
            db.execute('''
                INSERT INTO subscription_pauses
                (user_id, paused_at, reason, days_remaining, is_active)
                VALUES (?, ?, ?, ?, 1)
            ''', (user_id, now.isoformat(), reason, days_remaining))
            
            # 記錄變更
            change_id = f"change_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO subscription_changes
                (id, user_id, action, from_tier, to_tier, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                change_id, user_id, SubscriptionAction.PAUSE.value,
                sub.tier, sub.tier, reason, now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            self._notify_subscription_change(user_id, 'pause', sub.tier, sub.tier)
            
            logger.info(f"User {user_id} paused subscription")
            
            return {
                'success': True,
                'paused_at': now.isoformat(),
                'days_remaining': days_remaining,
                'max_pause_days': max_days
            }
            
        except Exception as e:
            logger.error(f"Pause subscription error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def resume_subscription(self, user_id: str) -> Dict[str, Any]:
        """恢復訂閱"""
        try:
            sub = self.get_user_subscription(user_id)
            if not sub:
                return {'success': False, 'error': '未找到訂閱'}
            
            if sub.state != SubscriptionState.PAUSED:
                return {'success': False, 'error': '訂閱未暫停'}
            
            now = datetime.utcnow()
            db = self._get_db()
            
            # 獲取暫停記錄
            pause_row = db.execute('''
                SELECT * FROM subscription_pauses 
                WHERE user_id = ? AND is_active = 1
                ORDER BY paused_at DESC LIMIT 1
            ''', (user_id,)).fetchone()
            
            days_remaining = pause_row['days_remaining'] if pause_row else 30
            
            # 計算新的週期結束時間
            new_period_end = (now + timedelta(days=days_remaining)).isoformat()
            
            # 更新訂閱
            db.execute('''
                UPDATE subscriptions 
                SET status = 'active', current_period_end = ?, updated_at = ?
                WHERE user_id = ?
            ''', (new_period_end, now.isoformat(), user_id))
            
            # 標記暫停記錄為非活躍
            db.execute('''
                UPDATE subscription_pauses 
                SET is_active = 0, resume_at = ?
                WHERE user_id = ? AND is_active = 1
            ''', (now.isoformat(), user_id))
            
            # 記錄變更
            change_id = f"change_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO subscription_changes
                (id, user_id, action, from_tier, to_tier, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                change_id, user_id, SubscriptionAction.RESUME.value,
                sub.tier, sub.tier, now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            self._notify_subscription_change(user_id, 'resume', sub.tier, sub.tier)
            
            logger.info(f"User {user_id} resumed subscription")
            
            return {
                'success': True,
                'resumed_at': now.isoformat(),
                'new_period_end': new_period_end,
                'days_credited': days_remaining
            }
            
        except Exception as e:
            logger.error(f"Resume subscription error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 試用期 ====================
    
    async def start_trial(
        self,
        user_id: str,
        tier: str,
        trial_days: int = 7
    ) -> Dict[str, Any]:
        """開始試用"""
        try:
            sub = self.get_user_subscription(user_id)
            if sub and sub.state != SubscriptionState.EXPIRED:
                return {'success': False, 'error': '已有有效訂閱'}
            
            now = datetime.utcnow()
            trial_end = now + timedelta(days=trial_days)
            
            db = self._get_db()
            
            # 創建試用訂閱
            db.execute('''
                INSERT OR REPLACE INTO subscriptions
                (user_id, plan_id, status, current_period_start, current_period_end, 
                 trial_end, created_at, updated_at)
                VALUES (?, ?, 'trialing', ?, ?, ?, ?, ?)
            ''', (
                user_id, tier, now.isoformat(), trial_end.isoformat(),
                trial_end.isoformat(), now.isoformat(), now.isoformat()
            ))
            
            # 更新用戶等級
            db.execute('''
                UPDATE users 
                SET subscription_tier = ?, updated_at = ?
                WHERE id = ?
            ''', (tier, now.isoformat(), user_id))
            
            # 記錄變更
            change_id = f"change_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            db.execute('''
                INSERT INTO subscription_changes
                (id, user_id, action, from_tier, to_tier, effective_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                change_id, user_id, SubscriptionAction.CREATE.value,
                'bronze', tier, now.isoformat(), now.isoformat()
            ))
            
            db.commit()
            db.close()
            
            logger.info(f"User {user_id} started {trial_days}-day trial of {tier}")
            
            return {
                'success': True,
                'tier': tier,
                'trial_days': trial_days,
                'trial_end': trial_end.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Start trial error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 歷史記錄 ====================
    
    def get_subscription_history(self, user_id: str, limit: int = 50) -> List[SubscriptionChange]:
        """獲取訂閱變更歷史"""
        try:
            db = self._get_db()
            rows = db.execute('''
                SELECT * FROM subscription_changes 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (user_id, limit)).fetchall()
            db.close()
            
            history = []
            for row in rows:
                history.append(SubscriptionChange(
                    id=row['id'],
                    user_id=row['user_id'],
                    action=SubscriptionAction(row['action']),
                    from_tier=row['from_tier'] or '',
                    to_tier=row['to_tier'] or '',
                    from_period=row['from_period'] or '',
                    to_period=row['to_period'] or '',
                    reason=row['reason'] or '',
                    prorate_amount=row['prorate_amount'] or 0,
                    effective_at=row['effective_at'] or '',
                    created_at=row['created_at'] or ''
                ))
            
            return history
            
        except Exception as e:
            logger.error(f"Get subscription history error: {e}")
            return []
    
    # ==================== 通知 ====================
    
    def _notify_subscription_change(
        self,
        user_id: str,
        action: str,
        from_tier: str,
        to_tier: str
    ):
        """發送訂閱變更通知"""
        try:
            from .realtime import notify_user
            
            messages = {
                'upgrade': f'您已成功升級到 {to_tier} 等級',
                'downgrade': f'您的訂閱將在週期結束後降級為 {to_tier}',
                'pause': '您的訂閱已暫停',
                'resume': '您的訂閱已恢復'
            }
            
            notify_user(user_id, 'subscription_changed', {
                'action': action,
                'from_tier': from_tier,
                'to_tier': to_tier,
                'message': messages.get(action, f'訂閱已變更為 {to_tier}')
            })
        except Exception as e:
            logger.warning(f"Notify subscription change error: {e}")


# ==================== 單例訪問 ====================

_subscription_manager: Optional[SubscriptionManager] = None


def get_subscription_manager() -> SubscriptionManager:
    """獲取訂閱管理器"""
    global _subscription_manager
    if _subscription_manager is None:
        _subscription_manager = SubscriptionManager()
    return _subscription_manager

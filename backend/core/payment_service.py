"""
支付服務

優化設計：
1. 多支付提供商支持（Stripe、PayPal、本地支付）
2. Webhook 處理
3. 訂閱生命週期管理
4. 交易記錄審計
"""

import os
import json
import hmac
import hashlib
import sqlite3
import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


# ==================== 數據模型 ====================

class PaymentStatus(str, Enum):
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'
    CANCELLED = 'cancelled'


class SubscriptionStatus(str, Enum):
    ACTIVE = 'active'
    CANCELLED = 'cancelled'
    PAST_DUE = 'past_due'
    EXPIRED = 'expired'
    TRIALING = 'trialing'


@dataclass
class PaymentMethod:
    id: str
    user_id: str
    type: str  # card, paypal, alipay, wechat
    last_four: str = ''
    brand: str = ''
    exp_month: int = 0
    exp_year: int = 0
    is_default: bool = False
    provider_id: str = ''
    created_at: str = ''


@dataclass
class Transaction:
    id: str
    user_id: str
    amount: int  # 分為單位
    currency: str = 'USD'
    status: PaymentStatus = PaymentStatus.PENDING
    type: str = 'subscription'  # subscription, one_time, refund
    description: str = ''
    provider: str = ''
    provider_transaction_id: str = ''
    metadata: Dict = field(default_factory=dict)
    created_at: str = ''
    updated_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['status'] = self.status.value
        return d


@dataclass
class Subscription:
    id: str
    user_id: str
    plan_id: str
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    current_period_start: str = ''
    current_period_end: str = ''
    cancel_at_period_end: bool = False
    cancelled_at: Optional[str] = None
    provider: str = ''
    provider_subscription_id: str = ''
    created_at: str = ''
    updated_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['status'] = self.status.value
        return d


# ==================== 訂閱方案 ====================

SUBSCRIPTION_PLANS = {
    'free': {
        'id': 'free',
        'name': 'Free',
        'price_monthly': 0,
        'price_yearly': 0,
        'features': {
            'max_accounts': 2,
            'max_api_calls': 100,
            'ai_enabled': False,
            'monitoring_enabled': False,
        }
    },
    'basic': {
        'id': 'basic',
        'name': 'Basic',
        'price_monthly': 999,  # $9.99
        'price_yearly': 9588,  # $95.88 (20% off)
        'stripe_price_monthly': 'price_basic_monthly',
        'stripe_price_yearly': 'price_basic_yearly',
        'features': {
            'max_accounts': 5,
            'max_api_calls': 1000,
            'ai_enabled': True,
            'monitoring_enabled': False,
        }
    },
    'pro': {
        'id': 'pro',
        'name': 'Pro',
        'price_monthly': 2999,  # $29.99
        'price_yearly': 28788,  # $287.88 (20% off)
        'stripe_price_monthly': 'price_pro_monthly',
        'stripe_price_yearly': 'price_pro_yearly',
        'features': {
            'max_accounts': 20,
            'max_api_calls': 10000,
            'ai_enabled': True,
            'monitoring_enabled': True,
        }
    },
    'enterprise': {
        'id': 'enterprise',
        'name': 'Enterprise',
        'price_monthly': 9999,  # $99.99
        'price_yearly': 95988,  # $959.88 (20% off)
        'stripe_price_monthly': 'price_enterprise_monthly',
        'stripe_price_yearly': 'price_enterprise_yearly',
        'features': {
            'max_accounts': -1,  # 無限
            'max_api_calls': -1,
            'ai_enabled': True,
            'monitoring_enabled': True,
        }
    }
}


# ==================== 支付提供商抽象 ====================

class PaymentProvider(ABC):
    """支付提供商抽象基類"""
    
    @abstractmethod
    async def create_checkout_session(
        self,
        user_id: str,
        plan_id: str,
        billing_cycle: str,  # monthly, yearly
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """創建結帳會話"""
        pass
    
    @abstractmethod
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """取消訂閱"""
        pass
    
    @abstractmethod
    async def get_subscription(self, subscription_id: str) -> Optional[Dict]:
        """獲取訂閱信息"""
        pass
    
    @abstractmethod
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """驗證 Webhook 簽名"""
        pass


# ==================== Stripe 提供商 ====================

class StripeProvider(PaymentProvider):
    """Stripe 支付提供商"""
    
    def __init__(self):
        self.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
        self.webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
        self._stripe = None
    
    @property
    def stripe(self):
        if self._stripe is None:
            try:
                import stripe
                stripe.api_key = self.api_key
                self._stripe = stripe
            except ImportError:
                logger.warning("Stripe SDK not installed")
                return None
        return self._stripe
    
    async def create_checkout_session(
        self,
        user_id: str,
        plan_id: str,
        billing_cycle: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        if not self.stripe:
            return {'success': False, 'error': 'Stripe not configured'}
        
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            return {'success': False, 'error': 'Invalid plan'}
        
        price_key = f'stripe_price_{billing_cycle}'
        price_id = plan.get(price_key)
        
        if not price_id:
            return {'success': False, 'error': 'Price not configured'}
        
        try:
            session = self.stripe.checkout.Session.create(
                mode='subscription',
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=user_id,
                metadata={
                    'user_id': user_id,
                    'plan_id': plan_id,
                    'billing_cycle': billing_cycle
                }
            )
            
            return {
                'success': True,
                'session_id': session.id,
                'url': session.url
            }
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        if not self.stripe:
            return False
        
        try:
            self.stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return True
        except Exception as e:
            logger.error(f"Stripe cancel error: {e}")
            return False
    
    async def get_subscription(self, subscription_id: str) -> Optional[Dict]:
        if not self.stripe:
            return None
        
        try:
            sub = self.stripe.Subscription.retrieve(subscription_id)
            return {
                'id': sub.id,
                'status': sub.status,
                'current_period_start': sub.current_period_start,
                'current_period_end': sub.current_period_end,
                'cancel_at_period_end': sub.cancel_at_period_end
            }
        except Exception as e:
            logger.error(f"Stripe get subscription error: {e}")
            return None
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        if not self.stripe or not self.webhook_secret:
            return False
        
        try:
            self.stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return True
        except Exception:
            return False


# ==================== Demo 提供商（用於測試）====================

class DemoProvider(PaymentProvider):
    """Demo 支付提供商（用於測試）"""
    
    async def create_checkout_session(
        self,
        user_id: str,
        plan_id: str,
        billing_cycle: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        # 模擬結帳會話
        import uuid
        session_id = f"demo_session_{uuid.uuid4().hex[:8]}"
        
        return {
            'success': True,
            'session_id': session_id,
            'url': f"{success_url}?session_id={session_id}&demo=true",
            'demo': True
        }
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        return True
    
    async def get_subscription(self, subscription_id: str) -> Optional[Dict]:
        return {
            'id': subscription_id,
            'status': 'active',
            'current_period_start': datetime.utcnow().isoformat(),
            'current_period_end': (datetime.utcnow() + timedelta(days=30)).isoformat(),
            'cancel_at_period_end': False,
            'demo': True
        }
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        # Demo 模式總是通過
        return True


# ==================== 支付服務 ====================

class PaymentService:
    """統一支付服務"""
    
    _instance = None
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH', 
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._providers: Dict[str, PaymentProvider] = {}
        self._default_provider = 'demo'
        self._init_providers()
        self._init_db()
    
    def _init_providers(self):
        """初始化支付提供商"""
        # Stripe
        if os.environ.get('STRIPE_SECRET_KEY'):
            self._providers['stripe'] = StripeProvider()
            self._default_provider = 'stripe'
            logger.info("Stripe provider initialized")
        
        # Demo（總是可用）
        self._providers['demo'] = DemoProvider()
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 交易記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    status TEXT DEFAULT 'pending',
                    type TEXT DEFAULT 'subscription',
                    description TEXT,
                    provider TEXT,
                    provider_transaction_id TEXT,
                    metadata TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            
            # 訂閱記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE,
                    plan_id TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    current_period_start TEXT,
                    current_period_end TEXT,
                    cancel_at_period_end INTEGER DEFAULT 0,
                    cancelled_at TEXT,
                    provider TEXT,
                    provider_subscription_id TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            
            # 支付方式表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payment_methods (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT,
                    last_four TEXT,
                    brand TEXT,
                    exp_month INTEGER,
                    exp_year INTEGER,
                    is_default INTEGER DEFAULT 0,
                    provider_id TEXT,
                    created_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Payment DB init error: {e}")
    
    def get_provider(self, name: str = None) -> PaymentProvider:
        """獲取支付提供商"""
        name = name or self._default_provider
        return self._providers.get(name, self._providers.get('demo'))
    
    # ==================== 結帳相關 ====================
    
    async def create_checkout(
        self,
        user_id: str,
        plan_id: str,
        billing_cycle: str = 'monthly',
        success_url: str = '',
        cancel_url: str = '',
        provider: str = None
    ) -> Dict[str, Any]:
        """創建結帳會話"""
        if plan_id == 'free':
            return {'success': False, 'error': 'Cannot checkout free plan'}
        
        provider_instance = self.get_provider(provider)
        result = await provider_instance.create_checkout_session(
            user_id, plan_id, billing_cycle, success_url, cancel_url
        )
        
        if result.get('success'):
            # 記錄待處理交易
            plan = SUBSCRIPTION_PLANS.get(plan_id, {})
            price_key = f'price_{billing_cycle}'
            amount = plan.get(price_key, 0)
            
            await self._create_transaction(
                user_id=user_id,
                amount=amount,
                type='subscription',
                description=f'Subscription to {plan_id} ({billing_cycle})',
                provider=provider or self._default_provider,
                metadata={
                    'plan_id': plan_id,
                    'billing_cycle': billing_cycle,
                    'session_id': result.get('session_id')
                }
            )
        
        return result
    
    # ==================== 訂閱管理 ====================
    
    async def get_subscription(self, user_id: str) -> Optional[Subscription]:
        """獲取用戶訂閱"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT * FROM subscriptions WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return Subscription(
                    id=row[0],
                    user_id=row[1],
                    plan_id=row[2],
                    status=SubscriptionStatus(row[3]),
                    current_period_start=row[4],
                    current_period_end=row[5],
                    cancel_at_period_end=bool(row[6]),
                    cancelled_at=row[7],
                    provider=row[8],
                    provider_subscription_id=row[9],
                    created_at=row[10],
                    updated_at=row[11]
                )
            return None
        except Exception as e:
            logger.error(f"Get subscription error: {e}")
            return None
    
    async def cancel_subscription(self, user_id: str) -> Dict[str, Any]:
        """取消訂閱"""
        sub = await self.get_subscription(user_id)
        if not sub:
            return {'success': False, 'error': 'No active subscription'}
        
        if sub.status == SubscriptionStatus.CANCELLED:
            return {'success': False, 'error': 'Already cancelled'}
        
        # 調用支付提供商取消
        provider = self.get_provider(sub.provider)
        if sub.provider_subscription_id:
            await provider.cancel_subscription(sub.provider_subscription_id)
        
        # 更新本地記錄
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.utcnow().isoformat()
            cursor.execute('''
                UPDATE subscriptions 
                SET cancel_at_period_end = 1, cancelled_at = ?, updated_at = ?
                WHERE user_id = ?
            ''', (now, now, user_id))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Subscription will cancel at {sub.current_period_end}'
            }
        except Exception as e:
            logger.error(f"Cancel subscription error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def activate_subscription(
        self,
        user_id: str,
        plan_id: str,
        provider: str,
        provider_subscription_id: str,
        period_end: datetime = None
    ) -> Subscription:
        """激活訂閱（Webhook 調用）"""
        import uuid
        
        now = datetime.utcnow()
        period_end = period_end or (now + timedelta(days=30))
        
        sub = Subscription(
            id=f"sub_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=now.isoformat(),
            current_period_end=period_end.isoformat(),
            provider=provider,
            provider_subscription_id=provider_subscription_id,
            created_at=now.isoformat(),
            updated_at=now.isoformat()
        )
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 使用 REPLACE 更新或插入
            cursor.execute('''
                INSERT OR REPLACE INTO subscriptions 
                (id, user_id, plan_id, status, current_period_start, 
                 current_period_end, cancel_at_period_end, provider,
                 provider_subscription_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                sub.id, sub.user_id, sub.plan_id, sub.status.value,
                sub.current_period_start, sub.current_period_end,
                0, sub.provider, sub.provider_subscription_id,
                sub.created_at, sub.updated_at
            ))
            
            conn.commit()
            conn.close()
            
            # 更新用戶權限
            await self._update_user_features(user_id, plan_id)
            
            logger.info(f"Subscription activated: {user_id} -> {plan_id}")
            return sub
            
        except Exception as e:
            logger.error(f"Activate subscription error: {e}")
            raise
    
    # ==================== 交易記錄 ====================
    
    async def _create_transaction(
        self,
        user_id: str,
        amount: int,
        type: str = 'subscription',
        description: str = '',
        provider: str = '',
        metadata: Dict = None
    ) -> Transaction:
        """創建交易記錄"""
        import uuid
        
        now = datetime.utcnow().isoformat()
        tx = Transaction(
            id=f"tx_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            amount=amount,
            status=PaymentStatus.PENDING,
            type=type,
            description=description,
            provider=provider,
            metadata=metadata or {},
            created_at=now,
            updated_at=now
        )
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO transactions 
                (id, user_id, amount, currency, status, type, description,
                 provider, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tx.id, tx.user_id, tx.amount, tx.currency, tx.status.value,
                tx.type, tx.description, tx.provider,
                json.dumps(tx.metadata), tx.created_at, tx.updated_at
            ))
            
            conn.commit()
            conn.close()
            
            return tx
        except Exception as e:
            logger.error(f"Create transaction error: {e}")
            raise
    
    async def get_transactions(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Transaction]:
        """獲取交易記錄"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM transactions 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (user_id, limit))
            
            rows = cursor.fetchall()
            conn.close()
            
            transactions = []
            for row in rows:
                transactions.append(Transaction(
                    id=row[0],
                    user_id=row[1],
                    amount=row[2],
                    currency=row[3],
                    status=PaymentStatus(row[4]),
                    type=row[5],
                    description=row[6],
                    provider=row[7],
                    provider_transaction_id=row[8],
                    metadata=json.loads(row[9]) if row[9] else {},
                    created_at=row[10],
                    updated_at=row[11]
                ))
            
            return transactions
        except Exception as e:
            logger.error(f"Get transactions error: {e}")
            return []
    
    # ==================== 輔助方法 ====================
    
    async def _update_user_features(self, user_id: str, plan_id: str):
        """更新用戶功能權限"""
        plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS['free'])
        features = plan.get('features', {})
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE user_profiles 
                SET subscription_tier = ?,
                    max_accounts = ?,
                    max_api_calls = ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (
                plan_id,
                features.get('max_accounts', 2),
                features.get('max_api_calls', 100),
                datetime.utcnow().isoformat(),
                user_id
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Update user features error: {e}")
    
    async def handle_webhook(self, event_type: str, data: Dict) -> Dict:
        """處理 Webhook 事件"""
        handlers = {
            'checkout.session.completed': self._handle_checkout_completed,
            'customer.subscription.updated': self._handle_subscription_updated,
            'customer.subscription.deleted': self._handle_subscription_deleted,
            'invoice.payment_succeeded': self._handle_payment_succeeded,
            'invoice.payment_failed': self._handle_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            return await handler(data)
        
        logger.info(f"Unhandled webhook event: {event_type}")
        return {'handled': False}
    
    async def _handle_checkout_completed(self, data: Dict) -> Dict:
        """處理結帳完成"""
        user_id = data.get('client_reference_id') or data.get('metadata', {}).get('user_id')
        subscription_id = data.get('subscription')
        
        if user_id and subscription_id:
            metadata = data.get('metadata', {})
            await self.activate_subscription(
                user_id=user_id,
                plan_id=metadata.get('plan_id', 'basic'),
                provider='stripe',
                provider_subscription_id=subscription_id
            )
            return {'handled': True, 'user_id': user_id}
        
        return {'handled': False}
    
    async def _handle_subscription_updated(self, data: Dict) -> Dict:
        """處理訂閱更新"""
        # 實現訂閱更新邏輯
        return {'handled': True}
    
    async def _handle_subscription_deleted(self, data: Dict) -> Dict:
        """處理訂閱刪除"""
        # 實現訂閱刪除邏輯
        return {'handled': True}
    
    async def _handle_payment_succeeded(self, data: Dict) -> Dict:
        """處理付款成功"""
        return {'handled': True}
    
    async def _handle_payment_failed(self, data: Dict) -> Dict:
        """處理付款失敗"""
        # 發送郵件通知等
        return {'handled': True}


# ==================== 單例訪問 ====================

_payment_service: Optional[PaymentService] = None


def get_payment_service() -> PaymentService:
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service

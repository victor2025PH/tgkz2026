"""
統一支付網關

功能：
1. 多支付渠道統一接口
2. 支付狀態追蹤
3. Webhook 處理
4. 發票生成
5. 財務報表
"""

import os
import json
import hashlib
import hmac
import sqlite3
import logging
import asyncio
import threading
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class PaymentProvider(str, Enum):
    STRIPE = 'stripe'
    ALIPAY = 'alipay'
    WECHAT = 'wechat'
    PAYPAL = 'paypal'
    USDT = 'usdt'
    EPAY = 'epay'
    DEMO = 'demo'


class PaymentType(str, Enum):
    SUBSCRIPTION = 'subscription'
    ONE_TIME = 'one_time'
    QUOTA_PACK = 'quota_pack'
    OVERAGE = 'overage'


class PaymentState(str, Enum):
    CREATED = 'created'
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    REFUNDED = 'refunded'
    EXPIRED = 'expired'


class InvoiceStatus(str, Enum):
    DRAFT = 'draft'
    ISSUED = 'issued'
    PAID = 'paid'
    VOID = 'void'


# ==================== 數據模型 ====================

@dataclass
class PaymentIntent:
    """支付意圖"""
    id: str
    user_id: str
    amount: int                      # 分為單位
    currency: str = 'CNY'
    provider: PaymentProvider = PaymentProvider.DEMO
    payment_type: PaymentType = PaymentType.ONE_TIME
    state: PaymentState = PaymentState.CREATED
    description: str = ''
    metadata: Dict = field(default_factory=dict)
    
    # 提供商相關
    provider_session_id: str = ''
    provider_payment_id: str = ''
    
    # 支付資訊
    pay_url: str = ''
    qr_code: str = ''
    
    # 時間
    created_at: str = ''
    expires_at: str = ''
    completed_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['provider'] = self.provider.value
        d['payment_type'] = self.payment_type.value
        d['state'] = self.state.value
        return d


@dataclass
class Invoice:
    """發票"""
    id: str
    user_id: str
    payment_id: str
    invoice_number: str
    
    # 金額
    subtotal: int
    tax: int = 0
    total: int = 0
    currency: str = 'CNY'
    
    # 買方信息
    buyer_name: str = ''
    buyer_email: str = ''
    buyer_address: str = ''
    buyer_tax_id: str = ''
    
    # 賣方信息
    seller_name: str = 'TG-Matrix'
    seller_address: str = ''
    seller_tax_id: str = ''
    
    # 項目
    items: List[Dict] = field(default_factory=list)
    
    # 狀態
    status: InvoiceStatus = InvoiceStatus.DRAFT
    issued_at: str = ''
    due_date: str = ''
    paid_at: str = ''
    
    # PDF
    pdf_url: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['status'] = self.status.value
        return d


@dataclass
class ProviderConfig:
    """支付提供商配置"""
    # Stripe
    stripe_secret_key: str = ''
    stripe_publishable_key: str = ''
    stripe_webhook_secret: str = ''
    
    # PayPal
    paypal_client_id: str = ''
    paypal_client_secret: str = ''
    paypal_mode: str = 'sandbox'  # sandbox | live
    
    # 支付寶
    alipay_app_id: str = ''
    alipay_private_key: str = ''
    alipay_public_key: str = ''
    alipay_gateway: str = 'https://openapi.alipay.com/gateway.do'
    
    # 微信支付
    wechat_app_id: str = ''
    wechat_mch_id: str = ''
    wechat_api_key: str = ''
    wechat_cert_path: str = ''
    
    # USDT
    usdt_trc20_address: str = ''
    usdt_erc20_address: str = ''
    usdt_rate: float = 7.2
    
    # 易支付
    epay_url: str = ''
    epay_pid: str = ''
    epay_key: str = ''
    
    # 通用
    notify_base_url: str = ''
    return_base_url: str = ''


# ==================== 支付處理器抽象 ====================

class PaymentHandler(ABC):
    """支付處理器抽象基類"""
    
    @property
    @abstractmethod
    def provider(self) -> PaymentProvider:
        pass
    
    @abstractmethod
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """創建支付"""
        pass
    
    @abstractmethod
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        """驗證支付狀態"""
        pass
    
    @abstractmethod
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        """處理 Webhook"""
        pass
    
    @abstractmethod
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        """退款"""
        pass


# ==================== Stripe 處理器 ====================

class StripeHandler(PaymentHandler):
    """Stripe 支付處理器"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._stripe = None
    
    @property
    def provider(self) -> PaymentProvider:
        return PaymentProvider.STRIPE
    
    @property
    def stripe(self):
        if self._stripe is None and self.config.stripe_secret_key:
            try:
                import stripe
                stripe.api_key = self.config.stripe_secret_key
                self._stripe = stripe
            except ImportError:
                logger.warning("Stripe SDK not installed")
        return self._stripe
    
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        if not self.stripe:
            return False, 'Stripe 未配置', {}
        
        try:
            mode = 'subscription' if intent.payment_type == PaymentType.SUBSCRIPTION else 'payment'
            
            session_params = {
                'mode': mode,
                'success_url': success_url,
                'cancel_url': cancel_url,
                'client_reference_id': intent.user_id,
                'metadata': {
                    'intent_id': intent.id,
                    'user_id': intent.user_id,
                    **intent.metadata
                }
            }
            
            if mode == 'payment':
                session_params['line_items'] = [{
                    'price_data': {
                        'currency': intent.currency.lower(),
                        'unit_amount': intent.amount,
                        'product_data': {
                            'name': intent.description or 'TG-Matrix Payment'
                        }
                    },
                    'quantity': 1
                }]
            else:
                # 訂閱需要預設的 price ID
                price_id = intent.metadata.get('stripe_price_id')
                if not price_id:
                    return False, '缺少訂閱價格 ID', {}
                session_params['line_items'] = [{
                    'price': price_id,
                    'quantity': 1
                }]
            
            session = self.stripe.checkout.Session.create(**session_params)
            
            return True, 'success', {
                'session_id': session.id,
                'pay_url': session.url
            }
            
        except Exception as e:
            logger.error(f"Stripe create payment error: {e}")
            return False, str(e), {}
    
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        if not self.stripe or not intent.provider_session_id:
            return False, intent.state
        
        try:
            session = self.stripe.checkout.Session.retrieve(intent.provider_session_id)
            
            if session.payment_status == 'paid':
                return True, PaymentState.COMPLETED
            elif session.status == 'expired':
                return False, PaymentState.EXPIRED
            
            return False, PaymentState.PENDING
            
        except Exception as e:
            logger.error(f"Stripe verify error: {e}")
            return False, intent.state
    
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        if not self.stripe:
            return False, 'Stripe 未配置', None
        
        signature = headers.get('stripe-signature', '')
        
        try:
            event = self.stripe.Webhook.construct_event(
                payload, signature, self.config.stripe_webhook_secret
            )
            
            event_type = event['type']
            data = event['data']['object']
            
            if event_type == 'checkout.session.completed':
                intent_id = data.get('metadata', {}).get('intent_id')
                return True, 'payment_completed', intent_id
            
            elif event_type == 'payment_intent.payment_failed':
                intent_id = data.get('metadata', {}).get('intent_id')
                return False, 'payment_failed', intent_id
            
            elif event_type == 'customer.subscription.deleted':
                return True, 'subscription_cancelled', data.get('id')
            
            return True, event_type, None
            
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return False, str(e), None
    
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        if not self.stripe or not intent.provider_payment_id:
            return False, 'Stripe 未配置或缺少支付 ID'
        
        try:
            params = {'payment_intent': intent.provider_payment_id}
            if amount:
                params['amount'] = amount
            
            self.stripe.Refund.create(**params)
            return True, 'success'
            
        except Exception as e:
            logger.error(f"Stripe refund error: {e}")
            return False, str(e)


# ==================== PayPal 處理器 ====================

class PayPalHandler(PaymentHandler):
    """PayPal 支付處理器"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._access_token = None
        self._token_expires = None
    
    @property
    def provider(self) -> PaymentProvider:
        return PaymentProvider.PAYPAL
    
    @property
    def api_base(self) -> str:
        if self.config.paypal_mode == 'live':
            return 'https://api-m.paypal.com'
        return 'https://api-m.sandbox.paypal.com'
    
    async def _get_access_token(self) -> Optional[str]:
        """獲取 PayPal 訪問令牌"""
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._access_token
        
        if not self.config.paypal_client_id or not self.config.paypal_client_secret:
            return None
        
        try:
            import aiohttp
            import base64
            
            auth = base64.b64encode(
                f"{self.config.paypal_client_id}:{self.config.paypal_client_secret}".encode()
            ).decode()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/v1/oauth2/token",
                    headers={
                        'Authorization': f'Basic {auth}',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data='grant_type=client_credentials'
                ) as resp:
                    data = await resp.json()
                    self._access_token = data.get('access_token')
                    expires_in = data.get('expires_in', 3600)
                    self._token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                    return self._access_token
                    
        except Exception as e:
            logger.error(f"PayPal get token error: {e}")
            return None
    
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        token = await self._get_access_token()
        if not token:
            return False, 'PayPal 未配置', {}
        
        try:
            import aiohttp
            
            amount_str = f"{intent.amount / 100:.2f}"
            
            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": intent.currency.upper() if intent.currency.upper() in ['USD', 'EUR', 'GBP'] else 'USD',
                        "value": amount_str
                    },
                    "description": intent.description or "TG-Matrix Payment",
                    "custom_id": intent.id
                }],
                "application_context": {
                    "return_url": success_url,
                    "cancel_url": cancel_url,
                    "brand_name": "TG-Matrix",
                    "user_action": "PAY_NOW"
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/v2/checkout/orders",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    json=order_data
                ) as resp:
                    data = await resp.json()
                    
                    if resp.status != 201:
                        return False, data.get('message', 'PayPal error'), {}
                    
                    order_id = data.get('id')
                    approve_url = next(
                        (link['href'] for link in data.get('links', []) if link['rel'] == 'approve'),
                        None
                    )
                    
                    return True, 'success', {
                        'order_id': order_id,
                        'pay_url': approve_url
                    }
                    
        except Exception as e:
            logger.error(f"PayPal create payment error: {e}")
            return False, str(e), {}
    
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        token = await self._get_access_token()
        if not token or not intent.provider_session_id:
            return False, intent.state
        
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_base}/v2/checkout/orders/{intent.provider_session_id}",
                    headers={'Authorization': f'Bearer {token}'}
                ) as resp:
                    data = await resp.json()
                    
                    status = data.get('status')
                    if status == 'COMPLETED':
                        return True, PaymentState.COMPLETED
                    elif status == 'APPROVED':
                        # 需要捕獲付款
                        capture_result = await self._capture_order(intent.provider_session_id, token)
                        if capture_result:
                            return True, PaymentState.COMPLETED
                    
                    return False, PaymentState.PENDING
                    
        except Exception as e:
            logger.error(f"PayPal verify error: {e}")
            return False, intent.state
    
    async def _capture_order(self, order_id: str, token: str) -> bool:
        """捕獲 PayPal 訂單"""
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/v2/checkout/orders/{order_id}/capture",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    }
                ) as resp:
                    return resp.status == 201
                    
        except Exception as e:
            logger.error(f"PayPal capture error: {e}")
            return False
    
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        # PayPal Webhook 驗證較複雜，這裡簡化處理
        try:
            data = json.loads(payload)
            event_type = data.get('event_type', '')
            resource = data.get('resource', {})
            
            if event_type == 'CHECKOUT.ORDER.APPROVED':
                intent_id = resource.get('purchase_units', [{}])[0].get('custom_id')
                return True, 'payment_approved', intent_id
            
            elif event_type == 'PAYMENT.CAPTURE.COMPLETED':
                intent_id = resource.get('custom_id')
                return True, 'payment_completed', intent_id
            
            return True, event_type, None
            
        except Exception as e:
            logger.error(f"PayPal webhook error: {e}")
            return False, str(e), None
    
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        token = await self._get_access_token()
        if not token:
            return False, 'PayPal 未配置'
        
        capture_id = intent.metadata.get('capture_id')
        if not capture_id:
            return False, '缺少捕獲 ID'
        
        try:
            import aiohttp
            
            refund_data = {}
            if amount:
                refund_data = {
                    "amount": {
                        "value": f"{amount / 100:.2f}",
                        "currency_code": intent.currency.upper()
                    }
                }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/v2/payments/captures/{capture_id}/refund",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    json=refund_data
                ) as resp:
                    if resp.status == 201:
                        return True, 'success'
                    data = await resp.json()
                    return False, data.get('message', 'Refund failed')
                    
        except Exception as e:
            logger.error(f"PayPal refund error: {e}")
            return False, str(e)


# ==================== 支付寶處理器 ====================

class AlipayHandler(PaymentHandler):
    """支付寶處理器"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
    
    @property
    def provider(self) -> PaymentProvider:
        return PaymentProvider.ALIPAY
    
    def _sign(self, params: Dict[str, str]) -> str:
        """生成簽名"""
        # 簡化版簽名，實際需要 RSA2
        sorted_params = sorted(params.items())
        sign_str = '&'.join(f'{k}={v}' for k, v in sorted_params if v)
        return hashlib.md5(sign_str.encode()).hexdigest()
    
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        if not self.config.alipay_app_id:
            # 返回模擬數據
            return True, 'success', {
                'pay_url': f"https://openapi.alipay.com/gateway.do?intent={intent.id}",
                'qr_code': f"https://qr.alipay.com/{intent.id}"
            }
        
        try:
            params = {
                'app_id': self.config.alipay_app_id,
                'method': 'alipay.trade.precreate',
                'charset': 'utf-8',
                'sign_type': 'RSA2',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'version': '1.0',
                'notify_url': f"{self.config.notify_base_url}/webhooks/alipay",
                'biz_content': json.dumps({
                    'out_trade_no': intent.id,
                    'total_amount': f"{intent.amount / 100:.2f}",
                    'subject': intent.description or 'TG-Matrix',
                })
            }
            
            # TODO: 實際 RSA2 簽名
            params['sign'] = self._sign(params)
            
            # TODO: 調用支付寶 API
            # async with aiohttp.ClientSession() as session:
            #     async with session.post(self.config.alipay_gateway, data=params) as resp:
            #         ...
            
            return True, 'success', {
                'pay_url': f"{self.config.alipay_gateway}?intent={intent.id}",
                'qr_code': ''
            }
            
        except Exception as e:
            logger.error(f"Alipay create payment error: {e}")
            return False, str(e), {}
    
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        # TODO: 查詢支付寶訂單狀態
        return False, intent.state
    
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        try:
            # 解析表單數據
            data = dict(x.split('=') for x in payload.decode().split('&'))
            
            # TODO: 驗證簽名
            
            trade_status = data.get('trade_status')
            intent_id = data.get('out_trade_no')
            
            if trade_status == 'TRADE_SUCCESS':
                return True, 'payment_completed', intent_id
            
            return False, trade_status or 'unknown', intent_id
            
        except Exception as e:
            logger.error(f"Alipay webhook error: {e}")
            return False, str(e), None
    
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        # TODO: 支付寶退款
        return False, '支付寶退款暫未實現'


# ==================== 微信支付處理器 ====================

class WechatPayHandler(PaymentHandler):
    """微信支付處理器"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
    
    @property
    def provider(self) -> PaymentProvider:
        return PaymentProvider.WECHAT
    
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        if not self.config.wechat_mch_id:
            return True, 'success', {
                'pay_url': f"weixin://wxpay/bizpayurl?intent={intent.id}",
                'qr_code': f"weixin://wxpay/bizpayurl?intent={intent.id}"
            }
        
        # TODO: 實際微信支付實現
        return True, 'success', {'pay_url': '', 'qr_code': ''}
    
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        return False, intent.state
    
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        try:
            # 解析 XML
            import xml.etree.ElementTree as ET
            root = ET.fromstring(payload)
            
            result_code = root.findtext('result_code')
            intent_id = root.findtext('out_trade_no')
            
            if result_code == 'SUCCESS':
                return True, 'payment_completed', intent_id
            
            return False, result_code or 'unknown', intent_id
            
        except Exception as e:
            logger.error(f"Wechat webhook error: {e}")
            return False, str(e), None
    
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        return False, '微信退款暫未實現'


# ==================== Demo 處理器 ====================

class DemoHandler(PaymentHandler):
    """演示支付處理器"""
    
    @property
    def provider(self) -> PaymentProvider:
        return PaymentProvider.DEMO
    
    async def create_payment(
        self,
        intent: PaymentIntent,
        success_url: str,
        cancel_url: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        return True, 'success', {
            'pay_url': f"{success_url}?intent_id={intent.id}",
            'qr_code': ''
        }
    
    async def verify_payment(self, intent: PaymentIntent) -> Tuple[bool, PaymentState]:
        return True, PaymentState.COMPLETED
    
    async def process_webhook(
        self,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str, Optional[str]]:
        return True, 'demo_webhook', None
    
    async def refund(self, intent: PaymentIntent, amount: int = None) -> Tuple[bool, str]:
        return True, 'success'


# ==================== 統一支付服務 ====================

class UnifiedPaymentService:
    """統一支付服務"""
    
    _instance: Optional['UnifiedPaymentService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None, config: ProviderConfig = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None, config: ProviderConfig = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        self.config = config or self._load_config_from_env()
        self._handlers: Dict[PaymentProvider, PaymentHandler] = {}
        self._init_handlers()
        self._init_db()
        self._initialized = True
        logger.info("UnifiedPaymentService initialized")
    
    def _load_config_from_env(self) -> ProviderConfig:
        """從環境變量加載配置"""
        return ProviderConfig(
            stripe_secret_key=os.environ.get('STRIPE_SECRET_KEY', ''),
            stripe_publishable_key=os.environ.get('STRIPE_PUBLISHABLE_KEY', ''),
            stripe_webhook_secret=os.environ.get('STRIPE_WEBHOOK_SECRET', ''),
            paypal_client_id=os.environ.get('PAYPAL_CLIENT_ID', ''),
            paypal_client_secret=os.environ.get('PAYPAL_CLIENT_SECRET', ''),
            paypal_mode=os.environ.get('PAYPAL_MODE', 'sandbox'),
            alipay_app_id=os.environ.get('ALIPAY_APP_ID', ''),
            wechat_mch_id=os.environ.get('WECHAT_MCH_ID', ''),
            notify_base_url=os.environ.get('NOTIFY_BASE_URL', ''),
            return_base_url=os.environ.get('RETURN_BASE_URL', ''),
        )
    
    def _init_handlers(self):
        """初始化支付處理器"""
        self._handlers[PaymentProvider.STRIPE] = StripeHandler(self.config)
        self._handlers[PaymentProvider.PAYPAL] = PayPalHandler(self.config)
        self._handlers[PaymentProvider.ALIPAY] = AlipayHandler(self.config)
        self._handlers[PaymentProvider.WECHAT] = WechatPayHandler(self.config)
        self._handlers[PaymentProvider.DEMO] = DemoHandler()
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 支付意圖表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payment_intents (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT DEFAULT 'CNY',
                    provider TEXT,
                    payment_type TEXT,
                    state TEXT DEFAULT 'created',
                    description TEXT,
                    metadata TEXT,
                    provider_session_id TEXT,
                    provider_payment_id TEXT,
                    pay_url TEXT,
                    qr_code TEXT,
                    created_at TEXT,
                    expires_at TEXT,
                    completed_at TEXT
                )
            ''')
            
            # 發票表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    payment_id TEXT,
                    invoice_number TEXT UNIQUE,
                    subtotal INTEGER,
                    tax INTEGER DEFAULT 0,
                    total INTEGER,
                    currency TEXT DEFAULT 'CNY',
                    buyer_name TEXT,
                    buyer_email TEXT,
                    buyer_address TEXT,
                    buyer_tax_id TEXT,
                    seller_name TEXT DEFAULT 'TG-Matrix',
                    seller_address TEXT,
                    seller_tax_id TEXT,
                    items TEXT,
                    status TEXT DEFAULT 'draft',
                    issued_at TEXT,
                    due_date TEXT,
                    paid_at TEXT,
                    pdf_url TEXT
                )
            ''')
            
            # 財務記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS financial_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    type TEXT NOT NULL,
                    provider TEXT,
                    amount INTEGER,
                    currency TEXT DEFAULT 'CNY',
                    transaction_count INTEGER DEFAULT 0,
                    fees INTEGER DEFAULT 0,
                    net_amount INTEGER DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_intents_user ON payment_intents(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_intents_state ON payment_intents(state)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_records(date)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init payment DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_handler(self, provider: PaymentProvider) -> Optional[PaymentHandler]:
        """獲取支付處理器"""
        return self._handlers.get(provider)
    
    # ==================== 支付意圖 ====================
    
    async def create_payment_intent(
        self,
        user_id: str,
        amount: int,
        currency: str = 'CNY',
        provider: PaymentProvider = PaymentProvider.DEMO,
        payment_type: PaymentType = PaymentType.ONE_TIME,
        description: str = '',
        metadata: Dict = None,
        success_url: str = None,
        cancel_url: str = None
    ) -> Tuple[bool, str, Optional[PaymentIntent]]:
        """創建支付意圖"""
        
        intent_id = f"pi_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()
        expires = now + timedelta(hours=1)
        
        intent = PaymentIntent(
            id=intent_id,
            user_id=user_id,
            amount=amount,
            currency=currency,
            provider=provider,
            payment_type=payment_type,
            description=description,
            metadata=metadata or {},
            created_at=now.isoformat(),
            expires_at=expires.isoformat()
        )
        
        # 獲取處理器並創建支付
        handler = self.get_handler(provider)
        if not handler:
            return False, f'不支持的支付提供商: {provider.value}', None
        
        success_url = success_url or f"{self.config.return_base_url}/payment/success"
        cancel_url = cancel_url or f"{self.config.return_base_url}/payment/cancel"
        
        success, message, result = await handler.create_payment(intent, success_url, cancel_url)
        
        if not success:
            return False, message, None
        
        intent.provider_session_id = result.get('session_id') or result.get('order_id', '')
        intent.pay_url = result.get('pay_url', '')
        intent.qr_code = result.get('qr_code', '')
        intent.state = PaymentState.PENDING
        
        # 保存到數據庫
        try:
            db = self._get_db()
            db.execute('''
                INSERT INTO payment_intents 
                (id, user_id, amount, currency, provider, payment_type, state,
                 description, metadata, provider_session_id, pay_url, qr_code,
                 created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                intent.id, intent.user_id, intent.amount, intent.currency,
                intent.provider.value, intent.payment_type.value, intent.state.value,
                intent.description, json.dumps(intent.metadata),
                intent.provider_session_id, intent.pay_url, intent.qr_code,
                intent.created_at, intent.expires_at
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Save payment intent error: {e}")
        
        return True, 'success', intent
    
    async def get_payment_intent(self, intent_id: str) -> Optional[PaymentIntent]:
        """獲取支付意圖"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT * FROM payment_intents WHERE id = ?',
                (intent_id,)
            ).fetchone()
            db.close()
            
            if row:
                return PaymentIntent(
                    id=row['id'],
                    user_id=row['user_id'],
                    amount=row['amount'],
                    currency=row['currency'],
                    provider=PaymentProvider(row['provider']),
                    payment_type=PaymentType(row['payment_type']),
                    state=PaymentState(row['state']),
                    description=row['description'] or '',
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    provider_session_id=row['provider_session_id'] or '',
                    provider_payment_id=row['provider_payment_id'] or '',
                    pay_url=row['pay_url'] or '',
                    qr_code=row['qr_code'] or '',
                    created_at=row['created_at'] or '',
                    expires_at=row['expires_at'] or '',
                    completed_at=row['completed_at'] or ''
                )
            return None
        except Exception as e:
            logger.error(f"Get payment intent error: {e}")
            return None
    
    async def update_payment_state(
        self,
        intent_id: str,
        state: PaymentState,
        provider_payment_id: str = None
    ):
        """更新支付狀態"""
        try:
            db = self._get_db()
            
            update_fields = ['state = ?']
            params = [state.value]
            
            if state == PaymentState.COMPLETED:
                update_fields.append('completed_at = ?')
                params.append(datetime.utcnow().isoformat())
            
            if provider_payment_id:
                update_fields.append('provider_payment_id = ?')
                params.append(provider_payment_id)
            
            params.append(intent_id)
            
            db.execute(
                f'UPDATE payment_intents SET {", ".join(update_fields)} WHERE id = ?',
                params
            )
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Update payment state error: {e}")
    
    async def verify_payment(self, intent_id: str) -> Tuple[bool, PaymentState]:
        """驗證支付狀態"""
        intent = await self.get_payment_intent(intent_id)
        if not intent:
            return False, PaymentState.FAILED
        
        if intent.state == PaymentState.COMPLETED:
            return True, PaymentState.COMPLETED
        
        handler = self.get_handler(intent.provider)
        if not handler:
            return False, intent.state
        
        success, new_state = await handler.verify_payment(intent)
        
        if new_state != intent.state:
            await self.update_payment_state(intent_id, new_state)
        
        return success, new_state
    
    # ==================== Webhook ====================
    
    async def handle_webhook(
        self,
        provider: PaymentProvider,
        payload: bytes,
        headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        """處理 Webhook"""
        handler = self.get_handler(provider)
        if not handler:
            return False, f'不支持的提供商: {provider.value}'
        
        success, event_type, intent_id = await handler.process_webhook(payload, headers)
        
        if success and intent_id and event_type == 'payment_completed':
            await self.update_payment_state(intent_id, PaymentState.COMPLETED)
            
            # 觸發支付完成回調
            await self._on_payment_completed(intent_id)
        
        return success, event_type
    
    async def _on_payment_completed(self, intent_id: str):
        """支付完成回調"""
        intent = await self.get_payment_intent(intent_id)
        if not intent:
            return
        
        try:
            # 自動生成發票
            await self.create_invoice(intent_id)
            
            # 更新用戶訂閱/配額
            if intent.payment_type == PaymentType.SUBSCRIPTION:
                # TODO: 更新用戶訂閱
                pass
            elif intent.payment_type == PaymentType.QUOTA_PACK:
                # TODO: 添加配額包
                pass
            
            # 記錄財務數據
            await self._record_financial_transaction(intent)
            
            # 發送通知
            from .realtime import notify_user
            notify_user(intent.user_id, 'payment_completed', {
                'intent_id': intent_id,
                'amount': intent.amount,
                'description': intent.description
            })
            
        except Exception as e:
            logger.error(f"Payment completed callback error: {e}")
    
    async def _record_financial_transaction(self, intent: PaymentIntent):
        """記錄財務交易"""
        try:
            db = self._get_db()
            today = datetime.utcnow().strftime('%Y-%m-%d')
            
            # 估算手續費（簡化）
            fee_rates = {
                PaymentProvider.STRIPE: 0.029,
                PaymentProvider.PAYPAL: 0.035,
                PaymentProvider.ALIPAY: 0.006,
                PaymentProvider.WECHAT: 0.006,
            }
            fee_rate = fee_rates.get(intent.provider, 0)
            fees = int(intent.amount * fee_rate)
            
            db.execute('''
                INSERT INTO financial_records (date, type, provider, amount, currency, 
                    transaction_count, fees, net_amount, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
            ''', (
                today, 'payment', intent.provider.value, intent.amount,
                intent.currency, fees, intent.amount - fees,
                datetime.utcnow().isoformat()
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Record financial transaction error: {e}")
    
    # ==================== 發票 ====================
    
    async def create_invoice(
        self,
        payment_id: str,
        buyer_info: Dict = None
    ) -> Optional[Invoice]:
        """創建發票"""
        intent = await self.get_payment_intent(payment_id)
        if not intent:
            return None
        
        try:
            db = self._get_db()
            
            # 生成發票號
            year = datetime.utcnow().year
            cursor = db.execute(
                "SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?",
                (f"INV-{year}-%",)
            )
            count = cursor.fetchone()['count'] + 1
            invoice_number = f"INV-{year}-{count:06d}"
            
            invoice_id = f"inv_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
            now = datetime.utcnow()
            
            buyer_info = buyer_info or {}
            
            invoice = Invoice(
                id=invoice_id,
                user_id=intent.user_id,
                payment_id=payment_id,
                invoice_number=invoice_number,
                subtotal=intent.amount,
                tax=0,
                total=intent.amount,
                currency=intent.currency,
                buyer_name=buyer_info.get('name', ''),
                buyer_email=buyer_info.get('email', ''),
                buyer_address=buyer_info.get('address', ''),
                buyer_tax_id=buyer_info.get('tax_id', ''),
                items=[{
                    'description': intent.description or 'TG-Matrix Service',
                    'quantity': 1,
                    'unit_price': intent.amount,
                    'amount': intent.amount
                }],
                status=InvoiceStatus.ISSUED,
                issued_at=now.isoformat(),
                due_date=now.isoformat(),
                paid_at=now.isoformat()
            )
            
            db.execute('''
                INSERT INTO invoices 
                (id, user_id, payment_id, invoice_number, subtotal, tax, total, currency,
                 buyer_name, buyer_email, buyer_address, buyer_tax_id,
                 seller_name, items, status, issued_at, due_date, paid_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                invoice.id, invoice.user_id, invoice.payment_id, invoice.invoice_number,
                invoice.subtotal, invoice.tax, invoice.total, invoice.currency,
                invoice.buyer_name, invoice.buyer_email, invoice.buyer_address, invoice.buyer_tax_id,
                invoice.seller_name, json.dumps(invoice.items), invoice.status.value,
                invoice.issued_at, invoice.due_date, invoice.paid_at
            ))
            db.commit()
            db.close()
            
            logger.info(f"Created invoice {invoice_number} for payment {payment_id}")
            return invoice
            
        except Exception as e:
            logger.error(f"Create invoice error: {e}")
            return None
    
    async def get_user_invoices(self, user_id: str, limit: int = 50) -> List[Invoice]:
        """獲取用戶發票"""
        try:
            db = self._get_db()
            rows = db.execute(
                'SELECT * FROM invoices WHERE user_id = ? ORDER BY issued_at DESC LIMIT ?',
                (user_id, limit)
            ).fetchall()
            db.close()
            
            invoices = []
            for row in rows:
                invoices.append(Invoice(
                    id=row['id'],
                    user_id=row['user_id'],
                    payment_id=row['payment_id'],
                    invoice_number=row['invoice_number'],
                    subtotal=row['subtotal'],
                    tax=row['tax'] or 0,
                    total=row['total'],
                    currency=row['currency'],
                    buyer_name=row['buyer_name'] or '',
                    buyer_email=row['buyer_email'] or '',
                    buyer_address=row['buyer_address'] or '',
                    buyer_tax_id=row['buyer_tax_id'] or '',
                    seller_name=row['seller_name'] or 'TG-Matrix',
                    items=json.loads(row['items']) if row['items'] else [],
                    status=InvoiceStatus(row['status']),
                    issued_at=row['issued_at'] or '',
                    due_date=row['due_date'] or '',
                    paid_at=row['paid_at'] or '',
                    pdf_url=row['pdf_url'] or ''
                ))
            
            return invoices
            
        except Exception as e:
            logger.error(f"Get user invoices error: {e}")
            return []
    
    # ==================== 財務報表 ====================
    
    async def get_financial_summary(
        self,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """獲取財務摘要"""
        try:
            db = self._get_db()
            
            # 總收入
            cursor = db.execute('''
                SELECT COALESCE(SUM(amount), 0) as total,
                       COALESCE(SUM(fees), 0) as fees,
                       COALESCE(SUM(net_amount), 0) as net,
                       COUNT(*) as count
                FROM financial_records
                WHERE date BETWEEN ? AND ? AND type = 'payment'
            ''', (start_date, end_date))
            summary = cursor.fetchone()
            
            # 按提供商統計
            cursor = db.execute('''
                SELECT provider, 
                       COALESCE(SUM(amount), 0) as total,
                       COUNT(*) as count
                FROM financial_records
                WHERE date BETWEEN ? AND ? AND type = 'payment'
                GROUP BY provider
            ''', (start_date, end_date))
            by_provider = {row['provider']: {
                'total': row['total'],
                'count': row['count']
            } for row in cursor.fetchall()}
            
            # 每日趨勢
            cursor = db.execute('''
                SELECT date,
                       COALESCE(SUM(amount), 0) as total,
                       COUNT(*) as count
                FROM financial_records
                WHERE date BETWEEN ? AND ? AND type = 'payment'
                GROUP BY date
                ORDER BY date
            ''', (start_date, end_date))
            daily_trend = [{
                'date': row['date'],
                'total': row['total'],
                'count': row['count']
            } for row in cursor.fetchall()]
            
            db.close()
            
            return {
                'period': {'start': start_date, 'end': end_date},
                'total_revenue': summary['total'],
                'total_fees': summary['fees'],
                'net_revenue': summary['net'],
                'transaction_count': summary['count'],
                'by_provider': by_provider,
                'daily_trend': daily_trend
            }
            
        except Exception as e:
            logger.error(f"Get financial summary error: {e}")
            return {}
    
    async def export_financial_report(
        self,
        start_date: str,
        end_date: str,
        format: str = 'json'
    ) -> Dict[str, Any]:
        """導出財務報表"""
        summary = await self.get_financial_summary(start_date, end_date)
        
        if format == 'csv':
            # 生成 CSV
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # 摘要
            writer.writerow(['財務報表', f'{start_date} 至 {end_date}'])
            writer.writerow([])
            writer.writerow(['總收入', summary.get('total_revenue', 0) / 100])
            writer.writerow(['手續費', summary.get('total_fees', 0) / 100])
            writer.writerow(['淨收入', summary.get('net_revenue', 0) / 100])
            writer.writerow(['交易數', summary.get('transaction_count', 0)])
            writer.writerow([])
            
            # 按提供商
            writer.writerow(['支付渠道統計'])
            writer.writerow(['渠道', '金額', '交易數'])
            for provider, data in summary.get('by_provider', {}).items():
                writer.writerow([provider, data['total'] / 100, data['count']])
            writer.writerow([])
            
            # 每日明細
            writer.writerow(['每日明細'])
            writer.writerow(['日期', '金額', '交易數'])
            for day in summary.get('daily_trend', []):
                writer.writerow([day['date'], day['total'] / 100, day['count']])
            
            return {
                'format': 'csv',
                'content': output.getvalue(),
                'filename': f'financial_report_{start_date}_{end_date}.csv'
            }
        
        return {
            'format': 'json',
            'content': summary,
            'filename': f'financial_report_{start_date}_{end_date}.json'
        }


# ==================== 單例訪問 ====================

_unified_payment: Optional[UnifiedPaymentService] = None


def get_unified_payment_service() -> UnifiedPaymentService:
    """獲取統一支付服務"""
    global _unified_payment
    if _unified_payment is None:
        _unified_payment = UnifiedPaymentService()
    return _unified_payment

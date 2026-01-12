"""
TG-Matrix Payment Gateway
支付網關集成（支付寶、微信支付、USDT）

支持：
- 支付寶當面付
- 微信掃碼支付
- USDT TRC20/ERC20
- 易支付/虎皮椒等第三方聚合
"""

import json
import hashlib
import hmac
import time
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import aiohttp


class PaymentMethod(Enum):
    ALIPAY = "alipay"
    WECHAT = "wechat"
    USDT_TRC20 = "usdt_trc20"
    USDT_ERC20 = "usdt_erc20"
    EPAY = "epay"  # 易支付


class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    EXPIRED = "expired"
    REFUNDED = "refunded"


@dataclass
class PaymentConfig:
    """支付配置"""
    # 支付寶
    alipay_app_id: str = ""
    alipay_private_key: str = ""
    alipay_public_key: str = ""
    alipay_notify_url: str = ""
    
    # 微信支付
    wechat_app_id: str = ""
    wechat_mch_id: str = ""
    wechat_api_key: str = ""
    wechat_notify_url: str = ""
    
    # USDT
    usdt_trc20_address: str = ""
    usdt_erc20_address: str = ""
    usdt_rate: float = 7.2  # 1 USDT = 7.2 CNY
    
    # 易支付（第三方聚合）
    epay_url: str = ""
    epay_pid: str = ""
    epay_key: str = ""
    epay_notify_url: str = ""


@dataclass
class PaymentOrder:
    """支付訂單"""
    order_id: str
    product_id: str
    product_name: str
    amount: float
    currency: str = "CNY"
    payment_method: str = ""
    status: str = "pending"
    machine_id: str = ""
    email: str = ""
    license_key: str = ""
    created_at: str = ""
    paid_at: str = ""
    expire_at: str = ""
    qr_code: str = ""
    pay_url: str = ""
    extra: Dict[str, Any] = None


# 產品配置（王者榮耀風格等級）
PRODUCTS = {
    # 白銀精英
    "silver_week": {"name": "🥈 白銀精英 周卡", "level": "silver", "days": 7, "price": 19},
    "silver_month": {"name": "🥈 白銀精英 月卡", "level": "silver", "days": 30, "price": 49},
    "silver_quarter": {"name": "🥈 白銀精英 季卡", "level": "silver", "days": 90, "price": 129},
    "silver_year": {"name": "🥈 白銀精英 年卡", "level": "silver", "days": 365, "price": 399},
    # 黃金大師
    "gold_week": {"name": "🥇 黃金大師 周卡", "level": "gold", "days": 7, "price": 39},
    "gold_month": {"name": "🥇 黃金大師 月卡", "level": "gold", "days": 30, "price": 99},
    "gold_quarter": {"name": "🥇 黃金大師 季卡", "level": "gold", "days": 90, "price": 249},
    "gold_year": {"name": "🥇 黃金大師 年卡", "level": "gold", "days": 365, "price": 799},
    # 鑽石王牌
    "diamond_week": {"name": "💎 鑽石王牌 周卡", "level": "diamond", "days": 7, "price": 79},
    "diamond_month": {"name": "💎 鑽石王牌 月卡", "level": "diamond", "days": 30, "price": 199},
    "diamond_quarter": {"name": "💎 鑽石王牌 季卡", "level": "diamond", "days": 90, "price": 499},
    "diamond_year": {"name": "💎 鑽石王牌 年卡", "level": "diamond", "days": 365, "price": 1599},
    # 星耀傳說
    "star_week": {"name": "🌟 星耀傳說 周卡", "level": "star", "days": 7, "price": 149},
    "star_month": {"name": "🌟 星耀傳說 月卡", "level": "star", "days": 30, "price": 399},
    "star_quarter": {"name": "🌟 星耀傳說 季卡", "level": "star", "days": 90, "price": 999},
    "star_year": {"name": "🌟 星耀傳說 年卡", "level": "star", "days": 365, "price": 2999},
    # 榮耀王者
    "king_week": {"name": "👑 榮耀王者 周卡", "level": "king", "days": 7, "price": 399},
    "king_month": {"name": "👑 榮耀王者 月卡", "level": "king", "days": 30, "price": 999},
    "king_quarter": {"name": "👑 榮耀王者 季卡", "level": "king", "days": 90, "price": 2499},
    "king_year": {"name": "👑 榮耀王者 年卡", "level": "king", "days": 365, "price": 6999},
}


class PaymentGateway:
    """支付網關"""
    
    def __init__(self, config: PaymentConfig = None):
        self.config = config or PaymentConfig()
        self.orders: Dict[str, PaymentOrder] = {}
    
    def generate_order_id(self) -> str:
        """生成訂單號"""
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:8].upper()
        return f"TGM{timestamp}{random_part}"
    
    async def create_order(
        self,
        product_id: str,
        payment_method: str,
        machine_id: str = "",
        email: str = ""
    ) -> Tuple[bool, str, Optional[PaymentOrder]]:
        """創建支付訂單"""
        
        if product_id not in PRODUCTS:
            return False, "無效的產品ID", None
        
        product = PRODUCTS[product_id]
        order_id = self.generate_order_id()
        
        # 創建訂單
        order = PaymentOrder(
            order_id=order_id,
            product_id=product_id,
            product_name=product["name"],
            amount=product["price"],
            payment_method=payment_method,
            machine_id=machine_id,
            email=email,
            created_at=datetime.now().isoformat(),
            expire_at=(datetime.now().replace(minute=datetime.now().minute + 30)).isoformat(),
            extra={"level": product["level"], "days": product["days"]}
        )
        
        # 根據支付方式處理
        if payment_method == PaymentMethod.ALIPAY.value:
            success, message, pay_info = await self._create_alipay_order(order)
        elif payment_method == PaymentMethod.WECHAT.value:
            success, message, pay_info = await self._create_wechat_order(order)
        elif payment_method in [PaymentMethod.USDT_TRC20.value, PaymentMethod.USDT_ERC20.value]:
            success, message, pay_info = await self._create_usdt_order(order, payment_method)
        elif payment_method == PaymentMethod.EPAY.value:
            success, message, pay_info = await self._create_epay_order(order)
        else:
            return False, "不支持的支付方式", None
        
        if success:
            order.qr_code = pay_info.get("qr_code", "")
            order.pay_url = pay_info.get("pay_url", "")
            self.orders[order_id] = order
        
        return success, message, order
    
    async def _create_alipay_order(self, order: PaymentOrder) -> Tuple[bool, str, Dict]:
        """創建支付寶訂單"""
        if not self.config.alipay_app_id:
            # 返回模擬數據
            return True, "success", {
                "pay_url": f"https://openapi.alipay.com/gateway.do?order={order.order_id}",
                "qr_code": f"https://qr.alipay.com/{order.order_id}"
            }
        
        # TODO: 實際對接支付寶 SDK
        # from alipay import AliPay
        # alipay = AliPay(...)
        # result = alipay.api_alipay_trade_precreate(...)
        
        return True, "success", {
            "pay_url": f"https://openapi.alipay.com/gateway.do?order={order.order_id}",
            "qr_code": ""
        }
    
    async def _create_wechat_order(self, order: PaymentOrder) -> Tuple[bool, str, Dict]:
        """創建微信支付訂單"""
        if not self.config.wechat_mch_id:
            return True, "success", {
                "pay_url": f"weixin://wxpay/bizpayurl?order={order.order_id}",
                "qr_code": f"weixin://wxpay/bizpayurl?order={order.order_id}"
            }
        
        # TODO: 實際對接微信支付 SDK
        # import wechatpay
        # ...
        
        return True, "success", {"pay_url": "", "qr_code": ""}
    
    async def _create_usdt_order(self, order: PaymentOrder, method: str) -> Tuple[bool, str, Dict]:
        """創建 USDT 訂單"""
        # 計算 USDT 金額
        usdt_amount = round(order.amount / self.config.usdt_rate, 2)
        
        if method == PaymentMethod.USDT_TRC20.value:
            address = self.config.usdt_trc20_address or "TYourTRC20WalletAddressHere"
            network = "TRC20"
        else:
            address = self.config.usdt_erc20_address or "0xYourERC20WalletAddressHere"
            network = "ERC20"
        
        order.extra = order.extra or {}
        order.extra.update({
            "usdt_amount": usdt_amount,
            "usdt_network": network,
            "usdt_address": address,
            "usdt_rate": self.config.usdt_rate
        })
        
        return True, "success", {
            "pay_url": "",
            "qr_code": address,
            "usdt_amount": usdt_amount,
            "network": network,
            "address": address
        }
    
    async def _create_epay_order(self, order: PaymentOrder) -> Tuple[bool, str, Dict]:
        """創建易支付訂單"""
        if not self.config.epay_url or not self.config.epay_pid:
            return False, "易支付未配置", {}
        
        # 構建參數
        params = {
            "pid": self.config.epay_pid,
            "type": "alipay",  # alipay/wxpay
            "out_trade_no": order.order_id,
            "notify_url": self.config.epay_notify_url,
            "return_url": self.config.epay_notify_url,
            "name": order.product_name,
            "money": str(order.amount),
        }
        
        # 生成簽名
        sign_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v)
        sign_str += self.config.epay_key
        params["sign"] = hashlib.md5(sign_str.encode()).hexdigest()
        params["sign_type"] = "MD5"
        
        # 構建支付URL
        pay_url = f"{self.config.epay_url}/submit.php?" + "&".join(f"{k}={v}" for k, v in params.items())
        
        return True, "success", {"pay_url": pay_url, "qr_code": ""}
    
    async def verify_payment(self, order_id: str) -> Tuple[bool, str, Optional[PaymentOrder]]:
        """驗證支付狀態"""
        order = self.orders.get(order_id)
        if not order:
            return False, "訂單不存在", None
        
        if order.status == PaymentStatus.PAID.value:
            return True, "已支付", order
        
        # TODO: 查詢各支付渠道的實際支付狀態
        # ...
        
        return False, "未支付", order
    
    async def handle_callback(
        self,
        payment_method: str,
        data: Dict[str, Any]
    ) -> Tuple[bool, str, Optional[str]]:
        """處理支付回調"""
        
        if payment_method == PaymentMethod.ALIPAY.value:
            return await self._handle_alipay_callback(data)
        elif payment_method == PaymentMethod.WECHAT.value:
            return await self._handle_wechat_callback(data)
        elif payment_method == PaymentMethod.EPAY.value:
            return await self._handle_epay_callback(data)
        
        return False, "不支持的支付方式", None
    
    async def _handle_alipay_callback(self, data: Dict) -> Tuple[bool, str, Optional[str]]:
        """處理支付寶回調"""
        # TODO: 驗證簽名
        # ...
        
        order_id = data.get("out_trade_no")
        trade_status = data.get("trade_status")
        
        if trade_status == "TRADE_SUCCESS":
            order = self.orders.get(order_id)
            if order:
                order.status = PaymentStatus.PAID.value
                order.paid_at = datetime.now().isoformat()
                return True, "支付成功", order_id
        
        return False, "支付失敗", order_id
    
    async def _handle_wechat_callback(self, data: Dict) -> Tuple[bool, str, Optional[str]]:
        """處理微信支付回調"""
        # TODO: 驗證簽名
        # ...
        
        order_id = data.get("out_trade_no")
        result_code = data.get("result_code")
        
        if result_code == "SUCCESS":
            order = self.orders.get(order_id)
            if order:
                order.status = PaymentStatus.PAID.value
                order.paid_at = datetime.now().isoformat()
                return True, "支付成功", order_id
        
        return False, "支付失敗", order_id
    
    async def _handle_epay_callback(self, data: Dict) -> Tuple[bool, str, Optional[str]]:
        """處理易支付回調"""
        # 驗證簽名
        sign = data.pop("sign", "")
        sign_type = data.pop("sign_type", "MD5")
        
        sign_str = "&".join(f"{k}={v}" for k, v in sorted(data.items()) if v and k != "sign")
        sign_str += self.config.epay_key
        expected_sign = hashlib.md5(sign_str.encode()).hexdigest()
        
        if sign != expected_sign:
            return False, "簽名驗證失敗", None
        
        order_id = data.get("out_trade_no")
        trade_status = data.get("trade_status")
        
        if trade_status == "TRADE_SUCCESS":
            order = self.orders.get(order_id)
            if order:
                order.status = PaymentStatus.PAID.value
                order.paid_at = datetime.now().isoformat()
                return True, "支付成功", order_id
        
        return False, "支付失敗", order_id
    
    def get_order(self, order_id: str) -> Optional[PaymentOrder]:
        """獲取訂單"""
        return self.orders.get(order_id)
    
    def get_products(self) -> Dict[str, Dict]:
        """獲取產品列表"""
        return PRODUCTS


class USDTPaymentChecker:
    """USDT 支付檢測器"""
    
    def __init__(self, address: str, network: str = "TRC20"):
        self.address = address
        self.network = network
        self.api_url = self._get_api_url()
    
    def _get_api_url(self) -> str:
        if self.network == "TRC20":
            return "https://apilist.tronscan.org/api"
        else:
            return "https://api.etherscan.io/api"
    
    async def check_payment(
        self,
        expected_amount: float,
        since_timestamp: int,
        timeout_minutes: int = 30
    ) -> Tuple[bool, Optional[str]]:
        """
        檢查是否收到 USDT 付款
        
        Returns:
            (success, transaction_hash)
        """
        async with aiohttp.ClientSession() as session:
            try:
                if self.network == "TRC20":
                    url = f"{self.api_url}/token_trc20/transfers"
                    params = {
                        "toAddress": self.address,
                        "limit": 20,
                        "start_timestamp": since_timestamp * 1000
                    }
                    
                    async with session.get(url, params=params) as resp:
                        data = await resp.json()
                        
                    for tx in data.get("token_transfers", []):
                        # 檢查是否是 USDT
                        if tx.get("tokenInfo", {}).get("tokenAbbr") == "USDT":
                            amount = float(tx.get("quant", 0)) / 1000000
                            if abs(amount - expected_amount) < 0.01:
                                return True, tx.get("transaction_id")
                
                else:  # ERC20
                    # TODO: 實現 ERC20 檢查
                    pass
                
            except Exception as e:
                print(f"[USDTChecker] Error: {e}")
        
        return False, None


# 全局實例
_payment_gateway: Optional[PaymentGateway] = None


def init_payment_gateway(config: PaymentConfig = None) -> PaymentGateway:
    """初始化支付網關"""
    global _payment_gateway
    _payment_gateway = PaymentGateway(config)
    return _payment_gateway


def get_payment_gateway() -> Optional[PaymentGateway]:
    """獲取支付網關實例"""
    return _payment_gateway


# ============ 命令行測試 ============

if __name__ == "__main__":
    import asyncio
    
    async def test():
        gateway = init_payment_gateway()
        
        # 測試創建訂單
        print("📦 產品列表：")
        for pid, product in PRODUCTS.items():
            print(f"  {pid}: {product['name']} - ¥{product['price']}")
        
        print("\n🧪 測試創建訂單...")
        success, message, order = await gateway.create_order(
            product_id="gold_month",
            payment_method="alipay",
            machine_id="test-machine-123",
            email="test@example.com"
        )
        
        if success:
            print(f"✅ 訂單創建成功")
            print(f"  訂單號: {order.order_id}")
            print(f"  產品: {order.product_name}")
            print(f"  金額: ¥{order.amount}")
            print(f"  支付鏈接: {order.pay_url}")
        else:
            print(f"❌ 創建失敗: {message}")
    
    asyncio.run(test())

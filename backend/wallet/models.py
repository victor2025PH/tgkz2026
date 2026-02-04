"""
錢包系統數據模型
Wallet System Data Models

金額單位：分 (cents)
例如：$10.00 = 1000 cents
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
import uuid


# ==================== 枚舉定義 ====================

class WalletStatus(Enum):
    """錢包狀態"""
    ACTIVE = "active"        # 正常
    FROZEN = "frozen"        # 凍結
    CLOSED = "closed"        # 已關閉


class TransactionType(Enum):
    """交易類型"""
    RECHARGE = "recharge"    # 充值
    CONSUME = "consume"      # 消費
    REFUND = "refund"        # 退款
    WITHDRAW = "withdraw"    # 提現
    BONUS = "bonus"          # 贈送
    ADJUST = "adjust"        # 調賬


class TransactionStatus(Enum):
    """交易狀態"""
    PENDING = "pending"      # 處理中
    SUCCESS = "success"      # 成功
    FAILED = "failed"        # 失敗
    CANCELLED = "cancelled"  # 已取消
    REFUNDED = "refunded"    # 已退款


class PaymentMethod(Enum):
    """支付方式"""
    USDT_TRC20 = "usdt_trc20"   # USDT TRC20
    USDT_ERC20 = "usdt_erc20"   # USDT ERC20
    ALIPAY = "alipay"           # 支付寶
    WECHAT = "wechat"           # 微信支付
    BANK = "bank"               # 銀行卡
    REDEEM = "redeem"           # 兌換碼


class PaymentChannel(Enum):
    """支付渠道"""
    DIRECT = "direct"           # 直接支付
    EPAY = "epay"               # 易支付
    HUPI = "hupi"               # 虎皮椒


class RechargeStatus(Enum):
    """充值狀態"""
    PENDING = "pending"         # 待支付
    PAID = "paid"               # 已支付（待確認）
    CONFIRMED = "confirmed"     # 已確認（已到賬）
    FAILED = "failed"           # 失敗
    EXPIRED = "expired"         # 已過期
    REFUNDED = "refunded"       # 已退款


class ConsumeCategory(Enum):
    """消費類目"""
    MEMBERSHIP = "membership"   # 會員購買
    IP_PROXY = "ip_proxy"       # 靜態IP
    QUOTA_PACK = "quota_pack"   # 配額包
    OTHER = "other"             # 其他


# ==================== 數據模型 ====================

@dataclass
class Wallet:
    """用戶錢包"""
    id: str = ""
    user_id: str = ""
    balance: int = 0              # 可用餘額（分）
    frozen_balance: int = 0       # 凍結餘額
    bonus_balance: int = 0        # 贈送餘額
    total_recharged: int = 0      # 累計充值
    total_consumed: int = 0       # 累計消費
    total_withdrawn: int = 0      # 累計提現
    currency: str = "USD"
    status: str = "active"
    version: int = 0              # 樂觀鎖版本
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
    
    @property
    def available_balance(self) -> int:
        """可用總餘額（主餘額 + 贈送餘額）"""
        return self.balance + self.bonus_balance
    
    @property
    def balance_display(self) -> str:
        """餘額顯示（美元）"""
        return f"${self.balance / 100:.2f}"
    
    @property
    def bonus_display(self) -> str:
        """贈送餘額顯示"""
        return f"${self.bonus_balance / 100:.2f}"
    
    @property
    def total_display(self) -> str:
        """總可用餘額顯示"""
        return f"${self.available_balance / 100:.2f}"
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典（前端顯示用）"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "balance": self.balance,
            "balance_display": self.balance_display,
            "frozen_balance": self.frozen_balance,
            "bonus_balance": self.bonus_balance,
            "bonus_display": self.bonus_display,
            "available_balance": self.available_balance,
            "total_display": self.total_display,
            "total_recharged": self.total_recharged,
            "total_consumed": self.total_consumed,
            "total_withdrawn": self.total_withdrawn,
            "currency": self.currency,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class Transaction:
    """錢包流水"""
    id: str = ""
    wallet_id: str = ""
    user_id: str = ""
    order_id: str = ""            # 業務訂單號（唯一）
    type: str = "consume"         # 交易類型
    amount: int = 0               # 交易金額（分）正數入賬，負數出賬
    bonus_amount: int = 0         # 贈送金額
    balance_before: int = 0       # 交易前餘額
    balance_after: int = 0        # 交易後餘額
    category: str = ""            # 消費類目
    description: str = ""         # 交易描述
    reference_id: str = ""        # 關聯業務ID
    reference_type: str = ""      # 關聯業務類型
    status: str = "pending"
    payment_method: str = ""
    payment_channel: str = ""
    external_order_id: str = ""   # 外部訂單號
    fee: int = 0                  # 手續費
    operator_id: str = ""         # 操作人
    remark: str = ""
    ip_address: str = ""
    created_at: str = ""
    completed_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
    
    @property
    def amount_display(self) -> str:
        """金額顯示"""
        sign = "+" if self.amount >= 0 else ""
        return f"{sign}${self.amount / 100:.2f}"
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            "id": self.id,
            "order_id": self.order_id,
            "type": self.type,
            "amount": self.amount,
            "amount_display": self.amount_display,
            "bonus_amount": self.bonus_amount,
            "balance_before": self.balance_before,
            "balance_after": self.balance_after,
            "category": self.category,
            "description": self.description,
            "status": self.status,
            "payment_method": self.payment_method,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


@dataclass
class RechargeOrder:
    """充值訂單"""
    id: str = ""
    order_no: str = ""            # 訂單號
    user_id: str = ""
    wallet_id: str = ""
    amount: int = 0               # 充值金額（分）
    bonus_amount: int = 0         # 贈送金額
    fee: int = 0                  # 手續費
    actual_amount: int = 0        # 實際到賬
    payment_method: str = ""
    payment_channel: str = ""
    status: str = "pending"
    # USDT 專用
    usdt_network: str = ""
    usdt_address: str = ""
    usdt_amount: float = 0.0      # USDT 金額
    usdt_rate: float = 0.0        # 匯率
    usdt_tx_hash: str = ""
    # 通用
    external_order_id: str = ""
    paid_at: str = ""
    confirmed_at: str = ""
    expired_at: str = ""
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.order_no:
            self.order_no = self._generate_order_no()
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.actual_amount:
            self.actual_amount = self.amount + self.bonus_amount - self.fee
    
    def _generate_order_no(self) -> str:
        """生成訂單號"""
        import time
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:8].upper()
        return f"RCH{timestamp}{random_part}"
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RechargePackage:
    """充值套餐"""
    id: int = 0
    amount: int = 0               # 充值金額（分）
    bonus_amount: int = 0         # 贈送金額
    bonus_percent: float = 0.0    # 贈送比例
    is_recommended: bool = False
    display_order: int = 0
    is_active: bool = True
    min_level: str = ""           # 最低會員等級要求
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if self.bonus_amount == 0 and self.bonus_percent > 0:
            self.bonus_amount = int(self.amount * self.bonus_percent / 100)
    
    @property
    def amount_display(self) -> str:
        return f"${self.amount / 100:.2f}"
    
    @property
    def bonus_display(self) -> str:
        return f"+${self.bonus_amount / 100:.2f}" if self.bonus_amount > 0 else ""
    
    @property
    def total_display(self) -> str:
        return f"${(self.amount + self.bonus_amount) / 100:.2f}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "amount": self.amount,
            "amount_display": self.amount_display,
            "bonus_amount": self.bonus_amount,
            "bonus_display": self.bonus_display,
            "bonus_percent": self.bonus_percent,
            "total_display": self.total_display,
            "is_recommended": self.is_recommended,
            "display_order": self.display_order,
        }


# ==================== 支付地址管理（Phase 1.1）====================

class AddressStatus(Enum):
    """地址狀態"""
    ACTIVE = "active"          # 活躍（可分配）
    IN_USE = "in_use"          # 使用中（已分配給訂單）
    DISABLED = "disabled"      # 停用
    EXHAUSTED = "exhausted"    # 已耗盡（使用次數過多）


class AddressNetwork(Enum):
    """地址網絡類型"""
    TRC20 = "trc20"            # TRON 網絡
    ERC20 = "erc20"            # 以太坊網絡
    BEP20 = "bep20"            # BSC 網絡


@dataclass
class PaymentAddress:
    """收款地址"""
    id: str = ""
    network: str = "trc20"         # 網絡類型
    address: str = ""              # 錢包地址
    label: str = ""                # 標籤/備註
    status: str = "active"         # 狀態
    priority: int = 0              # 優先級（數字越小越優先）
    usage_count: int = 0           # 使用次數
    max_usage: int = 0             # 最大使用次數（0=無限制）
    total_received: float = 0.0    # 累計收款金額
    last_used_at: str = ""         # 最後使用時間
    created_at: str = ""
    updated_at: str = ""
    created_by: str = ""           # 創建者
    
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
            "network": self.network,
            "address": self.address,
            "address_masked": self._mask_address(),
            "label": self.label,
            "status": self.status,
            "priority": self.priority,
            "usage_count": self.usage_count,
            "max_usage": self.max_usage,
            "total_received": self.total_received,
            "total_received_display": f"${self.total_received:.2f}",
            "last_used_at": self.last_used_at,
            "created_at": self.created_at,
        }
    
    def _mask_address(self) -> str:
        """地址脫敏顯示"""
        if len(self.address) > 12:
            return f"{self.address[:6]}...{self.address[-4:]}"
        return self.address


@dataclass
class PaymentChannelConfig:
    """支付渠道配置"""
    id: str = ""
    channel_type: str = ""         # 渠道類型 (usdt_trc20, usdt_erc20, alipay, etc.)
    display_name: str = ""         # 顯示名稱
    enabled: bool = True           # 是否啟用
    fee_rate: float = 0.0          # 手續費率 (0.02 = 2%)
    min_amount: int = 500          # 最小金額（分）
    max_amount: int = 100000       # 最大金額（分）
    daily_limit: int = 0           # 每日限額（0=無限制）
    priority: int = 0              # 顯示優先級
    config: Dict[str, Any] = field(default_factory=dict)  # 渠道專用配置
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
            "channel_type": self.channel_type,
            "display_name": self.display_name,
            "enabled": self.enabled,
            "fee_rate": self.fee_rate,
            "fee_percent": f"{self.fee_rate * 100:.1f}%",
            "min_amount": self.min_amount,
            "min_display": f"${self.min_amount / 100:.2f}",
            "max_amount": self.max_amount,
            "max_display": f"${self.max_amount / 100:.2f}",
            "daily_limit": self.daily_limit,
            "priority": self.priority,
            "created_at": self.created_at,
        }


# 默認支付渠道配置
DEFAULT_PAYMENT_CHANNELS: List[Dict[str, Any]] = [
    {
        "channel_type": "usdt_trc20",
        "display_name": "USDT (TRC20)",
        "enabled": True,
        "fee_rate": 0.0,
        "min_amount": 500,
        "max_amount": 5000000,
        "priority": 1
    },
    {
        "channel_type": "usdt_erc20",
        "display_name": "USDT (ERC20)",
        "enabled": False,
        "fee_rate": 0.0,
        "min_amount": 2000,
        "max_amount": 5000000,
        "priority": 2
    },
    {
        "channel_type": "alipay",
        "display_name": "支付寶",
        "enabled": False,
        "fee_rate": 0.02,
        "min_amount": 100,
        "max_amount": 50000,
        "priority": 3
    },
]


# ==================== 默認充值套餐 ====================

DEFAULT_RECHARGE_PACKAGES: List[Dict[str, Any]] = [
    {"amount": 1000, "bonus_amount": 0, "bonus_percent": 0, "display_order": 1},           # $10
    {"amount": 3000, "bonus_amount": 200, "bonus_percent": 6.67, "display_order": 2, "is_recommended": True},  # $30 + $2
    {"amount": 5000, "bonus_amount": 500, "bonus_percent": 10, "display_order": 3},        # $50 + $5
    {"amount": 10000, "bonus_amount": 1500, "bonus_percent": 15, "display_order": 4},      # $100 + $15
    {"amount": 20000, "bonus_amount": 4000, "bonus_percent": 20, "display_order": 5},      # $200 + $40
]

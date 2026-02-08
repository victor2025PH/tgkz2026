"""
代理供應商抽象基類

定義所有代理供應商必須實現的統一介面。
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class ProxyProductType(str, Enum):
    """代理產品類型"""
    STATIC_ISP = "static_isp"                 # 靜態 ISP 代理
    STATIC_DATACENTER = "static_datacenter"   # 獨享數據中心
    DYNAMIC_RESIDENTIAL = "dynamic_residential"  # 動態住宅代理
    UNLIMITED_RESIDENTIAL = "unlimited_residential"  # 無限住宅代理
    SOCKS5 = "socks5"                         # Socks5 代理
    DYNAMIC_ISP = "dynamic_isp"               # 動態 ISP 代理
    DYNAMIC_MOBILE = "dynamic_mobile"         # 動態移動代理


@dataclass
class ProviderProxy:
    """供應商返回的代理數據（統一格式）"""
    provider_proxy_id: str           # 供應商端的代理唯一 ID
    proxy_type: str = "socks5"       # socks5 / http / https
    host: str = ""
    port: int = 0
    username: Optional[str] = None
    password: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    expires_at: Optional[str] = None  # ISO 格式到期時間
    product_type: str = ""           # 產品類型標識
    extra: Dict[str, Any] = field(default_factory=dict)  # 擴展信息

    def to_url(self) -> str:
        auth = ""
        if self.username and self.password:
            auth = f"{self.username}:{self.password}@"
        elif self.username:
            auth = f"{self.username}@"
        return f"{self.proxy_type}://{auth}{self.host}:{self.port}"


@dataclass
class ProviderBalance:
    """供應商餘額 / 流量信息"""
    balance_type: str = ""     # traffic / time / credits / ip_count
    total: float = 0           # 總量
    used: float = 0            # 已用
    remaining: float = 0       # 剩餘
    unit: str = ""             # GB / days / count / USD
    expires_at: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "balance_type": self.balance_type,
            "total": self.total,
            "used": self.used,
            "remaining": self.remaining,
            "unit": self.unit,
            "expires_at": self.expires_at,
            "extra": self.extra,
        }


@dataclass
class ProviderConfig:
    """供應商配置"""
    id: str = ""
    name: str = ""
    provider_type: str = ""       # blurpath / custom / ...
    api_base_url: str = ""
    api_key: str = ""
    api_secret: str = ""
    config: Dict[str, Any] = field(default_factory=dict)
    sync_interval_minutes: int = 30
    is_active: bool = True


class BaseProxyProvider(ABC):
    """
    代理供應商抽象基類

    所有供應商 Adapter 必須繼承此類並實現所有抽象方法。
    """

    def __init__(self, config: ProviderConfig):
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{config.provider_type}")

    @property
    def provider_type(self) -> str:
        return self.config.provider_type

    @property
    def name(self) -> str:
        return self.config.name

    # ─── 核心介面 ───

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """
        測試與供應商 API 的連通性。
        返回: {"success": bool, "message": str, "latency_ms": int}
        """
        ...

    @abstractmethod
    async def fetch_proxies(self, product_type: str = "", country: str = "") -> List[ProviderProxy]:
        """
        從供應商拉取代理列表。
        靜態代理返回全量列表；動態代理返回可用端點。

        :param product_type: 產品類型過濾
        :param country: 國家過濾（ISO 2 字母碼）
        :return: 代理列表
        """
        ...

    @abstractmethod
    async def get_balance(self) -> List[ProviderBalance]:
        """
        查詢餘額 / 流量 / 剩餘時長。
        返回列表（一個供應商可能有多個產品的餘額）。
        """
        ...

    # ─── IP 白名單管理 ───

    async def get_whitelist(self) -> List[str]:
        """獲取 IP 白名單列表"""
        self.logger.warning(f"[{self.provider_type}] get_whitelist not implemented")
        return []

    async def add_whitelist_ip(self, ip: str) -> bool:
        """添加 IP 到白名單"""
        self.logger.warning(f"[{self.provider_type}] add_whitelist_ip not implemented")
        return False

    async def remove_whitelist_ip(self, ip: str) -> bool:
        """從白名單移除 IP"""
        self.logger.warning(f"[{self.provider_type}] remove_whitelist_ip not implemented")
        return False

    # ─── 動態代理 ───

    async def get_dynamic_proxy(self, country: str = "", session_id: str = "") -> Optional[ProviderProxy]:
        """
        獲取動態代理端點（按需生成）。
        :param country: 目標國家
        :param session_id: 會話 ID（用於粘性會話）
        :return: 代理對象，或 None
        """
        self.logger.warning(f"[{self.provider_type}] get_dynamic_proxy not implemented")
        return None

    # ─── 子帳號管理 ───

    async def list_sub_accounts(self) -> List[Dict[str, Any]]:
        """列出子帳號"""
        return []

    async def create_sub_account(self, username: str, password: str) -> Dict[str, Any]:
        """創建子帳號"""
        return {"success": False, "error": "not implemented"}

    async def delete_sub_account(self, username: str) -> bool:
        """刪除子帳號"""
        return False

    # ─── 工具方法 ───

    def mask_key(self, key: str) -> str:
        """脫敏 API 密鑰（前4後4）"""
        if not key or len(key) <= 8:
            return "****"
        return f"{key[:4]}...{key[-4:]}"

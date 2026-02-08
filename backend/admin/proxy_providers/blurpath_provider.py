"""
Blurpath 代理供應商適配器

對接 Blurpath API（https://www.blurpath.com/zh/help/api-documentation）
支持的產品類型：
- 靜態 ISP 代理（Static ISP）
- 獨享數據中心代理（Dedicated Datacenter）
- 動態住宅代理（Dynamic Residential）
- 無限住宅代理（Unlimited Residential）
- Socks5 代理

認證方式：
- api_key = Blurpath 帳號（Email）
- api_secret = Blurpath 密碼
- 自動調用 accountLogin 獲取 Bearer token，過期或 401 時自動刷新
"""

import asyncio
import json
import logging
import time
from typing import Optional, List, Dict, Any

import aiohttp

from .base_provider import (
    BaseProxyProvider,
    ProviderConfig,
    ProviderProxy,
    ProviderBalance,
    ProxyProductType,
)

logger = logging.getLogger(__name__)

# Blurpath API 常量
DEFAULT_API_BASE = "https://blurpath.com/api"
CONNECT_TIMEOUT = 10
READ_TIMEOUT = 30
TOKEN_REFRESH_BUFFER = 300  # 提前 5 分鐘刷新 token


class BlurpathProvider(BaseProxyProvider):
    """
    Blurpath 代理供應商適配器

    實現 BaseProxyProvider 介面，對接 Blurpath 的 6 大模塊：
    1. 靜態 ISP 代理
    2. 獨享數據中心
    3. 動態住宅代理（旋轉密碼 + 白名單模式）
    4. IP 白名單管理
    5. 賬密授權（子帳號）
    6. 餘額 / 流量查詢

    認證流程：
    - api_key 存放 Blurpath 帳號（Email）
    - api_secret 存放 Blurpath 密碼
    - 首次請求時自動調用 /api/supplier/accountLogin 獲取 token
    - token 緩存在內存中，401 時自動刷新
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.api_base = (config.api_base_url or DEFAULT_API_BASE).rstrip("/")

        # api_key = Blurpath 帳號 (email)
        # api_secret = Blurpath 密碼
        self.username = config.api_key
        self.password = config.api_secret

        # 緩存的 Bearer token
        self._token: Optional[str] = None
        self._token_obtained_at: float = 0

        # 從 config.config 讀取擴展配置
        ext = config.config or {}
        self.product_types: List[str] = ext.get("product_types", ["static_isp"])
        self.preferred_countries: List[str] = ext.get("preferred_countries", [])
        self.dynamic_protocol: str = ext.get("dynamic_protocol", "socks5")  # socks5 / http
        self.dynamic_region: str = ext.get("dynamic_region", "")
        self.dynamic_session_type: str = ext.get("dynamic_session_type", "rotating")  # rotating / sticky

    # ─── 認證：自動登錄獲取 Token ───

    async def _login(self) -> bool:
        """
        使用帳號密碼調用 Blurpath accountLogin 獲取 Bearer token。
        成功返回 True，失敗返回 False。
        """
        if not self.username or not self.password:
            self.logger.error("Blurpath login failed: missing username (api_key) or password (api_secret)")
            return False

        url = f"{self.api_base}/api/supplier/accountLogin"
        self.logger.info(f"Blurpath: logging in as {self.username}...")

        try:
            connector = aiohttp.TCPConnector(ssl=True)
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={
                        "username": self.username,
                        "password": self.password,
                    },
                    timeout=aiohttp.ClientTimeout(connect=CONNECT_TIMEOUT, total=READ_TIMEOUT),
                ) as resp:
                    body = await resp.text()
                    self.logger.debug(f"Blurpath login response ({resp.status}): {body[:500]}")

                    if resp.status == 200:
                        try:
                            data = json.loads(body)
                        except json.JSONDecodeError:
                            self.logger.error(f"Blurpath login: invalid JSON response: {body[:300]}")
                            return False

                        # 處理需要 2FA 驗證的情況
                        if data.get("emailCheck") or data.get("googCheck"):
                            self.logger.error(
                                "Blurpath login requires 2FA verification (email or Google). "
                                "Please disable 2FA or use an API sub-account."
                            )
                            return False

                        token = data.get("token")
                        if token:
                            self._token = token
                            self._token_obtained_at = time.time()
                            self.logger.info("Blurpath: login successful, token obtained")
                            return True
                        else:
                            self.logger.error(f"Blurpath login: no token in response: {data}")
                            return False
                    else:
                        self.logger.error(f"Blurpath login failed with status {resp.status}: {body[:300]}")
                        return False

        except Exception as e:
            self.logger.error(f"Blurpath login error: {e}")
            return False

    async def _ensure_token(self) -> bool:
        """確保有有效的 token，沒有則自動登錄"""
        if self._token:
            # token 存在，假設有效（401 時 _request 會自動刷新）
            return True
        return await self._login()

    # ─── 內部 HTTP 工具 ───

    def _headers(self) -> Dict[str, str]:
        """構建請求頭（使用緩存的 Bearer token）"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    async def _request(
        self, method: str, path: str,
        params: Dict = None, json_data: Dict = None,
        timeout: int = READ_TIMEOUT,
        max_retries: int = 3,
        _is_retry_after_login: bool = False,
    ) -> Dict[str, Any]:
        """統一 HTTP 請求封裝（帶重試、指數退避、自動登錄）"""
        # 確保有 token
        if not await self._ensure_token():
            return {"error": True, "message": "Failed to authenticate with Blurpath (check username/password)"}

        url = f"{self.api_base}{path}"

        connector = aiohttp.TCPConnector(ssl=True)
        async with aiohttp.ClientSession(connector=connector) as session:
            for attempt in range(max_retries):
                t0 = time.time()
                try:
                    async with session.request(
                        method, url,
                        headers=self._headers(),
                        params=params,
                        json=json_data,
                        timeout=aiohttp.ClientTimeout(
                            connect=CONNECT_TIMEOUT, total=timeout
                        ),
                    ) as resp:
                        latency = int((time.time() - t0) * 1000)
                        body = await resp.text()

                        if resp.status == 200:
                            try:
                                data = json.loads(body)
                            except json.JSONDecodeError:
                                data = {"raw": body}
                            data["_latency_ms"] = latency
                            return data

                        # 401 未授權 → token 過期，重新登錄一次
                        if resp.status == 401 and not _is_retry_after_login:
                            self.logger.warning("Blurpath: token expired or invalid, re-authenticating...")
                            self._token = None
                            if await self._login():
                                return await self._request(
                                    method, path, params, json_data,
                                    timeout, max_retries,
                                    _is_retry_after_login=True,
                                )
                            return {
                                "error": True,
                                "status": 401,
                                "message": "Re-authentication failed",
                                "_latency_ms": latency,
                            }

                        # 429 限流 → 等待後重試
                        if resp.status == 429 and attempt < max_retries - 1:
                            retry_after = int(resp.headers.get("Retry-After", 2 ** attempt))
                            self.logger.warning(
                                f"Blurpath rate limited, retrying after {retry_after}s (attempt {attempt+1})"
                            )
                            await asyncio.sleep(retry_after)
                            continue

                        # 5xx 服務器錯誤 → 重試
                        if resp.status >= 500 and attempt < max_retries - 1:
                            wait = 2 ** attempt
                            self.logger.warning(
                                f"Blurpath server error {resp.status}, retrying after {wait}s (attempt {attempt+1})"
                            )
                            await asyncio.sleep(wait)
                            continue

                        self.logger.warning(
                            f"Blurpath API {method} {path} returned {resp.status}: {body[:300]}"
                        )
                        return {
                            "error": True,
                            "status": resp.status,
                            "message": body[:500],
                            "_latency_ms": latency,
                        }

                except asyncio.TimeoutError:
                    latency = int((time.time() - t0) * 1000)
                    if attempt < max_retries - 1:
                        wait = 2 ** attempt
                        self.logger.warning(
                            f"Blurpath API timeout: {method} {path}, retrying after {wait}s (attempt {attempt+1})"
                        )
                        await asyncio.sleep(wait)
                        continue
                    self.logger.error(f"Blurpath API timeout after {max_retries} attempts: {method} {path}")
                    return {"error": True, "message": "API request timeout", "_latency_ms": latency}

                except (aiohttp.ClientError, ConnectionError, OSError) as e:
                    latency = int((time.time() - t0) * 1000)
                    if attempt < max_retries - 1:
                        wait = 2 ** attempt
                        self.logger.warning(
                            f"Blurpath API connection error: {e}, retrying after {wait}s (attempt {attempt+1})"
                        )
                        await asyncio.sleep(wait)
                        continue
                    self.logger.error(f"Blurpath API error after {max_retries} attempts: {method} {path}: {e}")
                    return {"error": True, "message": str(e), "_latency_ms": latency}

                except Exception as e:
                    latency = int((time.time() - t0) * 1000)
                    self.logger.error(f"Blurpath API unexpected error: {method} {path}: {e}")
                    return {"error": True, "message": str(e), "_latency_ms": latency}

        return {"error": True, "message": "Max retries exceeded"}

    # ─── 核心介面實現 ───

    async def test_connection(self) -> Dict[str, Any]:
        """
        測試 API 連通性
        1. 先嘗試用帳號密碼登錄
        2. 然後查詢餘額驗證 token 有效性
        """
        t0 = time.time()

        # 步驟 1：嘗試登錄
        self._token = None  # 清除緩存，強制重新登錄
        login_ok = await self._login()
        login_latency = int((time.time() - t0) * 1000)

        if not login_ok:
            return {
                "success": False,
                "message": "登錄失敗：請檢查帳號（Email）和密碼是否正確",
                "latency_ms": login_latency,
            }

        # 步驟 2：查詢餘額驗證 token
        result = await self._request("GET", "/api/v1/user/balance")
        total_latency = int((time.time() - t0) * 1000)

        if result.get("error"):
            # 登錄成功但查詢失敗，可能是 API 路徑問題，但連接本身沒問題
            return {
                "success": True,
                "message": f"登錄成功（token 已獲取），但餘額查詢返回: {result.get('message', 'unknown')[:100]}",
                "latency_ms": total_latency,
            }

        return {
            "success": True,
            "message": "連接成功：帳號驗證通過，API 正常",
            "latency_ms": total_latency,
            "balance_info": result,
        }

    async def fetch_proxies(
        self, product_type: str = "", country: str = ""
    ) -> List[ProviderProxy]:
        """
        從 Blurpath 拉取代理列表

        - 靜態 ISP / 數據中心：返回已購買的 IP 列表
        - 動態住宅：返回接入端點信息
        """
        proxies: List[ProviderProxy] = []

        # 確定要拉取的產品類型
        target_types = [product_type] if product_type else self.product_types

        for pt in target_types:
            try:
                if pt in ("static_isp", "static_datacenter"):
                    fetched = await self._fetch_static_proxies(pt, country)
                    proxies.extend(fetched)
                elif pt in ("dynamic_residential", "unlimited_residential"):
                    fetched = await self._fetch_dynamic_endpoints(pt, country)
                    proxies.extend(fetched)
                elif pt == "socks5":
                    fetched = await self._fetch_socks5_proxies(country)
                    proxies.extend(fetched)
                else:
                    self.logger.warning(f"Unknown product type: {pt}")
            except Exception as e:
                self.logger.error(f"Error fetching {pt} proxies: {e}")

        return proxies

    async def get_balance(self) -> List[ProviderBalance]:
        """查詢餘額 / 流量"""
        result = await self._request("GET", "/api/v1/user/balance")

        if result.get("error"):
            self.logger.error(f"Failed to get balance: {result.get('message')}")
            return []

        balances: List[ProviderBalance] = []
        data = result.get("data", result)

        # 流量餘額
        if "traffic" in data or "remaining_traffic" in data:
            total_gb = data.get("total_traffic", 0)
            used_gb = data.get("used_traffic", 0)
            remaining_gb = data.get("remaining_traffic", total_gb - used_gb)
            balances.append(ProviderBalance(
                balance_type="traffic",
                total=total_gb,
                used=used_gb,
                remaining=remaining_gb,
                unit="GB",
            ))

        # 時間餘額
        if "expire_time" in data or "remaining_days" in data:
            balances.append(ProviderBalance(
                balance_type="time",
                remaining=data.get("remaining_days", 0),
                unit="days",
                expires_at=data.get("expire_time"),
            ))

        # IP 數量（靜態代理）
        if "ip_count" in data or "total_ips" in data:
            total_ips = data.get("total_ips", data.get("ip_count", 0))
            used_ips = data.get("used_ips", 0)
            balances.append(ProviderBalance(
                balance_type="ip_count",
                total=total_ips,
                used=used_ips,
                remaining=total_ips - used_ips,
                unit="count",
            ))

        # 帳戶餘額（USDT / USD）
        if "balance" in data:
            balances.append(ProviderBalance(
                balance_type="credits",
                remaining=data.get("balance", 0),
                unit="USD",
            ))

        # 如果 API 返回結構不匹配以上任何模式，存原始數據
        if not balances:
            balances.append(ProviderBalance(
                balance_type="unknown",
                extra=data,
            ))

        return balances

    # ─── IP 白名單管理 ───

    async def get_whitelist(self) -> List[str]:
        """獲取 IP 白名單列表"""
        result = await self._request("GET", "/api/v1/whitelist/list")
        if result.get("error"):
            return []

        data = result.get("data", result)
        if isinstance(data, list):
            return [item.get("ip", item) if isinstance(item, dict) else str(item) for item in data]
        if isinstance(data, dict) and "list" in data:
            return [item.get("ip", item) if isinstance(item, dict) else str(item) for item in data["list"]]
        return []

    async def add_whitelist_ip(self, ip: str) -> bool:
        """添加 IP 到白名單"""
        result = await self._request("POST", "/api/v1/whitelist/add", json_data={"ip": ip})
        if result.get("error"):
            self.logger.error(f"Failed to add whitelist IP {ip}: {result.get('message')}")
            return False
        return True

    async def remove_whitelist_ip(self, ip: str) -> bool:
        """從白名單移除 IP"""
        result = await self._request("POST", "/api/v1/whitelist/remove", json_data={"ip": ip})
        if result.get("error"):
            self.logger.error(f"Failed to remove whitelist IP {ip}: {result.get('message')}")
            return False
        return True

    # ─── 動態代理 ───

    async def get_dynamic_proxy(
        self, country: str = "", session_id: str = ""
    ) -> Optional[ProviderProxy]:
        """
        獲取動態住宅代理端點

        支持兩種模式：
        1. 旋轉密碼模式（自動換 IP）
        2. 白名單模式（固定端點 + IP 白名單）
        """
        params: Dict[str, str] = {
            "protocol": self.dynamic_protocol,
        }
        if country:
            params["country"] = country
        elif self.dynamic_region:
            params["region"] = self.dynamic_region

        if session_id:
            params["session"] = session_id
            params["session_type"] = "sticky"
        else:
            params["session_type"] = self.dynamic_session_type

        result = await self._request("GET", "/api/v1/proxy/dynamic", params=params)

        if result.get("error"):
            self.logger.error(f"Failed to get dynamic proxy: {result.get('message')}")
            return None

        data = result.get("data", result)

        # Blurpath 返回端點信息
        host = data.get("host", data.get("ip", data.get("server", "")))
        port = data.get("port", 0)
        username = data.get("username", data.get("user", ""))
        password = data.get("password", data.get("pass", ""))
        protocol = data.get("protocol", self.dynamic_protocol)

        if not host or not port:
            # 嘗試從 proxy_url 解析
            proxy_url = data.get("proxy_url", data.get("proxy", ""))
            if proxy_url:
                from urllib.parse import urlparse
                parsed = urlparse(proxy_url if "://" in proxy_url else f"socks5://{proxy_url}")
                host = parsed.hostname or ""
                port = parsed.port or 0
                username = parsed.username or username
                password = parsed.password or password
                protocol = parsed.scheme or protocol

        if not host or not port:
            self.logger.error(f"Invalid dynamic proxy response: {data}")
            return None

        return ProviderProxy(
            provider_proxy_id=f"dynamic_{country}_{session_id or 'rotating'}_{int(time.time())}",
            proxy_type=protocol,
            host=host,
            port=int(port),
            username=username,
            password=password,
            country=country or data.get("country", ""),
            product_type="dynamic_residential",
            extra={"session_id": session_id, "raw": data},
        )

    # ─── 子帳號管理 ───

    async def list_sub_accounts(self) -> List[Dict[str, Any]]:
        """列出子帳號"""
        result = await self._request("GET", "/api/v1/sub-user/list")
        if result.get("error"):
            return []
        data = result.get("data", result)
        return data if isinstance(data, list) else data.get("list", [])

    async def create_sub_account(self, username: str, password: str) -> Dict[str, Any]:
        """創建子帳號"""
        result = await self._request("POST", "/api/v1/sub-user/create", json_data={
            "username": username,
            "password": password,
        })
        if result.get("error"):
            return {"success": False, "error": result.get("message", "Failed")}
        return {"success": True, "data": result.get("data", result)}

    async def delete_sub_account(self, username: str) -> bool:
        """刪除子帳號"""
        result = await self._request("POST", "/api/v1/sub-user/delete", json_data={
            "username": username,
        })
        return not result.get("error", False)

    # ─── 私有方法：拉取各類型代理 ───

    async def _fetch_static_proxies(
        self, product_type: str, country: str = ""
    ) -> List[ProviderProxy]:
        """拉取靜態代理列表（ISP / 數據中心）"""
        endpoint = "/api/v1/proxy/static/list"
        params: Dict[str, str] = {}
        if product_type == "static_isp":
            params["type"] = "isp"
        elif product_type == "static_datacenter":
            params["type"] = "datacenter"
        if country:
            params["country"] = country

        result = await self._request("GET", endpoint, params=params)
        if result.get("error"):
            self.logger.error(f"Failed to fetch static proxies: {result.get('message')}")
            return []

        data = result.get("data", result)
        items = data if isinstance(data, list) else data.get("list", data.get("proxies", []))

        proxies: List[ProviderProxy] = []
        for item in items:
            if isinstance(item, str):
                # 格式: host:port 或 host:port:user:pass
                parts = item.split(":")
                proxy = ProviderProxy(
                    provider_proxy_id=item,
                    proxy_type="socks5",
                    host=parts[0],
                    port=int(parts[1]) if len(parts) > 1 else 1080,
                    username=parts[2] if len(parts) > 2 else None,
                    password=parts[3] if len(parts) > 3 else None,
                    product_type=product_type,
                )
            elif isinstance(item, dict):
                proxy_id = (
                    item.get("id") or item.get("proxy_id")
                    or f"{item.get('host', item.get('ip', ''))}:{item.get('port', '')}"
                )
                proxy = ProviderProxy(
                    provider_proxy_id=str(proxy_id),
                    proxy_type=item.get("protocol", item.get("type", "socks5")),
                    host=item.get("host", item.get("ip", item.get("server", ""))),
                    port=int(item.get("port", 0)),
                    username=item.get("username", item.get("user")),
                    password=item.get("password", item.get("pass")),
                    country=item.get("country", item.get("country_code", country)),
                    city=item.get("city"),
                    expires_at=item.get("expire_time", item.get("expires_at")),
                    product_type=product_type,
                    extra={k: v for k, v in item.items() if k not in (
                        "id", "proxy_id", "host", "ip", "server", "port",
                        "username", "user", "password", "pass", "protocol", "type",
                        "country", "country_code", "city", "expire_time", "expires_at",
                    )},
                )
            else:
                continue
            proxies.append(proxy)

        self.logger.info(f"Fetched {len(proxies)} {product_type} proxies from Blurpath")
        return proxies

    async def _fetch_dynamic_endpoints(
        self, product_type: str, country: str = ""
    ) -> List[ProviderProxy]:
        """獲取動態住宅代理接入節點列表"""
        endpoint = "/api/v1/proxy/dynamic/endpoints"
        params: Dict[str, str] = {}
        if product_type == "unlimited_residential":
            params["type"] = "unlimited"
        if country:
            params["country"] = country

        result = await self._request("GET", endpoint, params=params)
        if result.get("error"):
            return []

        data = result.get("data", result)
        items = data if isinstance(data, list) else data.get("list", data.get("endpoints", []))

        proxies: List[ProviderProxy] = []
        for item in items:
            if isinstance(item, dict):
                proxy = ProviderProxy(
                    provider_proxy_id=item.get("id", f"dyn_{item.get('host', '')}:{item.get('port', '')}"),
                    proxy_type=item.get("protocol", "socks5"),
                    host=item.get("host", item.get("server", "")),
                    port=int(item.get("port", 0)),
                    username=item.get("username", item.get("user", "")),
                    password=item.get("password", item.get("pass", "")),
                    country=item.get("country", country),
                    product_type=product_type,
                    extra={"mode": item.get("mode", "rotating")},
                )
                proxies.append(proxy)

        return proxies

    async def _fetch_socks5_proxies(self, country: str = "") -> List[ProviderProxy]:
        """拉取 Socks5 代理列表"""
        endpoint = "/api/v1/proxy/socks5/list"
        params: Dict[str, str] = {}
        if country:
            params["country"] = country

        result = await self._request("GET", endpoint, params=params)
        if result.get("error"):
            return []

        data = result.get("data", result)
        items = data if isinstance(data, list) else data.get("list", data.get("proxies", []))

        proxies: List[ProviderProxy] = []
        for item in items:
            if isinstance(item, dict):
                proxy = ProviderProxy(
                    provider_proxy_id=item.get("id", f"s5_{item.get('host', '')}:{item.get('port', '')}"),
                    proxy_type="socks5",
                    host=item.get("host", item.get("ip", "")),
                    port=int(item.get("port", 0)),
                    username=item.get("username", item.get("user")),
                    password=item.get("password", item.get("pass")),
                    country=item.get("country", country),
                    product_type="socks5",
                )
                proxies.append(proxy)

        return proxies

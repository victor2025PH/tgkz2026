"""
Blurpath 代理供應商適配器

對接 Blurpath API（https://www.blurpath.com/zh/help/api-documentation）

API 基礎地址: https://blurpath.com/api
認證方式: POST /api/supplier/accountLogin 獲取 token → Authorization: token xxx

goodsType 映射:
  1 = 靜態 ISP 代理
  2 = 獨享數據中心代理
  3 = 動態住宅代理
  4 = 不限量住宅代理

API 端點:
  - /api/supplier/accountLogin    授權令牌（POST）
  - /api/supplier/passwordLogin   授權令牌（POST 備選）
  - /api/study/order/list         靜態代理 IP 列表（POST, goodsType=1,2）
  - /api/study/ip/white/proxys    動態代理帳密節點（GET, goodsType=3,4）
  - /api/study/ip/white/proxy     動態代理白名單節點（GET, goodsType=3,4）
  - /api/study/ip/dynamic/log     剩餘時長/流量（POST, goodsType=3,4）
  - /api/study/ip/white/list      白名單列表（POST）
  - /api/study/ip/white/submit    添加白名單（POST）
  - /api/study/ip/white/del       刪除白名單（POST）
  - /api/study/ip/account/submit  添加子帳號（POST）
  - /api/study/ip/account/del     刪除子帳號（POST）
  - /api/study/ip/account/list    子帳號列表（POST）

回應格式: {"ret": 0, "data": {...}} ret=0 成功, ret!=0 失敗
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

# goodsType 映射
GOODS_TYPE_MAP = {
    "static_isp": 1,
    "static_datacenter": 2,
    "dynamic_residential": 3,
    "unlimited_residential": 4,
}

GOODS_TYPE_NAMES = {
    1: "靜態ISP代理",
    2: "獨享數據中心",
    3: "動態住宅代理",
    4: "不限量住宅代理",
}


class BlurpathProvider(BaseProxyProvider):
    """
    Blurpath 代理供應商適配器

    認證流程:
    - api_key = Blurpath 帳號（Email）
    - api_secret = Blurpath 密碼
    - 調用 accountLogin / passwordLogin 獲取 token
    - 後續請求用 Authorization: token xxx
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.api_base = (config.api_base_url or DEFAULT_API_BASE).rstrip("/")

        # api_key = 帳號, api_secret = 密碼
        self.username = config.api_key
        self.password = config.api_secret

        # 緩存 token
        self._token: Optional[str] = None
        self._token_obtained_at: float = 0

        # 擴展配置
        ext = config.config or {}
        self.product_types: List[str] = ext.get("product_types", ["static_isp"])
        self.preferred_countries: List[str] = ext.get("preferred_countries", [])
        self.dynamic_protocol: str = ext.get("dynamic_protocol", "socks5")
        self.dynamic_region: str = ext.get("dynamic_region", "")
        self.dynamic_session_type: str = ext.get("dynamic_session_type", "rotating")

    # ─── 認證 ───

    async def _login(self) -> bool:
        """用帳號密碼獲取 Blurpath token"""
        if not self.username or not self.password:
            self.logger.error("Blurpath login: 缺少帳號(api_key)或密碼(api_secret)")
            return False

        # 依次嘗試兩個登錄端點
        login_endpoints = [
            "/api/supplier/accountLogin",
            "/api/supplier/passwordLogin",
        ]

        for endpoint in login_endpoints:
            url = f"{self.api_base}{endpoint}"
            self.logger.info(f"Blurpath: 嘗試登錄 {endpoint} (帳號: {self.username})")

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
                        timeout=aiohttp.ClientTimeout(
                            connect=CONNECT_TIMEOUT, total=READ_TIMEOUT
                        ),
                    ) as resp:
                        body = await resp.text()
                        self.logger.info(
                            f"Blurpath login {endpoint}: status={resp.status}, body={body[:500]}"
                        )

                        if resp.status == 200:
                            try:
                                data = json.loads(body)
                            except json.JSONDecodeError:
                                continue

                            # 成功: 有 token 字段
                            token = data.get("token")
                            if not token and isinstance(data.get("data"), dict):
                                token = data["data"].get("token")

                            # 需要 2FA
                            if data.get("emailCheck") or data.get("googCheck"):
                                self.logger.error(
                                    "Blurpath 帳號開啟了二步驗證，請先關閉或使用子帳號"
                                )
                                return False

                            if token:
                                self._token = token
                                self._token_obtained_at = time.time()
                                self.logger.info(
                                    f"Blurpath: 登錄成功 (via {endpoint})"
                                )
                                return True

                            # ret != 0 表示失敗
                            ret = data.get("ret")
                            msg = data.get("msg", "")
                            self.logger.warning(
                                f"Blurpath {endpoint}: ret={ret}, msg='{msg}'"
                            )

            except Exception as e:
                self.logger.warning(f"Blurpath {endpoint} 異常: {e}")

        self.logger.error("Blurpath: 所有登錄端點均失敗")
        return False

    async def _ensure_token(self) -> bool:
        """確保有有效 token"""
        if self._token:
            return True
        return await self._login()

    # ─── HTTP 工具 ───

    def _headers(self) -> Dict[str, str]:
        """構建帶 token 的請求頭"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self._token:
            headers["Authorization"] = f"token {self._token}"
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        params: Dict = None,
        json_data: Dict = None,
        timeout: int = READ_TIMEOUT,
        max_retries: int = 3,
        _is_retry_after_login: bool = False,
    ) -> Dict[str, Any]:
        """統一 HTTP 請求（帶重試、自動登錄）"""
        if not await self._ensure_token():
            return {
                "error": True,
                "ret": -1,
                "message": "Blurpath 認證失敗（請檢查帳號密碼）",
            }

        url = f"{self.api_base}{path}"

        connector = aiohttp.TCPConnector(ssl=True)
        async with aiohttp.ClientSession(connector=connector) as session:
            for attempt in range(max_retries):
                t0 = time.time()
                try:
                    async with session.request(
                        method,
                        url,
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

                            # ret=0 表示成功
                            ret = data.get("ret")
                            if ret == 0:
                                return data

                            # ret!=0 但可能是 token 過期
                            if not _is_retry_after_login:
                                self.logger.warning(
                                    f"Blurpath {path}: ret={ret}, 嘗試重新登錄..."
                                )
                                self._token = None
                                if await self._login():
                                    return await self._request(
                                        method, path, params, json_data,
                                        timeout, max_retries,
                                        _is_retry_after_login=True,
                                    )

                            # 仍然失敗
                            data["error"] = True
                            data["message"] = data.get("msg", f"API 返回 ret={ret}")
                            return data

                        # 401 → 重新登錄
                        if resp.status == 401 and not _is_retry_after_login:
                            self._token = None
                            if await self._login():
                                return await self._request(
                                    method, path, params, json_data,
                                    timeout, max_retries,
                                    _is_retry_after_login=True,
                                )

                        # 429 限流
                        if resp.status == 429 and attempt < max_retries - 1:
                            wait = int(resp.headers.get("Retry-After", 2 ** attempt))
                            self.logger.warning(
                                f"Blurpath 限流, {wait}s 後重試 (attempt {attempt+1})"
                            )
                            await asyncio.sleep(wait)
                            continue

                        # 5xx
                        if resp.status >= 500 and attempt < max_retries - 1:
                            wait = 2 ** attempt
                            await asyncio.sleep(wait)
                            continue

                        return {
                            "error": True,
                            "status": resp.status,
                            "message": body[:500],
                            "_latency_ms": latency,
                        }

                except asyncio.TimeoutError:
                    latency = int((time.time() - t0) * 1000)
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return {"error": True, "message": "請求超時", "_latency_ms": latency}

                except (aiohttp.ClientError, ConnectionError, OSError) as e:
                    latency = int((time.time() - t0) * 1000)
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return {"error": True, "message": str(e), "_latency_ms": latency}

                except Exception as e:
                    latency = int((time.time() - t0) * 1000)
                    return {"error": True, "message": str(e), "_latency_ms": latency}

        return {"error": True, "message": "重試次數已耗盡"}

    # ─── 核心介面 ───

    async def test_connection(self) -> Dict[str, Any]:
        """測試連接（登錄 + 查詢白名單列表驗證 token）"""
        t0 = time.time()

        # 強制重新登錄
        self._token = None
        login_ok = await self._login()
        login_latency = int((time.time() - t0) * 1000)

        if not login_ok:
            return {
                "success": False,
                "message": "登錄失敗：請檢查 Blurpath 帳號和密碼是否正確",
                "latency_ms": login_latency,
            }

        # 驗證 token: 查詢白名單列表
        result = await self._request("POST", "/api/study/ip/white/list", json_data={"ip": ""})
        total_latency = int((time.time() - t0) * 1000)

        if result.get("error"):
            return {
                "success": True,
                "message": f"登錄成功（token 已獲取），但 API 查詢返回: {result.get('message', '')}",
                "latency_ms": total_latency,
            }

        whitelist = result.get("data", {}).get("list", [])
        return {
            "success": True,
            "message": f"連接成功：token 有效，白名單 {len(whitelist)} 條",
            "latency_ms": total_latency,
        }

    async def fetch_proxies(
        self, product_type: str = "", country: str = ""
    ) -> List[ProviderProxy]:
        """拉取代理列表"""
        proxies: List[ProviderProxy] = []
        target_types = [product_type] if product_type else self.product_types

        for pt in target_types:
            try:
                goods_type = GOODS_TYPE_MAP.get(pt)
                if not goods_type:
                    self.logger.warning(f"未知產品類型: {pt}")
                    continue

                if goods_type in (1, 2):
                    # 靜態代理: /api/study/order/list
                    fetched = await self._fetch_static_proxies(goods_type, pt)
                    proxies.extend(fetched)
                elif goods_type in (3, 4):
                    # 動態代理: /api/study/ip/white/proxys
                    fetched = await self._fetch_dynamic_proxies(goods_type, pt)
                    proxies.extend(fetched)
            except Exception as e:
                self.logger.error(f"拉取 {pt} 代理出錯: {e}")

        return proxies

    async def get_balance(self) -> List[ProviderBalance]:
        """查詢餘額/流量/時長"""
        balances: List[ProviderBalance] = []

        for pt in self.product_types:
            goods_type = GOODS_TYPE_MAP.get(pt)
            if not goods_type:
                continue

            try:
                if goods_type in (1, 2):
                    # 靜態代理: 查已購 IP 數量
                    result = await self._request(
                        "POST", "/api/study/order/list",
                        json_data={"goodsType": goods_type, "keyword": ""},
                    )
                    if not result.get("error"):
                        ip_list = result.get("data", {}).get("list", [])
                        balances.append(ProviderBalance(
                            balance_type="ip_count",
                            total=len(ip_list),
                            used=0,
                            remaining=len(ip_list),
                            unit="IP",
                            extra={"goods_type": goods_type, "name": GOODS_TYPE_NAMES.get(goods_type)},
                        ))

                elif goods_type == 3:
                    # 動態住宅: 剩餘流量
                    result = await self._request(
                        "POST", "/api/study/ip/dynamic/log",
                        json_data={"goodsType": 3, "flow": "MB"},
                    )
                    if not result.get("error"):
                        data = result.get("data", {})
                        remaining_mb = data.get("remainingFlow", 0)
                        balances.append(ProviderBalance(
                            balance_type="traffic",
                            remaining=round(remaining_mb / 1024, 2),  # MB → GB
                            unit="GB",
                            extra={"remaining_mb": remaining_mb, "name": "動態住宅代理"},
                        ))

                elif goods_type == 4:
                    # 不限量住宅: 剩餘時長
                    result = await self._request(
                        "POST", "/api/study/ip/dynamic/log",
                        json_data={"goodsType": 4},
                    )
                    if not result.get("error"):
                        data = result.get("data", {})
                        remaining_sec = data.get("day1", 0)
                        remaining_days = remaining_sec / 86400 if remaining_sec else 0
                        balances.append(ProviderBalance(
                            balance_type="time",
                            remaining=round(remaining_days, 1),
                            unit="天",
                            extra={"remaining_seconds": remaining_sec, "name": "不限量住宅代理"},
                        ))

            except Exception as e:
                self.logger.error(f"查詢 {pt} 餘額出錯: {e}")

        return balances

    # ─── 白名單管理 ───

    async def get_whitelist(self) -> List[str]:
        """獲取 IP 白名單"""
        result = await self._request(
            "POST", "/api/study/ip/white/list",
            json_data={"ip": ""},
        )
        if result.get("error"):
            return []

        items = result.get("data", {}).get("list", [])
        return [item.get("ipAddress", "") for item in items if item.get("ipAddress")]

    async def add_whitelist_ip(self, ip: str) -> bool:
        """添加 IP 到白名單（支持逗號分隔批量添加）"""
        result = await self._request(
            "POST", "/api/study/ip/white/submit",
            json_data={"ipAddress": ip, "remark": "auto-added by system"},
        )
        if result.get("error"):
            self.logger.error(f"添加白名單 {ip} 失敗: {result.get('message')}")
            return False
        return True

    async def remove_whitelist_ip(self, ip: str) -> bool:
        """移除白名單 IP（需先查 ID）"""
        # 先查列表找到 ID
        result = await self._request(
            "POST", "/api/study/ip/white/list",
            json_data={"ip": ip},
        )
        if result.get("error"):
            return False

        items = result.get("data", {}).get("list", [])
        target_id = None
        for item in items:
            if item.get("ipAddress") == ip:
                target_id = item.get("memberIpWhiteListId")
                break

        if not target_id:
            self.logger.warning(f"白名單中未找到 IP: {ip}")
            return False

        # 用 ID 刪除
        del_result = await self._request(
            "POST", "/api/study/ip/white/del",
            json_data={"memberIpWhiteListId": int(target_id)},
        )
        return not del_result.get("error")

    # ─── 動態代理 ───

    async def get_dynamic_proxy(
        self, country: str = "", session_id: str = ""
    ) -> Optional[ProviderProxy]:
        """獲取動態代理節點"""
        # 默認用動態住宅(3)，如果配置了不限量住宅(4)則用4
        goods_type = 4 if "unlimited_residential" in self.product_types else 3

        result = await self._request(
            "GET", "/api/study/ip/white/proxys",
            params={
                "goodsType": goods_type,
                "num": 1,
                "protocol": self.dynamic_protocol,
            },
        )

        if result.get("error"):
            self.logger.error(f"獲取動態代理失敗: {result.get('message')}")
            return None

        data_list = result.get("data", [])
        if not data_list:
            return None

        item = data_list[0] if isinstance(data_list, list) else data_list
        host = item.get("ip", "")
        port = item.get("port", 0)

        if not host or not port:
            return None

        return ProviderProxy(
            provider_proxy_id=f"dynamic_{goods_type}_{host}_{port}_{int(time.time())}",
            proxy_type=self.dynamic_protocol,
            host=host,
            port=int(port),
            country=country,
            product_type="dynamic_residential" if goods_type == 3 else "unlimited_residential",
            extra={"goods_type": goods_type, "raw": item},
        )

    # ─── 子帳號管理 ───

    async def list_sub_accounts(self) -> List[Dict[str, Any]]:
        """列出子帳號"""
        result = await self._request(
            "POST", "/api/study/ip/account/list",
            json_data={"ip": ""},
        )
        if result.get("error"):
            return []
        return result.get("data", {}).get("list", [])

    async def create_sub_account(self, username: str, password: str) -> Dict[str, Any]:
        """創建子帳號"""
        result = await self._request(
            "POST", "/api/study/ip/account/submit",
            json_data={
                "username": username,
                "password1": password,  # Blurpath API 用 password1
                "remark": "",
            },
        )
        if result.get("error"):
            return {"success": False, "error": result.get("message", "創建失敗")}
        return {"success": True, "data": result.get("data", {})}

    async def delete_sub_account(self, account_id: int) -> bool:
        """刪除子帳號"""
        result = await self._request(
            "POST", "/api/study/ip/account/del",
            json_data={"memberAccountID": account_id},
        )
        return not result.get("error")

    # ─── 私有方法 ───

    async def _fetch_static_proxies(
        self, goods_type: int, product_type: str
    ) -> List[ProviderProxy]:
        """拉取靜態代理（ISP / 數據中心）: POST /api/study/order/list"""
        result = await self._request(
            "POST", "/api/study/order/list",
            json_data={"goodsType": goods_type, "keyword": ""},
        )

        if result.get("error"):
            self.logger.error(f"拉取靜態代理失敗: {result.get('message')}")
            return []

        items = result.get("data", {}).get("list", [])
        proxies: List[ProviderProxy] = []

        for item in items:
            ip_address = item.get("ipAddress", "")
            port_str = item.get("port", "")
            create_time = item.get("createTime")
            expire_time = item.get("expireTime")

            if not ip_address:
                continue

            # port 可能是 "2000/2333/2340" 格式，取第一個
            ports = str(port_str).split("/")
            main_port = int(ports[0]) if ports and ports[0].isdigit() else 0

            # 轉換時間戳
            expires_at = None
            if expire_time:
                try:
                    from datetime import datetime
                    expires_at = datetime.fromtimestamp(expire_time).isoformat()
                except Exception:
                    pass

            proxy = ProviderProxy(
                provider_proxy_id=f"{goods_type}_{ip_address}_{main_port}",
                proxy_type="socks5",
                host=ip_address,
                port=main_port,
                country="",
                product_type=product_type,
                expires_at=expires_at,
                extra={
                    "all_ports": port_str,
                    "goods_type": goods_type,
                    "create_time": create_time,
                    "expire_time": expire_time,
                },
            )
            proxies.append(proxy)

        self.logger.info(f"拉取到 {len(proxies)} 個 {GOODS_TYPE_NAMES.get(goods_type)} 代理")
        return proxies

    async def _fetch_dynamic_proxies(
        self, goods_type: int, product_type: str
    ) -> List[ProviderProxy]:
        """拉取動態代理節點: GET /api/study/ip/white/proxys"""
        result = await self._request(
            "GET", "/api/study/ip/white/proxys",
            params={
                "goodsType": goods_type,
                "num": 10,
                "protocol": self.dynamic_protocol,
            },
        )

        if result.get("error"):
            self.logger.error(f"拉取動態代理失敗: {result.get('message')}")
            return []

        data_list = result.get("data", [])
        if not isinstance(data_list, list):
            data_list = [data_list] if data_list else []

        proxies: List[ProviderProxy] = []
        for item in data_list:
            host = item.get("ip", "")
            port = item.get("port", 0)
            if not host or not port:
                continue

            proxy = ProviderProxy(
                provider_proxy_id=f"dyn_{goods_type}_{host}_{port}",
                proxy_type=self.dynamic_protocol,
                host=host,
                port=int(port),
                product_type=product_type,
                extra={"goods_type": goods_type},
            )
            proxies.append(proxy)

        self.logger.info(f"拉取到 {len(proxies)} 個 {GOODS_TYPE_NAMES.get(goods_type)} 動態節點")
        return proxies

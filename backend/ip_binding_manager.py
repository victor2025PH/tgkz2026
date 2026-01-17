"""
IP 粘性管理器 (IP Binding Manager)
實現帳號與代理 IP 的永久綁定，確保防封號的第一鐵律

功能：
1. IP 粘性綁定 - 帳號一旦綁定 IP，除非失效否則永不更換
2. IP 失效檢測 - 自動檢測 IP 是否可用
3. IP 更換記錄 - 記錄所有 IP 更換歷史
4. 智能 IP 分配 - 基於地理位置和帳號特徵分配最優 IP
"""
import asyncio
import hashlib
import json
import aiohttp
import socket
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from pathlib import Path
import sys


@dataclass
class IPBinding:
    """IP 綁定記錄"""
    account_id: int
    phone: str
    proxy: str  # 完整代理地址，如 socks5://user:pass@host:port
    proxy_ip: str  # 解析後的 IP 地址
    proxy_country: str  # 代理所在國家
    proxy_type: str  # residential, datacenter, mobile
    bound_at: str  # ISO 格式時間
    last_verified_at: Optional[str] = None  # 最後驗證時間
    is_active: bool = True
    fail_count: int = 0
    success_count: int = 0
    total_requests: int = 0
    avg_latency_ms: float = 0.0


@dataclass
class IPChangeRecord:
    """IP 更換記錄"""
    account_id: int
    phone: str
    old_proxy: Optional[str]
    new_proxy: str
    reason: str  # 更換原因：initial, failure, manual, rotation
    changed_at: str
    details: Optional[Dict[str, Any]] = None


@dataclass
class ProxyHealth:
    """代理健康狀態"""
    proxy: str
    is_alive: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    checked_at: Optional[str] = None


class IPBindingManager:
    """IP 粘性管理器"""
    
    # IP 失效閾值配置
    MAX_CONSECUTIVE_FAILURES = 3  # 連續失敗次數超過此值視為失效
    VERIFICATION_INTERVAL_HOURS = 1  # IP 驗證間隔（小時）
    HEALTH_CHECK_TIMEOUT_SECONDS = 10  # 健康檢查超時時間
    
    def __init__(
        self,
        data_dir: str = "./data",
        event_callback: Optional[callable] = None
    ):
        """
        初始化 IP 粘性管理器
        
        Args:
            data_dir: 數據存儲目錄
            event_callback: 事件回調函數，用於向前端發送狀態更新
        """
        self.data_dir = Path(data_dir)
        self.bindings_file = self.data_dir / "ip_bindings.json"
        self.history_file = self.data_dir / "ip_change_history.json"
        self.event_callback = event_callback
        
        # 內存緩存
        self._bindings: Dict[int, IPBinding] = {}  # account_id -> IPBinding
        self._phone_to_account: Dict[str, int] = {}  # phone -> account_id
        self._change_history: List[IPChangeRecord] = []
        
        # 代理池（從外部注入）
        self._proxy_pool: List[Dict[str, Any]] = []
        
        # 確保數據目錄存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 加載現有數據
        self._load_data()
        
        print(f"[IPBindingManager] Initialized with {len(self._bindings)} bindings", file=sys.stderr)
    
    def _load_data(self) -> None:
        """從文件加載數據"""
        try:
            if self.bindings_file.exists():
                with open(self.bindings_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for item in data:
                        binding = IPBinding(**item)
                        self._bindings[binding.account_id] = binding
                        self._phone_to_account[binding.phone] = binding.account_id
                print(f"[IPBindingManager] Loaded {len(self._bindings)} IP bindings", file=sys.stderr)
        except Exception as e:
            print(f"[IPBindingManager] Error loading bindings: {e}", file=sys.stderr)
        
        try:
            if self.history_file.exists():
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._change_history = [IPChangeRecord(**item) for item in data]
                print(f"[IPBindingManager] Loaded {len(self._change_history)} change records", file=sys.stderr)
        except Exception as e:
            print(f"[IPBindingManager] Error loading history: {e}", file=sys.stderr)
    
    def _save_data(self) -> None:
        """保存數據到文件"""
        try:
            with open(self.bindings_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(b) for b in self._bindings.values()], f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[IPBindingManager] Error saving bindings: {e}", file=sys.stderr)
        
        try:
            # 只保留最近 1000 條記錄
            recent_history = self._change_history[-1000:]
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(r) for r in recent_history], f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[IPBindingManager] Error saving history: {e}", file=sys.stderr)
    
    def set_proxy_pool(self, proxy_pool: List[Dict[str, Any]]) -> None:
        """
        設置代理池
        
        Args:
            proxy_pool: 代理列表，每個元素包含：
                - proxy: 代理地址
                - country: 國家代碼
                - type: 代理類型（residential, datacenter, mobile）
        """
        self._proxy_pool = proxy_pool
        print(f"[IPBindingManager] Proxy pool updated with {len(proxy_pool)} proxies", file=sys.stderr)
    
    def _extract_ip_from_proxy(self, proxy: str) -> str:
        """
        從代理地址提取 IP
        
        Args:
            proxy: 代理地址，如 socks5://user:pass@host:port
        
        Returns:
            IP 地址或主機名
        """
        try:
            # 移除協議前綴
            if "://" in proxy:
                proxy = proxy.split("://")[1]
            
            # 移除認證信息
            if "@" in proxy:
                proxy = proxy.split("@")[1]
            
            # 提取主機名（移除端口）
            host = proxy.split(":")[0]
            
            # 嘗試解析主機名到 IP
            try:
                ip = socket.gethostbyname(host)
                return ip
            except socket.gaierror:
                return host
        except Exception:
            return proxy
    
    def _get_country_from_phone(self, phone: str) -> Optional[str]:
        """從電話號碼獲取國家代碼"""
        country_prefixes = {
            "+86": "CN", "+1": "US", "+44": "GB", "+63": "PH",
            "+91": "IN", "+7": "RU", "+81": "JP", "+82": "KR",
            "+33": "FR", "+49": "DE", "+39": "IT", "+34": "ES",
            "+61": "AU", "+55": "BR", "+52": "MX", "+84": "VN",
            "+66": "TH", "+62": "ID", "+60": "MY", "+65": "SG",
            "+852": "HK", "+853": "MO", "+886": "TW"
        }
        for prefix, country in country_prefixes.items():
            if phone.startswith(prefix):
                return country
        return None
    
    async def bind_ip(
        self,
        account_id: int,
        phone: str,
        proxy: str,
        proxy_country: Optional[str] = None,
        proxy_type: str = "residential",
        reason: str = "initial"
    ) -> IPBinding:
        """
        綁定 IP 到帳號
        
        Args:
            account_id: 帳號 ID
            phone: 電話號碼
            proxy: 代理地址
            proxy_country: 代理國家（可選，會自動推斷）
            proxy_type: 代理類型
            reason: 綁定原因
        
        Returns:
            IP 綁定記錄
        """
        # 記錄舊綁定（如果存在）
        old_proxy = None
        if account_id in self._bindings:
            old_binding = self._bindings[account_id]
            old_proxy = old_binding.proxy
            # 標記舊綁定為非活躍
            old_binding.is_active = False
        
        # 提取 IP
        proxy_ip = self._extract_ip_from_proxy(proxy)
        
        # 推斷國家
        if not proxy_country:
            # 嘗試從電話號碼推斷應該使用的國家
            proxy_country = self._get_country_from_phone(phone) or "US"
        
        # 創建新綁定
        now = datetime.utcnow().isoformat()
        binding = IPBinding(
            account_id=account_id,
            phone=phone,
            proxy=proxy,
            proxy_ip=proxy_ip,
            proxy_country=proxy_country,
            proxy_type=proxy_type,
            bound_at=now,
            last_verified_at=now,
            is_active=True,
            fail_count=0,
            success_count=0,
            total_requests=0,
            avg_latency_ms=0.0
        )
        
        # 更新緩存
        self._bindings[account_id] = binding
        self._phone_to_account[phone] = account_id
        
        # 記錄變更
        change_record = IPChangeRecord(
            account_id=account_id,
            phone=phone,
            old_proxy=old_proxy,
            new_proxy=proxy,
            reason=reason,
            changed_at=now,
            details={
                "proxy_ip": proxy_ip,
                "proxy_country": proxy_country,
                "proxy_type": proxy_type
            }
        )
        self._change_history.append(change_record)
        
        # 保存數據
        self._save_data()
        
        # 發送事件
        if self.event_callback:
            self.event_callback("ip-binding-updated", {
                "account_id": account_id,
                "phone": phone,
                "binding": asdict(binding)
            })
        
        print(f"[IPBindingManager] Bound IP {proxy_ip} to account {phone} ({reason})", file=sys.stderr)
        return binding
    
    def get_binding(self, account_id: int) -> Optional[IPBinding]:
        """獲取帳號的 IP 綁定"""
        return self._bindings.get(account_id)
    
    def get_binding_by_phone(self, phone: str) -> Optional[IPBinding]:
        """通過電話號碼獲取 IP 綁定"""
        account_id = self._phone_to_account.get(phone)
        if account_id:
            return self._bindings.get(account_id)
        return None
    
    def get_bound_proxy(self, account_id: int) -> Optional[str]:
        """
        獲取帳號綁定的代理（核心方法 - IP 粘性）
        
        這是防封號的核心：返回已綁定的代理，除非代理失效
        
        Args:
            account_id: 帳號 ID
        
        Returns:
            綁定的代理地址，如果未綁定或已失效則返回 None
        """
        binding = self._bindings.get(account_id)
        if binding and binding.is_active:
            return binding.proxy
        return None
    
    async def record_request(
        self,
        account_id: int,
        success: bool,
        latency_ms: Optional[float] = None
    ) -> None:
        """
        記錄代理請求結果
        
        Args:
            account_id: 帳號 ID
            success: 是否成功
            latency_ms: 延遲（毫秒）
        """
        binding = self._bindings.get(account_id)
        if not binding:
            return
        
        binding.total_requests += 1
        
        if success:
            binding.success_count += 1
            binding.fail_count = 0  # 重置連續失敗計數
            if latency_ms:
                # 計算移動平均延遲
                if binding.avg_latency_ms == 0:
                    binding.avg_latency_ms = latency_ms
                else:
                    binding.avg_latency_ms = (binding.avg_latency_ms * 0.9) + (latency_ms * 0.1)
        else:
            binding.fail_count += 1
            
            # 檢查是否超過失敗閾值
            if binding.fail_count >= self.MAX_CONSECUTIVE_FAILURES:
                print(f"[IPBindingManager] Proxy for account {binding.phone} failed {binding.fail_count} times, marking as inactive", file=sys.stderr)
                binding.is_active = False
                
                # 發送失效事件
                if self.event_callback:
                    self.event_callback("ip-binding-failed", {
                        "account_id": account_id,
                        "phone": binding.phone,
                        "proxy": binding.proxy,
                        "fail_count": binding.fail_count
                    })
        
        # 定期保存
        if binding.total_requests % 100 == 0:
            self._save_data()
    
    async def check_proxy_health(self, proxy: str) -> ProxyHealth:
        """
        檢查代理健康狀態
        
        Args:
            proxy: 代理地址
        
        Returns:
            代理健康狀態
        """
        start_time = datetime.utcnow()
        try:
            # 解析代理
            proxy_url = proxy
            if not proxy.startswith(("http://", "https://", "socks4://", "socks5://")):
                proxy_url = f"socks5://{proxy}"
            
            # 使用代理請求測試 URL
            timeout = aiohttp.ClientTimeout(total=self.HEALTH_CHECK_TIMEOUT_SECONDS)
            connector = aiohttp.TCPConnector(force_close=True)
            
            async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                # 測試 Telegram API 的連通性
                test_url = "https://api.telegram.org"
                async with session.head(test_url, proxy=proxy_url) as response:
                    latency = (datetime.utcnow() - start_time).total_seconds() * 1000
                    return ProxyHealth(
                        proxy=proxy,
                        is_alive=response.status < 500,
                        latency_ms=latency,
                        checked_at=datetime.utcnow().isoformat()
                    )
        except asyncio.TimeoutError:
            return ProxyHealth(
                proxy=proxy,
                is_alive=False,
                error="Timeout",
                checked_at=datetime.utcnow().isoformat()
            )
        except Exception as e:
            return ProxyHealth(
                proxy=proxy,
                is_alive=False,
                error=str(e),
                checked_at=datetime.utcnow().isoformat()
            )
    
    async def verify_binding(self, account_id: int) -> Tuple[bool, Optional[str]]:
        """
        驗證帳號的 IP 綁定是否仍然有效
        
        Args:
            account_id: 帳號 ID
        
        Returns:
            (是否有效, 錯誤信息)
        """
        binding = self._bindings.get(account_id)
        if not binding:
            return False, "No binding found"
        
        # 檢查代理健康狀態
        health = await self.check_proxy_health(binding.proxy)
        binding.last_verified_at = datetime.utcnow().isoformat()
        
        if health.is_alive:
            binding.is_active = True
            self._save_data()
            return True, None
        else:
            binding.is_active = False
            self._save_data()
            return False, health.error
    
    async def auto_assign_proxy(
        self,
        account_id: int,
        phone: str,
        prefer_country: Optional[str] = None
    ) -> Optional[IPBinding]:
        """
        自動為帳號分配代理
        
        策略：
        1. 優先選擇與電話號碼國家匹配的代理
        2. 優先選擇住宅代理
        3. 使用哈希確保確定性分配
        
        Args:
            account_id: 帳號 ID
            phone: 電話號碼
            prefer_country: 偏好國家
        
        Returns:
            IP 綁定記錄，如果無可用代理則返回 None
        """
        if not self._proxy_pool:
            print("[IPBindingManager] No proxy pool available", file=sys.stderr)
            return None
        
        # 確定目標國家
        target_country = prefer_country or self._get_country_from_phone(phone)
        
        # 過濾代理
        candidates = self._proxy_pool.copy()
        
        # 優先匹配國家
        if target_country:
            country_proxies = [p for p in candidates if p.get('country') == target_country]
            if country_proxies:
                candidates = country_proxies
        
        # 優先住宅代理
        residential_proxies = [p for p in candidates if p.get('type') == 'residential']
        if residential_proxies:
            candidates = residential_proxies
        
        if not candidates:
            print(f"[IPBindingManager] No suitable proxy found for {phone}", file=sys.stderr)
            return None
        
        # 使用電話號碼哈希確保確定性選擇
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        selected = candidates[phone_hash % len(candidates)]
        
        # 綁定代理
        return await self.bind_ip(
            account_id=account_id,
            phone=phone,
            proxy=selected['proxy'],
            proxy_country=selected.get('country'),
            proxy_type=selected.get('type', 'residential'),
            reason="auto_assigned"
        )
    
    async def handle_proxy_failure(
        self,
        account_id: int,
        error: Optional[str] = None
    ) -> Optional[str]:
        """
        處理代理失敗
        
        策略：
        1. 嘗試驗證當前代理是否真的失效
        2. 如果確實失效，從池中分配新代理
        3. 記錄更換歷史
        
        Args:
            account_id: 帳號 ID
            error: 錯誤信息
        
        Returns:
            新代理地址，如果無法恢復則返回 None
        """
        binding = self._bindings.get(account_id)
        if not binding:
            return None
        
        # 驗證代理是否真的失效
        is_valid, verify_error = await self.verify_binding(account_id)
        if is_valid:
            # 代理仍然有效，可能是臨時問題
            print(f"[IPBindingManager] Proxy for {binding.phone} still valid after failure report", file=sys.stderr)
            return binding.proxy
        
        # 代理確實失效，需要更換
        print(f"[IPBindingManager] Proxy for {binding.phone} confirmed failed: {verify_error}", file=sys.stderr)
        
        # 從池中獲取新代理（排除當前失效的）
        available_proxies = [
            p for p in self._proxy_pool 
            if p['proxy'] != binding.proxy
        ]
        
        if not available_proxies:
            print(f"[IPBindingManager] No alternative proxy available for {binding.phone}", file=sys.stderr)
            return None
        
        # 優先選擇同國家的代理
        same_country = [p for p in available_proxies if p.get('country') == binding.proxy_country]
        if same_country:
            available_proxies = same_country
        
        # 選擇新代理
        new_proxy_info = available_proxies[0]
        
        # 綁定新代理
        new_binding = await self.bind_ip(
            account_id=account_id,
            phone=binding.phone,
            proxy=new_proxy_info['proxy'],
            proxy_country=new_proxy_info.get('country'),
            proxy_type=new_proxy_info.get('type', 'residential'),
            reason="failure"
        )
        
        return new_binding.proxy if new_binding else None
    
    def get_all_bindings(self) -> List[Dict[str, Any]]:
        """獲取所有 IP 綁定"""
        return [asdict(b) for b in self._bindings.values()]
    
    def get_change_history(
        self,
        account_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        獲取 IP 更換歷史
        
        Args:
            account_id: 帳號 ID（可選，不指定則返回所有）
            limit: 返回數量限制
        
        Returns:
            更換記錄列表
        """
        history = self._change_history
        if account_id:
            history = [r for r in history if r.account_id == account_id]
        return [asdict(r) for r in history[-limit:]]
    
    def get_statistics(self) -> Dict[str, Any]:
        """獲取統計信息"""
        active_bindings = [b for b in self._bindings.values() if b.is_active]
        inactive_bindings = [b for b in self._bindings.values() if not b.is_active]
        
        # 按國家統計
        by_country: Dict[str, int] = {}
        for b in self._bindings.values():
            by_country[b.proxy_country] = by_country.get(b.proxy_country, 0) + 1
        
        # 按類型統計
        by_type: Dict[str, int] = {}
        for b in self._bindings.values():
            by_type[b.proxy_type] = by_type.get(b.proxy_type, 0) + 1
        
        # 計算平均延遲
        latencies = [b.avg_latency_ms for b in active_bindings if b.avg_latency_ms > 0]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        
        return {
            "total_bindings": len(self._bindings),
            "active_bindings": len(active_bindings),
            "inactive_bindings": len(inactive_bindings),
            "by_country": by_country,
            "by_type": by_type,
            "avg_latency_ms": round(avg_latency, 2),
            "total_changes": len(self._change_history),
            "recent_changes": len([
                r for r in self._change_history
                if datetime.fromisoformat(r.changed_at) > datetime.utcnow() - timedelta(hours=24)
            ])
        }
    
    async def cleanup_inactive_bindings(self, days: int = 30) -> int:
        """
        清理長期不活躍的綁定
        
        Args:
            days: 不活躍天數閾值
        
        Returns:
            清理的數量
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        removed = 0
        
        for account_id in list(self._bindings.keys()):
            binding = self._bindings[account_id]
            if not binding.is_active:
                bound_at = datetime.fromisoformat(binding.bound_at)
                if bound_at < cutoff:
                    del self._bindings[account_id]
                    if binding.phone in self._phone_to_account:
                        del self._phone_to_account[binding.phone]
                    removed += 1
        
        if removed > 0:
            self._save_data()
            print(f"[IPBindingManager] Cleaned up {removed} inactive bindings", file=sys.stderr)
        
        return removed


# 全局實例
_ip_binding_manager: Optional[IPBindingManager] = None


def init_ip_binding_manager(
    data_dir: str = "./data",
    event_callback: Optional[callable] = None
) -> IPBindingManager:
    """初始化全局 IP 綁定管理器"""
    global _ip_binding_manager
    _ip_binding_manager = IPBindingManager(data_dir, event_callback)
    return _ip_binding_manager


def get_ip_binding_manager() -> Optional[IPBindingManager]:
    """獲取全局 IP 綁定管理器"""
    return _ip_binding_manager

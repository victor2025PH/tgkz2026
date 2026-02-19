"""
Connection Monitor - 連接監控和自動恢復服務
功能：
- 定期檢查所有帳號連接狀態
- Session 過期自動檢測（AuthKeyUnregistered → Session Expired）
- 指數退避重連，避免頻繁打 API
- 標記 Disconnected 後仍可後台低頻重試
- 記錄登入/斷開/重連事件到 account_events
"""
import sys
import asyncio
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta

from database import db

# Pyrogram 會話失效錯誤（用於區分「網路閃斷」與「Session 已撤銷」）
try:
    from pyrogram.errors import AuthKeyUnregistered, UserDeactivated
except ImportError:
    AuthKeyUnregistered = type("AuthKeyUnregistered", (Exception,), {})
    UserDeactivated = type("UserDeactivated", (Exception,), {})


class ConnectionMonitor:
    """連接監控和自動恢復服務"""
    
    def __init__(self, telegram_manager=None, event_callback: Optional[Callable] = None):
        self.telegram_manager = telegram_manager
        self.event_callback = event_callback
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._background_task: Optional[asyncio.Task] = None
        self._check_interval = 60  # 檢查間隔（秒）
        self._reconnect_attempts: Dict[str, int] = {}
        self._max_reconnect_attempts = 5  # 主流程最大重連次數（提高以配合退避）
        self._last_retry_at: Dict[str, datetime] = {}  # 上次重連時間（用於指數退避）
        self._last_check_time: Optional[datetime] = None
        self._connection_stats: Dict[str, Dict] = {}
        # P1-1: 標記為 Disconnected 後進入後台恢復隊列，低頻重試
        self._background_recovery: Dict[str, Dict[str, Any]] = {}  # phone -> { account_id, account, next_retry_at, attempts }
        self._background_interval = 300  # 後台重試間隔 5 分鐘
        self._max_background_attempts = 3  # 後台最多再試 3 次
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[ConnectionMonitor] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def set_telegram_manager(self, manager):
        """設置 Telegram 管理器"""
        self.telegram_manager = manager
    
    def _backoff_seconds(self, attempts: int) -> int:
        """指數退避：30, 60, 120, 240, 最多 600 秒"""
        return min(30 * (2 ** attempts), 600)
    
    async def start(self, check_interval: int = 60):
        """啟動連接監控"""
        if self._running:
            self.log("監控已在運行中", "warning")
            return
        
        self._running = True
        self._check_interval = check_interval
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        self._background_task = asyncio.create_task(self._background_recovery_loop())
        self.log(f"🔄 連接監控已啟動，間隔: {check_interval} 秒（含指數退避與後台恢復）")
    
    async def stop(self):
        """停止連接監控"""
        self._running = False
        
        for task in (self._monitor_task, self._background_task):
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self.log("🛑 連接監控已停止")
    
    async def _monitor_loop(self):
        """監控循環"""
        while self._running:
            try:
                await self._check_all_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"監控循環錯誤: {e}", "error")
            
            await asyncio.sleep(self._check_interval)
    
    async def _background_recovery_loop(self):
        """後台恢復：對已標記 Disconnected 的帳號低頻重試"""
        while self._running:
            try:
                await asyncio.sleep(self._background_interval)
                if not self.telegram_manager or not self._background_recovery:
                    continue
                
                now = datetime.now()
                to_remove = []
                for phone, info in list(self._background_recovery.items()):
                    if info.get("next_retry_at") and now < info["next_retry_at"]:
                        continue
                    attempts = info.get("attempts", 0)
                    if attempts >= self._max_background_attempts:
                        to_remove.append(phone)
                        continue
                    
                    account_id = info.get("account_id")
                    account = info.get("account")
                    if not account:
                        to_remove.append(phone)
                        continue
                    
                    info["attempts"] = attempts + 1
                    info["next_retry_at"] = now + timedelta(seconds=self._backoff_seconds(attempts))
                    
                    self.log(f"🔄 [後台恢復] {phone}: 嘗試 ({attempts + 1}/{self._max_background_attempts})")
                    ok = await self._do_reconnect(phone, account_id, account)
                    if ok:
                        to_remove.append(phone)
                        self._reconnect_attempts[phone] = 0
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"後台恢復循環錯誤: {e}", "error")
            
            for phone in to_remove:
                self._background_recovery.pop(phone, None)
    
    async def _check_all_connections(self):
        """檢查所有帳號的連接狀態"""
        if not self.telegram_manager:
            return
        
        self._last_check_time = datetime.now()
        
        try:
            accounts = await db.get_all_accounts()
            online_accounts = [a for a in accounts if a.get('status') == 'Online']
            
            if not online_accounts:
                return
            
            disconnected = []
            reconnected = []
            now = datetime.now()
            
            for account in online_accounts:
                phone = account.get('phone')
                account_id = account.get('id')
                
                client = self.telegram_manager.get_client(phone)
                is_connected = False
                session_expired = False
                
                if client:
                    try:
                        is_connected = client.is_connected
                        if is_connected:
                            try:
                                await asyncio.wait_for(client.get_me(), timeout=10)
                            except asyncio.TimeoutError:
                                is_connected = False
                                self.log(f"⚠ {phone}: 會話驗證超時", "warning")
                            except (AuthKeyUnregistered, UserDeactivated) as e:
                                # P1-2: Session 已撤銷/帳號被停用 → 標記 Session Expired，不參與重連
                                is_connected = False
                                session_expired = True
                                self.log(f"⚠ {phone}: Session 已過期或帳號停用 ({type(e).__name__})", "warning")
                            except Exception:
                                is_connected = False
                    except Exception:
                        is_connected = False
                
                if phone not in self._connection_stats:
                    self._connection_stats[phone] = {
                        'last_check': now,
                        'connected': is_connected,
                        'disconnects': 0,
                        'reconnects': 0
                    }
                
                self._connection_stats[phone]['last_check'] = now
                
                if not is_connected:
                    self._connection_stats[phone]['connected'] = False
                    self._connection_stats[phone]['disconnects'] += 1
                    disconnected.append(phone)
                    
                    if session_expired:
                        # 直接標記 Session Expired 並記錄事件，不重連
                        try:
                            await db.update_account(account_id, {"status": "Session Expired"})
                            await db.add_account_event(account_id, "session_expired", "AuthKeyUnregistered or UserDeactivated")
                        except Exception:
                            pass
                        self._reconnect_attempts[phone] = 0
                        if self.event_callback:
                            self.event_callback("account-session-expired", {
                                "accountId": account_id,
                                "phone": phone,
                                "timestamp": now.isoformat()
                            })
                    else:
                        # 檢查是否在退避期內
                        next_retry = self._last_retry_at.get(phone)
                        if next_retry and now < next_retry:
                            continue
                        await self._try_reconnect(phone, account_id, account)
                else:
                    self._connection_stats[phone]['connected'] = True
                    self._reconnect_attempts[phone] = 0
                    self._last_retry_at.pop(phone, None)
                    self._background_recovery.pop(phone, None)
            
            if self.event_callback:
                self.event_callback("connection-status-update", {
                    "timestamp": now.isoformat(),
                    "total_online": len(online_accounts),
                    "actually_connected": len(online_accounts) - len(disconnected),
                    "disconnected": disconnected
                })
                
        except Exception as e:
            self.log(f"檢查連接錯誤: {e}", "error")
    
    async def _try_reconnect(self, phone: str, account_id: int, account: Dict):
        """嘗試重新連接（主流程，帶指數退避）"""
        attempts = self._reconnect_attempts.get(phone, 0)
        
        if attempts >= self._max_reconnect_attempts:
            self.log(f"✗ {phone}: 已達最大重連次數 ({self._max_reconnect_attempts})，標記離線並加入後台恢復", "warning")
            try:
                # P1-3: 連接屢次失敗時略降健康分（便於卡片可視化）
                cur = account.get("healthScore")
                new_health = max(0.0, (cur if cur is not None else 100) - 10.0)
                await db.update_account(account_id, {"status": "Disconnected", "healthScore": new_health})
                await db.add_account_event(account_id, "disconnect", "max_reconnect_attempts")
            except Exception:
                pass
            self._background_recovery[phone] = {
                "account_id": account_id,
                "account": account,
                "next_retry_at": datetime.now() + timedelta(seconds=self._background_interval),
                "attempts": 0
            }
            return
        
        backoff = self._backoff_seconds(attempts)
        self._reconnect_attempts[phone] = attempts + 1
        self._last_retry_at[phone] = datetime.now() + timedelta(seconds=backoff)
        self.log(f"🔄 {phone}: 嘗試重連 ({attempts + 1}/{self._max_reconnect_attempts})，{backoff}s 後可再試")
        
        ok = await self._do_reconnect(phone, account_id, account)
        if ok:
            self._reconnect_attempts[phone] = 0
            self._last_retry_at.pop(phone, None)
    
    async def _do_reconnect(self, phone: str, account_id: int, account: Dict) -> bool:
        """執行一次重連邏輯，返回是否成功"""
        try:
            api_id = account.get('apiId')
            api_hash = account.get('apiHash')
            
            if not api_id or not api_hash:
                self.log(f"✗ {phone}: 無法重連，缺少 API 配置", "error")
                return False
            
            result = await self.telegram_manager.login_account(
                phone=phone,
                api_id=api_id,
                api_hash=api_hash
            )
            
            if result.get('success') or result.get('status') == 'Online':
                client = self.telegram_manager.get_client(phone)
                if client and client.is_connected:
                    try:
                        me = await client.get_me()
                        if me:
                            self.log(f"✓ {phone}: 重連成功", "success")
                            if phone in self._connection_stats:
                                self._connection_stats[phone]['reconnects'] += 1
                            # P1-3: 重連成功略升健康分
                            cur = account.get("healthScore")
                            new_health = min(100.0, (cur if cur is not None else 80) + 5.0)
                            await db.update_account(account_id, {"status": "Online", "healthScore": new_health})
                            await db.add_account_event(account_id, "reconnect_ok", None)
                            if self.event_callback:
                                self.event_callback("account-reconnected", {
                                    "phone": phone,
                                    "accountId": account_id,
                                    "timestamp": datetime.now().isoformat()
                                })
                            return True
                    except Exception:
                        pass
            
            return False
            
        except Exception as e:
            self.log(f"✗ {phone}: 重連錯誤: {e}", "error")
            return False
    
    async def force_check(self) -> Dict[str, Any]:
        """強制執行一次連接檢查"""
        await self._check_all_connections()
        return {
            "last_check": self._last_check_time.isoformat() if self._last_check_time else None,
            "stats": self._connection_stats,
            "background_recovery_count": len(self._background_recovery)
        }
    
    def get_status(self) -> Dict[str, Any]:
        """獲取監控狀態"""
        return {
            "running": self._running,
            "check_interval": self._check_interval,
            "last_check": self._last_check_time.isoformat() if self._last_check_time else None,
            "connection_stats": self._connection_stats,
            "reconnect_attempts": self._reconnect_attempts,
            "background_recovery_count": len(self._background_recovery)
        }


connection_monitor = ConnectionMonitor()

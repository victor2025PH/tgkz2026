"""
Connection Monitor - 連接監控和自動恢復服務
功能：
- 定期檢查所有帳號連接狀態
- 自動重連斷開的帳號
- 記錄連接問題
"""
import sys
import asyncio
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta
from database import db


class ConnectionMonitor:
    """連接監控和自動恢復服務"""
    
    def __init__(self, telegram_manager=None, event_callback: Optional[Callable] = None):
        self.telegram_manager = telegram_manager
        self.event_callback = event_callback
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._check_interval = 60  # 檢查間隔（秒）
        self._reconnect_attempts: Dict[str, int] = {}  # 重連嘗試次數
        self._max_reconnect_attempts = 3  # 最大重連次數
        self._last_check_time: Optional[datetime] = None
        self._connection_stats: Dict[str, Dict] = {}  # 連接統計
    
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
    
    async def start(self, check_interval: int = 60):
        """
        啟動連接監控
        
        Args:
            check_interval: 檢查間隔（秒）
        """
        if self._running:
            self.log("監控已在運行中", "warning")
            return
        
        self._running = True
        self._check_interval = check_interval
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        self.log(f"🔄 連接監控已啟動，間隔: {check_interval} 秒")
    
    async def stop(self):
        """停止連接監控"""
        self._running = False
        
        if self._monitor_task and not self._monitor_task.done():
            self._monitor_task.cancel()
            try:
                await self._monitor_task
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
            
            for account in online_accounts:
                phone = account.get('phone')
                account_id = account.get('id')
                
                # 檢查實際連接狀態
                client = self.telegram_manager.get_client(phone)
                is_connected = False
                
                if client:
                    try:
                        is_connected = client.is_connected
                        if is_connected:
                            # 驗證會話是否有效
                            try:
                                await asyncio.wait_for(client.get_me(), timeout=10)
                            except asyncio.TimeoutError:
                                is_connected = False
                                self.log(f"⚠ {phone}: 會話驗證超時", "warning")
                            except Exception:
                                is_connected = False
                    except Exception:
                        is_connected = False
                
                # 更新連接統計
                if phone not in self._connection_stats:
                    self._connection_stats[phone] = {
                        'last_check': datetime.now(),
                        'connected': is_connected,
                        'disconnects': 0,
                        'reconnects': 0
                    }
                
                self._connection_stats[phone]['last_check'] = datetime.now()
                
                if not is_connected:
                    # 連接斷開
                    self._connection_stats[phone]['connected'] = False
                    self._connection_stats[phone]['disconnects'] += 1
                    disconnected.append(phone)
                    
                    # 嘗試重連
                    await self._try_reconnect(phone, account_id, account)
                else:
                    # 連接正常
                    self._connection_stats[phone]['connected'] = True
                    # 重置重連計數
                    self._reconnect_attempts[phone] = 0
            
            # 發送狀態更新事件
            if self.event_callback:
                self.event_callback("connection-status-update", {
                    "timestamp": datetime.now().isoformat(),
                    "total_online": len(online_accounts),
                    "actually_connected": len(online_accounts) - len(disconnected),
                    "disconnected": disconnected
                })
                
        except Exception as e:
            self.log(f"檢查連接錯誤: {e}", "error")
    
    async def _try_reconnect(self, phone: str, account_id: int, account: Dict):
        """嘗試重新連接"""
        # 檢查重連次數
        attempts = self._reconnect_attempts.get(phone, 0)
        
        if attempts >= self._max_reconnect_attempts:
            self.log(f"✗ {phone}: 已達最大重連次數 ({self._max_reconnect_attempts})，跳過", "warning")
            # 更新資料庫狀態
            try:
                await db.update_account(account_id, {"status": "Disconnected"})
            except:
                pass
            return
        
        self._reconnect_attempts[phone] = attempts + 1
        self.log(f"🔄 {phone}: 嘗試重連 ({attempts + 1}/{self._max_reconnect_attempts})...")
        
        try:
            api_id = account.get('apiId')
            api_hash = account.get('apiHash')
            
            if not api_id or not api_hash:
                self.log(f"✗ {phone}: 無法重連，缺少 API 配置", "error")
                return
            
            # 嘗試登入（使用正確的方法名）
            result = await self.telegram_manager.login_account(
                phone=phone,
                api_id=api_id,
                api_hash=api_hash
            )
            
            if result.get('success') or result.get('status') == 'Online':
                # 驗證連接
                client = self.telegram_manager.get_client(phone)
                if client and client.is_connected:
                    try:
                        me = await client.get_me()
                        if me:
                            self.log(f"✓ {phone}: 重連成功", "success")
                            self._connection_stats[phone]['reconnects'] += 1
                            self._reconnect_attempts[phone] = 0
                            await db.update_account(account_id, {"status": "Online"})
                            
                            # 發送重連成功事件
                            if self.event_callback:
                                self.event_callback("account-reconnected", {
                                    "phone": phone,
                                    "timestamp": datetime.now().isoformat()
                                })
                            return
                    except Exception:
                        pass
            
            self.log(f"✗ {phone}: 重連失敗", "warning")
            
        except Exception as e:
            self.log(f"✗ {phone}: 重連錯誤: {e}", "error")
    
    async def force_check(self) -> Dict[str, Any]:
        """強制執行一次連接檢查"""
        await self._check_all_connections()
        
        return {
            "last_check": self._last_check_time.isoformat() if self._last_check_time else None,
            "stats": self._connection_stats
        }
    
    def get_status(self) -> Dict[str, Any]:
        """獲取監控狀態"""
        return {
            "running": self._running,
            "check_interval": self._check_interval,
            "last_check": self._last_check_time.isoformat() if self._last_check_time else None,
            "connection_stats": self._connection_stats,
            "reconnect_attempts": self._reconnect_attempts
        }


# 創建全局實例
connection_monitor = ConnectionMonitor()

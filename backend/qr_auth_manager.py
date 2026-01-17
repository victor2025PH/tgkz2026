"""
TG-Matrix QR Code Authentication Manager
掃碼登入管理器 - 使用 Telethon 實現掃碼授權

功能：
1. 生成 QR 碼供用戶掃描
2. 處理二步驗證
3. 保存 Session
4. 支持設備指紋多樣化
5. IP 粘性綁定
"""

import asyncio
import base64
import io
import os
import sys
import time
import json
import random
from typing import Dict, Optional, Any, Callable
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    import qrcode
    HAS_QRCODE = True
    print(f"[QRAuthManager] qrcode library loaded successfully (version: {getattr(qrcode, '__version__', 'unknown')})", file=sys.stderr)
except ImportError as e:
    HAS_QRCODE = False
    print(f"[QRAuthManager] Warning: qrcode library not installed. Error: {e}", file=sys.stderr)
    print(f"[QRAuthManager] Python executable: {sys.executable}", file=sys.stderr)
    print(f"[QRAuthManager] Run: {sys.executable} -m pip install qrcode[pil]", file=sys.stderr)

try:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    from telethon.errors import SessionPasswordNeededError, PasswordHashInvalidError
    from telethon.tl.functions.auth import ExportLoginTokenRequest, ImportLoginTokenRequest, AcceptLoginTokenRequest
    from telethon.tl.types import auth
    import telethon
    HAS_TELETHON = True
    print(f"[QRAuthManager] telethon library loaded successfully (version: {getattr(telethon, '__version__', 'unknown')})", file=sys.stderr)
except ImportError as e:
    HAS_TELETHON = False
    print(f"[QRAuthManager] Warning: telethon library not installed. Error: {e}", file=sys.stderr)
    print(f"[QRAuthManager] Python executable: {sys.executable}", file=sys.stderr)
    print(f"[QRAuthManager] Run: {sys.executable} -m pip install telethon", file=sys.stderr)

from device_fingerprint import DeviceFingerprintGenerator, DeviceProfile


@dataclass
class QRLoginSession:
    """QR 登入會話信息"""
    session_id: str
    phone: Optional[str]
    qr_url: str
    qr_image_base64: str
    expires_at: float  # Unix timestamp
    status: str  # 'pending', 'scanned', 'waiting_2fa', 'success', 'expired', 'error'
    device_fingerprint: Dict[str, Any]
    proxy: Optional[str]
    created_at: float
    message: Optional[str] = None
    user_info: Optional[Dict[str, Any]] = None


@dataclass
class AccountCredentials:
    """帳號憑據"""
    phone: str
    api_id: int
    api_hash: str
    session_string: str
    device_fingerprint: Dict[str, Any]
    proxy: Optional[str]
    ip_binding: Optional[Dict[str, Any]]
    api_type: str  # 'public' or 'native'
    created_at: str


class QRAuthManager:
    """QR 碼掃描授權管理器"""
    
    # 內置公共 API 憑據（用於初始登入，後續會升級為專屬 API）
    # 這些是 Telegram 官方公開的測試憑據
    PUBLIC_API_CREDENTIALS = [
        {"api_id": 2040, "api_hash": "b18441a1ff607e10a989891a5462e627"},  # Telegram Desktop
        {"api_id": 611335, "api_hash": "d524b414d21f4d37f08684c1df41ac9c"},  # Telegram iOS
        {"api_id": 21724, "api_hash": "3e0cb5efcd52300aec5994fdfc5bdc16"},  # Telegram Android
    ]
    
    def __init__(
        self,
        sessions_dir: str = "./data/sessions",
        event_callback: Optional[Callable[[str, Any], None]] = None
    ):
        """
        初始化 QR 授權管理器
        
        Args:
            sessions_dir: Session 文件存儲目錄
            event_callback: 事件回調函數
        """
        self.sessions_dir = Path(sessions_dir)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.event_callback = event_callback
        
        # 活躍的 QR 登入會話
        self.active_sessions: Dict[str, QRLoginSession] = {}
        # Telethon 客戶端（用於 QR 登入）
        self.telethon_clients: Dict[str, TelegramClient] = {}
        # 設備指紋生成器
        self.fingerprint_generator = DeviceFingerprintGenerator()
        
        # 清理任務
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """啟動管理器"""
        if not HAS_TELETHON:
            print("[QRAuthManager] Telethon not available, QR login disabled", file=sys.stderr)
            return
            
        # 啟動清理任務
        self._cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
        print("[QRAuthManager] Started", file=sys.stderr)
        
    async def stop(self):
        """停止管理器"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
                
        # 關閉所有 Telethon 客戶端
        for session_id, client in list(self.telethon_clients.items()):
            try:
                if client.is_connected():
                    await client.disconnect()
            except Exception as e:
                print(f"[QRAuthManager] Error disconnecting client {session_id}: {e}", file=sys.stderr)
                
        self.telethon_clients.clear()
        self.active_sessions.clear()
        print("[QRAuthManager] Stopped", file=sys.stderr)
        
    def _generate_session_id(self) -> str:
        """生成唯一的會話 ID"""
        import uuid
        return f"qr_{uuid.uuid4().hex[:12]}_{int(time.time())}"
        
    def _select_api_credentials(self) -> Dict[str, Any]:
        """隨機選擇一組公共 API 憑據"""
        return random.choice(self.PUBLIC_API_CREDENTIALS)
        
    def _generate_qr_image(self, url: str) -> str:
        """
        生成 QR 碼圖片並返回 Base64 編碼
        
        Args:
            url: QR 碼內容（Telegram 登入 URL）
            
        Returns:
            Base64 編碼的 PNG 圖片
        """
        if not HAS_QRCODE:
            print(f"[QRAuthManager] Warning: qrcode library not available, cannot generate QR image", file=sys.stderr)
            return ""
        
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )
            qr.add_data(url)
            qr.make(fit=True)
            
            print(f"[QRAuthManager] Generating QR image for URL (length: {len(url)})", file=sys.stderr)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            
            base64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            print(f"[QRAuthManager] QR image generated successfully (size: {len(base64_str)} chars)", file=sys.stderr)
            return base64_str
        except Exception as e:
            print(f"[QRAuthManager] Error generating QR image: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            # 返回空字符串，但記錄錯誤
            return ""
        
    def _parse_proxy(self, proxy_str: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        解析代理字符串
        
        Args:
            proxy_str: 代理字符串，格式如 socks5://user:pass@host:port
            
        Returns:
            Telethon 代理配置字典
        """
        if not proxy_str:
            return None
            
        try:
            import socks
            
            if proxy_str.startswith('socks5://'):
                proxy_str = proxy_str[9:]
                proxy_type = socks.SOCKS5
            elif proxy_str.startswith('socks4://'):
                proxy_str = proxy_str[9:]
                proxy_type = socks.SOCKS4
            elif proxy_str.startswith('http://'):
                proxy_str = proxy_str[7:]
                proxy_type = socks.HTTP
            else:
                proxy_type = socks.SOCKS5
                
            # 解析 user:pass@host:port
            auth = None
            if '@' in proxy_str:
                auth_part, host_part = proxy_str.rsplit('@', 1)
                if ':' in auth_part:
                    username, password = auth_part.split(':', 1)
                    auth = (username, password)
            else:
                host_part = proxy_str
                
            if ':' in host_part:
                host, port = host_part.rsplit(':', 1)
                port = int(port)
            else:
                host = host_part
                port = 1080
                
            return (proxy_type, host, port, True, auth[0] if auth else None, auth[1] if auth else None)
            
        except Exception as e:
            print(f"[QRAuthManager] Error parsing proxy: {e}", file=sys.stderr)
            return None
            
    async def create_qr_login(
        self,
        proxy: Optional[str] = None,
        device_type: Optional[str] = None,  # 'ios', 'android', 'desktop', None for random
        two_factor_password: Optional[str] = None,
        custom_api_id: Optional[str] = None,
        custom_api_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        創建 QR 登入會話
        
        Args:
            proxy: 代理配置
            device_type: 設備類型（ios/android/desktop，None 為智能隨機）
            two_factor_password: 二步驗證密碼（預設）
            custom_api_id: 用戶專屬 API ID（強烈推薦）
            custom_api_hash: 用戶專屬 API Hash（強烈推薦）
            
        Returns:
            包含 QR 碼信息的字典
        """
        if not HAS_TELETHON:
            return {
                "success": False,
                "error": "Telethon library not installed. Please run: pip install telethon"
            }
            
        if not HAS_QRCODE:
            return {
                "success": False,
                "error": "QRCode library not installed. Please run: pip install qrcode"
            }
            
        session_id = self._generate_session_id()
        
        try:
            # 選擇 API 憑據（優先使用用戶專屬 API）
            if custom_api_id and custom_api_hash:
                # 使用用戶專屬 API（推薦，防封）
                api_id = int(custom_api_id)
                api_hash = custom_api_hash
                api_type = "custom"
                print(f"[QRAuthManager] Using CUSTOM API credentials (api_id={api_id}) - RECOMMENDED for anti-ban", file=sys.stderr)
            else:
                # 使用公共 API（高風險！）
                api_creds = self._select_api_credentials()
                api_id = api_creds["api_id"]
                api_hash = api_creds["api_hash"]
                api_type = "public"
                print(f"[QRAuthManager] ⚠️ WARNING: Using PUBLIC API credentials (api_id={api_id}) - HIGH RISK OF BAN!", file=sys.stderr)
            
            # 生成設備指紋
            if device_type:
                fingerprint = self.fingerprint_generator.generate_for_platform(device_type)
            else:
                fingerprint = self.fingerprint_generator.generate_random()
            
            # 將 API 類型添加到設備指紋中（便於後續追踪）
            fingerprint_dict = asdict(fingerprint) if hasattr(fingerprint, '__dataclass_fields__') else fingerprint
            fingerprint_dict["api_type"] = api_type
                
            # 解析代理
            proxy_config = self._parse_proxy(proxy)
            
            # 創建 Telethon 客戶端（使用 StringSession 便於後續保存）
            print(f"[QRAuthManager] Creating TelegramClient with api_id={api_id}, device={fingerprint.device_model}", file=sys.stderr)
            client = TelegramClient(
                StringSession(),
                api_id,
                api_hash,
                device_model=fingerprint.device_model,
                system_version=fingerprint.system_version,
                app_version=fingerprint.app_version,
                lang_code=fingerprint.lang_code,
                proxy=proxy_config
            )
            
            print(f"[QRAuthManager] Connecting to Telegram...", file=sys.stderr)
            # 連接超時設置為 30 秒
            try:
                await asyncio.wait_for(client.connect(), timeout=30.0)
                print(f"[QRAuthManager] Connected successfully", file=sys.stderr)
            except asyncio.TimeoutError:
                print(f"[QRAuthManager] Connection timeout", file=sys.stderr)
                return {
                    "success": False,
                    "error": "連接 Telegram 服務器超時，請檢查網絡連接或代理設置"
                }
            except Exception as e:
                print(f"[QRAuthManager] Connection error: {e}", file=sys.stderr)
                return {
                    "success": False,
                    "error": f"連接 Telegram 服務器失敗: {str(e)}"
                }
            
            # 請求 QR 登入 token（超時設置為 30 秒）
            print(f"[QRAuthManager] Requesting QR login token...", file=sys.stderr)
            try:
                qr_login = await asyncio.wait_for(client.qr_login(), timeout=30.0)
                print(f"[QRAuthManager] QR login token received", file=sys.stderr)
            except asyncio.TimeoutError:
                print(f"[QRAuthManager] QR login request timeout", file=sys.stderr)
                await client.disconnect()
                return {
                    "success": False,
                    "error": "獲取 QR 登入令牌超時，請稍後重試"
                }
            except Exception as e:
                print(f"[QRAuthManager] QR login request error: {e}", file=sys.stderr)
                await client.disconnect()
                return {
                    "success": False,
                    "error": f"獲取 QR 登入令牌失敗: {str(e)}"
                }
            
            # 生成 QR 碼 URL
            qr_url = qr_login.url
            print(f"[QRAuthManager] QR URL received: {qr_url[:50]}...", file=sys.stderr)
            
            # 生成 QR 碼圖片
            print(f"[QRAuthManager] Generating QR image...", file=sys.stderr)
            qr_image_base64 = self._generate_qr_image(qr_url)
            
            if not qr_image_base64:
                print(f"[QRAuthManager] Warning: QR image generation returned empty string", file=sys.stderr)
                # 即使圖片生成失敗，也繼續流程，前端可以顯示 URL
            
            # 計算過期時間（通常是 60 秒）
            expires_at = time.time() + 60
            print(f"[QRAuthManager] QR session will expire at: {expires_at}", file=sys.stderr)
            
            # 創建會話記錄
            qr_session = QRLoginSession(
                session_id=session_id,
                phone=None,
                qr_url=qr_url,
                qr_image_base64=qr_image_base64,
                expires_at=expires_at,
                status="pending",
                device_fingerprint=fingerprint_dict,
                proxy=proxy,
                created_at=time.time(),
                message="請使用 Telegram App 掃描二維碼"
            )
            
            self.active_sessions[session_id] = qr_session
            self.telethon_clients[session_id] = client
            
            print(f"[QRAuthManager] QR session created: {session_id}", file=sys.stderr)
            
            # 啟動等待掃碼的任務
            asyncio.create_task(self._wait_for_qr_scan(session_id, qr_login, two_factor_password))
            print(f"[QRAuthManager] QR scan waiting task started", file=sys.stderr)
            
            result = {
                "success": True,
                "sessionId": session_id,
                "qrUrl": qr_url,
                "qrImageBase64": qr_image_base64,
                "expiresAt": expires_at,
                "expiresIn": 60,
                "deviceInfo": {
                    "model": fingerprint.device_model,
                    "system": fingerprint.system_version,
                    "platform": fingerprint.platform
                },
                "message": "請使用 Telegram App 掃描二維碼"
            }
            
            print(f"[QRAuthManager] Returning QR login result: success=True, sessionId={session_id}, hasImage={bool(qr_image_base64)}", file=sys.stderr)
            return result
            
        except Exception as e:
            print(f"[QRAuthManager] Error creating QR login: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
            
    async def _wait_for_qr_scan(
        self,
        session_id: str,
        qr_login,
        two_factor_password: Optional[str] = None
    ):
        """
        等待用戶掃描 QR 碼
        
        Args:
            session_id: 會話 ID
            qr_login: Telethon QR 登入對象
            two_factor_password: 二步驗證密碼
        """
        try:
            client = self.telethon_clients.get(session_id)
            if not client:
                return
                
            # 等待登入結果
            try:
                user = await qr_login.wait(timeout=60)
                
                # 登入成功
                await self._handle_login_success(session_id, client, user)
                
            except asyncio.TimeoutError:
                # QR 碼過期
                self._update_session_status(session_id, "expired", "二維碼已過期，請重新生成")
                
            except SessionPasswordNeededError:
                # 需要二步驗證
                if two_factor_password:
                    try:
                        await client.sign_in(password=two_factor_password)
                        user = await client.get_me()
                        await self._handle_login_success(session_id, client, user)
                    except PasswordHashInvalidError:
                        self._update_session_status(session_id, "error", "二步驗證密碼錯誤")
                    except Exception as e:
                        self._update_session_status(session_id, "error", f"二步驗證失敗: {str(e)}")
                else:
                    self._update_session_status(session_id, "waiting_2fa", "需要輸入二步驗證密碼")
                    
        except Exception as e:
            print(f"[QRAuthManager] Error waiting for QR scan: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self._update_session_status(session_id, "error", f"登入失敗: {str(e)}")
            
    async def submit_2fa_password(
        self,
        session_id: str,
        password: str
    ) -> Dict[str, Any]:
        """
        提交二步驗證密碼
        
        Args:
            session_id: 會話 ID
            password: 二步驗證密碼
            
        Returns:
            登入結果
        """
        session = self.active_sessions.get(session_id)
        client = self.telethon_clients.get(session_id)
        
        if not session or not client:
            return {
                "success": False,
                "error": "會話不存在或已過期"
            }
            
        if session.status != "waiting_2fa":
            return {
                "success": False,
                "error": f"會話狀態不正確: {session.status}"
            }
            
        try:
            await client.sign_in(password=password)
            user = await client.get_me()
            await self._handle_login_success(session_id, client, user)
            
            return {
                "success": True,
                "message": "登入成功"
            }
            
        except PasswordHashInvalidError:
            return {
                "success": False,
                "error": "二步驗證密碼錯誤"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"登入失敗: {str(e)}"
            }
            
    async def _handle_login_success(
        self,
        session_id: str,
        client: TelegramClient,
        user
    ):
        """
        處理登入成功
        
        Args:
            session_id: 會話 ID
            client: Telethon 客戶端
            user: 用戶信息
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return
            
        try:
            # 獲取用戶信息
            phone = user.phone if user.phone else "Unknown"
            user_info = {
                "id": user.id,
                "phone": phone,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "username": user.username,
            }
            
            # 獲取 Session 字符串
            session_string = client.session.save()
            
            # 獲取 API 類型（custom 或 public）
            # 嘗試從 session 的 device_fingerprint 中獲取，或默認為 public
            api_type = session.device_fingerprint.get("api_type", "public") if isinstance(session.device_fingerprint, dict) else "public"
            
            # 保存 Session 到文件
            session_file = self.sessions_dir / f"{phone}.telethon.session"
            with open(session_file, 'w') as f:
                json.dump({
                    "session_string": session_string,
                    "phone": phone,
                    "api_id": client.api_id,
                    "api_hash": client.api_hash,
                    "device_fingerprint": session.device_fingerprint,
                    "proxy": session.proxy,
                    "api_type": api_type,
                    "created_at": datetime.now().isoformat(),
                    "user_info": user_info
                }, f, indent=2)
                
            # 更新會話狀態
            session.phone = phone
            session.status = "success"
            session.message = f"登入成功: {user.first_name or phone}"
            session.user_info = user_info
            
            # 發送事件讓後端添加賬戶
            # 使用 qr-login-account-ready 事件，由 main.py 處理實際的賬戶添加
            if self.event_callback:
                # 確保 API 憑證存在
                api_id = str(client.api_id) if client.api_id else None
                api_hash = client.api_hash if client.api_hash else None
                
                if not api_id or not api_hash:
                    print(f"[QRAuthManager] ERROR: Missing API credentials! api_id={api_id}, api_hash={'***' if api_hash else None}", file=sys.stderr)
                
                event_payload = {
                    "phone": phone,
                    "api_id": api_id,
                    "api_hash": api_hash,
                    "proxy": session.proxy or "",
                    "session_string": session_string,
                    "device_fingerprint": session.device_fingerprint,
                    "user_info": user_info
                }
                
                print(f"[QRAuthManager] Sending qr-login-account-ready event for {phone} with api_id={api_id}", file=sys.stderr)
                self.event_callback("qr-login-account-ready", event_payload)
                print(f"[QRAuthManager] Sent qr-login-account-ready event for {phone}", file=sys.stderr)
            
            # 發送事件通知前端
            if self.event_callback:
                self.event_callback("qr-login-success", {
                    "sessionId": session_id,
                    "phone": phone,
                    "userInfo": user_info,
                    "deviceInfo": session.device_fingerprint,
                    "apiType": "public",
                    "message": f"帳號 {phone} 登入成功！"
                })
                
            print(f"[QRAuthManager] Login success for {phone}", file=sys.stderr)
            
        except Exception as e:
            print(f"[QRAuthManager] Error handling login success: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self._update_session_status(session_id, "error", f"保存登入信息失敗: {str(e)}")
            
    def _update_session_status(
        self,
        session_id: str,
        status: str,
        message: str
    ):
        """更新會話狀態並通知前端"""
        session = self.active_sessions.get(session_id)
        if session:
            session.status = status
            session.message = message
            
            if self.event_callback:
                self.event_callback("qr-login-status", {
                    "sessionId": session_id,
                    "status": status,
                    "message": message
                })
                
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """獲取會話狀態"""
        session = self.active_sessions.get(session_id)
        if not session:
            return {
                "success": False,
                "error": "會話不存在"
            }
            
        return {
            "success": True,
            "sessionId": session_id,
            "status": session.status,
            "message": session.message,
            "phone": session.phone,
            "userInfo": session.user_info,
            "expiresAt": session.expires_at,
            "isExpired": time.time() > session.expires_at and session.status == "pending"
        }
        
    async def refresh_qr_code(self, session_id: str) -> Dict[str, Any]:
        """
        刷新 QR 碼
        
        Args:
            session_id: 會話 ID
            
        Returns:
            新的 QR 碼信息
        """
        session = self.active_sessions.get(session_id)
        client = self.telethon_clients.get(session_id)
        
        if not session or not client:
            return {
                "success": False,
                "error": "會話不存在"
            }
            
        try:
            # 重新請求 QR 登入
            qr_login = await client.qr_login()
            qr_url = qr_login.url
            qr_image_base64 = self._generate_qr_image(qr_url)
            expires_at = time.time() + 60
            
            # 更新會話
            session.qr_url = qr_url
            session.qr_image_base64 = qr_image_base64
            session.expires_at = expires_at
            session.status = "pending"
            session.message = "請使用 Telegram App 掃描二維碼"
            
            # 啟動新的等待任務
            asyncio.create_task(self._wait_for_qr_scan(session_id, qr_login))
            
            return {
                "success": True,
                "sessionId": session_id,
                "qrUrl": qr_url,
                "qrImageBase64": qr_image_base64,
                "expiresAt": expires_at,
                "expiresIn": 60
            }
            
        except Exception as e:
            print(f"[QRAuthManager] Error refreshing QR code: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
            
    async def cancel_session(self, session_id: str) -> Dict[str, Any]:
        """取消會話"""
        session = self.active_sessions.pop(session_id, None)
        client = self.telethon_clients.pop(session_id, None)
        
        if client:
            try:
                if client.is_connected():
                    await client.disconnect()
            except Exception:
                pass
                
        return {
            "success": True,
            "message": "會話已取消"
        }
        
    async def _cleanup_expired_sessions(self):
        """定期清理過期會話"""
        while True:
            try:
                await asyncio.sleep(60)  # 每分鐘檢查一次
                
                current_time = time.time()
                expired_sessions = []
                
                for session_id, session in list(self.active_sessions.items()):
                    # 清理超過 5 分鐘的會話
                    if current_time - session.created_at > 300:
                        expired_sessions.append(session_id)
                        
                for session_id in expired_sessions:
                    await self.cancel_session(session_id)
                    print(f"[QRAuthManager] Cleaned up expired session: {session_id}", file=sys.stderr)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[QRAuthManager] Error in cleanup task: {e}", file=sys.stderr)
                
    async def get_saved_sessions(self) -> list:
        """獲取已保存的 Session 列表"""
        sessions = []
        
        for session_file in self.sessions_dir.glob("*.telethon.session"):
            try:
                with open(session_file, 'r') as f:
                    data = json.load(f)
                    sessions.append({
                        "phone": data.get("phone"),
                        "apiType": data.get("api_type", "public"),
                        "deviceInfo": data.get("device_fingerprint"),
                        "createdAt": data.get("created_at"),
                        "userInfo": data.get("user_info")
                    })
            except Exception as e:
                print(f"[QRAuthManager] Error reading session file {session_file}: {e}", file=sys.stderr)
                
        return sessions


# 全局實例
qr_auth_manager: Optional[QRAuthManager] = None


def init_qr_auth_manager(
    sessions_dir: str = "./data/sessions",
    event_callback: Optional[Callable[[str, Any], None]] = None
) -> QRAuthManager:
    """初始化 QR 授權管理器"""
    global qr_auth_manager
    qr_auth_manager = QRAuthManager(sessions_dir, event_callback)
    return qr_auth_manager


def get_qr_auth_manager() -> Optional[QRAuthManager]:
    """獲取 QR 授權管理器實例"""
    return qr_auth_manager

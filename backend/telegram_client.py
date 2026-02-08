"""
TG-Matrix Telegram Client Manager
Manages Pyrogram clients for multiple Telegram accounts
"""
import asyncio
import gc
import time
from typing import Dict, Optional, Callable, Any
from pathlib import Path
from pyrogram import Client

# ============ Monkey Patch for Pyrogram save_file bug ============
# Pyrogram 2.0.x has a bug where self.me can be None when calling save_file
# This causes AttributeError: 'NoneType' object has no attribute 'is_premium'
# We patch by ensuring client.me is set before any save_file call

def _apply_pyrogram_patch():
    """Apply monkey patch to fix Pyrogram is_premium bug"""
    import sys
    try:
        from pyrogram import Client
        from types import SimpleNamespace
        
        # Store original save_file
        _original_save_file = Client.save_file
        
        async def _patched_save_file(self, path, file_id=None, file_part=0, progress=None, progress_args=()):
            """Patched save_file that handles self.me being None"""
            # If self.me is None, set a mock object
            if self.me is None:
                print(f"[Pyrogram Patch] self.me is None, creating mock user object", file=sys.stderr)
                self.me = SimpleNamespace(is_premium=False, id=0, first_name="Unknown")
            
            # Call original method
            return await _original_save_file(self, path, file_id, file_part, progress, progress_args)
        
        # Apply patch
        Client.save_file = _patched_save_file
        print(f"[Pyrogram Patch] Successfully patched Client.save_file", file=sys.stderr)
    except Exception as patch_err:
        print(f"[Pyrogram Patch] Failed to patch: {patch_err}", file=sys.stderr)

# Apply the patch immediately
_apply_pyrogram_patch()

# ============ Monkey Patch for Peer ID Invalid Error ============
# Pyrogram 有時會在 handle_updates 中拋出 ValueError: Peer id invalid
# 這是因為 Telegram 發送的更新中包含了不在本地緩存中的 peer
# 我們需要優雅地處理這個錯誤，而不是讓整個任務崩潰

def _apply_peer_error_patch():
    """Apply monkey patch to handle Peer id invalid errors"""
    import sys
    try:
        from pyrogram.handlers.handler import Handler
        
        # 儲存原始的 check 方法
        _original_check = Handler.check
        
        async def _patched_check(self, client, update):
            """Patched check that handles Peer id invalid errors"""
            try:
                return await _original_check(self, client, update)
            except ValueError as e:
                error_str = str(e)
                if "Peer id invalid" in error_str or "ID not found" in error_str:
                    # 靜默忽略這種錯誤，只記錄日誌
                    print(f"[Pyrogram Patch] Ignored Peer ID error in handler check: {error_str}", file=sys.stderr)
                    return None  # 返回 None 表示不處理這個更新
                raise
            except KeyError as e:
                error_str = str(e)
                if "ID not found" in error_str:
                    print(f"[Pyrogram Patch] Ignored KeyError in handler check: {error_str}", file=sys.stderr)
                    return None
                raise
        
        # Apply patch
        Handler.check = _patched_check
        print(f"[Pyrogram Patch] Successfully patched Handler.check for Peer ID errors", file=sys.stderr)
    except Exception as patch_err:
        print(f"[Pyrogram Patch] Failed to patch Handler.check: {patch_err}", file=sys.stderr)

# Apply the peer error patch
_apply_peer_error_patch()

# ============ Global Task Exception Handler ============
def setup_global_exception_handler():
    """設置全局異常處理器，捕獲未處理的任務異常"""
    import sys
    
    def handle_exception(loop, context):
        exception = context.get('exception')
        message = context.get('message', '')
        
        # 檢查是否是 Peer ID 相關的錯誤
        if exception:
            error_str = str(exception)
            if "Peer id invalid" in error_str or "ID not found" in error_str:
                print(f"[Global Handler] Suppressed Peer ID error: {error_str}", file=sys.stderr)
                return  # 不傳播這個錯誤
        
        # 對於其他錯誤，記錄但不崩潰
        print(f"[Global Handler] Unhandled exception: {message}", file=sys.stderr)
        if exception:
            print(f"[Global Handler] Exception: {type(exception).__name__}: {exception}", file=sys.stderr)
    
    try:
        loop = asyncio.get_event_loop()
        loop.set_exception_handler(handle_exception)
        print(f"[Global Handler] Exception handler installed", file=sys.stderr)
    except Exception as e:
        print(f"[Global Handler] Failed to install: {e}", file=sys.stderr)

# ============ End Monkey Patch ============
import os
import tempfile
import base64
import pyrogram.raw.functions.users
import pyrogram.raw.types
from pyrogram.errors import (
    SessionPasswordNeeded, PhoneCodeInvalid, PhoneCodeExpired, PhoneNumberInvalid,
    FloodWait, AuthKeyUnregistered, UserDeactivated, UserAlreadyParticipant,
    PasswordHashInvalid, BadRequest
)
from device_fingerprint import DeviceFingerprintGenerator
from behavior_simulator import BehaviorSimulator, BehaviorConfig
# ConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ConnectionError as PyrogramConnectionError
except ImportError:
    # Use Python's built-in ConnectionError as fallback
    from builtins import ConnectionError as PyrogramConnectionError

# UserBanned might not exist in all Pyrogram versions
try:
    from pyrogram.errors import UserBanned
except ImportError:
    UserBanned = UserDeactivated  # Use UserDeactivated as fallback

# ProxyConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ProxyConnectionError
except ImportError:
    ProxyConnectionError = PyrogramConnectionError  # Use ConnectionError as fallback
# UserBanned might not exist in all Pyrogram versions
try:
    from pyrogram.errors import UserBanned
except ImportError:
    # Use UserDeactivated as fallback if UserBanned doesn't exist
    UserBanned = UserDeactivated

# Group-related errors might not exist in all Pyrogram versions
try:
    from pyrogram.errors import UserBannedInChannel
except ImportError:
    UserBannedInChannel = UserBanned

try:
    from pyrogram.errors import InviteHashExpired
except ImportError:
    class InviteHashExpired(Exception):
        pass

from pyrogram.types import Message, User
from pyrogram.handlers import MessageHandler
from pyrogram import filters
from config import config, SandboxConfig

# Pyrogram version info
import sys
print(f"[TelegramClient] Using Pyrogram (downgraded to avoid is_premium bug)", file=sys.stderr)
from keyword_matcher import KeywordMatcher
from trie_keyword_matcher import TrieKeywordMatcher
from concurrent.futures import ThreadPoolExecutor
import asyncio
from private_message_handler import private_message_handler
from text_utils import sanitize_text, safe_get_name, safe_get_username, format_chat_info, format_user_info


class TelegramClientManager:
    """Manages multiple Pyrogram clients"""
    
    def __init__(self, event_callback: Optional[Callable[[str, Any], None]] = None):
        """
        Initialize the client manager
        
        Args:
            event_callback: Callback function to send events to frontend
                           Signature: event_callback(event_name: str, payload: Any)
        """
        self.clients: Dict[str, Client] = {}  # phone -> Client
        self.client_status: Dict[str, str] = {}  # phone -> status
        self.event_callback = event_callback
        self.login_callbacks: Dict[str, Dict[str, Any]] = {}  # phone -> {phone_code_hash, client, send_type, first_send_time, etc.}
        # Temporary storage for preserving login state during client recreation
        self._pending_login_state: Dict[str, Dict[str, Any]] = {}  # phone -> {phone_code_hash, phone_code, timestamp}
        self.keyword_matchers: Dict[str, KeywordMatcher] = {}  # phone -> KeywordMatcher
        self.trie_matchers: Dict[str, TrieKeywordMatcher] = {}  # phone -> TrieKeywordMatcher (優化版本)
        self.message_executor: Optional[ThreadPoolExecutor] = None  # 線程池用於 CPU 密集型任務（延遲初始化）
        self._processing_semaphore: Optional[asyncio.Semaphore] = None  # 最多50個並發處理（延遲初始化）
        self._login_semaphore: Optional[asyncio.Semaphore] = None  # 🔧 限制並發登錄數量，避免數據庫鎖定
        
        # 🆕 性能優化：限制同時在線的客戶端數量（從沙盒配置讀取）
        self.MAX_CONCURRENT_CLIENTS = SandboxConfig.MAX_CONCURRENT_CLIENTS
        self.behavior_simulator = BehaviorSimulator()  # 行為模擬器
        
        # 🔒 沙盒隔離配置
        self.sandbox_config = SandboxConfig
        print(f"[TelegramClient] 沙盒配置: 強制代理={SandboxConfig.REQUIRE_PROXY}, 獨立目錄={SandboxConfig.USE_ISOLATED_DIRS}", file=sys.stderr)
        
        # 🔧 Phase 2 優化：內存管理
        self._last_cleanup_time = time.time()
        self._cleanup_interval = 300  # 5 分鐘清理一次
        self._idle_client_timeout = 600  # 10 分鐘未使用的客戶端可以斷開
        self._client_last_used: Dict[str, float] = {}  # phone -> last_used_time
        # Store message handlers for proper cleanup
        self.message_handlers: Dict[str, MessageHandler] = {}  # phone -> MessageHandler
        # Store monitoring info for each account
        self.monitoring_info: Dict[str, Dict[str, Any]] = {}  # phone -> {chat_ids, keyword_sets, etc.}
        
        # 🆕 設置全局異常處理器（捕獲未處理的 Peer ID 錯誤等）
        setup_global_exception_handler()
    
    def _get_executor(self) -> ThreadPoolExecutor:
        """獲取或創建線程池執行器"""
        if self.message_executor is None:
            self.message_executor = ThreadPoolExecutor(max_workers=10)
        return self.message_executor
    
    def _get_semaphore(self) -> asyncio.Semaphore:
        """獲取或創建信號量"""
        if self._processing_semaphore is None:
            self._processing_semaphore = asyncio.Semaphore(50)
        return self._processing_semaphore
    
    def _get_login_semaphore(self) -> asyncio.Semaphore:
        """🔧 獲取或創建登錄信號量（限制並發登錄數量，避免數據庫鎖定）"""
        if self._login_semaphore is None:
            # 🔧 最多同時允許 1 個登錄操作，避免 SQLite session 文件鎖定衝突
            self._login_semaphore = asyncio.Semaphore(1)
        return self._login_semaphore
    
    def get_active_client_count(self) -> int:
        """🆕 獲取當前活躍（已連接）的客戶端數量"""
        count = 0
        for phone, client in self.clients.items():
            if client and client.is_connected:
                count += 1
        return count
    
    def can_connect_new_client(self) -> bool:
        """🆕 檢查是否可以連接新的客戶端（性能限制）"""
        return self.get_active_client_count() < self.MAX_CONCURRENT_CLIENTS
    
    def get_client_limit_info(self) -> Dict[str, Any]:
        """🆕 獲取客戶端限制信息"""
        active = self.get_active_client_count()
        return {
            "active_clients": active,
            "max_clients": self.MAX_CONCURRENT_CLIENTS,
            "can_connect_more": active < self.MAX_CONCURRENT_CLIENTS,
            "remaining_slots": max(0, self.MAX_CONCURRENT_CLIENTS - active)
        }
    
    def mark_client_used(self, phone: str):
        """🔧 Phase 2 優化：標記客戶端為已使用"""
        self._client_last_used[phone] = time.time()
    
    async def cleanup_idle_clients(self) -> int:
        """🔧 Phase 2 優化：清理閒置客戶端，釋放內存"""
        current_time = time.time()
        
        # 檢查是否需要清理
        if current_time - self._last_cleanup_time < self._cleanup_interval:
            return 0
        
        self._last_cleanup_time = current_time
        cleaned = 0
        
        # 找出閒置的客戶端
        idle_phones = []
        for phone, client in list(self.clients.items()):
            last_used = self._client_last_used.get(phone, 0)
            idle_time = current_time - last_used
            
            # 如果客戶端閒置超過閾值，且不在登錄中，標記為可清理
            if idle_time > self._idle_client_timeout:
                if phone not in self.login_callbacks:
                    idle_phones.append(phone)
        
        # 保留最常用的客戶端，只清理超出限制的
        if len(self.clients) > self.MAX_CONCURRENT_CLIENTS and idle_phones:
            for phone in idle_phones[:len(idle_phones) - self.MAX_CONCURRENT_CLIENTS]:
                try:
                    print(f"[TelegramClient] 🧹 清理閒置客戶端: {phone}", file=sys.stderr)
                    await self.remove_client(phone, wait_for_disconnect=True)
                    cleaned += 1
                except Exception as e:
                    print(f"[TelegramClient] 清理失敗: {phone} - {e}", file=sys.stderr)
        
        # 清理 keyword_matchers 中不再使用的條目
        matcher_phones = list(self.keyword_matchers.keys())
        for phone in matcher_phones:
            if phone not in self.clients:
                del self.keyword_matchers[phone]
                if phone in self.trie_matchers:
                    del self.trie_matchers[phone]
        
        # 強制垃圾回收
        if cleaned > 0:
            gc.collect()
            print(f"[TelegramClient] 🧹 已清理 {cleaned} 個閒置客戶端", file=sys.stderr)
        
        return cleaned
    
    async def remove_client(self, phone: str, wait_for_disconnect: bool = True, preserve_login_state: bool = False) -> bool:
        """
        Remove a client from the manager and clean up resources
        
        Args:
            phone: Phone number of the account to remove
            wait_for_disconnect: If True, wait for client to fully disconnect before returning
            preserve_login_state: If True, preserve login state (phone_code_hash) in pending state
            
        Returns:
            True if client was removed, False if not found
        """
        if phone not in self.clients:
            return False
        
        try:
            # Get the client
            client = self.clients.get(phone)
            
            # CRITICAL: Preserve login state if requested (before clearing callbacks)
            if preserve_login_state and phone in self.login_callbacks:
                login_callback = self.login_callbacks[phone]
                preserved_hash = login_callback.get("phone_code_hash")
                preserved_code = login_callback.get("phone_code")
                if preserved_hash:
                    print(f"[TelegramClient] Preserving login state before client removal: hash={preserved_hash[:8]}...", file=sys.stderr)
                    self._pending_login_state[phone] = {
                        "phone_code_hash": preserved_hash,
                        "phone_code": preserved_code,
                        "timestamp": time.time()
                    }
            
            # Disconnect if connected
            if client:
                try:
                    # Check if connected
                    if hasattr(client, 'is_connected') and client.is_connected:
                        import sys
                        print(f"[TelegramClient] Disconnecting client for {phone}...", file=sys.stderr)
                        await client.disconnect()
                        
                        # Wait a bit for disconnect to complete
                        if wait_for_disconnect:
                            await asyncio.sleep(0.5)
                            # Verify disconnect
                            max_wait = 3  # Maximum wait time in seconds
                            wait_time = 0
                            while client.is_connected and wait_time < max_wait:
                                await asyncio.sleep(0.2)
                                wait_time += 0.2
                            
                            if client.is_connected:
                                import sys
                                print(f"[TelegramClient] WARNING: Client still connected after disconnect attempt for {phone}", file=sys.stderr)
                            else:
                                import sys
                                print(f"[TelegramClient] Client disconnected successfully for {phone}", file=sys.stderr)
                    
                    # CRITICAL: Force stop first (releases file handles)
                    if hasattr(client, 'stop'):
                        try:
                            print(f"[TelegramClient] Stopping client for {phone}...", file=sys.stderr)
                            await client.stop()
                            await asyncio.sleep(0.3)  # Wait after stop
                        except Exception as stop_e:
                            print(f"[TelegramClient] Error stopping client: {stop_e}", file=sys.stderr)
                    
                except Exception as e:
                    import sys
                    print(f"[TelegramClient] Error disconnecting client for {phone}: {e}", file=sys.stderr)
            
            # Remove from dictionaries (but preserve login state if requested)
            self.clients.pop(phone, None)
            self.client_status.pop(phone, None)
            if not preserve_login_state:
                self.login_callbacks.pop(phone, None)
            self.keyword_matchers.pop(phone, None)
            
            # Force garbage collection to release file handles
            if client:
                del client
                gc.collect()
                # Wait a bit more for file handles to be released
                await asyncio.sleep(0.5)  # Increased wait time
            
            import sys
            print(f"[TelegramClient] Removed client for {phone}", file=sys.stderr)
            return True
            
        except Exception as e:
            import sys
            print(f"[TelegramClient] Error removing client for {phone}: {e}", file=sys.stderr)
            # Still remove from dictionaries even if disconnect fails
            self.clients.pop(phone, None)
            self.client_status.pop(phone, None)
            if not preserve_login_state:
                self.login_callbacks.pop(phone, None)
            self.keyword_matchers.pop(phone, None)
            
            # Force garbage collection
            if client:
                del client
                gc.collect()
            
            return False
    
    async def _cleanup_locked_session_file(self, session_path: Path, max_attempts: int = 10, delay: float = 5.0):
        """
        Background task to clean up a locked session file.
        Tries to delete the file periodically after the client is no longer using it.
        
        Args:
            session_path: Path to the locked session file
            max_attempts: Maximum number of cleanup attempts
            delay: Delay between attempts in seconds
        """
        import sys
        for attempt in range(max_attempts):
            try:
                await asyncio.sleep(delay)
                if session_path.exists():
                    session_path.unlink()
                    print(f"[TelegramClient] Successfully cleaned up locked session file: {session_path} (attempt {attempt + 1})", file=sys.stderr)
                    return
                else:
                    print(f"[TelegramClient] Locked session file already deleted: {session_path}", file=sys.stderr)
                    return
            except PermissionError:
                if attempt < max_attempts - 1:
                    print(f"[TelegramClient] Session file still locked, will retry in {delay}s (attempt {attempt + 1}/{max_attempts})...", file=sys.stderr)
                else:
                    print(f"[TelegramClient] WARNING: Could not clean up locked session file after {max_attempts} attempts: {session_path}", file=sys.stderr)
            except Exception as e:
                print(f"[TelegramClient] Error cleaning up locked session file: {e}", file=sys.stderr)
                return
    
    def _parse_proxy(self, proxy_str: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Parse proxy string to Pyrogram proxy format
        
        Supported formats:
        - socks5://user:pass@host:port
        - http://user:pass@host:port
        - socks5://host:port (no auth)
        - http://host:port (no auth)
        """
        if not proxy_str:
            return None
        
        try:
            from urllib.parse import urlparse, parse_qs
            
            parsed = urlparse(proxy_str)
            scheme = parsed.scheme.lower()
            
            if scheme not in ['socks5', 'http', 'https']:
                return None
            
            proxy_dict = {
                "scheme": scheme,
                "hostname": parsed.hostname,
                "port": parsed.port or (1080 if scheme == 'socks5' else 8080)
            }
            
            if parsed.username:
                proxy_dict["username"] = parsed.username
            if parsed.password:
                proxy_dict["password"] = parsed.password
            
            return proxy_dict
        except Exception:
            return None
    
    async def login_account(
        self,
        phone: str,
        api_id: Optional[str] = None,
        api_hash: Optional[str] = None,
        proxy: Optional[str] = None,
        two_factor_password: Optional[str] = None,
        phone_code: Optional[str] = None,
        phone_code_hash: Optional[str] = None,
        device_model: Optional[str] = None,
        system_version: Optional[str] = None,
        app_version: Optional[str] = None,
        lang_code: Optional[str] = None,
        platform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Login to a Telegram account
        
        Args:
            phone: Phone number
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            proxy: Proxy string
            two_factor_password: 2FA password
            phone_code: Verification code
            phone_code_hash: Phone code hash
            device_model: Device model (防封)
            system_version: System version (防封)
            app_version: App version (防封)
            lang_code: Language code (防封)
            platform: Platform (ios/android) (防封)
        
        Returns:
            Dict with 'success', 'status', 'message', and optionally 'requires_code' or 'requires_2fa'
        """
        import sys
        
        # 🔧 使用信號量限制並發登錄，避免數據庫鎖定
        login_semaphore = self._get_login_semaphore()
        acquired = False
        
        try:
            # 🔧 等待獲取登錄鎖（最多等待 60 秒）
            try:
                await asyncio.wait_for(login_semaphore.acquire(), timeout=60.0)
                acquired = True
                print(f"[TelegramClient] Acquired login lock for {phone}", file=sys.stderr)
            except asyncio.TimeoutError:
                print(f"[TelegramClient] Timeout waiting for login lock for {phone}", file=sys.stderr)
                return {
                    "success": False,
                    "status": "error",
                    "message": "登錄請求排隊超時，請稍後重試"
                }
            
            # ============================================================
            # CRITICAL FIX: If user submitted phone_code and phone_code_hash,
            # we MUST use the SAME client that sent the verification code.
            # Creating a new client will invalidate the phone_code_hash!
            # ============================================================
            if phone_code and phone_code_hash:
                print(f"[TelegramClient] User submitted verification code for {phone}", file=sys.stderr)
                print(f"[TelegramClient] Checking for existing client in login_callbacks...", file=sys.stderr)
                
                # Check if we have the original client that sent the code
                if phone in self.login_callbacks:
                    callback_data = self.login_callbacks[phone]
                    callback_client = callback_data.get("client")
                    callback_hash = callback_data.get("phone_code_hash")
                    
                    print(f"[TelegramClient] Found login_callback: hash={callback_hash[:8] if callback_hash else 'None'}..., client={'exists' if callback_client else 'None'}", file=sys.stderr)
                    
                    # Verify the hash matches
                    if callback_hash and callback_hash == phone_code_hash and callback_client:
                        print(f"[TelegramClient] Hash matches! Using original client for sign_in...", file=sys.stderr)
                        
                        try:
                            # Ensure the original client is connected
                            if not callback_client.is_connected:
                                print(f"[TelegramClient] Original client disconnected, reconnecting...", file=sys.stderr)
                                await callback_client.connect()
                            
                            # Try to sign in with the original client
                            print(f"[TelegramClient] Calling sign_in with original client...", file=sys.stderr)
                            signed_in = await callback_client.sign_in(phone, phone_code_hash, phone_code)
                            
                            # Success!
                            print(f"[TelegramClient] sign_in succeeded! User: {signed_in.first_name if hasattr(signed_in, 'first_name') else 'Unknown'}", file=sys.stderr)
                            self.clients[phone] = callback_client
                            self.client_status[phone] = "Online"
                            self.login_callbacks.pop(phone, None)
                            
                            # 提取用戶信息
                            user_info = {}
                            if signed_in:
                                user_info = {
                                    'id': getattr(signed_in, 'id', None),
                                    'first_name': getattr(signed_in, 'first_name', ''),
                                    'last_name': getattr(signed_in, 'last_name', ''),
                                    'username': getattr(signed_in, 'username', ''),
                                    'phone': getattr(signed_in, 'phone_number', phone)
                                }
                            
                            return {
                                "success": True,
                                "status": "Online",
                                "message": f"Successfully logged in to {phone}",
                                "user_info": user_info
                            }
                            
                        except SessionPasswordNeeded:
                            # 2FA required
                            print(f"[TelegramClient] Account {phone} requires 2FA password", file=sys.stderr)
                            if not two_factor_password:
                                return {
                                    "success": True,
                                    "status": "waiting_2fa",
                                    "message": "2FA password required",
                                    "requires_2fa": True
                                }
                            try:
                                # 🆕 添加 30 秒超時保護
                                signed_in_2fa = await asyncio.wait_for(
                                    callback_client.check_password(two_factor_password),
                                    timeout=30.0
                                )
                                self.clients[phone] = callback_client
                                self.client_status[phone] = "Online"
                                self.login_callbacks.pop(phone, None)
                                
                                # 提取用戶信息
                                user_info_2fa = {}
                                if signed_in_2fa:
                                    user_info_2fa = {
                                        'id': getattr(signed_in_2fa, 'id', None),
                                        'first_name': getattr(signed_in_2fa, 'first_name', ''),
                                        'last_name': getattr(signed_in_2fa, 'last_name', ''),
                                        'username': getattr(signed_in_2fa, 'username', ''),
                                        'phone': getattr(signed_in_2fa, 'phone_number', phone)
                                    }
                                
                                return {
                                    "success": True,
                                    "status": "Online",
                                    "message": f"Successfully logged in to {phone} with 2FA",
                                    "user_info": user_info_2fa
                                }
                            except asyncio.TimeoutError:
                                print(f"[TelegramClient] 2FA verification timeout for {phone} (30s)", file=sys.stderr)
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": "2FA verification timeout. Please check network and try again."
                                }
                            except PasswordHashInvalid:
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": "Invalid 2FA password"
                                }
                            except Exception as e:
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": f"2FA authentication error: {str(e)}"
                                }
                                
                        except PhoneCodeExpired:
                            print(f"[TelegramClient] ERROR: Verification code expired.", file=sys.stderr)
                            self.login_callbacks.pop(phone, None)
                            return {
                                "success": False,
                                "status": "error",
                                "message": "Verification code expired. Please request a new code.",
                                "code_expired": True
                            }
                            
                        except PhoneCodeInvalid:
                            print(f"[TelegramClient] ERROR: Invalid verification code.", file=sys.stderr)
                            return {
                                "success": False,
                                "status": "error",
                                "message": "Invalid verification code. Please check and try again."
                            }
                            
                        except BadRequest as e:
                            error_msg = str(e)
                            print(f"[TelegramClient] BadRequest during sign_in: {error_msg}", file=sys.stderr)
                            if "PHONE_CODE_EXPIRED" in error_msg.upper() or "expired" in error_msg.lower():
                                self.login_callbacks.pop(phone, None)
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": "Verification code expired. Please request a new code.",
                                    "code_expired": True
                                }
                            elif "PHONE_CODE_INVALID" in error_msg.upper() or "invalid" in error_msg.lower():
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": "Invalid verification code. Please check and try again."
                                }
                            else:
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": f"Login error: {error_msg}"
                                }
                                
                        except Exception as e:
                            print(f"[TelegramClient] Error during sign_in with original client: {e}", file=sys.stderr)
                            import traceback
                            traceback.print_exc(file=sys.stderr)
                            return {
                                "success": False,
                                "status": "error",
                                "message": f"Login error: {str(e)}"
                            }
                    else:
                        # Hash mismatch or no client - need new code
                        print(f"[TelegramClient] Hash mismatch or no client. Expected: {callback_hash[:8] if callback_hash else 'None'}..., got: {phone_code_hash[:8]}...", file=sys.stderr)
                        self.login_callbacks.pop(phone, None)
                        return {
                            "success": False,
                            "status": "error",
                            "message": "Verification session expired. Please request a new code.",
                            "code_expired": True
                        }
                else:
                    # No login callback found - the client that sent the code is gone
                    print(f"[TelegramClient] No login_callback found for {phone}. Client lost.", file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": "Verification session lost. Please request a new code.",
                        "code_expired": True
                    }
            
            # ============================================================
            # Normal login flow (no verification code submitted yet)
            # ============================================================
            
            # Use account's API credentials or fallback to config
            api_id_int = int(api_id) if api_id else (int(config.TELEGRAM_API_ID) if config.TELEGRAM_API_ID else None)
            api_hash_str = api_hash or config.TELEGRAM_API_HASH
            
            if not api_id_int or not api_hash_str:
                return {
                    "success": False,
                    "status": "error",
                    "message": "API ID and API Hash are required"
                }
            
            # 🔒 使用沙盒隔離的目錄結構
            # 確保賬號的所有目錄都存在（session、cache、temp、media）
            account_dirs = config.ensure_account_dirs(phone)
            session_path = config.get_session_path(phone)
            account_workdir = str(account_dirs['base'])  # 使用賬號專屬目錄作為工作目錄
            
            print(f"[TelegramClient] 🔒 沙盒隔離: {phone}", file=sys.stderr)
            print(f"[TelegramClient]   Session: {session_path}", file=sys.stderr)
            print(f"[TelegramClient]   Workdir: {account_workdir}", file=sys.stderr)
            
            # 🆕 自動代理分配：如果沒有指定代理，嘗試從代理池自動分配
            effective_proxy = proxy
            if not proxy or proxy == 'auto':
                try:
                    from admin.proxy_pool import get_proxy_pool
                    pool = get_proxy_pool()
                    
                    # 先檢查帳號是否已有綁定的代理
                    existing_proxy = pool.get_proxy_for_account(phone=phone)
                    if existing_proxy:
                        effective_proxy = existing_proxy.to_url()
                        print(f"[TelegramClient] Using existing proxy for {phone}: {existing_proxy.host}:{existing_proxy.port}", file=sys.stderr)
                    elif proxy == 'auto':
                        # 自動分配新代理
                        assigned = pool.assign_proxy_to_account(account_id='', phone=phone)
                        if assigned:
                            effective_proxy = assigned.to_url()
                            print(f"[TelegramClient] Auto-assigned proxy for {phone}: {assigned.host}:{assigned.port}", file=sys.stderr)
                        else:
                            # 🆕 Phase 2: 靜態池耗盡，嘗試從供應商獲取動態代理
                            print(f"[TelegramClient] Static pool exhausted for {phone}, trying dynamic proxy...", file=sys.stderr)
                            try:
                                from admin.proxy_sync import get_sync_service
                                sync_svc = get_sync_service()
                                dynamic = await sync_svc.request_dynamic_proxy(country='')
                                if dynamic:
                                    auth = ""
                                    if dynamic.get("username") and dynamic.get("password"):
                                        auth = f"{dynamic['username']}:{dynamic['password']}@"
                                    effective_proxy = f"{dynamic.get('proxy_type', 'socks5')}://{auth}{dynamic['host']}:{dynamic['port']}"
                                    print(f"[TelegramClient] Dynamic proxy obtained for {phone}: {dynamic['host']}:{dynamic['port']} (provider: {dynamic.get('provider_name', 'unknown')})", file=sys.stderr)
                                else:
                                    print(f"[TelegramClient] No dynamic proxy available for {phone}", file=sys.stderr)
                                    effective_proxy = None
                            except ImportError:
                                print(f"[TelegramClient] Proxy sync module not available for dynamic fallback", file=sys.stderr)
                                effective_proxy = None
                            except Exception as de:
                                print(f"[TelegramClient] Dynamic proxy fallback error: {de}", file=sys.stderr)
                                effective_proxy = None
                except ImportError:
                    print(f"[TelegramClient] Proxy pool module not available", file=sys.stderr)
                except Exception as e:
                    print(f"[TelegramClient] Proxy pool error: {e}", file=sys.stderr)
            
            # 🔒 強制代理檢查：如果配置要求代理但沒有代理，則拒絕啟動
            if SandboxConfig.REQUIRE_PROXY and not effective_proxy:
                error_msg = f"代理連接失敗：賬號 {phone} 需要代理但未能分配。請配置代理後再試。"
                print(f"[TelegramClient] ❌ {error_msg}", file=sys.stderr)
                return {
                    "success": False,
                    "status": "error",
                    "message": error_msg,
                    "error_code": "PROXY_REQUIRED"
                }
            
            # Parse proxy
            proxy_dict = self._parse_proxy(effective_proxy)
            
            # Generate device fingerprint if not provided (防封)
            if not device_model or not system_version or not app_version:
                device_config = DeviceFingerprintGenerator.generate_for_phone(phone, prefer_platform=platform)
                device_model = device_model or device_config.get('device_model')
                system_version = system_version or device_config.get('system_version')
                app_version = app_version or device_config.get('app_version')
                lang_code = lang_code or device_config.get('lang_code')
                platform = platform or device_config.get('platform')
            
            print(f"[TelegramClient] Using device fingerprint for {phone}: {device_model} ({platform}), {system_version}, Telegram {app_version}, lang={lang_code}", file=sys.stderr)
            
            # Check if we already have a client waiting for code (don't create new one)
            if phone in self.login_callbacks and self.login_callbacks[phone].get("client"):
                existing_client = self.login_callbacks[phone]["client"]
                existing_hash = self.login_callbacks[phone].get("phone_code_hash")
                print(f"[TelegramClient] Found existing client waiting for code, hash: {existing_hash[:8] if existing_hash else 'None'}...", file=sys.stderr)
                
                # Return existing hash to avoid re-sending code
                if existing_hash:
                    return {
                        "success": True,
                        "status": "waiting_code",
                        "message": f"Verification code already sent to {phone}",
                        "requires_code": True,
                        "phone_code_hash": existing_hash,
                        "send_type": self.login_callbacks[phone].get("send_type", "app"),
                        "canRetrySMS": False
                    }
            
            # 確保關閉任何現有的客戶端連接，避免資料庫鎖定
            if phone in self.clients:
                existing_client = self.clients[phone]
                try:
                    if existing_client.is_connected:
                        print(f"[TelegramClient] Closing existing connected client for {phone} before creating new one", file=sys.stderr)
                        await existing_client.disconnect()
                    if hasattr(existing_client, 'stop'):
                        try:
                            await existing_client.stop()
                        except:
                            pass
                    # 等待一下確保連接完全關閉
                    await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"[TelegramClient] Error closing existing client for {phone}: {e}", file=sys.stderr)
                finally:
                    # 從字典中移除，避免重複使用
                    del self.clients[phone]
            
            # 🔒 Create client with device fingerprint and isolated workdir (防封)
            # 使用賬號專屬目錄作為工作目錄，確保完全隔離
            client = Client(
                name=str(session_path.with_suffix('')),
                api_id=api_id_int,
                api_hash=api_hash_str,
                proxy=proxy_dict,
                workdir=account_workdir,  # 🔒 使用隔離的賬號目錄
                device_model=device_model,
                system_version=system_version,
                app_version=app_version,
                lang_code=lang_code or 'en'
            )
            
            # Check if already logged in
            if client.is_connected:
                await client.disconnect()
            
            # Connect client with retry mechanism for database lock issues
            # Use connect() here for login flow - start() would enter interactive mode
            # start() will be called after successful authorization or when starting monitoring
            max_connect_retries = 3
            last_connect_error = None
            for connect_attempt in range(max_connect_retries):
                try:
                    # Use connect() for login flow - this just establishes connection
                    await client.connect()
                    print(f"[TelegramClient] Client connected successfully (attempt {connect_attempt + 1})", file=sys.stderr)
                    break
                except Exception as conn_e:
                    last_connect_error = conn_e
                    error_str = str(conn_e).lower()
                    error_str_original = str(conn_e)
                    
                    # 處理時間同步錯誤 - BadMsgNotification [16]
                    if "msg_id is too low" in error_str or "[16]" in error_str_original or "badmsgnotification" in error_str:
                        print(f"[TelegramClient] Time sync error detected (attempt {connect_attempt + 1}/{max_connect_retries})", file=sys.stderr)
                        print(f"[TelegramClient] Waiting for time synchronization...", file=sys.stderr)
                        
                        # 斷開連接，等待更長時間讓系統時間穩定
                        try:
                            if client.is_connected:
                                await client.disconnect()
                        except:
                            pass
                        
                        # 等待 3-5 秒讓時間同步
                        wait_time = 3.0 + (connect_attempt * 2.0)
                        print(f"[TelegramClient] Waiting {wait_time}s before retry...", file=sys.stderr)
                        await asyncio.sleep(wait_time)
                        
                        if connect_attempt == max_connect_retries - 1:
                            print(f"[TelegramClient] Time sync error persists after {max_connect_retries} attempts", file=sys.stderr)
                            return {
                                "success": False,
                                "status": "error",
                                "message": "時間同步失敗，請檢查系統時間是否正確。建議：1) 啟用自動時間同步 2) 重啟程序後再試"
                            }
                        continue
                    
                    elif "database is locked" in error_str or "locked" in error_str:
                        print(f"[TelegramClient] Database locked on connect (attempt {connect_attempt + 1}/{max_connect_retries}), retrying...", file=sys.stderr)
                        gc.collect()
                        # 增加等待時間，並嘗試關閉可能殘留的連接
                        wait_time = 2.0 * (connect_attempt + 1)  # 更長的等待時間
                        await asyncio.sleep(wait_time)
                        # 在重試前再次確保客戶端未連接
                        if client.is_connected:
                            try:
                                await client.disconnect()
                                await asyncio.sleep(0.5)
                            except:
                                pass
                        if connect_attempt == max_connect_retries - 1:
                            raise
                    else:
                        raise
            
            # Check if already authorized by trying to get user info
            is_authorized = False
            try:
                me = await client.get_me()
                is_authorized = True
                print(f"[TelegramClient] Account {phone} authorization check: is_authorized=True, user: {me.first_name or 'Unknown'}", file=sys.stderr)
            except Exception as e:
                print(f"[TelegramClient] Account {phone} authorization check: is_authorized=False ({str(e)})", file=sys.stderr)
            
            if is_authorized:
                # Session is valid, user is already authorized
                self.clients[phone] = client
                self.client_status[phone] = "Online"
                
                # 提取用戶信息
                user_info_auth = {}
                if me:
                    user_info_auth = {
                        'id': getattr(me, 'id', None),
                        'first_name': getattr(me, 'first_name', ''),
                        'last_name': getattr(me, 'last_name', ''),
                        'username': getattr(me, 'username', ''),
                        'phone': getattr(me, 'phone_number', phone)
                    }
                
                return {
                    "success": True,
                    "status": "Online",
                    "message": f"Account {phone} is already authorized",
                    "user_info": user_info_auth
                }
            else:
                # Session file exists but is invalid, need to re-login
                print(f"[TelegramClient] Session file exists but invalid, will re-login", file=sys.stderr)
                
                # Delete invalid session and send new code
                # First disconnect the current client
                try:
                    if client.is_connected:
                        await client.disconnect()
                    if hasattr(client, 'stop'):
                        try:
                            await client.stop()
                        except Exception:
                            pass
                    del client
                    gc.collect()
                    await asyncio.sleep(0.3)
                except Exception as e:
                    print(f"[TelegramClient] Error disconnecting client: {e}", file=sys.stderr)
                
                # Try to delete session file
                if session_path.exists():
                    for attempt in range(3):
                        try:
                            session_path.unlink()
                            print(f"[TelegramClient] Deleted invalid session file: {session_path}", file=sys.stderr)
                            break
                        except PermissionError:
                            gc.collect()
                            await asyncio.sleep(0.5)
                        except Exception as e:
                            print(f"[TelegramClient] Error deleting session: {e}", file=sys.stderr)
                            break
                
                # Create fresh client and send code
                print(f"[TelegramClient] Creating fresh client for {phone} after session invalidation...", file=sys.stderr)
                try:
                    client = Client(
                        name=str(session_path.with_suffix('')),
                        api_id=api_id_int,
                        api_hash=api_hash_str,
                        proxy=proxy_dict,
                        workdir=account_workdir,  # 🔒 使用隔離的賬號目錄
                        device_model=device_model,
                        system_version=system_version,
                        app_version=app_version,
                        lang_code=lang_code or 'en'
                    )
                    print(f"[TelegramClient] Fresh client created for {phone}, connecting...", file=sys.stderr)
                except Exception as create_e:
                    print(f"[TelegramClient] ERROR creating fresh client for {phone}: {create_e}", file=sys.stderr)
                    import traceback
                    traceback.print_exc(file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"創建客戶端失敗: {str(create_e)}"
                    }
                
                # Connect with retry mechanism for database lock issues (with timeout)
                for connect_attempt in range(3):
                    try:
                        print(f"[TelegramClient] Connecting fresh client for {phone} (attempt {connect_attempt + 1}/3)...", file=sys.stderr)
                        # Add timeout to prevent hanging on connect
                        await asyncio.wait_for(client.connect(), timeout=30.0)
                        print(f"[TelegramClient] Fresh client connected successfully for {phone}", file=sys.stderr)
                        break
                    except asyncio.TimeoutError:
                        print(f"[TelegramClient] Connection timeout for {phone} (attempt {connect_attempt + 1}/3)", file=sys.stderr)
                        if connect_attempt == 2:
                            return {
                                "success": False,
                                "status": "error",
                                "message": f"連接超時，請檢查網絡連接後重試"
                            }
                        gc.collect()
                        await asyncio.sleep(2.0)
                    except Exception as conn_e:
                        error_str = str(conn_e).lower()
                        error_str_original = str(conn_e)
                        print(f"[TelegramClient] Connection error for {phone} (attempt {connect_attempt + 1}/3): {conn_e}", file=sys.stderr)
                        
                        # 處理時間同步錯誤 - BadMsgNotification [16]
                        if "msg_id is too low" in error_str or "[16]" in error_str_original or "badmsgnotification" in error_str:
                            print(f"[TelegramClient] Time sync error detected for fresh client (attempt {connect_attempt + 1}/3)", file=sys.stderr)
                            try:
                                if client.is_connected:
                                    await client.disconnect()
                            except:
                                pass
                            wait_time = 3.0 + (connect_attempt * 2.0)
                            print(f"[TelegramClient] Waiting {wait_time}s for time sync...", file=sys.stderr)
                            await asyncio.sleep(wait_time)
                            if connect_attempt == 2:
                                return {
                                    "success": False,
                                    "status": "error",
                                    "message": "時間同步失敗，請檢查系統時間是否正確。建議：1) 啟用自動時間同步 2) 重啟程序後再試"
                                }
                            continue
                        
                        elif "database is locked" in error_str or "locked" in error_str:
                            print(f"[TelegramClient] Database locked on connect (attempt {connect_attempt + 1}/3), retrying...", file=sys.stderr)
                            gc.collect()
                            # 增加等待時間
                            wait_time = 2.0 * (connect_attempt + 1)
                            await asyncio.sleep(wait_time)
                            # 在重試前確保客戶端未連接
                            if client.is_connected:
                                try:
                                    await client.disconnect()
                                    await asyncio.sleep(0.5)
                                except:
                                    pass
                            if connect_attempt == 2:
                                print(f"[TelegramClient] All connection attempts failed for {phone}, raising error", file=sys.stderr)
                                raise
                        else:
                            print(f"[TelegramClient] Non-recoverable connection error for {phone}: {conn_e}", file=sys.stderr)
                            raise
                
                # Send verification code (with timeout protection)
                print(f"[TelegramClient] Sending verification code to {phone}...", file=sys.stderr)
                try:
                    # Add timeout to prevent hanging
                    sent_code = await asyncio.wait_for(client.send_code(phone), timeout=60.0)
                    
                    # Determine send type
                    send_type_obj = getattr(sent_code, 'type', None)
                    send_type = 'unknown'
                    if send_type_obj:
                        send_type_str = str(send_type_obj)
                        if 'APP' in send_type_str.upper():
                            send_type = 'app'
                        elif 'SMS' in send_type_str.upper():
                            send_type = 'sms'
                        elif 'CALL' in send_type_str.upper():
                            send_type = 'call'
                    
                    print(f"[TelegramClient] Verification code sent successfully, hash: {sent_code.phone_code_hash[:8]}..., type: {send_type}", file=sys.stderr)
                    
                    # CRITICAL: Save the client that sent the code!
                    self.login_callbacks[phone] = {
                        "phone_code_hash": sent_code.phone_code_hash,
                        "client": client,  # Save the client!
                        "send_type": send_type,
                        "first_send_time": time.time()
                    }
                    
                    # Set message based on send type
                    if send_type == 'app':
                        message = f"验证码已发送到您的 Telegram 应用。请检查您手机上已登录的 Telegram 应用，查看验证码消息。"
                    elif send_type == 'sms':
                        message = f"验证码已发送到 {phone} 的短信"
                    elif send_type == 'call':
                        message = f"验证码将通过电话呼叫发送到 {phone}"
                    else:
                        message = f"验证码已发送到 {phone}"
                    
                    return {
                        "success": True,
                        "status": "waiting_code",
                        "message": message,
                        "requires_code": True,
                        "phone_code_hash": sent_code.phone_code_hash,
                        "send_type": send_type,
                        "canRetrySMS": False
                    }
                    
                except asyncio.TimeoutError:
                    print(f"[TelegramClient] Timeout sending verification code to {phone} (60s)", file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"发送验证码超时，请检查网络连接后重试"
                    }
                    
                except FloodWait as e:
                    wait_time = e.value
                    print(f"[TelegramClient] FloodWait error: {wait_time} seconds", file=sys.stderr)
                    self.login_callbacks[phone] = {
                        "flood_wait_until": time.time() + wait_time,
                        "client": client
                    }
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"请求过于频繁，请等待 {wait_time} 秒后重试",
                        "flood_wait": wait_time
                    }
                    
                except PhoneNumberInvalid:
                    print(f"[TelegramClient] PhoneNumberInvalid error for {phone}", file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"电话号码无效: {phone}"
                    }
                    
                except Exception as e:
                    print(f"[TelegramClient] Error sending code to {phone}: {e}", file=sys.stderr)
                    import traceback
                    traceback.print_exc(file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": f"发送验证码失败: {str(e)}"
                    }
            
            # This code should not be reached anymore, but keep as fallback
            # Need to login
            if not phone_code:
                # Check if we already have a pending login callback (to avoid duplicate code sending)
                if phone in self.login_callbacks:
                    existing_hash = self.login_callbacks[phone].get("phone_code_hash")
                    flood_wait_until = self.login_callbacks[phone].get("flood_wait_until")
                    previous_send_type = self.login_callbacks[phone].get("send_type")
                    first_send_time = self.login_callbacks[phone].get("first_send_time")
                    
                    # Check if we're still in FloodWait period
                    if flood_wait_until:
                        current_time = time.time()
                        if current_time < flood_wait_until:
                            wait_seconds = int(flood_wait_until - current_time)
                            error_msg = f"请求过于频繁，请等待 {wait_seconds} 秒后重试"
                            print(f"[TelegramClient] Still in FloodWait period, {wait_seconds} seconds remaining", file=sys.stderr)
                            return {
                                "success": False,
                                "status": "error",
                                "message": error_msg,
                                "flood_wait": wait_seconds
                            }
                        else:
                            # FloodWait period expired, clear it
                            self.login_callbacks[phone].pop("flood_wait_until", None)
                            print(f"[TelegramClient] FloodWait period expired, can retry", file=sys.stderr)
                    
                    # If previous send was to app, just return existing hash (no SMS retry)
                    if previous_send_type == 'app' and existing_hash:
                        print(f"[TelegramClient] Verification code already sent to Telegram APP for {phone}, returning existing hash", file=sys.stderr)
                        # Update client in callback in case it was recreated
                        self.login_callbacks[phone]["client"] = client
                        return {
                            "success": True,
                            "status": "waiting_code",
                            "message": f"验证码已发送到您的 Telegram 应用。请检查您手机上已登录的 Telegram 应用，查看验证码消息。",
                            "requires_code": True,
                            "phone_code_hash": existing_hash,
                            "send_type": previous_send_type,
                            "canRetrySMS": False  # No SMS retry, only use APP
                        }
                    elif existing_hash:
                        print(f"[TelegramClient] Verification code already sent for {phone}, returning existing hash", file=sys.stderr)
                        # Update client in callback in case it was recreated
                        self.login_callbacks[phone]["client"] = client
                        return {
                            "success": True,
                            "status": "waiting_code",
                            "message": f"Verification code already sent to {phone}",
                            "requires_code": True,
                            "phone_code_hash": existing_hash,
                            "send_type": previous_send_type
                        }
                
                # Also check if phone_code_hash was provided (user might have it from previous attempt)
                if phone_code_hash:
                    print(f"[TelegramClient] Using provided phone_code_hash: {phone_code_hash[:8]}...", file=sys.stderr)
                    self.login_callbacks[phone] = {
                        "phone_code_hash": phone_code_hash,
                        "client": client
                    }
                    return {
                        "success": True,
                        "status": "waiting_code",
                        "message": f"Using existing verification code hash for {phone}",
                        "requires_code": True,
                        "phone_code_hash": phone_code_hash
                    }
                
                print(f"[TelegramClient] Sending verification code to {phone}...", file=sys.stderr)
                # Send code with error handling
                try:
                    sent_code = await client.send_code(phone)
                    
                    # Check send type (app or sms)
                    # sent_code.type is a SentCodeType object, need to convert to string
                    send_type_obj = getattr(sent_code, 'type', None)
                    if send_type_obj:
                        # Convert SentCodeType to string (e.g., "SentCodeType.APP" -> "app")
                        send_type_str = str(send_type_obj)
                        if 'APP' in send_type_str.upper():
                            send_type = 'app'
                        elif 'SMS' in send_type_str.upper():
                            send_type = 'sms'
                        elif 'CALL' in send_type_str.upper():
                            send_type = 'call'
                        else:
                            send_type = 'unknown'
                    else:
                        send_type = 'unknown'
                    
                    next_type_obj = getattr(sent_code, 'next_type', None)
                    next_type = str(next_type_obj) if next_type_obj else None
                    
                    print(f"[TelegramClient] Verification code sent successfully, phone_code_hash: {sent_code.phone_code_hash[:8]}...", file=sys.stderr)
                    print(f"[TelegramClient] Code send type: {send_type} (original: {send_type_obj}), next_type: {next_type}", file=sys.stderr)
                    
                    # Set message based on send type
                    if send_type == 'app':
                        # Only use Telegram APP verification code (no SMS retry)
                        message = f"验证码已发送到您的 Telegram 应用。请检查您手机上已登录的 Telegram 应用，查看验证码消息。"
                        print(f"[TelegramClient] Code sent to Telegram APP (not SMS)! Next type: {next_type}", file=sys.stderr)
                        print(f"[TelegramClient] User message: {message}", file=sys.stderr)
                    elif send_type == 'sms':
                        message = f"验证码已发送到 {phone} 的短信，请查看手机短信"
                        print(f"[TelegramClient] Code sent via SMS", file=sys.stderr)
                    elif send_type == 'call':
                        message = f"验证码将通过电话呼叫发送到 {phone}，请接听电话"
                        print(f"[TelegramClient] Code sent via phone call", file=sys.stderr)
                    else:
                        message = f"验证码已发送到 {phone}"
                        print(f"[TelegramClient] Code sent (type: {send_type})", file=sys.stderr)
                    
                    # Store first send time for retry logic
                    first_send_time = time.time()
                    if phone in self.login_callbacks and "first_send_time" not in self.login_callbacks[phone]:
                        # Only set first_send_time on first send
                        first_send_time = time.time()
                    
                    self.login_callbacks[phone] = {
                        "phone_code_hash": sent_code.phone_code_hash,
                        "client": client,
                        "send_type": send_type,  # Now it's a string, not an object
                        "first_send_time": first_send_time if phone not in self.login_callbacks or "first_send_time" not in self.login_callbacks[phone] else self.login_callbacks[phone].get("first_send_time", first_send_time)
                    }
                    
                    # Only use Telegram APP verification code (no SMS retry)
                    # Set canRetrySMS to False to indicate we only use APP codes
                    can_retry_sms = False
                    
                    return {
                        "success": True,
                        "status": "waiting_code",
                        "message": message,
                        "requires_code": True,
                        "phone_code_hash": sent_code.phone_code_hash,
                        "send_type": send_type,  # Now it's a string, JSON serializable
                        "next_type": next_type,  # Include next_type for reference
                        "canRetrySMS": can_retry_sms  # Always False - only use APP codes
                    }
                    
                except FloodWait as e:
                    wait_time = e.value
                    error_msg = f"请求过于频繁，请等待 {wait_time} 秒后重试"
                    print(f"[TelegramClient] FloodWait error: {error_msg}", file=sys.stderr)
                    
                    # Store FloodWait end time in login_callbacks to prevent retry
                    if phone not in self.login_callbacks:
                        self.login_callbacks[phone] = {}
                    self.login_callbacks[phone]["flood_wait_until"] = time.time() + wait_time
                    self.login_callbacks[phone]["client"] = client
                    
                    return {
                        "success": False,
                        "status": "error",
                        "message": error_msg,
                        "flood_wait": wait_time
                    }
                    
                except PhoneNumberInvalid:
                    error_msg = f"电话号码无效: {phone}"
                    print(f"[TelegramClient] PhoneNumberInvalid error: {error_msg}", file=sys.stderr)
                    return {
                        "success": False,
                        "status": "error",
                        "message": error_msg
                    }
                    
                except Exception as e:
                    error_msg = f"发送验证码失败: {str(e)}"
                    print(f"[TelegramClient] Error sending code: {error_msg}", file=sys.stderr)
                    import traceback
                    traceback.print_exc()
                    return {
                        "success": False,
                        "status": "error",
                        "message": error_msg
                    }
            
            # If we reach here without returning, something unexpected happened
            return {
                "success": False,
                "status": "error",
                "message": "Unexpected state in login flow"
            }
            
        except PhoneNumberInvalid:
            print(f"[TelegramClient] PhoneNumberInvalid error for {phone}", file=sys.stderr)
            return {
                "success": False,
                "status": "error",
                "message": "Invalid phone number"
            }
        except FloodWait as e:
            wait_time = e.value
            print(f"[TelegramClient] FloodWait error: {wait_time} seconds", file=sys.stderr)
            return {
                "success": False,
                "status": "error",
                "message": f"Flood wait: Please wait {wait_time} seconds",
                "flood_wait": wait_time
            }
        except ProxyConnectionError as e:
            print(f"[TelegramClient] ProxyConnectionError: {e}", file=sys.stderr)
            return {
                "success": False,
                "status": "Proxy Error",
                "message": "Failed to connect through proxy"
            }
        except PyrogramConnectionError as e:
            print(f"[TelegramClient] PyrogramConnectionError: {e}", file=sys.stderr)
            return {
                "success": False,
                "status": "Connection Error",
                "message": "Failed to connect to Telegram servers"
            }
        except Exception as e:
            # Catch any other unexpected exceptions
            print(f"[TelegramClient] Unexpected error in login_account: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            # 提供更友好的錯誤消息
            error_str = str(e).lower()
            error_str_original = str(e)
            
            if "msg_id is too low" in error_str or "[16]" in error_str_original or "badmsgnotification" in error_str:
                friendly_message = "時間同步失敗，請檢查系統時間是否正確。建議：1) 啟用自動時間同步 2) 重啟程序後再試"
            elif "flood" in error_str:
                friendly_message = "請求過於頻繁，請稍後再試"
            elif "phone_number_invalid" in error_str:
                friendly_message = "手機號碼格式不正確，請使用國際格式（如 +8613800138000）"
            elif "auth" in error_str and "key" in error_str:
                friendly_message = "認證密鑰錯誤，請刪除 session 文件後重新登入"
            elif "network" in error_str or "connection" in error_str or "timeout" in error_str:
                friendly_message = "網絡連接失敗，請檢查網絡後重試"
            elif "database is locked" in error_str or "locked" in error_str:
                friendly_message = "數據庫暫時鎖定，請稍後重試"
            else:
                friendly_message = f"登入錯誤: {str(e)}"
            
            return {
                "success": False,
                "status": "error",
                "message": friendly_message
            }
        finally:
            # 🔧 確保釋放登錄鎖
            if acquired:
                login_semaphore.release()
                print(f"[TelegramClient] Released login lock for {phone}", file=sys.stderr)
    
    async def check_account_status(self, phone: str) -> Dict[str, Any]:
        """
        Check the status of an account
        
        Returns:
            Dict with 'status', 'online', 'message'
        """
        try:
            if phone not in self.clients:
                # Try to connect if session exists
                session_path = config.get_session_path(phone)
                if not session_path.exists():
                    return {
                        "status": "Offline",
                        "online": False,
                        "message": "No session file found"
                    }
                
                # Try to create client and check
                # This would require API credentials, which we might not have here
                return {
                    "status": "Offline",
                    "online": False,
                    "message": "Client not connected"
                }
            
            client = self.clients[phone]
            
            if not client.is_connected:
                await client.connect()
            
            # Check if authorized by trying to get user info
            try:
                me = await client.get_me()
                # If we can get user info, we're authorized
            except Exception:
                # Not authorized or session invalid
                self.client_status[phone] = "Offline"
                return {
                    "status": "Offline",
                    "online": False,
                    "message": "Not authorized"
                }
            
            # Get me to verify connection
            try:
                me = await client.get_me()
                self.client_status[phone] = "Online"
                return {
                    "status": "Online",
                    "online": True,
                    "message": f"Account is online: @{me.username or me.first_name}",
                    "user": {
                        "id": me.id,
                        "username": me.username,
                        "first_name": me.first_name,
                        "last_name": me.last_name
                    }
                }
            except (AuthKeyUnregistered, UserDeactivated, UserBanned):
                self.client_status[phone] = "Banned"
                return {
                    "status": "Banned",
                    "online": False,
                    "message": "Account is banned or deactivated"
                }
        
        except ProxyConnectionError:
            self.client_status[phone] = "Proxy Error"
            return {
                "status": "Proxy Error",
                "online": False,
                "message": "Proxy connection error"
            }
        except Exception as e:
            return {
                "status": "Error",
                "online": False,
                "message": f"Error checking status: {str(e)}"
            }
    
    async def get_full_user_profile(self, phone: str, download_avatar: bool = True, skip_bio: bool = False) -> Dict[str, Any]:
        """
        獲取完整的用戶資料，包括頭像下載
        
        Args:
            phone: 帳號電話號碼
            download_avatar: 是否下載頭像
            skip_bio: 🔧 P1: 是否跳過 bio 獲取（避免 FloodWait）
            
        Returns:
            Dict with user profile info including avatar path
        """
        import sys
        from pathlib import Path
        
        try:
            client = self.clients.get(phone)
            if not client or not client.is_connected:
                return {"success": False, "error": "客户端未连接"}
            
            me = await client.get_me()
            if not me:
                return {"success": False, "error": "无法获取用户信息"}
            
            # 基本信息
            profile = {
                "success": True,
                "id": me.id,
                "firstName": me.first_name or "",
                "lastName": me.last_name or "",
                "username": me.username or "",
                "phone": me.phone_number or phone,
                "bio": "",
                "avatarPath": None,
            }
            
            # 🔧 P1: 嘗試獲取 bio（可選，避免 FloodWait）
            if not skip_bio:
                try:
                    full_user = await client.invoke(
                        pyrogram.raw.functions.users.GetFullUser(
                            id=pyrogram.raw.types.InputUserSelf()
                        )
                    )
                    if full_user and hasattr(full_user, 'full_user'):
                        profile["bio"] = getattr(full_user.full_user, 'about', '') or ""
                except Exception as bio_err:
                    print(f"[TelegramClient] Could not get bio for {phone}: {bio_err}", file=sys.stderr)
            else:
                print(f"[TelegramClient] Skipping bio for {phone} (skip_bio=True)", file=sys.stderr)
            
            # 下載頭像
            if download_avatar and me.photo:
                try:
                    # 🆕 使用持久化數據目錄
                    from config import DATABASE_DIR
                    avatar_dir = DATABASE_DIR / "avatars"
                    avatar_dir.mkdir(parents=True, exist_ok=True)
                    
                    # 下載頭像
                    safe_phone = phone.replace('+', '').replace(' ', '')
                    avatar_path = avatar_dir / f"{safe_phone}.jpg"
                    
                    # 使用 Pyrogram 下載頭像
                    downloaded_path = await client.download_media(
                        me.photo.big_file_id,
                        file_name=str(avatar_path)
                    )
                    
                    if downloaded_path:
                        profile["avatarPath"] = str(avatar_path)
                        print(f"[TelegramClient] Avatar downloaded for {phone}: {avatar_path}", file=sys.stderr)
                except Exception as avatar_err:
                    print(f"[TelegramClient] Could not download avatar for {phone}: {avatar_err}", file=sys.stderr)
            
            return profile
            
        except Exception as e:
            import traceback
            print(f"[TelegramClient] Error getting full profile for {phone}: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return {"success": False, "error": str(e)}

    async def get_user_online_status(self, phone: str, user_id: str) -> str:
        """
        Get user's online status
        
        Returns:
            'Online', 'Offline', 'Recently', or 'Unknown'
        """
        try:
            if phone not in self.clients:
                return 'Unknown'
            
            client = self.clients[phone]
            
            if not client.is_connected:
                await client.connect()
            
            # Try to get user status
            try:
                from pyrogram.types import UserStatusOnline, UserStatusOffline, UserStatusRecently
                
                user = await client.get_users(int(user_id))
                if user and user.status:
                    if isinstance(user.status, UserStatusOnline):
                        return 'Online'
                    elif isinstance(user.status, UserStatusOffline):
                        # Check if recently online (within 30 seconds)
                        if hasattr(user.status, 'was_online'):
                            from datetime import datetime, timezone
                            was_online = user.status.was_online
                            if was_online:
                                time_diff = (datetime.now(timezone.utc) - was_online).total_seconds()
                                if time_diff < 30:
                                    return 'Recently'
                        return 'Offline'
                    elif isinstance(user.status, UserStatusRecently):
                        return 'Recently'
                
                return 'Unknown'
            
            except Exception:
                return 'Unknown'
        
        except Exception:
            return 'Unknown'
    
    async def send_message(
        self,
        phone: str,
        user_id: str,
        text: str,
        attachment: Any = None,  # 可以是字符串路徑或 {name, type, dataUrl} 對象
        source_group: Optional[str] = None,
        target_username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message to a user
        
        Args:
            phone: Sender account phone number
            user_id: Target user ID (can be username or user ID)
            text: Message text
            attachment: Optional file path
            source_group: Optional source group ID/URL (used to resolve user)
            target_username: Optional target username (fallback)
        
        Returns:
            Dict with 'success', 'message_id', 'error'
        """
        import sys
        print(f"[TelegramClient] send_message called: phone={phone}, user_id={user_id}, source_group={source_group}, target_username={target_username}", file=sys.stderr)
        print(f"[TelegramClient] Available clients: {list(self.clients.keys())}", file=sys.stderr)
        
        try:
            if phone not in self.clients:
                print(f"[TelegramClient] ERROR: Client {phone} not in self.clients!", file=sys.stderr)
                return {
                    "success": False,
                    "error": f"Client not connected. Available: {list(self.clients.keys())}"
                }
            
            client = self.clients[phone]
            print(f"[TelegramClient] Client found, is_connected: {client.is_connected}", file=sys.stderr)
            
            if not client.is_connected:
                print(f"[TelegramClient] Reconnecting client...", file=sys.stderr)
                await client.connect()
            
            # 解析目標用戶 ID，建立 peer 連接
            target_user_id = int(user_id) if isinstance(user_id, str) and user_id.lstrip('-').isdigit() else user_id
            print(f"[TelegramClient] Target user ID: {target_user_id}", file=sys.stderr)
            
            peer_resolved = False
            
            # 方法 1：直接嘗試解析 peer
            try:
                peer = await client.resolve_peer(target_user_id)
                print(f"[TelegramClient] Peer resolved directly: {peer}", file=sys.stderr)
                peer_resolved = True
            except Exception as resolve_error:
                print(f"[TelegramClient] Direct resolve_peer failed: {resolve_error}", file=sys.stderr)
            
            # 方法 2：如果失敗且有源群組，先嘗試加入群組再獲取用戶
            if not peer_resolved and source_group:
                print(f"[TelegramClient] Trying to resolve user via source group: {source_group}", file=sys.stderr)
                try:
                    # 解析群組 ID
                    group_id = source_group
                    group_url = None
                    
                    if isinstance(source_group, str):
                        if source_group.lstrip('-').isdigit():
                            group_id = int(source_group)
                        else:
                            group_url = source_group
                    
                    # 嘗試獲取群組信息，如果失敗則嘗試加入
                    try:
                        chat = await client.get_chat(group_id if not group_url else group_url)
                        group_id = chat.id
                        print(f"[TelegramClient] Already in group: {chat.title} ({group_id})", file=sys.stderr)
                    except Exception as get_chat_error:
                        print(f"[TelegramClient] get_chat failed: {get_chat_error}, trying to join group...", file=sys.stderr)
                        
                        # 嘗試自動加入群組
                        join_target = group_url if group_url else source_group
                        print(f"[TelegramClient] Attempting to join group: {join_target}", file=sys.stderr)
                        
                        try:
                            join_result = await self.join_group(phone, str(join_target))
                            if join_result.get('success'):
                                print(f"[TelegramClient] ✓ Successfully joined group!", file=sys.stderr)
                                # 等待一下讓 Telegram 處理加入請求
                                await asyncio.sleep(2)
                                # 重新獲取群組信息
                                try:
                                    chat = await client.get_chat(group_id if isinstance(group_id, int) else join_target)
                                    group_id = chat.id
                                    print(f"[TelegramClient] Now in group: {chat.title} ({group_id})", file=sys.stderr)
                                except Exception as e:
                                    print(f"[TelegramClient] Still can't get chat after joining: {e}", file=sys.stderr)
                            else:
                                print(f"[TelegramClient] Failed to join group: {join_result.get('error')}", file=sys.stderr)
                        except Exception as join_error:
                            print(f"[TelegramClient] Error joining group: {join_error}", file=sys.stderr)
                    
                    # 嘗試獲取群組成員來解析用戶
                    try:
                        async for member in client.get_chat_members(group_id, limit=200):
                            if member.user and member.user.id == target_user_id:
                                print(f"[TelegramClient] Found user in group: {member.user}", file=sys.stderr)
                                peer_resolved = True
                                break
                    except Exception as e:
                        print(f"[TelegramClient] get_chat_members failed: {e}", file=sys.stderr)
                        
                        # 嘗試直接發送（有些群組可能不允許獲取成員列表，但仍可發送）
                        # 嘗試通過用戶名獲取
                        if not peer_resolved:
                            print(f"[TelegramClient] Trying to resolve peer again after joining group...", file=sys.stderr)
                            try:
                                peer = await client.resolve_peer(target_user_id)
                                print(f"[TelegramClient] Peer resolved after joining: {peer}", file=sys.stderr)
                                peer_resolved = True
                            except Exception as e2:
                                print(f"[TelegramClient] Still can't resolve peer: {e2}", file=sys.stderr)
                        
                except Exception as group_error:
                    print(f"[TelegramClient] Failed to resolve via group: {group_error}", file=sys.stderr)
            
            # 方法 3：嘗試 get_users
            if not peer_resolved:
                try:
                    users = await client.get_users(target_user_id)
                    if users:
                        print(f"[TelegramClient] User found via get_users: {users}", file=sys.stderr)
                        peer_resolved = True
                except Exception as get_user_error:
                    print(f"[TelegramClient] get_users also failed: {get_user_error}", file=sys.stderr)
            
            # 方法 4：從對話列表中查找（如果雙方有過交互）
            if not peer_resolved:
                print(f"[TelegramClient] Trying to find user in dialogs...", file=sys.stderr)
                try:
                    async for dialog in client.get_dialogs(limit=100):
                        if dialog.chat and dialog.chat.id == target_user_id:
                            print(f"[TelegramClient] Found user in dialogs: {dialog.chat}", file=sys.stderr)
                            peer_resolved = True
                            break
                        # 也檢查用戶類型的對話
                        if hasattr(dialog.chat, 'type') and str(dialog.chat.type) == 'ChatType.PRIVATE':
                            if dialog.chat.id == target_user_id:
                                print(f"[TelegramClient] Found private chat: {dialog.chat}", file=sys.stderr)
                                peer_resolved = True
                                break
                except Exception as dialog_error:
                    print(f"[TelegramClient] get_dialogs failed: {dialog_error}", file=sys.stderr)
            
            # 方法 5：使用用戶名作為備選
            if not peer_resolved and target_username:
                print(f"[TelegramClient] Trying to send via username: @{target_username}", file=sys.stderr)
                try:
                    # 使用用戶名替代用戶 ID
                    target_user_id = target_username if target_username.startswith('@') else f"@{target_username}"
                    peer = await client.resolve_peer(target_user_id)
                    print(f"[TelegramClient] Peer resolved via username: {peer}", file=sys.stderr)
                    peer_resolved = True
                    # 更新 target_user_id 為用戶名
                    target_user_id = target_username
                except Exception as username_error:
                    print(f"[TelegramClient] Username resolve also failed: {username_error}", file=sys.stderr)
            
            # 方法 6：即使無法解析 peer，也嘗試直接發送（使用用戶名或 ID）
            if not peer_resolved:
                if target_username:
                    print(f"[TelegramClient] Peer not resolved, trying to send to @{target_username} anyway...", file=sys.stderr)
                    target_user_id = target_username
                else:
                    print(f"[TelegramClient] Peer not resolved, trying to send to {target_user_id} anyway...", file=sys.stderr)
            
            # 模拟打字延迟（行为模拟）
            typing_delay = self.behavior_simulator.calculate_typing_delay(len(text))
            if typing_delay > 0:
                await asyncio.sleep(typing_delay)
            
            # 添加发送延迟（行为模拟）
            send_delay = self.behavior_simulator.get_send_delay()
            await asyncio.sleep(send_delay)
            
            # Send message
            print(f"[TelegramClient] Sending message to {target_user_id}...", file=sys.stderr)
            sent = None
            send_success = False
            
            if attachment:
                # 處理附件（可能是 base64 dataUrl 或文件路徑）
                print(f"[TelegramClient] Processing attachment: type={type(attachment).__name__}", file=sys.stderr)
                
                # 確保 client.me 已初始化（Pyrogram 的 save_file 需要 client.me.is_premium）
                if client.me is None:
                    print(f"[TelegramClient] Initializing client.me...", file=sys.stderr)
                    try:
                        await client.get_me()
                        print(f"[TelegramClient] client.me initialized: {client.me.first_name if client.me else 'None'}", file=sys.stderr)
                    except Exception as me_err:
                        print(f"[TelegramClient] Failed to get_me: {me_err}", file=sys.stderr)
                
                temp_file_path = None
                should_cleanup_temp = False  # 標記是否需要清理臨時文件
                try:
                    if isinstance(attachment, dict):
                        print(f"[TelegramClient] Attachment is dict: name={attachment.get('name')}, type={attachment.get('type')}", file=sys.stderr)
                        # 附件是對象格式 {name, type, dataUrl/filePath}
                        attachment_name = attachment.get('name', 'attachment')
                        attachment_type = attachment.get('type', 'file')
                        file_path = attachment.get('filePath', '')
                        data_url = attachment.get('dataUrl', '')
                        
                        # 優先使用文件路徑（大文件模式）
                        if file_path and os.path.exists(file_path):
                            print(f"[TelegramClient] Using direct file path (large file mode): {file_path}", file=sys.stderr)
                            temp_file_path = file_path
                            should_cleanup_temp = False  # 不要刪除原始文件
                        elif data_url and data_url.startswith('data:'):
                            # 解析 base64 dataUrl（舊模式，用於小文件）
                            print(f"[TelegramClient] Using base64 mode (legacy)", file=sys.stderr)
                            
                            # 提取 base64 數據
                            if ';base64,' in data_url:
                                header, base64_data = data_url.split(';base64,', 1)
                            else:
                                base64_data = data_url
                            
                            # 解碼 base64
                            file_data = base64.b64decode(base64_data)
                            
                            # 創建臨時文件
                            suffix = os.path.splitext(attachment_name)[1] or '.bin'
                            temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
                            os.close(temp_fd)
                            
                            with open(temp_file_path, 'wb') as f:
                                f.write(file_data)
                            
                            should_cleanup_temp = True  # 需要清理臨時文件
                            print(f"[TelegramClient] Saved base64 attachment to temp file: {temp_file_path}", file=sys.stderr)
                        else:
                            print(f"[TelegramClient] No valid file path or dataUrl found!", file=sys.stderr)
                        
                        # 如果有有效的文件路徑，發送文件
                        if temp_file_path:
                            # 根據類型選擇發送方式
                            print(f"[TelegramClient] Sending {attachment_type} to {target_user_id}, file: {temp_file_path}", file=sys.stderr)
                            send_success = False
                            send_error = None
                            
                            # 嘗試發送（添加超時保護）
                            try:
                                print(f"[TelegramClient] Trying to send {attachment_type}...", file=sys.stderr)
                                
                                # 使用超時保護防止卡住
                                if attachment_type == 'image':
                                    print(f"[TelegramClient] Calling send_photo...", file=sys.stderr)
                                    sent = await asyncio.wait_for(
                                        client.send_photo(
                                            chat_id=target_user_id,
                                            photo=temp_file_path,
                                            caption=text if text else None
                                        ),
                                        timeout=120.0  # 2 分鐘超時
                                    )
                                else:
                                    print(f"[TelegramClient] Calling send_document...", file=sys.stderr)
                                    sent = await asyncio.wait_for(
                                        client.send_document(
                                            chat_id=target_user_id,
                                            document=temp_file_path,
                                            caption=text if text else None,
                                            file_name=attachment_name
                                        ),
                                        timeout=120.0
                                    )
                                print(f"[TelegramClient] Send succeeded! id: {sent.id if sent else 'None'}", file=sys.stderr)
                                send_success = True
                                
                            except asyncio.TimeoutError:
                                print(f"[TelegramClient] TIMEOUT sending {attachment_type}!", file=sys.stderr)
                                send_error = Exception(f"Timeout sending {attachment_type}")
                            except Exception as std_err:
                                error_str = str(std_err)
                                print(f"[TelegramClient] Send failed: {error_str}", file=sys.stderr)
                                import traceback
                                traceback.print_exc(file=sys.stderr)
                                send_error = std_err
                            
                            if send_error:
                                raise send_error
                        else:
                            # 無效的附件數據，只發送文字
                            print(f"[TelegramClient] Invalid attachment, sending text only", file=sys.stderr)
                            sent = await client.send_message(
                                chat_id=target_user_id,
                                text=text
                            )
                            send_success = True
                    elif isinstance(attachment, str) and attachment.startswith('data:'):
                        # 附件是字符串格式的 base64 dataUrl（已在頂部導入 base64, tempfile, os）
                        if ';base64,' in attachment:
                            header, base64_data = attachment.split(';base64,', 1)
                            # 從 header 提取 MIME 類型
                            mime_type = header.replace('data:', '')
                        else:
                            base64_data = attachment
                            mime_type = 'application/octet-stream'
                        
                        file_data = base64.b64decode(base64_data)
                        
                        # 確定文件擴展名
                        ext_map = {
                            'image/png': '.png',
                            'image/jpeg': '.jpg',
                            'image/gif': '.gif',
                            'image/webp': '.webp',
                            'application/pdf': '.pdf',
                        }
                        suffix = ext_map.get(mime_type, '.bin')
                        
                        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
                        os.close(temp_fd)
                        
                        with open(temp_file_path, 'wb') as f:
                            f.write(file_data)
                        
                        print(f"[TelegramClient] Saved base64 attachment to temp file: {temp_file_path}", file=sys.stderr)
                        
                        if mime_type.startswith('image/'):
                            sent = await client.send_photo(
                                chat_id=target_user_id,
                                photo=temp_file_path,
                                caption=text
                            )
                        else:
                            sent = await client.send_document(
                                chat_id=target_user_id,
                                document=temp_file_path,
                                caption=text
                            )
                    else:
                        # 附件是文件路徑
                        sent = await client.send_document(
                            chat_id=target_user_id,
                            document=attachment,
                            caption=text
                        )
                finally:
                    # 清理臨時文件（只清理由 base64 創建的臨時文件，不清理用戶原始文件）
                    if temp_file_path and should_cleanup_temp:
                        try:
                            os.remove(temp_file_path)
                            print(f"[TelegramClient] Cleaned up temp file: {temp_file_path}", file=sys.stderr)
                        except Exception as cleanup_error:
                            print(f"[TelegramClient] Failed to cleanup temp file: {cleanup_error}", file=sys.stderr)
                    elif temp_file_path:
                        print(f"[TelegramClient] Keeping original file (not temp): {temp_file_path}", file=sys.stderr)
            else:
                sent = await client.send_message(
                    chat_id=target_user_id,
                    text=text
                )
                send_success = True if sent else False
            
            # 檢查發送結果
            if sent:
                print(f"[TelegramClient] Message sent successfully! message_id={sent.id}", file=sys.stderr)
                return {
                    "success": True,
                    "message_id": sent.id,
                    "date": sent.date.isoformat() if sent.date else None
                }
            elif send_success:
                # 附件發送時可能因 Pyrogram 解析問題 sent=None，但實際已發送
                print(f"[TelegramClient] Message likely sent (Pyrogram parsing issue)", file=sys.stderr)
                return {
                    "success": True,
                    "message_id": None,
                    "date": None,
                    "note": "Message sent but response parsing failed"
                }
            else:
                print(f"[TelegramClient] Send returned None", file=sys.stderr)
                return {
                    "success": False,
                    "error": "Send returned None - message may not have been delivered"
                }
        
        except FloodWait as e:
            return {
                "success": False,
                "error": f"Flood wait: Please wait {e.value} seconds"
            }
        except AttributeError as e:
            # Pyrogram 內部可能會拋出 AttributeError，特別是 is_premium 相關的錯誤
            # 這通常是 Pyrogram 解析返回的 Message 時 from_user 為 None
            # 但消息本身通常已經發送成功
            error_str = str(e)
            print(f"[TelegramClient] AttributeError during send: {error_str}", file=sys.stderr)
            if 'is_premium' in error_str or 'NoneType' in error_str:
                # 消息很可能已發送，只是響應解析失敗
                print(f"[TelegramClient] Message likely sent successfully despite parsing error", file=sys.stderr)
                return {
                    "success": True,
                    "message_id": None,
                    "date": None,
                    "note": f"Message sent but Pyrogram failed to parse response: {error_str}"
                }
            return {
                "success": False,
                "error": error_str
            }
        except Exception as e:
            print(f"[TelegramClient] Exception during send: {type(e).__name__}: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def join_group(self, phone: str, group_url: str) -> Dict[str, Any]:
        """
        Join a Telegram group/channel
        
        Args:
            phone: Account phone number
            group_url: Group URL, username, or invite link
            
        Returns:
            Dict with success status and chat info or error
        """
        import sys
        import re
        
        print(f"[TelegramClient] join_group called: phone={phone}, group_url={group_url}", file=sys.stderr)
        
        if phone not in self.clients:
            return {"success": False, "error": "Account not connected"}
        
        client = self.clients[phone]
        
        try:
            if not client.is_connected:
                await client.connect()
            
            # Normalize the group identifier
            group_id = group_url.strip()
            
            # Extract from t.me/xxx or telegram.me/xxx URLs
            match = re.search(r'(?:t\.me|telegram\.me)/(?:joinchat/)?([^/\s]+)', group_id)
            if match:
                group_id = match.group(1)
            
            # Remove @ prefix if present
            if group_id.startswith('@'):
                group_id = group_id[1:]
            
            # 正確檢查成員身份：使用 get_chat_member 而不是 get_chat
            # get_chat 對公開群組可以成功，但不代表帳號是成員
            is_member = False
            chat = None
            try:
                chat = await client.get_chat(group_id)
                # 獲取當前用戶在群組中的成員身份
                me = await client.get_me()
                member = await client.get_chat_member(chat.id, me.id)
                # 檢查是否是有效成員（不是 LEFT 或 BANNED）
                from pyrogram.enums import ChatMemberStatus
                if member.status in [ChatMemberStatus.OWNER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.MEMBER]:
                    is_member = True
                    print(f"[TelegramClient] Verified member of {group_id}: {chat.title} (status: {member.status})", file=sys.stderr)
            except Exception as e:
                print(f"[TelegramClient] Not a member of {group_id}: {e}", file=sys.stderr)
                is_member = False
            
            if is_member and chat:
                return {
                    "success": True,
                    "already_member": True,
                    "chat_id": chat.id,
                    "chat_title": chat.title,
                    "chat_type": str(chat.type)
                }
            
            # Try to join the group/channel
            print(f"[TelegramClient] Attempting to join {group_id}...", file=sys.stderr)
            try:
                # For invite links (t.me/+xxx or joinchat/xxx)
                if group_id.startswith('+') or 'joinchat' in group_url.lower():
                    chat = await client.join_chat(group_id)
                else:
                    # For public groups/channels
                    chat = await client.join_chat(group_id)
                
                print(f"[TelegramClient] Successfully joined {group_id}: {chat.title}", file=sys.stderr)
                
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"成功加入群组: {chat.title}",
                        "type": "success"
                    })
                
                return {
                    "success": True,
                    "already_member": False,
                    "chat_id": chat.id,
                    "chat_title": chat.title,
                    "chat_type": str(chat.type)
                }
            except UserAlreadyParticipant:
                # Already a member
                chat = await client.get_chat(group_id)
                return {
                    "success": True,
                    "already_member": True,
                    "chat_id": chat.id,
                    "chat_title": chat.title,
                    "chat_type": str(chat.type)
                }
                
        except FloodWait as e:
            error_msg = f"请等待 {e.value} 秒后再试"
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"加入群组失败 ({group_url}): {error_msg}",
                    "type": "error"
                })
            return {"success": False, "error": error_msg, "flood_wait": e.value}
        except UserBannedInChannel:
            error_msg = "该账号已被该群组/频道封禁"
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"加入群组失败 ({group_url}): {error_msg}",
                    "type": "error"
                })
            return {"success": False, "error": error_msg}
        except InviteHashExpired:
            error_msg = "邀请链接已过期"
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"加入群组失败 ({group_url}): {error_msg}",
                    "type": "error"
                })
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = str(e)
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"加入群组失败 ({group_url}): {error_msg}",
                    "type": "error"
                })
            return {"success": False, "error": error_msg}
    
    async def check_group_membership(self, phone: str, group_url: str) -> Dict[str, Any]:
        """
        Check if an account is a member of a group WITHOUT trying to join
        
        Args:
            phone: Account phone number
            group_url: Group URL, username, or invite link
            
        Returns:
            Dict with membership status and details
        """
        import sys
        import re
        
        if phone not in self.clients:
            return {
                "is_member": False,
                "can_join": False,
                "error": "賬號未連接",
                "group_url": group_url
            }
        
        client = self.clients[phone]
        
        try:
            if not client.is_connected:
                await client.connect()
            
            # Normalize the group identifier
            group_id = group_url.strip()
            
            # Extract from t.me/xxx or telegram.me/xxx URLs
            match = re.search(r'(?:t\.me|telegram\.me)/(?:joinchat/)?([^/\s]+)', group_id)
            if match:
                group_id = match.group(1)
            
            # Remove @ prefix if present
            if group_id.startswith('@'):
                group_id = group_id[1:]
            
            # Check if it's an invite link (private group)
            is_invite_link = group_id.startswith('+') or 'joinchat' in group_url.lower()
            
            # 🆕 對於邀請鏈接，需要特殊處理
            if is_invite_link:
                # 邀請鏈接無法直接用 get_chat 解析，需要使用原始 URL
                # 嘗試用完整的邀請鏈接格式
                invite_link_full = group_url if 't.me/' in group_url else f"https://t.me/{group_id}"
                print(f"[TelegramClient] Checking invite link: {invite_link_full}", file=sys.stderr)
                
                try:
                    # 嘗試用邀請鏈接加入群組的方式來獲取信息
                    # 注意：get_chat 對邀請鏈接可能不起作用
                    chat = await client.get_chat(invite_link_full)
                except Exception as invite_err:
                    error_str = str(invite_err).lower()
                    print(f"[TelegramClient] Invite link check error: {invite_err}", file=sys.stderr)
                    
                    # 邀請鏈接錯誤處理
                    if "expired" in error_str:
                        return {
                            "is_member": False,
                            "can_join": False,
                            "is_private": True,
                            "group_url": group_url,
                            "reason": "邀請鏈接已過期"
                        }
                    elif "not_occupied" in error_str or "invalid" in error_str:
                        # 嘗試直接用 hash 獲取
                        return {
                            "is_member": False,
                            "can_join": True,
                            "is_private": True,
                            "group_url": group_url,
                            "reason": "私有群組，需要通過邀請鏈接加入"
                        }
                    else:
                        return {
                            "is_member": False,
                            "can_join": True,
                            "is_private": True,
                            "group_url": group_url,
                            "reason": "私有群組，需要通過邀請鏈接加入"
                        }
            else:
                # 普通用戶名/群組 ID
                chat = await client.get_chat(group_id)
            
            # 正確檢查成員身份：使用 get_chat_member 而不只是 get_chat
            # get_chat 對公開群組可以成功，但不代表帳號是成員
            try:
                # 獲取當前用戶在群組中的成員身份
                me = await client.get_me()
                member = await client.get_chat_member(chat.id, me.id)
                
                # 檢查是否是有效成員（不是 LEFT 或 BANNED）
                from pyrogram.enums import ChatMemberStatus
                if member.status in [ChatMemberStatus.OWNER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.MEMBER]:
                    print(f"[TelegramClient] ✓ Account {phone} is member of {group_url}: {chat.title} (status: {member.status})", file=sys.stderr)
                    return {
                        "is_member": True,
                        "can_join": True,
                        "chat_id": chat.id,
                        "chat_title": chat.title,
                        "chat_type": str(chat.type),
                        "group_url": group_url,
                        "members_count": getattr(chat, 'members_count', 0) or 0
                    }
                else:
                    # 用戶狀態是 LEFT, BANNED, 或 RESTRICTED
                    print(f"[TelegramClient] Account {phone} has status {member.status} in {group_url}", file=sys.stderr)
                    return {
                        "is_member": False,
                        "can_join": True,  # 公開群可以重新加入
                        "is_private": False,
                        "chat_id": chat.id,
                        "chat_title": chat.title,
                        "group_url": group_url,
                        "reason": f"已離開群組 (狀態: {member.status})"
                    }
            except Exception as e:
                error_str = str(e).lower()
                print(f"[TelegramClient] Account {phone} not member of {group_url}: {e}", file=sys.stderr)
                
                # 如果是 "user not participant" 錯誤，說明群組存在但用戶不是成員
                if "not a participant" in error_str or "user_not_participant" in error_str:
                    # 嘗試獲取群組資訊以判斷是否可以加入
                    try:
                        chat = await client.get_chat(group_id)
                        return {
                            "is_member": False,
                            "can_join": True,
                            "is_private": False,
                            "chat_id": chat.id,
                            "chat_title": chat.title,
                            "group_url": group_url,
                            "reason": "未加入群組（可加入）"
                        }
                    except:
                        pass
                
                # Determine if we can join
                if is_invite_link:
                    # Private group with invite link - can potentially join
                    return {
                        "is_member": False,
                        "can_join": True,
                        "is_private": True,
                        "group_url": group_url,
                        "reason": "需要邀請鏈接加入（私有群組）"
                    }
                elif "channel" in error_str or "private" in error_str:
                    # Private channel/group
                    return {
                        "is_member": False,
                        "can_join": False,
                        "is_private": True,
                        "group_url": group_url,
                        "reason": "私有群組，需要邀請鏈接"
                    }
                else:
                    # Public group - can join
                    return {
                        "is_member": False,
                        "can_join": True,
                        "is_private": False,
                        "group_url": group_url,
                        "reason": "公開群組，可以加入"
                    }
                    
        except Exception as e:
            error_str = str(e).lower()
            error_msg = str(e)
            print(f"[TelegramClient] Error checking membership for {group_url}: {e}", file=sys.stderr)
            
            # 解析錯誤類型以提供更好的用戶反饋
            if "usernamenotoccupied" in error_str or "username_not_occupied" in error_str:
                reason = f"群組 '{group_url}' 不存在或用戶名無效"
            elif "invitehashexpired" in error_str or "invite_hash_expired" in error_str:
                reason = "邀請鏈接已過期"
            elif "userbanned" in error_str or "user_banned" in error_str:
                reason = "該賬號已被封禁，無法加入"
            elif "forbidden" in error_str or "chatforbidden" in error_str:
                reason = "沒有權限訪問該群組"
            elif "channel" in error_str and "private" in error_str:
                reason = "私有頻道/群組，需要邀請鏈接"
            else:
                reason = f"檢查失敗: {error_msg}"
            
            return {
                "is_member": False,
                "can_join": False,
                "error": error_msg,
                "reason": reason,
                "group_url": group_url
            }
    
    async def check_all_groups_membership(self, phone: str, group_urls: list) -> Dict[str, Any]:
        """
        Check membership status for all groups
        
        Args:
            phone: Account phone number
            group_urls: List of group URLs to check
            
        Returns:
            Dict with detailed membership report
        """
        import sys
        
        report = {
            "phone": phone,
            "total_groups": len(group_urls),
            "member_of": [],      # Groups the account is already in
            "can_join": [],       # Groups the account can join
            "cannot_join": [],    # Groups the account cannot join
            "errors": []          # Groups with errors
        }
        
        for group_url in group_urls:
            try:
                result = await self.check_group_membership(phone, group_url)
                
                if result.get("is_member"):
                    report["member_of"].append({
                        "url": group_url,
                        "chat_id": result.get("chat_id"),
                        "title": result.get("chat_title", "Unknown")
                    })
                elif result.get("can_join"):
                    report["can_join"].append({
                        "url": group_url,
                        "is_private": result.get("is_private", False),
                        "reason": result.get("reason", "")
                    })
                else:
                    report["cannot_join"].append({
                        "url": group_url,
                        "reason": result.get("reason") or result.get("error", "未知原因")
                    })
            except Exception as e:
                report["errors"].append({
                    "url": group_url,
                    "error": str(e)
                })
        
        print(f"[TelegramClient] Membership report for {phone}:", file=sys.stderr)
        print(f"  - Member of: {len(report['member_of'])} groups", file=sys.stderr)
        print(f"  - Can join: {len(report['can_join'])} groups", file=sys.stderr)
        print(f"  - Cannot join: {len(report['cannot_join'])} groups", file=sys.stderr)
        
        # 顯示無法加入的詳細原因
        for item in report['cannot_join']:
            print(f"    ✗ {item.get('url')}: {item.get('reason', '未知原因')}", file=sys.stderr)
        for item in report['errors']:
            print(f"    ⚠ {item.get('url')}: {item.get('error', '錯誤')}", file=sys.stderr)
        
        return report
    
    async def start_monitoring(
        self,
        phone: str,
        group_urls: list,
        keyword_sets: list,
        on_lead_captured: Optional[Callable] = None
    ):
        """
        Start monitoring groups for a specific account
        
        Args:
            phone: Account phone number
            group_urls: List of group URLs/IDs to monitor
            keyword_sets: List of keyword sets to match
            on_lead_captured: Callback when a lead is captured
        """
        if phone not in self.clients:
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"账号 {phone} 未连接，无法开始监控",
                    "type": "error"
                })
            # 返回 False 表示監控啟動失敗
            return False
        
        client = self.clients[phone]
        
        # NOTE: We don't call connect() here anymore
        # Instead, we'll ensure the client is properly started (with dispatcher) later
        # This avoids the "already connected" error when we try to start() later
        
        # Convert group URLs to chat IDs, joining groups if needed
        # 🆕 優化：使用並行處理加速群組加入
        monitored_chat_ids = set()
        failed_groups = []
        joined_groups = []
        # Map chat_id -> group_url for later reference
        chat_id_to_url_map = {}
        
        import sys
        import re
        
        # 🆕 定義單個群組的處理函數
        async def process_single_group(group_url: str) -> dict:
            """處理單個群組，返回結果"""
            result = {
                'url': group_url,
                'success': False,
                'chat_id': None,
                'chat_title': None,
                'joined': False,
                'error': None
            }
            
            try:
                # Try to resolve URL to chat_id
                if isinstance(group_url, (int, str)) and str(group_url).lstrip('-').isdigit():
                    # Already a chat ID
                    result['chat_id'] = int(group_url)
                    result['success'] = True
                    return result
                
                # First, try to join the group
                join_result = await self.join_group(phone, group_url)
                
                if join_result.get("success"):
                    result['chat_id'] = join_result.get("chat_id")
                    result['chat_title'] = join_result.get("chat_title", "Unknown")
                    result['success'] = True
                    result['joined'] = not join_result.get("already_member", True)
                else:
                    # Join failed, try get_chat directly
                    try:
                        chat = await client.get_chat(group_url)
                        result['chat_id'] = chat.id
                        result['chat_title'] = chat.title
                        result['success'] = True
                    except Exception:
                        # Try extracting username from URL
                        match = re.search(r't\.me/([^/]+)', str(group_url))
                        if match:
                            username = match.group(1)
                            try:
                                chat = await client.get_chat(username)
                                result['chat_id'] = chat.id
                                result['chat_title'] = chat.title
                                result['success'] = True
                            except Exception as user_err:
                                result['error'] = str(user_err)
                        else:
                            result['error'] = "Unable to resolve"
                            
            except Exception as e:
                result['error'] = str(e)
            
            return result
        
        # 🆕 並行處理群組（限制並發數為 5，避免被限速）
        semaphore = asyncio.Semaphore(5)
        
        async def process_with_limit(group_url: str) -> dict:
            async with semaphore:
                return await process_single_group(group_url)
        
        print(f"[TelegramClient] Processing {len(group_urls)} groups in parallel (max 5 concurrent)...", file=sys.stderr)
        
        # 使用 gather 並行處理所有群組
        tasks = [process_with_limit(url) for url in group_urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 處理結果
        for i, result in enumerate(results):
            group_url = group_urls[i]
            
            if isinstance(result, Exception):
                failed_groups.append(str(group_url))
                print(f"[TelegramClient] ✗ Exception processing {group_url}: {result}", file=sys.stderr)
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[群組解析] 錯誤: {group_url} - {str(result)}",
                        "type": "error"
                    })
                continue
            
            if result.get('success') and result.get('chat_id'):
                chat_id = result['chat_id']
                monitored_chat_ids.add(chat_id)
                chat_id_to_url_map[chat_id] = str(group_url)
                
                if result.get('joined'):
                    joined_groups.append(result.get('chat_title', group_url))
                
                print(f"[TelegramClient] ✓ {group_url} -> {chat_id}", file=sys.stderr)
            else:
                failed_groups.append(str(group_url))
                print(f"[TelegramClient] ✗ {group_url}: {result.get('error', 'Unknown error')}", file=sys.stderr)
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[群組解析] ✗ 無法解析: {group_url}",
                        "type": "error"
                    })
        
        # Log joined groups
        if joined_groups and self.event_callback:
            self.event_callback("log-entry", {
                "message": f"成功加入 {len(joined_groups)} 个群组: {', '.join(joined_groups[:3])}{'...' if len(joined_groups) > 3 else ''}",
                "type": "success"
            })
        
        # Log failed group resolutions
        if failed_groups and self.event_callback:
            self.event_callback("log-entry", {
                "message": f"无法解析 {len(failed_groups)} 个群组: {', '.join(failed_groups[:3])}{'...' if len(failed_groups) > 3 else ''}",
                "type": "warning"
            })
        
        if not monitored_chat_ids:
            import sys
            print(f"[TelegramClient] ERROR: No valid groups to monitor for {phone}", file=sys.stderr)
            print(f"[TelegramClient] Processed {len(group_urls)} group URLs", file=sys.stderr)
            print(f"[TelegramClient] Failed groups: {failed_groups}", file=sys.stderr)
            print(f"[TelegramClient] Joined groups: {joined_groups}", file=sys.stderr)
            
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"账号 {phone} 没有有效的群组可监控。已處理 {len(group_urls)} 個群組，失敗: {len(failed_groups)}",
                    "type": "error"
                })
            # 返回 False 表示監控啟動失敗
            return False
        
        import sys
        print(f"[TelegramClient] Successfully resolved {len(monitored_chat_ids)} groups for {phone}: {list(monitored_chat_ids)}", file=sys.stderr)
        
        # Log successful monitoring start with detailed group info
        if self.event_callback:
            group_info = []
            for chat_id, url in chat_id_to_url_map.items():
                group_info.append(f"{url} (ID: {chat_id})")
            
            self.event_callback("log-entry", {
                "message": f"账号 {phone} 开始监控 {len(monitored_chat_ids)} 个群组: {', '.join(group_info[:3])}{'...' if len(group_info) > 3 else ''}",
                "type": "success"
            })
            
            # Also log each group individually for clarity
            for chat_id, url in chat_id_to_url_map.items():
                self.event_callback("log-entry", {
                    "message": f"  ✓ 监控群组: {url} (Chat ID: {chat_id})",
                    "type": "info"
                })
        
        # Store monitoring info for this account BEFORE creating handler
        if not hasattr(self, 'monitoring_info'):
            self.monitoring_info = {}
        self.monitoring_info[phone] = {
            'chat_ids': monitored_chat_ids,
            'keyword_sets': keyword_sets,
            'chat_id_to_url_map': chat_id_to_url_map,
            'group_urls': list(chat_id_to_url_map.values()),
            'on_lead_captured': on_lead_captured  # Store callback for handler
        }
        
        # Ensure message_handlers is initialized (defensive check)
        if not hasattr(self, 'message_handlers'):
            self.message_handlers: Dict[str, MessageHandler] = {}
        
        # Remove existing handler if any
        if phone in self.message_handlers:
            try:
                client.remove_handler(self.message_handlers[phone])
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] 已移除舊的消息處理器: {phone}",
                        "type": "info"
                    })
            except Exception as e:
                import sys
                print(f"[TelegramClient] Error removing old handler: {str(e)}", file=sys.stderr)
        
        # Create message handler function with closure over necessary variables
        async def handle_monitored_message(client_instance: Client, message: Message):
            """Handle incoming messages from monitored groups"""
            try:
                import sys
                
                # Get chat info
                chat_id = message.chat.id if message.chat else None
                chat_title = safe_get_name(message.chat, "Unknown") if message.chat else "Unknown"
                chat_type = str(message.chat.type) if message.chat else "unknown"
                message_text = message.text or message.caption or "(no text)"
                
                # 標準化 Chat ID 為整數類型以確保正確比較
                if chat_id is not None:
                    chat_id = int(chat_id)
                
                # 快速檢查是否在監控列表中（在詳細日誌之前）
                mon_info = self.monitoring_info.get(phone, {})
                mon_chat_ids = mon_info.get('chat_ids', set())
                # 確保監控列表中的 ID 也是整數
                mon_chat_ids_normalized = {int(cid) for cid in mon_chat_ids if cid is not None}
                
                is_monitored = chat_id in mon_chat_ids_normalized
                
                # 只在調試模式或監控消息時輸出詳細日誌
                if is_monitored:
                    print(f"[TelegramClient] ========== MESSAGE RECEIVED ==========", file=sys.stderr)
                    print(f"[TelegramClient] Chat ID: {chat_id}", file=sys.stderr)
                    print(f"[TelegramClient] Chat Title: {chat_title}", file=sys.stderr)
                    print(f"[TelegramClient] Chat Type: {chat_type}", file=sys.stderr)
                    print(f"[TelegramClient] Message: {message_text[:100]}...", file=sys.stderr)
                    print(f"[TelegramClient] Outgoing: {message.outgoing}", file=sys.stderr)
                    print(f"[TelegramClient] From User: {message.from_user.username if message.from_user else 'None'}", file=sys.stderr)
                    print(f"[TelegramClient] =====================================", file=sys.stderr)
                
                # 快速過濾：如果不在監控列表中，靜默返回（不輸出冗長日誌）
                if not is_monitored:
                    # 只在首次收到來自新群組的消息時記錄一次
                    return
                
                # 獲取完整的監控信息
                if phone not in self.monitoring_info:
                    print(f"[TelegramClient] No monitoring info for {phone}", file=sys.stderr)
                    return
                
                url_map = mon_info.get('chat_id_to_url_map', {})
                kw_sets = mon_info.get('keyword_sets', [])
                lead_callback = mon_info.get('on_lead_captured')
                
                # 記錄監控群組的消息
                group_url = url_map.get(chat_id, f"Chat ID: {chat_id}")
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] ✓ 收到監控群組消息: {chat_title} ({group_url})",
                        "type": "success"
                    })
                print(f"[TelegramClient] ✓✓✓ Message IS from monitored group: {chat_id}", file=sys.stderr)
                
                # Skip messages sent by ourselves (outgoing messages)
                if message.outgoing:
                    if self.event_callback:
                        self.event_callback("log-entry", {
                            "message": f"[監控] 跳過自己發送的消息: {chat_title}",
                            "type": "info"
                        })
                    return
                
                # Get message text
                text = message.text or message.caption or ""
                user = message.from_user
                
                if not text:
                    print(f"[TelegramClient] Message has no text, skipping", file=sys.stderr)
                    return
                
                if not user:
                    print(f"[TelegramClient] Message has no user, skipping", file=sys.stderr)
                    return
                
                # Log message content for debugging
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] 消息內容: '{sanitize_text(text[:100])}...' 來自: {safe_get_username(user) or safe_get_name(user, '未知')}",
                        "type": "info"
                    })
                
                # ==================== 🆕 自動收集發言者並識別廣告號 ====================
                try:
                    from ad_detection_service import ad_detection_service
                    
                    # 準備用戶數據
                    user_data = {
                        'id': user.id,
                        'telegram_id': str(user.id),
                        'username': safe_get_username(user),
                        'first_name': sanitize_text(user.first_name) if user.first_name else '',
                        'last_name': sanitize_text(user.last_name) if user.last_name else '',
                        'bio': '',  # 需要額外 API 調用獲取
                        'photo': user.photo,
                        'is_premium': getattr(user, 'is_premium', False),
                        'is_verified': getattr(user, 'is_verified', False),
                        'is_bot': user.is_bot,
                        'collected_by': phone
                    }
                    
                    # 異步處理，不阻塞主流程
                    asyncio.create_task(
                        ad_detection_service.process_message(
                            user_data=user_data,
                            message_text=text,
                            group_id=str(chat_id),
                            group_name=chat_title
                        )
                    )
                except Exception as collect_err:
                    # 收集失敗不影響主監控流程
                    print(f"[TelegramClient] Ad detection error (non-blocking): {collect_err}", file=sys.stderr)
                # ==================== 收集發言者結束 ====================
                
                # 使用優化的 Trie 匹配器（更快的匹配速度）
                if phone not in self.trie_matchers:
                    trie_matcher = TrieKeywordMatcher()
                    trie_matcher.compile_keywords(kw_sets)
                    self.trie_matchers[phone] = trie_matcher
                else:
                    trie_matcher = self.trie_matchers[phone]
                    # 只在關鍵詞集變化時重新編譯
                    if not hasattr(trie_matcher, '_last_keyword_sets') or trie_matcher._last_keyword_sets != kw_sets:
                        trie_matcher.compile_keywords(kw_sets)
                        trie_matcher._last_keyword_sets = kw_sets
                
                # 關鍵詞匹配（使用優化的 Trie 樹，O(n) 時間複雜度）
                # 對於短文本，直接匹配更快；對於長文本，可以使用線程池
                if len(text) > 1000:
                    # 長文本使用線程池
                    loop = asyncio.get_event_loop()
                    matched_keywords = await loop.run_in_executor(
                        self._get_executor(),
                        trie_matcher.match,
                        text
                    )
                else:
                    # 短文本直接匹配
                    matched_keywords = trie_matcher.match(text)
                
                if matched_keywords:
                    group_url = url_map.get(chat_id)
                    matched_keyword = matched_keywords[0]
                    
                    # 詳細日誌
                    print(f"[TelegramClient] ========== KEYWORD MATCHED ==========", file=sys.stderr)
                    print(f"[TelegramClient] 匹配的關鍵詞: '{matched_keyword}'", file=sys.stderr)
                    print(f"[TelegramClient] 群組: {group_url or chat_id} ({chat_title})", file=sys.stderr)
                    print(f"[TelegramClient] 用戶: @{user.username or user.first_name} (ID: {user.id})", file=sys.stderr)
                    print(f"[TelegramClient] 消息: {text[:100]}...", file=sys.stderr)
                    print(f"[TelegramClient] =====================================", file=sys.stderr)
                    
                    # Log keyword match
                    if self.event_callback:
                        self.event_callback("log-entry", {
                            "message": f"[監控] ✓✓ 關鍵詞匹配成功: '{matched_keyword}' 在群組 {group_url or chat_id}",
                            "type": "success"
                        })
                        
                        # 發送實時匹配事件到前端
                        self.event_callback("keyword-matched", {
                            "keyword": matched_keyword,
                            "groupUrl": group_url,
                            "groupName": chat_title,
                            "userId": str(user.id),
                            "username": safe_get_username(user),
                            "firstName": sanitize_text(user.first_name) if user.first_name else "",
                            "messagePreview": sanitize_text(text[:100]) if text else "",
                            "timestamp": message.date.isoformat() if message.date else None
                        })
                    print(f"[TelegramClient] KEYWORD MATCHED: '{matched_keyword}'", file=sys.stderr)
                    
                    # Capture lead - 使用安全的文本處理
                    lead_data = {
                        "user_id": str(user.id),
                        "username": safe_get_username(user),
                        "first_name": sanitize_text(user.first_name) if user.first_name else "",
                        "last_name": sanitize_text(user.last_name) if user.last_name else "",
                        "source_group": str(chat_id),
                        "source_group_url": group_url,
                        "triggered_keyword": sanitize_text(matched_keywords[0]) if matched_keywords else "",
                        "message_text": sanitize_text(text),
                        "timestamp": message.date.isoformat() if message.date else None,
                        "account_phone": phone  # 監控帳號電話，用於 AI 自動聊天
                    }
                    
                    print(f"[TelegramClient] ========== CAPTURING LEAD ==========", file=sys.stderr)
                    print(f"[TelegramClient] User ID: {lead_data['user_id']}", file=sys.stderr)
                    print(f"[TelegramClient] Username: @{lead_data['username']}", file=sys.stderr)
                    print(f"[TelegramClient] Keyword: {lead_data['triggered_keyword']}", file=sys.stderr)
                    print(f"[TelegramClient] Group: {group_url}", file=sys.stderr)
                    print(f"[TelegramClient] =====================================", file=sys.stderr)
                    
                    if lead_callback:
                        print(f"[TelegramClient] 調用 lead_callback...", file=sys.stderr)
                        try:
                            await lead_callback(lead_data)
                            print(f"[TelegramClient] lead_callback 完成", file=sys.stderr)
                        except Exception as callback_err:
                            import traceback
                            error_details = traceback.format_exc()
                            print(f"[TelegramClient] lead_callback 出錯: {callback_err}\n{error_details}", file=sys.stderr)
                            if self.event_callback:
                                self.event_callback("log-entry", {
                                    "message": f"[監控] Lead 回調出錯: {str(callback_err)}",
                                    "type": "error"
                                })
                    elif self.event_callback:
                        self.event_callback("lead-captured", lead_data)
                else:
                    if self.event_callback:
                        self.event_callback("log-entry", {
                            "message": f"[監控] 無關鍵詞匹配: '{text[:50]}...'",
                            "type": "info"
                        })
            
            except Exception as e:
                import sys
                print(f"[TelegramClient] Error in message handler: {str(e)}", file=sys.stderr)
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] 消息處理錯誤: {str(e)}",
                        "type": "error"
                    })
        
        # CRITICAL: Ensure the client is fully started (not just connected) BEFORE registering handler
        # Pyrogram's client.connect() only establishes TCP connection
        # client.start() initializes the dispatcher and update receiver which is REQUIRED for handlers to work
        # IMPORTANT: If client is already connected, we cannot call start() directly
        # We need to check if it's already started, or disconnect first
        import sys
        
        try:
            # Check if dispatcher is already running
            dispatcher_running = False
            try:
                if hasattr(client, 'dispatcher') and client.dispatcher is not None:
                    # Try to check if dispatcher is actually running
                    if hasattr(client.dispatcher, 'is_running'):
                        dispatcher_running = client.dispatcher.is_running
                    else:
                        # Dispatcher exists, check if it has handlers (indicates it's active)
                        if hasattr(client.dispatcher, 'handlers') and len(client.dispatcher.handlers) > 0:
                            dispatcher_running = True
                        else:
                            dispatcher_running = False
            except Exception as check_err:
                print(f"[TelegramClient] Error checking dispatcher status: {check_err}", file=sys.stderr)
                dispatcher_running = False
            
            # If dispatcher is not running, we need to start the client properly
            if not dispatcher_running:
                print(f"[TelegramClient] Dispatcher not running for {phone}, starting client...", file=sys.stderr)
                
                # CRITICAL: If client is already connected, we MUST fully disconnect first
                # because start() will try to connect() again, which will fail
                if client.is_connected:
                    print(f"[TelegramClient] Client is already connected for {phone}, fully disconnecting first...", file=sys.stderr)
                    
                    # Step 1: Try to stop the client (stops dispatcher and disconnects)
                    try:
                        await client.stop()
                        print(f"[TelegramClient] Client.stop() called for {phone}", file=sys.stderr)
                    except Exception as stop_err:
                        error_str = str(stop_err).lower()
                        print(f"[TelegramClient] client.stop() raised exception: {stop_err}", file=sys.stderr)
                        # Continue to force disconnect
                    
                    # Step 2: Wait a bit for stop to complete
                    await asyncio.sleep(1.0)  # Increased wait time
                    
                    # Step 3: Force disconnect if still connected
                    max_disconnect_attempts = 3
                    for attempt in range(max_disconnect_attempts):
                        if not client.is_connected:
                            print(f"[TelegramClient] Client is now disconnected for {phone}", file=sys.stderr)
                            break
                        
                        print(f"[TelegramClient] Client still connected, forcing disconnect (attempt {attempt + 1}/{max_disconnect_attempts})...", file=sys.stderr)
                        try:
                            await client.disconnect()
                            await asyncio.sleep(0.5)
                            if not client.is_connected:
                                print(f"[TelegramClient] Successfully disconnected client for {phone}", file=sys.stderr)
                                break
                        except Exception as disconnect_err:
                            error_str = str(disconnect_err).lower()
                            print(f"[TelegramClient] Disconnect attempt {attempt + 1} failed: {disconnect_err}", file=sys.stderr)
                            if "not connected" in error_str or "already disconnected" in error_str:
                                # Client is actually disconnected, just state is wrong
                                print(f"[TelegramClient] Client appears to be disconnected (state mismatch)", file=sys.stderr)
                                break
                            if attempt < max_disconnect_attempts - 1:
                                await asyncio.sleep(0.5 * (attempt + 1))
                    
                    # Step 4: Final check - if still connected, we have a problem
                    if client.is_connected:
                        print(f"[TelegramClient] WARNING: Client still appears connected after disconnect attempts for {phone}", file=sys.stderr)
                        # Try one more time with longer wait
                        await asyncio.sleep(1.0)
                        try:
                            await client.disconnect()
                        except:
                            pass
                
                # Now start the client - this will connect AND initialize dispatcher
                # But first, verify we're not connected
                if client.is_connected:
                    print(f"[TelegramClient] ERROR: Client is still connected before start() for {phone}. This will likely fail.", file=sys.stderr)
                    # Last resort: try to access internal state and reset
                    try:
                        # Force reset connection state if possible
                        if hasattr(client, '_connection'):
                            client._connection = None
                        if hasattr(client, 'is_connected'):
                            # Can't directly set property, but we can try
                            pass
                    except:
                        pass
                
                print(f"[TelegramClient] Starting client for {phone}...", file=sys.stderr)
                try:
                    await client.start()
                    print(f"[TelegramClient] Client started successfully for {phone} (dispatcher initialized)", file=sys.stderr)
                except Exception as start_err:
                    error_str = str(start_err).lower()
                    if "already connected" in error_str:
                        print(f"[TelegramClient] CRITICAL: Client still reports as connected. Attempting workaround...", file=sys.stderr)
                        # Workaround: Try to manually reset and restart
                        try:
                            # Force disconnect one more time
                            await asyncio.sleep(1.0)
                            if hasattr(client, 'disconnect'):
                                try:
                                    await client.disconnect()
                                except:
                                    pass
                            await asyncio.sleep(1.0)
                            # Now try start again
                            await client.start()
                            print(f"[TelegramClient] Client started successfully after workaround for {phone}", file=sys.stderr)
                        except Exception as retry_err:
                            print(f"[TelegramClient] Workaround also failed: {retry_err}", file=sys.stderr)
                            raise start_err  # Re-raise original error
                    else:
                        raise  # Re-raise if not "already connected" error
            else:
                print(f"[TelegramClient] Client dispatcher already running for {phone}, no need to restart", file=sys.stderr)
            
            # NOW register the handler AFTER client is fully started
            # Create message handler - receive ALL messages for debugging
            # We filter inside the handler to see what's being received
            # Use filters.group | filters.channel to receive group/channel messages
            group_filter = filters.group | filters.channel
            handler = MessageHandler(handle_monitored_message, group_filter)
            
            # Register the handler
            client.add_handler(handler)
            self.message_handlers[phone] = handler
            
            import sys
            print(f"[TelegramClient] Registered handler for {phone}, monitoring chat IDs: {list(monitored_chat_ids)}", file=sys.stderr)
            
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"[監控] ✓ 已註冊消息處理器，監控 {len(monitored_chat_ids)} 個群組 (Chat IDs: {list(monitored_chat_ids)})",
                    "type": "success"
                })
            
            # Verify handler was registered
            if phone in self.message_handlers:
                handler = self.message_handlers[phone]
                print(f"[TelegramClient] Handler registered for {phone}, dispatcher is running: {dispatcher_running or True}", file=sys.stderr)
                
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] ✓ 客戶端已啟動並註冊處理器: {phone}",
                        "type": "success"
                    })
            else:
                print(f"[TelegramClient] WARNING: Handler not found in message_handlers for {phone}", file=sys.stderr)
                
        except Exception as start_error:
            error_str = str(start_error).lower()
            print(f"[TelegramClient] Error starting client for {phone}: {start_error}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            if self.event_callback:
                self.event_callback("log-entry", {
                    "message": f"[監控] ✗ 客戶端啟動失敗 ({phone}): {str(start_error)}",
                    "type": "error"
                })
            # 返回 False 表示監控啟動失敗
            return False
        
        # 返回 True 表示監控成功啟動
        return True
    
    async def disconnect_account(self, phone: str, graceful: bool = True):
        """Disconnect an account and properly release session file"""
        import sys
        if phone in self.clients:
            client = self.clients[phone]
            print(f"[TelegramClient] Disconnecting account {phone}...", file=sys.stderr)
            
            # Remove message handler before disconnecting
            if phone in self.message_handlers:
                try:
                    client.remove_handler(self.message_handlers[phone])
                    del self.message_handlers[phone]
                    if self.event_callback:
                        self.event_callback("log-entry", {
                            "message": f"[監控] 已移除消息處理器: {phone}",
                            "type": "info"
                        })
                except Exception as e:
                    print(f"[TelegramClient] Error removing handler on disconnect: {str(e)}", file=sys.stderr)
            
            # Clear monitoring info
            if hasattr(self, 'monitoring_info') and phone in self.monitoring_info:
                del self.monitoring_info[phone]
            
            # Clear keyword matcher
            if phone in self.keyword_matchers:
                del self.keyword_matchers[phone]
            
            # Clear login callbacks
            if phone in self.login_callbacks:
                del self.login_callbacks[phone]
            
            # Properly stop and disconnect the client to release session file
            try:
                if graceful:
                    # Try to stop gracefully first (this properly closes the session)
                    try:
                        if hasattr(client, 'stop') and client.is_connected:
                            await asyncio.wait_for(client.stop(), timeout=5.0)
                            print(f"[TelegramClient] Account {phone} stopped gracefully", file=sys.stderr)
                    except asyncio.TimeoutError:
                        print(f"[TelegramClient] Account {phone} stop timeout, forcing disconnect...", file=sys.stderr)
                    except Exception as e:
                        print(f"[TelegramClient] Error stopping client {phone}: {e}", file=sys.stderr)
                
                # Ensure disconnected
                if client.is_connected:
                    try:
                        await asyncio.wait_for(client.disconnect(), timeout=3.0)
                    except asyncio.TimeoutError:
                        print(f"[TelegramClient] Account {phone} disconnect timeout", file=sys.stderr)
                    except Exception as e:
                        print(f"[TelegramClient] Error disconnecting {phone}: {e}", file=sys.stderr)
                
                print(f"[TelegramClient] Account {phone} disconnected successfully", file=sys.stderr)
                
            except Exception as e:
                print(f"[TelegramClient] Error during disconnect of {phone}: {e}", file=sys.stderr)
            
            # Clean up client reference
            del self.clients[phone]
            self.client_status[phone] = "Offline"
            
            # Force garbage collection to release file handles
            gc.collect()
    
    async def disconnect_all(self, graceful: bool = True):
        """Disconnect all accounts and release all session files"""
        import sys
        print(f"[TelegramClient] Disconnecting all accounts ({len(self.clients)} clients)...", file=sys.stderr)
        
        for phone in list(self.clients.keys()):
            try:
                await self.disconnect_account(phone, graceful=graceful)
            except Exception as e:
                print(f"[TelegramClient] Error disconnecting {phone}: {e}", file=sys.stderr)
        
        # Clear all status
        self.client_status.clear()
        self.login_callbacks.clear()
        
        # Force garbage collection
        gc.collect()
        
        print(f"[TelegramClient] All accounts disconnected", file=sys.stderr)
    
    async def stop_monitoring(self, phone: str):
        """Stop monitoring for a specific account without disconnecting"""
        if phone not in self.clients:
            return
        
        client = self.clients[phone]
        
        # Remove message handler
        if phone in self.message_handlers:
            try:
                client.remove_handler(self.message_handlers[phone])
                del self.message_handlers[phone]
                if self.event_callback:
                    self.event_callback("log-entry", {
                        "message": f"[監控] 已停止監控並移除消息處理器: {phone}",
                        "type": "info"
                    })
            except Exception as e:
                import sys
                print(f"[TelegramClient] Error removing handler on stop_monitoring: {str(e)}", file=sys.stderr)
        
        # Clear monitoring info
        if hasattr(self, 'monitoring_info') and phone in self.monitoring_info:
            del self.monitoring_info[phone]
        
        # Clear keyword matcher
        if phone in self.keyword_matchers:
            del self.keyword_matchers[phone]
    
    async def stop_all_monitoring(self):
        """Stop monitoring for all accounts without disconnecting"""
        for phone in list(self.message_handlers.keys()):
            await self.stop_monitoring(phone)
    
    def get_client(self, phone: str) -> Optional[Client]:
        """Get a client by phone number"""
        return self.clients.get(phone)
    
    def get_status(self, phone: str) -> str:
        """Get account status"""
        return self.client_status.get(phone, "Offline")
    
    async def register_private_message_handler(self, phone: str, account_role: str = "Sender"):
        """
        為帳號註冊私信處理器
        
        Args:
            phone: 帳號電話
            account_role: 帳號角色 (Listener=監控帳號, Sender=發送帳號)
        """
        import sys
        
        if phone not in self.clients:
            print(f"[TelegramClient] 無法註冊私信處理器：找不到客戶端 {phone}", file=sys.stderr)
            return
        
        client = self.clients[phone]
        
        # 關鍵：確保客戶端完全啟動（dispatcher 運行中）才能接收私信
        # Pyrogram 的 connect() 只建立連接，start() 才會初始化 dispatcher
        dispatcher_running = False
        if hasattr(client, 'dispatcher') and client.dispatcher:
            dispatcher_running = True
        
        print(f"[TelegramClient] 註冊私信處理器: phone={phone}, connected={client.is_connected}, dispatcher_running={dispatcher_running}", file=sys.stderr)
        
        if not dispatcher_running:
            print(f"[TelegramClient] ⚠ Dispatcher 未運行，正在啟動客戶端 {phone}...", file=sys.stderr)
            try:
                # 如果已連接但 dispatcher 未運行，需要先斷開再 start()
                if client.is_connected:
                    print(f"[TelegramClient] 正在斷開現有連接...", file=sys.stderr)
                    try:
                        await client.disconnect()
                        await asyncio.sleep(0.5)
                    except Exception as disconnect_err:
                        print(f"[TelegramClient] 斷開連接錯誤: {disconnect_err}", file=sys.stderr)
                
                # 啟動客戶端（包含 dispatcher 初始化）
                await client.start()
                print(f"[TelegramClient] ✓ 客戶端 {phone} 已啟動，dispatcher 已初始化", file=sys.stderr)
            except Exception as start_err:
                error_str = str(start_err).lower()
                if 'already connected' in error_str:
                    # 如果已經連接，嘗試重新連接
                    print(f"[TelegramClient] 客戶端已連接，嘗試重新啟動...", file=sys.stderr)
                    try:
                        if hasattr(client, 'stop'):
                            try:
                                await client.stop()
                            except:
                                pass
                        await asyncio.sleep(0.5)
                        await client.start()
                        print(f"[TelegramClient] ✓ 重新啟動成功", file=sys.stderr)
                    except Exception as retry_err:
                        print(f"[TelegramClient] ✗ 重新啟動失敗: {retry_err}", file=sys.stderr)
                else:
                    print(f"[TelegramClient] ✗ 啟動客戶端錯誤: {start_err}", file=sys.stderr)
        
        # 設置事件回調
        private_message_handler.event_callback = self.event_callback
        
        # 註冊私信處理器
        await private_message_handler.register_handler(client, phone, account_role)
        print(f"[TelegramClient] ✓ 私信處理器已註冊: {phone}", file=sys.stderr)
    
    async def unregister_private_message_handler(self, phone: str):
        """移除帳號的私信處理器"""
        if phone not in self.clients:
            return
        
        client = self.clients[phone]
        await private_message_handler.unregister_handler(client, phone)


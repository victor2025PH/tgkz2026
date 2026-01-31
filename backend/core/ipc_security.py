"""
TG-Matrix IPC 通訊安全模組
Phase B: Security - 通訊安全

功能：
1. 消息簽名
2. 防重放攻擊
3. 時間戳驗證
4. 會話綁定
"""

import hashlib
import hmac
import secrets
import time
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from collections import OrderedDict
import threading

from .logging import get_logger

logger = get_logger("ipc_security")


@dataclass
class IPCSecurityConfig:
    """IPC 安全配置"""
    # 共享密鑰（生產環境應從安全存儲獲取）
    secret_key: str = ""
    # 時間戳容差（秒）
    timestamp_tolerance: int = 30
    # Nonce 過期時間（秒）
    nonce_expiry: int = 300
    # 最大 Nonce 緩存數量
    max_nonce_cache: int = 10000
    # 是否啟用簽名驗證
    verify_signatures: bool = True
    # 是否啟用防重放
    prevent_replay: bool = True


@dataclass
class SignedMessage:
    """簽名消息"""
    payload: Dict[str, Any]
    timestamp: float
    nonce: str
    signature: str
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "payload": self.payload,
            "timestamp": self.timestamp,
            "nonce": self.nonce,
            "signature": self.signature,
            "session_id": self.session_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SignedMessage':
        return cls(
            payload=data.get("payload", {}),
            timestamp=data.get("timestamp", 0),
            nonce=data.get("nonce", ""),
            signature=data.get("signature", ""),
            session_id=data.get("session_id")
        )


class NonceCache:
    """Nonce 緩存（防重放）"""
    
    def __init__(self, max_size: int = 10000, expiry_seconds: int = 300):
        self.max_size = max_size
        self.expiry_seconds = expiry_seconds
        self._cache: OrderedDict[str, float] = OrderedDict()
        self._lock = threading.Lock()
    
    def add(self, nonce: str) -> bool:
        """
        添加 nonce
        
        Returns:
            True 如果是新 nonce，False 如果已存在（可能是重放）
        """
        with self._lock:
            now = time.time()
            
            # 清理過期的 nonce
            self._cleanup(now)
            
            # 檢查是否已存在
            if nonce in self._cache:
                return False
            
            # 添加新 nonce
            self._cache[nonce] = now
            
            # 如果超出容量，移除最舊的
            while len(self._cache) > self.max_size:
                self._cache.popitem(last=False)
            
            return True
    
    def _cleanup(self, now: float):
        """清理過期的 nonce"""
        expired = []
        for nonce, timestamp in self._cache.items():
            if now - timestamp > self.expiry_seconds:
                expired.append(nonce)
            else:
                break  # OrderedDict 按插入順序，後面的都更新
        
        for nonce in expired:
            del self._cache[nonce]


class IPCSecurityService:
    """IPC 安全服務"""
    
    def __init__(self, config: Optional[IPCSecurityConfig] = None):
        self.config = config or IPCSecurityConfig()
        
        # 如果沒有提供密鑰，生成一個
        if not self.config.secret_key:
            self.config.secret_key = secrets.token_hex(32)
            logger.warning("Generated random secret key (should be persisted in production)")
        
        self._nonce_cache = NonceCache(
            max_size=self.config.max_nonce_cache,
            expiry_seconds=self.config.nonce_expiry
        )
        
        # 會話管理
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._session_lock = threading.Lock()
    
    def create_session(self, metadata: Optional[Dict[str, Any]] = None) -> str:
        """創建新會話"""
        session_id = secrets.token_hex(16)
        
        with self._session_lock:
            self._sessions[session_id] = {
                "created_at": time.time(),
                "last_activity": time.time(),
                "metadata": metadata or {}
            }
        
        logger.debug(f"Created session: {session_id[:8]}...")
        return session_id
    
    def validate_session(self, session_id: str) -> bool:
        """驗證會話"""
        with self._session_lock:
            session = self._sessions.get(session_id)
            if not session:
                return False
            
            # 更新最後活動時間
            session["last_activity"] = time.time()
            return True
    
    def end_session(self, session_id: str) -> bool:
        """結束會話"""
        with self._session_lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.debug(f"Ended session: {session_id[:8]}...")
                return True
            return False
    
    def sign_message(
        self,
        payload: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> SignedMessage:
        """
        簽名消息
        
        Args:
            payload: 消息內容
            session_id: 可選的會話 ID
        
        Returns:
            SignedMessage 對象
        """
        timestamp = time.time()
        nonce = secrets.token_hex(16)
        
        # 構建簽名數據
        sign_data = self._build_sign_data(payload, timestamp, nonce, session_id)
        
        # 計算 HMAC-SHA256 簽名
        signature = self._compute_signature(sign_data)
        
        return SignedMessage(
            payload=payload,
            timestamp=timestamp,
            nonce=nonce,
            signature=signature,
            session_id=session_id
        )
    
    def verify_message(self, message: SignedMessage) -> Tuple[bool, str]:
        """
        驗證消息
        
        Args:
            message: 簽名消息
        
        Returns:
            (是否有效, 錯誤消息)
        """
        # 1. 驗證時間戳
        if self.config.verify_signatures:
            now = time.time()
            if abs(now - message.timestamp) > self.config.timestamp_tolerance:
                return False, f"Timestamp out of tolerance (diff: {abs(now - message.timestamp):.1f}s)"
        
        # 2. 驗證 nonce（防重放）
        if self.config.prevent_replay:
            if not self._nonce_cache.add(message.nonce):
                return False, "Nonce already used (possible replay attack)"
        
        # 3. 驗證會話
        if message.session_id:
            if not self.validate_session(message.session_id):
                return False, "Invalid or expired session"
        
        # 4. 驗證簽名
        if self.config.verify_signatures:
            sign_data = self._build_sign_data(
                message.payload,
                message.timestamp,
                message.nonce,
                message.session_id
            )
            expected_signature = self._compute_signature(sign_data)
            
            if not hmac.compare_digest(message.signature, expected_signature):
                return False, "Invalid signature"
        
        return True, ""
    
    def wrap_command(
        self,
        command: str,
        payload: Any,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        包裝命令為安全消息
        
        Args:
            command: 命令名
            payload: 命令參數
            request_id: 請求 ID
            session_id: 會話 ID
        
        Returns:
            包裝後的消息
        """
        message_payload = {
            "command": command,
            "payload": payload,
            "request_id": request_id
        }
        
        signed = self.sign_message(message_payload, session_id)
        return signed.to_dict()
    
    def unwrap_command(
        self,
        message: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Any, Optional[str], str]:
        """
        解包安全消息
        
        Args:
            message: 包裝的消息
        
        Returns:
            (是否有效, 命令名, 參數, 請求ID, 錯誤消息)
        """
        try:
            signed = SignedMessage.from_dict(message)
        except Exception as e:
            return False, None, None, None, f"Invalid message format: {e}"
        
        # 驗證消息
        valid, error = self.verify_message(signed)
        if not valid:
            return False, None, None, None, error
        
        # 提取命令
        payload = signed.payload
        command = payload.get("command")
        cmd_payload = payload.get("payload")
        request_id = payload.get("request_id")
        
        return True, command, cmd_payload, request_id, ""
    
    def _build_sign_data(
        self,
        payload: Dict[str, Any],
        timestamp: float,
        nonce: str,
        session_id: Optional[str]
    ) -> str:
        """構建簽名數據"""
        # 按鍵排序的 JSON
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        
        parts = [
            payload_str,
            str(timestamp),
            nonce
        ]
        
        if session_id:
            parts.append(session_id)
        
        return "|".join(parts)
    
    def _compute_signature(self, data: str) -> str:
        """計算 HMAC-SHA256 簽名"""
        return hmac.new(
            self.config.secret_key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def cleanup_sessions(self, max_idle_seconds: int = 3600):
        """清理空閒會話"""
        now = time.time()
        expired = []
        
        with self._session_lock:
            for session_id, session in self._sessions.items():
                if now - session["last_activity"] > max_idle_seconds:
                    expired.append(session_id)
            
            for session_id in expired:
                del self._sessions[session_id]
        
        if expired:
            logger.info(f"Cleaned up {len(expired)} idle sessions")
        
        return len(expired)
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取安全統計"""
        with self._session_lock:
            session_count = len(self._sessions)
        
        return {
            "active_sessions": session_count,
            "nonce_cache_size": len(self._nonce_cache._cache),
            "config": {
                "verify_signatures": self.config.verify_signatures,
                "prevent_replay": self.config.prevent_replay,
                "timestamp_tolerance": self.config.timestamp_tolerance,
                "nonce_expiry": self.config.nonce_expiry
            }
        }


# 全局實例
_ipc_security: Optional[IPCSecurityService] = None


def init_ipc_security(config: Optional[IPCSecurityConfig] = None) -> IPCSecurityService:
    """初始化 IPC 安全服務"""
    global _ipc_security
    _ipc_security = IPCSecurityService(config)
    return _ipc_security


def get_ipc_security() -> Optional[IPCSecurityService]:
    """獲取 IPC 安全服務"""
    return _ipc_security


__all__ = [
    'IPCSecurityConfig',
    'SignedMessage',
    'NonceCache',
    'IPCSecurityService',
    'init_ipc_security',
    'get_ipc_security'
]

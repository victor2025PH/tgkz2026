"""
Telegram OAuth 認證服務

實現 Telegram Login Widget 的後端驗證邏輯

安全特性：
1. HMAC-SHA256 簽名驗證
2. 時間戳檢查（防重放攻擊）
3. 自動用戶創建/綁定

參考文檔：
https://core.telegram.org/widgets/login
"""

import hashlib
import hmac
import time
import logging
import os
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TelegramUser:
    """Telegram 用戶數據"""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int = 0
    hash: str = ""
    
    @property
    def full_name(self) -> str:
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name
    
    @property
    def display_name(self) -> str:
        """獲取顯示名稱：優先用戶名，其次全名"""
        return self.username or self.full_name
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'telegram_id': str(self.id),
            'first_name': self.first_name,
            'last_name': self.last_name,
            'username': self.username,
            'photo_url': self.photo_url,
            'auth_date': self.auth_date
        }


class TelegramOAuthService:
    """
    Telegram OAuth 服務
    
    使用方式：
    1. 前端集成 Telegram Login Widget
    2. Widget 回調後將數據發送到後端
    3. 後端使用此服務驗證數據並創建/綁定用戶
    """
    
    # 認證數據有效期（秒）- 防止重放攻擊
    AUTH_DATA_EXPIRY = 86400  # 24 小時
    
    def __init__(self, bot_token: Optional[str] = None):
        """
        初始化服務
        
        Args:
            bot_token: Telegram Bot Token，如果不提供則從環境變量讀取
        """
        self.bot_token = bot_token or os.environ.get('TELEGRAM_BOT_TOKEN', '')
        
        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not configured, OAuth will fail")
    
    def _get_secret_key(self) -> bytes:
        """
        生成用於驗證的密鑰
        
        根據 Telegram 文檔，密鑰是 bot_token 的 SHA256 哈希
        """
        return hashlib.sha256(self.bot_token.encode()).digest()
    
    def verify_auth_data(self, auth_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        驗證 Telegram 認證數據
        
        Args:
            auth_data: Telegram Widget 返回的數據，包含：
                - id: Telegram 用戶 ID
                - first_name: 名字
                - last_name: 姓氏（可選）
                - username: 用戶名（可選）
                - photo_url: 頭像 URL（可選）
                - auth_date: 認證時間戳
                - hash: HMAC-SHA256 簽名
        
        Returns:
            (is_valid, error_message) 元組
        """
        if not self.bot_token:
            return False, "Telegram OAuth 未配置"
        
        # 檢查必需字段
        required_fields = ['id', 'first_name', 'auth_date', 'hash']
        for field in required_fields:
            if field not in auth_data:
                return False, f"缺少必需字段: {field}"
        
        # 提取 hash
        received_hash = auth_data.get('hash', '')
        
        # 構建數據字符串（按字母順序排列，不包含 hash）
        data_check_arr = []
        for key in sorted(auth_data.keys()):
            if key != 'hash':
                data_check_arr.append(f"{key}={auth_data[key]}")
        
        data_check_string = '\n'.join(data_check_arr)
        
        # 計算 HMAC-SHA256
        secret_key = self._get_secret_key()
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # 比較哈希
        if not hmac.compare_digest(calculated_hash, received_hash):
            logger.warning(f"Telegram OAuth hash mismatch for user {auth_data.get('id')}")
            return False, "簽名驗證失敗"
        
        # 檢查時間戳（防重放攻擊）
        auth_date = int(auth_data.get('auth_date', 0))
        current_time = int(time.time())
        
        if current_time - auth_date > self.AUTH_DATA_EXPIRY:
            return False, "認證數據已過期，請重新登入"
        
        return True, None
    
    def parse_auth_data(self, auth_data: Dict[str, Any]) -> Optional[TelegramUser]:
        """
        解析認證數據為 TelegramUser 對象
        
        Args:
            auth_data: 已驗證的認證數據
        
        Returns:
            TelegramUser 對象，解析失敗返回 None
        """
        try:
            return TelegramUser(
                id=int(auth_data['id']),
                first_name=str(auth_data.get('first_name', '')),
                last_name=auth_data.get('last_name'),
                username=auth_data.get('username'),
                photo_url=auth_data.get('photo_url'),
                auth_date=int(auth_data.get('auth_date', 0)),
                hash=auth_data.get('hash', '')
            )
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse Telegram auth data: {e}")
            return None
    
    async def authenticate(self, auth_data: Dict[str, Any]) -> Tuple[bool, Optional[TelegramUser], Optional[str]]:
        """
        完整的認證流程
        
        Args:
            auth_data: Telegram Widget 返回的數據
        
        Returns:
            (success, telegram_user, error_message) 元組
        """
        # 1. 驗證數據
        is_valid, error = self.verify_auth_data(auth_data)
        if not is_valid:
            return False, None, error
        
        # 2. 解析用戶數據
        tg_user = self.parse_auth_data(auth_data)
        if not tg_user:
            return False, None, "無法解析用戶數據"
        
        logger.info(f"Telegram OAuth success for user: {tg_user.id} (@{tg_user.username})")
        
        return True, tg_user, None


# 全局服務實例
_telegram_oauth_service: Optional[TelegramOAuthService] = None


def get_telegram_oauth_service() -> TelegramOAuthService:
    """獲取全局 Telegram OAuth 服務實例"""
    global _telegram_oauth_service
    if _telegram_oauth_service is None:
        _telegram_oauth_service = TelegramOAuthService()
    return _telegram_oauth_service


def init_telegram_oauth(bot_token: str) -> TelegramOAuthService:
    """初始化 Telegram OAuth 服務"""
    global _telegram_oauth_service
    _telegram_oauth_service = TelegramOAuthService(bot_token)
    return _telegram_oauth_service

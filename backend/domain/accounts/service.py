"""
TG-Matrix Account Service
帳號服務 - 封裝帳號業務邏輯

職責:
- 帳號創建/刪除
- 登錄流程管理
- 狀態更新
- 健康度計算
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from core.logging import get_logger
from core.event_bus import get_event_bus, Events

logger = get_logger('AccountService')


class AccountStatus(Enum):
    """帳號狀態"""
    OFFLINE = 'Offline'
    ONLINE = 'Online'
    LOGGING_IN = 'Logging in...'
    WAITING_CODE = 'Waiting Code'
    WAITING_2FA = 'Waiting 2FA'
    BANNED = 'Banned'
    ERROR = 'Error'
    RESTING = 'Resting (Cooldown)'
    WARMING_UP = 'Warming Up'
    PROXY_ERROR = 'Proxy Error'


class AccountRole(Enum):
    """帳號角色"""
    UNASSIGNED = 'Unassigned'
    LISTENER = 'Listener'
    SENDER = 'Sender'


@dataclass
class Account:
    """帳號數據模型"""
    id: int
    phone: str
    status: AccountStatus
    role: AccountRole
    proxy: str = ''
    api_id: str = ''
    api_hash: str = ''
    daily_send_count: int = 0
    daily_send_limit: int = 50
    health_score: int = 100
    group: str = ''
    two_factor_password: str = ''
    
    # 擴展字段
    device_model: Optional[str] = None
    platform: Optional[str] = None
    ip_binding_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            'id': self.id,
            'phone': self.phone,
            'status': self.status.value,
            'role': self.role.value,
            'proxy': self.proxy,
            'apiId': self.api_id,
            'apiHash': self.api_hash,
            'dailySendCount': self.daily_send_count,
            'dailySendLimit': self.daily_send_limit,
            'healthScore': self.health_score,
            'group': self.group,
            'deviceModel': self.device_model,
            'platform': self.platform,
        }


class AccountService:
    """
    帳號服務
    
    提供帳號管理的核心業務邏輯
    """
    
    def __init__(self, database, telegram_manager):
        self.db = database
        self.telegram_manager = telegram_manager
        self.event_bus = get_event_bus()
    
    async def get_all_accounts(self) -> List[Dict[str, Any]]:
        """獲取所有帳號"""
        accounts = await self.db.get_all_accounts()
        return accounts
    
    async def get_account(self, phone: str) -> Optional[Dict[str, Any]]:
        """獲取單個帳號"""
        accounts = await self.db.get_all_accounts()
        for acc in accounts:
            if acc.get('phone') == phone:
                return acc
        return None
    
    async def add_account(
        self,
        phone: str,
        proxy: str = '',
        api_id: str = '',
        api_hash: str = '',
        role: str = 'Unassigned',
        **kwargs
    ) -> Dict[str, Any]:
        """
        添加新帳號
        
        Args:
            phone: 電話號碼
            proxy: 代理地址
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            role: 角色
        
        Returns:
            創建的帳號信息
        """
        logger.info('Adding account', phone=phone, role=role)
        
        # 驗證電話號碼格式
        if not phone.startswith('+'):
            phone = '+' + phone.lstrip('+')
        
        # 檢查是否已存在
        existing = await self.get_account(phone)
        if existing:
            raise ValueError(f"Account already exists: {phone}")
        
        # 創建帳號
        account_id = await self.db.add_account(
            phone=phone,
            proxy=proxy,
            api_id=api_id,
            api_hash=api_hash,
            role=role,
            status='Offline',
            **kwargs
        )
        
        account = {
            'id': account_id,
            'phone': phone,
            'status': 'Offline',
            'role': role,
            'proxy': proxy,
            'dailySendCount': 0,
            'dailySendLimit': 50,
            'healthScore': 100,
        }
        
        # 發布事件
        await self.event_bus.publish(Events.ACCOUNT_ADDED, {
            'account': account
        })
        
        logger.info('Account added successfully', phone=phone, account_id=account_id)
        return account
    
    async def remove_account(self, phone: str) -> bool:
        """
        刪除帳號
        
        Args:
            phone: 電話號碼
        
        Returns:
            是否成功
        """
        logger.info('Removing account', phone=phone)
        
        # 先斷開連接
        try:
            await self.telegram_manager.disconnect_client(phone)
        except Exception as e:
            logger.warning('Failed to disconnect before removal', phone=phone, error=str(e))
        
        # 從數據庫刪除
        await self.db.delete_account(phone)
        
        # 發布事件
        await self.event_bus.publish(Events.ACCOUNT_REMOVED, {
            'phone': phone
        })
        
        logger.info('Account removed', phone=phone)
        return True
    
    async def update_status(
        self,
        phone: str,
        status: str,
        **extra_fields
    ) -> None:
        """
        更新帳號狀態
        
        Args:
            phone: 電話號碼
            status: 新狀態
            **extra_fields: 額外更新的字段
        """
        await self.db.update_account_status(phone, status, **extra_fields)
        
        # 發布事件
        await self.event_bus.publish(Events.ACCOUNT_STATUS_CHANGED, {
            'phone': phone,
            'status': status,
            **extra_fields
        })
    
    async def update_health_score(self, phone: str, score: int) -> None:
        """更新健康分數"""
        await self.db.update_account_field(phone, 'health_score', score)
        
        await self.event_bus.publish(Events.ACCOUNT_HEALTH_UPDATED, {
            'phone': phone,
            'health_score': score
        })
    
    async def increment_send_count(self, phone: str) -> int:
        """增加發送計數，返回新計數"""
        account = await self.get_account(phone)
        if not account:
            return 0
        
        new_count = account.get('dailySendCount', 0) + 1
        await self.db.update_account_field(phone, 'daily_send_count', new_count)
        return new_count
    
    async def reset_daily_counts(self) -> int:
        """重置所有帳號的每日計數，返回重置數量"""
        accounts = await self.get_all_accounts()
        count = 0
        
        for acc in accounts:
            if acc.get('dailySendCount', 0) > 0:
                await self.db.update_account_field(acc['phone'], 'daily_send_count', 0)
                count += 1
        
        logger.info('Daily counts reset', count=count)
        return count
    
    async def get_online_senders(self) -> List[Dict[str, Any]]:
        """獲取所有在線的 Sender 帳號"""
        accounts = await self.get_all_accounts()
        return [
            acc for acc in accounts
            if acc.get('role') == 'Sender' and acc.get('status') == 'Online'
        ]
    
    async def get_online_listeners(self) -> List[Dict[str, Any]]:
        """獲取所有在線的 Listener 帳號"""
        accounts = await self.get_all_accounts()
        return [
            acc for acc in accounts
            if acc.get('role') == 'Listener' and acc.get('status') == 'Online'
        ]
    
    async def batch_update(
        self,
        phones: List[str],
        updates: Dict[str, Any]
    ) -> int:
        """
        批量更新帳號
        
        Args:
            phones: 電話號碼列表
            updates: 要更新的字段
        
        Returns:
            更新的帳號數量
        """
        count = 0
        for phone in phones:
            try:
                for field, value in updates.items():
                    await self.db.update_account_field(phone, field, value)
                count += 1
            except Exception as e:
                logger.error('Batch update failed for account', phone=phone, error=str(e))
        
        return count


# 全局服務實例
_account_service: Optional[AccountService] = None


def init_account_service(database, telegram_manager) -> AccountService:
    """初始化帳號服務"""
    global _account_service
    _account_service = AccountService(database, telegram_manager)
    return _account_service


def get_account_service() -> Optional[AccountService]:
    """獲取帳號服務實例"""
    return _account_service

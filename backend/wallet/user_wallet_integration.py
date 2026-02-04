"""
用戶錢包整合服務
User Wallet Integration Service

Phase 2.1: 自動為新用戶創建錢包
- 用戶註冊/登錄時自動初始化錢包
- 首次登錄贈送餘額（可配置）
- 錢包狀態與用戶狀態同步

Phase 2.4: 餘額不足預警系統
- 低餘額通知
- 消費前檢查

優化設計：
1. 與認證服務解耦，使用事件驅動
2. 支持新用戶贈送餘額
3. 異步處理不阻塞登錄
4. 錢包創建冪等性保證
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)

# 新用戶贈送配置
NEW_USER_BONUS_CONFIG = {
    'enabled': True,                    # 是否啟用新用戶贈送
    'bonus_amount': 100,                # 贈送金額（分）= $1.00
    'description': '新用戶註冊贈送',
    'valid_days': 365,                  # 贈送餘額有效期
}

# 低餘額預警配置
LOW_BALANCE_CONFIG = {
    'enabled': True,
    'threshold': 500,                   # 低於 $5.00 時預警
    'notify_on_consume': True,          # 消費後檢查並通知
    'recommended_recharge': [500, 1000, 2000],  # 推薦充值金額（分）
}


class WalletEvent(Enum):
    """錢包事件類型"""
    WALLET_CREATED = 'wallet_created'
    BONUS_GRANTED = 'bonus_granted'
    LOW_BALANCE = 'low_balance'
    BALANCE_DEPLETED = 'balance_depleted'
    CONSUME_SUCCESS = 'consume_success'
    CONSUME_FAILED = 'consume_failed'


class UserWalletIntegration:
    """用戶錢包整合服務"""
    
    def __init__(self):
        self._wallet_service = None
        self._notification_service = None
    
    @property
    def wallet_service(self):
        """延遲加載錢包服務"""
        if self._wallet_service is None:
            from .wallet_service import get_wallet_service
            self._wallet_service = get_wallet_service()
        return self._wallet_service
    
    @property
    def notification_service(self):
        """延遲加載通知服務"""
        if self._notification_service is None:
            try:
                from .notification_service import get_notification_service
                self._notification_service = get_notification_service()
            except Exception:
                self._notification_service = None
        return self._notification_service
    
    async def on_user_login(
        self, 
        user_id: str, 
        is_new_user: bool = False,
        user_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        用戶登錄時調用
        
        自動創建錢包（如果不存在）並處理新用戶贈送
        
        Args:
            user_id: 用戶ID
            is_new_user: 是否為新註冊用戶
            user_info: 用戶額外信息
            
        Returns:
            {
                'wallet_created': bool,
                'bonus_granted': bool,
                'bonus_amount': int,
                'wallet': dict
            }
        """
        result = {
            'wallet_created': False,
            'bonus_granted': False,
            'bonus_amount': 0,
            'wallet': None
        }
        
        try:
            # 1. 確保錢包存在
            wallet = self.wallet_service.get_wallet(user_id)
            
            if wallet is None:
                # 創建新錢包
                wallet = self.wallet_service.get_or_create_wallet(user_id)
                result['wallet_created'] = True
                logger.info(f"Created wallet for user {user_id}")
                
                # 發送錢包創建事件
                await self._emit_event(WalletEvent.WALLET_CREATED, user_id, {
                    'wallet_id': wallet.id
                })
            
            # 2. 新用戶贈送餘額
            if is_new_user and NEW_USER_BONUS_CONFIG['enabled']:
                bonus_amount = NEW_USER_BONUS_CONFIG['bonus_amount']
                
                if bonus_amount > 0:
                    success, message, transaction = self.wallet_service.add_balance(
                        user_id=user_id,
                        amount=0,  # 主餘額不變
                        bonus_amount=bonus_amount,
                        order_id=f"WELCOME_{user_id}_{datetime.now().strftime('%Y%m%d')}",
                        description=NEW_USER_BONUS_CONFIG['description'],
                        reference_id='new_user_bonus',
                        reference_type='system_bonus'
                    )
                    
                    if success:
                        result['bonus_granted'] = True
                        result['bonus_amount'] = bonus_amount
                        logger.info(f"Granted welcome bonus ${bonus_amount/100:.2f} to user {user_id}")
                        
                        await self._emit_event(WalletEvent.BONUS_GRANTED, user_id, {
                            'bonus_amount': bonus_amount,
                            'type': 'new_user'
                        })
            
            # 3. 獲取最新錢包狀態
            wallet = self.wallet_service.get_wallet(user_id)
            result['wallet'] = wallet.to_dict() if hasattr(wallet, 'to_dict') else {
                'id': wallet.id,
                'balance': wallet.balance,
                'bonus_balance': wallet.bonus_balance,
                'available_balance': wallet.available_balance,
                'status': wallet.status
            }
            
        except Exception as e:
            logger.error(f"User wallet integration error for {user_id}: {e}")
        
        return result
    
    async def on_user_register(
        self, 
        user_id: str,
        email: str = None,
        user_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        用戶註冊時調用
        
        創建錢包並發放註冊獎勵
        """
        return await self.on_user_login(
            user_id=user_id,
            is_new_user=True,
            user_info=user_info
        )
    
    async def check_balance_before_consume(
        self, 
        user_id: str, 
        amount: int
    ) -> Dict[str, Any]:
        """
        消費前餘額檢查
        
        Returns:
            {
                'sufficient': bool,
                'available': int,
                'shortfall': int,
                'recommended_recharge': list,
                'wallet_status': str
            }
        """
        wallet = self.wallet_service.get_wallet(user_id)
        
        if not wallet:
            return {
                'sufficient': False,
                'available': 0,
                'shortfall': amount,
                'recommended_recharge': LOW_BALANCE_CONFIG['recommended_recharge'],
                'wallet_status': 'not_found',
                'message': '請先充值'
            }
        
        if wallet.status != 'active':
            return {
                'sufficient': False,
                'available': wallet.available_balance,
                'shortfall': amount,
                'recommended_recharge': [],
                'wallet_status': wallet.status,
                'message': '錢包已凍結'
            }
        
        available = wallet.available_balance
        sufficient = available >= amount
        shortfall = max(0, amount - available)
        
        # 計算推薦充值金額
        recommended = []
        if not sufficient:
            for recharge in LOW_BALANCE_CONFIG['recommended_recharge']:
                if recharge >= shortfall:
                    recommended.append(recharge)
            # 如果都不夠，添加一個足夠的金額
            if not recommended or recommended[-1] < shortfall:
                recommended.append(((shortfall // 500) + 1) * 500)
        
        return {
            'sufficient': sufficient,
            'available': available,
            'available_display': f"${available / 100:.2f}",
            'shortfall': shortfall,
            'shortfall_display': f"${shortfall / 100:.2f}" if shortfall > 0 else "",
            'recommended_recharge': recommended[:3],
            'wallet_status': wallet.status,
            'message': '' if sufficient else f'餘額不足，還需 ${shortfall/100:.2f}'
        }
    
    async def on_consume_completed(
        self, 
        user_id: str, 
        amount: int,
        success: bool,
        category: str = None,
        details: Dict = None
    ):
        """
        消費完成後調用
        
        檢查餘額並發送低餘額預警
        """
        if not success:
            await self._emit_event(WalletEvent.CONSUME_FAILED, user_id, {
                'amount': amount,
                'category': category,
                'details': details
            })
            return
        
        await self._emit_event(WalletEvent.CONSUME_SUCCESS, user_id, {
            'amount': amount,
            'category': category
        })
        
        # 檢查餘額
        if LOW_BALANCE_CONFIG['enabled'] and LOW_BALANCE_CONFIG['notify_on_consume']:
            wallet = self.wallet_service.get_wallet(user_id)
            if wallet:
                available = wallet.available_balance
                
                if available <= 0:
                    await self._emit_event(WalletEvent.BALANCE_DEPLETED, user_id, {
                        'balance': available
                    })
                    await self._send_low_balance_notification(
                        user_id, available, 'depleted'
                    )
                elif available < LOW_BALANCE_CONFIG['threshold']:
                    await self._emit_event(WalletEvent.LOW_BALANCE, user_id, {
                        'balance': available,
                        'threshold': LOW_BALANCE_CONFIG['threshold']
                    })
                    await self._send_low_balance_notification(
                        user_id, available, 'low'
                    )
    
    async def _send_low_balance_notification(
        self, 
        user_id: str, 
        balance: int, 
        level: str
    ):
        """發送低餘額通知"""
        if self.notification_service:
            try:
                if level == 'depleted':
                    message = f"您的錢包餘額已用盡，請及時充值以繼續使用服務。"
                else:
                    message = f"您的錢包餘額不足 ${LOW_BALANCE_CONFIG['threshold']/100:.2f}，建議及時充值。"
                
                await self.notification_service.send_notification(
                    user_id=user_id,
                    type='low_balance',
                    title='餘額不足提醒',
                    message=message,
                    data={
                        'balance': balance,
                        'balance_display': f"${balance/100:.2f}",
                        'recommended_recharge': LOW_BALANCE_CONFIG['recommended_recharge']
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to send low balance notification: {e}")
    
    async def _emit_event(
        self, 
        event: WalletEvent, 
        user_id: str, 
        data: Dict = None
    ):
        """發送錢包事件"""
        try:
            if self.notification_service:
                await self.notification_service.broadcast_to_user(
                    user_id=user_id,
                    event_type=event.value,
                    data=data or {}
                )
        except Exception as e:
            logger.debug(f"Event emission skipped: {e}")
    
    def get_wallet_summary(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶錢包摘要"""
        wallet = self.wallet_service.get_or_create_wallet(user_id)
        stats = self.wallet_service.get_statistics(user_id)
        
        return {
            'wallet': {
                'id': wallet.id,
                'balance': wallet.balance,
                'balance_display': wallet.balance_display,
                'bonus_balance': wallet.bonus_balance,
                'bonus_display': wallet.bonus_display,
                'frozen_balance': wallet.frozen_balance,
                'available_balance': wallet.available_balance,
                'total_display': wallet.total_display,
                'status': wallet.status,
                'currency': wallet.currency
            },
            'statistics': stats,
            'low_balance_warning': wallet.available_balance < LOW_BALANCE_CONFIG['threshold']
        }


# ==================== 全局實例 ====================

_integration_service: Optional[UserWalletIntegration] = None


def get_user_wallet_integration() -> UserWalletIntegration:
    """獲取用戶錢包整合服務實例"""
    global _integration_service
    if _integration_service is None:
        _integration_service = UserWalletIntegration()
    return _integration_service


# ==================== 便捷函數 ====================

async def ensure_user_wallet(user_id: str, is_new_user: bool = False) -> Dict[str, Any]:
    """確保用戶錢包存在（便捷函數）"""
    service = get_user_wallet_integration()
    return await service.on_user_login(user_id, is_new_user)


async def check_user_balance(user_id: str, amount: int) -> Dict[str, Any]:
    """檢查用戶餘額（便捷函數）"""
    service = get_user_wallet_integration()
    return await service.check_balance_before_consume(user_id, amount)

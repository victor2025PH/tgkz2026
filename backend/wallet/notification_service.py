"""
錢包通知服務
Wallet Notification Service

處理錢包相關的即時通知：
1. 充值到賬通知
2. 大額消費通知
3. 餘額不足提醒
4. 異常告警
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """通知類型"""
    RECHARGE_SUCCESS = "recharge_success"       # 充值到賬
    RECHARGE_PENDING = "recharge_pending"       # 充值等待確認
    CONSUME_SUCCESS = "consume_success"         # 消費成功
    REFUND_SUCCESS = "refund_success"           # 退款成功
    BALANCE_LOW = "balance_low"                 # 餘額不足
    WALLET_FROZEN = "wallet_frozen"             # 錢包凍結
    WALLET_UNFROZEN = "wallet_unfrozen"         # 錢包解凍


@dataclass
class WalletNotification:
    """錢包通知"""
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[Dict] = None
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "data": self.data,
            "created_at": self.created_at
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class WalletNotificationService:
    """錢包通知服務"""
    
    def __init__(self):
        # 用戶 WebSocket 連接映射
        self._user_connections: Dict[str, Set] = {}
        # 通知隊列
        self._notification_queue: asyncio.Queue = asyncio.Queue()
        # 通知處理任務
        self._processor_task: Optional[asyncio.Task] = None
        # 運行狀態
        self._running = False
    
    async def start(self):
        """啟動通知服務"""
        if self._running:
            return
        
        self._running = True
        self._processor_task = asyncio.create_task(self._process_notifications())
        logger.info("Wallet notification service started")
    
    async def stop(self):
        """停止通知服務"""
        self._running = False
        
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Wallet notification service stopped")
    
    def register_connection(self, user_id: str, websocket):
        """註冊用戶 WebSocket 連接"""
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        
        self._user_connections[user_id].add(websocket)
        logger.debug(f"User {user_id} WebSocket registered")
    
    def unregister_connection(self, user_id: str, websocket):
        """取消註冊用戶 WebSocket 連接"""
        if user_id in self._user_connections:
            self._user_connections[user_id].discard(websocket)
            
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
        
        logger.debug(f"User {user_id} WebSocket unregistered")
    
    async def send_notification(self, notification: WalletNotification):
        """發送通知"""
        await self._notification_queue.put(notification)
    
    async def _process_notifications(self):
        """處理通知隊列"""
        while self._running:
            try:
                notification = await asyncio.wait_for(
                    self._notification_queue.get(),
                    timeout=1.0
                )
                
                await self._deliver_notification(notification)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Process notification error: {e}")
    
    async def _deliver_notification(self, notification: WalletNotification):
        """投遞通知到 WebSocket"""
        user_id = notification.user_id
        
        if user_id not in self._user_connections:
            logger.debug(f"User {user_id} not connected, notification queued")
            return
        
        connections = self._user_connections[user_id].copy()
        message = json.dumps({
            "type": "wallet_notification",
            "payload": notification.to_dict()
        }, ensure_ascii=False)
        
        for ws in connections:
            try:
                await ws.send_str(message)
                logger.debug(f"Notification sent to user {user_id}")
            except Exception as e:
                logger.warning(f"Send notification error: {e}")
                self.unregister_connection(user_id, ws)
    
    # ==================== 快捷通知方法 ====================
    
    async def notify_recharge_success(
        self,
        user_id: str,
        order_no: str,
        amount: int,
        bonus_amount: int = 0
    ):
        """通知充值成功"""
        total = amount + bonus_amount
        bonus_text = f"（含贈送 ${bonus_amount/100:.2f}）" if bonus_amount > 0 else ""
        
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.RECHARGE_SUCCESS.value,
            title="充值到賬",
            message=f"您的充值 ${amount/100:.2f} 已到賬{bonus_text}",
            data={
                "order_no": order_no,
                "amount": amount,
                "bonus_amount": bonus_amount,
                "total": total
            }
        ))
    
    async def notify_recharge_pending(
        self,
        user_id: str,
        order_no: str,
        amount: int
    ):
        """通知充值待確認"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.RECHARGE_PENDING.value,
            title="充值處理中",
            message=f"您的充值 ${amount/100:.2f} 正在確認中，請稍候",
            data={
                "order_no": order_no,
                "amount": amount
            }
        ))
    
    async def notify_consume_success(
        self,
        user_id: str,
        order_id: str,
        amount: int,
        description: str
    ):
        """通知消費成功"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.CONSUME_SUCCESS.value,
            title="消費成功",
            message=f"{description}，扣款 ${amount/100:.2f}",
            data={
                "order_id": order_id,
                "amount": amount,
                "description": description
            }
        ))
    
    async def notify_refund_success(
        self,
        user_id: str,
        order_id: str,
        amount: int,
        reason: str = ""
    ):
        """通知退款成功"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.REFUND_SUCCESS.value,
            title="退款到賬",
            message=f"退款 ${amount/100:.2f} 已到賬" + (f"（{reason}）" if reason else ""),
            data={
                "order_id": order_id,
                "amount": amount,
                "reason": reason
            }
        ))
    
    async def notify_balance_low(
        self,
        user_id: str,
        balance: int,
        threshold: int = 1000  # 默認 $10
    ):
        """通知餘額不足"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.BALANCE_LOW.value,
            title="餘額提醒",
            message=f"您的餘額僅剩 ${balance/100:.2f}，建議及時充值",
            data={
                "balance": balance,
                "threshold": threshold
            }
        ))
    
    async def notify_wallet_frozen(
        self,
        user_id: str,
        reason: str = ""
    ):
        """通知錢包凍結"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.WALLET_FROZEN.value,
            title="錢包已凍結",
            message="您的錢包已被凍結，如有疑問請聯繫客服",
            data={
                "reason": reason
            }
        ))
    
    async def notify_wallet_unfrozen(
        self,
        user_id: str
    ):
        """通知錢包解凍"""
        await self.send_notification(WalletNotification(
            user_id=user_id,
            type=NotificationType.WALLET_UNFROZEN.value,
            title="錢包已解凍",
            message="您的錢包已恢復正常",
            data={}
        ))


# ==================== 全局實例 ====================

_notification_service: Optional[WalletNotificationService] = None


def get_notification_service() -> WalletNotificationService:
    """獲取通知服務實例"""
    global _notification_service
    if _notification_service is None:
        _notification_service = WalletNotificationService()
    return _notification_service


async def start_notification_service():
    """啟動通知服務"""
    service = get_notification_service()
    await service.start()


async def stop_notification_service():
    """停止通知服務"""
    service = get_notification_service()
    await service.stop()

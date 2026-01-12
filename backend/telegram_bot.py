"""
TG-AI智控王 Telegram 通知機器人
用於發送系統通知到管理員 Telegram
"""

import aiohttp
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TelegramNotifier:
    """Telegram 通知發送器"""
    
    def __init__(self, bot_token: str = None, chat_id: str = None):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}" if bot_token else None
        self.enabled = bool(bot_token and chat_id)
    
    def configure(self, bot_token: str, chat_id: str):
        """配置機器人"""
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.enabled = bool(bot_token and chat_id)
    
    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """發送消息"""
        if not self.enabled:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/sendMessage"
                data = {
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": parse_mode
                }
                async with session.post(url, json=data, timeout=10) as response:
                    result = await response.json()
                    if result.get("ok"):
                        return True
                    else:
                        logger.error(f"Telegram send failed: {result}")
                        return False
        except Exception as e:
            logger.error(f"Telegram send error: {e}")
            return False
    
    async def notify_new_user(self, email: str, level: str, invite_code: str = None):
        """新用戶註冊通知"""
        text = f"""
🆕 <b>新用戶註冊</b>

📧 郵箱: <code>{email}</code>
🎖️ 等級: {level}
"""
        if invite_code:
            text += f"🎁 邀請碼: <code>{invite_code}</code>\n"
        
        await self.send_message(text)
    
    async def notify_new_payment(self, order_id: str, user_email: str, product: str, 
                                  amount: float, payment_method: str):
        """新支付通知"""
        text = f"""
💰 <b>新訂單支付成功</b>

🆔 訂單號: <code>{order_id}</code>
👤 用戶: {user_email}
📦 產品: {product}
💵 金額: ¥{amount}
💳 支付方式: {payment_method}
"""
        await self.send_message(text)
    
    async def notify_license_activated(self, license_key: str, user_email: str, 
                                        level: str, expires_at: str):
        """卡密激活通知"""
        text = f"""
🎟️ <b>卡密激活成功</b>

🔑 卡密: <code>{license_key[:20]}...</code>
👤 用戶: {user_email}
🎖️ 等級: {level}
📅 到期: {expires_at[:10] if expires_at else '終身'}
"""
        await self.send_message(text)
    
    async def notify_admin_login(self, username: str, ip: str):
        """管理員登錄通知"""
        text = f"""
🔐 <b>管理員登錄</b>

👤 用戶: <code>{username}</code>
🌐 IP: <code>{ip}</code>
"""
        await self.send_message(text)
    
    async def notify_suspicious_activity(self, activity_type: str, details: str):
        """可疑活動警報"""
        text = f"""
⚠️ <b>可疑活動警報</b>

📌 類型: {activity_type}
📝 詳情: {details}
"""
        await self.send_message(text)
    
    async def notify_daily_summary(self, stats: dict):
        """每日摘要"""
        text = f"""
📊 <b>每日運營摘要</b>

👥 新用戶: {stats.get('new_users', 0)}
💰 今日收入: ¥{stats.get('today_revenue', 0)}
🎟️ 激活卡密: {stats.get('activated_licenses', 0)}
📈 活躍用戶: {stats.get('active_users', 0)}
💳 訂單數: {stats.get('orders', 0)}
"""
        await self.send_message(text)
    
    async def notify_expiring_users(self, count: int, users: list):
        """即將過期用戶提醒"""
        text = f"""
⏰ <b>會員即將過期提醒</b>

📊 3天內過期: {count} 人

"""
        for user in users[:5]:  # 最多顯示5個
            text += f"• {user['email']} ({user['days_left']}天)\n"
        
        if count > 5:
            text += f"\n... 還有 {count - 5} 人"
        
        await self.send_message(text)
    
    async def test_connection(self) -> bool:
        """測試連接"""
        if not self.enabled:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/getMe"
                async with session.get(url, timeout=10) as response:
                    result = await response.json()
                    return result.get("ok", False)
        except Exception as e:
            logger.error(f"Telegram test error: {e}")
            return False


# 全局通知器實例
notifier = TelegramNotifier()


def configure_telegram(bot_token: str, chat_id: str):
    """配置 Telegram 通知"""
    global notifier
    notifier.configure(bot_token, chat_id)


async def send_notification(text: str) -> bool:
    """發送通知"""
    return await notifier.send_message(text)

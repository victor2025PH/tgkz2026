"""
Telegram Bot 命令處理器

處理 Deep Link 登入確認：
- /start login_xxx - 確認登入
- /login - 獲取登入連結
- /help - 幫助信息

安全特性：
1. Token 驗證
2. 一次性確認
3. 過期檢查
"""

import os
import logging
import aiohttp
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class TelegramBotHandler:
    """
    Telegram Bot 處理器
    
    處理來自 Telegram 的 Webhook 回調或輪詢消息
    """
    
    def __init__(self, bot_token: Optional[str] = None):
        """初始化 Bot 處理器"""
        self.bot_token = bot_token or os.environ.get('TELEGRAM_BOT_TOKEN', '')
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}"
        
        # 內部 API 地址（用於確認登入）
        self.internal_api = os.environ.get('INTERNAL_API_URL', 'http://localhost:8000')
        
        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not configured")
    
    async def handle_update(self, update: Dict[str, Any]) -> Optional[str]:
        """
        處理 Telegram Update
        
        Args:
            update: Telegram Update 對象
        
        Returns:
            回覆消息（如果有）
        """
        message = update.get('message', {})
        callback_query = update.get('callback_query')
        
        if message:
            return await self._handle_message(message)
        elif callback_query:
            return await self._handle_callback(callback_query)
        
        return None
    
    async def _handle_message(self, message: Dict[str, Any]) -> Optional[str]:
        """處理普通消息"""
        text = message.get('text', '')
        chat_id = message.get('chat', {}).get('id')
        user = message.get('from', {})
        
        if not text or not chat_id:
            return None
        
        # /start 命令
        if text.startswith('/start'):
            parts = text.split(' ', 1)
            if len(parts) > 1 and parts[1].startswith('login_'):
                # Deep Link 登入
                token = parts[1][6:]  # 移除 "login_" 前綴
                return await self._handle_login_confirm(chat_id, user, token)
            else:
                # 普通 /start
                return await self._send_welcome(chat_id, user)
        
        # /login 命令
        elif text.startswith('/login'):
            return await self._send_login_info(chat_id, user)
        
        # /help 命令
        elif text.startswith('/help'):
            return await self._send_help(chat_id)
        
        return None
    
    async def _handle_callback(self, callback: Dict[str, Any]) -> Optional[str]:
        """處理回調查詢（內聯按鈕點擊）"""
        data = callback.get('data', '')
        chat_id = callback.get('message', {}).get('chat', {}).get('id')
        user = callback.get('from', {})
        callback_id = callback.get('id')
        
        # 確認登入按鈕
        if data.startswith('confirm_login_'):
            token = data[14:]  # 移除 "confirm_login_" 前綴
            result = await self._confirm_login(token, user)
            
            # 回應回調
            await self._answer_callback(callback_id, result['message'])
            
            if result['success']:
                await self._send_message(chat_id, "✅ 登入成功！您現在可以關閉此對話並返回網頁。")
            else:
                await self._send_message(chat_id, f"❌ {result['message']}")
            
            return result['message']
        
        # 取消登入按鈕
        elif data.startswith('cancel_login_'):
            await self._answer_callback(callback_id, "已取消")
            await self._send_message(chat_id, "已取消登入請求。")
            return "已取消"
        
        return None
    
    async def _handle_login_confirm(
        self, 
        chat_id: int, 
        user: Dict[str, Any], 
        token: str
    ) -> str:
        """
        處理 Deep Link 登入確認
        
        Args:
            chat_id: 對話 ID
            user: Telegram 用戶信息
            token: 登入 Token
        """
        user_name = user.get('first_name', 'User')
        
        # 發送確認請求（帶按鈕）
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ 確認登入", "callback_data": f"confirm_login_{token}"},
                    {"text": "❌ 取消", "callback_data": f"cancel_login_{token}"}
                ]
            ]
        }
        
        message = f"""
👋 *{user_name}，您好！*

您正在嘗試登入 *TG-AI智控王*

🔐 如果這是您發起的登入請求，請點擊下方「確認登入」按鈕。

⚠️ 如果您沒有發起此請求，請點擊「取消」並忽略此消息。
"""
        
        await self._send_message(
            chat_id, 
            message, 
            reply_markup=keyboard,
            parse_mode="Markdown"
        )
        
        return "登入確認請求已發送"
    
    async def _confirm_login(self, token: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        確認登入 Token
        
        調用內部 API 確認登入
        """
        try:
            # 獲取 Bot 密鑰（用於 API 驗證）
            bot_secret = self.bot_token.split(':')[-1][:16] if self.bot_token else ''
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.internal_api}/api/v1/auth/login-token/{token}/confirm",
                    json={
                        'bot_secret': bot_secret,
                        'telegram_id': str(user.get('id', '')),
                        'telegram_username': user.get('username', ''),
                        'telegram_first_name': user.get('first_name', '')
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    
                    if result.get('success'):
                        logger.info(f"Login confirmed for TG user {user.get('id')}")
                        return {'success': True, 'message': '登入成功！'}
                    else:
                        return {'success': False, 'message': result.get('error', '確認失敗')}
        
        except Exception as e:
            logger.error(f"Confirm login error: {e}")
            return {'success': False, 'message': f'系統錯誤: {str(e)}'}
    
    async def _send_welcome(self, chat_id: int, user: Dict[str, Any]) -> str:
        """發送歡迎消息"""
        user_name = user.get('first_name', 'User')
        
        message = f"""
👋 *歡迎使用 TG-AI智控王！*

{user_name}，您好！

這個 Bot 用於網頁登入驗證。

🔗 如需登入，請在網頁點擊「打開 Telegram 登入」按鈕，然後在此確認。

📖 可用命令：
/login - 獲取登入說明
/help - 幫助信息
"""
        
        await self._send_message(chat_id, message, parse_mode="Markdown")
        return "歡迎消息已發送"
    
    async def _send_login_info(self, chat_id: int, user: Dict[str, Any]) -> str:
        """發送登入信息"""
        message = """
🔐 *如何登入 TG-AI智控王*

1️⃣ 打開網頁 https://tgw.usdt2026.cc
2️⃣ 點擊「打開 Telegram 登入」按鈕
3️⃣ 會自動跳轉到這裡
4️⃣ 點擊「確認登入」按鈕

完成！🎉
"""
        
        await self._send_message(chat_id, message, parse_mode="Markdown")
        return "登入信息已發送"
    
    async def _send_help(self, chat_id: int) -> str:
        """發送幫助信息"""
        message = """
📖 *幫助中心*

*可用命令：*
/start - 開始使用
/login - 登入說明
/help - 顯示此幫助

*關於 TG-AI智控王*
智能 Telegram 營銷自動化平台

🌐 官網: https://tgw.usdt2026.cc
📧 支持: support@usdt2026.cc
"""
        
        await self._send_message(chat_id, message, parse_mode="Markdown")
        return "幫助信息已發送"
    
    async def _send_message(
        self, 
        chat_id: int, 
        text: str, 
        reply_markup: Dict = None,
        parse_mode: str = None
    ) -> bool:
        """發送消息到 Telegram"""
        try:
            payload = {
                'chat_id': chat_id,
                'text': text
            }
            
            if reply_markup:
                payload['reply_markup'] = reply_markup
            
            if parse_mode:
                payload['parse_mode'] = parse_mode
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/sendMessage",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    return result.get('ok', False)
        
        except Exception as e:
            logger.error(f"Send message error: {e}")
            return False
    
    async def _answer_callback(self, callback_id: str, text: str) -> bool:
        """回應回調查詢"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/answerCallbackQuery",
                    json={
                        'callback_query_id': callback_id,
                        'text': text
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    return result.get('ok', False)
        
        except Exception as e:
            logger.error(f"Answer callback error: {e}")
            return False


# Webhook 處理端點（添加到 http_server.py）
async def handle_telegram_webhook(request):
    """
    處理 Telegram Webhook 回調
    
    在 http_server.py 中添加:
    self.app.router.add_post('/webhook/telegram', handle_telegram_webhook)
    """
    try:
        update = await request.json()
        handler = TelegramBotHandler()
        await handler.handle_update(update)
        return web.json_response({'ok': True})
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.json_response({'ok': False, 'error': str(e)})


# 全局處理器實例
_bot_handler: Optional[TelegramBotHandler] = None


def get_bot_handler() -> TelegramBotHandler:
    """獲取全局 Bot 處理器實例"""
    global _bot_handler
    if _bot_handler is None:
        _bot_handler = TelegramBotHandler()
    return _bot_handler

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

Phase 3 優化：
1. 多語言支持（根據用戶語言設置）
"""

import json
import os
import asyncio
import logging
import time
import aiohttp
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# 同一 (chat_id, token_prefix) 在 60s 內只發送一次「登錄失敗」，避免 Telegram 重複推送導致連刷多條
_LOGIN_FAILED_SENT: Dict[Tuple[int, str], float] = {}
# 同一 chat_id 在 60s 內只允許發送一條登錄失敗（不論 token），避免 6 條連發
_LOGIN_FAILED_CHAT_SENT: Dict[int, float] = {}
_LOGIN_FAILED_DEDUPE_SEC = 60

# 後端返回 HTML（如 502/504 錯誤頁）時向用戶顯示的錯誤文案
SERVER_ERROR_USER_MESSAGE = '服务器内部错误'


# ==================== 🆕 Phase 3: 多語言消息模板 ====================

BOT_MESSAGES = {
    'zh-hant': {  # 繁體中文（默認）
        'welcome': '👋 歡迎使用 TG-Matrix！\n\n我是您的智能營銷助手。',
        'welcome_features': '🚀 **主要功能**\n• 智能群組管理\n• AI 營銷內容生成\n• 自動化工作流程',
        'login_confirm_title': '🔐 登入確認',
        'login_confirm_desc': '您正在請求登入 TG-Matrix 後台',
        'login_confirm_info': '📍 瀏覽器: {user_agent}\n⏰ 時間: {time}',
        'login_confirm_warning': '⚠️ 如果這不是您的操作，請忽略此消息',
        'login_confirm_btn': '✅ 確認登入',
        'login_cancel_btn': '❌ 取消',
        'login_success': '✅ 登入成功！\n\n您已成功登入 TG-Matrix 後台，瀏覽器頁面將自動跳轉。\n\n👋 歡迎使用 TG 智控王！您可以使用：\n• 群組管理 — 多群統一管理與監控\n• AI 營銷 — 智能生成與投放內容\n• 任務自動化 — 定時與觸發規則',
        'login_failed': '❌ 登入失敗\n\n{error}\n\n請重新嘗試或聯繫客服。',
        'login_expired': '⏰ 登入請求已過期\n\n請返回網頁重新發起登入。',
        'login_already_done': '您已登入，無需重複操作。',
        'login_error_generic': '登錄請求無效或已使用，請返回網頁重新嘗試。',
        'login_token_not_found': '此二維碼不是由當前服務器生成。請在登錄頁選擇「使用服務器登錄」並填寫本服務器地址後重新生成二維碼。',
        'login_cancelled': '❌ 已取消登入',
        'help_title': '📖 幫助信息',
        'help_commands': '🔹 /start - 開始使用\n🔹 /login - 獲取登入連結\n🔹 /help - 查看幫助',
        'login_link': '🔗 登入連結\n\n請訪問以下地址進行登入：\n{url}'
    },
    'zh-hans': {  # 简体中文
        'welcome': '👋 欢迎使用 TG-Matrix！\n\n我是您的智能营销助手。',
        'welcome_features': '🚀 **主要功能**\n• 智能群组管理\n• AI 营销内容生成\n• 自动化工作流程',
        'login_confirm_title': '🔐 登录确认',
        'login_confirm_desc': '您正在请求登录 TG-Matrix 后台',
        'login_confirm_info': '📍 浏览器: {user_agent}\n⏰ 时间: {time}',
        'login_confirm_warning': '⚠️ 如果这不是您的操作，请忽略此消息',
        'login_confirm_btn': '✅ 确认登录',
        'login_cancel_btn': '❌ 取消',
        'login_success': '✅ 登录成功！\n\n您已成功登录 TG-Matrix 后台，浏览器页面将自动跳转。\n\n👋 欢迎使用 TG 智控王！您可以使用：\n• 群组管理 — 多群统一管理与监控\n• AI 营销 — 智能生成与投放内容\n• 任务自动化 — 定时与触发规则',
        'login_failed': '❌ 登录失败\n\n{error}\n\n请重新尝试或联系客服。',
        'login_expired': '⏰ 登录请求已过期\n\n请返回网页重新发起登录。',
        'login_already_done': '您已登录，无需重复操作。',
        'login_error_generic': '登录请求无效或已使用，请返回网页重新尝试。',
        'login_token_not_found': '此二维码不是由当前服务器生成。请在登录页选择「使用服务器登录」并填写本服务器地址后重新生成二维码。',
        'login_cancelled': '❌ 已取消登录',
        'help_title': '📖 帮助信息',
        'help_commands': '🔹 /start - 开始使用\n🔹 /login - 获取登录链接\n🔹 /help - 查看帮助',
        'login_link': '🔗 登录链接\n\n请访问以下地址进行登录：\n{url}'
    },
    'en': {  # 英文
        'welcome': '👋 Welcome to TG-Matrix!\n\nI\'m your intelligent marketing assistant.',
        'welcome_features': '🚀 **Key Features**\n• Smart group management\n• AI content generation\n• Workflow automation',
        'login_confirm_title': '🔐 Login Confirmation',
        'login_confirm_desc': 'You are requesting to log in to TG-Matrix dashboard',
        'login_confirm_info': '📍 Browser: {user_agent}\n⏰ Time: {time}',
        'login_confirm_warning': '⚠️ If this wasn\'t you, please ignore this message',
        'login_confirm_btn': '✅ Confirm Login',
        'login_cancel_btn': '❌ Cancel',
        'login_success': '✅ Login successful!\n\nYou have logged in to TG-Matrix. The browser page will redirect automatically.\n\n👋 Welcome to TG Smart Controller! You can use:\n• Group management — multi-group control and monitoring\n• AI marketing — smart content generation and delivery\n• Task automation — scheduling and trigger rules',
        'login_failed': '❌ Login Failed\n\n{error}\n\nPlease try again or contact support.',
        'login_expired': '⏰ Login Request Expired\n\nPlease go back to the website and try again.',
        'login_already_done': 'You are already logged in. No need to try again.',
        'login_error_generic': 'Login request invalid or already used. Please try again from the website.',
        'login_token_not_found': 'This QR code was not generated by this server. On the login page, use "Use server login" and enter this server URL, then generate a new QR code.',
        'login_cancelled': '❌ Login Cancelled',
        'help_title': '📖 Help',
        'help_commands': '🔹 /start - Get started\n🔹 /login - Get login link\n🔹 /help - View help',
        'login_link': '🔗 Login Link\n\nPlease visit the following URL to log in:\n{url}'
    }
}


def get_user_language(user: Dict[str, Any]) -> str:
    """
    根據用戶的 Telegram 語言設置獲取語言代碼
    
    優先級：
    1. 用戶的 language_code
    2. 繁體中文（默認）
    """
    lang_code = user.get('language_code', '').lower()
    
    if lang_code.startswith('zh'):
        # 中文用戶
        if 'tw' in lang_code or 'hk' in lang_code or 'hant' in lang_code:
            return 'zh-hant'
        else:
            return 'zh-hans'
    elif lang_code.startswith('en'):
        return 'en'
    else:
        # 其他語言暫時使用英文
        return 'en' if lang_code else 'zh-hant'


def get_message(key: str, user: Dict[str, Any] = None, **kwargs) -> str:
    """
    獲取本地化消息
    
    Args:
        key: 消息鍵
        user: Telegram 用戶對象（用於獲取語言）
        **kwargs: 消息格式化參數
    """
    lang = get_user_language(user) if user else 'zh-hant'
    messages = BOT_MESSAGES.get(lang, BOT_MESSAGES['zh-hant'])
    template = messages.get(key, BOT_MESSAGES['zh-hant'].get(key, key))
    
    try:
        return template.format(**kwargs)
    except (KeyError, ValueError):
        return template


def _user_friendly_login_error(error: Optional[str], user: Dict[str, Any]) -> str:
    """
    將後端錯誤轉為用戶可理解的短句，不暴露技術用語。
    方案：掃碼登錄後 Bot 提示詞優化
    """
    if not error or not error.strip():
        return SERVER_ERROR_USER_MESSAGE
    err = error.strip()
    # Token 不存在 → 多為「本地二維碼 + 服務器 Bot」混用，引導填寫服務器地址
    if 'Token 不存在' in err or 'Token does not exist' in err.lower() or 'token not found' in err.lower():
        return get_message('login_token_not_found', user)
    # 已確認 / 狀態無效: confirmed 等 → 已登入無需重複
    if 'confirmed' in err.lower() and ('無效' in err or '无效' in err or 'invalid' in err.lower()):
        return get_message('login_already_done', user)
    # Token 狀態 / 技術錯誤 → 通用指引
    if 'Token 狀態' in err or 'Token 状态' in err or ('token' in err.lower() and 'invalid' in err.lower()):
        return get_message('login_error_generic', user)
    return err


def _should_skip_duplicate_login_failed(chat_id: int, token: str) -> bool:
    """同一 chat_id 或同一 (chat_id, token) 在 60s 內只允許發送一次登錄失敗，返回 True 表示應跳過發送。"""
    now = time.time()
    # 先按 chat_id 限流：同一對話 60s 內只發一條登錄失敗，避免連刷 6 條
    to_del_chat = [c for c, t in _LOGIN_FAILED_CHAT_SENT.items() if now - t > _LOGIN_FAILED_DEDUPE_SEC]
    for c in to_del_chat:
        _LOGIN_FAILED_CHAT_SENT.pop(c, None)
    if chat_id in _LOGIN_FAILED_CHAT_SENT:
        return True
    key = (chat_id, (token[:16] if token else ''))
    to_del = [k for k, t in _LOGIN_FAILED_SENT.items() if now - t > _LOGIN_FAILED_DEDUPE_SEC]
    for k in to_del:
        _LOGIN_FAILED_SENT.pop(k, None)
    if key in _LOGIN_FAILED_SENT:
        return True
    _LOGIN_FAILED_SENT[key] = now
    _LOGIN_FAILED_CHAT_SENT[chat_id] = now
    return False


def _reserve_login_failed_send(chat_id: int, token: str) -> bool:
    """
    在處理開始時預佔「發送登錄失敗」的權利，避免並發多個 webhook 導致連發多條。
    返回 True 表示本請求獲得權利（應繼續執行 _confirm_login 並在失敗時發送一條）；
    返回 False 表示已有其他請求佔用，本請求應直接跳過不發送。
    """
    now = time.time()
    to_del_chat = [c for c, t in _LOGIN_FAILED_CHAT_SENT.items() if now - t > _LOGIN_FAILED_DEDUPE_SEC]
    for c in to_del_chat:
        _LOGIN_FAILED_CHAT_SENT.pop(c, None)
    if chat_id in _LOGIN_FAILED_CHAT_SENT:
        return False
    key = (chat_id, (token[:16] if token else ''))
    to_del = [k for k, t in _LOGIN_FAILED_SENT.items() if now - t > _LOGIN_FAILED_DEDUPE_SEC]
    for k in to_del:
        _LOGIN_FAILED_SENT.pop(k, None)
    if key in _LOGIN_FAILED_SENT:
        return False
    _LOGIN_FAILED_SENT[key] = now
    _LOGIN_FAILED_CHAT_SENT[chat_id] = now
    return True


class TelegramBotHandler:
    """
    Telegram Bot 處理器
    
    處理來自 Telegram 的 Webhook 回調或輪詢消息
    """
    
    def __init__(self, bot_token: Optional[str] = None):
        """初始化 Bot 處理器"""
        self.bot_token = bot_token or os.environ.get('TELEGRAM_BOT_TOKEN', '')
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}"
        
        # 內部 API 地址（用於確認登入）。必須與生成 login token 的後端為同一實例/同一 DB，見 .cursorrules「登錄 Token 與掃碼後端統一規範」
        self.internal_api = os.environ.get('INTERNAL_API_URL', 'http://localhost:8000')
        logger.info("[Bot] INTERNAL_API_URL=%s (login token 須由此後端生成)", self.internal_api)
        
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
        text = message.get('text', '').strip()
        chat_id = message.get('chat', {}).get('id')
        user = message.get('from', {})
        
        if not text or not chat_id:
            return None
        
        # /start 命令
        if text.startswith('/start'):
            parts = text.split(' ', 1)
            if len(parts) > 1 and parts[1].startswith('login_'):
                # Deep Link 登入（新用戶）
                token = parts[1][6:]  # 移除 "login_" 前綴
                # 🆕 直接自動確認登入，不需要用戶點擊
                return await self._auto_confirm_login(chat_id, user, token)
            else:
                # 🆕 普通 /start - 檢查是否有待處理的登入請求，自動確認
                pending_result = await self._check_and_auto_confirm(chat_id, user)
                if pending_result:
                    return pending_result
                return await self._send_welcome(chat_id, user)
        
        # /login 命令
        elif text.startswith('/login'):
            return await self._send_login_info(chat_id, user)
        
        # /help 命令
        elif text.startswith('/help'):
            return await self._send_help(chat_id)
        
        # 🆕 處理 6 位驗證碼輸入（老用戶登入）
        elif text.isdigit() and len(text) == 6:
            return await self._handle_verify_code(chat_id, user, text)
        
        return None
    
    async def _auto_confirm_login(self, chat_id: int, user: Dict[str, Any], token: str) -> str:
        """
        🆕 自動確認登入（不需要用戶點擊確認按鈕）
        
        類似 Telemetrio 的流程：
        1. 用戶點擊網頁上的「打開 Telegram」
        2. Bot 收到 /start login_xxx
        3. Bot 自動確認登入
        4. 網頁自動跳轉
        """
        # 先預佔發送權，避免並發多個 webhook 導致連發 4～6 條失敗提示（在 await 前完成，無競態）
        if not _reserve_login_failed_send(chat_id, token):
            logger.info("[Bot] Skip duplicate login attempt (reserved) chat_id=%s token=%s...", chat_id, token[:8])
            return "已略過重複"
        logger.info(f"[Bot] Auto confirming login for token: {token[:8]}... user: {user.get('id')}")
        
        result = await self._confirm_login(token, user)
        
        if result['success']:
            success_msg = get_message('login_success', user)
            await self._send_message(chat_id, success_msg)
            return "自動登入成功"
        else:
            friendly_error = _user_friendly_login_error(result.get('message', ''), user)
            error_msg = get_message('login_failed', user, error=friendly_error)
            await self._send_message(chat_id, error_msg)
            return f"自動登入失敗: {friendly_error}"
    
    async def _check_and_auto_confirm(self, chat_id: int, user: Dict[str, Any]) -> Optional[str]:
        """
        🆕 檢查是否有待處理的登入請求，自動確認
        
        解決老用戶問題：
        - 老用戶發送 /start 時沒有 login_ 參數
        - 檢查是否有最近 5 分鐘內創建的待處理 Token
        - 如果有，自動確認登入
        """
        from auth.login_token import get_login_token_service
        
        telegram_id = str(user.get('id', ''))
        if not telegram_id:
            return None
        
        logger.info(f"[Bot] Checking pending login for TG user: {telegram_id}")
        
        service = get_login_token_service()
        
        # 查找最近的待處理 Token
        pending_token = service.get_pending_token_for_telegram_user(telegram_id)
        
        if pending_token:
            logger.info(f"[Bot] Found pending token for user: {pending_token.token[:8]}...")
            return await self._auto_confirm_login(chat_id, user, pending_token.token)
        
        return None
    
    async def _handle_verify_code(self, chat_id: int, user: Dict[str, Any], code: str) -> str:
        """
        🆕 處理驗證碼登入（備用方案）
        
        流程：
        1. 用戶在網頁看到 6 位驗證碼
        2. 用戶打開 Bot，輸入驗證碼
        3. Bot 自動確認登入
        """
        from auth.login_token import get_login_token_service
        
        logger.info(f"[Bot] Processing verify code: {code} from user: {user.get('id')}")
        
        service = get_login_token_service()
        login_token = service.get_token_by_verify_code(code)
        
        if not login_token:
            # 驗證碼無效或過期
            await self._send_message(chat_id, f"❌ 驗證碼無效或已過期\n\n請返回網頁獲取新的驗證碼。")
            return "驗證碼無效"
        
        # 🆕 自動確認登入（不需要點擊按鈕）
        return await self._auto_confirm_login(chat_id, user, login_token.token)
    
    async def _handle_callback(self, callback: Dict[str, Any]) -> Optional[str]:
        """
        處理回調查詢（內聯按鈕點擊）
        
        🆕 Phase 3: 多語言支持
        """
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
                success_msg = get_message('login_success', user)
                await self._send_message(chat_id, success_msg)
            else:
                if not _should_skip_duplicate_login_failed(chat_id, token):
                    friendly_error = _user_friendly_login_error(result.get('message', ''), user)
                    error_msg = get_message('login_failed', user, error=friendly_error)
                    await self._send_message(chat_id, error_msg)
            
            return result['message']
        
        # 取消登入按鈕
        elif data.startswith('cancel_login_'):
            # 🆕 多語言取消消息
            cancel_msg = get_message('login_cancelled', user)
            await self._answer_callback(callback_id, cancel_msg)
            await self._send_message(chat_id, cancel_msg)
            return cancel_msg
        
        return None
    
    async def _handle_login_confirm(
        self, 
        chat_id: int, 
        user: Dict[str, Any], 
        token: str
    ) -> str:
        """
        處理 Deep Link 登入確認
        
        🆕 優化：先驗證 Token 有效性
        🆕 Phase 3: 多語言支持
        
        Args:
            chat_id: 對話 ID
            user: Telegram 用戶信息
            token: 登入 Token
        """
        from datetime import datetime
        
        logger.info(f"[Bot] Processing login confirm for token: {token[:8]}... user: {user.get('id')}")
        
        # 🆕 先驗證 Token 有效性
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.internal_api}/api/v1/auth/login-token/{token}",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    text = await resp.text()
                    try:
                        result = json.loads(text) if text.strip() else {}
                    except Exception as e:
                        logger.error(
                            "[Bot] GET login-token returned non-JSON, status=%s, body_prefix=%s",
                            resp.status, (text[:150] + '...') if len(text) > 150 else text
                        )
                        if not _should_skip_duplicate_login_failed(chat_id, token):
                            error_msg = get_message('login_failed', user, error=SERVER_ERROR_USER_MESSAGE)
                            await self._send_message(chat_id, error_msg)
                        return "服務器內部錯誤"
                    if resp.status >= 400:
                        if not _should_skip_duplicate_login_failed(chat_id, token):
                            err = result.get('error', SERVER_ERROR_USER_MESSAGE)
                            friendly_err = _user_friendly_login_error(err, user)
                            error_msg = get_message('login_failed', user, error=friendly_err)
                            await self._send_message(chat_id, error_msg)
                        return _user_friendly_login_error(result.get('error', ''), user) or "錯誤"
                    if not result.get('success'):
                        logger.warning(
                            "[Bot] Token not found: %s... (INTERNAL_API_URL=%s — 須與生成二維碼的後端一致)",
                            token[:8], self.internal_api
                        )
                        if not _should_skip_duplicate_login_failed(chat_id, token):
                            error_msg = get_message('login_failed', user, error=get_message('login_token_not_found', user))
                            await self._send_message(chat_id, error_msg)
                        return "Token 不存在"
                    token_status = result.get('data', {}).get('status', '')
                    if token_status == 'expired':
                        logger.warning(f"[Bot] Token expired: {token[:8]}...")
                        error_msg = get_message('login_expired', user)
                        await self._send_message(chat_id, error_msg)
                        return "Token 已過期"
                    if token_status == 'confirmed':
                        logger.info(f"[Bot] Token already confirmed: {token[:8]}...")
                        success_msg = get_message('login_success', user)
                        await self._send_message(chat_id, success_msg)
                        return "已確認登入"
        except asyncio.TimeoutError:
            logger.error("[Bot] GET login-token timeout: %s", self.internal_api)
            if not _should_skip_duplicate_login_failed(chat_id, token):
                error_msg = get_message('login_failed', user, error=SERVER_ERROR_USER_MESSAGE)
                await self._send_message(chat_id, error_msg)
            return "服務器內部錯誤"
        except Exception as e:
            logger.error(f"[Bot] Token verification failed: {e}")
            # 驗證失敗不阻止流程，繼續顯示確認按鈕
        
        user_name = user.get('first_name', 'User')
        current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
        
        # 獲取本地化按鈕文字
        confirm_text = get_message('login_confirm_btn', user)
        cancel_text = get_message('login_cancel_btn', user)
        
        # 發送確認請求（帶按鈕）
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": confirm_text, "callback_data": f"confirm_login_{token}"},
                    {"text": cancel_text, "callback_data": f"cancel_login_{token}"}
                ]
            ]
        }
        
        # 構建本地化消息
        title = get_message('login_confirm_title', user)
        desc = get_message('login_confirm_desc', user)
        warning = get_message('login_confirm_warning', user)
        
        message = f"""
👋 *{user_name}*

{title}

{desc}

⏰ {current_time}

{warning}
"""
        
        logger.info(f"[Bot] Sending login confirmation message to {chat_id}")
        
        sent = await self._send_message(
            chat_id, 
            message, 
            reply_markup=keyboard,
            parse_mode="Markdown"
        )
        
        if sent:
            logger.info(f"[Bot] Login confirmation sent successfully to {chat_id}")
            return "登入確認請求已發送"
        else:
            logger.error(f"[Bot] Failed to send login confirmation to {chat_id}")
            return "發送確認請求失敗"
    
    async def _confirm_login(self, token: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        確認登入 Token
        
        調用內部 API 確認登入
        """
        logger.info(f"[Bot] Confirming login for token: {token[:8]}... user: {user.get('id')}")
        
        try:
            # 獲取 Bot 密鑰（用於 API 驗證）
            bot_secret = self.bot_token.split(':')[-1][:16] if self.bot_token else ''
            
            confirm_url = f"{self.internal_api}/api/v1/auth/login-token/{token}/confirm"
            logger.info(f"[Bot] Calling confirm API: {confirm_url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    confirm_url,
                    json={
                        'bot_secret': bot_secret,
                        'telegram_id': str(user.get('id', '')),
                        'telegram_username': user.get('username', ''),
                        'telegram_first_name': user.get('first_name', '')
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    text = await resp.text()
                    try:
                        result = json.loads(text) if text.strip() else {}
                    except Exception as e:
                        logger.error(
                            "[Bot] Confirm API returned non-JSON, status=%s, body_prefix=%s",
                            resp.status, (text[:150] + '...') if len(text) > 150 else text
                        )
                        return {'success': False, 'message': SERVER_ERROR_USER_MESSAGE}
                    logger.info(f"[Bot] Confirm API response: {result}")
                    if resp.status >= 400:
                        err = result.get('error', SERVER_ERROR_USER_MESSAGE)
                        return {'success': False, 'message': err}
                    if result.get('success'):
                        logger.info(f"[Bot] Login confirmed successfully for TG user {user.get('id')}")
                        return {'success': True, 'message': '登入成功！'}
                    error_msg = result.get('error', '確認失敗')
                    logger.warning(
                        "[Bot] Confirm failed: %s (INTERNAL_API_URL=%s — 須與生成二維碼的後端一致)",
                        error_msg, self.internal_api
                    )
                    return {'success': False, 'message': error_msg}
        except asyncio.TimeoutError:
            logger.error("[Bot] Confirm API timeout: %s", confirm_url)
            return {'success': False, 'message': SERVER_ERROR_USER_MESSAGE}
        except Exception as e:
            logger.error(f"[Bot] Confirm login error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': SERVER_ERROR_USER_MESSAGE}
    
    async def _send_welcome(self, chat_id: int, user: Dict[str, Any]) -> str:
        """發送歡迎消息"""
        user_name = user.get('first_name', 'User')
        
        message = f"""
👋 *歡迎使用 TG-AI智控王！*

{user_name}，您好！

這個 Bot 用於網頁登入驗證。

🔗 如需登入網頁後台，請：
1. 在網頁點擊「打開 Telegram」
2. 返回此對話確認

━━━━━━━━━━━━━━━
💡 *備用方法*：輸入網頁顯示的 6 位驗證碼
━━━━━━━━━━━━━━━

📖 /help - 幫助信息
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
            
            logger.info(f"[Bot] Sending message to {chat_id}, has_buttons={reply_markup is not None}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/sendMessage",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    if result.get('ok'):
                        logger.info(f"[Bot] Message sent successfully to {chat_id}")
                    else:
                        logger.error(f"[Bot] Failed to send message: {result}")
                    return result.get('ok', False)
        
        except Exception as e:
            logger.error(f"[Bot] Send message error: {e}")
            import traceback
            traceback.print_exc()
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


# ==================== 本地開發：getUpdates 輪詢（無公網 webhook 時收掃碼） ====================

_bot_polling_task: Optional[asyncio.Task] = None


async def _telegram_bot_polling_loop() -> None:
    """
    本地開發時輪詢 Telegram getUpdates，使掃碼登入無需公網 webhook。
    Telegram 只會把更新發到 setWebhook 的 URL，本機 127.0.0.1 無法被訪問，故用輪詢接收。
    """
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not token:
        logger.warning("[Bot Polling] TELEGRAM_BOT_TOKEN 未設置，跳過輪詢")
        return
    base = f"https://api.telegram.org/bot{token}"
    offset = 0
    handler = get_bot_handler()
    async with aiohttp.ClientSession() as session:
        # 取消 webhook，使更新改走 getUpdates
        try:
            async with session.get(f"{base}/deleteWebhook") as resp:
                data = await resp.json()
                if data.get('ok'):
                    logger.info("[Bot Polling] deleteWebhook 成功，開始 getUpdates 輪詢")
                else:
                    logger.warning("[Bot Polling] deleteWebhook 未成功: %s", data)
        except Exception as e:
            logger.warning("[Bot Polling] deleteWebhook 請求失敗: %s", e)
        while True:
            try:
                async with session.get(
                    f"{base}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    if resp.status != 200:
                        await asyncio.sleep(5)
                        continue
                    data = await resp.json()
                if not data.get("ok"):
                    logger.warning("[Bot Polling] getUpdates 錯誤: %s", data)
                    await asyncio.sleep(5)
                    continue
                for upd in data.get("result", []):
                    offset = upd.get("update_id", offset) + 1
                    try:
                        result = await handler.handle_update(upd)
                        if result:
                            logger.info("[Bot Polling] 處理 update %s -> %s", upd.get("update_id"), result[:80] if isinstance(result, str) else result)
                    except Exception as e:
                        logger.exception("[Bot Polling] handle_update 異常: %s", e)
            except asyncio.CancelledError:
                logger.info("[Bot Polling] 輪詢已取消")
                break
            except Exception as e:
                logger.warning("[Bot Polling] 輪詢異常: %s", e)
                await asyncio.sleep(5)
    return None


def start_telegram_bot_polling_for_dev() -> Optional[asyncio.Task]:
    """
    在開發模式下啟動 Telegram Bot getUpdates 輪詢，使本地掃碼登入可收到確認。
    僅在 TG_DEV_MODE 或環境為開發時調用；若未配置 TELEGRAM_BOT_TOKEN 則不啟動。
    """
    global _bot_polling_task
    if _bot_polling_task is not None and not _bot_polling_task.done():
        return _bot_polling_task
    if not os.environ.get('TELEGRAM_BOT_TOKEN', '').strip():
        return None
    try:
        dev = os.environ.get('TG_DEV_MODE', '').lower() == 'true'
        if not dev:
            return None
    except Exception:
        return None
    loop = asyncio.get_event_loop()
    _bot_polling_task = loop.create_task(_telegram_bot_polling_loop())
    logger.info("[Bot Polling] 已啟動 getUpdates 輪詢（開發模式）")
    return _bot_polling_task

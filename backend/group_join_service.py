"""
Group Join Service - 群組自動加入服務
功能：
- 自動加入群組
- 錯誤分類與中文說明
- 按鈕驗證自動點擊
- 詳細加入報告
"""
import sys
import asyncio
import re
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from pyrogram import Client
from pyrogram.types import Message
from pyrogram.errors import (
    FloodWait, UserBannedInChannel, InviteHashExpired, 
    InviteHashInvalid, UserAlreadyParticipant, ChannelPrivate,
    UsernameInvalid, UsernameNotOccupied, PeerIdInvalid,
    ChatAdminRequired, UserKicked
)

# InviteRequestSent 可能在舊版本中不存在
try:
    from pyrogram.errors import InviteRequestSent
except ImportError:
    # 創建一個 fallback 類
    class InviteRequestSent(Exception):
        pass
from pyrogram.enums import ChatMemberStatus, ChatType
from text_utils import sanitize_text, safe_get_name, format_chat_info


class GroupJoinError:
    """群組加入錯誤分類"""
    
    # 錯誤類型到中文說明的映射
    ERROR_MESSAGES = {
        'USER_BANNED': {
            'code': 'USER_BANNED',
            'message': '帳號被此群組封禁',
            'can_retry': False,
            'suggestion': '使用其他帳號加入'
        },
        'USER_KICKED': {
            'code': 'USER_KICKED',
            'message': '帳號被踢出且禁止重新加入',
            'can_retry': False,
            'suggestion': '使用其他帳號或聯繫管理員'
        },
        'INVITE_EXPIRED': {
            'code': 'INVITE_EXPIRED',
            'message': '邀請連結已過期',
            'can_retry': False,
            'suggestion': '獲取新的邀請連結'
        },
        'INVITE_INVALID': {
            'code': 'INVITE_INVALID',
            'message': '邀請連結無效或群組已刪除',
            'can_retry': False,
            'suggestion': '確認連結是否正確'
        },
        'GROUP_NOT_FOUND': {
            'code': 'GROUP_NOT_FOUND',
            'message': '找不到此群組',
            'can_retry': False,
            'suggestion': '確認群組用戶名或連結'
        },
        'CHANNEL_PRIVATE': {
            'code': 'CHANNEL_PRIVATE',
            'message': '私有群組，需要邀請連結',
            'can_retry': False,
            'suggestion': '獲取私有群組的邀請連結'
        },
        'FLOOD_WAIT': {
            'code': 'FLOOD_WAIT',
            'message': '操作太頻繁，需要等待',
            'can_retry': True,
            'suggestion': '稍後自動重試'
        },
        'INVITE_REQUEST_SENT': {
            'code': 'INVITE_REQUEST_SENT',
            'message': '已發送加入請求，等待管理員審批',
            'can_retry': False,
            'suggestion': '等待管理員批准'
        },
        'ACCOUNT_NOT_CONNECTED': {
            'code': 'ACCOUNT_NOT_CONNECTED',
            'message': '帳號未連接',
            'can_retry': True,
            'suggestion': '先登入帳號'
        },
        'VERIFICATION_REQUIRED': {
            'code': 'VERIFICATION_REQUIRED',
            'message': '需要完成驗證',
            'can_retry': True,
            'suggestion': '正在嘗試自動驗證...'
        },
        'VERIFICATION_FAILED': {
            'code': 'VERIFICATION_FAILED',
            'message': '自動驗證失敗',
            'can_retry': False,
            'suggestion': '請手動加入並完成驗證'
        },
        'UNKNOWN': {
            'code': 'UNKNOWN',
            'message': '未知錯誤',
            'can_retry': False,
            'suggestion': '請查看詳細錯誤信息'
        }
    }
    
    @classmethod
    def classify_error(cls, exception: Exception) -> Dict[str, Any]:
        """根據異常類型分類錯誤"""
        error_str = str(exception).lower()
        
        if isinstance(exception, UserBannedInChannel):
            return {**cls.ERROR_MESSAGES['USER_BANNED'], 'detail': str(exception)}
        elif isinstance(exception, UserKicked):
            return {**cls.ERROR_MESSAGES['USER_KICKED'], 'detail': str(exception)}
        elif isinstance(exception, InviteHashExpired):
            return {**cls.ERROR_MESSAGES['INVITE_EXPIRED'], 'detail': str(exception)}
        elif isinstance(exception, InviteHashInvalid):
            return {**cls.ERROR_MESSAGES['INVITE_INVALID'], 'detail': str(exception)}
        elif isinstance(exception, (UsernameInvalid, UsernameNotOccupied, PeerIdInvalid)):
            return {**cls.ERROR_MESSAGES['GROUP_NOT_FOUND'], 'detail': str(exception)}
        elif isinstance(exception, ChannelPrivate):
            return {**cls.ERROR_MESSAGES['CHANNEL_PRIVATE'], 'detail': str(exception)}
        elif isinstance(exception, FloodWait):
            result = {**cls.ERROR_MESSAGES['FLOOD_WAIT']}
            result['message'] = f"操作太頻繁，需等待 {exception.value} 秒"
            result['wait_seconds'] = exception.value
            result['detail'] = str(exception)
            return result
        elif isinstance(exception, InviteRequestSent):
            return {**cls.ERROR_MESSAGES['INVITE_REQUEST_SENT'], 'detail': str(exception)}
        elif 'banned' in error_str:
            return {**cls.ERROR_MESSAGES['USER_BANNED'], 'detail': str(exception)}
        elif 'kicked' in error_str:
            return {**cls.ERROR_MESSAGES['USER_KICKED'], 'detail': str(exception)}
        elif 'expired' in error_str:
            return {**cls.ERROR_MESSAGES['INVITE_EXPIRED'], 'detail': str(exception)}
        elif 'invalid' in error_str and 'hash' in error_str:
            return {**cls.ERROR_MESSAGES['INVITE_INVALID'], 'detail': str(exception)}
        elif 'private' in error_str:
            return {**cls.ERROR_MESSAGES['CHANNEL_PRIVATE'], 'detail': str(exception)}
        else:
            return {**cls.ERROR_MESSAGES['UNKNOWN'], 'detail': str(exception)}


class GroupJoinService:
    """群組自動加入服務"""
    
    def __init__(self, event_callback: Optional[Callable] = None):
        self.event_callback = event_callback
        self._verification_handlers: Dict[str, asyncio.Task] = {}
        self._pending_verifications: Dict[int, Dict] = {}  # chat_id -> verification info
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[GroupJoin] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def join_group(
        self, 
        client: Client, 
        group_url: str,
        auto_verify: bool = True,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        嘗試加入群組，支持自動驗證
        
        Args:
            client: Telegram 客戶端
            group_url: 群組 URL
            auto_verify: 是否自動處理驗證
            timeout: 驗證超時時間（秒）
            
        Returns:
            加入結果
        """
        result = {
            'success': False,
            'group_url': group_url,
            'chat_id': None,
            'chat_title': None,
            'already_member': False,
            'verification_required': False,
            'verification_passed': False,
            'error': None,
            'error_code': None,
            'suggestion': None
        }
        
        try:
            # 確保客戶端已連接
            if not client.is_connected:
                await client.connect()
            
            # 提取群組 ID
            group_id = self._extract_group_id(group_url)
            self.log(f"嘗試加入: {group_url} (ID: {group_id})")
            
            # 先檢查是否已經是成員
            is_member, chat_info = await self._check_membership(client, group_id)
            
            if is_member:
                result['success'] = True
                result['already_member'] = True
                result['chat_id'] = chat_info.get('chat_id')
                result['chat_title'] = chat_info.get('chat_title')
                self.log(f"✓ 已是成員: {chat_info.get('chat_title')}")
                return result
            
            # 嘗試加入
            try:
                chat = await client.join_chat(group_id)
                
                result['success'] = True
                result['chat_id'] = chat.id
                result['chat_title'] = safe_get_name(chat, "未知群組")
                self.log(f"✓ 成功加入: {result['chat_title']}")
                
                # 如果啟用自動驗證，監聽驗證消息
                if auto_verify:
                    asyncio.create_task(
                        self._watch_for_verification(client, chat.id, timeout)
                    )
                
                return result
                
            except UserAlreadyParticipant:
                chat = await client.get_chat(group_id)
                result['success'] = True
                result['already_member'] = True
                result['chat_id'] = chat.id
                result['chat_title'] = safe_get_name(chat, "未知群組")
                return result
                
            except InviteRequestSent:
                result['error_code'] = 'INVITE_REQUEST_SENT'
                result['error'] = '已發送加入請求，等待管理員審批'
                result['suggestion'] = '等待管理員批准'
                self.log(f"⏳ 已發送加入請求: {group_url}")
                return result
                
        except FloodWait as e:
            error_info = GroupJoinError.classify_error(e)
            result['error_code'] = error_info['code']
            result['error'] = error_info['message']
            result['suggestion'] = error_info['suggestion']
            result['wait_seconds'] = e.value
            self.log(f"⏳ 需要等待 {e.value} 秒: {group_url}", "warning")
            
        except Exception as e:
            error_info = GroupJoinError.classify_error(e)
            result['error_code'] = error_info['code']
            result['error'] = error_info['message']
            result['suggestion'] = error_info['suggestion']
            self.log(f"✗ 加入失敗: {group_url} - {error_info['message']}", "error")
        
        return result
    
    async def join_multiple_groups(
        self,
        client: Client,
        group_urls: List[str],
        delay_between: float = 2.0,
        auto_verify: bool = True
    ) -> Dict[str, Any]:
        """
        批量加入多個群組
        
        Args:
            client: Telegram 客戶端
            group_urls: 群組 URL 列表
            delay_between: 每次加入之間的延遲（秒）
            auto_verify: 是否自動處理驗證
            
        Returns:
            批量加入結果報告
        """
        report = {
            'total': len(group_urls),
            'success': [],
            'pending': [],  # 等待審批
            'need_manual': [],  # 需要手動處理
            'failed': [],
            'details': []
        }
        
        for i, url in enumerate(group_urls):
            self.log(f"加入進度: {i+1}/{len(group_urls)} - {url}")
            
            # 發送進度事件
            if self.event_callback:
                self.event_callback("group-join-progress", {
                    "current": i + 1,
                    "total": len(group_urls),
                    "url": url
                })
            
            result = await self.join_group(client, url, auto_verify)
            report['details'].append(result)
            
            if result['success']:
                report['success'].append({
                    'url': url,
                    'title': result.get('chat_title'),
                    'already_member': result.get('already_member', False)
                })
            elif result.get('error_code') == 'INVITE_REQUEST_SENT':
                report['pending'].append({
                    'url': url,
                    'message': result.get('error')
                })
            elif result.get('error_code') in ['VERIFICATION_FAILED', 'VERIFICATION_REQUIRED']:
                report['need_manual'].append({
                    'url': url,
                    'reason': result.get('error'),
                    'suggestion': result.get('suggestion')
                })
            else:
                report['failed'].append({
                    'url': url,
                    'error': result.get('error'),
                    'error_code': result.get('error_code'),
                    'suggestion': result.get('suggestion')
                })
            
            # 如果需要等待（FloodWait）
            if result.get('wait_seconds'):
                wait_time = min(result['wait_seconds'], 60)  # 最多等待60秒
                self.log(f"等待 {wait_time} 秒後繼續...")
                await asyncio.sleep(wait_time)
            elif i < len(group_urls) - 1:
                # 正常延遲
                await asyncio.sleep(delay_between)
        
        # 發送完成事件
        if self.event_callback:
            self.event_callback("group-join-complete", {
                "success_count": len(report['success']),
                "pending_count": len(report['pending']),
                "failed_count": len(report['failed']),
                "total": report['total']
            })
        
        return report
    
    async def _check_membership(
        self, 
        client: Client, 
        group_id: str
    ) -> tuple[bool, Dict]:
        """檢查是否已經是群組成員"""
        try:
            chat = await client.get_chat(group_id)
            me = await client.get_me()
            member = await client.get_chat_member(chat.id, me.id)
            
            if member.status in [ChatMemberStatus.OWNER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.MEMBER]:
                return True, {
                    'chat_id': chat.id,
                    'chat_title': safe_get_name(chat, "未知群組"),
                    'status': str(member.status)
                }
        except Exception:
            pass
        
        return False, {}
    
    def _extract_group_id(self, group_url: str) -> str:
        """從 URL 提取群組 ID"""
        group_id = group_url.strip()
        
        # 處理 t.me/xxx 或 telegram.me/xxx
        match = re.search(r'(?:t\.me|telegram\.me)/(?:joinchat/)?([^/\s]+)', group_id)
        if match:
            group_id = match.group(1)
        
        # 移除 @ 前綴
        if group_id.startswith('@'):
            group_id = group_id[1:]
        
        return group_id
    
    async def _watch_for_verification(
        self, 
        client: Client, 
        chat_id: int, 
        timeout: int = 30
    ):
        """
        監聽並處理驗證消息
        
        加入群組後，某些群組會發送驗證消息（按鈕或問題）
        """
        from pyrogram.handlers import MessageHandler
        from pyrogram import filters
        
        verification_done = asyncio.Event()
        
        async def handle_verification_message(client_instance: Client, message: Message):
            """處理驗證消息"""
            if message.chat.id != chat_id:
                return
            
            # 檢查是否是驗證消息
            if message.reply_markup and hasattr(message.reply_markup, 'inline_keyboard'):
                # 有內聯按鈕，嘗試自動點擊
                await self._handle_button_verification(client_instance, message)
                verification_done.set()
            elif self._is_question_message(message.text or ''):
                # 是問題驗證
                await self._handle_question_verification(client_instance, message)
                verification_done.set()
        
        # 註冊臨時處理器
        handler = MessageHandler(
            handle_verification_message,
            filters.chat(chat_id) & filters.incoming
        )
        client.add_handler(handler, group=99)
        
        try:
            # 等待驗證完成或超時
            await asyncio.wait_for(verification_done.wait(), timeout=timeout)
            self.log(f"✓ 驗證完成: chat_id={chat_id}")
        except asyncio.TimeoutError:
            self.log(f"驗證超時: chat_id={chat_id}", "warning")
        finally:
            # 移除處理器
            try:
                client.remove_handler(handler, group=99)
            except:
                pass
    
    async def _handle_button_verification(
        self, 
        client: Client, 
        message: Message
    ):
        """
        處理按鈕驗證
        
        自動識別並點擊驗證按鈕
        """
        if not message.reply_markup or not hasattr(message.reply_markup, 'inline_keyboard'):
            return False
        
        # 驗證按鈕的常見文字模式
        verification_patterns = [
            r'验证|驗證|verify|確認|确认|confirm',
            r'我是人|i am human|not.*robot|不是机器人',
            r'点击|click|按.*按钮|press',
            r'加入|join|enter|進入',
            r'同意|agree|accept',
            r'✓|✔|☑'
        ]
        
        for row in message.reply_markup.inline_keyboard:
            for button in row:
                button_text = (button.text or '').lower()
                
                # 檢查是否匹配驗證模式
                for pattern in verification_patterns:
                    if re.search(pattern, button_text, re.IGNORECASE):
                        self.log(f"🔘 點擊驗證按鈕: {button.text}")
                        try:
                            # 點擊按鈕
                            if button.callback_data:
                                await message.click(button.callback_data)
                            else:
                                # 嘗試按索引點擊
                                await message.click(0)
                            return True
                        except Exception as e:
                            self.log(f"點擊按鈕失敗: {e}", "warning")
        
        # 如果沒有匹配的驗證模式，嘗試點擊第一個按鈕
        try:
            first_button = message.reply_markup.inline_keyboard[0][0]
            self.log(f"🔘 嘗試點擊第一個按鈕: {first_button.text}")
            await message.click(0)
            return True
        except Exception as e:
            self.log(f"點擊失敗: {e}", "warning")
        
        return False
    
    def _is_question_message(self, text: str) -> bool:
        """判斷是否是問題驗證消息"""
        if not text:
            return False
        
        question_patterns = [
            r'\d+\s*[+\-*/×÷]\s*\d+\s*=\s*\?',  # 數學題 3+5=?
            r'答案|answer|回答|reply',
            r'請回答|please answer',
            r'验证码|驗證碼|captcha',
        ]
        
        for pattern in question_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        
        return False
    
    async def _handle_question_verification(
        self, 
        client: Client, 
        message: Message
    ):
        """
        處理問題驗證
        
        嘗試解析並回答驗證問題
        """
        text = message.text or ''
        chat_id = message.chat.id
        
        # 嘗試解析數學題
        math_match = re.search(r'(\d+)\s*([+\-*/×÷])\s*(\d+)\s*=\s*\?', text)
        if math_match:
            num1 = int(math_match.group(1))
            operator = math_match.group(2)
            num2 = int(math_match.group(3))
            
            if operator in ['+', '＋']:
                answer = num1 + num2
            elif operator in ['-', '－']:
                answer = num1 - num2
            elif operator in ['*', '×', '✖']:
                answer = num1 * num2
            elif operator in ['/', '÷']:
                answer = num1 // num2 if num2 != 0 else 0
            else:
                return False
            
            self.log(f"📝 計算答案: {num1} {operator} {num2} = {answer}")
            try:
                await client.send_message(chat_id, str(answer))
                return True
            except Exception as e:
                self.log(f"發送答案失敗: {e}", "warning")
        
        return False


# 創建全局實例
group_join_service = GroupJoinService()

"""
Discussion Watcher Service - 討論組監控服務
監控頻道討論組（評論區），捕獲潛在客戶

功能：
- 自動發現頻道的討論組
- 監控討論組消息
- 關鍵詞匹配識別潛在客戶
- 自動/手動回復評論
- Lead 生成和追蹤
"""
import sys
import asyncio
import json
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum

from pyrogram import Client
from pyrogram.types import Message, Chat
from pyrogram.handlers import MessageHandler
from pyrogram.enums import ChatType
from pyrogram.errors import (
    FloodWait, ChannelPrivate, ChannelInvalid,
    ChatAdminRequired, UserBannedInChannel, PeerIdInvalid
)

from database import db


class DiscussionStatus(Enum):
    """討論組狀態"""
    DISCOVERED = "discovered"
    MONITORING = "monitoring"
    PAUSED = "paused"
    ERROR = "error"


@dataclass
class ChannelDiscussion:
    """頻道-討論組關聯"""
    id: Optional[int] = None
    channel_id: str = ""
    channel_username: str = ""
    channel_title: str = ""
    discussion_id: str = ""
    discussion_username: str = ""
    discussion_title: str = ""
    is_active: bool = True
    is_monitoring: bool = False
    monitored_by_phone: str = ""
    message_count: int = 0
    lead_count: int = 0


@dataclass
class DiscussionMessage:
    """討論組消息"""
    id: Optional[int] = None
    discussion_id: str = ""
    channel_id: str = ""
    channel_post_id: int = 0
    message_id: int = 0
    reply_to_message_id: int = 0
    user_id: str = ""
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    message_text: str = ""
    message_type: str = "text"
    is_matched: bool = False
    matched_keywords: List[str] = field(default_factory=list)
    is_processed: bool = False
    is_replied: bool = False
    sentiment: float = 0.5
    intent: str = ""
    created_at: Optional[datetime] = None


class DiscussionWatcherService:
    """討論組監控服務"""
    
    def __init__(self):
        self._initialized = False
        self._clients: Dict[str, Client] = {}
        self._monitoring_tasks: Dict[str, asyncio.Task] = {}
        self._message_handlers: Dict[str, Any] = {}
        self.event_callback: Optional[Callable] = None
        self.keyword_matcher = None
        
        # 回復限制
        self._reply_counts: Dict[str, List[float]] = {}  # phone -> [timestamps]
        self._max_replies_per_hour = 10
        
        # 消息處理隊列
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._queue_processor_task: Optional[asyncio.Task] = None
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_clients(self, clients: Dict[str, Client]):
        """設置 Telegram 客戶端"""
        self._clients = clients
    
    def set_keyword_matcher(self, matcher):
        """設置關鍵詞匹配器"""
        self.keyword_matcher = matcher
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[DiscussionWatcher] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def initialize(self):
        """初始化服務"""
        if self._initialized:
            return
        
        await db.initialize()
        
        # 啟動消息處理隊列
        if not self._queue_processor_task:
            self._queue_processor_task = asyncio.create_task(self._process_message_queue())
        
        self._initialized = True
        self.log("✅ 討論組監控服務初始化完成")
    
    # ==================== 頻道-討論組發現 ====================
    
    async def discover_discussion(self, channel_id: str, phone: str = None) -> Optional[ChannelDiscussion]:
        """
        發現頻道的討論組
        
        Args:
            channel_id: 頻道 ID 或 username
            phone: 使用的帳號
            
        Returns:
            ChannelDiscussion 或 None
        """
        client = self._get_client(phone)
        if not client:
            self.log("⚠️ 沒有可用的帳號", "warning")
            return None
        
        try:
            # 獲取頻道完整信息
            chat = await client.get_chat(channel_id)
            
            if chat.type != ChatType.CHANNEL:
                self.log(f"⚠️ {channel_id} 不是頻道", "warning")
                return None
            
            # 檢查是否有討論組
            linked_chat = getattr(chat, 'linked_chat', None)
            if not linked_chat:
                self.log(f"ℹ️ 頻道 {chat.title} 沒有關聯的討論組")
                return None
            
            # 創建關聯對象
            discussion = ChannelDiscussion(
                channel_id=str(chat.id),
                channel_username=chat.username or "",
                channel_title=chat.title or "",
                discussion_id=str(linked_chat.id),
                discussion_username=linked_chat.username or "",
                discussion_title=linked_chat.title or ""
            )
            
            # 保存到數據庫
            discussion_id = await self._save_channel_discussion(discussion)
            discussion.id = discussion_id
            
            self.log(f"✅ 發現討論組: {discussion.discussion_title} (頻道: {discussion.channel_title})")
            
            return discussion
            
        except ChannelPrivate:
            self.log(f"⚠️ 頻道 {channel_id} 是私有的", "warning")
            return None
        except ChannelInvalid:
            self.log(f"⚠️ 無效的頻道 {channel_id}", "warning")
            return None
        except Exception as e:
            self.log(f"❌ 發現討論組失敗: {e}", "error")
            return None
    
    async def discover_from_resources(self, phone: str = None) -> List[ChannelDiscussion]:
        """
        從已發現的資源中發現討論組
        
        Returns:
            發現的討論組列表
        """
        discovered = []
        
        # 獲取所有已加入的頻道資源
        query = """
            SELECT telegram_id, username, title FROM discovered_resources 
            WHERE resource_type = 'channel' AND status = 'joined'
        """
        results = await db.fetch_all(query)
        
        for row in results:
            channel_id = row['telegram_id'] or row['username']
            if channel_id:
                discussion = await self.discover_discussion(channel_id, phone)
                if discussion:
                    discovered.append(discussion)
                # 延遲避免頻繁請求
                await asyncio.sleep(random.uniform(1, 3))
        
        self.log(f"📊 從資源中發現 {len(discovered)} 個討論組")
        return discovered
    
    async def _save_channel_discussion(self, discussion: ChannelDiscussion) -> int:
        """保存頻道-討論組關聯"""
        # 檢查是否已存在
        existing = await db.fetch_one(
            "SELECT id FROM channel_discussions WHERE channel_id = ? AND discussion_id = ?",
            (discussion.channel_id, discussion.discussion_id)
        )
        
        if existing:
            # 更新
            await db.execute("""
                UPDATE channel_discussions SET
                    channel_username = ?, channel_title = ?,
                    discussion_username = ?, discussion_title = ?,
                    is_active = 1, updated_at = ?
                WHERE id = ?
            """, (
                discussion.channel_username, discussion.channel_title,
                discussion.discussion_username, discussion.discussion_title,
                datetime.now().isoformat(), existing['id']
            ))
            return existing['id']
        
        # 新增
        disc_id = await db.execute("""
            INSERT INTO channel_discussions (
                channel_id, channel_username, channel_title,
                discussion_id, discussion_username, discussion_title,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (
            discussion.channel_id, discussion.channel_username, discussion.channel_title,
            discussion.discussion_id, discussion.discussion_username, discussion.discussion_title,
            datetime.now().isoformat(), datetime.now().isoformat()
        ))
        return disc_id
    
    # ==================== 監控管理 ====================
    
    async def start_monitoring(self, discussion_id: str, phone: str = None) -> bool:
        """
        開始監控討論組
        
        Args:
            discussion_id: 討論組 ID
            phone: 使用的帳號
            
        Returns:
            是否成功
        """
        if discussion_id in self._monitoring_tasks:
            self.log(f"ℹ️ 討論組 {discussion_id} 已在監控中")
            return True
        
        client = self._get_client(phone)
        if not client:
            self.log("⚠️ 沒有可用的帳號", "warning")
            return False
        
        try:
            # 創建消息處理器
            async def message_handler(client: Client, message: Message):
                await self._handle_discussion_message(client, message, discussion_id)
            
            # 註冊處理器
            handler = client.add_handler(
                MessageHandler(
                    message_handler,
                    filters=None  # 接收所有消息，在處理器中過濾
                )
            )
            
            self._message_handlers[discussion_id] = handler
            
            # 更新數據庫狀態
            await db.execute("""
                UPDATE channel_discussions SET
                    is_monitoring = 1, monitored_by_phone = ?, updated_at = ?
                WHERE discussion_id = ?
            """, (phone, datetime.now().isoformat(), discussion_id))
            
            self.log(f"🟢 開始監控討論組: {discussion_id}")
            
            # 發送事件
            if self.event_callback:
                self.event_callback("discussion-monitoring-started", {
                    "discussion_id": discussion_id,
                    "phone": phone
                })
            
            return True
            
        except Exception as e:
            self.log(f"❌ 啟動監控失敗: {e}", "error")
            return False
    
    async def stop_monitoring(self, discussion_id: str) -> bool:
        """停止監控討論組"""
        if discussion_id not in self._message_handlers:
            return True
        
        try:
            # 移除處理器
            handler = self._message_handlers.pop(discussion_id)
            # 注意：Pyrogram 的 remove_handler 需要 client
            
            # 更新數據庫
            await db.execute("""
                UPDATE channel_discussions SET
                    is_monitoring = 0, updated_at = ?
                WHERE discussion_id = ?
            """, (datetime.now().isoformat(), discussion_id))
            
            self.log(f"🔴 停止監控討論組: {discussion_id}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ 停止監控失敗: {e}", "error")
            return False
    
    async def stop_all_monitoring(self):
        """停止所有監控"""
        for discussion_id in list(self._message_handlers.keys()):
            await self.stop_monitoring(discussion_id)
    
    # ==================== 消息處理 ====================
    
    async def _handle_discussion_message(self, client: Client, message: Message, target_discussion_id: str):
        """處理討論組消息"""
        try:
            # 檢查是否是目標討論組的消息
            chat_id = str(message.chat.id)
            if chat_id != target_discussion_id:
                return
            
            # 忽略自己發送的消息
            if message.outgoing:
                return
            
            # 提取消息信息
            user = message.from_user
            if not user:
                return
            
            # 創建消息對象
            msg = DiscussionMessage(
                discussion_id=chat_id,
                message_id=message.id,
                reply_to_message_id=message.reply_to_message_id or 0,
                user_id=str(user.id),
                username=user.username or "",
                first_name=user.first_name or "",
                last_name=user.last_name or "",
                message_text=message.text or message.caption or "",
                message_type=self._get_message_type(message),
                created_at=message.date
            )
            
            # 獲取頻道帖子 ID（如果是回覆帖子的評論）
            if hasattr(message, 'reply_to_top_message_id'):
                msg.channel_post_id = message.reply_to_top_message_id or 0
            
            # 放入處理隊列
            await self._message_queue.put((client, msg))
            
        except Exception as e:
            self.log(f"❌ 處理消息失敗: {e}", "error")
    
    async def _process_message_queue(self):
        """處理消息隊列"""
        while True:
            try:
                client, msg = await self._message_queue.get()
                await self._process_single_message(client, msg)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"❌ 隊列處理錯誤: {e}", "error")
                await asyncio.sleep(1)
    
    async def _process_single_message(self, client: Client, msg: DiscussionMessage):
        """處理單條消息"""
        try:
            # 關鍵詞匹配
            if self.keyword_matcher and msg.message_text:
                matches = self.keyword_matcher.match(msg.message_text)
                if matches:
                    msg.is_matched = True
                    msg.matched_keywords = [m.keyword for m in matches]
                    self.log(f"🎯 匹配關鍵詞: {msg.matched_keywords} (用戶: @{msg.username})")
            
            # 保存消息
            message_id = await self._save_discussion_message(msg)
            msg.id = message_id
            
            # 更新統計
            await db.execute("""
                UPDATE channel_discussions SET
                    message_count = message_count + 1,
                    last_message_at = ?
                WHERE discussion_id = ?
            """, (datetime.now().isoformat(), msg.discussion_id))
            
            # 如果匹配關鍵詞，生成 Lead
            if msg.is_matched:
                await self._create_lead_from_message(msg)
                
                # 發送事件
                if self.event_callback:
                    self.event_callback("discussion-lead-captured", {
                        "discussion_id": msg.discussion_id,
                        "user_id": msg.user_id,
                        "username": msg.username,
                        "message": msg.message_text[:100],
                        "keywords": msg.matched_keywords
                    })
            
            # 發送新消息事件
            if self.event_callback:
                self.event_callback("discussion-message", {
                    "discussion_id": msg.discussion_id,
                    "message_id": msg.message_id,
                    "user_id": msg.user_id,
                    "username": msg.username,
                    "text": msg.message_text[:200],
                    "is_matched": msg.is_matched,
                    "keywords": msg.matched_keywords
                })
                
        except Exception as e:
            self.log(f"❌ 處理消息失敗: {e}", "error")
    
    async def _save_discussion_message(self, msg: DiscussionMessage) -> int:
        """保存討論組消息"""
        msg_id = await db.execute("""
            INSERT INTO discussion_messages (
                discussion_id, channel_id, channel_post_id, message_id,
                reply_to_message_id, user_id, username, first_name, last_name,
                message_text, message_type, is_matched, matched_keywords,
                sentiment, intent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            msg.discussion_id, msg.channel_id, msg.channel_post_id, msg.message_id,
            msg.reply_to_message_id, msg.user_id, msg.username, msg.first_name, msg.last_name,
            msg.message_text, msg.message_type, 1 if msg.is_matched else 0,
            json.dumps(msg.matched_keywords), msg.sentiment, msg.intent,
            msg.created_at.isoformat() if msg.created_at else datetime.now().isoformat()
        ))
        return msg_id
    
    async def _create_lead_from_message(self, msg: DiscussionMessage):
        """從消息創建 Lead"""
        try:
            # 檢查是否已存在此用戶的 Lead
            existing = await db.fetch_one(
                "SELECT id FROM captured_leads WHERE user_id = ?",
                (msg.user_id,)
            )
            
            if existing:
                # 更新互動次數
                await db.execute("""
                    UPDATE captured_leads SET
                        interactions = interactions + 1,
                        last_interaction_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), existing['id']))
                return
            
            # 創建新 Lead
            await db.execute("""
                INSERT INTO captured_leads (
                    user_id, username, first_name, last_name,
                    source, source_group_id, matched_keyword,
                    status, captured_at, last_interaction_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                msg.user_id, msg.username, msg.first_name, msg.last_name,
                'discussion', msg.discussion_id, ','.join(msg.matched_keywords),
                'new', datetime.now().isoformat(), datetime.now().isoformat()
            ))
            
            # 更新討論組統計
            await db.execute("""
                UPDATE channel_discussions SET
                    lead_count = lead_count + 1
                WHERE discussion_id = ?
            """, (msg.discussion_id,))
            
            self.log(f"👤 新 Lead: @{msg.username} (來源: 討論組)")
            
        except Exception as e:
            self.log(f"❌ 創建 Lead 失敗: {e}", "error")
    
    # ==================== 回復功能 ====================
    
    async def reply_to_message(self, discussion_id: str, message_id: int,
                               reply_text: str, phone: str = None) -> Dict[str, Any]:
        """
        回復討論組消息
        
        Args:
            discussion_id: 討論組 ID
            message_id: 要回復的消息 ID
            reply_text: 回復內容
            phone: 使用的帳號
            
        Returns:
            結果字典
        """
        result = {
            'success': False,
            'reply_message_id': None,
            'error': None
        }
        
        client = self._get_client(phone)
        if not client:
            result['error'] = '沒有可用的帳號'
            return result
        
        # 檢查回復頻率
        if not self._can_reply(phone):
            result['error'] = '已達到回復頻率限制'
            return result
        
        try:
            # 發送回復
            sent_message = await client.send_message(
                chat_id=int(discussion_id),
                text=reply_text,
                reply_to_message_id=message_id
            )
            
            # 記錄回復
            self._record_reply(phone)
            
            # 保存到數據庫
            await db.execute("""
                INSERT INTO discussion_replies (
                    discussion_id, original_message_id, reply_message_id,
                    reply_text, replied_by_phone, replied_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'sent')
            """, (
                discussion_id, message_id, sent_message.id,
                reply_text, phone, datetime.now().isoformat()
            ))
            
            # 更新原消息狀態
            await db.execute("""
                UPDATE discussion_messages SET
                    is_replied = 1, reply_message_id = ?
                WHERE discussion_id = ? AND message_id = ?
            """, (sent_message.id, discussion_id, message_id))
            
            result['success'] = True
            result['reply_message_id'] = sent_message.id
            
            self.log(f"✅ 已回復消息 {message_id} (討論組: {discussion_id})")
            
        except FloodWait as e:
            result['error'] = f'需要等待 {e.value} 秒'
            self.log(f"⏳ 回復頻率限制: {e.value}秒", "warning")
        except ChatAdminRequired:
            result['error'] = '需要管理員權限'
        except UserBannedInChannel:
            result['error'] = '帳號被封禁'
        except Exception as e:
            result['error'] = str(e)
            self.log(f"❌ 回復失敗: {e}", "error")
        
        return result
    
    def _can_reply(self, phone: str) -> bool:
        """檢查是否可以回復"""
        now = time.time()
        hour_ago = now - 3600
        
        if phone not in self._reply_counts:
            self._reply_counts[phone] = []
        
        # 清理過期記錄
        self._reply_counts[phone] = [t for t in self._reply_counts[phone] if t > hour_ago]
        
        return len(self._reply_counts[phone]) < self._max_replies_per_hour
    
    def _record_reply(self, phone: str):
        """記錄回復"""
        if phone not in self._reply_counts:
            self._reply_counts[phone] = []
        self._reply_counts[phone].append(time.time())
    
    # ==================== 數據查詢 ====================
    
    async def list_channel_discussions(self, active_only: bool = True) -> List[Dict]:
        """獲取頻道-討論組列表"""
        conditions = []
        params = []
        
        if active_only:
            conditions.append("is_active = 1")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"""
            SELECT * FROM channel_discussions 
            WHERE {where_clause}
            ORDER BY last_message_at DESC NULLS LAST
        """
        
        results = await db.fetch_all(query, tuple(params))
        return [dict(r) for r in results]
    
    async def get_discussion_messages(self, discussion_id: str, 
                                      limit: int = 50, 
                                      matched_only: bool = False) -> List[Dict]:
        """獲取討論組消息"""
        conditions = ["discussion_id = ?"]
        params = [discussion_id]
        
        if matched_only:
            conditions.append("is_matched = 1")
        
        where_clause = " AND ".join(conditions)
        
        query = f"""
            SELECT * FROM discussion_messages
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ?
        """
        params.append(limit)
        
        results = await db.fetch_all(query, tuple(params))
        
        messages = []
        for r in results:
            d = dict(r)
            if 'matched_keywords' in d and d['matched_keywords']:
                try:
                    d['matched_keywords'] = json.loads(d['matched_keywords'])
                except:
                    d['matched_keywords'] = []
            messages.append(d)
        
        return messages
    
    async def get_statistics(self) -> Dict[str, Any]:
        """獲取統計信息"""
        stats = {
            'total_discussions': 0,
            'monitoring_count': 0,
            'total_messages': 0,
            'matched_messages': 0,
            'leads_from_discussions': 0,
            'today_messages': 0,
            'today_leads': 0
        }
        
        # 討論組統計
        result = await db.fetch_one("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_monitoring = 1 THEN 1 ELSE 0 END) as monitoring,
                SUM(lead_count) as leads
            FROM channel_discussions WHERE is_active = 1
        """)
        if result:
            stats['total_discussions'] = result['total'] or 0
            stats['monitoring_count'] = result['monitoring'] or 0
            stats['leads_from_discussions'] = result['leads'] or 0
        
        # 消息統計
        result = await db.fetch_one("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_matched = 1 THEN 1 ELSE 0 END) as matched
            FROM discussion_messages
        """)
        if result:
            stats['total_messages'] = result['total'] or 0
            stats['matched_messages'] = result['matched'] or 0
        
        # 今日統計
        today = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
        result = await db.fetch_one("""
            SELECT COUNT(*) as count FROM discussion_messages WHERE created_at >= ?
        """, (today,))
        if result:
            stats['today_messages'] = result['count'] or 0
        
        result = await db.fetch_one("""
            SELECT COUNT(*) as count FROM captured_leads 
            WHERE source = 'discussion' AND captured_at >= ?
        """, (today,))
        if result:
            stats['today_leads'] = result['count'] or 0
        
        return stats
    
    # ==================== 輔助方法 ====================
    
    def _get_client(self, phone: str = None) -> Optional[Client]:
        """獲取客戶端"""
        if phone and phone in self._clients:
            client = self._clients[phone]
            if client.is_connected:
                return client
        
        # 返回任意可用的客戶端
        for p, client in self._clients.items():
            if client.is_connected:
                return client
        
        return None
    
    def _get_message_type(self, message: Message) -> str:
        """獲取消息類型"""
        if message.text:
            return "text"
        elif message.photo:
            return "photo"
        elif message.video:
            return "video"
        elif message.audio:
            return "audio"
        elif message.voice:
            return "voice"
        elif message.document:
            return "document"
        elif message.sticker:
            return "sticker"
        else:
            return "other"


# 全局實例
discussion_watcher = DiscussionWatcherService()

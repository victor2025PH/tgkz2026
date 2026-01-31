"""
Group Search Service - 群組/頻道搜索服務
封裝 Telegram 搜索 API，提供群組和頻道搜索功能

功能：
- 關鍵詞搜索群組/頻道
- 獲取群組/頻道詳細信息
- 批量加入群組
- 頻率控制和帳號輪換
"""
import sys
import asyncio
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass

from pyrogram import Client
from pyrogram.types import Chat, Message
from pyrogram.errors import (
    FloodWait, UserBannedInChannel, InviteHashExpired,
    InviteHashInvalid, UserAlreadyParticipant, ChannelPrivate,
    UsernameInvalid, UsernameNotOccupied, PeerIdInvalid,
    ChatAdminRequired, UserKicked,
    ChannelInvalid, ChatInvalid, SearchQueryEmpty
)

# InviteRequestSent 可能在舊版本中不存在
try:
    from pyrogram.errors import InviteRequestSent
except ImportError:
    class InviteRequestSent(Exception):
        pass
from pyrogram.enums import ChatType

from resource_discovery import (
    resource_discovery, DiscoveredResource, 
    ResourceType, ResourceStatus, DiscoverySource
)


@dataclass
class SearchResult:
    """搜索結果"""
    telegram_id: str
    chat_type: str
    username: str
    title: str
    description: str
    member_count: int
    is_public: bool
    has_discussion: bool
    discussion_id: str = ""


class GroupSearchService:
    """群組搜索服務"""
    
    def __init__(self):
        self.event_callback: Optional[Callable] = None
        self._clients: Dict[str, Client] = {}
        self._last_search_time: Dict[str, float] = {}  # phone -> timestamp
        self._search_cooldown = 5  # 搜索間隔（秒）
        self._join_cooldown = 30   # 加入間隔（秒）
        self._max_joins_per_hour = 10  # 每小時最大加入數
        self._join_counts: Dict[str, List[float]] = {}  # phone -> [timestamps]
        
        # 搜索配置
        self.search_config = {
            'max_results_per_search': 100,
            'search_timeout': 30,
            'retry_on_flood': True,
            'max_retries': 3
        }
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_clients(self, clients: Dict[str, Client]):
        """設置客戶端"""
        self._clients = clients
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[GroupSearch] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def _get_available_client(self, exclude_phones: List[str] = None) -> Tuple[str, Client]:
        """獲取可用的客戶端"""
        exclude = exclude_phones or []
        now = time.time()
        
        available = []
        for phone, client in self._clients.items():
            if phone in exclude:
                continue
            if not client.is_connected:
                continue
            
            # 檢查冷卻時間
            last_search = self._last_search_time.get(phone, 0)
            if now - last_search >= self._search_cooldown:
                available.append((phone, client))
        
        if not available:
            # 沒有可用的，返回冷卻時間最長的
            sorted_clients = sorted(
                [(p, c) for p, c in self._clients.items() 
                 if c.is_connected and p not in exclude],
                key=lambda x: self._last_search_time.get(x[0], 0)
            )
            if sorted_clients:
                return sorted_clients[0]
            return None, None
        
        # 隨機選擇一個
        return random.choice(available)
    
    def _can_join(self, phone: str) -> bool:
        """檢查帳號是否可以加入群組"""
        now = time.time()
        hour_ago = now - 3600
        
        # 獲取過去一小時的加入次數
        if phone not in self._join_counts:
            self._join_counts[phone] = []
        
        # 清理過期記錄
        self._join_counts[phone] = [t for t in self._join_counts[phone] if t > hour_ago]
        
        return len(self._join_counts[phone]) < self._max_joins_per_hour
    
    def _record_join(self, phone: str):
        """記錄加入操作"""
        if phone not in self._join_counts:
            self._join_counts[phone] = []
        self._join_counts[phone].append(time.time())
    
    # ==================== 搜索功能 ====================
    
    async def search_groups(self, query: str, phone: str = None,
                           limit: int = 50, search_type: str = "all",
                           min_members: int = 0, language: str = None) -> List[SearchResult]:
        """
        搜索群組/頻道
        
        使用多種搜索策略：
        1. contacts.Search - Telegram 原生搜索 API
        2. get_chat - 直接查找 @username
        3. search_global - 搜索消息所在群組
        
        Args:
            query: 搜索關鍵詞
            phone: 指定使用的帳號（可選）
            limit: 最大結果數
            search_type: 搜索類型 (all, group, channel, supergroup)
            min_members: 最小成員數過濾
            language: 語言過濾（暫不使用）
            
        Returns:
            搜索結果列表
        """
        start_time = time.time()
        results = []
        seen_ids = set()
        
        self.log(f"🔍 search_groups 被調用: query='{query}'")
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
            if not client.is_connected:
                self.log(f"⚠️ 指定帳號 {phone} 未連接", "warning")
                return []
        else:
            phone, client = self._get_available_client()
            if not client:
                self.log("⚠️ 沒有可用的帳號進行搜索", "warning")
                return []
        
        self.log(f"🔍 開始搜索: '{query}' (使用帳號: {phone})")
        
        try:
            # 記錄搜索時間
            self._last_search_time[phone] = time.time()
            
            # 策略 1: 使用 Telegram 原生搜索 API（最可靠）
            self.log("📋 策略1: 使用 contacts.Search API...")
            try:
                from pyrogram.raw import functions, types
                
                search_result = await client.invoke(
                    functions.contacts.Search(
                        q=query,
                        limit=min(limit, 100)
                    )
                )
                
                chats_found = 0
                if hasattr(search_result, 'chats') and search_result.chats:
                    chats_found = len(search_result.chats)
                    self.log(f"📋 contacts.Search 返回 {chats_found} 個 chats")
                    
                    for chat in search_result.chats:
                        try:
                            result = await self._parse_raw_chat(chat, client)
                            if result and result.telegram_id not in seen_ids:
                                # 類型過濾
                                if search_type != "all" and result.chat_type != search_type:
                                    continue
                                # 成員數過濾
                                if min_members > 0 and result.member_count < min_members:
                                    continue
                                    
                                seen_ids.add(result.telegram_id)
                                results.append(result)
                                self.log(f"  ✓ 找到: {result.title} ({result.member_count} 成員)")
                        except Exception as e:
                            self.log(f"  ✗ 解析失敗: {e}", "debug")
                            continue
                else:
                    self.log("📋 contacts.Search 沒有返回結果")
                
            except Exception as e:
                self.log(f"❌ contacts.Search 失敗: {e}", "warning")
                import traceback
                traceback.print_exc()
            
            # 策略 2: 嘗試直接查找（支持 @username、t.me 鏈接、純 username）
            # 檢測是否為可直接查找的格式
            is_tme_link = 't.me/' in query or 'telegram.me/' in query
            is_username = query.startswith('@')
            is_simple_query = not ' ' in query and query.replace('_', '').isalnum()
            
            if len(results) == 0 and (is_tme_link or is_username or is_simple_query):
                self.log("📋 策略2: 嘗試直接查找（支持 t.me 鏈接）...")
                try:
                    # 解析查詢，提取 username 或 ID
                    identifier = query
                    
                    if is_tme_link:
                        # 處理 t.me 鏈接格式
                        # 支持: https://t.me/username, t.me/username, https://t.me/+hash
                        import re
                        # 匹配 t.me/username 或 t.me/+hash 或 t.me/joinchat/hash
                        match = re.search(r't\.me/(?:joinchat/)?([+\w]+)', query)
                        if match:
                            identifier = match.group(1)
                            self.log(f"  📎 從鏈接提取: {identifier}")
                    elif is_username:
                        identifier = query.lstrip('@')
                    
                    # 嘗試獲取群組信息
                    chat = await client.get_chat(identifier)
                    if chat and chat.type in [ChatType.GROUP, ChatType.SUPERGROUP, ChatType.CHANNEL]:
                        result = await self._parse_chat_full(chat)
                        if result and result.telegram_id not in seen_ids:
                            seen_ids.add(result.telegram_id)
                            results.append(result)
                            self.log(f"  ✓ 直接找到: {result.title} ({result.member_count} 成員)")
                except UsernameNotOccupied:
                    self.log(f"  ✗ 用戶名不存在: {query}", "warning")
                except ChannelPrivate:
                    self.log(f"  ✗ 私有群組，需要邀請鏈接: {query}", "warning")
                except Exception as e:
                    self.log(f"  ✗ 直接查找失敗: {e}", "debug")
            
            # 策略 3: 使用 search_global 搜索包含關鍵詞的消息所在群組
            if len(results) < limit:
                self.log("📋 策略3: 使用 search_global 搜索消息...")
                try:
                    message_chats = set()
                    count = 0
                    # 🔧 P0: 增加搜索範圍到 200
                    async for message in client.search_global(query, limit=min(limit * 4, 200)):
                        if count >= limit:
                            break
                        try:
                            if message.chat and message.chat.type in [ChatType.GROUP, ChatType.SUPERGROUP, ChatType.CHANNEL]:
                                chat_id = str(message.chat.id)
                                if chat_id not in seen_ids and chat_id not in message_chats:
                                    message_chats.add(chat_id)
                                    # 獲取完整信息
                                    full_chat = await client.get_chat(message.chat.id)
                                    result = await self._parse_chat_full(full_chat)
                                    if result:
                                        # 類型過濾
                                        if search_type != "all" and result.chat_type != search_type:
                                            continue
                                        # 成員數過濾
                                        if min_members > 0 and result.member_count < min_members:
                                            continue
                                        
                                        seen_ids.add(result.telegram_id)
                                        results.append(result)
                                        count += 1
                        except Exception as e:
                            continue
                    
                    self.log(f"📋 search_global 額外找到 {len(message_chats)} 個")
                    
                except Exception as e:
                    self.log(f"search_global 失敗: {e}", "warning")
            
            # 🔧 P0: 策略 4: 搜索已加入的群組/頻道（按標題和描述匹配）
            if len(results) < limit:
                self.log("📋 策略4: 搜索已加入的群組/頻道...")
                try:
                    query_lower = query.lower()
                    dialog_count = 0
                    matched_count = 0
                    
                    async for dialog in client.get_dialogs():
                        dialog_count += 1
                        if dialog_count > 500:  # 限制遍歷數量
                            break
                        
                        try:
                            chat = dialog.chat
                            if chat.type not in [ChatType.GROUP, ChatType.SUPERGROUP, ChatType.CHANNEL]:
                                continue
                            
                            chat_id = str(chat.id)
                            if chat_id in seen_ids:
                                continue
                            
                            # 檢查標題是否匹配
                            title = (chat.title or '').lower()
                            description = (getattr(chat, 'description', '') or '').lower()
                            username = (chat.username or '').lower()
                            
                            if query_lower in title or query_lower in description or query_lower in username:
                                result = await self._parse_chat_full(chat)
                                if result:
                                    # 類型過濾
                                    if search_type != "all" and result.chat_type != search_type:
                                        continue
                                    # 成員數過濾
                                    if min_members > 0 and result.member_count < min_members:
                                        continue
                                    
                                    seen_ids.add(result.telegram_id)
                                    results.append(result)
                                    matched_count += 1
                                    self.log(f"  ✓ 已加入群組匹配: {result.title}")
                                    
                                    if len(results) >= limit:
                                        break
                        except Exception as e:
                            continue
                    
                    self.log(f"📋 已加入群組搜索: 遍歷 {dialog_count} 個對話，匹配 {matched_count} 個")
                    
                except Exception as e:
                    self.log(f"已加入群組搜索失敗: {e}", "warning")
            
            # 按成員數排序
            results.sort(key=lambda x: x.member_count, reverse=True)
            
            # 限制結果數
            results = results[:limit]
            
            duration_ms = int((time.time() - start_time) * 1000)
            self.log(f"✅ 搜索完成: 找到 {len(results)} 個結果 ({duration_ms}ms)")
            
            # 發送實時進度
            if self.event_callback:
                self.event_callback("search-progress", {
                    "query": query,
                    "found": len(results),
                    "status": "complete"
                })
            
            # 記錄搜索日誌
            await resource_discovery.log_discovery(
                search_type="keyword",
                search_query=query,
                account_phone=phone,
                found=len(results),
                new=0,  # 稍後更新
                duration_ms=duration_ms
            )
            
            return results
            
        except SearchQueryEmpty:
            self.log("⚠️ 搜索關鍵詞為空", "warning")
            return []
        except FloodWait as e:
            self.log(f"⏳ 搜索頻率限制，需等待 {e.value} 秒", "warning")
            if self.event_callback:
                self.event_callback("search-flood-wait", {"wait_seconds": e.value})
            if self.search_config['retry_on_flood'] and e.value <= 60:
                await asyncio.sleep(e.value)
                return await self.search_groups(query, phone, limit, search_type, min_members, language)
            return []
        except Exception as e:
            self.log(f"❌ 搜索失敗: {e}", "error")
            import traceback
            traceback.print_exc()
            await resource_discovery.log_discovery(
                search_type="keyword",
                search_query=query,
                account_phone=phone,
                found=0,
                new=0,
                status="failed",
                error_message=str(e)
            )
            return []
    
    async def _parse_raw_chat(self, raw_chat, client) -> Optional[SearchResult]:
        """解析 Telegram 原始 Chat 對象"""
        try:
            from pyrogram.raw import types
            
            # 確定類型
            if isinstance(raw_chat, types.Channel):
                if raw_chat.megagroup:
                    chat_type = "supergroup"
                else:
                    chat_type = "channel"
            elif isinstance(raw_chat, (types.Chat, types.ChatForbidden)):
                chat_type = "group"
            else:
                return None
            
            # 獲取更多信息
            telegram_id = str(raw_chat.id)
            username = getattr(raw_chat, 'username', '') or ''
            title = getattr(raw_chat, 'title', '') or ''
            
            # 嘗試獲取成員數
            member_count = 0
            if hasattr(raw_chat, 'participants_count'):
                member_count = raw_chat.participants_count or 0
            
            return SearchResult(
                telegram_id=telegram_id,
                chat_type=chat_type,
                username=username,
                title=title,
                description="",  # 原始對象沒有描述
                member_count=member_count,
                is_public=bool(username),
                has_discussion=False,
                discussion_id=""
            )
        except Exception as e:
            self.log(f"解析原始 Chat 失敗: {e}", "debug")
            return None
    
    async def _parse_chat_full(self, chat: Chat) -> Optional[SearchResult]:
        """解析完整的 Pyrogram Chat 對象"""
        if not chat:
            return None
        
        # 只處理群組和頻道
        if chat.type not in [ChatType.GROUP, ChatType.SUPERGROUP, ChatType.CHANNEL]:
            return None
        
        # 確定類型
        if chat.type == ChatType.CHANNEL:
            chat_type = "channel"
        elif chat.type == ChatType.SUPERGROUP:
            chat_type = "supergroup"
        else:
            chat_type = "group"
        
        return SearchResult(
            telegram_id=str(chat.id),
            chat_type=chat_type,
            username=chat.username or "",
            title=chat.title or "",
            description=getattr(chat, 'description', "") or "",
            member_count=getattr(chat, 'members_count', 0) or 0,
            is_public=bool(chat.username),
            has_discussion=bool(getattr(chat, 'linked_chat', None)),
            discussion_id=str(chat.linked_chat.id) if getattr(chat, 'linked_chat', None) else ""
        )
    
    async def _parse_chat(self, chat: Chat) -> Optional[SearchResult]:
        """解析聊天對象"""
        if not chat:
            return None
        
        # 只處理群組和頻道
        if chat.type not in [ChatType.GROUP, ChatType.SUPERGROUP, ChatType.CHANNEL]:
            return None
        
        # 確定類型
        if chat.type == ChatType.CHANNEL:
            chat_type = "channel"
        elif chat.type == ChatType.SUPERGROUP:
            chat_type = "supergroup"
        else:
            chat_type = "group"
        
        return SearchResult(
            telegram_id=str(chat.id),
            chat_type=chat_type,
            username=chat.username or "",
            title=chat.title or "",
            description=getattr(chat, 'description', "") or "",
            member_count=getattr(chat, 'members_count', 0) or 0,
            is_public=bool(chat.username),
            has_discussion=bool(getattr(chat, 'linked_chat', None)),
            discussion_id=str(chat.linked_chat.id) if getattr(chat, 'linked_chat', None) else ""
        )
    
    async def search_and_save(self, query: str, phone: str = None,
                             limit: int = 50, keywords: List[str] = None,
                             search_type: str = "all", min_members: int = 0,
                             language: str = None,
                             search_session_id: str = "",  # 🆕 搜索會話 ID
                             search_keyword: str = "") -> Dict[str, int]:  # 🆕 搜索關鍵詞
        """
        搜索並保存結果到資源庫
        
        Args:
            query: 搜索關鍵詞
            phone: 使用的帳號
            limit: 最大結果數
            keywords: 相關度計算用的關鍵詞列表
            search_type: 類型過濾
            min_members: 最小成員數
            language: 語言過濾
            search_session_id: 搜索會話 ID（用於區分不同搜索）
            search_keyword: 搜索關鍵詞（用於顯示）
            
        Returns:
            統計信息 {found, new, updated}
        """
        results = await self.search_groups(query, phone, limit, search_type, min_members, language)
        
        stats = {'found': len(results), 'new': 0, 'updated': 0}
        relevance_keywords = keywords or [query]
        
        for result in results:
            # 計算相關度評分
            relevance_score = resource_discovery.calculate_relevance_score(
                result.title, result.description, relevance_keywords
            )
            
            # 創建資源對象
            resource = DiscoveredResource(
                resource_type=result.chat_type,
                telegram_id=result.telegram_id,
                username=result.username,
                title=result.title,
                description=result.description,
                member_count=result.member_count,
                activity_score=0.5,  # 初始活躍度
                relevance_score=relevance_score,
                discovery_source="search",
                discovery_keyword=query,
                discovered_by_phone=phone or "",
                is_public=result.is_public,
                has_discussion=result.has_discussion,
                discussion_id=result.discussion_id
            )
            
            # 檢查是否已存在
            existing = await resource_discovery.get_resource_by_telegram_id(result.telegram_id)
            
            if existing:
                # 更新現有資源（同時更新 session_id）
                await resource_discovery.update_resource(existing['id'], resource, 
                    search_session_id=search_session_id,
                    search_keyword=search_keyword or query)
                stats['updated'] += 1
            else:
                # 添加新資源（帶 session_id）
                await resource_discovery.add_resource(resource, 
                    search_session_id=search_session_id,
                    search_keyword=search_keyword or query)
                stats['new'] += 1
        
        self.log(f"📊 搜索結果: 找到 {stats['found']}, 新增 {stats['new']}, 更新 {stats['updated']}")
        
        return stats
    
    # ==================== 獲取詳細信息 ====================
    
    async def get_chat_info(self, chat_id: str, phone: str = None) -> Optional[Dict]:
        """
        獲取群組/頻道詳細信息
        
        Args:
            chat_id: 群組/頻道 ID 或 username
            phone: 使用的帳號
            
        Returns:
            群組信息字典
        """
        if phone and phone in self._clients:
            client = self._clients[phone]
        else:
            phone, client = self._get_available_client()
            if not client:
                return None
        
        try:
            # 嘗試解析 chat_id
            if chat_id.startswith('@'):
                identifier = chat_id
            elif chat_id.startswith('https://t.me/'):
                # 從鏈接提取 username
                identifier = chat_id.replace('https://t.me/', '').split('/')[0]
                if identifier.startswith('+'):
                    # 私有邀請鏈接
                    identifier = chat_id
            else:
                try:
                    identifier = int(chat_id)
                except:
                    identifier = chat_id
            
            chat = await client.get_chat(identifier)
            
            if not chat:
                return None
            
            return {
                'telegram_id': str(chat.id),
                'type': chat.type.name.lower(),
                'username': chat.username or "",
                'title': chat.title or "",
                'description': getattr(chat, 'description', "") or "",
                'member_count': getattr(chat, 'members_count', 0) or 0,
                'is_public': bool(chat.username),
                'has_discussion': bool(getattr(chat, 'linked_chat', None)),
                'discussion_id': str(chat.linked_chat.id) if getattr(chat, 'linked_chat', None) else "",
                'invite_link': getattr(chat, 'invite_link', "") or "",
                'photo': bool(chat.photo)
            }
            
        except UsernameNotOccupied:
            self.log(f"⚠️ 用戶名不存在: {chat_id}", "warning")
            return None
        except ChannelPrivate:
            self.log(f"⚠️ 私有群組/頻道: {chat_id}", "warning")
            return {'error': 'private', 'chat_id': chat_id}
        except Exception as e:
            self.log(f"❌ 獲取群組信息失敗: {e}", "error")
            return None
    
    # ==================== 加入群組 ====================
    
    async def join_chat(self, chat_id: str, phone: str = None,
                       invite_link: str = None) -> Dict[str, Any]:
        """
        加入群組/頻道
        
        Args:
            chat_id: 群組 ID 或 username
            phone: 使用的帳號
            invite_link: 邀請鏈接（可選）
            
        Returns:
            結果字典 {success, chat_id, error_code, error_message}
        """
        result = {
            'success': False,
            'chat_id': chat_id,
            'error_code': None,
            'error_message': None
        }
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
            if not client.is_connected:
                result['error_code'] = 'NOT_CONNECTED'
                result['error_message'] = '帳號未連接'
                return result
        else:
            phone, client = self._get_available_client()
            if not client:
                result['error_code'] = 'NO_ACCOUNT'
                result['error_message'] = '沒有可用的帳號'
                return result
        
        # 檢查加入限制
        if not self._can_join(phone):
            result['error_code'] = 'RATE_LIMIT'
            result['error_message'] = '已達到每小時加入上限'
            return result
        
        self.log(f"🚀 嘗試加入: {chat_id} (使用帳號: {phone})")
        
        try:
            # 優先使用邀請鏈接
            if invite_link:
                chat = await client.join_chat(invite_link)
            elif chat_id.startswith('https://t.me/'):
                chat = await client.join_chat(chat_id)
            elif chat_id.startswith('@'):
                chat = await client.join_chat(chat_id)
            else:
                # 嘗試通過 ID 加入
                try:
                    chat = await client.join_chat(int(chat_id))
                except:
                    chat = await client.join_chat(chat_id)
            
            self._record_join(phone)
            
            result['success'] = True
            result['telegram_id'] = str(chat.id)
            result['title'] = chat.title
            
            self.log(f"✅ 成功加入: {chat.title}")
            
            return result
            
        except UserAlreadyParticipant:
            result['success'] = True
            result['error_code'] = 'ALREADY_MEMBER'
            result['error_message'] = '已經是成員'
            self.log(f"ℹ️ 已經是成員: {chat_id}")
            return result
            
        except InviteRequestSent:
            result['error_code'] = 'REQUEST_SENT'
            result['error_message'] = '已發送加入請求，等待審批'
            self.log(f"📤 已發送加入請求: {chat_id}")
            return result
            
        except UserBannedInChannel:
            result['error_code'] = 'USER_BANNED'
            result['error_message'] = '帳號被此群組封禁'
            self.log(f"🚫 帳號被封禁: {chat_id}", "warning")
            return result
            
        except UserKicked:
            result['error_code'] = 'USER_KICKED'
            result['error_message'] = '帳號被踢出且禁止重新加入'
            return result
            
        except InviteHashExpired:
            result['error_code'] = 'INVITE_EXPIRED'
            result['error_message'] = '邀請鏈接已過期'
            return result
            
        except InviteHashInvalid:
            result['error_code'] = 'INVITE_INVALID'
            result['error_message'] = '邀請鏈接無效'
            return result
            
        except ChannelPrivate:
            result['error_code'] = 'CHANNEL_PRIVATE'
            result['error_message'] = '私有群組，需要邀請鏈接'
            return result
            
        except UsernameNotOccupied:
            result['error_code'] = 'NOT_FOUND'
            result['error_message'] = '群組不存在'
            return result
            
        except FloodWait as e:
            result['error_code'] = 'FLOOD_WAIT'
            result['error_message'] = f'需要等待 {e.value} 秒'
            self.log(f"⏳ 加入頻率限制: {e.value}秒", "warning")
            return result
            
        except Exception as e:
            result['error_code'] = 'UNKNOWN'
            result['error_message'] = str(e)
            self.log(f"❌ 加入失敗: {e}", "error")
            return result
    
    async def batch_join(self, resource_ids: List[int], 
                        delay_range: Tuple[int, int] = (30, 60)) -> Dict[str, Any]:
        """
        批量加入資源
        
        Args:
            resource_ids: 資源 ID 列表
            delay_range: 間隔時間範圍（秒）
            
        Returns:
            統計結果
        """
        stats = {
            'total': len(resource_ids),
            'successCount': 0,
            'failed': 0,
            'skipped': 0,
            'results': []
        }
        
        for i, resource_id in enumerate(resource_ids):
            # 獲取資源信息
            resource = await resource_discovery.get_resource_by_id(resource_id)
            if not resource:
                stats['skipped'] += 1
                continue
            
            # 選擇帳號
            phone, client = self._get_available_client()
            if not client:
                self.log("⚠️ 沒有可用帳號，停止批量加入", "warning")
                break
            
            # 加入
            chat_id = resource.get('username') or resource.get('telegram_id')
            invite_link = resource.get('invite_link')
            
            result = await self.join_chat(
                chat_id=chat_id,
                phone=phone,
                invite_link=invite_link
            )
            
            # 更新資源狀態
            if result['success']:
                await resource_discovery.mark_as_joined(resource_id, phone)
                stats['successCount'] += 1
            else:
                await resource_discovery.mark_join_attempt(
                    resource_id, False,
                    result['error_code'], result['error_message']
                )
                stats['failed'] += 1
            
            stats['results'].append({
                'resource_id': resource_id,
                'title': resource.get('title'),
                **result
            })
            
            # 延遲（除了最後一個）
            if i < len(resource_ids) - 1:
                delay = random.randint(*delay_range)
                self.log(f"⏳ 等待 {delay} 秒後繼續...")
                await asyncio.sleep(delay)
        
        self.log(f"📊 批量加入完成: 成功 {stats['successCount']}, 失敗 {stats['failed']}, 跳過 {stats['skipped']}")
        
        return stats
    
    # ==================== 隊列處理 ====================
    
    async def process_join_queue(self, limit: int = 5) -> Dict[str, Any]:
        """
        處理加入隊列
        
        Args:
            limit: 本次處理的最大數量
            
        Returns:
            處理結果統計
        """
        stats = {'processed': 0, 'successCount': 0, 'failed': 0}
        
        # 獲取待處理項
        pending = await resource_discovery.get_pending_joins(limit=limit)
        
        for item in pending:
            # 獲取可用帳號
            phone = item.get('assigned_phone')
            if phone and phone in self._clients:
                client = self._clients[phone]
            else:
                phone, client = self._get_available_client()
            
            if not client or not self._can_join(phone):
                continue
            
            # 更新狀態為處理中
            await resource_discovery.update_queue_status(item['id'], 'processing')
            
            # 加入
            chat_id = item.get('username') or item.get('telegram_id')
            result = await self.join_chat(
                chat_id=chat_id,
                phone=phone,
                invite_link=item.get('invite_link')
            )
            
            stats['processed'] += 1
            
            if result['success']:
                await resource_discovery.update_queue_status(item['id'], 'completed')
                await resource_discovery.mark_as_joined(item['resource_id'], phone)
                stats['successCount'] += 1
            else:
                await resource_discovery.update_queue_status(
                    item['id'], 'failed', result['error_message']
                )
                await resource_discovery.mark_join_attempt(
                    item['resource_id'], False,
                    result['error_code'], result['error_message']
                )
                stats['failed'] += 1
            
            # 延遲
            await asyncio.sleep(random.randint(30, 60))
        
        return stats


# 全局實例
group_search_service = GroupSearchService()

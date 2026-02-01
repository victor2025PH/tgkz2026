"""
Member Extraction Service - 成員提取服務
提取群組成員信息，分析在線狀態，構建用戶畫像

功能：
- 提取群組/頻道成員列表
- 檢測用戶在線狀態
- 構建用戶畫像
- 批量處理和進度追蹤
"""
import sys
import asyncio
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

from pyrogram import Client
from pyrogram.types import User, ChatMember
from pyrogram.errors import (
    FloodWait, ChannelPrivate, ChatAdminRequired,
    PeerIdInvalid, UserNotParticipant, ChannelInvalid
)
from pyrogram.enums import UserStatus, ChatMemberStatus

from database import db
from text_utils import sanitize_text, safe_get_username


class OnlineStatus(Enum):
    """在線狀態"""
    ONLINE = "online"           # 當前在線
    RECENTLY = "recently"       # 最近上線 (1小時內)
    LAST_WEEK = "last_week"     # 本週上線
    LAST_MONTH = "last_month"   # 本月上線
    LONG_AGO = "long_ago"       # 很久未上線
    HIDDEN = "hidden"           # 隱藏狀態


class MemberValueLevel(Enum):
    """成員價值等級"""
    S = "S"   # 最高價值 - 在線 + 活躍
    A = "A"   # 高價值 - 最近活躍
    B = "B"   # 中等價值 - 本週活躍
    C = "C"   # 低價值 - 本月活躍
    D = "D"   # 極低價值 - 長期不活躍


@dataclass
class ExtractedMember:
    """提取的成員信息"""
    id: Optional[int] = None
    user_id: str = ""
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    phone: str = ""
    
    # 新增：更多用戶信息
    bio: str = ""                      # 個人簡介
    language_code: str = ""            # 語言代碼
    dc_id: int = 0                     # 數據中心 ID
    photo_id: str = ""                 # 頭像 ID
    has_photo: bool = False            # 是否有頭像
    is_scam: bool = False              # 是否被標記為詐騙
    is_fake: bool = False              # 是否被標記為假帳號
    is_restricted: bool = False        # 是否受限制
    restriction_reason: str = ""       # 限制原因
    is_support: bool = False           # 是否為官方支持
    is_self: bool = False              # 是否為自己
    is_contact: bool = False           # 是否為聯繫人
    is_mutual_contact: bool = False    # 是否為互相添加的聯繫人
    is_deleted: bool = False           # 是否已刪除帳號
    
    # 群組內角色信息
    chat_member_status: str = ""       # member, administrator, owner, banned, restricted
    joined_date: Optional[datetime] = None  # 加入群組日期
    
    # 狀態信息
    online_status: str = "hidden"
    last_online: Optional[datetime] = None
    is_bot: bool = False
    is_premium: bool = False
    is_verified: bool = False
    
    # 來源信息
    source_chat_id: str = ""
    source_chat_title: str = ""
    extracted_at: Optional[datetime] = None
    extracted_by_phone: str = ""
    
    # 評分
    value_level: str = "C"
    activity_score: float = 0.5
    
    # 營銷狀態
    contacted: bool = False
    contacted_at: Optional[datetime] = None
    invited: bool = False
    invited_at: Optional[datetime] = None
    response_status: str = ""  # none, replied, blocked, interested
    
    # 標籤和備註
    tags: List[str] = field(default_factory=list)
    notes: str = ""
    
    # 所屬群組列表
    groups: List[str] = field(default_factory=list)


class MemberExtractionService:
    """成員提取服務"""
    
    def __init__(self):
        self.event_callback: Optional[Callable] = None
        self._clients: Dict[str, Client] = {}
        self._extraction_lock = asyncio.Lock()
        self._current_extraction: Dict[str, Any] = {}
        
        # 🆕 P1 優化：Peer 緩存
        self._peer_cache: Dict[str, Dict] = {}  # key: f"{phone}:{chat_id}"
        self._peer_cache_ttl = 300  # 緩存有效期 5 分鐘
        
        # 🆕 P1 優化：提取隊列
        self._extraction_queue: List[Dict] = []
        self._queue_processing = False
        
        # 提取配置
        self.config = {
            'batch_size': 200,           # 每批提取數量
            'batch_delay': 2,            # 批次間延遲（秒）
            'max_members_per_group': 10000,  # 每群最大提取數
            'flood_wait_multiplier': 1.2,    # FloodWait 等待倍數
            'save_interval': 100,        # 每多少個保存一次
            'pre_extraction_delay': 2,   # 🆕 提取前延遲（確保 Telegram 同步）
        }
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_clients(self, clients: Dict[str, Client]):
        """設置客戶端"""
        self._clients = clients
    
    # ==================== P1 優化：Peer 緩存 ====================
    
    def _get_cache_key(self, phone: str, chat_id: str) -> str:
        """生成緩存鍵"""
        return f"{phone}:{chat_id}"
    
    def _get_cached_peer(self, phone: str, chat_id: str) -> Optional[Dict]:
        """從緩存獲取 peer 信息"""
        key = self._get_cache_key(phone, chat_id)
        if key in self._peer_cache:
            cache_entry = self._peer_cache[key]
            # 檢查是否過期
            if time.time() - cache_entry['cached_at'] < self._peer_cache_ttl:
                self.log(f"📦 使用緩存的 peer: {chat_id}", "debug")
                return cache_entry['data']
            else:
                # 過期，刪除
                del self._peer_cache[key]
        return None
    
    def _cache_peer(self, phone: str, chat_id: str, chat_data: Dict):
        """緩存 peer 信息"""
        key = self._get_cache_key(phone, chat_id)
        self._peer_cache[key] = {
            'data': chat_data,
            'cached_at': time.time()
        }
        self.log(f"💾 已緩存 peer: {chat_id}", "debug")
        
        # 清理過期緩存（超過 100 個時）
        if len(self._peer_cache) > 100:
            self._cleanup_peer_cache()
    
    def _cleanup_peer_cache(self):
        """清理過期的緩存條目"""
        now = time.time()
        expired_keys = [
            k for k, v in self._peer_cache.items() 
            if now - v['cached_at'] > self._peer_cache_ttl
        ]
        for key in expired_keys:
            del self._peer_cache[key]
        if expired_keys:
            self.log(f"🧹 清理了 {len(expired_keys)} 個過期緩存", "debug")
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[MemberExtraction] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def _emit_progress(self, chat_id: str, current: int, total: int, status: str = "extracting"):
        """發送提取進度"""
        if self.event_callback:
            self.event_callback("extraction-progress", {
                "chat_id": chat_id,
                "current": current,
                "total": total,
                "percentage": round(current / total * 100, 1) if total > 0 else 0,
                "status": status
            })
    
    def _get_available_client(self) -> Tuple[str, Client]:
        """獲取可用客戶端"""
        for phone, client in self._clients.items():
            if client.is_connected:
                return phone, client
        return None, None
    
    # ==================== 在線狀態分析 ====================
    
    def _analyze_online_status(self, user: User) -> Tuple[str, Optional[datetime], float]:
        """
        分析用戶在線狀態
        
        Returns:
            (狀態, 最後上線時間, 活躍度評分)
        """
        if not user:
            return OnlineStatus.HIDDEN.value, None, 0.3
        
        status = getattr(user, 'status', None)
        
        if status == UserStatus.ONLINE:
            return OnlineStatus.ONLINE.value, datetime.now(), 1.0
        
        elif status == UserStatus.RECENTLY:
            # 最近上線（通常1小時內）
            return OnlineStatus.RECENTLY.value, datetime.now() - timedelta(minutes=30), 0.9
        
        elif status == UserStatus.LAST_WEEK:
            return OnlineStatus.LAST_WEEK.value, datetime.now() - timedelta(days=3), 0.6
        
        elif status == UserStatus.LAST_MONTH:
            return OnlineStatus.LAST_MONTH.value, datetime.now() - timedelta(days=15), 0.4
        
        elif status == UserStatus.LONG_AGO:
            return OnlineStatus.LONG_AGO.value, None, 0.2
        
        else:
            # 隱藏狀態或未知
            return OnlineStatus.HIDDEN.value, None, 0.5
    
    def _calculate_value_level(self, member: ExtractedMember) -> str:
        """計算成員價值等級"""
        score = member.activity_score
        
        # Bot 降級
        if member.is_bot:
            return MemberValueLevel.D.value
        
        # Premium 用戶加分
        if member.is_premium:
            score += 0.1
        
        # 有用戶名加分
        if member.username:
            score += 0.05
        
        # 根據分數判定等級
        if score >= 0.9:
            return MemberValueLevel.S.value
        elif score >= 0.7:
            return MemberValueLevel.A.value
        elif score >= 0.5:
            return MemberValueLevel.B.value
        elif score >= 0.3:
            return MemberValueLevel.C.value
        else:
            return MemberValueLevel.D.value
    
    # ==================== 成員提取 ====================
    
    async def extract_members(
        self, 
        chat_id: str, 
        phone: str = None,
        limit: int = None,
        filter_bots: bool = True,
        filter_offline: bool = False,
        online_status: str = 'all',  # 🔧 添加在線狀態過濾
        save_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        提取群組成員
        
        Args:
            chat_id: 群組 ID 或 username
            phone: 使用的帳號
            limit: 提取數量限制
            filter_bots: 是否過濾 Bot
            filter_offline: 是否過濾長期離線用戶
            online_status: 在線狀態過濾 ('all', 'online', 'recently', 'offline')
            save_to_db: 是否保存到數據庫
            
        Returns:
            提取結果統計
        """
        result = {
            'success': False,
            'chat_id': chat_id,
            'chat_title': '',
            'total_members': 0,
            'extracted': 0,
            'online_count': 0,
            'recently_count': 0,
            'filtered_bots': 0,
            'filtered_offline': 0,
            'new_members': 0,
            'updated_members': 0,
            'duration_ms': 0,
            'error': None
        }
        
        start_time = time.time()
        max_members = limit or self.config['max_members_per_group']
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
        else:
            phone, client = self._get_available_client()
        
        if not client:
            result['error'] = '沒有可用的帳號'
            return result
        
        self.log(f"🔍 開始提取成員: {chat_id} (帳號: {phone})")
        
        try:
            # 🆕 P1 優化：預延遲確保 Telegram 同步
            pre_delay = self.config.get('pre_extraction_delay', 0)
            if pre_delay > 0:
                await asyncio.sleep(pre_delay)
            
            # 🆕 P1 優化：嘗試從緩存獲取群組信息
            cached_peer = self._get_cached_peer(phone, str(chat_id))
            chat = None
            
            if cached_peer:
                # 使用緩存的 chat_id 直接獲取（更快）
                try:
                    chat = await client.get_chat(cached_peer['chat_id'])
                except Exception:
                    # 緩存失效，重新獲取
                    chat = None
            
            if not chat:
                # 獲取群組信息
                chat = await client.get_chat(chat_id)
                # 緩存成功解析的 peer
                self._cache_peer(phone, str(chat_id), {
                    'chat_id': chat.id,
                    'title': chat.title,
                    'type': str(chat.type)
                })
            
            result['chat_title'] = sanitize_text(chat.title) if chat.title else str(chat_id)
            result['total_members'] = getattr(chat, 'members_count', 0) or 0
            
            self.log(f"📊 群組: {result['chat_title']}, 成員數: {result['total_members']}")
            
            # 開始提取
            members = []
            batch_count = 0
            
            async for member in client.get_chat_members(chat.id, limit=max_members):
                try:
                    user = member.user
                    if not user:
                        continue
                    
                    # 過濾 Bot
                    if filter_bots and user.is_bot:
                        result['filtered_bots'] += 1
                        continue
                    
                    # 分析在線狀態
                    user_online_status, last_online, activity_score = self._analyze_online_status(user)
                    
                    # 🔧 修復：根據 online_status 參數過濾
                    # online_status: 'all', 'online', 'recently', 'offline'
                    if online_status == 'online':
                        # 只要在線用戶
                        if user_online_status != OnlineStatus.ONLINE.value:
                            result['filtered_offline'] += 1
                            continue
                    elif online_status == 'recently':
                        # 只要最近活躍用戶（在線或最近上線）
                        if user_online_status not in [OnlineStatus.ONLINE.value, OnlineStatus.RECENTLY.value]:
                            result['filtered_offline'] += 1
                            continue
                    elif online_status == 'offline':
                        # 只要離線用戶
                        if user_online_status == OnlineStatus.ONLINE.value:
                            result['filtered_offline'] += 1
                            continue
                    # 'all' 不過濾
                    
                    # 過濾長期離線（舊邏輯，作為額外過濾）
                    if filter_offline and user_online_status in [OnlineStatus.LONG_AGO.value]:
                        result['filtered_offline'] += 1
                        continue
                    
                    # 獲取成員在群組內的狀態
                    member_status = ""
                    joined_date = None
                    if hasattr(member, 'status'):
                        member_status = str(member.status.value) if member.status else ""
                    if hasattr(member, 'joined_date'):
                        joined_date = member.joined_date
                    
                    # 創建成員對象 - 包含所有可用信息
                    extracted = ExtractedMember(
                        user_id=str(user.id),
                        username=safe_get_username(user),
                        first_name=sanitize_text(user.first_name) if user.first_name else "",
                        last_name=sanitize_text(user.last_name) if user.last_name else "",
                        phone=getattr(user, 'phone_number', "") or "",
                        
                        # 新增字段
                        bio="",  # 需要單獨獲取完整用戶信息
                        language_code=getattr(user, 'language_code', "") or "",
                        dc_id=getattr(user, 'dc_id', 0) or 0,
                        photo_id=str(user.photo.big_file_id) if user.photo else "",
                        has_photo=user.photo is not None,
                        is_scam=getattr(user, 'is_scam', False) or False,
                        is_fake=getattr(user, 'is_fake', False) or False,
                        is_restricted=getattr(user, 'is_restricted', False) or False,
                        restriction_reason=str(getattr(user, 'restriction_reason', "") or ""),
                        is_support=getattr(user, 'is_support', False) or False,
                        is_self=getattr(user, 'is_self', False) or False,
                        is_contact=getattr(user, 'is_contact', False) or False,
                        is_mutual_contact=getattr(user, 'is_mutual_contact', False) or False,
                        is_deleted=getattr(user, 'is_deleted', False) or False,
                        
                        # 群組內角色
                        chat_member_status=member_status,
                        joined_date=joined_date,
                        
                        # 狀態信息 - 🔧 修復：使用 user_online_status
                        online_status=user_online_status,
                        last_online=last_online,
                        is_bot=user.is_bot,
                        is_premium=getattr(user, 'is_premium', False) or False,
                        is_verified=getattr(user, 'is_verified', False) or False,
                        
                        # 來源信息
                        source_chat_id=str(chat.id),
                        source_chat_title=result['chat_title'],
                        extracted_at=datetime.now(),
                        extracted_by_phone=phone,
                        activity_score=activity_score
                    )
                    
                    # 計算價值等級
                    extracted.value_level = self._calculate_value_level(extracted)
                    
                    members.append(extracted)
                    
                    # 統計在線狀態 - 🔧 修復：使用 user_online_status
                    if user_online_status == OnlineStatus.ONLINE.value:
                        result['online_count'] += 1
                    elif user_online_status == OnlineStatus.RECENTLY.value:
                        result['recently_count'] += 1
                    
                    batch_count += 1
                    
                    # 發送進度
                    if batch_count % 50 == 0:
                        self._emit_progress(
                            str(chat.id), 
                            batch_count, 
                            min(result['total_members'], max_members)
                        )
                    
                    # 批次保存
                    if save_to_db and batch_count % self.config['save_interval'] == 0:
                        new, updated = await self._save_members_batch(members[-self.config['save_interval']:])
                        result['new_members'] += new
                        result['updated_members'] += updated
                    
                    # 批次延遲
                    if batch_count % self.config['batch_size'] == 0:
                        await asyncio.sleep(self.config['batch_delay'])
                        
                except Exception as e:
                    self.log(f"⚠️ 處理成員時出錯: {e}", "warning")
                    continue
            
            # 保存剩餘成員
            if save_to_db and members:
                remaining = batch_count % self.config['save_interval']
                if remaining > 0:
                    new, updated = await self._save_members_batch(members[-remaining:])
                    result['new_members'] += new
                    result['updated_members'] += updated
            
            result['success'] = True
            result['extracted'] = len(members)
            result['duration_ms'] = int((time.time() - start_time) * 1000)
            
            # 返回提取的成員列表 - 包含所有字段
            result['members'] = [
                {
                    # 基本信息
                    'id': m.id,
                    'user_id': m.user_id,
                    'username': m.username,
                    'first_name': m.first_name,
                    'last_name': m.last_name,
                    'full_name': f"{m.first_name} {m.last_name}".strip(),
                    'phone': m.phone,
                    
                    # 擴展信息
                    'bio': m.bio,
                    'language_code': m.language_code,
                    'dc_id': m.dc_id,
                    'photo_id': m.photo_id,
                    'has_photo': m.has_photo,
                    
                    # 帳號狀態
                    'is_bot': m.is_bot,
                    'is_premium': m.is_premium,
                    'is_verified': m.is_verified,
                    'is_scam': m.is_scam,
                    'is_fake': m.is_fake,
                    'is_restricted': m.is_restricted,
                    'restriction_reason': m.restriction_reason,
                    'is_support': m.is_support,
                    'is_deleted': m.is_deleted,
                    'is_contact': m.is_contact,
                    'is_mutual_contact': m.is_mutual_contact,
                    
                    # 群組內角色
                    'chat_member_status': m.chat_member_status,
                    'joined_date': m.joined_date.isoformat() if m.joined_date else None,
                    
                    # 在線狀態
                    'online_status': m.online_status,
                    'last_online': m.last_online.isoformat() if m.last_online else None,
                    
                    # 來源信息
                    'source_chat_id': m.source_chat_id,
                    'source_chat_title': m.source_chat_title,
                    'extracted_at': m.extracted_at.isoformat() if m.extracted_at else None,
                    
                    # 評分
                    'activity_score': m.activity_score,
                    'value_level': m.value_level
                }
                for m in members
            ]
            
            self._emit_progress(str(chat.id), len(members), len(members), "completed")
            
            self.log(f"✅ 提取完成: {result['extracted']} 成員, "
                    f"在線 {result['online_count']}, 最近 {result['recently_count']}")
            
            # 記錄日誌
            await self._log_extraction(result, phone)
            
            return result
            
        except FloodWait as e:
            wait_time = int(e.value * self.config['flood_wait_multiplier'])
            self.log(f"⏳ 頻率限制，等待 {wait_time} 秒", "warning")
            result['error'] = f'頻率限制，需等待 {wait_time} 秒'
            result['error_code'] = 'FLOOD_WAIT'
            result['error_details'] = {
                'wait_seconds': wait_time,
                'suggestion': '請稍後重試，或使用其他帳號'
            }
            return result
            
        except ChannelPrivate:
            result['error'] = '私有群組，需要先加入'
            result['error_code'] = 'CHANNEL_PRIVATE'
            result['error_details'] = {
                'reason': '這是一個私有群組，帳號尚未加入',
                'suggestion': '請先使用「加入監控」功能加入群組',
                'can_auto_join': True
            }
            return result
            
        except ChatAdminRequired:
            result['error'] = '需要管理員權限才能查看成員列表'
            result['error_code'] = 'ADMIN_REQUIRED'
            result['error_details'] = {
                'reason': '群組設置限制了成員列表只對管理員可見',
                'suggestion': '可嘗試監控群組消息來收集活躍用戶',
                'alternative': 'monitor_messages'
            }
            return result
        
        except PeerIdInvalid:
            result['error'] = '帳號尚未與此群組建立連接'
            result['error_code'] = 'PEER_ID_INVALID'
            result['error_details'] = {
                'reason': 'Telegram 要求帳號必須先「認識」群組才能訪問',
                'suggestion': '請先使用帳號加入此群組',
                'can_auto_join': True
            }
            return result
        
        except UserNotParticipant:
            result['error'] = '帳號不是群組成員'
            result['error_code'] = 'NOT_PARTICIPANT'
            result['error_details'] = {
                'reason': '當前帳號不是此群組的成員',
                'suggestion': '請先加入群組，或選擇已加入的帳號',
                'can_auto_join': True
            }
            return result
        
        except ChannelInvalid:
            result['error'] = '無效的群組'
            result['error_code'] = 'CHANNEL_INVALID'
            result['error_details'] = {
                'reason': '群組可能已被刪除或 ID 無效',
                'suggestion': '請刷新資源列表'
            }
            return result
            
        except Exception as e:
            error_str = str(e)
            self.log(f"❌ 提取失敗: {error_str}", "error")
            
            # 解析常見錯誤
            if 'PEER_ID_INVALID' in error_str:
                result['error'] = '帳號尚未與此群組建立連接'
                result['error_code'] = 'PEER_ID_INVALID'
                result['error_details'] = {
                    'reason': 'Telegram 要求帳號必須先加入群組',
                    'suggestion': '請先使用帳號加入此群組',
                    'can_auto_join': True
                }
            elif 'CHAT_ADMIN_REQUIRED' in error_str:
                result['error'] = '需要管理員權限'
                result['error_code'] = 'ADMIN_REQUIRED'
                result['error_details'] = {
                    'reason': '群組限制了成員列表訪問',
                    'suggestion': '可嘗試監控消息收集用戶'
                }
            elif 'USERNAME_NOT_OCCUPIED' in error_str:
                # 🔧 FIX: 處理私有群組（無 username）的情況
                result['error'] = '無法解析群組：這是私有群組或 username 無效'
                result['error_code'] = 'USERNAME_NOT_OCCUPIED'
                result['error_details'] = {
                    'reason': '此群組可能是通過邀請鏈接加入的私有群組，沒有公開的 username',
                    'suggestion': '請嘗試手動打開此群組，系統會自動獲取其 Telegram ID',
                    'needs_telegram_id': True
                }
            elif 'INVITE_HASH_INVALID' in error_str or 'INVITE_HASH_EXPIRED' in error_str:
                result['error'] = '邀請鏈接無效或已過期'
                result['error_code'] = 'INVITE_INVALID'
                result['error_details'] = {
                    'reason': '邀請鏈接可能已過期或被撤銷',
                    'suggestion': '請獲取新的邀請鏈接'
                }
            else:
                result['error'] = error_str
                result['error_code'] = 'UNKNOWN'
                result['error_details'] = {
                    'suggestion': '請稍後重試或聯繫支持'
                }
            return result
    
    async def _save_members_batch(self, members: List[ExtractedMember]) -> Tuple[int, int]:
        """批量保存成員"""
        new_count = 0
        updated_count = 0
        
        for member in members:
            try:
                # 檢查是否存在
                existing = await db.fetch_one(
                    "SELECT id, groups FROM extracted_members WHERE user_id = ?",
                    (member.user_id,)
                )
                
                if existing:
                    # 更新現有成員
                    groups = existing['groups'] or '[]'
                    import json
                    groups_list = json.loads(groups)
                    if member.source_chat_id not in groups_list:
                        groups_list.append(member.source_chat_id)
                    
                    await db.execute("""
                        UPDATE extracted_members SET
                            username = ?, first_name = ?, last_name = ?,
                            online_status = ?, last_online = ?, activity_score = ?,
                            value_level = ?, is_premium = ?, groups = ?, updated_at = ?
                        WHERE id = ?
                    """, (
                        member.username, member.first_name, member.last_name,
                        member.online_status, 
                        member.last_online.isoformat() if member.last_online else None,
                        member.activity_score, member.value_level, 
                        1 if member.is_premium else 0,
                        json.dumps(groups_list),
                        datetime.now().isoformat(),
                        existing['id']
                    ))
                    updated_count += 1
                else:
                    # 插入新成員
                    import json
                    await db.execute("""
                        INSERT INTO extracted_members (
                            user_id, username, first_name, last_name, phone,
                            online_status, last_online, is_bot, is_premium, is_verified,
                            source_chat_id, source_chat_title, extracted_at, extracted_by_phone,
                            value_level, activity_score, groups, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        member.user_id, member.username, member.first_name, member.last_name,
                        member.phone, member.online_status,
                        member.last_online.isoformat() if member.last_online else None,
                        1 if member.is_bot else 0,
                        1 if member.is_premium else 0,
                        1 if member.is_verified else 0,
                        member.source_chat_id, member.source_chat_title,
                        member.extracted_at.isoformat() if member.extracted_at else None,
                        member.extracted_by_phone, member.value_level, member.activity_score,
                        json.dumps([member.source_chat_id]),
                        datetime.now().isoformat(), datetime.now().isoformat()
                    ))
                    new_count += 1
                    
            except Exception as e:
                self.log(f"⚠️ 保存成員失敗: {e}", "warning")
                continue
        
        return new_count, updated_count
    
    async def _log_extraction(self, result: Dict, phone: str):
        """記錄提取日誌"""
        await db.execute("""
            INSERT INTO member_extraction_logs (
                chat_id, chat_title, total_members, extracted_count,
                online_count, recently_count, new_count, updated_count,
                duration_ms, account_phone, status, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            result['chat_id'], result['chat_title'], result['total_members'],
            result['extracted'], result['online_count'], result['recently_count'],
            result['new_members'], result['updated_members'], result['duration_ms'],
            phone, 'success' if result['success'] else 'failed',
            result.get('error'), datetime.now().isoformat()
        ))
    
    # ==================== 查詢和篩選 ====================
    
    async def get_members(
        self,
        online_only: bool = False,
        min_value_level: str = None,
        source_chat_id: str = None,
        not_contacted: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """
        獲取成員列表
        
        Args:
            online_only: 只獲取在線/最近上線的
            min_value_level: 最低價值等級
            source_chat_id: 來源群組過濾
            not_contacted: 只獲取未聯繫過的
            limit: 數量限制
            offset: 偏移量
        """
        conditions = []
        params = []
        
        if online_only:
            conditions.append("online_status IN ('online', 'recently')")
        
        if min_value_level:
            level_order = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}
            min_order = level_order.get(min_value_level, 1)
            valid_levels = [k for k, v in level_order.items() if v >= min_order]
            placeholders = ','.join(['?' for _ in valid_levels])
            conditions.append(f"value_level IN ({placeholders})")
            params.extend(valid_levels)
        
        if source_chat_id:
            conditions.append("groups LIKE ?")
            params.append(f'%{source_chat_id}%')
        
        if not_contacted:
            conditions.append("contacted = 0")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"""
            SELECT * FROM extracted_members
            WHERE {where_clause}
            ORDER BY 
                CASE online_status 
                    WHEN 'online' THEN 1 
                    WHEN 'recently' THEN 2 
                    WHEN 'last_week' THEN 3
                    ELSE 4 
                END,
                activity_score DESC
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        
        results = await db.fetch_all(query, tuple(params))
        return [dict(r) for r in results]
    
    async def get_online_members(self, limit: int = 100) -> List[Dict]:
        """獲取當前在線成員"""
        return await self.get_members(online_only=True, limit=limit)
    
    async def get_high_value_members(self, limit: int = 100) -> List[Dict]:
        """獲取高價值成員 (S/A 級)"""
        return await self.get_members(min_value_level='A', limit=limit)
    
    async def count_members(self, source_chat_id: str = None) -> Dict[str, int]:
        """統計成員數量"""
        conditions = []
        params = []
        
        if source_chat_id:
            conditions.append("groups LIKE ?")
            params.append(f'%{source_chat_id}%')
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # 總數
        query = f"SELECT COUNT(*) as count FROM extracted_members WHERE {where_clause}"
        total = await db.fetch_one(query, tuple(params))
        
        # 按狀態統計
        query = f"""
            SELECT online_status, COUNT(*) as count 
            FROM extracted_members WHERE {where_clause}
            GROUP BY online_status
        """
        status_results = await db.fetch_all(query, tuple(params))
        
        # 按等級統計
        query = f"""
            SELECT value_level, COUNT(*) as count 
            FROM extracted_members WHERE {where_clause}
            GROUP BY value_level
        """
        level_results = await db.fetch_all(query, tuple(params))
        
        return {
            'total': total['count'] if total else 0,
            'by_status': {r['online_status']: r['count'] for r in status_results},
            'by_level': {r['value_level']: r['count'] for r in level_results}
        }
    
    # ==================== 成員狀態更新 ====================
    
    async def mark_contacted(self, user_id: str, response: str = None):
        """標記為已聯繫"""
        await db.execute("""
            UPDATE extracted_members SET
                contacted = 1, contacted_at = ?, response_status = ?, updated_at = ?
            WHERE user_id = ?
        """, (datetime.now().isoformat(), response or 'none', 
              datetime.now().isoformat(), user_id))
    
    async def mark_invited(self, user_id: str, success: bool = True):
        """標記為已邀請"""
        await db.execute("""
            UPDATE extracted_members SET
                invited = 1, invited_at = ?, 
                response_status = ?, updated_at = ?
            WHERE user_id = ?
        """, (datetime.now().isoformat(), 
              'invited' if success else 'invite_failed',
              datetime.now().isoformat(), user_id))
    
    async def update_response(self, user_id: str, response: str):
        """更新回復狀態"""
        await db.execute("""
            UPDATE extracted_members SET
                response_status = ?, updated_at = ?
            WHERE user_id = ?
        """, (response, datetime.now().isoformat(), user_id))
    
    async def add_tag(self, user_id: str, tag: str):
        """添加標籤"""
        import json
        member = await db.fetch_one(
            "SELECT tags FROM extracted_members WHERE user_id = ?",
            (user_id,)
        )
        if member:
            tags = json.loads(member['tags'] or '[]')
            if tag not in tags:
                tags.append(tag)
                await db.execute(
                    "UPDATE extracted_members SET tags = ?, updated_at = ? WHERE user_id = ?",
                    (json.dumps(tags), datetime.now().isoformat(), user_id)
                )
    
    # ==================== P1 優化：批量提取隊列 ====================
    
    def add_to_queue(self, extraction_request: Dict) -> str:
        """添加提取任務到隊列"""
        import uuid
        task_id = str(uuid.uuid4())[:8]
        self._extraction_queue.append({
            'task_id': task_id,
            'status': 'pending',
            'request': extraction_request,
            'created_at': time.time(),
            'result': None
        })
        self.log(f"📥 任務已加入隊列: {task_id}", "info")
        return task_id
    
    def get_queue_status(self) -> Dict:
        """獲取隊列狀態"""
        return {
            'queue_length': len(self._extraction_queue),
            'is_processing': self._queue_processing,
            'tasks': [
                {
                    'task_id': t['task_id'],
                    'status': t['status'],
                    'chat_id': t['request'].get('chat_id', 'unknown'),
                    'created_at': t['created_at']
                }
                for t in self._extraction_queue
            ]
        }
    
    async def process_queue(self):
        """處理提取隊列"""
        if self._queue_processing:
            self.log("⚠️ 隊列已在處理中", "warning")
            return
        
        self._queue_processing = True
        self.log(f"🚀 開始處理隊列，共 {len(self._extraction_queue)} 個任務", "info")
        
        try:
            while self._extraction_queue:
                task = self._extraction_queue[0]
                task['status'] = 'processing'
                
                try:
                    # 發送進度事件
                    if self.event_callback:
                        self.event_callback("queue-progress", {
                            "taskId": task['task_id'],
                            "status": "processing",
                            "remaining": len(self._extraction_queue) - 1
                        })
                    
                    # 執行提取
                    request = task['request']
                    result = await self.extract_members(
                        chat_id=request.get('chat_id'),
                        phone=request.get('phone'),
                        limit=request.get('limit'),
                        filter_bots=request.get('filter_bots', True),
                        filter_offline=request.get('filter_offline', False),
                        online_status=request.get('online_status', 'all'),
                        save_to_db=request.get('save_to_db', True)
                    )
                    
                    task['status'] = 'completed' if result.get('success') else 'failed'
                    task['result'] = result
                    
                    # 發送完成事件
                    if self.event_callback:
                        self.event_callback("queue-task-completed", {
                            "taskId": task['task_id'],
                            "success": result.get('success', False),
                            "extracted": result.get('extracted', 0),
                            "error": result.get('error')
                        })
                    
                except Exception as e:
                    task['status'] = 'failed'
                    task['result'] = {'success': False, 'error': str(e)}
                    self.log(f"❌ 隊列任務失敗: {task['task_id']} - {e}", "error")
                
                # 移除已處理的任務
                self._extraction_queue.pop(0)
                
                # 任務間延遲（避免頻率限制）
                if self._extraction_queue:
                    await asyncio.sleep(5)
        
        finally:
            self._queue_processing = False
            self.log("✅ 隊列處理完成", "success")
            
            if self.event_callback:
                self.event_callback("queue-completed", {
                    "totalProcessed": len(self._extraction_queue)
                })
    
    def clear_queue(self):
        """清空隊列"""
        count = len(self._extraction_queue)
        self._extraction_queue.clear()
        self.log(f"🧹 已清空隊列，移除 {count} 個任務", "info")
        return count


# 全局實例
member_extraction_service = MemberExtractionService()

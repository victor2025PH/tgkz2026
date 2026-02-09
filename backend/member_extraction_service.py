"""
Member Extraction Service - 成員提取服務
提取群組成員信息，分析在線狀態，構建用戶畫像

功能：
- 提取群組/頻道成員列表
- 檢測用戶在線狀態
- 構建用戶畫像
- 批量處理和進度追蹤
- 🆕 P2: 智能帳號選擇、結果緩存、成功率監控
"""
import sys
import asyncio
import time
import random
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict

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
        
        # 🆕 P2 優化：結果緩存（24小時有效）
        self._result_cache: Dict[str, Dict] = {}  # key: chat_id
        self._result_cache_ttl = 86400  # 24 小時
        
        # 🆕 P2 優化：成功率統計
        self._stats: Dict[str, Any] = {
            'total_extractions': 0,
            'successful_extractions': 0,
            'failed_extractions': 0,
            'total_members_extracted': 0,
            'by_account': defaultdict(lambda: {'success': 0, 'failed': 0, 'members': 0}),
            'by_error': defaultdict(int),
            'last_24h': []  # 最近 24 小時的提取記錄
        }
        
        # 🆕 P2 優化：背景任務
        self._background_tasks: Dict[str, Dict] = {}
        
        # 提取配置
        self.config = {
            'batch_size': 200,           # 每批提取數量
            'batch_delay': 2,            # 批次間延遲（秒）
            'max_members_per_group': 10000,  # 每群最大提取數
            'flood_wait_multiplier': 1.2,    # FloodWait 等待倍數
            'save_interval': 100,        # 每多少個保存一次
            'pre_extraction_delay': 2,   # 🆕 提取前延遲（確保 Telegram 同步）
            'result_cache_enabled': True,  # 🆕 P2: 啟用結果緩存
            'smart_account_selection': True,  # 🆕 P2: 智能帳號選擇
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
    
    def _emit_progress(self, chat_id: str, current: int, total: int, status: str = "extracting", 
                       start_time: float = None, speed: float = None):
        """發送提取進度 - 🆕 P3 優化：包含預估時間"""
        if self.event_callback:
            progress_data = {
                "chat_id": chat_id,
                "current": current,
                "total": total,
                "percentage": round(current / total * 100, 1) if total > 0 else 0,
                "status": status
            }
            
            # 🆕 P3：計算預估剩餘時間
            if start_time and current > 0:
                elapsed = time.time() - start_time
                current_speed = current / elapsed if elapsed > 0 else 0
                remaining = total - current
                if current_speed > 0 and remaining > 0:
                    estimated_seconds = int(remaining / current_speed)
                    progress_data["estimatedSeconds"] = estimated_seconds
                    progress_data["speed"] = round(current_speed, 1)
                    progress_data["elapsedSeconds"] = int(elapsed)
            
            self.event_callback("extraction-progress", progress_data)
    
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
            'error': None,
            'from_cache': False  # 🆕 P2: 標記是否來自緩存
        }
        
        start_time = time.time()
        max_members = limit or self.config['max_members_per_group']
        
        # 🆕 P2 優化：檢查結果緩存（只對非強制刷新的請求使用）
        cached = self.get_cached_result(chat_id)
        if cached and cached.get('success'):
            # 返回緩存的結果，但標記為來自緩存
            cached_result = cached.copy()
            cached_result['from_cache'] = True
            cached_result['cache_age'] = int(time.time() - self._result_cache.get(str(chat_id), {}).get('cached_at', 0))
            self.log(f"📦 返回緩存結果: {chat_id} (緩存時間: {cached_result['cache_age']}s)", "info")
            return cached_result
        
        # 🆕 P2 優化：智能帳號選擇
        if not phone and self.config.get('smart_account_selection'):
            phone = self.select_best_account(chat_id)
        
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
            # 🆕 Phase4: 主動等待 — 使用 flood_handler 檢查冷卻期
            try:
                from flood_wait_handler import flood_handler
                await flood_handler.wait_before_operation(phone, 'get_participants')
            except Exception as fw_err:
                self.log(f"⚠ flood_handler check skipped: {fw_err}", "warning")
            
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
                    
                    # 發送進度 - 🆕 P3：包含預估時間
                    if batch_count % 50 == 0:
                        self._emit_progress(
                            str(chat.id), 
                            batch_count, 
                            min(result['total_members'], max_members),
                            start_time=start_time
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
            
            # 🆕 P2 優化：緩存成功結果
            if result['success']:
                self._cache_result(chat_id, result)
            
            return result
            
        except FloodWait as e:
            wait_time = int(e.value * self.config['flood_wait_multiplier'])
            # 🆕 Phase4: 記錄 FloodWait 到全局 handler（跨操作共享冷卻期）
            try:
                from flood_wait_handler import flood_handler
                flood_handler.record_flood_wait(phone, wait_time)
            except Exception:
                pass
            
            # 🆕 Phase5-P2: 嘗試帳號輪換 — 如果有其他可用帳號，自動切換
            rotation_attempted = False
            try:
                from flood_wait_handler import flood_handler as fh
                alt_accounts = fh.get_available_accounts(self.telegram_manager.clients, 'get_participants')
                for alt_phone, alt_cooldown in alt_accounts:
                    if alt_phone == phone or alt_cooldown > 0:
                        continue
                    # 有可用的替代帳號 → 使用它重試
                    self.log(f"🔄 帳號 {phone[:4]}**** FloodWait {wait_time}s → 輪換到 {alt_phone[:4]}****", "info")
                    rotation_attempted = True
                    # 遞迴調用，但用新帳號
                    alt_result = await self.extract_members(
                        chat_id=effective_chat_id,
                        phone=alt_phone,
                        save_to_db=self.config.get('auto_save', True),
                        emit_progress=True
                    )
                    if alt_result.get('members_count', 0) > 0:
                        self.log(f"✓ 帳號輪換成功: {alt_phone[:4]}**** 提取 {alt_result.get('members_count', 0)} 成員", "success")
                        alt_result['rotated_from'] = phone
                        alt_result['rotation_reason'] = f"FloodWait {wait_time}s"
                        return alt_result
                    elif alt_result.get('error_code') == 'FLOOD_WAIT':
                        self.log(f"帳號 {alt_phone[:4]}**** 也被限速", "warning")
                        continue
                    else:
                        # 非 FloodWait 錯誤（例如帳號未加入群組），回退原始錯誤
                        break
            except Exception as rotation_err:
                import sys
                print(f"[MemberExtract] Account rotation error: {rotation_err}", file=sys.stderr)
            
            if rotation_attempted:
                self.log(f"⏳ 帳號輪換失敗，所有帳號都被限速", "warning")
            else:
                self.log(f"⏳ 頻率限制，等待 {wait_time} 秒", "warning")
            
            result['error'] = f'頻率限制，需等待 {wait_time} 秒'
            result['error_code'] = 'FLOOD_WAIT'
            result['error_details'] = {
                'wait_seconds': wait_time,
                'suggestion': '所有帳號暫時被限速，請稍後重試' if rotation_attempted else '請稍後重試，或使用其他帳號',
                'rotation_attempted': rotation_attempted
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
    
    # ==================== Phase4: 消息歷史補充提取 ====================
    
    async def extract_active_from_history(
        self,
        chat_id: str,
        phone: str = None,
        message_limit: int = 2000,
        save_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Phase4: 從群組消息歷史中提取活躍用戶
        
        與 extract_members (使用 get_chat_members API) 互補:
        - get_chat_members: 返回所有成員，上限 10,000
        - get_chat_history: 遍歷最近消息，提取消息作者
        
        適用場景:
        1. 群組成員超過 10,000，需要發現活躍用戶
        2. CHAT_ADMIN_REQUIRED 時無法使用 get_chat_members
        3. 需要按活躍度（發言頻率）排序
        
        Returns:
            提取結果，包含 members 列表
        """
        result = {
            'success': False,
            'chat_id': chat_id,
            'chat_title': '',
            'method': 'history',
            'messages_scanned': 0,
            'unique_users': 0,
            'extracted': 0,
            'new_members': 0,
            'updated_members': 0,
            'duration_ms': 0,
            'error': None
        }
        
        start_time = time.time()
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
        else:
            phone, client = self._get_available_client()
        
        if not client:
            result['error'] = '沒有可用的帳號'
            return result
        
        # Phase4: 主動等待
        try:
            from flood_wait_handler import flood_handler
            await flood_handler.wait_before_operation(phone, 'get_chat')
        except Exception:
            pass
        
        self.log(f"🔍 開始從消息歷史提取活躍用戶: {chat_id}")
        
        try:
            chat = await client.get_chat(chat_id)
            result['chat_title'] = sanitize_text(chat.title) if chat.title else str(chat_id)
            
            # 已提取的用戶 ID 集合（避免與 get_chat_members 結果重複）
            existing_user_ids = set()
            try:
                existing = await db.fetch_all(
                    "SELECT user_id FROM extracted_members WHERE source_chat_id = ?",
                    (str(chat.id),)
                )
                if existing:
                    existing_user_ids = {row['user_id'] if isinstance(row, dict) else row[0] for row in existing}
            except Exception:
                pass
            
            # 遍歷消息歷史
            user_activity: Dict[str, Dict] = {}  # user_id -> {info, message_count, last_seen}
            msg_count = 0
            
            async for message in client.get_chat_history(chat.id, limit=message_limit):
                msg_count += 1
                
                if not message.from_user:
                    continue
                
                user = message.from_user
                if user.is_bot:
                    continue
                
                uid = str(user.id)
                
                if uid not in user_activity:
                    user_activity[uid] = {
                        'user_id': uid,
                        'username': user.username,
                        'first_name': getattr(user, 'first_name', '') or '',
                        'last_name': getattr(user, 'last_name', '') or '',
                        'is_premium': getattr(user, 'is_premium', False),
                        'message_count': 0,
                        'last_seen': None,
                        'is_new': uid not in existing_user_ids
                    }
                
                user_activity[uid]['message_count'] += 1
                msg_date = message.date
                if msg_date:
                    if not user_activity[uid]['last_seen'] or msg_date > user_activity[uid]['last_seen']:
                        user_activity[uid]['last_seen'] = msg_date
                
                # 進度更新
                if msg_count % 200 == 0:
                    self._emit_progress(
                        str(chat.id), len(user_activity), 0,
                        start_time=start_time
                    )
                
                # 批次延遲（避免頻率限制）
                if msg_count % 500 == 0:
                    await asyncio.sleep(1)
            
            result['messages_scanned'] = msg_count
            result['unique_users'] = len(user_activity)
            
            # 排序：按消息數量降序（最活躍的在前面）
            sorted_users = sorted(
                user_activity.values(), 
                key=lambda u: u['message_count'], 
                reverse=True
            )
            
            # 保存新用戶到 DB
            new_count = 0
            for user_data in sorted_users:
                if not user_data['is_new']:
                    continue
                
                if save_to_db:
                    try:
                        member = ExtractedMember(
                            user_id=user_data['user_id'],
                            username=user_data['username'],
                            first_name=user_data['first_name'],
                            last_name=user_data['last_name'],
                            is_premium=user_data['is_premium'],
                            online_status='recently',  # 在歷史中出現說明有活動
                            source_chat_id=str(chat.id),
                            source_chat_title=result['chat_title'],
                            activity_score=min(100, user_data['message_count'] * 10),
                            value_level='high' if user_data['message_count'] >= 5 else 'medium'
                        )
                        n, _ = await self._save_members_batch([member])
                        new_count += n
                    except Exception as save_err:
                        self.log(f"⚠ Save error for {user_data['user_id']}: {save_err}", "warning")
            
            result['success'] = True
            result['extracted'] = len(sorted_users)
            result['new_members'] = new_count
            result['duration_ms'] = int((time.time() - start_time) * 1000)
            result['members'] = [
                {
                    'user_id': u['user_id'],
                    'username': u['username'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'full_name': f"{u['first_name']} {u['last_name']}".strip(),
                    'is_premium': u['is_premium'],
                    'message_count': u['message_count'],
                    'last_seen': u['last_seen'].isoformat() if u['last_seen'] else None,
                    'is_new': u['is_new'],
                    'activity_score': min(100, u['message_count'] * 10),
                    'source': 'history'
                }
                for u in sorted_users
            ]
            
            self.log(
                f"✅ 歷史提取完成: 掃描 {msg_count} 條消息，"
                f"發現 {len(user_activity)} 個用戶 (新增 {new_count})"
            )
            
            return result
            
        except Exception as e:
            result['error'] = str(e)
            result['duration_ms'] = int((time.time() - start_time) * 1000)
            self.log(f"❌ 歷史提取失敗: {e}", "error")
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
        
        # 🆕 P2 優化：更新統計
        self._update_stats(result, phone)
    
    # ==================== P2 優化：統計與緩存 ====================
    
    def _update_stats(self, result: Dict, phone: str):
        """更新成功率統計"""
        self._stats['total_extractions'] += 1
        
        if result.get('success'):
            self._stats['successful_extractions'] += 1
            self._stats['total_members_extracted'] += result.get('extracted', 0)
            self._stats['by_account'][phone]['success'] += 1
            self._stats['by_account'][phone]['members'] += result.get('extracted', 0)
        else:
            self._stats['failed_extractions'] += 1
            self._stats['by_account'][phone]['failed'] += 1
            error_code = result.get('error_code', 'UNKNOWN')
            self._stats['by_error'][error_code] += 1
        
        # 記錄最近 24 小時
        record = {
            'timestamp': time.time(),
            'chat_id': result.get('chat_id'),
            'success': result.get('success', False),
            'extracted': result.get('extracted', 0),
            'phone': phone
        }
        self._stats['last_24h'].append(record)
        
        # 清理超過 24 小時的記錄
        cutoff = time.time() - 86400
        self._stats['last_24h'] = [r for r in self._stats['last_24h'] if r['timestamp'] > cutoff]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        success_rate = 0
        if self._stats['total_extractions'] > 0:
            success_rate = self._stats['successful_extractions'] / self._stats['total_extractions'] * 100
        
        # 計算每個帳號的成功率
        account_stats = {}
        for phone, stats in self._stats['by_account'].items():
            total = stats['success'] + stats['failed']
            rate = stats['success'] / total * 100 if total > 0 else 0
            account_stats[phone] = {
                'success': stats['success'],
                'failed': stats['failed'],
                'members': stats['members'],
                'success_rate': round(rate, 1)
            }
        
        # 最近 24 小時統計
        last_24h_success = sum(1 for r in self._stats['last_24h'] if r['success'])
        last_24h_total = len(self._stats['last_24h'])
        last_24h_members = sum(r['extracted'] for r in self._stats['last_24h'] if r['success'])
        
        return {
            'total_extractions': self._stats['total_extractions'],
            'successful': self._stats['successful_extractions'],
            'failed': self._stats['failed_extractions'],
            'success_rate': round(success_rate, 1),
            'total_members': self._stats['total_members_extracted'],
            'by_account': account_stats,
            'by_error': dict(self._stats['by_error']),
            'last_24h': {
                'total': last_24h_total,
                'success': last_24h_success,
                'members': last_24h_members
            }
        }
    
    def _cache_result(self, chat_id: str, result: Dict):
        """緩存提取結果"""
        if not self.config.get('result_cache_enabled'):
            return
        
        self._result_cache[str(chat_id)] = {
            'result': result,
            'cached_at': time.time()
        }
        self.log(f"💾 已緩存提取結果: {chat_id}", "debug")
    
    def get_cached_result(self, chat_id: str) -> Optional[Dict]:
        """獲取緩存的結果"""
        if not self.config.get('result_cache_enabled'):
            return None
        
        key = str(chat_id)
        if key in self._result_cache:
            cache_entry = self._result_cache[key]
            if time.time() - cache_entry['cached_at'] < self._result_cache_ttl:
                self.log(f"📦 使用緩存的提取結果: {chat_id}", "info")
                return cache_entry['result']
            else:
                del self._result_cache[key]
        return None
    
    def clear_result_cache(self, chat_id: str = None):
        """清除結果緩存"""
        if chat_id:
            key = str(chat_id)
            if key in self._result_cache:
                del self._result_cache[key]
                self.log(f"🧹 已清除緩存: {chat_id}", "info")
        else:
            count = len(self._result_cache)
            self._result_cache.clear()
            self.log(f"🧹 已清除所有緩存: {count} 個", "info")
    
    def select_best_account(self, target_chat_id: str = None) -> Optional[str]:
        """
        🆕 P2 優化：智能選擇最佳帳號
        
        選擇策略：
        1. 優先選擇已加入目標群組的帳號
        2. 其次選擇成功率最高的帳號
        3. 避免選擇最近失敗的帳號
        """
        if not self._clients:
            return None
        
        # 獲取每個帳號的評分
        account_scores = {}
        
        for phone in self._clients.keys():
            score = 100  # 基礎分
            
            # 帳號統計
            stats = self._stats['by_account'].get(phone, {'success': 0, 'failed': 0})
            total = stats['success'] + stats['failed']
            
            if total > 0:
                # 成功率加分 (最高 30 分)
                success_rate = stats['success'] / total
                score += success_rate * 30
                
                # 經驗加分（提取越多越可靠，最高 20 分）
                experience_bonus = min(20, total * 2)
                score += experience_bonus
            
            # 最近失敗扣分
            recent_fails = sum(
                1 for r in self._stats['last_24h'][-10:]  # 最近 10 次
                if r.get('phone') == phone and not r.get('success')
            )
            score -= recent_fails * 10
            
            # 檢查是否有目標群組的緩存（表示之前成功過）
            if target_chat_id:
                cache_key = self._get_cache_key(phone, str(target_chat_id))
                if cache_key in self._peer_cache:
                    score += 50  # 已知可用，大幅加分
            
            account_scores[phone] = max(0, score)
        
        if not account_scores:
            return list(self._clients.keys())[0]
        
        # 選擇得分最高的帳號
        best_phone = max(account_scores, key=account_scores.get)
        self.log(f"🎯 智能選擇帳號: {best_phone[:4]}**** (得分: {account_scores[best_phone]:.0f})", "info")
        
        return best_phone
    
    # ==================== P2 優化：背景提取 ====================
    
    async def start_background_extraction(
        self, 
        chat_id: str, 
        phone: str = None,
        **kwargs
    ) -> str:
        """啟動背景提取任務"""
        import uuid
        task_id = str(uuid.uuid4())[:8]
        
        self._background_tasks[task_id] = {
            'status': 'running',
            'chat_id': chat_id,
            'phone': phone,
            'started_at': time.time(),
            'progress': 0,
            'result': None
        }
        
        # 啟動異步任務
        asyncio.create_task(self._run_background_extraction(task_id, chat_id, phone, **kwargs))
        
        self.log(f"🔄 背景提取已啟動: {task_id}", "info")
        return task_id
    
    async def _run_background_extraction(
        self, 
        task_id: str, 
        chat_id: str, 
        phone: str,
        **kwargs
    ):
        """執行背景提取"""
        try:
            result = await self.extract_members(
                chat_id=chat_id,
                phone=phone,
                **kwargs
            )
            
            self._background_tasks[task_id]['status'] = 'completed' if result.get('success') else 'failed'
            self._background_tasks[task_id]['result'] = result
            self._background_tasks[task_id]['completed_at'] = time.time()
            
            # 發送完成事件
            if self.event_callback:
                self.event_callback("background-extraction-completed", {
                    "taskId": task_id,
                    "success": result.get('success', False),
                    "extracted": result.get('extracted', 0),
                    "chatTitle": result.get('chat_title', '')
                })
                
        except Exception as e:
            self._background_tasks[task_id]['status'] = 'error'
            self._background_tasks[task_id]['error'] = str(e)
            self.log(f"❌ 背景提取失敗 [{task_id}]: {e}", "error")
    
    def get_background_task(self, task_id: str) -> Optional[Dict]:
        """獲取背景任務狀態"""
        return self._background_tasks.get(task_id)
    
    def get_all_background_tasks(self) -> List[Dict]:
        """獲取所有背景任務"""
        return [
            {'task_id': tid, **task}
            for tid, task in self._background_tasks.items()
        ]
    
    def cancel_background_task(self, task_id: str) -> bool:
        """取消背景任務（標記為取消，實際任務可能無法中斷）"""
        if task_id in self._background_tasks:
            if self._background_tasks[task_id]['status'] == 'running':
                self._background_tasks[task_id]['status'] = 'cancelled'
                self.log(f"⏹️ 背景任務已標記取消: {task_id}", "info")
                return True
        return False
    
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
    
    # 🆕 P3 優化：帶過濾條件的計數（用於分頁）
    async def count_members_filtered(
        self,
        online_only: bool = False,
        min_value_level: str = None,
        source_chat_id: str = None,
        not_contacted: bool = False
    ) -> int:
        """統計符合條件的成員總數"""
        conditions = []
        params = []
        
        if online_only:
            conditions.append("online_status IN ('online', 'recently')")
        
        if min_value_level:
            level_order = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}
            min_order = level_order.get(min_value_level, 1)
            valid_levels = [k for k, v in level_order.items() if v >= min_order]
            if valid_levels:
                placeholders = ','.join(['?' for _ in valid_levels])
                conditions.append(f"value_level IN ({placeholders})")
                params.extend(valid_levels)
        
        if source_chat_id:
            conditions.append("groups LIKE ?")
            params.append(f'%{source_chat_id}%')
        
        if not_contacted:
            conditions.append("(contacted = 0 OR contacted IS NULL)")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"SELECT COUNT(*) as count FROM extracted_members WHERE {where_clause}"
        result = await db.fetch_one(query, tuple(params))
        
        return result['count'] if result else 0
    
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
    
    # ==================== P4 優化：數據導出 ====================
    
    async def export_members_csv(
        self,
        filters: Dict = None,
        columns: List[str] = None
    ) -> str:
        """導出成員數據為 CSV 格式"""
        import csv
        from io import StringIO
        
        # 默認列
        default_columns = [
            'user_id', 'username', 'first_name', 'last_name', 'phone',
            'online_status', 'value_level', 'source_chat_title',
            'contacted', 'response_status', 'tags', 'extracted_at'
        ]
        columns = columns or default_columns
        
        # 獲取成員
        members = await self.get_members(
            online_only=filters.get('onlineOnly', False) if filters else False,
            min_value_level=filters.get('minValueLevel') if filters else None,
            source_chat_id=filters.get('sourceChatId') if filters else None,
            not_contacted=filters.get('notContacted', False) if filters else False,
            limit=10000  # 最大導出 10000 條
        )
        
        # 生成 CSV
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        
        for member in members:
            # 處理 tags 字段（轉換為字符串）
            if 'tags' in member and isinstance(member['tags'], list):
                member['tags'] = ', '.join(member['tags'])
            writer.writerow(member)
        
        csv_content = output.getvalue()
        self.log(f"📤 導出 {len(members)} 條成員數據", "success")
        
        return csv_content
    
    async def export_members_json(self, filters: Dict = None) -> str:
        """導出成員數據為 JSON 格式"""
        members = await self.get_members(
            online_only=filters.get('onlineOnly', False) if filters else False,
            min_value_level=filters.get('minValueLevel') if filters else None,
            source_chat_id=filters.get('sourceChatId') if filters else None,
            not_contacted=filters.get('notContacted', False) if filters else False,
            limit=10000
        )
        
        export_data = {
            'exported_at': datetime.now().isoformat(),
            'total_count': len(members),
            'members': members
        }
        
        self.log(f"📤 導出 {len(members)} 條成員數據 (JSON)", "success")
        return json.dumps(export_data, ensure_ascii=False, indent=2, default=str)
    
    # ==================== P4 優化：智能去重 ====================
    
    async def deduplicate_members(self) -> Dict[str, int]:
        """跨群組成員去重合併"""
        self.log("🔄 開始成員去重...", "info")
        
        # 查找重複的 user_id
        query = """
            SELECT user_id, COUNT(*) as count, 
                   GROUP_CONCAT(id) as ids,
                   GROUP_CONCAT(source_chat_id) as sources
            FROM extracted_members
            GROUP BY user_id
            HAVING count > 1
        """
        duplicates = await db.fetch_all(query)
        
        merged_count = 0
        deleted_count = 0
        
        for dup in duplicates:
            user_id = dup['user_id']
            ids = dup['ids'].split(',')
            sources = dup['sources'].split(',') if dup['sources'] else []
            
            if len(ids) <= 1:
                continue
            
            # 保留第一條記錄，合併來源群組
            keep_id = ids[0]
            delete_ids = ids[1:]
            
            # 合併群組列表
            unique_sources = list(set(sources))
            groups_json = json.dumps(unique_sources)
            
            # 更新保留的記錄
            await db.execute(
                "UPDATE extracted_members SET groups = ? WHERE id = ?",
                (groups_json, keep_id)
            )
            
            # 刪除重複記錄
            for del_id in delete_ids:
                await db.execute(
                    "DELETE FROM extracted_members WHERE id = ?",
                    (del_id,)
                )
                deleted_count += 1
            
            merged_count += 1
        
        self.log(f"✅ 去重完成: 合併 {merged_count} 個用戶，刪除 {deleted_count} 條重複記錄", "success")
        
        return {
            'merged': merged_count,
            'deleted': deleted_count
        }
    
    # ==================== P4 優化：批量標籤管理 ====================
    
    async def batch_add_tag(self, user_ids: List[str], tag: str) -> int:
        """批量添加標籤"""
        count = 0
        for user_id in user_ids:
            try:
                await self.add_tag(user_id, tag)
                count += 1
            except Exception as e:
                self.log(f"⚠️ 添加標籤失敗 {user_id}: {e}", "warning")
        
        self.log(f"✅ 批量添加標籤完成: {count}/{len(user_ids)}", "success")
        return count
    
    async def batch_remove_tag(self, user_ids: List[str], tag: str) -> int:
        """批量移除標籤"""
        count = 0
        for user_id in user_ids:
            try:
                member = await db.fetch_one(
                    "SELECT tags FROM extracted_members WHERE user_id = ?",
                    (user_id,)
                )
                if member:
                    tags = json.loads(member['tags'] or '[]')
                    if tag in tags:
                        tags.remove(tag)
                        await db.execute(
                            "UPDATE extracted_members SET tags = ?, updated_at = ? WHERE user_id = ?",
                            (json.dumps(tags), datetime.now().isoformat(), user_id)
                        )
                        count += 1
            except Exception as e:
                self.log(f"⚠️ 移除標籤失敗 {user_id}: {e}", "warning")
        
        self.log(f"✅ 批量移除標籤完成: {count}/{len(user_ids)}", "success")
        return count
    
    async def get_all_tags(self) -> List[Dict]:
        """獲取所有使用的標籤及其計數"""
        query = """
            SELECT tags FROM extracted_members WHERE tags IS NOT NULL AND tags != '[]'
        """
        results = await db.fetch_all(query)
        
        tag_counts = {}
        for row in results:
            try:
                tags = json.loads(row['tags'] or '[]')
                for tag in tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
            except:
                continue
        
        return [
            {'tag': tag, 'count': count}
            for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])
        ]
    
    # ==================== P4 優化：群組畫像 ====================
    
    async def get_group_profile(self, chat_id: str) -> Dict[str, Any]:
        """獲取群組畫像分析"""
        # 基本統計
        query = """
            SELECT 
                COUNT(*) as total_members,
                SUM(CASE WHEN online_status = 'online' THEN 1 ELSE 0 END) as online_count,
                SUM(CASE WHEN online_status = 'recently' THEN 1 ELSE 0 END) as recently_count,
                SUM(CASE WHEN value_level = 'S' THEN 1 ELSE 0 END) as s_level,
                SUM(CASE WHEN value_level = 'A' THEN 1 ELSE 0 END) as a_level,
                SUM(CASE WHEN value_level = 'B' THEN 1 ELSE 0 END) as b_level,
                SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premium_count,
                SUM(CASE WHEN username IS NOT NULL AND username != '' THEN 1 ELSE 0 END) as has_username,
                SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) as contacted_count,
                SUM(CASE WHEN response_status = 'replied' THEN 1 ELSE 0 END) as replied_count,
                AVG(activity_score) as avg_activity,
                MAX(extracted_at) as last_extraction
            FROM extracted_members
            WHERE groups LIKE ?
        """
        
        stats = await db.fetch_one(query, (f'%{chat_id}%',))
        
        if not stats or stats['total_members'] == 0:
            return {'error': '沒有找到該群組的成員數據'}
        
        total = stats['total_members']
        
        # 計算各種比率
        profile = {
            'chat_id': chat_id,
            'total_members': total,
            'online_rate': round(stats['online_count'] / total * 100, 1) if total else 0,
            'recently_rate': round(stats['recently_count'] / total * 100, 1) if total else 0,
            'active_rate': round((stats['online_count'] + stats['recently_count']) / total * 100, 1) if total else 0,
            'high_value_rate': round((stats['s_level'] + stats['a_level']) / total * 100, 1) if total else 0,
            'premium_rate': round(stats['premium_count'] / total * 100, 1) if total else 0,
            'username_rate': round(stats['has_username'] / total * 100, 1) if total else 0,
            'contact_rate': round(stats['contacted_count'] / total * 100, 1) if total else 0,
            'reply_rate': round(stats['replied_count'] / stats['contacted_count'] * 100, 1) if stats['contacted_count'] else 0,
            'avg_activity_score': round(stats['avg_activity'], 2) if stats['avg_activity'] else 0,
            'last_extraction': stats['last_extraction'],
            
            # 詳細分布
            'value_distribution': {
                'S': stats['s_level'],
                'A': stats['a_level'],
                'B': stats['b_level'],
                'C': total - stats['s_level'] - stats['a_level'] - stats['b_level']
            },
            'status_distribution': {
                'online': stats['online_count'],
                'recently': stats['recently_count'],
                'offline': total - stats['online_count'] - stats['recently_count']
            },
            
            # 質量評分 (0-100)
            'quality_score': self._calculate_group_quality_score(stats, total)
        }
        
        return profile
    
    def _calculate_group_quality_score(self, stats: Dict, total: int) -> int:
        """計算群組質量評分"""
        if total == 0:
            return 0
        
        score = 0
        
        # 活躍度 (40分)
        active_rate = (stats['online_count'] + stats['recently_count']) / total
        score += min(40, int(active_rate * 80))
        
        # 高價值用戶比例 (30分)
        high_value_rate = (stats['s_level'] + stats['a_level']) / total
        score += min(30, int(high_value_rate * 60))
        
        # Premium 用戶比例 (15分)
        premium_rate = stats['premium_count'] / total
        score += min(15, int(premium_rate * 75))
        
        # 有用戶名比例 (15分)
        username_rate = stats['has_username'] / total
        score += min(15, int(username_rate * 30))
        
        return min(100, score)
    
    async def get_group_comparison(self, chat_ids: List[str]) -> List[Dict]:
        """比較多個群組的質量"""
        profiles = []
        for chat_id in chat_ids:
            profile = await self.get_group_profile(chat_id)
            if 'error' not in profile:
                profiles.append(profile)
        
        # 按質量評分排序
        profiles.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        return profiles
    
    # ==================== P4 優化：智能質量評分 ====================
    
    async def recalculate_member_scores(self, chat_id: str = None) -> int:
        """重新計算成員價值評分"""
        conditions = []
        params = []
        
        if chat_id:
            conditions.append("groups LIKE ?")
            params.append(f'%{chat_id}%')
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # 獲取所有成員
        query = f"""
            SELECT id, online_status, is_premium, username, activity_score,
                   contacted, response_status
            FROM extracted_members WHERE {where_clause}
        """
        members = await db.fetch_all(query, tuple(params))
        
        updated = 0
        for member in members:
            # 計算新的價值等級
            score = 0
            
            # 在線狀態 (40%)
            if member['online_status'] == 'online':
                score += 40
            elif member['online_status'] == 'recently':
                score += 30
            elif member['online_status'] == 'last_week':
                score += 15
            
            # Premium (20%)
            if member['is_premium']:
                score += 20
            
            # 有用戶名 (15%)
            if member['username']:
                score += 15
            
            # 活躍度 (15%)
            activity = member['activity_score'] or 0
            score += int(activity * 15)
            
            # 互動歷史 (10%)
            if member['response_status'] == 'replied':
                score += 10
            elif member['response_status'] == 'interested':
                score += 8
            elif member['contacted']:
                score += 3
            
            # 確定等級
            if score >= 80:
                level = 'S'
            elif score >= 60:
                level = 'A'
            elif score >= 40:
                level = 'B'
            elif score >= 20:
                level = 'C'
            else:
                level = 'D'
            
            # 更新
            await db.execute(
                "UPDATE extracted_members SET value_level = ?, updated_at = ? WHERE id = ?",
                (level, datetime.now().isoformat(), member['id'])
            )
            updated += 1
        
        self.log(f"✅ 重新計算評分完成: 更新 {updated} 個成員", "success")
        return updated


# 全局實例
member_extraction_service = MemberExtractionService()

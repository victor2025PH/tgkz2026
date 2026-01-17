"""
Marketing Outreach Service - 營銷觸達服務
批量邀請用戶入群、發送私信、管理營銷流程

功能：
- 邀請在線用戶入群
- 發送個性化私信
- 營銷漏斗追蹤
- 防封控制策略
"""
import sys
import asyncio
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass
from enum import Enum

from pyrogram import Client
from pyrogram.types import User
from pyrogram.errors import (
    FloodWait, UserPrivacyRestricted, PeerIdInvalid,
    UserNotMutualContact, UserBannedInChannel, UserKicked,
    ChatWriteForbidden, ChatAdminRequired, UserIsBlocked,
    InputUserDeactivated, UsernameNotOccupied
)

from database import db
from text_utils import sanitize_text, safe_get_username
from member_extraction_service import member_extraction_service


class OutreachType(Enum):
    """觸達類型"""
    INVITE = "invite"           # 邀請入群
    PRIVATE_MESSAGE = "pm"      # 私信
    GROUP_MESSAGE = "group"     # 群內消息


class OutreachStatus(Enum):
    """觸達狀態"""
    PENDING = "pending"         # 待處理
    PROCESSING = "processing"   # 處理中
    SUCCESS = "success"         # 成功
    FAILED = "failed"           # 失敗
    BLOCKED = "blocked"         # 被封鎖
    SKIPPED = "skipped"         # 跳過


@dataclass
class OutreachTask:
    """觸達任務"""
    id: Optional[int] = None
    task_type: str = "pm"
    user_id: str = ""
    username: str = ""
    target_chat_id: str = ""    # 邀請目標群
    message_template: str = ""
    message_sent: str = ""
    status: str = "pending"
    error_code: str = ""
    error_message: str = ""
    assigned_phone: str = ""
    scheduled_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class MarketingOutreachService:
    """營銷觸達服務"""
    
    def __init__(self):
        self.event_callback: Optional[Callable] = None
        self._clients: Dict[str, Client] = {}
        self._running = False
        self._current_tasks: Dict[str, asyncio.Task] = {}
        
        # 風控配置
        self.limits = {
            'pm_per_hour': 20,           # 每小時私信數
            'pm_per_day': 50,            # 每日私信數
            'invite_per_hour': 30,       # 每小時邀請數
            'invite_per_day': 100,       # 每日邀請數
            'min_delay': 30,             # 最小延遲（秒）
            'max_delay': 90,             # 最大延遲（秒）
            'flood_wait_multiplier': 1.5,
            'cool_down_after_block': 300,  # 被封後冷卻（秒）
        }
        
        # 操作計數
        self._operation_counts: Dict[str, Dict[str, List[float]]] = {}
        
        # 消息模板變量
        self.template_vars = {
            '{name}': '用戶名稱',
            '{username}': '用戶 @username',
            '{group}': '群組名稱',
            '{date}': '當前日期',
            '{time}': '當前時間',
        }
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_clients(self, clients: Dict[str, Client]):
        """設置客戶端"""
        self._clients = clients
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[MarketingOutreach] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def _emit_progress(self, task_type: str, current: int, total: int, 
                       success: int = 0, failed: int = 0):
        """發送進度"""
        if self.event_callback:
            self.event_callback("outreach-progress", {
                "task_type": task_type,
                "current": current,
                "total": total,
                "success": success,
                "failed": failed,
                "percentage": round(current / total * 100, 1) if total > 0 else 0
            })
    
    # ==================== 風控管理 ====================
    
    def _get_available_client(self, exclude: List[str] = None) -> Tuple[str, Client]:
        """獲取可用客戶端（考慮風控）"""
        exclude = exclude or []
        now = time.time()
        
        available = []
        for phone, client in self._clients.items():
            if phone in exclude:
                continue
            if not client.is_connected:
                continue
            
            # 檢查是否在冷卻中
            if phone in self._operation_counts:
                counts = self._operation_counts[phone]
                if 'block_until' in counts and counts['block_until'] > now:
                    continue
            
            available.append((phone, client))
        
        if not available:
            return None, None
        
        # 選擇操作次數最少的帳號
        def get_recent_ops(phone):
            if phone not in self._operation_counts:
                return 0
            counts = self._operation_counts[phone]
            hour_ago = now - 3600
            pm_count = len([t for t in counts.get('pm', []) if t > hour_ago])
            invite_count = len([t for t in counts.get('invite', []) if t > hour_ago])
            return pm_count + invite_count
        
        available.sort(key=lambda x: get_recent_ops(x[0]))
        return available[0]
    
    def _can_send_pm(self, phone: str) -> bool:
        """檢查是否可以發送私信"""
        now = time.time()
        hour_ago = now - 3600
        day_ago = now - 86400
        
        if phone not in self._operation_counts:
            self._operation_counts[phone] = {'pm': [], 'invite': []}
        
        counts = self._operation_counts[phone]
        
        # 清理過期記錄
        counts['pm'] = [t for t in counts.get('pm', []) if t > day_ago]
        
        # 檢查限制
        hour_count = len([t for t in counts['pm'] if t > hour_ago])
        day_count = len(counts['pm'])
        
        return hour_count < self.limits['pm_per_hour'] and day_count < self.limits['pm_per_day']
    
    def _can_invite(self, phone: str) -> bool:
        """檢查是否可以邀請"""
        now = time.time()
        hour_ago = now - 3600
        day_ago = now - 86400
        
        if phone not in self._operation_counts:
            self._operation_counts[phone] = {'pm': [], 'invite': []}
        
        counts = self._operation_counts[phone]
        counts['invite'] = [t for t in counts.get('invite', []) if t > day_ago]
        
        hour_count = len([t for t in counts['invite'] if t > hour_ago])
        day_count = len(counts['invite'])
        
        return hour_count < self.limits['invite_per_hour'] and day_count < self.limits['invite_per_day']
    
    def _record_operation(self, phone: str, op_type: str):
        """記錄操作"""
        if phone not in self._operation_counts:
            self._operation_counts[phone] = {'pm': [], 'invite': []}
        
        self._operation_counts[phone][op_type].append(time.time())
    
    def _set_cooldown(self, phone: str, seconds: int):
        """設置帳號冷卻"""
        if phone not in self._operation_counts:
            self._operation_counts[phone] = {'pm': [], 'invite': []}
        self._operation_counts[phone]['block_until'] = time.time() + seconds
    
    def _get_random_delay(self) -> int:
        """獲取隨機延遲"""
        return random.randint(self.limits['min_delay'], self.limits['max_delay'])
    
    # ==================== 消息模板處理 ====================
    
    def _render_template(self, template: str, user: Dict, extra_vars: Dict = None) -> str:
        """渲染消息模板"""
        message = template
        
        # 用戶變量
        name = user.get('first_name', '') or user.get('username', '') or '朋友'
        message = message.replace('{name}', name)
        message = message.replace('{username}', '@' + user.get('username', '') if user.get('username') else '')
        
        # 時間變量
        now = datetime.now()
        message = message.replace('{date}', now.strftime('%Y-%m-%d'))
        message = message.replace('{time}', now.strftime('%H:%M'))
        
        # 額外變量
        if extra_vars:
            for key, value in extra_vars.items():
                message = message.replace(f'{{{key}}}', str(value))
        
        return message.strip()
    
    # ==================== 私信發送 ====================
    
    async def send_private_message(
        self,
        user_id: str,
        message: str,
        phone: str = None
    ) -> Dict[str, Any]:
        """
        發送私信
        
        Args:
            user_id: 用戶 ID 或 username
            message: 消息內容
            phone: 使用的帳號
            
        Returns:
            發送結果
        """
        result = {
            'success': False,
            'user_id': user_id,
            'error_code': None,
            'error_message': None
        }
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
            if not self._can_send_pm(phone):
                result['error_code'] = 'RATE_LIMIT'
                result['error_message'] = '已達到發送限制'
                return result
        else:
            phone, client = self._get_available_client()
            if not client:
                result['error_code'] = 'NO_ACCOUNT'
                result['error_message'] = '沒有可用帳號'
                return result
            if not self._can_send_pm(phone):
                result['error_code'] = 'RATE_LIMIT'
                result['error_message'] = '所有帳號都達到限制'
                return result
        
        try:
            # 發送消息
            sent = await client.send_message(user_id, message)
            
            self._record_operation(phone, 'pm')
            
            result['success'] = True
            result['message_id'] = sent.id
            
            self.log(f"✅ 私信發送成功: {user_id}")
            
            # 更新成員狀態
            await member_extraction_service.mark_contacted(user_id)
            
            return result
            
        except UserPrivacyRestricted:
            result['error_code'] = 'PRIVACY'
            result['error_message'] = '用戶隱私設置不允許私信'
            
        except UserNotMutualContact:
            result['error_code'] = 'NOT_CONTACT'
            result['error_message'] = '需要先添加好友'
            
        except UserIsBlocked:
            result['error_code'] = 'BLOCKED'
            result['error_message'] = '用戶已被封鎖或不存在'
            
        except InputUserDeactivated:
            result['error_code'] = 'DEACTIVATED'
            result['error_message'] = '用戶帳號已停用'
            
        except PeerIdInvalid:
            result['error_code'] = 'INVALID_USER'
            result['error_message'] = '無效的用戶 ID'
            
        except FloodWait as e:
            result['error_code'] = 'FLOOD_WAIT'
            result['error_message'] = f'需要等待 {e.value} 秒'
            self._set_cooldown(phone, int(e.value * self.limits['flood_wait_multiplier']))
            
        except Exception as e:
            result['error_code'] = 'UNKNOWN'
            result['error_message'] = str(e)
            self.log(f"❌ 私信發送失敗: {e}", "error")
        
        return result
    
    async def batch_send_messages(
        self,
        user_ids: List[str],
        message_template: str,
        delay_range: Tuple[int, int] = None
    ) -> Dict[str, Any]:
        """
        批量發送私信
        
        Args:
            user_ids: 用戶 ID 列表
            message_template: 消息模板
            delay_range: 延遲範圍
            
        Returns:
            批量發送統計
        """
        stats = {
            'total': len(user_ids),
            'success': 0,
            'failed': 0,
            'skipped': 0,
            'results': []
        }
        
        delay_range = delay_range or (self.limits['min_delay'], self.limits['max_delay'])
        
        for i, user_id in enumerate(user_ids):
            # 獲取用戶信息用於模板渲染
            user = await db.fetch_one(
                "SELECT * FROM extracted_members WHERE user_id = ?",
                (user_id,)
            )
            
            if not user:
                stats['skipped'] += 1
                continue
            
            # 渲染消息
            message = self._render_template(message_template, dict(user))
            
            # 發送
            result = await self.send_private_message(user_id, message)
            
            stats['results'].append(result)
            
            if result['success']:
                stats['success'] += 1
            else:
                stats['failed'] += 1
            
            # 發送進度
            self._emit_progress('pm', i + 1, len(user_ids), stats['success'], stats['failed'])
            
            # 延遲（除了最後一個）
            if i < len(user_ids) - 1:
                delay = random.randint(*delay_range)
                self.log(f"⏳ 等待 {delay} 秒...")
                await asyncio.sleep(delay)
        
        self.log(f"📊 批量發送完成: 成功 {stats['success']}, 失敗 {stats['failed']}")
        
        return stats
    
    # ==================== 邀請入群 ====================
    
    async def invite_to_group(
        self,
        user_id: str,
        group_id: str,
        phone: str = None
    ) -> Dict[str, Any]:
        """
        邀請用戶入群
        
        Args:
            user_id: 用戶 ID
            group_id: 目標群組 ID
            phone: 使用的帳號
            
        Returns:
            邀請結果
        """
        result = {
            'success': False,
            'user_id': user_id,
            'group_id': group_id,
            'error_code': None,
            'error_message': None
        }
        
        # 獲取客戶端
        if phone and phone in self._clients:
            client = self._clients[phone]
            if not self._can_invite(phone):
                result['error_code'] = 'RATE_LIMIT'
                result['error_message'] = '已達到邀請限制'
                return result
        else:
            phone, client = self._get_available_client()
            if not client:
                result['error_code'] = 'NO_ACCOUNT'
                result['error_message'] = '沒有可用帳號'
                return result
            if not self._can_invite(phone):
                result['error_code'] = 'RATE_LIMIT'
                result['error_message'] = '所有帳號都達到限制'
                return result
        
        try:
            # 解析用戶 ID
            try:
                target_user = int(user_id)
            except:
                target_user = user_id
            
            # 解析群組 ID
            try:
                target_group = int(group_id)
            except:
                target_group = group_id
            
            # 添加用戶到群組
            await client.add_chat_members(target_group, target_user)
            
            self._record_operation(phone, 'invite')
            
            result['success'] = True
            
            self.log(f"✅ 邀請成功: {user_id} -> {group_id}")
            
            # 更新成員狀態
            await member_extraction_service.mark_invited(user_id, True)
            
            return result
            
        except UserPrivacyRestricted:
            result['error_code'] = 'PRIVACY'
            result['error_message'] = '用戶隱私設置不允許被邀請'
            
        except UserNotMutualContact:
            result['error_code'] = 'NOT_CONTACT'
            result['error_message'] = '需要先添加好友'
            
        except UserBannedInChannel:
            result['error_code'] = 'USER_BANNED'
            result['error_message'] = '用戶被該群封禁'
            
        except UserKicked:
            result['error_code'] = 'USER_KICKED'
            result['error_message'] = '用戶被踢出該群'
            
        except ChatAdminRequired:
            result['error_code'] = 'ADMIN_REQUIRED'
            result['error_message'] = '需要管理員權限'
            
        except PeerIdInvalid:
            result['error_code'] = 'INVALID_PEER'
            result['error_message'] = '無效的用戶或群組'
            
        except FloodWait as e:
            result['error_code'] = 'FLOOD_WAIT'
            result['error_message'] = f'需要等待 {e.value} 秒'
            self._set_cooldown(phone, int(e.value * self.limits['flood_wait_multiplier']))
            
        except Exception as e:
            result['error_code'] = 'UNKNOWN'
            result['error_message'] = str(e)
            self.log(f"❌ 邀請失敗: {e}", "error")
        
        # 更新成員狀態為邀請失敗
        await member_extraction_service.mark_invited(user_id, False)
        
        return result
    
    async def batch_invite(
        self,
        user_ids: List[str],
        group_id: str,
        delay_range: Tuple[int, int] = None
    ) -> Dict[str, Any]:
        """
        批量邀請入群
        
        Args:
            user_ids: 用戶 ID 列表
            group_id: 目標群組
            delay_range: 延遲範圍
            
        Returns:
            批量邀請統計
        """
        stats = {
            'total': len(user_ids),
            'success': 0,
            'failed': 0,
            'results': []
        }
        
        delay_range = delay_range or (self.limits['min_delay'], self.limits['max_delay'])
        
        for i, user_id in enumerate(user_ids):
            result = await self.invite_to_group(user_id, group_id)
            
            stats['results'].append(result)
            
            if result['success']:
                stats['success'] += 1
            else:
                stats['failed'] += 1
            
            # 發送進度
            self._emit_progress('invite', i + 1, len(user_ids), stats['success'], stats['failed'])
            
            # 延遲
            if i < len(user_ids) - 1:
                delay = random.randint(*delay_range)
                self.log(f"⏳ 等待 {delay} 秒...")
                await asyncio.sleep(delay)
        
        self.log(f"📊 批量邀請完成: 成功 {stats['success']}, 失敗 {stats['failed']}")
        
        return stats
    
    # ==================== 營銷流程管理 ====================
    
    async def create_campaign(
        self,
        name: str,
        campaign_type: str,
        target_users: List[str] = None,
        target_group: str = None,
        message_template: str = None,
        schedule_at: datetime = None
    ) -> int:
        """創建營銷活動"""
        campaign_id = await db.execute("""
            INSERT INTO marketing_campaigns (
                name, campaign_type, target_group, message_template,
                status, scheduled_at, created_at
            ) VALUES (?, ?, ?, ?, 'draft', ?, ?)
        """, (
            name, campaign_type, target_group, message_template,
            schedule_at.isoformat() if schedule_at else None,
            datetime.now().isoformat()
        ))
        
        # 添加目標用戶
        if target_users:
            for user_id in target_users:
                await db.execute("""
                    INSERT INTO campaign_targets (campaign_id, user_id, status, created_at)
                    VALUES (?, ?, 'pending', ?)
                """, (campaign_id, user_id, datetime.now().isoformat()))
        
        self.log(f"📢 創建營銷活動: {name} (ID: {campaign_id})")
        
        return campaign_id
    
    async def start_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """啟動營銷活動"""
        campaign = await db.fetch_one(
            "SELECT * FROM marketing_campaigns WHERE id = ?",
            (campaign_id,)
        )
        
        if not campaign:
            return {'success': False, 'error': '活動不存在'}
        
        # 更新狀態
        await db.execute(
            "UPDATE marketing_campaigns SET status = 'running', started_at = ? WHERE id = ?",
            (datetime.now().isoformat(), campaign_id)
        )
        
        # 獲取目標用戶
        targets = await db.fetch_all(
            "SELECT user_id FROM campaign_targets WHERE campaign_id = ? AND status = 'pending'",
            (campaign_id,)
        )
        
        user_ids = [t['user_id'] for t in targets]
        
        # 根據類型執行
        if campaign['campaign_type'] == 'pm':
            stats = await self.batch_send_messages(
                user_ids,
                campaign['message_template']
            )
        elif campaign['campaign_type'] == 'invite':
            stats = await self.batch_invite(
                user_ids,
                campaign['target_group']
            )
        else:
            return {'success': False, 'error': '未知活動類型'}
        
        # 更新統計
        await db.execute("""
            UPDATE marketing_campaigns SET
                status = 'completed', completed_at = ?,
                total_targets = ?, success_count = ?, failed_count = ?
            WHERE id = ?
        """, (
            datetime.now().isoformat(),
            stats['total'], stats['success'], stats['failed'],
            campaign_id
        ))
        
        return {'success': True, 'stats': stats}
    
    async def get_campaign_stats(self, campaign_id: int = None) -> Dict[str, Any]:
        """獲取活動統計"""
        if campaign_id:
            campaign = await db.fetch_one(
                "SELECT * FROM marketing_campaigns WHERE id = ?",
                (campaign_id,)
            )
            return dict(campaign) if campaign else None
        
        # 總體統計
        stats = {
            'total_campaigns': 0,
            'running': 0,
            'completed': 0,
            'total_messages': 0,
            'total_invites': 0,
            'success_rate': 0
        }
        
        campaigns = await db.fetch_all("SELECT * FROM marketing_campaigns")
        stats['total_campaigns'] = len(campaigns)
        
        for c in campaigns:
            if c['status'] == 'running':
                stats['running'] += 1
            elif c['status'] == 'completed':
                stats['completed'] += 1
            
            if c['campaign_type'] == 'pm':
                stats['total_messages'] += c.get('total_targets', 0)
            elif c['campaign_type'] == 'invite':
                stats['total_invites'] += c.get('total_targets', 0)
        
        return stats


# 全局實例
marketing_outreach_service = MarketingOutreachService()

"""
跟進提醒系統
Follow-up Reminder System

功能:
1. 智能提醒待跟進客戶
2. 根據客戶狀態設置提醒頻率
3. 自動檢測無響應客戶
4. 提醒優先級排序
"""

import sys
import asyncio
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import json


class ReminderPriority(Enum):
    """提醒優先級"""
    URGENT = "urgent"       # 緊急（紅色）
    HIGH = "high"           # 高（橙色）
    MEDIUM = "medium"       # 中（黃色）
    LOW = "low"             # 低（藍色）


class ReminderType(Enum):
    """提醒類型"""
    NO_RESPONSE = "no_response"           # 無響應
    SCHEDULED = "scheduled"                # 計劃跟進
    HOT_LEAD = "hot_lead"                  # 熱門客戶
    EXPIRING_OPPORTUNITY = "expiring"      # 機會即將過期
    DAILY_FOLLOWUP = "daily"               # 每日跟進
    CUSTOM = "custom"                      # 自定義


@dataclass
class Reminder:
    """提醒"""
    id: str
    lead_id: int
    lead_name: str
    lead_username: str = ""
    type: ReminderType = ReminderType.SCHEDULED
    priority: ReminderPriority = ReminderPriority.MEDIUM
    message: str = ""
    due_at: datetime = field(default_factory=datetime.now)
    created_at: datetime = field(default_factory=datetime.now)
    completed: bool = False
    completed_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None
    snooze_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_due(self) -> bool:
        """是否到期"""
        if self.completed:
            return False
        if self.snoozed_until and datetime.now() < self.snoozed_until:
            return False
        return datetime.now() >= self.due_at
    
    def snooze(self, minutes: int = 30):
        """延後提醒"""
        self.snoozed_until = datetime.now() + timedelta(minutes=minutes)
        self.snooze_count += 1
    
    def complete(self):
        """完成提醒"""
        self.completed = True
        self.completed_at = datetime.now()


@dataclass
class FollowUpConfig:
    """跟進配置"""
    # 無響應提醒時間（小時）
    no_response_hours: Dict[str, int] = field(default_factory=lambda: {
        "hot": 4,      # 熱門客戶 4 小時
        "warm": 12,    # 溫暖客戶 12 小時
        "neutral": 24, # 中性客戶 24 小時
        "cold": 48     # 冷淡客戶 48 小時
    })
    
    # 計劃跟進間隔（天）
    scheduled_followup_days: Dict[str, int] = field(default_factory=lambda: {
        "New": 1,           # 新客戶 1 天
        "Contacted": 2,     # 已聯繫 2 天
        "Replied": 3,       # 已回覆 3 天
        "Follow-up": 1,     # 跟進中 1 天
    })
    
    # 最大提醒次數
    max_reminders_per_lead: int = 5
    
    # 提醒檢查間隔（分鐘）
    check_interval_minutes: int = 30


class FollowUpReminderSystem:
    """跟進提醒系統"""
    
    def __init__(self, database=None):
        self.database = database
        self.reminders: Dict[str, Reminder] = {}
        self.config = FollowUpConfig()
        self.event_callback: Optional[Callable] = None
        self.running = False
        self._check_task: Optional[asyncio.Task] = None
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_database(self, database):
        """設置數據庫"""
        self.database = database
    
    async def start(self):
        """啟動提醒系統"""
        if self.running:
            return
        
        self.running = True
        self._check_task = asyncio.create_task(self._check_loop())
        print("[FollowUpReminder] 提醒系統已啟動", file=sys.stderr)
    
    async def stop(self):
        """停止提醒系統"""
        self.running = False
        if self._check_task:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
        print("[FollowUpReminder] 提醒系統已停止", file=sys.stderr)
    
    async def _check_loop(self):
        """定期檢查循環"""
        while self.running:
            try:
                await self._check_leads_for_followup()
                await self._process_due_reminders()
            except Exception as e:
                print(f"[FollowUpReminder] 檢查錯誤: {e}", file=sys.stderr)
            
            await asyncio.sleep(self.config.check_interval_minutes * 60)
    
    async def _check_leads_for_followup(self):
        """檢查需要跟進的客戶"""
        if not self.database:
            return
        
        try:
            leads = await self.database.get_all_leads()
            now = datetime.now()
            
            for lead in leads:
                lead_id = lead.get('id')
                status = lead.get('status', 'New')
                intent_level = lead.get('intent_level', 'neutral')
                last_contact = lead.get('last_contact_at')
                
                # 跳過已轉化或已失去的客戶
                if status in ['Closed-Won', 'Closed-Lost']:
                    continue
                
                # 計算上次聯繫時間
                if last_contact:
                    if isinstance(last_contact, str):
                        last_contact = datetime.fromisoformat(last_contact.replace('Z', '+00:00'))
                    hours_since = (now - last_contact).total_seconds() / 3600
                else:
                    hours_since = 999  # 從未聯繫
                
                # 根據意圖等級確定提醒閾值
                threshold_hours = self.config.no_response_hours.get(intent_level, 24)
                
                # 檢查是否需要創建無響應提醒
                if hours_since > threshold_hours:
                    reminder_id = f"no_response_{lead_id}"
                    if reminder_id not in self.reminders:
                        await self.create_reminder(
                            lead_id=lead_id,
                            lead_name=lead.get('first_name') or lead.get('username') or str(lead_id),
                            lead_username=lead.get('username', ''),
                            reminder_type=ReminderType.NO_RESPONSE,
                            priority=self._get_priority_from_intent(intent_level),
                            message=f"客戶 {hours_since:.0f} 小時未響應，建議跟進"
                        )
        
        except Exception as e:
            print(f"[FollowUpReminder] 檢查客戶錯誤: {e}", file=sys.stderr)
    
    async def _process_due_reminders(self):
        """處理到期的提醒"""
        due_reminders = [r for r in self.reminders.values() if r.is_due()]
        
        for reminder in due_reminders:
            await self._notify_reminder(reminder)
    
    async def _notify_reminder(self, reminder: Reminder):
        """發送提醒通知"""
        if self.event_callback:
            self.event_callback("reminder-due", {
                "id": reminder.id,
                "leadId": reminder.lead_id,
                "leadName": reminder.lead_name,
                "leadUsername": reminder.lead_username,
                "type": reminder.type.value,
                "priority": reminder.priority.value,
                "message": reminder.message,
                "dueAt": reminder.due_at.isoformat(),
                "snoozeCount": reminder.snooze_count
            })
    
    def _get_priority_from_intent(self, intent_level: str) -> ReminderPriority:
        """根據意圖等級確定優先級"""
        mapping = {
            "hot": ReminderPriority.URGENT,
            "warm": ReminderPriority.HIGH,
            "neutral": ReminderPriority.MEDIUM,
            "cold": ReminderPriority.LOW,
            "none": ReminderPriority.LOW
        }
        return mapping.get(intent_level, ReminderPriority.MEDIUM)
    
    async def create_reminder(
        self,
        lead_id: int,
        lead_name: str,
        lead_username: str = "",
        reminder_type: ReminderType = ReminderType.SCHEDULED,
        priority: ReminderPriority = ReminderPriority.MEDIUM,
        message: str = "",
        due_at: datetime = None,
        metadata: Dict[str, Any] = None
    ) -> Reminder:
        """創建提醒"""
        import uuid
        
        reminder_id = str(uuid.uuid4())[:8]
        
        if due_at is None:
            due_at = datetime.now()
        
        reminder = Reminder(
            id=reminder_id,
            lead_id=lead_id,
            lead_name=lead_name,
            lead_username=lead_username,
            type=reminder_type,
            priority=priority,
            message=message,
            due_at=due_at,
            metadata=metadata or {}
        )
        
        self.reminders[reminder_id] = reminder
        
        print(f"[FollowUpReminder] 創建提醒: {lead_name} - {message}", file=sys.stderr)
        
        return reminder
    
    def get_reminder(self, reminder_id: str) -> Optional[Reminder]:
        """獲取提醒"""
        return self.reminders.get(reminder_id)
    
    def get_all_reminders(self, include_completed: bool = False) -> List[Reminder]:
        """獲取所有提醒"""
        reminders = list(self.reminders.values())
        if not include_completed:
            reminders = [r for r in reminders if not r.completed]
        return sorted(reminders, key=lambda r: (r.priority.value != 'urgent', r.due_at))
    
    def get_due_reminders(self) -> List[Reminder]:
        """獲取到期的提醒"""
        return [r for r in self.reminders.values() if r.is_due()]
    
    def snooze_reminder(self, reminder_id: str, minutes: int = 30):
        """延後提醒"""
        reminder = self.reminders.get(reminder_id)
        if reminder:
            reminder.snooze(minutes)
            print(f"[FollowUpReminder] 延後提醒 {minutes} 分鐘: {reminder.lead_name}", file=sys.stderr)
    
    def complete_reminder(self, reminder_id: str):
        """完成提醒"""
        reminder = self.reminders.get(reminder_id)
        if reminder:
            reminder.complete()
            print(f"[FollowUpReminder] 完成提醒: {reminder.lead_name}", file=sys.stderr)
    
    def dismiss_reminder(self, reminder_id: str):
        """取消提醒"""
        if reminder_id in self.reminders:
            del self.reminders[reminder_id]
            print(f"[FollowUpReminder] 取消提醒: {reminder_id}", file=sys.stderr)
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        reminders = list(self.reminders.values())
        active = [r for r in reminders if not r.completed]
        due = [r for r in active if r.is_due()]
        
        return {
            "total": len(reminders),
            "active": len(active),
            "due": len(due),
            "completed": len(reminders) - len(active),
            "by_priority": {
                "urgent": len([r for r in active if r.priority == ReminderPriority.URGENT]),
                "high": len([r for r in active if r.priority == ReminderPriority.HIGH]),
                "medium": len([r for r in active if r.priority == ReminderPriority.MEDIUM]),
                "low": len([r for r in active if r.priority == ReminderPriority.LOW])
            },
            "by_type": {
                t.value: len([r for r in active if r.type == t])
                for t in ReminderType
            }
        }


# 全局實例
_reminder_system = None

def get_reminder_system() -> FollowUpReminderSystem:
    """獲取全局提醒系統實例"""
    global _reminder_system
    if _reminder_system is None:
        _reminder_system = FollowUpReminderSystem()
    return _reminder_system


async def create_follow_up_reminder(
    lead_id: int,
    lead_name: str,
    message: str = "",
    priority: str = "medium",
    due_in_minutes: int = 0
) -> Dict[str, Any]:
    """創建跟進提醒（異步接口）"""
    system = get_reminder_system()
    
    priority_enum = ReminderPriority(priority) if priority in [p.value for p in ReminderPriority] else ReminderPriority.MEDIUM
    due_at = datetime.now() + timedelta(minutes=due_in_minutes) if due_in_minutes > 0 else datetime.now()
    
    reminder = await system.create_reminder(
        lead_id=lead_id,
        lead_name=lead_name,
        reminder_type=ReminderType.SCHEDULED,
        priority=priority_enum,
        message=message,
        due_at=due_at
    )
    
    return {
        "id": reminder.id,
        "leadId": reminder.lead_id,
        "message": reminder.message,
        "priority": reminder.priority.value,
        "dueAt": reminder.due_at.isoformat()
    }

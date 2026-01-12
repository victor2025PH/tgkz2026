"""
TG-Matrix Ad Manager
Core advertising management system for scheduling and sending ads
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum

from ad_template import SpintaxGenerator, get_ad_template_manager


class SendMode(Enum):
    """Ad sending modes"""
    SCHEDULED = "scheduled"      # 定時發送
    TRIGGERED = "triggered"      # 關鍵詞觸發發送
    RELAY = "relay"              # 接力發送 (多帳號輪流)
    INTERVAL = "interval"        # 間隔循環發送


class AccountStrategy(Enum):
    """Account selection strategies"""
    SINGLE = "single"            # 使用單一帳號
    ROTATE = "rotate"            # 輪換帳號
    RELAY = "relay"              # 接力發送
    RANDOM = "random"            # 隨機選擇


class ScheduleType(Enum):
    """Schedule types"""
    ONCE = "once"                # 一次性發送
    DAILY = "daily"              # 每日發送
    INTERVAL = "interval"        # 間隔發送
    CRON = "cron"                # Cron 表達式


@dataclass
class AdSchedule:
    """Ad schedule configuration"""
    id: int
    template_id: int
    name: str
    target_groups: List[str]     # List of group IDs
    send_mode: SendMode
    schedule_type: ScheduleType
    schedule_time: Optional[str]  # HH:MM or cron expression
    interval_minutes: int
    trigger_keywords: List[str]
    account_strategy: AccountStrategy
    assigned_accounts: List[str]  # List of phone numbers
    is_active: bool
    last_run_at: Optional[str]
    next_run_at: Optional[str]
    run_count: int
    success_count: int
    fail_count: int
    created_at: str
    updated_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "templateId": self.template_id,
            "name": self.name,
            "targetGroups": self.target_groups,
            "sendMode": self.send_mode.value,
            "scheduleType": self.schedule_type.value,
            "scheduleTime": self.schedule_time,
            "intervalMinutes": self.interval_minutes,
            "triggerKeywords": self.trigger_keywords,
            "accountStrategy": self.account_strategy.value,
            "assignedAccounts": self.assigned_accounts,
            "isActive": self.is_active,
            "lastRunAt": self.last_run_at,
            "nextRunAt": self.next_run_at,
            "runCount": self.run_count,
            "successCount": self.success_count,
            "failCount": self.fail_count,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


@dataclass
class AdSendLog:
    """Ad send log record"""
    id: int
    template_id: int
    schedule_id: Optional[int]
    account_phone: str
    target_group_id: str
    target_group_title: str
    message_id: Optional[int]
    variant_content: str
    status: str  # 'sent' | 'failed' | 'deleted' | 'banned'
    error_message: Optional[str]
    sent_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "templateId": self.template_id,
            "scheduleId": self.schedule_id,
            "accountPhone": self.account_phone,
            "targetGroupId": self.target_group_id,
            "targetGroupTitle": self.target_group_title,
            "messageId": self.message_id,
            "variantContent": self.variant_content,
            "status": self.status,
            "errorMessage": self.error_message,
            "sentAt": self.sent_at
        }


class AdManager:
    """
    Core advertising management system
    
    Features:
    - Schedule management (create, update, delete schedules)
    - Send mode support (scheduled, triggered, relay, interval)
    - Account strategy management
    - Send logging and analytics
    - Rate limiting and anti-ban measures
    """
    
    # Rate limiting defaults
    MIN_SEND_INTERVAL = 30  # Minimum seconds between sends to same group
    MAX_SENDS_PER_HOUR = 20  # Maximum sends per account per hour
    MAX_SENDS_PER_DAY = 100  # Maximum sends per account per day
    
    def __init__(self, db, event_callback: Callable = None):
        self.db = db
        self.event_callback = event_callback
        self._initialized = False
        
        # Rate limiting tracking
        self._last_send_times: Dict[str, datetime] = {}  # group_id -> last_send_time
        self._account_send_counts: Dict[str, Dict[str, int]] = {}  # phone -> {'hour': count, 'day': count}
        
        # Current account index for rotation
        self._rotation_index: Dict[int, int] = {}  # schedule_id -> current_index
    
    async def initialize(self):
        """Initialize ad manager tables"""
        if self._initialized:
            return
        
        try:
            # Create ad_schedules table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS ad_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    target_groups TEXT NOT NULL,
                    send_mode TEXT NOT NULL,
                    schedule_type TEXT NOT NULL,
                    schedule_time TEXT,
                    interval_minutes INTEGER DEFAULT 60,
                    trigger_keywords TEXT,
                    account_strategy TEXT DEFAULT 'single',
                    assigned_accounts TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    last_run_at TEXT,
                    next_run_at TEXT,
                    run_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    fail_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (template_id) REFERENCES ad_templates(id) ON DELETE CASCADE
                )
            ''')
            
            # Create ad_send_logs table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS ad_send_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_id INTEGER NOT NULL,
                    schedule_id INTEGER,
                    account_phone TEXT NOT NULL,
                    target_group_id TEXT NOT NULL,
                    target_group_title TEXT,
                    message_id INTEGER,
                    variant_content TEXT,
                    status TEXT DEFAULT 'sent',
                    error_message TEXT,
                    sent_at TEXT NOT NULL
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_ad_schedules_active 
                ON ad_schedules(is_active)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_ad_send_logs_template 
                ON ad_send_logs(template_id)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_ad_send_logs_date 
                ON ad_send_logs(sent_at DESC)
            ''')
            
            self._initialized = True
            print("[AdManager] Ad manager initialized", file=sys.stderr)
            
        except Exception as e:
            print(f"[AdManager] Error initializing: {e}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    # ==================== Schedule Management ====================
    
    async def create_schedule(
        self,
        template_id: int,
        name: str,
        target_groups: List[str],
        send_mode: str,
        schedule_type: str,
        assigned_accounts: List[str],
        schedule_time: Optional[str] = None,
        interval_minutes: int = 60,
        trigger_keywords: Optional[List[str]] = None,
        account_strategy: str = "single"
    ) -> Dict[str, Any]:
        """Create a new ad schedule"""
        # Validate template exists
        template_manager = get_ad_template_manager()
        if template_manager:
            template = await template_manager.get_template(template_id)
            if not template:
                return {"success": False, "error": "模板不存在"}
        
        # Validate required fields
        if not name or not name.strip():
            return {"success": False, "error": "計劃名稱不能為空"}
        if not target_groups:
            return {"success": False, "error": "請選擇目標群組"}
        if not assigned_accounts:
            return {"success": False, "error": "請選擇發送帳號"}
        
        # Validate enums
        try:
            send_mode_enum = SendMode(send_mode)
            schedule_type_enum = ScheduleType(schedule_type)
            account_strategy_enum = AccountStrategy(account_strategy)
        except ValueError as e:
            return {"success": False, "error": f"無效的參數: {e}"}
        
        now = datetime.now().isoformat()
        next_run = self._calculate_next_run(schedule_type_enum, schedule_time, interval_minutes)
        
        try:
            cursor = await self.db.execute('''
                INSERT INTO ad_schedules 
                (template_id, name, target_groups, send_mode, schedule_type, 
                 schedule_time, interval_minutes, trigger_keywords, account_strategy,
                 assigned_accounts, is_active, next_run_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            ''', (
                template_id,
                name.strip(),
                json.dumps(target_groups),
                send_mode,
                schedule_type,
                schedule_time,
                interval_minutes,
                json.dumps(trigger_keywords or []),
                account_strategy,
                json.dumps(assigned_accounts),
                next_run,
                now,
                now
            ))
            
            schedule_id = cursor.lastrowid
            
            return {
                "success": True,
                "scheduleId": schedule_id,
                "name": name.strip(),
                "nextRunAt": next_run
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_schedule(
        self,
        schedule_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing schedule"""
        # Build update query
        field_mapping = {
            'templateId': 'template_id',
            'name': 'name',
            'targetGroups': 'target_groups',
            'sendMode': 'send_mode',
            'scheduleType': 'schedule_type',
            'scheduleTime': 'schedule_time',
            'intervalMinutes': 'interval_minutes',
            'triggerKeywords': 'trigger_keywords',
            'accountStrategy': 'account_strategy',
            'assignedAccounts': 'assigned_accounts',
            'isActive': 'is_active'
        }
        
        update_parts = []
        params = []
        
        for js_field, db_field in field_mapping.items():
            if js_field in updates:
                value = updates[js_field]
                # Handle JSON fields
                if js_field in ['targetGroups', 'triggerKeywords', 'assignedAccounts']:
                    value = json.dumps(value)
                elif js_field == 'isActive':
                    value = 1 if value else 0
                
                update_parts.append(f"{db_field} = ?")
                params.append(value)
        
        if not update_parts:
            return {"success": False, "error": "沒有要更新的欄位"}
        
        # Recalculate next run time if schedule changed
        if any(f in updates for f in ['scheduleType', 'scheduleTime', 'intervalMinutes']):
            schedule = await self.get_schedule(schedule_id)
            if schedule:
                schedule_type = updates.get('scheduleType', schedule.schedule_type.value)
                schedule_time = updates.get('scheduleTime', schedule.schedule_time)
                interval = updates.get('intervalMinutes', schedule.interval_minutes)
                next_run = self._calculate_next_run(
                    ScheduleType(schedule_type), schedule_time, interval
                )
                update_parts.append("next_run_at = ?")
                params.append(next_run)
        
        update_parts.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(schedule_id)
        
        try:
            await self.db.execute(f'''
                UPDATE ad_schedules 
                SET {', '.join(update_parts)}
                WHERE id = ?
            ''', tuple(params))
            
            return {"success": True, "scheduleId": schedule_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def delete_schedule(self, schedule_id: int) -> Dict[str, Any]:
        """Delete an ad schedule"""
        try:
            await self.db.execute('DELETE FROM ad_schedules WHERE id = ?', (schedule_id,))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_schedule(self, schedule_id: int) -> Optional[AdSchedule]:
        """Get a single schedule by ID"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM ad_schedules WHERE id = ?', 
                (schedule_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_schedule(row)
            
        except Exception as e:
            print(f"[AdManager] Error getting schedule: {e}", file=sys.stderr)
            return None
    
    async def get_all_schedules(self, active_only: bool = False) -> List[AdSchedule]:
        """Get all schedules"""
        try:
            query = 'SELECT * FROM ad_schedules'
            if active_only:
                query += ' WHERE is_active = 1'
            query += ' ORDER BY created_at DESC'
            
            rows = await self.db.fetch_all(query)
            
            return [self._row_to_schedule(row) for row in rows]
            
        except Exception as e:
            print(f"[AdManager] Error getting schedules: {e}", file=sys.stderr)
            return []
    
    async def toggle_schedule_status(self, schedule_id: int) -> Dict[str, Any]:
        """Toggle schedule active status"""
        try:
            schedule = await self.get_schedule(schedule_id)
            if not schedule:
                return {"success": False, "error": "計劃不存在"}
            
            new_status = not schedule.is_active
            await self.db.execute('''
                UPDATE ad_schedules SET is_active = ?, updated_at = ?
                WHERE id = ?
            ''', (1 if new_status else 0, datetime.now().isoformat(), schedule_id))
            
            return {"success": True, "isActive": new_status}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _row_to_schedule(self, row) -> AdSchedule:
        """Convert database row to AdSchedule object"""
        return AdSchedule(
            id=row['id'],
            template_id=row['template_id'],
            name=row['name'],
            target_groups=json.loads(row['target_groups']),
            send_mode=SendMode(row['send_mode']),
            schedule_type=ScheduleType(row['schedule_type']),
            schedule_time=row['schedule_time'],
            interval_minutes=row['interval_minutes'],
            trigger_keywords=json.loads(row['trigger_keywords'] or '[]'),
            account_strategy=AccountStrategy(row['account_strategy']),
            assigned_accounts=json.loads(row['assigned_accounts']),
            is_active=bool(row['is_active']),
            last_run_at=row['last_run_at'],
            next_run_at=row['next_run_at'],
            run_count=row['run_count'],
            success_count=row['success_count'],
            fail_count=row['fail_count'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def _calculate_next_run(
        self, 
        schedule_type: ScheduleType, 
        schedule_time: Optional[str],
        interval_minutes: int
    ) -> Optional[str]:
        """Calculate next run time based on schedule type"""
        now = datetime.now()
        
        if schedule_type == ScheduleType.ONCE:
            if schedule_time:
                # Parse schedule_time as datetime
                try:
                    return schedule_time
                except:
                    pass
            return now.isoformat()
        
        elif schedule_type == ScheduleType.INTERVAL:
            next_run = now + timedelta(minutes=interval_minutes)
            return next_run.isoformat()
        
        elif schedule_type == ScheduleType.DAILY:
            if schedule_time:
                try:
                    hour, minute = map(int, schedule_time.split(':'))
                    next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    if next_run <= now:
                        next_run += timedelta(days=1)
                    return next_run.isoformat()
                except:
                    pass
            return (now + timedelta(days=1)).isoformat()
        
        return now.isoformat()
    
    # ==================== Send Logging ====================
    
    async def log_send(
        self,
        template_id: int,
        account_phone: str,
        target_group_id: str,
        target_group_title: str,
        variant_content: str,
        status: str = "sent",
        message_id: Optional[int] = None,
        schedule_id: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> int:
        """Log an ad send"""
        try:
            cursor = await self.db.execute('''
                INSERT INTO ad_send_logs 
                (template_id, schedule_id, account_phone, target_group_id, 
                 target_group_title, message_id, variant_content, status, 
                 error_message, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                template_id,
                schedule_id,
                account_phone,
                target_group_id,
                target_group_title,
                message_id,
                variant_content,
                status,
                error_message,
                datetime.now().isoformat()
            ))
            
            # Update schedule stats if applicable
            if schedule_id:
                if status == 'sent':
                    await self.db.execute('''
                        UPDATE ad_schedules 
                        SET run_count = run_count + 1, success_count = success_count + 1,
                            last_run_at = ?
                        WHERE id = ?
                    ''', (datetime.now().isoformat(), schedule_id))
                else:
                    await self.db.execute('''
                        UPDATE ad_schedules 
                        SET run_count = run_count + 1, fail_count = fail_count + 1,
                            last_run_at = ?
                        WHERE id = ?
                    ''', (datetime.now().isoformat(), schedule_id))
            
            # Update template stats
            template_manager = get_ad_template_manager()
            if template_manager:
                await template_manager.increment_use_count(template_id, status == 'sent')
            
            return cursor.lastrowid
            
        except Exception as e:
            print(f"[AdManager] Error logging send: {e}", file=sys.stderr)
            return -1
    
    async def get_send_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        template_id: Optional[int] = None,
        schedule_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get send logs with filtering"""
        try:
            query = 'SELECT * FROM ad_send_logs WHERE 1=1'
            params = []
            
            if template_id:
                query += ' AND template_id = ?'
                params.append(template_id)
            if schedule_id:
                query += ' AND schedule_id = ?'
                params.append(schedule_id)
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            # Get total count
            count_query = query.replace('SELECT *', 'SELECT COUNT(*) as count')
            count_row = await self.db.fetch_one(count_query, tuple(params))
            total = count_row['count'] if count_row else 0
            
            # Get logs
            query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            logs = []
            for row in rows:
                logs.append({
                    "id": row['id'],
                    "templateId": row['template_id'],
                    "scheduleId": row['schedule_id'],
                    "accountPhone": row['account_phone'],
                    "targetGroupId": row['target_group_id'],
                    "targetGroupTitle": row['target_group_title'],
                    "messageId": row['message_id'],
                    "variantContent": row['variant_content'],
                    "status": row['status'],
                    "errorMessage": row['error_message'],
                    "sentAt": row['sent_at']
                })
            
            return {
                "success": True,
                "logs": logs,
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== Rate Limiting ====================
    
    def can_send_to_group(self, group_id: str) -> bool:
        """Check if we can send to a group (rate limiting)"""
        last_send = self._last_send_times.get(group_id)
        if last_send:
            elapsed = (datetime.now() - last_send).total_seconds()
            if elapsed < self.MIN_SEND_INTERVAL:
                return False
        return True
    
    def can_account_send(self, phone: str) -> bool:
        """Check if an account can send (rate limiting)"""
        counts = self._account_send_counts.get(phone, {'hour': 0, 'day': 0})
        if counts['hour'] >= self.MAX_SENDS_PER_HOUR:
            return False
        if counts['day'] >= self.MAX_SENDS_PER_DAY:
            return False
        return True
    
    def record_send(self, group_id: str, phone: str):
        """Record a send for rate limiting"""
        self._last_send_times[group_id] = datetime.now()
        
        if phone not in self._account_send_counts:
            self._account_send_counts[phone] = {'hour': 0, 'day': 0}
        self._account_send_counts[phone]['hour'] += 1
        self._account_send_counts[phone]['day'] += 1
    
    def reset_hourly_counts(self):
        """Reset hourly send counts (call every hour)"""
        for phone in self._account_send_counts:
            self._account_send_counts[phone]['hour'] = 0
    
    def reset_daily_counts(self):
        """Reset daily send counts (call every day)"""
        self._account_send_counts = {}
    
    # ==================== Account Selection ====================
    
    def get_next_account(
        self, 
        schedule: AdSchedule,
        exclude_accounts: Optional[List[str]] = None
    ) -> Optional[str]:
        """Get next account based on strategy"""
        available = [a for a in schedule.assigned_accounts 
                     if self.can_account_send(a)]
        
        if exclude_accounts:
            available = [a for a in available if a not in exclude_accounts]
        
        if not available:
            return None
        
        strategy = schedule.account_strategy
        
        if strategy == AccountStrategy.SINGLE:
            return available[0]
        
        elif strategy == AccountStrategy.RANDOM:
            import random
            return random.choice(available)
        
        elif strategy in [AccountStrategy.ROTATE, AccountStrategy.RELAY]:
            # Get current index for this schedule
            current_idx = self._rotation_index.get(schedule.id, 0)
            
            # Select account
            selected = available[current_idx % len(available)]
            
            # Update index
            self._rotation_index[schedule.id] = (current_idx + 1) % len(available)
            
            return selected
        
        return available[0] if available else None


# Global instance
ad_manager: Optional[AdManager] = None


async def init_ad_manager(db, event_callback=None) -> AdManager:
    """Initialize ad manager"""
    global ad_manager
    ad_manager = AdManager(db, event_callback)
    await ad_manager.initialize()
    return ad_manager


def get_ad_manager() -> Optional[AdManager]:
    """Get ad manager instance"""
    return ad_manager

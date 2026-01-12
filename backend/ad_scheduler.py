"""
TG-Matrix Ad Scheduler
Handles scheduled and triggered ad sending
"""
import asyncio
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
import json

from ad_manager import get_ad_manager, AdSchedule, ScheduleType, SendMode
from ad_broadcaster import get_ad_broadcaster


class AdScheduler:
    """
    Ad scheduling service
    
    Features:
    - Scheduled sends (once, daily, interval)
    - Triggered sends (keyword-based)
    - Background task management
    - Schedule status monitoring
    """
    
    CHECK_INTERVAL = 30  # Check schedules every 30 seconds
    
    def __init__(self, event_callback: Callable = None, log_callback: Callable = None):
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._keyword_handlers: Dict[str, List[int]] = {}  # keyword -> [schedule_ids]
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[AdScheduler] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def start(self):
        """Start the scheduler"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        
        # Load keyword triggers
        await self._load_keyword_triggers()
        
        self.log_callback("廣告排程器已啟動", "success")
        self._send_event("ad-scheduler-started", {"status": "running"})
    
    async def stop(self):
        """Stop the scheduler"""
        self._running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        
        self.log_callback("廣告排程器已停止", "info")
        self._send_event("ad-scheduler-stopped", {"status": "stopped"})
    
    async def _scheduler_loop(self):
        """Main scheduler loop"""
        while self._running:
            try:
                await self._check_schedules()
            except Exception as e:
                self.log_callback(f"排程檢查錯誤: {e}", "error")
            
            await asyncio.sleep(self.CHECK_INTERVAL)
    
    async def _check_schedules(self):
        """Check and execute due schedules"""
        ad_manager = get_ad_manager()
        broadcaster = get_ad_broadcaster()
        
        if not ad_manager or not broadcaster:
            return
        
        # Get active schedules
        schedules = await ad_manager.get_all_schedules(active_only=True)
        now = datetime.now()
        
        for schedule in schedules:
            # Skip triggered schedules (they're handled by keyword matching)
            if schedule.send_mode == SendMode.TRIGGERED:
                continue
            
            # Check if schedule is due
            if not schedule.next_run_at:
                continue
            
            try:
                next_run = datetime.fromisoformat(schedule.next_run_at)
                
                if next_run <= now:
                    self.log_callback(f"執行計劃: {schedule.name}", "info")
                    
                    # Execute the broadcast
                    await broadcaster.broadcast_schedule(schedule)
                    
                    # Update next run time
                    await self._update_next_run(schedule)
                    
            except Exception as e:
                self.log_callback(f"執行計劃 '{schedule.name}' 錯誤: {e}", "error")
    
    async def _update_next_run(self, schedule: AdSchedule):
        """Update the next run time after execution"""
        ad_manager = get_ad_manager()
        if not ad_manager:
            return
        
        now = datetime.now()
        next_run = None
        
        if schedule.schedule_type == ScheduleType.ONCE:
            # One-time schedule, deactivate it
            await ad_manager.update_schedule(schedule.id, {"isActive": False})
            return
        
        elif schedule.schedule_type == ScheduleType.INTERVAL:
            next_run = now + timedelta(minutes=schedule.interval_minutes)
        
        elif schedule.schedule_type == ScheduleType.DAILY:
            if schedule.schedule_time:
                try:
                    hour, minute = map(int, schedule.schedule_time.split(':'))
                    next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    next_run += timedelta(days=1)
                except:
                    next_run = now + timedelta(days=1)
            else:
                next_run = now + timedelta(days=1)
        
        if next_run:
            await ad_manager.db.execute('''
                UPDATE ad_schedules SET next_run_at = ?, updated_at = ?
                WHERE id = ?
            ''', (next_run.isoformat(), now.isoformat(), schedule.id))
    
    async def _load_keyword_triggers(self):
        """Load keyword triggers from active schedules"""
        ad_manager = get_ad_manager()
        if not ad_manager:
            return
        
        self._keyword_handlers = {}
        
        schedules = await ad_manager.get_all_schedules(active_only=True)
        
        for schedule in schedules:
            if schedule.send_mode == SendMode.TRIGGERED:
                for keyword in schedule.trigger_keywords:
                    keyword_lower = keyword.lower()
                    if keyword_lower not in self._keyword_handlers:
                        self._keyword_handlers[keyword_lower] = []
                    self._keyword_handlers[keyword_lower].append(schedule.id)
        
        self.log_callback(
            f"已加載 {len(self._keyword_handlers)} 個觸發關鍵詞",
            "info"
        )
    
    async def handle_keyword_trigger(
        self,
        keyword: str,
        group_id: str,
        message_user_id: str,
        message_text: str
    ) -> List[Dict[str, Any]]:
        """
        Handle a keyword trigger event
        
        Args:
            keyword: The matched keyword
            group_id: The group where the keyword was detected
            message_user_id: User who sent the triggering message
            message_text: The original message text
            
        Returns:
            List of send results
        """
        ad_manager = get_ad_manager()
        broadcaster = get_ad_broadcaster()
        
        if not ad_manager or not broadcaster:
            return []
        
        keyword_lower = keyword.lower()
        schedule_ids = self._keyword_handlers.get(keyword_lower, [])
        
        if not schedule_ids:
            return []
        
        results = []
        
        for schedule_id in schedule_ids:
            schedule = await ad_manager.get_schedule(schedule_id)
            
            if not schedule or not schedule.is_active:
                continue
            
            # Check if this group is in the target list
            if group_id not in schedule.target_groups:
                continue
            
            self.log_callback(
                f"觸發發送: 關鍵詞 '{keyword}' 在 {group_id}",
                "info"
            )
            
            # Get an account to use
            account = ad_manager.get_next_account(schedule)
            if not account:
                self.log_callback(f"無可用帳號處理觸發", "warning")
                continue
            
            # Send the ad
            result = await broadcaster.send_ad(
                template_id=schedule.template_id,
                target_group_id=group_id,
                account_phone=account,
                schedule_id=schedule_id
            )
            
            results.append({
                "scheduleId": schedule_id,
                "scheduleName": schedule.name,
                "keyword": keyword,
                "groupId": group_id,
                **result
            })
        
        return results
    
    async def reload_triggers(self):
        """Reload keyword triggers (call after schedule changes)"""
        await self._load_keyword_triggers()
    
    async def run_schedule_now(self, schedule_id: int) -> Dict[str, Any]:
        """Manually run a schedule immediately"""
        ad_manager = get_ad_manager()
        broadcaster = get_ad_broadcaster()
        
        if not ad_manager or not broadcaster:
            return {"success": False, "error": "廣告系統未初始化"}
        
        schedule = await ad_manager.get_schedule(schedule_id)
        if not schedule:
            return {"success": False, "error": "計劃不存在"}
        
        self.log_callback(f"手動執行計劃: {schedule.name}", "info")
        
        result = await broadcaster.broadcast_schedule(schedule)
        
        return result
    
    def get_status(self) -> Dict[str, Any]:
        """Get scheduler status"""
        return {
            "running": self._running,
            "keywordTriggerCount": len(self._keyword_handlers),
            "checkInterval": self.CHECK_INTERVAL
        }


# Global instance
ad_scheduler: Optional[AdScheduler] = None


def init_ad_scheduler(event_callback=None, log_callback=None) -> AdScheduler:
    """Initialize ad scheduler"""
    global ad_scheduler
    ad_scheduler = AdScheduler(
        event_callback=event_callback,
        log_callback=log_callback
    )
    return ad_scheduler


def get_ad_scheduler() -> Optional[AdScheduler]:
    """Get ad scheduler instance"""
    return ad_scheduler

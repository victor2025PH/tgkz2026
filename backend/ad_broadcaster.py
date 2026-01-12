"""
TG-Matrix Ad Broadcaster
Handles the actual sending of ads to Telegram groups/channels
"""
import asyncio
import random
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

from ad_template import get_ad_template_manager, SpintaxGenerator, MediaType
from ad_manager import get_ad_manager, AdSchedule, SendMode


class AdBroadcaster:
    """
    Ad broadcasting engine
    
    Features:
    - Send ads to groups/channels with rate limiting
    - Support multiple media types (text, photo, video, document)
    - Spintax variant generation
    - Random delay between sends
    - Account rotation
    - Error handling and retry logic
    """
    
    # Default delays (seconds)
    MIN_DELAY_BETWEEN_SENDS = 30
    MAX_DELAY_BETWEEN_SENDS = 120
    
    # Retry settings
    MAX_RETRIES = 3
    RETRY_DELAY = 60
    
    def __init__(
        self, 
        telegram_manager,
        db,
        event_callback: Callable = None,
        log_callback: Callable = None
    ):
        self.telegram_manager = telegram_manager
        self.db = db
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        
        self._running = False
        self._current_task: Optional[asyncio.Task] = None
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[AdBroadcaster] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def send_ad(
        self,
        template_id: int,
        target_group_id: str,
        account_phone: str,
        schedule_id: Optional[int] = None,
        custom_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a single ad to a group
        
        Args:
            template_id: ID of the ad template
            target_group_id: Telegram group/channel ID or username
            account_phone: Phone number of the account to use
            schedule_id: Optional schedule ID for logging
            custom_content: Optional custom content (overrides template)
            
        Returns:
            Result dict with success status and details
        """
        template_manager = get_ad_template_manager()
        ad_manager = get_ad_manager()
        
        if not template_manager or not ad_manager:
            return {"success": False, "error": "廣告系統未初始化"}
        
        # Get template
        template = await template_manager.get_template(template_id)
        if not template:
            return {"success": False, "error": "模板不存在"}
        
        # Check rate limiting
        if not ad_manager.can_send_to_group(target_group_id):
            return {"success": False, "error": "發送過於頻繁，請稍後重試"}
        
        if not ad_manager.can_account_send(account_phone):
            return {"success": False, "error": "帳號已達發送限額"}
        
        # Generate variant content
        content = custom_content or SpintaxGenerator.generate_variant(template.content)
        
        # Get group info
        group_title = await self._get_group_title(target_group_id, account_phone)
        
        try:
            # Send the message
            message_id = await self._send_message(
                account_phone=account_phone,
                chat_id=target_group_id,
                content=content,
                media_type=template.media_type,
                media_file_id=template.media_file_id,
                media_path=template.media_path
            )
            
            # Record the send
            ad_manager.record_send(target_group_id, account_phone)
            
            # Log the send
            log_id = await ad_manager.log_send(
                template_id=template_id,
                account_phone=account_phone,
                target_group_id=target_group_id,
                target_group_title=group_title,
                variant_content=content,
                status="sent",
                message_id=message_id,
                schedule_id=schedule_id
            )
            
            self.log_callback(f"廣告已發送到 {group_title} (ID: {message_id})", "success")
            
            self._send_event("ad-sent", {
                "templateId": template_id,
                "scheduleId": schedule_id,
                "groupId": target_group_id,
                "groupTitle": group_title,
                "accountPhone": account_phone,
                "messageId": message_id,
                "success": True
            })
            
            return {
                "success": True,
                "messageId": message_id,
                "groupId": target_group_id,
                "groupTitle": group_title,
                "variant": content
            }
            
        except Exception as e:
            error_msg = str(e)
            
            # Determine error type
            status = "failed"
            if "banned" in error_msg.lower() or "forbidden" in error_msg.lower():
                status = "banned"
            elif "deleted" in error_msg.lower():
                status = "deleted"
            
            # Log the failure
            await ad_manager.log_send(
                template_id=template_id,
                account_phone=account_phone,
                target_group_id=target_group_id,
                target_group_title=group_title,
                variant_content=content,
                status=status,
                error_message=error_msg,
                schedule_id=schedule_id
            )
            
            self.log_callback(f"廣告發送失敗: {error_msg}", "error")
            
            self._send_event("ad-send-failed", {
                "templateId": template_id,
                "scheduleId": schedule_id,
                "groupId": target_group_id,
                "groupTitle": group_title,
                "accountPhone": account_phone,
                "error": error_msg,
                "status": status
            })
            
            return {
                "success": False,
                "error": error_msg,
                "status": status,
                "groupId": target_group_id,
                "groupTitle": group_title
            }
    
    async def broadcast_schedule(
        self,
        schedule: AdSchedule,
        target_groups: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Execute a broadcast for a schedule
        
        Args:
            schedule: The schedule to execute
            target_groups: Optional list of specific groups (defaults to schedule's groups)
            
        Returns:
            Broadcast result with success/failure counts
        """
        ad_manager = get_ad_manager()
        if not ad_manager:
            return {"success": False, "error": "廣告管理器未初始化"}
        
        groups = target_groups or schedule.target_groups
        results = {
            "success": True,
            "scheduleId": schedule.id,
            "totalGroups": len(groups),
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "details": []
        }
        
        self.log_callback(f"開始執行計劃 '{schedule.name}'，目標: {len(groups)} 個群組", "info")
        
        self._send_event("broadcast-started", {
            "scheduleId": schedule.id,
            "scheduleName": schedule.name,
            "totalGroups": len(groups)
        })
        
        for i, group_id in enumerate(groups):
            # Get next account based on strategy
            account = ad_manager.get_next_account(schedule)
            
            if not account:
                self.log_callback(f"無可用帳號，跳過 {group_id}", "warning")
                results["skipped"] += 1
                results["details"].append({
                    "groupId": group_id,
                    "status": "skipped",
                    "reason": "no_available_account"
                })
                continue
            
            # Send ad
            result = await self.send_ad(
                template_id=schedule.template_id,
                target_group_id=group_id,
                account_phone=account,
                schedule_id=schedule.id
            )
            
            if result.get("success"):
                results["sent"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append({
                "groupId": group_id,
                "groupTitle": result.get("groupTitle"),
                "status": "sent" if result.get("success") else "failed",
                "error": result.get("error"),
                "messageId": result.get("messageId")
            })
            
            # Send progress update
            self._send_event("broadcast-progress", {
                "scheduleId": schedule.id,
                "current": i + 1,
                "total": len(groups),
                "sent": results["sent"],
                "failed": results["failed"]
            })
            
            # Random delay between sends
            if i < len(groups) - 1:
                delay = random.uniform(
                    self.MIN_DELAY_BETWEEN_SENDS,
                    self.MAX_DELAY_BETWEEN_SENDS
                )
                self.log_callback(f"等待 {delay:.1f} 秒後發送下一條...", "info")
                await asyncio.sleep(delay)
        
        self.log_callback(
            f"計劃 '{schedule.name}' 執行完成: {results['sent']} 成功, {results['failed']} 失敗",
            "success" if results["failed"] == 0 else "warning"
        )
        
        self._send_event("broadcast-completed", {
            "scheduleId": schedule.id,
            "scheduleName": schedule.name,
            "sent": results["sent"],
            "failed": results["failed"],
            "skipped": results["skipped"]
        })
        
        return results
    
    async def send_now(
        self,
        template_id: int,
        target_groups: List[str],
        account_phones: List[str],
        account_strategy: str = "rotate"
    ) -> Dict[str, Any]:
        """
        Send ads immediately without a schedule
        
        Args:
            template_id: Template to use
            target_groups: Groups to send to
            account_phones: Accounts to use
            account_strategy: How to select accounts
            
        Returns:
            Broadcast results
        """
        from ad_manager import AccountStrategy, SendMode, ScheduleType
        
        # Create a temporary schedule object
        temp_schedule = AdSchedule(
            id=-1,
            template_id=template_id,
            name="立即發送",
            target_groups=target_groups,
            send_mode=SendMode.SCHEDULED,
            schedule_type=ScheduleType.ONCE,
            schedule_time=None,
            interval_minutes=0,
            trigger_keywords=[],
            account_strategy=AccountStrategy(account_strategy),
            assigned_accounts=account_phones,
            is_active=True,
            last_run_at=None,
            next_run_at=None,
            run_count=0,
            success_count=0,
            fail_count=0,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        return await self.broadcast_schedule(temp_schedule)
    
    async def _send_message(
        self,
        account_phone: str,
        chat_id: str,
        content: str,
        media_type: MediaType,
        media_file_id: Optional[str] = None,
        media_path: Optional[str] = None
    ) -> Optional[int]:
        """
        Send a message using the Telegram client
        
        Returns:
            Message ID if successful
        """
        # Get the client for this account
        client = self.telegram_manager.get_client(account_phone)
        if not client:
            raise Exception(f"帳號 {account_phone} 未連接")
        
        # Ensure we're connected
        if not client.is_connected:
            await client.connect()
        
        try:
            # Send based on media type
            if media_type == MediaType.TEXT:
                message = await client.send_message(chat_id, content)
            
            elif media_type == MediaType.PHOTO:
                if media_file_id:
                    message = await client.send_photo(chat_id, media_file_id, caption=content)
                elif media_path:
                    message = await client.send_photo(chat_id, media_path, caption=content)
                else:
                    message = await client.send_message(chat_id, content)
            
            elif media_type == MediaType.VIDEO:
                if media_file_id:
                    message = await client.send_video(chat_id, media_file_id, caption=content)
                elif media_path:
                    message = await client.send_video(chat_id, media_path, caption=content)
                else:
                    message = await client.send_message(chat_id, content)
            
            elif media_type == MediaType.DOCUMENT:
                if media_file_id:
                    message = await client.send_document(chat_id, media_file_id, caption=content)
                elif media_path:
                    message = await client.send_document(chat_id, media_path, caption=content)
                else:
                    message = await client.send_message(chat_id, content)
            
            elif media_type == MediaType.ANIMATION:
                if media_file_id:
                    message = await client.send_animation(chat_id, media_file_id, caption=content)
                elif media_path:
                    message = await client.send_animation(chat_id, media_path, caption=content)
                else:
                    message = await client.send_message(chat_id, content)
            
            else:
                message = await client.send_message(chat_id, content)
            
            return message.id if message else None
            
        except Exception as e:
            raise Exception(f"發送失敗: {str(e)}")
    
    async def _get_group_title(self, group_id: str, account_phone: str) -> str:
        """Get group title from Telegram"""
        try:
            # Try to get from database first
            row = await self.db.fetch_one(
                'SELECT name FROM monitored_groups WHERE url = ? OR url LIKE ?',
                (group_id, f"%{group_id}%")
            )
            if row and row['name']:
                return row['name']
            
            # Try discovered_resources table
            row = await self.db.fetch_one(
                'SELECT title FROM discovered_resources WHERE telegram_id = ? OR username = ?',
                (group_id, group_id)
            )
            if row and row['title']:
                return row['title']
            
            # Fall back to API call if possible
            client = self.telegram_manager.get_client(account_phone)
            if client and client.is_connected:
                try:
                    chat = await client.get_chat(group_id)
                    if chat:
                        return chat.title or group_id
                except:
                    pass
            
            return group_id
            
        except Exception:
            return group_id


# Global instance
ad_broadcaster: Optional[AdBroadcaster] = None


def init_ad_broadcaster(
    telegram_manager,
    db,
    event_callback=None,
    log_callback=None
) -> AdBroadcaster:
    """Initialize ad broadcaster"""
    global ad_broadcaster
    ad_broadcaster = AdBroadcaster(
        telegram_manager=telegram_manager,
        db=db,
        event_callback=event_callback,
        log_callback=log_callback
    )
    return ad_broadcaster


def get_ad_broadcaster() -> Optional[AdBroadcaster]:
    """Get ad broadcaster instance"""
    return ad_broadcaster

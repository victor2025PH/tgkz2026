"""
定時任務調度器

功能：
1. 每日配額重置
2. 定期清理過期數據
3. 統計數據生成
4. 告警檢查
"""

import asyncio
import logging
from datetime import datetime, time, timedelta
from typing import Callable, Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class ScheduledTask:
    """定時任務定義"""
    name: str
    handler: Callable
    schedule_type: str  # 'daily', 'hourly', 'interval', 'cron'
    schedule_config: Dict[str, Any]
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    last_status: TaskStatus = TaskStatus.PENDING
    last_error: Optional[str] = None
    run_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'schedule_type': self.schedule_type,
            'schedule_config': self.schedule_config,
            'enabled': self.enabled,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'next_run': self.next_run.isoformat() if self.next_run else None,
            'last_status': self.last_status.value,
            'last_error': self.last_error,
            'run_count': self.run_count
        }


class TaskScheduler:
    """
    定時任務調度器
    
    使用單例模式，支持：
    - 每日定時任務（如配額重置）
    - 定時間隔任務（如健康檢查）
    - 即時執行任務
    """
    
    _instance: Optional['TaskScheduler'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.tasks: Dict[str, ScheduledTask] = {}
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._task: Optional[asyncio.Task] = None
        
        # 註冊內置任務
        self._register_builtin_tasks()
        
        self._initialized = True
        logger.info("TaskScheduler initialized")
    
    def _register_builtin_tasks(self):
        """註冊內置定時任務"""
        
        # 每日配額重置（每天 00:00）
        self.register_task(
            name='daily_quota_reset',
            handler=self._daily_quota_reset,
            schedule_type='daily',
            schedule_config={'hour': 0, 'minute': 0}
        )
        
        # 每小時統計更新
        self.register_task(
            name='hourly_stats_update',
            handler=self._hourly_stats_update,
            schedule_type='hourly',
            schedule_config={'minute': 5}
        )
        
        # 每 6 小時清理過期數據
        self.register_task(
            name='cleanup_expired_data',
            handler=self._cleanup_expired_data,
            schedule_type='interval',
            schedule_config={'hours': 6}
        )
        
        # 每 15 分鐘檢查配額告警
        self.register_task(
            name='check_quota_alerts',
            handler=self._check_quota_alerts,
            schedule_type='interval',
            schedule_config={'minutes': 15}
        )
        
        # 每日超額賬單生成（每天 01:00）
        self.register_task(
            name='daily_overage_billing',
            handler=self._daily_overage_billing,
            schedule_type='daily',
            schedule_config={'hour': 1, 'minute': 0}
        )
        
        # 每週訂閱到期提醒（每天 09:00 檢查）
        self.register_task(
            name='subscription_expiry_reminder',
            handler=self._subscription_expiry_reminder,
            schedule_type='daily',
            schedule_config={'hour': 9, 'minute': 0}
        )
        
        # 每小時檢查配額包過期
        self.register_task(
            name='check_expired_packages',
            handler=self._check_expired_packages,
            schedule_type='hourly',
            schedule_config={'minute': 30}
        )
    
    def register_task(
        self,
        name: str,
        handler: Callable,
        schedule_type: str,
        schedule_config: Dict[str, Any],
        enabled: bool = True
    ):
        """註冊定時任務"""
        task = ScheduledTask(
            name=name,
            handler=handler,
            schedule_type=schedule_type,
            schedule_config=schedule_config,
            enabled=enabled
        )
        
        # 計算下次執行時間
        task.next_run = self._calculate_next_run(task)
        
        self.tasks[name] = task
        logger.info(f"Registered task: {name}, next run: {task.next_run}")
    
    def _calculate_next_run(self, task: ScheduledTask) -> datetime:
        """計算下次執行時間"""
        now = datetime.now()
        config = task.schedule_config
        
        if task.schedule_type == 'daily':
            target_time = time(config.get('hour', 0), config.get('minute', 0))
            target = datetime.combine(now.date(), target_time)
            if target <= now:
                target = target + timedelta(days=1)
            return target
        
        elif task.schedule_type == 'hourly':
            target = now.replace(minute=config.get('minute', 0), second=0, microsecond=0)
            if target <= now:
                target = target + timedelta(hours=1)
            return target
        
        elif task.schedule_type == 'interval':
            interval = timedelta(
                hours=config.get('hours', 0),
                minutes=config.get('minutes', 0),
                seconds=config.get('seconds', 0)
            )
            if task.last_run:
                return task.last_run + interval
            return now + interval
        
        else:
            return now + timedelta(hours=1)
    
    async def start(self):
        """啟動調度器"""
        if self._running:
            return
        
        self._running = True
        self._loop = asyncio.get_event_loop()
        self._task = asyncio.create_task(self._run_loop())
        logger.info("TaskScheduler started")
    
    async def stop(self):
        """停止調度器"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("TaskScheduler stopped")
    
    async def _run_loop(self):
        """主循環"""
        while self._running:
            try:
                now = datetime.now()
                
                for task in self.tasks.values():
                    if not task.enabled:
                        continue
                    
                    if task.next_run and now >= task.next_run:
                        await self._execute_task(task)
                
                # 每分鐘檢查一次
                await asyncio.sleep(60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                await asyncio.sleep(60)
    
    async def _execute_task(self, task: ScheduledTask):
        """執行任務"""
        logger.info(f"Executing task: {task.name}")
        task.last_status = TaskStatus.RUNNING
        task.last_run = datetime.now()
        
        try:
            if asyncio.iscoroutinefunction(task.handler):
                await task.handler()
            else:
                task.handler()
            
            task.last_status = TaskStatus.COMPLETED
            task.last_error = None
            task.run_count += 1
            logger.info(f"Task completed: {task.name}")
            
        except Exception as e:
            task.last_status = TaskStatus.FAILED
            task.last_error = str(e)
            logger.error(f"Task failed: {task.name}, error: {e}")
        
        # 計算下次執行時間
        task.next_run = self._calculate_next_run(task)
    
    async def run_task_now(self, name: str) -> Dict[str, Any]:
        """立即執行任務"""
        task = self.tasks.get(name)
        if not task:
            return {'success': False, 'error': f'Task not found: {name}'}
        
        await self._execute_task(task)
        
        return {
            'success': task.last_status == TaskStatus.COMPLETED,
            'status': task.last_status.value,
            'error': task.last_error
        }
    
    def get_tasks_status(self) -> List[Dict[str, Any]]:
        """獲取所有任務狀態"""
        return [task.to_dict() for task in self.tasks.values()]
    
    def enable_task(self, name: str, enabled: bool = True):
        """啟用/禁用任務"""
        if name in self.tasks:
            self.tasks[name].enabled = enabled
    
    # ==================== 內置任務處理器 ====================
    
    async def _daily_quota_reset(self):
        """每日配額重置"""
        try:
            from .quota_service import get_quota_service
            service = get_quota_service()
            result = await service.reset_daily_quotas()
            logger.info(f"Daily quota reset completed: {result}")
        except Exception as e:
            logger.error(f"Daily quota reset error: {e}")
            raise
    
    async def _hourly_stats_update(self):
        """每小時統計更新"""
        try:
            # TODO: 實現統計更新邏輯
            logger.debug("Hourly stats update completed")
        except Exception as e:
            logger.error(f"Hourly stats update error: {e}")
    
    async def _cleanup_expired_data(self):
        """清理過期數據"""
        try:
            import os
            import sqlite3
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 刪除 90 天前的配額日誌
            cutoff = (datetime.now() - timedelta(days=90)).isoformat()
            cursor.execute('DELETE FROM quota_logs WHERE created_at < ?', (cutoff,))
            
            # 刪除 30 天前已確認的告警
            alert_cutoff = (datetime.now() - timedelta(days=30)).isoformat()
            cursor.execute('''
                DELETE FROM quota_alerts_v2 
                WHERE acknowledged = 1 AND created_at < ?
            ''', (alert_cutoff,))
            
            conn.commit()
            conn.close()
            
            logger.info("Cleanup expired data completed")
        except Exception as e:
            logger.error(f"Cleanup expired data error: {e}")
    
    async def _check_quota_alerts(self):
        """檢查配額告警"""
        try:
            import os
            import sqlite3
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            from .level_config import get_level_config_service
            level_service = get_level_config_service()
            
            # 獲取所有活躍用戶
            cursor.execute('''
                SELECT DISTINCT u.id, u.subscription_tier
                FROM users u
                JOIN quota_usage q ON u.id = q.user_id
                WHERE q.date = date('now')
            ''')
            
            users = cursor.fetchall()
            alerts_created = 0
            
            for user in users:
                user_id = user['id']
                tier = user['subscription_tier'] or 'bronze'
                
                # 檢查每種每日配額
                for quota_type in ['daily_messages', 'ai_calls']:
                    limit = level_service.get_quota_limit(tier, quota_type)
                    if limit == -1:
                        continue
                    
                    # 獲取當前使用量
                    cursor.execute('''
                        SELECT used FROM quota_usage 
                        WHERE user_id = ? AND quota_type = ? AND date = date('now')
                    ''', (user_id, quota_type))
                    row = cursor.fetchone()
                    used = row['used'] if row else 0
                    
                    percentage = (used / limit) * 100 if limit > 0 else 0
                    
                    # 檢查是否需要告警
                    alert_type = None
                    if percentage >= 100:
                        alert_type = 'exceeded'
                    elif percentage >= 95:
                        alert_type = 'critical'
                    elif percentage >= 80:
                        alert_type = 'warning'
                    
                    if alert_type:
                        # 檢查是否已有相同告警（1小時內）
                        cursor.execute('''
                            SELECT id FROM quota_alerts_v2 
                            WHERE user_id = ? AND quota_type = ? AND alert_type = ?
                            AND created_at > datetime('now', '-1 hour')
                        ''', (user_id, quota_type, alert_type))
                        
                        if not cursor.fetchone():
                            cursor.execute('''
                                INSERT INTO quota_alerts_v2 
                                (user_id, quota_type, alert_type, message, percentage, acknowledged, created_at)
                                VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
                            ''', (
                                user_id, quota_type, alert_type,
                                f'{quota_type} 使用率達 {percentage:.1f}%',
                                percentage
                            ))
                            alerts_created += 1
            
            conn.commit()
            conn.close()
            
            if alerts_created > 0:
                logger.info(f"Created {alerts_created} quota alerts")
                
        except Exception as e:
            logger.error(f"Check quota alerts error: {e}")
    
    async def _daily_overage_billing(self):
        """每日超額賬單生成"""
        try:
            import os
            import sqlite3
            from datetime import datetime, timedelta
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 獲取昨天的日期
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
            
            # 查找有超額記錄的用戶
            cursor.execute('''
                SELECT DISTINCT user_id FROM overage_usage
                WHERE date = ? AND billed = 0 AND overage_amount > 0
            ''', (yesterday,))
            
            users = cursor.fetchall()
            conn.close()
            
            from .billing_service import get_billing_service
            billing = get_billing_service()
            
            bills_created = 0
            
            for user in users:
                bill = billing.generate_overage_bill(
                    user['user_id'],
                    yesterday,
                    yesterday
                )
                if bill:
                    bills_created += 1
            
            logger.info(f"Daily overage billing completed: {bills_created} bills created")
            
        except Exception as e:
            logger.error(f"Daily overage billing error: {e}")
    
    async def _subscription_expiry_reminder(self):
        """訂閱到期提醒"""
        try:
            import os
            import sqlite3
            from datetime import datetime, timedelta
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 查找 7 天內到期的訂閱
            expiry_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
            
            cursor.execute('''
                SELECT user_id, plan_id, current_period_end
                FROM subscriptions
                WHERE status = 'active'
                  AND current_period_end <= ?
                  AND cancel_at_period_end = 0
            ''', (expiry_date,))
            
            subscriptions = cursor.fetchall()
            conn.close()
            
            from .billing_service import get_billing_service
            billing = get_billing_service()
            
            reminders_sent = 0
            
            for sub in subscriptions:
                end_date = datetime.fromisoformat(sub['current_period_end'].replace('Z', ''))
                days_remaining = (end_date - datetime.utcnow()).days
                
                if days_remaining in [7, 3, 1]:  # 只在特定天數發送提醒
                    billing.send_expiry_reminder(sub['user_id'], days_remaining)
                    reminders_sent += 1
            
            logger.info(f"Subscription expiry reminder completed: {reminders_sent} reminders sent")
            
        except Exception as e:
            logger.error(f"Subscription expiry reminder error: {e}")
    
    async def _check_expired_packages(self):
        """檢查過期的配額包"""
        try:
            import os
            import sqlite3
            from datetime import datetime
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            now = datetime.utcnow().isoformat()
            
            # 標記過期的配額包為非活躍
            cursor.execute('''
                UPDATE user_quota_packages
                SET is_active = 0
                WHERE is_active = 1 AND expires_at < ?
            ''', (now,))
            
            expired_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            if expired_count > 0:
                logger.info(f"Marked {expired_count} quota packages as expired")
            
        except Exception as e:
            logger.error(f"Check expired packages error: {e}")


# ==================== 單例訪問 ====================

_scheduler: Optional[TaskScheduler] = None


def get_scheduler() -> TaskScheduler:
    """獲取調度器實例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = TaskScheduler()
    return _scheduler


async def start_scheduler():
    """啟動調度器"""
    scheduler = get_scheduler()
    await scheduler.start()


async def stop_scheduler():
    """停止調度器"""
    scheduler = get_scheduler()
    await scheduler.stop()

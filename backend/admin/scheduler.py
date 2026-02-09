"""
定時任務調度器

功能：
- 容量檢查告警（定時執行）
- 數據清理任務（可選）
- 統計數據更新（可選）
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """任務狀態"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DISABLED = "disabled"


@dataclass
class ScheduledTask:
    """定時任務定義"""
    id: str
    name: str
    func: Callable
    interval_minutes: int = 60
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    last_result: Optional[Dict[str, Any]] = None
    status: TaskStatus = TaskStatus.PENDING
    run_count: int = 0
    fail_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "interval_minutes": self.interval_minutes,
            "enabled": self.enabled,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "status": self.status.value,
            "run_count": self.run_count,
            "fail_count": self.fail_count,
            "last_result": self.last_result
        }


class TaskScheduler:
    """
    任務調度器（單例）
    
    使用簡單的 asyncio 循環實現，無需額外依賴
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._tasks: Dict[str, ScheduledTask] = {}
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._main_task: Optional[asyncio.Task] = None
        self._initialized = True
        
        logger.info("[TaskScheduler] Initialized")
    
    def register_task(
        self,
        task_id: str,
        name: str,
        func: Callable,
        interval_minutes: int = 60,
        enabled: bool = True,
        run_immediately: bool = False
    ) -> None:
        """
        註冊定時任務
        
        Args:
            task_id: 任務唯一標識
            name: 任務名稱
            func: 異步函數
            interval_minutes: 執行間隔（分鐘）
            enabled: 是否啟用
            run_immediately: 是否立即執行一次
        """
        now = datetime.now()
        next_run = now if run_immediately else now + timedelta(minutes=interval_minutes)
        
        task = ScheduledTask(
            id=task_id,
            name=name,
            func=func,
            interval_minutes=interval_minutes,
            enabled=enabled,
            next_run=next_run
        )
        
        self._tasks[task_id] = task
        logger.info(f"[TaskScheduler] Registered task: {name} (interval: {interval_minutes}min)")
    
    def unregister_task(self, task_id: str) -> bool:
        """取消註冊任務"""
        if task_id in self._tasks:
            del self._tasks[task_id]
            logger.info(f"[TaskScheduler] Unregistered task: {task_id}")
            return True
        return False
    
    def enable_task(self, task_id: str) -> bool:
        """啟用任務"""
        if task_id in self._tasks:
            self._tasks[task_id].enabled = True
            self._tasks[task_id].status = TaskStatus.PENDING
            logger.info(f"[TaskScheduler] Enabled task: {task_id}")
            return True
        return False
    
    def disable_task(self, task_id: str) -> bool:
        """禁用任務"""
        if task_id in self._tasks:
            self._tasks[task_id].enabled = False
            self._tasks[task_id].status = TaskStatus.DISABLED
            logger.info(f"[TaskScheduler] Disabled task: {task_id}")
            return True
        return False
    
    def update_interval(self, task_id: str, interval_minutes: int) -> bool:
        """更新任務間隔"""
        if task_id in self._tasks:
            self._tasks[task_id].interval_minutes = interval_minutes
            logger.info(f"[TaskScheduler] Updated interval for {task_id}: {interval_minutes}min")
            return True
        return False
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """獲取任務詳情"""
        if task_id in self._tasks:
            return self._tasks[task_id].to_dict()
        return None
    
    def list_tasks(self) -> List[Dict[str, Any]]:
        """列出所有任務"""
        return [task.to_dict() for task in self._tasks.values()]
    
    async def run_task_now(self, task_id: str) -> Dict[str, Any]:
        """立即執行指定任務"""
        if task_id not in self._tasks:
            return {"success": False, "error": "Task not found"}
        
        task = self._tasks[task_id]
        return await self._execute_task(task)
    
    async def _execute_task(self, task: ScheduledTask) -> Dict[str, Any]:
        """執行單個任務"""
        task.status = TaskStatus.RUNNING
        task.last_run = datetime.now()
        
        try:
            if asyncio.iscoroutinefunction(task.func):
                result = await task.func()
            else:
                result = task.func()
            
            task.status = TaskStatus.COMPLETED
            task.run_count += 1
            task.last_result = {"success": True, "data": result}
            task.next_run = datetime.now() + timedelta(minutes=task.interval_minutes)
            
            logger.info(f"[TaskScheduler] Task completed: {task.name}")
            return task.last_result
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.fail_count += 1
            task.last_result = {"success": False, "error": str(e)}
            task.next_run = datetime.now() + timedelta(minutes=task.interval_minutes)
            
            logger.error(f"[TaskScheduler] Task failed: {task.name} - {e}")
            return task.last_result
    
    async def _scheduler_loop(self):
        """調度器主循環"""
        logger.info("[TaskScheduler] Scheduler loop started")
        
        # 🔧 Phase2: 啟動時隨機延遲，避免和其他 scheduler 同時觸發
        import random
        await asyncio.sleep(random.uniform(3, 20))
        
        while self._running:
            now = datetime.now()
            
            for task in self._tasks.values():
                if not task.enabled:
                    continue
                
                if task.next_run and now >= task.next_run:
                    if task.status != TaskStatus.RUNNING:
                        asyncio.create_task(self._execute_task(task))
            
            # 🔧 Phase2: 30s→90s 降低 CPU
            await asyncio.sleep(90)
        
        logger.info("[TaskScheduler] Scheduler loop stopped")
    
    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        """啟動調度器"""
        if self._running:
            logger.warning("[TaskScheduler] Already running")
            return
        
        self._running = True
        self._loop = loop or asyncio.get_event_loop()
        
        # 在事件循環中創建任務
        if self._loop.is_running():
            self._main_task = asyncio.ensure_future(self._scheduler_loop(), loop=self._loop)
        else:
            self._main_task = self._loop.create_task(self._scheduler_loop())
        
        logger.info("[TaskScheduler] Started")
    
    def stop(self):
        """停止調度器"""
        self._running = False
        if self._main_task:
            self._main_task.cancel()
            self._main_task = None
        logger.info("[TaskScheduler] Stopped")
    
    @property
    def is_running(self) -> bool:
        return self._running


# 單例獲取
_scheduler: Optional[TaskScheduler] = None


def get_scheduler() -> TaskScheduler:
    """獲取調度器實例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = TaskScheduler()
    return _scheduler


def init_scheduled_tasks():
    """
    初始化預設的定時任務
    """
    from .alert_service import check_and_send_capacity_alerts
    
    scheduler = get_scheduler()
    
    # 容量檢查告警任務（每 60 分鐘）
    scheduler.register_task(
        task_id="capacity_check",
        name="容量檢查告警",
        func=check_and_send_capacity_alerts,
        interval_minutes=60,
        enabled=True,
        run_immediately=False  # 啟動時不立即執行
    )
    
    logger.info("[TaskScheduler] Default tasks registered")


async def cleanup_old_audit_logs():
    """
    清理舊的審計日誌（保留最近 90 天）
    """
    try:
        from .api_pool import get_api_pool_manager
        
        pool = get_api_pool_manager()
        conn = pool._get_connection()
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=90)).isoformat()
        
        cursor.execute(
            'DELETE FROM telegram_api_allocation_history WHERE created_at < ?',
            (cutoff_date,)
        )
        
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        
        logger.info(f"[TaskScheduler] Cleaned up {deleted} old audit logs")
        return {"deleted": deleted}
        
    except Exception as e:
        logger.error(f"[TaskScheduler] Error cleaning audit logs: {e}")
        return {"error": str(e)}

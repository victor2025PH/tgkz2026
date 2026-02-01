"""
消息隊列服務

功能：
1. 異步任務處理
2. 任務優先級
3. 重試機制
4. 死信隊列
"""

import os
import sqlite3
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Awaitable
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import uuid
import traceback
from collections import defaultdict

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class TaskPriority(int, Enum):
    LOW = 0
    NORMAL = 5
    HIGH = 10
    CRITICAL = 15


class TaskStatus(str, Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    RETRY = 'retry'
    DEAD = 'dead'


# ==================== 數據模型 ====================

@dataclass
class QueueTask:
    """隊列任務"""
    id: str
    queue: str
    task_type: str
    payload: Dict[str, Any]
    
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    
    # 重試
    max_retries: int = 3
    retry_count: int = 0
    retry_delay: int = 60  # 秒
    
    # 時間
    created_at: str = ''
    scheduled_at: str = ''
    started_at: str = ''
    completed_at: str = ''
    
    # 結果
    result: Any = None
    error: str = ''
    
    # 元數據
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['priority'] = self.priority.value
        d['status'] = self.status.value
        return d


@dataclass
class QueueStats:
    """隊列統計"""
    queue: str
    pending: int = 0
    processing: int = 0
    completed: int = 0
    failed: int = 0
    dead: int = 0
    
    def to_dict(self) -> dict:
        return asdict(self)


# ==================== 任務處理器類型 ====================

TaskHandler = Callable[[Dict[str, Any]], Awaitable[Any]]


class MessageQueue:
    """消息隊列服務"""
    
    _instance: Optional['MessageQueue'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        # 任務處理器
        self._handlers: Dict[str, TaskHandler] = {}
        
        # 工作線程
        self._workers: Dict[str, asyncio.Task] = {}
        self._running = False
        
        # 併發控制
        self._concurrency: Dict[str, int] = defaultdict(lambda: 5)
        self._active_tasks: Dict[str, int] = defaultdict(int)
        
        self._init_db()
        self._initialized = True
        logger.info("MessageQueue initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 任務表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS queue_tasks (
                    id TEXT PRIMARY KEY,
                    queue TEXT NOT NULL,
                    task_type TEXT NOT NULL,
                    payload TEXT,
                    priority INTEGER DEFAULT 5,
                    status TEXT DEFAULT 'pending',
                    max_retries INTEGER DEFAULT 3,
                    retry_count INTEGER DEFAULT 0,
                    retry_delay INTEGER DEFAULT 60,
                    created_at TEXT,
                    scheduled_at TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    result TEXT,
                    error TEXT,
                    metadata TEXT
                )
            ''')
            
            # 死信表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dead_letter_queue (
                    id TEXT PRIMARY KEY,
                    original_task_id TEXT,
                    queue TEXT,
                    task_type TEXT,
                    payload TEXT,
                    error TEXT,
                    retry_count INTEGER,
                    created_at TEXT,
                    moved_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_queue_tasks_queue ON queue_tasks(queue)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_queue_tasks_status ON queue_tasks(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_queue_tasks_priority ON queue_tasks(priority DESC)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_queue_tasks_scheduled ON queue_tasks(scheduled_at)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init message queue DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 處理器註冊 ====================
    
    def register_handler(
        self,
        task_type: str,
        handler: TaskHandler,
        concurrency: int = 5
    ):
        """註冊任務處理器"""
        self._handlers[task_type] = handler
        queue = task_type.split('.')[0] if '.' in task_type else 'default'
        self._concurrency[queue] = concurrency
        logger.info(f"Registered handler for {task_type}")
    
    def handler(self, task_type: str, concurrency: int = 5):
        """處理器裝飾器"""
        def decorator(func: TaskHandler):
            self.register_handler(task_type, func, concurrency)
            return func
        return decorator
    
    # ==================== 任務發布 ====================
    
    def enqueue(
        self,
        task_type: str,
        payload: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL,
        delay: int = 0,
        max_retries: int = 3,
        metadata: Dict = None
    ) -> str:
        """發布任務"""
        task_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        scheduled_at = now + timedelta(seconds=delay) if delay > 0 else now
        queue = task_type.split('.')[0] if '.' in task_type else 'default'
        
        task = QueueTask(
            id=task_id,
            queue=queue,
            task_type=task_type,
            payload=payload,
            priority=priority,
            max_retries=max_retries,
            created_at=now.isoformat(),
            scheduled_at=scheduled_at.isoformat(),
            metadata=metadata or {}
        )
        
        try:
            db = self._get_db()
            db.execute('''
                INSERT INTO queue_tasks 
                (id, queue, task_type, payload, priority, status, max_retries,
                 retry_count, retry_delay, created_at, scheduled_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            ''', (
                task.id, task.queue, task.task_type,
                json.dumps(task.payload), task.priority.value, task.status.value,
                task.max_retries, task.retry_delay,
                task.created_at, task.scheduled_at,
                json.dumps(task.metadata)
            ))
            db.commit()
            db.close()
            
            logger.debug(f"Enqueued task {task_id} ({task_type})")
            return task_id
            
        except Exception as e:
            logger.error(f"Enqueue task error: {e}")
            raise
    
    def enqueue_many(
        self,
        tasks: List[Dict[str, Any]]
    ) -> List[str]:
        """批量發布任務"""
        task_ids = []
        for task_data in tasks:
            task_id = self.enqueue(
                task_type=task_data['task_type'],
                payload=task_data.get('payload', {}),
                priority=task_data.get('priority', TaskPriority.NORMAL),
                delay=task_data.get('delay', 0),
                max_retries=task_data.get('max_retries', 3)
            )
            task_ids.append(task_id)
        return task_ids
    
    # ==================== 任務處理 ====================
    
    async def process_task(self, task: QueueTask) -> bool:
        """處理單個任務"""
        handler = self._handlers.get(task.task_type)
        if not handler:
            logger.warning(f"No handler for task type: {task.task_type}")
            return False
        
        try:
            # 更新狀態為處理中
            self._update_task_status(task.id, TaskStatus.PROCESSING)
            
            # 執行處理器
            result = await handler(task.payload)
            
            # 更新為完成
            self._complete_task(task.id, result)
            logger.debug(f"Task {task.id} completed")
            return True
            
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            logger.error(f"Task {task.id} failed: {error_msg}")
            
            # 重試或失敗
            if task.retry_count < task.max_retries:
                self._retry_task(task, error_msg)
            else:
                self._fail_task(task.id, error_msg)
                self._move_to_dead_letter(task, error_msg)
            
            return False
    
    def _update_task_status(self, task_id: str, status: TaskStatus):
        """更新任務狀態"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            if status == TaskStatus.PROCESSING:
                db.execute('''
                    UPDATE queue_tasks SET status = ?, started_at = ?
                    WHERE id = ?
                ''', (status.value, now, task_id))
            else:
                db.execute('''
                    UPDATE queue_tasks SET status = ?
                    WHERE id = ?
                ''', (status.value, task_id))
            
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Update task status error: {e}")
    
    def _complete_task(self, task_id: str, result: Any):
        """完成任務"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            db.execute('''
                UPDATE queue_tasks 
                SET status = ?, completed_at = ?, result = ?
                WHERE id = ?
            ''', (TaskStatus.COMPLETED.value, now, json.dumps(result), task_id))
            
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Complete task error: {e}")
    
    def _retry_task(self, task: QueueTask, error: str):
        """重試任務"""
        try:
            db = self._get_db()
            now = datetime.utcnow()
            
            # 計算下次執行時間（指數退避）
            delay = task.retry_delay * (2 ** task.retry_count)
            next_run = now + timedelta(seconds=delay)
            
            db.execute('''
                UPDATE queue_tasks 
                SET status = ?, retry_count = retry_count + 1,
                    scheduled_at = ?, error = ?
                WHERE id = ?
            ''', (TaskStatus.RETRY.value, next_run.isoformat(), error, task.id))
            
            db.commit()
            db.close()
            
            logger.info(f"Task {task.id} scheduled for retry at {next_run}")
        except Exception as e:
            logger.error(f"Retry task error: {e}")
    
    def _fail_task(self, task_id: str, error: str):
        """標記任務失敗"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            db.execute('''
                UPDATE queue_tasks 
                SET status = ?, completed_at = ?, error = ?
                WHERE id = ?
            ''', (TaskStatus.FAILED.value, now, error, task_id))
            
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Fail task error: {e}")
    
    def _move_to_dead_letter(self, task: QueueTask, error: str):
        """移動到死信隊列"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            dead_id = str(uuid.uuid4())
            
            db.execute('''
                INSERT INTO dead_letter_queue
                (id, original_task_id, queue, task_type, payload, error, retry_count, created_at, moved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                dead_id, task.id, task.queue, task.task_type,
                json.dumps(task.payload), error, task.retry_count,
                task.created_at, now
            ))
            
            db.commit()
            db.close()
            
            logger.warning(f"Task {task.id} moved to dead letter queue")
        except Exception as e:
            logger.error(f"Move to dead letter error: {e}")
    
    # ==================== 任務獲取 ====================
    
    def get_pending_tasks(
        self,
        queue: str = None,
        limit: int = 10
    ) -> List[QueueTask]:
        """獲取待處理任務"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            if queue:
                rows = db.execute('''
                    SELECT * FROM queue_tasks 
                    WHERE queue = ? AND status IN ('pending', 'retry') 
                          AND scheduled_at <= ?
                    ORDER BY priority DESC, created_at ASC
                    LIMIT ?
                ''', (queue, now, limit)).fetchall()
            else:
                rows = db.execute('''
                    SELECT * FROM queue_tasks 
                    WHERE status IN ('pending', 'retry') AND scheduled_at <= ?
                    ORDER BY priority DESC, created_at ASC
                    LIMIT ?
                ''', (now, limit)).fetchall()
            
            db.close()
            
            tasks = []
            for row in rows:
                tasks.append(QueueTask(
                    id=row['id'],
                    queue=row['queue'],
                    task_type=row['task_type'],
                    payload=json.loads(row['payload']) if row['payload'] else {},
                    priority=TaskPriority(row['priority']),
                    status=TaskStatus(row['status']),
                    max_retries=row['max_retries'],
                    retry_count=row['retry_count'],
                    retry_delay=row['retry_delay'],
                    created_at=row['created_at'] or '',
                    scheduled_at=row['scheduled_at'] or '',
                    metadata=json.loads(row['metadata']) if row['metadata'] else {}
                ))
            
            return tasks
            
        except Exception as e:
            logger.error(f"Get pending tasks error: {e}")
            return []
    
    def get_task(self, task_id: str) -> Optional[QueueTask]:
        """獲取任務詳情"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT * FROM queue_tasks WHERE id = ?',
                (task_id,)
            ).fetchone()
            db.close()
            
            if row:
                return QueueTask(
                    id=row['id'],
                    queue=row['queue'],
                    task_type=row['task_type'],
                    payload=json.loads(row['payload']) if row['payload'] else {},
                    priority=TaskPriority(row['priority']),
                    status=TaskStatus(row['status']),
                    max_retries=row['max_retries'],
                    retry_count=row['retry_count'],
                    result=json.loads(row['result']) if row['result'] else None,
                    error=row['error'] or '',
                    created_at=row['created_at'] or '',
                    completed_at=row['completed_at'] or ''
                )
            
            return None
        except:
            return None
    
    # ==================== 工作線程 ====================
    
    async def start_worker(self, queue: str = 'default'):
        """啟動工作線程"""
        if queue in self._workers:
            return
        
        self._running = True
        
        async def worker_loop():
            while self._running:
                try:
                    # 檢查併發限制
                    if self._active_tasks[queue] >= self._concurrency[queue]:
                        await asyncio.sleep(0.1)
                        continue
                    
                    # 獲取任務
                    tasks = self.get_pending_tasks(queue, limit=1)
                    
                    if not tasks:
                        await asyncio.sleep(1)
                        continue
                    
                    task = tasks[0]
                    self._active_tasks[queue] += 1
                    
                    try:
                        await self.process_task(task)
                    finally:
                        self._active_tasks[queue] -= 1
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Worker error: {e}")
                    await asyncio.sleep(5)
        
        self._workers[queue] = asyncio.create_task(worker_loop())
        logger.info(f"Started worker for queue: {queue}")
    
    async def stop_workers(self):
        """停止所有工作線程"""
        self._running = False
        
        for queue, task in self._workers.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self._workers.clear()
        logger.info("All workers stopped")
    
    # ==================== 統計 ====================
    
    def get_stats(self, queue: str = None) -> Dict[str, Any]:
        """獲取隊列統計"""
        try:
            db = self._get_db()
            
            if queue:
                rows = db.execute('''
                    SELECT status, COUNT(*) as count
                    FROM queue_tasks WHERE queue = ?
                    GROUP BY status
                ''', (queue,)).fetchall()
            else:
                rows = db.execute('''
                    SELECT queue, status, COUNT(*) as count
                    FROM queue_tasks
                    GROUP BY queue, status
                ''').fetchall()
            
            # 死信統計
            dead_count = db.execute(
                'SELECT COUNT(*) as count FROM dead_letter_queue'
            ).fetchone()['count']
            
            db.close()
            
            stats = defaultdict(lambda: QueueStats(queue=''))
            
            for row in rows:
                q = row.get('queue', queue or 'default')
                status = row['status']
                count = row['count']
                
                if q not in stats:
                    stats[q] = QueueStats(queue=q)
                
                if status == 'pending':
                    stats[q].pending = count
                elif status == 'processing':
                    stats[q].processing = count
                elif status == 'completed':
                    stats[q].completed = count
                elif status == 'failed':
                    stats[q].failed = count
            
            return {
                'queues': {k: v.to_dict() for k, v in stats.items()},
                'dead_letter_count': dead_count,
                'active_workers': list(self._workers.keys()),
                'active_tasks': dict(self._active_tasks)
            }
            
        except Exception as e:
            logger.error(f"Get stats error: {e}")
            return {}
    
    # ==================== 清理 ====================
    
    def cleanup_completed(self, older_than_days: int = 7) -> int:
        """清理已完成的任務"""
        try:
            db = self._get_db()
            cutoff = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat()
            
            cursor = db.execute('''
                DELETE FROM queue_tasks 
                WHERE status = 'completed' AND completed_at < ?
            ''', (cutoff,))
            
            count = cursor.rowcount
            db.commit()
            db.close()
            
            logger.info(f"Cleaned up {count} completed tasks")
            return count
        except:
            return 0
    
    def retry_dead_letter(self, dead_id: str) -> Optional[str]:
        """重試死信任務"""
        try:
            db = self._get_db()
            
            row = db.execute(
                'SELECT * FROM dead_letter_queue WHERE id = ?',
                (dead_id,)
            ).fetchone()
            
            if not row:
                db.close()
                return None
            
            # 刪除死信
            db.execute('DELETE FROM dead_letter_queue WHERE id = ?', (dead_id,))
            db.commit()
            db.close()
            
            # 重新入隊
            task_id = self.enqueue(
                task_type=row['task_type'],
                payload=json.loads(row['payload']) if row['payload'] else {},
                priority=TaskPriority.HIGH
            )
            
            return task_id
        except:
            return None


# ==================== 單例訪問 ====================

_message_queue: Optional[MessageQueue] = None


def get_message_queue() -> MessageQueue:
    """獲取消息隊列"""
    global _message_queue
    if _message_queue is None:
        _message_queue = MessageQueue()
    return _message_queue

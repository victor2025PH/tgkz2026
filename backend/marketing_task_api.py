"""
營銷任務 API
Marketing Task API

🆕 後端優化: 完善營銷任務相關 API

功能：
- 任務 CRUD 操作
- 任務狀態管理
- 任務統計查詢
- 目標用戶管理
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import sqlite3
import threading
from contextlib import contextmanager

from database import Database


class TaskStatus(str, Enum):
    """任務狀態"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class GoalType(str, Enum):
    """目標類型"""
    CONVERSION = "conversion"
    RETENTION = "retention"
    ENGAGEMENT = "engagement"
    SUPPORT = "support"


class ExecutionMode(str, Enum):
    """執行模式"""
    SCRIPTED = "scripted"
    HYBRID = "hybrid"
    SCRIPTLESS = "scriptless"


@dataclass
class TaskStats:
    """任務統計"""
    contacted: int = 0
    replied: int = 0
    converted: int = 0
    failed: int = 0
    messages_sent: int = 0
    ai_cost: float = 0.0


@dataclass
class TaskTarget:
    """目標用戶"""
    id: str
    user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    status: str = "pending"
    outcome: Optional[str] = None
    intent_score: int = 0
    contacted_at: Optional[str] = None
    converted_at: Optional[str] = None


@dataclass
class RoleConfig:
    """角色配置"""
    role_type: str
    account_id: Optional[str] = None
    script_template_id: Optional[str] = None
    priority: int = 1


@dataclass
class TargetCriteria:
    """目標條件"""
    intent_score_min: int = 50
    intent_score_max: int = 100
    sources: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    exclude_contacted_days: int = 7


@dataclass
class MarketingTask:
    """營銷任務"""
    id: str
    name: str
    description: Optional[str]
    goal_type: GoalType
    execution_mode: ExecutionMode
    status: TaskStatus
    
    # 配置
    role_config: List[RoleConfig] = field(default_factory=list)
    target_criteria: Optional[TargetCriteria] = None
    
    # 統計
    stats: TaskStats = field(default_factory=TaskStats)
    
    # 時間
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # 關聯
    collaboration_group_id: Optional[str] = None
    script_template_id: Optional[str] = None


class MarketingTaskAPI:
    """營銷任務 API"""
    
    def __init__(self, db: Database):
        self.db = db
        self._lock = threading.Lock()
        self._ensure_tables()
    
    def _ensure_tables(self):
        """確保數據表存在"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 營銷任務表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS marketing_tasks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    goal_type TEXT NOT NULL,
                    execution_mode TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'draft',
                    role_config TEXT,
                    target_criteria TEXT,
                    stats TEXT,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    updated_at TEXT NOT NULL,
                    collaboration_group_id TEXT,
                    script_template_id TEXT
                )
            """)
            
            # 任務目標用戶表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS marketing_task_targets (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    username TEXT,
                    display_name TEXT,
                    status TEXT DEFAULT 'pending',
                    outcome TEXT,
                    intent_score INTEGER DEFAULT 0,
                    contacted_at TEXT,
                    converted_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES marketing_tasks(id)
                )
            """)
            
            # 創建索引
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON marketing_tasks(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_goal ON marketing_tasks(goal_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_targets_task ON marketing_task_targets(task_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_targets_status ON marketing_task_targets(status)")
            
            conn.commit()
    
    # ============ 任務 CRUD ============
    
    def create_task(self, data: Dict[str, Any]) -> MarketingTask:
        """創建任務"""
        task_id = f"task-{uuid.uuid4().hex[:12]}"
        now = datetime.now().isoformat()
        
        task = MarketingTask(
            id=task_id,
            name=data.get("name", "新任務"),
            description=data.get("description"),
            goal_type=GoalType(data.get("goal_type", "conversion")),
            execution_mode=ExecutionMode(data.get("execution_mode", "hybrid")),
            status=TaskStatus.DRAFT,
            created_at=now,
            updated_at=now
        )
        
        # 處理角色配置
        if "role_config" in data:
            task.role_config = [
                RoleConfig(**rc) if isinstance(rc, dict) else rc
                for rc in data["role_config"]
            ]
        
        # 處理目標條件
        if "target_criteria" in data:
            tc = data["target_criteria"]
            task.target_criteria = TargetCriteria(**tc) if isinstance(tc, dict) else tc
        
        # 保存到數據庫
        self._save_task(task)
        
        return task
    
    def get_task(self, task_id: str) -> Optional[MarketingTask]:
        """獲取任務"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM marketing_tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_task(row)
    
    def get_all_tasks(self, status: Optional[str] = None, goal_type: Optional[str] = None) -> List[MarketingTask]:
        """獲取所有任務"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM marketing_tasks WHERE 1=1"
            params = []
            
            if status:
                query += " AND status = ?"
                params.append(status)
            
            if goal_type:
                query += " AND goal_type = ?"
                params.append(goal_type)
            
            query += " ORDER BY created_at DESC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [self._row_to_task(row) for row in rows]
    
    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[MarketingTask]:
        """更新任務"""
        task = self.get_task(task_id)
        if not task:
            return None
        
        # 更新字段
        for key, value in updates.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.updated_at = datetime.now().isoformat()
        
        self._save_task(task, is_update=True)
        
        return task
    
    def delete_task(self, task_id: str) -> bool:
        """刪除任務"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 刪除關聯的目標用戶
            cursor.execute("DELETE FROM marketing_task_targets WHERE task_id = ?", (task_id,))
            
            # 刪除任務
            cursor.execute("DELETE FROM marketing_tasks WHERE id = ?", (task_id,))
            
            conn.commit()
            return cursor.rowcount > 0
    
    # ============ 任務狀態管理 ============
    
    def start_task(self, task_id: str) -> Optional[MarketingTask]:
        """啟動任務"""
        return self.update_task(task_id, {
            "status": TaskStatus.RUNNING,
            "started_at": datetime.now().isoformat()
        })
    
    def pause_task(self, task_id: str) -> Optional[MarketingTask]:
        """暫停任務"""
        return self.update_task(task_id, {"status": TaskStatus.PAUSED})
    
    def resume_task(self, task_id: str) -> Optional[MarketingTask]:
        """恢復任務"""
        return self.update_task(task_id, {"status": TaskStatus.RUNNING})
    
    def complete_task(self, task_id: str) -> Optional[MarketingTask]:
        """完成任務"""
        return self.update_task(task_id, {
            "status": TaskStatus.COMPLETED,
            "completed_at": datetime.now().isoformat()
        })
    
    def fail_task(self, task_id: str, reason: str = None) -> Optional[MarketingTask]:
        """標記任務失敗"""
        return self.update_task(task_id, {
            "status": TaskStatus.FAILED,
            "completed_at": datetime.now().isoformat()
        })
    
    # ============ 統計更新 ============
    
    def update_stats(self, task_id: str, stat_updates: Dict[str, Any]) -> Optional[MarketingTask]:
        """更新任務統計"""
        task = self.get_task(task_id)
        if not task:
            return None
        
        for key, value in stat_updates.items():
            if hasattr(task.stats, key):
                if key == "ai_cost":
                    # 累加成本
                    task.stats.ai_cost += value
                else:
                    # 累加計數
                    current = getattr(task.stats, key)
                    setattr(task.stats, key, current + value)
        
        self._save_task(task, is_update=True)
        
        return task
    
    def get_overall_stats(self) -> Dict[str, Any]:
        """獲取總體統計"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 任務統計
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM marketing_tasks
            """)
            task_stats = cursor.fetchone()
            
            # 聚合統計
            cursor.execute("SELECT stats FROM marketing_tasks")
            rows = cursor.fetchall()
            
            total_contacted = 0
            total_converted = 0
            total_messages = 0
            total_cost = 0.0
            
            for row in rows:
                if row[0]:
                    stats = json.loads(row[0])
                    total_contacted += stats.get("contacted", 0)
                    total_converted += stats.get("converted", 0)
                    total_messages += stats.get("messages_sent", 0)
                    total_cost += stats.get("ai_cost", 0.0)
            
            return {
                "total_tasks": task_stats[0] or 0,
                "active_tasks": task_stats[1] or 0,
                "completed_tasks": task_stats[2] or 0,
                "total_contacted": total_contacted,
                "total_converted": total_converted,
                "total_messages_sent": total_messages,
                "total_ai_cost": total_cost,
                "conversion_rate": round((total_converted / total_contacted * 100) if total_contacted > 0 else 0, 2)
            }
    
    # ============ 目標用戶管理 ============
    
    def add_targets(self, task_id: str, targets: List[Dict[str, Any]]) -> List[TaskTarget]:
        """添加目標用戶"""
        result = []
        now = datetime.now().isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            for target_data in targets:
                target_id = f"target-{uuid.uuid4().hex[:12]}"
                
                cursor.execute("""
                    INSERT INTO marketing_task_targets 
                    (id, task_id, user_id, username, display_name, status, intent_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    target_id,
                    task_id,
                    target_data.get("user_id"),
                    target_data.get("username"),
                    target_data.get("display_name"),
                    "pending",
                    target_data.get("intent_score", 0),
                    now
                ))
                
                result.append(TaskTarget(
                    id=target_id,
                    user_id=target_data.get("user_id"),
                    username=target_data.get("username"),
                    display_name=target_data.get("display_name"),
                    intent_score=target_data.get("intent_score", 0)
                ))
            
            conn.commit()
        
        return result
    
    def get_task_targets(self, task_id: str, status: Optional[str] = None) -> List[TaskTarget]:
        """獲取任務目標用戶"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM marketing_task_targets WHERE task_id = ?"
            params = [task_id]
            
            if status:
                query += " AND status = ?"
                params.append(status)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [self._row_to_target(row) for row in rows]
    
    def update_target_status(self, target_id: str, status: str, outcome: Optional[str] = None) -> bool:
        """更新目標用戶狀態"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            if status == "contacted":
                cursor.execute("""
                    UPDATE marketing_task_targets 
                    SET status = ?, contacted_at = ?
                    WHERE id = ?
                """, (status, now, target_id))
            elif status == "converted":
                cursor.execute("""
                    UPDATE marketing_task_targets 
                    SET status = ?, outcome = ?, converted_at = ?
                    WHERE id = ?
                """, (status, outcome, now, target_id))
            else:
                cursor.execute("""
                    UPDATE marketing_task_targets 
                    SET status = ?, outcome = ?
                    WHERE id = ?
                """, (status, outcome, target_id))
            
            conn.commit()
            return cursor.rowcount > 0
    
    # ============ 私有方法 ============
    
    def _save_task(self, task: MarketingTask, is_update: bool = False):
        """保存任務到數據庫"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 序列化複雜字段
            role_config_json = json.dumps([asdict(rc) for rc in task.role_config]) if task.role_config else None
            target_criteria_json = json.dumps(asdict(task.target_criteria)) if task.target_criteria else None
            stats_json = json.dumps(asdict(task.stats))
            
            if is_update:
                cursor.execute("""
                    UPDATE marketing_tasks SET
                        name = ?, description = ?, goal_type = ?, execution_mode = ?,
                        status = ?, role_config = ?, target_criteria = ?, stats = ?,
                        started_at = ?, completed_at = ?, updated_at = ?,
                        collaboration_group_id = ?, script_template_id = ?
                    WHERE id = ?
                """, (
                    task.name, task.description, task.goal_type.value, task.execution_mode.value,
                    task.status.value, role_config_json, target_criteria_json, stats_json,
                    task.started_at, task.completed_at, task.updated_at,
                    task.collaboration_group_id, task.script_template_id,
                    task.id
                ))
            else:
                cursor.execute("""
                    INSERT INTO marketing_tasks 
                    (id, name, description, goal_type, execution_mode, status, role_config,
                     target_criteria, stats, created_at, started_at, completed_at, updated_at,
                     collaboration_group_id, script_template_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    task.id, task.name, task.description, task.goal_type.value, task.execution_mode.value,
                    task.status.value, role_config_json, target_criteria_json, stats_json,
                    task.created_at, task.started_at, task.completed_at, task.updated_at,
                    task.collaboration_group_id, task.script_template_id
                ))
            
            conn.commit()
    
    def _row_to_task(self, row) -> MarketingTask:
        """將數據庫行轉換為任務對象"""
        # 解析 JSON 字段
        role_config = []
        if row[6]:
            role_config = [RoleConfig(**rc) for rc in json.loads(row[6])]
        
        target_criteria = None
        if row[7]:
            target_criteria = TargetCriteria(**json.loads(row[7]))
        
        stats = TaskStats()
        if row[8]:
            stats_data = json.loads(row[8])
            stats = TaskStats(**stats_data)
        
        return MarketingTask(
            id=row[0],
            name=row[1],
            description=row[2],
            goal_type=GoalType(row[3]),
            execution_mode=ExecutionMode(row[4]),
            status=TaskStatus(row[5]),
            role_config=role_config,
            target_criteria=target_criteria,
            stats=stats,
            created_at=row[9],
            started_at=row[10],
            completed_at=row[11],
            updated_at=row[12],
            collaboration_group_id=row[13],
            script_template_id=row[14]
        )
    
    def _row_to_target(self, row) -> TaskTarget:
        """將數據庫行轉換為目標用戶對象"""
        return TaskTarget(
            id=row[0],
            user_id=row[2],
            username=row[3],
            display_name=row[4],
            status=row[5],
            outcome=row[6],
            intent_score=row[7],
            contacted_at=row[8],
            converted_at=row[9]
        )


# ============ IPC 處理器 ============

def register_marketing_task_handlers(ipc_handler, db: Database):
    """註冊營銷任務 IPC 處理器"""
    api = MarketingTaskAPI(db)
    
    @ipc_handler.handle("get-marketing-tasks")
    async def handle_get_tasks(data):
        tasks = api.get_all_tasks(
            status=data.get("status"),
            goal_type=data.get("goal_type")
        )
        return {
            "success": True,
            "tasks": [asdict(t) for t in tasks]
        }
    
    @ipc_handler.handle("get-marketing-task")
    async def handle_get_task(data):
        task = api.get_task(data.get("id"))
        if task:
            return {"success": True, "task": asdict(task)}
        return {"success": False, "error": "Task not found"}
    
    @ipc_handler.handle("create-marketing-task")
    async def handle_create_task(data):
        task = api.create_task(data)
        return {"success": True, "task": asdict(task)}
    
    @ipc_handler.handle("update-marketing-task")
    async def handle_update_task(data):
        task_id = data.pop("id", None)
        if not task_id:
            return {"success": False, "error": "Missing task id"}
        
        task = api.update_task(task_id, data)
        if task:
            return {"success": True, "task": asdict(task)}
        return {"success": False, "error": "Task not found"}
    
    @ipc_handler.handle("delete-marketing-task")
    async def handle_delete_task(data):
        success = api.delete_task(data.get("id"))
        return {"success": success}
    
    @ipc_handler.handle("start-marketing-task")
    async def handle_start_task(data):
        task = api.start_task(data.get("id"))
        if task:
            return {"success": True, "task": asdict(task)}
        return {"success": False, "error": "Task not found"}
    
    @ipc_handler.handle("pause-marketing-task")
    async def handle_pause_task(data):
        task = api.pause_task(data.get("id"))
        if task:
            return {"success": True, "task": asdict(task)}
        return {"success": False, "error": "Task not found"}
    
    @ipc_handler.handle("complete-marketing-task")
    async def handle_complete_task(data):
        task = api.complete_task(data.get("id"))
        if task:
            return {"success": True, "task": asdict(task)}
        return {"success": False, "error": "Task not found"}
    
    @ipc_handler.handle("get-marketing-stats")
    async def handle_get_stats(data):
        stats = api.get_overall_stats()
        return {"success": True, "stats": stats}
    
    @ipc_handler.handle("add-marketing-task-targets")
    async def handle_add_targets(data):
        targets = api.add_targets(data.get("task_id"), data.get("targets", []))
        return {"success": True, "targets": [asdict(t) for t in targets]}
    
    @ipc_handler.handle("get-marketing-task-targets")
    async def handle_get_targets(data):
        targets = api.get_task_targets(data.get("task_id"), data.get("status"))
        return {"success": True, "targets": [asdict(t) for t in targets]}
    
    @ipc_handler.handle("update-marketing-task-target")
    async def handle_update_target(data):
        success = api.update_target_status(
            data.get("target_id"),
            data.get("status"),
            data.get("outcome")
        )
        return {"success": success}
    
    return api

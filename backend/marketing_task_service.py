"""
統一營銷任務服務
Unified Marketing Task Service

整合多角色協作和AI中心的功能，提供統一的任務管理

設計原則：
- 單一數據源（Single Source of Truth）
- 統一的狀態機管理
- 統一的統計口徑
"""

import sys
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum


class GoalType(Enum):
    """任務目標類型"""
    CONVERSION = "conversion"    # 促進成交
    RETENTION = "retention"      # 挽回流失
    ENGAGEMENT = "engagement"    # 社群活躍
    SUPPORT = "support"          # 售後服務


class ExecutionMode(Enum):
    """執行模式"""
    SCRIPTED = "scripted"      # 劇本模式
    HYBRID = "hybrid"          # 混合模式
    SCRIPTLESS = "scriptless"  # 無劇本模式


class TaskStatus(Enum):
    """任務狀態"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class TargetStatus(Enum):
    """目標用戶狀態"""
    PENDING = "pending"
    CONTACTED = "contacted"
    REPLIED = "replied"
    CONVERTED = "converted"
    FAILED = "failed"


@dataclass
class TaskStats:
    """任務統計"""
    total_contacts: int = 0
    contacted: int = 0
    replied: int = 0
    converted: int = 0
    messages_sent: int = 0
    ai_cost: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalContacts": self.total_contacts,
            "contacted": self.contacted,
            "replied": self.replied,
            "converted": self.converted,
            "messagesSent": self.messages_sent,
            "aiCost": self.ai_cost,
            "contactRate": round(self.contacted / self.total_contacts * 100, 1) if self.total_contacts > 0 else 0,
            "replyRate": round(self.replied / self.contacted * 100, 1) if self.contacted > 0 else 0,
            "conversionRate": round(self.converted / self.contacted * 100, 1) if self.contacted > 0 else 0
        }


class MarketingTaskService:
    """
    統一營銷任務服務
    
    職責：
    1. 任務 CRUD
    2. 目標用戶管理
    3. 角色分配
    4. 統計追蹤
    5. 與 AI 引擎和協作系統協調
    """
    
    def __init__(self, db, event_callback=None, log_callback=None):
        self.db = db
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
        
        # 外部服務引用
        self.ai_engine = None
        self.collaboration_coordinator = None
        
    def _default_log(self, message: str, level: str = "info"):
        print(f"[MarketingTaskService] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """發送事件到前端"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """初始化服務"""
        if self._initialized:
            return
        
        # 確保表已創建（遷移應該已經處理）
        self._initialized = True
        self.log_callback("營銷任務服務已初始化", "success")
    
    def set_ai_engine(self, engine):
        """設置 AI 引擎引用"""
        self.ai_engine = engine
    
    def set_collaboration_coordinator(self, coordinator):
        """設置協作協調器引用"""
        self.collaboration_coordinator = coordinator
    
    # ==================== 任務 CRUD ====================
    
    async def create_task(
        self,
        name: str,
        goal_type: str = "conversion",
        execution_mode: str = "hybrid",
        description: str = None,
        target_criteria: Dict = None,
        role_config: List[Dict] = None,
        schedule_config: Dict = None,
        created_by: str = None
    ) -> Dict[str, Any]:
        """創建新任務"""
        try:
            now = datetime.now().isoformat()
            
            task_id = await self.db.execute('''
                INSERT INTO marketing_tasks 
                (name, description, goal_type, execution_mode, status,
                 target_criteria, role_config, schedule_config, 
                 created_at, updated_at, created_by)
                VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
            ''', (
                name,
                description,
                goal_type,
                execution_mode,
                json.dumps(target_criteria) if target_criteria else None,
                json.dumps(role_config) if role_config else None,
                json.dumps(schedule_config) if schedule_config else None,
                now,
                now,
                created_by
            ))
            
            task = await self.get_task(task_id)
            
            self._send_event("marketing-task-created", {
                "success": True,
                "task": task
            })
            
            self.log_callback(f"任務已創建: {name} (ID: {task_id})", "success")
            
            return {"success": True, "taskId": task_id, "task": task}
            
        except Exception as e:
            self.log_callback(f"創建任務失敗: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def get_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        """獲取任務詳情"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM marketing_tasks WHERE id = ?',
                (task_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_task(row)
            
        except Exception as e:
            self.log_callback(f"獲取任務失敗: {e}", "error")
            return None
    
    async def get_all_tasks(
        self,
        status: str = None,
        goal_type: str = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """獲取所有任務"""
        try:
            query = 'SELECT * FROM marketing_tasks WHERE 1=1'
            params = []
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            if goal_type:
                query += ' AND goal_type = ?'
                params.append(goal_type)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = await self.db.fetch_all(query, tuple(params))
            tasks = [self._row_to_task(row) for row in rows]
            
            return {"success": True, "tasks": tasks}
            
        except Exception as e:
            self.log_callback(f"獲取任務列表失敗: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def update_task(
        self,
        task_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """更新任務"""
        try:
            # 構建更新語句
            allowed_fields = [
                'name', 'description', 'goal_type', 'execution_mode',
                'status', 'current_stage', 'target_criteria', 'role_config',
                'schedule_config', 'trigger_conditions', 'script_id'
            ]
            
            update_parts = []
            params = []
            
            for field in allowed_fields:
                if field in updates:
                    value = updates[field]
                    if isinstance(value, (dict, list)):
                        value = json.dumps(value)
                    update_parts.append(f"{field} = ?")
                    params.append(value)
            
            if not update_parts:
                return {"success": False, "error": "沒有要更新的字段"}
            
            update_parts.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            
            params.append(task_id)
            
            await self.db.execute(
                f"UPDATE marketing_tasks SET {', '.join(update_parts)} WHERE id = ?",
                tuple(params)
            )
            
            task = await self.get_task(task_id)
            
            self._send_event("marketing-task-updated", {
                "success": True,
                "task": task
            })
            
            return {"success": True, "task": task}
            
        except Exception as e:
            self.log_callback(f"更新任務失敗: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def delete_task(self, task_id: int) -> Dict[str, Any]:
        """刪除任務"""
        try:
            await self.db.execute(
                'DELETE FROM marketing_tasks WHERE id = ?',
                (task_id,)
            )
            
            self._send_event("marketing-task-deleted", {
                "success": True,
                "taskId": task_id
            })
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== 狀態控制 ====================
    
    async def start_task(self, task_id: int) -> Dict[str, Any]:
        """啟動任務"""
        try:
            await self.update_task(task_id, {
                "status": "running",
                "started_at": datetime.now().isoformat()
            })
            
            # 記錄日誌
            await self._log_task_event(task_id, "status_change", "任務啟動", {
                "from": "draft",
                "to": "running"
            })
            
            # 觸發 AI 引擎
            if self.ai_engine:
                # TODO: 調用 AI 引擎開始執行
                pass
            
            self._send_event("marketing-task-started", {
                "taskId": task_id
            })
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def pause_task(self, task_id: int) -> Dict[str, Any]:
        """暫停任務"""
        try:
            await self.update_task(task_id, {"status": "paused"})
            
            await self._log_task_event(task_id, "status_change", "任務暫停", {})
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def resume_task(self, task_id: int) -> Dict[str, Any]:
        """恢復任務"""
        try:
            await self.update_task(task_id, {"status": "running"})
            
            await self._log_task_event(task_id, "status_change", "任務恢復", {})
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def complete_task(self, task_id: int) -> Dict[str, Any]:
        """完成任務"""
        try:
            await self.update_task(task_id, {
                "status": "completed",
                "completed_at": datetime.now().isoformat()
            })
            
            await self._log_task_event(task_id, "status_change", "任務完成", {})
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== 目標用戶管理 ====================
    
    async def add_targets(
        self,
        task_id: int,
        targets: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """添加目標用戶"""
        try:
            now = datetime.now().isoformat()
            added = 0
            
            for target in targets:
                try:
                    await self.db.execute('''
                        INSERT INTO marketing_task_targets
                        (task_id, telegram_id, username, first_name, last_name,
                         intent_score, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                    ''', (
                        task_id,
                        target.get('telegramId') or target.get('telegram_id'),
                        target.get('username'),
                        target.get('firstName') or target.get('first_name'),
                        target.get('lastName') or target.get('last_name'),
                        target.get('intentScore') or target.get('intent_score', 0),
                        now,
                        now
                    ))
                    added += 1
                except Exception:
                    # 可能是重複，跳過
                    continue
            
            # 更新任務統計
            await self.db.execute('''
                UPDATE marketing_tasks 
                SET stats_total_contacts = stats_total_contacts + ?,
                    target_count = target_count + ?
                WHERE id = ?
            ''', (added, added, task_id))
            
            self._send_event("marketing-task-targets-added", {
                "taskId": task_id,
                "addedCount": added
            })
            
            return {"success": True, "addedCount": added}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_task_targets(
        self,
        task_id: int,
        status: str = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """獲取任務目標用戶"""
        try:
            query = 'SELECT * FROM marketing_task_targets WHERE task_id = ?'
            params = [task_id]
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            targets = []
            for row in rows:
                targets.append({
                    "id": row['id'],
                    "taskId": row['task_id'],
                    "telegramId": row['telegram_id'],
                    "username": row['username'],
                    "firstName": row['first_name'],
                    "lastName": row['last_name'],
                    "status": row['status'],
                    "intentScore": row['intent_score'],
                    "assignedRole": row['assigned_role'],
                    "lastMessageAt": row['last_message_at'],
                    "messageCount": row['message_count'],
                    "outcome": row['outcome'],
                    "outcomeNotes": row['outcome_notes'],
                    "createdAt": row['created_at']
                })
            
            return {"success": True, "targets": targets}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_target_status(
        self,
        task_id: int,
        target_id: int,
        status: str,
        outcome: str = None
    ) -> Dict[str, Any]:
        """更新目標狀態"""
        try:
            # 獲取舊狀態
            row = await self.db.fetch_one(
                'SELECT status FROM marketing_task_targets WHERE id = ?',
                (target_id,)
            )
            old_status = row['status'] if row else None
            
            # 更新狀態
            updates = ["status = ?", "updated_at = ?"]
            params = [status, datetime.now().isoformat()]
            
            if outcome:
                updates.append("outcome = ?")
                params.append(outcome)
            
            params.append(target_id)
            
            await self.db.execute(
                f"UPDATE marketing_task_targets SET {', '.join(updates)} WHERE id = ?",
                tuple(params)
            )
            
            # 更新任務統計
            await self._update_task_stats_on_target_change(task_id, old_status, status)
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _update_task_stats_on_target_change(
        self,
        task_id: int,
        old_status: str,
        new_status: str
    ):
        """根據目標狀態變化更新任務統計"""
        stats_updates = []
        
        # 接觸數
        if old_status == 'pending' and new_status in ['contacted', 'replied', 'converted']:
            stats_updates.append("stats_contacted = stats_contacted + 1")
        
        # 回覆數
        if old_status in ['pending', 'contacted'] and new_status in ['replied', 'converted']:
            if old_status != 'replied':
                stats_updates.append("stats_replied = stats_replied + 1")
        
        # 轉化數
        if new_status == 'converted' and old_status != 'converted':
            stats_updates.append("stats_converted = stats_converted + 1")
        
        if stats_updates:
            await self.db.execute(
                f"UPDATE marketing_tasks SET {', '.join(stats_updates)} WHERE id = ?",
                (task_id,)
            )
    
    # ==================== 角色管理 ====================
    
    async def assign_role(
        self,
        task_id: int,
        role_type: str,
        role_name: str,
        account_id: int = None,
        account_phone: str = None,
        persona_prompt: str = None
    ) -> Dict[str, Any]:
        """分配角色"""
        try:
            now = datetime.now().isoformat()
            
            role_id = await self.db.execute('''
                INSERT INTO marketing_task_roles
                (task_id, role_type, role_name, account_id, account_phone,
                 persona_prompt, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                task_id,
                role_type,
                role_name,
                account_id,
                account_phone,
                persona_prompt,
                now
            ))
            
            return {"success": True, "roleId": role_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_task_roles(self, task_id: int) -> Dict[str, Any]:
        """獲取任務角色"""
        try:
            rows = await self.db.fetch_all(
                'SELECT * FROM marketing_task_roles WHERE task_id = ?',
                (task_id,)
            )
            
            roles = []
            for row in rows:
                roles.append({
                    "id": row['id'],
                    "roleType": row['role_type'],
                    "roleName": row['role_name'],
                    "accountId": row['account_id'],
                    "accountPhone": row['account_phone'],
                    "personaPrompt": row['persona_prompt'],
                    "messagesSent": row['messages_sent'],
                    "lastActiveAt": row['last_active_at']
                })
            
            return {"success": True, "roles": roles}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== 統計查詢 ====================
    
    async def get_task_stats(self, task_id: int) -> Dict[str, Any]:
        """獲取任務統計"""
        try:
            row = await self.db.fetch_one('''
                SELECT stats_total_contacts, stats_contacted, stats_replied,
                       stats_converted, stats_messages_sent, stats_ai_cost
                FROM marketing_tasks WHERE id = ?
            ''', (task_id,))
            
            if not row:
                return {"success": False, "error": "任務不存在"}
            
            stats = TaskStats(
                total_contacts=row['stats_total_contacts'] or 0,
                contacted=row['stats_contacted'] or 0,
                replied=row['stats_replied'] or 0,
                converted=row['stats_converted'] or 0,
                messages_sent=row['stats_messages_sent'] or 0,
                ai_cost=row['stats_ai_cost'] or 0.0
            )
            
            return {"success": True, "stats": stats.to_dict()}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_overall_stats(self) -> Dict[str, Any]:
        """獲取總體統計"""
        try:
            row = await self.db.fetch_one('''
                SELECT 
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status IN ('running', 'scheduled') THEN 1 ELSE 0 END) as active_tasks,
                    SUM(stats_total_contacts) as total_contacts,
                    SUM(stats_contacted) as total_contacted,
                    SUM(stats_replied) as total_replied,
                    SUM(stats_converted) as total_converted,
                    SUM(stats_messages_sent) as total_messages,
                    SUM(stats_ai_cost) as total_ai_cost
                FROM marketing_tasks
            ''')
            
            total_contacted = row['total_contacted'] or 0
            total_converted = row['total_converted'] or 0
            
            return {
                "success": True,
                "stats": {
                    "totalTasks": row['total_tasks'] or 0,
                    "activeTasks": row['active_tasks'] or 0,
                    "totalContacts": row['total_contacts'] or 0,
                    "totalContacted": total_contacted,
                    "totalReplied": row['total_replied'] or 0,
                    "totalConverted": total_converted,
                    "totalMessages": row['total_messages'] or 0,
                    "totalAiCost": row['total_ai_cost'] or 0.0,
                    "conversionRate": round(total_converted / total_contacted * 100, 1) if total_contacted > 0 else 0
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== 日誌記錄 ====================
    
    async def _log_task_event(
        self,
        task_id: int,
        log_type: str,
        action: str,
        details: Dict = None,
        target_id: int = None,
        actor_type: str = "system",
        actor_id: str = None
    ):
        """記錄任務事件"""
        try:
            await self.db.execute('''
                INSERT INTO marketing_task_logs
                (task_id, target_id, log_type, action, details, actor_type, actor_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                task_id,
                target_id,
                log_type,
                action,
                json.dumps(details) if details else None,
                actor_type,
                actor_id,
                datetime.now().isoformat()
            ))
        except Exception as e:
            self.log_callback(f"記錄日誌失敗: {e}", "error")
    
    async def get_task_logs(
        self,
        task_id: int,
        log_type: str = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """獲取任務日誌"""
        try:
            query = 'SELECT * FROM marketing_task_logs WHERE task_id = ?'
            params = [task_id]
            
            if log_type:
                query += ' AND log_type = ?'
                params.append(log_type)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            logs = []
            for row in rows:
                logs.append({
                    "id": row['id'],
                    "taskId": row['task_id'],
                    "targetId": row['target_id'],
                    "logType": row['log_type'],
                    "action": row['action'],
                    "details": json.loads(row['details']) if row['details'] else None,
                    "actorType": row['actor_type'],
                    "actorId": row['actor_id'],
                    "createdAt": row['created_at']
                })
            
            return {"success": True, "logs": logs}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== 輔助方法 ====================
    
    def _row_to_task(self, row) -> Dict[str, Any]:
        """將數據庫行轉換為任務字典"""
        return {
            "id": row['id'],
            "name": row['name'],
            "description": row['description'],
            "goalType": row['goal_type'],
            "aiConfigId": row['ai_config_id'],
            "executionMode": row['execution_mode'],
            "status": row['status'],
            "currentStage": row['current_stage'],
            "targetCount": row['target_count'],
            "targetCriteria": json.loads(row['target_criteria']) if row['target_criteria'] else None,
            "roleConfig": json.loads(row['role_config']) if row['role_config'] else None,
            "scriptId": row['script_id'],
            "scheduleConfig": json.loads(row['schedule_config']) if row['schedule_config'] else None,
            "triggerConditions": json.loads(row['trigger_conditions']) if row['trigger_conditions'] else None,
            "stats": {
                "totalContacts": row['stats_total_contacts'] or 0,
                "contacted": row['stats_contacted'] or 0,
                "replied": row['stats_replied'] or 0,
                "converted": row['stats_converted'] or 0,
                "messagesSent": row['stats_messages_sent'] or 0,
                "aiCost": row['stats_ai_cost'] or 0.0
            },
            "createdAt": row['created_at'],
            "startedAt": row['started_at'],
            "completedAt": row['completed_at'],
            "updatedAt": row['updated_at'],
            "createdBy": row['created_by']
        }


# 全局實例
_marketing_task_service: Optional[MarketingTaskService] = None


async def init_marketing_task_service(
    db,
    event_callback=None,
    log_callback=None
) -> MarketingTaskService:
    """初始化營銷任務服務"""
    global _marketing_task_service
    _marketing_task_service = MarketingTaskService(
        db=db,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await _marketing_task_service.initialize()
    return _marketing_task_service


def get_marketing_task_service() -> Optional[MarketingTaskService]:
    """獲取營銷任務服務實例"""
    return _marketing_task_service

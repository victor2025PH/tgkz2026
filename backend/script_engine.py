"""
TG-Matrix Script Engine
Manages and executes conversation scripts for multi-role collaboration
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum


class ScriptScenario(Enum):
    """Script scenario types"""
    GROUP_CONVERSION = "group_conversion"     # 群聊轉化
    PRIVATE_FOLLOWUP = "private_followup"     # 私聊跟進
    OBJECTION_HANDLING = "objection_handling" # 異議處理
    PRODUCT_INTRO = "product_intro"           # 產品介紹
    TRUST_BUILDING = "trust_building"         # 建立信任
    URGENCY_CREATION = "urgency_creation"     # 製造緊迫感
    CUSTOM = "custom"                         # 自定義


class TriggerType(Enum):
    """Stage trigger types"""
    KEYWORD = "keyword"           # 關鍵詞觸發
    TIME = "time"                 # 時間觸發
    MESSAGE_COUNT = "message_count"  # 消息數量
    USER_ACTION = "user_action"   # 用戶行為
    MANUAL = "manual"             # 手動觸發
    AUTO = "auto"                 # 自動流轉


class StageStatus(Enum):
    """Stage execution status"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    SKIPPED = "skipped"


@dataclass
class ScriptStage:
    """A stage in the script"""
    id: str
    name: str
    order: int
    required_roles: List[str]
    trigger_type: str
    trigger_config: Dict[str, Any]
    messages: List[Dict[str, Any]]  # Role-message mappings
    duration_seconds: int
    success_conditions: Dict[str, Any]


@dataclass
class ScriptTemplate:
    """Script template"""
    id: int
    name: str
    description: str
    scenario: str
    stages: List[ScriptStage]
    required_roles: List[str]
    min_roles: int
    duration_minutes: int
    success_rate: float
    use_count: int
    is_active: bool
    created_at: str
    updated_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "scenario": self.scenario,
            "stages": [
                {
                    "id": s.id,
                    "name": s.name,
                    "order": s.order,
                    "requiredRoles": s.required_roles,
                    "triggerType": s.trigger_type,
                    "triggerConfig": s.trigger_config,
                    "messages": s.messages,
                    "durationSeconds": s.duration_seconds,
                    "successConditions": s.success_conditions
                }
                for s in self.stages
            ],
            "requiredRoles": self.required_roles,
            "minRoles": self.min_roles,
            "durationMinutes": self.duration_minutes,
            "successRate": self.success_rate,
            "useCount": self.use_count,
            "isActive": self.is_active,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


# Built-in script templates
BUILTIN_TEMPLATES: List[Dict[str, Any]] = [
    {
        "name": "群聊轉化基礎版",
        "description": "適用於新群組的基本轉化流程，包含產品介紹、解答疑問、促成成交三個階段",
        "scenario": ScriptScenario.GROUP_CONVERSION.value,
        "stages": [
            {
                "id": "stage_intro",
                "name": "產品介紹",
                "order": 1,
                "required_roles": ["seller", "curious"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 30},
                "messages": [
                    {"role": "curious", "template": "最近有人用過{product}嗎？效果怎麼樣？"},
                    {"role": "seller", "template": "你好！我可以介紹一下，{product_intro}"},
                    {"role": "curious", "template": "聽起來不錯，價格呢？"}
                ],
                "duration_seconds": 180,
                "success_conditions": {"min_messages": 3}
            },
            {
                "id": "stage_social_proof",
                "name": "社會證明",
                "order": 2,
                "required_roles": ["satisfied", "hesitant"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 60},
                "messages": [
                    {"role": "satisfied", "template": "我用了有{usage_duration}了，{positive_feedback}"},
                    {"role": "hesitant", "template": "真的嗎？我還在猶豫，擔心{concern}"},
                    {"role": "satisfied", "template": "我一開始也擔心，後來發現{reassurance}"}
                ],
                "duration_seconds": 240,
                "success_conditions": {"min_messages": 4}
            },
            {
                "id": "stage_close",
                "name": "促成成交",
                "order": 3,
                "required_roles": ["manager", "converted"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 60},
                "messages": [
                    {"role": "manager", "template": "今天有特別優惠，{special_offer}"},
                    {"role": "converted", "template": "我剛下單了！{excitement}"},
                    {"role": "manager", "template": "名額有限，{urgency}"}
                ],
                "duration_seconds": 180,
                "success_conditions": {"target_response": True}
            }
        ],
        "required_roles": ["seller", "curious", "satisfied", "hesitant", "manager", "converted"],
        "min_roles": 4,
        "duration_minutes": 15
    },
    {
        "name": "私聊跟進標準版",
        "description": "用於私聊跟進潛在客戶，逐步建立信任並促成成交",
        "scenario": ScriptScenario.PRIVATE_FOLLOWUP.value,
        "stages": [
            {
                "id": "stage_greeting",
                "name": "問候開場",
                "order": 1,
                "required_roles": ["seller"],
                "trigger_type": TriggerType.MANUAL.value,
                "trigger_config": {},
                "messages": [
                    {"role": "seller", "template": "Hi {target_name}，看到你在群裡對{product}感興趣，方便聊聊嗎？"}
                ],
                "duration_seconds": 60,
                "success_conditions": {"user_response": True}
            },
            {
                "id": "stage_needs",
                "name": "需求了解",
                "order": 2,
                "required_roles": ["seller"],
                "trigger_type": TriggerType.USER_ACTION.value,
                "trigger_config": {"action": "response"},
                "messages": [
                    {"role": "seller", "template": "了解！你主要想解決什麼問題呢？"}
                ],
                "duration_seconds": 120,
                "success_conditions": {"user_shares_need": True}
            },
            {
                "id": "stage_solution",
                "name": "方案推薦",
                "order": 3,
                "required_roles": ["seller", "expert"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 30},
                "messages": [
                    {"role": "seller", "template": "根據你的需求，我推薦{recommendation}"},
                    {"role": "expert", "template": "從專業角度，{expert_opinion}"}
                ],
                "duration_seconds": 180,
                "success_conditions": {"min_messages": 2}
            }
        ],
        "required_roles": ["seller", "expert"],
        "min_roles": 1,
        "duration_minutes": 10
    },
    {
        "name": "異議處理專家版",
        "description": "專門處理客戶常見異議，如價格、效果、售後等",
        "scenario": ScriptScenario.OBJECTION_HANDLING.value,
        "stages": [
            {
                "id": "stage_acknowledge",
                "name": "認同異議",
                "order": 1,
                "required_roles": ["seller"],
                "trigger_type": TriggerType.KEYWORD.value,
                "trigger_config": {"keywords": ["貴", "不值", "太貴", "便宜點"]},
                "messages": [
                    {"role": "seller", "template": "完全理解你的顧慮！{empathy}"}
                ],
                "duration_seconds": 30,
                "success_conditions": {}
            },
            {
                "id": "stage_reframe",
                "name": "重新定義",
                "order": 2,
                "required_roles": ["expert", "satisfied"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 15},
                "messages": [
                    {"role": "expert", "template": "其實從成本效益來看，{value_reframe}"},
                    {"role": "satisfied", "template": "我一開始也覺得貴，但{value_realized}"}
                ],
                "duration_seconds": 120,
                "success_conditions": {"min_messages": 2}
            },
            {
                "id": "stage_offer",
                "name": "特別優惠",
                "order": 3,
                "required_roles": ["manager"],
                "trigger_type": TriggerType.AUTO.value,
                "trigger_config": {"delay_seconds": 30},
                "messages": [
                    {"role": "manager", "template": "看你是新朋友，{special_deal}"}
                ],
                "duration_seconds": 60,
                "success_conditions": {"target_response": True}
            }
        ],
        "required_roles": ["seller", "expert", "satisfied", "manager"],
        "min_roles": 3,
        "duration_minutes": 8
    }
]


class ScriptEngine:
    """
    Script engine for managing and executing conversation scripts
    
    Features:
    - Template management (built-in and custom)
    - Script execution control
    - Stage flow management
    - Trigger condition handling
    - Execution logging
    """
    
    def __init__(
        self,
        db,
        event_callback: Callable = None,
        log_callback: Callable = None
    ):
        self.db = db
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
        self._active_executions: Dict[str, asyncio.Task] = {}
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[ScriptEngine] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """Initialize script engine tables"""
        if self._initialized:
            return
        
        try:
            # Create script_templates table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS script_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    scenario TEXT NOT NULL,
                    stages TEXT NOT NULL,
                    required_roles TEXT NOT NULL,
                    min_roles INTEGER DEFAULT 2,
                    duration_minutes INTEGER DEFAULT 10,
                    success_rate REAL DEFAULT 0,
                    use_count INTEGER DEFAULT 0,
                    is_active INTEGER DEFAULT 1,
                    is_builtin INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Create script_executions table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS script_executions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    execution_id TEXT NOT NULL UNIQUE,
                    template_id INTEGER NOT NULL,
                    group_id TEXT,
                    target_user_id TEXT,
                    target_username TEXT,
                    assigned_roles TEXT NOT NULL,
                    current_stage TEXT,
                    status TEXT DEFAULT 'pending',
                    started_at TEXT,
                    completed_at TEXT,
                    outcome TEXT,
                    messages_sent INTEGER DEFAULT 0,
                    target_responded INTEGER DEFAULT 0,
                    execution_log TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_script_templates_scenario 
                ON script_templates(scenario)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_script_executions_status 
                ON script_executions(status)
            ''')
            
            # Seed built-in templates
            await self._seed_builtin_templates()
            
            self._initialized = True
            self.log_callback("劇本引擎已初始化", "success")
            
        except Exception as e:
            self.log_callback(f"初始化失敗: {e}", "error")
    
    async def _seed_builtin_templates(self):
        """Seed built-in script templates"""
        for template in BUILTIN_TEMPLATES:
            existing = await self.db.fetch_one(
                'SELECT id FROM script_templates WHERE name = ? AND is_builtin = 1',
                (template['name'],)
            )
            
            if not existing:
                now = datetime.now().isoformat()
                await self.db.execute('''
                    INSERT INTO script_templates 
                    (name, description, scenario, stages, required_roles, min_roles,
                     duration_minutes, is_builtin, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
                ''', (
                    template['name'],
                    template['description'],
                    template['scenario'],
                    json.dumps(template['stages']),
                    json.dumps(template['required_roles']),
                    template['min_roles'],
                    template['duration_minutes'],
                    now,
                    now
                ))
    
    # ==================== Template Management ====================
    
    async def create_template(
        self,
        name: str,
        description: str,
        scenario: str,
        stages: List[Dict[str, Any]],
        required_roles: List[str],
        min_roles: int = 2,
        duration_minutes: int = 10
    ) -> Dict[str, Any]:
        """Create a new script template"""
        if not name or not name.strip():
            return {"success": False, "error": "模板名稱不能為空"}
        
        if not stages:
            return {"success": False, "error": "至少需要一個階段"}
        
        now = datetime.now().isoformat()
        
        try:
            template_id = await self.db.execute('''
                INSERT INTO script_templates 
                (name, description, scenario, stages, required_roles, min_roles,
                 duration_minutes, is_builtin, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
            ''', (
                name.strip(),
                description,
                scenario,
                json.dumps(stages),
                json.dumps(required_roles),
                min_roles,
                duration_minutes,
                now,
                now
            ))
            
            self.log_callback(f"劇本模板已創建: {name}", "success")
            
            return {"success": True, "templateId": template_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_template(
        self,
        template_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a script template"""
        try:
            # Check if builtin
            row = await self.db.fetch_one(
                'SELECT is_builtin FROM script_templates WHERE id = ?',
                (template_id,)
            )
            
            if row and row['is_builtin']:
                return {"success": False, "error": "內建模板不能修改"}
            
            update_parts = []
            params = []
            
            field_mapping = {
                'name': 'name',
                'description': 'description',
                'scenario': 'scenario',
                'stages': 'stages',
                'requiredRoles': 'required_roles',
                'minRoles': 'min_roles',
                'durationMinutes': 'duration_minutes',
                'isActive': 'is_active'
            }
            
            for js_field, db_field in field_mapping.items():
                if js_field in updates:
                    value = updates[js_field]
                    if js_field in ['stages', 'requiredRoles']:
                        value = json.dumps(value)
                    elif js_field == 'isActive':
                        value = 1 if value else 0
                    update_parts.append(f"{db_field} = ?")
                    params.append(value)
            
            if not update_parts:
                return {"success": False, "error": "沒有要更新的欄位"}
            
            update_parts.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(template_id)
            
            await self.db.execute(f'''
                UPDATE script_templates SET {', '.join(update_parts)}
                WHERE id = ?
            ''', tuple(params))
            
            return {"success": True, "templateId": template_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def delete_template(self, template_id: int) -> Dict[str, Any]:
        """Delete a script template"""
        try:
            row = await self.db.fetch_one(
                'SELECT is_builtin FROM script_templates WHERE id = ?',
                (template_id,)
            )
            
            if row and row['is_builtin']:
                return {"success": False, "error": "內建模板不能刪除"}
            
            await self.db.execute('DELETE FROM script_templates WHERE id = ?', (template_id,))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_template(self, template_id: int) -> Optional[ScriptTemplate]:
        """Get a single template by ID"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM script_templates WHERE id = ?',
                (template_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_template(row)
            
        except Exception as e:
            self.log_callback(f"獲取模板失敗: {e}", "error")
            return None
    
    async def get_all_templates(
        self,
        scenario: Optional[str] = None,
        active_only: bool = True
    ) -> Dict[str, Any]:
        """Get all script templates"""
        try:
            query = 'SELECT * FROM script_templates WHERE 1=1'
            params = []
            
            if scenario:
                query += ' AND scenario = ?'
                params.append(scenario)
            
            if active_only:
                query += ' AND is_active = 1'
            
            query += ' ORDER BY is_builtin DESC, use_count DESC'
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            templates = [self._row_to_template(row).to_dict() for row in rows]
            
            return {
                "success": True,
                "templates": templates,
                "total": len(templates)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _row_to_template(self, row) -> ScriptTemplate:
        """Convert database row to ScriptTemplate object"""
        stages_data = json.loads(row['stages'])
        stages = []
        
        for s in stages_data:
            stages.append(ScriptStage(
                id=s['id'],
                name=s['name'],
                order=s['order'],
                required_roles=s['required_roles'],
                trigger_type=s['trigger_type'],
                trigger_config=s.get('trigger_config', {}),
                messages=s.get('messages', []),
                duration_seconds=s.get('duration_seconds', 60),
                success_conditions=s.get('success_conditions', {})
            ))
        
        return ScriptTemplate(
            id=row['id'],
            name=row['name'],
            description=row['description'] or "",
            scenario=row['scenario'],
            stages=stages,
            required_roles=json.loads(row['required_roles']),
            min_roles=row['min_roles'] or 2,
            duration_minutes=row['duration_minutes'] or 10,
            success_rate=row['success_rate'] or 0,
            use_count=row['use_count'] or 0,
            is_active=bool(row['is_active']),
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    # ==================== Script Execution ====================
    
    async def start_execution(
        self,
        template_id: int,
        group_id: Optional[str],
        target_user_id: Optional[str],
        target_username: Optional[str],
        assigned_roles: Dict[str, str]  # role_type -> account_phone
    ) -> Dict[str, Any]:
        """Start a script execution"""
        template = await self.get_template(template_id)
        if not template:
            return {"success": False, "error": "模板不存在"}
        
        # Validate roles
        for required_role in template.required_roles[:template.min_roles]:
            if required_role not in assigned_roles:
                return {"success": False, "error": f"缺少必要角色: {required_role}"}
        
        execution_id = str(uuid.uuid4())[:12]
        now = datetime.now().isoformat()
        
        try:
            await self.db.execute('''
                INSERT INTO script_executions 
                (execution_id, template_id, group_id, target_user_id, target_username,
                 assigned_roles, current_stage, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            ''', (
                execution_id,
                template_id,
                group_id,
                target_user_id,
                target_username,
                json.dumps(assigned_roles),
                template.stages[0].id if template.stages else None,
                now
            ))
            
            # Increment use count
            await self.db.execute(
                'UPDATE script_templates SET use_count = use_count + 1 WHERE id = ?',
                (template_id,)
            )
            
            self.log_callback(f"劇本執行已創建: {execution_id}", "success")
            
            self._send_event("script-execution-created", {
                "executionId": execution_id,
                "templateName": template.name,
                "groupId": group_id
            })
            
            return {
                "success": True,
                "executionId": execution_id,
                "templateName": template.name
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def run_execution(self, execution_id: str) -> Dict[str, Any]:
        """Run a script execution"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM script_executions WHERE execution_id = ?',
                (execution_id,)
            )
            
            if not row:
                return {"success": False, "error": "執行不存在"}
            
            if row['status'] == 'running':
                return {"success": False, "error": "劇本已在運行中"}
            
            # Update status
            now = datetime.now().isoformat()
            await self.db.execute('''
                UPDATE script_executions SET status = 'running', started_at = ?
                WHERE execution_id = ?
            ''', (now, execution_id))
            
            # Start execution task
            task = asyncio.create_task(self._execute_script(execution_id))
            self._active_executions[execution_id] = task
            
            self._send_event("script-execution-started", {
                "executionId": execution_id
            })
            
            return {"success": True, "executionId": execution_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def pause_execution(self, execution_id: str) -> Dict[str, Any]:
        """Pause a running execution"""
        if execution_id in self._active_executions:
            self._active_executions[execution_id].cancel()
            del self._active_executions[execution_id]
        
        await self.db.execute('''
            UPDATE script_executions SET status = 'paused'
            WHERE execution_id = ?
        ''', (execution_id,))
        
        self._send_event("script-execution-paused", {"executionId": execution_id})
        
        return {"success": True}
    
    async def stop_execution(self, execution_id: str, outcome: str = "stopped") -> Dict[str, Any]:
        """Stop an execution"""
        if execution_id in self._active_executions:
            self._active_executions[execution_id].cancel()
            del self._active_executions[execution_id]
        
        now = datetime.now().isoformat()
        await self.db.execute('''
            UPDATE script_executions SET status = 'completed', outcome = ?, completed_at = ?
            WHERE execution_id = ?
        ''', (outcome, now, execution_id))
        
        self._send_event("script-execution-stopped", {
            "executionId": execution_id,
            "outcome": outcome
        })
        
        return {"success": True}
    
    async def _execute_script(self, execution_id: str):
        """Execute the script stages"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM script_executions WHERE execution_id = ?',
                (execution_id,)
            )
            
            template = await self.get_template(row['template_id'])
            if not template:
                return
            
            assigned_roles = json.loads(row['assigned_roles'])
            
            self.log_callback(f"開始執行劇本: {template.name}", "info")
            
            for stage in sorted(template.stages, key=lambda s: s.order):
                # Update current stage
                await self.db.execute('''
                    UPDATE script_executions SET current_stage = ?
                    WHERE execution_id = ?
                ''', (stage.id, execution_id))
                
                self._send_event("script-stage-started", {
                    "executionId": execution_id,
                    "stageId": stage.id,
                    "stageName": stage.name
                })
                
                # Wait for trigger
                if stage.trigger_type == TriggerType.AUTO.value:
                    delay = stage.trigger_config.get("delay_seconds", 30)
                    await asyncio.sleep(delay)
                
                # Execute stage messages
                for msg in stage.messages:
                    role_type = msg.get("role")
                    message_template = msg.get("template", "")
                    
                    account_phone = assigned_roles.get(role_type)
                    if not account_phone:
                        continue
                    
                    # Send event for message (actual sending handled by coordinator)
                    self._send_event("script-message-ready", {
                        "executionId": execution_id,
                        "stageId": stage.id,
                        "roleType": role_type,
                        "accountPhone": account_phone,
                        "messageTemplate": message_template,
                        "groupId": row['group_id']
                    })
                    
                    # Update message count
                    await self.db.execute('''
                        UPDATE script_executions 
                        SET messages_sent = messages_sent + 1
                        WHERE execution_id = ?
                    ''', (execution_id,))
                    
                    # Random delay between messages
                    import random
                    await asyncio.sleep(random.randint(5, 15))
                
                self._send_event("script-stage-completed", {
                    "executionId": execution_id,
                    "stageId": stage.id
                })
                
                # Wait for stage duration
                await asyncio.sleep(stage.duration_seconds)
            
            # Execution completed
            now = datetime.now().isoformat()
            await self.db.execute('''
                UPDATE script_executions SET status = 'completed', outcome = 'finished', completed_at = ?
                WHERE execution_id = ?
            ''', (now, execution_id))
            
            self.log_callback(f"劇本執行完成: {execution_id}", "success")
            
            self._send_event("script-execution-completed", {
                "executionId": execution_id,
                "outcome": "finished"
            })
            
        except asyncio.CancelledError:
            self.log_callback(f"劇本執行被取消: {execution_id}", "warning")
        except Exception as e:
            self.log_callback(f"劇本執行錯誤: {e}", "error")
            
            await self.db.execute('''
                UPDATE script_executions SET status = 'failed', outcome = ?
                WHERE execution_id = ?
            ''', (str(e), execution_id))
    
    async def get_execution(self, execution_id: str) -> Dict[str, Any]:
        """Get execution details"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM script_executions WHERE execution_id = ?',
                (execution_id,)
            )
            
            if not row:
                return {"success": False, "error": "執行不存在"}
            
            template = await self.get_template(row['template_id'])
            
            return {
                "success": True,
                "execution": {
                    "executionId": row['execution_id'],
                    "templateId": row['template_id'],
                    "templateName": template.name if template else "Unknown",
                    "groupId": row['group_id'],
                    "targetUserId": row['target_user_id'],
                    "targetUsername": row['target_username'],
                    "assignedRoles": json.loads(row['assigned_roles']),
                    "currentStage": row['current_stage'],
                    "status": row['status'],
                    "startedAt": row['started_at'],
                    "completedAt": row['completed_at'],
                    "outcome": row['outcome'],
                    "messagesSent": row['messages_sent'],
                    "targetResponded": row['target_responded'],
                    "createdAt": row['created_at']
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_active_executions(self) -> Dict[str, Any]:
        """Get all active executions"""
        try:
            rows = await self.db.fetch_all('''
                SELECT e.*, t.name as template_name
                FROM script_executions e
                JOIN script_templates t ON e.template_id = t.id
                WHERE e.status IN ('pending', 'running', 'paused')
                ORDER BY e.created_at DESC
            ''')
            
            executions = []
            for row in rows:
                executions.append({
                    "executionId": row['execution_id'],
                    "templateName": row['template_name'],
                    "groupId": row['group_id'],
                    "currentStage": row['current_stage'],
                    "status": row['status'],
                    "messagesSent": row['messages_sent'],
                    "startedAt": row['started_at']
                })
            
            return {"success": True, "executions": executions}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_execution_stats(self) -> Dict[str, Any]:
        """Get execution statistics"""
        try:
            # Total executions
            total_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM script_executions'
            )
            total = total_row['count'] if total_row else 0
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count FROM script_executions
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_rows}
            
            # Success rate
            completed = by_status.get('completed', 0)
            success_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM script_executions
                WHERE outcome IN ('finished', 'converted')
            ''')
            successful = success_row['count'] if success_row else 0
            
            return {
                "success": True,
                "total": total,
                "byStatus": by_status,
                "successRate": round((successful / completed * 100) if completed > 0 else 0, 1)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
script_engine: Optional[ScriptEngine] = None


async def init_script_engine(db, event_callback=None, log_callback=None) -> ScriptEngine:
    """Initialize script engine"""
    global script_engine
    script_engine = ScriptEngine(
        db=db,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await script_engine.initialize()
    return script_engine


def get_script_engine() -> Optional[ScriptEngine]:
    """Get script engine instance"""
    return script_engine

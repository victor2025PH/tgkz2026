"""
自動化規則引擎
Automation Rules Engine

功能:
1. 可視化規則配置
2. 條件觸發器
3. 動作執行器
4. 規則優先級和衝突處理
"""

import sys
import json
import asyncio
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import re


class TriggerType(Enum):
    """觸發器類型"""
    KEYWORD_MATCH = "keyword_match"         # 關鍵詞匹配
    INTENT_SCORE = "intent_score"           # 意圖分數達標
    TIME_ELAPSED = "time_elapsed"           # 時間經過
    STATUS_CHANGE = "status_change"         # 狀態變化
    MESSAGE_RECEIVED = "message_received"   # 收到消息
    NO_RESPONSE = "no_response"             # 無響應
    STAGE_ENTER = "stage_enter"             # 進入階段
    TAG_ADDED = "tag_added"                 # 添加標籤


class ActionType(Enum):
    """動作類型"""
    SEND_MESSAGE = "send_message"           # 發送消息
    SEND_TEMPLATE = "send_template"         # 發送模板
    ADD_TAG = "add_tag"                     # 添加標籤
    REMOVE_TAG = "remove_tag"               # 移除標籤
    CHANGE_STATUS = "change_status"         # 更改狀態
    CHANGE_STAGE = "change_stage"           # 更改階段
    NOTIFY_USER = "notify_user"             # 通知用戶（前端提醒）
    CREATE_REMINDER = "create_reminder"     # 創建提醒
    ASSIGN_TO = "assign_to"                 # 分配給
    AI_RESPOND = "ai_respond"               # AI 自動回覆
    ADD_TO_GROUP = "add_to_group"           # 添加到群組


class ConditionOperator(Enum):
    """條件運算符"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    IN_LIST = "in_list"
    NOT_IN_LIST = "not_in_list"
    MATCHES_REGEX = "matches_regex"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"


@dataclass
class Condition:
    """條件"""
    field: str                              # 字段名
    operator: ConditionOperator             # 運算符
    value: Any                              # 比較值
    
    def evaluate(self, data: Dict[str, Any]) -> bool:
        """評估條件"""
        field_value = data.get(self.field)
        
        if self.operator == ConditionOperator.EQUALS:
            return field_value == self.value
        elif self.operator == ConditionOperator.NOT_EQUALS:
            return field_value != self.value
        elif self.operator == ConditionOperator.CONTAINS:
            return self.value in str(field_value) if field_value else False
        elif self.operator == ConditionOperator.NOT_CONTAINS:
            return self.value not in str(field_value) if field_value else True
        elif self.operator == ConditionOperator.GREATER_THAN:
            return float(field_value or 0) > float(self.value)
        elif self.operator == ConditionOperator.LESS_THAN:
            return float(field_value or 0) < float(self.value)
        elif self.operator == ConditionOperator.IN_LIST:
            return field_value in self.value if isinstance(self.value, list) else False
        elif self.operator == ConditionOperator.NOT_IN_LIST:
            return field_value not in self.value if isinstance(self.value, list) else True
        elif self.operator == ConditionOperator.MATCHES_REGEX:
            return bool(re.search(self.value, str(field_value))) if field_value else False
        elif self.operator == ConditionOperator.IS_EMPTY:
            return not field_value
        elif self.operator == ConditionOperator.IS_NOT_EMPTY:
            return bool(field_value)
        
        return False


@dataclass
class Trigger:
    """觸發器"""
    type: TriggerType
    conditions: List[Condition] = field(default_factory=list)
    params: Dict[str, Any] = field(default_factory=dict)
    
    def check(self, event_type: str, data: Dict[str, Any]) -> bool:
        """檢查觸發器是否匹配"""
        # 檢查事件類型
        if self.type.value != event_type:
            return False
        
        # 檢查所有條件（AND 邏輯）
        for condition in self.conditions:
            if not condition.evaluate(data):
                return False
        
        return True


@dataclass
class Action:
    """動作"""
    type: ActionType
    params: Dict[str, Any] = field(default_factory=dict)
    delay_seconds: int = 0                  # 延遲執行（秒）


@dataclass
class AutomationRule:
    """自動化規則"""
    id: str
    name: str
    description: str = ""
    triggers: List[Trigger] = field(default_factory=list)
    actions: List[Action] = field(default_factory=list)
    enabled: bool = True
    priority: int = 0                       # 優先級（越高越先執行）
    max_executions: int = 0                 # 最大執行次數（0=無限）
    execution_count: int = 0                # 已執行次數
    cooldown_seconds: int = 0               # 冷卻時間（秒）
    last_executed: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def can_execute(self) -> bool:
        """檢查是否可以執行"""
        if not self.enabled:
            return False
        
        # 檢查執行次數限制
        if self.max_executions > 0 and self.execution_count >= self.max_executions:
            return False
        
        # 檢查冷卻時間
        if self.cooldown_seconds > 0 and self.last_executed:
            cooldown_end = self.last_executed + timedelta(seconds=self.cooldown_seconds)
            if datetime.now() < cooldown_end:
                return False
        
        return True


class AutomationEngine:
    """自動化規則引擎"""
    
    def __init__(self):
        self.rules: Dict[str, AutomationRule] = {}
        self.action_handlers: Dict[ActionType, Callable] = {}
        self.event_callback: Optional[Callable] = None
        self.running = False
        self._pending_actions: List[tuple] = []
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def register_action_handler(self, action_type: ActionType, handler: Callable):
        """註冊動作處理器"""
        self.action_handlers[action_type] = handler
    
    def add_rule(self, rule: AutomationRule):
        """添加規則"""
        self.rules[rule.id] = rule
        print(f"[AutomationEngine] 添加規則: {rule.name}", file=sys.stderr)
    
    def remove_rule(self, rule_id: str):
        """移除規則"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            print(f"[AutomationEngine] 移除規則: {rule_id}", file=sys.stderr)
    
    def update_rule(self, rule_id: str, updates: Dict[str, Any]):
        """更新規則"""
        if rule_id in self.rules:
            rule = self.rules[rule_id]
            for key, value in updates.items():
                if hasattr(rule, key):
                    setattr(rule, key, value)
            rule.updated_at = datetime.now()
    
    def get_rule(self, rule_id: str) -> Optional[AutomationRule]:
        """獲取規則"""
        return self.rules.get(rule_id)
    
    def get_all_rules(self) -> List[AutomationRule]:
        """獲取所有規則"""
        return list(self.rules.values())
    
    async def process_event(self, event_type: str, data: Dict[str, Any]):
        """處理事件"""
        triggered_rules = []
        
        # 按優先級排序規則
        sorted_rules = sorted(
            self.rules.values(),
            key=lambda r: r.priority,
            reverse=True
        )
        
        for rule in sorted_rules:
            if not rule.can_execute():
                continue
            
            # 檢查所有觸發器（OR 邏輯）
            for trigger in rule.triggers:
                if trigger.check(event_type, data):
                    triggered_rules.append(rule)
                    break
        
        # 執行觸發的規則
        for rule in triggered_rules:
            await self._execute_rule(rule, data)
    
    async def _execute_rule(self, rule: AutomationRule, data: Dict[str, Any]):
        """執行規則"""
        try:
            print(f"[AutomationEngine] 執行規則: {rule.name}", file=sys.stderr)
            
            for action in rule.actions:
                # 處理延遲
                if action.delay_seconds > 0:
                    await asyncio.sleep(action.delay_seconds)
                
                # 執行動作
                await self._execute_action(action, data)
            
            # 更新執行計數
            rule.execution_count += 1
            rule.last_executed = datetime.now()
            
            # 發送事件通知
            if self.event_callback:
                self.event_callback("rule-executed", {
                    "ruleId": rule.id,
                    "ruleName": rule.name,
                    "executionCount": rule.execution_count,
                    "timestamp": datetime.now().isoformat()
                })
        
        except Exception as e:
            print(f"[AutomationEngine] 規則執行失敗: {rule.name}, 錯誤: {e}", file=sys.stderr)
    
    async def _execute_action(self, action: Action, data: Dict[str, Any]):
        """執行動作"""
        handler = self.action_handlers.get(action.type)
        
        if handler:
            try:
                # 合併動作參數和事件數據
                context = {**data, **action.params}
                await handler(context)
            except Exception as e:
                print(f"[AutomationEngine] 動作執行失敗: {action.type.value}, 錯誤: {e}", file=sys.stderr)
        else:
            print(f"[AutomationEngine] 未找到動作處理器: {action.type.value}", file=sys.stderr)
    
    def to_dict(self) -> Dict[str, Any]:
        """導出規則為字典"""
        return {
            "rules": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "enabled": r.enabled,
                    "priority": r.priority,
                    "triggers": [
                        {
                            "type": t.type.value,
                            "conditions": [
                                {
                                    "field": c.field,
                                    "operator": c.operator.value,
                                    "value": c.value
                                }
                                for c in t.conditions
                            ],
                            "params": t.params
                        }
                        for t in r.triggers
                    ],
                    "actions": [
                        {
                            "type": a.type.value,
                            "params": a.params,
                            "delay_seconds": a.delay_seconds
                        }
                        for a in r.actions
                    ],
                    "max_executions": r.max_executions,
                    "execution_count": r.execution_count,
                    "cooldown_seconds": r.cooldown_seconds
                }
                for r in self.rules.values()
            ]
        }
    
    def load_from_dict(self, data: Dict[str, Any]):
        """從字典加載規則"""
        for rule_data in data.get("rules", []):
            triggers = []
            for t_data in rule_data.get("triggers", []):
                conditions = [
                    Condition(
                        field=c["field"],
                        operator=ConditionOperator(c["operator"]),
                        value=c["value"]
                    )
                    for c in t_data.get("conditions", [])
                ]
                triggers.append(Trigger(
                    type=TriggerType(t_data["type"]),
                    conditions=conditions,
                    params=t_data.get("params", {})
                ))
            
            actions = [
                Action(
                    type=ActionType(a["type"]),
                    params=a.get("params", {}),
                    delay_seconds=a.get("delay_seconds", 0)
                )
                for a in rule_data.get("actions", [])
            ]
            
            rule = AutomationRule(
                id=rule_data["id"],
                name=rule_data["name"],
                description=rule_data.get("description", ""),
                triggers=triggers,
                actions=actions,
                enabled=rule_data.get("enabled", True),
                priority=rule_data.get("priority", 0),
                max_executions=rule_data.get("max_executions", 0),
                execution_count=rule_data.get("execution_count", 0),
                cooldown_seconds=rule_data.get("cooldown_seconds", 0)
            )
            self.add_rule(rule)


# 預設規則模板
DEFAULT_RULES = [
    {
        "id": "hot-lead-notify",
        "name": "熱門客戶通知",
        "description": "當意圖分數>=80時立即通知",
        "triggers": [
            {
                "type": "intent_score",
                "conditions": [
                    {"field": "intent_score", "operator": "greater_than", "value": 79}
                ]
            }
        ],
        "actions": [
            {
                "type": "notify_user",
                "params": {"message": "🔥 發現高意向客戶！", "priority": "high"}
            },
            {
                "type": "add_tag",
                "params": {"tag": "🔥熱門"}
            }
        ],
        "enabled": True,
        "priority": 10
    },
    {
        "id": "no-response-followup",
        "name": "無響應跟進",
        "description": "24小時無響應自動提醒",
        "triggers": [
            {
                "type": "no_response",
                "conditions": [
                    {"field": "hours_since_contact", "operator": "greater_than", "value": 24}
                ]
            }
        ],
        "actions": [
            {
                "type": "create_reminder",
                "params": {"message": "客戶24小時未響應，建議跟進"}
            }
        ],
        "enabled": True,
        "priority": 5
    },
    {
        "id": "auto-stage-contacted",
        "name": "自動更新已聯繫狀態",
        "description": "發送消息後自動更新狀態",
        "triggers": [
            {
                "type": "message_received",
                "conditions": [
                    {"field": "direction", "operator": "equals", "value": "outgoing"}
                ]
            }
        ],
        "actions": [
            {
                "type": "change_status",
                "params": {"status": "Contacted"}
            }
        ],
        "enabled": True,
        "priority": 3
    }
]


# 全局引擎實例
_engine = None

def get_automation_engine() -> AutomationEngine:
    """獲取全局引擎實例"""
    global _engine
    if _engine is None:
        _engine = AutomationEngine()
        # 加載默認規則
        _engine.load_from_dict({"rules": DEFAULT_RULES})
    return _engine


async def process_automation_event(event_type: str, data: Dict[str, Any]):
    """處理自動化事件（異步接口）"""
    engine = get_automation_engine()
    await engine.process_event(event_type, data)

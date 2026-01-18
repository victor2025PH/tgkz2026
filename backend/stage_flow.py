"""
階段自動流轉系統
Stage Flow Automation System

功能:
1. 根據行為自動更新 Lead 狀態
2. 定義階段流轉規則
3. 支持條件觸發
4. 記錄流轉歷史
"""

import sys
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta


class LeadStage(Enum):
    """Lead 階段"""
    NEW = "New"                     # 新客戶
    CONTACTED = "Contacted"         # 已聯繫
    REPLIED = "Replied"             # 已回覆
    FOLLOW_UP = "Follow-up"         # 跟進中
    QUALIFIED = "Qualified"         # 已確認意向
    PROPOSAL = "Proposal"           # 方案階段
    NEGOTIATION = "Negotiation"     # 談判階段
    CLOSED_WON = "Closed-Won"       # 成交
    CLOSED_LOST = "Closed-Lost"     # 流失


class TransitionTrigger(Enum):
    """流轉觸發器"""
    MESSAGE_SENT = "message_sent"           # 發送消息
    MESSAGE_RECEIVED = "message_received"   # 收到消息
    REPLY_RECEIVED = "reply_received"       # 收到回覆
    NO_RESPONSE = "no_response"             # 無響應
    INTENT_SCORE_CHANGE = "intent_score"    # 意圖分數變化
    TAG_ADDED = "tag_added"                 # 添加標籤
    MANUAL = "manual"                       # 手動操作
    TIME_ELAPSED = "time_elapsed"           # 時間經過


@dataclass
class StageTransition:
    """階段流轉記錄"""
    id: str
    lead_id: int
    from_stage: LeadStage
    to_stage: LeadStage
    trigger: TransitionTrigger
    trigger_details: str = ""
    automated: bool = True
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class TransitionRule:
    """流轉規則"""
    id: str
    name: str
    from_stage: LeadStage
    to_stage: LeadStage
    trigger: TransitionTrigger
    conditions: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    priority: int = 0


class StageFlowManager:
    """階段流轉管理器"""
    
    def __init__(self, database=None):
        self.database = database
        self.rules: List[TransitionRule] = []
        self.transitions: List[StageTransition] = []
        self.event_callback: Optional[Callable] = None
        
        # 初始化默認規則
        self._init_default_rules()
    
    def set_event_callback(self, callback: Callable):
        """設置事件回調"""
        self.event_callback = callback
    
    def set_database(self, database):
        """設置數據庫"""
        self.database = database
    
    def _init_default_rules(self):
        """初始化默認規則"""
        self.rules = [
            # 發送消息 -> 已聯繫
            TransitionRule(
                id="new_to_contacted",
                name="新客戶 -> 已聯繫",
                from_stage=LeadStage.NEW,
                to_stage=LeadStage.CONTACTED,
                trigger=TransitionTrigger.MESSAGE_SENT,
                enabled=True,
                priority=10
            ),
            # 收到回覆 -> 已回覆
            TransitionRule(
                id="contacted_to_replied",
                name="已聯繫 -> 已回覆",
                from_stage=LeadStage.CONTACTED,
                to_stage=LeadStage.REPLIED,
                trigger=TransitionTrigger.REPLY_RECEIVED,
                enabled=True,
                priority=10
            ),
            # 多次互動 -> 跟進中
            TransitionRule(
                id="replied_to_followup",
                name="已回覆 -> 跟進中",
                from_stage=LeadStage.REPLIED,
                to_stage=LeadStage.FOLLOW_UP,
                trigger=TransitionTrigger.MESSAGE_SENT,
                conditions={"min_interactions": 3},
                enabled=True,
                priority=5
            ),
            # 高意向 -> 已確認意向
            TransitionRule(
                id="followup_to_qualified",
                name="跟進中 -> 已確認意向",
                from_stage=LeadStage.FOLLOW_UP,
                to_stage=LeadStage.QUALIFIED,
                trigger=TransitionTrigger.INTENT_SCORE_CHANGE,
                conditions={"min_intent_score": 70},
                enabled=True,
                priority=8
            ),
            # 詢問價格 -> 方案階段
            TransitionRule(
                id="qualified_to_proposal",
                name="已確認意向 -> 方案階段",
                from_stage=LeadStage.QUALIFIED,
                to_stage=LeadStage.PROPOSAL,
                trigger=TransitionTrigger.TAG_ADDED,
                conditions={"tag": "詢價中"},
                enabled=True,
                priority=7
            ),
            # 長期無響應 -> 流失
            TransitionRule(
                id="no_response_to_lost",
                name="無響應 -> 流失",
                from_stage=LeadStage.CONTACTED,
                to_stage=LeadStage.CLOSED_LOST,
                trigger=TransitionTrigger.NO_RESPONSE,
                conditions={"days_without_response": 14},
                enabled=True,
                priority=1
            ),
        ]
    
    def add_rule(self, rule: TransitionRule):
        """添加規則"""
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def remove_rule(self, rule_id: str):
        """移除規則"""
        self.rules = [r for r in self.rules if r.id != rule_id]
    
    def get_applicable_rules(
        self,
        current_stage: LeadStage,
        trigger: TransitionTrigger
    ) -> List[TransitionRule]:
        """獲取適用的規則"""
        return [
            r for r in self.rules
            if r.enabled
            and r.from_stage == current_stage
            and r.trigger == trigger
        ]
    
    async def process_event(
        self,
        lead_id: int,
        current_stage: str,
        trigger: str,
        event_data: Dict[str, Any] = None
    ) -> Optional[StageTransition]:
        """
        處理事件並執行階段流轉
        
        Args:
            lead_id: Lead ID
            current_stage: 當前階段
            trigger: 觸發器
            event_data: 事件數據
            
        Returns:
            StageTransition 如果發生流轉，否則 None
        """
        try:
            stage_enum = LeadStage(current_stage)
            trigger_enum = TransitionTrigger(trigger)
        except ValueError:
            return None
        
        event_data = event_data or {}
        
        # 獲取適用的規則
        applicable_rules = self.get_applicable_rules(stage_enum, trigger_enum)
        
        for rule in applicable_rules:
            if self._check_conditions(rule.conditions, event_data):
                # 執行流轉
                transition = await self._execute_transition(
                    lead_id, 
                    rule, 
                    event_data
                )
                return transition
        
        return None
    
    def _check_conditions(
        self,
        conditions: Dict[str, Any],
        event_data: Dict[str, Any]
    ) -> bool:
        """檢查條件"""
        for key, expected_value in conditions.items():
            if key == "min_interactions":
                actual = event_data.get("interaction_count", 0)
                if actual < expected_value:
                    return False
            elif key == "min_intent_score":
                actual = event_data.get("intent_score", 0)
                if actual < expected_value:
                    return False
            elif key == "tag":
                tags = event_data.get("tags", [])
                if expected_value not in tags:
                    return False
            elif key == "days_without_response":
                days = event_data.get("days_since_response", 0)
                if days < expected_value:
                    return False
            else:
                # 通用條件檢查
                actual = event_data.get(key)
                if actual != expected_value:
                    return False
        
        return True
    
    async def _execute_transition(
        self,
        lead_id: int,
        rule: TransitionRule,
        event_data: Dict[str, Any]
    ) -> StageTransition:
        """執行階段流轉"""
        import uuid
        
        transition = StageTransition(
            id=str(uuid.uuid4())[:8],
            lead_id=lead_id,
            from_stage=rule.from_stage,
            to_stage=rule.to_stage,
            trigger=rule.trigger,
            trigger_details=f"規則: {rule.name}",
            automated=True
        )
        
        self.transitions.append(transition)
        
        # 更新數據庫
        if self.database:
            try:
                await self.database.update_lead(lead_id, {
                    "status": rule.to_stage.value
                })
            except Exception as e:
                print(f"[StageFlow] 更新數據庫錯誤: {e}", file=sys.stderr)
        
        # 發送事件通知
        if self.event_callback:
            self.event_callback("stage-transition", {
                "transitionId": transition.id,
                "leadId": lead_id,
                "fromStage": rule.from_stage.value,
                "toStage": rule.to_stage.value,
                "trigger": rule.trigger.value,
                "ruleName": rule.name,
                "timestamp": transition.created_at.isoformat()
            })
        
        print(f"[StageFlow] Lead {lead_id}: {rule.from_stage.value} -> {rule.to_stage.value}", file=sys.stderr)
        
        return transition
    
    def get_transitions_for_lead(self, lead_id: int) -> List[StageTransition]:
        """獲取 Lead 的流轉歷史"""
        return [t for t in self.transitions if t.lead_id == lead_id]
    
    def get_stage_stats(self) -> Dict[str, int]:
        """獲取各階段統計"""
        stats = {stage.value: 0 for stage in LeadStage}
        for transition in self.transitions:
            stats[transition.to_stage.value] = stats.get(transition.to_stage.value, 0) + 1
        return stats
    
    def get_flow_visualization(self) -> Dict[str, Any]:
        """獲取流轉可視化數據"""
        nodes = [{"id": s.value, "label": s.value} for s in LeadStage]
        edges = []
        
        for rule in self.rules:
            if rule.enabled:
                edges.append({
                    "from": rule.from_stage.value,
                    "to": rule.to_stage.value,
                    "label": rule.trigger.value,
                    "ruleName": rule.name
                })
        
        return {"nodes": nodes, "edges": edges}


# 全局實例
_stage_flow_manager = None

def get_stage_flow_manager() -> StageFlowManager:
    """獲取全局階段流轉管理器"""
    global _stage_flow_manager
    if _stage_flow_manager is None:
        _stage_flow_manager = StageFlowManager()
    return _stage_flow_manager


async def process_stage_event(
    lead_id: int,
    current_stage: str,
    trigger: str,
    event_data: Dict[str, Any] = None
) -> Optional[Dict[str, Any]]:
    """處理階段事件（異步接口）"""
    manager = get_stage_flow_manager()
    transition = await manager.process_event(
        lead_id, current_stage, trigger, event_data
    )
    
    if transition:
        return {
            "transitionId": transition.id,
            "fromStage": transition.from_stage.value,
            "toStage": transition.to_stage.value,
            "trigger": transition.trigger.value
        }
    
    return None

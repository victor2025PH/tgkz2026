"""
自動擴縮容策略系統

功能：
- 定義擴縮容規則
- 自動調整 API 容量
- 負載監控和觸發
- 擴縮容歷史記錄
"""

import asyncio
import logging
import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'scaling.db')


class ScalingAction(str, Enum):
    """擴縮容動作"""
    SCALE_UP = "scale_up"           # 擴容
    SCALE_DOWN = "scale_down"       # 縮容
    NO_ACTION = "no_action"         # 無需操作


class TriggerType(str, Enum):
    """觸發類型"""
    UTILIZATION = "utilization"     # 使用率
    QUEUE_LENGTH = "queue_length"   # 等待隊列長度
    FAILURE_RATE = "failure_rate"   # 失敗率
    PREDICTION = "prediction"       # 預測觸發


@dataclass
class ScalingPolicy:
    """擴縮容策略"""
    id: str
    name: str
    is_active: bool = True
    
    # 擴容觸發條件
    scale_up_threshold: float = 80.0        # 使用率超過此值觸發擴容
    scale_up_cooldown: int = 300            # 擴容冷卻時間（秒）
    scale_up_increment: int = 10            # 每次擴容增加的容量
    scale_up_max: int = 100                 # 最大容量限制
    
    # 縮容觸發條件
    scale_down_threshold: float = 30.0      # 使用率低於此值觸發縮容
    scale_down_cooldown: int = 600          # 縮容冷卻時間（秒）
    scale_down_decrement: int = 5           # 每次縮容減少的容量
    scale_down_min: int = 10                # 最小容量限制
    
    # 高級設置
    evaluation_period: int = 60             # 評估週期（秒）
    consecutive_breaches: int = 3           # 連續違規次數才觸發
    target_utilization: float = 60.0        # 目標使用率
    
    # 分組設置
    group_id: Optional[str] = None          # 應用到特定分組
    
    created_at: str = ""
    updated_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "is_active": self.is_active,
            "scale_up": {
                "threshold": self.scale_up_threshold,
                "cooldown": self.scale_up_cooldown,
                "increment": self.scale_up_increment,
                "max": self.scale_up_max
            },
            "scale_down": {
                "threshold": self.scale_down_threshold,
                "cooldown": self.scale_down_cooldown,
                "decrement": self.scale_down_decrement,
                "min": self.scale_down_min
            },
            "settings": {
                "evaluation_period": self.evaluation_period,
                "consecutive_breaches": self.consecutive_breaches,
                "target_utilization": self.target_utilization
            },
            "group_id": self.group_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class ScalingEvent:
    """擴縮容事件"""
    id: str
    policy_id: str
    action: ScalingAction
    trigger_type: TriggerType
    trigger_value: float
    before_capacity: int
    after_capacity: int
    api_id: Optional[str] = None
    group_id: Optional[str] = None
    message: str = ""
    created_at: str = ""


class AutoScalingManager:
    """自動擴縮容管理器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._init_db()
        self._breach_counters: Dict[str, int] = {}  # 記錄連續違規次數
        self._last_scaling: Dict[str, datetime] = {}  # 記錄上次擴縮容時間
        self._running = False
        self._monitor_task = None
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 擴縮容策略表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scaling_policies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                scale_up_threshold REAL DEFAULT 80,
                scale_up_cooldown INTEGER DEFAULT 300,
                scale_up_increment INTEGER DEFAULT 10,
                scale_up_max INTEGER DEFAULT 100,
                scale_down_threshold REAL DEFAULT 30,
                scale_down_cooldown INTEGER DEFAULT 600,
                scale_down_decrement INTEGER DEFAULT 5,
                scale_down_min INTEGER DEFAULT 10,
                evaluation_period INTEGER DEFAULT 60,
                consecutive_breaches INTEGER DEFAULT 3,
                target_utilization REAL DEFAULT 60,
                group_id TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 擴縮容事件表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scaling_events (
                id TEXT PRIMARY KEY,
                policy_id TEXT,
                action TEXT NOT NULL,
                trigger_type TEXT,
                trigger_value REAL,
                before_capacity INTEGER,
                after_capacity INTEGER,
                api_id TEXT,
                group_id TEXT,
                message TEXT,
                created_at TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_created ON scaling_events(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_policy ON scaling_events(policy_id)')
        
        # 創建默認策略
        cursor.execute('SELECT COUNT(*) FROM scaling_policies')
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO scaling_policies 
                (id, name, created_at)
                VALUES (?, ?, ?)
            ''', ('default', '默認擴縮容策略', datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        logger.info("擴縮容系統數據庫已初始化")
    
    # ==================== 策略管理 ====================
    
    def create_policy(self, policy: ScalingPolicy) -> bool:
        """創建擴縮容策略"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO scaling_policies 
                (id, name, is_active, scale_up_threshold, scale_up_cooldown, 
                 scale_up_increment, scale_up_max, scale_down_threshold, 
                 scale_down_cooldown, scale_down_decrement, scale_down_min,
                 evaluation_period, consecutive_breaches, target_utilization,
                 group_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                policy.id, policy.name, 1 if policy.is_active else 0,
                policy.scale_up_threshold, policy.scale_up_cooldown,
                policy.scale_up_increment, policy.scale_up_max,
                policy.scale_down_threshold, policy.scale_down_cooldown,
                policy.scale_down_decrement, policy.scale_down_min,
                policy.evaluation_period, policy.consecutive_breaches,
                policy.target_utilization, policy.group_id,
                policy.created_at or datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"創建擴縮容策略: {policy.name}")
            return True
        except Exception as e:
            logger.error(f"創建策略失敗: {e}")
            return False
    
    def update_policy(self, policy_id: str, updates: Dict[str, Any]) -> bool:
        """更新策略"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # 展開嵌套的 scale_up/scale_down 配置
            flat_updates = {}
            for key, value in updates.items():
                if key == 'scale_up' and isinstance(value, dict):
                    for k, v in value.items():
                        flat_updates[f'scale_up_{k}'] = v
                elif key == 'scale_down' and isinstance(value, dict):
                    for k, v in value.items():
                        flat_updates[f'scale_down_{k}'] = v
                elif key == 'settings' and isinstance(value, dict):
                    for k, v in value.items():
                        flat_updates[k] = v
                else:
                    flat_updates[key] = value
            
            flat_updates['updated_at'] = datetime.now().isoformat()
            
            set_clauses = []
            values = []
            for key, value in flat_updates.items():
                if key == 'is_active':
                    value = 1 if value else 0
                set_clauses.append(f"{key} = ?")
                values.append(value)
            
            values.append(policy_id)
            
            cursor.execute(f'''
                UPDATE scaling_policies 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            ''', values)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新策略失敗: {e}")
            return False
    
    def delete_policy(self, policy_id: str) -> bool:
        """刪除策略"""
        if policy_id == 'default':
            logger.warning("不能刪除默認策略")
            return False
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM scaling_policies WHERE id = ?', (policy_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"刪除策略失敗: {e}")
            return False
    
    def get_policy(self, policy_id: str) -> Optional[ScalingPolicy]:
        """獲取策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM scaling_policies WHERE id = ?', (policy_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_policy(row)
        return None
    
    def list_policies(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """列出所有策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if active_only:
            cursor.execute('SELECT * FROM scaling_policies WHERE is_active = 1')
        else:
            cursor.execute('SELECT * FROM scaling_policies')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_policy(row).to_dict() for row in rows]
    
    def _row_to_policy(self, row) -> ScalingPolicy:
        return ScalingPolicy(
            id=row[0],
            name=row[1],
            is_active=bool(row[2]),
            scale_up_threshold=row[3] or 80,
            scale_up_cooldown=row[4] or 300,
            scale_up_increment=row[5] or 10,
            scale_up_max=row[6] or 100,
            scale_down_threshold=row[7] or 30,
            scale_down_cooldown=row[8] or 600,
            scale_down_decrement=row[9] or 5,
            scale_down_min=row[10] or 10,
            evaluation_period=row[11] or 60,
            consecutive_breaches=row[12] or 3,
            target_utilization=row[13] or 60,
            group_id=row[14],
            created_at=row[15] or "",
            updated_at=row[16] or ""
        )
    
    # ==================== 擴縮容邏輯 ====================
    
    def evaluate(self, api_pool_manager) -> List[Dict[str, Any]]:
        """
        評估是否需要擴縮容
        
        Returns:
            建議的操作列表
        """
        recommendations = []
        
        # 獲取所有活躍策略
        policies = [p for p in self.list_policies() if p['is_active']]
        
        for policy_dict in policies:
            policy = self.get_policy(policy_dict['id'])
            if not policy:
                continue
            
            # 獲取相關 API 的使用率
            if policy.group_id:
                apis = api_pool_manager.get_apis_by_group(policy.group_id)
            else:
                apis = api_pool_manager.get_all_apis(include_hash=False)
            
            if not apis:
                continue
            
            # 計算平均使用率
            total_capacity = sum(api.get('max_accounts', 0) for api in apis)
            total_used = sum(api.get('current_accounts', 0) for api in apis)
            
            if total_capacity == 0:
                continue
            
            utilization = (total_used / total_capacity) * 100
            
            # 評估是否需要擴縮容
            action = self._evaluate_action(policy, utilization)
            
            if action != ScalingAction.NO_ACTION:
                # 檢查冷卻時間
                last_scaling_key = f"{policy.id}_{action.value}"
                last_scaling = self._last_scaling.get(last_scaling_key)
                
                cooldown = policy.scale_up_cooldown if action == ScalingAction.SCALE_UP else policy.scale_down_cooldown
                
                if last_scaling and (datetime.now() - last_scaling).seconds < cooldown:
                    continue
                
                # 計算建議的容量調整
                if action == ScalingAction.SCALE_UP:
                    new_capacity = min(
                        total_capacity + policy.scale_up_increment,
                        total_capacity * (policy.scale_up_max / 100)  # 不超過最大限制
                    )
                    increment = int(new_capacity - total_capacity)
                else:
                    new_capacity = max(
                        total_capacity - policy.scale_down_decrement,
                        policy.scale_down_min
                    )
                    increment = int(total_capacity - new_capacity) * -1
                
                recommendations.append({
                    "policy_id": policy.id,
                    "policy_name": policy.name,
                    "action": action.value,
                    "current_utilization": round(utilization, 1),
                    "target_utilization": policy.target_utilization,
                    "current_capacity": total_capacity,
                    "recommended_change": increment,
                    "new_capacity": int(new_capacity),
                    "group_id": policy.group_id,
                    "reason": self._get_reason(action, utilization, policy)
                })
        
        return recommendations
    
    def _evaluate_action(self, policy: ScalingPolicy, utilization: float) -> ScalingAction:
        """評估應該採取的動作"""
        breach_key = policy.id
        
        if utilization >= policy.scale_up_threshold:
            self._breach_counters[breach_key] = self._breach_counters.get(breach_key, 0) + 1
            if self._breach_counters[breach_key] >= policy.consecutive_breaches:
                return ScalingAction.SCALE_UP
        elif utilization <= policy.scale_down_threshold:
            self._breach_counters[breach_key] = self._breach_counters.get(breach_key, 0) + 1
            if self._breach_counters[breach_key] >= policy.consecutive_breaches:
                return ScalingAction.SCALE_DOWN
        else:
            # 重置計數器
            self._breach_counters[breach_key] = 0
        
        return ScalingAction.NO_ACTION
    
    def _get_reason(self, action: ScalingAction, utilization: float, policy: ScalingPolicy) -> str:
        """獲取觸發原因"""
        if action == ScalingAction.SCALE_UP:
            return f"使用率 ({utilization:.1f}%) 超過擴容閾值 ({policy.scale_up_threshold}%)"
        elif action == ScalingAction.SCALE_DOWN:
            return f"使用率 ({utilization:.1f}%) 低於縮容閾值 ({policy.scale_down_threshold}%)"
        return ""
    
    def execute_scaling(
        self,
        api_pool_manager,
        policy_id: str,
        action: ScalingAction,
        capacity_change: int,
        trigger_value: float
    ) -> Tuple[bool, str]:
        """
        執行擴縮容操作
        
        注意：這個方法會調整 API 的 max_accounts 設置
        """
        import uuid
        
        policy = self.get_policy(policy_id)
        if not policy:
            return False, "策略不存在"
        
        # 獲取目標 API
        if policy.group_id:
            apis = api_pool_manager.get_apis_by_group(policy.group_id)
        else:
            apis = api_pool_manager.get_all_apis(include_hash=False)
        
        if not apis:
            return False, "無可用 API"
        
        # 計算當前容量
        total_before = sum(api.get('max_accounts', 0) for api in apis)
        
        # 分配容量變化到各 API
        change_per_api = capacity_change / len(apis)
        
        success_count = 0
        for api in apis:
            api_id = api.get('api_id')
            current_max = api.get('max_accounts', 10)
            
            new_max = current_max + change_per_api
            new_max = max(1, int(new_max))  # 至少為 1
            
            # 更新 API 的 max_accounts
            try:
                api_pool_manager.update_api(api_id, {'max_accounts': new_max})
                success_count += 1
            except Exception as e:
                logger.error(f"更新 API {api_id} 失敗: {e}")
        
        if success_count == 0:
            return False, "所有 API 更新失敗"
        
        # 計算新容量
        total_after = total_before + capacity_change
        
        # 記錄事件
        event = ScalingEvent(
            id=str(uuid.uuid4()),
            policy_id=policy_id,
            action=action,
            trigger_type=TriggerType.UTILIZATION,
            trigger_value=trigger_value,
            before_capacity=total_before,
            after_capacity=total_after,
            group_id=policy.group_id,
            message=f"成功調整 {success_count} 個 API",
            created_at=datetime.now().isoformat()
        )
        self._save_event(event)
        
        # 更新冷卻時間
        self._last_scaling[f"{policy_id}_{action.value}"] = datetime.now()
        
        # 重置違規計數
        self._breach_counters[policy_id] = 0
        
        logger.info(f"擴縮容執行完成: {action.value}, 容量 {total_before} -> {total_after}")
        return True, f"容量已從 {total_before} 調整為 {total_after}"
    
    def _save_event(self, event: ScalingEvent):
        """保存擴縮容事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO scaling_events 
            (id, policy_id, action, trigger_type, trigger_value, 
             before_capacity, after_capacity, api_id, group_id, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event.id, event.policy_id, event.action.value,
            event.trigger_type.value, event.trigger_value,
            event.before_capacity, event.after_capacity,
            event.api_id, event.group_id, event.message, event.created_at
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== 事件查詢 ====================
    
    def get_scaling_history(self, limit: int = 100, policy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """獲取擴縮容歷史"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if policy_id:
            cursor.execute('''
                SELECT * FROM scaling_events 
                WHERE policy_id = ?
                ORDER BY created_at DESC LIMIT ?
            ''', (policy_id, limit))
        else:
            cursor.execute('''
                SELECT * FROM scaling_events 
                ORDER BY created_at DESC LIMIT ?
            ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "policy_id": row[1],
            "action": row[2],
            "trigger_type": row[3],
            "trigger_value": row[4],
            "before_capacity": row[5],
            "after_capacity": row[6],
            "api_id": row[7],
            "group_id": row[8],
            "message": row[9],
            "created_at": row[10]
        } for row in rows]
    
    def get_scaling_stats(self) -> Dict[str, Any]:
        """獲取擴縮容統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 統計各類操作
        cursor.execute('''
            SELECT action, COUNT(*) FROM scaling_events GROUP BY action
        ''')
        action_counts = dict(cursor.fetchall())
        
        # 最近 24 小時
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        cursor.execute('''
            SELECT COUNT(*) FROM scaling_events WHERE created_at > ?
        ''', (yesterday,))
        recent_count = cursor.fetchone()[0]
        
        # 最近一次擴縮容
        cursor.execute('''
            SELECT * FROM scaling_events ORDER BY created_at DESC LIMIT 1
        ''')
        last_event = cursor.fetchone()
        
        conn.close()
        
        return {
            "total_events": sum(action_counts.values()),
            "by_action": action_counts,
            "last_24h": recent_count,
            "last_event": {
                "action": last_event[2] if last_event else None,
                "time": last_event[10] if last_event else None,
                "capacity_change": (last_event[6] - last_event[5]) if last_event else 0
            } if last_event else None
        }
    
    # ==================== 自動監控 ====================
    
    async def start_monitoring(self, api_pool_manager, interval: int = 60):
        """開始自動監控"""
        if self._running:
            return
        
        self._running = True
        logger.info(f"開始擴縮容監控，間隔 {interval} 秒")
        
        while self._running:
            try:
                recommendations = self.evaluate(api_pool_manager)
                
                for rec in recommendations:
                    # 自動執行擴縮容
                    action = ScalingAction(rec['action'])
                    success, msg = self.execute_scaling(
                        api_pool_manager,
                        rec['policy_id'],
                        action,
                        rec['recommended_change'],
                        rec['current_utilization']
                    )
                    
                    if success:
                        logger.info(f"自動擴縮容: {msg}")
                    else:
                        logger.warning(f"擴縮容失敗: {msg}")
                
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"監控循環錯誤: {e}")
                await asyncio.sleep(interval)
    
    def stop_monitoring(self):
        """停止監控"""
        self._running = False
        logger.info("停止擴縮容監控")


# 獲取單例
def get_scaling_manager() -> AutoScalingManager:
    return AutoScalingManager()

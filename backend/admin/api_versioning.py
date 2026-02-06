"""
API 版本管理與灰度發布系統

功能：
- API 版本控制
- 灰度發布規則
- 流量分配
- 回滾機制
- A/B 測試支持
"""

import logging
import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import random

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'api_versioning.db')


class VersionStatus(str, Enum):
    """版本狀態"""
    DRAFT = "draft"           # 草稿
    TESTING = "testing"       # 測試中
    CANARY = "canary"         # 金絲雀發布
    ROLLING = "rolling"       # 滾動發布中
    STABLE = "stable"         # 穩定版
    DEPRECATED = "deprecated" # 已棄用
    ARCHIVED = "archived"     # 已歸檔


class RolloutStrategy(str, Enum):
    """發布策略"""
    ALL_AT_ONCE = "all_at_once"     # 全量發布
    CANARY = "canary"               # 金絲雀（小流量測試）
    PERCENTAGE = "percentage"        # 百分比發布
    USER_BASED = "user_based"        # 基於用戶
    REGION_BASED = "region_based"    # 基於區域


@dataclass
class ApiVersion:
    """API 版本"""
    id: str
    api_id: str
    version: str                     # 版本號（如 1.0.0）
    name: str = ""
    description: str = ""
    status: VersionStatus = VersionStatus.DRAFT
    config: Dict = field(default_factory=dict)   # 版本特定配置
    created_at: str = ""
    updated_at: str = ""
    released_at: str = ""
    deprecated_at: str = ""
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "api_id": self.api_id,
            "version": self.version,
            "name": self.name,
            "description": self.description,
            "status": self.status.value if isinstance(self.status, VersionStatus) else self.status,
            "config": self.config,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "released_at": self.released_at,
            "deprecated_at": self.deprecated_at,
            "metadata": self.metadata
        }


@dataclass
class RolloutPlan:
    """發布計劃"""
    id: str
    name: str
    from_version_id: str
    to_version_id: str
    strategy: RolloutStrategy = RolloutStrategy.PERCENTAGE
    target_percentage: int = 100     # 目標百分比
    current_percentage: int = 0      # 當前百分比
    step_size: int = 10              # 每步增加百分比
    step_interval: int = 60          # 步進間隔（分鐘）
    status: str = "pending"          # pending/running/paused/completed/rolled_back
    rules: List[Dict] = field(default_factory=list)  # 灰度規則
    metrics_threshold: Dict = field(default_factory=dict)  # 指標閾值
    created_at: str = ""
    started_at: str = ""
    completed_at: str = ""
    rollback_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "from_version_id": self.from_version_id,
            "to_version_id": self.to_version_id,
            "strategy": self.strategy.value if isinstance(self.strategy, RolloutStrategy) else self.strategy,
            "target_percentage": self.target_percentage,
            "current_percentage": self.current_percentage,
            "step_size": self.step_size,
            "step_interval": self.step_interval,
            "status": self.status,
            "rules": self.rules,
            "metrics_threshold": self.metrics_threshold,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "rollback_at": self.rollback_at
        }


class ApiVersioningManager:
    """API 版本管理器"""
    
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
        self._user_version_cache: Dict[str, str] = {}  # 用戶版本緩存
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # API 版本表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_versions (
                id TEXT PRIMARY KEY,
                api_id TEXT NOT NULL,
                version TEXT NOT NULL,
                name TEXT DEFAULT '',
                description TEXT DEFAULT '',
                status TEXT DEFAULT 'draft',
                config TEXT DEFAULT '{}',
                created_at TEXT,
                updated_at TEXT,
                released_at TEXT,
                deprecated_at TEXT,
                metadata TEXT DEFAULT '{}'
            )
        ''')
        
        # 發布計劃表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rollout_plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                from_version_id TEXT,
                to_version_id TEXT NOT NULL,
                strategy TEXT DEFAULT 'percentage',
                target_percentage INTEGER DEFAULT 100,
                current_percentage INTEGER DEFAULT 0,
                step_size INTEGER DEFAULT 10,
                step_interval INTEGER DEFAULT 60,
                status TEXT DEFAULT 'pending',
                rules TEXT DEFAULT '[]',
                metrics_threshold TEXT DEFAULT '{}',
                created_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                rollback_at TEXT
            )
        ''')
        
        # 用戶版本分配表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_version_assignments (
                user_id TEXT PRIMARY KEY,
                version_id TEXT NOT NULL,
                assigned_at TEXT,
                reason TEXT DEFAULT ''
            )
        ''')
        
        # 版本指標表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS version_metrics (
                id TEXT PRIMARY KEY,
                version_id TEXT NOT NULL,
                timestamp TEXT,
                requests INTEGER DEFAULT 0,
                successes INTEGER DEFAULT 0,
                failures INTEGER DEFAULT 0,
                avg_latency REAL DEFAULT 0,
                error_rate REAL DEFAULT 0
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_versions_api ON api_versions(api_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_versions_status ON api_versions(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rollouts_status ON rollout_plans(status)')
        
        conn.commit()
        conn.close()
        logger.info("API 版本管理數據庫已初始化")
    
    # ==================== 版本管理 ====================
    
    def create_version(self, version: ApiVersion) -> bool:
        """創建版本"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO api_versions 
                (id, api_id, version, name, description, status, config, 
                 created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                version.id, version.api_id, version.version, version.name,
                version.description,
                version.status.value if isinstance(version.status, VersionStatus) else version.status,
                json.dumps(version.config), now, now, json.dumps(version.metadata)
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"創建 API 版本: {version.api_id} v{version.version}")
            return True
        except Exception as e:
            logger.error(f"創建版本失敗: {e}")
            return False
    
    def update_version(self, version_id: str, updates: Dict[str, Any]) -> bool:
        """更新版本"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            updates['updated_at'] = datetime.now().isoformat()
            
            set_clauses = []
            values = []
            for key, value in updates.items():
                if key in ('config', 'metadata') and isinstance(value, dict):
                    value = json.dumps(value)
                set_clauses.append(f"{key} = ?")
                values.append(value)
            
            values.append(version_id)
            
            cursor.execute(f'''
                UPDATE api_versions 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            ''', values)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新版本失敗: {e}")
            return False
    
    def get_version(self, version_id: str) -> Optional[ApiVersion]:
        """獲取版本"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM api_versions WHERE id = ?', (version_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_version(row)
        return None
    
    def list_versions(
        self,
        api_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict]:
        """列出版本"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM api_versions WHERE 1=1'
        params = []
        
        if api_id:
            query += ' AND api_id = ?'
            params.append(api_id)
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_version(row).to_dict() for row in rows]
    
    def get_stable_version(self, api_id: str) -> Optional[ApiVersion]:
        """獲取穩定版本"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM api_versions 
            WHERE api_id = ? AND status = 'stable'
            ORDER BY released_at DESC LIMIT 1
        ''', (api_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_version(row)
        return None
    
    def _row_to_version(self, row) -> ApiVersion:
        return ApiVersion(
            id=row[0],
            api_id=row[1],
            version=row[2],
            name=row[3] or "",
            description=row[4] or "",
            status=VersionStatus(row[5]) if row[5] else VersionStatus.DRAFT,
            config=json.loads(row[6]) if row[6] else {},
            created_at=row[7] or "",
            updated_at=row[8] or "",
            released_at=row[9] or "",
            deprecated_at=row[10] or "",
            metadata=json.loads(row[11]) if row[11] else {}
        )
    
    # ==================== 發布計劃 ====================
    
    def create_rollout(self, plan: RolloutPlan) -> bool:
        """創建發布計劃"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO rollout_plans 
                (id, name, from_version_id, to_version_id, strategy, target_percentage,
                 current_percentage, step_size, step_interval, status, rules, 
                 metrics_threshold, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                plan.id, plan.name, plan.from_version_id, plan.to_version_id,
                plan.strategy.value if isinstance(plan.strategy, RolloutStrategy) else plan.strategy,
                plan.target_percentage, plan.current_percentage, plan.step_size,
                plan.step_interval, plan.status, json.dumps(plan.rules),
                json.dumps(plan.metrics_threshold), plan.created_at or datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"創建發布計劃: {plan.name}")
            return True
        except Exception as e:
            logger.error(f"創建發布計劃失敗: {e}")
            return False
    
    def start_rollout(self, plan_id: str) -> Tuple[bool, str]:
        """開始發布"""
        plan = self._get_rollout(plan_id)
        if not plan:
            return False, "發布計劃不存在"
        
        if plan['status'] not in ('pending', 'paused'):
            return False, f"當前狀態 {plan['status']} 不允許啟動"
        
        # 更新狀態
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE rollout_plans 
            SET status = 'running', started_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), plan_id))
        
        # 更新目標版本為 canary 狀態
        cursor.execute('''
            UPDATE api_versions 
            SET status = 'canary'
            WHERE id = ?
        ''', (plan['to_version_id'],))
        
        conn.commit()
        conn.close()
        
        # 設置初始流量
        self._update_traffic(plan_id, plan['step_size'])
        
        return True, "發布已開始"
    
    def advance_rollout(self, plan_id: str) -> Tuple[bool, str]:
        """推進發布（增加流量）"""
        plan = self._get_rollout(plan_id)
        if not plan:
            return False, "發布計劃不存在"
        
        if plan['status'] != 'running':
            return False, "發布未在運行中"
        
        new_percentage = min(
            plan['current_percentage'] + plan['step_size'],
            plan['target_percentage']
        )
        
        self._update_traffic(plan_id, new_percentage)
        
        # 檢查是否完成
        if new_percentage >= plan['target_percentage']:
            return self.complete_rollout(plan_id)
        
        return True, f"流量已增加到 {new_percentage}%"
    
    def pause_rollout(self, plan_id: str) -> Tuple[bool, str]:
        """暫停發布"""
        plan = self._get_rollout(plan_id)
        if not plan:
            return False, "發布計劃不存在"
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE rollout_plans SET status = 'paused' WHERE id = ?
        ''', (plan_id,))
        conn.commit()
        conn.close()
        
        return True, "發布已暫停"
    
    def complete_rollout(self, plan_id: str) -> Tuple[bool, str]:
        """完成發布"""
        plan = self._get_rollout(plan_id)
        if not plan:
            return False, "發布計劃不存在"
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 更新計劃狀態
        cursor.execute('''
            UPDATE rollout_plans 
            SET status = 'completed', current_percentage = 100, completed_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), plan_id))
        
        # 更新版本狀態
        cursor.execute('''
            UPDATE api_versions SET status = 'stable', released_at = ? WHERE id = ?
        ''', (datetime.now().isoformat(), plan['to_version_id']))
        
        # 將舊版本標記為棄用
        if plan['from_version_id']:
            cursor.execute('''
                UPDATE api_versions SET status = 'deprecated', deprecated_at = ? WHERE id = ?
            ''', (datetime.now().isoformat(), plan['from_version_id']))
        
        conn.commit()
        conn.close()
        
        # 清除用戶版本緩存
        self._user_version_cache.clear()
        
        return True, "發布已完成"
    
    def rollback(self, plan_id: str, reason: str = "") -> Tuple[bool, str]:
        """回滾"""
        plan = self._get_rollout(plan_id)
        if not plan:
            return False, "發布計劃不存在"
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 更新計劃狀態
        cursor.execute('''
            UPDATE rollout_plans 
            SET status = 'rolled_back', current_percentage = 0, rollback_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), plan_id))
        
        # 恢復舊版本
        if plan['from_version_id']:
            cursor.execute('''
                UPDATE api_versions SET status = 'stable' WHERE id = ?
            ''', (plan['from_version_id'],))
        
        # 將新版本標記為草稿
        cursor.execute('''
            UPDATE api_versions SET status = 'draft' WHERE id = ?
        ''', (plan['to_version_id'],))
        
        conn.commit()
        conn.close()
        
        # 清除緩存
        self._user_version_cache.clear()
        
        logger.warning(f"發布已回滾: {plan_id}, 原因: {reason}")
        return True, "已回滾到先前版本"
    
    def _update_traffic(self, plan_id: str, percentage: int):
        """更新流量百分比"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE rollout_plans SET current_percentage = ? WHERE id = ?
        ''', (percentage, plan_id))
        conn.commit()
        conn.close()
    
    def _get_rollout(self, plan_id: str) -> Optional[Dict]:
        """獲取發布計劃"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM rollout_plans WHERE id = ?', (plan_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "from_version_id": row[2],
                "to_version_id": row[3],
                "strategy": row[4],
                "target_percentage": row[5],
                "current_percentage": row[6],
                "step_size": row[7],
                "step_interval": row[8],
                "status": row[9],
                "rules": json.loads(row[10]) if row[10] else [],
                "metrics_threshold": json.loads(row[11]) if row[11] else {},
                "created_at": row[12],
                "started_at": row[13],
                "completed_at": row[14],
                "rollback_at": row[15]
            }
        return None
    
    def list_rollouts(self, status: Optional[str] = None) -> List[Dict]:
        """列出發布計劃"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if status:
            cursor.execute('SELECT * FROM rollout_plans WHERE status = ? ORDER BY created_at DESC', (status,))
        else:
            cursor.execute('SELECT * FROM rollout_plans ORDER BY created_at DESC')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "from_version_id": row[2],
            "to_version_id": row[3],
            "strategy": row[4],
            "target_percentage": row[5],
            "current_percentage": row[6],
            "status": row[9],
            "created_at": row[12],
            "started_at": row[13]
        } for row in rows]
    
    # ==================== 版本路由 ====================
    
    def get_version_for_user(self, user_id: str, api_id: str) -> Optional[ApiVersion]:
        """為用戶獲取版本"""
        # 檢查緩存
        cache_key = f"{user_id}:{api_id}"
        if cache_key in self._user_version_cache:
            return self.get_version(self._user_version_cache[cache_key])
        
        # 檢查是否有固定分配
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT version_id FROM user_version_assignments WHERE user_id = ?
        ''', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            self._user_version_cache[cache_key] = row[0]
            return self.get_version(row[0])
        
        # 檢查進行中的灰度發布
        running_rollouts = self.list_rollouts(status='running')
        
        for rollout in running_rollouts:
            plan = self._get_rollout(rollout['id'])
            if not plan:
                continue
            
            # 檢查灰度規則
            if self._should_use_new_version(user_id, plan):
                version = self.get_version(plan['to_version_id'])
                if version:
                    self._user_version_cache[cache_key] = version.id
                    return version
        
        # 返回穩定版本
        return self.get_stable_version(api_id)
    
    def _should_use_new_version(self, user_id: str, plan: Dict) -> bool:
        """判斷用戶是否應該使用新版本"""
        strategy = plan['strategy']
        percentage = plan['current_percentage']
        rules = plan['rules']
        
        if strategy == 'all_at_once':
            return True
        
        elif strategy == 'percentage':
            # 使用用戶 ID 的哈希來確定（確保同一用戶每次結果一致）
            user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            return (user_hash % 100) < percentage
        
        elif strategy == 'user_based':
            # 檢查用戶是否在白名單中
            whitelist = [r.get('user_id') for r in rules if r.get('type') == 'whitelist']
            return user_id in whitelist
        
        elif strategy == 'canary':
            # 金絲雀：只給特定用戶
            canary_users = [r.get('user_id') for r in rules if r.get('type') == 'canary']
            return user_id in canary_users
        
        return False
    
    def assign_version_to_user(self, user_id: str, version_id: str, reason: str = "") -> bool:
        """為用戶分配固定版本"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO user_version_assignments 
                (user_id, version_id, assigned_at, reason)
                VALUES (?, ?, ?, ?)
            ''', (user_id, version_id, datetime.now().isoformat(), reason))
            
            conn.commit()
            conn.close()
            
            # 更新緩存
            for key in list(self._user_version_cache.keys()):
                if key.startswith(f"{user_id}:"):
                    self._user_version_cache[key] = version_id
            
            return True
        except Exception as e:
            logger.error(f"分配版本失敗: {e}")
            return False
    
    # ==================== 版本指標 ====================
    
    def record_metrics(
        self,
        version_id: str,
        requests: int = 0,
        successes: int = 0,
        failures: int = 0,
        avg_latency: float = 0
    ):
        """記錄版本指標"""
        import uuid
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        error_rate = failures / (successes + failures) * 100 if (successes + failures) > 0 else 0
        
        cursor.execute('''
            INSERT INTO version_metrics 
            (id, version_id, timestamp, requests, successes, failures, avg_latency, error_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), version_id, datetime.now().isoformat(),
            requests, successes, failures, avg_latency, error_rate
        ))
        
        conn.commit()
        conn.close()
    
    def get_version_metrics(self, version_id: str, hours: int = 24) -> Dict[str, Any]:
        """獲取版本指標"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        cursor.execute('''
            SELECT 
                SUM(requests) as total_requests,
                SUM(successes) as total_successes,
                SUM(failures) as total_failures,
                AVG(avg_latency) as avg_latency,
                AVG(error_rate) as avg_error_rate
            FROM version_metrics
            WHERE version_id = ? AND timestamp > ?
        ''', (version_id, since))
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            "version_id": version_id,
            "period_hours": hours,
            "total_requests": row[0] or 0,
            "total_successes": row[1] or 0,
            "total_failures": row[2] or 0,
            "avg_latency": round(row[3] or 0, 2),
            "avg_error_rate": round(row[4] or 0, 2)
        }
    
    def compare_versions(self, version_a: str, version_b: str) -> Dict[str, Any]:
        """比較兩個版本的指標"""
        metrics_a = self.get_version_metrics(version_a)
        metrics_b = self.get_version_metrics(version_b)
        
        return {
            "version_a": metrics_a,
            "version_b": metrics_b,
            "comparison": {
                "requests_diff": metrics_b['total_requests'] - metrics_a['total_requests'],
                "error_rate_diff": metrics_b['avg_error_rate'] - metrics_a['avg_error_rate'],
                "latency_diff": metrics_b['avg_latency'] - metrics_a['avg_latency']
            }
        }


# 獲取單例
def get_versioning_manager() -> ApiVersioningManager:
    return ApiVersioningManager()

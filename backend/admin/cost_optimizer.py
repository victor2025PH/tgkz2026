"""
成本分析與優化

功能：
- 資源使用成本分析
- 成本預測
- 優化建議生成
- 預算管理
- 成本分配
- 節省機會識別
"""

import logging
import sqlite3
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'cost_optimizer.db')


class ResourceType(str, Enum):
    """資源類型"""
    API_CALL = "api_call"
    API_SLOT = "api_slot"
    PROXY = "proxy"
    STORAGE = "storage"
    BANDWIDTH = "bandwidth"
    COMPUTE = "compute"


class CostCategory(str, Enum):
    """成本類別"""
    INFRASTRUCTURE = "infrastructure"
    API_SERVICES = "api_services"
    NETWORK = "network"
    STORAGE = "storage"
    SUPPORT = "support"


class OptimizationType(str, Enum):
    """優化類型"""
    RIGHTSIZING = "rightsizing"      # 調整規模
    UNUSED_RESOURCES = "unused"      # 閒置資源
    SCHEDULING = "scheduling"        # 時間調度
    RESERVATION = "reservation"      # 預留折扣
    ARCHITECTURE = "architecture"    # 架構優化


@dataclass
class CostRecord:
    """成本記錄"""
    id: str
    resource_type: ResourceType
    resource_id: str
    cost: float
    quantity: float
    unit: str
    period: str  # daily/weekly/monthly
    tenant_id: str = ""
    tags: Dict = field(default_factory=dict)
    recorded_at: str = ""


@dataclass
class Budget:
    """預算"""
    id: str
    name: str
    amount: float
    period: str  # monthly/quarterly/yearly
    start_date: str
    end_date: str
    current_spend: float = 0
    alert_threshold: float = 80  # 百分比
    tenant_id: str = ""


@dataclass
class OptimizationRecommendation:
    """優化建議"""
    id: str
    optimization_type: OptimizationType
    resource_type: ResourceType
    resource_id: str
    description: str
    estimated_savings: float
    confidence: float
    priority: int  # 1-5
    implementation_effort: str  # low/medium/high
    status: str = "open"  # open/implemented/dismissed


class CostOptimizer:
    """成本優化器"""
    
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
        self._init_default_pricing()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 成本記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cost_records (
                id TEXT PRIMARY KEY,
                resource_type TEXT,
                resource_id TEXT,
                cost REAL,
                quantity REAL,
                unit TEXT,
                period TEXT,
                tenant_id TEXT,
                tags TEXT DEFAULT '{}',
                recorded_at TEXT
            )
        ''')
        
        # 預算表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL,
                period TEXT,
                start_date TEXT,
                end_date TEXT,
                current_spend REAL DEFAULT 0,
                alert_threshold REAL DEFAULT 80,
                tenant_id TEXT
            )
        ''')
        
        # 優化建議表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS optimization_recommendations (
                id TEXT PRIMARY KEY,
                optimization_type TEXT,
                resource_type TEXT,
                resource_id TEXT,
                description TEXT,
                estimated_savings REAL,
                confidence REAL,
                priority INTEGER DEFAULT 3,
                implementation_effort TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'open',
                created_at TEXT,
                implemented_at TEXT
            )
        ''')
        
        # 價格配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pricing_config (
                id TEXT PRIMARY KEY,
                resource_type TEXT NOT NULL,
                unit_price REAL,
                unit TEXT,
                effective_from TEXT,
                effective_to TEXT
            )
        ''')
        
        # 成本聚合表（用於快速查詢）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cost_aggregations (
                id TEXT PRIMARY KEY,
                period_type TEXT,
                period_start TEXT,
                period_end TEXT,
                resource_type TEXT,
                tenant_id TEXT,
                total_cost REAL,
                total_quantity REAL,
                record_count INTEGER,
                aggregated_at TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cost_tenant ON cost_records(tenant_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cost_type ON cost_records(resource_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cost_time ON cost_records(recorded_at)')
        
        conn.commit()
        conn.close()
        logger.info("成本優化數據庫已初始化")
    
    def _init_default_pricing(self):
        """初始化默認定價"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM pricing_config')
        if cursor.fetchone()[0] == 0:
            default_pricing = [
                (ResourceType.API_CALL, 0.001, "call"),
                (ResourceType.API_SLOT, 5.0, "slot/month"),
                (ResourceType.PROXY, 2.0, "proxy/month"),
                (ResourceType.STORAGE, 0.02, "MB/month"),
                (ResourceType.BANDWIDTH, 0.05, "MB"),
                (ResourceType.COMPUTE, 0.1, "hour"),
            ]
            
            now = datetime.now().isoformat()
            for res_type, price, unit in default_pricing:
                cursor.execute('''
                    INSERT INTO pricing_config (id, resource_type, unit_price, unit, effective_from)
                    VALUES (?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), res_type.value, price, unit, now))
        
        conn.commit()
        conn.close()
    
    # ==================== 成本記錄 ====================
    
    def record_cost(
        self,
        resource_type: ResourceType,
        resource_id: str,
        quantity: float,
        tenant_id: str = "",
        tags: Dict = None,
        cost: float = None
    ) -> str:
        """記錄成本"""
        record_id = str(uuid.uuid4())
        
        # 如果未提供成本，從定價配置計算
        if cost is None:
            unit_price = self._get_unit_price(resource_type)
            cost = quantity * unit_price
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO cost_records 
            (id, resource_type, resource_id, cost, quantity, unit, period, tenant_id, tags, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, 'daily', ?, ?, ?)
        ''', (
            record_id, resource_type.value, resource_id, cost, quantity,
            self._get_unit(resource_type), tenant_id, json.dumps(tags or {}),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        # 更新預算
        self._update_budget_spend(tenant_id, cost)
        
        return record_id
    
    def _get_unit_price(self, resource_type: ResourceType) -> float:
        """獲取單價"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT unit_price FROM pricing_config 
            WHERE resource_type = ? AND (effective_to IS NULL OR effective_to > ?)
            ORDER BY effective_from DESC LIMIT 1
        ''', (resource_type.value, datetime.now().isoformat()))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else 0
    
    def _get_unit(self, resource_type: ResourceType) -> str:
        """獲取計量單位"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT unit FROM pricing_config WHERE resource_type = ?', (resource_type.value,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else "unit"
    
    def _update_budget_spend(self, tenant_id: str, cost: float):
        """更新預算支出"""
        if not tenant_id:
            return
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute('''
            UPDATE budgets SET current_spend = current_spend + ?
            WHERE tenant_id = ? AND start_date <= ? AND end_date >= ?
        ''', (cost, tenant_id, now, now))
        
        conn.commit()
        conn.close()
    
    # ==================== 成本分析 ====================
    
    def get_cost_summary(
        self,
        tenant_id: str = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """獲取成本摘要"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(days=days)).isoformat()
        
        # 總成本
        query = '''
            SELECT SUM(cost), COUNT(*) FROM cost_records WHERE recorded_at > ?
        '''
        params = [since]
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        cursor.execute(query, params)
        total_row = cursor.fetchone()
        
        # 按資源類型分組
        query = '''
            SELECT resource_type, SUM(cost), SUM(quantity), COUNT(*)
            FROM cost_records WHERE recorded_at > ?
        '''
        if tenant_id:
            query += ' AND tenant_id = ?'
        query += ' GROUP BY resource_type'
        
        cursor.execute(query, params)
        type_rows = cursor.fetchall()
        
        # 每日趨勢
        query = '''
            SELECT date(recorded_at) as day, SUM(cost)
            FROM cost_records WHERE recorded_at > ?
        '''
        if tenant_id:
            query += ' AND tenant_id = ?'
        query += ' GROUP BY day ORDER BY day'
        
        cursor.execute(query, params)
        daily_rows = cursor.fetchall()
        
        conn.close()
        
        by_type = {}
        for row in type_rows:
            by_type[row[0]] = {
                "total_cost": round(row[1], 2),
                "total_quantity": row[2],
                "record_count": row[3]
            }
        
        return {
            "period_days": days,
            "total_cost": round(total_row[0] or 0, 2),
            "record_count": total_row[1] or 0,
            "by_resource_type": by_type,
            "daily_trend": [{"date": row[0], "cost": round(row[1], 2)} for row in daily_rows],
            "avg_daily_cost": round((total_row[0] or 0) / days, 2),
            "generated_at": datetime.now().isoformat()
        }
    
    def get_cost_breakdown(
        self,
        tenant_id: str = None,
        group_by: str = "resource_type",
        days: int = 30
    ) -> Dict[str, Any]:
        """獲取成本分解"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(days=days)).isoformat()
        
        valid_groups = ["resource_type", "resource_id", "tenant_id"]
        if group_by not in valid_groups:
            group_by = "resource_type"
        
        query = f'''
            SELECT {group_by}, SUM(cost), SUM(quantity), COUNT(*)
            FROM cost_records WHERE recorded_at > ?
        '''
        params = [since]
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        query += f' GROUP BY {group_by} ORDER BY SUM(cost) DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        total = sum(row[1] for row in rows)
        
        breakdown = []
        for row in rows:
            breakdown.append({
                group_by: row[0],
                "cost": round(row[1], 2),
                "quantity": row[2],
                "count": row[3],
                "percentage": round(row[1] / total * 100, 1) if total > 0 else 0
            })
        
        return {
            "group_by": group_by,
            "period_days": days,
            "total_cost": round(total, 2),
            "breakdown": breakdown
        }
    
    def forecast_cost(
        self,
        tenant_id: str = None,
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """預測未來成本"""
        # 獲取歷史數據
        summary = self.get_cost_summary(tenant_id, days=30)
        
        avg_daily = summary.get("avg_daily_cost", 0)
        daily_trend = summary.get("daily_trend", [])
        
        # 簡單趨勢分析
        if len(daily_trend) >= 7:
            recent_costs = [d["cost"] for d in daily_trend[-7:]]
            older_costs = [d["cost"] for d in daily_trend[:7]]
            
            recent_avg = sum(recent_costs) / len(recent_costs) if recent_costs else 0
            older_avg = sum(older_costs) / len(older_costs) if older_costs else 0
            
            if older_avg > 0:
                growth_rate = (recent_avg - older_avg) / older_avg
            else:
                growth_rate = 0
        else:
            growth_rate = 0
        
        # 預測
        forecasted_daily = avg_daily * (1 + growth_rate)
        forecasted_total = forecasted_daily * forecast_days
        
        # 置信區間（簡單估算）
        variance = sum((d["cost"] - avg_daily) ** 2 for d in daily_trend) / len(daily_trend) if daily_trend else 0
        std = variance ** 0.5
        
        return {
            "forecast_days": forecast_days,
            "historical_avg_daily": round(avg_daily, 2),
            "growth_rate_percent": round(growth_rate * 100, 1),
            "forecasted_daily": round(forecasted_daily, 2),
            "forecasted_total": round(forecasted_total, 2),
            "confidence_interval": {
                "lower": round(max(0, forecasted_total - 1.96 * std * forecast_days ** 0.5), 2),
                "upper": round(forecasted_total + 1.96 * std * forecast_days ** 0.5, 2)
            },
            "trend": "increasing" if growth_rate > 0.05 else "decreasing" if growth_rate < -0.05 else "stable"
        }
    
    # ==================== 預算管理 ====================
    
    def create_budget(
        self,
        name: str,
        amount: float,
        period: str = "monthly",
        tenant_id: str = "",
        alert_threshold: float = 80
    ) -> str:
        """創建預算"""
        budget_id = str(uuid.uuid4())
        
        # 計算週期日期
        now = datetime.now()
        if period == "monthly":
            start_date = now.replace(day=1)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        elif period == "quarterly":
            quarter = (now.month - 1) // 3
            start_date = now.replace(month=quarter * 3 + 1, day=1)
            end_date = start_date.replace(month=start_date.month + 3) - timedelta(days=1)
        else:  # yearly
            start_date = now.replace(month=1, day=1)
            end_date = now.replace(month=12, day=31)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO budgets 
            (id, name, amount, period, start_date, end_date, alert_threshold, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            budget_id, name, amount, period,
            start_date.isoformat(), end_date.isoformat(),
            alert_threshold, tenant_id
        ))
        
        conn.commit()
        conn.close()
        
        return budget_id
    
    def get_budget_status(self, budget_id: str = None, tenant_id: str = None) -> List[Dict]:
        """獲取預算狀態"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM budgets WHERE 1=1'
        params = []
        
        if budget_id:
            query += ' AND id = ?'
            params.append(budget_id)
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        budgets = []
        for row in rows:
            amount = row[2]
            current = row[6]
            threshold = row[7]
            
            utilization = (current / amount * 100) if amount > 0 else 0
            
            if utilization >= 100:
                status = "exceeded"
            elif utilization >= threshold:
                status = "warning"
            else:
                status = "normal"
            
            budgets.append({
                "id": row[0],
                "name": row[1],
                "amount": amount,
                "period": row[3],
                "start_date": row[4],
                "end_date": row[5],
                "current_spend": round(current, 2),
                "remaining": round(max(0, amount - current), 2),
                "utilization_percent": round(utilization, 1),
                "alert_threshold": threshold,
                "status": status,
                "tenant_id": row[8]
            })
        
        return budgets
    
    # ==================== 優化建議 ====================
    
    def generate_recommendations(self, tenant_id: str = None) -> List[Dict]:
        """生成優化建議"""
        recommendations = []
        
        # 1. 檢查閒置資源
        unused = self._find_unused_resources(tenant_id)
        recommendations.extend(unused)
        
        # 2. 檢查使用效率
        efficiency = self._analyze_usage_efficiency(tenant_id)
        recommendations.extend(efficiency)
        
        # 3. 檢查成本趨勢
        trend_recs = self._analyze_cost_trends(tenant_id)
        recommendations.extend(trend_recs)
        
        # 保存建議
        for rec in recommendations:
            self._save_recommendation(rec)
        
        return recommendations
    
    def _find_unused_resources(self, tenant_id: str = None) -> List[Dict]:
        """查找閒置資源"""
        recommendations = []
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 過去 7 天沒有使用的資源
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        # 查找有付費但沒使用的資源
        query = '''
            SELECT resource_type, resource_id, SUM(cost), MAX(recorded_at)
            FROM cost_records
            WHERE resource_type IN ('api_slot', 'proxy')
        '''
        params = []
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        query += ' GROUP BY resource_type, resource_id HAVING MAX(recorded_at) < ?'
        params.append(seven_days_ago)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        for row in rows:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "optimization_type": OptimizationType.UNUSED_RESOURCES.value,
                "resource_type": row[0],
                "resource_id": row[1],
                "description": f"資源 {row[1]} 已 7 天未使用，建議釋放或降級",
                "estimated_savings": round(row[2] * 4, 2),  # 估算月度節省
                "confidence": 0.9,
                "priority": 4,
                "implementation_effort": "low"
            })
        
        return recommendations
    
    def _analyze_usage_efficiency(self, tenant_id: str = None) -> List[Dict]:
        """分析使用效率"""
        recommendations = []
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 查找高成本低效率的資源
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        query = '''
            SELECT resource_type, AVG(cost/quantity) as unit_cost, SUM(cost), SUM(quantity)
            FROM cost_records
            WHERE recorded_at > ? AND quantity > 0
        '''
        params = [thirty_days_ago]
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        query += ' GROUP BY resource_type'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # 獲取基準價格
        for row in rows:
            resource_type = row[0]
            avg_unit_cost = row[1]
            total_cost = row[2]
            
            base_price = self._get_unit_price(ResourceType(resource_type))
            
            # 如果實際成本顯著高於基準
            if base_price > 0 and avg_unit_cost > base_price * 1.2:
                recommendations.append({
                    "id": str(uuid.uuid4()),
                    "optimization_type": OptimizationType.RIGHTSIZING.value,
                    "resource_type": resource_type,
                    "resource_id": "all",
                    "description": f"{resource_type} 的單位成本高於基準 {round((avg_unit_cost/base_price - 1) * 100)}%，建議優化使用方式",
                    "estimated_savings": round(total_cost * 0.2, 2),
                    "confidence": 0.7,
                    "priority": 3,
                    "implementation_effort": "medium"
                })
        
        return recommendations
    
    def _analyze_cost_trends(self, tenant_id: str = None) -> List[Dict]:
        """分析成本趨勢"""
        recommendations = []
        
        forecast = self.forecast_cost(tenant_id)
        
        if forecast.get("growth_rate_percent", 0) > 20:
            recommendations.append({
                "id": str(uuid.uuid4()),
                "optimization_type": OptimizationType.ARCHITECTURE.value,
                "resource_type": "all",
                "resource_id": "all",
                "description": f"成本增長率達 {forecast['growth_rate_percent']}%，建議審查架構和使用模式",
                "estimated_savings": round(forecast.get("forecasted_total", 0) * 0.15, 2),
                "confidence": 0.6,
                "priority": 5,
                "implementation_effort": "high"
            })
        
        return recommendations
    
    def _save_recommendation(self, rec: Dict):
        """保存優化建議"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO optimization_recommendations 
            (id, optimization_type, resource_type, resource_id, description, 
             estimated_savings, confidence, priority, implementation_effort, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            rec["id"], rec["optimization_type"], rec["resource_type"],
            rec["resource_id"], rec["description"], rec["estimated_savings"],
            rec["confidence"], rec["priority"], rec["implementation_effort"],
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def list_recommendations(
        self,
        status: str = "open",
        min_savings: float = None
    ) -> List[Dict]:
        """列出優化建議"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM optimization_recommendations WHERE status = ?'
        params = [status]
        
        if min_savings:
            query += ' AND estimated_savings >= ?'
            params.append(min_savings)
        
        query += ' ORDER BY priority DESC, estimated_savings DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "optimization_type": row[1],
            "resource_type": row[2],
            "resource_id": row[3],
            "description": row[4],
            "estimated_savings": row[5],
            "confidence": row[6],
            "priority": row[7],
            "implementation_effort": row[8],
            "status": row[9],
            "created_at": row[10],
            "implemented_at": row[11]
        } for row in rows]
    
    def update_recommendation_status(
        self,
        recommendation_id: str,
        status: str,
        actual_savings: float = None
    ) -> bool:
        """更新建議狀態"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            if status == "implemented":
                cursor.execute('''
                    UPDATE optimization_recommendations 
                    SET status = ?, implemented_at = ?
                    WHERE id = ?
                ''', (status, datetime.now().isoformat(), recommendation_id))
            else:
                cursor.execute('''
                    UPDATE optimization_recommendations SET status = ? WHERE id = ?
                ''', (status, recommendation_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    # ==================== 成本分配 ====================
    
    def allocate_costs(
        self,
        period: str = "monthly"
    ) -> Dict[str, Any]:
        """按租戶分配成本"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 確定時間範圍
        now = datetime.now()
        if period == "monthly":
            start = now.replace(day=1).isoformat()
        elif period == "weekly":
            start = (now - timedelta(days=now.weekday())).isoformat()
        else:
            start = now.replace(hour=0, minute=0, second=0).isoformat()
        
        cursor.execute('''
            SELECT tenant_id, resource_type, SUM(cost), SUM(quantity)
            FROM cost_records
            WHERE recorded_at >= ? AND tenant_id != ''
            GROUP BY tenant_id, resource_type
        ''', (start,))
        
        rows = cursor.fetchall()
        conn.close()
        
        allocation = defaultdict(lambda: {"total": 0, "by_type": {}})
        
        for tenant_id, resource_type, cost, quantity in rows:
            allocation[tenant_id]["total"] += cost
            allocation[tenant_id]["by_type"][resource_type] = {
                "cost": round(cost, 2),
                "quantity": quantity
            }
        
        # 轉換為普通字典並計算總計
        result = {}
        total = 0
        
        for tenant_id, data in allocation.items():
            result[tenant_id] = {
                "total": round(data["total"], 2),
                "by_type": data["by_type"]
            }
            total += data["total"]
        
        return {
            "period": period,
            "period_start": start,
            "total_cost": round(total, 2),
            "allocations": result,
            "generated_at": datetime.now().isoformat()
        }
    
    # ==================== 統計 ====================
    
    def get_cost_stats(self) -> Dict[str, Any]:
        """獲取成本統計"""
        summary = self.get_cost_summary(days=30)
        forecast = self.forecast_cost()
        budgets = self.get_budget_status()
        recommendations = self.list_recommendations()
        
        total_potential_savings = sum(r["estimated_savings"] for r in recommendations)
        
        return {
            "current_month": summary,
            "forecast": forecast,
            "budgets": {
                "total": len(budgets),
                "exceeded": len([b for b in budgets if b["status"] == "exceeded"]),
                "warning": len([b for b in budgets if b["status"] == "warning"])
            },
            "optimizations": {
                "open_recommendations": len(recommendations),
                "total_potential_savings": round(total_potential_savings, 2)
            },
            "timestamp": datetime.now().isoformat()
        }


# 獲取單例
def get_cost_optimizer() -> CostOptimizer:
    return CostOptimizer()

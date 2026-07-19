"""
多租戶增強管理

功能：
- 資源配額管理
- 租戶使用報表
- 配額預警
- 租戶隔離驗證
- 成本分攤報告
"""

import logging
import sqlite3
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal

# 🔧 合法連接模塊（見 .cursorrules 合法連接模塊清單）：
# 同步輔助查詢統一經由 core.db_utils，不再直接 sqlite3.connect()。
# 注意：本檔案的 tenant_enhanced.db（配額/報表/成本分攤）與
# core/tenant_database.py（多租戶 SaaS 每租戶獨立 db）是完全獨立的兩套機制，
# 僅共用 core.db_utils 的路徑解析工具，不共用資料庫檔案或表結構。
from core.db_utils import create_connection, resolve_db_path

logger = logging.getLogger(__name__)

# 數據庫路徑（目錄部分改由 resolve_db_path() 解析的 DATABASE_DIR 取得，
# 檔名維持獨立的 tenant_enhanced.db 不變）
DB_PATH = os.path.join(os.path.dirname(resolve_db_path()), 'tenant_enhanced.db')


class QuotaType(str, Enum):
    """配額類型"""
    API_COUNT = "api_count"           # API 數量限制
    API_CALLS = "api_calls"           # API 調用次數
    BANDWIDTH = "bandwidth"           # 帶寬限制（MB）
    STORAGE = "storage"               # 存儲限制（MB）
    CONCURRENT = "concurrent"         # 併發連接數
    DAILY_CALLS = "daily_calls"       # 每日調用限制


class AlertLevel(str, Enum):
    """預警級別"""
    INFO = "info"       # 50%
    WARNING = "warning" # 75%
    CRITICAL = "critical"  # 90%
    EXCEEDED = "exceeded"  # 100%+


@dataclass
class ResourceQuota:
    """資源配額"""
    id: str
    tenant_id: str
    quota_type: QuotaType
    limit_value: float
    current_usage: float = 0
    warning_threshold: float = 75  # 百分比
    critical_threshold: float = 90
    reset_period: str = "monthly"  # daily/weekly/monthly/never
    last_reset: str = ""
    created_at: str = ""
    
    @property
    def usage_percent(self) -> float:
        if self.limit_value <= 0:
            return 0
        return round((self.current_usage / self.limit_value) * 100, 2)
    
    @property
    def remaining(self) -> float:
        return max(0, self.limit_value - self.current_usage)


@dataclass
class TenantReport:
    """租戶報表"""
    id: str
    tenant_id: str
    report_type: str  # daily/weekly/monthly
    period_start: str
    period_end: str
    metrics: Dict[str, Any] = field(default_factory=dict)
    cost_breakdown: Dict[str, float] = field(default_factory=dict)
    total_cost: float = 0
    generated_at: str = ""


class TenantEnhancedManager:
    """多租戶增強管理器"""
    
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
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        # 租戶配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tenant_configs (
                tenant_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                plan_id TEXT,
                is_active INTEGER DEFAULT 1,
                settings TEXT DEFAULT '{}',
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 資源配額表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resource_quotas (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                quota_type TEXT NOT NULL,
                limit_value REAL,
                current_usage REAL DEFAULT 0,
                warning_threshold REAL DEFAULT 75,
                critical_threshold REAL DEFAULT 90,
                reset_period TEXT DEFAULT 'monthly',
                last_reset TEXT,
                created_at TEXT,
                UNIQUE(tenant_id, quota_type)
            )
        ''')
        
        # 配額使用歷史
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quota_usage_history (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                quota_type TEXT NOT NULL,
                usage_value REAL,
                recorded_at TEXT
            )
        ''')
        
        # 配額預警記錄
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quota_alerts (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                quota_type TEXT NOT NULL,
                alert_level TEXT,
                usage_percent REAL,
                message TEXT,
                acknowledged INTEGER DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        # 租戶報表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tenant_reports (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                report_type TEXT,
                period_start TEXT,
                period_end TEXT,
                metrics TEXT DEFAULT '{}',
                cost_breakdown TEXT DEFAULT '{}',
                total_cost REAL DEFAULT 0,
                generated_at TEXT
            )
        ''')
        
        # 成本分攤配置
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cost_allocation (
                id TEXT PRIMARY KEY,
                resource_type TEXT NOT NULL,
                unit_cost REAL,
                currency TEXT DEFAULT 'USD',
                description TEXT,
                effective_from TEXT,
                effective_to TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_quota_tenant ON resource_quotas(tenant_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_tenant ON quota_usage_history(tenant_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_report_tenant ON tenant_reports(tenant_id)')
        
        conn.commit()
        conn.close()
        
        # 初始化默認成本配置
        self._init_default_costs()
        logger.info("多租戶增強數據庫已初始化")
    
    def _init_default_costs(self):
        """初始化默認成本配置"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM cost_allocation')
        if cursor.fetchone()[0] == 0:
            default_costs = [
                ('api_calls', 0.001, 'USD', '每次 API 調用'),
                ('bandwidth', 0.05, 'USD', '每 MB 帶寬'),
                ('storage', 0.02, 'USD', '每 MB 存儲/月'),
                ('api_slot', 5.0, 'USD', '每個 API 槽位/月'),
            ]
            
            now = datetime.now().isoformat()
            for resource_type, unit_cost, currency, desc in default_costs:
                cursor.execute('''
                    INSERT INTO cost_allocation (id, resource_type, unit_cost, currency, description, effective_from)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), resource_type, unit_cost, currency, desc, now))
        
        conn.commit()
        conn.close()
    
    # ==================== 租戶管理 ====================
    
    def register_tenant(
        self,
        tenant_id: str,
        name: str,
        plan_id: str = None,
        settings: Dict = None
    ) -> bool:
        """註冊租戶"""
        try:
            conn = create_connection(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO tenant_configs 
                (tenant_id, name, plan_id, is_active, settings, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?, ?)
            ''', (tenant_id, name, plan_id, json.dumps(settings or {}), now, now))
            
            conn.commit()
            conn.close()
            
            # 初始化默認配額
            self._init_default_quotas(tenant_id)
            return True
        except Exception as e:
            logger.error(f"註冊租戶失敗: {e}")
            return False
    
    def _init_default_quotas(self, tenant_id: str):
        """初始化默認配額"""
        default_quotas = [
            (QuotaType.API_COUNT, 10),
            (QuotaType.API_CALLS, 10000),
            (QuotaType.DAILY_CALLS, 1000),
            (QuotaType.CONCURRENT, 5),
        ]
        
        for quota_type, limit in default_quotas:
            self.set_quota(tenant_id, quota_type, limit)
    
    def get_tenant(self, tenant_id: str) -> Optional[Dict]:
        """獲取租戶信息"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tenant_configs WHERE tenant_id = ?', (tenant_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "tenant_id": row[0],
                "name": row[1],
                "plan_id": row[2],
                "is_active": bool(row[3]),
                "settings": json.loads(row[4]) if row[4] else {},
                "created_at": row[5],
                "updated_at": row[6]
            }
        return None
    
    def list_tenants(self, active_only: bool = True) -> List[Dict]:
        """列出所有租戶"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM tenant_configs'
        if active_only:
            query += ' WHERE is_active = 1'
        
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "tenant_id": row[0],
            "name": row[1],
            "plan_id": row[2],
            "is_active": bool(row[3]),
            "settings": json.loads(row[4]) if row[4] else {},
            "created_at": row[5],
            "updated_at": row[6]
        } for row in rows]
    
    # ==================== 配額管理 ====================
    
    def set_quota(
        self,
        tenant_id: str,
        quota_type: QuotaType,
        limit_value: float,
        warning_threshold: float = 75,
        critical_threshold: float = 90,
        reset_period: str = "monthly"
    ) -> bool:
        """設置配額"""
        try:
            conn = create_connection(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO resource_quotas 
                (id, tenant_id, quota_type, limit_value, current_usage, 
                 warning_threshold, critical_threshold, reset_period, last_reset, created_at)
                VALUES (?, ?, ?, ?, 
                    COALESCE((SELECT current_usage FROM resource_quotas WHERE tenant_id = ? AND quota_type = ?), 0),
                    ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), tenant_id, quota_type.value if isinstance(quota_type, QuotaType) else quota_type,
                limit_value, tenant_id, quota_type.value if isinstance(quota_type, QuotaType) else quota_type,
                warning_threshold, critical_threshold, reset_period, now, now
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"設置配額失敗: {e}")
            return False
    
    def get_quotas(self, tenant_id: str) -> List[Dict]:
        """獲取租戶配額"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM resource_quotas WHERE tenant_id = ?', (tenant_id,))
        rows = cursor.fetchall()
        conn.close()
        
        quotas = []
        for row in rows:
            limit_val = row[3] or 0
            current = row[4] or 0
            usage_pct = round((current / limit_val * 100), 2) if limit_val > 0 else 0
            
            quotas.append({
                "id": row[0],
                "tenant_id": row[1],
                "quota_type": row[2],
                "limit_value": limit_val,
                "current_usage": current,
                "usage_percent": usage_pct,
                "remaining": max(0, limit_val - current),
                "warning_threshold": row[5],
                "critical_threshold": row[6],
                "reset_period": row[7],
                "last_reset": row[8],
                "created_at": row[9]
            })
        
        return quotas
    
    def use_quota(
        self,
        tenant_id: str,
        quota_type: QuotaType,
        amount: float
    ) -> Dict[str, Any]:
        """使用配額"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        quota_type_str = quota_type.value if isinstance(quota_type, QuotaType) else quota_type
        
        cursor.execute('''
            SELECT id, limit_value, current_usage, warning_threshold, critical_threshold
            FROM resource_quotas 
            WHERE tenant_id = ? AND quota_type = ?
        ''', (tenant_id, quota_type_str))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {"allowed": True, "reason": "no_quota_set"}
        
        quota_id, limit_val, current, warn_thresh, crit_thresh = row
        new_usage = current + amount
        
        # 檢查是否超限
        if new_usage > limit_val:
            conn.close()
            return {
                "allowed": False,
                "reason": "quota_exceeded",
                "current": current,
                "limit": limit_val,
                "requested": amount
            }
        
        # 更新使用量
        cursor.execute('''
            UPDATE resource_quotas SET current_usage = ? WHERE id = ?
        ''', (new_usage, quota_id))
        
        # 記錄使用歷史
        cursor.execute('''
            INSERT INTO quota_usage_history (id, tenant_id, quota_type, usage_value, recorded_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), tenant_id, quota_type_str, amount, datetime.now().isoformat()))
        
        conn.commit()
        
        # 計算使用百分比
        usage_pct = (new_usage / limit_val * 100) if limit_val > 0 else 0
        
        # 檢查是否需要預警
        alert_level = None
        if usage_pct >= 100:
            alert_level = AlertLevel.EXCEEDED
        elif usage_pct >= crit_thresh:
            alert_level = AlertLevel.CRITICAL
        elif usage_pct >= warn_thresh:
            alert_level = AlertLevel.WARNING
        elif usage_pct >= 50:
            alert_level = AlertLevel.INFO
        
        if alert_level:
            self._create_alert(conn, tenant_id, quota_type_str, alert_level, usage_pct)
        
        conn.close()
        
        return {
            "allowed": True,
            "current_usage": new_usage,
            "limit": limit_val,
            "usage_percent": round(usage_pct, 2),
            "alert_level": alert_level.value if alert_level else None
        }
    
    def _create_alert(
        self,
        conn: sqlite3.Connection,
        tenant_id: str,
        quota_type: str,
        level: AlertLevel,
        usage_pct: float
    ):
        """創建配額預警"""
        cursor = conn.cursor()
        
        # 檢查是否已有未確認的同級別預警
        cursor.execute('''
            SELECT id FROM quota_alerts 
            WHERE tenant_id = ? AND quota_type = ? AND alert_level = ? AND acknowledged = 0
        ''', (tenant_id, quota_type, level.value))
        
        if cursor.fetchone():
            return  # 已存在未確認預警
        
        messages = {
            AlertLevel.INFO: f"配額使用已達 {usage_pct:.1f}%",
            AlertLevel.WARNING: f"⚠️ 配額使用警告：已達 {usage_pct:.1f}%",
            AlertLevel.CRITICAL: f"🔴 配額使用告急：已達 {usage_pct:.1f}%",
            AlertLevel.EXCEEDED: f"❌ 配額已超限：{usage_pct:.1f}%"
        }
        
        cursor.execute('''
            INSERT INTO quota_alerts (id, tenant_id, quota_type, alert_level, usage_percent, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), tenant_id, quota_type, level.value,
            usage_pct, messages.get(level, ""), datetime.now().isoformat()
        ))
        
        conn.commit()
    
    def get_quota_alerts(
        self,
        tenant_id: str = None,
        unacknowledged_only: bool = True
    ) -> List[Dict]:
        """獲取配額預警"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM quota_alerts WHERE 1=1'
        params = []
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        if unacknowledged_only:
            query += ' AND acknowledged = 0'
        
        query += ' ORDER BY created_at DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "tenant_id": row[1],
            "quota_type": row[2],
            "alert_level": row[3],
            "usage_percent": row[4],
            "message": row[5],
            "acknowledged": bool(row[6]),
            "created_at": row[7]
        } for row in rows]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """確認預警"""
        try:
            conn = create_connection(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('UPDATE quota_alerts SET acknowledged = 1 WHERE id = ?', (alert_id,))
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    def reset_quota(self, tenant_id: str, quota_type: QuotaType = None):
        """重置配額使用量"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        if quota_type:
            quota_type_str = quota_type.value if isinstance(quota_type, QuotaType) else quota_type
            cursor.execute('''
                UPDATE resource_quotas SET current_usage = 0, last_reset = ?
                WHERE tenant_id = ? AND quota_type = ?
            ''', (now, tenant_id, quota_type_str))
        else:
            cursor.execute('''
                UPDATE resource_quotas SET current_usage = 0, last_reset = ?
                WHERE tenant_id = ?
            ''', (now, tenant_id))
        
        conn.commit()
        conn.close()
    
    # ==================== 報表生成 ====================
    
    def generate_report(
        self,
        tenant_id: str,
        report_type: str = "monthly",
        period_start: str = None,
        period_end: str = None
    ) -> Dict:
        """生成租戶報表"""
        now = datetime.now()
        
        # 計算時間範圍
        if not period_end:
            period_end = now.isoformat()
        
        if not period_start:
            if report_type == "daily":
                start = now - timedelta(days=1)
            elif report_type == "weekly":
                start = now - timedelta(weeks=1)
            else:
                start = now - timedelta(days=30)
            period_start = start.isoformat()
        
        # 獲取配額數據
        quotas = self.get_quotas(tenant_id)
        
        # 獲取使用歷史
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT quota_type, SUM(usage_value) as total, COUNT(*) as count
            FROM quota_usage_history
            WHERE tenant_id = ? AND recorded_at >= ? AND recorded_at <= ?
            GROUP BY quota_type
        ''', (tenant_id, period_start, period_end))
        
        usage_stats = {row[0]: {"total": row[1], "count": row[2]} for row in cursor.fetchall()}
        
        # 獲取成本配置
        cursor.execute('SELECT resource_type, unit_cost FROM cost_allocation WHERE effective_to IS NULL OR effective_to > ?', (now.isoformat(),))
        cost_config = {row[0]: row[1] for row in cursor.fetchall()}
        
        conn.close()
        
        # 計算成本分攤
        cost_breakdown = {}
        total_cost = 0
        
        for quota in quotas:
            qtype = quota['quota_type']
            usage = usage_stats.get(qtype, {}).get('total', 0)
            unit_cost = cost_config.get(qtype, 0)
            cost = usage * unit_cost
            
            if cost > 0:
                cost_breakdown[qtype] = round(cost, 4)
                total_cost += cost
        
        # 構建報表
        report_id = str(uuid.uuid4())
        report = {
            "id": report_id,
            "tenant_id": tenant_id,
            "report_type": report_type,
            "period_start": period_start,
            "period_end": period_end,
            "metrics": {
                "quotas": quotas,
                "usage_stats": usage_stats,
                "alert_count": len(self.get_quota_alerts(tenant_id, unacknowledged_only=False))
            },
            "cost_breakdown": cost_breakdown,
            "total_cost": round(total_cost, 2),
            "generated_at": now.isoformat()
        }
        
        # 保存報表
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO tenant_reports 
            (id, tenant_id, report_type, period_start, period_end, metrics, cost_breakdown, total_cost, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            report_id, tenant_id, report_type, period_start, period_end,
            json.dumps(report['metrics']), json.dumps(cost_breakdown), total_cost, report['generated_at']
        ))
        conn.commit()
        conn.close()
        
        return report
    
    def list_reports(
        self,
        tenant_id: str = None,
        report_type: str = None,
        limit: int = 50
    ) -> List[Dict]:
        """列出報表"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT id, tenant_id, report_type, period_start, period_end, total_cost, generated_at FROM tenant_reports WHERE 1=1'
        params = []
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        if report_type:
            query += ' AND report_type = ?'
            params.append(report_type)
        
        query += ' ORDER BY generated_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "tenant_id": row[1],
            "report_type": row[2],
            "period_start": row[3],
            "period_end": row[4],
            "total_cost": row[5],
            "generated_at": row[6]
        } for row in rows]
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        """獲取報表詳情"""
        conn = create_connection(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tenant_reports WHERE id = ?', (report_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "tenant_id": row[1],
                "report_type": row[2],
                "period_start": row[3],
                "period_end": row[4],
                "metrics": json.loads(row[5]) if row[5] else {},
                "cost_breakdown": json.loads(row[6]) if row[6] else {},
                "total_cost": row[7],
                "generated_at": row[8]
            }
        return None
    
    # ==================== 隔離驗證 ====================
    
    def validate_access(
        self,
        tenant_id: str,
        resource_type: str,
        resource_id: str,
        action: str = "read"
    ) -> Dict[str, Any]:
        """驗證租戶訪問權限"""
        tenant = self.get_tenant(tenant_id)
        
        if not tenant:
            return {"allowed": False, "reason": "tenant_not_found"}
        
        if not tenant['is_active']:
            return {"allowed": False, "reason": "tenant_inactive"}
        
        # 檢查配額
        quota_type = None
        if action in ("create", "write"):
            if resource_type == "api":
                quota_type = QuotaType.API_COUNT
            elif resource_type == "call":
                quota_type = QuotaType.API_CALLS
        
        if quota_type:
            quotas = self.get_quotas(tenant_id)
            quota = next((q for q in quotas if q['quota_type'] == quota_type.value), None)
            
            if quota and quota['current_usage'] >= quota['limit_value']:
                return {
                    "allowed": False,
                    "reason": "quota_exceeded",
                    "quota_type": quota_type.value
                }
        
        return {"allowed": True, "tenant_id": tenant_id}
    
    # ==================== 統計 ====================
    
    def get_tenant_summary(self, tenant_id: str) -> Dict[str, Any]:
        """獲取租戶概要"""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return {}
        
        quotas = self.get_quotas(tenant_id)
        alerts = self.get_quota_alerts(tenant_id)
        
        # 最高使用率的配額
        highest_usage = max(quotas, key=lambda q: q['usage_percent']) if quotas else None
        
        return {
            "tenant": tenant,
            "quotas_summary": {
                "total": len(quotas),
                "warning": len([q for q in quotas if q['usage_percent'] >= q['warning_threshold']]),
                "critical": len([q for q in quotas if q['usage_percent'] >= q['critical_threshold']])
            },
            "highest_usage_quota": highest_usage,
            "pending_alerts": len(alerts),
            "alerts": alerts[:5]  # 最近 5 條
        }
    
    def get_all_tenants_overview(self) -> Dict[str, Any]:
        """獲取所有租戶概覽"""
        tenants = self.list_tenants()
        
        total_alerts = 0
        tenants_at_risk = []
        
        for tenant in tenants:
            quotas = self.get_quotas(tenant['tenant_id'])
            critical = [q for q in quotas if q['usage_percent'] >= q['critical_threshold']]
            
            if critical:
                tenants_at_risk.append({
                    "tenant_id": tenant['tenant_id'],
                    "name": tenant['name'],
                    "critical_quotas": len(critical)
                })
            
            total_alerts += len(self.get_quota_alerts(tenant['tenant_id']))
        
        return {
            "total_tenants": len(tenants),
            "active_tenants": len([t for t in tenants if t['is_active']]),
            "total_pending_alerts": total_alerts,
            "tenants_at_risk": tenants_at_risk
        }


# 獲取單例
def get_tenant_enhanced_manager() -> TenantEnhancedManager:
    return TenantEnhancedManager()

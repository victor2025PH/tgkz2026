"""
服務健康儀表盤

功能：
- 綜合服務狀態視圖
- 實時指標聚合
- SLA 監控
- 狀態頁面生成
- 服務依賴可視化
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

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'dashboard.db')


class ServiceStatus(str, Enum):
    """服務狀態"""
    OPERATIONAL = "operational"        # 正常運行
    DEGRADED = "degraded"              # 性能下降
    PARTIAL_OUTAGE = "partial_outage"  # 部分中斷
    MAJOR_OUTAGE = "major_outage"      # 嚴重中斷
    MAINTENANCE = "maintenance"        # 維護中


class ComponentCategory(str, Enum):
    """組件類別"""
    CORE = "core"           # 核心服務
    API = "api"             # API 服務
    INFRASTRUCTURE = "infra"  # 基礎設施
    INTEGRATION = "integration"  # 集成服務


@dataclass
class ServiceComponent:
    """服務組件"""
    id: str
    name: str
    description: str = ""
    category: ComponentCategory = ComponentCategory.CORE
    status: ServiceStatus = ServiceStatus.OPERATIONAL
    uptime_percent: float = 100.0
    response_time_ms: float = 0
    error_rate: float = 0
    last_check: str = ""
    dependencies: List[str] = field(default_factory=list)


@dataclass
class SLATarget:
    """SLA 目標"""
    id: str
    name: str
    metric: str  # uptime/response_time/error_rate
    target_value: float
    current_value: float = 0
    period: str = "monthly"  # daily/weekly/monthly
    status: str = "met"  # met/at_risk/breached


@dataclass 
class StatusUpdate:
    """狀態更新"""
    id: str
    title: str
    message: str
    status: ServiceStatus
    affected_components: List[str] = field(default_factory=list)
    created_at: str = ""
    resolved_at: str = ""


class ServiceDashboardManager:
    """服務儀表盤管理器"""
    
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
        self._init_default_components()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 服務組件表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_components (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                status TEXT DEFAULT 'operational',
                uptime_percent REAL DEFAULT 100,
                response_time_ms REAL DEFAULT 0,
                error_rate REAL DEFAULT 0,
                last_check TEXT,
                dependencies TEXT DEFAULT '[]',
                created_at TEXT
            )
        ''')
        
        # 狀態歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS status_history (
                id TEXT PRIMARY KEY,
                component_id TEXT,
                status TEXT,
                uptime_percent REAL,
                response_time_ms REAL,
                error_rate REAL,
                recorded_at TEXT
            )
        ''')
        
        # SLA 目標表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sla_targets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                metric TEXT,
                target_value REAL,
                current_value REAL DEFAULT 0,
                period TEXT DEFAULT 'monthly',
                status TEXT DEFAULT 'met',
                updated_at TEXT
            )
        ''')
        
        # 狀態更新表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS status_updates (
                id TEXT PRIMARY KEY,
                title TEXT,
                message TEXT,
                status TEXT,
                affected_components TEXT DEFAULT '[]',
                created_at TEXT,
                resolved_at TEXT
            )
        ''')
        
        # 維護計劃表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS maintenance_windows (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                scheduled_start TEXT,
                scheduled_end TEXT,
                actual_start TEXT,
                actual_end TEXT,
                affected_components TEXT DEFAULT '[]',
                status TEXT DEFAULT 'scheduled'
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_history_component ON status_history(component_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_history_time ON status_history(recorded_at)')
        
        conn.commit()
        conn.close()
        logger.info("服務儀表盤數據庫已初始化")
    
    def _init_default_components(self):
        """初始化默認服務組件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM service_components')
        if cursor.fetchone()[0] == 0:
            default_components = [
                ("api-pool", "API 連接池", "管理 Telegram API 憑據", "core", []),
                ("proxy-pool", "代理池", "管理代理服務器", "core", []),
                ("database", "數據庫", "SQLite 數據存儲", "infra", []),
                ("scheduler", "任務調度", "定時任務管理", "core", ["database"]),
                ("webhook", "Webhook 服務", "事件推送服務", "integration", ["api-pool"]),
                ("billing", "計費系統", "使用量計費", "api", ["database"]),
                ("auth", "認證服務", "用戶認證授權", "core", ["database"]),
                ("monitoring", "監控系統", "系統監控告警", "infra", []),
            ]
            
            now = datetime.now().isoformat()
            for comp_id, name, desc, category, deps in default_components:
                cursor.execute('''
                    INSERT INTO service_components 
                    (id, name, description, category, status, dependencies, created_at)
                    VALUES (?, ?, ?, ?, 'operational', ?, ?)
                ''', (comp_id, name, desc, category, json.dumps(deps), now))
            
            # 初始化默認 SLA 目標
            default_slas = [
                ("sla-uptime", "系統可用性", "uptime", 99.9),
                ("sla-response", "平均響應時間", "response_time", 200),
                ("sla-error", "錯誤率", "error_rate", 0.1),
            ]
            
            for sla_id, name, metric, target in default_slas:
                cursor.execute('''
                    INSERT INTO sla_targets (id, name, metric, target_value, current_value, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (sla_id, name, metric, target, target, now))
            
            conn.commit()
        
        conn.close()
    
    # ==================== 組件管理 ====================
    
    def register_component(
        self,
        component_id: str,
        name: str,
        description: str = "",
        category: ComponentCategory = ComponentCategory.CORE,
        dependencies: List[str] = None
    ) -> bool:
        """註冊服務組件"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO service_components 
                (id, name, description, category, status, dependencies, created_at)
                VALUES (?, ?, ?, ?, 'operational', ?, ?)
            ''', (
                component_id, name, description,
                category.value if isinstance(category, ComponentCategory) else category,
                json.dumps(dependencies or []), datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"註冊組件失敗: {e}")
            return False
    
    def update_component_status(
        self,
        component_id: str,
        status: ServiceStatus = None,
        uptime_percent: float = None,
        response_time_ms: float = None,
        error_rate: float = None
    ) -> bool:
        """更新組件狀態"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            updates = ["last_check = ?"]
            params = [now]
            
            if status:
                updates.append("status = ?")
                params.append(status.value if isinstance(status, ServiceStatus) else status)
            
            if uptime_percent is not None:
                updates.append("uptime_percent = ?")
                params.append(uptime_percent)
            
            if response_time_ms is not None:
                updates.append("response_time_ms = ?")
                params.append(response_time_ms)
            
            if error_rate is not None:
                updates.append("error_rate = ?")
                params.append(error_rate)
            
            params.append(component_id)
            
            cursor.execute(f'''
                UPDATE service_components SET {', '.join(updates)} WHERE id = ?
            ''', params)
            
            # 記錄歷史
            cursor.execute('SELECT status, uptime_percent, response_time_ms, error_rate FROM service_components WHERE id = ?', (component_id,))
            row = cursor.fetchone()
            
            if row:
                cursor.execute('''
                    INSERT INTO status_history 
                    (id, component_id, status, uptime_percent, response_time_ms, error_rate, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), component_id, row[0], row[1], row[2], row[3], now))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新組件狀態失敗: {e}")
            return False
    
    def get_component(self, component_id: str) -> Optional[Dict]:
        """獲取組件信息"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM service_components WHERE id = ?', (component_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "category": row[3],
                "status": row[4],
                "uptime_percent": row[5],
                "response_time_ms": row[6],
                "error_rate": row[7],
                "last_check": row[8],
                "dependencies": json.loads(row[9]) if row[9] else [],
                "created_at": row[10]
            }
        return None
    
    def list_components(self, category: ComponentCategory = None) -> List[Dict]:
        """列出所有組件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM service_components'
        params = []
        
        if category:
            query += ' WHERE category = ?'
            params.append(category.value if isinstance(category, ComponentCategory) else category)
        
        query += ' ORDER BY category, name'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "category": row[3],
            "status": row[4],
            "uptime_percent": row[5],
            "response_time_ms": row[6],
            "error_rate": row[7],
            "last_check": row[8],
            "dependencies": json.loads(row[9]) if row[9] else []
        } for row in rows]
    
    # ==================== SLA 監控 ====================
    
    def set_sla_target(
        self,
        sla_id: str,
        name: str,
        metric: str,
        target_value: float,
        period: str = "monthly"
    ) -> bool:
        """設置 SLA 目標"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO sla_targets 
                (id, name, metric, target_value, period, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (sla_id, name, metric, target_value, period, datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"設置 SLA 失敗: {e}")
            return False
    
    def update_sla_value(self, sla_id: str, current_value: float) -> Dict:
        """更新 SLA 當前值"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT target_value, metric FROM sla_targets WHERE id = ?', (sla_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {"error": "SLA not found"}
        
        target, metric = row
        
        # 確定狀態
        if metric == "error_rate":
            # 錯誤率：越低越好
            if current_value <= target:
                status = "met"
            elif current_value <= target * 1.5:
                status = "at_risk"
            else:
                status = "breached"
        elif metric == "response_time":
            # 響應時間：越低越好
            if current_value <= target:
                status = "met"
            elif current_value <= target * 1.5:
                status = "at_risk"
            else:
                status = "breached"
        else:
            # 可用性等：越高越好
            if current_value >= target:
                status = "met"
            elif current_value >= target * 0.95:
                status = "at_risk"
            else:
                status = "breached"
        
        cursor.execute('''
            UPDATE sla_targets SET current_value = ?, status = ?, updated_at = ?
            WHERE id = ?
        ''', (current_value, status, datetime.now().isoformat(), sla_id))
        
        conn.commit()
        conn.close()
        
        return {
            "sla_id": sla_id,
            "target": target,
            "current": current_value,
            "status": status
        }
    
    def get_sla_status(self) -> List[Dict]:
        """獲取所有 SLA 狀態"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sla_targets')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "metric": row[2],
            "target_value": row[3],
            "current_value": row[4],
            "period": row[5],
            "status": row[6],
            "updated_at": row[7]
        } for row in rows]
    
    # ==================== 狀態更新 ====================
    
    def create_status_update(
        self,
        title: str,
        message: str,
        status: ServiceStatus,
        affected_components: List[str] = None
    ) -> str:
        """創建狀態更新"""
        update_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO status_updates 
            (id, title, message, status, affected_components, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            update_id, title, message,
            status.value if isinstance(status, ServiceStatus) else status,
            json.dumps(affected_components or []), datetime.now().isoformat()
        ))
        
        # 更新受影響組件的狀態
        for comp_id in (affected_components or []):
            cursor.execute('''
                UPDATE service_components SET status = ? WHERE id = ?
            ''', (status.value if isinstance(status, ServiceStatus) else status, comp_id))
        
        conn.commit()
        conn.close()
        
        return update_id
    
    def resolve_status_update(self, update_id: str) -> bool:
        """解決狀態更新"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # 獲取受影響組件
            cursor.execute('SELECT affected_components FROM status_updates WHERE id = ?', (update_id,))
            row = cursor.fetchone()
            
            if row:
                affected = json.loads(row[0]) if row[0] else []
                
                # 恢復組件狀態
                for comp_id in affected:
                    cursor.execute('''
                        UPDATE service_components SET status = 'operational' WHERE id = ?
                    ''', (comp_id,))
                
                # 標記更新已解決
                cursor.execute('''
                    UPDATE status_updates SET resolved_at = ? WHERE id = ?
                ''', (datetime.now().isoformat(), update_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    def list_status_updates(self, include_resolved: bool = False, limit: int = 20) -> List[Dict]:
        """列出狀態更新"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM status_updates'
        if not include_resolved:
            query += ' WHERE resolved_at IS NULL'
        query += ' ORDER BY created_at DESC LIMIT ?'
        
        cursor.execute(query, (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "title": row[1],
            "message": row[2],
            "status": row[3],
            "affected_components": json.loads(row[4]) if row[4] else [],
            "created_at": row[5],
            "resolved_at": row[6]
        } for row in rows]
    
    # ==================== 維護窗口 ====================
    
    def schedule_maintenance(
        self,
        title: str,
        scheduled_start: str,
        scheduled_end: str,
        description: str = "",
        affected_components: List[str] = None
    ) -> str:
        """計劃維護"""
        maintenance_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO maintenance_windows 
            (id, title, description, scheduled_start, scheduled_end, affected_components, status)
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        ''', (
            maintenance_id, title, description, scheduled_start, scheduled_end,
            json.dumps(affected_components or [])
        ))
        
        conn.commit()
        conn.close()
        
        return maintenance_id
    
    def start_maintenance(self, maintenance_id: str) -> bool:
        """開始維護"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            # 獲取受影響組件
            cursor.execute('SELECT affected_components FROM maintenance_windows WHERE id = ?', (maintenance_id,))
            row = cursor.fetchone()
            
            if row:
                affected = json.loads(row[0]) if row[0] else []
                
                # 更新組件狀態為維護中
                for comp_id in affected:
                    cursor.execute('''
                        UPDATE service_components SET status = 'maintenance' WHERE id = ?
                    ''', (comp_id,))
                
                cursor.execute('''
                    UPDATE maintenance_windows SET actual_start = ?, status = 'in_progress'
                    WHERE id = ?
                ''', (now, maintenance_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    def complete_maintenance(self, maintenance_id: str) -> bool:
        """完成維護"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            # 獲取受影響組件
            cursor.execute('SELECT affected_components FROM maintenance_windows WHERE id = ?', (maintenance_id,))
            row = cursor.fetchone()
            
            if row:
                affected = json.loads(row[0]) if row[0] else []
                
                # 恢復組件狀態
                for comp_id in affected:
                    cursor.execute('''
                        UPDATE service_components SET status = 'operational' WHERE id = ?
                    ''', (comp_id,))
                
                cursor.execute('''
                    UPDATE maintenance_windows SET actual_end = ?, status = 'completed'
                    WHERE id = ?
                ''', (now, maintenance_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    def list_maintenance_windows(self, status: str = None) -> List[Dict]:
        """列出維護窗口"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM maintenance_windows'
        params = []
        
        if status:
            query += ' WHERE status = ?'
            params.append(status)
        
        query += ' ORDER BY scheduled_start DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "scheduled_start": row[3],
            "scheduled_end": row[4],
            "actual_start": row[5],
            "actual_end": row[6],
            "affected_components": json.loads(row[7]) if row[7] else [],
            "status": row[8]
        } for row in rows]
    
    # ==================== 儀表盤數據 ====================
    
    def get_dashboard_overview(self) -> Dict[str, Any]:
        """獲取儀表盤概覽"""
        components = self.list_components()
        slas = self.get_sla_status()
        updates = self.list_status_updates(include_resolved=False)
        maintenance = self.list_maintenance_windows(status='scheduled')
        
        # 計算總體狀態
        status_counts = {}
        for comp in components:
            status = comp['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # 確定系統總體狀態
        if status_counts.get('major_outage', 0) > 0:
            overall_status = 'major_outage'
        elif status_counts.get('partial_outage', 0) > 0:
            overall_status = 'partial_outage'
        elif status_counts.get('degraded', 0) > 0:
            overall_status = 'degraded'
        elif status_counts.get('maintenance', 0) > 0:
            overall_status = 'maintenance'
        else:
            overall_status = 'operational'
        
        # 計算平均可用性
        avg_uptime = sum(c['uptime_percent'] for c in components) / len(components) if components else 100
        
        # SLA 合規情況
        sla_met = len([s for s in slas if s['status'] == 'met'])
        sla_total = len(slas)
        
        return {
            "overall_status": overall_status,
            "overall_status_display": {
                'operational': '系統正常',
                'degraded': '性能下降',
                'partial_outage': '部分中斷',
                'major_outage': '嚴重中斷',
                'maintenance': '維護中'
            }.get(overall_status, overall_status),
            "components": {
                "total": len(components),
                "by_status": status_counts,
                "list": components
            },
            "sla": {
                "met": sla_met,
                "total": sla_total,
                "compliance_percent": round(sla_met / sla_total * 100, 1) if sla_total > 0 else 100,
                "details": slas
            },
            "average_uptime": round(avg_uptime, 2),
            "active_incidents": len(updates),
            "incidents": updates,
            "upcoming_maintenance": maintenance,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_component_history(
        self,
        component_id: str,
        hours: int = 24
    ) -> List[Dict]:
        """獲取組件歷史"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute('''
            SELECT status, uptime_percent, response_time_ms, error_rate, recorded_at
            FROM status_history
            WHERE component_id = ? AND recorded_at > ?
            ORDER BY recorded_at
        ''', (component_id, since))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "status": row[0],
            "uptime_percent": row[1],
            "response_time_ms": row[2],
            "error_rate": row[3],
            "recorded_at": row[4]
        } for row in rows]
    
    def generate_status_page(self) -> Dict[str, Any]:
        """生成公共狀態頁面數據"""
        overview = self.get_dashboard_overview()
        
        # 簡化數據用於公開展示
        public_components = []
        for comp in overview['components']['list']:
            public_components.append({
                "name": comp['name'],
                "status": comp['status'],
                "status_display": {
                    'operational': '正常',
                    'degraded': '降級',
                    'partial_outage': '部分中斷',
                    'major_outage': '中斷',
                    'maintenance': '維護中'
                }.get(comp['status'], comp['status'])
            })
        
        # 最近更新（僅顯示公開信息）
        public_updates = []
        for update in overview['incidents'][:5]:
            public_updates.append({
                "title": update['title'],
                "status": update['status'],
                "created_at": update['created_at']
            })
        
        return {
            "overall_status": overview['overall_status'],
            "overall_status_display": overview['overall_status_display'],
            "components": public_components,
            "recent_updates": public_updates,
            "uptime_90_days": overview['average_uptime'],
            "last_updated": datetime.now().isoformat()
        }


# 獲取單例
def get_dashboard_manager() -> ServiceDashboardManager:
    return ServiceDashboardManager()

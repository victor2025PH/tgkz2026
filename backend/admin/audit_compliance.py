"""
審計合規系統

功能：
- 操作軌跡完整記錄
- 操作回放功能
- 合規報告生成
- 數據保留策略
- 審計日誌查詢和導出
"""

import asyncio
import logging
import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import csv
import io

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'audit_compliance.db')


class AuditCategory(str, Enum):
    """審計類別"""
    API_POOL = "api_pool"           # API 池操作
    USER_MANAGEMENT = "user_mgmt"    # 用戶管理
    SYSTEM_CONFIG = "system_config"  # 系統配置
    BILLING = "billing"              # 計費相關
    SECURITY = "security"            # 安全相關
    DATA_ACCESS = "data_access"      # 數據訪問


class ComplianceLevel(str, Enum):
    """合規等級"""
    INFO = "info"           # 信息性
    NORMAL = "normal"       # 一般操作
    SENSITIVE = "sensitive" # 敏感操作
    CRITICAL = "critical"   # 關鍵操作


@dataclass
class AuditEntry:
    """審計條目"""
    id: str
    timestamp: str
    actor_id: str                    # 操作者 ID
    actor_type: str = "admin"        # admin/system/api
    actor_name: str = ""
    action: str = ""                 # 操作類型
    category: str = ""               # 審計類別
    resource_type: str = ""          # 資源類型
    resource_id: str = ""            # 資源 ID
    before_state: Dict = field(default_factory=dict)  # 操作前狀態
    after_state: Dict = field(default_factory=dict)   # 操作後狀態
    ip_address: str = ""
    user_agent: str = ""
    compliance_level: str = "normal"
    success: bool = True
    error_message: str = ""
    metadata: Dict = field(default_factory=dict)
    checksum: str = ""               # 完整性校驗


@dataclass
class ComplianceReport:
    """合規報告"""
    id: str
    report_type: str               # daily/weekly/monthly/custom
    period_start: str
    period_end: str
    generated_at: str
    generated_by: str
    summary: Dict = field(default_factory=dict)
    details: List = field(default_factory=list)
    compliance_score: float = 100.0
    findings: List = field(default_factory=list)
    recommendations: List = field(default_factory=list)


class AuditComplianceManager:
    """審計合規管理器"""
    
    _instance = None
    
    # 數據保留策略（天）
    RETENTION_POLICIES = {
        ComplianceLevel.INFO: 30,
        ComplianceLevel.NORMAL: 90,
        ComplianceLevel.SENSITIVE: 365,
        ComplianceLevel.CRITICAL: 730  # 2 年
    }
    
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
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 審計日誌表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                actor_type TEXT DEFAULT 'admin',
                actor_name TEXT DEFAULT '',
                action TEXT NOT NULL,
                category TEXT DEFAULT '',
                resource_type TEXT DEFAULT '',
                resource_id TEXT DEFAULT '',
                before_state TEXT DEFAULT '{}',
                after_state TEXT DEFAULT '{}',
                ip_address TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                compliance_level TEXT DEFAULT 'normal',
                success INTEGER DEFAULT 1,
                error_message TEXT DEFAULT '',
                metadata TEXT DEFAULT '{}',
                checksum TEXT DEFAULT ''
            )
        ''')
        
        # 合規報告表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS compliance_reports (
                id TEXT PRIMARY KEY,
                report_type TEXT NOT NULL,
                period_start TEXT,
                period_end TEXT,
                generated_at TEXT,
                generated_by TEXT,
                summary TEXT DEFAULT '{}',
                details TEXT DEFAULT '[]',
                compliance_score REAL DEFAULT 100,
                findings TEXT DEFAULT '[]',
                recommendations TEXT DEFAULT '[]'
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_logs(compliance_level)')
        
        conn.commit()
        conn.close()
        logger.info("審計合規數據庫已初始化")
    
    def _generate_checksum(self, entry: AuditEntry) -> str:
        """生成完整性校驗碼"""
        data = f"{entry.id}{entry.timestamp}{entry.actor_id}{entry.action}{entry.resource_id}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    # ==================== 審計記錄 ====================
    
    def log_action(
        self,
        actor_id: str,
        action: str,
        category: AuditCategory,
        resource_type: str = "",
        resource_id: str = "",
        before_state: Dict = None,
        after_state: Dict = None,
        ip_address: str = "",
        user_agent: str = "",
        compliance_level: ComplianceLevel = ComplianceLevel.NORMAL,
        success: bool = True,
        error_message: str = "",
        metadata: Dict = None,
        actor_type: str = "admin",
        actor_name: str = ""
    ) -> str:
        """記錄審計日誌"""
        import uuid
        entry_id = str(uuid.uuid4())
        
        entry = AuditEntry(
            id=entry_id,
            timestamp=datetime.now().isoformat(),
            actor_id=actor_id,
            actor_type=actor_type,
            actor_name=actor_name,
            action=action,
            category=category.value if isinstance(category, AuditCategory) else category,
            resource_type=resource_type,
            resource_id=resource_id,
            before_state=before_state or {},
            after_state=after_state or {},
            ip_address=ip_address,
            user_agent=user_agent,
            compliance_level=compliance_level.value if isinstance(compliance_level, ComplianceLevel) else compliance_level,
            success=success,
            error_message=error_message,
            metadata=metadata or {}
        )
        
        entry.checksum = self._generate_checksum(entry)
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO audit_logs 
                (id, timestamp, actor_id, actor_type, actor_name, action, category,
                 resource_type, resource_id, before_state, after_state, ip_address,
                 user_agent, compliance_level, success, error_message, metadata, checksum)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entry.id, entry.timestamp, entry.actor_id, entry.actor_type, entry.actor_name,
                entry.action, entry.category, entry.resource_type, entry.resource_id,
                json.dumps(entry.before_state), json.dumps(entry.after_state),
                entry.ip_address, entry.user_agent, entry.compliance_level,
                1 if entry.success else 0, entry.error_message,
                json.dumps(entry.metadata), entry.checksum
            ))
            
            conn.commit()
            conn.close()
            
            return entry_id
        except Exception as e:
            logger.error(f"記錄審計日誌失敗: {e}")
            return ""
    
    def query_logs(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        actor_id: Optional[str] = None,
        category: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        compliance_level: Optional[str] = None,
        success_only: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict], int]:
        """查詢審計日誌"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM audit_logs WHERE 1=1'
        count_query = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1'
        params = []
        
        if start_date:
            query += ' AND timestamp >= ?'
            count_query += ' AND timestamp >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND timestamp <= ?'
            count_query += ' AND timestamp <= ?'
            params.append(end_date)
        
        if actor_id:
            query += ' AND actor_id = ?'
            count_query += ' AND actor_id = ?'
            params.append(actor_id)
        
        if category:
            query += ' AND category = ?'
            count_query += ' AND category = ?'
            params.append(category)
        
        if resource_type:
            query += ' AND resource_type = ?'
            count_query += ' AND resource_type = ?'
            params.append(resource_type)
        
        if resource_id:
            query += ' AND resource_id = ?'
            count_query += ' AND resource_id = ?'
            params.append(resource_id)
        
        if compliance_level:
            query += ' AND compliance_level = ?'
            count_query += ' AND compliance_level = ?'
            params.append(compliance_level)
        
        if success_only is not None:
            query += ' AND success = ?'
            count_query += ' AND success = ?'
            params.append(1 if success_only else 0)
        
        # 獲取總數
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # 獲取數據
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        logs = [{
            "id": row[0],
            "timestamp": row[1],
            "actor_id": row[2],
            "actor_type": row[3],
            "actor_name": row[4],
            "action": row[5],
            "category": row[6],
            "resource_type": row[7],
            "resource_id": row[8],
            "before_state": json.loads(row[9]) if row[9] else {},
            "after_state": json.loads(row[10]) if row[10] else {},
            "ip_address": row[11],
            "user_agent": row[12],
            "compliance_level": row[13],
            "success": bool(row[14]),
            "error_message": row[15],
            "metadata": json.loads(row[16]) if row[16] else {},
            "checksum": row[17]
        } for row in rows]
        
        return logs, total
    
    def get_resource_history(self, resource_type: str, resource_id: str) -> List[Dict]:
        """獲取資源的操作歷史（用於回放）"""
        logs, _ = self.query_logs(
            resource_type=resource_type,
            resource_id=resource_id,
            limit=1000
        )
        return logs
    
    def verify_integrity(self, log_id: str) -> Tuple[bool, str]:
        """驗證日誌完整性"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM audit_logs WHERE id = ?', (log_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return False, "日誌不存在"
        
        entry = AuditEntry(
            id=row[0],
            timestamp=row[1],
            actor_id=row[2],
            actor_type=row[3],
            actor_name=row[4],
            action=row[5],
            resource_id=row[8]
        )
        
        expected_checksum = self._generate_checksum(entry)
        actual_checksum = row[17]
        
        if expected_checksum == actual_checksum:
            return True, "完整性驗證通過"
        else:
            return False, "完整性驗證失敗，數據可能被篡改"
    
    # ==================== 合規報告 ====================
    
    def generate_compliance_report(
        self,
        report_type: str,
        period_start: str,
        period_end: str,
        generated_by: str
    ) -> ComplianceReport:
        """生成合規報告"""
        import uuid
        
        # 獲取期間內的所有日誌
        logs, total = self.query_logs(
            start_date=period_start,
            end_date=period_end,
            limit=10000
        )
        
        # 統計分析
        summary = {
            "total_operations": total,
            "successful": sum(1 for l in logs if l['success']),
            "failed": sum(1 for l in logs if not l['success']),
            "by_category": {},
            "by_level": {},
            "by_actor": {},
            "sensitive_operations": 0,
            "critical_operations": 0
        }
        
        for log in logs:
            # 按類別統計
            cat = log['category']
            summary['by_category'][cat] = summary['by_category'].get(cat, 0) + 1
            
            # 按等級統計
            level = log['compliance_level']
            summary['by_level'][level] = summary['by_level'].get(level, 0) + 1
            
            # 按操作者統計
            actor = log['actor_id']
            if actor not in summary['by_actor']:
                summary['by_actor'][actor] = {"count": 0, "name": log.get('actor_name', '')}
            summary['by_actor'][actor]['count'] += 1
            
            # 統計敏感和關鍵操作
            if level == 'sensitive':
                summary['sensitive_operations'] += 1
            elif level == 'critical':
                summary['critical_operations'] += 1
        
        # 計算合規分數
        compliance_score = 100.0
        findings = []
        recommendations = []
        
        # 檢查失敗操作比例
        if total > 0:
            failure_rate = summary['failed'] / total * 100
            if failure_rate > 10:
                compliance_score -= 20
                findings.append(f"失敗操作比例過高: {failure_rate:.1f}%")
                recommendations.append("檢查並解決導致操作失敗的根本原因")
            elif failure_rate > 5:
                compliance_score -= 10
                findings.append(f"失敗操作比例偏高: {failure_rate:.1f}%")
        
        # 檢查關鍵操作
        if summary['critical_operations'] > 10:
            findings.append(f"關鍵操作數量: {summary['critical_operations']}")
            recommendations.append("審查關鍵操作的必要性和授權情況")
        
        # 檢查異常時間操作
        off_hours_ops = sum(
            1 for l in logs 
            if self._is_off_hours(l['timestamp'])
        )
        if off_hours_ops > total * 0.3:
            compliance_score -= 5
            findings.append(f"非工作時間操作比例: {off_hours_ops/total*100:.1f}%")
            recommendations.append("審查非工作時間的系統訪問")
        
        # 創建報告
        report = ComplianceReport(
            id=str(uuid.uuid4()),
            report_type=report_type,
            period_start=period_start,
            period_end=period_end,
            generated_at=datetime.now().isoformat(),
            generated_by=generated_by,
            summary=summary,
            details=logs[:100],  # 只包含前 100 條
            compliance_score=max(0, compliance_score),
            findings=findings,
            recommendations=recommendations
        )
        
        # 保存報告
        self._save_report(report)
        
        return report
    
    def _is_off_hours(self, timestamp: str) -> bool:
        """檢查是否為非工作時間"""
        try:
            dt = datetime.fromisoformat(timestamp)
            hour = dt.hour
            # 非工作時間：22:00 - 08:00 或週末
            return hour < 8 or hour >= 22 or dt.weekday() >= 5
        except:
            return False
    
    def _save_report(self, report: ComplianceReport):
        """保存報告"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO compliance_reports 
            (id, report_type, period_start, period_end, generated_at, generated_by,
             summary, details, compliance_score, findings, recommendations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            report.id, report.report_type, report.period_start, report.period_end,
            report.generated_at, report.generated_by,
            json.dumps(report.summary), json.dumps(report.details),
            report.compliance_score, json.dumps(report.findings),
            json.dumps(report.recommendations)
        ))
        
        conn.commit()
        conn.close()
    
    def list_reports(self, limit: int = 50) -> List[Dict]:
        """列出報告"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, report_type, period_start, period_end, generated_at, 
                   generated_by, compliance_score
            FROM compliance_reports
            ORDER BY generated_at DESC LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "report_type": row[1],
            "period_start": row[2],
            "period_end": row[3],
            "generated_at": row[4],
            "generated_by": row[5],
            "compliance_score": row[6]
        } for row in rows]
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        """獲取報告詳情"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM compliance_reports WHERE id = ?', (report_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "report_type": row[1],
                "period_start": row[2],
                "period_end": row[3],
                "generated_at": row[4],
                "generated_by": row[5],
                "summary": json.loads(row[6]) if row[6] else {},
                "details": json.loads(row[7]) if row[7] else [],
                "compliance_score": row[8],
                "findings": json.loads(row[9]) if row[9] else [],
                "recommendations": json.loads(row[10]) if row[10] else []
            }
        return None
    
    # ==================== 導出功能 ====================
    
    def export_logs_csv(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """導出日誌為 CSV"""
        logs, _ = self.query_logs(
            start_date=start_date,
            end_date=end_date,
            category=category,
            limit=10000
        )
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 寫入標題
        writer.writerow([
            'ID', '時間', '操作者ID', '操作者類型', '操作者名稱',
            '操作', '類別', '資源類型', '資源ID', 'IP地址',
            '合規等級', '成功', '錯誤信息'
        ])
        
        # 寫入數據
        for log in logs:
            writer.writerow([
                log['id'], log['timestamp'], log['actor_id'], log['actor_type'],
                log['actor_name'], log['action'], log['category'],
                log['resource_type'], log['resource_id'], log['ip_address'],
                log['compliance_level'], '是' if log['success'] else '否',
                log['error_message']
            ])
        
        return output.getvalue()
    
    def export_report_pdf_data(self, report_id: str) -> Dict:
        """準備報告的 PDF 數據（前端渲染）"""
        report = self.get_report(report_id)
        if not report:
            return {}
        
        return {
            "title": f"合規審計報告 - {report['report_type'].upper()}",
            "period": f"{report['period_start']} 至 {report['period_end']}",
            "generated": report['generated_at'],
            "score": report['compliance_score'],
            "summary": report['summary'],
            "findings": report['findings'],
            "recommendations": report['recommendations'],
            "top_actors": sorted(
                report['summary'].get('by_actor', {}).items(),
                key=lambda x: x[1]['count'],
                reverse=True
            )[:10]
        }
    
    # ==================== 數據保留 ====================
    
    def apply_retention_policy(self) -> Dict[str, int]:
        """應用數據保留策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        deleted_counts = {}
        
        for level, days in self.RETENTION_POLICIES.items():
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute('''
                DELETE FROM audit_logs 
                WHERE compliance_level = ? AND timestamp < ?
            ''', (level.value, cutoff))
            
            deleted_counts[level.value] = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        total_deleted = sum(deleted_counts.values())
        logger.info(f"數據保留策略已應用，刪除 {total_deleted} 條過期日誌")
        
        return deleted_counts
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """獲取存儲統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 總記錄數
        cursor.execute('SELECT COUNT(*) FROM audit_logs')
        total_logs = cursor.fetchone()[0]
        
        # 按等級統計
        cursor.execute('''
            SELECT compliance_level, COUNT(*) FROM audit_logs GROUP BY compliance_level
        ''')
        by_level = dict(cursor.fetchall())
        
        # 最早記錄
        cursor.execute('SELECT MIN(timestamp) FROM audit_logs')
        oldest = cursor.fetchone()[0]
        
        # 報告數量
        cursor.execute('SELECT COUNT(*) FROM compliance_reports')
        total_reports = cursor.fetchone()[0]
        
        conn.close()
        
        # 估算存儲大小
        if os.path.exists(DB_PATH):
            db_size = os.path.getsize(DB_PATH)
        else:
            db_size = 0
        
        return {
            "total_logs": total_logs,
            "by_level": by_level,
            "oldest_record": oldest,
            "total_reports": total_reports,
            "database_size_mb": round(db_size / 1024 / 1024, 2),
            "retention_policies": {k.value: v for k, v in self.RETENTION_POLICIES.items()}
        }


# 獲取單例
def get_audit_manager() -> AuditComplianceManager:
    return AuditComplianceManager()

"""
智能報告生成器

功能：
- 自動化報告生成
- 多維度數據匯總
- 智能洞察提取
- 報告模板管理
- 定時報告調度
- 報告導出
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
import csv
import io

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'reports.db')


class ReportType(str, Enum):
    """報告類型"""
    DAILY_SUMMARY = "daily_summary"
    WEEKLY_REVIEW = "weekly_review"
    MONTHLY_ANALYSIS = "monthly_analysis"
    INCIDENT_REPORT = "incident_report"
    PERFORMANCE_REPORT = "performance_report"
    COST_REPORT = "cost_report"
    SECURITY_REPORT = "security_report"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    """報告格式"""
    JSON = "json"
    HTML = "html"
    MARKDOWN = "markdown"
    CSV = "csv"


class InsightType(str, Enum):
    """洞察類型"""
    TREND = "trend"
    ANOMALY = "anomaly"
    RECOMMENDATION = "recommendation"
    WARNING = "warning"
    ACHIEVEMENT = "achievement"


@dataclass
class ReportSection:
    """報告章節"""
    title: str
    content: str
    data: Dict = field(default_factory=dict)
    charts: List[Dict] = field(default_factory=list)
    insights: List[Dict] = field(default_factory=list)


@dataclass
class Report:
    """報告"""
    id: str
    title: str
    report_type: ReportType
    period_start: str
    period_end: str
    sections: List[ReportSection] = field(default_factory=list)
    summary: str = ""
    insights: List[Dict] = field(default_factory=list)
    generated_at: str = ""
    format: ReportFormat = ReportFormat.JSON


class InsightEngine:
    """洞察引擎"""
    
    def __init__(self):
        self._insight_rules = []
    
    def extract_insights(self, data: Dict[str, Any]) -> List[Dict]:
        """從數據中提取洞察"""
        insights = []
        
        # 趨勢洞察
        trends = self._analyze_trends(data)
        insights.extend(trends)
        
        # 異常洞察
        anomalies = self._analyze_anomalies(data)
        insights.extend(anomalies)
        
        # 建議洞察
        recommendations = self._generate_recommendations(data)
        insights.extend(recommendations)
        
        # 成就洞察
        achievements = self._check_achievements(data)
        insights.extend(achievements)
        
        # 按重要性排序
        insights.sort(key=lambda x: x.get("importance", 0), reverse=True)
        
        return insights
    
    def _analyze_trends(self, data: Dict) -> List[Dict]:
        """分析趨勢"""
        insights = []
        
        # 檢查各種趨勢指標
        if "daily_trend" in data:
            trend = data["daily_trend"]
            if isinstance(trend, list) and len(trend) >= 2:
                first = trend[0].get("value", 0) if isinstance(trend[0], dict) else trend[0]
                last = trend[-1].get("value", 0) if isinstance(trend[-1], dict) else trend[-1]
                
                if first != 0:
                    change = (last - first) / first * 100
                    
                    if change > 20:
                        insights.append({
                            "type": InsightType.TREND.value,
                            "title": "顯著增長",
                            "description": f"相比期初增長了 {change:.1f}%",
                            "importance": 4,
                            "data": {"change_percent": change}
                        })
                    elif change < -20:
                        insights.append({
                            "type": InsightType.WARNING.value,
                            "title": "顯著下降",
                            "description": f"相比期初下降了 {abs(change):.1f}%",
                            "importance": 5,
                            "data": {"change_percent": change}
                        })
        
        return insights
    
    def _analyze_anomalies(self, data: Dict) -> List[Dict]:
        """分析異常"""
        insights = []
        
        if "anomalies" in data and data["anomalies"]:
            count = len(data["anomalies"])
            insights.append({
                "type": InsightType.ANOMALY.value,
                "title": f"檢測到 {count} 個異常",
                "description": "系統檢測到異常行為，建議關注",
                "importance": 5,
                "data": {"count": count}
            })
        
        if "error_rate" in data:
            err_rate = data["error_rate"]
            if isinstance(err_rate, dict):
                err_rate = err_rate.get("mean", 0)
            
            if err_rate > 5:
                insights.append({
                    "type": InsightType.WARNING.value,
                    "title": "錯誤率過高",
                    "description": f"當前錯誤率 {err_rate:.1f}%，超過 5% 閾值",
                    "importance": 5,
                    "data": {"error_rate": err_rate}
                })
        
        return insights
    
    def _generate_recommendations(self, data: Dict) -> List[Dict]:
        """生成建議"""
        insights = []
        
        # 容量建議
        if "utilization" in data:
            util = data["utilization"]
            if util > 80:
                insights.append({
                    "type": InsightType.RECOMMENDATION.value,
                    "title": "建議擴容",
                    "description": f"資源利用率達 {util:.1f}%，建議提前規劃擴容",
                    "importance": 4,
                    "data": {"utilization": util}
                })
        
        # 成本建議
        if "potential_savings" in data and data["potential_savings"] > 0:
            savings = data["potential_savings"]
            insights.append({
                "type": InsightType.RECOMMENDATION.value,
                "title": "成本優化機會",
                "description": f"發現潛在節省 ${savings:.2f}，建議查看優化建議",
                "importance": 3,
                "data": {"savings": savings}
            })
        
        return insights
    
    def _check_achievements(self, data: Dict) -> List[Dict]:
        """檢查成就"""
        insights = []
        
        # SLA 達成
        if "sla_compliance" in data:
            compliance = data["sla_compliance"]
            if compliance >= 99.9:
                insights.append({
                    "type": InsightType.ACHIEVEMENT.value,
                    "title": "卓越 SLA 達成",
                    "description": f"SLA 合規率達 {compliance:.2f}%",
                    "importance": 2,
                    "data": {"compliance": compliance}
                })
        
        # 零事件
        if "incident_count" in data and data["incident_count"] == 0:
            insights.append({
                "type": InsightType.ACHIEVEMENT.value,
                "title": "零事件記錄",
                "description": "報告期間無重大事件發生",
                "importance": 2,
                "data": {}
            })
        
        return insights


class ReportGenerator:
    """報告生成器"""
    
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
        self.insight_engine = InsightEngine()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 報告表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                report_type TEXT,
                period_start TEXT,
                period_end TEXT,
                summary TEXT,
                sections TEXT DEFAULT '[]',
                insights TEXT DEFAULT '[]',
                format TEXT DEFAULT 'json',
                generated_at TEXT,
                tenant_id TEXT
            )
        ''')
        
        # 報告模板表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS report_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                report_type TEXT,
                description TEXT,
                config TEXT DEFAULT '{}',
                is_default INTEGER DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        # 報告調度表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS report_schedules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                template_id TEXT,
                cron_expression TEXT,
                recipients TEXT DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                last_run TEXT,
                next_run TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_report_type ON reports(report_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_report_time ON reports(generated_at)')
        
        conn.commit()
        conn.close()
        
        # 初始化默認模板
        self._init_default_templates()
        logger.info("報告生成數據庫已初始化")
    
    def _init_default_templates(self):
        """初始化默認模板"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM report_templates')
        if cursor.fetchone()[0] == 0:
            templates = [
                ("daily_summary", ReportType.DAILY_SUMMARY.value, "每日運營摘要", {
                    "sections": ["overview", "api_stats", "error_summary", "top_users"],
                    "period": "daily"
                }),
                ("weekly_review", ReportType.WEEKLY_REVIEW.value, "每週業務回顧", {
                    "sections": ["executive_summary", "trends", "incidents", "recommendations"],
                    "period": "weekly"
                }),
                ("monthly_analysis", ReportType.MONTHLY_ANALYSIS.value, "月度分析報告", {
                    "sections": ["summary", "growth_metrics", "performance", "cost", "forecast"],
                    "period": "monthly"
                }),
            ]
            
            now = datetime.now().isoformat()
            for name, report_type, desc, config in templates:
                cursor.execute('''
                    INSERT INTO report_templates (id, name, report_type, description, config, is_default, created_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                ''', (str(uuid.uuid4()), name, report_type, desc, json.dumps(config), now))
        
        conn.commit()
        conn.close()
    
    # ==================== 報告生成 ====================
    
    def generate_daily_summary(
        self,
        date: str = None,
        tenant_id: str = ""
    ) -> str:
        """生成每日摘要"""
        if not date:
            date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        period_start = f"{date}T00:00:00"
        period_end = f"{date}T23:59:59"
        
        # 收集數據
        data = self._collect_daily_data(period_start, period_end, tenant_id)
        
        # 生成報告
        sections = []
        
        # 概覽章節
        sections.append(self._generate_overview_section(data))
        
        # API 統計章節
        sections.append(self._generate_api_stats_section(data))
        
        # 錯誤摘要章節
        sections.append(self._generate_error_summary_section(data))
        
        # 提取洞察
        insights = self.insight_engine.extract_insights(data)
        
        # 生成摘要
        summary = self._generate_summary(data, insights)
        
        # 保存報告
        report_id = self._save_report(
            title=f"每日運營摘要 - {date}",
            report_type=ReportType.DAILY_SUMMARY,
            period_start=period_start,
            period_end=period_end,
            sections=sections,
            summary=summary,
            insights=insights,
            tenant_id=tenant_id
        )
        
        return report_id
    
    def generate_weekly_review(
        self,
        week_start: str = None,
        tenant_id: str = ""
    ) -> str:
        """生成每週回顧"""
        if not week_start:
            today = datetime.now()
            week_start_dt = today - timedelta(days=today.weekday() + 7)  # 上週一
            week_start = week_start_dt.strftime("%Y-%m-%d")
        
        week_start_dt = datetime.strptime(week_start, "%Y-%m-%d")
        week_end_dt = week_start_dt + timedelta(days=6)
        
        period_start = f"{week_start}T00:00:00"
        period_end = f"{week_end_dt.strftime('%Y-%m-%d')}T23:59:59"
        
        # 收集數據
        data = self._collect_weekly_data(period_start, period_end, tenant_id)
        
        # 生成報告章節
        sections = []
        
        # 執行摘要
        sections.append(self._generate_executive_summary_section(data))
        
        # 趨勢分析
        sections.append(self._generate_trends_section(data))
        
        # 事件回顧
        sections.append(self._generate_incidents_section(data))
        
        # 建議
        sections.append(self._generate_recommendations_section(data))
        
        # 提取洞察
        insights = self.insight_engine.extract_insights(data)
        
        # 生成摘要
        summary = self._generate_summary(data, insights)
        
        # 保存報告
        report_id = self._save_report(
            title=f"每週回顧 - {week_start} 至 {week_end_dt.strftime('%Y-%m-%d')}",
            report_type=ReportType.WEEKLY_REVIEW,
            period_start=period_start,
            period_end=period_end,
            sections=sections,
            summary=summary,
            insights=insights,
            tenant_id=tenant_id
        )
        
        return report_id
    
    def generate_custom_report(
        self,
        title: str,
        period_start: str,
        period_end: str,
        sections_config: List[str],
        tenant_id: str = ""
    ) -> str:
        """生成自定義報告"""
        data = self._collect_custom_data(period_start, period_end, sections_config, tenant_id)
        
        sections = []
        for section_name in sections_config:
            section = self._generate_section_by_name(section_name, data)
            if section:
                sections.append(section)
        
        insights = self.insight_engine.extract_insights(data)
        summary = self._generate_summary(data, insights)
        
        report_id = self._save_report(
            title=title,
            report_type=ReportType.CUSTOM,
            period_start=period_start,
            period_end=period_end,
            sections=sections,
            summary=summary,
            insights=insights,
            tenant_id=tenant_id
        )
        
        return report_id
    
    # ==================== 數據收集 ====================
    
    def _collect_daily_data(
        self,
        period_start: str,
        period_end: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """收集每日數據"""
        # 模擬數據收集（實際應從各模塊獲取）
        return {
            "period": {"start": period_start, "end": period_end},
            "api_calls": 15234,
            "unique_users": 456,
            "new_users": 23,
            "error_rate": 0.5,
            "avg_latency_ms": 123,
            "active_apis": 45,
            "total_cost": 125.50,
            "daily_trend": [
                {"hour": "00:00", "value": 450},
                {"hour": "06:00", "value": 320},
                {"hour": "12:00", "value": 890},
                {"hour": "18:00", "value": 1200},
            ],
            "top_endpoints": [
                {"endpoint": "/api/login", "calls": 3456},
                {"endpoint": "/api/data", "calls": 2345},
            ],
            "incident_count": 0,
            "sla_compliance": 99.95
        }
    
    def _collect_weekly_data(
        self,
        period_start: str,
        period_end: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """收集每週數據"""
        return {
            "period": {"start": period_start, "end": period_end},
            "api_calls": 98765,
            "unique_users": 1234,
            "new_users": 156,
            "error_rate": 0.3,
            "avg_latency_ms": 115,
            "active_apis": 48,
            "total_cost": 856.25,
            "daily_trend": [
                {"day": "Mon", "value": 14500},
                {"day": "Tue", "value": 15200},
                {"day": "Wed", "value": 14800},
                {"day": "Thu", "value": 15600},
                {"day": "Fri", "value": 16200},
                {"day": "Sat", "value": 11500},
                {"day": "Sun", "value": 10965},
            ],
            "utilization": 72,
            "potential_savings": 45.50,
            "incident_count": 1,
            "incidents": [{"title": "API 響應緩慢", "duration_min": 15}],
            "sla_compliance": 99.85
        }
    
    def _collect_custom_data(
        self,
        period_start: str,
        period_end: str,
        sections: List[str],
        tenant_id: str
    ) -> Dict[str, Any]:
        """收集自定義數據"""
        data = {"period": {"start": period_start, "end": period_end}}
        
        if "performance" in sections:
            data["performance"] = {"avg_latency": 120, "p99_latency": 450, "throughput": 1500}
        
        if "cost" in sections:
            data["cost"] = {"total": 500, "by_type": {"api": 300, "storage": 100, "network": 100}}
        
        if "security" in sections:
            data["security"] = {"failed_logins": 12, "suspicious_activities": 3}
        
        return data
    
    # ==================== 章節生成 ====================
    
    def _generate_overview_section(self, data: Dict) -> Dict:
        """生成概覽章節"""
        return {
            "title": "概覽",
            "content": f"今日 API 調用 {data.get('api_calls', 0):,} 次，"
                       f"活躍用戶 {data.get('unique_users', 0)} 人，"
                       f"新增用戶 {data.get('new_users', 0)} 人。",
            "data": {
                "api_calls": data.get("api_calls", 0),
                "unique_users": data.get("unique_users", 0),
                "new_users": data.get("new_users", 0)
            },
            "charts": [{"type": "stat_cards", "data": ["api_calls", "unique_users", "new_users"]}],
            "insights": []
        }
    
    def _generate_api_stats_section(self, data: Dict) -> Dict:
        """生成 API 統計章節"""
        return {
            "title": "API 統計",
            "content": f"平均延遲 {data.get('avg_latency_ms', 0)} ms，"
                       f"活躍 API 數量 {data.get('active_apis', 0)}。",
            "data": {
                "avg_latency_ms": data.get("avg_latency_ms", 0),
                "active_apis": data.get("active_apis", 0),
                "top_endpoints": data.get("top_endpoints", [])
            },
            "charts": [
                {"type": "line", "title": "調用趨勢", "data": data.get("daily_trend", [])},
                {"type": "bar", "title": "熱門端點", "data": data.get("top_endpoints", [])}
            ],
            "insights": []
        }
    
    def _generate_error_summary_section(self, data: Dict) -> Dict:
        """生成錯誤摘要章節"""
        error_rate = data.get("error_rate", 0)
        status = "良好" if error_rate < 1 else "需關注" if error_rate < 5 else "異常"
        
        return {
            "title": "錯誤摘要",
            "content": f"錯誤率 {error_rate}%，狀態：{status}。",
            "data": {"error_rate": error_rate, "status": status},
            "charts": [],
            "insights": [] if error_rate < 1 else [{"type": "warning", "message": f"錯誤率偏高：{error_rate}%"}]
        }
    
    def _generate_executive_summary_section(self, data: Dict) -> Dict:
        """生成執行摘要章節"""
        return {
            "title": "執行摘要",
            "content": f"本週 API 總調用量 {data.get('api_calls', 0):,} 次，"
                       f"SLA 合規率 {data.get('sla_compliance', 0)}%，"
                       f"總成本 ${data.get('total_cost', 0):.2f}。",
            "data": {
                "api_calls": data.get("api_calls", 0),
                "sla_compliance": data.get("sla_compliance", 0),
                "total_cost": data.get("total_cost", 0)
            },
            "charts": [],
            "insights": []
        }
    
    def _generate_trends_section(self, data: Dict) -> Dict:
        """生成趨勢章節"""
        daily_trend = data.get("daily_trend", [])
        
        return {
            "title": "趨勢分析",
            "content": "本週各日調用量變化如下。",
            "data": {"daily_trend": daily_trend},
            "charts": [{"type": "line", "title": "每日調用趨勢", "data": daily_trend}],
            "insights": []
        }
    
    def _generate_incidents_section(self, data: Dict) -> Dict:
        """生成事件章節"""
        incidents = data.get("incidents", [])
        count = data.get("incident_count", 0)
        
        return {
            "title": "事件回顧",
            "content": f"本週共發生 {count} 起事件。" if count > 0 else "本週無重大事件發生。",
            "data": {"incidents": incidents, "count": count},
            "charts": [],
            "insights": []
        }
    
    def _generate_recommendations_section(self, data: Dict) -> Dict:
        """生成建議章節"""
        recommendations = []
        
        if data.get("utilization", 0) > 70:
            recommendations.append("資源利用率較高，建議評估擴容需求")
        
        if data.get("error_rate", 0) > 1:
            recommendations.append("錯誤率偏高，建議排查根因")
        
        if data.get("potential_savings", 0) > 0:
            recommendations.append(f"發現 ${data['potential_savings']:.2f} 的成本優化機會")
        
        return {
            "title": "建議",
            "content": "基於本週數據分析，以下是我們的建議：",
            "data": {"recommendations": recommendations},
            "charts": [],
            "insights": [{"type": "recommendation", "message": r} for r in recommendations]
        }
    
    def _generate_section_by_name(self, name: str, data: Dict) -> Optional[Dict]:
        """根據名稱生成章節"""
        generators = {
            "overview": self._generate_overview_section,
            "api_stats": self._generate_api_stats_section,
            "error_summary": self._generate_error_summary_section,
            "executive_summary": self._generate_executive_summary_section,
            "trends": self._generate_trends_section,
            "incidents": self._generate_incidents_section,
            "recommendations": self._generate_recommendations_section,
        }
        
        generator = generators.get(name)
        if generator:
            return generator(data)
        return None
    
    def _generate_summary(self, data: Dict, insights: List[Dict]) -> str:
        """生成報告摘要"""
        parts = []
        
        if "api_calls" in data:
            parts.append(f"API 調用 {data['api_calls']:,} 次")
        
        if "error_rate" in data:
            parts.append(f"錯誤率 {data['error_rate']}%")
        
        if "sla_compliance" in data:
            parts.append(f"SLA 合規 {data['sla_compliance']}%")
        
        summary = "，".join(parts) + "。"
        
        # 添加關鍵洞察
        key_insights = [i for i in insights if i.get("importance", 0) >= 4]
        if key_insights:
            summary += f" 發現 {len(key_insights)} 個重要事項需要關注。"
        
        return summary
    
    # ==================== 報告存儲 ====================
    
    def _save_report(
        self,
        title: str,
        report_type: ReportType,
        period_start: str,
        period_end: str,
        sections: List[Dict],
        summary: str,
        insights: List[Dict],
        tenant_id: str = ""
    ) -> str:
        """保存報告"""
        report_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO reports 
            (id, title, report_type, period_start, period_end, summary, sections, insights, generated_at, tenant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            report_id, title, report_type.value, period_start, period_end,
            summary, json.dumps(sections), json.dumps(insights),
            datetime.now().isoformat(), tenant_id
        ))
        
        conn.commit()
        conn.close()
        
        return report_id
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        """獲取報告"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM reports WHERE id = ?', (report_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "title": row[1],
                "report_type": row[2],
                "period_start": row[3],
                "period_end": row[4],
                "summary": row[5],
                "sections": json.loads(row[6]) if row[6] else [],
                "insights": json.loads(row[7]) if row[7] else [],
                "format": row[8],
                "generated_at": row[9],
                "tenant_id": row[10]
            }
        return None
    
    def list_reports(
        self,
        report_type: ReportType = None,
        tenant_id: str = None,
        limit: int = 50
    ) -> List[Dict]:
        """列出報告"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT id, title, report_type, period_start, period_end, summary, generated_at FROM reports WHERE 1=1'
        params = []
        
        if report_type:
            query += ' AND report_type = ?'
            params.append(report_type.value)
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        query += ' ORDER BY generated_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "title": row[1],
            "report_type": row[2],
            "period_start": row[3],
            "period_end": row[4],
            "summary": row[5],
            "generated_at": row[6]
        } for row in rows]
    
    # ==================== 報告導出 ====================
    
    def export_report(
        self,
        report_id: str,
        format: ReportFormat = ReportFormat.JSON
    ) -> str:
        """導出報告"""
        report = self.get_report(report_id)
        
        if not report:
            return ""
        
        if format == ReportFormat.JSON:
            return json.dumps(report, indent=2, ensure_ascii=False)
        
        elif format == ReportFormat.MARKDOWN:
            return self._export_as_markdown(report)
        
        elif format == ReportFormat.HTML:
            return self._export_as_html(report)
        
        elif format == ReportFormat.CSV:
            return self._export_as_csv(report)
        
        return ""
    
    def _export_as_markdown(self, report: Dict) -> str:
        """導出為 Markdown"""
        lines = [
            f"# {report['title']}",
            "",
            f"**生成時間**: {report['generated_at']}",
            f"**報告週期**: {report['period_start']} 至 {report['period_end']}",
            "",
            "## 摘要",
            report['summary'],
            ""
        ]
        
        for section in report.get('sections', []):
            lines.append(f"## {section['title']}")
            lines.append(section['content'])
            lines.append("")
        
        if report.get('insights'):
            lines.append("## 關鍵洞察")
            for insight in report['insights']:
                lines.append(f"- **{insight.get('title', '')}**: {insight.get('description', '')}")
            lines.append("")
        
        return "\n".join(lines)
    
    def _export_as_html(self, report: Dict) -> str:
        """導出為 HTML"""
        sections_html = ""
        for section in report.get('sections', []):
            sections_html += f"<h2>{section['title']}</h2><p>{section['content']}</p>"
        
        insights_html = ""
        if report.get('insights'):
            insights_html = "<h2>關鍵洞察</h2><ul>"
            for insight in report['insights']:
                insights_html += f"<li><strong>{insight.get('title', '')}</strong>: {insight.get('description', '')}</li>"
            insights_html += "</ul>"
        
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{report['title']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #333; }}
        h2 {{ color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px; }}
        .meta {{ color: #888; font-size: 0.9em; }}
    </style>
</head>
<body>
    <h1>{report['title']}</h1>
    <p class="meta">生成時間: {report['generated_at']}</p>
    <p class="meta">報告週期: {report['period_start']} 至 {report['period_end']}</p>
    <h2>摘要</h2>
    <p>{report['summary']}</p>
    {sections_html}
    {insights_html}
</body>
</html>
        """
    
    def _export_as_csv(self, report: Dict) -> str:
        """導出為 CSV（簡化版）"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["報告標題", report['title']])
        writer.writerow(["生成時間", report['generated_at']])
        writer.writerow(["報告週期", f"{report['period_start']} 至 {report['period_end']}"])
        writer.writerow(["摘要", report['summary']])
        writer.writerow([])
        
        writer.writerow(["章節", "內容"])
        for section in report.get('sections', []):
            writer.writerow([section['title'], section['content']])
        
        return output.getvalue()
    
    # ==================== 模板管理 ====================
    
    def list_templates(self) -> List[Dict]:
        """列出報告模板"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM report_templates')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "report_type": row[2],
            "description": row[3],
            "config": json.loads(row[4]) if row[4] else {},
            "is_default": bool(row[5]),
            "created_at": row[6]
        } for row in rows]
    
    def get_report_stats(self) -> Dict[str, Any]:
        """獲取報告統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT report_type, COUNT(*) FROM reports GROUP BY report_type')
        type_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        cursor.execute('SELECT COUNT(*) FROM reports')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM report_templates')
        templates = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_reports": total,
            "by_type": type_counts,
            "total_templates": templates,
            "timestamp": datetime.now().isoformat()
        }


# 獲取單例
def get_report_generator() -> ReportGenerator:
    return ReportGenerator()

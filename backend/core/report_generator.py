"""
运维报表生成服务
================

功能：
1. 日报/周报/月报生成
2. 自定义报表
3. 多种格式导出
4. 定时自动生成
5. 报表归档

报表类型：
- 系统概览报表
- API 使用报表
- 告警分析报表
- 容量趋势报表
- 登录统计报表
"""

import sys
import time
import json
import csv
from io import StringIO
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ReportPeriod(Enum):
    """报表周期"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ReportFormat(Enum):
    """报表格式"""
    JSON = "json"
    CSV = "csv"
    HTML = "html"
    MARKDOWN = "markdown"


class ReportType(Enum):
    """报表类型"""
    OVERVIEW = "overview"           # 系统概览
    API_USAGE = "api_usage"         # API 使用
    ALERTS = "alerts"               # 告警分析
    CAPACITY = "capacity"           # 容量趋势
    LOGIN = "login"                 # 登录统计
    PERFORMANCE = "performance"     # 性能报表
    AUDIT = "audit"                 # 审计报表


@dataclass
class ReportConfig:
    """报表配置"""
    type: ReportType
    period: ReportPeriod
    format: ReportFormat = ReportFormat.JSON
    
    # 时间范围
    start_time: float = 0
    end_time: float = 0
    
    # 自定义选项
    include_details: bool = True
    include_charts: bool = False
    max_items: int = 100
    
    # 筛选条件
    filters: Dict = field(default_factory=dict)


@dataclass
class Report:
    """报表对象"""
    id: str
    config: ReportConfig
    title: str
    description: str
    
    # 时间
    generated_at: float = field(default_factory=time.time)
    period_start: float = 0
    period_end: float = 0
    
    # 内容
    summary: Dict = field(default_factory=dict)
    sections: List[Dict] = field(default_factory=list)
    
    # 元数据
    generation_time_ms: int = 0
    data_points: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "type": self.config.type.value,
            "period": self.config.period.value,
            "generated_at": self.generated_at,
            "period_start": self.period_start,
            "period_end": self.period_end,
            "summary": self.summary,
            "sections": self.sections,
            "generation_time_ms": self.generation_time_ms,
            "data_points": self.data_points
        }


class DataCollector:
    """数据收集器"""
    
    @staticmethod
    async def collect_overview(start: float, end: float) -> Dict:
        """收集概览数据"""
        data = {
            "api_pool": {},
            "health": {},
            "alerts": {},
            "login": {}
        }
        
        try:
            from core.api_pool import get_api_pool
            pool = get_api_pool()
            if pool:
                data["api_pool"] = pool.get_pool_status()
        except:
            pass
        
        try:
            from core.api_health import get_health_checker
            health = get_health_checker()
            if health:
                data["health"] = health.get_health_summary()
        except:
            pass
        
        try:
            from core.api_alerts import get_alert_service
            alerts = get_alert_service()
            if alerts:
                data["alerts"] = alerts.get_alerts_for_dashboard()
        except:
            pass
        
        try:
            from core.login_tracker import get_login_tracker
            tracker = get_login_tracker()
            if tracker:
                data["login"] = tracker.get_dashboard_data()
        except:
            pass
        
        return data
    
    @staticmethod
    async def collect_api_usage(start: float, end: float) -> Dict:
        """收集 API 使用数据"""
        data = {
            "total_requests": 0,
            "success_count": 0,
            "failure_count": 0,
            "by_api": [],
            "by_hour": [],
            "top_errors": []
        }
        
        try:
            from core.api_stats import get_stats_service
            stats = get_stats_service()
            if stats:
                dashboard = stats.get_dashboard_data()
                data.update(dashboard)
        except:
            pass
        
        return data
    
    @staticmethod
    async def collect_alerts(start: float, end: float) -> Dict:
        """收集告警数据"""
        data = {
            "total": 0,
            "by_level": {},
            "by_type": {},
            "timeline": [],
            "top_sources": []
        }
        
        try:
            from core.api_alerts import get_alert_service
            alerts = get_alert_service()
            if alerts:
                history = alerts.get_alert_history()
                
                # 筛选时间范围
                filtered = [
                    a for a in history 
                    if start <= a.get("created_at", 0) <= end
                ]
                
                data["total"] = len(filtered)
                
                # 按级别分组
                for alert in filtered:
                    level = alert.get("level", "unknown")
                    data["by_level"][level] = data["by_level"].get(level, 0) + 1
                    
                    atype = alert.get("type", "unknown")
                    data["by_type"][atype] = data["by_type"].get(atype, 0) + 1
        except:
            pass
        
        return data
    
    @staticmethod
    async def collect_capacity(start: float, end: float) -> Dict:
        """收集容量数据"""
        data = {
            "current": {},
            "trend": [],
            "predictions": {}
        }
        
        try:
            from core.capacity_monitor import get_capacity_monitor
            monitor = get_capacity_monitor()
            if monitor:
                data["current"] = monitor.get_status()
                data["predictions"] = monitor.predict_exhaustion()
        except:
            pass
        
        return data
    
    @staticmethod
    async def collect_login_stats(start: float, end: float) -> Dict:
        """收集登录统计"""
        data = {
            "total_logins": 0,
            "success_count": 0,
            "failure_count": 0,
            "success_rate": 0,
            "by_hour": [],
            "failure_reasons": []
        }
        
        try:
            from core.login_tracker import get_login_tracker
            tracker = get_login_tracker()
            if tracker:
                data.update(tracker.get_stats())
        except:
            pass
        
        return data


class ReportFormatter:
    """报表格式化器"""
    
    @staticmethod
    def to_json(report: Report) -> str:
        """转换为 JSON"""
        return json.dumps(report.to_dict(), ensure_ascii=False, indent=2)
    
    @staticmethod
    def to_csv(report: Report) -> str:
        """转换为 CSV"""
        output = StringIO()
        
        # 写入摘要
        output.write("# 报表摘要\n")
        output.write(f"标题,{report.title}\n")
        output.write(f"生成时间,{datetime.fromtimestamp(report.generated_at).isoformat()}\n")
        output.write(f"周期,{report.config.period.value}\n\n")
        
        # 写入各个部分
        for section in report.sections:
            output.write(f"# {section.get('title', 'Section')}\n")
            
            if "data" in section:
                data = section["data"]
                
                if isinstance(data, list) and data:
                    # 写入表头
                    if isinstance(data[0], dict):
                        headers = list(data[0].keys())
                        writer = csv.DictWriter(output, fieldnames=headers)
                        writer.writeheader()
                        writer.writerows(data)
                    else:
                        for item in data:
                            output.write(f"{item}\n")
                
                elif isinstance(data, dict):
                    for key, value in data.items():
                        output.write(f"{key},{value}\n")
            
            output.write("\n")
        
        return output.getvalue()
    
    @staticmethod
    def to_markdown(report: Report) -> str:
        """转换为 Markdown"""
        lines = []
        
        # 标题
        lines.append(f"# {report.title}")
        lines.append("")
        lines.append(f"*{report.description}*")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.fromtimestamp(report.generated_at).strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**报表周期**: {report.config.period.value}")
        lines.append("")
        
        # 摘要
        lines.append("## 摘要")
        lines.append("")
        
        for key, value in report.summary.items():
            if isinstance(value, dict):
                lines.append(f"### {key}")
                for k, v in value.items():
                    lines.append(f"- **{k}**: {v}")
            else:
                lines.append(f"- **{key}**: {value}")
        lines.append("")
        
        # 各部分
        for section in report.sections:
            lines.append(f"## {section.get('title', 'Section')}")
            lines.append("")
            
            if "description" in section:
                lines.append(section["description"])
                lines.append("")
            
            if "data" in section:
                data = section["data"]
                
                if isinstance(data, list) and data:
                    if isinstance(data[0], dict):
                        # 表格
                        headers = list(data[0].keys())
                        lines.append("| " + " | ".join(headers) + " |")
                        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
                        
                        for row in data[:20]:  # 限制行数
                            values = [str(row.get(h, "")) for h in headers]
                            lines.append("| " + " | ".join(values) + " |")
                    else:
                        for item in data[:20]:
                            lines.append(f"- {item}")
                
                elif isinstance(data, dict):
                    for key, value in data.items():
                        lines.append(f"- **{key}**: {value}")
            
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def to_html(report: Report) -> str:
        """转换为 HTML"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{report.title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }}
        .report {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 1000px; margin: 0 auto; }}
        h1 {{ color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }}
        h2 {{ color: #333; margin-top: 30px; }}
        .meta {{ color: #666; font-size: 14px; margin-bottom: 20px; }}
        .summary {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .summary-item {{ display: inline-block; margin: 10px 20px 10px 0; }}
        .summary-value {{ font-size: 24px; font-weight: bold; color: #3b82f6; }}
        .summary-label {{ font-size: 12px; color: #666; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
        th {{ background: #f8fafc; font-weight: 600; }}
        tr:hover {{ background: #f8fafc; }}
        .section {{ margin: 30px 0; }}
    </style>
</head>
<body>
    <div class="report">
        <h1>{report.title}</h1>
        <div class="meta">
            生成时间: {datetime.fromtimestamp(report.generated_at).strftime('%Y-%m-%d %H:%M:%S')} | 
            周期: {report.config.period.value}
        </div>
"""
        
        # 摘要
        if report.summary:
            html += '<div class="summary">'
            for key, value in report.summary.items():
                if not isinstance(value, dict):
                    html += f'<div class="summary-item"><div class="summary-value">{value}</div><div class="summary-label">{key}</div></div>'
            html += '</div>'
        
        # 各部分
        for section in report.sections:
            html += f'<div class="section"><h2>{section.get("title", "Section")}</h2>'
            
            if "data" in section:
                data = section["data"]
                
                if isinstance(data, list) and data and isinstance(data[0], dict):
                    headers = list(data[0].keys())
                    html += '<table><thead><tr>'
                    for h in headers:
                        html += f'<th>{h}</th>'
                    html += '</tr></thead><tbody>'
                    
                    for row in data[:50]:
                        html += '<tr>'
                        for h in headers:
                            html += f'<td>{row.get(h, "")}</td>'
                        html += '</tr>'
                    
                    html += '</tbody></table>'
                
                elif isinstance(data, dict):
                    html += '<ul>'
                    for key, value in data.items():
                        html += f'<li><strong>{key}</strong>: {value}</li>'
                    html += '</ul>'
            
            html += '</div>'
        
        html += """
    </div>
</body>
</html>"""
        
        return html


class ReportGenerator:
    """
    报表生成器
    
    负责生成各类运维报表
    """
    
    def __init__(self):
        self._collector = DataCollector()
        self._formatter = ReportFormatter()
        
        # 报表历史
        self._reports: List[Report] = []
        self._max_reports = 50
        
        # 定时任务
        self._scheduled_reports: List[Dict] = []
        
        # 计数器
        self._report_count = 0
        
        logger.info("ReportGenerator initialized")
    
    # ==================== 报表生成 ====================
    
    async def generate(self, config: ReportConfig) -> Report:
        """
        生成报表
        
        Args:
            config: 报表配置
        
        Returns:
            生成的报表
        """
        start_time = time.time()
        
        # 计算时间范围
        period_start, period_end = self._calculate_period(config)
        config.start_time = period_start
        config.end_time = period_end
        
        # 生成报表 ID
        self._report_count += 1
        report_id = f"report-{config.type.value}-{int(time.time())}"
        
        # 收集数据
        data = await self._collect_data(config)
        
        # 构建报表
        report = Report(
            id=report_id,
            config=config,
            title=self._get_report_title(config),
            description=self._get_report_description(config),
            period_start=period_start,
            period_end=period_end
        )
        
        # 构建内容
        self._build_content(report, data)
        
        # 记录元数据
        report.generation_time_ms = int((time.time() - start_time) * 1000)
        report.data_points = self._count_data_points(data)
        
        # 保存报表
        self._reports.append(report)
        if len(self._reports) > self._max_reports:
            self._reports = self._reports[-self._max_reports:]
        
        logger.info(f"Report generated: {report_id} in {report.generation_time_ms}ms")
        
        return report
    
    def _calculate_period(self, config: ReportConfig) -> tuple:
        """计算报表时间范围"""
        now = time.time()
        
        if config.start_time and config.end_time:
            return config.start_time, config.end_time
        
        if config.period == ReportPeriod.DAILY:
            # 过去 24 小时
            return now - 86400, now
        
        elif config.period == ReportPeriod.WEEKLY:
            # 过去 7 天
            return now - 86400 * 7, now
        
        elif config.period == ReportPeriod.MONTHLY:
            # 过去 30 天
            return now - 86400 * 30, now
        
        else:
            return now - 86400, now
    
    async def _collect_data(self, config: ReportConfig) -> Dict:
        """收集报表数据"""
        start = config.start_time
        end = config.end_time
        
        if config.type == ReportType.OVERVIEW:
            return await self._collector.collect_overview(start, end)
        
        elif config.type == ReportType.API_USAGE:
            return await self._collector.collect_api_usage(start, end)
        
        elif config.type == ReportType.ALERTS:
            return await self._collector.collect_alerts(start, end)
        
        elif config.type == ReportType.CAPACITY:
            return await self._collector.collect_capacity(start, end)
        
        elif config.type == ReportType.LOGIN:
            return await self._collector.collect_login_stats(start, end)
        
        else:
            return await self._collector.collect_overview(start, end)
    
    def _get_report_title(self, config: ReportConfig) -> str:
        """获取报表标题"""
        type_names = {
            ReportType.OVERVIEW: "系统概览报表",
            ReportType.API_USAGE: "API 使用报表",
            ReportType.ALERTS: "告警分析报表",
            ReportType.CAPACITY: "容量趋势报表",
            ReportType.LOGIN: "登录统计报表",
            ReportType.PERFORMANCE: "性能分析报表",
            ReportType.AUDIT: "审计报表"
        }
        
        period_names = {
            ReportPeriod.DAILY: "日报",
            ReportPeriod.WEEKLY: "周报",
            ReportPeriod.MONTHLY: "月报",
            ReportPeriod.CUSTOM: "自定义"
        }
        
        return f"{type_names.get(config.type, '报表')} - {period_names.get(config.period, '')}"
    
    def _get_report_description(self, config: ReportConfig) -> str:
        """获取报表描述"""
        start = datetime.fromtimestamp(config.start_time).strftime('%Y-%m-%d %H:%M')
        end = datetime.fromtimestamp(config.end_time).strftime('%Y-%m-%d %H:%M')
        return f"报表周期: {start} 至 {end}"
    
    def _build_content(self, report: Report, data: Dict) -> None:
        """构建报表内容"""
        config = report.config
        
        if config.type == ReportType.OVERVIEW:
            self._build_overview_content(report, data)
        
        elif config.type == ReportType.API_USAGE:
            self._build_api_usage_content(report, data)
        
        elif config.type == ReportType.ALERTS:
            self._build_alerts_content(report, data)
        
        elif config.type == ReportType.CAPACITY:
            self._build_capacity_content(report, data)
        
        elif config.type == ReportType.LOGIN:
            self._build_login_content(report, data)
    
    def _build_overview_content(self, report: Report, data: Dict) -> None:
        """构建概览报表内容"""
        pool = data.get("api_pool", {})
        health = data.get("health", {})
        alerts = data.get("alerts", {})
        login = data.get("login", {})
        
        report.summary = {
            "API 总数": pool.get("total_apis", 0),
            "可用 API": pool.get("available_apis", 0),
            "健康 API": health.get("healthy", 0),
            "活跃告警": alerts.get("active_count", 0),
            "登录成功率": f"{login.get('success_rate', 0):.1f}%"
        }
        
        report.sections = [
            {
                "title": "API 池状态",
                "data": pool
            },
            {
                "title": "健康状态",
                "data": health
            },
            {
                "title": "告警概览",
                "data": alerts
            }
        ]
    
    def _build_api_usage_content(self, report: Report, data: Dict) -> None:
        """构建 API 使用报表内容"""
        report.summary = {
            "总请求数": data.get("total_requests", 0),
            "成功数": data.get("success_count", 0),
            "失败数": data.get("failure_count", 0),
            "成功率": f"{data.get('success_rate', 0):.1f}%"
        }
        
        report.sections = [
            {
                "title": "按 API 统计",
                "data": data.get("by_api", [])
            },
            {
                "title": "按小时统计",
                "data": data.get("by_hour", [])
            },
            {
                "title": "Top 错误",
                "data": data.get("top_errors", [])
            }
        ]
    
    def _build_alerts_content(self, report: Report, data: Dict) -> None:
        """构建告警报表内容"""
        report.summary = {
            "告警总数": data.get("total", 0),
            "按级别": data.get("by_level", {}),
            "按类型": data.get("by_type", {})
        }
        
        report.sections = [
            {
                "title": "告警分布",
                "data": {
                    "按级别": data.get("by_level", {}),
                    "按类型": data.get("by_type", {})
                }
            },
            {
                "title": "主要告警来源",
                "data": data.get("top_sources", [])
            }
        ]
    
    def _build_capacity_content(self, report: Report, data: Dict) -> None:
        """构建容量报表内容"""
        current = data.get("current", {})
        predictions = data.get("predictions", {})
        
        report.summary = {
            "当前使用率": f"{current.get('usage_percent', 0):.1f}%",
            "可用容量": current.get("available", 0),
            "预计耗尽时间": predictions.get("time_to_exhaustion", "N/A")
        }
        
        report.sections = [
            {
                "title": "当前容量状态",
                "data": current
            },
            {
                "title": "容量预测",
                "data": predictions
            }
        ]
    
    def _build_login_content(self, report: Report, data: Dict) -> None:
        """构建登录报表内容"""
        report.summary = {
            "总登录数": data.get("total_logins", 0),
            "成功数": data.get("success_count", 0),
            "失败数": data.get("failure_count", 0),
            "成功率": f"{data.get('success_rate', 0):.1f}%"
        }
        
        report.sections = [
            {
                "title": "按小时统计",
                "data": data.get("by_hour", [])
            },
            {
                "title": "失败原因分析",
                "data": data.get("failure_reasons", [])
            }
        ]
    
    def _count_data_points(self, data: Dict) -> int:
        """统计数据点数量"""
        count = 0
        
        def count_recursive(obj):
            nonlocal count
            if isinstance(obj, dict):
                for v in obj.values():
                    count_recursive(v)
            elif isinstance(obj, list):
                count += len(obj)
                for item in obj:
                    if isinstance(item, (dict, list)):
                        count_recursive(item)
            else:
                count += 1
        
        count_recursive(data)
        return count
    
    # ==================== 格式化导出 ====================
    
    def export(self, report: Report, format: ReportFormat = None) -> str:
        """导出报表"""
        fmt = format or report.config.format
        
        if fmt == ReportFormat.JSON:
            return self._formatter.to_json(report)
        
        elif fmt == ReportFormat.CSV:
            return self._formatter.to_csv(report)
        
        elif fmt == ReportFormat.MARKDOWN:
            return self._formatter.to_markdown(report)
        
        elif fmt == ReportFormat.HTML:
            return self._formatter.to_html(report)
        
        return self._formatter.to_json(report)
    
    # ==================== 查询接口 ====================
    
    def get_reports(self, limit: int = 10) -> List[Dict]:
        """获取报表列表"""
        reports = self._reports[-limit:]
        return [
            {
                "id": r.id,
                "title": r.title,
                "type": r.config.type.value,
                "period": r.config.period.value,
                "generated_at": r.generated_at,
                "data_points": r.data_points
            }
            for r in reversed(reports)
        ]
    
    def get_report(self, report_id: str) -> Optional[Report]:
        """获取指定报表"""
        for report in self._reports:
            if report.id == report_id:
                return report
        return None


# ==================== 全局实例 ====================

_generator: Optional[ReportGenerator] = None


def get_report_generator() -> ReportGenerator:
    """获取报表生成器"""
    global _generator
    if _generator is None:
        _generator = ReportGenerator()
    return _generator


# ==================== 便捷函数 ====================

async def generate_daily_report(report_type: ReportType = ReportType.OVERVIEW) -> Report:
    """生成日报"""
    config = ReportConfig(
        type=report_type,
        period=ReportPeriod.DAILY,
        format=ReportFormat.HTML
    )
    return await get_report_generator().generate(config)


async def generate_weekly_report(report_type: ReportType = ReportType.OVERVIEW) -> Report:
    """生成周报"""
    config = ReportConfig(
        type=report_type,
        period=ReportPeriod.WEEKLY,
        format=ReportFormat.HTML
    )
    return await get_report_generator().generate(config)

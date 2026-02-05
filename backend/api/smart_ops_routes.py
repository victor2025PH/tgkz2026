"""
智能运维 API 路由
=================

提供第五阶段智能运维功能的 IPC 接口
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


# ============ 自动扩缩容 ============

async def handle_scaling_status(data: Dict) -> Dict[str, Any]:
    """获取扩缩容状态"""
    try:
        from core.auto_scaling import get_auto_scaling_engine
        engine = get_auto_scaling_engine()
        
        return {
            "success": True,
            "data": {
                "stats": engine.get_stats(),
                "pending": [d.to_dict() for d in engine.get_pending_decisions()],
                "policy": engine.get_policy().to_dict(),
                "trend": engine.get_capacity_trend()
            }
        }
    except Exception as e:
        logger.error(f"Get scaling status failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_scaling_set_mode(data: Dict) -> Dict[str, Any]:
    """设置扩缩容模式"""
    try:
        from core.auto_scaling import get_auto_scaling_engine, ScalingMode
        
        mode_str = data.get("mode", "semi_auto")
        mode = ScalingMode(mode_str)
        
        engine = get_auto_scaling_engine()
        engine.set_mode(mode)
        
        return {
            "success": True,
            "data": {"mode": mode.value}
        }
    except Exception as e:
        logger.error(f"Set scaling mode failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_scaling_confirm(data: Dict) -> Dict[str, Any]:
    """确认扩缩容决策"""
    try:
        from core.auto_scaling import get_auto_scaling_engine
        
        index = data.get("index", 0)
        engine = get_auto_scaling_engine()
        
        record = await engine.confirm_decision(index)
        
        return {
            "success": True,
            "data": {
                "executed": record is not None,
                "record": record.__dict__ if record else None
            }
        }
    except Exception as e:
        logger.error(f"Confirm scaling failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_scaling_reject(data: Dict) -> Dict[str, Any]:
    """拒绝扩缩容决策"""
    try:
        from core.auto_scaling import get_auto_scaling_engine
        
        index = data.get("index", 0)
        engine = get_auto_scaling_engine()
        
        decision = await engine.reject_decision(index)
        
        return {
            "success": True,
            "data": {"rejected": decision is not None}
        }
    except Exception as e:
        logger.error(f"Reject scaling failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 告警聚合 ============

async def handle_alerts_aggregated(data: Dict) -> Dict[str, Any]:
    """获取聚合告警"""
    try:
        from core.alert_aggregator import get_alert_aggregator
        aggregator = get_alert_aggregator()
        
        level = data.get("level")
        alert_type = data.get("type")
        limit = data.get("limit", 50)
        
        alerts = aggregator.get_aggregated_alerts(
            level=level,
            alert_type=alert_type,
            limit=limit
        )
        
        return {
            "success": True,
            "data": {
                "alerts": alerts,
                "summary": aggregator.get_summary()
            }
        }
    except Exception as e:
        logger.error(f"Get aggregated alerts failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_alerts_suppress(data: Dict) -> Dict[str, Any]:
    """抑制告警"""
    try:
        from core.alert_aggregator import get_alert_aggregator
        aggregator = get_alert_aggregator()
        
        alert_type = data.get("type")
        source = data.get("source")
        duration = data.get("duration", 3600)
        
        count = aggregator.suppress_alerts(
            alert_type=alert_type,
            source=source,
            duration=duration
        )
        
        return {
            "success": True,
            "data": {"suppressed_count": count}
        }
    except Exception as e:
        logger.error(f"Suppress alerts failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 异常检测 ============

async def handle_anomaly_summary(data: Dict) -> Dict[str, Any]:
    """获取异常摘要"""
    try:
        from core.anomaly_detection import get_anomaly_detector
        detector = get_anomaly_detector()
        
        summary = detector.get_anomaly_summary()
        recent = detector.get_recent_anomalies(limit=20)
        
        return {
            "success": True,
            "data": {
                "summary": summary,
                "recent": recent
            }
        }
    except Exception as e:
        logger.error(f"Get anomaly summary failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_anomaly_metric_health(data: Dict) -> Dict[str, Any]:
    """获取指标健康状态"""
    try:
        from core.anomaly_detection import get_anomaly_detector
        
        metric = data.get("metric")
        if not metric:
            return {"success": False, "error": "Metric required"}
        
        detector = get_anomaly_detector()
        health = detector.get_metric_health(metric)
        
        return {
            "success": True,
            "data": health
        }
    except Exception as e:
        logger.error(f"Get metric health failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 自动恢复 ============

async def handle_recovery_stats(data: Dict) -> Dict[str, Any]:
    """获取恢复统计"""
    try:
        from core.auto_recovery import get_recovery_manager
        manager = get_recovery_manager()
        
        return {
            "success": True,
            "data": manager.get_stats()
        }
    except Exception as e:
        logger.error(f"Get recovery stats failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_recovery_history(data: Dict) -> Dict[str, Any]:
    """获取恢复历史"""
    try:
        from core.auto_recovery import get_recovery_manager
        
        limit = data.get("limit", 20)
        manager = get_recovery_manager()
        
        return {
            "success": True,
            "data": manager.get_history(limit)
        }
    except Exception as e:
        logger.error(f"Get recovery history failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_recovery_trigger(data: Dict) -> Dict[str, Any]:
    """手动触发恢复"""
    try:
        from core.auto_recovery import get_recovery_manager, RecoveryType
        
        target_id = data.get("target_id")
        target_type = data.get("target_type", "api")
        recovery_type = data.get("recovery_type", "retry")
        
        if not target_id:
            return {"success": False, "error": "Target ID required"}
        
        manager = get_recovery_manager()
        action = await manager.trigger_recovery(
            target_id=target_id,
            target_type=target_type,
            recovery_type=RecoveryType(recovery_type)
        )
        
        return {
            "success": True,
            "data": action.to_dict()
        }
    except Exception as e:
        logger.error(f"Trigger recovery failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 报表生成 ============

async def handle_reports_list(data: Dict) -> Dict[str, Any]:
    """获取报表列表"""
    try:
        from core.report_generator import get_report_generator
        
        limit = data.get("limit", 10)
        generator = get_report_generator()
        
        return {
            "success": True,
            "data": generator.get_reports(limit)
        }
    except Exception as e:
        logger.error(f"Get reports list failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_reports_generate(data: Dict) -> Dict[str, Any]:
    """生成报表"""
    try:
        from core.report_generator import (
            get_report_generator, 
            ReportConfig, 
            ReportType, 
            ReportPeriod,
            ReportFormat
        )
        
        report_type = ReportType(data.get("type", "overview"))
        period = ReportPeriod(data.get("period", "daily"))
        
        config = ReportConfig(
            type=report_type,
            period=period,
            format=ReportFormat.HTML
        )
        
        generator = get_report_generator()
        report = await generator.generate(config)
        
        return {
            "success": True,
            "data": {
                "id": report.id,
                "title": report.title,
                "generated_at": report.generated_at
            }
        }
    except Exception as e:
        logger.error(f"Generate report failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_reports_export(data: Dict) -> Dict[str, Any]:
    """导出报表"""
    try:
        from core.report_generator import get_report_generator, ReportFormat
        
        report_id = data.get("report_id")
        format_str = data.get("format", "html")
        
        if not report_id:
            return {"success": False, "error": "Report ID required"}
        
        generator = get_report_generator()
        report = generator.get_report(report_id)
        
        if not report:
            return {"success": False, "error": "Report not found"}
        
        format_map = {
            "json": ReportFormat.JSON,
            "csv": ReportFormat.CSV,
            "html": ReportFormat.HTML,
            "markdown": ReportFormat.MARKDOWN
        }
        
        fmt = format_map.get(format_str, ReportFormat.HTML)
        content = generator.export(report, fmt)
        
        return {
            "success": True,
            "data": {
                "content": content,
                "format": format_str
            }
        }
    except Exception as e:
        logger.error(f"Export report failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 审批流程 ============

async def handle_approval_pending(data: Dict) -> Dict[str, Any]:
    """获取待审批请求"""
    try:
        from core.approval_workflow import get_approval_workflow
        workflow = get_approval_workflow()
        
        return {
            "success": True,
            "data": workflow.get_pending_requests()
        }
    except Exception as e:
        logger.error(f"Get pending approvals failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_approval_approve(data: Dict) -> Dict[str, Any]:
    """批准请求"""
    try:
        from core.approval_workflow import get_approval_workflow
        
        request_id = data.get("request_id")
        approver_id = data.get("approver_id", "admin")
        approver_name = data.get("approver_name", "Administrator")
        comment = data.get("comment", "")
        
        if not request_id:
            return {"success": False, "error": "Request ID required"}
        
        workflow = get_approval_workflow()
        request = workflow.approve(
            request_id=request_id,
            approver_id=approver_id,
            approver_name=approver_name,
            comment=comment
        )
        
        if not request:
            return {"success": False, "error": "Request not found"}
        
        return {
            "success": True,
            "data": request.to_dict()
        }
    except Exception as e:
        logger.error(f"Approve request failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_approval_reject(data: Dict) -> Dict[str, Any]:
    """拒绝请求"""
    try:
        from core.approval_workflow import get_approval_workflow
        
        request_id = data.get("request_id")
        approver_id = data.get("approver_id", "admin")
        approver_name = data.get("approver_name", "Administrator")
        reason = data.get("reason", "")
        
        if not request_id:
            return {"success": False, "error": "Request ID required"}
        
        workflow = get_approval_workflow()
        request = workflow.reject(
            request_id=request_id,
            approver_id=approver_id,
            approver_name=approver_name,
            reason=reason
        )
        
        if not request:
            return {"success": False, "error": "Request not found"}
        
        return {
            "success": True,
            "data": request.to_dict()
        }
    except Exception as e:
        logger.error(f"Reject request failed: {e}")
        return {"success": False, "error": str(e)}


async def handle_approval_history(data: Dict) -> Dict[str, Any]:
    """获取审批历史"""
    try:
        from core.approval_workflow import get_approval_workflow
        
        limit = data.get("limit", 20)
        workflow = get_approval_workflow()
        
        return {
            "success": True,
            "data": workflow.get_history(limit)
        }
    except Exception as e:
        logger.error(f"Get approval history failed: {e}")
        return {"success": False, "error": str(e)}


# ============ 路由注册 ============

def register_smart_ops_routes(router):
    """注册智能运维路由"""
    # 扩缩容
    router.register('scaling:status', handle_scaling_status)
    router.register('scaling:set-mode', handle_scaling_set_mode)
    router.register('scaling:confirm', handle_scaling_confirm)
    router.register('scaling:reject', handle_scaling_reject)
    
    # 告警聚合
    router.register('alerts:aggregated', handle_alerts_aggregated)
    router.register('alerts:suppress', handle_alerts_suppress)
    
    # 异常检测
    router.register('anomaly:summary', handle_anomaly_summary)
    router.register('anomaly:metric-health', handle_anomaly_metric_health)
    
    # 自动恢复
    router.register('recovery:stats', handle_recovery_stats)
    router.register('recovery:history', handle_recovery_history)
    router.register('recovery:trigger', handle_recovery_trigger)
    
    # 报表
    router.register('reports:list', handle_reports_list)
    router.register('reports:generate', handle_reports_generate)
    router.register('reports:export', handle_reports_export)
    
    # 审批
    router.register('approval:pending', handle_approval_pending)
    router.register('approval:approve', handle_approval_approve)
    router.register('approval:reject', handle_approval_reject)
    router.register('approval:history', handle_approval_history)
    
    logger.info("Smart ops routes registered")

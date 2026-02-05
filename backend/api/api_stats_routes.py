"""
API 统计路由

提供 API 统计数据的查询接口
"""

import sys
from typing import Dict, Any

# 导入统计服务
try:
    from backend.core.api_stats import get_stats_service, EventType
except ImportError:
    try:
        from core.api_stats import get_stats_service, EventType
    except ImportError:
        get_stats_service = None
        EventType = None


async def get_dashboard_data() -> Dict[str, Any]:
    """获取仪表板数据"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_dashboard_data()
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取仪表板数据失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_overall_stats(days: int = 7) -> Dict[str, Any]:
    """获取总体统计"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_overall_stats(days=days)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取总体统计失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_api_stats(api_id: str, days: int = 7) -> Dict[str, Any]:
    """获取指定 API 的统计"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_api_stats(api_id=api_id, days=days)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取 API 统计失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_hourly_stats(hours: int = 24) -> Dict[str, Any]:
    """获取每小时统计"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_hourly_stats(hours=hours)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取每小时统计失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_api_ranking(top_n: int = 10) -> Dict[str, Any]:
    """获取 API 排名"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_api_ranking(top_n=top_n)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取 API 排名失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_alerts(limit: int = 20) -> Dict[str, Any]:
    """获取告警列表"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        data = service.get_alerts(limit=limit)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 获取告警失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def clear_alerts() -> Dict[str, Any]:
    """清除告警"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}
    
    try:
        service = get_stats_service()
        service.clear_alerts()
        return {'success': True, 'message': 'Alerts cleared'}
    except Exception as e:
        print(f"[api_stats_routes] 清除告警失败: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def handle_stats_command(command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    处理统计命令
    
    命令列表：
    - dashboard: 获取仪表板数据
    - overall: 获取总体统计
    - api: 获取指定 API 统计
    - hourly: 获取每小时统计
    - ranking: 获取 API 排名
    - alerts: 获取告警
    - clear_alerts: 清除告警
    """
    params = params or {}
    
    handlers = {
        'dashboard': lambda: get_dashboard_data(),
        'overall': lambda: get_overall_stats(params.get('days', 7)),
        'api': lambda: get_api_stats(params.get('api_id', ''), params.get('days', 7)),
        'hourly': lambda: get_hourly_stats(params.get('hours', 24)),
        'ranking': lambda: get_api_ranking(params.get('top_n', 10)),
        'alerts': lambda: get_alerts(params.get('limit', 20)),
        'clear_alerts': lambda: clear_alerts(),
    }
    
    handler = handlers.get(command)
    if not handler:
        return {'success': False, 'error': f'Unknown command: {command}'}
    
    return await handler()

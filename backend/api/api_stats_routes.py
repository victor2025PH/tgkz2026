"""
API 統計與容量規劃路由

提供：
1. API 統計查詢（core.api_stats）
2. 容量規劃狀態（admin.api_pool + core.capacity_monitor 適配）
3. aiohttp REST handlers（由 admin_module_routes 註冊到 /api/v1/admin/*）
4. COMMAND_ALIAS 入口（api-stats:command / capacity:status / capacity:history）
"""

from __future__ import annotations

import sys
from typing import Any, Dict, List, Optional

try:
    from aiohttp import web
except ImportError:  # 非 HTTP 環境（純命令通道）仍可 import 本模組
    web = None

# 匯入統計服務
try:
    from backend.core.api_stats import get_stats_service, EventType
except ImportError:
    try:
        from core.api_stats import get_stats_service, EventType
    except ImportError:
        get_stats_service = None
        EventType = None


# ==================== API 統計業務函式 ====================

async def get_dashboard_data() -> Dict[str, Any]:
    """獲取儀表板數據"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_dashboard_data()
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取儀表板數據失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_overall_stats(days: int = 7) -> Dict[str, Any]:
    """獲取總體統計"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_overall_stats(days=days)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取總體統計失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_api_stats(api_id: str, days: int = 7) -> Dict[str, Any]:
    """獲取指定 API 的統計"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_api_stats(api_id=api_id, days=days)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取 API 統計失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_hourly_stats(hours: int = 24) -> Dict[str, Any]:
    """獲取每小時統計"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_hourly_stats(hours=hours)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取每小時統計失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_api_ranking(top_n: int = 10) -> Dict[str, Any]:
    """獲取 API 排名"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_api_ranking(top_n=top_n)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取 API 排名失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def get_alerts(limit: int = 20) -> Dict[str, Any]:
    """獲取告警列表"""
    if not get_stats_service:
        return {'error': 'Stats service not available', 'success': False}

    try:
        service = get_stats_service()
        data = service.get_alerts(limit=limit)
        return {'success': True, 'data': data}
    except Exception as e:
        print(f"[api_stats_routes] 獲取告警失敗: {e}", file=sys.stderr)
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
        print(f"[api_stats_routes] 清除告警失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def handle_stats_command(command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    處理統計命令

    命令列表：
    - dashboard: 獲取儀表板數據
    - overall: 獲取總體統計
    - api: 獲取指定 API 統計
    - hourly: 獲取每小時統計
    - ranking: 獲取 API 排名
    - alerts: 獲取告警
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


async def handle_api_stats_alias(backend_service, payload=None) -> Dict[str, Any]:
    """COMMAND_ALIAS 入口：api-stats:command"""
    payload = payload or {}
    command = payload.get('command') or payload.get('action') or 'dashboard'
    return await handle_stats_command(command, payload)


# ==================== 容量規劃（適配前端 CapacityStatus）====================

def _collect_pool_stats_for_monitor() -> Dict[str, Any]:
    """
    採集可供 CapacityMonitor.take_snapshot 使用的池統計。

    優先 admin.api_pool（telegram_api_pool 表），失敗回退 core.api_pool。
    """
    try:
        from admin.api_pool import get_api_pool_manager

        pool = get_api_pool_manager()
        stats = pool.get_pool_stats()
        alerts = pool.check_capacity_alerts()
        cap = alerts.get('stats', {})

        return {
            'total_capacity': cap.get('total_capacity', 0) or 0,
            'total_used': cap.get('used_capacity', 0) or 0,
            'available_apis': stats.get('available_for_assign', 0) or 0,
            'full_apis': stats.get('full', 0) or 0,
            '_source': 'admin_api_pool',
            '_forecast': pool.get_capacity_forecast(7),
        }
    except Exception as e:
        print(f"[api_stats_routes] admin.api_pool 不可用，回退 core.api_pool: {e}", file=sys.stderr)

    try:
        from core.api_pool import get_api_pool

        stats = get_api_pool().get_stats()
        return {
            'total_capacity': stats.get('total_capacity', 0) or 0,
            'total_used': stats.get('total_used', 0) or 0,
            'available_apis': stats.get('available_apis', 0) or 0,
            'full_apis': stats.get('full_apis', 0) or 0,
            '_source': 'core_api_pool',
            '_forecast': None,
        }
    except Exception as e:
        print(f"[api_stats_routes] core.api_pool 亦不可用: {e}", file=sys.stderr)
        return {
            'total_capacity': 0,
            'total_used': 0,
            'available_apis': 0,
            'full_apis': 0,
            '_source': 'empty',
            '_forecast': None,
        }


def _enrich_status_with_forecast(status: Dict[str, Any], forecast: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """用 DB 分配歷史預測補強 monitor 置信度不足時的預測欄位。"""
    if not forecast or not isinstance(status, dict):
        return status

    pred = status.get('prediction') or {}
    if pred.get('estimated_full_hours') is None and forecast.get('days_until_exhausted') is not None:
        days = forecast['days_until_exhausted']
        pred['estimated_full_hours'] = round(float(days) * 24, 1)
        pred['confidence'] = max(float(pred.get('confidence') or 0), 0.5)
        avg_daily = float(forecast.get('avg_daily_allocations') or 0)
        snap = status.get('snapshot') or {}
        total = float(snap.get('total_capacity') or 0) or 1.0
        if avg_daily > 0:
            pred['rate_per_hour'] = round((avg_daily / 24.0) / total * 100.0, 4)
            pred['trend'] = 'increasing'
        status['prediction'] = pred

    rec = status.get('recommendation') or {}
    if forecast.get('forecast_warning') and rec.get('urgency') in (None, 'low', 'monitor'):
        rec['message'] = forecast.get('forecast_message') or rec.get('message') or '建議提前規劃擴容'
        rec['urgency'] = 'medium'
        rec['action'] = rec.get('action') or 'prepare_expansion'
        status['recommendation'] = rec

    return status


def build_capacity_status() -> Dict[str, Any]:
    """構建前端 CapacityStatus 形狀的當前容量狀態。"""
    from core.capacity_monitor import get_capacity_monitor

    raw = _collect_pool_stats_for_monitor()
    forecast = raw.pop('_forecast', None)
    source = raw.pop('_source', 'unknown')

    monitor = get_capacity_monitor()
    monitor.take_snapshot({
        'total_capacity': raw['total_capacity'],
        'total_used': raw['total_used'],
        'available_apis': raw['available_apis'],
        'full_apis': raw['full_apis'],
    })
    status = monitor.get_current_status()

    if status.get('status') == 'no_data':
        status = {
            'snapshot': {
                'timestamp': 0,
                'total_capacity': raw['total_capacity'],
                'used_capacity': raw['total_used'],
                'available_capacity': max(0, raw['total_capacity'] - raw['total_used']),
                'usage_percent': 0.0,
                'available_apis': raw['available_apis'],
                'full_apis': raw['full_apis'],
            },
            'prediction': {
                'trend': 'stable',
                'rate_per_hour': 0,
                'estimated_full_hours': None,
                'confidence': 0,
            },
            'recommendation': {
                'action': 'monitor',
                'urgency': 'low',
                'suggested_apis': 0,
                'message': '尚無足夠歷史資料，顯示即時快照',
            },
        }

    status = _enrich_status_with_forecast(status, forecast)
    status['source'] = source
    return status


def build_capacity_history(hours: int = 24) -> List[Dict[str, Any]]:
    """取得容量歷史快照（記憶體累積；首次請求會至少寫入當前點）。"""
    from core.capacity_monitor import get_capacity_monitor

    build_capacity_status()
    return get_capacity_monitor().get_history(hours=hours)


def get_api_pool_alerts_data(thresholds: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """複用 admin.api_pool.check_capacity_alerts（JWT admin 端點）。"""
    from admin.api_pool import get_api_pool_manager
    return get_api_pool_manager().check_capacity_alerts(thresholds)


def get_api_pool_forecast_data(days: int = 7) -> Dict[str, Any]:
    """複用 admin.api_pool.get_capacity_forecast（JWT admin 端點）。"""
    from admin.api_pool import get_api_pool_manager
    return get_api_pool_manager().get_capacity_forecast(days)


async def handle_capacity_status_alias(backend_service, payload=None) -> Dict[str, Any]:
    """COMMAND_ALIAS：capacity:status"""
    try:
        return {'success': True, 'data': build_capacity_status()}
    except Exception as e:
        print(f"[api_stats_routes] capacity:status 失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


async def handle_capacity_history_alias(backend_service, payload=None) -> Dict[str, Any]:
    """COMMAND_ALIAS：capacity:history"""
    try:
        payload = payload or {}
        hours = int(payload.get('hours', 24))
        return {'success': True, 'data': build_capacity_history(hours=hours)}
    except Exception as e:
        print(f"[api_stats_routes] capacity:history 失敗: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}


# ==================== aiohttp REST handlers（JWT + tenant.role==admin）====================

def _require_admin(request) -> Optional[Any]:
    """檢查 SaaS JWT admin；失敗回傳 web.Response，成功回傳 None。"""
    if web is None:
        return None
    tenant = request.get('tenant')
    if not tenant or getattr(tenant, 'role', None) != 'admin':
        return web.json_response({'success': False, 'error': '需要管理員權限'}, status=403)
    return None


async def http_api_stats_dashboard(request):
    """GET /api/v1/admin/api-stats/dashboard"""
    denied = _require_admin(request)
    if denied:
        return denied
    result = await get_dashboard_data()
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_api_stats_clear_alerts(request):
    """POST /api/v1/admin/api-stats/clear-alerts"""
    denied = _require_admin(request)
    if denied:
        return denied
    result = await clear_alerts()
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_api_stats_overall(request):
    """GET /api/v1/admin/api-stats/overall?days=7"""
    denied = _require_admin(request)
    if denied:
        return denied
    days = int(request.query.get('days', '7'))
    result = await get_overall_stats(days=days)
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_api_stats_hourly(request):
    """GET /api/v1/admin/api-stats/hourly?hours=24"""
    denied = _require_admin(request)
    if denied:
        return denied
    hours = int(request.query.get('hours', '24'))
    result = await get_hourly_stats(hours=hours)
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_api_stats_ranking(request):
    """GET /api/v1/admin/api-stats/ranking?top_n=10"""
    denied = _require_admin(request)
    if denied:
        return denied
    top_n = int(request.query.get('top_n', '10'))
    result = await get_api_ranking(top_n=top_n)
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_api_stats_alerts(request):
    """GET /api/v1/admin/api-stats/alerts?limit=20"""
    denied = _require_admin(request)
    if denied:
        return denied
    limit = int(request.query.get('limit', '20'))
    result = await get_alerts(limit=limit)
    status = 200 if result.get('success') else 500
    return web.json_response(result, status=status)


async def http_capacity_status(request):
    """GET /api/v1/admin/capacity/status"""
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        data = build_capacity_status()
        return web.json_response({'success': True, 'data': data})
    except Exception as e:
        print(f"[api_stats_routes] capacity/status 失敗: {e}", file=sys.stderr)
        return web.json_response({'success': False, 'error': str(e)}, status=500)


async def http_capacity_history(request):
    """GET /api/v1/admin/capacity/history?hours=24"""
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        hours = int(request.query.get('hours', '24'))
        data = build_capacity_history(hours=hours)
        return web.json_response({'success': True, 'data': data})
    except Exception as e:
        print(f"[api_stats_routes] capacity/history 失敗: {e}", file=sys.stderr)
        return web.json_response({'success': False, 'error': str(e)}, status=500)


async def http_api_pool_alerts(request):
    """GET /api/v1/admin/api-pool/alerts — JWT 版，複用 admin.api_pool 業務邏輯"""
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        thresholds = {}
        for key in ('critical_available', 'warning_available', 'critical_utilization', 'warning_utilization'):
            if request.query.get(key):
                thresholds[key] = int(request.query.get(key))
        data = get_api_pool_alerts_data(thresholds if thresholds else None)
        return web.json_response({'success': True, 'data': data})
    except Exception as e:
        print(f"[api_stats_routes] api-pool/alerts 失敗: {e}", file=sys.stderr)
        return web.json_response({'success': False, 'error': str(e)}, status=500)


async def http_api_pool_forecast(request):
    """GET /api/v1/admin/api-pool/forecast — JWT 版，複用 admin.api_pool 業務邏輯"""
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        days = int(request.query.get('days', '7'))
        data = get_api_pool_forecast_data(days=days)
        return web.json_response({'success': True, 'data': data})
    except Exception as e:
        print(f"[api_stats_routes] api-pool/forecast 失敗: {e}", file=sys.stderr)
        return web.json_response({'success': False, 'error': str(e)}, status=500)

#!/usr/bin/env python3
"""
P11-1: SystemRoutesMixin
系統路由處理器 — 健康檢查/診斷/監控/運維/導出/API文檔/前端遙測
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta
from aiohttp import web

logger = logging.getLogger(__name__)


class SystemRoutesMixin:
    """系統路由處理器 — 健康檢查/診斷/監控/運維/導出/API文檔/前端遙測 — 供 HttpApiServer 繼承使用"""

    async def basic_health_check(self, request):
        """🔧 P8-2: 基础健康检查（重命名，避免与完整 health_check 冲突）"""
        # 🔧 P8-3: 集成迁移状态到健康检查
        migration_status = None
        if self.backend_service and hasattr(self.backend_service, '_migration_status'):
            migration_status = self.backend_service._migration_status
        # P11-1: 通过 self 获取模块级变量（避免循环导入）
        WALLET_MODULE_AVAILABLE = getattr(self, '_wallet_available', False)
        if not WALLET_MODULE_AVAILABLE:
            try:
                import importlib
                mod = importlib.import_module('api.http_server')
                WALLET_MODULE_AVAILABLE = getattr(mod, 'WALLET_MODULE_AVAILABLE', False)
            except Exception:
                WALLET_MODULE_AVAILABLE = False
        return self._json_response({
            'status': 'ok',
            'service': 'TG-Matrix API',
            'version': '2.1.1',
            'timestamp': datetime.now().isoformat(),
            'backend_ready': self.backend_service is not None,
            'wallet_module': WALLET_MODULE_AVAILABLE,
            'migration': migration_status
        })

    async def export_data(self, request):
        """導出用戶數據"""
        try:
            from core.data_export import get_export_service, ExportOptions
            service = get_export_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            data = await request.json()
            options = ExportOptions(
                include_accounts=data.get('include_accounts', True),
                include_messages=data.get('include_messages', True),
                include_contacts=data.get('include_contacts', True),
                include_settings=data.get('include_settings', True),
                include_usage=data.get('include_usage', False),
                mask_sensitive=data.get('mask_sensitive', True),
                format=data.get('format', 'json')
            )
            
            result = await service.export_user_data(user_id, options)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Export data error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def list_backups(self, request):
        """列出備份"""
        try:
            from core.data_export import get_export_service
            service = get_export_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            backups = await service.list_backups(user_id)
            return self._json_response({
                'success': True,
                'data': [b.to_dict() for b in backups]
            })
        except Exception as e:
            logger.error(f"List backups error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def create_backup(self, request):
        """創建備份"""
        try:
            from core.data_export import get_export_service
            service = get_export_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            data = await request.json()
            backup_type = data.get('type', 'full')
            
            result = await service.create_backup(user_id, backup_type)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Create backup error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def delete_backup(self, request):
        """刪除備份"""
        try:
            from core.data_export import get_export_service
            service = get_export_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            backup_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            result = await service.delete_backup(user_id, backup_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Delete backup error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def download_backup(self, request):
        """下載備份"""
        try:
            from core.data_export import get_export_service
            import os
            service = get_export_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            backup_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            # 獲取備份列表找到對應文件
            backups = await service.list_backups(user_id)
            backup = next((b for b in backups if b.id == backup_id), None)
            
            if not backup:
                return self._json_response({
                    'success': False,
                    'error': '備份不存在'
                }, 404)
            
            filepath = os.path.join(service.backup_dir, user_id, backup.filename)
            
            if not os.path.exists(filepath):
                return self._json_response({
                    'success': False,
                    'error': '備份文件不存在'
                }, 404)
            
            # 返回文件
            with open(filepath, 'rb') as f:
                content = f.read()
            
            return web.Response(
                body=content,
                content_type='application/zip',
                headers={
                    'Content-Disposition': f'attachment; filename="{backup.filename}"'
                }
            )
        except Exception as e:
            logger.error(f"Download backup error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def system_health(self, request):
        """系統健康檢查"""
        try:
            from core.monitoring import get_system_monitor
            monitor = get_system_monitor()
            result = await monitor.health_check()
            
            status_code = 200
            if result['status'] == 'unhealthy':
                status_code = 503
            elif result['status'] == 'degraded':
                status_code = 200  # 降級仍返回 200
            
            return self._json_response(result, status_code)
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return self._json_response({
                'status': 'unhealthy',
                'error': str(e)
            }, 503)

    async def system_metrics(self, request):
        """獲取系統指標"""
        try:
            from core.monitoring import get_system_monitor
            monitor = get_system_monitor()
            metrics = monitor.collect_metrics()
            
            return self._json_response({
                'success': True,
                'data': metrics.to_dict()
            })
        except Exception as e:
            logger.error(f"Get metrics error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def system_alerts(self, request):
        """獲取系統告警"""
        try:
            from core.monitoring import get_system_monitor
            monitor = get_system_monitor()
            
            status = request.query.get('status')
            limit = int(request.query.get('limit', '50'))
            
            alerts = await monitor.get_alerts(status, limit)
            
            return self._json_response({
                'success': True,
                'data': [a.to_dict() for a in alerts]
            })
        except Exception as e:
            logger.error(f"Get alerts error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def swagger_ui(self, request):
        """Swagger UI"""
        from api.openapi import SWAGGER_UI_HTML
        return web.Response(text=SWAGGER_UI_HTML, content_type='text/html')

    async def redoc_ui(self, request):
        """ReDoc UI"""
        from api.openapi import REDOC_HTML
        return web.Response(text=REDOC_HTML, content_type='text/html')

    async def openapi_json(self, request):
        """OpenAPI JSON 規範 — P11-3: 自動掃描已註冊路由"""
        from api.openapi import get_openapi_json
        app = request.app if request else getattr(self, 'app', None)
        return web.Response(
            text=get_openapi_json(app),
            content_type='application/json'
        )

    def _convert_to_csv(self, report_data: dict) -> str:
        """將報表數據轉換為 CSV"""
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 寫入標題和時間
        writer.writerow(['配額使用報表'])
        writer.writerow([f'生成時間: {report_data.get("generated_at", "")}'])
        writer.writerow([f'統計區間: {report_data.get("period", {}).get("start", "")} 至 {report_data.get("period", {}).get("end", "")}'])
        writer.writerow([])
        
        # 總覽
        writer.writerow(['=== 總覽 ==='])
        writer.writerow(['配額類型', '總使用量', '日均', '最高單日', '活躍用戶數'])
        for qt, stats in report_data.get('summary', {}).items():
            writer.writerow([
                qt, stats.get('total', 0), stats.get('avg_per_day', 0),
                stats.get('max_single_day', 0), stats.get('unique_users', 0)
            ])
        writer.writerow([])
        
        # 每日統計
        writer.writerow(['=== 每日統計 ==='])
        daily = report_data.get('daily', [])
        if daily:
            headers = ['日期'] + list(daily[0].keys() - {'date'})
            writer.writerow(headers)
            for day in daily:
                row = [day.get('date', '')]
                for h in headers[1:]:
                    val = day.get(h, {})
                    if isinstance(val, dict):
                        row.append(val.get('total', 0))
                    else:
                        row.append(val)
                writer.writerow(row)
        
        return output.getvalue()

    async def quota_consistency_check(self, request):
        """用戶 - 個人配額一致性校驗"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            from core.quota_service import get_quota_service
            service = get_quota_service()
            result = service.verify_quota_consistency(tenant.user_id)
            
            return self._json_response({
                'success': True,
                'data': result
            })
        except Exception as e:
            logger.error(f"Quota consistency check error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def health_check(self, request):
        """完整健康檢查"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            health = await service.check_all()
            
            status_code = 200 if health.status.value == 'healthy' else 503
            return self._json_response(health.to_dict(), status_code)
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return self._json_response({
                'status': 'unhealthy',
                'error': str(e)
            }, 503)

    async def liveness_probe(self, request):
        """存活探針"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            result = await service.liveness_probe()
            return self._json_response(result)
        except:
            return self._json_response({'status': 'dead'}, 503)

    async def readiness_probe(self, request):
        """就绪探针 — 🔧 P8-3: 增加迁移完成性检查"""
        try:
            # 检查迁移状态：运行中视为未就绪
            if self.backend_service and hasattr(self.backend_service, '_migration_status'):
                mig = self.backend_service._migration_status
                if mig.get('state') == 'running':
                    return self._json_response({
                        'status': 'not_ready',
                        'reason': 'database_migration_in_progress',
                        'migration': mig
                    }, 503)
            
            from core.health_service import get_health_service
            service = get_health_service()
            
            result = await service.readiness_probe()
            # 附加迁移信息
            if self.backend_service and hasattr(self.backend_service, '_migration_status'):
                result['migration'] = self.backend_service._migration_status
            status_code = 200 if result['status'] == 'ready' else 503
            return self._json_response(result, status_code)
        except Exception as e:
            return self._json_response({
                'status': 'not_ready',
                'error': str(e)
            }, 503)

    async def service_info(self, request):
        """服務信息"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            return self._json_response({
                'success': True,
                'data': service.get_service_info()
            })
        except Exception as e:
            logger.error(f"Service info error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def health_history(self, request):
        """🔧 P10-4: 獲取健康檢查歷史記錄"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            limit = min(int(request.query.get('limit', '50')), 100)
            history = service.get_health_history(limit)
            
            return self._json_response({
                'success': True,
                'data': {
                    'history': history,
                    'count': len(history)
                }
            })
        except Exception as e:
            logger.error(f"Health history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def prometheus_metrics(self, request):
        """🔧 P11-2: 導出 Prometheus text 格式指標"""
        try:
            from core.metrics_exporter import get_metrics_collector
            collector = get_metrics_collector()
            metrics_text = collector.export_metrics()
            
            return web.Response(
                text=metrics_text,
                content_type='text/plain; version=0.0.4; charset=utf-8',
                status=200
            )
        except Exception as e:
            logger.error(f"Metrics export error: {e}")
            return web.Response(text=f'# Error: {e}\n', status=500, content_type='text/plain')

    async def resource_trends(self, request):
        """🔧 P11-4: 資源趨勢分析 + 擴縮容建議"""
        try:
            from core.observability_bridge import ResourceAnalyzer
            analysis = ResourceAnalyzer.analyze_trends()
            return self._json_response({
                'success': True,
                'data': analysis
            })
        except Exception as e:
            logger.error(f"Resource trends error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def error_patterns(self, request):
        """🔧 P11-5: 獲取錯誤模式聚類結果"""
        try:
            from core.observability_bridge import get_error_cluster
            cluster = get_error_cluster()
            
            view = request.query.get('view', 'top')  # top | recent | stats
            limit = min(int(request.query.get('limit', '20')), 100)
            hours = int(request.query.get('hours', '24'))
            
            if view == 'recent':
                data = cluster.get_recent_patterns(hours=hours, limit=limit)
            elif view == 'stats':
                data = cluster.get_stats()
            else:
                data = cluster.get_top_patterns(limit=limit)
            
            return self._json_response({
                'success': True,
                'data': data
            })
        except Exception as e:
            logger.error(f"Error patterns error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def ops_dashboard(self, request):
        """
        🔧 P11-6: 管理員運維 Dashboard
        
        統一聚合所有可觀測性數據：
        - 服務健康與穩定性
        - 資源趨勢與擴縮容建議
        - 錯誤模式 Top 5
        - 異常檢測統計
        - 告警歷史摘要
        - Prometheus 核心指標摘要
        """
        try:
            dashboard = {}
            
            # 1. 服務健康
            try:
                from core.health_service import get_health_service
                hs = get_health_service()
                health = await hs.check_all()
                info = hs.get_service_info()
                history = hs.get_health_history(10)
                
                if history:
                    healthy_count = sum(1 for h in history if h['status'] == 'healthy')
                    stability = round(healthy_count / len(history) * 100, 1)
                else:
                    stability = 100.0
                
                dashboard['health'] = {
                    'status': health.status.value,
                    'stability_pct': stability,
                    'uptime': info.get('uptime_human', ''),
                    'version': info.get('version', 'unknown'),
                    'checks_summary': {c.name: c.status.value for c in health.checks},
                }
            except Exception as e:
                dashboard['health'] = {'error': str(e)}
            
            # 2. 資源趨勢
            try:
                from core.observability_bridge import ResourceAnalyzer
                dashboard['resources'] = ResourceAnalyzer.analyze_trends()
            except Exception as e:
                dashboard['resources'] = {'error': str(e)}
            
            # 3. 錯誤模式 Top 5
            try:
                from core.observability_bridge import get_error_cluster
                cluster = get_error_cluster()
                dashboard['error_patterns'] = {
                    'top_5': cluster.get_top_patterns(5),
                    'stats': cluster.get_stats(),
                }
            except Exception as e:
                dashboard['error_patterns'] = {'error': str(e)}
            
            # 4. 異常檢測統計
            try:
                from admin.anomaly_detection import get_anomaly_manager
                am = get_anomaly_manager()
                dashboard['anomalies'] = am.get_anomaly_stats(hours=24)
            except Exception as e:
                dashboard['anomalies'] = {'error': str(e)}
            
            # 5. 告警歷史摘要
            try:
                from admin.alert_service import get_alert_service
                alert_svc = get_alert_service()
                alert_history = await alert_svc.get_history(limit=10)
                dashboard['alerts'] = {
                    'recent': [
                        {
                            'type': a.get('alert_type', ''),
                            'level': a.get('level', ''),
                            'time': a.get('timestamp', ''),
                            'sent': a.get('sent', False),
                        }
                        for a in (alert_history if isinstance(alert_history, list) else [])
                    ][:10]
                }
            except Exception as e:
                dashboard['alerts'] = {'error': str(e)}
            
            # 6. Prometheus 指標摘要
            try:
                from core.metrics_exporter import get_metrics_collector
                mc = get_metrics_collector()
                uptime = time.time() - mc._start_time
                total_req = mc._counters.get('tgmatrix_http_requests_total', 0)
                total_err = mc._counters.get('tgmatrix_http_errors_total', 0)
                
                dashboard['metrics_summary'] = {
                    'total_requests': int(total_req),
                    'total_errors': int(total_err),
                    'error_rate_pct': round(total_err / max(total_req, 1) * 100, 2),
                    'avg_rps': round(total_req / max(uptime, 1), 2),
                    'top_endpoints': sorted(
                        [
                            {'endpoint': ep, 'count': cnt}
                            for ep, cnt in mc._endpoint_requests.items()
                        ],
                        key=lambda x: x['count'],
                        reverse=True
                    )[:10],
                }
            except Exception as e:
                dashboard['metrics_summary'] = {'error': str(e)}
            
            # 7. 熔斷器狀態
            try:
                from core.health_service import get_health_service
                hs2 = get_health_service()
                dashboard['circuit_breakers'] = hs2.get_all_circuit_breakers()
            except Exception as e:
                dashboard['circuit_breakers'] = {'error': str(e)}
            
            return self._json_response({
                'success': True,
                'data': dashboard,
                'timestamp': datetime.utcnow().isoformat() if hasattr(datetime, 'utcnow') else '',
            })
        except Exception as e:
            logger.error(f"Ops dashboard error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def status_page(self, request):
        """
        🔧 P10-5: 服務狀態總覽
        
        整合所有健康指標、版本信息、備份狀態為統一的狀態頁面
        """
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            # 收集所有狀態信息
            health = await service.check_all()
            info = service.get_service_info()
            breakers = service.get_all_circuit_breakers()
            history = service.get_health_history(10)
            
            # 計算穩定性（最近歷史中 healthy 的佔比）
            if history:
                healthy_count = sum(1 for h in history if h['status'] == 'healthy')
                stability = round(healthy_count / len(history) * 100, 1)
            else:
                stability = 100.0
            
            status_page_data = {
                # 總覽
                'status': health.status.value,
                'stability_pct': stability,
                
                # 服務信息
                'service': {
                    'name': info.get('name', 'TG Matrix'),
                    'version': info.get('version', 'unknown'),
                    'environment': info.get('environment', 'unknown'),
                    'uptime': info.get('uptime_human', ''),
                    'uptime_seconds': info.get('uptime_seconds', 0),
                    'started_at': info.get('started_at', ''),
                    'python_version': info.get('python_version', ''),
                },
                
                # 各項檢查
                'checks': [c.to_dict() for c in health.checks],
                
                # 熔斷器狀態
                'circuit_breakers': breakers,
                
                # 最近趨勢
                'recent_history': history,
                
                'timestamp': health.timestamp,
            }
            
            return self._json_response({
                'success': True,
                'data': status_page_data
            })
        except Exception as e:
            logger.error(f"Status page error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def receive_frontend_error(self, request):
        """
        🔧 P5-2: 接收前端錯誤上報
        
        不需要認證（允許匿名上報），但做速率限制
        """
        try:
            data = await request.json()
            
            # 提取用戶信息（如果有）
            user_id = ''
            tenant = request.get('tenant')
            if tenant:
                user_id = getattr(tenant, 'user_id', '')
            
            # 結構化記錄
            error_record = {
                'source': 'frontend',
                'user_id': user_id,
                'error_id': data.get('id', ''),
                'type': data.get('type', 'unknown'),
                'severity': data.get('severity', 'error'),
                'code': data.get('code', ''),
                'message': data.get('message', '')[:500],
                'component': data.get('component', ''),
                'action': data.get('action', ''),
                'stack': data.get('stack', '')[:1000],
                'url': data.get('url', '')[:200],
                'user_agent': data.get('userAgent', '')[:200],
                'client_timestamp': data.get('timestamp', ''),
                'server_timestamp': datetime.now().isoformat(),
                'request_id': request.get('request_id', '')
            }
            
            # 寫入日誌
            logger.warning(
                f"[FrontendError] type={error_record['type']} severity={error_record['severity']} "
                f"component={error_record['component']} action={error_record['action']} "
                f"message={error_record['message'][:100]} user={user_id}"
            )
            
            # 存入數據庫（持久化，方便查詢）
            try:
                import sqlite3
                db_path = os.environ.get('DATABASE_PATH', 
                    os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db'))
                conn = sqlite3.connect(db_path)
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS frontend_errors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        error_id TEXT,
                        user_id TEXT,
                        type TEXT,
                        severity TEXT,
                        code TEXT,
                        message TEXT,
                        component TEXT,
                        action TEXT,
                        stack TEXT,
                        url TEXT,
                        user_agent TEXT,
                        client_timestamp TEXT,
                        server_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                        request_id TEXT
                    )
                ''')
                conn.execute('''
                    INSERT INTO frontend_errors 
                    (error_id, user_id, type, severity, code, message, component, action, stack, url, user_agent, client_timestamp, request_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    error_record['error_id'], error_record['user_id'],
                    error_record['type'], error_record['severity'],
                    error_record['code'], error_record['message'],
                    error_record['component'], error_record['action'],
                    error_record['stack'], error_record['url'],
                    error_record['user_agent'], error_record['client_timestamp'],
                    error_record['request_id']
                ))
                conn.commit()
                conn.close()
            except Exception as db_err:
                logger.error(f"Failed to persist frontend error: {db_err}")
            
            return self._json_response({'success': True, 'received': True})
            
        except Exception as e:
            logger.error(f"Frontend error receive failed: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def receive_performance_report(self, request):
        """
        🔧 P7-6: 接收前端 Web Vitals 性能報告
        
        接收格式：
        {
            "metrics": [{"name": "LCP", "value": 2100, "rating": "good"}],
            "navigation": {"loadTime": 1500, "domContentLoaded": 800},
            "url": "/dashboard",
            "connection": {"effectiveType": "4g", "rtt": 50}
        }
        """
        try:
            # 支持 sendBeacon (text/plain) 和 fetch (application/json)
            content_type = request.content_type or ''
            
            if 'json' in content_type or 'plain' in content_type:
                body = await request.text()
                import json
                data = json.loads(body)
            else:
                data = await request.json()
            
            metrics = data.get('metrics', [])
            url = data.get('url', '')
            navigation = data.get('navigation')
            connection = data.get('connection')
            
            if not metrics:
                return self._json_response({'success': True, 'message': 'No metrics'})
            
            # 記錄到日誌（結構化）
            metric_summary = {m['name']: m['value'] for m in metrics}
            poor_metrics = [m for m in metrics if m.get('rating') == 'poor']
            
            if poor_metrics:
                parts = [f"{m['name']}={m['value']}" for m in poor_metrics]
                logger.warning(
                    f"[WebVitals] Poor metrics on {url}: {', '.join(parts)}"
                )
            else:
                logger.info(f"[WebVitals] {url}: {metric_summary}")
            
            # 持久化到數據庫
            try:
                import sqlite3
                db_path = os.environ.get('DATABASE_PATH',
                    os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db'))
                conn = sqlite3.connect(db_path)
                
                # 創建表（如果不存在）
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS performance_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        url TEXT,
                        metric_name TEXT,
                        metric_value REAL,
                        rating TEXT,
                        load_time INTEGER,
                        dom_content_loaded INTEGER,
                        effective_type TEXT,
                        rtt INTEGER,
                        user_agent TEXT,
                        server_timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_perf_metrics_time 
                    ON performance_metrics(server_timestamp)
                ''')
                
                # 插入每個指標
                user_agent = data.get('userAgent', '')[:200]
                eff_type = connection.get('effectiveType', '') if connection else ''
                rtt = connection.get('rtt', 0) if connection else 0
                load_time = navigation.get('loadTime', 0) if navigation else 0
                dcl = navigation.get('domContentLoaded', 0) if navigation else 0
                
                for metric in metrics:
                    conn.execute('''
                        INSERT INTO performance_metrics 
                        (url, metric_name, metric_value, rating, load_time, 
                         dom_content_loaded, effective_type, rtt, user_agent)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        url,
                        metric.get('name', ''),
                        metric.get('value', 0),
                        metric.get('rating', ''),
                        load_time,
                        dcl,
                        eff_type,
                        rtt,
                        user_agent
                    ))
                
                conn.commit()
                conn.close()
                
            except Exception as db_err:
                logger.error(f"Failed to persist performance metrics: {db_err}")
            
            return self._json_response({'success': True, 'received': len(metrics)})
            
        except Exception as e:
            logger.error(f"Performance report receive failed: {e}")
            return self._json_response({'success': True})  # 靜默成功（不影響前端）

    async def get_frontend_audit_logs(self, request):
        """
        🔧 P8-5: 查詢前端審計日誌
        
        查詢參數：
        - action: 過濾操作類型
        - severity: 過濾嚴重級別
        - user_id: 過濾用戶
        - limit: 返回數量（默認 50，最大 200）
        - offset: 分頁偏移
        """
        try:
            action = request.query.get('action', '')
            severity = request.query.get('severity', '')
            user_id = request.query.get('user_id', '')
            limit = min(int(request.query.get('limit', '50')), 200)
            offset = int(request.query.get('offset', '0'))
            
            from core.db_utils import get_connection
            with get_connection() as conn:
                # 確保表存在
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS frontend_audit_log (
                        id TEXT PRIMARY KEY,
                        action TEXT NOT NULL,
                        severity TEXT DEFAULT 'info',
                        user_id TEXT,
                        details TEXT,
                        timestamp INTEGER,
                        received_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                query = 'SELECT * FROM frontend_audit_log WHERE 1=1'
                params = []
                
                if action:
                    query += ' AND action = ?'
                    params.append(action)
                if severity:
                    query += ' AND severity = ?'
                    params.append(severity)
                if user_id:
                    query += ' AND user_id = ?'
                    params.append(user_id)
                    
                query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
                params.extend([limit, offset])
                
                rows = conn.execute(query, params).fetchall()
                logs = [dict(row) for row in rows]
                
                # 總數
                count_query = 'SELECT COUNT(*) FROM frontend_audit_log WHERE 1=1'
                count_params = []
                if action:
                    count_query += ' AND action = ?'
                    count_params.append(action)
                if severity:
                    count_query += ' AND severity = ?'
                    count_params.append(severity)
                if user_id:
                    count_query += ' AND user_id = ?'
                    count_params.append(user_id)
                    
                total = conn.execute(count_query, count_params).fetchone()[0]
            
            return self._json_response({
                'success': True,
                'data': {
                    'logs': logs,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            })
            
        except Exception as e:
            logger.error(f"Frontend audit logs query error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_diagnostics(self, request):
        """獲取完整診斷報告"""
        try:
            from core.diagnostics import get_diagnostics_service
            diag = get_diagnostics_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            report = await diag.run_all_checks()
            
            return self._json_response({
                'success': True,
                'data': {
                    'timestamp': report.timestamp,
                    'overall_status': report.overall_status,
                    'checks': [c.to_dict() for c in report.checks],
                    'system_info': report.system_info,
                    'performance': report.performance,
                    'errors': report.errors,
                    'recommendations': report.recommendations
                }
            })
        except Exception as e:
            logger.error(f"Get diagnostics error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_quick_health(self, request):
        """快速健康檢查（公開）"""
        try:
            from core.diagnostics import get_diagnostics_service
            diag = get_diagnostics_service()
            
            result = await diag.get_quick_health()
            return self._json_response({'success': True, 'data': result})
        except Exception as e:
            logger.error(f"Quick health check error: {e}")
            return self._json_response({
                'success': False,
                'status': 'unhealthy',
                'error': str(e)
            }, 500)

    async def get_system_info(self, request):
        """獲取系統信息"""
        try:
            from core.diagnostics import get_diagnostics_service
            diag = get_diagnostics_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            info = diag.get_system_info()
            return self._json_response({'success': True, 'data': info})
        except Exception as e:
            logger.error(f"Get system info error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== P12-1: Debug/Diagnostic Methods ====================

    def _get_wallet_vars(self):
        """P12-1: 安全获取 wallet 模块级变量（避免循环导入）"""
        try:
            import importlib
            mod = importlib.import_module('api.http_server')
            return (
                getattr(mod, 'WALLET_MODULE_AVAILABLE', False),
                getattr(mod, 'WALLET_IMPORT_ERROR', None)
            )
        except Exception:
            return False, None

    async def debug_modules(self, request):
        """診斷模塊狀態"""
        import os
        import sys
        
        WALLET_MODULE_AVAILABLE, WALLET_IMPORT_ERROR = self._get_wallet_vars()
        
        # 檢查 wallet 目錄
        wallet_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'wallet')
        wallet_exists = os.path.exists(wallet_path)
        wallet_files = os.listdir(wallet_path) if wallet_exists else []
        
        return self._json_response({
            'wallet_module_available': WALLET_MODULE_AVAILABLE,
            'wallet_import_error': WALLET_IMPORT_ERROR,
            'wallet_path': wallet_path,
            'wallet_exists': wallet_exists,
            'wallet_files': wallet_files[:20],
            'python_path': sys.path[:5],
            'cwd': os.getcwd()
        })

    async def debug_deploy(self, request):
        """部署診斷"""
        import os
        
        WALLET_MODULE_AVAILABLE, WALLET_IMPORT_ERROR = self._get_wallet_vars()
        
        deploy_version = "unknown"
        try:
            from deploy_test import DEPLOY_VERSION
            deploy_version = DEPLOY_VERSION
        except:
            pass
        
        # 🔧 P1: 從文件讀取初始化錯誤
        init_error = None
        try:
            error_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'backend_init_error.json')
            if os.path.exists(error_path):
                with open(error_path, 'r') as f:
                    init_error = json.loads(f.read())
        except Exception as read_err:
            init_error = f'Error reading init error file: {read_err}'
        
        # 🔧 P3-3: 读取启动性能指标
        init_perf = None
        try:
            perf_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'backend_init_perf.json')
            if os.path.exists(perf_path):
                with open(perf_path, 'r') as f:
                    init_perf = json.loads(f.read())
        except Exception:
            pass
        
        return self._json_response({
            'deploy_version': deploy_version,
            'http_server_version': '2026-02-10-p3',
            'wallet_available': WALLET_MODULE_AVAILABLE,
            'wallet_error': WALLET_IMPORT_ERROR,
            'backend_initialized': self.backend_service is not None,
            'backend_init_error': init_error,
            'init_performance': init_perf,
        })

    async def debug_accounts(self, request):
        """🔧 P1: 帳號診斷端點 —— 深度檢測帳號加載鏈路"""
        import os
        import sys
        from pathlib import Path
        
        diag = {
            'timestamp': datetime.now().isoformat(),
            'checks': {},
            'errors': [],
        }
        
        # 1. 檢查 config 導入
        try:
            from config import DATABASE_PATH, DATABASE_DIR
            diag['checks']['config_import'] = 'OK'
            diag['checks']['DATABASE_PATH'] = str(DATABASE_PATH)
            diag['checks']['DATABASE_DIR'] = str(DATABASE_DIR)
            diag['checks']['db_file_exists'] = DATABASE_PATH.exists()
        except Exception as e:
            diag['checks']['config_import'] = f'FAIL: {e}'
            diag['errors'].append(f'config import: {e}')
        
        # 2. 檢查 account_mixin 導入
        try:
            from db.account_mixin import AccountMixin, ACCOUNTS_DB_PATH, HAS_AIOSQLITE
            diag['checks']['account_mixin_import'] = 'OK'
            diag['checks']['ACCOUNTS_DB_PATH'] = str(ACCOUNTS_DB_PATH)
            diag['checks']['HAS_AIOSQLITE'] = HAS_AIOSQLITE
            diag['checks']['accounts_db_exists'] = ACCOUNTS_DB_PATH.exists()
        except Exception as e:
            diag['checks']['account_mixin_import'] = f'FAIL: {e}'
            diag['errors'].append(f'account_mixin import: {e}')
        
        # 3. 檢查 database.db 實例
        try:
            from database import db
            diag['checks']['database_db_import'] = 'OK'
            diag['checks']['db_type'] = type(db).__name__
            diag['checks']['db_mro'] = [c.__name__ for c in type(db).__mro__[:8]]
            diag['checks']['has_get_all_accounts'] = hasattr(db, 'get_all_accounts')
        except Exception as e:
            diag['checks']['database_db_import'] = f'FAIL: {e}'
            diag['errors'].append(f'database db import: {e}')
        
        # 4. 直接查詢數據庫
        try:
            import sqlite3 as _sqlite3
            from config import DATABASE_PATH as _db_path
            if _db_path.exists():
                conn = _sqlite3.connect(str(_db_path))
                cursor = conn.cursor()
                
                # 檢查 accounts 表是否存在
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
                table_exists = cursor.fetchone() is not None
                diag['checks']['accounts_table_exists'] = table_exists
                
                if table_exists:
                    # 檢查欄位
                    cursor.execute("PRAGMA table_info(accounts)")
                    columns = [row[1] for row in cursor.fetchall()]
                    diag['checks']['accounts_columns'] = columns
                    diag['checks']['has_owner_user_id_column'] = 'owner_user_id' in columns
                    
                    # 計數
                    cursor.execute("SELECT COUNT(*) FROM accounts")
                    total = cursor.fetchone()[0]
                    diag['checks']['total_accounts'] = total
                    
                    # 按狀態統計
                    cursor.execute("SELECT status, COUNT(*) FROM accounts GROUP BY status")
                    status_counts = {row[0] or 'NULL': row[1] for row in cursor.fetchall()}
                    diag['checks']['accounts_by_status'] = status_counts
                    
                    # owner_user_id 分佈
                    if 'owner_user_id' in columns:
                        cursor.execute("SELECT owner_user_id, COUNT(*) FROM accounts GROUP BY owner_user_id")
                        owner_counts = {str(row[0] or 'NULL'): row[1] for row in cursor.fetchall()}
                        diag['checks']['accounts_by_owner'] = owner_counts
                
                conn.close()
            else:
                diag['checks']['accounts_table_exists'] = False
                diag['errors'].append(f'DB file not found: {_db_path}')
        except Exception as e:
            diag['checks']['direct_query'] = f'FAIL: {e}'
            diag['errors'].append(f'direct query: {e}')
        
        # 5. 嘗試通過 db 實例獲取帳號
        try:
            from database import db as _db
            accounts = await _db.get_all_accounts()
            diag['checks']['db_get_all_accounts'] = f'OK, returned {len(accounts)} accounts'
            if accounts:
                diag['checks']['first_account_keys'] = list(accounts[0].keys())[:15]
        except Exception as e:
            diag['checks']['db_get_all_accounts'] = f'FAIL: {e}'
            diag['errors'].append(f'db.get_all_accounts(): {e}')
        
        # 6. 檢查租戶上下文
        try:
            from core.tenant_context import get_current_tenant
            tenant = get_current_tenant()
            diag['checks']['tenant_context'] = {
                'available': tenant is not None,
                'user_id': tenant.user_id if tenant else None,
            }
        except ImportError:
            diag['checks']['tenant_context'] = 'tenant_context module not available'
        except Exception as e:
            diag['checks']['tenant_context'] = f'Error: {e}'
        
        # 7. 環境變量
        diag['checks']['env'] = {
            'ELECTRON_MODE': os.environ.get('ELECTRON_MODE', 'NOT SET'),
            'DATABASE_PATH_ENV': os.environ.get('DATABASE_PATH', 'NOT SET'),
            'TG_DATA_DIR': os.environ.get('TG_DATA_DIR', 'NOT SET'),
            'PYTHONPATH': os.environ.get('PYTHONPATH', 'NOT SET'),
            'PWD': os.getcwd(),
        }
        
        # 8. 模擬帶 owner_user_id 的查詢
        try:
            from database import db as _db2
            # 使用查到的 owner_user_id 進行過濾測試
            if 'accounts_by_owner' in diag.get('checks', {}):
                for owner_id in diag['checks']['accounts_by_owner']:
                    if owner_id and owner_id != 'NULL':
                        filtered = await _db2.get_all_accounts(owner_user_id=owner_id)
                        diag['checks'][f'filtered_accounts_{owner_id[:8]}'] = len(filtered)
        except Exception as e:
            diag['checks']['filtered_query'] = f'Error: {e}'
        
        # 9. 直接測試 handle_get_accounts（模擬實際請求路徑）
        try:
            if self.backend_service:
                result = await self.backend_service.handle_command('get-accounts', {})
                if result:
                    diag['checks']['handle_command_result'] = {
                        'success': result.get('success'),
                        'accounts_count': len(result.get('accounts', [])),
                        'error': result.get('error'),
                    }
                else:
                    diag['checks']['handle_command_result'] = 'returned None'
            else:
                diag['checks']['handle_command_result'] = 'backend_service not initialized'
        except Exception as e:
            diag['checks']['handle_command_result'] = f'Error: {e}'
            diag['errors'].append(f'handle_command: {e}')
        
        # 10. 後端服務狀態
        diag['checks']['backend_service_status'] = {
            'initialized': self.backend_service is not None,
            'type': type(self.backend_service).__name__ if self.backend_service else None,
        }
        
        diag['summary'] = 'ALL OK' if not diag['errors'] else f'{len(diag["errors"])} errors found'
        
        return self._json_response(diag)

    # ==================== P13-3: API Performance Metrics ====================

    async def api_perf_metrics(self, request):
        """P13-3 → P15-1: API 性能指标端点 — 响应时间/缓存/限流/数据库 统合仪表板"""
        try:
            from api.perf_metrics import ApiMetrics
            metrics = ApiMetrics.get_instance()
            summary = metrics.get_summary()
            # P14-3: Cache stats
            try:
                from api.response_cache import ResponseCache
                summary['cache'] = ResponseCache.get_instance().get_stats()
            except Exception:
                summary['cache'] = None
            # P15-1: Rate limiter stats
            try:
                from core.rate_limiter import get_rate_limiter
                summary['rate_limiter'] = get_rate_limiter().get_stats()
            except Exception:
                summary['rate_limiter'] = None
            # P15-2: Database health stats
            try:
                from api.db_health import DbHealthMonitor
                summary['database'] = DbHealthMonitor.get_instance().get_stats()
            except Exception:
                summary['database'] = None
            return self._json_response({'success': True, 'data': summary})
        except Exception as e:
            logger.error(f"API perf metrics error: {e}")
            return self._json_response({
                'success': False,
                'error': str(e),
                'message': 'Performance metrics not available'
            }, 500)

    async def api_cache_stats(self, request):
        """P14-3: 缓存统计端点"""
        try:
            from api.response_cache import ResponseCache, CACHE_CONFIG
            cache = ResponseCache.get_instance()
            stats = cache.get_stats()
            stats['config'] = {path: ttl for path, ttl in sorted(CACHE_CONFIG.items())}
            return self._json_response({'success': True, 'data': stats})
        except Exception as e:
            return self._json_response({
                'success': False, 'error': str(e)
            }, 500)

    async def invalidate_cache(self, request):
        """P14-3: 缓存失效端点 (管理员操作)"""
        try:
            from api.response_cache import ResponseCache
            data = await request.json() if request.can_read_body else {}
            path = data.get('path')  # None = clear all
            cache = ResponseCache.get_instance()
            cache.invalidate(path)
            return self._json_response({
                'success': True,
                'message': f'Cache invalidated: {"all" if path is None else path}'
            })
        except Exception as e:
            return self._json_response({
                'success': False, 'error': str(e)
            }, 500)

    # ==================== P15-2: Database Health Metrics ====================

    async def api_db_health(self, request):
        """P15-2: 数据库健康监控端点 — 连接池/慢查询/PRAGMA/文件统计"""
        try:
            from api.db_health import DbHealthMonitor
            monitor = DbHealthMonitor.get_instance()
            stats = monitor.get_stats()
            return self._json_response({'success': True, 'data': stats})
        except Exception as e:
            logger.error(f"DB health metrics error: {e}")
            return self._json_response({
                'success': False, 'error': str(e),
                'message': 'Database health metrics not available'
            }, 500)

    # ==================== P15-3: Alert Rules Engine ====================

    async def api_alert_rules(self, request):
        """P15-3: 告警规则状态端点 — 当前告警/历史/阈值配置"""
        try:
            from api.alert_engine import AlertEngine
            engine = AlertEngine.get_instance()
            return self._json_response({
                'success': True,
                'data': engine.get_status()
            })
        except Exception as e:
            logger.error(f"Alert rules error: {e}")
            return self._json_response({
                'success': False, 'error': str(e),
                'message': 'Alert engine not available'
            }, 500)

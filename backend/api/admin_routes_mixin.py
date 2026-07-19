#!/usr/bin/env python3
"""
P10-1: Admin Routes Mixin
管理員 API 端點處理器 — 從 http_server.py 提取

包含: 管理員儀表板、用戶管理、配額監控、計費、安全、審計等
"""

import json
import logging
from aiohttp import web

logger = logging.getLogger(__name__)


class AdminRoutesMixin:
    """管理員 API 路由處理器 Mixin — 供 HttpApiServer 繼承使用"""

    async def admin_dashboard(self, request):
        """管理員儀表板"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            stats = await admin.get_dashboard_stats()
            return self._json_response({'success': True, 'data': stats})
        except Exception as e:
            logger.error(f"Admin dashboard error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_list_users(self, request):
        """管理員 - 用戶列表"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            page = int(request.query.get('page', '1'))
            page_size = int(request.query.get('page_size', '20'))
            search = request.query.get('search', '')
            status = request.query.get('status', '')
            tier = request.query.get('tier', '')
            
            result = await admin.get_users(page, page_size, search, status, tier)
            return self._json_response({'success': True, 'data': result})
        except Exception as e:
            logger.error(f"Admin list users error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_get_user(self, request):
        """管理員 - 用戶詳情"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            user_id = request.match_info.get('id')
            user = await admin.get_user_detail(user_id)
            
            if user:
                return self._json_response({'success': True, 'data': user})
            return self._json_response({'success': False, 'error': '用戶不存在'}, 404)
        except Exception as e:
            logger.error(f"Admin get user error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_update_user(self, request):
        """管理員 - 更新用戶"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            user_id = request.match_info.get('id')
            data = await request.json()
            
            result = await admin.update_user(user_id, data)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin update user error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_suspend_user(self, request):
        """管理員 - 暫停用戶"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            user_id = request.match_info.get('id')
            data = await request.json()
            reason = data.get('reason', '')
            
            result = await admin.suspend_user(user_id, reason)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin suspend user error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_security_overview(self, request):
        """管理員 - 安全概覽"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            overview = await admin.get_security_overview()
            return self._json_response({'success': True, 'data': overview})
        except Exception as e:
            logger.error(f"Admin security overview error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_audit_logs(self, request):
        """管理員 - 審計日誌"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            page = int(request.query.get('page', '1'))
            page_size = int(request.query.get('page_size', '50'))
            action = request.query.get('action', '')
            
            result = await admin.get_audit_logs(page, page_size, action or None)
            return self._json_response({'success': True, 'data': result})
        except Exception as e:
            logger.error(f"Admin audit logs error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_usage_trends(self, request):
        """管理員 - 使用趨勢"""
        try:
            from api.admin import get_admin_service
            admin = get_admin_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            days = int(request.query.get('days', '30'))
            trends = await admin.get_usage_trends(days)
            return self._json_response({'success': True, 'data': trends})
        except Exception as e:
            logger.error(f"Admin usage trends error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_cache_stats(self, request):
        """管理員 - 緩存統計"""
        try:
            from core.cache import get_cache_service
            cache = get_cache_service()
            
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            stats = cache.stats()
            return self._json_response({'success': True, 'data': stats})
        except Exception as e:
            logger.error(f"Admin cache stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 管理員配額監控 API ====================
    
    async def admin_quota_overview(self, request):
        """管理員 - 配額使用總覽"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_quota_overview()
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin quota overview error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_quota_rankings(self, request):
        """管理員 - 配額使用排行"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            quota_type = request.query.get('type', 'daily_messages')
            period = request.query.get('period', 'today')
            limit = int(request.query.get('limit', 20))
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_quota_rankings(quota_type, period, limit)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin quota rankings error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_quota_alerts(self, request):
        """管理員 - 配額告警列表"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            page = int(request.query.get('page', 1))
            page_size = int(request.query.get('page_size', 50))
            alert_type = request.query.get('alert_type')
            acknowledged = request.query.get('acknowledged')
            
            if acknowledged is not None:
                acknowledged = acknowledged.lower() == 'true'
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_quota_alerts_admin(page, page_size, alert_type, acknowledged)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin quota alerts error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_adjust_quota(self, request):
        """管理員 - 調整用戶配額"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            data = await request.json()
            user_id = data.get('user_id')
            quota_type = data.get('quota_type')
            new_value = data.get('new_value')
            reason = data.get('reason', '')
            
            if not all([user_id, quota_type, new_value is not None]):
                return self._json_response({
                    'success': False,
                    'error': '缺少必要參數'
                }, 400)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.adjust_user_quota(
                user_id, quota_type, new_value, tenant.user_id, reason
            )
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin adjust quota error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_batch_adjust_quotas(self, request):
        """管理員 - 批量調整用戶配額"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            data = await request.json()
            user_ids = data.get('user_ids', [])
            quota_type = data.get('quota_type')
            new_value = data.get('new_value')
            reason = data.get('reason', '')
            
            if not all([user_ids, quota_type, new_value is not None]):
                return self._json_response({
                    'success': False,
                    'error': '缺少必要參數'
                }, 400)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.batch_adjust_quotas(
                user_ids, quota_type, new_value, tenant.user_id, reason
            )
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin batch adjust quotas error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_export_quota_report(self, request):
        """管理員 - 導出配額報表"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            quota_types = request.query.get('types')
            format = request.query.get('format', 'json')
            
            if quota_types:
                quota_types = quota_types.split(',')
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.export_quota_report(
                start_date, end_date, quota_types, format
            )
            
            # 如果是 CSV 格式，轉換並返回
            if format == 'csv' and result.get('success'):
                csv_content = self._convert_to_csv(result['data'])
                return web.Response(
                    body=csv_content.encode('utf-8-sig'),
                    content_type='text/csv',
                    headers={
                        'Content-Disposition': f'attachment; filename=quota_report_{datetime.now().strftime("%Y%m%d")}.csv'
                    }
                )
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin export quota report error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_reset_daily_quotas(self, request):
        """管理員 - 手動重置每日配額"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.reset_daily_quotas(tenant.user_id)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin reset daily quotas error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== P4-2: 配額一致性校驗 ====================
    
    async def admin_quota_consistency_check(self, request):
        """管理員 - 全量配額一致性校驗"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            from core.quota_service import get_quota_service
            service = get_quota_service()
            result = service.run_all_users_consistency_check()
            
            return self._json_response({
                'success': True,
                'data': result
            })
        except Exception as e:
            logger.error(f"Admin quota consistency check error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 管理員計費 API ====================
    
    async def admin_billing_overview(self, request):
        """管理員 - 獲取計費總覽"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_billing_overview()
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin billing overview error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_get_all_bills(self, request):
        """管理員 - 獲取所有賬單"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            page = int(request.query.get('page', 1))
            page_size = int(request.query.get('page_size', 20))
            status = request.query.get('status')
            billing_type = request.query.get('type')
            user_id = request.query.get('user_id')
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_all_bills(page, page_size, status, billing_type, user_id)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin get all bills error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_process_refund(self, request):
        """管理員 - 處理退款"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            data = await request.json()
            bill_id = data.get('bill_id')
            refund_amount = data.get('refund_amount')
            reason = data.get('reason', '')
            
            if not bill_id or refund_amount is None:
                return self._json_response({
                    'success': False,
                    'error': '缺少必要參數'
                }, 400)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.process_refund(bill_id, refund_amount, reason, tenant.user_id)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin process refund error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_freeze_quota(self, request):
        """管理員 - 凍結用戶配額"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            data = await request.json()
            user_id = data.get('user_id')
            reason = data.get('reason', '管理員操作')
            duration_hours = int(data.get('duration_hours', 24))
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少用戶 ID'
                }, 400)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.freeze_user_quota(user_id, reason, duration_hours, tenant.user_id)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin freeze quota error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_unfreeze_quota(self, request):
        """管理員 - 解凍用戶配額"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            data = await request.json()
            user_id = data.get('user_id')
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少用戶 ID'
                }, 400)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.unfreeze_user_quota(user_id, tenant.user_id)
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin unfreeze quota error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_get_frozen_users(self, request):
        """管理員 - 獲取被凍結的用戶"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({
                    'success': False,
                    'error': '需要管理員權限'
                }, 403)
            
            from api.admin import get_admin_service
            service = get_admin_service()
            result = await service.get_frozen_users()
            
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Admin get frozen users error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 數據分析 API（管理員）====================
    
    async def admin_analytics_dashboard(self, request):
        """管理員 - 分析儀表板"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.analytics_service import get_analytics_service
            service = get_analytics_service()
            
            summary = service.get_dashboard_summary()
            funnel = service.get_conversion_funnel()
            
            return self._json_response({
                'success': True,
                'data': {
                    'summary': summary,
                    'funnel': funnel
                }
            })
        except Exception as e:
            logger.error(f"Admin analytics dashboard error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_analytics_trends(self, request):
        """管理員 - 趨勢數據"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            metric = request.query.get('metric', 'revenue')
            days = int(request.query.get('days', 30))
            
            from core.analytics_service import get_analytics_service
            service = get_analytics_service()
            
            trend = service.get_trend_data(metric, days)
            
            return self._json_response({
                'success': True,
                'data': {'trend': trend}
            })
        except Exception as e:
            logger.error(f"Admin analytics trends error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_get_frontend_errors(self, request):
        """管理員查詢前端錯誤日誌"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            limit = int(request.query.get('limit', '50'))
            error_type = request.query.get('type', '')
            severity = request.query.get('severity', '')

            # 🔧 改用合法連接模塊 core.db_utils（見 .cursorrules 合法連接模塊清單）。
            # 舊寫法 os.environ.get('DATABASE_PATH', ...) 依賴的 os 模塊在本檔案從未 import，
            # 一旦執行到這裡必定拋出 NameError（被外層 try/except 吞掉，此端點過去每次呼叫都會 500）。
            from core.db_utils import create_connection
            conn = create_connection()
            
            query = 'SELECT * FROM frontend_errors WHERE 1=1'
            params = []
            
            if error_type:
                query += ' AND type = ?'
                params.append(error_type)
            if severity:
                query += ' AND severity = ?'
                params.append(severity)
            
            query += ' ORDER BY id DESC LIMIT ?'
            params.append(min(limit, 200))
            
            rows = conn.execute(query, params).fetchall()
            errors = [dict(row) for row in rows]
            
            # 統計
            stats = conn.execute('''
                SELECT type, severity, COUNT(*) as count 
                FROM frontend_errors 
                WHERE server_timestamp > datetime('now', '-24 hours')
                GROUP BY type, severity
            ''').fetchall()
            
            conn.close()
            
            return self._json_response({
                'success': True,
                'data': {
                    'errors': errors,
                    'stats_24h': [dict(s) for s in stats],
                    'total': len(errors)
                }
            })
        except Exception as e:
            logger.error(f"Admin get frontend errors failed: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 緩存管理 API（管理員）====================
    
    async def admin_cache_detail_stats(self, request):
        """🔧 P8-2: 管理員 - 获取详细缓存统计（重命名，避免与 L5601 admin_cache_stats 冲突）"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.cache_service import get_cache_service
            service = get_cache_service()
            
            return self._json_response({
                'success': True,
                'data': service.get_stats()
            })
        except Exception as e:
            logger.error(f"Admin cache detail stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_clear_cache(self, request):
        """管理員 - 清空緩存"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            data = await request.json()
            namespace = data.get('namespace')
            
            from core.cache_service import get_cache_service
            service = get_cache_service()
            
            if namespace:
                service.clear_namespace(namespace)
            else:
                service.clear_all()
            
            return self._json_response({
                'success': True,
                'message': f'緩存已清空 ({namespace or "all"})'
            })
        except Exception as e:
            logger.error(f"Admin clear cache error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 消息隊列 API（管理員）====================
    
    async def admin_queue_stats(self, request):
        """管理員 - 獲取隊列統計"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.message_queue import get_message_queue
            queue = get_message_queue()
            
            return self._json_response({
                'success': True,
                'data': queue.get_stats()
            })
        except Exception as e:
            logger.error(f"Admin queue stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 速率限制 API（管理員）====================
    
    async def admin_rate_limit_stats(self, request):
        """管理員 - 獲取限流統計"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            
            return self._json_response({
                'success': True,
                'data': limiter.get_stats()
            })
        except Exception as e:
            logger.error(f"Admin rate limit stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_get_rate_limit_rules(self, request):
        """管理員 - 獲取限流規則"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            
            return self._json_response({
                'success': True,
                'data': limiter.get_rules()
            })
        except Exception as e:
            logger.error(f"Admin get rate limit rules error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_ban_ip(self, request):
        """管理員 - 封禁 IP"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            data = await request.json()
            identifier = data.get('identifier')
            duration = data.get('duration', 3600)
            reason = data.get('reason', '')
            
            if not identifier:
                return self._json_response({'success': False, 'error': '缺少標識符'}, 400)
            
            from core.rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            limiter.ban(identifier, duration, reason)
            
            # 記錄審計日誌
            from core.audit_service import get_audit_service, AuditCategory, AuditAction
            audit = get_audit_service()
            audit.log_admin_action(
                admin_id=tenant.user_id,
                admin_name=tenant.email or '',
                action='ban_ip',
                target_type='ip',
                target_id=identifier,
                description=f"Banned for {duration}s: {reason}"
            )
            
            return self._json_response({'success': True, 'message': f'已封禁 {identifier}'})
        except Exception as e:
            logger.error(f"Admin ban IP error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_unban_ip(self, request):
        """管理員 - 解除封禁"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            data = await request.json()
            identifier = data.get('identifier')
            
            if not identifier:
                return self._json_response({'success': False, 'error': '缺少標識符'}, 400)
            
            from core.rate_limiter import get_rate_limiter
            limiter = get_rate_limiter()
            limiter.unban(identifier)
            
            return self._json_response({'success': True, 'message': f'已解除封禁 {identifier}'})
        except Exception as e:
            logger.error(f"Admin unban IP error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 審計日誌 API（管理員）====================
    
    async def admin_get_audit_logs(self, request):
        """管理員 - 獲取審計日誌"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            user_id = request.query.get('user_id')
            category = request.query.get('category')
            action = request.query.get('action')
            start_time = request.query.get('start_time')
            end_time = request.query.get('end_time')
            limit = int(request.query.get('limit', 100))
            offset = int(request.query.get('offset', 0))
            
            from core.audit_service import get_audit_service
            audit = get_audit_service()
            
            logs = audit.query(
                user_id=user_id,
                category=category,
                action=action,
                start_time=start_time,
                end_time=end_time,
                limit=limit,
                offset=offset
            )
            
            return self._json_response({
                'success': True,
                'data': [log.to_dict() for log in logs]
            })
        except Exception as e:
            logger.error(f"Admin get audit logs error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_audit_stats(self, request):
        """管理員 - 審計統計"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            days = int(request.query.get('days', 7))
            
            from core.audit_service import get_audit_service
            audit = get_audit_service()
            
            return self._json_response({
                'success': True,
                'data': audit.get_stats(days)
            })
        except Exception as e:
            logger.error(f"Admin audit stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_export_audit(self, request):
        """管理員 - 導出審計日誌"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            start_time = request.query.get('start_time')
            end_time = request.query.get('end_time')
            format_type = request.query.get('format', 'json')
            
            if not start_time or not end_time:
                return self._json_response({'success': False, 'error': '缺少時間範圍'}, 400)
            
            from core.audit_service import get_audit_service
            audit = get_audit_service()
            
            data = audit.export(start_time, end_time, format_type)
            
            content_type = 'application/json' if format_type == 'json' else 'text/csv'
            
            return web.Response(
                text=data,
                content_type=content_type,
                headers={
                    'Content-Disposition': f'attachment; filename="audit_{start_time}_{end_time}.{format_type}"'
                }
            )
        except Exception as e:
            logger.error(f"Admin export audit error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== 安全告警 API（管理員）====================
    
    async def admin_get_security_alerts(self, request):
        """管理員 - 獲取安全告警"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            status = request.query.get('status')
            severity = request.query.get('severity')
            alert_type = request.query.get('type')
            limit = int(request.query.get('limit', 100))
            
            from core.security_alert import get_security_alert_service
            service = get_security_alert_service()
            
            alerts = service.get_alerts(
                status=status,
                severity=severity,
                alert_type=alert_type,
                limit=limit
            )
            
            return self._json_response({
                'success': True,
                'data': [a.to_dict() for a in alerts]
            })
        except Exception as e:
            logger.error(f"Admin get security alerts error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_security_stats(self, request):
        """管理員 - 安全統計"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            from core.security_alert import get_security_alert_service
            service = get_security_alert_service()
            
            return self._json_response({
                'success': True,
                'data': service.get_stats()
            })
        except Exception as e:
            logger.error(f"Admin security stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_acknowledge_alert(self, request):
        """管理員 - 確認告警"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            data = await request.json()
            alert_id = data.get('alert_id')
            
            if not alert_id:
                return self._json_response({'success': False, 'error': '缺少告警 ID'}, 400)
            
            from core.security_alert import get_security_alert_service
            service = get_security_alert_service()
            
            success = service.acknowledge_alert(alert_id, tenant.user_id)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Admin acknowledge alert error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def admin_resolve_alert(self, request):
        """管理員 - 解決告警"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            data = await request.json()
            alert_id = data.get('alert_id')
            notes = data.get('notes', '')
            false_positive = data.get('false_positive', False)
            
            if not alert_id:
                return self._json_response({'success': False, 'error': '缺少告警 ID'}, 400)
            
            from core.security_alert import get_security_alert_service
            service = get_security_alert_service()
            
            success = service.resolve_alert(alert_id, notes, false_positive)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Admin resolve alert error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)


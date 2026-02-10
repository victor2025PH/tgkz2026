#!/usr/bin/env python3
"""
P9-1: Quota Routes Mixin
Extracted from http_server.py (~400 lines)

Contains: usage stats, quota status, quota alerts, membership levels,
trends, history, quota display name/color helpers

Usage: HttpApiServer(..., QuotaRoutesMixin, ...) inheritance
"""
import logging

logger = logging.getLogger(__name__)


class QuotaRoutesMixin:
    """Quota/usage route handlers mixin"""

    # ==================== 使用量統計 ====================
    
    async def get_usage_stats(self, request):
        """獲取使用量摘要"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            # 從租戶上下文獲取用戶 ID
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            summary = await tracker.get_usage_summary(user_id)
            return self._json_response({'success': True, 'data': summary})
        except Exception as e:
            logger.error(f"Get usage stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_today_usage(self, request):
        """獲取今日使用量"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            stats = await tracker.get_today_usage(user_id)
            return self._json_response({'success': True, 'data': stats.to_dict()})
        except Exception as e:
            logger.error(f"Get today usage error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_usage_history(self, request):
        """獲取使用量歷史"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            days = int(request.query.get('days', '30'))
            history = await tracker.get_usage_history(user_id, days)
            return self._json_response({'success': True, 'data': history})
        except Exception as e:
            logger.error(f"Get usage history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_quota_status(self, request):
        """獲取配額狀態（增強版）"""
        try:
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            # 使用新的 QuotaService
            try:
                from core.quota_service import get_quota_service
                quota_service = get_quota_service()
                summary = quota_service.get_usage_summary(user_id)
                
                return self._json_response({
                    'success': True,
                    'data': summary.to_dict()
                })
            except ImportError:
                # Fallback 到舊的 usage_tracker
                from core.usage_tracker import get_usage_tracker
                tracker = get_usage_tracker()
                
                api_quota = await tracker.check_quota('api_calls', user_id)
                accounts_quota = await tracker.check_quota('accounts', user_id)
                
                return self._json_response({
                    'success': True,
                    'data': {
                        'api_calls': api_quota,
                        'accounts': accounts_quota,
                        'subscription_tier': tenant.subscription_tier if tenant else 'free'
                    }
                })
        except Exception as e:
            logger.error(f"Get quota status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def check_quota(self, request):
        """檢查特定配額"""
        try:
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            quota_type = data.get('quota_type', 'daily_messages')
            amount = data.get('amount', 1)
            
            from core.quota_service import get_quota_service
            service = get_quota_service()
            result = service.check_quota(user_id, quota_type, amount)
            
            return self._json_response({
                'success': True,
                'data': result.to_dict()
            })
        except Exception as e:
            logger.error(f"Check quota error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_quota_alerts(self, request):
        """獲取配額告警"""
        try:
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from core.quota_service import get_quota_service
            service = get_quota_service()
            alerts = service.get_user_alerts(user_id)
            
            return self._json_response({
                'success': True,
                'data': {'alerts': alerts}
            })
        except Exception as e:
            logger.error(f"Get quota alerts error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def acknowledge_quota_alert(self, request):
        """確認配額告警"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            alert_id = data.get('alert_id')
            
            if not alert_id:
                return self._json_response({'success': False, 'error': '缺少 alert_id'}, 400)
            
            from core.quota_service import get_quota_service
            service = get_quota_service()
            success = service.acknowledge_alert(alert_id)
            
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Acknowledge alert error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_all_membership_levels(self, request):
        """獲取所有會員等級配置（公開）"""
        try:
            from core.level_config import get_level_config_service
            service = get_level_config_service()
            levels = service.get_all_levels()
            
            return self._json_response({
                'success': True,
                'data': {
                    'levels': [level.to_dict() for level in levels]
                }
            })
        except Exception as e:
            logger.error(f"Get membership levels error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_quota_trend(self, request):
        """獲取配額使用趨勢數據"""
        try:
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            # 獲取查詢參數
            period = request.query.get('period', '7d')
            quota_types = request.query.get('types', 'daily_messages,ai_calls').split(',')
            
            days = 7 if period == '7d' else 30 if period == '30d' else 90
            
            import sqlite3
            from datetime import datetime, timedelta
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 生成日期範圍
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days - 1)
            
            # 初始化結果
            labels = []
            datasets = {}
            
            for i in range(days):
                date = start_date + timedelta(days=i)
                labels.append(date.strftime('%m/%d'))
            
            for qt in quota_types:
                datasets[qt] = {
                    'name': self._get_quota_display_name(qt),
                    'data': [0] * days,
                    'color': self._get_quota_color(qt)
                }
            
            # 查詢歷史數據
            try:
                cursor.execute('''
                    SELECT date, quota_type, used
                    FROM quota_usage
                    WHERE user_id = ?
                    AND date >= ?
                    AND quota_type IN ({})
                    ORDER BY date
                '''.format(','.join('?' * len(quota_types))),
                (user_id, start_date.isoformat(), *quota_types))
                
                for row in cursor.fetchall():
                    date_str = row['date']
                    qt = row['quota_type']
                    used = row['used']
                    
                    # 計算索引
                    try:
                        date_obj = datetime.fromisoformat(date_str).date() if isinstance(date_str, str) else date_str
                        idx = (date_obj - start_date).days
                        if 0 <= idx < days and qt in datasets:
                            datasets[qt]['data'][idx] = used
                    except:
                        pass
            except sqlite3.OperationalError:
                # 表不存在，返回空數據
                pass
            
            conn.close()
            
            return self._json_response({
                'success': True,
                'data': {
                    'labels': labels,
                    'datasets': list(datasets.values()),
                    'period': period,
                    'days': days
                }
            })
            
        except Exception as e:
            logger.error(f"Get quota trend error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_quota_history(self, request):
        """獲取配額使用歷史記錄"""
        try:
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            # 獲取查詢參數
            limit = int(request.query.get('limit', 50))
            offset = int(request.query.get('offset', 0))
            quota_type = request.query.get('type')  # 可選過濾
            
            import sqlite3
            
            db_path = os.environ.get('DB_PATH', 'tg_matrix.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            history = []
            
            try:
                # 構建查詢
                query = '''
                    SELECT date, quota_type, used, 
                           COALESCE((SELECT used FROM quota_usage q2 
                                     WHERE q2.user_id = quota_usage.user_id 
                                     AND q2.quota_type = quota_usage.quota_type 
                                     AND q2.date < quota_usage.date 
                                     ORDER BY q2.date DESC LIMIT 1), 0) as prev_used
                    FROM quota_usage
                    WHERE user_id = ?
                '''
                params = [user_id]
                
                if quota_type:
                    query += ' AND quota_type = ?'
                    params.append(quota_type)
                
                query += ' ORDER BY date DESC, quota_type LIMIT ? OFFSET ?'
                params.extend([limit, offset])
                
                cursor.execute(query, params)
                
                # 獲取用戶等級以確定配額限制
                from core.level_config import get_level_config_service
                service = get_level_config_service()
                
                # 🔧 P7-1: 防御式查询，兼容无 subscription_tier 列的 schema
                _qcols = [c[1] for c in cursor.execute("PRAGMA table_info(users)").fetchall()]
                if 'subscription_tier' in _qcols:
                    cursor.execute('SELECT subscription_tier FROM users WHERE id = ?', (user_id,))
                    _qrow = cursor.fetchone()
                    tier = (_qrow['subscription_tier'] or 'bronze') if _qrow else 'bronze'
                elif 'membership_level' in _qcols:
                    cursor.execute('SELECT membership_level FROM users WHERE id = ?', (user_id,))
                    _qrow = cursor.fetchone()
                    tier = (_qrow['membership_level'] or 'bronze') if _qrow else 'bronze'
                else:
                    tier = 'bronze'
                
                cursor.execute(query, params)
                
                for row in cursor.fetchall():
                    qt = row['quota_type']
                    limit_val = service.get_quota_limit(tier, qt)
                    
                    history.append({
                        'date': row['date'],
                        'quota_type': qt,
                        'quota_name': self._get_quota_display_name(qt),
                        'used': row['used'],
                        'limit': limit_val,
                        'percentage': (row['used'] / limit_val * 100) if limit_val > 0 else 0,
                        'change': row['used'] - (row['prev_used'] or 0)
                    })
            except sqlite3.OperationalError as e:
                logger.warning(f"Quota history query error: {e}")
            
            conn.close()
            
            return self._json_response({
                'success': True,
                'data': {
                    'history': history,
                    'limit': limit,
                    'offset': offset,
                    'has_more': len(history) == limit
                }
            })
            
        except Exception as e:
            logger.error(f"Get quota history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    def _get_quota_display_name(self, quota_type: str) -> str:
        """獲取配額顯示名稱"""
        names = {
            'daily_messages': '每日消息',
            'ai_calls': 'AI 調用',
            'tg_accounts': 'TG 帳號',
            'groups': '群組數',
            'devices': '設備數',
            'keyword_sets': '關鍵詞集',
            'auto_reply_rules': '自動回覆',
            'scheduled_tasks': '定時任務',
        }
        return names.get(quota_type, quota_type)
    
    def _get_quota_color(self, quota_type: str) -> str:
        """獲取配額圖表顏色"""
        colors = {
            'daily_messages': '#3b82f6',
            'ai_calls': '#8b5cf6',
            'tg_accounts': '#22c55e',
            'groups': '#f59e0b',
            'devices': '#ef4444',
        }
        return colors.get(quota_type, '#666666')
    


#!/usr/bin/env python3
"""
P11-1: BusinessRoutesMixin
業務路由處理器 — 優惠券/推薦/通知/i18n/時區/分析/聯繫人/AB測試
"""

import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timedelta
from aiohttp import web

logger = logging.getLogger(__name__)


class BusinessRoutesMixin:
    """業務路由處理器 — 優惠券/推薦/通知/i18n/時區/分析/聯繫人/AB測試/AI設置 — 供 HttpApiServer 繼承使用"""

    # ==================== AI 設置 (P0: 用戶級獨立配置) ====================

    async def get_ai_settings_api(self, request):
        """獲取當前用戶的 AI 設置（模型用途分配、對話策略等）"""
        from database import db
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        try:
            rows = await db.fetch_all(
                "SELECT key, value FROM ai_settings WHERE user_id = ?", (user_id,)
            )
            settings = {}
            for row in rows:
                val = row['value']
                try:
                    settings[row['key']] = json.loads(val)
                except (ValueError, TypeError):
                    settings[row['key']] = val
            return self._json_response({'success': True, 'data': settings})
        except Exception as e:
            logger.error(f"[AI Settings] Get error: {e}")
            return self._json_response({'success': True, 'data': {}})

    async def save_ai_settings_api(self, request):
        """批量保存當前用戶的 AI 設置"""
        from database import db
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        data = await request.json()
        settings = data.get('settings', data)
        try:
            for key, value in settings.items():
                if key.startswith('_'):
                    continue
                str_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                await db.execute('''
                    INSERT INTO ai_settings (user_id, key, value, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = CURRENT_TIMESTAMP
                ''', (user_id, key, str_value))
            return self._json_response({'success': True})
        except Exception as e:
            logger.error(f"[AI Settings] Save error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, status=500)

    async def get_ai_models_api(self, request):
        """獲取當前用戶的 AI 模型列表；無 tenant 時回退 get_owner_user_id 以兼容 Electron/舊路徑。"""
        from database import db
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        if not user_id:
            try:
                from core.tenant_filter import get_owner_user_id
                user_id = get_owner_user_id() or ''
            except Exception:
                pass
        try:
            models = await db.fetch_all(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint,
                   is_local, is_default, priority, is_connected, last_tested_at, config_json,
                   created_at, updated_at
                   FROM ai_models WHERE user_id = ?
                   ORDER BY is_default DESC, priority DESC, created_at DESC""",
                (user_id,)
            )
            result = []
            has_connected = False
            for m in models:
                has_connected = has_connected or bool(m.get('is_connected'))
                api_key = m.get('api_key', '') or ''
                masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else '***'
                result.append({
                    'id': m['id'], 'provider': m['provider'],
                    'modelName': m['model_name'], 'displayName': m['display_name'] or m['model_name'],
                    'apiKey': api_key, 'apiKeyMasked': masked,
                    'apiEndpoint': m['api_endpoint'],
                    'isLocal': bool(m['is_local']), 'isDefault': bool(m['is_default']),
                    'priority': m['priority'], 'isConnected': bool(m['is_connected']),
                    'lastTestedAt': m['last_tested_at'],
                    # P0+P1: 新增字段 — 延遲 + 最後錯誤（舊 DB 無此列時 .get() 返回 None）
                    'latencyMs': m.get('latency_ms') or 0,
                    'lastErrorMessage': m.get('last_error_message') or None,
                    'config': json.loads(m['config_json'] or '{}'),
                })
            # P0: 修復 aiConfigured 誤報 —— 「已配置」僅表示有模型記錄，不代表連線正常
            # 前端 isConnected 使用 isConnected 欄位 + last_tested_at 判斷過期
            # aiConfigured 只是告訴前端「有模型/端點存在，尚未測試」的輔助提示
            has_models = len(result) > 0
            ai_configured = has_models
            if not ai_configured and user_id:
                try:
                    ai_settings = await db.get_ai_settings()
                    ep = (ai_settings or {}).get('local_ai_endpoint') or ''
                    if isinstance(ep, str) and ep.strip():
                        ai_configured = True
                except Exception:
                    pass
            return self._json_response({'success': True, 'data': result, 'aiConfigured': ai_configured,
                                        'hasConnectedModel': has_connected})
        except Exception as e:
            logger.error(f"[AI Models] Get error: {e}")
            return self._json_response({'success': False, 'error': str(e), 'data': [], 'aiConfigured': False}, status=500)

    async def save_ai_model_api(self, request):
        """添加 AI 模型（帶 user_id）"""
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        data = await request.json()
        data['_user_id'] = user_id
        result = await self._execute_command('save-ai-model', data)
        return self._json_response(result or {'success': True})

    async def update_ai_model_api(self, request):
        """更新 AI 模型"""
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        model_id = request.match_info['id']
        data = await request.json()
        data['id'] = int(model_id)
        data['_user_id'] = user_id
        result = await self._execute_command('update-ai-model', data)
        return self._json_response(result or {'success': True})

    async def delete_ai_model_api(self, request):
        """刪除 AI 模型"""
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        model_id = request.match_info['id']
        result = await self._execute_command('delete-ai-model', {'id': int(model_id), '_user_id': user_id})
        return self._json_response(result or {'success': True})

    async def test_ai_model_api(self, request):
        """測試 AI 模型連接"""
        tenant = request.get('tenant')
        user_id = getattr(tenant, 'user_id', '') if tenant else ''
        model_id = request.match_info['id']
        data = await request.json() if request.content_length else {}
        data['id'] = int(model_id)
        data['_user_id'] = user_id
        result = await self._execute_command('test-ai-model', data)
        return self._json_response(result or {'success': True})

    # ==================== 優惠券 ====================

    async def validate_coupon(self, request):
        """驗證優惠券"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            code = data.get('code')
            amount = data.get('amount', 0)
            
            if not code:
                return self._json_response({'success': False, 'error': '缺少優惠碼'}, 400)
            
            from core.coupon_service import get_coupon_service
            service = get_coupon_service()
            
            result = service.validate_coupon(code, tenant.user_id, amount, tenant.subscription_tier)
            return self._json_response({'success': True, 'data': result})
        except Exception as e:
            logger.error(f"Validate coupon error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def apply_coupon(self, request):
        """應用優惠券"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            code = data.get('code')
            order_id = data.get('order_id')
            amount = data.get('amount', 0)
            
            if not code or not order_id:
                return self._json_response({'success': False, 'error': '缺少必要參數'}, 400)
            
            from core.coupon_service import get_coupon_service
            service = get_coupon_service()
            
            result = service.use_coupon(code, tenant.user_id, order_id, amount)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Apply coupon error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_active_campaigns(self, request):
        """獲取活躍促銷活動"""
        try:
            from core.coupon_service import get_coupon_service
            service = get_coupon_service()
            
            campaigns = service.get_active_campaigns()
            return self._json_response({
                'success': True,
                'data': [c.to_dict() for c in campaigns]
            })
        except Exception as e:
            logger.error(f"Get active campaigns error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_referral_code(self, request):
        """獲取推薦碼"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.referral_service import get_referral_service
            service = get_referral_service()
            
            code = service.get_or_create_referral_code(tenant.user_id)
            return self._json_response({
                'success': True,
                'data': {'code': code}
            })
        except Exception as e:
            logger.error(f"Get referral code error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_referral_stats(self, request):
        """獲取推薦統計"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.referral_service import get_referral_service
            service = get_referral_service()
            
            stats = service.get_user_referral_stats(tenant.user_id)
            return self._json_response({
                'success': True,
                'data': stats
            })
        except Exception as e:
            logger.error(f"Get referral stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def track_referral(self, request):
        """追蹤推薦"""
        try:
            data = await request.json()
            referral_code = data.get('referral_code')
            referee_id = data.get('referee_id')
            
            if not referral_code or not referee_id:
                return self._json_response({'success': False, 'error': '缺少必要參數'}, 400)
            
            from core.referral_service import get_referral_service
            service = get_referral_service()
            
            result = service.track_referral(referral_code, referee_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Track referral error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_notifications(self, request):
        """獲取通知列表"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            unread_only = request.query.get('unread_only', 'false').lower() == 'true'
            notification_type = request.query.get('type')
            limit = int(request.query.get('limit', 50))
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            notifications = service.get_user_notifications(
                tenant.user_id, unread_only, notification_type, limit
            )
            
            return self._json_response({
                'success': True,
                'data': [n.to_dict() for n in notifications]
            })
        except Exception as e:
            logger.error(f"Get notifications error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_unread_count(self, request):
        """獲取未讀通知數量"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            count = service.get_unread_count(tenant.user_id)
            return self._json_response({
                'success': True,
                'data': {'count': count}
            })
        except Exception as e:
            logger.error(f"Get unread count error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def mark_notification_read(self, request):
        """標記通知為已讀"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            notification_id = data.get('notification_id')
            
            if not notification_id:
                return self._json_response({'success': False, 'error': '缺少通知 ID'}, 400)
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            success = service.mark_as_read(notification_id, tenant.user_id)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Mark notification read error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def mark_all_notifications_read(self, request):
        """標記所有通知為已讀"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            count = service.mark_all_as_read(tenant.user_id)
            return self._json_response({'success': True, 'data': {'count': count}})
        except Exception as e:
            logger.error(f"Mark all notifications read error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_notification_preferences(self, request):
        """獲取通知偏好設置"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            prefs = service.get_user_preferences(tenant.user_id)
            return self._json_response({
                'success': True,
                'data': prefs.to_dict()
            })
        except Exception as e:
            logger.error(f"Get notification preferences error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def update_notification_preferences(self, request):
        """更新通知偏好設置"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            
            from core.notification_service import get_notification_service
            service = get_notification_service()
            
            success = service.update_user_preferences(tenant.user_id, data)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Update notification preferences error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_supported_languages(self, request):
        """獲取支援的語言列表"""
        try:
            from core.i18n_service import get_i18n_service
            service = get_i18n_service()
            
            return self._json_response({
                'success': True,
                'data': service.get_supported_languages()
            })
        except Exception as e:
            logger.error(f"Get supported languages error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_translations(self, request):
        """獲取翻譯"""
        try:
            language = request.query.get('language', 'zh-TW')
            
            from core.i18n_service import get_i18n_service
            service = get_i18n_service()
            
            translations = service.get_all_translations(language)
            
            return self._json_response({
                'success': True,
                'data': {
                    'language': language,
                    'translations': translations
                }
            })
        except Exception as e:
            logger.error(f"Get translations error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def set_user_language(self, request):
        """設置用戶語言"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            language = data.get('language')
            
            if not language:
                return self._json_response({'success': False, 'error': '缺少語言參數'}, 400)
            
            from core.i18n_service import get_i18n_service
            service = get_i18n_service()
            
            if not service.is_supported(language):
                return self._json_response({'success': False, 'error': '不支援的語言'}, 400)
            
            service.set_user_language(tenant.user_id, language)
            
            return self._json_response({'success': True})
        except Exception as e:
            logger.error(f"Set user language error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_timezones(self, request):
        """獲取時區列表"""
        try:
            from core.timezone_service import get_timezone_service
            service = get_timezone_service()
            
            return self._json_response({
                'success': True,
                'data': service.get_common_timezones()
            })
        except Exception as e:
            logger.error(f"Get timezones error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_timezone_settings(self, request):
        """獲取用戶時區設置"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.timezone_service import get_timezone_service
            service = get_timezone_service()
            
            settings = service.get_user_settings(tenant.user_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'timezone': settings.timezone,
                    'auto_detect': settings.auto_detect,
                    'format_24h': settings.format_24h,
                    'first_day_of_week': settings.first_day_of_week,
                    'date_format': settings.date_format,
                    'time_format': settings.time_format
                }
            })
        except Exception as e:
            logger.error(f"Get timezone settings error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def update_timezone_settings(self, request):
        """更新用戶時區設置"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            
            from core.timezone_service import get_timezone_service
            service = get_timezone_service()
            
            success = service.update_user_settings(tenant.user_id, data)
            
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Update timezone settings error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def score_leads(self, request):
        """🔧 P12-1: 線索自動評分"""
        try:
            data = await request.json()
            lead_ids = data.get('lead_ids', [])
            
            from core.lead_scoring import get_scoring_engine
            engine = get_scoring_engine()
            
            from core.db_utils import get_connection
            with get_connection() as conn:
                conn.row_factory = sqlite3.Row
                
                if lead_ids:
                    placeholders = ','.join('?' * len(lead_ids))
                    rows = conn.execute(
                        f'SELECT * FROM unified_contacts WHERE id IN ({placeholders})',
                        lead_ids
                    ).fetchall()
                else:
                    # 評分最近 100 條未評分的線索
                    rows = conn.execute(
                        'SELECT * FROM unified_contacts WHERE lead_score = 0 OR lead_score IS NULL ORDER BY created_at DESC LIMIT 100'
                    ).fetchall()
                
                results = []
                for row in rows:
                    lead = dict(row)
                    score_result = engine.score_lead(lead)
                    
                    # 更新數據庫
                    conn.execute('''
                        UPDATE unified_contacts SET
                            lead_score = ?, intent_level = ?, value_level = ?,
                            intent_score = ?, quality_score = ?, activity_score = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (
                        score_result['lead_score'],
                        score_result['intent_level'],
                        score_result['value_level'],
                        score_result['intent_score'],
                        score_result['quality_score'],
                        score_result['activity_score'],
                        lead['id'],
                    ))
                    
                    results.append({
                        'id': lead['id'],
                        'telegram_id': lead.get('telegram_id'),
                        **score_result,
                    })
                
                conn.commit()
            
            response_data = {
                'scored': len(results),
                'results': results[:50],  # 限制返回數量
            }
            
            # P14-4: WebSocket 推送評分完成事件
            try:
                if hasattr(self, 'ws_service') and self.ws_service:
                    self.ws_service.publish_lead_scoring({
                        'scored_count': len(results),
                        'hot': sum(1 for r in results if r.get('intent_level') == 'hot'),
                        'warm': sum(1 for r in results if r.get('intent_level') == 'warm'),
                    })
            except Exception:
                pass
            
            return self._json_response({
                'success': True,
                'data': response_data
            })
        except Exception as e:
            logger.error(f"Score leads error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def scan_duplicates(self, request):
        """🔧 P12-2: 掃描重複線索"""
        try:
            limit = min(int(request.query.get('limit', '50')), 200)
            
            from core.lead_dedup import LeadDeduplicationService
            service = LeadDeduplicationService()
            
            groups = service.scan_duplicates(limit=limit)
            stats = service.get_dedup_stats()
            
            return self._json_response({
                'success': True,
                'data': {
                    'duplicate_groups': [g.to_dict() for g in groups],
                    'total_groups': len(groups),
                    'stats': stats,
                }
            })
        except Exception as e:
            logger.error(f"Scan duplicates error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def merge_duplicates(self, request):
        """🔧 P12-2: 合併重複線索"""
        try:
            data = await request.json()
            primary_id = data.get('primary_id')
            duplicate_ids = data.get('duplicate_ids', [])
            
            if not primary_id or not duplicate_ids:
                return self._json_response({
                    'success': False,
                    'error': 'primary_id and duplicate_ids are required'
                }, 400)
            
            from core.lead_dedup import LeadDeduplicationService
            service = LeadDeduplicationService()
            result = service.merge_duplicates(primary_id, duplicate_ids)
            
            return self._json_response({
                'success': 'error' not in result,
                'data': result,
            })
        except Exception as e:
            logger.error(f"Merge duplicates error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def analytics_lead_sources(self, request):
        """🔧 P12-4: 線索來源分析"""
        try:
            days = int(request.query.get('days', '30'))
            user_id = request.query.get('user_id', '')
            
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics()
            data = analytics.get_lead_source_analysis(days=days, user_id=user_id or None)
            
            return self._json_response({'success': True, 'data': data})
        except Exception as e:
            logger.error(f"Lead sources analysis error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def analytics_templates(self, request):
        """🔧 P12-4: 模板效果分析"""
        try:
            days = int(request.query.get('days', '30'))
            
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics()
            data = analytics.get_template_performance(days=days)
            
            return self._json_response({'success': True, 'data': data})
        except Exception as e:
            logger.error(f"Template analytics error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def analytics_trends(self, request):
        """🔧 P12-4: 每日趨勢分析"""
        try:
            days = int(request.query.get('days', '30'))
            user_id = request.query.get('user_id', '')
            
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics()
            data = analytics.get_daily_trends(days=days, user_id=user_id or None)
            
            return self._json_response({'success': True, 'data': data})
        except Exception as e:
            logger.error(f"Trends analysis error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def analytics_funnel(self, request):
        """🔧 P12-4: 漏斗分析"""
        try:
            user_id = request.query.get('user_id', '')
            
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics()
            data = analytics.get_funnel_analysis(user_id=user_id or None)
            
            return self._json_response({'success': True, 'data': data})
        except Exception as e:
            logger.error(f"Funnel analysis error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def analytics_summary(self, request):
        """🔧 P12-4: 業務摘要看板"""
        try:
            user_id = request.query.get('user_id', '')
            
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics()
            data = analytics.get_summary_dashboard(user_id=user_id or None)
            
            return self._json_response({'success': True, 'data': data})
        except Exception as e:
            logger.error(f"Summary dashboard error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def retry_schedule(self, request):
        """🔧 P12-3: 獲取重試策略時間表"""
        try:
            from core.message_retry import get_retry_manager
            manager = get_retry_manager()
            schedule = manager.get_retry_schedule()
            
            # 同時展示錯誤分類
            from core.message_retry import ERROR_CATEGORIES
            
            return self._json_response({
                'success': True,
                'data': {
                    'schedule': schedule,
                    'max_retries': manager.policy.max_retries,
                    'base_delay': manager.policy.base_delay_seconds,
                    'max_delay': manager.policy.max_delay_seconds,
                    'error_categories': {
                        k: v for k, v in ERROR_CATEGORIES.items()
                    },
                }
            })
        except Exception as e:
            logger.error(f"Retry schedule error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def create_ab_test(self, request):
        """🔧 P12-5: 創建 A/B 測試"""
        try:
            data = await request.json()
            name = data.get('name', 'Untitled Test')
            template_ids = data.get('template_ids', [])
            template_names = data.get('template_names', [])
            
            if len(template_ids) < 2:
                return self._json_response({
                    'success': False,
                    'error': 'At least 2 template_ids are required for A/B test'
                }, 400)
            
            from core.template_ab_test import get_ab_test_manager
            manager = get_ab_test_manager()
            test = manager.create_test(
                name=name,
                template_ids=template_ids,
                template_names=template_names or None,
            )
            
            return self._json_response({
                'success': True,
                'data': test.get_results(),
            })
        except Exception as e:
            logger.error(f"Create A/B test error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def list_ab_tests(self, request):
        """🔧 P12-5: 列出所有 A/B 測試"""
        try:
            from core.template_ab_test import get_ab_test_manager
            manager = get_ab_test_manager()
            tests = manager.list_tests()
            
            return self._json_response({
                'success': True,
                'data': tests,
            })
        except Exception as e:
            logger.error(f"List A/B tests error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_ab_test(self, request):
        """🔧 P12-5: 獲取 A/B 測試詳情"""
        try:
            test_id = request.match_info.get('test_id')
            
            from core.template_ab_test import get_ab_test_manager
            manager = get_ab_test_manager()
            test = manager.get_test(test_id)
            
            if not test:
                return self._json_response({
                    'success': False,
                    'error': f'Test {test_id} not found'
                }, 404)
            
            return self._json_response({
                'success': True,
                'data': test.get_results(),
            })
        except Exception as e:
            logger.error(f"Get A/B test error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def complete_ab_test(self, request):
        """🔧 P12-5: 結束 A/B 測試並選出贏家"""
        try:
            test_id = request.match_info.get('test_id')
            
            from core.template_ab_test import get_ab_test_manager
            manager = get_ab_test_manager()
            result = manager.complete_test(test_id)
            
            if not result:
                return self._json_response({
                    'success': False,
                    'error': f'Test {test_id} not found'
                }, 404)
            
            # P14-4: WebSocket 推送 A/B 測試完成事件
            try:
                if hasattr(self, 'ws_service') and self.ws_service:
                    winner_name = result.get('winner', {}).get('template_name', 'N/A') if result.get('winner') else 'N/A'
                    self.ws_service.publish_ab_test_event('ab_test:completed', {
                        'test_id': test_id,
                        'test_name': result.get('name', ''),
                        'winner': winner_name,
                    })
            except Exception:
                pass
            
            return self._json_response({
                'success': True,
                'data': result,
            })
        except Exception as e:
            logger.error(f"Complete A/B test error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_contacts(self, request):
        """🔧 P15-1: 獲取統一聯繫人列表（HTTP 模式回退）"""
        try:
            params = request.rel_url.query
            limit = min(int(params.get('limit', 100)), 500)
            offset = int(params.get('offset', 0))
            search = params.get('search', '')
            status = params.get('status', '')
            source_type = params.get('source_type', '')
            order_by = params.get('order_by', 'created_at DESC')
            
            # 安全的排序白名單
            allowed_orders = {
                'created_at DESC', 'created_at ASC',
                'ai_score DESC', 'ai_score ASC',
                'display_name ASC', 'display_name DESC',
                'lead_score DESC', 'lead_score ASC',
            }
            if order_by not in allowed_orders:
                order_by = 'created_at DESC'
            
            from core.db_utils import get_connection
            with get_connection() as conn:
                conn.row_factory = sqlite3.Row
                
                where_clauses = []
                params_list = []
                
                if search:
                    where_clauses.append(
                        "(username LIKE ? OR display_name LIKE ? OR first_name LIKE ? OR phone LIKE ?)"
                    )
                    s = f'%{search}%'
                    params_list.extend([s, s, s, s])
                
                if status:
                    where_clauses.append("status = ?")
                    params_list.append(status)
                
                if source_type:
                    where_clauses.append("source_type = ?")
                    params_list.append(source_type)
                
                where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
                
                # 計數
                count_row = conn.execute(
                    f"SELECT COUNT(*) as cnt FROM unified_contacts {where_sql}",
                    params_list
                ).fetchone()
                total = count_row['cnt'] if count_row else 0
                
                # 查詢
                rows = conn.execute(
                    f"""SELECT id, telegram_id, username, display_name, first_name, last_name,
                               phone, contact_type, source_type, source_name, status, tags,
                               ai_score, lead_score, intent_level, value_level,
                               funnel_stage, created_at, updated_at
                        FROM unified_contacts {where_sql}
                        ORDER BY {order_by}
                        LIMIT ? OFFSET ?""",
                    params_list + [limit, offset]
                ).fetchall()
                
                contacts = []
                for row in rows:
                    r = dict(row)
                    # 解析 tags JSON
                    import json
                    try:
                        r['tags'] = json.loads(r.get('tags') or '[]')
                    except Exception:
                        r['tags'] = []
                    contacts.append(r)
            
            return self._json_response({
                'success': True,
                'data': {
                    'contacts': contacts,
                    'total': total,
                    'limit': limit,
                    'offset': offset,
                }
            })
        except Exception as e:
            logger.error(f"Get contacts error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    async def get_contacts_stats(self, request):
        """🔧 P15-1: 獲取聯繫人統計"""
        try:
            from core.db_utils import get_connection
            with get_connection() as conn:
                conn.row_factory = sqlite3.Row
                
                total = conn.execute("SELECT COUNT(*) as cnt FROM unified_contacts").fetchone()['cnt']
                
                status_rows = conn.execute(
                    "SELECT status, COUNT(*) as cnt FROM unified_contacts GROUP BY status"
                ).fetchall()
                by_status = {r['status']: r['cnt'] for r in status_rows}
                
                source_rows = conn.execute(
                    "SELECT source_type, COUNT(*) as cnt FROM unified_contacts GROUP BY source_type"
                ).fetchall()
                by_source = {r['source_type']: r['cnt'] for r in source_rows}
                
                # 最近 7 天新增
                recent = conn.execute(
                    "SELECT COUNT(*) as cnt FROM unified_contacts WHERE created_at > datetime('now', '-7 days')"
                ).fetchone()['cnt']
            
            return self._json_response({
                'success': True,
                'data': {
                    'total': total,
                    'recent_7d': recent,
                    'by_status': by_status,
                    'by_source': by_source,
                }
            })
        except Exception as e:
            logger.error(f"Get contacts stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    # ==================== P12-1: Batch Operations ====================

    async def batch_account_operations(self, request):
        """
        🔧 P6-5: 批量帳號操作
        
        支持的操作：delete, login, logout, update_status
        
        請求格式:
        {
            "operations": [
                {"action": "delete", "account_id": "123"},
                {"action": "login", "account_id": "456"},
                {"action": "logout", "account_id": "789"},
                {"action": "update_status", "account_id": "abc", "status": "paused"}
            ]
        }
        
        響應格式:
        {
            "success": true,
            "data": {
                "total": 3,
                "succeeded": 2,
                "failed": 1,
                "results": [
                    {"account_id": "123", "action": "delete", "success": true},
                    {"account_id": "456", "action": "login", "success": true},
                    {"account_id": "789", "action": "logout", "success": false, "error": "..."}
                ]
            }
        }
        """
        try:
            data = await request.json()
            operations = data.get('operations', [])
            
            if not operations:
                return self._error_response('No operations provided', 'EMPTY_BATCH', 400)
            
            # 限制批量操作數量（防止濫用）
            MAX_BATCH_SIZE = 50
            if len(operations) > MAX_BATCH_SIZE:
                return self._error_response(
                    f'Batch size exceeds limit ({MAX_BATCH_SIZE})',
                    'BATCH_TOO_LARGE', 400
                )
            
            # 支持的操作映射
            action_map = {
                'delete': lambda op: self._execute_command('remove-account', {'id': op['account_id']}),
                'login': lambda op: self._execute_command('login-account', {'id': op['account_id']}),
                'logout': lambda op: self._execute_command('logout-account', {'id': op['account_id']}),
                'update_status': lambda op: self._execute_command('update-account', {
                    'id': op['account_id'],
                    'status': op.get('status', 'active')
                })
            }
            
            results = []
            succeeded = 0
            failed = 0
            
            for op in operations:
                action = op.get('action', '')
                account_id = op.get('account_id', '')
                
                if not action or not account_id:
                    results.append({
                        'account_id': account_id,
                        'action': action,
                        'success': False,
                        'error': 'Missing action or account_id'
                    })
                    failed += 1
                    continue
                
                handler = action_map.get(action)
                if not handler:
                    results.append({
                        'account_id': account_id,
                        'action': action,
                        'success': False,
                        'error': f'Unknown action: {action}'
                    })
                    failed += 1
                    continue
                
                try:
                    result = await handler(op)
                    is_success = (
                        isinstance(result, dict) and result.get('success', False)
                    ) or (
                        isinstance(result, dict) and 'error' not in result
                    )
                    
                    results.append({
                        'account_id': account_id,
                        'action': action,
                        'success': is_success,
                        'error': result.get('error') if isinstance(result, dict) and not is_success else None
                    })
                    
                    if is_success:
                        succeeded += 1
                    else:
                        failed += 1
                        
                except Exception as op_err:
                    results.append({
                        'account_id': account_id,
                        'action': action,
                        'success': False,
                        'error': str(op_err)
                    })
                    failed += 1
            
            return self._success_response({
                'total': len(operations),
                'succeeded': succeeded,
                'failed': failed,
                'results': results
            })
            
        except Exception as e:
            return self._error_response(str(e), 'BATCH_ERROR', 500)

#!/usr/bin/env python3
"""
TG-Matrix HTTP API Server
統一的 HTTP API 層，包裝現有的 CommandRouter
支持 REST API 和 WebSocket

優化設計：
1. 自動將 IPC 命令映射為 HTTP 端點
2. 統一錯誤處理和響應格式
3. CORS 支持（本地版和 SaaS 版）
4. WebSocket 實時通訊
5. API 版本控制
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional, Callable
from functools import wraps

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiohttp import web
import aiohttp_cors

logger = logging.getLogger(__name__)


class HttpApiServer:
    """HTTP API 服務器 - 包裝 CommandRouter"""
    
    def __init__(self, backend_service=None, host='0.0.0.0', port=8000):
        self.backend_service = backend_service
        self.host = host
        self.port = port
        self.app = web.Application()
        self.websocket_clients = set()
        self._setup_routes()
        self._setup_cors()
        self._setup_middleware()
        
        # 將 http_server 實例設置回 backend，讓 send_event 可以廣播到 WebSocket
        if backend_service:
            backend_service._http_server = self
    
    def _setup_middleware(self):
        """設置中間件"""
        # 嘗試使用完整的中間件堆棧
        try:
            from api.middleware import create_middleware_stack
            middlewares = create_middleware_stack()
            for mw in middlewares:
                self.app.middlewares.append(mw)
            logger.info(f"Loaded {len(middlewares)} middlewares")
            return
        except Exception as e:
            logger.warning(f"Failed to load middleware stack: {e}, using fallback")
        
        # 降級：基本錯誤處理中間件
        @web.middleware
        async def error_middleware(request, handler):
            try:
                response = await handler(request)
                return response
            except web.HTTPException:
                raise
            except Exception as e:
                logger.exception(f"Request error: {e}")
                return web.json_response({
                    'success': False,
                    'error': str(e),
                    'error_type': type(e).__name__
                }, status=500)
        
        @web.middleware
        async def logging_middleware(request, handler):
            start_time = datetime.now()
            response = await handler(request)
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"{request.method} {request.path} - {response.status} ({duration:.1f}ms)")
            return response
        
        self.app.middlewares.extend([logging_middleware, error_middleware])
    
    def _setup_cors(self):
        """設置 CORS"""
        cors = aiohttp_cors.setup(self.app, defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
            )
        })
        
        for route in list(self.app.router.routes()):
            try:
                cors.add(route)
            except ValueError:
                pass
    
    def _setup_routes(self):
        """設置路由"""
        # 健康檢查
        self.app.router.add_get('/health', self.health_check)
        self.app.router.add_get('/api/health', self.health_check)
        
        # 通用命令端點（核心）
        self.app.router.add_post('/api/command', self.handle_command)
        self.app.router.add_post('/api/v1/command', self.handle_command)
        
        # RESTful 端點（語義化）
        # 帳號管理
        self.app.router.add_get('/api/v1/accounts', self.get_accounts)
        self.app.router.add_post('/api/v1/accounts', self.add_account)
        self.app.router.add_get('/api/v1/accounts/{id}', self.get_account)
        self.app.router.add_put('/api/v1/accounts/{id}', self.update_account)
        self.app.router.add_delete('/api/v1/accounts/{id}', self.delete_account)
        self.app.router.add_post('/api/v1/accounts/{id}/login', self.login_account)
        self.app.router.add_post('/api/v1/accounts/{id}/logout', self.logout_account)
        
        # 用戶認證（SaaS）
        self.app.router.add_post('/api/v1/auth/register', self.user_register)
        self.app.router.add_post('/api/v1/auth/login', self.user_login)
        self.app.router.add_post('/api/v1/auth/logout', self.user_logout)
        self.app.router.add_post('/api/v1/auth/refresh', self.user_refresh_token)
        self.app.router.add_get('/api/v1/auth/me', self.get_current_user)
        self.app.router.add_put('/api/v1/auth/me', self.update_current_user)
        self.app.router.add_post('/api/v1/auth/change-password', self.change_password)
        self.app.router.add_get('/api/v1/auth/sessions', self.get_user_sessions)
        self.app.router.add_delete('/api/v1/auth/sessions/{id}', self.revoke_session)
        
        # Telegram 帳號認證
        self.app.router.add_post('/api/v1/auth/send-code', self.send_code)
        self.app.router.add_post('/api/v1/auth/verify-code', self.verify_code)
        self.app.router.add_post('/api/v1/auth/submit-2fa', self.submit_2fa)
        
        # OAuth 第三方登入
        self.app.router.add_post('/api/v1/oauth/telegram', self.oauth_telegram)
        self.app.router.add_get('/api/v1/oauth/telegram/config', self.oauth_telegram_config)
        self.app.router.add_post('/api/v1/oauth/google', self.oauth_google)
        self.app.router.add_get('/api/v1/oauth/providers', self.oauth_providers)
        
        # 郵箱驗證和密碼重置
        self.app.router.add_post('/api/v1/auth/send-verification', self.send_verification_email)
        self.app.router.add_post('/api/v1/auth/verify-email', self.verify_email)
        self.app.router.add_post('/api/v1/auth/verify-email-code', self.verify_email_by_code)
        self.app.router.add_post('/api/v1/auth/forgot-password', self.forgot_password)
        self.app.router.add_post('/api/v1/auth/reset-password', self.reset_password)
        self.app.router.add_post('/api/v1/auth/reset-password-code', self.reset_password_by_code)
        
        # API 憑證
        self.app.router.add_get('/api/v1/credentials', self.get_credentials)
        self.app.router.add_post('/api/v1/credentials', self.add_credential)
        self.app.router.add_delete('/api/v1/credentials/{id}', self.delete_credential)
        self.app.router.add_get('/api/v1/credentials/recommend', self.get_recommended_credential)
        
        # 監控
        self.app.router.add_get('/api/v1/monitoring/status', self.get_monitoring_status)
        self.app.router.add_post('/api/v1/monitoring/start', self.start_monitoring)
        self.app.router.add_post('/api/v1/monitoring/stop', self.stop_monitoring)
        
        # 關鍵詞
        self.app.router.add_get('/api/v1/keywords', self.get_keywords)
        self.app.router.add_post('/api/v1/keywords', self.add_keyword_set)
        
        # 群組
        self.app.router.add_get('/api/v1/groups', self.get_groups)
        self.app.router.add_post('/api/v1/groups', self.add_group)
        
        # 設置
        self.app.router.add_get('/api/v1/settings', self.get_settings)
        self.app.router.add_post('/api/v1/settings', self.save_settings)
        
        # 使用量統計
        self.app.router.add_get('/api/v1/usage', self.get_usage_stats)
        self.app.router.add_get('/api/v1/usage/today', self.get_today_usage)
        self.app.router.add_get('/api/v1/usage/history', self.get_usage_history)
        self.app.router.add_get('/api/v1/quota', self.get_quota_status)
        
        # 配額管理（增強版）
        self.app.router.add_post('/api/v1/quota/check', self.check_quota)
        self.app.router.add_get('/api/v1/quota/alerts', self.get_quota_alerts)
        self.app.router.add_post('/api/v1/quota/alerts/acknowledge', self.acknowledge_quota_alert)
        self.app.router.add_get('/api/v1/membership/levels', self.get_all_membership_levels)
        self.app.router.add_get('/api/v1/quota/trend', self.get_quota_trend)
        self.app.router.add_get('/api/v1/quota/history', self.get_quota_history)
        
        # 支付和訂閱
        self.app.router.get('/api/v1/subscription', self.get_subscription)
        self.app.router.add_post('/api/v1/subscription/checkout', self.create_checkout)
        self.app.router.add_post('/api/v1/subscription/cancel', self.cancel_subscription)
        self.app.router.add_get('/api/v1/subscription/plans', self.get_plans)
        self.app.router.add_get('/api/v1/transactions', self.get_transactions)
        self.app.router.add_post('/api/v1/webhooks/stripe', self.stripe_webhook)
        
        # 統一支付 API
        self.app.router.add_post('/api/v1/payment/create', self.create_payment)
        self.app.router.add_get('/api/v1/payment/status', self.get_payment_status)
        self.app.router.add_get('/api/v1/payment/history', self.get_payment_history)
        self.app.router.add_post('/api/v1/webhooks/paypal', self.paypal_webhook)
        self.app.router.add_post('/api/v1/webhooks/alipay', self.alipay_webhook)
        self.app.router.add_post('/api/v1/webhooks/wechat', self.wechat_webhook)
        
        # 發票 API
        self.app.router.add_get('/api/v1/invoices', self.get_invoices)
        self.app.router.add_get('/api/v1/invoices/{invoice_id}', self.get_invoice_detail)
        
        # 財務報表 API（管理員）
        self.app.router.add_get('/api/v1/admin/financial/summary', self.admin_financial_summary)
        self.app.router.add_get('/api/v1/admin/financial/export', self.admin_export_financial)
        
        # 計費和配額包
        self.app.router.add_get('/api/v1/billing/quota-packs', self.get_quota_packs)
        self.app.router.add_post('/api/v1/billing/quota-packs/purchase', self.purchase_quota_pack)
        self.app.router.add_get('/api/v1/billing/my-packages', self.get_my_packages)
        self.app.router.add_get('/api/v1/billing/bills', self.get_user_bills)
        self.app.router.add_post('/api/v1/billing/bills/pay', self.pay_bill)
        self.app.router.add_get('/api/v1/billing/overage', self.get_overage_info)
        self.app.router.add_get('/api/v1/billing/freeze-status', self.get_freeze_status)
        
        # 數據導出和備份
        self.app.router.add_post('/api/v1/export', self.export_data)
        self.app.router.add_get('/api/v1/backups', self.list_backups)
        self.app.router.add_post('/api/v1/backups', self.create_backup)
        self.app.router.add_delete('/api/v1/backups/{id}', self.delete_backup)
        self.app.router.add_get('/api/v1/backups/{id}/download', self.download_backup)
        
        # 系統監控
        self.app.router.add_get('/api/v1/system/health', self.system_health)
        self.app.router.add_get('/api/v1/system/metrics', self.system_metrics)
        self.app.router.add_get('/api/v1/system/alerts', self.system_alerts)
        self.app.router.add_get('/metrics', self.prometheus_metrics)
        
        # 2FA
        self.app.router.add_get('/api/v1/auth/2fa', self.get_2fa_status)
        self.app.router.add_post('/api/v1/auth/2fa/setup', self.setup_2fa)
        self.app.router.add_post('/api/v1/auth/2fa/enable', self.enable_2fa)
        self.app.router.add_post('/api/v1/auth/2fa/disable', self.disable_2fa)
        self.app.router.add_post('/api/v1/auth/2fa/verify', self.verify_2fa)
        self.app.router.add_get('/api/v1/auth/2fa/devices', self.get_trusted_devices)
        self.app.router.add_delete('/api/v1/auth/2fa/devices/{id}', self.remove_trusted_device)
        
        # API 密鑰
        self.app.router.add_get('/api/v1/api-keys', self.list_api_keys)
        self.app.router.add_post('/api/v1/api-keys', self.create_api_key)
        self.app.router.add_delete('/api/v1/api-keys/{id}', self.delete_api_key)
        self.app.router.add_post('/api/v1/api-keys/{id}/revoke', self.revoke_api_key)
        
        # 管理員 API
        self.app.router.add_get('/api/v1/admin/dashboard', self.admin_dashboard)
        self.app.router.add_get('/api/v1/admin/users', self.admin_list_users)
        self.app.router.add_get('/api/v1/admin/users/{id}', self.admin_get_user)
        self.app.router.add_put('/api/v1/admin/users/{id}', self.admin_update_user)
        self.app.router.add_post('/api/v1/admin/users/{id}/suspend', self.admin_suspend_user)
        self.app.router.add_get('/api/v1/admin/security', self.admin_security_overview)
        self.app.router.add_get('/api/v1/admin/audit-logs', self.admin_audit_logs)
        self.app.router.add_get('/api/v1/admin/usage-trends', self.admin_usage_trends)
        self.app.router.add_get('/api/v1/admin/cache-stats', self.admin_cache_stats)
        
        # 管理員配額監控 API
        self.app.router.add_get('/api/v1/admin/quota/overview', self.admin_quota_overview)
        self.app.router.add_get('/api/v1/admin/quota/rankings', self.admin_quota_rankings)
        self.app.router.add_get('/api/v1/admin/quota/alerts', self.admin_quota_alerts)
        self.app.router.add_post('/api/v1/admin/quota/adjust', self.admin_adjust_quota)
        self.app.router.add_post('/api/v1/admin/quota/batch-adjust', self.admin_batch_adjust_quotas)
        self.app.router.add_get('/api/v1/admin/quota/export', self.admin_export_quota_report)
        self.app.router.add_post('/api/v1/admin/quota/reset-daily', self.admin_reset_daily_quotas)
        
        # 管理員計費 API
        self.app.router.add_get('/api/v1/admin/billing/overview', self.admin_billing_overview)
        self.app.router.add_get('/api/v1/admin/billing/bills', self.admin_get_all_bills)
        self.app.router.add_post('/api/v1/admin/billing/refund', self.admin_process_refund)
        self.app.router.add_post('/api/v1/admin/billing/freeze', self.admin_freeze_quota)
        self.app.router.add_post('/api/v1/admin/billing/unfreeze', self.admin_unfreeze_quota)
        self.app.router.add_get('/api/v1/admin/billing/frozen-users', self.admin_get_frozen_users)
        
        # 訂閱管理 API
        self.app.router.add_get('/api/v1/subscription/details', self.get_subscription_details)
        self.app.router.add_post('/api/v1/subscription/upgrade', self.upgrade_subscription)
        self.app.router.add_post('/api/v1/subscription/downgrade', self.downgrade_subscription)
        self.app.router.add_post('/api/v1/subscription/pause', self.pause_subscription)
        self.app.router.add_post('/api/v1/subscription/resume', self.resume_subscription)
        self.app.router.add_get('/api/v1/subscription/history', self.get_subscription_history)
        
        # 優惠券 API
        self.app.router.add_post('/api/v1/coupon/validate', self.validate_coupon)
        self.app.router.add_post('/api/v1/coupon/apply', self.apply_coupon)
        self.app.router.add_get('/api/v1/campaigns/active', self.get_active_campaigns)
        
        # 推薦獎勵 API
        self.app.router.add_get('/api/v1/referral/code', self.get_referral_code)
        self.app.router.add_get('/api/v1/referral/stats', self.get_referral_stats)
        self.app.router.add_post('/api/v1/referral/track', self.track_referral)
        
        # 通知 API
        self.app.router.add_get('/api/v1/notifications', self.get_notifications)
        self.app.router.add_get('/api/v1/notifications/unread-count', self.get_unread_count)
        self.app.router.add_post('/api/v1/notifications/read', self.mark_notification_read)
        self.app.router.add_post('/api/v1/notifications/read-all', self.mark_all_notifications_read)
        self.app.router.add_get('/api/v1/notifications/preferences', self.get_notification_preferences)
        self.app.router.add_put('/api/v1/notifications/preferences', self.update_notification_preferences)
        
        # 數據分析 API（管理員）
        self.app.router.add_get('/api/v1/admin/analytics/dashboard', self.admin_analytics_dashboard)
        self.app.router.add_get('/api/v1/admin/analytics/trends', self.admin_analytics_trends)
        
        # 國際化 API
        self.app.router.add_get('/api/v1/i18n/languages', self.get_supported_languages)
        self.app.router.add_get('/api/v1/i18n/translations', self.get_translations)
        self.app.router.add_put('/api/v1/i18n/language', self.set_user_language)
        
        # 時區 API
        self.app.router.add_get('/api/v1/timezone/list', self.get_timezones)
        self.app.router.add_get('/api/v1/timezone/settings', self.get_timezone_settings)
        self.app.router.add_put('/api/v1/timezone/settings', self.update_timezone_settings)
        
        # 健康檢查 API
        self.app.router.add_get('/api/v1/health', self.health_check)
        self.app.router.add_get('/api/v1/health/live', self.liveness_probe)
        self.app.router.add_get('/api/v1/health/ready', self.readiness_probe)
        self.app.router.add_get('/api/v1/health/info', self.service_info)
        
        # 緩存管理 API（管理員）
        self.app.router.add_get('/api/v1/admin/cache/stats', self.admin_cache_stats)
        self.app.router.add_post('/api/v1/admin/cache/clear', self.admin_clear_cache)
        
        # 消息隊列 API（管理員）
        self.app.router.add_get('/api/v1/admin/queue/stats', self.admin_queue_stats)
        
        # 速率限制 API（管理員）
        self.app.router.add_get('/api/v1/admin/rate-limit/stats', self.admin_rate_limit_stats)
        self.app.router.add_get('/api/v1/admin/rate-limit/rules', self.admin_get_rate_limit_rules)
        self.app.router.add_post('/api/v1/admin/rate-limit/ban', self.admin_ban_ip)
        self.app.router.add_post('/api/v1/admin/rate-limit/unban', self.admin_unban_ip)
        
        # 審計日誌 API（管理員）
        self.app.router.add_get('/api/v1/admin/audit/logs', self.admin_get_audit_logs)
        self.app.router.add_get('/api/v1/admin/audit/stats', self.admin_audit_stats)
        self.app.router.add_get('/api/v1/admin/audit/export', self.admin_export_audit)
        
        # 安全告警 API（管理員）
        self.app.router.add_get('/api/v1/admin/security/alerts', self.admin_get_security_alerts)
        self.app.router.add_get('/api/v1/admin/security/stats', self.admin_security_stats)
        self.app.router.add_post('/api/v1/admin/security/acknowledge', self.admin_acknowledge_alert)
        self.app.router.add_post('/api/v1/admin/security/resolve', self.admin_resolve_alert)
        
        # 診斷 API
        self.app.router.add_get('/api/v1/diagnostics', self.get_diagnostics)
        self.app.router.add_get('/api/v1/diagnostics/quick', self.get_quick_health)
        self.app.router.add_get('/api/v1/diagnostics/system', self.get_system_info)
        
        # API 文檔
        self.app.router.add_get('/api/docs', self.swagger_ui)
        self.app.router.add_get('/api/redoc', self.redoc_ui)
        self.app.router.add_get('/api/openapi.json', self.openapi_json)
        
        # 初始狀態
        self.app.router.add_get('/api/v1/initial-state', self.get_initial_state)
        
        # WebSocket
        self.app.router.add_get('/ws', self.websocket_handler)
        self.app.router.add_get('/api/v1/ws', self.websocket_handler)
    
    # ==================== 核心方法 ====================
    
    async def _execute_command(self, command: str, payload: dict = None) -> dict:
        """執行命令 - 核心方法"""
        if payload is None:
            payload = {}
        
        if self.backend_service:
            try:
                result = await self.backend_service.handle_command(command, payload)
                return result
            except Exception as e:
                logger.error(f"Command execution error: {command} - {e}")
                return {'success': False, 'error': str(e)}
        else:
            # 後端服務未初始化時的演示模式
            return await self._demo_mode_handler(command, payload)
    
    async def _demo_mode_handler(self, command: str, payload: dict) -> dict:
        """演示模式處理器 - 後端未初始化時使用"""
        demo_responses = {
            'get-accounts': {'success': True, 'data': []},
            'get-initial-state': {
                'success': True,
                'data': {
                    'accounts': [],
                    'settings': {},
                    'monitoring_status': False,
                    'version': '2.1.1'
                }
            },
            'get-api-credentials': {'success': True, 'data': []},
            'get-monitoring-status': {'success': True, 'data': {'running': False}},
            'get-settings': {'success': True, 'data': {}},
            'get-keyword-sets': {'success': True, 'data': []},
            'get-groups': {'success': True, 'data': []},
        }
        
        if command in demo_responses:
            return demo_responses[command]
        
        return {
            'success': True,
            'message': f'Command received: {command}',
            'demo_mode': True,
            'note': 'Backend not fully initialized'
        }
    
    def _json_response(self, data: dict, status: int = 200, events: list = None) -> web.Response:
        """統一 JSON 響應，支持事件觸發信息
        
        Args:
            data: 響應數據
            status: HTTP 狀態碼
            events: 前端需要觸發的事件列表，格式: [{'name': 'event-name', 'data': {...}}]
        """
        # 確保 data 不是 None
        if data is None:
            data = {'success': True}
        
        response_data = {
            **data,
            'timestamp': datetime.now().isoformat(),
        }
        
        # 添加事件列表（如果有）
        if events:
            response_data['events'] = events
        
        return web.json_response(
            response_data, 
            status=status, 
            dumps=lambda x: json.dumps(x, ensure_ascii=False, default=str)
        )
    
    # ==================== 端點處理器 ====================
    
    async def health_check(self, request):
        """健康檢查"""
        return self._json_response({
            'status': 'ok',
            'service': 'TG-Matrix API',
            'version': '2.1.1',
            'timestamp': datetime.now().isoformat(),
            'backend_ready': self.backend_service is not None
        })
    
    async def handle_command(self, request):
        """通用命令處理 - 兼容所有 IPC 命令"""
        try:
            data = await request.json()
        except:
            data = {}
        
        command = data.get('command')
        payload = data.get('payload', {})
        
        if not command:
            return self._json_response({'success': False, 'error': 'Missing command'}, 400)
        
        result = await self._execute_command(command, payload)
        return self._json_response(result)
    
    # ==================== 帳號管理 ====================
    
    async def get_accounts(self, request):
        """獲取帳號列表"""
        result = await self._execute_command('get-accounts')
        return self._json_response(result)
    
    async def add_account(self, request):
        """添加帳號"""
        data = await request.json()
        result = await self._execute_command('add-account', data)
        return self._json_response(result)
    
    async def get_account(self, request):
        """獲取單個帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('get-account', {'id': account_id})
        return self._json_response(result)
    
    async def update_account(self, request):
        """更新帳號"""
        account_id = request.match_info['id']
        data = await request.json()
        data['id'] = account_id
        result = await self._execute_command('update-account', data)
        return self._json_response(result)
    
    async def delete_account(self, request):
        """刪除帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('remove-account', {'id': account_id})
        return self._json_response(result)
    
    async def login_account(self, request):
        """登入帳號"""
        account_id = request.match_info['id']
        data = await request.json() if request.body_exists else {}
        data['id'] = account_id
        result = await self._execute_command('login-account', data)
        return self._json_response(result)
    
    async def logout_account(self, request):
        """登出帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('logout-account', {'id': account_id})
        return self._json_response(result)
    
    # ==================== 用戶認證 (SaaS) ====================
    
    async def user_register(self, request):
        """用戶註冊"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.register(
                email=data.get('email', ''),
                password=data.get('password', ''),
                username=data.get('username'),
                display_name=data.get('display_name')
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_login(self, request):
        """用戶登入"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            # 獲取設備信息
            device_info = {
                'ip_address': request.headers.get('X-Forwarded-For', 
                              request.headers.get('X-Real-IP', 
                              request.remote or '')),
                'user_agent': request.headers.get('User-Agent', ''),
                'device_type': 'web',
                'device_name': data.get('device_name', 'Web Browser')
            }
            
            result = await auth_service.login(
                email=data.get('email', ''),
                password=data.get('password', ''),
                device_info=device_info
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Login error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_logout(self, request):
        """用戶登出"""
        try:
            # 從 header 獲取 token
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.logout(token=token)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_refresh_token(self, request):
        """刷新 Token"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.refresh_token(data.get('refresh_token', ''))
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_current_user(self, request):
        """獲取當前用戶信息"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            user = await auth_service.get_user_by_token(token)
            
            if not user:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            return self._json_response({'success': True, 'data': user.to_dict()})
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def update_current_user(self, request):
        """更新當前用戶信息"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            data = await request.json()
            auth_service = get_auth_service()
            result = await auth_service.update_user(payload.get('sub'), data)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def change_password(self, request):
        """修改密碼"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            data = await request.json()
            auth_service = get_auth_service()
            result = await auth_service.change_password(
                payload.get('sub'),
                data.get('old_password', ''),
                data.get('new_password', '')
            )
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_user_sessions(self, request):
        """獲取用戶會話列表"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            auth_service = get_auth_service()
            sessions = await auth_service.get_sessions(payload.get('sub'))
            return self._json_response({'success': True, 'data': sessions})
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def revoke_session(self, request):
        """撤銷會話"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            session_id = request.match_info['id']
            auth_service = get_auth_service()
            result = await auth_service.revoke_session(payload.get('sub'), session_id)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== Telegram 認證 ====================
    
    async def send_code(self, request):
        """發送驗證碼"""
        data = await request.json()
        result = await self._execute_command('send-code', data)
        return self._json_response(result)
    
    async def verify_code(self, request):
        """驗證驗證碼"""
        data = await request.json()
        result = await self._execute_command('verify-code', data)
        return self._json_response(result)
    
    async def submit_2fa(self, request):
        """提交 2FA 密碼"""
        data = await request.json()
        result = await self._execute_command('submit-2fa-password', data)
        return self._json_response(result)
    
    # ==================== OAuth 第三方登入 ====================
    
    async def oauth_telegram(self, request):
        """
        Telegram OAuth 登入
        
        接收 Telegram Login Widget 返回的數據，驗證後創建或綁定用戶
        """
        try:
            data = await request.json()
            
            # 1. 驗證 Telegram 數據
            from auth.oauth_telegram import get_telegram_oauth_service
            oauth_service = get_telegram_oauth_service()
            
            success, tg_user, error = await oauth_service.authenticate(data)
            if not success:
                return self._json_response({
                    'success': False, 
                    'error': error or 'Telegram 認證失敗'
                }, 401)
            
            # 2. 查找或創建用戶
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            # 嘗試通過 telegram_id 查找現有用戶
            user = await auth_service.get_user_by_telegram_id(str(tg_user.id))
            
            if user:
                # 已有用戶，直接登入
                logger.info(f"Telegram OAuth: existing user {user.id}")
            else:
                # 新用戶，自動註冊
                logger.info(f"Telegram OAuth: creating new user for TG {tg_user.id}")
                
                # 生成唯一用戶名
                username = tg_user.username or f"tg_{tg_user.id}"
                
                # 創建用戶（無密碼，僅限 OAuth 登入）
                reg_result = await auth_service.register_oauth(
                    provider='telegram',
                    provider_id=str(tg_user.id),
                    email=None,  # Telegram 不提供 email
                    username=username,
                    display_name=tg_user.full_name,
                    avatar_url=tg_user.photo_url
                )
                
                if not reg_result.get('success'):
                    return self._json_response(reg_result, 400)
                
                user = await auth_service.get_user(reg_result.get('user_id'))
            
            if not user:
                return self._json_response({
                    'success': False,
                    'error': '無法創建用戶'
                }, 500)
            
            # 3. 創建會話並返回令牌
            device_info = {
                'ip_address': request.headers.get('X-Forwarded-For', 
                              request.headers.get('X-Real-IP', 
                              request.remote or '')),
                'user_agent': request.headers.get('User-Agent', ''),
                'device_type': 'web',
                'device_name': 'Telegram OAuth'
            }
            
            tokens = await auth_service.create_session(user.id, device_info)
            
            return self._json_response({
                'success': True,
                'access_token': tokens.get('access_token'),
                'refresh_token': tokens.get('refresh_token'),
                'user': user.to_dict() if hasattr(user, 'to_dict') else {
                    'id': user.id,
                    'username': user.username,
                    'display_name': getattr(user, 'display_name', user.username),
                    'avatar_url': getattr(user, 'avatar_url', None),
                    'role': getattr(user, 'role', 'free')
                },
                'is_new_user': not user  # 標記是否為新用戶
            })
            
        except Exception as e:
            logger.error(f"Telegram OAuth error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False, 
                'error': f'OAuth 處理失敗: {str(e)}'
            }, 500)
    
    async def oauth_telegram_config(self, request):
        """獲取 Telegram OAuth 配置（用於前端 Widget）"""
        import os
        bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', '')
        
        return self._json_response({
            'success': True,
            'data': {
                'bot_username': bot_username,
                'enabled': bool(bot_username and os.environ.get('TELEGRAM_BOT_TOKEN'))
            }
        })
    
    async def oauth_google(self, request):
        """Google OAuth 登入（待實現）"""
        return self._json_response({
            'success': False,
            'error': 'Google OAuth 尚未實現',
            'code': 'NOT_IMPLEMENTED'
        }, 501)
    
    async def oauth_providers(self, request):
        """獲取可用的 OAuth 提供者列表"""
        import os
        
        providers = []
        
        # Telegram
        if os.environ.get('TELEGRAM_BOT_TOKEN'):
            providers.append({
                'id': 'telegram',
                'name': 'Telegram',
                'enabled': True,
                'icon': 'telegram'
            })
        
        # Google（預留）
        if os.environ.get('GOOGLE_CLIENT_ID'):
            providers.append({
                'id': 'google',
                'name': 'Google',
                'enabled': True,
                'icon': 'google'
            })
        
        return self._json_response({
            'success': True,
            'data': providers
        })
    
    # ==================== 郵箱驗證和密碼重置 ====================
    
    async def send_verification_email(self, request):
        """發送郵箱驗證郵件"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            auth_service = get_auth_service()
            result = await auth_service.send_verification_email(payload.get('sub'))
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Send verification email error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def verify_email(self, request):
        """驗證郵箱（通過 Token）"""
        try:
            data = await request.json()
            token = data.get('token', '')
            
            if not token:
                return self._json_response({'success': False, 'error': '缺少驗證令牌'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.verify_email(token)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify email error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def verify_email_by_code(self, request):
        """驗證郵箱（通過驗證碼）"""
        try:
            data = await request.json()
            email = data.get('email', '')
            code = data.get('code', '')
            
            if not email or not code:
                return self._json_response({'success': False, 'error': '缺少郵箱或驗證碼'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.verify_email_by_code(email, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify email by code error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def forgot_password(self, request):
        """請求密碼重置"""
        try:
            data = await request.json()
            email = data.get('email', '')
            
            if not email:
                return self._json_response({'success': False, 'error': '請輸入郵箱'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.request_password_reset(email)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Forgot password error: {e}")
            # 安全考慮：不暴露錯誤詳情
            return self._json_response({
                'success': True, 
                'message': '如果該郵箱已註冊，您將收到重置郵件'
            })
    
    async def reset_password(self, request):
        """重置密碼（通過 Token）"""
        try:
            data = await request.json()
            token = data.get('token', '')
            new_password = data.get('password', '')
            
            if not token:
                return self._json_response({'success': False, 'error': '缺少重置令牌'}, 400)
            
            if not new_password or len(new_password) < 8:
                return self._json_response({'success': False, 'error': '密碼至少需要 8 個字符'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.reset_password(token, new_password)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Reset password error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def reset_password_by_code(self, request):
        """重置密碼（通過驗證碼）"""
        try:
            data = await request.json()
            email = data.get('email', '')
            code = data.get('code', '')
            new_password = data.get('password', '')
            
            if not email or not code:
                return self._json_response({'success': False, 'error': '缺少郵箱或驗證碼'}, 400)
            
            if not new_password or len(new_password) < 8:
                return self._json_response({'success': False, 'error': '密碼至少需要 8 個字符'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.reset_password_by_code(email, code, new_password)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Reset password by code error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== API 憑證 ====================
    
    async def get_credentials(self, request):
        """獲取 API 憑證列表"""
        result = await self._execute_command('get-api-credentials')
        return self._json_response(result)
    
    async def add_credential(self, request):
        """添加 API 憑證"""
        data = await request.json()
        result = await self._execute_command('add-api-credential', data)
        return self._json_response(result)
    
    async def delete_credential(self, request):
        """刪除 API 憑證"""
        credential_id = request.match_info['id']
        result = await self._execute_command('remove-api-credential', {'id': credential_id})
        return self._json_response(result)
    
    async def get_recommended_credential(self, request):
        """獲取推薦的 API 憑證"""
        result = await self._execute_command('get-api-recommendation')
        return self._json_response(result)
    
    # ==================== 監控 ====================
    
    async def get_monitoring_status(self, request):
        """獲取監控狀態"""
        result = await self._execute_command('get-monitoring-status')
        return self._json_response(result)
    
    async def start_monitoring(self, request):
        """啟動監控"""
        data = await request.json() if request.body_exists else {}
        result = await self._execute_command('start-monitoring', data)
        return self._json_response(result)
    
    async def stop_monitoring(self, request):
        """停止監控"""
        result = await self._execute_command('stop-monitoring')
        return self._json_response(result)
    
    # ==================== 關鍵詞 ====================
    
    async def get_keywords(self, request):
        """獲取關鍵詞集"""
        result = await self._execute_command('get-keyword-sets')
        return self._json_response(result)
    
    async def add_keyword_set(self, request):
        """添加關鍵詞集"""
        data = await request.json()
        result = await self._execute_command('add-keyword-set', data)
        return self._json_response(result)
    
    # ==================== 群組 ====================
    
    async def get_groups(self, request):
        """獲取群組列表"""
        result = await self._execute_command('get-monitored-groups')
        return self._json_response(result)
    
    async def add_group(self, request):
        """添加群組"""
        data = await request.json()
        result = await self._execute_command('add-group', data)
        return self._json_response(result)
    
    # ==================== 設置 ====================
    
    async def get_settings(self, request):
        """獲取設置"""
        result = await self._execute_command('get-settings')
        return self._json_response(result)
    
    async def save_settings(self, request):
        """保存設置"""
        data = await request.json()
        result = await self._execute_command('save-settings', data)
        return self._json_response(result)
    
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
                
                # 獲取用戶等級
                cursor.execute('SELECT subscription_tier FROM users WHERE id = ?', (user_id,))
                row = cursor.fetchone()
                tier = row['subscription_tier'] if row else 'bronze'
                
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
    
    # ==================== 支付和訂閱 ====================
    
    async def get_subscription(self, request):
        """獲取用戶訂閱"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            sub = await service.get_subscription(user_id)
            if sub:
                return self._json_response({'success': True, 'data': sub.to_dict()})
            return self._json_response({'success': True, 'data': None})
        except Exception as e:
            logger.error(f"Get subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def create_checkout(self, request):
        """創建結帳會話"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            data = await request.json()
            plan_id = data.get('plan_id')
            billing_cycle = data.get('billing_cycle', 'monthly')
            success_url = data.get('success_url', '')
            cancel_url = data.get('cancel_url', '')
            
            result = await service.create_checkout(
                user_id=user_id,
                plan_id=plan_id,
                billing_cycle=billing_cycle,
                success_url=success_url,
                cancel_url=cancel_url
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Create checkout error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def cancel_subscription(self, request):
        """取消訂閱"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            result = await service.cancel_subscription(user_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Cancel subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_plans(self, request):
        """獲取訂閱方案列表"""
        try:
            from core.payment_service import SUBSCRIPTION_PLANS
            return self._json_response({
                'success': True,
                'data': list(SUBSCRIPTION_PLANS.values())
            })
        except Exception as e:
            logger.error(f"Get plans error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_transactions(self, request):
        """獲取交易記錄"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            limit = int(request.query.get('limit', '20'))
            transactions = await service.get_transactions(user_id, limit)
            return self._json_response({
                'success': True,
                'data': [t.to_dict() for t in transactions]
            })
        except Exception as e:
            logger.error(f"Get transactions error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def stripe_webhook(self, request):
        """Stripe Webhook 處理"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            payload = await request.read()
            signature = request.headers.get('Stripe-Signature', '')
            
            # 驗證簽名
            provider = service.get_provider('stripe')
            if not provider.verify_webhook(payload, signature):
                return self._json_response({
                    'success': False,
                    'error': 'Invalid signature'
                }, 400)
            
            # 解析事件
            import json
            event = json.loads(payload)
            event_type = event.get('type', '')
            event_data = event.get('data', {}).get('object', {})
            
            # 處理事件
            result = await service.handle_webhook(event_type, event_data)
            return self._json_response({'success': True, **result})
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 統一支付 API ====================
    
    async def create_payment(self, request):
        """創建支付"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            amount = data.get('amount')
            provider = data.get('provider', 'demo')
            payment_type = data.get('payment_type', 'one_time')
            description = data.get('description', '')
            metadata = data.get('metadata', {})
            success_url = data.get('success_url')
            cancel_url = data.get('cancel_url')
            
            if not amount:
                return self._json_response({'success': False, 'error': '缺少金額'}, 400)
            
            from core.unified_payment import (
                get_unified_payment_service, PaymentProvider, PaymentType
            )
            service = get_unified_payment_service()
            
            try:
                provider_enum = PaymentProvider(provider)
            except ValueError:
                provider_enum = PaymentProvider.DEMO
            
            try:
                payment_type_enum = PaymentType(payment_type)
            except ValueError:
                payment_type_enum = PaymentType.ONE_TIME
            
            success, message, intent = await service.create_payment_intent(
                user_id=tenant.user_id,
                amount=amount,
                currency=data.get('currency', 'CNY'),
                provider=provider_enum,
                payment_type=payment_type_enum,
                description=description,
                metadata=metadata,
                success_url=success_url,
                cancel_url=cancel_url
            )
            
            if success and intent:
                return self._json_response({
                    'success': True,
                    'data': intent.to_dict()
                })
            else:
                return self._json_response({'success': False, 'error': message}, 400)
                
        except Exception as e:
            logger.error(f"Create payment error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_payment_status(self, request):
        """獲取支付狀態"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            intent_id = request.query.get('intent_id')
            if not intent_id:
                return self._json_response({'success': False, 'error': '缺少 intent_id'}, 400)
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            success, state = await service.verify_payment(intent_id)
            intent = await service.get_payment_intent(intent_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'paid': success,
                    'state': state.value,
                    'intent': intent.to_dict() if intent else None
                }
            })
            
        except Exception as e:
            logger.error(f"Get payment status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_payment_history(self, request):
        """獲取支付歷史"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            limit = int(request.query.get('limit', 50))
            
            from core.unified_payment import get_unified_payment_service
            import sqlite3
            
            service = get_unified_payment_service()
            db = sqlite3.connect(service.db_path)
            db.row_factory = sqlite3.Row
            
            rows = db.execute('''
                SELECT * FROM payment_intents 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (tenant.user_id, limit)).fetchall()
            db.close()
            
            payments = []
            for row in rows:
                payments.append({
                    'id': row['id'],
                    'amount': row['amount'],
                    'currency': row['currency'],
                    'provider': row['provider'],
                    'state': row['state'],
                    'description': row['description'],
                    'created_at': row['created_at'],
                    'completed_at': row['completed_at']
                })
            
            return self._json_response({
                'success': True,
                'data': {'payments': payments}
            })
            
        except Exception as e:
            logger.error(f"Get payment history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def paypal_webhook(self, request):
        """PayPal Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.PAYPAL, payload, headers
            )
            
            return self._json_response({'success': success, 'event': event_type})
        except Exception as e:
            logger.error(f"PayPal webhook error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def alipay_webhook(self, request):
        """支付寶 Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.ALIPAY, payload, headers
            )
            
            # 支付寶需要返回特定格式
            if success:
                return self._text_response('success')
            return self._text_response('fail')
        except Exception as e:
            logger.error(f"Alipay webhook error: {e}")
            return self._text_response('fail')
    
    async def wechat_webhook(self, request):
        """微信支付 Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.WECHAT, payload, headers
            )
            
            # 微信需要返回 XML
            if success:
                return self._xml_response('<xml><return_code>SUCCESS</return_code></xml>')
            return self._xml_response('<xml><return_code>FAIL</return_code></xml>')
        except Exception as e:
            logger.error(f"Wechat webhook error: {e}")
            return self._xml_response('<xml><return_code>FAIL</return_code></xml>')
    
    def _text_response(self, text: str):
        """純文本響應"""
        from aiohttp import web
        return web.Response(text=text, content_type='text/plain')
    
    def _xml_response(self, xml: str):
        """XML 響應"""
        from aiohttp import web
        return web.Response(text=xml, content_type='application/xml')
    
    # ==================== 發票 API ====================
    
    async def get_invoices(self, request):
        """獲取用戶發票列表"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            limit = int(request.query.get('limit', 50))
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            invoices = await service.get_user_invoices(tenant.user_id, limit)
            
            return self._json_response({
                'success': True,
                'data': {'invoices': [inv.to_dict() for inv in invoices]}
            })
            
        except Exception as e:
            logger.error(f"Get invoices error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_invoice_detail(self, request):
        """獲取發票詳情"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            invoice_id = request.match_info.get('invoice_id')
            
            from core.unified_payment import get_unified_payment_service
            import sqlite3
            
            service = get_unified_payment_service()
            db = sqlite3.connect(service.db_path)
            db.row_factory = sqlite3.Row
            
            row = db.execute(
                'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
                (invoice_id, tenant.user_id)
            ).fetchone()
            db.close()
            
            if not row:
                return self._json_response({'success': False, 'error': '發票不存在'}, 404)
            
            import json
            invoice_data = dict(row)
            invoice_data['items'] = json.loads(invoice_data['items']) if invoice_data['items'] else []
            
            return self._json_response({
                'success': True,
                'data': invoice_data
            })
            
        except Exception as e:
            logger.error(f"Get invoice detail error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 財務報表 API（管理員）====================
    
    async def admin_financial_summary(self, request):
        """管理員 - 財務摘要"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            if not start_date or not end_date:
                from datetime import datetime, timedelta
                end_date = datetime.utcnow().strftime('%Y-%m-%d')
                start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            summary = await service.get_financial_summary(start_date, end_date)
            
            return self._json_response({
                'success': True,
                'data': summary
            })
            
        except Exception as e:
            logger.error(f"Admin financial summary error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def admin_export_financial(self, request):
        """管理員 - 導出財務報表"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            format_type = request.query.get('format', 'json')
            
            if not start_date or not end_date:
                from datetime import datetime, timedelta
                end_date = datetime.utcnow().strftime('%Y-%m-%d')
                start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            result = await service.export_financial_report(start_date, end_date, format_type)
            
            if format_type == 'csv':
                from aiohttp import web
                return web.Response(
                    text=result['content'],
                    content_type='text/csv',
                    headers={
                        'Content-Disposition': f'attachment; filename="{result["filename"]}"'
                    }
                )
            
            return self._json_response({
                'success': True,
                'data': result['content']
            })
            
        except Exception as e:
            logger.error(f"Admin export financial error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 計費和配額包 API ====================
    
    async def get_quota_packs(self, request):
        """獲取可購買的配額包"""
        try:
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            tenant = request.get('tenant')
            user_tier = tenant.subscription_tier if tenant else 'bronze'
            
            packs = service.get_available_packs(user_tier)
            
            return self._json_response({
                'success': True,
                'data': {
                    'packs': [p.to_dict() for p in packs]
                }
            })
        except Exception as e:
            logger.error(f"Get quota packs error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def purchase_quota_pack(self, request):
        """購買配額包"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            data = await request.json()
            pack_id = data.get('pack_id')
            payment_method = data.get('payment_method', 'balance')
            
            if not pack_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 pack_id'
                }, 400)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            result = service.purchase_pack(tenant.user_id, pack_id, payment_method)
            return self._json_response(result)
            
        except Exception as e:
            logger.error(f"Purchase quota pack error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_my_packages(self, request):
        """獲取我的配額包"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            active_only = request.query.get('active_only', 'true').lower() == 'true'
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            packages = service.get_user_packages(tenant.user_id, active_only)
            
            return self._json_response({
                'success': True,
                'data': {
                    'packages': [p.to_dict() for p in packages]
                }
            })
            
        except Exception as e:
            logger.error(f"Get my packages error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_user_bills(self, request):
        """獲取用戶賬單"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            status = request.query.get('status')
            billing_type = request.query.get('type')
            limit = int(request.query.get('limit', 50))
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            bills = service.get_user_bills(tenant.user_id, status, billing_type, limit)
            
            return self._json_response({
                'success': True,
                'data': {
                    'bills': [b.to_dict() for b in bills]
                }
            })
            
        except Exception as e:
            logger.error(f"Get user bills error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def pay_bill(self, request):
        """支付賬單"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            data = await request.json()
            bill_id = data.get('bill_id')
            payment_method = data.get('payment_method', 'balance')
            
            if not bill_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 bill_id'
                }, 400)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            result = service.pay_bill(bill_id, payment_method)
            return self._json_response(result)
            
        except Exception as e:
            logger.error(f"Pay bill error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_overage_info(self, request):
        """獲取超額使用信息"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            from core.billing_service import get_billing_service, OVERAGE_RATES
            from core.quota_service import get_quota_service
            
            billing = get_billing_service()
            quota_service = get_quota_service()
            
            # 獲取當前配額使用情況
            summary = quota_service.get_usage_summary(tenant.user_id)
            
            overage_info = {}
            for qt, rate in OVERAGE_RATES.items():
                quota_info = summary.quotas.get(qt, {})
                used = quota_info.get('used', 0)
                limit = quota_info.get('limit', 0)
                pack_bonus = billing.get_pack_bonus(tenant.user_id, qt)
                
                calc = billing.calculate_overage(tenant.user_id, qt, used, limit, pack_bonus)
                
                overage_info[qt] = {
                    'used': used,
                    'base_limit': limit,
                    'pack_bonus': pack_bonus,
                    'total_limit': limit + pack_bonus if limit != -1 else -1,
                    'overage': calc.get('overage', 0),
                    'charge': calc.get('charge', 0),
                    'rate': {
                        'unit_price': rate.unit_price,
                        'unit_size': rate.unit_size
                    }
                }
            
            return self._json_response({
                'success': True,
                'data': overage_info
            })
            
        except Exception as e:
            logger.error(f"Get overage info error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_freeze_status(self, request):
        """獲取配額凍結狀態"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            freeze_info = service.is_quota_frozen(tenant.user_id)
            
            return self._json_response({
                'success': True,
                'data': freeze_info
            })
            
        except Exception as e:
            logger.error(f"Get freeze status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 數據導出和備份 ====================
    
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
    
    # ==================== 系統監控 ====================
    
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
    
    async def prometheus_metrics(self, request):
        """Prometheus 指標端點"""
        try:
            from core.monitoring import get_system_monitor
            monitor = get_system_monitor()
            metrics = monitor.get_prometheus_metrics()
            
            return web.Response(
                text=metrics,
                content_type='text/plain; version=0.0.4'
            )
        except Exception as e:
            logger.error(f"Prometheus metrics error: {e}")
            return web.Response(text=f'# Error: {e}', status=500)
    
    # ==================== API 文檔 ====================
    
    async def swagger_ui(self, request):
        """Swagger UI"""
        from api.openapi import SWAGGER_UI_HTML
        return web.Response(text=SWAGGER_UI_HTML, content_type='text/html')
    
    async def redoc_ui(self, request):
        """ReDoc UI"""
        from api.openapi import REDOC_HTML
        return web.Response(text=REDOC_HTML, content_type='text/html')
    
    async def openapi_json(self, request):
        """OpenAPI JSON 規範"""
        from api.openapi import get_openapi_json
        return web.Response(
            text=get_openapi_json(),
            content_type='application/json'
        )
    
    # ==================== 2FA ====================
    
    async def get_2fa_status(self, request):
        """獲取 2FA 狀態"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            config = service.get_config(user_id)
            if config:
                return self._json_response({'success': True, 'data': config.to_dict()})
            return self._json_response({'success': True, 'data': {'enabled': False}})
        except Exception as e:
            logger.error(f"Get 2FA status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def setup_2fa(self, request):
        """開始 2FA 設置"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            email = tenant.email if tenant else ''
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.setup(user_id, email)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Setup 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def enable_2fa(self, request):
        """啟用 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            code = data.get('code', '')
            
            result = await service.enable(user_id, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Enable 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def disable_2fa(self, request):
        """禁用 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            code = data.get('code', '')
            
            result = await service.disable(user_id, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Disable 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def verify_2fa(self, request):
        """驗證 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            data = await request.json()
            user_id = data.get('user_id', '')
            code = data.get('code', '')
            device_fingerprint = data.get('device_fingerprint', '')
            
            result = await service.verify(user_id, code, device_fingerprint)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_trusted_devices(self, request):
        """獲取受信任設備"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            devices = await service.get_trusted_devices(user_id)
            return self._json_response({'success': True, 'data': devices})
        except Exception as e:
            logger.error(f"Get trusted devices error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def remove_trusted_device(self, request):
        """移除受信任設備"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            device_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            success = await service.remove_trusted_device(user_id, device_id)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Remove trusted device error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== API 密鑰 ====================
    
    async def list_api_keys(self, request):
        """列出 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            keys = await service.list_keys(user_id)
            return self._json_response({
                'success': True,
                'data': [k.to_dict() for k in keys]
            })
        except Exception as e:
            logger.error(f"List API keys error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def create_api_key(self, request):
        """創建 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            name = data.get('name', 'Unnamed Key')
            scopes = data.get('scopes', ['read'])
            expires_in_days = data.get('expires_in_days')
            
            result = await service.create(user_id, name, scopes, expires_in_days)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Create API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def delete_api_key(self, request):
        """刪除 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            key_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.delete(user_id, key_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Delete API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def revoke_api_key(self, request):
        """撤銷 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            key_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.revoke(user_id, key_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Revoke API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 管理員 API ====================
    
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
    
    # ==================== 訂閱管理 API ====================
    
    async def get_subscription_details(self, request):
        """獲取訂閱詳情"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            sub = manager.get_user_subscription(tenant.user_id)
            history = manager.get_subscription_history(tenant.user_id, limit=10)
            
            return self._json_response({
                'success': True,
                'data': {
                    'subscription': sub.to_dict() if sub else None,
                    'history': [h.to_dict() for h in history]
                }
            })
        except Exception as e:
            logger.error(f"Get subscription details error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def upgrade_subscription(self, request):
        """升級訂閱"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            to_tier = data.get('tier')
            billing_cycle = data.get('billing_cycle', 'monthly')
            
            if not to_tier:
                return self._json_response({'success': False, 'error': '缺少目標等級'}, 400)
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            result = await manager.upgrade_subscription(tenant.user_id, to_tier, billing_cycle)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Upgrade subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def downgrade_subscription(self, request):
        """降級訂閱"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            to_tier = data.get('tier')
            immediate = data.get('immediate', False)
            
            if not to_tier:
                return self._json_response({'success': False, 'error': '缺少目標等級'}, 400)
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            result = await manager.downgrade_subscription(tenant.user_id, to_tier, immediate)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Downgrade subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def pause_subscription(self, request):
        """暫停訂閱"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            reason = data.get('reason', '')
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            result = await manager.pause_subscription(tenant.user_id, reason)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Pause subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def resume_subscription(self, request):
        """恢復訂閱"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            result = await manager.resume_subscription(tenant.user_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Resume subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_subscription_history(self, request):
        """獲取訂閱歷史"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            limit = int(request.query.get('limit', 50))
            
            from core.subscription_manager import get_subscription_manager
            manager = get_subscription_manager()
            
            history = manager.get_subscription_history(tenant.user_id, limit)
            return self._json_response({
                'success': True,
                'data': [h.to_dict() for h in history]
            })
        except Exception as e:
            logger.error(f"Get subscription history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 優惠券 API ====================
    
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
    
    # ==================== 推薦獎勵 API ====================
    
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
    
    # ==================== 通知 API ====================
    
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
    
    # ==================== 國際化 API ====================
    
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
    
    # ==================== 時區 API ====================
    
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
    
    # ==================== 健康檢查 API ====================
    
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
        """就緒探針"""
        try:
            from core.health_service import get_health_service
            service = get_health_service()
            
            result = await service.readiness_probe()
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
    
    # ==================== 緩存管理 API（管理員）====================
    
    async def admin_cache_stats(self, request):
        """管理員 - 獲取緩存統計"""
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
            logger.error(f"Admin cache stats error: {e}")
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
    
    # ==================== 診斷 API ====================
    
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
    
    async def get_initial_state(self, request):
        """獲取初始狀態"""
        result = await self._execute_command('get-initial-state')
        return self._json_response(result)
    
    # ==================== WebSocket ====================
    
    async def websocket_handler(self, request):
        """WebSocket 處理器 - 實時通訊，支持心跳"""
        ws = web.WebSocketResponse(
            heartbeat=30.0,  # 服務器端心跳間隔
            receive_timeout=60.0  # 接收超時
        )
        await ws.prepare(request)
        
        self.websocket_clients.add(ws)
        client_id = id(ws)
        logger.info(f"WebSocket client {client_id} connected. Total: {len(self.websocket_clients)}")
        
        # 發送連接確認
        await ws.send_json({
            'type': 'connected',
            'event': 'connected',
            'data': {
                'client_id': client_id,
                'timestamp': datetime.now().isoformat()
            }
        })
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        msg_type = data.get('type')
                        
                        # 處理心跳
                        if msg_type == 'ping':
                            await ws.send_json({
                                'type': 'pong',
                                'event': 'pong',
                                'timestamp': datetime.now().isoformat(),
                                'client_timestamp': data.get('timestamp')
                            })
                            continue
                        
                        command = data.get('command')
                        payload = data.get('payload', {})
                        request_id = data.get('request_id')
                        
                        if command:
                            result = await self._execute_command(command, payload)
                            result['request_id'] = request_id
                            await ws.send_json(result)
                        
                    except json.JSONDecodeError as e:
                        logger.warning(f"WebSocket invalid JSON: {e}")
                        await ws.send_json({'success': False, 'error': 'Invalid JSON'})
                    except Exception as e:
                        logger.error(f"WebSocket command error: {e}")
                        await ws.send_json({'success': False, 'error': str(e)})
                        
                elif msg.type == web.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
                elif msg.type == web.WSMsgType.CLOSE:
                    logger.info(f"WebSocket client {client_id} requested close")
                    break
                    
        except asyncio.CancelledError:
            logger.info(f"WebSocket client {client_id} connection cancelled")
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
        finally:
            self.websocket_clients.discard(ws)
            logger.info(f"WebSocket client {client_id} disconnected. Total: {len(self.websocket_clients)}")
        
        return ws
    
    async def broadcast(self, event_type: str, data: dict):
        """廣播事件到所有 WebSocket 客戶端"""
        message = json.dumps({
            'type': 'event',
            'event': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
        for ws in list(self.websocket_clients):
            try:
                await ws.send_str(message)
            except:
                self.websocket_clients.discard(ws)
    
    # ==================== 服務器控制 ====================
    
    async def start(self):
        """啟動服務器"""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        
        logger.info(f"=" * 50)
        logger.info(f"  TG-Matrix HTTP API Server v2.1.1")
        logger.info(f"=" * 50)
        logger.info(f"  Server running on http://{self.host}:{self.port}")
        logger.info(f"  API docs: http://{self.host}:{self.port}/api/v1/")
        logger.info(f"  WebSocket: ws://{self.host}:{self.port}/ws")
        logger.info(f"=" * 50)
        
        return runner


async def create_app(backend_service=None):
    """創建應用（用於生產部署）"""
    server = HttpApiServer(backend_service)
    return server.app


# 獨立運行入口
if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    async def main():
        server = HttpApiServer()
        await server.start()
        
        # 保持運行
        while True:
            await asyncio.sleep(3600)
    
    asyncio.run(main())

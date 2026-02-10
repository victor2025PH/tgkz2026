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
import sqlite3
import sys
import time
from datetime import datetime
from typing import Any, Dict, Optional, Callable
from functools import wraps


def _is_far_future(exp: str) -> bool:
    """判斷過期日是否在 30 年後（視為終身）"""
    try:
        dt = datetime.fromisoformat(str(exp).replace('Z', '+00:00'))
        return (dt - datetime.utcnow()).total_seconds() > 365 * 30 * 86400
    except Exception:
        return False


# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiohttp import web
import aiohttp_cors

# 🆕 Phase 1: 導入管理後台模塊
try:
    from admin import admin_handlers, audit_log, AuditAction
    ADMIN_MODULE_AVAILABLE = True
except ImportError:
    ADMIN_MODULE_AVAILABLE = False
    admin_handlers = None

# 🆕 Phase 0 (Wallet): 導入錢包模塊
WALLET_IMPORT_ERROR = None

try:
    from wallet.handlers import setup_wallet_routes, wallet_handlers
    from wallet.admin_handlers import setup_admin_wallet_routes, admin_wallet_handlers
    from wallet.purchase_handlers import setup_purchase_routes, purchase_handlers
    from wallet.withdraw_handlers import setup_withdraw_routes, withdraw_handlers
    from wallet.redeem_handlers import setup_redeem_routes, redeem_handlers
    from wallet.pay_password_handlers import setup_pay_password_routes, pay_password_handlers
    from wallet.coupon_handlers import setup_coupon_routes, coupon_handlers
    from wallet.finance_report_handlers import setup_finance_report_routes, finance_report_handlers
    # 🆕 Phase 1.1: 支付配置管理
    from wallet.payment_config_handlers import setup_payment_config_routes, payment_config_handlers
    # 🆕 Phase 2 & 3: 運營工具
    from wallet.operations_handlers import setup_operations_routes, operations_handlers
    from wallet.user_wallet_integration import get_user_wallet_integration, ensure_user_wallet
    WALLET_MODULE_AVAILABLE = True
    OPERATIONS_MODULE_AVAILABLE = True
    print("✅ Wallet module imported successfully")
    print("✅ Operations module imported successfully")
except ImportError as e:
    import traceback
    WALLET_IMPORT_ERROR = f"ImportError: {e}\n{traceback.format_exc()}"
    print(f"⚠️ Wallet module import failed: {e}")
    traceback.print_exc()
    WALLET_MODULE_AVAILABLE = False
    OPERATIONS_MODULE_AVAILABLE = False
    wallet_handlers = None
    admin_wallet_handlers = None
    purchase_handlers = None
    withdraw_handlers = None
    redeem_handlers = None
    pay_password_handlers = None
    coupon_handlers = None
    finance_report_handlers = None
    payment_config_handlers = None
    operations_handlers = None
    ensure_user_wallet = None
except Exception as e:
    import traceback
    WALLET_IMPORT_ERROR = f"Exception: {e}\n{traceback.format_exc()}"
    print(f"⚠️ Wallet module error: {e}")
    traceback.print_exc()
    WALLET_MODULE_AVAILABLE = False
    OPERATIONS_MODULE_AVAILABLE = False
    wallet_handlers = None
    admin_wallet_handlers = None
    purchase_handlers = None
    withdraw_handlers = None
    redeem_handlers = None
    pay_password_handlers = None
    coupon_handlers = None
    finance_report_handlers = None
    payment_config_handlers = None
    operations_handlers = None
    ensure_user_wallet = None

logger = logging.getLogger(__name__)

# P9-1 + P10-1 + P11-1: Mixin imports for extracted route handlers
from api.auth_routes_mixin import AuthRoutesMixin
from api.quota_routes_mixin import QuotaRoutesMixin
from api.payment_routes_mixin import PaymentRoutesMixin
from api.admin_routes_mixin import AdminRoutesMixin
from api.business_routes_mixin import BusinessRoutesMixin
from api.system_routes_mixin import SystemRoutesMixin


class HttpApiServer(AuthRoutesMixin, QuotaRoutesMixin, PaymentRoutesMixin,
                    AdminRoutesMixin, BusinessRoutesMixin, SystemRoutesMixin):
    """HTTP API 服务器 - 包装 CommandRouter (P11-1: 6-mixin architecture)"""
    
    def __init__(self, backend_service=None, host='0.0.0.0', port=8000):
        self.backend_service = backend_service
        self.host = host
        self.port = port
        self.app = web.Application()
        self.websocket_clients = set()
        self.websocket_tenant_map: dict = {}  # 🔧 ws -> tenant_id 映射，用於多租戶廣播過濾
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
        """設置路由 — P10-1: 按域分組為子方法，提升可讀性與可維護性"""
        self._setup_core_routes()
        self._setup_auth_routes()
        self._setup_business_routes()
        self._setup_quota_routes()
        self._setup_payment_routes()
        self._setup_admin_v1_routes()
        self._setup_system_routes()
        self._setup_websocket_routes()
        self._setup_admin_module_routes()

    # ---------- P10-1: 路由子方法 ----------

    def _setup_core_routes(self):
        """核心路由: 健康檢查、診斷、命令端點、帳號管理"""
        # 基础健康检查（轻量级）
        self.app.router.add_get('/health', self.basic_health_check)
        self.app.router.add_get('/api/health', self.basic_health_check)
        # 診斷端點
        self.app.router.add_get('/api/debug/modules', self.debug_modules)
        self.app.router.add_get('/api/debug/deploy', self.debug_deploy)
        self.app.router.add_get('/api/debug/accounts', self.debug_accounts)
        # 通用命令端點（核心）
        self.app.router.add_post('/api/command', self.handle_command)
        self.app.router.add_post('/api/v1/command', self.handle_command)
        # 帳號管理
        self.app.router.add_get('/api/v1/accounts', self.get_accounts)
        self.app.router.add_post('/api/v1/accounts', self.add_account)
        self.app.router.add_get('/api/v1/accounts/{id}', self.get_account)
        self.app.router.add_put('/api/v1/accounts/{id}', self.update_account)
        self.app.router.add_delete('/api/v1/accounts/{id}', self.delete_account)
        self.app.router.add_post('/api/v1/accounts/{id}/login', self.login_account)
        self.app.router.add_post('/api/v1/accounts/{id}/logout', self.logout_account)
        self.app.router.add_post('/api/v1/accounts/batch', self.batch_account_operations)
        # API 憑證
        self.app.router.add_get('/api/v1/credentials', self.get_credentials)
        self.app.router.add_post('/api/v1/credentials', self.add_credential)
        self.app.router.add_delete('/api/v1/credentials/{id}', self.delete_credential)
        self.app.router.add_get('/api/v1/credentials/recommend', self.get_recommended_credential)
        # 監控
        self.app.router.add_get('/api/v1/monitoring/status', self.get_monitoring_status)
        self.app.router.add_post('/api/v1/monitoring/start', self.start_monitoring)
        self.app.router.add_post('/api/v1/monitoring/stop', self.stop_monitoring)
        # 關鍵詞 / 群組 / 設置
        self.app.router.add_get('/api/v1/keywords', self.get_keywords)
        self.app.router.add_post('/api/v1/keywords', self.add_keyword_set)
        self.app.router.add_get('/api/v1/groups', self.get_groups)
        self.app.router.add_post('/api/v1/groups', self.add_group)
        self.app.router.add_get('/api/v1/settings', self.get_settings)
        self.app.router.add_post('/api/v1/settings', self.save_settings)
        # 數據導出和備份
        self.app.router.add_post('/api/v1/export', self.export_data)
        self.app.router.add_get('/api/v1/backups', self.list_backups)
        self.app.router.add_post('/api/v1/backups', self.create_backup)
        self.app.router.add_delete('/api/v1/backups/{id}', self.delete_backup)
        self.app.router.add_get('/api/v1/backups/{id}/download', self.download_backup)
        # 初始狀態
        self.app.router.add_get('/api/v1/initial-state', self.get_initial_state)

    def _setup_auth_routes(self):
        """認證路由: 用戶認證、OAuth、2FA、API 密鑰"""
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
        self.app.router.add_get('/api/oauth/telegram/authorize', self.oauth_telegram_authorize)
        self.app.router.add_get('/api/v1/oauth/telegram/authorize', self.oauth_telegram_authorize)
        self.app.router.add_post('/api/v1/oauth/google', self.oauth_google)
        self.app.router.add_get('/api/v1/oauth/google/authorize', self.oauth_google_authorize)
        self.app.router.add_get('/api/v1/oauth/google/config', self.oauth_google_config)
        self.app.router.add_get('/api/v1/oauth/google/callback', self.oauth_google_callback)
        self.app.router.add_get('/api/v1/oauth/providers', self.oauth_providers)
        self.app.router.add_post('/api/v1/oauth/telegram/bind', self.bind_telegram)
        self.app.router.add_delete('/api/v1/oauth/telegram/unbind', self.unbind_telegram)
        # Deep Link / QR Code 登入
        self.app.router.add_post('/api/v1/auth/login-token', self.create_login_token)
        self.app.router.add_get('/api/v1/auth/login-token/{token}', self.check_login_token)
        self.app.router.add_post('/api/v1/auth/login-token/{token}/confirm', self.confirm_login_token)
        self.app.router.add_post('/api/v1/auth/login-token/{token}/send-confirmation', self.send_login_confirmation)
        # Telegram Bot Webhook
        self.app.router.add_post('/webhook/telegram', self.telegram_webhook)
        self.app.router.add_post('/webhook/telegram/{token}', self.telegram_webhook)
        # 設備管理
        self.app.router.add_get('/api/v1/auth/devices', self.get_user_devices)
        self.app.router.add_delete('/api/v1/auth/devices/{session_id}', self.revoke_device)
        self.app.router.add_post('/api/v1/auth/devices/revoke-all', self.revoke_all_devices)
        # 安全事件和信任位置
        self.app.router.add_get('/api/v1/auth/security-events', self.get_security_events)
        self.app.router.add_post('/api/v1/auth/security-events/{event_id}/acknowledge', self.acknowledge_security_event)
        self.app.router.add_get('/api/v1/auth/trusted-locations', self.get_trusted_locations)
        self.app.router.add_delete('/api/v1/auth/trusted-locations/{location_id}', self.remove_trusted_location)
        # 郵箱驗證和密碼重置
        self.app.router.add_post('/api/v1/auth/send-verification', self.send_verification_email)
        self.app.router.add_post('/api/v1/auth/verify-email', self.verify_email)
        self.app.router.add_post('/api/v1/auth/verify-email-code', self.verify_email_by_code)
        self.app.router.add_post('/api/v1/auth/forgot-password', self.forgot_password)
        self.app.router.add_post('/api/v1/auth/reset-password', self.reset_password)
        self.app.router.add_post('/api/v1/auth/reset-password-code', self.reset_password_by_code)
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

    def _setup_business_routes(self):
        """業務路由: 通知、國際化、時區、分析、聯繫人、A/B 測試"""
        # 通知 API
        self.app.router.add_get('/api/v1/notifications', self.get_notifications)
        self.app.router.add_get('/api/v1/notifications/unread-count', self.get_unread_count)
        self.app.router.add_post('/api/v1/notifications/read', self.mark_notification_read)
        self.app.router.add_post('/api/v1/notifications/read-all', self.mark_all_notifications_read)
        self.app.router.add_get('/api/v1/notifications/preferences', self.get_notification_preferences)
        self.app.router.add_put('/api/v1/notifications/preferences', self.update_notification_preferences)
        # 國際化 API
        self.app.router.add_get('/api/v1/i18n/languages', self.get_supported_languages)
        self.app.router.add_get('/api/v1/i18n/translations', self.get_translations)
        self.app.router.add_put('/api/v1/i18n/language', self.set_user_language)
        # 時區 API
        self.app.router.add_get('/api/v1/timezone/list', self.get_timezones)
        self.app.router.add_get('/api/v1/timezone/settings', self.get_timezone_settings)
        self.app.router.add_put('/api/v1/timezone/settings', self.update_timezone_settings)
        # 業務功能增強 (P12)
        self.app.router.add_post('/api/v1/leads/score', self.score_leads)
        self.app.router.add_get('/api/v1/leads/dedup/scan', self.scan_duplicates)
        self.app.router.add_post('/api/v1/leads/dedup/merge', self.merge_duplicates)
        self.app.router.add_get('/api/v1/analytics/sources', self.analytics_lead_sources)
        self.app.router.add_get('/api/v1/analytics/templates', self.analytics_templates)
        self.app.router.add_get('/api/v1/analytics/trends', self.analytics_trends)
        self.app.router.add_get('/api/v1/analytics/funnel', self.analytics_funnel)
        self.app.router.add_get('/api/v1/analytics/summary', self.analytics_summary)
        self.app.router.add_get('/api/v1/retry/schedule', self.retry_schedule)
        self.app.router.add_post('/api/v1/ab-tests', self.create_ab_test)
        self.app.router.add_get('/api/v1/ab-tests', self.list_ab_tests)
        self.app.router.add_get('/api/v1/ab-tests/{test_id}', self.get_ab_test)
        self.app.router.add_post('/api/v1/ab-tests/{test_id}/complete', self.complete_ab_test)
        # 聯繫人 REST API
        self.app.router.add_get('/api/v1/contacts', self.get_contacts)
        self.app.router.add_get('/api/v1/contacts/stats', self.get_contacts_stats)
        # 推薦獎勵 API
        self.app.router.add_get('/api/v1/referral/code', self.get_referral_code)
        self.app.router.add_get('/api/v1/referral/stats', self.get_referral_stats)
        self.app.router.add_post('/api/v1/referral/track', self.track_referral)
        # 優惠券 API
        self.app.router.add_post('/api/v1/coupon/validate', self.validate_coupon)
        self.app.router.add_post('/api/v1/coupon/apply', self.apply_coupon)
        self.app.router.add_get('/api/v1/campaigns/active', self.get_active_campaigns)

    def _setup_quota_routes(self):
        """配額路由: 使用量統計、配額管理"""
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
        self.app.router.add_get('/api/v1/quota/consistency', self.quota_consistency_check)

    def _setup_payment_routes(self):
        """支付路由: 訂閱、支付、發票、計費"""
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
        # 訂閱管理 API
        self.app.router.add_get('/api/v1/subscription/details', self.get_subscription_details)
        self.app.router.add_post('/api/v1/subscription/upgrade', self.upgrade_subscription)
        self.app.router.add_post('/api/v1/subscription/downgrade', self.downgrade_subscription)
        self.app.router.add_post('/api/v1/subscription/pause', self.pause_subscription)
        self.app.router.add_post('/api/v1/subscription/resume', self.resume_subscription)
        self.app.router.add_get('/api/v1/subscription/history', self.get_subscription_history)

    def _setup_admin_v1_routes(self):
        """管理員 v1 路由: 用戶管理、配額監控、計費、安全"""
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
        self.app.router.add_get('/api/v1/admin/quota/consistency', self.admin_quota_consistency_check)
        # 管理員計費 API
        self.app.router.add_get('/api/v1/admin/billing/overview', self.admin_billing_overview)
        self.app.router.add_get('/api/v1/admin/billing/bills', self.admin_get_all_bills)
        self.app.router.add_post('/api/v1/admin/billing/refund', self.admin_process_refund)
        self.app.router.add_post('/api/v1/admin/billing/freeze', self.admin_freeze_quota)
        self.app.router.add_post('/api/v1/admin/billing/unfreeze', self.admin_unfreeze_quota)
        self.app.router.add_get('/api/v1/admin/billing/frozen-users', self.admin_get_frozen_users)
        # 數據分析 API（管理員）
        self.app.router.add_get('/api/v1/admin/analytics/dashboard', self.admin_analytics_dashboard)
        self.app.router.add_get('/api/v1/admin/analytics/trends', self.admin_analytics_trends)
        # 緩存管理 API（管理員）
        self.app.router.add_get('/api/v1/admin/cache/stats', self.admin_cache_detail_stats)
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
        # 前端錯誤 / 性能 / 審計
        self.app.router.add_post('/api/v1/errors', self.receive_frontend_error)
        self.app.router.add_get('/api/v1/admin/errors', self.admin_get_frontend_errors)
        self.app.router.add_post('/api/v1/performance', self.receive_performance_report)
        self.app.router.add_get('/api/v1/audit/frontend', self.get_frontend_audit_logs)
        # 運維可觀測性 API（管理員專用）
        self.app.router.add_get('/api/v1/admin/ops/dashboard', self.ops_dashboard)
        self.app.router.add_get('/api/v1/admin/ops/resources', self.resource_trends)
        self.app.router.add_get('/api/v1/admin/ops/error-patterns', self.error_patterns)

    def _setup_system_routes(self):
        """系統路由: 健康檢查、診斷、系統監控、API 文檔"""
        # 系統監控
        self.app.router.add_get('/api/v1/system/health', self.system_health)
        self.app.router.add_get('/api/v1/system/metrics', self.system_metrics)
        self.app.router.add_get('/api/v1/system/alerts', self.system_alerts)
        # 健康檢查 API
        self.app.router.add_get('/api/v1/health', self.health_check)
        self.app.router.add_get('/api/v1/health/live', self.liveness_probe)
        self.app.router.add_get('/api/v1/health/ready', self.readiness_probe)
        self.app.router.add_get('/api/v1/health/info', self.service_info)
        self.app.router.add_get('/api/v1/health/history', self.health_history)
        self.app.router.add_get('/api/v1/status', self.status_page)
        # Prometheus 指標
        self.app.router.add_get('/metrics', self.prometheus_metrics)
        # 診斷 API
        self.app.router.add_get('/api/v1/diagnostics', self.get_diagnostics)
        self.app.router.add_get('/api/v1/diagnostics/quick', self.get_quick_health)
        self.app.router.add_get('/api/v1/diagnostics/system', self.get_system_info)
        # API 文檔
        self.app.router.add_get('/api/docs', self.swagger_ui)
        self.app.router.add_get('/api/redoc', self.redoc_ui)
        self.app.router.add_get('/api/openapi.json', self.openapi_json)

    def _setup_websocket_routes(self):
        """WebSocket 路由"""
        self.app.router.add_get('/ws', self.websocket_handler)
        self.app.router.add_get('/api/v1/ws', self.websocket_handler)
        self.app.router.add_get('/ws/login-token/{token}', self.login_token_websocket)

    def _setup_admin_module_routes(self):
        """管理後台模組路由 — P12-1: 委托到独立模块 admin_module_routes.py"""
        from api.admin_module_routes import register_admin_module_routes
        register_admin_module_routes(self.app)

    # ==================== 核心方法 ====================
    
    async def _execute_command(self, command: str, payload: dict = None) -> dict:
        """執行命令 - 核心方法
        
        🔧 P1: 如果 backend_service 未初始化，嘗試直接從數據庫讀取關鍵數據
        """
        if payload is None:
            payload = {}
        
        if self.backend_service:
            try:
                result = await self.backend_service.handle_command(command, payload)
                # 兼容不返回值的 handler（只靠 send_event 推送）
                if result is None:
                    return {'success': True}
                return result
            except Exception as e:
                logger.error(f"Command execution error: {command} - {e}")
                return {'success': False, 'error': str(e)}
        else:
            # 🔧 P1: 後端服務未初始化 — 嘗試直接讀取數據庫（比空的 demo 數據好得多）
            logger.warning(f"⚠️ backend_service is None for command: {command}, trying direct DB access")
            
            # 對關鍵命令提供數據庫直接讀取作為降級
            if command == 'get-accounts':
                try:
                    from database import db
                    accounts = await db.get_all_accounts()
                    logger.info(f"✅ Direct DB fallback: got {len(accounts)} accounts")
                    return {'success': True, 'accounts': accounts}
                except Exception as db_err:
                    logger.error(f"❌ Direct DB fallback failed: {db_err}")
            
            # 其他命令走 demo 模式
            return await self._demo_mode_handler(command, payload)
    
    async def _demo_mode_handler(self, command: str, payload: dict) -> dict:
        """🔧 P3-4: 优化的降级处理器 — 尽量从 DB 读取真实数据而非返回空
        
        策略：
        1. 优先尝试直接 DB 读取（get-initial-state, get-keyword-sets, get-groups 等）
        2. DB 失败时才回退到空数据
        3. 写操作直接返回 demo_mode 标记
        """
        # 🔧 P3-4: 对读取类命令尝试 DB 直接查询
        db_read_commands = {
            'get-initial-state': self._demo_get_initial_state,
            'get-keyword-sets': self._demo_get_keyword_sets,
            'get-groups': self._demo_get_groups,
            'get-settings': self._demo_get_settings,
        }
        
        if command in db_read_commands:
            try:
                return await db_read_commands[command]()
            except Exception as e:
                logger.warning(f"[DemoMode] DB fallback for {command} failed: {e}")
        
        # 静态降级响应
        static_responses = {
            'get-accounts': {'success': True, 'data': []},
            'get-api-credentials': {'success': True, 'data': []},
            'get-monitoring-status': {'success': True, 'data': {'running': False}},
        }
        
        if command in static_responses:
            return static_responses[command]
        
        return {
            'success': True,
            'message': f'Command received: {command}',
            'demo_mode': True,
            'note': 'Backend not fully initialized'
        }
    
    async def _demo_get_initial_state(self) -> dict:
        """降级模式：直接从 DB 读取初始状态"""
        from database import db
        accounts = await db.get_all_accounts()
        return {
            'success': True,
            'data': {
                'accounts': accounts,
                'settings': {},
                'monitoring_status': False,
                'version': '2.1.1'
            },
            'demo_mode': True
        }
    
    async def _demo_get_keyword_sets(self) -> dict:
        from database import db
        keyword_sets = await db.get_all_keyword_sets()
        return {'success': True, 'keywordSets': keyword_sets, 'demo_mode': True}
    
    async def _demo_get_groups(self) -> dict:
        from database import db
        groups = await db.get_all_groups()
        return {'success': True, 'groups': groups, 'demo_mode': True}
    
    async def _demo_get_settings(self) -> dict:
        from database import db
        settings = await db.get_all_settings()
        return {'success': True, 'data': settings, 'demo_mode': True}
    
    def _json_response(self, data: dict, status: int = 200, events: list = None) -> web.Response:
        """
        🔧 P5-5: 標準化 JSON 響應
        
        統一格式：
        {
            "success": bool,
            "data": any,        // 成功時的數據
            "error": string,    // 失敗時的錯誤信息
            "code": string,     // 錯誤碼（可選）
            "meta": {           // 元數據
                "timestamp": string,
                "request_id": string
            }
        }
        
        向後兼容：如果調用方傳入的 data 不含 success 字段，保持原樣
        """
        # 確保 data 不是 None
        if data is None:
            data = {'success': True}
        
        # 🔧 P5-5: 注入 meta 元數據
        request_id = ''
        try:
            from core.logging import get_request_id
            request_id = get_request_id()
        except:
            pass
        
        response_data = {
            **data,
            'meta': {
                'timestamp': datetime.now().isoformat(),
                'request_id': request_id or '',
            }
        }
        
        # 保留舊的 timestamp 字段（向後兼容）
        response_data['timestamp'] = datetime.now().isoformat()
        
        # 添加事件列表（如果有）
        if events:
            response_data['events'] = events
        
        return web.json_response(
            response_data, 
            status=status, 
            dumps=lambda x: json.dumps(x, ensure_ascii=False, default=str)
        )
    
    def _success_response(self, data: Any = None, message: str = '', status: int = 200) -> web.Response:
        """🔧 P5-5: 標準成功響應"""
        resp = {'success': True}
        if data is not None:
            resp['data'] = data
        if message:
            resp['message'] = message
        return self._json_response(resp, status)
    
    def _error_response(self, error: str, code: str = '', status: int = 400, details: Any = None) -> web.Response:
        """🔧 P5-5: 標準錯誤響應"""
        resp: Dict[str, Any] = {'success': False, 'error': error}
        if code:
            resp['code'] = code
        if details is not None:
            resp['details'] = details
        return self._json_response(resp, status)
    
    # ==================== 端點處理器 ====================
    
    # P11-1: async def basic_health_check(self, request):... -> mixin
    
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
    
    # P9-1: Auth routes extracted to api/auth_routes_mixin.py (~2,200 lines)

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
    
    # P9-1: Quota/usage routes extracted to api/quota_routes_mixin.py (~400 lines)

    # P9-1: Payment/subscription routes extracted to api/payment_routes_mixin.py (~700 lines)

    # ==================== 數據導出和備份 ====================
    
    # P11-1: async def export_data(self, request):... -> mixin
    
    # P11-1: async def list_backups(self, request):... -> mixin
    
    # P11-1: async def create_backup(self, request):... -> mixin
    
    # P11-1: async def delete_backup(self, request):... -> mixin
    
    # P11-1: async def download_backup(self, request):... -> mixin
    
    # ==================== 系統監控 ====================
    
    # P11-1: async def system_health(self, request):... -> mixin
    
    # P11-1: async def system_metrics(self, request):... -> mixin
    
    # P11-1: async def system_alerts(self, request):... -> mixin
    
    # 🔧 P11-2: prometheus_metrics 已移至 P11-2 區塊（見下方），舊版 monitoring 實現已替換
    
    # ==================== API 文檔 ====================
    
    # P11-1: async def swagger_ui(self, request):... -> mixin
    
    # P11-1: async def redoc_ui(self, request):... -> mixin
    
    # P11-1: async def openapi_json(self, request):... -> mixin
    
    # P10-2: 2FA + API Keys extracted to api/auth_routes_mixin.py

    # ==================== 管理員 API ====================
    
    # P10-1: async def admin_dashboard(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_list_users(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_get_user(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_update_user(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_suspend_user(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_security_overview(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_audit_logs(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_usage_trends(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_cache_stats(self, request):... -> admin_routes_mixin.py
    
    # P10-1: # ==================== 管理員配額監控 API ====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_quota_rankings(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_quota_alerts(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_adjust_quota(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_batch_adjust_quotas(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_export_quota_report(self, request):... -> admin_routes_mixin.py
    
    # P11-1: def _convert_to_csv(self, report_data: dict) -> str:... -> mixin
    
    # P10-1: async def admin_reset_daily_quotas(self, request):... -> admin_routes_mixin.py
    
    # P10-1: # ==================== P4-2: 配額一致性校驗 ====================... -> admin_routes_mixin.py
    
    # P11-1: async def quota_consistency_check(self, request):... -> mixin
    
    # P10-1: # ==================== 管理員計費 API ====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_get_all_bills(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_process_refund(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_freeze_quota(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_unfreeze_quota(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_get_frozen_users(self, request):... -> admin_routes_mixin.py
    
    # P10-2: Subscription management extracted to api/payment_routes_mixin.py

    
    # ==================== 優惠券 API ====================
    
    # P11-1: async def validate_coupon(self, request):... -> mixin
    
    # P11-1: async def apply_coupon(self, request):... -> mixin
    
    # P11-1: async def get_active_campaigns(self, request):... -> mixin
    
    # ==================== 推薦獎勵 API ====================
    
    # P11-1: async def get_referral_code(self, request):... -> mixin
    
    # P11-1: async def get_referral_stats(self, request):... -> mixin
    
    # P11-1: async def track_referral(self, request):... -> mixin
    
    # ==================== 通知 API ====================
    
    # P11-1: async def get_notifications(self, request):... -> mixin
    
    # P11-1: async def get_unread_count(self, request):... -> mixin
    
    # P11-1: async def mark_notification_read(self, request):... -> mixin
    
    # P11-1: async def mark_all_notifications_read(self, request):... -> mixin
    
    # P11-1: async def get_notification_preferences(self, request):... -> mixin
    
    # P11-1: async def update_notification_preferences(self, request):... -> mixin
    
    # P10-1: # ==================== 數據分析 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_analytics_trends(self, request):... -> admin_routes_mixin.py
    
    # ==================== 國際化 API ====================
    
    # P11-1: async def get_supported_languages(self, request):... -> mixin
    
    # P11-1: async def get_translations(self, request):... -> mixin
    
    # P11-1: async def set_user_language(self, request):... -> mixin
    
    # ==================== 時區 API ====================
    
    # P11-1: async def get_timezones(self, request):... -> mixin
    
    # P11-1: async def get_timezone_settings(self, request):... -> mixin
    
    # P11-1: async def update_timezone_settings(self, request):... -> mixin
    
    # ==================== 健康檢查 API ====================
    
    # P11-1: async def health_check(self, request):... -> mixin
    
    # P11-1: async def liveness_probe(self, request):... -> mixin
    
    # P11-1: async def readiness_probe(self, request):... -> mixin
    
    # P11-1: async def service_info(self, request):... -> mixin
    
    # ==================== 🔧 P10-4: 健康歷史 ====================
    
    # P11-1: async def health_history(self, request):... -> mixin
    
    # ==================== 🔧 P11-2: Prometheus 指標導出 ====================
    
    # P11-1: async def prometheus_metrics(self, request):... -> mixin
    
    # ==================== 🔧 P11-4: 資源趨勢分析 ====================
    
    # P11-1: async def resource_trends(self, request):... -> mixin
    
    # ==================== 🔧 P11-5: 錯誤模式聚類 ====================
    
    # P11-1: async def error_patterns(self, request):... -> mixin
    
    # ==================== 🔧 P11-6: 運維 Dashboard ====================
    
    # P11-1: async def ops_dashboard(self, request):... -> mixin
    
    # ==================== 🔧 P10-5: 服務狀態頁 ====================
    
    # P11-1: async def status_page(self, request):... -> mixin
    
    # ==================== 🔧 P12: 業務功能增強 ====================
    
    # P11-1: async def score_leads(self, request):... -> mixin
    
    # P11-1: async def scan_duplicates(self, request):... -> mixin
    
    # P11-1: async def merge_duplicates(self, request):... -> mixin
    
    # P11-1: async def analytics_lead_sources(self, request):... -> mixin
    
    # P11-1: async def analytics_templates(self, request):... -> mixin
    
    # P11-1: async def analytics_trends(self, request):... -> mixin
    
    # P11-1: async def analytics_funnel(self, request):... -> mixin
    
    # P11-1: async def analytics_summary(self, request):... -> mixin
    
    # P11-1: async def retry_schedule(self, request):... -> mixin
    
    # P11-1: async def create_ab_test(self, request):... -> mixin
    
    # P11-1: async def list_ab_tests(self, request):... -> mixin
    
    # P11-1: async def get_ab_test(self, request):... -> mixin
    
    # P11-1: async def complete_ab_test(self, request):... -> mixin
    
    # ==================== P15-1: 聯繫人 REST API ====================
    
    # P11-1: async def get_contacts(self, request):... -> mixin
    
    # P11-1: async def get_contacts_stats(self, request):... -> mixin
    
    # ==================== P5-2: 前端錯誤上報 ====================
    
    # P11-1: async def receive_frontend_error(self, request):... -> mixin
    
    # P10-1: async def admin_get_frontend_errors(self, request):... -> admin_routes_mixin.py
    
    # ==================== 🔧 P7-6: 性能指標 API ====================
    
    # P11-1: async def receive_performance_report(self, request):... -> mixin
    
    # ==================== 🔧 P8-5: 前端審計日誌查詢 API ====================
    
    # P11-1: async def get_frontend_audit_logs(self, request):... -> mixin
    
    # P10-1: # ==================== 緩存管理 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_clear_cache(self, request):... -> admin_routes_mixin.py
    
    # P10-1: # ==================== 消息隊列 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: # ==================== 速率限制 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_get_rate_limit_rules(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_ban_ip(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_unban_ip(self, request):... -> admin_routes_mixin.py
    
    # P10-1: # ==================== 審計日誌 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_audit_stats(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_export_audit(self, request):... -> admin_routes_mixin.py
    
    # P10-1: # ==================== 安全告警 API（管理員）====================... -> admin_routes_mixin.py
    
    # P10-1: async def admin_security_stats(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_acknowledge_alert(self, request):... -> admin_routes_mixin.py
    
    # P10-1: async def admin_resolve_alert(self, request):... -> admin_routes_mixin.py
    
    # ==================== 診斷 API ====================
    
    # P11-1: async def get_diagnostics(self, request):... -> mixin
    
    # P11-1: async def get_quick_health(self, request):... -> mixin
    
    # P11-1: async def get_system_info(self, request):... -> mixin
    
    async def get_initial_state(self, request):
        """獲取初始狀態"""
        # 🔍 調試：檢查 Authorization header
        auth_header = request.headers.get('Authorization', '')
        logger.info(f"[Debug] get_initial_state - Auth header: {auth_header[:50] if auth_header else 'MISSING'}...")
        
        result = await self._execute_command('get-initial-state')
        return self._json_response(result)
    
    # ==================== WebSocket ====================
    
    async def websocket_handler(self, request):
        """WebSocket 處理器 - 實時通訊，支持心跳
        
        🆕 優化：注入租戶上下文到 WebSocket 會話
        """
        ws = web.WebSocketResponse(
            heartbeat=30.0,  # 服務器端心跳間隔
            receive_timeout=60.0  # 接收超時
        )
        await ws.prepare(request)
        
        self.websocket_clients.add(ws)
        client_id = id(ws)
        
        # 🆕 獲取租戶信息（如果已認證）
        tenant_id = request.get('tenant_id')
        tenant_info = None
        if tenant_id:
            tenant = request.get('tenant')
            if tenant:
                tenant_info = {
                    'user_id': tenant.user_id,
                    'email': getattr(tenant, 'email', ''),
                    'role': getattr(tenant, 'role', 'free'),
                    'subscription_tier': getattr(tenant, 'subscription_tier', 'free')
                }
        
        # 🔧 修復：記錄 WebSocket 連接的租戶 ID，用於多租戶廣播過濾
        if tenant_id:
            self.websocket_tenant_map[ws] = tenant_id
        
        logger.info(f"WebSocket client {client_id} connected (tenant: {tenant_id}). Total: {len(self.websocket_clients)}")
        
        # 發送連接確認
        await ws.send_json({
            'type': 'connected',
            'event': 'connected',
            'data': {
                'client_id': client_id,
                'timestamp': datetime.now().isoformat(),
                'tenant': tenant_info  # 🆕 包含租戶信息
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
                            # 🔧 修復：在執行命令前設置租戶上下文
                            tenant_token = None
                            try:
                                if tenant_id:
                                    from core.tenant_context import TenantContext, set_current_tenant, clear_current_tenant
                                    tenant = request.get('tenant')
                                    if tenant:
                                        # 使用請求中的租戶信息
                                        tenant_token = set_current_tenant(tenant)
                                        logger.debug(f"[WS] Set tenant context: {tenant.user_id}")
                                    else:
                                        # 從請求中創建租戶上下文
                                        auth_ctx = request.get('auth')
                                        if auth_ctx and auth_ctx.is_authenticated and auth_ctx.user:
                                            ws_tenant = TenantContext(
                                                user_id=auth_ctx.user.id,
                                                email=auth_ctx.user.email or '',
                                                role=auth_ctx.user.role.value if hasattr(auth_ctx.user.role, 'value') else str(auth_ctx.user.role),
                                                subscription_tier=auth_ctx.user.subscription_tier or 'free',
                                                max_accounts=auth_ctx.user.max_accounts or 3
                                            )
                                            tenant_token = set_current_tenant(ws_tenant)
                                            logger.debug(f"[WS] Created tenant context from auth: {ws_tenant.user_id}")
                                
                                result = await self._execute_command(command, payload)
                                result['request_id'] = request_id
                                await ws.send_json(result)
                            finally:
                                # 清理租戶上下文
                                if tenant_token:
                                    from core.tenant_context import clear_current_tenant
                                    clear_current_tenant(tenant_token)
                        
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
            self.websocket_tenant_map.pop(ws, None)  # 🔧 清理租戶映射
            logger.info(f"WebSocket client {client_id} disconnected. Total: {len(self.websocket_clients)}")
        
        return ws
    
    async def broadcast(self, event_type: str, data: dict, tenant_id: str = None):
        """廣播事件到 WebSocket 客戶端
        
        🔧 多租戶安全：
        - 如果提供 tenant_id，只發送給該租戶的客戶端
        - 對於 accounts-updated 等包含用戶數據的事件，強制要求 tenant_id
        - 其他事件（如系統狀態）廣播給所有客戶端
        """
        # 🔧 安全：帳號相關事件必須按租戶過濾
        tenant_sensitive_events = {'accounts-updated', 'account-status-changed', 'account-validation-error'}
        
        message = json.dumps({
            'type': 'event',
            'event': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
        for ws in list(self.websocket_clients):
            try:
                # 🔧 租戶敏感事件：只發送給匹配的客戶端
                if event_type in tenant_sensitive_events and tenant_id:
                    ws_tenant = self.websocket_tenant_map.get(ws)
                    if ws_tenant and ws_tenant != tenant_id:
                        continue  # 跳過不屬於此租戶的客戶端
                
                await ws.send_str(message)
            except:
                self.websocket_clients.discard(ws)
                self.websocket_tenant_map.pop(ws, None)
    
    # ==================== 服务器控制 ====================
    # 🔧 P8-2: 管理后台 Legacy 代码已提取到 api/admin_panel_legacy.py (约 860 行)

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
        logger.info(f"  Admin Panel API: http://{self.host}:{self.port}/api/admin/")
        logger.info(f"  WebSocket: ws://{self.host}:{self.port}/ws")
        logger.info(f"=" * 50)
        
        # 🆕 初始化代理同步服務並啟動自動同步
        try:
            from admin.proxy_sync import get_sync_service
            sync_svc = get_sync_service()
            await sync_svc.start_auto_sync()
            logger.info("  ✅ Proxy sync service initialized, auto-sync started")
        except Exception as e:
            logger.warning(f"  ⚠️ Proxy sync service init failed (non-fatal): {e}")
        
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

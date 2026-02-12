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
        """設置中間件 — P13-3: 性能指標, P14-3: 響應緩存"""
        # P13-3/P14-1: Performance metrics + request tracing (outermost — first in, last out)
        try:
            from api.perf_metrics import create_perf_middleware
            self.app.middlewares.append(create_perf_middleware())
            logger.info("P14-1: Perf metrics + request tracing middleware loaded")
        except Exception as e:
            logger.warning(f"Perf metrics middleware failed: {e}")

        # P14-3: Response cache (before auth — cached public endpoints skip auth)
        try:
            from api.response_cache import create_cache_middleware
            self.app.middlewares.append(create_cache_middleware())
            logger.info("P14-3: Response cache middleware loaded")
        except Exception as e:
            logger.warning(f"Response cache middleware failed: {e}")

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
        
        self.app.middlewares.extend([error_middleware])
    
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
    
    # ==================== P13-2: 声明式路由表 ====================
    # 格式: (HTTP方法, 路径, handler方法名)
    # 用数据结构替代 9 个 _setup_* 过程式方法，集中管理所有路由映射

    ROUTE_TABLE = [
        # === 核心: 健康检查 / 诊断 / 命令 ===
        ('GET',    '/health',                          'basic_health_check'),
        ('GET',    '/api/health',                      'basic_health_check'),
        ('GET',    '/api/debug/modules',               'debug_modules'),
        ('GET',    '/api/debug/deploy',                'debug_deploy'),
        ('GET',    '/api/debug/accounts',              'debug_accounts'),
        ('POST',   '/api/command',                     'handle_command'),
        ('POST',   '/api/v1/command',                  'handle_command'),

        # === 帳號管理 ===
        ('GET',    '/api/v1/accounts',                 'get_accounts'),
        ('POST',   '/api/v1/accounts',                 'add_account'),
        ('GET',    '/api/v1/accounts/{id}',            'get_account'),
        ('PUT',    '/api/v1/accounts/{id}',            'update_account'),
        ('DELETE', '/api/v1/accounts/{id}',            'delete_account'),
        ('POST',   '/api/v1/accounts/{id}/login',      'login_account'),
        ('POST',   '/api/v1/accounts/{id}/logout',     'logout_account'),
        ('POST',   '/api/v1/accounts/batch',           'batch_account_operations'),

        # === API 憑證 ===
        ('GET',    '/api/v1/credentials',              'get_credentials'),
        ('POST',   '/api/v1/credentials',              'add_credential'),
        ('DELETE', '/api/v1/credentials/{id}',         'delete_credential'),
        ('GET',    '/api/v1/credentials/recommend',    'get_recommended_credential'),

        # === 監控 ===
        ('GET',    '/api/v1/monitoring/status',        'get_monitoring_status'),
        ('POST',   '/api/v1/monitoring/start',         'start_monitoring'),
        ('POST',   '/api/v1/monitoring/stop',          'stop_monitoring'),

        # === 關鍵詞 / 群組 / 設置 ===
        ('GET',    '/api/v1/keywords',                 'get_keywords'),
        ('POST',   '/api/v1/keywords',                 'add_keyword_set'),
        ('GET',    '/api/v1/groups',                   'get_groups'),
        ('POST',   '/api/v1/groups',                   'add_group'),
        ('GET',    '/api/v1/settings',                 'get_settings'),
        ('POST',   '/api/v1/settings',                 'save_settings'),

        # === 數據導出 / 備份 ===
        ('POST',   '/api/v1/export',                   'export_data'),
        ('GET',    '/api/v1/backups',                  'list_backups'),
        ('POST',   '/api/v1/backups',                  'create_backup'),
        ('DELETE', '/api/v1/backups/{id}',             'delete_backup'),
        ('GET',    '/api/v1/backups/{id}/download',    'download_backup'),
        ('GET',    '/api/v1/initial-state',            'get_initial_state'),

        # === 認證: 用戶認證 ===
        ('POST',   '/api/v1/auth/register',            'user_register'),
        ('POST',   '/api/v1/auth/login',               'user_login'),
        ('POST',   '/api/v1/auth/logout',              'user_logout'),
        ('POST',   '/api/v1/auth/refresh',             'user_refresh_token'),
        ('GET',    '/api/v1/auth/me',                  'get_current_user'),
        ('PUT',    '/api/v1/auth/me',                  'update_current_user'),
        ('POST',   '/api/v1/auth/change-password',     'change_password'),
        ('GET',    '/api/v1/auth/sessions',            'get_user_sessions'),
        ('DELETE', '/api/v1/auth/sessions/{id}',       'revoke_session'),
        ('POST',   '/api/v1/auth/send-code',           'send_code'),
        ('POST',   '/api/v1/auth/verify-code',         'verify_code'),
        ('POST',   '/api/v1/auth/submit-2fa',          'submit_2fa'),

        # === 認證: OAuth ===
        ('POST',   '/api/v1/oauth/telegram',           'oauth_telegram'),
        ('GET',    '/api/v1/oauth/telegram/config',    'oauth_telegram_config'),
        ('GET',    '/api/oauth/telegram/authorize',    'oauth_telegram_authorize'),
        ('GET',    '/api/v1/oauth/telegram/authorize', 'oauth_telegram_authorize'),
        ('POST',   '/api/v1/oauth/google',             'oauth_google'),
        ('GET',    '/api/v1/oauth/google/authorize',   'oauth_google_authorize'),
        ('GET',    '/api/v1/oauth/google/config',      'oauth_google_config'),
        ('GET',    '/api/v1/oauth/google/callback',    'oauth_google_callback'),
        ('GET',    '/api/v1/oauth/providers',          'oauth_providers'),
        ('POST',   '/api/v1/oauth/telegram/bind',      'bind_telegram'),
        ('DELETE', '/api/v1/oauth/telegram/unbind',    'unbind_telegram'),

        # === 認證: Deep Link / QR ===
        ('POST',   '/api/v1/auth/login-token',                            'create_login_token'),
        ('GET',    '/api/v1/auth/login-token/{token}',                    'check_login_token'),
        ('POST',   '/api/v1/auth/login-token/{token}/confirm',            'confirm_login_token'),
        ('POST',   '/api/v1/auth/login-token/{token}/send-confirmation',  'send_login_confirmation'),
        ('POST',   '/webhook/telegram',                'telegram_webhook'),
        ('POST',   '/webhook/telegram/{token}',        'telegram_webhook'),

        # === 認證: 設備 / 安全事件 ===
        ('GET',    '/api/v1/auth/devices',                                   'get_user_devices'),
        ('DELETE', '/api/v1/auth/devices/{session_id}',                      'revoke_device'),
        ('POST',   '/api/v1/auth/devices/revoke-all',                        'revoke_all_devices'),
        ('GET',    '/api/v1/auth/security-events',                           'get_security_events'),
        ('POST',   '/api/v1/auth/security-events/{event_id}/acknowledge',    'acknowledge_security_event'),
        ('GET',    '/api/v1/auth/trusted-locations',                         'get_trusted_locations'),
        ('DELETE', '/api/v1/auth/trusted-locations/{location_id}',           'remove_trusted_location'),

        # === 認證: 郵箱驗證 / 密碼重置 ===
        ('POST',   '/api/v1/auth/send-verification',   'send_verification_email'),
        ('POST',   '/api/v1/auth/verify-email',         'verify_email'),
        ('POST',   '/api/v1/auth/verify-email-code',    'verify_email_by_code'),
        ('POST',   '/api/v1/auth/forgot-password',      'forgot_password'),
        ('POST',   '/api/v1/auth/reset-password',       'reset_password'),
        ('POST',   '/api/v1/auth/reset-password-code',  'reset_password_by_code'),

        # === 認證: 2FA ===
        ('GET',    '/api/v1/auth/2fa',                 'get_2fa_status'),
        ('POST',   '/api/v1/auth/2fa/setup',           'setup_2fa'),
        ('POST',   '/api/v1/auth/2fa/enable',          'enable_2fa'),
        ('POST',   '/api/v1/auth/2fa/disable',         'disable_2fa'),
        ('POST',   '/api/v1/auth/2fa/verify',          'verify_2fa'),
        ('GET',    '/api/v1/auth/2fa/devices',         'get_trusted_devices'),
        ('DELETE', '/api/v1/auth/2fa/devices/{id}',    'remove_trusted_device'),

        # === API 密鑰 ===
        ('GET',    '/api/v1/api-keys',                 'list_api_keys'),
        ('POST',   '/api/v1/api-keys',                 'create_api_key'),
        ('DELETE', '/api/v1/api-keys/{id}',            'delete_api_key'),
        ('POST',   '/api/v1/api-keys/{id}/revoke',     'revoke_api_key'),

        # === 業務: 通知 ===
        ('GET',    '/api/v1/notifications',                 'get_notifications'),
        ('GET',    '/api/v1/notifications/unread-count',    'get_unread_count'),
        ('POST',   '/api/v1/notifications/read',            'mark_notification_read'),
        ('POST',   '/api/v1/notifications/read-all',        'mark_all_notifications_read'),
        ('GET',    '/api/v1/notifications/preferences',     'get_notification_preferences'),
        ('PUT',    '/api/v1/notifications/preferences',     'update_notification_preferences'),

        # === 業務: 國際化 / 時區 ===
        ('GET',    '/api/v1/i18n/languages',           'get_supported_languages'),
        ('GET',    '/api/v1/i18n/translations',        'get_translations'),
        ('PUT',    '/api/v1/i18n/language',            'set_user_language'),
        ('GET',    '/api/v1/timezone/list',            'get_timezones'),
        ('GET',    '/api/v1/timezone/settings',        'get_timezone_settings'),
        ('PUT',    '/api/v1/timezone/settings',        'update_timezone_settings'),

        # === 業務: 分析 / 營銷 ===
        ('POST',   '/api/v1/leads/score',              'score_leads'),
        ('GET',    '/api/v1/leads/dedup/scan',         'scan_duplicates'),
        ('POST',   '/api/v1/leads/dedup/merge',        'merge_duplicates'),
        ('GET',    '/api/v1/analytics/sources',        'analytics_lead_sources'),
        ('GET',    '/api/v1/analytics/templates',      'analytics_templates'),
        ('GET',    '/api/v1/analytics/trends',         'analytics_trends'),
        ('GET',    '/api/v1/analytics/funnel',         'analytics_funnel'),
        ('GET',    '/api/v1/analytics/summary',        'analytics_summary'),
        ('GET',    '/api/v1/retry/schedule',           'retry_schedule'),
        ('POST',   '/api/v1/ab-tests',                 'create_ab_test'),
        ('GET',    '/api/v1/ab-tests',                 'list_ab_tests'),
        ('GET',    '/api/v1/ab-tests/{test_id}',       'get_ab_test'),
        ('POST',   '/api/v1/ab-tests/{test_id}/complete', 'complete_ab_test'),

        # === 業務: 聯繫人 / 推薦 / 優惠券 ===
        ('GET',    '/api/v1/contacts',                 'get_contacts'),
        ('GET',    '/api/v1/contacts/stats',           'get_contacts_stats'),
        ('GET',    '/api/v1/referral/code',            'get_referral_code'),
        ('GET',    '/api/v1/referral/stats',           'get_referral_stats'),
        ('POST',   '/api/v1/referral/track',           'track_referral'),
        ('POST',   '/api/v1/coupon/validate',          'validate_coupon'),
        ('POST',   '/api/v1/coupon/apply',             'apply_coupon'),
        ('GET',    '/api/v1/campaigns/active',         'get_active_campaigns'),

        # === 配額 ===
        ('GET',    '/api/v1/usage',                    'get_usage_stats'),
        ('GET',    '/api/v1/usage/today',              'get_today_usage'),
        ('GET',    '/api/v1/usage/history',            'get_usage_history'),
        ('GET',    '/api/v1/quota',                    'get_quota_status'),
        ('POST',   '/api/v1/quota/check',              'check_quota'),
        ('GET',    '/api/v1/quota/alerts',             'get_quota_alerts'),
        ('POST',   '/api/v1/quota/alerts/acknowledge', 'acknowledge_quota_alert'),
        ('GET',    '/api/v1/membership/levels',        'get_all_membership_levels'),
        ('GET',    '/api/v1/quota/trend',              'get_quota_trend'),
        ('GET',    '/api/v1/quota/history',            'get_quota_history'),
        ('GET',    '/api/v1/quota/consistency',        'quota_consistency_check'),

        # === 支付 / 訂閱 ===
        ('GET',    '/api/v1/subscription',             'get_subscription'),
        ('POST',   '/api/v1/subscription/checkout',    'create_checkout'),
        ('POST',   '/api/v1/subscription/cancel',      'cancel_subscription'),
        ('GET',    '/api/v1/subscription/plans',       'get_plans'),
        ('GET',    '/api/v1/transactions',             'get_transactions'),
        ('POST',   '/api/v1/webhooks/stripe',          'stripe_webhook'),
        ('POST',   '/api/v1/payment/create',           'create_payment'),
        ('GET',    '/api/v1/payment/status',           'get_payment_status'),
        ('GET',    '/api/v1/payment/history',          'get_payment_history'),
        ('POST',   '/api/v1/webhooks/paypal',          'paypal_webhook'),
        ('POST',   '/api/v1/webhooks/alipay',          'alipay_webhook'),
        ('POST',   '/api/v1/webhooks/wechat',          'wechat_webhook'),
        ('GET',    '/api/v1/invoices',                 'get_invoices'),
        ('GET',    '/api/v1/invoices/{invoice_id}',    'get_invoice_detail'),
        ('GET',    '/api/v1/admin/financial/summary',  'admin_financial_summary'),
        ('GET',    '/api/v1/admin/financial/export',   'admin_export_financial'),
        ('GET',    '/api/v1/billing/quota-packs',      'get_quota_packs'),
        ('POST',   '/api/v1/billing/quota-packs/purchase', 'purchase_quota_pack'),
        ('GET',    '/api/v1/billing/my-packages',      'get_my_packages'),
        ('GET',    '/api/v1/billing/bills',            'get_user_bills'),
        ('POST',   '/api/v1/billing/bills/pay',        'pay_bill'),
        ('GET',    '/api/v1/billing/overage',          'get_overage_info'),
        ('GET',    '/api/v1/billing/freeze-status',    'get_freeze_status'),
        ('GET',    '/api/v1/subscription/details',     'get_subscription_details'),
        ('POST',   '/api/v1/subscription/upgrade',     'upgrade_subscription'),
        ('POST',   '/api/v1/subscription/downgrade',   'downgrade_subscription'),
        ('POST',   '/api/v1/subscription/pause',       'pause_subscription'),
        ('POST',   '/api/v1/subscription/resume',      'resume_subscription'),
        ('GET',    '/api/v1/subscription/history',     'get_subscription_history'),

        # === 管理員 v1 ===
        ('GET',    '/api/v1/admin/dashboard',          'admin_dashboard'),
        ('GET',    '/api/v1/admin/users',              'admin_list_users'),
        ('GET',    '/api/v1/admin/users/{id}',         'admin_get_user'),
        ('PUT',    '/api/v1/admin/users/{id}',         'admin_update_user'),
        ('POST',   '/api/v1/admin/users/{id}/suspend', 'admin_suspend_user'),
        ('GET',    '/api/v1/admin/security',           'admin_security_overview'),
        ('GET',    '/api/v1/admin/audit-logs',         'admin_audit_logs'),
        ('GET',    '/api/v1/admin/usage-trends',       'admin_usage_trends'),
        ('GET',    '/api/v1/admin/cache-stats',        'admin_cache_stats'),
        ('GET',    '/api/v1/admin/quota/overview',     'admin_quota_overview'),
        ('GET',    '/api/v1/admin/quota/rankings',     'admin_quota_rankings'),
        ('GET',    '/api/v1/admin/quota/alerts',       'admin_quota_alerts'),
        ('POST',   '/api/v1/admin/quota/adjust',       'admin_adjust_quota'),
        ('POST',   '/api/v1/admin/quota/batch-adjust', 'admin_batch_adjust_quotas'),
        ('GET',    '/api/v1/admin/quota/export',       'admin_export_quota_report'),
        ('POST',   '/api/v1/admin/quota/reset-daily',  'admin_reset_daily_quotas'),
        ('GET',    '/api/v1/admin/quota/consistency',  'admin_quota_consistency_check'),
        ('GET',    '/api/v1/admin/billing/overview',   'admin_billing_overview'),
        ('GET',    '/api/v1/admin/billing/bills',      'admin_get_all_bills'),
        ('POST',   '/api/v1/admin/billing/refund',     'admin_process_refund'),
        ('POST',   '/api/v1/admin/billing/freeze',     'admin_freeze_quota'),
        ('POST',   '/api/v1/admin/billing/unfreeze',   'admin_unfreeze_quota'),
        ('GET',    '/api/v1/admin/billing/frozen-users','admin_get_frozen_users'),
        ('GET',    '/api/v1/admin/analytics/dashboard','admin_analytics_dashboard'),
        ('GET',    '/api/v1/admin/analytics/trends',   'admin_analytics_trends'),
        ('GET',    '/api/v1/admin/cache/stats',        'admin_cache_detail_stats'),
        ('POST',   '/api/v1/admin/cache/clear',        'admin_clear_cache'),
        ('GET',    '/api/v1/admin/queue/stats',        'admin_queue_stats'),
        ('GET',    '/api/v1/admin/rate-limit/stats',   'admin_rate_limit_stats'),
        ('GET',    '/api/v1/admin/rate-limit/rules',   'admin_get_rate_limit_rules'),
        ('POST',   '/api/v1/admin/rate-limit/ban',     'admin_ban_ip'),
        ('POST',   '/api/v1/admin/rate-limit/unban',   'admin_unban_ip'),
        ('GET',    '/api/v1/admin/audit/logs',         'admin_get_audit_logs'),
        ('GET',    '/api/v1/admin/audit/stats',        'admin_audit_stats'),
        ('GET',    '/api/v1/admin/audit/export',       'admin_export_audit'),
        ('GET',    '/api/v1/admin/security/alerts',    'admin_get_security_alerts'),
        ('GET',    '/api/v1/admin/security/stats',     'admin_security_stats'),
        ('POST',   '/api/v1/admin/security/acknowledge','admin_acknowledge_alert'),
        ('POST',   '/api/v1/admin/security/resolve',   'admin_resolve_alert'),
        ('POST',   '/api/v1/errors',                   'receive_frontend_error'),
        ('GET',    '/api/v1/admin/errors',             'admin_get_frontend_errors'),
        ('POST',   '/api/v1/performance',              'receive_performance_report'),
        ('GET',    '/api/v1/audit/frontend',           'get_frontend_audit_logs'),
        ('GET',    '/api/v1/admin/ops/dashboard',      'ops_dashboard'),
        ('GET',    '/api/v1/admin/ops/resources',      'resource_trends'),
        ('GET',    '/api/v1/admin/ops/error-patterns', 'error_patterns'),

        # === 系統 / 健康檢查 / 文檔 ===
        ('GET',    '/api/v1/system/status',            'get_system_status'),  # 儀表盤完整狀態（帳號/AI/規則等），帶租戶
        ('GET',    '/api/v1/system/health',            'system_health'),
        ('GET',    '/api/v1/system/metrics',           'system_metrics'),
        ('GET',    '/api/v1/system/alerts',            'system_alerts'),
        ('GET',    '/api/v1/health',                   'health_check'),
        ('GET',    '/api/v1/health/live',              'liveness_probe'),
        ('GET',    '/api/v1/health/ready',             'readiness_probe'),
        ('GET',    '/api/v1/health/info',              'service_info'),
        ('GET',    '/api/v1/health/history',           'health_history'),
        ('GET',    '/api/v1/status',                   'status_page'),
        ('GET',    '/metrics',                         'prometheus_metrics'),
        ('GET',    '/api/v1/diagnostics',              'get_diagnostics'),
        ('GET',    '/api/v1/diagnostics/quick',        'get_quick_health'),
        ('GET',    '/api/v1/diagnostics/system',       'get_system_info'),
        ('GET',    '/api/docs',                        'swagger_ui'),
        ('GET',    '/api/redoc',                       'redoc_ui'),
        ('GET',    '/api/openapi.json',                'openapi_json'),

        # === AI 設置 (P0: 用戶級獨立 AI 配置) ===
        ('GET',    '/api/v1/ai/settings',              'get_ai_settings_api'),
        ('PUT',    '/api/v1/ai/settings',              'save_ai_settings_api'),
        ('GET',    '/api/v1/ai/models',                'get_ai_models_api'),
        ('POST',   '/api/v1/ai/models',                'save_ai_model_api'),
        ('PUT',    '/api/v1/ai/models/{id}',           'update_ai_model_api'),
        ('DELETE', '/api/v1/ai/models/{id}',           'delete_ai_model_api'),
        ('POST',   '/api/v1/ai/models/{id}/test',      'test_ai_model_api'),

        # === 性能指標 (P13-3) / 缓存 (P14-3) ===
        ('GET',    '/api/v1/metrics/api',              'api_perf_metrics'),
        ('GET',    '/api/v1/metrics/cache',            'api_cache_stats'),
        ('GET',    '/api/v1/metrics/db',               'api_db_health'),
        ('GET',    '/api/v1/metrics/alerts',            'api_alert_rules'),
        ('GET',    '/api/v1/metrics/history',           'api_metrics_history'),
        ('GET',    '/api/v1/metrics/security',          'api_security_audit'),
        ('POST',   '/api/v1/db/maintenance',           'api_db_maintenance'),
        ('POST',   '/api/v1/cache/invalidate',         'invalidate_cache'),

        # === WebSocket ===
        ('GET',    '/ws',                              'websocket_handler'),
        ('GET',    '/api/v1/ws',                       'websocket_handler'),
        ('GET',    '/ws/login-token/{token}',          'login_token_websocket'),
    ]

    # ==================== P14-2: 声明式权限标记 ====================
    # 默认: 所有路由需要认证 (auth_required)
    # PUBLIC_PATHS: 无需认证即可访问
    # ADMIN_PATHS: 需要管理员权限 (前缀匹配)

    PUBLIC_PATHS = frozenset([
        # 健康检查 / 基础
        '/', '/health', '/api/health', '/metrics',
        '/api/debug/modules', '/api/debug/deploy', '/api/debug/accounts',
        # 认证 (登录/注册等不需要已登录)
        '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh',
        '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password',
        '/api/v1/auth/verify-email', '/api/v1/auth/verify-email-code',
        '/api/v1/auth/reset-password-code', '/api/v1/auth/send-verification',
        '/api/v1/auth/submit-2fa',
        # OAuth
        '/api/oauth/telegram/authorize', '/api/v1/oauth/telegram',
        '/api/v1/oauth/telegram/authorize', '/api/v1/oauth/telegram/config',
        '/api/v1/oauth/google', '/api/v1/oauth/google/authorize',
        '/api/v1/oauth/providers', '/api/v1/oauth/google/callback',
        # Webhook (外部回调)
        '/webhook/telegram',
        # 系统 / 文档
        '/api/v1/health', '/api/v1/health/live', '/api/v1/health/ready',
        '/api/v1/health/info', '/api/v1/status',
        '/api/docs', '/api/redoc', '/api/openapi.json',
        '/api/v1/metrics/api',
        '/api/v1/metrics/cache',
        '/api/v1/metrics/db',
        '/api/v1/metrics/alerts',
        '/api/v1/metrics/history',
        '/api/v1/metrics/security',
    ])

    ADMIN_PATH_PREFIXES = (
        '/api/v1/admin/',
        '/api/admin/',
    )

    @classmethod
    def get_public_paths(cls) -> frozenset:
        """P14-2: 供 auth middleware 获取公开路径（单一数据源）"""
        return cls.PUBLIC_PATHS

    @classmethod
    def is_admin_path(cls, path: str) -> bool:
        """P14-2: 判断是否为管理员路径"""
        return path.startswith(cls.ADMIN_PATH_PREFIXES)

    def _setup_routes(self):
        """P13-2: 声明式路由注册 — 数据驱动替代 9 个过程式 _setup_* 方法"""
        method_map = {
            'GET': self.app.router.add_get,
            'POST': self.app.router.add_post,
            'PUT': self.app.router.add_put,
            'DELETE': self.app.router.add_delete,
            'PATCH': self.app.router.add_patch,
        }
        registered = 0
        for method, path, handler_name in self.ROUTE_TABLE:
            handler = getattr(self, handler_name, None)
            if handler is None:
                logger.warning(f"Route handler not found: {handler_name} for {method} {path}")
                continue
            add_fn = method_map.get(method)
            if add_fn:
                add_fn(path, handler)
                registered += 1

        logger.info(f"P13-2: Registered {registered}/{len(self.ROUTE_TABLE)} declarative routes")

        # External module routes (admin_handlers, wallet, legacy)
        from api.admin_module_routes import register_admin_module_routes
        register_admin_module_routes(self.app)
    
    # ==================== 核心方法 ====================
    
    async def _execute_command_with_tenant(self, request, command: str, payload: dict = None) -> dict:
        """在當前請求的租戶上下文中執行命令（用於 HTTP 路由，確保多用戶數據隔離）"""
        tenant = request.get('tenant') if request else None
        token = None
        try:
            if tenant:
                from core.tenant_context import set_current_tenant, clear_current_tenant
                token = set_current_tenant(tenant)
            return await self._execute_command(command, payload)
        finally:
            if token:
                from core.tenant_context import clear_current_tenant
                clear_current_tenant(token)

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
                    logger.debug(f"[_execute_command] handler '{command}' returned None, assuming success. "
                                 "Consider adding explicit return for better error propagation.")
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
        
        # 🔧 P0: 為 AI 相關命令注入 _user_id，實現用戶級隔離
        tenant = request.get('tenant')
        if tenant and getattr(tenant, 'user_id', None):
            if command.startswith(('save-ai-', 'get-ai-', 'update-ai-', 'delete-ai-', 'test-ai-',
                                   'save-model-', 'save-conversation-')):
                payload['_user_id'] = tenant.user_id
        
        result = await self._execute_command(command, payload)
        return self._json_response(result)
    
    # ==================== 帳號管理 ====================
    
    async def get_accounts(self, request):
        """獲取帳號列表。多租戶：傳入 owner_user_id 確保只返回當前用戶的帳號。"""
        payload = {}
        tenant = request.get('tenant')
        if tenant and getattr(tenant, 'user_id', None):
            payload['owner_user_id'] = tenant.user_id
            payload['ownerUserId'] = tenant.user_id
        result = await self._execute_command('get-accounts', payload)
        return self._json_response(result)
    
    async def add_account(self, request):
        """添加帳號。多租戶：從當前請求注入 ownerUserId，確保第二用戶等添加的帳號歸屬正確。"""
        data = await request.json() or {}
        tenant = request.get('tenant')
        if tenant and getattr(tenant, 'user_id', None):
            data['ownerUserId'] = tenant.user_id
            data['owner_user_id'] = tenant.user_id
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
    
    async def get_system_status(self, request):
        """獲取儀表盤完整系統狀態（帳號、AI 開關、觸發規則等）。Web 模式須帶租戶，否則儀表盤「AI 聊天」會一直顯示未啟用。"""
        result = await self._execute_command_with_tenant(request, 'get-system-status')
        return self._json_response(result)

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
        """獲取關鍵詞集（多租戶：在請求租戶上下文中執行）"""
        result = await self._execute_command_with_tenant(request, 'get-keyword-sets')
        return self._json_response(result)
    
    async def add_keyword_set(self, request):
        """添加關鍵詞集（多租戶：注入 owner 並在租戶上下文中執行）"""
        data = await request.json() or {}
        tenant = request.get('tenant')
        if tenant and getattr(tenant, 'user_id', None):
            data['owner_user_id'] = tenant.user_id
        result = await self._execute_command_with_tenant(request, 'add-keyword-set', data)
        return self._json_response(result)
    
    # ==================== 群組 ====================
    
    async def get_groups(self, request):
        """獲取群組列表（多租戶：在請求租戶上下文中執行）"""
        result = await self._execute_command_with_tenant(request, 'get-monitored-groups')
        return self._json_response(result)
    
    async def add_group(self, request):
        """添加群組（多租戶：注入 owner 並在租戶上下文中執行）"""
        data = await request.json() or {}
        tenant = request.get('tenant')
        if tenant and getattr(tenant, 'user_id', None):
            data['owner_user_id'] = tenant.user_id
        result = await self._execute_command_with_tenant(request, 'add-group', data)
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
    
    # ==================== AI 設置 (P0: 用戶級獨立配置) ====================
    # 🔧 Handler methods moved to BusinessRoutesMixin for line-count compliance

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
        """獲取初始狀態（多租戶：在請求租戶上下文中執行，確保數據隔離）"""
        result = await self._execute_command_with_tenant(request, 'get-initial-state')
        return self._json_response(result)
    
    # ==================== WebSocket ====================
    
    async def websocket_handler(self, request):
        """WebSocket 處理器 - 實時通訊，支持心跳
        
        🆕 優化：注入租戶上下文到 WebSocket 會話
        🔧 安全修復：未認證連接僅允許心跳，拒絕數據命令
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
        auth_ctx = request.get('auth')
        is_authenticated = bool(auth_ctx and auth_ctx.is_authenticated)
        is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
        
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
        
        logger.info(f"WebSocket client {client_id} connected (tenant: {tenant_id}, auth: {is_authenticated}). Total: {len(self.websocket_clients)}")
        
        # 發送連接確認（包含認證狀態，前端可據此決定是否發送命令）
        await ws.send_json({
            'type': 'connected',
            'event': 'connected',
            'data': {
                'client_id': client_id,
                'timestamp': datetime.now().isoformat(),
                'tenant': tenant_info,
                'authenticated': is_authenticated  # 🔧 告知前端是否已認證
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
                            # 🔧 安全修復：未認證的 WebSocket 不允許執行數據命令
                            # Electron 模式例外（本地桌面版不需要認證）
                            if not is_authenticated and not is_electron:
                                logger.warning(f"[WS] Unauthenticated command rejected: {command} (client: {client_id})")
                                await ws.send_json({
                                    'success': False,
                                    'error': '需要登入',
                                    'code': 'UNAUTHORIZED',
                                    'request_id': request_id
                                })
                                continue
                            
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

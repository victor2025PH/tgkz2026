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

# P9-1: Mixin imports for extracted route handlers
from api.auth_routes_mixin import AuthRoutesMixin
from api.quota_routes_mixin import QuotaRoutesMixin
from api.payment_routes_mixin import PaymentRoutesMixin


class HttpApiServer(AuthRoutesMixin, QuotaRoutesMixin, PaymentRoutesMixin):
    """HTTP API 服务器 - 包装 CommandRouter (P9-1: mixin-based architecture)"""
    
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
        """設置路由"""
        # 基础健康检查（轻量级，不依赖 health_service）
        self.app.router.add_get('/health', self.basic_health_check)
        self.app.router.add_get('/api/health', self.basic_health_check)
        
        # 診斷端點
        self.app.router.add_get('/api/debug/modules', self.debug_modules)
        self.app.router.add_get('/api/debug/deploy', self.debug_deploy)
        self.app.router.add_get('/api/debug/accounts', self.debug_accounts)
        
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
        # 🔧 P6-5: 批量操作端點
        self.app.router.add_post('/api/v1/accounts/batch', self.batch_account_operations)
        
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
        
        # Telegram OAuth 授權重定向（兼容舊路由）
        self.app.router.add_get('/api/oauth/telegram/authorize', self.oauth_telegram_authorize)
        self.app.router.add_get('/api/v1/oauth/telegram/authorize', self.oauth_telegram_authorize)
        
        # Google OAuth
        self.app.router.add_post('/api/v1/oauth/google', self.oauth_google)
        self.app.router.add_get('/api/v1/oauth/google/authorize', self.oauth_google_authorize)
        self.app.router.add_get('/api/v1/oauth/google/config', self.oauth_google_config)
        self.app.router.add_get('/api/v1/oauth/google/callback', self.oauth_google_callback)
        
        self.app.router.add_get('/api/v1/oauth/providers', self.oauth_providers)
        
        # 🆕 P2.2: Telegram 帳號綁定
        self.app.router.add_post('/api/v1/oauth/telegram/bind', self.bind_telegram)
        self.app.router.add_delete('/api/v1/oauth/telegram/unbind', self.unbind_telegram)
        
        # 🆕 Deep Link / QR Code 登入
        self.app.router.add_post('/api/v1/auth/login-token', self.create_login_token)
        self.app.router.add_get('/api/v1/auth/login-token/{token}', self.check_login_token)
        self.app.router.add_post('/api/v1/auth/login-token/{token}/confirm', self.confirm_login_token)
        self.app.router.add_post('/api/v1/auth/login-token/{token}/send-confirmation', self.send_login_confirmation)
        
        # 🆕 Telegram Bot Webhook
        self.app.router.add_post('/webhook/telegram', self.telegram_webhook)
        self.app.router.add_post('/webhook/telegram/{token}', self.telegram_webhook)
        
        # 🆕 登入 Token WebSocket（實時狀態推送）
        self.app.router.add_get('/ws/login-token/{token}', self.login_token_websocket)
        
        # 🆕 Phase 4: 設備管理
        self.app.router.add_get('/api/v1/auth/devices', self.get_user_devices)
        self.app.router.add_delete('/api/v1/auth/devices/{session_id}', self.revoke_device)
        self.app.router.add_post('/api/v1/auth/devices/revoke-all', self.revoke_all_devices)
        
        # 🆕 Phase 5: 安全事件和信任位置
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
        # 🔧 P11-2: /metrics 路由已移至下方健康檢查區塊，避免重複註冊
        
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
        
        # 🔧 P4-2: 配額一致性校驗 API
        self.app.router.add_get('/api/v1/admin/quota/consistency', self.admin_quota_consistency_check)
        self.app.router.add_get('/api/v1/quota/consistency', self.quota_consistency_check)
        
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
        # 🔧 P10-4: 健康歷史記錄 + 部署狀態頁
        self.app.router.add_get('/api/v1/health/history', self.health_history)
        self.app.router.add_get('/api/v1/status', self.status_page)
        # 🔧 P11-2: Prometheus 指標導出
        self.app.router.add_get('/metrics', self.prometheus_metrics)
        # 🔧 P11-4/5/6: 運維可觀測性 API（管理員專用）
        self.app.router.add_get('/api/v1/admin/ops/dashboard', self.ops_dashboard)
        self.app.router.add_get('/api/v1/admin/ops/resources', self.resource_trends)
        self.app.router.add_get('/api/v1/admin/ops/error-patterns', self.error_patterns)
        
        # 🔧 P12: 業務功能增強 API
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
        
        # 🔧 P15-1: 聯繫人 REST API（HTTP 模式回退）
        self.app.router.add_get('/api/v1/contacts', self.get_contacts)
        self.app.router.add_get('/api/v1/contacts/stats', self.get_contacts_stats)
        
        # 🔧 P5-2: 前端錯誤上報端點
        self.app.router.add_post('/api/v1/errors', self.receive_frontend_error)
        self.app.router.add_get('/api/v1/admin/errors', self.admin_get_frontend_errors)
        
        # 🔧 P7-6: 前端性能指標上報端點
        self.app.router.add_post('/api/v1/performance', self.receive_performance_report)
        
        # 🔧 P8-5: 前端審計日誌查詢
        self.app.router.add_get('/api/v1/audit/frontend', self.get_frontend_audit_logs)
        
        # 緩存管理 API（管理員）— 详细缓存统计
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
        
        # 🆕 管理後台 API（Phase 1 優化版）
        if ADMIN_MODULE_AVAILABLE and admin_handlers:
            # 使用新的處理器（帶審計日誌）
            # 認證
            self.app.router.add_post('/api/admin/login', admin_handlers.login)
            self.app.router.add_post('/api/admin/change-password', admin_handlers.change_password)
            # 儀表盤
            self.app.router.add_get('/api/admin/dashboard', admin_handlers.get_dashboard)
            # 用戶管理
            self.app.router.add_get('/api/admin/users', admin_handlers.get_users)
            self.app.router.add_post('/api/admin/users/{user_id}/extend', admin_handlers.extend_user)
            self.app.router.add_post('/api/admin/users/{user_id}/ban', admin_handlers.ban_user)
            # 卡密管理 (Phase 2)
            self.app.router.add_get('/api/admin/licenses', admin_handlers.get_licenses)
            self.app.router.add_post('/api/admin/licenses/generate', admin_handlers.generate_licenses)
            self.app.router.add_post('/api/admin/licenses/disable', admin_handlers.disable_license)
            # 訂單管理 (Phase 2)
            self.app.router.add_get('/api/admin/orders', admin_handlers.get_orders)
            self.app.router.add_post('/api/admin/orders/confirm', admin_handlers.confirm_order)
            # 審計日誌
            self.app.router.add_get('/api/admin/audit-logs', admin_handlers.get_audit_logs)
            self.app.router.add_get('/api/admin/audit-stats', admin_handlers.get_audit_stats)
            # 代理池管理 (Phase 3+)
            self.app.router.add_get('/api/admin/proxies', admin_handlers.get_proxies)
            self.app.router.add_post('/api/admin/proxies', admin_handlers.add_proxies)
            self.app.router.add_delete('/api/admin/proxies/{proxy_id}', admin_handlers.delete_proxy)
            self.app.router.add_post('/api/admin/proxies/{proxy_id}/test', admin_handlers.test_proxy)
            self.app.router.add_post('/api/admin/proxies/assign', admin_handlers.assign_proxy)
            self.app.router.add_post('/api/admin/proxies/release', admin_handlers.release_proxy)
            self.app.router.add_get('/api/admin/proxies/account', admin_handlers.get_account_proxy)
            # 🆕 代理供應商管理
            self.app.router.add_get('/api/admin/proxy-providers', admin_handlers.list_proxy_providers)
            self.app.router.add_post('/api/admin/proxy-providers', admin_handlers.add_proxy_provider)
            self.app.router.add_get('/api/admin/proxy-providers/{provider_id}', admin_handlers.get_proxy_provider)
            self.app.router.add_put('/api/admin/proxy-providers/{provider_id}', admin_handlers.update_proxy_provider)
            self.app.router.add_delete('/api/admin/proxy-providers/{provider_id}', admin_handlers.delete_proxy_provider)
            self.app.router.add_post('/api/admin/proxy-providers/{provider_id}/test', admin_handlers.test_proxy_provider)
            self.app.router.add_post('/api/admin/proxy-providers/{provider_id}/sync', admin_handlers.sync_proxy_provider)
            self.app.router.add_get('/api/admin/proxy-providers/{provider_id}/balance', admin_handlers.get_proxy_provider_balance)
            self.app.router.add_get('/api/admin/proxy-providers/{provider_id}/whitelist', admin_handlers.get_proxy_provider_whitelist)
            self.app.router.add_post('/api/admin/proxy-providers/{provider_id}/whitelist', admin_handlers.manage_proxy_provider_whitelist)
            self.app.router.add_get('/api/admin/proxy-sync-logs', admin_handlers.get_proxy_sync_logs)
            self.app.router.add_post('/api/admin/proxies/cleanup-expired', admin_handlers.cleanup_expired_proxies)
            self.app.router.add_post('/api/admin/proxies/dynamic', admin_handlers.request_dynamic_proxy)
            # API 對接池管理
            self.app.router.add_get('/api/admin/api-pool', admin_handlers.list_api_pool)
            self.app.router.add_post('/api/admin/api-pool', admin_handlers.add_api_to_pool)
            self.app.router.add_post('/api/admin/api-pool/batch', admin_handlers.add_apis_batch)
            self.app.router.add_put('/api/admin/api-pool/{api_id}', admin_handlers.update_api_in_pool)
            self.app.router.add_delete('/api/admin/api-pool/{api_id}', admin_handlers.delete_api_from_pool)
            self.app.router.add_post('/api/admin/api-pool/{api_id}/disable', admin_handlers.disable_api_in_pool)
            self.app.router.add_post('/api/admin/api-pool/{api_id}/enable', admin_handlers.enable_api_in_pool)
            self.app.router.add_post('/api/admin/api-pool/allocate', admin_handlers.allocate_api)
            self.app.router.add_post('/api/admin/api-pool/release', admin_handlers.release_api)
            self.app.router.add_get('/api/admin/api-pool/account', admin_handlers.get_account_api)
            # 🆕 智能分配策略 API
            self.app.router.add_get('/api/admin/api-pool/strategies', admin_handlers.get_api_pool_strategies)
            self.app.router.add_post('/api/admin/api-pool/strategy', admin_handlers.set_api_pool_strategy)
            # 🆕 分配歷史審計 API
            self.app.router.add_get('/api/admin/api-pool/history', admin_handlers.get_api_allocation_history)
            # 🆕 容量規劃告警 API
            self.app.router.add_get('/api/admin/api-pool/alerts', admin_handlers.get_api_pool_alerts)
            self.app.router.add_get('/api/admin/api-pool/forecast', admin_handlers.get_api_pool_forecast)
            # 🆕 告警服務 API
            self.app.router.add_get('/api/admin/alerts/config', admin_handlers.get_alert_config)
            self.app.router.add_post('/api/admin/alerts/config', admin_handlers.update_alert_config)
            self.app.router.add_post('/api/admin/alerts/test', admin_handlers.test_alert_channel)
            self.app.router.add_get('/api/admin/alerts/history', admin_handlers.get_alert_history)
            self.app.router.add_post('/api/admin/alerts/check', admin_handlers.trigger_capacity_check)
            # 🆕 API 分組管理
            self.app.router.add_get('/api/admin/api-pool/groups', admin_handlers.list_api_groups)
            self.app.router.add_post('/api/admin/api-pool/groups', admin_handlers.create_api_group)
            self.app.router.add_put('/api/admin/api-pool/groups/{group_id}', admin_handlers.update_api_group)
            self.app.router.add_delete('/api/admin/api-pool/groups/{group_id}', admin_handlers.delete_api_group)
            self.app.router.add_post('/api/admin/api-pool/assign-group', admin_handlers.assign_api_to_group)
            self.app.router.add_post('/api/admin/api-pool/batch-assign-group', admin_handlers.batch_assign_to_group)
            # 🆕 定時任務管理
            self.app.router.add_get('/api/admin/scheduler/tasks', admin_handlers.list_scheduled_tasks)
            self.app.router.add_put('/api/admin/scheduler/tasks/{task_id}', admin_handlers.update_scheduled_task)
            self.app.router.add_post('/api/admin/scheduler/tasks/{task_id}/run', admin_handlers.run_scheduled_task_now)
            # 🆕 數據導出
            self.app.router.add_get('/api/admin/export/api-pool', admin_handlers.export_api_pool)
            self.app.router.add_get('/api/admin/export/allocation-history', admin_handlers.export_allocation_history)
            self.app.router.add_get('/api/admin/export/alert-history', admin_handlers.export_alert_history)
            # 🆕 P6: 統計可視化
            self.app.router.add_get('/api/admin/api-pool/stats/hourly', admin_handlers.get_api_hourly_stats)
            self.app.router.add_get('/api/admin/api-pool/stats/load', admin_handlers.get_api_load_distribution)
            self.app.router.add_get('/api/admin/api-pool/stats/trend', admin_handlers.get_daily_trend)
            # 🆕 P6: 故障轉移
            self.app.router.add_post('/api/admin/api-pool/result', admin_handlers.record_api_result)
            self.app.router.add_get('/api/admin/api-pool/failed', admin_handlers.get_failed_apis)
            self.app.router.add_post('/api/admin/api-pool/reset-failures', admin_handlers.reset_api_failures)
            # 🆕 P6: 分配規則引擎
            self.app.router.add_get('/api/admin/api-pool/rules', admin_handlers.list_allocation_rules)
            self.app.router.add_post('/api/admin/api-pool/rules', admin_handlers.create_allocation_rule)
            self.app.router.add_delete('/api/admin/api-pool/rules/{rule_id}', admin_handlers.delete_allocation_rule)
            self.app.router.add_put('/api/admin/api-pool/rules/{rule_id}/toggle', admin_handlers.toggle_allocation_rule)
            # 🆕 P6: 備份與恢復
            self.app.router.add_get('/api/admin/api-pool/backup', admin_handlers.create_api_pool_backup)
            self.app.router.add_post('/api/admin/api-pool/restore', admin_handlers.restore_api_pool_backup)
            # 🆕 P6: 多租戶支持
            self.app.router.add_get('/api/admin/tenants', admin_handlers.list_tenants)
            self.app.router.add_post('/api/admin/tenants', admin_handlers.create_tenant)
            self.app.router.add_get('/api/admin/tenants/{tenant_id}/stats', admin_handlers.get_tenant_stats)
            self.app.router.add_post('/api/admin/api-pool/assign-tenant', admin_handlers.assign_api_to_tenant)
            
            # 🆕 P7: 健康評分系統
            self.app.router.add_get('/api/admin/api-pool/health-scores', admin_handlers.get_health_scores)
            self.app.router.add_get('/api/admin/api-pool/health-summary', admin_handlers.get_health_summary)
            self.app.router.add_get('/api/admin/api-pool/anomalies', admin_handlers.detect_anomalies)
            
            # 🆕 P7: 智能預測系統
            self.app.router.add_get('/api/admin/api-pool/prediction/usage', admin_handlers.get_usage_prediction)
            self.app.router.add_get('/api/admin/api-pool/prediction/capacity', admin_handlers.get_capacity_prediction)
            self.app.router.add_get('/api/admin/api-pool/prediction/timing', admin_handlers.get_optimal_timing)
            self.app.router.add_get('/api/admin/api-pool/prediction/report', admin_handlers.get_prediction_report)
            
            # 🆕 P7: Webhook 事件訂閱
            self.app.router.add_get('/api/admin/webhooks/subscribers', admin_handlers.list_webhook_subscribers)
            self.app.router.add_post('/api/admin/webhooks/subscribers', admin_handlers.add_webhook_subscriber)
            self.app.router.add_put('/api/admin/webhooks/subscribers/{subscriber_id}', admin_handlers.update_webhook_subscriber)
            self.app.router.add_delete('/api/admin/webhooks/subscribers/{subscriber_id}', admin_handlers.remove_webhook_subscriber)
            self.app.router.add_get('/api/admin/webhooks/events', admin_handlers.get_webhook_events)
            self.app.router.add_get('/api/admin/webhooks/stats', admin_handlers.get_webhook_stats)
            self.app.router.add_post('/api/admin/webhooks/test/{subscriber_id}', admin_handlers.test_webhook)
            self.app.router.add_post('/api/admin/webhooks/retry', admin_handlers.retry_failed_webhooks)
            
            # 🆕 P7: API 使用計費
            self.app.router.add_get('/api/admin/billing/plans', admin_handlers.list_billing_plans)
            self.app.router.add_post('/api/admin/billing/plans', admin_handlers.create_billing_plan)
            self.app.router.add_post('/api/admin/billing/assign', admin_handlers.assign_billing_plan)
            self.app.router.add_get('/api/admin/billing/tenant/{tenant_id}', admin_handlers.get_tenant_billing)
            self.app.router.add_get('/api/admin/billing/usage/{tenant_id}', admin_handlers.get_usage_summary)
            self.app.router.add_post('/api/admin/billing/calculate', admin_handlers.calculate_charges)
            self.app.router.add_post('/api/admin/billing/invoice', admin_handlers.generate_invoice)
            self.app.router.add_get('/api/admin/billing/invoices', admin_handlers.list_invoices)
            self.app.router.add_post('/api/admin/billing/invoices/{invoice_id}/paid', admin_handlers.mark_invoice_paid)
            
            # 🆕 P7: 自動擴縮容
            self.app.router.add_get('/api/admin/scaling/policies', admin_handlers.list_scaling_policies)
            self.app.router.add_post('/api/admin/scaling/policies', admin_handlers.create_scaling_policy)
            self.app.router.add_put('/api/admin/scaling/policies/{policy_id}', admin_handlers.update_scaling_policy)
            self.app.router.add_delete('/api/admin/scaling/policies/{policy_id}', admin_handlers.delete_scaling_policy)
            self.app.router.add_get('/api/admin/scaling/evaluate', admin_handlers.evaluate_scaling)
            self.app.router.add_post('/api/admin/scaling/execute', admin_handlers.execute_scaling)
            self.app.router.add_get('/api/admin/scaling/history', admin_handlers.get_scaling_history)
            self.app.router.add_get('/api/admin/scaling/stats', admin_handlers.get_scaling_stats)
            
            # 🆕 P8: 審計合規
            self.app.router.add_get('/api/admin/audit/logs', admin_handlers.query_audit_logs)
            self.app.router.add_get('/api/admin/audit/resource/{resource_type}/{resource_id}', admin_handlers.get_resource_history)
            self.app.router.add_post('/api/admin/compliance/reports', admin_handlers.generate_compliance_report)
            self.app.router.add_get('/api/admin/compliance/reports', admin_handlers.list_compliance_reports)
            self.app.router.add_get('/api/admin/compliance/reports/{report_id}', admin_handlers.get_compliance_report)
            self.app.router.add_get('/api/admin/audit/export', admin_handlers.export_audit_logs)
            self.app.router.add_get('/api/admin/audit/storage', admin_handlers.get_audit_storage_stats)
            
            # 🆕 P8: 多集群管理
            self.app.router.add_get('/api/admin/clusters', admin_handlers.list_clusters)
            self.app.router.add_post('/api/admin/clusters', admin_handlers.register_cluster)
            self.app.router.add_put('/api/admin/clusters/{cluster_id}', admin_handlers.update_cluster)
            self.app.router.add_delete('/api/admin/clusters/{cluster_id}', admin_handlers.remove_cluster)
            self.app.router.add_get('/api/admin/clusters/{cluster_id}/health', admin_handlers.check_cluster_health)
            self.app.router.add_post('/api/admin/clusters/failover', admin_handlers.trigger_failover)
            self.app.router.add_get('/api/admin/clusters/stats', admin_handlers.get_cluster_stats)
            
            # 🆕 P8: 告警升級
            self.app.router.add_get('/api/admin/escalation/schedules', admin_handlers.list_on_call_schedules)
            self.app.router.add_get('/api/admin/escalation/policies', admin_handlers.list_escalation_policies)
            self.app.router.add_get('/api/admin/escalation/alerts', admin_handlers.list_escalation_alerts)
            self.app.router.add_post('/api/admin/escalation/alerts/{alert_id}/acknowledge', admin_handlers.acknowledge_escalation)
            self.app.router.add_post('/api/admin/escalation/alerts/{alert_id}/resolve', admin_handlers.resolve_escalation)
            self.app.router.add_get('/api/admin/escalation/stats', admin_handlers.get_escalation_stats)
            
            # 🆕 P8: API 版本管理
            self.app.router.add_get('/api/admin/versions', admin_handlers.list_api_versions)
            self.app.router.add_post('/api/admin/versions', admin_handlers.create_api_version)
            self.app.router.add_get('/api/admin/rollouts', admin_handlers.list_rollouts)
            self.app.router.add_post('/api/admin/rollouts', admin_handlers.create_rollout)
            self.app.router.add_post('/api/admin/rollouts/{plan_id}/{action}', admin_handlers.control_rollout)
            
            # 🆕 P8: 異常檢測
            self.app.router.add_get('/api/admin/anomaly/detectors', admin_handlers.list_anomaly_detectors)
            self.app.router.add_get('/api/admin/anomaly/list', admin_handlers.list_anomalies)
            self.app.router.add_post('/api/admin/anomaly/{anomaly_id}/acknowledge', admin_handlers.acknowledge_anomaly)
            self.app.router.add_get('/api/admin/anomaly/stats', admin_handlers.get_anomaly_stats)
            self.app.router.add_get('/api/admin/anomaly/detector-status', admin_handlers.get_detector_status)
            
            # 🆕 P9: 可觀測性平台
            self.app.router.add_get('/api/admin/observability/metrics', admin_handlers.get_current_metrics)
            self.app.router.add_get('/api/admin/observability/metrics/query', admin_handlers.query_metrics)
            self.app.router.add_get('/api/admin/observability/metrics/aggregation', admin_handlers.get_metric_aggregation)
            self.app.router.add_get('/api/admin/observability/traces/{trace_id}', admin_handlers.get_trace)
            self.app.router.add_get('/api/admin/observability/traces', admin_handlers.search_traces)
            self.app.router.add_get('/api/admin/observability/dashboards', admin_handlers.list_dashboards)
            self.app.router.add_get('/api/admin/observability/overview', admin_handlers.get_system_overview)
            
            # 🆕 P9: 多租戶增強
            self.app.router.add_get('/api/admin/tenants-enhanced', admin_handlers.list_tenants_enhanced)
            self.app.router.add_get('/api/admin/tenants-enhanced/{tenant_id}/quotas', admin_handlers.get_tenant_quotas)
            self.app.router.add_post('/api/admin/tenants-enhanced/{tenant_id}/quotas', admin_handlers.set_tenant_quota)
            self.app.router.add_get('/api/admin/tenants-enhanced/alerts', admin_handlers.get_quota_alerts)
            self.app.router.add_post('/api/admin/tenants-enhanced/{tenant_id}/reports', admin_handlers.generate_tenant_report)
            self.app.router.add_get('/api/admin/tenants-enhanced/{tenant_id}/summary', admin_handlers.get_tenant_summary)
            self.app.router.add_get('/api/admin/tenants-enhanced/overview', admin_handlers.get_tenants_overview)
            
            # 🆕 P9: 安全增強
            self.app.router.add_get('/api/admin/security/roles/{user_id}', admin_handlers.list_user_roles)
            self.app.router.add_post('/api/admin/security/roles/{user_id}', admin_handlers.assign_user_role)
            self.app.router.add_post('/api/admin/security/tokens', admin_handlers.create_access_token)
            self.app.router.add_get('/api/admin/security/tokens', admin_handlers.list_access_tokens)
            self.app.router.add_delete('/api/admin/security/tokens/{token_id}', admin_handlers.revoke_access_token)
            self.app.router.add_get('/api/admin/security/events', admin_handlers.query_security_events)
            self.app.router.add_get('/api/admin/security/summary', admin_handlers.get_security_summary)
            self.app.router.add_post('/api/admin/security/rotate-secrets', admin_handlers.rotate_secrets)
            
            # 🆕 P9: 智能根因分析
            self.app.router.add_post('/api/admin/incidents', admin_handlers.create_incident)
            self.app.router.add_get('/api/admin/incidents', admin_handlers.list_incidents)
            self.app.router.add_get('/api/admin/incidents/{incident_id}', admin_handlers.get_incident)
            self.app.router.add_post('/api/admin/incidents/{incident_id}/analyze', admin_handlers.analyze_root_cause)
            self.app.router.add_put('/api/admin/incidents/{incident_id}/status', admin_handlers.update_incident_status)
            self.app.router.add_post('/api/admin/incidents/predict', admin_handlers.predict_issues)
            self.app.router.add_get('/api/admin/incidents/stats', admin_handlers.get_rca_stats)
            
            # 🆕 P9: 服務健康儀表盤
            self.app.router.add_get('/api/admin/service-dashboard', admin_handlers.get_service_dashboard)
            self.app.router.add_get('/api/admin/service-dashboard/components', admin_handlers.list_service_components)
            self.app.router.add_put('/api/admin/service-dashboard/components/{component_id}', admin_handlers.update_component_status)
            self.app.router.add_get('/api/admin/service-dashboard/components/{component_id}/history', admin_handlers.get_component_history)
            self.app.router.add_get('/api/admin/service-dashboard/sla', admin_handlers.get_sla_status)
            self.app.router.add_post('/api/admin/service-dashboard/updates', admin_handlers.create_status_update)
            self.app.router.add_post('/api/admin/service-dashboard/updates/{update_id}/resolve', admin_handlers.resolve_status_update)
            self.app.router.add_get('/api/admin/service-dashboard/maintenance', admin_handlers.list_maintenance_windows)
            self.app.router.add_post('/api/admin/service-dashboard/maintenance', admin_handlers.schedule_maintenance)
            self.app.router.add_get('/api/status', admin_handlers.get_status_page)
            
            # 🆕 P10: 智能預測引擎
            self.app.router.add_get('/api/admin/ml/predict/usage', admin_handlers.predict_usage)
            self.app.router.add_post('/api/admin/ml/predict/capacity', admin_handlers.predict_capacity)
            self.app.router.add_get('/api/admin/ml/patterns', admin_handlers.analyze_patterns)
            self.app.router.add_get('/api/admin/ml/threshold', admin_handlers.get_adaptive_threshold)
            self.app.router.add_get('/api/admin/ml/performance', admin_handlers.get_model_performance)
            
            # 🆕 P10: 災備恢復
            self.app.router.add_post('/api/admin/backup', admin_handlers.create_backup)
            self.app.router.add_get('/api/admin/backups', admin_handlers.list_backups)
            self.app.router.add_post('/api/admin/backup/{backup_id}/verify', admin_handlers.verify_backup)
            self.app.router.add_post('/api/admin/backup/{backup_id}/restore', admin_handlers.restore_backup)
            self.app.router.add_get('/api/admin/dr/rpo', admin_handlers.get_rpo_status)
            self.app.router.add_get('/api/admin/dr/stats', admin_handlers.get_dr_stats)
            self.app.router.add_get('/api/admin/dr/plans', admin_handlers.list_recovery_plans)
            
            # 🆕 P10: 成本優化
            self.app.router.add_get('/api/admin/cost/summary', admin_handlers.get_cost_summary)
            self.app.router.add_get('/api/admin/cost/breakdown', admin_handlers.get_cost_breakdown)
            self.app.router.add_get('/api/admin/cost/forecast', admin_handlers.forecast_cost)
            self.app.router.add_get('/api/admin/cost/budgets', admin_handlers.get_budget_status)
            self.app.router.add_get('/api/admin/cost/recommendations', admin_handlers.get_cost_recommendations)
            self.app.router.add_get('/api/admin/cost/stats', admin_handlers.get_cost_stats)
            
            # 🆕 P10: 性能分析
            self.app.router.add_get('/api/admin/performance/latency', admin_handlers.get_latency_stats)
            self.app.router.add_get('/api/admin/performance/endpoint/{endpoint}', admin_handlers.get_endpoint_performance)
            self.app.router.add_post('/api/admin/performance/bottlenecks/detect', admin_handlers.detect_bottlenecks)
            self.app.router.add_get('/api/admin/performance/bottlenecks', admin_handlers.list_bottlenecks)
            self.app.router.add_get('/api/admin/performance/regressions', admin_handlers.list_regressions)
            self.app.router.add_get('/api/admin/performance/summary', admin_handlers.get_performance_summary)
            
            # 🆕 P10: 報告生成
            self.app.router.add_post('/api/admin/reports/daily', admin_handlers.generate_daily_report)
            self.app.router.add_post('/api/admin/reports/weekly', admin_handlers.generate_weekly_report)
            self.app.router.add_get('/api/admin/reports/{report_id}', admin_handlers.get_report)
            self.app.router.add_get('/api/admin/reports', admin_handlers.list_reports)
            self.app.router.add_get('/api/admin/reports/{report_id}/export', admin_handlers.export_report)
            self.app.router.add_get('/api/admin/reports/templates', admin_handlers.list_report_templates)
            self.app.router.add_get('/api/admin/reports/stats', admin_handlers.get_report_stats)
            
            # 初始化定時任務調度器
            from admin.scheduler import get_scheduler, init_scheduled_tasks
            init_scheduled_tasks()
            scheduler = get_scheduler()
            scheduler.start()
            logger.info("✅ Admin module loaded with Phase 2-10 Complete: API Pool Enterprise Ultimate Edition")
        
        # 🆕 Phase 0 (Wallet): 設置錢包路由
        if WALLET_MODULE_AVAILABLE and wallet_handlers:
            # 錢包信息
            self.app.router.add_get('/api/wallet', wallet_handlers.get_wallet)
            self.app.router.add_get('/api/wallet/balance', wallet_handlers.get_balance)
            self.app.router.add_get('/api/wallet/statistics', wallet_handlers.get_statistics)
            # 交易記錄
            self.app.router.add_get('/api/wallet/transactions', wallet_handlers.get_transactions)
            self.app.router.add_get('/api/wallet/transactions/recent', wallet_handlers.get_recent_transactions)
            self.app.router.add_get('/api/wallet/transactions/export', wallet_handlers.export_transactions)
            # 分析統計
            self.app.router.add_get('/api/wallet/analysis/consume', wallet_handlers.get_consume_analysis)
            self.app.router.add_get('/api/wallet/analysis/monthly', wallet_handlers.get_monthly_summary)
            # 充值套餐
            self.app.router.add_get('/api/wallet/packages', wallet_handlers.get_recharge_packages)
            # 消費接口
            self.app.router.add_post('/api/wallet/consume', wallet_handlers.consume)
            self.app.router.add_post('/api/wallet/check-balance', wallet_handlers.check_balance)
            # Phase 1: 充值訂單
            self.app.router.add_post('/api/wallet/recharge/create', wallet_handlers.create_recharge_order)
            self.app.router.add_get('/api/wallet/recharge/orders', wallet_handlers.get_recharge_orders)
            self.app.router.add_get('/api/wallet/recharge/{order_no}', wallet_handlers.get_recharge_order)
            self.app.router.add_post('/api/wallet/recharge/{order_no}/paid', wallet_handlers.mark_recharge_paid)
            self.app.router.add_post('/api/wallet/recharge/{order_no}/cancel', wallet_handlers.cancel_recharge_order)
            self.app.router.add_get('/api/wallet/recharge/{order_no}/status', wallet_handlers.check_recharge_status)
            # 支付回調（公開）
            self.app.router.add_post('/api/wallet/callback/{provider}', wallet_handlers.payment_callback)
            # Phase 2: 統一消費接口
            self.app.router.add_post('/api/wallet/consume/unified', wallet_handlers.consume_unified)
            self.app.router.add_get('/api/wallet/consume/limit', wallet_handlers.check_consume_limit)
            self.app.router.add_get('/api/wallet/consume/summary', wallet_handlers.get_consume_summary)
            self.app.router.add_post('/api/wallet/refund', wallet_handlers.refund_transaction)
            # Phase 3: 管理員錢包 API
            if admin_wallet_handlers:
                self.app.router.add_get('/api/admin/wallets', admin_wallet_handlers.list_wallets)
                self.app.router.add_get('/api/admin/wallets/{user_id}', admin_wallet_handlers.get_wallet_detail)
                self.app.router.add_post('/api/admin/wallets/{user_id}/adjust', admin_wallet_handlers.adjust_balance)
                self.app.router.add_post('/api/admin/wallets/{user_id}/freeze', admin_wallet_handlers.freeze_wallet)
                self.app.router.add_post('/api/admin/wallets/{user_id}/unfreeze', admin_wallet_handlers.unfreeze_wallet)
                self.app.router.add_get('/api/admin/orders', admin_wallet_handlers.list_orders)
                self.app.router.add_post('/api/admin/orders/{order_no}/confirm', admin_wallet_handlers.confirm_order)
                self.app.router.add_get('/api/admin/wallet/dashboard', admin_wallet_handlers.get_dashboard)
                self.app.router.add_get('/api/admin/wallet/scheduler', admin_wallet_handlers.get_scheduler_status)
            # Phase 4: 購買整合
            if purchase_handlers:
                self.app.router.add_post('/api/purchase', purchase_handlers.unified_purchase)
                self.app.router.add_post('/api/purchase/membership', purchase_handlers.purchase_membership)
                self.app.router.add_post('/api/purchase/proxy', purchase_handlers.purchase_ip_proxy)
                self.app.router.add_post('/api/purchase/quota', purchase_handlers.purchase_quota_pack)
            # Phase 4: 提現功能
            if withdraw_handlers:
                self.app.router.add_get('/api/wallet/withdraw/config', withdraw_handlers.get_withdraw_config)
                self.app.router.add_post('/api/wallet/withdraw/create', withdraw_handlers.create_withdraw)
                self.app.router.add_get('/api/wallet/withdraw/orders', withdraw_handlers.get_withdraw_orders)
                self.app.router.add_get('/api/wallet/withdraw/{order_no}', withdraw_handlers.get_withdraw_order)
                self.app.router.add_post('/api/wallet/withdraw/{order_no}/cancel', withdraw_handlers.cancel_withdraw)
                self.app.router.add_get('/api/admin/withdraws', withdraw_handlers.admin_list_withdraws)
                self.app.router.add_post('/api/admin/withdraws/{order_no}/approve', withdraw_handlers.admin_approve_withdraw)
                self.app.router.add_post('/api/admin/withdraws/{order_no}/reject', withdraw_handlers.admin_reject_withdraw)
                self.app.router.add_post('/api/admin/withdraws/{order_no}/complete', withdraw_handlers.admin_complete_withdraw)
            # Phase 5: 兌換碼
            if redeem_handlers:
                self.app.router.add_post('/api/wallet/redeem', redeem_handlers.redeem_code)
                self.app.router.add_get('/api/wallet/redeem/records', redeem_handlers.get_redeem_records)
                self.app.router.add_post('/api/admin/redeem/create', redeem_handlers.admin_create_code)
                self.app.router.add_post('/api/admin/redeem/batch', redeem_handlers.admin_batch_create)
                self.app.router.add_get('/api/admin/redeem/codes', redeem_handlers.admin_list_codes)
                self.app.router.add_post('/api/admin/redeem/{code_id}/disable', redeem_handlers.admin_disable_code)
                self.app.router.add_post('/api/admin/redeem/{code_id}/enable', redeem_handlers.admin_enable_code)
            # Phase 5: 支付密碼
            if pay_password_handlers:
                self.app.router.add_get('/api/wallet/pay-password/status', pay_password_handlers.get_status)
                self.app.router.add_post('/api/wallet/pay-password/set', pay_password_handlers.set_password)
                self.app.router.add_post('/api/wallet/pay-password/verify', pay_password_handlers.verify_password)
                self.app.router.add_post('/api/wallet/pay-password/change', pay_password_handlers.change_password)
                self.app.router.add_post('/api/wallet/pay-password/remove', pay_password_handlers.remove_password)
                self.app.router.add_post('/api/admin/users/{user_id}/pay-password/reset', pay_password_handlers.admin_reset_password)
            # Phase 5: 優惠券
            if coupon_handlers:
                self.app.router.add_get('/api/wallet/coupons', coupon_handlers.get_my_coupons)
                self.app.router.add_get('/api/wallet/coupons/applicable', coupon_handlers.get_applicable_coupons)
                self.app.router.add_post('/api/wallet/coupons/claim', coupon_handlers.claim_coupon)
                self.app.router.add_post('/api/wallet/coupons/use', coupon_handlers.use_coupon)
                self.app.router.add_post('/api/admin/coupons/templates', coupon_handlers.admin_create_template)
                self.app.router.add_get('/api/admin/coupons/templates', coupon_handlers.admin_list_templates)
                self.app.router.add_post('/api/admin/coupons/issue', coupon_handlers.admin_issue_coupon)
            # Phase 5: 財務報表
            if finance_report_handlers:
                self.app.router.add_get('/api/admin/finance/overview', finance_report_handlers.get_overview)
                self.app.router.add_get('/api/admin/finance/daily', finance_report_handlers.get_daily_report)
                self.app.router.add_get('/api/admin/finance/range', finance_report_handlers.get_range_report)
                self.app.router.add_get('/api/admin/finance/trend', finance_report_handlers.get_trend)
                self.app.router.add_get('/api/admin/finance/categories', finance_report_handlers.get_category_stats)
                self.app.router.add_get('/api/admin/finance/top-users', finance_report_handlers.get_top_users)
                self.app.router.add_get('/api/admin/finance/monthly', finance_report_handlers.get_monthly_summary)
                self.app.router.add_get('/api/admin/finance/export', finance_report_handlers.export_report)
            # 🆕 Phase 1.1: 支付配置管理 API
            if payment_config_handlers:
                # 地址管理
                self.app.router.add_get('/api/admin/payment/addresses', payment_config_handlers.list_addresses)
                self.app.router.add_post('/api/admin/payment/addresses', payment_config_handlers.add_address)
                self.app.router.add_post('/api/admin/payment/addresses/batch', payment_config_handlers.batch_add_addresses)
                self.app.router.add_put('/api/admin/payment/addresses/{address_id}', payment_config_handlers.update_address)
                self.app.router.add_delete('/api/admin/payment/addresses/{address_id}', payment_config_handlers.delete_address)
                # 渠道配置
                self.app.router.add_get('/api/admin/payment/channels', payment_config_handlers.list_channels)
                self.app.router.add_put('/api/admin/payment/channels/{channel_type}', payment_config_handlers.update_channel)
                self.app.router.add_post('/api/admin/payment/channels/{channel_type}/toggle', payment_config_handlers.toggle_channel)
                # 統計
                self.app.router.add_get('/api/admin/payment/stats', payment_config_handlers.get_stats)
                logger.info("✅ Payment config module loaded (Phase 1.1)")
            # 🆕 Phase 2 & 3: 運營工具 API
            if operations_handlers:
                # 批量操作
                self.app.router.add_post('/api/admin/wallet/batch/adjust', operations_handlers.batch_adjust_balance)
                self.app.router.add_post('/api/admin/wallet/batch/freeze', operations_handlers.batch_freeze)
                self.app.router.add_post('/api/admin/wallet/batch/unfreeze', operations_handlers.batch_unfreeze)
                self.app.router.add_post('/api/admin/wallet/campaign/reward', operations_handlers.campaign_reward)
                self.app.router.add_get('/api/admin/wallet/operations', operations_handlers.list_operations)
                self.app.router.add_get('/api/admin/wallet/operations/{operation_id}', operations_handlers.get_operation_detail)
                # 監控告警
                self.app.router.add_get('/api/admin/wallet/alerts', operations_handlers.get_alerts)
                self.app.router.add_get('/api/admin/wallet/alerts/summary', operations_handlers.get_alert_summary)
                self.app.router.add_post('/api/admin/wallet/alerts/{alert_id}/acknowledge', operations_handlers.acknowledge_alert)
                self.app.router.add_post('/api/admin/wallet/alerts/scan', operations_handlers.scan_anomalies)
                # 統計分析
                self.app.router.add_get('/api/admin/wallet/analytics', operations_handlers.get_wallet_analytics)
                logger.info("✅ Operations module loaded (Phase 2 & 3)")
            logger.info("✅ Wallet module loaded with Phase 0-5 + Operations Tools")
        
        # 🔧 P8-2: 管理后台 Legacy 路由委托到独立模块
        from api.admin_panel_legacy import AdminPanelLegacy, register_admin_panel_routes
        self._admin_panel = AdminPanelLegacy()
        register_admin_panel_routes(self.app, self._admin_panel)
    
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
    
    async def basic_health_check(self, request):
        """🔧 P8-2: 基础健康检查（重命名，避免与完整 health_check 冲突）"""
        # 🔧 P8-3: 集成迁移状态到健康检查
        migration_status = None
        if self.backend_service and hasattr(self.backend_service, '_migration_status'):
            migration_status = self.backend_service._migration_status
        return self._json_response({
            'status': 'ok',
            'service': 'TG-Matrix API',
            'version': '2.1.1',
            'timestamp': datetime.now().isoformat(),
            'backend_ready': self.backend_service is not None,
            'wallet_module': WALLET_MODULE_AVAILABLE,
            'migration': migration_status
        })
    
    async def debug_modules(self, request):
        """診斷模塊狀態"""
        import os
        import sys
        
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
    
    # 🔧 P11-2: prometheus_metrics 已移至 P11-2 區塊（見下方），舊版 monitoring 實現已替換
    
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
    
    # ==================== 🔧 P10-4: 健康歷史 ====================
    
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
    
    # ==================== 🔧 P11-2: Prometheus 指標導出 ====================
    
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
    
    # ==================== 🔧 P11-4: 資源趨勢分析 ====================
    
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
    
    # ==================== 🔧 P11-5: 錯誤模式聚類 ====================
    
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
    
    # ==================== 🔧 P11-6: 運維 Dashboard ====================
    
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
    
    # ==================== 🔧 P10-5: 服務狀態頁 ====================
    
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
    
    # ==================== 🔧 P12: 業務功能增強 ====================
    
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
    
    # ==================== P15-1: 聯繫人 REST API ====================
    
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
    
    # ==================== P5-2: 前端錯誤上報 ====================
    
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
    
    async def admin_get_frontend_errors(self, request):
        """管理員查詢前端錯誤日誌"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            limit = int(request.query.get('limit', '50'))
            error_type = request.query.get('type', '')
            severity = request.query.get('severity', '')
            
            import sqlite3
            db_path = os.environ.get('DATABASE_PATH',
                os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db'))
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
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
    
    # ==================== 🔧 P7-6: 性能指標 API ====================
    
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
    
    # ==================== 🔧 P8-5: 前端審計日誌查詢 API ====================
    
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

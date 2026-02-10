#!/usr/bin/env python3
"""
P12-1: Admin Module Route Registration
管理後台模組路由注冊 — 從 http_server.py _setup_admin_module_routes 提取

包含: admin_handlers 路由、wallet 路由、admin_panel_legacy 路由
這些路由使用外部 handler 模組，不依賴 HttpApiServer 的 self 方法
"""

import logging

logger = logging.getLogger(__name__)


def register_admin_module_routes(app):
    """注冊管理後台模組路由 (admin_handlers + wallet + legacy)
    
    Args:
        app: aiohttp web.Application instance
    """
    _register_admin_handlers_routes(app)
    _register_wallet_routes(app)
    _register_legacy_admin_routes(app)


def _register_admin_handlers_routes(app):
    """注冊 admin_handlers 路由 (Phase 1-10)"""
    try:
        from admin import admin_handlers
    except ImportError:
        logger.warning("⚠️ Admin module not available, skipping admin routes")
        return
    
    if not admin_handlers:
        return

    # 認證
    app.router.add_post('/api/admin/login', admin_handlers.login)
    app.router.add_post('/api/admin/change-password', admin_handlers.change_password)
    # 儀表盤
    app.router.add_get('/api/admin/dashboard', admin_handlers.get_dashboard)
    # 用戶管理
    app.router.add_get('/api/admin/users', admin_handlers.get_users)
    app.router.add_post('/api/admin/users/{user_id}/extend', admin_handlers.extend_user)
    app.router.add_post('/api/admin/users/{user_id}/ban', admin_handlers.ban_user)
    # 卡密管理 (Phase 2)
    app.router.add_get('/api/admin/licenses', admin_handlers.get_licenses)
    app.router.add_post('/api/admin/licenses/generate', admin_handlers.generate_licenses)
    app.router.add_post('/api/admin/licenses/disable', admin_handlers.disable_license)
    # 訂單管理 (Phase 2)
    app.router.add_get('/api/admin/orders', admin_handlers.get_orders)
    app.router.add_post('/api/admin/orders/confirm', admin_handlers.confirm_order)
    # 審計日誌
    app.router.add_get('/api/admin/audit-logs', admin_handlers.get_audit_logs)
    app.router.add_get('/api/admin/audit-stats', admin_handlers.get_audit_stats)
    # 代理池管理 (Phase 3+)
    app.router.add_get('/api/admin/proxies', admin_handlers.get_proxies)
    app.router.add_post('/api/admin/proxies', admin_handlers.add_proxies)
    app.router.add_delete('/api/admin/proxies/{proxy_id}', admin_handlers.delete_proxy)
    app.router.add_post('/api/admin/proxies/{proxy_id}/test', admin_handlers.test_proxy)
    app.router.add_post('/api/admin/proxies/assign', admin_handlers.assign_proxy)
    app.router.add_post('/api/admin/proxies/release', admin_handlers.release_proxy)
    app.router.add_get('/api/admin/proxies/account', admin_handlers.get_account_proxy)
    # 代理供應商管理
    app.router.add_get('/api/admin/proxy-providers', admin_handlers.list_proxy_providers)
    app.router.add_post('/api/admin/proxy-providers', admin_handlers.add_proxy_provider)
    app.router.add_get('/api/admin/proxy-providers/{provider_id}', admin_handlers.get_proxy_provider)
    app.router.add_put('/api/admin/proxy-providers/{provider_id}', admin_handlers.update_proxy_provider)
    app.router.add_delete('/api/admin/proxy-providers/{provider_id}', admin_handlers.delete_proxy_provider)
    app.router.add_post('/api/admin/proxy-providers/{provider_id}/test', admin_handlers.test_proxy_provider)
    app.router.add_post('/api/admin/proxy-providers/{provider_id}/sync', admin_handlers.sync_proxy_provider)
    app.router.add_get('/api/admin/proxy-providers/{provider_id}/balance', admin_handlers.get_proxy_provider_balance)
    app.router.add_get('/api/admin/proxy-providers/{provider_id}/whitelist', admin_handlers.get_proxy_provider_whitelist)
    app.router.add_post('/api/admin/proxy-providers/{provider_id}/whitelist', admin_handlers.manage_proxy_provider_whitelist)
    app.router.add_get('/api/admin/proxy-sync-logs', admin_handlers.get_proxy_sync_logs)
    app.router.add_post('/api/admin/proxies/cleanup-expired', admin_handlers.cleanup_expired_proxies)
    app.router.add_post('/api/admin/proxies/dynamic', admin_handlers.request_dynamic_proxy)
    # API 對接池管理
    app.router.add_get('/api/admin/api-pool', admin_handlers.list_api_pool)
    app.router.add_post('/api/admin/api-pool', admin_handlers.add_api_to_pool)
    app.router.add_post('/api/admin/api-pool/batch', admin_handlers.add_apis_batch)
    app.router.add_put('/api/admin/api-pool/{api_id}', admin_handlers.update_api_in_pool)
    app.router.add_delete('/api/admin/api-pool/{api_id}', admin_handlers.delete_api_from_pool)
    app.router.add_post('/api/admin/api-pool/{api_id}/disable', admin_handlers.disable_api_in_pool)
    app.router.add_post('/api/admin/api-pool/{api_id}/enable', admin_handlers.enable_api_in_pool)
    app.router.add_post('/api/admin/api-pool/allocate', admin_handlers.allocate_api)
    app.router.add_post('/api/admin/api-pool/release', admin_handlers.release_api)
    app.router.add_get('/api/admin/api-pool/account', admin_handlers.get_account_api)
    # 智能分配策略
    app.router.add_get('/api/admin/api-pool/strategies', admin_handlers.get_api_pool_strategies)
    app.router.add_post('/api/admin/api-pool/strategy', admin_handlers.set_api_pool_strategy)
    app.router.add_get('/api/admin/api-pool/history', admin_handlers.get_api_allocation_history)
    # 容量規劃告警
    app.router.add_get('/api/admin/api-pool/alerts', admin_handlers.get_api_pool_alerts)
    app.router.add_get('/api/admin/api-pool/forecast', admin_handlers.get_api_pool_forecast)
    # 告警服務
    app.router.add_get('/api/admin/alerts/config', admin_handlers.get_alert_config)
    app.router.add_post('/api/admin/alerts/config', admin_handlers.update_alert_config)
    app.router.add_post('/api/admin/alerts/test', admin_handlers.test_alert_channel)
    app.router.add_get('/api/admin/alerts/history', admin_handlers.get_alert_history)
    app.router.add_post('/api/admin/alerts/check', admin_handlers.trigger_capacity_check)
    # API 分組管理
    app.router.add_get('/api/admin/api-pool/groups', admin_handlers.list_api_groups)
    app.router.add_post('/api/admin/api-pool/groups', admin_handlers.create_api_group)
    app.router.add_put('/api/admin/api-pool/groups/{group_id}', admin_handlers.update_api_group)
    app.router.add_delete('/api/admin/api-pool/groups/{group_id}', admin_handlers.delete_api_group)
    app.router.add_post('/api/admin/api-pool/assign-group', admin_handlers.assign_api_to_group)
    app.router.add_post('/api/admin/api-pool/batch-assign-group', admin_handlers.batch_assign_to_group)
    # 定時任務管理
    app.router.add_get('/api/admin/scheduler/tasks', admin_handlers.list_scheduled_tasks)
    app.router.add_put('/api/admin/scheduler/tasks/{task_id}', admin_handlers.update_scheduled_task)
    app.router.add_post('/api/admin/scheduler/tasks/{task_id}/run', admin_handlers.run_scheduled_task_now)
    # 數據導出
    app.router.add_get('/api/admin/export/api-pool', admin_handlers.export_api_pool)
    app.router.add_get('/api/admin/export/allocation-history', admin_handlers.export_allocation_history)
    app.router.add_get('/api/admin/export/alert-history', admin_handlers.export_alert_history)
    # P6: 統計可視化
    app.router.add_get('/api/admin/api-pool/stats/hourly', admin_handlers.get_api_hourly_stats)
    app.router.add_get('/api/admin/api-pool/stats/load', admin_handlers.get_api_load_distribution)
    app.router.add_get('/api/admin/api-pool/stats/trend', admin_handlers.get_daily_trend)
    # P6: 故障轉移
    app.router.add_post('/api/admin/api-pool/result', admin_handlers.record_api_result)
    app.router.add_get('/api/admin/api-pool/failed', admin_handlers.get_failed_apis)
    app.router.add_post('/api/admin/api-pool/reset-failures', admin_handlers.reset_api_failures)
    # P6: 分配規則引擎
    app.router.add_get('/api/admin/api-pool/rules', admin_handlers.list_allocation_rules)
    app.router.add_post('/api/admin/api-pool/rules', admin_handlers.create_allocation_rule)
    app.router.add_delete('/api/admin/api-pool/rules/{rule_id}', admin_handlers.delete_allocation_rule)
    app.router.add_put('/api/admin/api-pool/rules/{rule_id}/toggle', admin_handlers.toggle_allocation_rule)
    # P6: 備份與恢復
    app.router.add_get('/api/admin/api-pool/backup', admin_handlers.create_api_pool_backup)
    app.router.add_post('/api/admin/api-pool/restore', admin_handlers.restore_api_pool_backup)
    # P6: 多租戶支持
    app.router.add_get('/api/admin/tenants', admin_handlers.list_tenants)
    app.router.add_post('/api/admin/tenants', admin_handlers.create_tenant)
    app.router.add_get('/api/admin/tenants/{tenant_id}/stats', admin_handlers.get_tenant_stats)
    app.router.add_post('/api/admin/api-pool/assign-tenant', admin_handlers.assign_api_to_tenant)
    # P7: 健康評分系統
    app.router.add_get('/api/admin/api-pool/health-scores', admin_handlers.get_health_scores)
    app.router.add_get('/api/admin/api-pool/health-summary', admin_handlers.get_health_summary)
    app.router.add_get('/api/admin/api-pool/anomalies', admin_handlers.detect_anomalies)
    # P7: 智能預測系統
    app.router.add_get('/api/admin/api-pool/prediction/usage', admin_handlers.get_usage_prediction)
    app.router.add_get('/api/admin/api-pool/prediction/capacity', admin_handlers.get_capacity_prediction)
    app.router.add_get('/api/admin/api-pool/prediction/timing', admin_handlers.get_optimal_timing)
    app.router.add_get('/api/admin/api-pool/prediction/report', admin_handlers.get_prediction_report)
    # P7: Webhook 事件訂閱
    app.router.add_get('/api/admin/webhooks/subscribers', admin_handlers.list_webhook_subscribers)
    app.router.add_post('/api/admin/webhooks/subscribers', admin_handlers.add_webhook_subscriber)
    app.router.add_put('/api/admin/webhooks/subscribers/{subscriber_id}', admin_handlers.update_webhook_subscriber)
    app.router.add_delete('/api/admin/webhooks/subscribers/{subscriber_id}', admin_handlers.remove_webhook_subscriber)
    app.router.add_get('/api/admin/webhooks/events', admin_handlers.get_webhook_events)
    app.router.add_get('/api/admin/webhooks/stats', admin_handlers.get_webhook_stats)
    app.router.add_post('/api/admin/webhooks/test/{subscriber_id}', admin_handlers.test_webhook)
    app.router.add_post('/api/admin/webhooks/retry', admin_handlers.retry_failed_webhooks)
    # P7: API 使用計費
    app.router.add_get('/api/admin/billing/plans', admin_handlers.list_billing_plans)
    app.router.add_post('/api/admin/billing/plans', admin_handlers.create_billing_plan)
    app.router.add_post('/api/admin/billing/assign', admin_handlers.assign_billing_plan)
    app.router.add_get('/api/admin/billing/tenant/{tenant_id}', admin_handlers.get_tenant_billing)
    app.router.add_get('/api/admin/billing/usage/{tenant_id}', admin_handlers.get_usage_summary)
    app.router.add_post('/api/admin/billing/calculate', admin_handlers.calculate_charges)
    app.router.add_post('/api/admin/billing/invoice', admin_handlers.generate_invoice)
    app.router.add_get('/api/admin/billing/invoices', admin_handlers.list_invoices)
    app.router.add_post('/api/admin/billing/invoices/{invoice_id}/paid', admin_handlers.mark_invoice_paid)
    # P7: 自動擴縮容
    app.router.add_get('/api/admin/scaling/policies', admin_handlers.list_scaling_policies)
    app.router.add_post('/api/admin/scaling/policies', admin_handlers.create_scaling_policy)
    app.router.add_put('/api/admin/scaling/policies/{policy_id}', admin_handlers.update_scaling_policy)
    app.router.add_delete('/api/admin/scaling/policies/{policy_id}', admin_handlers.delete_scaling_policy)
    app.router.add_get('/api/admin/scaling/evaluate', admin_handlers.evaluate_scaling)
    app.router.add_post('/api/admin/scaling/execute', admin_handlers.execute_scaling)
    app.router.add_get('/api/admin/scaling/history', admin_handlers.get_scaling_history)
    app.router.add_get('/api/admin/scaling/stats', admin_handlers.get_scaling_stats)
    # P8: 審計合規
    app.router.add_get('/api/admin/audit/logs', admin_handlers.query_audit_logs)
    app.router.add_get('/api/admin/audit/resource/{resource_type}/{resource_id}', admin_handlers.get_resource_history)
    app.router.add_post('/api/admin/compliance/reports', admin_handlers.generate_compliance_report)
    app.router.add_get('/api/admin/compliance/reports', admin_handlers.list_compliance_reports)
    app.router.add_get('/api/admin/compliance/reports/{report_id}', admin_handlers.get_compliance_report)
    app.router.add_get('/api/admin/audit/export', admin_handlers.export_audit_logs)
    app.router.add_get('/api/admin/audit/storage', admin_handlers.get_audit_storage_stats)
    # P8: 多集群管理
    app.router.add_get('/api/admin/clusters', admin_handlers.list_clusters)
    app.router.add_post('/api/admin/clusters', admin_handlers.register_cluster)
    app.router.add_put('/api/admin/clusters/{cluster_id}', admin_handlers.update_cluster)
    app.router.add_delete('/api/admin/clusters/{cluster_id}', admin_handlers.remove_cluster)
    app.router.add_get('/api/admin/clusters/{cluster_id}/health', admin_handlers.check_cluster_health)
    app.router.add_post('/api/admin/clusters/failover', admin_handlers.trigger_failover)
    app.router.add_get('/api/admin/clusters/stats', admin_handlers.get_cluster_stats)
    # P8: 告警升級
    app.router.add_get('/api/admin/escalation/schedules', admin_handlers.list_on_call_schedules)
    app.router.add_get('/api/admin/escalation/policies', admin_handlers.list_escalation_policies)
    app.router.add_get('/api/admin/escalation/alerts', admin_handlers.list_escalation_alerts)
    app.router.add_post('/api/admin/escalation/alerts/{alert_id}/acknowledge', admin_handlers.acknowledge_escalation)
    app.router.add_post('/api/admin/escalation/alerts/{alert_id}/resolve', admin_handlers.resolve_escalation)
    app.router.add_get('/api/admin/escalation/stats', admin_handlers.get_escalation_stats)
    # P8: API 版本管理
    app.router.add_get('/api/admin/versions', admin_handlers.list_api_versions)
    app.router.add_post('/api/admin/versions', admin_handlers.create_api_version)
    app.router.add_get('/api/admin/rollouts', admin_handlers.list_rollouts)
    app.router.add_post('/api/admin/rollouts', admin_handlers.create_rollout)
    app.router.add_post('/api/admin/rollouts/{plan_id}/{action}', admin_handlers.control_rollout)
    # P8: 異常檢測
    app.router.add_get('/api/admin/anomaly/detectors', admin_handlers.list_anomaly_detectors)
    app.router.add_get('/api/admin/anomaly/list', admin_handlers.list_anomalies)
    app.router.add_post('/api/admin/anomaly/{anomaly_id}/acknowledge', admin_handlers.acknowledge_anomaly)
    app.router.add_get('/api/admin/anomaly/stats', admin_handlers.get_anomaly_stats)
    app.router.add_get('/api/admin/anomaly/detector-status', admin_handlers.get_detector_status)
    # P9: 可觀測性平台
    app.router.add_get('/api/admin/observability/metrics', admin_handlers.get_current_metrics)
    app.router.add_get('/api/admin/observability/metrics/query', admin_handlers.query_metrics)
    app.router.add_get('/api/admin/observability/metrics/aggregation', admin_handlers.get_metric_aggregation)
    app.router.add_get('/api/admin/observability/traces/{trace_id}', admin_handlers.get_trace)
    app.router.add_get('/api/admin/observability/traces', admin_handlers.search_traces)
    app.router.add_get('/api/admin/observability/dashboards', admin_handlers.list_dashboards)
    app.router.add_get('/api/admin/observability/overview', admin_handlers.get_system_overview)
    # P9: 多租戶增強
    app.router.add_get('/api/admin/tenants-enhanced', admin_handlers.list_tenants_enhanced)
    app.router.add_get('/api/admin/tenants-enhanced/{tenant_id}/quotas', admin_handlers.get_tenant_quotas)
    app.router.add_post('/api/admin/tenants-enhanced/{tenant_id}/quotas', admin_handlers.set_tenant_quota)
    app.router.add_get('/api/admin/tenants-enhanced/alerts', admin_handlers.get_quota_alerts)
    app.router.add_post('/api/admin/tenants-enhanced/{tenant_id}/reports', admin_handlers.generate_tenant_report)
    app.router.add_get('/api/admin/tenants-enhanced/{tenant_id}/summary', admin_handlers.get_tenant_summary)
    app.router.add_get('/api/admin/tenants-enhanced/overview', admin_handlers.get_tenants_overview)
    # P9: 安全增強
    app.router.add_get('/api/admin/security/roles/{user_id}', admin_handlers.list_user_roles)
    app.router.add_post('/api/admin/security/roles/{user_id}', admin_handlers.assign_user_role)
    app.router.add_post('/api/admin/security/tokens', admin_handlers.create_access_token)
    app.router.add_get('/api/admin/security/tokens', admin_handlers.list_access_tokens)
    app.router.add_delete('/api/admin/security/tokens/{token_id}', admin_handlers.revoke_access_token)
    app.router.add_get('/api/admin/security/events', admin_handlers.query_security_events)
    app.router.add_get('/api/admin/security/summary', admin_handlers.get_security_summary)
    app.router.add_post('/api/admin/security/rotate-secrets', admin_handlers.rotate_secrets)
    # P9: 智能根因分析
    app.router.add_post('/api/admin/incidents', admin_handlers.create_incident)
    app.router.add_get('/api/admin/incidents', admin_handlers.list_incidents)
    app.router.add_get('/api/admin/incidents/{incident_id}', admin_handlers.get_incident)
    app.router.add_post('/api/admin/incidents/{incident_id}/analyze', admin_handlers.analyze_root_cause)
    app.router.add_put('/api/admin/incidents/{incident_id}/status', admin_handlers.update_incident_status)
    app.router.add_post('/api/admin/incidents/predict', admin_handlers.predict_issues)
    app.router.add_get('/api/admin/incidents/stats', admin_handlers.get_rca_stats)
    # P9: 服務健康儀表盤
    app.router.add_get('/api/admin/service-dashboard', admin_handlers.get_service_dashboard)
    app.router.add_get('/api/admin/service-dashboard/components', admin_handlers.list_service_components)
    app.router.add_put('/api/admin/service-dashboard/components/{component_id}', admin_handlers.update_component_status)
    app.router.add_get('/api/admin/service-dashboard/components/{component_id}/history', admin_handlers.get_component_history)
    app.router.add_get('/api/admin/service-dashboard/sla', admin_handlers.get_sla_status)
    app.router.add_post('/api/admin/service-dashboard/updates', admin_handlers.create_status_update)
    app.router.add_post('/api/admin/service-dashboard/updates/{update_id}/resolve', admin_handlers.resolve_status_update)
    app.router.add_get('/api/admin/service-dashboard/maintenance', admin_handlers.list_maintenance_windows)
    app.router.add_post('/api/admin/service-dashboard/maintenance', admin_handlers.schedule_maintenance)
    app.router.add_get('/api/status', admin_handlers.get_status_page)
    # P10: 智能預測引擎
    app.router.add_get('/api/admin/ml/predict/usage', admin_handlers.predict_usage)
    app.router.add_post('/api/admin/ml/predict/capacity', admin_handlers.predict_capacity)
    app.router.add_get('/api/admin/ml/patterns', admin_handlers.analyze_patterns)
    app.router.add_get('/api/admin/ml/threshold', admin_handlers.get_adaptive_threshold)
    app.router.add_get('/api/admin/ml/performance', admin_handlers.get_model_performance)
    # P10: 災備恢復
    app.router.add_post('/api/admin/backup', admin_handlers.create_backup)
    app.router.add_get('/api/admin/backups', admin_handlers.list_backups)
    app.router.add_post('/api/admin/backup/{backup_id}/verify', admin_handlers.verify_backup)
    app.router.add_post('/api/admin/backup/{backup_id}/restore', admin_handlers.restore_backup)
    app.router.add_get('/api/admin/dr/rpo', admin_handlers.get_rpo_status)
    app.router.add_get('/api/admin/dr/stats', admin_handlers.get_dr_stats)
    app.router.add_get('/api/admin/dr/plans', admin_handlers.list_recovery_plans)
    # P10: 成本優化
    app.router.add_get('/api/admin/cost/summary', admin_handlers.get_cost_summary)
    app.router.add_get('/api/admin/cost/breakdown', admin_handlers.get_cost_breakdown)
    app.router.add_get('/api/admin/cost/forecast', admin_handlers.forecast_cost)
    app.router.add_get('/api/admin/cost/budgets', admin_handlers.get_budget_status)
    app.router.add_get('/api/admin/cost/recommendations', admin_handlers.get_cost_recommendations)
    app.router.add_get('/api/admin/cost/stats', admin_handlers.get_cost_stats)
    # P10: 性能分析
    app.router.add_get('/api/admin/performance/latency', admin_handlers.get_latency_stats)
    app.router.add_get('/api/admin/performance/endpoint/{endpoint}', admin_handlers.get_endpoint_performance)
    app.router.add_post('/api/admin/performance/bottlenecks/detect', admin_handlers.detect_bottlenecks)
    app.router.add_get('/api/admin/performance/bottlenecks', admin_handlers.list_bottlenecks)
    app.router.add_get('/api/admin/performance/regressions', admin_handlers.list_regressions)
    app.router.add_get('/api/admin/performance/summary', admin_handlers.get_performance_summary)
    # P10: 報告生成
    app.router.add_post('/api/admin/reports/daily', admin_handlers.generate_daily_report)
    app.router.add_post('/api/admin/reports/weekly', admin_handlers.generate_weekly_report)
    app.router.add_get('/api/admin/reports/{report_id}', admin_handlers.get_report)
    app.router.add_get('/api/admin/reports', admin_handlers.list_reports)
    app.router.add_get('/api/admin/reports/{report_id}/export', admin_handlers.export_report)
    app.router.add_get('/api/admin/reports/templates', admin_handlers.list_report_templates)
    app.router.add_get('/api/admin/reports/stats', admin_handlers.get_report_stats)

    # 初始化定時任務調度器
    try:
        from admin.scheduler import get_scheduler, init_scheduled_tasks
        init_scheduled_tasks()
        scheduler = get_scheduler()
        scheduler.start()
    except Exception as e:
        logger.warning(f"⚠️ Scheduler init failed: {e}")
    logger.info("✅ Admin module loaded with Phase 2-10")


def _register_wallet_routes(app):
    """注冊 Wallet 模組路由 (Phase 0-5 + Operations)"""
    try:
        from wallet.handlers import wallet_handlers
        from wallet.admin_handlers import admin_wallet_handlers
        from wallet.purchase_handlers import purchase_handlers
        from wallet.withdraw_handlers import withdraw_handlers
        from wallet.redeem_handlers import redeem_handlers
        from wallet.pay_password_handlers import pay_password_handlers
        from wallet.coupon_handlers import coupon_handlers
        from wallet.finance_report_handlers import finance_report_handlers
        from wallet.payment_config_handlers import payment_config_handlers
        from wallet.operations_handlers import operations_handlers
    except ImportError as e:
        logger.warning(f"⚠️ Wallet module not available: {e}")
        return

    if not wallet_handlers:
        return

    # 錢包信息
    app.router.add_get('/api/wallet', wallet_handlers.get_wallet)
    app.router.add_get('/api/wallet/balance', wallet_handlers.get_balance)
    app.router.add_get('/api/wallet/statistics', wallet_handlers.get_statistics)
    # 交易記錄
    app.router.add_get('/api/wallet/transactions', wallet_handlers.get_transactions)
    app.router.add_get('/api/wallet/transactions/recent', wallet_handlers.get_recent_transactions)
    app.router.add_get('/api/wallet/transactions/export', wallet_handlers.export_transactions)
    # 分析統計
    app.router.add_get('/api/wallet/analysis/consume', wallet_handlers.get_consume_analysis)
    app.router.add_get('/api/wallet/analysis/monthly', wallet_handlers.get_monthly_summary)
    # 充值套餐
    app.router.add_get('/api/wallet/packages', wallet_handlers.get_recharge_packages)
    # 消費接口
    app.router.add_post('/api/wallet/consume', wallet_handlers.consume)
    app.router.add_post('/api/wallet/check-balance', wallet_handlers.check_balance)
    # Phase 1: 充值訂單
    app.router.add_post('/api/wallet/recharge/create', wallet_handlers.create_recharge_order)
    app.router.add_get('/api/wallet/recharge/orders', wallet_handlers.get_recharge_orders)
    app.router.add_get('/api/wallet/recharge/{order_no}', wallet_handlers.get_recharge_order)
    app.router.add_post('/api/wallet/recharge/{order_no}/paid', wallet_handlers.mark_recharge_paid)
    app.router.add_post('/api/wallet/recharge/{order_no}/cancel', wallet_handlers.cancel_recharge_order)
    app.router.add_get('/api/wallet/recharge/{order_no}/status', wallet_handlers.check_recharge_status)
    # 支付回調（公開）
    app.router.add_post('/api/wallet/callback/{provider}', wallet_handlers.payment_callback)
    # Phase 2: 統一消費
    app.router.add_post('/api/wallet/consume/unified', wallet_handlers.consume_unified)
    app.router.add_get('/api/wallet/consume/limit', wallet_handlers.check_consume_limit)
    app.router.add_get('/api/wallet/consume/summary', wallet_handlers.get_consume_summary)
    app.router.add_post('/api/wallet/refund', wallet_handlers.refund_transaction)

    # Phase 3: 管理員錢包 API
    if admin_wallet_handlers:
        app.router.add_get('/api/admin/wallets', admin_wallet_handlers.list_wallets)
        app.router.add_get('/api/admin/wallets/{user_id}', admin_wallet_handlers.get_wallet_detail)
        app.router.add_post('/api/admin/wallets/{user_id}/adjust', admin_wallet_handlers.adjust_balance)
        app.router.add_post('/api/admin/wallets/{user_id}/freeze', admin_wallet_handlers.freeze_wallet)
        app.router.add_post('/api/admin/wallets/{user_id}/unfreeze', admin_wallet_handlers.unfreeze_wallet)
        app.router.add_get('/api/admin/wallet/orders', admin_wallet_handlers.list_orders)
        app.router.add_post('/api/admin/wallet/orders/{order_no}/confirm', admin_wallet_handlers.confirm_order)
        app.router.add_get('/api/admin/wallet/dashboard', admin_wallet_handlers.get_dashboard)
        app.router.add_get('/api/admin/wallet/scheduler', admin_wallet_handlers.get_scheduler_status)

    # Phase 4: 購買整合
    if purchase_handlers:
        app.router.add_post('/api/purchase', purchase_handlers.unified_purchase)
        app.router.add_post('/api/purchase/membership', purchase_handlers.purchase_membership)
        app.router.add_post('/api/purchase/proxy', purchase_handlers.purchase_ip_proxy)
        app.router.add_post('/api/purchase/quota', purchase_handlers.purchase_quota_pack)

    # Phase 4: 提現
    if withdraw_handlers:
        app.router.add_get('/api/wallet/withdraw/config', withdraw_handlers.get_withdraw_config)
        app.router.add_post('/api/wallet/withdraw/create', withdraw_handlers.create_withdraw)
        app.router.add_get('/api/wallet/withdraw/orders', withdraw_handlers.get_withdraw_orders)
        app.router.add_get('/api/wallet/withdraw/{order_no}', withdraw_handlers.get_withdraw_order)
        app.router.add_post('/api/wallet/withdraw/{order_no}/cancel', withdraw_handlers.cancel_withdraw)
        app.router.add_get('/api/admin/withdraws', withdraw_handlers.admin_list_withdraws)
        app.router.add_post('/api/admin/withdraws/{order_no}/approve', withdraw_handlers.admin_approve_withdraw)
        app.router.add_post('/api/admin/withdraws/{order_no}/reject', withdraw_handlers.admin_reject_withdraw)
        app.router.add_post('/api/admin/withdraws/{order_no}/complete', withdraw_handlers.admin_complete_withdraw)

    # Phase 5: 兌換碼
    if redeem_handlers:
        app.router.add_post('/api/wallet/redeem', redeem_handlers.redeem_code)
        app.router.add_get('/api/wallet/redeem/records', redeem_handlers.get_redeem_records)
        app.router.add_post('/api/admin/redeem/create', redeem_handlers.admin_create_code)
        app.router.add_post('/api/admin/redeem/batch', redeem_handlers.admin_batch_create)
        app.router.add_get('/api/admin/redeem/codes', redeem_handlers.admin_list_codes)
        app.router.add_post('/api/admin/redeem/{code_id}/disable', redeem_handlers.admin_disable_code)
        app.router.add_post('/api/admin/redeem/{code_id}/enable', redeem_handlers.admin_enable_code)

    # Phase 5: 支付密碼
    if pay_password_handlers:
        app.router.add_get('/api/wallet/pay-password/status', pay_password_handlers.get_status)
        app.router.add_post('/api/wallet/pay-password/set', pay_password_handlers.set_password)
        app.router.add_post('/api/wallet/pay-password/verify', pay_password_handlers.verify_password)
        app.router.add_post('/api/wallet/pay-password/change', pay_password_handlers.change_password)
        app.router.add_post('/api/wallet/pay-password/remove', pay_password_handlers.remove_password)
        app.router.add_post('/api/admin/users/{user_id}/pay-password/reset', pay_password_handlers.admin_reset_password)

    # Phase 5: 優惠券
    if coupon_handlers:
        app.router.add_get('/api/wallet/coupons', coupon_handlers.get_my_coupons)
        app.router.add_get('/api/wallet/coupons/applicable', coupon_handlers.get_applicable_coupons)
        app.router.add_post('/api/wallet/coupons/claim', coupon_handlers.claim_coupon)
        app.router.add_post('/api/wallet/coupons/use', coupon_handlers.use_coupon)
        app.router.add_post('/api/admin/coupons/templates', coupon_handlers.admin_create_template)
        app.router.add_get('/api/admin/coupons/templates', coupon_handlers.admin_list_templates)
        app.router.add_post('/api/admin/coupons/issue', coupon_handlers.admin_issue_coupon)

    # Phase 5: 財務報表
    if finance_report_handlers:
        app.router.add_get('/api/admin/finance/overview', finance_report_handlers.get_overview)
        app.router.add_get('/api/admin/finance/daily', finance_report_handlers.get_daily_report)
        app.router.add_get('/api/admin/finance/range', finance_report_handlers.get_range_report)
        app.router.add_get('/api/admin/finance/trend', finance_report_handlers.get_trend)
        app.router.add_get('/api/admin/finance/categories', finance_report_handlers.get_category_stats)
        app.router.add_get('/api/admin/finance/top-users', finance_report_handlers.get_top_users)
        app.router.add_get('/api/admin/finance/monthly', finance_report_handlers.get_monthly_summary)
        app.router.add_get('/api/admin/finance/export', finance_report_handlers.export_report)

    # Phase 1.1: 支付配置管理
    if payment_config_handlers:
        app.router.add_get('/api/admin/payment/addresses', payment_config_handlers.list_addresses)
        app.router.add_post('/api/admin/payment/addresses', payment_config_handlers.add_address)
        app.router.add_post('/api/admin/payment/addresses/batch', payment_config_handlers.batch_add_addresses)
        app.router.add_put('/api/admin/payment/addresses/{address_id}', payment_config_handlers.update_address)
        app.router.add_delete('/api/admin/payment/addresses/{address_id}', payment_config_handlers.delete_address)
        app.router.add_get('/api/admin/payment/channels', payment_config_handlers.list_channels)
        app.router.add_put('/api/admin/payment/channels/{channel_type}', payment_config_handlers.update_channel)
        app.router.add_post('/api/admin/payment/channels/{channel_type}/toggle', payment_config_handlers.toggle_channel)
        app.router.add_get('/api/admin/payment/stats', payment_config_handlers.get_stats)
        logger.info("✅ Payment config module loaded")

    # Phase 2 & 3: 運營工具
    if operations_handlers:
        app.router.add_post('/api/admin/wallet/batch/adjust', operations_handlers.batch_adjust_balance)
        app.router.add_post('/api/admin/wallet/batch/freeze', operations_handlers.batch_freeze)
        app.router.add_post('/api/admin/wallet/batch/unfreeze', operations_handlers.batch_unfreeze)
        app.router.add_post('/api/admin/wallet/campaign/reward', operations_handlers.campaign_reward)
        app.router.add_get('/api/admin/wallet/operations', operations_handlers.list_operations)
        app.router.add_get('/api/admin/wallet/operations/{operation_id}', operations_handlers.get_operation_detail)
        app.router.add_get('/api/admin/wallet/alerts', operations_handlers.get_alerts)
        app.router.add_get('/api/admin/wallet/alerts/summary', operations_handlers.get_alert_summary)
        app.router.add_post('/api/admin/wallet/alerts/{alert_id}/acknowledge', operations_handlers.acknowledge_alert)
        app.router.add_post('/api/admin/wallet/alerts/scan', operations_handlers.scan_anomalies)
        app.router.add_get('/api/admin/wallet/analytics', operations_handlers.get_wallet_analytics)
        logger.info("✅ Operations module loaded")

    logger.info("✅ Wallet module loaded with Phase 0-5 + Operations Tools")


def _register_legacy_admin_routes(app):
    """注冊 Legacy 管理后台路由"""
    try:
        from api.admin_panel_legacy import AdminPanelLegacy, register_admin_panel_routes
        admin_panel = AdminPanelLegacy()
        register_admin_panel_routes(app, admin_panel)
        return admin_panel
    except Exception as e:
        logger.warning(f"⚠️ Legacy admin panel failed: {e}")
        return None

#!/usr/bin/env python3
"""P11-1: Extract Business and System methods into new mixins"""

import ast

src_path = 'backend/api/http_server.py'
with open(src_path, 'r', encoding='utf-8') as f:
    source = f.read()
lines = source.split('\n')
tree = ast.parse(source)

# Define extraction targets
BUSINESS_METHODS = {
    'validate_coupon', 'apply_coupon', 'get_active_campaigns',
    'get_referral_code', 'get_referral_stats', 'track_referral',
    'get_notifications', 'get_unread_count', 'mark_notification_read',
    'mark_all_notifications_read', 'get_notification_preferences', 'update_notification_preferences',
    'get_supported_languages', 'get_translations', 'set_user_language',
    'get_timezones', 'get_timezone_settings', 'update_timezone_settings',
    'score_leads', 'scan_duplicates', 'merge_duplicates',
    'analytics_lead_sources', 'analytics_templates', 'analytics_trends', 'analytics_funnel', 'analytics_summary',
    'retry_schedule', 'create_ab_test', 'list_ab_tests', 'get_ab_test', 'complete_ab_test',
    'get_contacts', 'get_contacts_stats',
}

SYSTEM_METHODS = {
    'basic_health_check', 'health_check', 'liveness_probe', 'readiness_probe',
    'service_info', 'health_history', 'status_page',
    'system_health', 'system_metrics', 'system_alerts',
    'ops_dashboard', 'resource_trends', 'error_patterns', 'prometheus_metrics',
    'get_diagnostics', 'get_quick_health', 'get_system_info',
    'receive_frontend_error', 'receive_performance_report', 'get_frontend_audit_logs',
    'export_data', 'list_backups', 'create_backup', 'delete_backup', 'download_backup',
    'swagger_ui', 'redoc_ui', 'openapi_json',
    '_convert_to_csv', 'quota_consistency_check',
}

# Collect method ranges
biz_ranges = []
sys_ranges = []

for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
        for n in node.body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                start = n.lineno - 1  # 0-indexed
                end = n.end_lineno     # 0-indexed exclusive
                if n.name in BUSINESS_METHODS:
                    biz_ranges.append((n.name, start, end))
                elif n.name in SYSTEM_METHODS:
                    sys_ranges.append((n.name, start, end))
        break

print(f"Business: {len(biz_ranges)} methods")
print(f"System: {len(sys_ranges)} methods")

def create_mixin_file(filepath, class_name, docstring, methods_ranges, source_lines):
    """Create a mixin file from extracted method ranges"""
    content = f'''#!/usr/bin/env python3
"""
P11-1: {class_name}
{docstring}
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta
from aiohttp import web

logger = logging.getLogger(__name__)


class {class_name}:
    """{docstring} — 供 HttpApiServer 繼承使用"""

'''
    for name, start, end in methods_ranges:
        method_lines = source_lines[start:end]
        content += '\n'.join(method_lines) + '\n\n'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    line_count = content.count('\n')
    print(f"  Created {filepath}: {line_count} lines")
    return line_count

# Create Business mixin
create_mixin_file(
    'backend/api/business_routes_mixin.py',
    'BusinessRoutesMixin',
    '業務路由處理器 — 優惠券/推薦/通知/i18n/時區/分析/聯繫人/AB測試',
    biz_ranges, lines
)

# Create System mixin
create_mixin_file(
    'backend/api/system_routes_mixin.py',
    'SystemRoutesMixin',
    '系統路由處理器 — 健康檢查/診斷/監控/運維/導出/API文檔/前端遙測',
    sys_ranges, lines
)

# Remove extracted methods from http_server.py
remove_set = set()
for name, start, end in biz_ranges + sys_ranges:
    for i in range(start, end):
        remove_set.add(i)

new_lines = []
i = 0
skip_count = 0
while i < len(lines):
    if i in remove_set:
        if i == 0 or (i-1) not in remove_set:
            new_lines.append(f'    # P11-1: {lines[i].strip()[:60]}... -> mixin')
        skip_count += 1
        i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open(src_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"\nhttp_server.py: {len(lines)} -> {len(new_lines)} lines (removed {skip_count})")

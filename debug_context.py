#!/usr/bin/env python3
"""調試租戶上下文"""
import os

print("=== Debug Tenant Context ===")
print(f"ELECTRON_MODE: {os.environ.get('ELECTRON_MODE', 'not set')}")

# 嘗試導入租戶上下文
try:
    from core.tenant_context import get_current_tenant, TenantContext
    print("✅ tenant_context module imported successfully")
    
    tenant = get_current_tenant()
    if tenant:
        print(f"✅ Current tenant: user_id={tenant.user_id}, role={tenant.role}")
    else:
        print("❌ No current tenant (None)")
except ImportError as e:
    print(f"❌ Failed to import tenant_context: {e}")
except Exception as e:
    print(f"❌ Error getting tenant: {e}")

# 檢查 database.py 中的 get_all_accounts 邏輯
print("\n=== Simulating get_all_accounts ===")
owner_user_id = None

try:
    from core.tenant_context import get_current_tenant
    tenant = get_current_tenant()
    if tenant and tenant.user_id:
        owner_user_id = tenant.user_id
        print(f"✅ Got owner_user_id from context: {owner_user_id}")
    else:
        print("❌ No tenant context available")
except ImportError:
    print("❌ ImportError for tenant_context")

is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
print(f"is_electron: {is_electron}")
print(f"owner_user_id: {owner_user_id}")

if is_electron or not owner_user_id:
    print("⚠️ Would return ALL accounts (no filtering)")
else:
    print(f"✅ Would filter by owner_user_id = {owner_user_id}")

#!/usr/bin/env python3
"""P9-1: Extract auth/quota/payment methods from http_server.py into mixin files"""
import sys

src_path = 'backend/api/http_server.py'
lines = open(src_path, 'r', encoding='utf-8').readlines()
print(f"Source: {len(lines)} lines")

# ====== Define extraction ranges (0-indexed) ======
AUTH_START, AUTH_END = 1558, 3767    # L1559-3767
QUOTA_START, QUOTA_END = 3848, 4257  # L3849-4257
PAY_START, PAY_END = 4257, 4958      # L4258-4958

# Verify boundaries
assert '====================' in lines[AUTH_START], f"Auth start mismatch: {lines[AUTH_START]}"
assert '====================' in lines[QUOTA_START], f"Quota start mismatch: {lines[QUOTA_START]}"
assert '====================' in lines[PAY_START], f"Payment start mismatch: {lines[PAY_START]}"

# ====== Extract blocks ======
auth_methods = lines[AUTH_START:AUTH_END]
quota_methods = lines[QUOTA_START:QUOTA_END]
pay_methods = lines[PAY_START:PAY_END]

print(f"Auth: {len(auth_methods)} lines")
print(f"Quota: {len(quota_methods)} lines")
print(f"Payment: {len(pay_methods)} lines")

# ====== Write auth_routes_mixin.py ======
HEADER_AUTH = '''#!/usr/bin/env python3
"""
P9-1: Auth Routes Mixin
Extracted from http_server.py (~2,200 lines)

Contains: user register/login/logout, JWT refresh, OAuth (Telegram/Google),
device management, security events, email verification, password reset,
QR code login, WebSocket login

Usage: HttpApiServer(AuthRoutesMixin, ...) inheritance
"""
import logging

logger = logging.getLogger(__name__)


class AuthRoutesMixin:
    """Auth route handlers mixin"""

'''

with open('backend/api/auth_routes_mixin.py', 'w', encoding='utf-8') as f:
    f.write(HEADER_AUTH)
    for line in auth_methods:
        f.write(line)
    f.write('\n')
print("Created auth_routes_mixin.py")

# ====== Write quota_routes_mixin.py ======
HEADER_QUOTA = '''#!/usr/bin/env python3
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

'''

with open('backend/api/quota_routes_mixin.py', 'w', encoding='utf-8') as f:
    f.write(HEADER_QUOTA)
    for line in quota_methods:
        f.write(line)
    f.write('\n')
print("Created quota_routes_mixin.py")

# ====== Write payment_routes_mixin.py ======
HEADER_PAY = '''#!/usr/bin/env python3
"""
P9-1: Payment Routes Mixin
Extracted from http_server.py (~700 lines)

Contains: subscriptions, Stripe/PayPal/Alipay/WeChat webhooks, invoices,
financial reports, quota packs, billing, overage, freeze status

Usage: HttpApiServer(..., PaymentRoutesMixin, ...) inheritance
"""
import logging

logger = logging.getLogger(__name__)


class PaymentRoutesMixin:
    """Payment/subscription route handlers mixin"""

'''

with open('backend/api/payment_routes_mixin.py', 'w', encoding='utf-8') as f:
    f.write(HEADER_PAY)
    for line in pay_methods:
        f.write(line)
    f.write('\n')
print("Created payment_routes_mixin.py")

# ====== Update http_server.py ======
new_lines = []
i = 0
while i < len(lines):
    if i == PAY_START:
        new_lines.append('    # P9-1: Payment/subscription routes extracted to api/payment_routes_mixin.py (~700 lines)\n')
        new_lines.append('\n')
        i = PAY_END
    elif i == QUOTA_START:
        new_lines.append('    # P9-1: Quota/usage routes extracted to api/quota_routes_mixin.py (~400 lines)\n')
        new_lines.append('\n')
        i = QUOTA_END
    elif i == AUTH_START:
        new_lines.append('    # P9-1: Auth routes extracted to api/auth_routes_mixin.py (~2,200 lines)\n')
        new_lines.append('\n')
        i = AUTH_END
    else:
        new_lines.append(lines[i])
        i += 1

with open(src_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

removed = len(lines) - len(new_lines)
print(f"\nhttp_server.py: {len(lines)} -> {len(new_lines)} lines (removed {removed})")
print("Done!")

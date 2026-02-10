#!/usr/bin/env python3
"""
P9-1 → P13-1: Auth Routes Mixin (Facade)

Originally 2,451 lines, now split into 3 sub-mixins:
  - AuthCoreMixin: login/register/JWT/email/password/devices (1,176 lines)
  - AuthOAuthMixin: Telegram/Google OAuth, QR/deep-link login (1,020 lines)
  - AuthSecurityMixin: 2FA/TOTP, API keys, security events (338 lines)

HttpApiServer inherits AuthRoutesMixin, which aggregates all 3 sub-mixins.
This preserves backward compatibility — no changes needed in http_server.py.
"""

from api.auth_core_mixin import AuthCoreMixin
from api.auth_oauth_mixin import AuthOAuthMixin
from api.auth_security_mixin import AuthSecurityMixin


class AuthRoutesMixin(AuthCoreMixin, AuthOAuthMixin, AuthSecurityMixin):
    """Auth route handlers — facade aggregating 3 sub-mixins (P13-1)

    Sub-mixins:
      - AuthCoreMixin: 28 methods (register, login, JWT, profile, email, password)
      - AuthOAuthMixin: 15 methods (Telegram, Google, QR code, deep link)
      - AuthSecurityMixin: 13 methods (2FA, API keys, security events, devices)
    """
    pass

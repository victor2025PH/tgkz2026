"""
TG-AI智控王 管理後台模塊
Phase 1: 基礎穩固

模塊結構：
├── schema_adapter.py   - 表結構統一適配器
├── audit_logger.py     - 操作審計日誌
├── error_handler.py    - 錯誤處理系統
├── password_policy.py  - 密碼策略管理
├── proxy_pool.py       - 靜態代理池管理
└── handlers.py         - API 處理器
"""

from .schema_adapter import UserSchemaAdapter, SchemaType, UserDTO, user_adapter
from .audit_logger import AuditLogger, audit_log, AuditAction, AuditCategory
from .error_handler import (
    AdminError, ErrorCode, error_response, success_response, handle_exception
)
from .password_policy import (
    PasswordValidator, PasswordPolicy, PasswordValidationResult,
    PasswordHistoryManager, password_validator, password_history
)
from .proxy_pool import (
    ProxyPoolManager, StaticProxy, ProxyStatus, ProxyType, get_proxy_pool
)
from .handlers import AdminHandlers, admin_handlers

__all__ = [
    # Schema Adapter
    'UserSchemaAdapter', 'SchemaType', 'UserDTO', 'user_adapter',
    # Audit Logger
    'AuditLogger', 'audit_log', 'AuditAction', 'AuditCategory',
    # Error Handler
    'AdminError', 'ErrorCode', 'error_response', 'success_response', 'handle_exception',
    # Password Policy
    'PasswordValidator', 'PasswordPolicy', 'PasswordValidationResult',
    'PasswordHistoryManager', 'password_validator', 'password_history',
    # Proxy Pool
    'ProxyPoolManager', 'StaticProxy', 'ProxyStatus', 'ProxyType', 'get_proxy_pool',
    # Handlers
    'AdminHandlers', 'admin_handlers'
]

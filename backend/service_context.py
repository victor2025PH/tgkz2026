"""
ServiceContext - Shared dependency container for all domain handlers.

Created as part of the main.py refactoring to decouple handler logic
from BackendService. All extracted handlers receive a ServiceContext
instead of referencing BackendService directly.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from database import Database

_service_context: Optional['ServiceContext'] = None


@dataclass
class ServiceContext:
    """Encapsulates all shared dependencies that handlers need."""

    # --- Core ---
    db: Any = None                          # Database instance
    telegram_manager: Any = None            # TelegramClientManager
    send_event: Optional[Callable] = None   # send_event(event_name, payload, message_id=None, tenant_id=None)
    send_log: Optional[Callable] = None     # send_log(message, log_type='info')
    message_queue: Any = None               # MessageQueue
    is_monitoring: bool = False             # Global monitoring state (read via backend_service ref)

    # --- Managers ---
    alert_manager: Any = None
    backup_manager: Any = None
    smart_alert_manager: Any = None
    proxy_rotation_manager: Any = None
    enhanced_health_monitor: Any = None
    queue_optimizer: Any = None
    error_recovery_manager: Any = None
    qr_auth_manager: Any = None
    ip_binding_manager: Any = None
    credential_scraper: Any = None
    batch_ops: Any = None

    # --- Helpers ---
    send_accounts_updated: Optional[Callable] = None   # async (owner_user_id=None) -> None
    save_session_metadata: Optional[Callable] = None    # async (phone, metadata) -> None
    invalidate_cache: Optional[Callable] = None         # (cache_key) -> None
    start_log_batch_mode: Optional[Callable] = None
    stop_log_batch_mode: Optional[Callable] = None

    # --- Cache (shared mutable state) ---
    cache: Dict[str, Any] = field(default_factory=dict)
    cache_timestamps: Dict[str, Any] = field(default_factory=dict)

    # --- Back-reference (escape hatch for edge cases) ---
    backend_service: Any = None


def set_service_context(ctx: ServiceContext) -> None:
    """Set the global ServiceContext singleton."""
    global _service_context
    _service_context = ctx


def get_service_context() -> ServiceContext:
    """Get the global ServiceContext singleton. Raises if not initialized."""
    if _service_context is None:
        raise RuntimeError("ServiceContext not initialized. Call set_service_context() first.")
    return _service_context

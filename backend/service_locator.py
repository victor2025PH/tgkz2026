"""
Service Locator - Centralized access to lazy-loaded services and helper functions.

This module re-exports all _LazyModuleProxy instances and get_* helper functions
that were originally defined in main.py at module level. After the handler
extraction refactoring, _impl.py files need a way to access these without
importing from main.py (which would cause circular imports).

Usage in _impl.py files:
    from service_locator import private_message_poller, get_batch_ops
"""
from __future__ import annotations

import importlib
import sys
from typing import Any

# ============================================================
# Lazy module loading infrastructure (copied from main.py)
# ============================================================

_module_cache: dict[str, Any] = {}


def _get_module(name: str):
    """Load a module lazily (cached)."""
    if name not in _module_cache:
        try:
            _module_cache[name] = importlib.import_module(name)
        except ImportError as e:
            print(f"[ServiceLocator] Failed to import {name}: {e}", file=sys.stderr)
            raise
    return _module_cache[name]


class _LazyModuleProxy:
    """Lazy module proxy - loads the real module on first attribute access."""

    def __init__(self, module_name: str, attr_name: str | None = None):
        self._module_name = module_name
        self._attr_name = attr_name
        self._loaded = None

    def _load(self):
        if self._loaded is None:
            module = _get_module(self._module_name)
            if self._attr_name:
                self._loaded = getattr(module, self._attr_name, module)
            else:
                self._loaded = module
        return self._loaded

    def __getattr__(self, name):
        return getattr(self._load(), name)

    def __call__(self, *args, **kwargs):
        return self._load()(*args, **kwargs)

    def __bool__(self):
        try:
            self._load()
            return True
        except Exception:
            return False


# ============================================================
# Lazy proxy instances (mirrors main.py definitions)
# ============================================================

# Telegram services
private_message_poller = _LazyModuleProxy('private_message_poller', 'private_message_poller')
group_join_service = _LazyModuleProxy('group_join_service', 'group_join_service')
member_extraction_service = _LazyModuleProxy('member_extraction_service', 'member_extraction_service')

# AI services
ai_context = _LazyModuleProxy('ai_context_manager', 'ai_context')
ai_auto_chat = _LazyModuleProxy('ai_auto_chat', 'ai_auto_chat')
vector_memory = _LazyModuleProxy('vector_memory', 'vector_memory')
auto_funnel = _LazyModuleProxy('auto_funnel_manager', 'auto_funnel')

# Monitoring services
connection_monitor = _LazyModuleProxy('connection_monitor', 'connection_monitor')
resource_discovery = _LazyModuleProxy('resource_discovery', 'resource_discovery')
discussion_watcher = _LazyModuleProxy('discussion_watcher', 'discussion_watcher')

# Search services
group_search_service = _LazyModuleProxy('group_search_service', 'group_search_service')
jiso_search_service = _LazyModuleProxy('jiso_search_service', 'jiso_search_service')

# Private message handler
private_message_handler = _LazyModuleProxy('private_message_handler', 'private_message_handler')

# Marketing services
marketing_outreach_service = _LazyModuleProxy('marketing_outreach_service', 'marketing_outreach_service')

# Scheduler
scheduler = _LazyModuleProxy('scheduler', 'scheduler')


# ============================================================
# get_* helper functions (mirrors main.py definitions)
# ============================================================

# --- Factory / init functions: return the function itself (caller will invoke it) ---

def get_init_group_poller():
    return _get_module('group_message_poller').init_group_poller

def get_group_poller():
    return _get_module('group_message_poller').get_group_poller

def get_init_search_engine():
    return _get_module('fulltext_search').init_search_engine

def get_init_batch_operations():
    return _get_module('batch_operations').init_batch_operations

# --- Class references: return the class itself ---

def get_SpintaxGenerator():
    return _get_module('ad_template').SpintaxGenerator

def get_MemberExtractionService():
    return _get_module('member_extraction_service').MemberExtractionService

def get_BackupManager():
    return _get_module('backup_manager').BackupManager

def get_DeviceFingerprintGenerator():
    return _get_module('device_fingerprint').DeviceFingerprintGenerator

def get_ProxyManager():
    return _get_module('proxy_manager').ProxyManager

def get_WarmupManager():
    return _get_module('warmup_manager').WarmupManager

def get_DiscoveredResource():
    return _get_module('resource_discovery').DiscoveredResource

# --- Instance getters: call the underlying function to return the instance ---

def get_search_engine():
    return _get_module('fulltext_search').get_search_engine()

def get_batch_ops():
    return _get_module('batch_operations').get_batch_ops()

def get_ad_template_manager():
    return _get_module('ad_template').get_ad_template_manager()

def get_ad_manager():
    return _get_module('ad_manager').get_ad_manager()

def get_ad_broadcaster():
    return _get_module('ad_broadcaster').get_ad_broadcaster()

def get_ad_scheduler():
    return _get_module('ad_scheduler').get_ad_scheduler()

def get_ad_analytics():
    return _get_module('ad_analytics').get_ad_analytics()

def get_user_tracker():
    return _get_module('user_tracker').get_user_tracker()

def get_user_analytics():
    return _get_module('user_analytics').get_user_analytics()

def get_campaign_orchestrator():
    return _get_module('campaign_orchestrator').get_campaign_orchestrator()

def get_multi_channel_stats():
    return _get_module('multi_channel_stats').get_multi_channel_stats()

def get_marketing_task_service():
    return _get_module('marketing_task_service').get_marketing_task_service()

def get_script_engine():
    return _get_module('script_engine').get_script_engine()

def get_collaboration_coordinator():
    return _get_module('collaboration_coordinator').get_collaboration_coordinator()

def get_multi_role_manager():
    return _get_module('multi_role_manager').get_multi_role_manager()

def get_cache_manager():
    return _get_module('cache_manager').get_cache_manager()

def get_backup_manager():
    return _get_module('backup_manager').get_backup_manager()

# --- Knowledge base singletons ---

def get_knowledge_search_engine():
    """Return the knowledge_base.search_engine singleton."""
    return _get_module('knowledge_base').search_engine

def get_document_manager():
    """Return the knowledge_base.document_manager singleton."""
    return _get_module('knowledge_base').document_manager

def get_media_manager():
    """Return the knowledge_base.media_manager singleton."""
    return _get_module('knowledge_base').media_manager

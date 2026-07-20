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
# 🎯 精簡獲客模式 (Lean Acquisition Mode)：AI 專屬懶加載代理的集中式 Null Object 改造
# ------------------------------------------------------------
# 背景：Stage 1 已在 lead_actions_mixin._get_ai_auto_chat() 等少數幾處特別攔截了
# AI 開關，但只要有代碼直接使用 service_locator.ai_auto_chat / auto_funnel /
# vector_memory（或它們的屬性/方法），_LazyModuleProxy 仍會透過 __getattr__ /
# __call__ / __bool__ 觸發 importlib.import_module 真實加載重量級 AI 模塊。
#
# 這裡把「AI 關閉時不應該真的 import AI 模塊，而是回退成安全空對象」的判斷收口到
# service_locator 這一處：只影響下面四個 AI 專屬代理（ai_context / ai_auto_chat /
# vector_memory / auto_funnel）以及三個 get_*_manager() 工廠函數，不影響其他任何
# 非 AI 的 _LazyModuleProxy 實例（如 private_message_poller、group_join_service 等
# 仍保持原有的真實懶加載行為，不做任何改動）。
#
# 向後兼容保證：ENABLE_AI=True（默認，不設任何環境變量）時，下面新增的
# _AiLazyModuleProxy 與 get_script_engine() / get_collaboration_coordinator() /
# get_multi_role_manager() 的行為與改動前完全一致（原樣委派給真實懶加載邏輯）。
# 只有 ENABLE_AI=False 這條路徑是新增的安全短路。
# ============================================================

def _ai_enabled() -> bool:
    """
    AI 能力是否啟用（讀取 config.ENABLE_AI）。

    導入失敗時默認返回 True —— 保守 / 兼容優先，絕不能因為這個輔助函數本身
    出錯而影響其他非 AI 功能的正常運作。
    """
    try:
        from config import ENABLE_AI
        return ENABLE_AI
    except Exception:
        return True


class _NullAiResult:
    """
    AI 關閉時使用的安全空對象（Null Object）。

    設計目標：讓任意形式的調用鏈都不拋異常、不誤觸發副作用：
    - 任意屬性訪問（包括鏈式訪問，如 `.settings.get(...)`、`.autonomous_engine`）
      都返回自身，永不 AttributeError。
    - 可被當作函數調用（`ai_auto_chat.process_incoming_message(...)`），調用結果
      仍是自身，方便繼續鏈式調用/取屬性。
    - 可被 await（`await auto_funnel.analyze_message(...)`），await 結果仍是自身。
    - 布爾值恆為 False（`if ai_auto_chat:` / `if not auto_funnel.is_running:` 等
      判斷都能得到「未啟用/空」的正確語義）。
    - 支持 dict 風格的 `.get(key, default)`，讓 `analysis.get('should_advance')`
      這類調用安全返回 None/自定義默認值（falsy，不會誤觸發漏斗階段推進等副作用）。
    - `__str__` 為空字符串、可安全被 JSON 序列化（`text_utils.safe_json_dumps` 對
      不可序列化對象會 fallback 到 `str()`），即使不小心被塞進事件 payload 也不會
      拋異常中斷主流程。
    """

    __slots__ = ()

    def __getattr__(self, _name):
        return self

    def __call__(self, *_args, **_kwargs):
        return self

    def __await__(self):
        async def _noop():
            return self
        return _noop().__await__()

    def __bool__(self):
        return False

    def __len__(self):
        return 0

    def __iter__(self):
        return iter(())

    def __contains__(self, _item):
        return False

    def __getitem__(self, _key):
        return None

    def get(self, _key=None, default=None):
        """兼容 dict.get(key, default)，讓 analysis.get('should_advance') 等安全返回 falsy 值。"""
        return default

    def __repr__(self):
        return '<NullAiResult: AI disabled>'

    def __str__(self):
        return ''


# 全局共享單例即可：Null Object 本身無狀態，不需要每個代理各自持有一份
_NULL_AI_RESULT = _NullAiResult()


class _AiLazyModuleProxy(_LazyModuleProxy):
    """
    AI 專屬懶加載代理 —— 僅用於 ai_context / ai_auto_chat / vector_memory / auto_funnel。

    ENABLE_AI=True（默認）：與 _LazyModuleProxy 行為完全一致，真實懶加載一字不變。
    ENABLE_AI=False（精簡獲客模式）：不觸發 importlib 真實導入，_load() 直接返回
    共享的 _NULL_AI_RESULT 空對象；__bool__ 也在調用 _load() 之前就短路返回 False，
    確保任何真假判斷（`if ai_auto_chat:`、`if not auto_funnel.is_running:`）都不會
    意外觸發真實模塊加載。
    """

    def _load(self):
        if not _ai_enabled():
            return _NULL_AI_RESULT
        return super()._load()

    def __bool__(self):
        if not _ai_enabled():
            return False
        return super().__bool__()


# ============================================================
# Lazy proxy instances (mirrors main.py definitions)
# ============================================================

# Telegram services
private_message_poller = _LazyModuleProxy('private_message_poller', 'private_message_poller')
group_join_service = _LazyModuleProxy('group_join_service', 'group_join_service')
member_extraction_service = _LazyModuleProxy('member_extraction_service', 'member_extraction_service')

# AI services（精簡獲客模式下改用 _AiLazyModuleProxy：ENABLE_AI=False 時不做真實
# 懶加載，安全返回空對象；ENABLE_AI=True 時行為與原 _LazyModuleProxy 完全一致）
ai_context = _AiLazyModuleProxy('ai_context_manager', 'ai_context')
ai_auto_chat = _AiLazyModuleProxy('ai_auto_chat', 'ai_auto_chat')
vector_memory = _AiLazyModuleProxy('vector_memory', 'vector_memory')
auto_funnel = _AiLazyModuleProxy('auto_funnel_manager', 'auto_funnel')

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
    # 🎯 精簡獲客模式：AI 關閉時不真實導入 script_engine 模塊，返回安全空對象。
    # 多數調用點已有 `if not script_engine:` 防護，會自然走「未初始化」的優雅降級分支。
    if not _ai_enabled():
        return _NULL_AI_RESULT
    return _get_module('script_engine').get_script_engine()

def get_collaboration_coordinator():
    # 🎯 精簡獲客模式：AI 關閉時不真實導入 collaboration_coordinator 模塊。
    if not _ai_enabled():
        return _NULL_AI_RESULT
    return _get_module('collaboration_coordinator').get_collaboration_coordinator()

def get_multi_role_manager():
    # 🎯 精簡獲客模式：AI 關閉時不真實導入 multi_role_manager 模塊。
    if not _ai_enabled():
        return _NULL_AI_RESULT
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

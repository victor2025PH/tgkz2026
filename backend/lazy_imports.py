"""
🔧 Phase 2 優化：懶加載模塊管理器

將非核心模塊延遲到首次使用時才加載，減少啟動時的內存佔用。

核心模塊（啟動時加載）：
- database, config, telegram_client
- error_handler, message_queue

非核心模塊（按需加載）：
- AI 相關：ai_auto_chat, ai_context_manager, vector_memory
- 營銷相關：ad_*, campaign_*, marketing_*
- 分析相關：analytics_*, user_tracker, user_analytics
- 搜索相關：group_search_service, jiso_search_service
"""

import sys
from typing import Any, Optional, Dict
from functools import lru_cache


class LazyModule:
    """懶加載模塊代理"""
    
    def __init__(self, module_name: str, import_name: Optional[str] = None):
        self._module_name = module_name
        self._import_name = import_name or module_name
        self._module = None
        self._loaded = False
    
    def _load(self):
        if not self._loaded:
            try:
                import importlib
                self._module = importlib.import_module(self._import_name)
                self._loaded = True
                print(f"[LazyImport] ✓ 已加載: {self._module_name}", file=sys.stderr)
            except ImportError as e:
                print(f"[LazyImport] ❌ 加載失敗: {self._module_name} - {e}", file=sys.stderr)
                self._module = None
                self._loaded = True
        return self._module
    
    def __getattr__(self, name: str) -> Any:
        module = self._load()
        if module is None:
            raise ImportError(f"Module {self._module_name} not available")
        return getattr(module, name)
    
    def __bool__(self):
        return self._load() is not None


class LazyImportManager:
    """
    懶加載導入管理器
    
    使用方式：
        lazy = LazyImportManager()
        
        # 註冊懶加載模塊
        lazy.register('ad_manager', 'ad_manager')
        
        # 使用時自動加載
        ad_manager = lazy.get('ad_manager')
        ad_manager.some_function()
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._modules: Dict[str, LazyModule] = {}
            cls._instance._initialized = False
        return cls._instance
    
    def register(self, name: str, import_path: Optional[str] = None) -> 'LazyImportManager':
        """註冊一個懶加載模塊"""
        self._modules[name] = LazyModule(name, import_path or name)
        return self
    
    def get(self, name: str) -> Any:
        """獲取模塊（首次調用時加載）"""
        if name not in self._modules:
            # 如果未註冊，直接導入
            self.register(name)
        return self._modules[name]
    
    def is_loaded(self, name: str) -> bool:
        """檢查模塊是否已加載"""
        if name not in self._modules:
            return False
        return self._modules[name]._loaded
    
    def preload(self, names: list) -> None:
        """預加載指定模塊（用於需要提前初始化的場景）"""
        for name in names:
            if name in self._modules:
                self._modules[name]._load()
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取加載統計"""
        loaded = [n for n, m in self._modules.items() if m._loaded]
        pending = [n for n, m in self._modules.items() if not m._loaded]
        return {
            'registered': len(self._modules),
            'loaded': len(loaded),
            'pending': len(pending),
            'loaded_modules': loaded,
            'pending_modules': pending
        }


# 全局懶加載管理器
lazy_imports = LazyImportManager()

# 註冊非核心模塊（這些模塊將延遲加載）
# ========== AI 相關 ==========
lazy_imports.register('ai_auto_chat')
lazy_imports.register('ai_context_manager')
lazy_imports.register('ai_quality_checker')
lazy_imports.register('ai_response_strategy')
lazy_imports.register('ai_autonomous_engine')
lazy_imports.register('vector_memory')
lazy_imports.register('telegram_rag_system')
lazy_imports.register('knowledge_learner')
lazy_imports.register('knowledge_learning')

# ========== 營銷相關 ==========
lazy_imports.register('ad_manager')
lazy_imports.register('ad_broadcaster')
lazy_imports.register('ad_scheduler')
lazy_imports.register('ad_analytics')
lazy_imports.register('ad_template')
lazy_imports.register('campaign_orchestrator')
lazy_imports.register('marketing_outreach_service')
lazy_imports.register('marketing_task_service')

# ========== 分析相關 ==========
lazy_imports.register('user_tracker')
lazy_imports.register('user_analytics')
lazy_imports.register('analytics_engine')
lazy_imports.register('predictive_analytics')
lazy_imports.register('conversion_attribution')

# ========== 搜索相關 ==========
lazy_imports.register('group_search_service')
lazy_imports.register('jiso_search_service')
lazy_imports.register('resource_discovery')
lazy_imports.register('fulltext_search')

# ========== 協作相關 ==========
lazy_imports.register('multi_role_manager')
lazy_imports.register('collaboration_coordinator')
lazy_imports.register('script_engine')

# ========== 監控相關 ==========
lazy_imports.register('enhanced_health_monitor')
lazy_imports.register('performance_monitor')
lazy_imports.register('connection_monitor')

# ========== 其他 ==========
lazy_imports.register('batch_operations')
lazy_imports.register('discussion_watcher')
lazy_imports.register('chat_history_indexer')


def get_lazy_imports() -> LazyImportManager:
    """獲取懶加載管理器實例"""
    return lazy_imports


@lru_cache(maxsize=None)
def lazy_import(module_name: str) -> Any:
    """
    便捷函數：懶加載單個模塊
    
    使用方式：
        ad_manager = lazy_import('ad_manager')
    """
    return lazy_imports.get(module_name)

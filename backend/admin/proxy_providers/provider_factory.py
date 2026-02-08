"""
代理供應商工廠

根據配置動態創建 Provider 實例。
支持通過 provider_type 自動匹配對應的 Adapter 類。
"""

import logging
from typing import Optional, List, Dict, Any

from .base_provider import BaseProxyProvider, ProviderConfig

logger = logging.getLogger(__name__)

# 供應商類型到 Adapter 類的映射
_PROVIDER_REGISTRY: Dict[str, type] = {}


def _ensure_registry():
    """延遲加載，避免循環引入"""
    if not _PROVIDER_REGISTRY:
        from .blurpath_provider import BlurpathProvider
        _PROVIDER_REGISTRY["blurpath"] = BlurpathProvider


def create_provider(config: ProviderConfig) -> Optional[BaseProxyProvider]:
    """
    根據配置創建 Provider 實例

    :param config: 供應商配置
    :return: Provider 實例，或 None
    """
    _ensure_registry()

    provider_type = config.provider_type.lower()
    adapter_cls = _PROVIDER_REGISTRY.get(provider_type)

    if not adapter_cls:
        logger.error(f"Unknown provider type: {provider_type}. Available: {list(_PROVIDER_REGISTRY.keys())}")
        return None

    try:
        return adapter_cls(config)
    except Exception as e:
        logger.error(f"Failed to create provider '{provider_type}': {e}")
        return None


def get_provider(config: ProviderConfig) -> Optional[BaseProxyProvider]:
    """create_provider 的別名"""
    return create_provider(config)


def get_all_providers(configs: List[ProviderConfig]) -> List[BaseProxyProvider]:
    """從配置列表創建所有活躍的 Provider"""
    providers = []
    for cfg in configs:
        if not cfg.is_active:
            continue
        p = create_provider(cfg)
        if p:
            providers.append(p)
    return providers


def register_provider(provider_type: str, adapter_cls: type):
    """動態注冊新的供應商類型"""
    _PROVIDER_REGISTRY[provider_type.lower()] = adapter_cls
    logger.info(f"Registered proxy provider type: {provider_type}")

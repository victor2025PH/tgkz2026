"""
代理供應商適配器層

採用適配器模式，統一不同代理供應商的 API 介面。
每個供應商一個 Adapter 類，實現 BaseProxyProvider 介面。
"""

from .base_provider import BaseProxyProvider, ProviderProxy, ProviderBalance, ProviderConfig
from .provider_factory import get_provider, get_all_providers, register_provider

__all__ = [
    'BaseProxyProvider',
    'ProviderProxy',
    'ProviderBalance',
    'ProviderConfig',
    'get_provider',
    'get_all_providers',
    'register_provider',
]

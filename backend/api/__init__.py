"""
TG-Matrix API Layer
API 層 - IPC 命令路由和處理

包含:
- command_router: 命令路由器
- handlers/: 按領域分離的命令處理器
"""

from .command_router import CommandRouter, get_command_router, init_command_router

__all__ = [
    'CommandRouter',
    'get_command_router',
    'init_command_router',
]

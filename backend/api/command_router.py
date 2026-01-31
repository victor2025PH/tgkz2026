"""
TG-Matrix Command Router
命令路由器 - 替代 main.py 中的巨型 if-elif 鏈

設計原則:
- 命令處理器按領域分組
- 支持中間件 (認證、日誌、錯誤處理)
- 支持命令別名
- 自動生成命令列表文檔

Usage:
    router = get_command_router()
    
    # 註冊處理器
    @router.register('add-account')
    async def handle_add_account(payload, context):
        ...
    
    # 或批量註冊
    router.register_handlers(accounts_handlers)
    
    # 處理命令
    await router.handle('add-account', payload, request_id)
"""

import sys
import asyncio
from typing import Dict, Any, Callable, Optional, List, Awaitable, TypeVar, Generic
from dataclasses import dataclass, field
from datetime import datetime
from functools import wraps
from enum import Enum

from core.logging import get_logger, mask_sensitive

logger = get_logger('CommandRouter')


class CommandCategory(Enum):
    """命令分類"""
    ACCOUNTS = 'accounts'
    MESSAGING = 'messaging'
    AUTOMATION = 'automation'
    CONTACTS = 'contacts'
    AI = 'ai'
    SYSTEM = 'system'
    SETTINGS = 'settings'
    ANALYTICS = 'analytics'


@dataclass
class CommandContext:
    """命令執行上下文"""
    request_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    source: str = 'ipc'
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CommandMeta:
    """命令元數據"""
    name: str
    handler: Callable[[Any, CommandContext], Awaitable[Any]]
    category: CommandCategory
    description: str = ''
    aliases: List[str] = field(default_factory=list)
    deprecated: bool = False
    deprecated_message: str = ''


# 處理器類型
HandlerType = Callable[[Any, CommandContext], Awaitable[Any]]
MiddlewareType = Callable[[str, Any, CommandContext, Callable], Awaitable[Any]]


class CommandRouter:
    """
    命令路由器
    
    負責:
    - 註冊和管理命令處理器
    - 命令路由
    - 中間件執行
    - 錯誤處理
    """
    
    def __init__(self, backend_service=None):
        self._commands: Dict[str, CommandMeta] = {}
        self._aliases: Dict[str, str] = {}  # alias -> command_name
        self._middlewares: List[MiddlewareType] = []
        self._backend_service = backend_service  # 引用 BackendService 用於訪問其他服務
        
    def set_backend_service(self, service):
        """設置後端服務引用"""
        self._backend_service = service
    
    @property
    def backend(self):
        """獲取後端服務"""
        return self._backend_service
    
    def register(
        self,
        command_name: str,
        category: CommandCategory = CommandCategory.SYSTEM,
        description: str = '',
        aliases: List[str] = None,
        deprecated: bool = False,
        deprecated_message: str = ''
    ):
        """
        裝飾器：註冊命令處理器
        
        Usage:
            @router.register('add-account', category=CommandCategory.ACCOUNTS)
            async def handle_add_account(payload, context):
                ...
        """
        def decorator(func: HandlerType) -> HandlerType:
            meta = CommandMeta(
                name=command_name,
                handler=func,
                category=category,
                description=description or func.__doc__ or '',
                aliases=aliases or [],
                deprecated=deprecated,
                deprecated_message=deprecated_message
            )
            
            self._commands[command_name] = meta
            
            # 註冊別名
            for alias in (aliases or []):
                self._aliases[alias] = command_name
            
            logger.debug(f"Registered command: {command_name}", category=category.value)
            return func
        
        return decorator
    
    def register_handler(
        self,
        command_name: str,
        handler: HandlerType,
        category: CommandCategory = CommandCategory.SYSTEM,
        **kwargs
    ):
        """直接註冊處理器（非裝飾器方式）"""
        meta = CommandMeta(
            name=command_name,
            handler=handler,
            category=category,
            **kwargs
        )
        self._commands[command_name] = meta
        
        for alias in kwargs.get('aliases', []):
            self._aliases[alias] = command_name
    
    def register_handlers(self, handlers: Dict[str, Dict[str, Any]]):
        """
        批量註冊處理器
        
        Args:
            handlers: {
                'command-name': {
                    'handler': async_function,
                    'category': CommandCategory.ACCOUNTS,
                    'description': '...'
                }
            }
        """
        for name, config in handlers.items():
            handler = config.pop('handler')
            category = config.pop('category', CommandCategory.SYSTEM)
            self.register_handler(name, handler, category, **config)
    
    def use_middleware(self, middleware: MiddlewareType):
        """
        添加中間件
        
        中間件簽名: async def middleware(command, payload, context, next) -> result
        """
        self._middlewares.append(middleware)
    
    async def handle(
        self,
        command: str,
        payload: Any = None,
        request_id: Optional[str] = None,
        **context_kwargs
    ) -> Any:
        """
        處理命令
        
        Args:
            command: 命令名稱
            payload: 命令參數
            request_id: 請求 ID（用於追蹤）
            **context_kwargs: 額外上下文
        
        Returns:
            處理結果
        
        Raises:
            CommandNotFoundError: 命令不存在
        """
        # 解析別名
        actual_command = self._aliases.get(command, command)
        
        # 查找處理器
        meta = self._commands.get(actual_command)
        if not meta:
            logger.warning(f"Unknown command: {command}")
            raise CommandNotFoundError(f"Command not found: {command}")
        
        # 檢查廢棄狀態
        if meta.deprecated:
            logger.warning(
                f"Deprecated command: {command}",
                message=meta.deprecated_message
            )
        
        # 創建上下文
        context = CommandContext(
            request_id=request_id,
            metadata=context_kwargs
        )
        
        # 構建中間件鏈
        async def final_handler(cmd, pld, ctx):
            return await meta.handler(pld, ctx)
        
        handler_chain = final_handler
        for middleware in reversed(self._middlewares):
            prev_handler = handler_chain
            
            async def make_next(mw, prev):
                async def next_fn(cmd, pld, ctx):
                    return await mw(cmd, pld, ctx, prev)
                return next_fn
            
            handler_chain = await make_next(middleware, prev_handler)
        
        # 執行
        try:
            return await handler_chain(actual_command, payload, context)
        except Exception as e:
            logger.error(
                f"Command failed: {actual_command}",
                error=str(e),
                request_id=request_id
            )
            raise
    
    def has_command(self, command: str) -> bool:
        """檢查命令是否存在"""
        actual = self._aliases.get(command, command)
        return actual in self._commands
    
    def get_commands(self, category: Optional[CommandCategory] = None) -> List[str]:
        """獲取命令列表"""
        if category:
            return [
                name for name, meta in self._commands.items()
                if meta.category == category
            ]
        return list(self._commands.keys())
    
    def get_command_info(self, command: str) -> Optional[Dict[str, Any]]:
        """獲取命令信息"""
        actual = self._aliases.get(command, command)
        meta = self._commands.get(actual)
        if not meta:
            return None
        
        return {
            'name': meta.name,
            'category': meta.category.value,
            'description': meta.description,
            'aliases': meta.aliases,
            'deprecated': meta.deprecated,
            'deprecated_message': meta.deprecated_message
        }
    
    def generate_docs(self) -> str:
        """生成命令文檔"""
        docs = ["# TG-Matrix Commands\n"]
        
        # 按分類分組
        by_category: Dict[CommandCategory, List[CommandMeta]] = {}
        for meta in self._commands.values():
            if meta.category not in by_category:
                by_category[meta.category] = []
            by_category[meta.category].append(meta)
        
        for category in CommandCategory:
            if category not in by_category:
                continue
            
            docs.append(f"\n## {category.value.title()}\n")
            
            for meta in sorted(by_category[category], key=lambda m: m.name):
                deprecated_mark = " ⚠️ DEPRECATED" if meta.deprecated else ""
                docs.append(f"- `{meta.name}`{deprecated_mark}")
                if meta.description:
                    docs.append(f"  - {meta.description}")
                if meta.aliases:
                    docs.append(f"  - Aliases: {', '.join(meta.aliases)}")
        
        return '\n'.join(docs)


class CommandNotFoundError(Exception):
    """命令不存在錯誤"""
    pass


# 預定義中間件

async def logging_middleware(command: str, payload: Any, context: CommandContext, next_handler) -> Any:
    """日誌中間件 - 記錄命令執行"""
    start_time = datetime.now()
    
    # 脫敏 payload 用於日誌
    safe_payload = mask_sensitive(str(payload)[:200]) if payload else None
    logger.info(f"→ {command}", request_id=context.request_id, payload_preview=safe_payload)
    
    try:
        result = await next_handler(command, payload, context)
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"← {command} OK", duration_ms=round(duration, 2))
        return result
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"← {command} FAILED", error=str(e), duration_ms=round(duration, 2))
        raise


async def error_handling_middleware(command: str, payload: Any, context: CommandContext, next_handler) -> Any:
    """錯誤處理中間件 - 統一錯誤格式"""
    try:
        return await next_handler(command, payload, context)
    except CommandNotFoundError:
        raise
    except Exception as e:
        # 這裡可以將錯誤轉換為統一格式
        # 或記錄到監控系統
        raise


# 全局路由器實例
_command_router: Optional[CommandRouter] = None


def init_command_router(backend_service=None) -> CommandRouter:
    """初始化全局命令路由器"""
    global _command_router
    _command_router = CommandRouter(backend_service)
    
    # 添加默認中間件
    _command_router.use_middleware(logging_middleware)
    _command_router.use_middleware(error_handling_middleware)
    
    return _command_router


def get_command_router() -> CommandRouter:
    """獲取全局命令路由器"""
    global _command_router
    if _command_router is None:
        _command_router = CommandRouter()
    return _command_router

"""
TG-Matrix Router Integration
命令路由器整合層

將新的命令路由器整合到現有的 BackendService 中
提供漸進式遷移策略：先嘗試新路由器，未找到則回退到原處理

使用方式:
    from api.router_integration import setup_command_router, try_route_command
    
    # 在 BackendService.initialize() 中調用
    setup_command_router(backend_service)
    
    # 在 BackendService.handle_command() 開頭調用
    handled = await try_route_command(command, payload, request_id)
    if handled:
        return
    # 否則繼續原有的 if-elif 處理
"""

import sys
from typing import Any, Optional, Tuple, Dict, Set

# 導入命令路由器
from api.command_router import (
    init_command_router, 
    get_command_router,
    CommandRouter,
    CommandNotFoundError,
    CommandCategory
)

# 導入領域處理器
from domain.accounts.handlers import register_account_handlers
from domain.messaging.handlers import register_messaging_handlers
from domain.automation.handlers import register_automation_handlers
from domain.ai.handlers import register_ai_handlers
from domain.contacts.handlers import register_contacts_handlers
from api.handlers.system_handlers import register_system_handlers

# 導入舊處理器代理
try:
    from api.legacy_proxy import create_legacy_handlers, get_all_known_commands
    LEGACY_PROXY_AVAILABLE = True
except ImportError:
    LEGACY_PROXY_AVAILABLE = False

# 導入核心模塊 — 🔧 Phase4: 修復導入路徑 (core 未導出 event_bus)
from core.event_bus import init_event_bus, get_event_bus
from core.logging import get_logger

logger = get_logger('RouterIntegration')

# 已遷移到新路由器的命令列表
# 這些命令將由新路由器處理，不會回退到原有的 if-elif
MIGRATED_COMMANDS: Set[str] = set()

# 全局後端服務引用
_backend_service = None


def setup_command_router(backend_service) -> CommandRouter:
    """
    設置命令路由器並註冊所有處理器
    
    Args:
        backend_service: BackendService 實例
        
    Returns:
        初始化後的 CommandRouter
    """
    global _backend_service
    _backend_service = backend_service
    
    logger.info("Setting up command router...")
    
    # 🔧 P5-2: 事件总线初始化增加异常保护
    try:
        init_event_bus()
    except Exception as e:
        logger.warning(f"Event bus init failed (non-fatal): {e}")
    
    # 初始化命令路由器
    router = init_command_router(backend_service)
    
    # 註冊各領域處理器
    try:
        register_system_handlers(backend_service)
        logger.info("✓ System handlers registered")
    except Exception as e:
        logger.error(f"Failed to register system handlers: {e}")
    
    try:
        register_account_handlers(backend_service)
        logger.info("✓ Account handlers registered")
    except Exception as e:
        logger.error(f"Failed to register account handlers: {e}")
    
    try:
        register_messaging_handlers(backend_service)
        logger.info("✓ Messaging handlers registered")
    except Exception as e:
        logger.error(f"Failed to register messaging handlers: {e}")
    
    try:
        register_automation_handlers(backend_service)
        logger.info("✓ Automation handlers registered")
    except Exception as e:
        logger.error(f"Failed to register automation handlers: {e}")
    
    # 🎯 精簡獲客模式：關閉 AI 時不註冊 AI 命令處理器
    try:
        from config import ENABLE_AI
    except Exception:
        ENABLE_AI = True
    if ENABLE_AI:
        try:
            register_ai_handlers(backend_service)
            logger.info("✓ AI handlers registered")
        except Exception as e:
            logger.error(f"Failed to register AI handlers: {e}")
    else:
        logger.info("🎯 精簡獲客模式：跳過 AI 命令處理器註冊")
    
    try:
        register_contacts_handlers(backend_service)
        logger.info("✓ Contacts handlers registered")
    except Exception as e:
        logger.error(f"Failed to register contacts handlers: {e}")
    
    # 🆕 Phase 3: 註冊舊處理器代理
    if LEGACY_PROXY_AVAILABLE:
        try:
            legacy_count = create_legacy_handlers(backend_service)
            logger.info(f"✓ Legacy handlers proxied: {legacy_count}")
        except Exception as e:
            logger.error(f"Failed to create legacy handlers: {e}")
    
    # 統計
    total_commands = len(router.get_commands())
    logger.info(f"Command router setup complete. Total commands: {total_commands}")
    
    # 按類別統計
    for category in CommandCategory:
        count = len(router.get_commands(category))
        if count > 0:
            logger.info(f"  - {category.value}: {count} commands")
    
    return router


async def try_route_command(
    command: str, 
    payload: Any = None, 
    request_id: Optional[str] = None
) -> Tuple[bool, Any]:
    """
    嘗試使用新路由器處理命令
    
    Args:
        command: 命令名稱
        payload: 命令參數
        request_id: 請求 ID
        
    Returns:
        (是否處理, 處理結果)
        如果命令被新路由器處理，返回 (True, result)
        如果命令未註冊，返回 (False, None)
    """
    router = get_command_router()
    
    # 🔧 調試：檢查 AI 相關命令
    if 'ai' in command.lower() or 'generate' in command.lower():
        import sys
        print(f"[Router] 檢查命令 '{command}' 是否已註冊", file=sys.stderr)
        print(f"[Router] has_command = {router.has_command(command)}", file=sys.stderr)
    
    # 檢查命令是否已註冊到新路由器
    if not router.has_command(command):
        return (False, None)
    
    # 檢查是否在已遷移列表中（完全使用新路由器）
    # 或者命令已註冊但我們仍使用漸進式遷移策略
    # 目前所有註冊的命令都會嘗試使用新路由器
    
    try:
        result = await router.handle(command, payload, request_id)
        return (True, result)
    except CommandNotFoundError:
        return (False, None)
    except Exception as e:
        # 記錄錯誤但不回退到舊處理器
        # 因為錯誤可能是業務邏輯錯誤而非路由問題
        logger.error(f"Command handler error: {command}", error=str(e))
        raise


def get_registered_commands() -> Dict[str, str]:
    """
    獲取所有已註冊的命令及其描述
    
    Returns:
        {命令名: 描述}
    """
    router = get_command_router()
    result = {}
    
    for command in router.get_commands():
        info = router.get_command_info(command)
        if info:
            result[command] = info.get('description', '')
    
    return result


def mark_command_migrated(command: str):
    """標記命令已完全遷移到新路由器"""
    MIGRATED_COMMANDS.add(command)


def is_command_migrated(command: str) -> bool:
    """檢查命令是否已遷移"""
    return command in MIGRATED_COMMANDS


# 事件總線輔助函數

async def publish_event(event_name: str, payload: Dict[str, Any] = None):
    """發布事件到事件總線"""
    event_bus = get_event_bus()
    await event_bus.publish(event_name, payload or {})


def subscribe_event(event_name: str, callback):
    """訂閱事件"""
    import asyncio
    event_bus = get_event_bus()
    asyncio.create_task(event_bus.subscribe(event_name, callback))

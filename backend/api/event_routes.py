"""
事件推送 API 路由
=================

提供前端事件订阅和历史获取的 IPC 接口
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# 事件服务实例（延迟导入避免循环依赖）
_event_emitter = None


def get_event_emitter():
    """获取事件发射器实例"""
    global _event_emitter
    if _event_emitter is None:
        from backend.core.event_emitter import event_emitter
        _event_emitter = event_emitter
    return _event_emitter


# ============ IPC 回调管理 ============

# 前端回调函数（由 Electron 主进程设置）
_frontend_push_callback = None


def set_frontend_push_callback(callback):
    """
    设置前端推送回调
    
    由 Electron 主进程调用，传入向渲染进程发送事件的函数
    """
    global _frontend_push_callback
    _frontend_push_callback = callback
    
    # 同时设置到事件发射器
    emitter = get_event_emitter()
    emitter.set_frontend_callback(callback)
    
    logger.info("Frontend push callback registered")


# ============ IPC 路由处理器 ============

async def handle_events_register(data: Dict) -> Dict[str, Any]:
    """
    注册前端事件接收器
    
    前端调用此接口表示准备好接收事件
    """
    try:
        emitter = get_event_emitter()
        
        return {
            "success": True,
            "data": {
                "registered": True,
                "stats": emitter.get_stats()
            }
        }
    except Exception as e:
        logger.error(f"Register receiver failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def handle_events_get_history(data: Dict) -> Dict[str, Any]:
    """
    获取事件历史
    
    参数:
        event_types: 可选，事件类型列表
        since: 可选，起始时间戳
        limit: 可选，最大数量
    """
    try:
        emitter = get_event_emitter()
        
        event_types = data.get('event_types')
        since = data.get('since')
        limit = data.get('limit', 50)
        
        # 转换事件类型字符串为枚举
        if event_types:
            from backend.core.event_emitter import EventType
            try:
                event_types = [EventType(t) for t in event_types]
            except ValueError:
                event_types = None
        
        history = emitter.get_history(
            event_types=event_types,
            since=since,
            limit=limit
        )
        
        return {
            "success": True,
            "data": history
        }
    except Exception as e:
        logger.error(f"Get event history failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def handle_events_get_stats(data: Dict) -> Dict[str, Any]:
    """获取事件统计"""
    try:
        emitter = get_event_emitter()
        stats = emitter.get_stats()
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"Get event stats failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# ============ 路由注册 ============

def register_event_routes(router):
    """
    注册事件路由到 IPC 路由器
    
    使用方式：
        from backend.api.event_routes import register_event_routes
        register_event_routes(ipc_router)
    """
    router.register('events:register-receiver', handle_events_register)
    router.register('events:get-history', handle_events_get_history)
    router.register('events:get-stats', handle_events_get_stats)
    
    logger.info("Event routes registered")


# ============ 测试工具 ============

async def emit_test_event(event_type: str, data: Dict) -> Dict[str, Any]:
    """
    发送测试事件（仅用于开发调试）
    """
    try:
        from backend.core.event_emitter import EventType
        
        emitter = get_event_emitter()
        
        try:
            etype = EventType(event_type)
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid event type: {event_type}"
            }
        
        event = emitter.emit(etype, data)
        
        return {
            "success": True,
            "data": event.to_dict()
        }
    except Exception as e:
        logger.error(f"Emit test event failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

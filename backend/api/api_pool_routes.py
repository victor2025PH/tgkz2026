"""
API Pool Routes - API 池管理接口

提供管理員管理 API 池的 REST API 接口

接口列表：
- GET  /api/v1/admin/api-pool           獲取 API 池狀態
- POST /api/v1/admin/api-pool/add       添加 API
- POST /api/v1/admin/api-pool/remove    移除 API
- POST /api/v1/admin/api-pool/enable    啟用 API
- POST /api/v1/admin/api-pool/disable   禁用 API
"""

from typing import Dict, Any
import sys


async def get_api_pool_status(user_id: int = None, is_admin: bool = False) -> Dict[str, Any]:
    """
    獲取 API 池狀態
    
    需要管理員權限
    """
    if not is_admin:
        return {
            'success': False,
            'error': '需要管理員權限'
        }
    
    try:
        from core.api_pool import get_api_pool
        pool = get_api_pool()
        
        return {
            'success': True,
            'data': pool.get_pool_status()
        }
    except Exception as e:
        print(f"[ApiPoolRoutes] 獲取狀態失敗: {e}", file=sys.stderr)
        return {
            'success': False,
            'error': str(e)
        }


async def add_api_to_pool(
    api_id: str,
    api_hash: str,
    name: str = "",
    max_accounts: int = 15,
    priority: int = 50,
    is_admin: bool = False
) -> Dict[str, Any]:
    """
    添加 API 到池中
    
    需要管理員權限
    """
    if not is_admin:
        return {
            'success': False,
            'error': '需要管理員權限'
        }
    
    if not api_id or not api_hash:
        return {
            'success': False,
            'error': '缺少 api_id 或 api_hash'
        }
    
    try:
        from core.api_pool import get_api_pool
        pool = get_api_pool()
        
        # 檢查是否已存在
        existing = pool.get_api(api_id)
        if existing:
            return {
                'success': False,
                'error': f'API {api_id} 已存在'
            }
        
        api = pool.add_api(
            api_id=api_id,
            api_hash=api_hash,
            name=name or f"API-{api_id[:6]}",
            max_accounts=max_accounts,
            priority=priority
        )
        
        print(f"[ApiPoolRoutes] 添加 API: {api_id}", file=sys.stderr)
        
        return {
            'success': True,
            'api': api.to_dict()
        }
    except Exception as e:
        print(f"[ApiPoolRoutes] 添加 API 失敗: {e}", file=sys.stderr)
        return {
            'success': False,
            'error': str(e)
        }


async def remove_api_from_pool(
    api_id: str,
    is_admin: bool = False
) -> Dict[str, Any]:
    """
    從池中移除 API
    
    需要管理員權限
    """
    if not is_admin:
        return {
            'success': False,
            'error': '需要管理員權限'
        }
    
    if not api_id:
        return {
            'success': False,
            'error': '缺少 api_id'
        }
    
    try:
        from core.api_pool import get_api_pool
        pool = get_api_pool()
        
        success = pool.remove_api(api_id)
        
        if success:
            print(f"[ApiPoolRoutes] 移除 API: {api_id}", file=sys.stderr)
        
        return {
            'success': success,
            'error': None if success else f'API {api_id} 不存在'
        }
    except Exception as e:
        print(f"[ApiPoolRoutes] 移除 API 失敗: {e}", file=sys.stderr)
        return {
            'success': False,
            'error': str(e)
        }


async def enable_api(api_id: str, is_admin: bool = False) -> Dict[str, Any]:
    """啟用 API"""
    if not is_admin:
        return {'success': False, 'error': '需要管理員權限'}
    
    try:
        from core.api_pool import get_api_pool
        pool = get_api_pool()
        success = pool.enable_api(api_id)
        return {'success': success}
    except Exception as e:
        return {'success': False, 'error': str(e)}


async def disable_api(api_id: str, is_admin: bool = False) -> Dict[str, Any]:
    """禁用 API"""
    if not is_admin:
        return {'success': False, 'error': '需要管理員權限'}
    
    try:
        from core.api_pool import get_api_pool
        pool = get_api_pool()
        success = pool.disable_api(api_id)
        return {'success': success}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ==================== 命令處理器（用於 IPC）====================

async def handle_api_pool_command(command: str, payload: Dict[str, Any], is_admin: bool = False) -> Dict[str, Any]:
    """
    處理 API 池相關命令
    
    命令列表：
    - api-pool:status
    - api-pool:add
    - api-pool:remove
    - api-pool:enable
    - api-pool:disable
    """
    if command == 'api-pool:status':
        return await get_api_pool_status(is_admin=is_admin)
    
    elif command == 'api-pool:add':
        return await add_api_to_pool(
            api_id=payload.get('api_id', ''),
            api_hash=payload.get('api_hash', ''),
            name=payload.get('name', ''),
            max_accounts=payload.get('max_accounts', 15),
            priority=payload.get('priority', 50),
            is_admin=is_admin
        )
    
    elif command == 'api-pool:remove':
        return await remove_api_from_pool(
            api_id=payload.get('api_id', ''),
            is_admin=is_admin
        )
    
    elif command == 'api-pool:enable':
        return await enable_api(
            api_id=payload.get('api_id', ''),
            is_admin=is_admin
        )
    
    elif command == 'api-pool:disable':
        return await disable_api(
            api_id=payload.get('api_id', ''),
            is_admin=is_admin
        )
    
    else:
        return {
            'success': False,
            'error': f'未知命令: {command}'
        }

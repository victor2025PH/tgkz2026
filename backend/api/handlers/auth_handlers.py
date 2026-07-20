"""
TG-Matrix Auth Handlers
本地安裝版會員登入驗證 - 通過 IPC 處理 auth-login，與 HTTP API 返回格式一致
"""

from typing import Dict, Any
from api.command_router import get_command_router, CommandCategory, CommandContext
from core.logging import get_logger

logger = get_logger('AuthHandlers')


def register_auth_handlers(backend_service):
    """
    註冊認證相關的 IPC 命令（供安裝版登入驗證使用）
    """
    router = get_command_router()

    @router.register('auth-login', category=CommandCategory.SYSTEM, description='會員登入（IPC）')
    async def handle_auth_login(payload: Dict[str, Any], context: CommandContext):
        """安裝版登入：調用與 HTTP 一致的 auth 服務，返回 { success, data } 或 { success, error }"""
        try:
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            email = (payload or {}).get('email', '')
            password = (payload or {}).get('password', '')
            device_name = (payload or {}).get('device_name', 'Desktop App')
            if not email or not password:
                return {'success': False, 'error': '請輸入郵箱和密碼'}
            device_info = {
                'device_type': 'desktop',
                'device_name': device_name,
                'ip_address': '',
                'user_agent': 'TG-AI-Desktop',
            }
            result = await auth_service.login(
                email=email.strip(),
                password=password,
                device_info=device_info,
            )
            # 與 HTTP /api/v1/auth/login 返回格式一致，便於前端 setAuthState(result.data)
            if result.get('success') and result.get('data'):
                return result
            return {'success': False, 'error': result.get('error', '登入失敗')}
        except Exception as e:
            logger.exception("auth-login error: %s", e)
            return {'success': False, 'error': str(e)}

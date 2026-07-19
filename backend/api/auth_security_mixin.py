#!/usr/bin/env python3
"""
P13-1: Auth Security Mixin
Security handlers extracted from AuthRoutesMixin

Contains: 2FA/TOTP setup, API key management, security events,
trusted devices management
"""
import logging

logger = logging.getLogger(__name__)


class AuthSecurityMixin:
    """Security route handlers: 2FA, API keys, security events"""

    
    async def submit_2fa(self, request):
        """提交 2FA 密碼"""
        data = await request.json()
        result = await self._execute_command('submit-2fa-password', data)
        return self._json_response(result)

    
    # ==================== 🆕 Phase 5: 安全事件 API ====================
    
    async def get_security_events(self, request):
        """
        獲取用戶安全事件列表
        """
        try:
            from auth.geo_security import get_geo_security
            
            # 中介層寫入 request['auth']（AuthContext），非 request['user']
            auth_ctx = request.get('auth')
            if not auth_ctx or not auth_ctx.is_authenticated or not auth_ctx.user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = auth_ctx.user.id
            unacknowledged_only = request.query.get('unacknowledged', 'false').lower() == 'true'
            
            service = get_geo_security()
            events = service.get_user_security_events(user_id, limit=50, unacknowledged_only=unacknowledged_only)
            
            return self._json_response({
                'success': True,
                'data': {
                    'events': events,
                    'total': len(events)
                }
            })
            
        except Exception as e:
            logger.error(f"Get security events error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def acknowledge_security_event(self, request):
        """
        確認安全事件
        """
        try:
            from auth.geo_security import get_geo_security
            
            # 中介層寫入 request['auth']（AuthContext），非 request['user']
            auth_ctx = request.get('auth')
            if not auth_ctx or not auth_ctx.is_authenticated or not auth_ctx.user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = auth_ctx.user.id
            event_id = int(request.match_info['event_id'])
            
            service = get_geo_security()
            success = service.acknowledge_event(user_id, event_id)
            
            return self._json_response({
                'success': success,
                'message': '事件已確認' if success else '事件不存在'
            })
            
        except Exception as e:
            logger.error(f"Acknowledge event error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def _send_security_alert(
        self,
        telegram_id: str,
        alert,
        ip_address: str
    ):
        """
        🆕 Phase 5: 發送安全警報通知
        
        向用戶的 Telegram 發送異常登入警報
        """
        try:
            import os
            import aiohttp
            
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            if not bot_token:
                return
            
            from datetime import datetime
            current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
            
            # 根據嚴重程度選擇圖標
            severity_icons = {
                'low': '⚠️',
                'medium': '🟠',
                'high': '🔴',
                'critical': '🚨'
            }
            icon = severity_icons.get(alert.severity, '⚠️')
            
            # 構建警報消息
            message = f"""
{icon} *安全警報*

{alert.message}

📍 IP: {ip_address[:ip_address.rfind('.') + 1] + '*' if ip_address and '.' in ip_address else '未知'}
⏰ 時間: {current_time}
📊 嚴重程度: {alert.severity.upper()}

*如果這不是您的操作，請立即：*
1. 登出所有設備
2. 聯繫客服

_如果這是您本人操作，可以在設置中將此位置添加為信任位置_
"""
            
            api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            
            async with aiohttp.ClientSession() as session:
                await session.post(api_url, json={
                    'chat_id': telegram_id,
                    'text': message,
                    'parse_mode': 'Markdown'
                })
            
            logger.info(f"Security alert sent to TG user {telegram_id}: {alert.alert_type}")
            
        except Exception as e:
            logger.warning(f"Failed to send security alert: {e}")


    # ==================== 2FA ====================
    
    async def get_2fa_status(self, request):
        """獲取 2FA 狀態"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            config = service.get_config(user_id)
            if config:
                return self._json_response({'success': True, 'data': config.to_dict()})
            return self._json_response({'success': True, 'data': {'enabled': False}})
        except Exception as e:
            logger.error(f"Get 2FA status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def setup_2fa(self, request):
        """開始 2FA 設置"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            email = tenant.email if tenant else ''
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.setup(user_id, email)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Setup 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def enable_2fa(self, request):
        """啟用 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            code = data.get('code', '')
            
            result = await service.enable(user_id, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Enable 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def disable_2fa(self, request):
        """禁用 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            code = data.get('code', '')
            
            result = await service.disable(user_id, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Disable 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def verify_2fa(self, request):
        """驗證 2FA"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            data = await request.json()
            user_id = data.get('user_id', '')
            code = data.get('code', '')
            device_fingerprint = data.get('device_fingerprint', '')
            
            result = await service.verify(user_id, code, device_fingerprint)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify 2FA error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    # ==================== API 密鑰 ====================
    
    async def list_api_keys(self, request):
        """列出 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            keys = await service.list_keys(user_id)
            return self._json_response({
                'success': True,
                'data': [k.to_dict() for k in keys]
            })
        except Exception as e:
            logger.error(f"List API keys error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def create_api_key(self, request):
        """創建 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            data = await request.json()
            name = data.get('name', 'Unnamed Key')
            scopes = data.get('scopes', ['read'])
            expires_in_days = data.get('expires_in_days')
            
            result = await service.create(user_id, name, scopes, expires_in_days)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Create API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def delete_api_key(self, request):
        """刪除 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            key_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.delete(user_id, key_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Delete API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def revoke_api_key(self, request):
        """撤銷 API 密鑰"""
        try:
            from auth.api_key import get_api_key_service
            service = get_api_key_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            key_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            result = await service.revoke(user_id, key_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Revoke API key error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

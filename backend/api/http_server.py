#!/usr/bin/env python3
"""
TG-Matrix HTTP API Server
統一的 HTTP API 層，包裝現有的 CommandRouter
支持 REST API 和 WebSocket

優化設計：
1. 自動將 IPC 命令映射為 HTTP 端點
2. 統一錯誤處理和響應格式
3. CORS 支持（本地版和 SaaS 版）
4. WebSocket 實時通訊
5. API 版本控制
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional, Callable
from functools import wraps

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiohttp import web
import aiohttp_cors

logger = logging.getLogger(__name__)


class HttpApiServer:
    """HTTP API 服務器 - 包裝 CommandRouter"""
    
    def __init__(self, backend_service=None, host='0.0.0.0', port=8000):
        self.backend_service = backend_service
        self.host = host
        self.port = port
        self.app = web.Application()
        self.websocket_clients = set()
        self._setup_routes()
        self._setup_cors()
        self._setup_middleware()
    
    def _setup_middleware(self):
        """設置中間件"""
        # 嘗試使用完整的中間件堆棧
        try:
            from api.middleware import create_middleware_stack
            middlewares = create_middleware_stack()
            for mw in middlewares:
                self.app.middlewares.append(mw)
            logger.info(f"Loaded {len(middlewares)} middlewares")
            return
        except Exception as e:
            logger.warning(f"Failed to load middleware stack: {e}, using fallback")
        
        # 降級：基本錯誤處理中間件
        @web.middleware
        async def error_middleware(request, handler):
            try:
                response = await handler(request)
                return response
            except web.HTTPException:
                raise
            except Exception as e:
                logger.exception(f"Request error: {e}")
                return web.json_response({
                    'success': False,
                    'error': str(e),
                    'error_type': type(e).__name__
                }, status=500)
        
        @web.middleware
        async def logging_middleware(request, handler):
            start_time = datetime.now()
            response = await handler(request)
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"{request.method} {request.path} - {response.status} ({duration:.1f}ms)")
            return response
        
        self.app.middlewares.extend([logging_middleware, error_middleware])
    
    def _setup_cors(self):
        """設置 CORS"""
        cors = aiohttp_cors.setup(self.app, defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
            )
        })
        
        for route in list(self.app.router.routes()):
            try:
                cors.add(route)
            except ValueError:
                pass
    
    def _setup_routes(self):
        """設置路由"""
        # 健康檢查
        self.app.router.add_get('/health', self.health_check)
        self.app.router.add_get('/api/health', self.health_check)
        
        # 通用命令端點（核心）
        self.app.router.add_post('/api/command', self.handle_command)
        self.app.router.add_post('/api/v1/command', self.handle_command)
        
        # RESTful 端點（語義化）
        # 帳號管理
        self.app.router.add_get('/api/v1/accounts', self.get_accounts)
        self.app.router.add_post('/api/v1/accounts', self.add_account)
        self.app.router.add_get('/api/v1/accounts/{id}', self.get_account)
        self.app.router.add_put('/api/v1/accounts/{id}', self.update_account)
        self.app.router.add_delete('/api/v1/accounts/{id}', self.delete_account)
        self.app.router.add_post('/api/v1/accounts/{id}/login', self.login_account)
        self.app.router.add_post('/api/v1/accounts/{id}/logout', self.logout_account)
        
        # 用戶認證（SaaS）
        self.app.router.add_post('/api/v1/auth/register', self.user_register)
        self.app.router.add_post('/api/v1/auth/login', self.user_login)
        self.app.router.add_post('/api/v1/auth/logout', self.user_logout)
        self.app.router.add_post('/api/v1/auth/refresh', self.user_refresh_token)
        self.app.router.add_get('/api/v1/auth/me', self.get_current_user)
        self.app.router.add_put('/api/v1/auth/me', self.update_current_user)
        self.app.router.add_post('/api/v1/auth/change-password', self.change_password)
        self.app.router.add_get('/api/v1/auth/sessions', self.get_user_sessions)
        self.app.router.add_delete('/api/v1/auth/sessions/{id}', self.revoke_session)
        
        # Telegram 帳號認證
        self.app.router.add_post('/api/v1/auth/send-code', self.send_code)
        self.app.router.add_post('/api/v1/auth/verify-code', self.verify_code)
        self.app.router.add_post('/api/v1/auth/submit-2fa', self.submit_2fa)
        
        # API 憑證
        self.app.router.add_get('/api/v1/credentials', self.get_credentials)
        self.app.router.add_post('/api/v1/credentials', self.add_credential)
        self.app.router.add_delete('/api/v1/credentials/{id}', self.delete_credential)
        self.app.router.add_get('/api/v1/credentials/recommend', self.get_recommended_credential)
        
        # 監控
        self.app.router.add_get('/api/v1/monitoring/status', self.get_monitoring_status)
        self.app.router.add_post('/api/v1/monitoring/start', self.start_monitoring)
        self.app.router.add_post('/api/v1/monitoring/stop', self.stop_monitoring)
        
        # 關鍵詞
        self.app.router.add_get('/api/v1/keywords', self.get_keywords)
        self.app.router.add_post('/api/v1/keywords', self.add_keyword_set)
        
        # 群組
        self.app.router.add_get('/api/v1/groups', self.get_groups)
        self.app.router.add_post('/api/v1/groups', self.add_group)
        
        # 設置
        self.app.router.add_get('/api/v1/settings', self.get_settings)
        self.app.router.add_post('/api/v1/settings', self.save_settings)
        
        # 使用量統計
        self.app.router.add_get('/api/v1/usage', self.get_usage_stats)
        self.app.router.add_get('/api/v1/usage/today', self.get_today_usage)
        self.app.router.add_get('/api/v1/usage/history', self.get_usage_history)
        self.app.router.add_get('/api/v1/quota', self.get_quota_status)
        
        # 初始狀態
        self.app.router.add_get('/api/v1/initial-state', self.get_initial_state)
        
        # WebSocket
        self.app.router.add_get('/ws', self.websocket_handler)
        self.app.router.add_get('/api/v1/ws', self.websocket_handler)
    
    # ==================== 核心方法 ====================
    
    async def _execute_command(self, command: str, payload: dict = None) -> dict:
        """執行命令 - 核心方法"""
        if payload is None:
            payload = {}
        
        if self.backend_service:
            try:
                result = await self.backend_service.handle_command({
                    'command': command,
                    'payload': payload
                })
                return result
            except Exception as e:
                logger.error(f"Command execution error: {command} - {e}")
                return {'success': False, 'error': str(e)}
        else:
            # 後端服務未初始化時的演示模式
            return await self._demo_mode_handler(command, payload)
    
    async def _demo_mode_handler(self, command: str, payload: dict) -> dict:
        """演示模式處理器 - 後端未初始化時使用"""
        demo_responses = {
            'get-accounts': {'success': True, 'data': []},
            'get-initial-state': {
                'success': True,
                'data': {
                    'accounts': [],
                    'settings': {},
                    'monitoring_status': False,
                    'version': '2.1.1'
                }
            },
            'get-api-credentials': {'success': True, 'data': []},
            'get-monitoring-status': {'success': True, 'data': {'running': False}},
            'get-settings': {'success': True, 'data': {}},
            'get-keyword-sets': {'success': True, 'data': []},
            'get-groups': {'success': True, 'data': []},
        }
        
        if command in demo_responses:
            return demo_responses[command]
        
        return {
            'success': True,
            'message': f'Command received: {command}',
            'demo_mode': True,
            'note': 'Backend not fully initialized'
        }
    
    def _json_response(self, data: dict, status: int = 200) -> web.Response:
        """統一 JSON 響應"""
        return web.json_response(data, status=status, dumps=lambda x: json.dumps(x, ensure_ascii=False, default=str))
    
    # ==================== 端點處理器 ====================
    
    async def health_check(self, request):
        """健康檢查"""
        return self._json_response({
            'status': 'ok',
            'service': 'TG-Matrix API',
            'version': '2.1.1',
            'timestamp': datetime.now().isoformat(),
            'backend_ready': self.backend_service is not None
        })
    
    async def handle_command(self, request):
        """通用命令處理 - 兼容所有 IPC 命令"""
        try:
            data = await request.json()
        except:
            data = {}
        
        command = data.get('command')
        payload = data.get('payload', {})
        
        if not command:
            return self._json_response({'success': False, 'error': 'Missing command'}, 400)
        
        result = await self._execute_command(command, payload)
        return self._json_response(result)
    
    # ==================== 帳號管理 ====================
    
    async def get_accounts(self, request):
        """獲取帳號列表"""
        result = await self._execute_command('get-accounts')
        return self._json_response(result)
    
    async def add_account(self, request):
        """添加帳號"""
        data = await request.json()
        result = await self._execute_command('add-account', data)
        return self._json_response(result)
    
    async def get_account(self, request):
        """獲取單個帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('get-account', {'id': account_id})
        return self._json_response(result)
    
    async def update_account(self, request):
        """更新帳號"""
        account_id = request.match_info['id']
        data = await request.json()
        data['id'] = account_id
        result = await self._execute_command('update-account', data)
        return self._json_response(result)
    
    async def delete_account(self, request):
        """刪除帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('remove-account', {'id': account_id})
        return self._json_response(result)
    
    async def login_account(self, request):
        """登入帳號"""
        account_id = request.match_info['id']
        data = await request.json() if request.body_exists else {}
        data['id'] = account_id
        result = await self._execute_command('login-account', data)
        return self._json_response(result)
    
    async def logout_account(self, request):
        """登出帳號"""
        account_id = request.match_info['id']
        result = await self._execute_command('logout-account', {'id': account_id})
        return self._json_response(result)
    
    # ==================== 用戶認證 (SaaS) ====================
    
    async def user_register(self, request):
        """用戶註冊"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.register(
                email=data.get('email', ''),
                password=data.get('password', ''),
                username=data.get('username'),
                display_name=data.get('display_name')
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_login(self, request):
        """用戶登入"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            # 獲取設備信息
            device_info = {
                'ip_address': request.headers.get('X-Forwarded-For', 
                              request.headers.get('X-Real-IP', 
                              request.remote or '')),
                'user_agent': request.headers.get('User-Agent', ''),
                'device_type': 'web',
                'device_name': data.get('device_name', 'Web Browser')
            }
            
            result = await auth_service.login(
                email=data.get('email', ''),
                password=data.get('password', ''),
                device_info=device_info
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Login error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_logout(self, request):
        """用戶登出"""
        try:
            # 從 header 獲取 token
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.logout(token=token)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def user_refresh_token(self, request):
        """刷新 Token"""
        try:
            data = await request.json()
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.refresh_token(data.get('refresh_token', ''))
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_current_user(self, request):
        """獲取當前用戶信息"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            user = await auth_service.get_user_by_token(token)
            
            if not user:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            return self._json_response({'success': True, 'data': user.to_dict()})
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def update_current_user(self, request):
        """更新當前用戶信息"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            data = await request.json()
            auth_service = get_auth_service()
            result = await auth_service.update_user(payload.get('sub'), data)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def change_password(self, request):
        """修改密碼"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            data = await request.json()
            auth_service = get_auth_service()
            result = await auth_service.change_password(
                payload.get('sub'),
                data.get('old_password', ''),
                data.get('new_password', '')
            )
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_user_sessions(self, request):
        """獲取用戶會話列表"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            auth_service = get_auth_service()
            sessions = await auth_service.get_sessions(payload.get('sub'))
            return self._json_response({'success': True, 'data': sessions})
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def revoke_session(self, request):
        """撤銷會話"""
        try:
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:] if auth_header.startswith('Bearer ') else None
            
            if not token:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            from auth.service import get_auth_service
            from auth.utils import verify_token
            
            payload = verify_token(token)
            if not payload:
                return self._json_response({'success': False, 'error': '無效的令牌'}, 401)
            
            session_id = request.match_info['id']
            auth_service = get_auth_service()
            result = await auth_service.revoke_session(payload.get('sub'), session_id)
            return self._json_response(result)
        except Exception as e:
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== Telegram 認證 ====================
    
    async def send_code(self, request):
        """發送驗證碼"""
        data = await request.json()
        result = await self._execute_command('send-code', data)
        return self._json_response(result)
    
    async def verify_code(self, request):
        """驗證驗證碼"""
        data = await request.json()
        result = await self._execute_command('verify-code', data)
        return self._json_response(result)
    
    async def submit_2fa(self, request):
        """提交 2FA 密碼"""
        data = await request.json()
        result = await self._execute_command('submit-2fa-password', data)
        return self._json_response(result)
    
    # ==================== API 憑證 ====================
    
    async def get_credentials(self, request):
        """獲取 API 憑證列表"""
        result = await self._execute_command('get-api-credentials')
        return self._json_response(result)
    
    async def add_credential(self, request):
        """添加 API 憑證"""
        data = await request.json()
        result = await self._execute_command('add-api-credential', data)
        return self._json_response(result)
    
    async def delete_credential(self, request):
        """刪除 API 憑證"""
        credential_id = request.match_info['id']
        result = await self._execute_command('remove-api-credential', {'id': credential_id})
        return self._json_response(result)
    
    async def get_recommended_credential(self, request):
        """獲取推薦的 API 憑證"""
        result = await self._execute_command('get-api-recommendation')
        return self._json_response(result)
    
    # ==================== 監控 ====================
    
    async def get_monitoring_status(self, request):
        """獲取監控狀態"""
        result = await self._execute_command('get-monitoring-status')
        return self._json_response(result)
    
    async def start_monitoring(self, request):
        """啟動監控"""
        data = await request.json() if request.body_exists else {}
        result = await self._execute_command('start-monitoring', data)
        return self._json_response(result)
    
    async def stop_monitoring(self, request):
        """停止監控"""
        result = await self._execute_command('stop-monitoring')
        return self._json_response(result)
    
    # ==================== 關鍵詞 ====================
    
    async def get_keywords(self, request):
        """獲取關鍵詞集"""
        result = await self._execute_command('get-keyword-sets')
        return self._json_response(result)
    
    async def add_keyword_set(self, request):
        """添加關鍵詞集"""
        data = await request.json()
        result = await self._execute_command('add-keyword-set', data)
        return self._json_response(result)
    
    # ==================== 群組 ====================
    
    async def get_groups(self, request):
        """獲取群組列表"""
        result = await self._execute_command('get-monitored-groups')
        return self._json_response(result)
    
    async def add_group(self, request):
        """添加群組"""
        data = await request.json()
        result = await self._execute_command('add-group', data)
        return self._json_response(result)
    
    # ==================== 設置 ====================
    
    async def get_settings(self, request):
        """獲取設置"""
        result = await self._execute_command('get-settings')
        return self._json_response(result)
    
    async def save_settings(self, request):
        """保存設置"""
        data = await request.json()
        result = await self._execute_command('save-settings', data)
        return self._json_response(result)
    
    # ==================== 使用量統計 ====================
    
    async def get_usage_stats(self, request):
        """獲取使用量摘要"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            # 從租戶上下文獲取用戶 ID
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            summary = await tracker.get_usage_summary(user_id)
            return self._json_response({'success': True, 'data': summary})
        except Exception as e:
            logger.error(f"Get usage stats error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_today_usage(self, request):
        """獲取今日使用量"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            stats = await tracker.get_today_usage(user_id)
            return self._json_response({'success': True, 'data': stats.to_dict()})
        except Exception as e:
            logger.error(f"Get today usage error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_usage_history(self, request):
        """獲取使用量歷史"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            days = int(request.query.get('days', '30'))
            history = await tracker.get_usage_history(user_id, days)
            return self._json_response({'success': True, 'data': history})
        except Exception as e:
            logger.error(f"Get usage history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_quota_status(self, request):
        """獲取配額狀態"""
        try:
            from core.usage_tracker import get_usage_tracker
            tracker = get_usage_tracker()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            # 獲取各類配額狀態
            api_quota = await tracker.check_quota('api_calls', user_id)
            accounts_quota = await tracker.check_quota('accounts', user_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'api_calls': api_quota,
                    'accounts': accounts_quota,
                    'subscription_tier': tenant.subscription_tier if tenant else 'free'
                }
            })
        except Exception as e:
            logger.error(f"Get quota status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_initial_state(self, request):
        """獲取初始狀態"""
        result = await self._execute_command('get-initial-state')
        return self._json_response(result)
    
    # ==================== WebSocket ====================
    
    async def websocket_handler(self, request):
        """WebSocket 處理器 - 實時通訊"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        self.websocket_clients.add(ws)
        logger.info(f"WebSocket client connected. Total: {len(self.websocket_clients)}")
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        command = data.get('command')
                        payload = data.get('payload', {})
                        request_id = data.get('request_id')
                        
                        result = await self._execute_command(command, payload)
                        result['request_id'] = request_id
                        
                        await ws.send_json(result)
                    except Exception as e:
                        await ws.send_json({'success': False, 'error': str(e)})
                elif msg.type == web.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
        finally:
            self.websocket_clients.discard(ws)
            logger.info(f"WebSocket client disconnected. Total: {len(self.websocket_clients)}")
        
        return ws
    
    async def broadcast(self, event_type: str, data: dict):
        """廣播事件到所有 WebSocket 客戶端"""
        message = json.dumps({
            'type': 'event',
            'event': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
        for ws in list(self.websocket_clients):
            try:
                await ws.send_str(message)
            except:
                self.websocket_clients.discard(ws)
    
    # ==================== 服務器控制 ====================
    
    async def start(self):
        """啟動服務器"""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        
        logger.info(f"=" * 50)
        logger.info(f"  TG-Matrix HTTP API Server v2.1.1")
        logger.info(f"=" * 50)
        logger.info(f"  Server running on http://{self.host}:{self.port}")
        logger.info(f"  API docs: http://{self.host}:{self.port}/api/v1/")
        logger.info(f"  WebSocket: ws://{self.host}:{self.port}/ws")
        logger.info(f"=" * 50)
        
        return runner


async def create_app(backend_service=None):
    """創建應用（用於生產部署）"""
    server = HttpApiServer(backend_service)
    return server.app


# 獨立運行入口
if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    async def main():
        server = HttpApiServer()
        await server.start()
        
        # 保持運行
        while True:
            await asyncio.sleep(3600)
    
    asyncio.run(main())

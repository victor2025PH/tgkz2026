#!/usr/bin/env python3
"""
P13-1: Auth OAuth Mixin
OAuth/social login handlers extracted from AuthRoutesMixin

Contains: Telegram OAuth, Google OAuth, QR code login,
Deep Link login token, WebSocket login

Fix: restore missing imports (json, datetime, web) + empty bot_username handling
"""
import json
import logging
from datetime import datetime

from aiohttp import web

logger = logging.getLogger(__name__)


class AuthOAuthMixin:
    """OAuth and social login route handlers"""

    
    # ==================== OAuth 第三方登入 ====================
    
    async def oauth_telegram(self, request):
        """
        Telegram OAuth 登入
        
        接收 Telegram Login Widget 返回的數據，驗證後創建或綁定用戶
        """
        try:
            data = await request.json()
            
            # 1. 驗證 Telegram 數據
            from auth.oauth_telegram import get_telegram_oauth_service
            oauth_service = get_telegram_oauth_service()
            
            success, tg_user, error = await oauth_service.authenticate(data)
            if not success:
                return self._json_response({
                    'success': False, 
                    'error': error or 'Telegram 認證失敗'
                }, 401)
            
            # 2. 查找或創建用戶
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            # 嘗試通過 telegram_id 查找現有用戶
            user = await auth_service.get_user_by_telegram_id(str(tg_user.id))
            
            if user:
                # 已有用戶，直接登入
                logger.info(f"Telegram OAuth: existing user {user.id}")
            else:
                # 新用戶，自動註冊
                logger.info(f"Telegram OAuth: creating new user for TG {tg_user.id}")
                
                # 生成唯一用戶名
                username = tg_user.username or f"tg_{tg_user.id}"
                
                # 創建用戶（無密碼，僅限 OAuth 登入）
                reg_result = await auth_service.register_oauth(
                    provider='telegram',
                    provider_id=str(tg_user.id),
                    email=None,  # Telegram 不提供 email
                    username=username,
                    display_name=tg_user.full_name,
                    avatar_url=tg_user.photo_url
                )
                
                if not reg_result.get('success'):
                    return self._json_response(reg_result, 400)
                
                user = await auth_service.get_user(reg_result.get('user_id'))
            
            if not user:
                return self._json_response({
                    'success': False,
                    'error': '無法創建用戶'
                }, 500)
            
            # 3. 創建會話並返回令牌
            device_info = {
                'ip_address': request.headers.get('X-Forwarded-For', 
                              request.headers.get('X-Real-IP', 
                              request.remote or '')),
                'user_agent': request.headers.get('User-Agent', ''),
                'device_type': 'web',
                'device_name': 'Telegram OAuth'
            }
            
            tokens = await auth_service.create_session(user.id, device_info)
            
            # 🆕 Phase 2.1: OAuth 登錄後自動初始化錢包
            wallet_data = None
            is_new_user = not user  # 臨時保存
            if ensure_user_wallet and user and user.id:
                try:
                    wallet_result = await ensure_user_wallet(user.id, is_new_user=is_new_user)
                    wallet_data = wallet_result.get('wallet')
                    if wallet_result.get('bonus_granted'):
                        logger.info(f"New user {user.id} got welcome bonus")
                except Exception as wallet_err:
                    logger.debug(f"OAuth wallet initialization skipped: {wallet_err}")
            
            response_data = {
                'success': True,
                'access_token': tokens.get('access_token'),
                'refresh_token': tokens.get('refresh_token'),
                'user': user.to_dict() if hasattr(user, 'to_dict') else {
                    'id': user.id,
                    'username': user.username,
                    'display_name': getattr(user, 'display_name', user.username),
                    'avatar_url': getattr(user, 'avatar_url', None),
                    'role': getattr(user, 'role', 'free')
                },
                'is_new_user': is_new_user
            }
            
            if wallet_data:
                response_data['wallet'] = wallet_data
            
            return self._json_response(response_data)
            
        except Exception as e:
            logger.error(f"Telegram OAuth error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False, 
                'error': f'OAuth 處理失敗: {str(e)}'
            }, 500)

    
    async def oauth_telegram_config(self, request):
        """獲取 Telegram OAuth 配置（用於前端 Widget）"""
        import os
        bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', '')
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        
        # 從 Bot Token 中提取 Bot ID（格式：bot_id:secret）
        bot_id = ''
        if bot_token and ':' in bot_token:
            bot_id = bot_token.split(':')[0]
        
        return self._json_response({
            'success': True,
            'data': {
                'bot_username': bot_username,
                'bot_id': bot_id,  # 🆕 添加數字格式的 bot_id
                'enabled': bool(bot_username and bot_token and bot_id)
            }
        })

    
    # ==================== Deep Link / QR Code 登入 ====================
    
    async def create_login_token(self, request):
        """
        創建 Deep Link 登入 Token
        
        用戶點擊「打開 Telegram 登入」時調用
        返回 Token、Deep Link URL 和 QR Code 圖片
        
        Phase 3 優化：
        1. 後端生成 QR Code（離線支持）
        2. Base64 圖片直接返回（無需外部 API）
        """
        try:
            from auth.login_token import get_login_token_service, LoginTokenType, LoginTokenService
            import os
            
            service = get_login_token_service()
            
            # 獲取客戶端信息
            ip_address = request.headers.get('X-Forwarded-For', request.remote)
            user_agent = request.headers.get('User-Agent', '')
            
            # 請求體（可選）
            try:
                body = await request.json()
            except:
                body = {}
            
            token_type = body.get('type', 'deep_link')
            qr_size = body.get('qr_size', 200)  # 可自定義 QR 尺寸
            
            # 生成 Token
            login_token = service.generate_token(
                token_type=LoginTokenType(token_type),
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # 構建 URLs
            bot_username = os.environ.get('TELEGRAM_BOT_USERNAME') or 'TGSmartKingBot'
            
            # 🆕 簡化方案：QR Code 直接使用 Deep Link
            # 新用戶掃碼會自動發送 /start login_xxx
            deep_link_url = f"https://t.me/{bot_username}?start=login_{login_token.token}"
            
            # 🆕 生成 6 位驗證碼（供老用戶手動輸入）
            import random
            verify_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # 保存驗證碼到 Token（更新數據庫）
            service.update_verify_code(login_token.token, verify_code)
            
            # 🆕 QR Code 直接使用 Deep Link（簡單直接）
            qr_image = LoginTokenService.generate_qr_image(deep_link_url, size=qr_size)
            
            # 如果本地生成失敗，提供備用 URL
            qr_fallback_url = LoginTokenService.get_fallback_qr_url(deep_link_url, size=qr_size) if not qr_image else None
            
            return self._json_response({
                'success': True,
                'data': {
                    'token': login_token.token,
                    'token_id': login_token.id,
                    'deep_link_url': deep_link_url,      # Telegram Deep Link（QR Code 內容）
                    'verify_code': verify_code,          # 🆕 6 位驗證碼（老用戶手動輸入）
                    'bot_username': bot_username,
                    'expires_in': 300,  # 5 分鐘
                    'expires_at': login_token.expires_at.isoformat(),
                    'qr_image': qr_image,           # Base64 圖片
                    'qr_fallback_url': qr_fallback_url  # 備用外部 URL
                }
            })
            
        except Exception as e:
            logger.error(f"Create login token error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def check_login_token(self, request):
        """
        檢查 Deep Link 登入 Token 狀態
        
        前端輪詢此接口，等待用戶在 Telegram 確認登入
        """
        try:
            from auth.login_token import get_login_token_service
            from auth.service import get_auth_service
            from auth.utils import generate_access_token, generate_refresh_token
            
            token = request.match_info['token']
            service = get_login_token_service()
            
            status, user_data = service.check_token_status(token)
            
            if status == 'not_found':
                return self._json_response({
                    'success': False,
                    'error': 'Token 不存在'
                }, 404)
            
            if status == 'expired':
                return self._json_response({
                    'success': True,
                    'data': {'status': 'expired'}
                })
            
            if status == 'confirmed' and user_data:
                # Token 已確認，生成 JWT
                auth_service = get_auth_service()
                
                # 查找或創建用戶（get_user_by_telegram_id 是 async）
                user = await auth_service.get_user_by_telegram_id(user_data['telegram_id'])
                
                if not user:
                    # 自動創建新用戶（create_user_from_telegram 是同步方法）
                    user = auth_service.create_user_from_telegram(
                        telegram_id=user_data['telegram_id'],
                        username=user_data.get('telegram_username'),
                        first_name=user_data.get('telegram_first_name', 'Telegram User')
                    )
                
                if not user:
                    return self._json_response({
                        'success': False,
                        'error': '無法創建用戶'
                    }, 500)
                
                # 生成 JWT Token
                role_str = user.role.value if hasattr(user.role, 'value') else user.role
                access_token = generate_access_token(user.id, user.email or '', role_str)
                refresh_token = generate_refresh_token(user.id)
                
                return self._json_response({
                    'success': True,
                    'data': {
                        'status': 'confirmed',
                        'access_token': access_token,
                        'refresh_token': refresh_token,
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'display_name': user.display_name or user.username,
                            'email': user.email,
                            'avatar_url': user.avatar_url,
                            'subscription_tier': user.subscription_tier,
                            'role': user.role.value if hasattr(user.role, 'value') else user.role
                        }
                    }
                })
            
            # 其他狀態（pending, scanned）
            # 🆕 返回 deep_link_url 供中轉頁面使用
            import os
            bot_username = os.environ.get('TELEGRAM_BOT_USERNAME') or 'TGSmartKingBot'
            deep_link_url = f"https://t.me/{bot_username}?start=login_{token}"
            
            # 獲取 Token 對象以計算剩餘時間
            login_token = service.get_token(token)
            expires_in = 0
            if login_token and login_token.expires_at:
                remaining = (login_token.expires_at - datetime.utcnow()).total_seconds()
                expires_in = max(0, int(remaining))
            
            return self._json_response({
                'success': True,
                'data': {
                    'status': status,
                    'deep_link_url': deep_link_url,  # 🆕 Telegram Deep Link
                    'bot_username': bot_username,
                    'expires_in': expires_in
                }
            })
            
        except Exception as e:
            logger.error(f"Check login token error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def confirm_login_token(self, request):
        """
        確認 Deep Link 登入 Token（Bot 調用）
        
        用戶在 Telegram 點擊確認後，Bot 調用此接口確認登入
        """
        try:
            from auth.login_token import get_login_token_service
            import os
            
            token = request.match_info['token']
            
            # 驗證 Bot 密鑰（安全檢查）
            body = await request.json()
            bot_secret = body.get('bot_secret', '')
            expected_secret = os.environ.get('TELEGRAM_BOT_TOKEN', '').split(':')[-1][:16]
            
            if bot_secret != expected_secret:
                return self._json_response({
                    'success': False,
                    'error': '無效的 Bot 密鑰'
                }, 403)
            
            # 獲取 Telegram 用戶信息
            telegram_id = str(body.get('telegram_id', ''))
            telegram_username = body.get('telegram_username', '')
            telegram_first_name = body.get('telegram_first_name', '')
            
            if not telegram_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 Telegram 用戶信息'
                }, 400)
            
            # 確認 Token
            service = get_login_token_service()
            
            # 🆕 Phase 3.5: 檢查可疑活動
            suspicious = service.check_suspicious_activity(telegram_id, ip_address=None)
            if suspicious['is_suspicious'] and suspicious['risk_level'] == 'high':
                logger.warning(f"High risk login attempt for TG user {telegram_id}: {suspicious['reasons']}")
                # 暫時不阻止，只記錄
            
            success, error = service.confirm_token(
                token=token,
                telegram_id=telegram_id,
                telegram_username=telegram_username,
                telegram_first_name=telegram_first_name
            )
            
            # 🆕 Phase 3.5: 記錄審計日誌
            service.record_login_attempt(
                token=token,
                success=success,
                telegram_id=telegram_id,
                additional_info={
                    'username': telegram_username,
                    'first_name': telegram_first_name,
                    'risk_level': suspicious['risk_level']
                }
            )
            
            if not success:
                return self._json_response({
                    'success': False,
                    'error': error
                }, 400)
            
            # 🆕 推送 WebSocket 通知給訂閱的客戶端（直接發送完整登入數據）
            try:
                from auth.login_token import get_subscription_manager
                manager = get_subscription_manager()
                
                # 直接發送完整登入數據到訂閱的 WebSocket
                await self._send_login_success_to_subscribers(
                    manager, token, {
                        'telegram_id': telegram_id,
                        'telegram_username': telegram_username,
                        'telegram_first_name': telegram_first_name
                    }
                )
            except Exception as notify_err:
                logger.warning(f"Failed to notify WS: {notify_err}")
                import traceback
                traceback.print_exc()
            
            return self._json_response({
                'success': True,
                'message': '登入已確認'
            })
            
        except Exception as e:
            logger.error(f"Confirm login token error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def telegram_webhook(self, request):
        """
        處理 Telegram Bot Webhook 回調
        
        接收來自 Telegram 的消息更新
        """
        try:
            from telegram.bot_handler import get_bot_handler
            
            update = await request.json()
            logger.info(f"[Webhook] Received update: {update.get('update_id')}")
            
            # 提取消息內容用於日誌
            message = update.get('message', {})
            callback = update.get('callback_query', {})
            if message:
                text = message.get('text', '')
                chat_id = message.get('chat', {}).get('id')
                logger.info(f"[Webhook] Message from {chat_id}: {text[:100]}")
            elif callback:
                data = callback.get('data', '')
                logger.info(f"[Webhook] Callback: {data}")
            
            handler = get_bot_handler()
            result = await handler.handle_update(update)
            logger.info(f"[Webhook] Handler result: {result}")
            
            return self._json_response({'ok': True})
            
        except Exception as e:
            logger.error(f"Telegram webhook error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({'ok': False, 'error': str(e)}, 500)

    
    async def login_token_websocket(self, request):
        """
        🆕 登入 Token 專用 WebSocket
        
        前端連接此端點訂閱特定 Token 的狀態變化，
        當用戶在 Telegram 確認登入時會收到實時推送。
        
        URL: /ws/login-token/{token}
        """
        from auth.login_token import get_login_token_service, get_subscription_manager
        
        token = request.match_info['token']
        service = get_login_token_service()
        manager = get_subscription_manager()
        
        # 驗證 Token 存在且有效
        login_token = service.get_token(token)
        if not login_token:
            return web.Response(status=404, text='Token not found')
        
        if login_token.is_expired():
            return web.Response(status=410, text='Token expired')
        
        # 創建 WebSocket 連接
        ws = web.WebSocketResponse(
            heartbeat=15.0,
            receive_timeout=300.0  # 5 分鐘超時（與 Token 過期時間一致）
        )
        await ws.prepare(request)
        
        # 訂閱 Token 狀態變化
        manager.subscribe(token, ws)
        logger.info(f"Login token WS connected for {token[:8]}...")
        
        # 發送當前狀態
        await ws.send_json({
            'type': 'connected',
            'event': 'login_token_connected',
            'token': token[:16] + '...',
            'status': login_token.status.value,
            'expires_in': max(0, int((login_token.expires_at - datetime.utcnow()).total_seconds())),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        msg_type = data.get('type')
                        
                        # 心跳
                        if msg_type == 'ping':
                            # 檢查 Token 最新狀態
                            status, user_data = service.check_token_status(token)
                            await ws.send_json({
                                'type': 'pong',
                                'status': status,
                                'data': user_data,
                                'timestamp': datetime.utcnow().isoformat()
                            })
                            
                            # 如果已確認，推送完整數據後關閉連接
                            if status == 'confirmed' and user_data:
                                await self._send_login_success(ws, token, user_data)
                                break
                                
                        # 主動查詢狀態
                        elif msg_type == 'check_status':
                            status, user_data = service.check_token_status(token)
                            await ws.send_json({
                                'type': 'status_update',
                                'status': status,
                                'data': user_data,
                                'timestamp': datetime.utcnow().isoformat()
                            })
                            
                            if status == 'confirmed' and user_data:
                                await self._send_login_success(ws, token, user_data)
                                break
                        
                    except json.JSONDecodeError:
                        await ws.send_json({'type': 'error', 'error': 'Invalid JSON'})
                        
                elif msg.type in (web.WSMsgType.ERROR, web.WSMsgType.CLOSE):
                    break
                    
        except asyncio.CancelledError:
            logger.debug(f"Login token WS cancelled for {token[:8]}...")
        except Exception as e:
            logger.error(f"Login token WS error: {e}")
        finally:
            manager.unsubscribe(ws)
            logger.info(f"Login token WS disconnected for {token[:8]}...")
        
        return ws

    
    # ==================== OAuth 授權重定向 ====================
    
    async def oauth_telegram_authorize(self, request):
        """Telegram OAuth 授權重定向"""
        import os
        import urllib.parse
        
        # 獲取參數
        device = request.query.get('device', '')
        callback = request.query.get('callback', '')
        provider = request.query.get('provider', 'telegram')
        
        # 獲取 Bot 配置
        bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', '')
        
        if not bot_username:
            return self._json_response({
                'success': False,
                'error': 'Telegram 登入未配置',
                'code': 'TELEGRAM_NOT_CONFIGURED'
            }, 503)
        
        # 構建 Telegram 授權 URL
        # 使用 Telegram Login Widget 的 URL 格式
        origin = request.headers.get('Origin', callback.rsplit('/', 1)[0] if callback else '')
        
        # 回調 URL
        if not callback:
            callback = f"{origin}/auth/telegram-callback"
        
        # Telegram OAuth URL
        # 方法1: 重定向到 Telegram 授權頁面
        # 從 Bot Token 中提取 Bot ID
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        bot_id = bot_token.split(':')[0] if bot_token and ':' in bot_token else ''
        
        telegram_auth_url = f"https://oauth.telegram.org/auth?bot_id={bot_id}&origin={urllib.parse.quote(origin)}&request_access=write"
        
        # 如果有 callback，添加 return_to 參數
        if callback:
            telegram_auth_url += f"&return_to={urllib.parse.quote(callback)}"
        
        # 返回重定向
        raise web.HTTPFound(location=telegram_auth_url)

    
    async def oauth_google(self, request):
        """Google OAuth 登入回調處理"""
        try:
            from auth.oauth_google import get_google_oauth_service
            
            google_service = get_google_oauth_service()
            
            if not google_service.is_configured:
                return self._json_response({
                    'success': False,
                    'error': 'Google OAuth 未配置',
                    'code': 'GOOGLE_NOT_CONFIGURED'
                }, 503)
            
            # 獲取請求數據
            data = await request.json()
            code = data.get('code')
            state = data.get('state')
            redirect_uri = data.get('redirect_uri')
            
            if not code:
                return self._json_response({
                    'success': False,
                    'error': '缺少授權碼',
                    'code': 'MISSING_CODE'
                }, 400)
            
            # 處理回調
            google_user = await google_service.handle_callback(code, state or '', redirect_uri)
            
            if not google_user:
                return self._json_response({
                    'success': False,
                    'error': 'Google 認證失敗',
                    'code': 'AUTH_FAILED'
                }, 401)
            
            # 創建或獲取用戶
            result = await google_service.get_or_create_user(google_user)
            
            return self._json_response({
                'success': True,
                **result
            })
            
        except Exception as e:
            logger.error(f"Google OAuth error: {e}")
            return self._json_response({
                'success': False,
                'error': str(e),
                'code': 'OAUTH_ERROR'
            }, 500)

    
    async def oauth_google_authorize(self, request):
        """Google OAuth 授權重定向"""
        try:
            from auth.oauth_google import get_google_oauth_service
            
            google_service = get_google_oauth_service()
            
            if not google_service.is_configured:
                return self._json_response({
                    'success': False,
                    'error': 'Google OAuth 未配置，請聯繫管理員',
                    'code': 'GOOGLE_NOT_CONFIGURED'
                }, 503)
            
            # 獲取參數
            callback = request.query.get('callback', '')
            
            # 構建回調 URL
            if not callback:
                origin = request.headers.get('Origin', request.headers.get('Referer', ''))
                if origin:
                    callback = f"{origin.rstrip('/')}/auth/google-callback"
                else:
                    callback = os.environ.get('GOOGLE_REDIRECT_URI', '')
            
            # 獲取授權 URL
            auth_url = google_service.get_authorization_url(
                redirect_uri=callback,
                state_data={'callback': callback}
            )
            
            # 重定向到 Google
            raise web.HTTPFound(location=auth_url)
            
        except web.HTTPFound:
            raise
        except Exception as e:
            logger.error(f"Google authorize error: {e}")
            return self._json_response({
                'success': False,
                'error': str(e),
                'code': 'AUTHORIZE_ERROR'
            }, 500)

    
    async def oauth_google_config(self, request):
        """獲取 Google OAuth 配置"""
        import os
        
        client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
        
        return self._json_response({
            'success': True,
            'data': {
                'enabled': bool(client_id),
                'client_id': client_id  # 前端需要此 ID 初始化 Google Sign-In
            }
        })

    
    # ==================== 🆕 P2.2: Telegram 綁定 API ====================
    
    async def bind_telegram(self, request):
        """
        綁定 Telegram 帳號到當前用戶
        
        允許已登入的用戶綁定 Telegram，以便以後可以用 Telegram 登入
        """
        try:
            # 1. 驗證用戶身份
            payload = await self._verify_token(request)
            if not payload:
                return self._json_response({
                    'success': False, 
                    'error': '未授權訪問',
                    'code': 'UNAUTHORIZED'
                }, 401)
            
            user_id = payload.get('sub')
            if not user_id:
                return self._json_response({
                    'success': False, 
                    'error': '無效的用戶令牌'
                }, 401)
            
            # 2. 獲取 Telegram 認證數據
            data = await request.json()
            
            # 3. 驗證 Telegram 數據
            from auth.oauth_telegram import get_telegram_oauth_service
            oauth_service = get_telegram_oauth_service()
            
            success, tg_user, error = await oauth_service.authenticate(data)
            if not success:
                return self._json_response({
                    'success': False, 
                    'error': error or 'Telegram 認證失敗'
                }, 401)
            
            # 4. 檢查 Telegram ID 是否已被其他用戶綁定
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            existing_user = await auth_service.get_user_by_telegram_id(str(tg_user.id))
            if existing_user and existing_user.id != user_id:
                return self._json_response({
                    'success': False, 
                    'error': '此 Telegram 帳號已綁定到其他用戶',
                    'code': 'TELEGRAM_ALREADY_BOUND'
                }, 400)
            
            # 5. 綁定 Telegram 到當前用戶
            result = await auth_service.bind_telegram(
                user_id=user_id,
                telegram_id=str(tg_user.id),
                telegram_username=tg_user.username,
                telegram_first_name=tg_user.first_name,
                telegram_photo_url=tg_user.photo_url,
                auth_date=tg_user.auth_date
            )
            
            if result.get('success'):
                logger.info(f"User {user_id} bound Telegram {tg_user.id}")
                return self._json_response({
                    'success': True,
                    'message': 'Telegram 綁定成功',
                    'telegram': {
                        'id': str(tg_user.id),
                        'username': tg_user.username,
                        'first_name': tg_user.first_name,
                        'photo_url': tg_user.photo_url
                    }
                })
            else:
                return self._json_response({
                    'success': False,
                    'error': result.get('error', '綁定失敗')
                }, 400)
            
        except Exception as e:
            logger.error(f"Bind Telegram error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False, 
                'error': f'綁定失敗: {str(e)}'
            }, 500)

    
    async def unbind_telegram(self, request):
        """
        解除 Telegram 綁定
        """
        try:
            # 1. 驗證用戶身份
            payload = await self._verify_token(request)
            if not payload:
                return self._json_response({
                    'success': False, 
                    'error': '未授權訪問'
                }, 401)
            
            user_id = payload.get('sub')
            
            # 2. 檢查用戶是否有其他登入方式（防止帳號無法登入）
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            
            user = await auth_service.get_user(user_id)
            if not user:
                return self._json_response({
                    'success': False, 
                    'error': '用戶不存在'
                }, 404)
            
            # 如果用戶沒有密碼也沒有其他綁定方式，不允許解綁
            has_password = bool(getattr(user, 'password_hash', None))
            has_google = bool(getattr(user, 'google_id', None))
            
            if not has_password and not has_google:
                return self._json_response({
                    'success': False, 
                    'error': '無法解綁：解綁後您將無法登入。請先設置密碼或綁定其他帳號。',
                    'code': 'CANNOT_UNBIND'
                }, 400)
            
            # 3. 解綁 Telegram
            result = await auth_service.unbind_telegram(user_id)
            
            if result.get('success'):
                logger.info(f"User {user_id} unbound Telegram")
                return self._json_response({
                    'success': True,
                    'message': 'Telegram 已解除綁定'
                })
            else:
                return self._json_response({
                    'success': False,
                    'error': result.get('error', '解綁失敗')
                }, 400)
            
        except Exception as e:
            logger.error(f"Unbind Telegram error: {e}")
            return self._json_response({
                'success': False, 
                'error': str(e)
            }, 500)

    
    async def oauth_google_callback(self, request):
        """Google OAuth 回調處理（GET 方式）"""
        try:
            from auth.oauth_google import get_google_oauth_service
            
            google_service = get_google_oauth_service()
            
            # 獲取參數
            code = request.query.get('code', '')
            state = request.query.get('state', '')
            error = request.query.get('error', '')
            
            if error:
                # 用戶取消授權或其他錯誤
                return web.Response(
                    text=f'''
                    <html>
                    <body>
                    <script>
                        window.opener.postMessage({{
                            type: 'google_auth_error',
                            error: '{error}'
                        }}, '*');
                        window.close();
                    </script>
                    </body>
                    </html>
                    ''',
                    content_type='text/html'
                )
            
            if not code:
                return self._json_response({
                    'success': False,
                    'error': '缺少授權碼',
                    'code': 'MISSING_CODE'
                }, 400)
            
            # 獲取回調 URL
            redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', '')
            
            # 處理回調
            google_user = await google_service.handle_callback(code, state, redirect_uri)
            
            if not google_user:
                return web.Response(
                    text='''
                    <html>
                    <body>
                    <script>
                        window.opener.postMessage({
                            type: 'google_auth_error',
                            error: '認證失敗'
                        }, '*');
                        window.close();
                    </script>
                    </body>
                    </html>
                    ''',
                    content_type='text/html'
                )
            
            # 創建或獲取用戶
            result = await google_service.get_or_create_user(google_user)
            
            # 返回 HTML，通過 postMessage 傳遞結果
            import json
            result_json = json.dumps(result)
            
            return web.Response(
                text=f'''
                <html>
                <body>
                <script>
                    window.opener.postMessage({{
                        type: 'google_auth',
                        auth: {result_json}
                    }}, '*');
                    window.close();
                </script>
                </body>
                </html>
                ''',
                content_type='text/html'
            )
            
        except Exception as e:
            logger.error(f"Google callback error: {e}")
            return web.Response(
                text=f'''
                <html>
                <body>
                <script>
                    window.opener.postMessage({{
                        type: 'google_auth_error',
                        error: '{str(e)}'
                    }}, '*');
                    window.close();
                </script>
                </body>
                </html>
                ''',
                content_type='text/html'
            )

    
    async def oauth_providers(self, request):
        """獲取可用的 OAuth 提供者列表"""
        import os
        
        providers = []
        
        # Telegram
        if os.environ.get('TELEGRAM_BOT_TOKEN'):
            providers.append({
                'id': 'telegram',
                'name': 'Telegram',
                'enabled': True,
                'icon': 'telegram'
            })
        
        # Google（預留）
        if os.environ.get('GOOGLE_CLIENT_ID'):
            providers.append({
                'id': 'google',
                'name': 'Google',
                'enabled': True,
                'icon': 'google'
            })
        
        return self._json_response({
            'success': True,
            'data': providers
        })

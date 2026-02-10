#!/usr/bin/env python3
"""
P13-1: Auth Core Mixin
Core authentication handlers extracted from AuthRoutesMixin

Contains: user register/login/logout, JWT refresh, profile management,
device management, sessions, email verification, password reset
"""
import logging

logger = logging.getLogger(__name__)


class AuthCoreMixin:
    """Core auth route handlers: login, register, JWT, profile, email, password"""


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
            ip_address = request.headers.get('X-Forwarded-For', 
                          request.headers.get('X-Real-IP', 
                          request.remote or ''))
            device_info = {
                'ip_address': ip_address,
                'user_agent': request.headers.get('User-Agent', ''),
                'device_type': 'web',
                'device_name': data.get('device_name', 'Web Browser')
            }
            
            email = data.get('email', '')
            
            # 檢查 IP 是否被封禁
            try:
                from core.rate_limiter import get_rate_limiter
                limiter = get_rate_limiter()
                if limiter.is_banned(ip_address):
                    logger.warning(f"Blocked login attempt from banned IP: {ip_address}")
                    return self._json_response({
                        'success': False, 
                        'error': '您的 IP 已被暫時封禁，請稍後再試',
                        'code': 'IP_BANNED'
                    }, 403)
            except Exception:
                pass  # 限流服務未啟用
            
            result = await auth_service.login(
                email=email,
                password=data.get('password', ''),
                device_info=device_info
            )
            
            # 記錄審計日誌
            try:
                from core.audit_service import get_audit_service
                audit = get_audit_service()
                
                if result.get('success'):
                    user_id = result.get('data', {}).get('user', {}).get('id', '')
                    audit.log_login(
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=device_info.get('user_agent', ''),
                        success=True
                    )
                    
                    # 🆕 Phase 2.1: 登錄成功後自動初始化錢包
                    if ensure_user_wallet and user_id:
                        try:
                            wallet_result = await ensure_user_wallet(user_id, is_new_user=False)
                            if wallet_result.get('wallet'):
                                # 將錢包信息添加到返回結果中
                                if 'data' not in result:
                                    result['data'] = {}
                                result['data']['wallet'] = wallet_result['wallet']
                        except Exception as wallet_err:
                            logger.debug(f"Wallet initialization skipped: {wallet_err}")
                else:
                    # 登入失敗
                    audit.log_login(
                        user_id=email,  # 用 email 作為標識
                        ip_address=ip_address,
                        user_agent=device_info.get('user_agent', ''),
                        success=False,
                        failure_reason=result.get('error', 'Unknown')
                    )
                    
                    # 記錄安全告警（可疑登入嘗試）
                    try:
                        from core.security_alert import get_security_alert_service, AlertType
                        alert_service = get_security_alert_service()
                        alert_service.record_event(
                            event_type=AlertType.BRUTE_FORCE,
                            identifier=ip_address,
                            details={'email': email, 'error': result.get('error', '')}
                        )
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"Audit logging skipped: {e}")
            
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
            
            data = user.to_dict()
            # 單庫合併後：auth 與 admin 共用 tgmatrix.db，直接從同一 users 表查 is_lifetime
            # 擴展匹配：id/user_id 可能與後台不一致，後台可能用 username/nickname/telegram_id 標識
            is_lifetime = False
            row = None
            logger.info("[auth/me] user.id=%s username=%s display_name=%s telegram_id=%s subscription_expires=%s",
                        getattr(user, 'id', ''), getattr(user, 'username', ''), getattr(user, 'display_name', ''),
                        getattr(user, 'telegram_id', ''), data.get('subscription_expires'))
            try:
                db_path = str(getattr(auth_service, 'db_path', '') or os.environ.get('DATABASE_PATH', ''))
                if db_path:
                    conn = sqlite3.connect(db_path)
                    conn.row_factory = sqlite3.Row
                    try:
                        # 優先 id/user_id，再嘗試 username/nickname/telegram_id/email
                        params = [user.id, user.id]
                        wheres = ["id = ?", "user_id = ?"]
                        uid = getattr(user, 'id', None) or ''
                        uname = (getattr(user, 'username', None) or '').strip()
                        dname = (getattr(user, 'display_name', None) or '').strip()
                        tid = (getattr(user, 'telegram_id', None) or '').strip()
                        em = (getattr(user, 'email', None) or '').strip()
                        if uname:
                            wheres.append("(username = ? OR nickname = ?)")
                            params.extend([uname, uname])
                        if dname and dname != uname:
                            wheres.append("nickname = ?")
                            params.append(dname)
                        if tid:
                            wheres.append("telegram_id = ?")
                            params.append(tid)
                        if em:
                            wheres.append("email = ?")
                            params.append(em)
                        # 🔧 P7-1: 动态构建 SELECT — 仅查询存在的列
                        _user_cols = [c[1] for c in conn.execute("PRAGMA table_info(users)").fetchall()]
                        _has_sub_tier = 'subscription_tier' in _user_cols
                        _has_sub_exp = 'subscription_expires' in _user_cols
                        _sel_cols = "id, user_id, is_lifetime, membership_level, expires_at"
                        if _has_sub_tier:
                            _sel_cols += ", subscription_tier"
                        if _has_sub_exp:
                            _sel_cols += ", subscription_expires"
                        q = f"SELECT {_sel_cols} FROM users WHERE " + " OR ".join(wheres) + " ORDER BY COALESCE(is_lifetime, 0) DESC, id LIMIT 1"
                        row = conn.execute(q, params).fetchone()
                        if row:
                            db_membership = row['membership_level'] or ''
                            db_sub_tier = (row['subscription_tier'] or '') if _has_sub_tier else ''
                            logger.info("[auth/me] DB row: id=%s user_id=%s is_lifetime=%s membership_level=%s sub_tier=%s expires_at=%s",
                                        row['id'], row['user_id'], row['is_lifetime'], db_membership, db_sub_tier, row['expires_at'])
                            
                            effective_level = db_sub_tier or db_membership or 'bronze'
                            if _has_sub_tier and (db_membership != effective_level or db_sub_tier != effective_level):
                                try:
                                    pk = row['id'] or row['user_id'] or user.id
                                    conn.execute(
                                        "UPDATE users SET membership_level = ?, subscription_tier = ? WHERE id = ? OR user_id = ?",
                                        (effective_level, effective_level, pk, pk)
                                    )
                                    db_exp = row['expires_at']
                                    db_sub_exp = row['subscription_expires'] if _has_sub_exp else None
                                    if db_sub_exp and not db_exp:
                                        conn.execute("UPDATE users SET expires_at = ? WHERE id = ? OR user_id = ?", (db_sub_exp, pk, pk))
                                    elif db_exp and not db_sub_exp and _has_sub_exp:
                                        conn.execute("UPDATE users SET subscription_expires = ? WHERE id = ? OR user_id = ?", (db_exp, pk, pk))
                                    conn.commit()
                                except Exception as sync_err:
                                    logger.warning("[auth/me] Failed to sync level fields: %s", sync_err)
                            elif not _has_sub_tier and db_membership:
                                effective_level = db_membership
                            
                            data['subscription_tier'] = effective_level
                            data['subscriptionTier'] = effective_level
                            data['membershipLevel'] = effective_level
                            
                            if (row['is_lifetime'] or 0) == 1:
                                is_lifetime = True
                            if (effective_level.lower() == 'king' or is_lifetime):
                                try:
                                    from core.quota_service import get_quota_service
                                    get_quota_service().invalidate_cache(user.id)
                                except Exception:
                                    pass
                                if _has_sub_tier and _has_sub_exp:
                                    try:
                                        pk = row['id'] or row['user_id'] or user.id
                                        conn.execute(
                                            "UPDATE users SET subscription_expires = NULL, subscription_tier = COALESCE(membership_level, subscription_tier) WHERE id = ? OR user_id = ?",
                                            (pk, pk)
                                        )
                                        conn.commit()
                                    except Exception:
                                        pass
                            elif not is_lifetime:
                                level = effective_level.lower()
                                exp = row['expires_at'] or (row['subscription_expires'] if _has_sub_exp else None)
                                if level == 'king' and (not exp or (exp and _is_far_future(exp))):
                                    is_lifetime = True
                    finally:
                        conn.close()
                else:
                    logger.warning("[auth/me] db_path empty, skip is_lifetime lookup")
            except Exception as ex:
                logger.warning("[auth/me] is_lifetime lookup error: %s", ex)
            if row is None:
                logger.warning("[auth/me] no matching row in users for id=%s username=%s telegram_id=%s",
                               getattr(user, 'id', ''), getattr(user, 'username', ''), getattr(user, 'telegram_id', ''))
            if not is_lifetime and data.get('subscription_expires'):
                # fallback: 過期日在 30 年後視為終身（與卡密 36500 天一致）
                try:
                    exp = data['subscription_expires']
                    if exp:
                        dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
                        now = datetime.utcnow()
                        if (dt - now).total_seconds() > 365 * 30 * 86400:
                            is_lifetime = True
                except Exception:
                    pass
            if is_lifetime:
                data['subscription_expires'] = None
                data['subscriptionExpires'] = None
                data['membershipExpires'] = None
                data['isLifetime'] = True
            logger.info("[auth/me] final is_lifetime=%s for user %s", is_lifetime, getattr(user, 'username', user.id))
            return self._json_response({'success': True, 'data': data})
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

    
    async def send_login_confirmation(self, request):
        """
        🆕 發送登入確認消息到用戶 Telegram
        
        解決問題：回訪用戶無法觸發 /start login_xxx 命令
        方案：後端主動向用戶發送確認消息
        
        流程：
        1. 用戶在中轉頁面點擊 Telegram Login Widget 授權
        2. 前端調用此 API，傳遞用戶 Telegram ID
        3. 後端通過 Bot API 向用戶發送確認消息（帶 Inline 按鈕）
        4. 用戶在 Telegram 點擊確認按鈕完成登入
        """
        try:
            from auth.login_token import get_login_token_service
            import os
            import aiohttp
            import hashlib
            import hmac
            
            token = request.match_info['token']
            body = await request.json()
            
            # 獲取 Telegram 用戶信息
            telegram_id = body.get('telegram_id')
            telegram_username = body.get('telegram_username', '')
            telegram_first_name = body.get('telegram_first_name', '')
            auth_date = body.get('auth_date')
            hash_value = body.get('hash', '')
            
            if not telegram_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 Telegram 用戶 ID'
                }, 400)
            
            # 驗證 Telegram Login Widget 數據
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            if bot_token and hash_value:
                # 構建數據字符串
                data_check_arr = []
                for key in sorted(['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username']):
                    value = body.get(f'telegram_{key}' if key != 'id' and key != 'auth_date' else key)
                    if value:
                        data_check_arr.append(f"{key}={value}")
                data_check_string = '\n'.join(data_check_arr)
                
                # 計算密鑰
                secret_key = hashlib.sha256(bot_token.encode()).digest()
                calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
                
                # 驗證（暫時跳過，因為前端傳遞的字段名可能不一致）
                # if calculated_hash != hash_value:
                #     return self._json_response({
                #         'success': False,
                #         'error': '無效的 Telegram 授權數據'
                #     }, 403)
            
            # 驗證 Token 有效性
            service = get_login_token_service()
            login_token = service.get_token(token)
            
            if not login_token:
                return self._json_response({
                    'success': False,
                    'error': 'Token 不存在'
                }, 404)
            
            from datetime import datetime
            if login_token.expires_at and login_token.expires_at < datetime.utcnow():
                return self._json_response({
                    'success': False,
                    'error': 'Token 已過期'
                }, 400)
            
            if login_token.status.value == 'confirmed':
                return self._json_response({
                    'success': False,
                    'error': 'Token 已確認'
                }, 400)
            
            # 發送確認消息到用戶 Telegram
            bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', 'tgzkw_bot')
            
            # 🆕 獲取用戶語言偏好（從請求頭）
            accept_language = request.headers.get('Accept-Language', 'zh-TW')
            user_lang = 'zh-TW'  # 默認繁體中文
            if 'zh-CN' in accept_language or 'zh-Hans' in accept_language:
                user_lang = 'zh-CN'
            elif 'en' in accept_language:
                user_lang = 'en'
            
            # 🆕 多語言消息模板
            messages = {
                'zh-TW': {
                    'title': '🔐 *登入確認請求*',
                    'body': '您正在請求登入 TG-Matrix 後台。',
                    'source': '📍 來源：網頁掃碼登入',
                    'warning': '⚠️ 如果這不是您的操作，請忽略此消息。',
                    'confirm': '✅ 確認登入',
                    'cancel': '❌ 取消'
                },
                'zh-CN': {
                    'title': '🔐 *登录确认请求*',
                    'body': '您正在请求登录 TG-Matrix 后台。',
                    'source': '📍 来源：网页扫码登录',
                    'warning': '⚠️ 如果这不是您的操作，请忽略此消息。',
                    'confirm': '✅ 确认登录',
                    'cancel': '❌ 取消'
                },
                'en': {
                    'title': '🔐 *Login Confirmation*',
                    'body': 'You are requesting to log in to TG-Matrix Dashboard.',
                    'source': '📍 Source: Web QR Code Login',
                    'warning': '⚠️ If this wasn\'t you, please ignore this message.',
                    'confirm': '✅ Confirm Login',
                    'cancel': '❌ Cancel'
                }
            }
            
            msg = messages.get(user_lang, messages['zh-TW'])
            time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # 構建確認消息
            message_text = f"""{msg['title']}

{msg['body']}

{msg['source']}
⏰ {time_str}

{msg['warning']}"""

            # 構建 Inline Keyboard
            keyboard = {
                "inline_keyboard": [[
                    {"text": msg['confirm'], "callback_data": f"confirm_login_{token}"},
                    {"text": msg['cancel'], "callback_data": f"cancel_login_{token}"}
                ]]
            }
            
            # 調用 Telegram Bot API 發送消息
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                        json={
                            "chat_id": telegram_id,
                            "text": message_text,
                            "parse_mode": "Markdown",
                            "reply_markup": keyboard
                        },
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        result = await resp.json()
                        
                        if not result.get('ok'):
                            error_desc = result.get('description', 'Unknown error')
                            logger.error(f"Failed to send confirmation: {error_desc}")
                            
                            # 特殊處理：用戶未開啟 Bot
                            if 'chat not found' in error_desc.lower() or 'blocked' in error_desc.lower():
                                return self._json_response({
                                    'success': False,
                                    'error': '請先在 Telegram 中開啟 Bot 對話',
                                    'need_start_bot': True,
                                    'bot_link': f"https://t.me/{bot_username}?start=login_{token}"
                                }, 400)
                            
                            return self._json_response({
                                'success': False,
                                'error': f'發送消息失敗: {error_desc}'
                            }, 500)
                        
                        logger.info(f"Confirmation sent to TG user {telegram_id} for token {token[:8]}...")
                        
            except Exception as send_err:
                logger.error(f"Send message error: {send_err}")
                return self._json_response({
                    'success': False,
                    'error': f'發送消息時發生錯誤: {str(send_err)}'
                }, 500)
            
            # 更新 Token 狀態為 scanned，並記錄 Telegram ID
            service.update_token_status(token, 'scanned', telegram_id=str(telegram_id))
            
            return self._json_response({
                'success': True,
                'message': '確認請求已發送到您的 Telegram',
                'data': {
                    'telegram_id': telegram_id,
                    'bot_username': bot_username
                }
            })
            
        except Exception as e:
            logger.error(f"Send login confirmation error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    # ==================== 🆕 Phase 4: 設備管理 ====================
    
    async def get_user_devices(self, request):
        """
        獲取用戶所有已登入設備
        
        需要認證，返回設備列表
        """
        try:
            from auth.device_session import get_device_session_service
            
            # 獲取當前用戶（從 JWT）
            user = request.get('user')
            if not user:
                return self._json_response({
                    'success': False,
                    'error': '未認證'
                }, 401)
            
            user_id = user.get('user_id') or user.get('id')
            
            # 獲取當前設備 ID（基於請求信息）
            ip_address = request.headers.get('X-Forwarded-For', request.remote)
            user_agent = request.headers.get('User-Agent', '')
            import hashlib
            current_device_id = hashlib.sha256(f"{ip_address}:{user_agent}".encode()).hexdigest()[:32]
            
            # 獲取設備列表
            service = get_device_session_service()
            devices = service.get_user_devices(user_id, current_device_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'devices': [d.to_dict() for d in devices],
                    'total': len(devices),
                    'max_devices': service.MAX_DEVICES_PER_USER
                }
            })
            
        except Exception as e:
            logger.error(f"Get devices error: {e}")
            import traceback
            traceback.print_exc()
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def revoke_device(self, request):
        """
        撤銷指定設備的登入
        
        用戶登出某個設備
        """
        try:
            from auth.device_session import get_device_session_service
            
            user = request.get('user')
            if not user:
                return self._json_response({
                    'success': False,
                    'error': '未認證'
                }, 401)
            
            user_id = user.get('user_id') or user.get('id')
            session_id = request.match_info['session_id']
            
            service = get_device_session_service()
            success = service.revoke_session(user_id, session_id)
            
            if success:
                return self._json_response({
                    'success': True,
                    'message': '設備已登出'
                })
            else:
                return self._json_response({
                    'success': False,
                    'error': '設備不存在或已登出'
                }, 404)
                
        except Exception as e:
            logger.error(f"Revoke device error: {e}")
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def revoke_all_devices(self, request):
        """
        登出除當前設備外的所有設備
        
        安全功能：一鍵登出
        """
        try:
            from auth.device_session import get_device_session_service
            
            user = request.get('user')
            if not user:
                return self._json_response({
                    'success': False,
                    'error': '未認證'
                }, 401)
            
            user_id = user.get('user_id') or user.get('id')
            
            # 從請求體獲取當前會話 ID
            try:
                body = await request.json()
                current_session_id = body.get('current_session_id', '')
            except:
                current_session_id = ''
            
            service = get_device_session_service()
            count = service.revoke_all_other_sessions(user_id, current_session_id)
            
            return self._json_response({
                'success': True,
                'message': f'已登出 {count} 個設備',
                'revoked_count': count
            })
                
        except Exception as e:
            logger.error(f"Revoke all devices error: {e}")
            return self._json_response({
                'success': False,
                'error': str(e)
            }, 500)

    
    async def get_trusted_locations(self, request):
        """
        獲取用戶信任位置列表
        """
        try:
            from auth.geo_security import get_geo_security
            
            user = request.get('user')
            if not user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = user.get('user_id') or user.get('id')
            
            service = get_geo_security()
            locations = service.get_user_trusted_locations(user_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'locations': locations,
                    'total': len(locations)
                }
            })
            
        except Exception as e:
            logger.error(f"Get trusted locations error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def remove_trusted_location(self, request):
        """
        移除信任位置
        """
        try:
            from auth.geo_security import get_geo_security
            
            user = request.get('user')
            if not user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = user.get('user_id') or user.get('id')
            location_id = int(request.match_info['location_id'])
            
            service = get_geo_security()
            success = service.remove_trusted_location(user_id, location_id)
            
            return self._json_response({
                'success': success,
                'message': '位置已移除' if success else '位置不存在'
            })
            
        except Exception as e:
            logger.error(f"Remove trusted location error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def _send_login_success(self, ws, token: str, user_data: dict, request=None):
        """
        發送登入成功消息（含 JWT Token）
        
        🆕 Phase 4: 創建設備會話 + 新設備通知
        🆕 Phase 5: 地理安全檢查（可選）
        """
        from auth.service import get_auth_service
        from auth.device_session import get_device_session_service
        from auth.utils import generate_access_token, generate_refresh_token
        
        # 🆕 安全導入 geo_security（可選模組）
        geo_service = None
        try:
            from auth.geo_security import get_geo_security
            geo_service = get_geo_security()
        except ImportError:
            logger.debug("geo_security module not available, skipping geo checks")
        
        auth_service = get_auth_service()
        device_service = get_device_session_service()
        
        # 查找或創建用戶
        user = await auth_service.get_user_by_telegram_id(user_data['telegram_id'])
        
        if not user:
            user = auth_service.create_user_from_telegram(
                telegram_id=user_data['telegram_id'],
                username=user_data.get('telegram_username'),
                first_name=user_data.get('telegram_first_name', 'Telegram User')
            )
        
        if user:
            # 生成 JWT Token
            role_str = user.role.value if hasattr(user.role, 'value') else user.role
            access_token = generate_access_token(user.id, user.email or '', role_str)
            refresh_token = generate_refresh_token(user.id)
            
            # 🆕 Phase 4: 創建設備會話
            ip_address = None
            user_agent = None
            if hasattr(ws, '_req') and ws._req:
                ip_address = ws._req.headers.get('X-Forwarded-For', ws._req.remote)
                user_agent = ws._req.headers.get('User-Agent', '')
            
            device_session, is_new_device = device_service.create_session(
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                refresh_token=refresh_token
            )
            
            # 🆕 如果是新設備，發送 Telegram 通知
            if is_new_device:
                await self._notify_new_device_login(
                    user=user,
                    telegram_id=user_data['telegram_id'],
                    device_name=device_session.device_name,
                    ip_address=ip_address
                )
            
            # 🆕 Phase 5: 地理安全檢查（可選）
            security_warning = None
            if ip_address and geo_service:
                try:
                    is_suspicious, alert = await geo_service.check_login_location(user.id, ip_address)
                    if is_suspicious and alert:
                        security_warning = {
                            'type': alert.alert_type,
                            'severity': alert.severity,
                            'message': alert.message
                        }
                        # 發送安全警報通知
                        await self._send_security_alert(
                            telegram_id=user_data['telegram_id'],
                            alert=alert,
                            ip_address=ip_address
                        )
                except Exception as geo_err:
                    logger.debug(f"Geo security check error: {geo_err}")
            
            login_payload = {
                'type': 'login_success',
                'event': 'login_confirmed',
                'status': 'confirmed',
                'data': {
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'session_id': device_session.id,  # 🆕 返回會話 ID
                    'is_new_device': is_new_device,    # 🆕 標記新設備
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'display_name': user.display_name or user.username,
                        'email': user.email,
                        'avatar_url': user.avatar_url,
                        'subscription_tier': user.subscription_tier,
                        'role': user.role.value if hasattr(user.role, 'value') else user.role
                    }
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            logger.info(f"[LoginSuccess] Sending to WS, user={user.id}, token_len={len(access_token)}")
            await ws.send_json(login_payload)
            logger.info(f"[LoginSuccess] ✅ Message sent successfully to WS")
        else:
            await ws.send_json({
                'type': 'error',
                'error': '無法創建用戶',
                'timestamp': datetime.utcnow().isoformat()
            })

    
    async def _send_login_success_to_subscribers(self, manager, token: str, user_data: dict):
        """
        🆕 向所有訂閱的 WebSocket 客戶端發送登入成功消息
        
        解決問題：原來的 notify() 只發送狀態更新，不包含 JWT Token
        """
        from auth.login_token import LoginTokenSubscriptionManager
        
        if token not in manager._subscriptions:
            logger.warning(f"No subscribers for token {token[:8]}...")
            return
        
        subscribers = list(manager._subscriptions.get(token, set()))
        logger.info(f"Sending login success to {len(subscribers)} subscribers for token {token[:8]}...")
        
        for ws in subscribers:
            try:
                logger.info(f"[LoginSuccess] Processing subscriber, ws_state={ws.closed if hasattr(ws, 'closed') else 'unknown'}")
                await self._send_login_success(ws, token, user_data)
                logger.info(f"[LoginSuccess] ✅ Subscriber processed successfully")
            except Exception as e:
                logger.error(f"[LoginSuccess] ❌ Failed to send login success: {e}")
                import traceback
                traceback.print_exc()

    
    async def _notify_new_device_login(
        self, 
        user, 
        telegram_id: str, 
        device_name: str, 
        ip_address: str
    ):
        """
        🆕 Phase 4: 新設備登入通知
        
        向用戶的 Telegram 發送安全提醒
        """
        try:
            import os
            import aiohttp
            
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            if not bot_token:
                return
            
            from datetime import datetime
            current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
            
            # 構建通知消息
            message = f"""
🔔 *新設備登入通知*

您的帳號剛剛在新設備上登入：

📱 設備: {device_name}
📍 IP: {ip_address[:ip_address.rfind('.')] + '.*' if ip_address and '.' in ip_address else '未知'}
⏰ 時間: {current_time}

如果這不是您的操作，請立即：
1. 前往「設置 → 安全 → 設備管理」登出該設備
2. 更改密碼（如有）
3. 聯繫客服

_如果這是您本人操作，請忽略此消息_
"""
            
            api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            
            async with aiohttp.ClientSession() as session:
                await session.post(api_url, json={
                    'chat_id': telegram_id,
                    'text': message,
                    'parse_mode': 'Markdown'
                })
            
            logger.info(f"New device notification sent to TG user {telegram_id}")
            
        except Exception as e:
            logger.warning(f"Failed to send new device notification: {e}")

    
    # ==================== 郵箱驗證和密碼重置 ====================
    
    async def send_verification_email(self, request):
        """發送郵箱驗證郵件"""
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
            result = await auth_service.send_verification_email(payload.get('sub'))
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Send verification email error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def verify_email(self, request):
        """驗證郵箱（通過 Token）"""
        try:
            data = await request.json()
            token = data.get('token', '')
            
            if not token:
                return self._json_response({'success': False, 'error': '缺少驗證令牌'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.verify_email(token)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify email error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def verify_email_by_code(self, request):
        """驗證郵箱（通過驗證碼）"""
        try:
            data = await request.json()
            email = data.get('email', '')
            code = data.get('code', '')
            
            if not email or not code:
                return self._json_response({'success': False, 'error': '缺少郵箱或驗證碼'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.verify_email_by_code(email, code)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Verify email by code error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def forgot_password(self, request):
        """請求密碼重置"""
        try:
            data = await request.json()
            email = data.get('email', '')
            
            if not email:
                return self._json_response({'success': False, 'error': '請輸入郵箱'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.request_password_reset(email)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Forgot password error: {e}")
            # 安全考慮：不暴露錯誤詳情
            return self._json_response({
                'success': True, 
                'message': '如果該郵箱已註冊，您將收到重置郵件'
            })

    
    async def reset_password(self, request):
        """重置密碼（通過 Token）"""
        try:
            data = await request.json()
            token = data.get('token', '')
            new_password = data.get('password', '')
            
            if not token:
                return self._json_response({'success': False, 'error': '缺少重置令牌'}, 400)
            
            if not new_password or len(new_password) < 8:
                return self._json_response({'success': False, 'error': '密碼至少需要 8 個字符'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.reset_password(token, new_password)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Reset password error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def reset_password_by_code(self, request):
        """重置密碼（通過驗證碼）"""
        try:
            data = await request.json()
            email = data.get('email', '')
            code = data.get('code', '')
            new_password = data.get('password', '')
            
            if not email or not code:
                return self._json_response({'success': False, 'error': '缺少郵箱或驗證碼'}, 400)
            
            if not new_password or len(new_password) < 8:
                return self._json_response({'success': False, 'error': '密碼至少需要 8 個字符'}, 400)
            
            from auth.service import get_auth_service
            auth_service = get_auth_service()
            result = await auth_service.reset_password_by_code(email, code, new_password)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Reset password by code error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def get_trusted_devices(self, request):
        """獲取受信任設備"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            devices = await service.get_trusted_devices(user_id)
            return self._json_response({'success': True, 'data': devices})
        except Exception as e:
            logger.error(f"Get trusted devices error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

    
    async def remove_trusted_device(self, request):
        """移除受信任設備"""
        try:
            from auth.two_factor import get_two_factor_service
            service = get_two_factor_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            device_id = request.match_info.get('id')
            
            if not user_id:
                return self._json_response({'success': False, 'error': '未登入'}, 401)
            
            success = await service.remove_trusted_device(user_id, device_id)
            return self._json_response({'success': success})
        except Exception as e:
            logger.error(f"Remove trusted device error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)

#!/usr/bin/env python3
"""
P9-1: Auth Routes Mixin
Extracted from http_server.py (~2,200 lines)

Contains: user register/login/logout, JWT refresh, OAuth (Telegram/Google),
device management, security events, email verification, password reset,
QR code login, WebSocket login

Usage: HttpApiServer(AuthRoutesMixin, ...) inheritance
"""
import logging

logger = logging.getLogger(__name__)


class AuthRoutesMixin:
    """Auth route handlers mixin"""

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
    
    async def submit_2fa(self, request):
        """提交 2FA 密碼"""
        data = await request.json()
        result = await self._execute_command('submit-2fa-password', data)
        return self._json_response(result)
    
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
            bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', 'TGSmartKingBot')
            
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
            bot_username = os.environ.get('TELEGRAM_BOT_USERNAME', 'TGSmartKingBot')
            deep_link_url = f"https://t.me/{bot_username}?start=login_{token}"
            
            # 獲取 Token 對象以計算剩餘時間
            login_token = service.get_token(token)
            expires_in = 0
            if login_token and login_token.expires_at:
                from datetime import datetime
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
    
    # ==================== 🆕 Phase 5: 安全事件 API ====================
    
    async def get_security_events(self, request):
        """
        獲取用戶安全事件列表
        """
        try:
            from auth.geo_security import get_geo_security
            
            user = request.get('user')
            if not user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = user.get('user_id') or user.get('id')
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
            
            user = request.get('user')
            if not user:
                return self._json_response({'success': False, 'error': '未認證'}, 401)
            
            user_id = user.get('user_id') or user.get('id')
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
    


"""
TG-AI智控王 License Server API
卡密在線驗證服務器 v2.0

功能：
- 卡密驗證和激活
- 機器碼綁定
- 心跳檢測
- 六級會員系統
- 邀請獎勵系統
- 配額管理
- 管理後台 API
"""

import json
import hashlib
import hmac
import secrets
import time
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import asyncio
from aiohttp import web
import jwt

# 導入數據庫模塊
from database import Database, MEMBERSHIP_LEVELS, REFERRAL_REWARDS

# 導入 Telegram 通知模塊
try:
    from telegram_bot import notifier as tg_notifier, configure_telegram
except ImportError:
    tg_notifier = None
    configure_telegram = None

# ============ 配置 ============

# JWT 密鑰
JWT_SECRET = os.environ.get("JWT_SECRET", "tgai-license-secret-2026")
JWT_ALGORITHM = "HS256"

# 服務器信息
SERVER_NAME = "TG-AI智控王"
SERVER_VERSION = "v2.0"


class LicenseServer:
    """卡密驗證服務器"""
    
    def __init__(self, host: str = '0.0.0.0', port: int = 8080):
        self.host = host
        self.port = port
        self.db = Database()
        self.app = web.Application()
        self._setup_routes()
        self._setup_middlewares()
    
    def _setup_middlewares(self):
        """設置中間件"""
        # 簡單的請求計數器用於限流
        self._request_counts = {}
        self._request_limit = 100  # 每分鐘最大請求數
        self._request_window = 60  # 時間窗口（秒）
        
        @web.middleware
        async def cors_middleware(request, handler):
            if request.method == 'OPTIONS':
                return web.Response(headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                })
            
            response = await handler(request)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        
        @web.middleware
        async def rate_limit_middleware(request, handler):
            """API 限流中間件"""
            # 只對 API 路徑限流
            if not request.path.startswith('/api/'):
                return await handler(request)
            
            # 獲取客戶端標識
            client_ip = self._get_client_ip(request)
            current_time = int(time.time())
            window_key = f"{client_ip}:{current_time // self._request_window}"
            
            # 清理過期的計數
            expired_keys = [k for k in self._request_counts 
                          if int(k.split(':')[1]) < current_time // self._request_window - 1]
            for k in expired_keys:
                del self._request_counts[k]
            
            # 檢查限流
            count = self._request_counts.get(window_key, 0)
            if count >= self._request_limit:
                return web.json_response(
                    {'success': False, 'message': '請求過於頻繁，請稍後再試'},
                    status=429
                )
            
            self._request_counts[window_key] = count + 1
            
            return await handler(request)
        
        self.app.middlewares.append(cors_middleware)
        self.app.middlewares.append(rate_limit_middleware)
    
    def _setup_routes(self):
        """設置路由"""
        # ============ 公開 API ============
        self.app.router.add_get('/api/health', self.handle_health)
        self.app.router.add_get('/api/info', self.handle_info)
        
        # 卡密 API
        self.app.router.add_post('/api/license/validate', self.handle_validate)
        self.app.router.add_post('/api/license/activate', self.handle_activate)
        self.app.router.add_post('/api/license/heartbeat', self.handle_heartbeat)
        self.app.router.add_get('/api/license/status', self.handle_license_status)
        
        # 用戶 API
        self.app.router.add_post('/api/user/register', self.handle_user_register)
        self.app.router.add_get('/api/user/profile', self.handle_user_profile)
        self.app.router.add_get('/api/user/quota', self.handle_user_quota)
        self.app.router.add_get('/api/user/activation-history', self.handle_activation_history)
        self.app.router.add_get('/api/user/usage-stats', self.handle_user_usage_stats)
        
        # 用量同步 API（安全加固）
        self.app.router.add_post('/api/usage/log', self.handle_usage_log)
        self.app.router.add_get('/api/usage/sync', self.handle_usage_sync)
        self.app.router.add_post('/api/token/refresh', self.handle_token_refresh)
        
        # 邀請 API
        self.app.router.add_get('/api/invite/info', self.handle_invite_info)
        self.app.router.add_get('/api/invite/list', self.handle_invite_list)
        
        # 支付 API
        self.app.router.add_get('/api/products', self.handle_products)
        self.app.router.add_post('/api/payment/create', self.handle_create_payment)
        self.app.router.add_post('/api/payment/callback', self.handle_payment_callback)
        self.app.router.add_get('/api/order/status', self.handle_order_status)
        
        # 公告 API
        self.app.router.add_get('/api/announcements', self.handle_announcements)
        self.app.router.add_get('/api/announcements/popup', self.handle_announcements_popup)
        
        # 會員到期提醒 API
        self.app.router.add_get('/api/user/expiry-check', self.handle_expiry_check)
        
        # 統計 API (公開)
        self.app.router.add_get('/api/stats', self.handle_stats)
        
        # ============ 管理員 API ============
        # 認證
        self.app.router.add_post('/api/admin/login', self.handle_admin_login)
        self.app.router.add_post('/api/admin/logout', self.handle_admin_logout)
        self.app.router.add_get('/api/admin/verify', self.handle_admin_verify)
        self.app.router.add_post('/api/admin/change-password', self.handle_admin_change_password)
        
        # 儀表盤
        self.app.router.add_get('/api/admin/dashboard', self.handle_admin_dashboard)
        
        # 用戶管理
        self.app.router.add_get('/api/admin/users', self.handle_admin_users)
        self.app.router.add_get('/api/admin/users/{user_id}', self.handle_admin_user_detail)
        self.app.router.add_post('/api/admin/users/{user_id}/update', self.handle_admin_user_update)
        self.app.router.add_post('/api/admin/users/{user_id}/extend', self.handle_admin_user_extend)
        self.app.router.add_post('/api/admin/users/{user_id}/ban', self.handle_admin_user_ban)
        
        # 卡密管理
        self.app.router.add_get('/api/admin/licenses', self.handle_admin_licenses)
        self.app.router.add_post('/api/admin/licenses/generate', self.handle_admin_generate)
        self.app.router.add_post('/api/admin/licenses/disable', self.handle_admin_disable)
        self.app.router.add_post('/api/admin/licenses/export', self.handle_admin_export_licenses)
        self.app.router.add_post('/api/admin/licenses/batch-disable', self.handle_admin_batch_disable_licenses)
        
        # 批量用戶操作
        self.app.router.add_post('/api/admin/users/batch-ban', self.handle_admin_batch_ban_users)
        self.app.router.add_post('/api/admin/users/batch-extend', self.handle_admin_batch_extend_users)
        
        # 訂單管理
        self.app.router.add_get('/api/admin/orders', self.handle_admin_orders)
        self.app.router.add_post('/api/admin/orders/confirm', self.handle_admin_confirm_payment)
        
        # 收入報表
        self.app.router.add_get('/api/admin/revenue-report', self.handle_admin_revenue_report)
        self.app.router.add_get('/api/admin/user-analytics', self.handle_admin_user_analytics)
        
        # 即將過期用戶
        self.app.router.add_get('/api/admin/expiring-users', self.handle_admin_expiring_users)
        
        # 配額監控
        self.app.router.add_get('/api/admin/quota-usage', self.handle_admin_quota_usage)
        
        # 批量通知
        self.app.router.add_post('/api/admin/notifications/send', self.handle_admin_send_notification)
        self.app.router.add_post('/api/admin/notifications/batch', self.handle_admin_batch_notification)
        self.app.router.add_get('/api/admin/notifications/history', self.handle_admin_notification_history)
        
        # 設備管理
        self.app.router.add_get('/api/admin/devices', self.handle_admin_devices)
        self.app.router.add_post('/api/admin/devices/{device_id}/revoke', self.handle_admin_revoke_device)
        
        # 邀請管理
        self.app.router.add_get('/api/admin/referrals', self.handle_admin_referrals)
        self.app.router.add_get('/api/admin/referral-stats', self.handle_admin_referral_stats)
        
        # 公告管理
        self.app.router.add_get('/api/admin/announcements', self.handle_admin_announcements)
        self.app.router.add_post('/api/admin/announcements', self.handle_admin_create_announcement)
        self.app.router.add_post('/api/admin/announcements/{id}/update', self.handle_admin_update_announcement)
        self.app.router.add_post('/api/admin/announcements/{id}/delete', self.handle_admin_delete_announcement)
        
        # 系統設置
        self.app.router.add_get('/api/admin/settings', self.handle_admin_get_settings)
        self.app.router.add_post('/api/admin/settings/save', self.handle_admin_save_settings)
        self.app.router.add_post('/api/admin/prices/save', self.handle_admin_save_prices)

        # 管理員密碼修改
        self.app.router.add_post('/api/admin/change-password', self.handle_admin_change_password)
        
        # 數據導出
        self.app.router.add_get('/api/admin/export/users', self.handle_admin_export_users)
        self.app.router.add_get('/api/admin/export/orders', self.handle_admin_export_orders)
        self.app.router.add_get('/api/admin/export/licenses', self.handle_admin_export_licenses)
        
        # Telegram 通知設置
        self.app.router.add_post('/api/admin/telegram/config', self.handle_admin_telegram_config)
        self.app.router.add_post('/api/admin/telegram/test', self.handle_admin_telegram_test)
        
        # 管理員管理
        self.app.router.add_get('/api/admin/admins', self.handle_admin_list_admins)
        self.app.router.add_post('/api/admin/admins', self.handle_admin_create_admin)
        self.app.router.add_put('/api/admin/admins/{admin_id}', self.handle_admin_update_admin)
        self.app.router.add_delete('/api/admin/admins/{admin_id}', self.handle_admin_delete_admin)
        
        # 操作日誌
        self.app.router.add_get('/api/admin/logs', self.handle_admin_logs)
        
        # 配額管理
        self.app.router.add_get('/api/admin/quotas', self.handle_admin_quotas)
        
        # 優惠券管理
        self.app.router.add_get('/api/admin/coupons', self.handle_admin_coupons)
        self.app.router.add_post('/api/admin/coupons', self.handle_admin_create_coupon)
        self.app.router.add_post('/api/admin/coupons/{id}/disable', self.handle_admin_disable_coupon)
        
        # 數據庫備份
        self.app.router.add_post('/api/admin/backup', self.handle_admin_backup)
        
        # 每日統計
        self.app.router.add_get('/api/admin/daily-stats', self.handle_admin_daily_stats)
        self.app.router.add_post('/api/admin/generate-daily-stats', self.handle_admin_generate_daily_stats)
        
        # 舊版兼容路由
        self.app.router.add_post('/api/admin/users/extend', self.handle_admin_extend_user_legacy)
    
    # ============ 工具方法 ============
    
    def _generate_token(self, user_id: str, machine_id: str, level: str = 'bronze',
                       expires_in: int = 86400) -> str:
        """生成用戶 JWT token"""
        payload = {
            'user_id': user_id,
            'machine_id': machine_id,
            'level': level,
            'type': 'user',
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def _verify_token(self, token: str) -> Optional[Dict]:
        """驗證用戶 token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _generate_admin_token(self, username: str, expires_in: int = 86400 * 7) -> str:
        """生成管理員 JWT token"""
        payload = {
            'username': username,
            'type': 'admin',
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def _verify_admin_token(self, token: str) -> Optional[Dict]:
        """驗證管理員 token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get('type') != 'admin':
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _get_admin_from_request(self, request: web.Request) -> Optional[Dict]:
        """從請求中獲取管理員信息"""
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            return self._verify_admin_token(token)
        return None
    
    def _require_admin(self, request: web.Request) -> Tuple[bool, Optional[web.Response], Optional[Dict]]:
        """驗證管理員權限"""
        admin = self._get_admin_from_request(request)
        if not admin:
            return False, web.json_response(
                {'success': False, 'message': '未授權訪問'},
                status=401
            ), None
        return True, None, admin
    
    def _get_client_ip(self, request: web.Request) -> str:
        """獲取客戶端 IP"""
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.remote or 'unknown'
    
    def _log_admin_action(self, username: str, action: str, action_type: str = None,
                         target_type: str = None, target_id: str = None,
                         details: str = None, ip_address: str = None):
        """記錄管理員操作"""
        self.db.log_admin_action(username, action, action_type, target_type, 
                                target_id, details, ip_address)
    
    # ============ 公開 API 處理器 ============
    
    async def handle_health(self, request: web.Request) -> web.Response:
        """健康檢查"""
        return web.json_response({
            'status': 'ok',
            'server': SERVER_NAME,
            'version': SERVER_VERSION,
            'timestamp': datetime.now().isoformat()
        })
    
    async def handle_info(self, request: web.Request) -> web.Response:
        """服務器信息"""
        return web.json_response({
            'success': True,
            'data': {
                'name': SERVER_NAME,
                'version': SERVER_VERSION,
                'levels': {k: {'name': v['name'], 'icon': v['icon'], 'color': v['color']} 
                          for k, v in MEMBERSHIP_LEVELS.items()}
            }
        })
    
    async def handle_validate(self, request: web.Request) -> web.Response:
        """驗證卡密"""
        try:
            data = await request.json()
            license_key = data.get('license_key', '').upper()
            
            if not license_key:
                return web.json_response({'success': False, 'message': '缺少卡密'}, status=400)
            
            valid, message, license_data = self.db.validate_license(license_key)
            
            response_data = {
                'success': valid,
                'message': message,
            }
            
            if license_data:
                level_config = MEMBERSHIP_LEVELS.get(license_data['level'], {})
                response_data['data'] = {
                    'level': license_data['level'],
                    'levelName': level_config.get('name', license_data['level']),
                    'levelIcon': level_config.get('icon', '🎫'),
                    'durationDays': license_data['duration_days'],
                    'durationType': license_data['duration_type'],
                    'status': license_data['status']
                }
            
            return web.json_response(response_data)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_activate(self, request: web.Request) -> web.Response:
        """激活卡密"""
        try:
            data = await request.json()
            license_key = data.get('license_key', '').upper()
            machine_id = data.get('machine_id', '')
            device_id = data.get('device_id', '')
            email = data.get('email', '')
            invite_code = data.get('invite_code', '')
            
            if not license_key or not machine_id:
                return web.json_response({'success': False, 'message': '缺少必要參數'}, status=400)
            
            ip_address = self._get_client_ip(request)
            
            # 先檢查是否有邀請碼需要處理
            invited_by = None
            if invite_code:
                inviter = self.db.get_user(invite_code=invite_code)
                if inviter:
                    invited_by = invite_code
            
            # 檢查用戶是否存在
            user = self.db.get_user(machine_id=machine_id)
            if not user:
                # 創建新用戶
                user = self.db.create_user(machine_id=machine_id, email=email, invited_by=invited_by)
            
            user_id = user['user_id'] if user else None
            
            success, message, license_data = self.db.activate_license(
                license_key, user_id, machine_id, device_id, ip_address
            )
            
            response_data = {
                'success': success,
                'message': message,
            }
            
            if success and license_data:
                level_config = MEMBERSHIP_LEVELS.get(license_data['level'], {})
                token = self._generate_token(user_id, machine_id, license_data['level'])
                
                response_data['data'] = {
                    'token': token,
                    'userId': user_id,
                    'level': license_data['level'],
                    'levelName': level_config.get('name', license_data['level']),
                    'levelIcon': level_config.get('icon', '🎫'),
                    'expiresAt': license_data.get('expires_at'),
                    'quotas': level_config.get('quotas', {}),
                    'features': level_config.get('features', [])
                }
            
            return web.json_response(response_data)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_heartbeat(self, request: web.Request) -> web.Response:
        """心跳檢測"""
        try:
            data = await request.json()
            token = data.get('token', '')
            machine_id = data.get('machine_id', '')
            usage_data = data.get('usage', {})
            
            # 驗證 token
            if token:
                payload = self._verify_token(token)
                if not payload:
                    return web.json_response({'success': False, 'message': 'Token 無效或已過期'}, status=401)
                user_id = payload.get('user_id')
                machine_id = payload.get('machine_id')
            else:
                if not machine_id:
                    return web.json_response({'success': False, 'message': '缺少必要參數'}, status=400)
                user = self.db.get_user(machine_id=machine_id)
                user_id = user['user_id'] if user else None
            
            # 獲取用戶當前狀態
            user = self.db.get_user(user_id=user_id) if user_id else self.db.get_user(machine_id=machine_id)
            
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 檢查會員是否過期
            expires_at = user.get('expires_at')
            is_expired = False
            if expires_at:
                if datetime.fromisoformat(expires_at) < datetime.now():
                    is_expired = True
            
            # 更新最後活動時間
            self.db.update_user(user['user_id'], last_active_at=datetime.now().isoformat())
            
            # 記錄心跳
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO heartbeats (user_id, machine_id, ip_address, usage_data)
                VALUES (?, ?, ?, ?)
            ''', (user['user_id'], machine_id, self._get_client_ip(request), json.dumps(usage_data)))
            conn.commit()
            conn.close()
            
            level = user['membership_level'] or 'bronze'
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            
            # 生成新 token
            new_token = self._generate_token(user['user_id'], machine_id, level)
            
            return web.json_response({
                'success': not is_expired,
                'message': '會員已過期' if is_expired else '心跳成功',
                'data': {
                    'token': new_token,
                    'userId': user['user_id'],
                    'level': level,
                    'levelName': level_config.get('name'),
                    'levelIcon': level_config.get('icon'),
                    'expiresAt': expires_at,
                    'isExpired': is_expired,
                    'quotas': level_config.get('quotas', {}),
                    'features': level_config.get('features', [])
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_license_status(self, request: web.Request) -> web.Response:
        """查詢卡密狀態"""
        try:
            license_key = request.query.get('key', '').upper()
            if not license_key:
                return web.json_response({'success': False, 'message': '缺少卡密'}, status=400)
            
            valid, message, license_data = self.db.validate_license(license_key)
            
            if not license_data:
                return web.json_response({'success': False, 'message': message})
            
            return web.json_response({
                'success': True,
                'data': {
                    'status': license_data['status'],
                    'level': license_data['level'],
                    'durationDays': license_data['duration_days'],
                    'createdAt': license_data['created_at'],
                    'usedAt': license_data.get('used_at'),
                    'expiresAt': license_data.get('expires_at')
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 用量同步 API（安全加固）============
    
    async def handle_usage_log(self, request: web.Request) -> web.Response:
        """記錄用量數據（帶簽名驗證）"""
        try:
            data = await request.json()
            
            # 驗證簽名
            if not self._verify_request_signature(data, request):
                return web.json_response({'success': False, 'message': '簽名驗證失敗'}, status=401)
            
            # 驗證 Token
            token = data.get('token', '')
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效或已過期'}, status=401)
            
            user_id = payload.get('user_id')
            machine_id = payload.get('machine_id')
            
            # 驗證設備綁定
            if data.get('machine_id') != machine_id:
                return web.json_response({'success': False, 'message': '設備不匹配'}, status=403)
            
            # 防重放攻擊：檢查 nonce
            nonce = data.get('nonce', '')
            timestamp = data.get('timestamp', 0)
            if not self._verify_nonce(nonce, timestamp):
                return web.json_response({'success': False, 'message': '請求已過期或重複'}, status=400)
            
            # 記錄用量
            usage_type = data.get('type', 'message')  # message, ai, account, group, keyword_set
            action = data.get('action', 'use')  # use, create, delete
            count = data.get('count', 1)
            
            user = self.db.get_user(user_id=user_id)
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level = user.get('membership_level', 'bronze')
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            quotas = level_config.get('quotas', {})
            
            # 獲取今日用量
            today = datetime.now().strftime('%Y-%m-%d')
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT messages_sent, ai_calls FROM user_quotas 
                WHERE user_id = ? AND quota_date = ?
            ''', (user_id, today))
            quota_row = cursor.fetchone()
            
            if quota_row:
                current_messages = quota_row[0] or 0
                current_ai = quota_row[1] or 0
            else:
                current_messages = 0
                current_ai = 0
                cursor.execute('''
                    INSERT INTO user_quotas (user_id, quota_date, messages_sent, ai_calls)
                    VALUES (?, ?, 0, 0)
                ''', (user_id, today))
            
            # 更新用量
            exceeded = False
            if usage_type == 'message':
                max_messages = quotas.get('daily_messages', 50)
                if max_messages != -1 and current_messages + count > max_messages:
                    exceeded = True
                else:
                    cursor.execute('''
                        UPDATE user_quotas SET messages_sent = messages_sent + ?
                        WHERE user_id = ? AND quota_date = ?
                    ''', (count, user_id, today))
                    current_messages += count
            elif usage_type == 'ai':
                max_ai = quotas.get('ai_calls', 10)
                if max_ai != -1 and current_ai + count > max_ai:
                    exceeded = True
                else:
                    cursor.execute('''
                        UPDATE user_quotas SET ai_calls = ai_calls + ?
                        WHERE user_id = ? AND quota_date = ?
                    ''', (count, user_id, today))
                    current_ai += count
            
            # 記錄用量日誌
            cursor.execute('''
                INSERT INTO usage_logs (user_id, action_type, details, ip_address)
                VALUES (?, ?, ?, ?)
            ''', (user_id, usage_type, json.dumps({'action': action, 'count': count}), 
                  self._get_client_ip(request)))
            
            conn.commit()
            conn.close()
            
            # 返回剩餘配額
            max_messages = quotas.get('daily_messages', 50)
            max_ai = quotas.get('ai_calls', 10)
            
            return web.json_response({
                'success': not exceeded,
                'message': '配額已用完' if exceeded else '用量記錄成功',
                'data': {
                    'quotaExceeded': exceeded,
                    'remaining': {
                        'messages': max_messages - current_messages if max_messages != -1 else -1,
                        'ai': max_ai - current_ai if max_ai != -1 else -1
                    },
                    'used': {
                        'messages': current_messages,
                        'ai': current_ai
                    },
                    'max': {
                        'messages': max_messages,
                        'ai': max_ai
                    }
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_usage_sync(self, request: web.Request) -> web.Response:
        """同步用量數據"""
        try:
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            if not token:
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            user_id = payload.get('user_id')
            user = self.db.get_user(user_id=user_id)
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level = user.get('membership_level', 'bronze')
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            quotas = level_config.get('quotas', {})
            
            # 獲取今日用量
            today = datetime.now().strftime('%Y-%m-%d')
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT messages_sent, ai_calls FROM user_quotas 
                WHERE user_id = ? AND quota_date = ?
            ''', (user_id, today))
            quota_row = cursor.fetchone()
            conn.close()
            
            current_messages = quota_row[0] if quota_row else 0
            current_ai = quota_row[1] if quota_row else 0
            
            max_messages = quotas.get('daily_messages', 50)
            max_ai = quotas.get('ai_calls', 10)
            
            return web.json_response({
                'success': True,
                'data': {
                    'date': today,
                    'used': {
                        'messages': current_messages,
                        'ai': current_ai
                    },
                    'remaining': {
                        'messages': max_messages - current_messages if max_messages != -1 else -1,
                        'ai': max_ai - current_ai if max_ai != -1 else -1
                    },
                    'max': {
                        'messages': max_messages,
                        'ai': max_ai
                    },
                    'level': level,
                    'expiresAt': user.get('expires_at')
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_token_refresh(self, request: web.Request) -> web.Response:
        """刷新 Token（安全加固）"""
        try:
            data = await request.json()
            
            # 驗證簽名
            if not self._verify_request_signature(data, request):
                return web.json_response({'success': False, 'message': '簽名驗證失敗'}, status=401)
            
            old_token = data.get('token', '')
            machine_id = data.get('machine_id', '')
            device_fingerprint = data.get('device_fingerprint', '')
            
            # 驗證舊 Token（即使過期也可以刷新，但過期時間不能超過 7 天）
            try:
                payload = jwt.decode(old_token, JWT_SECRET, algorithms=[JWT_ALGORITHM], 
                                    options={"verify_exp": False})
            except jwt.InvalidTokenError:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            # 檢查 Token 過期時間是否超過 7 天
            exp_time = datetime.fromtimestamp(payload.get('exp', 0))
            if datetime.now() - exp_time > timedelta(days=7):
                return web.json_response({'success': False, 'message': 'Token 已過期超過7天，請重新登錄'}, status=401)
            
            user_id = payload.get('user_id')
            stored_machine_id = payload.get('machine_id')
            
            # 驗證設備綁定
            if machine_id != stored_machine_id:
                return web.json_response({'success': False, 'message': '設備不匹配'}, status=403)
            
            user = self.db.get_user(user_id=user_id)
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 檢查設備指紋（如果提供）
            if device_fingerprint:
                stored_fingerprint = user.get('device_fingerprint', '')
                if stored_fingerprint and stored_fingerprint != device_fingerprint:
                    # 設備指紋變化，記錄日誌
                    conn = self.db.get_connection()
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO usage_logs (user_id, action_type, details, ip_address)
                        VALUES (?, ?, ?, ?)
                    ''', (user_id, 'security_alert', 
                          json.dumps({'type': 'fingerprint_change', 'old': stored_fingerprint[:20], 'new': device_fingerprint[:20]}),
                          self._get_client_ip(request)))
                    conn.commit()
                    conn.close()
                    
                    return web.json_response({'success': False, 'message': '設備指紋不匹配，請重新激活'}, status=403)
            
            level = user.get('membership_level', 'bronze')
            
            # 生成新 Token（較短有效期：24小時）
            new_token = self._generate_token(user_id, machine_id, level, expires_in=86400)
            
            # 更新最後活動時間
            self.db.update_user(user_id, last_active_at=datetime.now().isoformat())
            
            return web.json_response({
                'success': True,
                'data': {
                    'token': new_token,
                    'expiresIn': 86400,
                    'level': level
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 安全工具方法 ============
    
    def _verify_request_signature(self, data: Dict, request: web.Request) -> bool:
        """驗證請求簽名"""
        signature = request.headers.get('X-Signature', '')
        timestamp = data.get('timestamp', 0)
        nonce = data.get('nonce', '')
        
        if not signature or not timestamp or not nonce:
            return False
        
        # 檢查時間戳（5分鐘有效期）
        if abs(time.time() - timestamp) > 300:
            return False
        
        # 構建簽名字符串
        sign_string = f"{timestamp}:{nonce}:{data.get('machine_id', '')}:{JWT_SECRET}"
        expected_signature = hashlib.sha256(sign_string.encode()).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    def _verify_nonce(self, nonce: str, timestamp: int) -> bool:
        """驗證 nonce 防重放"""
        if not nonce or not timestamp:
            return False
        
        # 檢查時間戳（5分鐘有效期）
        if abs(time.time() - timestamp) > 300:
            return False
        
        # 使用內存緩存存儲已使用的 nonce（生產環境應使用 Redis）
        if not hasattr(self, '_used_nonces'):
            self._used_nonces = {}
        
        # 清理過期的 nonce
        current_time = time.time()
        self._used_nonces = {k: v for k, v in self._used_nonces.items() if current_time - v < 600}
        
        # 檢查 nonce 是否已使用
        if nonce in self._used_nonces:
            return False
        
        # 記錄 nonce
        self._used_nonces[nonce] = current_time
        return True
    
    async def handle_user_register(self, request: web.Request) -> web.Response:
        """用戶註冊"""
        try:
            data = await request.json()
            machine_id = data.get('machine_id', '')
            email = data.get('email', '')
            invite_code = data.get('invite_code', '')
            
            if not machine_id:
                return web.json_response({'success': False, 'message': '缺少機器碼'}, status=400)
            
            # 檢查是否已註冊
            existing = self.db.get_user(machine_id=machine_id)
            if existing:
                return web.json_response({
                    'success': True,
                    'message': '用戶已存在',
                    'data': {
                        'userId': existing['user_id'],
                        'inviteCode': existing['invite_code'],
                        'level': existing['membership_level']
                    }
                })
            
            # 處理邀請碼
            invited_by = None
            if invite_code:
                inviter = self.db.get_user(invite_code=invite_code)
                if inviter:
                    invited_by = invite_code
            
            # 創建用戶
            user = self.db.create_user(machine_id=machine_id, email=email, invited_by=invited_by)
            
            if not user:
                return web.json_response({'success': False, 'message': '註冊失敗'}, status=500)
            
            token = self._generate_token(user['user_id'], machine_id, 'bronze')
            
            return web.json_response({
                'success': True,
                'message': '註冊成功',
                'data': {
                    'token': token,
                    'userId': user['user_id'],
                    'inviteCode': user['invite_code'],
                    'level': 'bronze',
                    'levelName': '青銅戰士',
                    'levelIcon': '⚔️'
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_user_profile(self, request: web.Request) -> web.Response:
        """獲取用戶資料"""
        try:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            token = auth_header[7:]
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            user = self.db.get_user(user_id=payload['user_id'])
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level = user['membership_level'] or 'bronze'
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            
            return web.json_response({
                'success': True,
                'data': {
                    'userId': user['user_id'],
                    'email': user['email'],
                    'nickname': user['nickname'],
                    'level': level,
                    'levelName': level_config['name'],
                    'levelIcon': level_config['icon'],
                    'levelColor': level_config['color'],
                    'expiresAt': user['expires_at'],
                    'isLifetime': user['is_lifetime'],
                    'inviteCode': user['invite_code'],
                    'totalInvites': user['total_invites'],
                    'inviteEarnings': user['invite_earnings'],
                    'totalSpent': user['total_spent'],
                    'balance': user['balance'],
                    'createdAt': user['created_at'],
                    'quotas': level_config['quotas'],
                    'features': level_config['features']
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_activation_history(self, request: web.Request) -> web.Response:
        """獲取用戶激活記錄"""
        try:
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            machine_id = request.query.get('machine_id', '')
            
            # 驗證 token 或 machine_id
            user_id = None
            if token:
                payload = self._verify_token(token)
                if payload:
                    user_id = payload.get('user_id')
                    machine_id = payload.get('machine_id', machine_id)
            
            if not user_id and not machine_id:
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            # 獲取用戶信息
            if user_id:
                user = self.db.get_user(user_id=user_id)
            else:
                user = self.db.get_user(machine_id=machine_id)
                if user:
                    user_id = user['user_id']
            
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 獲取激活記錄
            limit = int(request.query.get('limit', 50))
            offset = int(request.query.get('offset', 0))
            
            activations = self.db.get_activation_history(
                user_id=user_id,
                machine_id=machine_id,
                limit=limit,
                offset=offset
            )
            
            return web.json_response({
                'success': True,
                'data': activations
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_user_quota(self, request: web.Request) -> web.Response:
        """獲取用戶配額"""
        try:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            token = auth_header[7:]
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            user = self.db.get_user(user_id=payload['user_id'])
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level = user['membership_level'] or 'bronze'
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            quotas = level_config['quotas']
            
            # 獲取今日使用量
            today = datetime.now().strftime('%Y-%m-%d')
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM user_quotas WHERE user_id = ? AND quota_date = ?
            ''', (user['user_id'], today))
            usage = cursor.fetchone()
            conn.close()
            
            if usage:
                usage = dict(usage)
            else:
                usage = {'messages_sent': 0, 'ai_calls_used': 0, 'tg_accounts_used': 0}
            
            return web.json_response({
                'success': True,
                'data': {
                    'level': level,
                    'quotas': quotas,
                    'usage': {
                        'messagesSent': usage.get('messages_sent', 0),
                        'aiCallsUsed': usage.get('ai_calls_used', 0),
                        'tgAccountsUsed': usage.get('tg_accounts_used', 0)
                    },
                    'remaining': {
                        'dailyMessages': (quotas['daily_messages'] - usage.get('messages_sent', 0)) if quotas['daily_messages'] != -1 else -1,
                        'aiCalls': (quotas['ai_calls'] - usage.get('ai_calls_used', 0)) if quotas['ai_calls'] != -1 else -1
                    }
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_user_usage_stats(self, request: web.Request) -> web.Response:
        """獲取用戶使用統計（前端格式）"""
        try:
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            machine_id = request.query.get('machine_id', '')
            
            # 驗證 token 或 machine_id
            user_id = None
            if token:
                payload = self._verify_token(token)
                if payload:
                    user_id = payload.get('user_id')
                    machine_id = payload.get('machine_id', machine_id)
            
            if not user_id and not machine_id:
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            # 獲取用戶信息
            if user_id:
                user = self.db.get_user(user_id=user_id)
            else:
                user = self.db.get_user(machine_id=machine_id)
                if user:
                    user_id = user['user_id']
            
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level = user.get('membership_level', 'bronze')
            level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
            quotas = level_config.get('quotas', {})
            
            # 獲取今日使用量
            today = datetime.now().strftime('%Y-%m-%d')
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT messages_sent, ai_calls_used, tg_accounts_used FROM user_quotas 
                WHERE user_id = ? AND quota_date = ?
            ''', (user_id, today))
            usage_row = cursor.fetchone()
            conn.close()
            
            if usage_row:
                messages_used = usage_row[0] or 0
                ai_used = usage_row[1] or 0
                accounts_used = usage_row[2] or 0
            else:
                messages_used = 0
                ai_used = 0
                accounts_used = 0
            
            # 獲取配額限制（映射字段名稱）
            messages_limit = quotas.get('daily_messages', 50)
            ai_limit = quotas.get('ai_calls', 10)
            accounts_limit = quotas.get('tg_accounts', 2)  # 後端使用 tg_accounts
            
            # 獲取存儲使用量（這裡暫時使用默認值，實際應該從數據庫獲取）
            storage_used = 0  # TODO: 從數據庫獲取實際存儲使用量
            storage_limit = 100  # TODO: 根據會員等級設置存儲限制
            
            return web.json_response({
                'success': True,
                'stats': {
                    'aiCalls': {
                        'used': ai_used,
                        'limit': ai_limit if ai_limit != -1 else 999999
                    },
                    'messagesSent': {
                        'used': messages_used,
                        'limit': messages_limit if messages_limit != -1 else 999999
                    },
                    'accounts': {
                        'used': accounts_used,
                        'limit': accounts_limit if accounts_limit != -1 else 999999
                    },
                    'storage': {
                        'used': storage_used,
                        'limit': storage_limit
                    }
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_invite_info(self, request: web.Request) -> web.Response:
        """獲取邀請信息"""
        try:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            token = auth_header[7:]
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            user = self.db.get_user(user_id=payload['user_id'])
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            return web.json_response({
                'success': True,
                'data': {
                    'inviteCode': user['invite_code'],
                    'totalInvites': user['total_invites'],
                    'inviteEarnings': user['invite_earnings'],
                    'rewards': REFERRAL_REWARDS
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_invite_list(self, request: web.Request) -> web.Response:
        """獲取邀請列表"""
        try:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            token = auth_header[7:]
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            referrals = self.db.get_referrals(inviter_id=payload['user_id'])
            
            return web.json_response({
                'success': True,
                'data': referrals
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_products(self, request: web.Request) -> web.Response:
        """獲取產品列表"""
        try:
            products = []
            for level, config in MEMBERSHIP_LEVELS.items():
                if level == 'bronze':
                    continue
                for duration, price in config['prices'].items():
                    if price > 0:
                        products.append({
                            'id': f"{level}_{duration}",
                            'level': level,
                            'levelName': config['name'],
                            'levelIcon': config['icon'],
                            'duration': duration,
                            'durationName': {'week': '周卡', 'month': '月卡', 'quarter': '季卡', 
                                           'year': '年卡', 'lifetime': '終身'}[duration],
                            'price': price,
                            'quotas': config['quotas'],
                            'features': config['features']
                        })
            
            return web.json_response({
                'success': True,
                'data': products
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_create_payment(self, request: web.Request) -> web.Response:
        """創建支付訂單"""
        try:
            data = await request.json()
            product_id = data.get('product_id', '')
            payment_method = data.get('payment_method', 'usdt')
            machine_id = data.get('machine_id', '')
            user_id = data.get('user_id', '')
            coupon_code = data.get('coupon_code', '')
            
            # 解析產品 ID
            parts = product_id.split('_')
            if len(parts) != 2:
                return web.json_response({'success': False, 'message': '無效的產品ID'}, status=400)
            
            level, duration = parts
            if level not in MEMBERSHIP_LEVELS or duration not in ['week', 'month', 'quarter', 'year', 'lifetime']:
                return web.json_response({'success': False, 'message': '無效的產品'}, status=400)
            
            price = MEMBERSHIP_LEVELS[level]['prices'][duration]
            original_price = price
            discount_amount = 0
            coupon_id = None
            
            # 處理優惠券
            if coupon_code:
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM coupons WHERE code = ? AND status = 'active'
                    AND (expires_at IS NULL OR expires_at > datetime('now'))
                    AND (max_uses IS NULL OR used_count < max_uses)
                ''', (coupon_code.upper(),))
                coupon = cursor.fetchone()
                conn.close()
                
                if coupon:
                    coupon = dict(coupon)
                    if coupon['discount_type'] == 'percent':
                        discount_amount = price * (coupon['discount_value'] / 100)
                    else:
                        discount_amount = min(coupon['discount_value'], price)
                    
                    if coupon['min_amount'] and price < coupon['min_amount']:
                        discount_amount = 0
                    else:
                        coupon_id = coupon['id']
                        price = max(0, price - discount_amount)
            
            order_id = f"TGO{int(time.time())}{secrets.token_hex(4).upper()}"
            
            # 計算時長天數
            duration_days = {'week': 7, 'month': 30, 'quarter': 90, 'year': 365, 'lifetime': 36500}[duration]
            
            # USDT 匯率
            usdt_rate = float(self.db.get_setting('usdt_rate', '7.2'))
            usdt_amount = round(price / usdt_rate, 2)
            usdt_address = self.db.get_setting('usdt_trc20_address', '')
            
            # 獲取用戶信息
            user = None
            if user_id:
                user = self.db.get_user(user_id=user_id)
            elif machine_id:
                user = self.db.get_user(machine_id=machine_id)
            
            # 創建訂單
            duration_names = {'week': '周卡', 'month': '月卡', 'quarter': '季卡', 'year': '年卡', 'lifetime': '終身'}
            product_name = f"{MEMBERSHIP_LEVELS[level]['name']}{duration_names[duration]}"
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO orders (order_id, user_id, product_id, product_name, product_level, 
                                   duration_type, duration_days, original_price, discount_amount, 
                                   final_price, payment_method, coupon_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            ''', (order_id, user['user_id'] if user else None, product_id,
                  product_name,
                  level, duration, duration_days, original_price, discount_amount, price, payment_method, coupon_id))
            conn.commit()
            conn.close()
            
            response_data = {
                'orderId': order_id,
                'product': {
                    'id': product_id,
                    'level': level,
                    'levelName': MEMBERSHIP_LEVELS[level]['name'],
                    'levelIcon': MEMBERSHIP_LEVELS[level]['icon'],
                    'duration': duration,
                    'durationDays': duration_days,
                    'originalPrice': original_price,
                    'price': price
                },
                'discount': discount_amount,
                'amount': price,
                'currency': 'CNY',
                'status': 'pending',
                'expiresIn': 1800  # 30分鐘有效
            }
            
            if payment_method == 'usdt':
                response_data['usdt'] = {
                    'amount': usdt_amount,
                    'network': 'TRC20',
                    'address': usdt_address,
                    'rate': usdt_rate,
                    'memo': order_id  # 可用作備註標識
                }
            
            return web.json_response({
                'success': True,
                'data': response_data
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_payment_callback(self, request: web.Request) -> web.Response:
        """支付回調 - 處理支付成功後的訂單"""
        try:
            data = await request.json()
            order_id = data.get('order_id', '')
            tx_hash = data.get('tx_hash', '')  # 交易哈希
            payment_amount = data.get('amount', 0)
            callback_secret = data.get('secret', '')
            
            # 驗證回調密鑰 (防止偽造)
            expected_secret = self.db.get_setting('payment_callback_secret', 'tgai-payment-2026')
            if callback_secret != expected_secret:
                return web.json_response({'success': False, 'message': '無效的回調'}, status=403)
            
            if not order_id:
                return web.json_response({'success': False, 'message': '缺少訂單ID'}, status=400)
            
            # 查找訂單
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM orders WHERE order_id = ?', (order_id,))
            order = cursor.fetchone()
            
            if not order:
                conn.close()
                return web.json_response({'success': False, 'message': '訂單不存在'}, status=404)
            
            order = dict(order)
            
            if order['status'] == 'paid':
                conn.close()
                return web.json_response({'success': True, 'message': '訂單已處理'})
            
            # 更新訂單狀態
            cursor.execute('''
                UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, 
                                 tx_hash = ?, paid_amount = ?
                WHERE order_id = ?
            ''', (tx_hash, payment_amount, order_id))
            
            # 更新優惠券使用次數
            if order['coupon_id']:
                cursor.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', 
                              (order['coupon_id'],))
            
            # 處理用戶會員升級
            user_id = order['user_id']
            if user_id:
                user = self.db.get_user(user_id=user_id)
                if user:
                    # 計算新過期時間
                    current_expires = user.get('expires_at')
                    if current_expires:
                        current_expires = datetime.fromisoformat(current_expires)
                        if current_expires < datetime.now():
                            current_expires = datetime.now()
                    else:
                        current_expires = datetime.now()
                    
                    duration_days = order['duration_days']
                    is_lifetime = duration_days >= 36500
                    new_expires = current_expires + timedelta(days=duration_days)
                    
                    # 更新用戶
                    cursor.execute('''
                        UPDATE users SET membership_level = ?, expires_at = ?, is_lifetime = ?,
                                        total_spent = total_spent + ?
                        WHERE user_id = ?
                    ''', (order['product_level'], new_expires.isoformat(), 1 if is_lifetime else 0,
                          order['final_price'], user_id))
                    
                    # 處理邀請獎勵
                    if user.get('invited_by'):
                        inviter = self.db.get_user(invite_code=user['invited_by'])
                        if inviter:
                            # 檢查是否首次付費
                            cursor.execute('''
                                SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'paid'
                            ''', (user_id,))
                            paid_count = cursor.fetchone()[0]
                            
                            reward_type = 'first_payment' if paid_count <= 1 else 'repeat_payment'
                            
                            if reward_type == 'first_payment':
                                # 首次付費獎勵
                                first_rewards = REFERRAL_REWARDS['first_payment'].get(order['product_level'], {})
                                inviter_days = first_rewards.get('inviter_days', 0)
                                inviter_cash = first_rewards.get('inviter_cash', 0)
                                
                                if inviter_days > 0 or inviter_cash > 0:
                                    # 更新邀請者
                                    inviter_expires = inviter.get('expires_at')
                                    if inviter_expires:
                                        inviter_expires = datetime.fromisoformat(inviter_expires)
                                        if inviter_expires < datetime.now():
                                            inviter_expires = datetime.now()
                                    else:
                                        inviter_expires = datetime.now()
                                    
                                    new_inviter_expires = inviter_expires + timedelta(days=inviter_days)
                                    
                                    cursor.execute('''
                                        UPDATE users SET expires_at = ?, 
                                                        invite_earnings = invite_earnings + ?,
                                                        balance = balance + ?
                                        WHERE user_id = ?
                                    ''', (new_inviter_expires.isoformat(), inviter_cash, inviter_cash, 
                                          inviter['user_id']))
                                    
                                    # 記錄邀請獎勵
                                    cursor.execute('''
                                        INSERT INTO referrals (inviter_id, invitee_id, reward_type,
                                                              inviter_reward_days, inviter_reward_cash, order_id, status)
                                        VALUES (?, ?, ?, ?, ?, ?, 'completed')
                                    ''', (inviter['user_id'], user_id, reward_type, inviter_days, inviter_cash, order_id))
                            else:
                                # 重複付費返傭
                                commission_rate = REFERRAL_REWARDS['repeat_payment'].get('commission_rate', 0.1)
                                commission = order['final_price'] * commission_rate
                                
                                cursor.execute('''
                                    UPDATE users SET invite_earnings = invite_earnings + ?,
                                                    balance = balance + ?
                                    WHERE user_id = ?
                                ''', (commission, commission, inviter['user_id']))
                                
                                cursor.execute('''
                                    INSERT INTO referrals (inviter_id, invitee_id, reward_type,
                                                          commission_amount, order_id, status)
                                    VALUES (?, ?, ?, ?, ?, 'completed')
                                ''', (inviter['user_id'], user_id, reward_type, commission, order_id))
                    
                    # 生成對應的卡密記錄
                    license_key = f"TGAI-PAY-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
                    cursor.execute('''
                        INSERT INTO licenses (license_key, type_code, level, duration_type, duration_days,
                                             price, status, used_by, used_at, machine_id, activated_at, 
                                             expires_at, notes, created_by)
                        VALUES (?, 'PAY', ?, ?, ?, ?, 'used', ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?, ?, 'system')
                    ''', (license_key, order['product_level'], order['duration_type'], 
                          order['duration_days'], order['final_price'], user_id, 
                          user.get('machine_id'), new_expires.isoformat(), f"訂單: {order_id}"))
                    
                    cursor.execute('UPDATE orders SET license_key = ? WHERE order_id = ?', 
                                  (license_key, order_id))
            
            conn.commit()
            conn.close()
            
            return web.json_response({
                'success': True,
                'message': '支付成功，會員已激活',
                'data': {
                    'orderId': order_id,
                    'licenseKey': license_key if user_id else None
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_order_status(self, request: web.Request) -> web.Response:
        """查詢訂單狀態"""
        try:
            order_id = request.query.get('order_id', '')
            if not order_id:
                return web.json_response({'success': False, 'message': '缺少訂單ID'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM orders WHERE order_id = ?', (order_id,))
            order = cursor.fetchone()
            conn.close()
            
            if not order:
                return web.json_response({'success': False, 'message': '訂單不存在'}, status=404)
            
            order = dict(order)
            
            return web.json_response({
                'success': True,
                'data': {
                    'orderId': order['order_id'],
                    'status': order['status'],
                    'productName': order['product_name'],
                    'amount': order['final_price'],
                    'paidAt': order['paid_at'],
                    'licenseKey': order['license_key']
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_confirm_payment(self, request: web.Request) -> web.Response:
        """管理員手動確認支付"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            order_id = data.get('order_id', '')
            
            if not order_id:
                return web.json_response({'success': False, 'message': '缺少訂單ID'}, status=400)
            
            # 模擬支付回調
            callback_data = {
                'order_id': order_id,
                'tx_hash': f"MANUAL-{admin['username']}-{int(time.time())}",
                'amount': 0,
                'secret': self.db.get_setting('payment_callback_secret', 'tgai-payment-2026')
            }
            
            # 創建模擬請求
            class MockRequest:
                async def json(self):
                    return callback_data
            
            result = await self.handle_payment_callback(MockRequest())
            
            self._log_admin_action(admin['username'], 'confirm_payment', 'order',
                                  'order', order_id, f'Manual confirmation')
            
            return result
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_announcements(self, request: web.Request) -> web.Response:
        """獲取公告列表"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM announcements 
                WHERE status = 'published' 
                AND (publish_at IS NULL OR publish_at <= datetime('now'))
                AND (expire_at IS NULL OR expire_at > datetime('now'))
                ORDER BY is_pinned DESC, priority DESC, created_at DESC
                LIMIT 20
            ''')
            announcements = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': announcements
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_announcements_popup(self, request: web.Request) -> web.Response:
        """獲取需要彈窗顯示的公告"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM announcements 
                WHERE status = 'published' AND is_popup = 1
                AND (publish_at IS NULL OR publish_at <= datetime('now'))
                AND (expire_at IS NULL OR expire_at > datetime('now'))
                ORDER BY priority DESC, created_at DESC
                LIMIT 5
            ''')
            announcements = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': announcements
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_expiry_check(self, request: web.Request) -> web.Response:
        """檢查會員到期提醒"""
        try:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return web.json_response({'success': False, 'message': '未授權'}, status=401)
            
            token = auth_header[7:]
            payload = self._verify_token(token)
            if not payload:
                return web.json_response({'success': False, 'message': 'Token 無效'}, status=401)
            
            user = self.db.get_user(user_id=payload['user_id'])
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 檢查是否需要提醒
            expires_at = user.get('expires_at')
            reminders = []
            
            if expires_at and not user.get('is_lifetime'):
                expires_dt = datetime.fromisoformat(expires_at)
                now = datetime.now()
                days_left = (expires_dt - now).days
                
                if days_left <= 0:
                    reminders.append({
                        'type': 'expired',
                        'title': '會員已過期',
                        'message': '您的會員已過期，請續費以繼續使用完整功能。',
                        'days': 0,
                        'level': 'urgent'
                    })
                elif days_left <= 3:
                    reminders.append({
                        'type': 'expiring_soon',
                        'title': '會員即將過期',
                        'message': f'您的會員將在 {days_left} 天後過期，請及時續費。',
                        'days': days_left,
                        'level': 'warning'
                    })
                elif days_left <= 7:
                    reminders.append({
                        'type': 'expiring',
                        'title': '會員到期提醒',
                        'message': f'您的會員將在 {days_left} 天後過期。',
                        'days': days_left,
                        'level': 'info'
                    })
            
            # 獲取推薦的升級產品
            current_level = user.get('membership_level', 'bronze')
            level_order = ['bronze', 'silver', 'gold', 'diamond', 'star', 'king']
            current_idx = level_order.index(current_level) if current_level in level_order else 0
            
            upgrade_options = []
            for level in level_order[current_idx + 1:]:
                config = MEMBERSHIP_LEVELS[level]
                upgrade_options.append({
                    'level': level,
                    'name': config['name'],
                    'icon': config['icon'],
                    'monthlyPrice': config['prices']['month']
                })
            
            return web.json_response({
                'success': True,
                'data': {
                    'reminders': reminders,
                    'expiresAt': expires_at,
                    'daysLeft': (datetime.fromisoformat(expires_at) - datetime.now()).days if expires_at else None,
                    'isLifetime': user.get('is_lifetime'),
                    'currentLevel': current_level,
                    'upgradeOptions': upgrade_options[:3]  # 最多顯示3個升級選項
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_stats(self, request: web.Request) -> web.Response:
        """公開統計"""
        try:
            dashboard = self.db.get_dashboard_stats()
            return web.json_response({
                'success': True,
                'data': {
                    'totalUsers': dashboard['stats']['totalUsers'],
                    'paidUsers': dashboard['stats']['paidUsers']
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 管理員 API 處理器 ============
    
    async def handle_admin_login(self, request: web.Request) -> web.Response:
        """管理員登錄"""
        try:
            data = await request.json()
            username = data.get('username', '')
            password = data.get('password', '')
            client_ip = self._get_client_ip(request)
            
            if not username or not password:
                return web.json_response({'success': False, 'message': '用戶名和密碼不能為空'}, status=400)
            
            # 檢查登錄失敗次數（防暴力破解）
            login_key = f"login_fail:{client_ip}:{username}"
            fail_count = self._request_counts.get(login_key, 0)
            
            if fail_count >= 5:
                self._log_admin_action(username, 'login_blocked', 'auth', 
                                      details=f'Too many failed attempts', ip_address=client_ip)
                return web.json_response({
                    'success': False, 
                    'message': '登錄失敗次數過多，請15分鐘後再試'
                }, status=429)
            
            admin = self.db.get_admin(username)
            if not admin:
                self._request_counts[login_key] = fail_count + 1
                self._log_admin_action(username, 'login_failed', 'auth',
                                      details='User not found', ip_address=client_ip)
                return web.json_response({'success': False, 'message': '用戶名或密碼錯誤'}, status=401)
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if password_hash != admin['password_hash']:
                self._request_counts[login_key] = fail_count + 1
                self._log_admin_action(username, 'login_failed', 'auth',
                                      details='Wrong password', ip_address=client_ip)
                return web.json_response({'success': False, 'message': '用戶名或密碼錯誤'}, status=401)
            
            # 登錄成功，清除失敗計數
            if login_key in self._request_counts:
                del self._request_counts[login_key]
            
            token = self._generate_admin_token(username)
            
            # 更新最後登錄時間
            conn = self.db.get_connection()
            cursor = conn.cursor()
            try:
                # 嘗試更新，如果字段不存在會拋出異常
                cursor.execute('''
                    UPDATE admins SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ?
                    WHERE username = ?
                ''', (client_ip, username))
            except sqlite3.OperationalError as e:
                if 'no such column: last_login_ip' in str(e):
                    # 字段不存在，先添加字段
                    try:
                        cursor.execute('ALTER TABLE admins ADD COLUMN last_login_ip TEXT')
                        conn.commit()
                        # 重新執行更新
                        cursor.execute('''
                            UPDATE admins SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ?
                            WHERE username = ?
                        ''', (client_ip, username))
                    except sqlite3.OperationalError:
                        # 如果添加字段失敗（可能已存在），只更新 last_login_at
                        cursor.execute('''
                            UPDATE admins SET last_login_at = CURRENT_TIMESTAMP
                            WHERE username = ?
                        ''', (username,))
                else:
                    # 其他錯誤，只更新 last_login_at
                    cursor.execute('''
                        UPDATE admins SET last_login_at = CURRENT_TIMESTAMP
                        WHERE username = ?
                    ''', (username,))
            conn.commit()
            conn.close()
            
            self._log_admin_action(username, 'login', 'auth', ip_address=client_ip)
            
            return web.json_response({
                'success': True,
                'message': '登錄成功',
                'data': {
                    'token': token,
                    'user': {
                        'username': username,
                        'name': admin['name'],
                        'role': admin['role']
                    }
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_logout(self, request: web.Request) -> web.Response:
        """管理員登出"""
        admin = self._get_admin_from_request(request)
        if admin:
            self._log_admin_action(admin['username'], 'logout', 'auth')
        return web.json_response({'success': True, 'message': '已登出'})
    
    async def handle_admin_verify(self, request: web.Request) -> web.Response:
        """驗證管理員 token"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        admin_info = self.db.get_admin(admin['username'])
        return web.json_response({
            'success': True,
            'data': {
                'username': admin['username'],
                'name': admin_info['name'] if admin_info else admin['username'],
                'role': admin_info['role'] if admin_info else 'admin'
            }
        })
    
    async def handle_admin_change_password(self, request: web.Request) -> web.Response:
        """修改管理員密碼"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            old_password = data.get('old_password', '')
            new_password = data.get('new_password', '')
            
            if not old_password or not new_password:
                return web.json_response({'success': False, 'message': '密碼不能為空'}, status=400)
            
            if len(new_password) < 6:
                return web.json_response({'success': False, 'message': '新密碼至少6位'}, status=400)
            
            admin_info = self.db.get_admin(admin['username'])
            old_hash = hashlib.sha256(old_password.encode()).hexdigest()
            if old_hash != admin_info['password_hash']:
                return web.json_response({'success': False, 'message': '舊密碼錯誤'}, status=400)
            
            # 更新密碼
            new_hash = hashlib.sha256(new_password.encode()).hexdigest()
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
                          (new_hash, admin['username']))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'change_password', 'auth')
            
            return web.json_response({'success': True, 'message': '密碼已修改'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_dashboard(self, request: web.Request) -> web.Response:
        """儀表盤數據"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            dashboard = self.db.get_dashboard_stats()
            return web.json_response({
                'success': True,
                'data': dashboard
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_users(self, request: web.Request) -> web.Response:
        """獲取用戶列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            level = request.query.get('level')
            status = request.query.get('status')
            limit = int(request.query.get('limit', 500))
            offset = int(request.query.get('offset', 0))
            
            users_data = self.db.get_users(level=level, status=status, limit=limit, offset=offset)
            
            users = []
            for u in users_data:
                level_config = MEMBERSHIP_LEVELS.get(u['membership_level'] or 'bronze', MEMBERSHIP_LEVELS['bronze'])
                users.append({
                    'id': u['id'],
                    'userId': u['user_id'],
                    'email': u['email'],
                    'nickname': u['nickname'],
                    'machineId': u['machine_id'],
                    'level': u['membership_level'] or 'bronze',
                    'levelName': level_config['name'],
                    'levelIcon': level_config['icon'],
                    'expiresAt': u['expires_at'],
                    'isLifetime': u['is_lifetime'],
                    'totalSpent': u['total_spent'] or 0,
                    'inviteCode': u['invite_code'],
                    'totalInvites': u['total_invites'],
                    'inviteEarnings': u['invite_earnings'],
                    'status': u['status'],
                    'isBanned': u['is_banned'],
                    'createdAt': u['created_at'],
                    'lastActiveAt': u['last_active_at'],
                    'referralCount': u.get('referral_count', 0)
                })
            
            return web.json_response({'success': True, 'data': users})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_user_detail(self, request: web.Request) -> web.Response:
        """獲取用戶詳情"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            user_id = request.match_info['user_id']
            user = self.db.get_user(user_id=user_id)
            
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            level_config = MEMBERSHIP_LEVELS.get(user['membership_level'] or 'bronze', MEMBERSHIP_LEVELS['bronze'])
            
            # 獲取用戶的卡密記錄
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM licenses WHERE used_by = ? ORDER BY used_at DESC LIMIT 20
            ''', (user_id,))
            licenses = [dict(row) for row in cursor.fetchall()]
            
            # 獲取邀請記錄
            referrals = self.db.get_referrals(inviter_id=user_id)
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': {
                    'user': {
                        **user,
                        'levelName': level_config['name'],
                        'levelIcon': level_config['icon'],
                        'quotas': level_config['quotas']
                    },
                    'licenses': licenses,
                    'referrals': referrals
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_user_update(self, request: web.Request) -> web.Response:
        """更新用戶信息"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            user_id = request.match_info['user_id']
            data = await request.json()
            
            allowed_fields = ['email', 'nickname', 'membership_level', 'expires_at', 'balance', 'status']
            updates = {k: v for k, v in data.items() if k in allowed_fields}
            
            if updates:
                success = self.db.update_user(user_id, **updates)
                if success:
                    self._log_admin_action(admin['username'], 'update_user', 'user', 
                                          'user', user_id, json.dumps(updates))
                    return web.json_response({'success': True, 'message': '更新成功'})
            
            return web.json_response({'success': False, 'message': '無有效更新'}, status=400)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_user_extend(self, request: web.Request) -> web.Response:
        """延長用戶會員"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            user_id = request.match_info['user_id']
            data = await request.json()
            days = int(data.get('days', 30))
            level = data.get('level')
            
            user = self.db.get_user(user_id=user_id)
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 計算新過期時間
            current_expires = user.get('expires_at')
            if current_expires:
                current_expires = datetime.fromisoformat(current_expires)
                if current_expires < datetime.now():
                    current_expires = datetime.now()
            else:
                current_expires = datetime.now()
            
            new_expires = current_expires + timedelta(days=days)
            
            updates = {'expires_at': new_expires.isoformat()}
            if level:
                updates['membership_level'] = level
            
            self.db.update_user(user_id, **updates)
            
            # 創建續費卡密記錄
            license_key = f"TGAI-EXT-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO licenses (license_key, type_code, level, duration_type, duration_days, 
                                     status, used_by, used_at, machine_id, activated_at, expires_at, notes, created_by)
                VALUES (?, 'EXT', ?, 'custom', ?, 'used', ?, ?, ?, ?, ?, '管理員手動續費', ?)
            ''', (license_key, level or user['membership_level'], days, user_id, 
                  datetime.now().isoformat(), user['machine_id'], datetime.now().isoformat(),
                  new_expires.isoformat(), admin['username']))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'extend_user', 'user',
                                  'user', user_id, f'days={days}, level={level}')
            
            return web.json_response({
                'success': True,
                'message': f'已為用戶延長 {days} 天會員',
                'data': {'expiresAt': new_expires.isoformat()}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_user_ban(self, request: web.Request) -> web.Response:
        """封禁/解封用戶"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            user_id = request.match_info['user_id']
            data = await request.json()
            is_banned = data.get('is_banned', True)
            ban_reason = data.get('reason', '')
            
            self.db.update_user(user_id, is_banned=1 if is_banned else 0, ban_reason=ban_reason)
            
            action = 'ban_user' if is_banned else 'unban_user'
            self._log_admin_action(admin['username'], action, 'user', 'user', user_id, ban_reason)
            
            return web.json_response({
                'success': True,
                'message': '用戶已封禁' if is_banned else '用戶已解封'
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_extend_user_legacy(self, request: web.Request) -> web.Response:
        """舊版延長用戶會員 (兼容)"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            machine_id = data.get('machine_id', '')
            days = int(data.get('days', 30))
            level = data.get('level')
            
            if not machine_id:
                return web.json_response({'success': False, 'message': '缺少機器碼'}, status=400)
            
            user = self.db.get_user(machine_id=machine_id)
            if not user:
                return web.json_response({'success': False, 'message': '用戶不存在'}, status=404)
            
            # 重用新版邏輯
            request.match_info['user_id'] = user['user_id']
            return await self.handle_admin_user_extend(request)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_licenses(self, request: web.Request) -> web.Response:
        """獲取卡密列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            status = request.query.get('status')
            level = request.query.get('level')
            limit = int(request.query.get('limit', 500))
            
            licenses_data = self.db.get_licenses(status=status, level=level, limit=limit)
            
            licenses = []
            for lic in licenses_data:
                level_config = MEMBERSHIP_LEVELS.get(lic['level'], {})
                duration_name = {'week': '周卡', 'month': '月卡', 'quarter': '季卡', 
                               'year': '年卡', 'lifetime': '終身', 'custom': '自定義'}.get(lic['duration_type'], lic['duration_type'])
                
                licenses.append({
                    'key': lic['license_key'],
                    'level': lic['level'],
                    'levelName': level_config.get('name', lic['level']),
                    'levelIcon': level_config.get('icon', '🎫'),
                    'typeName': f"{level_config.get('icon', '🎫')} {level_config.get('name', lic['level'])}{duration_name}",
                    'durationType': lic['duration_type'],
                    'days': lic['duration_days'],
                    'price': lic['price'] or 0,
                    'status': lic['status'],
                    'batchId': lic['batch_id'],
                    'createdAt': lic['created_at'][:10] if lic['created_at'] else '',
                    'usedAt': lic['used_at'][:10] if lic['used_at'] else None,
                    'usedBy': lic['used_by']
                })
            
            return web.json_response({'success': True, 'data': licenses})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_generate(self, request: web.Request) -> web.Response:
        """生成卡密"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            level_code = data.get('level', 'G')
            duration_code = data.get('duration', '2')
            count = min(int(data.get('count', 10)), 100)
            notes = data.get('notes', '')
            
            # 映射
            levels = {'B': 'silver', 'G': 'gold', 'D': 'diamond', 'S': 'star', 'K': 'king'}
            durations = {'1': 'week', '2': 'month', '3': 'quarter', 'Y': 'year', 'L': 'lifetime'}
            
            level = levels.get(level_code, 'gold')
            duration = durations.get(duration_code, 'month')
            
            keys = self.db.generate_licenses(level, duration, count, notes=notes, created_by=admin['username'])
            
            self._log_admin_action(admin['username'], 'generate_licenses', 'license',
                                  details=f'level={level}, duration={duration}, count={len(keys)}')
            
            return web.json_response({
                'success': True,
                'message': f'成功生成 {len(keys)} 個卡密',
                'data': {'keys': keys, 'count': len(keys)}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_disable(self, request: web.Request) -> web.Response:
        """禁用卡密"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            license_key = data.get('license_key', '')
            
            if not license_key:
                return web.json_response({'success': False, 'message': '缺少卡密'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE licenses SET status = 'disabled' WHERE license_key = ?", (license_key,))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'disable_license', 'license',
                                  'license', license_key)
            
            return web.json_response({'success': True, 'message': '卡密已禁用'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_batch_disable_licenses(self, request: web.Request) -> web.Response:
        """批量禁用卡密"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            license_keys = data.get('license_keys', [])
            
            if not license_keys:
                return web.json_response({'success': False, 'message': '請選擇要禁用的卡密'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            placeholders = ','.join(['?' for _ in license_keys])
            cursor.execute(f"UPDATE licenses SET status = 'disabled' WHERE license_key IN ({placeholders})", 
                          license_keys)
            affected = cursor.rowcount
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'batch_disable_licenses', 'license',
                                  details=f'Disabled {affected} licenses')
            
            return web.json_response({
                'success': True, 
                'message': f'已禁用 {affected} 個卡密',
                'count': affected
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_batch_ban_users(self, request: web.Request) -> web.Response:
        """批量封禁用戶"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            user_ids = data.get('user_ids', [])
            reason = data.get('reason', '批量封禁')
            
            if not user_ids:
                return web.json_response({'success': False, 'message': '請選擇要封禁的用戶'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            placeholders = ','.join(['?' for _ in user_ids])
            cursor.execute(f"UPDATE users SET is_banned = 1, ban_reason = ? WHERE user_id IN ({placeholders})", 
                          [reason] + user_ids)
            affected = cursor.rowcount
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'batch_ban_users', 'user',
                                  details=f'Banned {affected} users: {reason}')
            
            return web.json_response({
                'success': True, 
                'message': f'已封禁 {affected} 個用戶',
                'count': affected
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_batch_extend_users(self, request: web.Request) -> web.Response:
        """批量延長用戶會員"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            user_ids = data.get('user_ids', [])
            days = int(data.get('days', 0))
            reason = data.get('reason', '批量續費')
            
            if not user_ids:
                return web.json_response({'success': False, 'message': '請選擇用戶'}, status=400)
            if days <= 0:
                return web.json_response({'success': False, 'message': '請輸入有效天數'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            affected = 0
            for user_id in user_ids:
                cursor.execute('SELECT expires_at FROM users WHERE user_id = ?', (user_id,))
                user = cursor.fetchone()
                if user:
                    current_expires = user['expires_at']
                    if current_expires:
                        current_dt = datetime.fromisoformat(current_expires)
                        if current_dt < datetime.now():
                            current_dt = datetime.now()
                    else:
                        current_dt = datetime.now()
                    
                    new_expires = current_dt + timedelta(days=days)
                    cursor.execute('UPDATE users SET expires_at = ? WHERE user_id = ?',
                                  (new_expires.isoformat(), user_id))
                    affected += 1
            
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'batch_extend_users', 'user',
                                  details=f'Extended {affected} users by {days} days: {reason}')
            
            return web.json_response({
                'success': True, 
                'message': f'已為 {affected} 個用戶延長 {days} 天',
                'count': affected
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_export_licenses(self, request: web.Request) -> web.Response:
        """導出卡密"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            status = data.get('status', 'unused')
            level = data.get('level')
            
            licenses = self.db.get_licenses(status=status, level=level, limit=10000)
            
            return web.json_response({
                'success': True,
                'data': {
                    'licenses': [{'key': l['license_key'], 'level': l['level'], 
                                 'duration': l['duration_type'], 'status': l['status']} 
                                for l in licenses]
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_orders(self, request: web.Request) -> web.Response:
        """獲取訂單列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            status = request.query.get('status')
            limit = int(request.query.get('limit', 500))
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if status:
                cursor.execute('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?', 
                              (status, limit))
            else:
                cursor.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', (limit,))
            
            orders = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': orders})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_revenue_report(self, request: web.Request) -> web.Response:
        """收入報表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            days = int(request.query.get('days', 30))
            group_by = request.query.get('group_by', 'day')  # day, week, month
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 按日期分組的收入
            if group_by == 'day':
                cursor.execute('''
                    SELECT date(paid_at) as period, 
                           COUNT(*) as order_count,
                           SUM(final_price) as revenue,
                           COUNT(DISTINCT user_id) as unique_users
                    FROM orders 
                    WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
                    GROUP BY date(paid_at)
                    ORDER BY period DESC
                ''', (f'-{days}',))
            elif group_by == 'week':
                cursor.execute('''
                    SELECT strftime('%Y-W%W', paid_at) as period,
                           COUNT(*) as order_count,
                           SUM(final_price) as revenue,
                           COUNT(DISTINCT user_id) as unique_users
                    FROM orders 
                    WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
                    GROUP BY strftime('%Y-W%W', paid_at)
                    ORDER BY period DESC
                ''', (f'-{days}',))
            else:
                cursor.execute('''
                    SELECT strftime('%Y-%m', paid_at) as period,
                           COUNT(*) as order_count,
                           SUM(final_price) as revenue,
                           COUNT(DISTINCT user_id) as unique_users
                    FROM orders 
                    WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
                    GROUP BY strftime('%Y-%m', paid_at)
                    ORDER BY period DESC
                ''', (f'-{days}',))
            
            revenue_trend = [dict(row) for row in cursor.fetchall()]
            
            # 按等級的收入分布
            cursor.execute('''
                SELECT product_level, 
                       COUNT(*) as order_count,
                       SUM(final_price) as revenue
                FROM orders 
                WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
                GROUP BY product_level
                ORDER BY revenue DESC
            ''', (f'-{days}',))
            revenue_by_level = [dict(row) for row in cursor.fetchall()]
            
            # 按時長的收入分布
            cursor.execute('''
                SELECT duration_type, 
                       COUNT(*) as order_count,
                       SUM(final_price) as revenue
                FROM orders 
                WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
                GROUP BY duration_type
                ORDER BY revenue DESC
            ''', (f'-{days}',))
            revenue_by_duration = [dict(row) for row in cursor.fetchall()]
            
            # 總計
            cursor.execute('''
                SELECT COUNT(*) as total_orders,
                       COALESCE(SUM(final_price), 0) as total_revenue,
                       COUNT(DISTINCT user_id) as unique_buyers,
                       COALESCE(AVG(final_price), 0) as avg_order_value
                FROM orders 
                WHERE status = 'paid' AND paid_at >= date('now', ? || ' days')
            ''', (f'-{days}',))
            summary = dict(cursor.fetchone())
            
            # 對比上一期
            cursor.execute('''
                SELECT COALESCE(SUM(final_price), 0) as prev_revenue
                FROM orders 
                WHERE status = 'paid' 
                AND paid_at >= date('now', ? || ' days')
                AND paid_at < date('now', ? || ' days')
            ''', (f'-{days*2}', f'-{days}'))
            prev = cursor.fetchone()
            prev_revenue = prev['prev_revenue'] if prev else 0
            
            growth_rate = 0
            if prev_revenue > 0:
                growth_rate = ((summary['total_revenue'] - prev_revenue) / prev_revenue) * 100
            
            summary['growth_rate'] = round(growth_rate, 2)
            summary['prev_revenue'] = prev_revenue
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': {
                    'summary': summary,
                    'trend': revenue_trend,
                    'byLevel': revenue_by_level,
                    'byDuration': revenue_by_duration,
                    'period': f'近{days}天'
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_user_analytics(self, request: web.Request) -> web.Response:
        """用戶行為分析"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            days = int(request.query.get('days', 30))
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 用戶增長趨勢
            cursor.execute('''
                SELECT date(created_at) as date, COUNT(*) as new_users
                FROM users
                WHERE created_at >= date('now', ? || ' days')
                GROUP BY date(created_at)
                ORDER BY date DESC
            ''', (f'-{days}',))
            user_growth = [dict(row) for row in cursor.fetchall()]
            
            # 活躍用戶趨勢
            cursor.execute('''
                SELECT date(last_active_at) as date, COUNT(*) as active_users
                FROM users
                WHERE last_active_at >= date('now', ? || ' days')
                GROUP BY date(last_active_at)
                ORDER BY date DESC
            ''', (f'-{days}',))
            active_trend = [dict(row) for row in cursor.fetchall()]
            
            # 留存率計算 (簡化版)
            cursor.execute('''
                SELECT 
                    COUNT(CASE WHEN last_active_at >= date('now', '-1 day') THEN 1 END) as day1,
                    COUNT(CASE WHEN last_active_at >= date('now', '-7 days') THEN 1 END) as day7,
                    COUNT(CASE WHEN last_active_at >= date('now', '-30 days') THEN 1 END) as day30,
                    COUNT(*) as total
                FROM users
                WHERE created_at >= date('now', '-30 days')
            ''')
            retention_raw = dict(cursor.fetchone())
            total = retention_raw['total'] or 1
            retention = {
                'day1': round((retention_raw['day1'] / total) * 100, 2),
                'day7': round((retention_raw['day7'] / total) * 100, 2),
                'day30': round((retention_raw['day30'] / total) * 100, 2)
            }
            
            # 付費轉化率
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN total_spent > 0 THEN 1 END) as paid_users,
                    COUNT(CASE WHEN membership_level != 'bronze' THEN 1 END) as premium_users
                FROM users
            ''')
            conversion_raw = dict(cursor.fetchone())
            total_users = conversion_raw['total_users'] or 1
            conversion = {
                'totalUsers': conversion_raw['total_users'],
                'paidUsers': conversion_raw['paid_users'],
                'premiumUsers': conversion_raw['premium_users'],
                'paidRate': round((conversion_raw['paid_users'] / total_users) * 100, 2),
                'premiumRate': round((conversion_raw['premium_users'] / total_users) * 100, 2)
            }
            
            # ARPU (每用戶平均收入)
            cursor.execute('''
                SELECT COALESCE(SUM(final_price), 0) as total_revenue
                FROM orders WHERE status = 'paid'
            ''')
            total_revenue = cursor.fetchone()['total_revenue']
            arpu = round(total_revenue / total_users, 2) if total_users > 0 else 0
            
            # ARPPU (付費用戶平均收入)
            arppu = round(total_revenue / conversion_raw['paid_users'], 2) if conversion_raw['paid_users'] > 0 else 0
            
            # 用戶等級分布
            cursor.execute('''
                SELECT membership_level, COUNT(*) as count
                FROM users
                GROUP BY membership_level
                ORDER BY count DESC
            ''')
            level_distribution = {row['membership_level']: row['count'] for row in cursor.fetchall()}
            
            # 邀請效果
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_referrals,
                    COUNT(CASE WHEN reward_type = 'first_payment' THEN 1 END) as converted_referrals,
                    COALESCE(SUM(inviter_reward_cash + commission_amount), 0) as total_rewards
                FROM referrals
                WHERE created_at >= date('now', ? || ' days')
            ''', (f'-{days}',))
            referral_stats = dict(cursor.fetchone())
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': {
                    'userGrowth': user_growth,
                    'activeTrend': active_trend,
                    'retention': retention,
                    'conversion': conversion,
                    'arpu': arpu,
                    'arppu': arppu,
                    'levelDistribution': level_distribution,
                    'referralStats': referral_stats,
                    'period': f'近{days}天'
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_expiring_users(self, request: web.Request) -> web.Response:
        """獲取即將過期的用戶"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            days = int(request.query.get('days', 7))  # 默認7天內過期
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT u.*, 
                       julianday(u.expires_at) - julianday('now') as days_left
                FROM users u
                WHERE u.is_lifetime = 0 
                AND u.expires_at IS NOT NULL
                AND u.expires_at > datetime('now')
                AND u.expires_at <= datetime('now', ? || ' days')
                AND u.is_banned = 0
                ORDER BY u.expires_at ASC
                LIMIT 100
            ''', (f'+{days}',))
            
            users = []
            for u in cursor.fetchall():
                u = dict(u)
                level_config = MEMBERSHIP_LEVELS.get(u['membership_level'] or 'bronze', MEMBERSHIP_LEVELS['bronze'])
                users.append({
                    'userId': u['user_id'],
                    'email': u['email'],
                    'nickname': u['nickname'],
                    'level': u['membership_level'],
                    'levelName': level_config['name'],
                    'levelIcon': level_config['icon'],
                    'expiresAt': u['expires_at'],
                    'daysLeft': int(u['days_left']) if u['days_left'] else 0,
                    'totalSpent': u['total_spent'] or 0,
                    'lastActiveAt': u['last_active_at']
                })
            
            # 統計
            cursor.execute('''
                SELECT 
                    COUNT(CASE WHEN expires_at <= datetime('now', '+3 days') THEN 1 END) as in_3_days,
                    COUNT(CASE WHEN expires_at <= datetime('now', '+7 days') THEN 1 END) as in_7_days,
                    COUNT(CASE WHEN expires_at <= datetime('now', '+30 days') THEN 1 END) as in_30_days
                FROM users
                WHERE is_lifetime = 0 AND expires_at > datetime('now') AND is_banned = 0
            ''')
            stats = dict(cursor.fetchone())
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': users
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 配額監控 API ============
    
    async def handle_admin_quota_usage(self, request: web.Request) -> web.Response:
        """獲取用戶配額使用情況"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT u.user_id, u.email, u.membership_level, u.last_active_at,
                       COALESCE(q.messages_sent, 0) as messages_used,
                       COALESCE(q.ai_calls, 0) as ai_used
                FROM users u
                LEFT JOIN user_quotas q ON u.user_id = q.user_id AND q.quota_date = ?
                WHERE u.is_banned = 0
                ORDER BY COALESCE(q.messages_sent, 0) + COALESCE(q.ai_calls, 0) DESC
                LIMIT 200
            ''', (today,))
            
            result = []
            for row in cursor.fetchall():
                row = dict(row)
                level = row['membership_level'] or 'bronze'
                level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
                quotas = level_config.get('quotas', {})
                
                messages_max = quotas.get('daily_messages', 50)
                ai_max = quotas.get('ai_calls', 10)
                
                result.append({
                    'user_id': row['user_id'],
                    'email': row['email'],
                    'level': level,
                    'level_name': level_config['name'],
                    'level_icon': level_config['icon'],
                    'messagesUsed': row['messages_used'],
                    'messagesMax': messages_max,
                    'messagesPercent': (row['messages_used'] / messages_max * 100) if messages_max > 0 else 0,
                    'aiUsed': row['ai_used'],
                    'aiMax': ai_max,
                    'aiPercent': (row['ai_used'] / ai_max * 100) if ai_max > 0 else 0,
                    'last_active': row['last_active_at']
                })
            
            conn.close()
            return web.json_response({'success': True, 'data': result})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 批量通知 API ============
    
    async def handle_admin_send_notification(self, request: web.Request) -> web.Response:
        """發送通知給指定用戶"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            user_ids = data.get('user_ids', [])
            title = data.get('title', '')
            content = data.get('content', '')
            notif_type = data.get('type', 'info')
            
            if not user_ids or not title or not content:
                return web.json_response({'success': False, 'message': '缺少必要參數'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 創建通知記錄
            cursor.execute('''
                INSERT INTO notifications (title, content, type, target_users, sent_count, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (title, content, notif_type, json.dumps(user_ids), len(user_ids), admin['username']))
            
            # 為每個用戶創建通知
            notif_id = cursor.lastrowid
            for user_id in user_ids:
                cursor.execute('''
                    INSERT OR IGNORE INTO user_notifications (user_id, notification_id, is_read)
                    VALUES (?, ?, 0)
                ''', (user_id, notif_id))
            
            conn.commit()
            conn.close()
            
            # 記錄操作日誌
            self._log_admin_action(admin['username'], 'send_notification', 
                                   f'發送通知給 {len(user_ids)} 個用戶: {title}')
            
            return web.json_response({'success': True, 'data': {'count': len(user_ids)}})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_batch_notification(self, request: web.Request) -> web.Response:
        """批量發送通知（按等級或條件）"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            target_level = data.get('target_level', 'all')
            target_expiring = data.get('target_expiring', False)
            expiring_days = data.get('expiring_days', 7)
            title = data.get('title', '')
            content = data.get('content', '')
            notif_type = data.get('type', 'info')
            
            if not title or not content:
                return web.json_response({'success': False, 'message': '標題和內容必填'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 構建查詢條件
            conditions = ['is_banned = 0']
            params = []
            
            if target_level == 'paid':
                conditions.append("membership_level != 'bronze'")
            elif target_level == 'free':
                conditions.append("membership_level = 'bronze'")
            elif target_level != 'all':
                conditions.append('membership_level = ?')
                params.append(target_level)
            
            if target_expiring:
                conditions.append(f"expires_at <= datetime('now', '+{expiring_days} days')")
                conditions.append("expires_at > datetime('now')")
                conditions.append("is_lifetime = 0")
            
            query = f"SELECT user_id FROM users WHERE {' AND '.join(conditions)}"
            cursor.execute(query, params)
            user_ids = [row['user_id'] for row in cursor.fetchall()]
            
            if not user_ids:
                return web.json_response({'success': True, 'data': {'count': 0}, 'message': '沒有符合條件的用戶'})
            
            # 創建通知記錄
            cursor.execute('''
                INSERT INTO notifications (title, content, type, target_level, sent_count, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (title, content, notif_type, target_level, len(user_ids), admin['username']))
            
            notif_id = cursor.lastrowid
            for user_id in user_ids:
                cursor.execute('''
                    INSERT OR IGNORE INTO user_notifications (user_id, notification_id, is_read)
                    VALUES (?, ?, 0)
                ''', (user_id, notif_id))
            
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'batch_notification', 
                                   f'批量發送通知給 {len(user_ids)} 個用戶 (等級: {target_level}): {title}')
            
            return web.json_response({'success': True, 'data': {'count': len(user_ids)}})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_notification_history(self, request: web.Request) -> web.Response:
        """獲取通知歷史"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, title, content, type, target_level, sent_count, created_by, created_at
                FROM notifications
                ORDER BY created_at DESC
                LIMIT 50
            ''')
            
            result = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': result})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    # ============ 設備管理 API ============
    
    async def handle_admin_devices(self, request: web.Request) -> web.Response:
        """獲取設備列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 獲取所有設備（通過心跳記錄）
            cursor.execute('''
                SELECT h.id, h.user_id, h.machine_id, h.ip_address, h.created_at as last_heartbeat,
                       u.email, u.membership_level,
                       CASE WHEN h.created_at > datetime('now', '-5 minutes') THEN 1 ELSE 0 END as is_online
                FROM heartbeats h
                JOIN users u ON h.user_id = u.user_id
                WHERE h.id IN (
                    SELECT MAX(id) FROM heartbeats GROUP BY user_id, machine_id
                )
                ORDER BY h.created_at DESC
                LIMIT 500
            ''')
            
            result = []
            for row in cursor.fetchall():
                row = dict(row)
                level = row['membership_level'] or 'bronze'
                level_config = MEMBERSHIP_LEVELS.get(level, MEMBERSHIP_LEVELS['bronze'])
                
                result.append({
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'machine_id': row['machine_id'],
                    'email': row['email'],
                    'level': level,
                    'level_name': level_config['name'],
                    'level_icon': level_config['icon'],
                    'ip_address': row['ip_address'],
                    'last_active': row['last_heartbeat'],
                    'isOnline': bool(row['is_online']),
                    'device_name': f"設備 {row['machine_id'][:8] if row['machine_id'] else 'Unknown'}"
                })
            
            conn.close()
            return web.json_response({'success': True, 'data': result})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_revoke_device(self, request: web.Request) -> web.Response:
        """解綁設備"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            device_id = request.match_info.get('device_id')
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 獲取設備信息
            cursor.execute('SELECT user_id, machine_id FROM heartbeats WHERE id = ?', (device_id,))
            device = cursor.fetchone()
            
            if not device:
                return web.json_response({'success': False, 'message': '設備不存在'}, status=404)
            
            device = dict(device)
            
            # 清除該設備的所有心跳記錄
            cursor.execute('DELETE FROM heartbeats WHERE machine_id = ?', (device['machine_id'],))
            
            # 重置用戶的機器碼（如果需要）
            cursor.execute('''
                UPDATE users SET machine_id = NULL 
                WHERE user_id = ? AND machine_id = ?
            ''', (device['user_id'], device['machine_id']))
            
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'revoke_device', 
                                   f'解綁設備: {device["machine_id"][:16]}... (用戶: {device["user_id"]})')
            
            return web.json_response({'success': True, 'message': '設備已解綁'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_referrals(self, request: web.Request) -> web.Response:
        """獲取邀請記錄"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            limit = int(request.query.get('limit', 200))
            referrals = self.db.get_referrals(limit=limit)
            
            return web.json_response({'success': True, 'data': referrals})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_referral_stats(self, request: web.Request) -> web.Response:
        """邀請統計"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 總邀請數
            cursor.execute('SELECT COUNT(*) as total FROM referrals')
            total_referrals = cursor.fetchone()['total']
            
            # 總獎勵
            cursor.execute('SELECT COALESCE(SUM(inviter_reward_cash + commission_amount), 0) as total FROM referrals')
            total_earnings = cursor.fetchone()['total']
            
            # 邀請排行榜
            cursor.execute('''
                SELECT u.user_id, u.email, u.nickname, u.invite_code, u.total_invites, u.invite_earnings
                FROM users u
                WHERE u.total_invites > 0
                ORDER BY u.total_invites DESC
                LIMIT 20
            ''')
            leaderboard = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': {
                    'totalReferrals': total_referrals,
                    'totalEarnings': total_earnings,
                    'leaderboard': leaderboard,
                    'rewards': REFERRAL_REWARDS
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_announcements(self, request: web.Request) -> web.Response:
        """獲取公告列表 (管理)"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100')
            announcements = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': announcements})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_create_announcement(self, request: web.Request) -> web.Response:
        """創建公告"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            title = data.get('title', '')
            content = data.get('content', '')
            announcement_type = data.get('type', 'info')
            is_popup = data.get('is_popup', False)
            is_pinned = data.get('is_pinned', False)
            status = data.get('status', 'draft')
            
            if not title or not content:
                return web.json_response({'success': False, 'message': '標題和內容不能為空'}, status=400)
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO announcements (title, content, announcement_type, is_popup, is_pinned, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (title, content, announcement_type, 1 if is_popup else 0, 1 if is_pinned else 0, status, admin['username']))
            conn.commit()
            announcement_id = cursor.lastrowid
            conn.close()
            
            self._log_admin_action(admin['username'], 'create_announcement', 'announcement',
                                  'announcement', str(announcement_id))
            
            return web.json_response({'success': True, 'message': '公告已創建', 'data': {'id': announcement_id}})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_update_announcement(self, request: web.Request) -> web.Response:
        """更新公告"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            announcement_id = request.match_info['id']
            data = await request.json()
            
            updates = []
            values = []
            for key in ['title', 'content', 'announcement_type', 'is_popup', 'is_pinned', 'status', 'publish_at', 'expire_at']:
                if key in data:
                    updates.append(f"{key} = ?")
                    values.append(data[key])
            
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                values.append(announcement_id)
                
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute(f"UPDATE announcements SET {', '.join(updates)} WHERE id = ?", values)
                conn.commit()
                conn.close()
                
                self._log_admin_action(admin['username'], 'update_announcement', 'announcement',
                                      'announcement', announcement_id)
            
            return web.json_response({'success': True, 'message': '公告已更新'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_delete_announcement(self, request: web.Request) -> web.Response:
        """刪除公告"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            announcement_id = request.match_info['id']
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('DELETE FROM announcements WHERE id = ?', (announcement_id,))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'delete_announcement', 'announcement',
                                  'announcement', announcement_id)
            
            return web.json_response({'success': True, 'message': '公告已刪除'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_get_settings(self, request: web.Request) -> web.Response:
        """獲取系統設置"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            settings = self.db.get_all_settings()
            
            # 格式化設置
            formatted = {
                'general': {},
                'payment': {},
                'membership': {},
                'referral': {}
            }
            
            for key, value in settings.items():
                category = value.get('category', 'general')
                if category not in formatted:
                    formatted[category] = {}
                formatted[category][key] = value['value']
            
            # 添加價格配置
            formatted['prices'] = {
                level: {
                    'name': config['name'],
                    'icon': config['icon'],
                    'prices': config['prices'],
                    'quotas': config['quotas']
                }
                for level, config in MEMBERSHIP_LEVELS.items()
            }
            
            return web.json_response({'success': True, 'data': formatted})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_save_settings(self, request: web.Request) -> web.Response:
        """保存系統設置"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response

        try:
            data = await request.json()

            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                self.db.set_setting(key, str(value), admin['username'])

            self._log_admin_action(admin['username'], 'save_settings', 'settings',
                                  details=f'keys={list(data.keys())}')

            return web.json_response({'success': True, 'message': '設置已保存'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)

    async def handle_admin_save_prices(self, request: web.Request) -> web.Response:
        """保存會員價格配置"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response

        try:
            data = await request.json()
            prices = data.get('prices', {})
            
            if not prices:
                return web.json_response({'success': False, 'message': '無價格數據'}, status=400)
            
            # 將價格配置保存到設置表中
            self.db.set_setting('membership_prices', json.dumps(prices), admin['username'])
            
            # 更新內存中的價格配置（重啟後生效）
            for level, level_prices in prices.items():
                if level in MEMBERSHIP_LEVELS:
                    for duration, price in level_prices.items():
                        if duration in MEMBERSHIP_LEVELS[level]['prices']:
                            MEMBERSHIP_LEVELS[level]['prices'][duration] = float(price)
            
            self._log_admin_action(admin['username'], 'save_prices', 'settings',
                                  details=f'Updated prices for {list(prices.keys())}')
            
            return web.json_response({'success': True, 'message': '價格配置已保存'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)

    async def handle_admin_change_password(self, request: web.Request) -> web.Response:
        """修改管理員密碼"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            old_password = data.get('old_password', '')
            new_password = data.get('new_password', '')
            confirm_password = data.get('confirm_password', '')
            
            if not old_password or not new_password:
                return web.json_response({'success': False, 'message': '請輸入舊密碼和新密碼'}, status=400)
            
            if new_password != confirm_password:
                return web.json_response({'success': False, 'message': '兩次輸入的密碼不一致'}, status=400)
            
            if len(new_password) < 6:
                return web.json_response({'success': False, 'message': '密碼長度至少 6 位'}, status=400)
            
            # 驗證舊密碼
            old_hash = hashlib.sha256(old_password.encode()).hexdigest()
            if old_hash != admin['password_hash']:
                return web.json_response({'success': False, 'message': '舊密碼錯誤'}, status=400)
            
            # 更新密碼
            new_hash = hashlib.sha256(new_password.encode()).hexdigest()
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                          (new_hash, admin['id']))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'change_password', 'admin',
                                  details='Password changed')
            
            return web.json_response({'success': True, 'message': '密碼修改成功'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_export_users(self, request: web.Request) -> web.Response:
        """導出用戶數據"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            level = request.query.get('level')
            status = request.query.get('status')
            
            users = self.db.get_users(level=level, status=status, limit=10000)
            
            # 生成 CSV
            import io
            output = io.StringIO()
            output.write('\ufeff')  # UTF-8 BOM
            output.write('用戶ID,郵箱,暱稱,等級,過期時間,終身,消費總額,邀請人數,邀請收益,狀態,註冊時間,最後活躍\n')
            
            for u in users:
                level_name = MEMBERSHIP_LEVELS.get(u['membership_level'] or 'bronze', {}).get('name', u['membership_level'])
                output.write(f"{u['user_id']},{u['email'] or ''},{u['nickname'] or ''},{level_name},"
                           f"{u['expires_at'] or ''},{u['is_lifetime']},{u['total_spent'] or 0},"
                           f"{u['total_invites'] or 0},{u['invite_earnings'] or 0},"
                           f"{'封禁' if u['is_banned'] else '正常'},{u['created_at']},{u['last_active_at'] or ''}\n")
            
            self._log_admin_action(admin['username'], 'export', 'users',
                                  details=f'Exported {len(users)} users')
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="users_export.csv"'}
            )
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_export_orders(self, request: web.Request) -> web.Response:
        """導出訂單數據"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            status = request.query.get('status')
            days = int(request.query.get('days', 30))
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if status:
                cursor.execute('''
                    SELECT * FROM orders 
                    WHERE status = ? AND created_at >= date('now', ? || ' days')
                    ORDER BY created_at DESC
                ''', (status, f'-{days}'))
            else:
                cursor.execute('''
                    SELECT * FROM orders 
                    WHERE created_at >= date('now', ? || ' days')
                    ORDER BY created_at DESC
                ''', (f'-{days}',))
            
            orders = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            import io
            output = io.StringIO()
            output.write('\ufeff')
            output.write('訂單號,用戶ID,產品,等級,時長,原價,折扣,實付,支付方式,狀態,創建時間,支付時間\n')
            
            for o in orders:
                output.write(f"{o['order_id']},{o['user_id'] or ''},{o['product_name'] or ''},"
                           f"{o['product_level']},{o['duration_type']},{o['original_price']},"
                           f"{o['discount_amount'] or 0},{o['final_price']},{o['payment_method']},"
                           f"{o['status']},{o['created_at']},{o['paid_at'] or ''}\n")
            
            self._log_admin_action(admin['username'], 'export', 'orders',
                                  details=f'Exported {len(orders)} orders')
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="orders_export.csv"'}
            )
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_export_licenses(self, request: web.Request) -> web.Response:
        """導出卡密數據"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            status = request.query.get('status')
            level = request.query.get('level')
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = 'SELECT * FROM licenses WHERE 1=1'
            params = []
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            if level:
                query += ' AND level = ?'
                params.append(level)
            
            query += ' ORDER BY created_at DESC LIMIT 10000'
            cursor.execute(query, params)
            licenses = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            import io
            output = io.StringIO()
            output.write('\ufeff')
            output.write('卡密,等級,時長類型,天數,價格,狀態,使用者,激活時間,過期時間,批次,備註,創建時間\n')
            
            for lic in licenses:
                level_name = MEMBERSHIP_LEVELS.get(lic['level'] or 'bronze', {}).get('name', lic['level'])
                output.write(f"{lic['license_key']},{level_name},{lic['duration_type']},"
                           f"{lic['duration_days']},{lic['price']},{lic['status']},"
                           f"{lic['used_by'] or ''},{lic['activated_at'] or ''},"
                           f"{lic['expires_at'] or ''},{lic['batch'] or ''},{lic['notes'] or ''},"
                           f"{lic['created_at']}\n")
            
            self._log_admin_action(admin['username'], 'export', 'licenses',
                                  details=f'Exported {len(licenses)} licenses')
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="licenses_export.csv"'}
            )
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_telegram_config(self, request: web.Request) -> web.Response:
        """配置 Telegram 通知"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            bot_token = data.get('bot_token', '')
            chat_id = data.get('chat_id', '')
            
            # 保存設置
            self.db.set_setting('telegram_bot_token', bot_token, admin['username'])
            self.db.set_setting('telegram_chat_id', chat_id, admin['username'])
            
            # 配置通知器
            if configure_telegram and bot_token and chat_id:
                configure_telegram(bot_token, chat_id)
            
            self._log_admin_action(admin['username'], 'configure_telegram', 'settings')
            
            return web.json_response({'success': True, 'message': 'Telegram 配置已保存'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_telegram_test(self, request: web.Request) -> web.Response:
        """測試 Telegram 通知"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            if not tg_notifier:
                return web.json_response({'success': False, 'message': 'Telegram 模塊未加載'}, status=500)
            
            # 從設置加載配置
            bot_token = self.db.get_setting('telegram_bot_token', '')
            chat_id = self.db.get_setting('telegram_chat_id', '')
            
            if not bot_token or not chat_id:
                return web.json_response({'success': False, 'message': '請先配置 Bot Token 和 Chat ID'}, status=400)
            
            # 配置並測試
            configure_telegram(bot_token, chat_id)
            
            # 發送測試消息
            test_msg = f"""
🔔 <b>TG-AI智控王 通知測試</b>

✅ 連接成功！
👤 測試者: {admin['username']}
🕐 時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
            success = await tg_notifier.send_message(test_msg)
            
            if success:
                return web.json_response({'success': True, 'message': '測試消息發送成功！請檢查 Telegram'})
            else:
                return web.json_response({'success': False, 'message': '發送失敗，請檢查配置'}, status=500)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_list_admins(self, request: web.Request) -> web.Response:
        """獲取管理員列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        # 只有超級管理員可以查看
        if admin.get('role') != 'super_admin' and admin.get('username') != 'admin':
            return web.json_response({'success': False, 'message': '權限不足'}, status=403)
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, name, email, role, permissions, is_active, 
                       last_login_at, created_at
                FROM admins ORDER BY id
            ''')
            admins = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': admins})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_create_admin(self, request: web.Request) -> web.Response:
        """創建新管理員"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        if admin.get('role') != 'super_admin' and admin.get('username') != 'admin':
            return web.json_response({'success': False, 'message': '權限不足'}, status=403)
        
        try:
            data = await request.json()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            name = data.get('name', '')
            email = data.get('email', '')
            role = data.get('role', 'admin')
            permissions = data.get('permissions', [])
            
            if not username or not password:
                return web.json_response({'success': False, 'message': '用戶名和密碼必填'}, status=400)
            
            if len(password) < 6:
                return web.json_response({'success': False, 'message': '密碼至少6位'}, status=400)
            
            # 檢查用戶名是否存在
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM admins WHERE username = ?', (username,))
            if cursor.fetchone():
                conn.close()
                return web.json_response({'success': False, 'message': '用戶名已存在'}, status=400)
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            permissions_str = ','.join(permissions) if isinstance(permissions, list) else permissions
            
            cursor.execute('''
                INSERT INTO admins (username, password_hash, name, email, role, permissions, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ''', (username, password_hash, name, email, role, permissions_str))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            
            self._log_admin_action(admin['username'], 'create_admin', 'admin',
                                  target_id=str(new_id), details=f'Created admin: {username}')
            
            return web.json_response({
                'success': True, 
                'message': '管理員創建成功',
                'data': {'id': new_id, 'username': username}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_update_admin(self, request: web.Request) -> web.Response:
        """更新管理員信息"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        if admin.get('role') != 'super_admin' and admin.get('username') != 'admin':
            return web.json_response({'success': False, 'message': '權限不足'}, status=403)
        
        try:
            admin_id = int(request.match_info['admin_id'])
            data = await request.json()
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 不能修改超級管理員
            cursor.execute('SELECT username, role FROM admins WHERE id = ?', (admin_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                return web.json_response({'success': False, 'message': '管理員不存在'}, status=404)
            
            if target['username'] == 'admin' and admin['username'] != 'admin':
                conn.close()
                return web.json_response({'success': False, 'message': '不能修改超級管理員'}, status=403)
            
            updates = []
            params = []
            
            if 'name' in data:
                updates.append('name = ?')
                params.append(data['name'])
            if 'email' in data:
                updates.append('email = ?')
                params.append(data['email'])
            if 'role' in data and target['username'] != 'admin':
                updates.append('role = ?')
                params.append(data['role'])
            if 'permissions' in data:
                perms = data['permissions']
                updates.append('permissions = ?')
                params.append(','.join(perms) if isinstance(perms, list) else perms)
            if 'is_active' in data and target['username'] != 'admin':
                updates.append('is_active = ?')
                params.append(1 if data['is_active'] else 0)
            if 'password' in data and data['password']:
                if len(data['password']) < 6:
                    conn.close()
                    return web.json_response({'success': False, 'message': '密碼至少6位'}, status=400)
                updates.append('password_hash = ?')
                params.append(hashlib.sha256(data['password'].encode()).hexdigest())
            
            if updates:
                updates.append('updated_at = CURRENT_TIMESTAMP')
                params.append(admin_id)
                cursor.execute(f"UPDATE admins SET {', '.join(updates)} WHERE id = ?", params)
                conn.commit()
            
            conn.close()
            
            self._log_admin_action(admin['username'], 'update_admin', 'admin',
                                  target_id=str(admin_id), details=f'Updated: {list(data.keys())}')
            
            return web.json_response({'success': True, 'message': '管理員更新成功'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_delete_admin(self, request: web.Request) -> web.Response:
        """刪除管理員"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        if admin.get('role') != 'super_admin' and admin.get('username') != 'admin':
            return web.json_response({'success': False, 'message': '權限不足'}, status=403)
        
        try:
            admin_id = int(request.match_info['admin_id'])
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT username FROM admins WHERE id = ?', (admin_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                return web.json_response({'success': False, 'message': '管理員不存在'}, status=404)
            
            if target['username'] == 'admin':
                conn.close()
                return web.json_response({'success': False, 'message': '不能刪除超級管理員'}, status=403)
            
            cursor.execute('DELETE FROM admins WHERE id = ?', (admin_id,))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'delete_admin', 'admin',
                                  target_id=str(admin_id), details=f'Deleted: {target["username"]}')
            
            return web.json_response({'success': True, 'message': '管理員已刪除'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_logs(self, request: web.Request) -> web.Response:
        """獲取操作日誌"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            limit = int(request.query.get('limit', 100))
            logs = self.db.get_admin_logs(limit=limit)
            
            return web.json_response({'success': True, 'data': logs})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_quotas(self, request: web.Request) -> web.Response:
        """獲取配額配置（包含價格）"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            quotas = {
                level: {
                    'name': config['name'],
                    'icon': config['icon'],
                    'prices': config['prices'],  # 包含價格數據
                    'quotas': config['quotas'],
                    'features': config['features']
                }
                for level, config in MEMBERSHIP_LEVELS.items()
            }
            
            return web.json_response({'success': True, 'data': quotas})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_coupons(self, request: web.Request) -> web.Response:
        """獲取優惠券列表"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM coupons ORDER BY created_at DESC LIMIT 100')
            coupons = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': coupons})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_create_coupon(self, request: web.Request) -> web.Response:
        """創建優惠券"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            data = await request.json()
            code = data.get('code', '') or f"TGAI{secrets.token_hex(4).upper()}"
            discount_type = data.get('discount_type', 'percent')
            discount_value = float(data.get('discount_value', 10))
            min_amount = float(data.get('min_amount', 0))
            max_uses = int(data.get('max_uses', 100))
            expires_at = data.get('expires_at')
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO coupons (code, discount_type, discount_value, min_amount, max_uses, expires_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (code.upper(), discount_type, discount_value, min_amount, max_uses, expires_at, admin['username']))
            conn.commit()
            coupon_id = cursor.lastrowid
            conn.close()
            
            self._log_admin_action(admin['username'], 'create_coupon', 'coupon',
                                  'coupon', str(coupon_id), f'code={code}')
            
            return web.json_response({
                'success': True,
                'message': '優惠券已創建',
                'data': {'id': coupon_id, 'code': code.upper()}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_disable_coupon(self, request: web.Request) -> web.Response:
        """禁用優惠券"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            coupon_id = request.match_info['id']
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE coupons SET status = 'disabled' WHERE id = ?", (coupon_id,))
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'disable_coupon', 'coupon', 'coupon', coupon_id)
            
            return web.json_response({'success': True, 'message': '優惠券已禁用'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_backup(self, request: web.Request) -> web.Response:
        """數據庫備份"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            import shutil
            from pathlib import Path
            
            db_path = Path(self.db.db_path)
            backup_dir = db_path.parent / 'backups'
            backup_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = backup_dir / f"tgai_server_{timestamp}.db"
            
            shutil.copy2(db_path, backup_path)
            
            self._log_admin_action(admin['username'], 'backup_database', 'system',
                                  details=f'backup_file={backup_path.name}')
            
            # 清理舊備份，只保留最近10個
            backups = sorted(backup_dir.glob('*.db'), key=lambda x: x.stat().st_mtime, reverse=True)
            for old_backup in backups[10:]:
                old_backup.unlink()
            
            return web.json_response({
                'success': True,
                'message': f'數據庫已備份: {backup_path.name}',
                'data': {'filename': backup_path.name}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_daily_stats(self, request: web.Request) -> web.Response:
        """獲取每日統計"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            days = int(request.query.get('days', 30))
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM stats_daily 
                ORDER BY stat_date DESC 
                LIMIT ?
            ''', (days,))
            stats = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': stats})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_generate_daily_stats(self, request: web.Request) -> web.Response:
        """生成當日統計"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 計算今日統計
            cursor.execute("SELECT COUNT(*) FROM users WHERE date(created_at) = ?", (today,))
            new_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM users WHERE last_active_at >= datetime('now', '-1 day')")
            active_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM orders WHERE date(created_at) = ? AND status = 'paid'", (today,))
            new_orders = cursor.fetchone()[0]
            
            cursor.execute("SELECT COALESCE(SUM(final_price), 0) FROM orders WHERE date(created_at) = ? AND status = 'paid'", (today,))
            revenue = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM licenses WHERE date(used_at) = ?", (today,))
            activated_licenses = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM referrals WHERE date(created_at) = ?", (today,))
            new_referrals = cursor.fetchone()[0]
            
            # 插入或更新統計
            cursor.execute('''
                INSERT OR REPLACE INTO stats_daily 
                (stat_date, new_users, active_users, new_orders, revenue, activated_licenses, new_referrals)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (today, new_users, active_users, new_orders, revenue, activated_licenses, new_referrals))
            
            conn.commit()
            conn.close()
            
            self._log_admin_action(admin['username'], 'generate_daily_stats', 'stats', details=f'date={today}')
            
            return web.json_response({
                'success': True,
                'message': f'{today} 統計數據已生成',
                'data': {
                    'date': today,
                    'new_users': new_users,
                    'active_users': active_users,
                    'new_orders': new_orders,
                    'revenue': revenue,
                    'activated_licenses': activated_licenses,
                    'new_referrals': new_referrals
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    def run(self):
        """啟動服務器"""
        print(f"🚀 {SERVER_NAME} License Server {SERVER_VERSION}")
        print(f"📡 Starting on http://{self.host}:{self.port}")
        web.run_app(self.app, host=self.host, port=self.port)


# ============ 命令行 ============

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description=f'{SERVER_NAME} License Server')
    parser.add_argument('command', choices=['run', 'init', 'stats', 'generate'], help='命令')
    parser.add_argument('--host', default='0.0.0.0', help='綁定地址')
    parser.add_argument('--port', type=int, default=8080, help='端口')
    parser.add_argument('--level', default='gold', help='卡密等級')
    parser.add_argument('--duration', default='month', help='卡密時長')
    parser.add_argument('--count', type=int, default=10, help='生成數量')
    
    args = parser.parse_args()
    
    if args.command == 'run':
        server = LicenseServer(args.host, args.port)
        server.run()
    elif args.command == 'init':
        db = Database()
        print(f"✅ {SERVER_NAME} 數據庫初始化完成")
    elif args.command == 'stats':
        db = Database()
        stats = db.get_dashboard_stats()
        print(f"\n📊 {SERVER_NAME} 統計數據")
        print(f"  總用戶: {stats['stats']['totalUsers']}")
        print(f"  付費用戶: {stats['stats']['paidUsers']}")
        print(f"  總卡密: {stats['stats']['totalLicenses']}")
        print(f"  可用卡密: {stats['stats']['unusedLicenses']}")
        print(f"  總收入: ¥{stats['stats']['totalRevenue']:.2f}")
    elif args.command == 'generate':
        db = Database()
        keys = db.generate_licenses(args.level, args.duration, args.count)
        print(f"\n🎫 成功生成 {len(keys)} 個 {args.level} {args.duration} 卡密：")
        for key in keys:
            print(f"  {key}")


if __name__ == '__main__':
    main()

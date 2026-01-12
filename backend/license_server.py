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
import secrets
import time
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import asyncio
from aiohttp import web
import jwt

# 導入數據庫模塊
from database import Database, MEMBERSHIP_LEVELS, REFERRAL_REWARDS

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
        
        self.app.middlewares.append(cors_middleware)
    
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
        
        # 邀請 API
        self.app.router.add_get('/api/invite/info', self.handle_invite_info)
        self.app.router.add_get('/api/invite/list', self.handle_invite_list)
        
        # 支付 API
        self.app.router.add_get('/api/products', self.handle_products)
        self.app.router.add_post('/api/payment/create', self.handle_create_payment)
        self.app.router.add_post('/api/payment/callback', self.handle_payment_callback)
        
        # 公告 API
        self.app.router.add_get('/api/announcements', self.handle_announcements)
        
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
        
        # 訂單管理
        self.app.router.add_get('/api/admin/orders', self.handle_admin_orders)
        
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
        
        # 操作日誌
        self.app.router.add_get('/api/admin/logs', self.handle_admin_logs)
        
        # 配額管理
        self.app.router.add_get('/api/admin/quotas', self.handle_admin_quotas)
        
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
            
            # 解析產品 ID
            parts = product_id.split('_')
            if len(parts) != 2:
                return web.json_response({'success': False, 'message': '無效的產品ID'}, status=400)
            
            level, duration = parts
            if level not in MEMBERSHIP_LEVELS or duration not in ['week', 'month', 'quarter', 'year', 'lifetime']:
                return web.json_response({'success': False, 'message': '無效的產品'}, status=400)
            
            price = MEMBERSHIP_LEVELS[level]['prices'][duration]
            order_id = f"TGO{int(time.time())}{secrets.token_hex(4).upper()}"
            
            # USDT 匯率
            usdt_rate = float(self.db.get_setting('usdt_rate', '7.2'))
            usdt_amount = round(price / usdt_rate, 2)
            usdt_address = self.db.get_setting('usdt_trc20_address', '')
            
            response_data = {
                'orderId': order_id,
                'product': {
                    'level': level,
                    'levelName': MEMBERSHIP_LEVELS[level]['name'],
                    'duration': duration,
                    'price': price
                },
                'amount': price,
                'currency': 'CNY'
            }
            
            if payment_method == 'usdt':
                response_data['usdt'] = {
                    'amount': usdt_amount,
                    'network': 'TRC20',
                    'address': usdt_address,
                    'rate': usdt_rate
                }
            
            return web.json_response({
                'success': True,
                'data': response_data
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_payment_callback(self, request: web.Request) -> web.Response:
        """支付回調"""
        # TODO: 實現實際的支付回調處理
        return web.json_response({'success': True, 'message': '回調處理成功'})
    
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
            
            if not username or not password:
                return web.json_response({'success': False, 'message': '用戶名和密碼不能為空'}, status=400)
            
            admin = self.db.get_admin(username)
            if not admin:
                return web.json_response({'success': False, 'message': '用戶名或密碼錯誤'}, status=401)
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if password_hash != admin['password_hash']:
                return web.json_response({'success': False, 'message': '用戶名或密碼錯誤'}, status=401)
            
            token = self._generate_admin_token(username)
            
            self._log_admin_action(username, 'login', 'auth', ip_address=self._get_client_ip(request))
            
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
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500')
            orders = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return web.json_response({'success': True, 'data': orders})
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
        """獲取配額配置"""
        authorized, error_response, admin = self._require_admin(request)
        if not authorized:
            return error_response
        
        try:
            quotas = {
                level: {
                    'name': config['name'],
                    'icon': config['icon'],
                    'quotas': config['quotas'],
                    'features': config['features']
                }
                for level, config in MEMBERSHIP_LEVELS.items()
            }
            
            return web.json_response({'success': True, 'data': quotas})
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

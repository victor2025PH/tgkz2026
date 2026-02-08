"""
管理後台 API 處理器
使用統一適配器和審計日誌

優化點：
1. 所有操作自動審計
2. 統一的錯誤處理
3. 使用 SchemaAdapter 適配不同表結構
4. 密碼策略強制執行
"""

import os
import jwt
import time
import logging
from typing import Dict, Any, Optional
from aiohttp import web

from .schema_adapter import user_adapter, SchemaType, UserDTO
from .audit_logger import audit_log, AuditAction
from .error_handler import (
    error_response, success_response, handle_exception,
    ErrorCode, AdminError
)
from .password_policy import (
    password_validator, password_history,
    PasswordPolicy
)

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRES_SECONDS = 86400 * 7  # 7 天


class AdminHandlers:
    """管理後台 API 處理器集合"""
    
    def __init__(self):
        self.adapter = user_adapter
        self._ensure_admins_table()
    
    def _ensure_admins_table(self):
        """確保 admins 表有必要的字段"""
        try:
            conn = self.adapter.get_connection()
            cursor = conn.cursor()
            
            # 檢查表是否存在
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
            if not cursor.fetchone():
                conn.close()
                return
            
            # 獲取現有列
            cursor.execute("PRAGMA table_info(admins)")
            columns = [col[1] for col in cursor.fetchall()]
            
            # 添加缺失的列
            new_columns = {
                'must_change_password': 'INTEGER DEFAULT 1',
                'password_changed_at': 'TIMESTAMP',
                'failed_login_count': 'INTEGER DEFAULT 0',
                'locked_until': 'TIMESTAMP',
                'last_login_ip': 'TEXT'
            }
            
            for col_name, col_def in new_columns.items():
                if col_name not in columns:
                    try:
                        cursor.execute(f'ALTER TABLE admins ADD COLUMN {col_name} {col_def}')
                        logger.info(f"Added column {col_name} to admins table")
                    except Exception as e:
                        logger.warning(f"Could not add column {col_name}: {e}")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.warning(f"Error ensuring admins table: {e}")
    
    def _get_client_ip(self, request: web.Request) -> str:
        """獲取客戶端 IP"""
        xff = request.headers.get('X-Forwarded-For', '')
        if xff:
            return xff.split(',')[0].strip()
        return request.remote or ''
    
    def _verify_token(self, request: web.Request) -> Optional[Dict]:
        """驗證 JWT Token"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            # 允許 admin 和 admin_temp 類型
            if payload.get('type') not in ('admin', 'admin_temp'):
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _require_auth(self, request: web.Request) -> Dict:
        """要求認證，返回管理員信息或拋出異常"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(
                ErrorCode.AUTH_INVALID_TOKEN,
                http_status=401
            )
        return admin
    
    # ==================== 認證 ====================
    
    @handle_exception
    async def login(self, request: web.Request) -> web.Response:
        """管理員登錄"""
        data = await request.json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return error_response(
                ErrorCode.VALIDATION_REQUIRED_FIELD,
                details={'fields': ['username', 'password']}
            )
        
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        
        try:
            # 查詢管理員（使用 SELECT * 兼容舊表結構）
            cursor.execute('SELECT * FROM admins WHERE username = ?', (username,))
            admin = cursor.fetchone()
            
            ip_address = self._get_client_ip(request)
            
            if not admin:
                # 記錄失敗審計
                audit_log.log(
                    action=AuditAction.ADMIN_LOGIN,
                    admin_id=0,
                    admin_username=username,
                    description=f"登錄失敗：用戶不存在",
                    ip_address=ip_address,
                    status="failed",
                    error_message="用戶不存在"
                )
                return error_response(ErrorCode.AUTH_USER_NOT_FOUND)
            
            admin = dict(admin)
            
            # 檢查帳號是否啟用
            if not admin.get('is_active', 1):
                audit_log.log(
                    action=AuditAction.ADMIN_LOGIN,
                    admin_id=admin['id'],
                    admin_username=username,
                    description="登錄失敗：帳號已禁用",
                    ip_address=ip_address,
                    status="failed",
                    error_message="帳號已禁用"
                )
                return error_response(ErrorCode.AUTH_ACCOUNT_LOCKED, message="帳號已被禁用")
            
            # 檢查是否被鎖定
            if admin.get('locked_until'):
                from datetime import datetime
                locked_until = datetime.fromisoformat(admin['locked_until'].replace('Z', '+00:00'))
                if datetime.now(locked_until.tzinfo) < locked_until:
                    return error_response(
                        ErrorCode.AUTH_ACCOUNT_LOCKED,
                        message=f"帳號已鎖定，請稍後再試"
                    )
            
            # 驗證密碼
            password_hash = password_validator.hash_password(password)
            if admin['password_hash'] != password_hash:
                # 增加失敗次數（兼容沒有這些字段的舊表）
                failed_count = (admin.get('failed_login_count') or 0) + 1
                try:
                    if failed_count >= 5:
                        cursor.execute('''
                            UPDATE admins SET 
                                failed_login_count = ?,
                                locked_until = datetime('now', '+15 minutes')
                            WHERE id = ?
                        ''', (failed_count, admin['id']))
                    else:
                        cursor.execute(
                            'UPDATE admins SET failed_login_count = ? WHERE id = ?',
                            (failed_count, admin['id'])
                        )
                    conn.commit()
                except Exception as e:
                    logger.warning(f"Could not update failed_login_count: {e}")
                
                audit_log.log(
                    action=AuditAction.ADMIN_LOGIN,
                    admin_id=admin['id'],
                    admin_username=username,
                    description=f"登錄失敗：密碼錯誤 (第 {failed_count} 次)",
                    ip_address=ip_address,
                    status="failed",
                    error_message="密碼錯誤"
                )
                
                return error_response(ErrorCode.AUTH_PASSWORD_INCORRECT)
            
            # 登錄成功，清除失敗計數（兼容舊表）
            try:
                cursor.execute('''
                    UPDATE admins SET 
                        failed_login_count = 0,
                        locked_until = NULL,
                        last_login_at = CURRENT_TIMESTAMP,
                        last_login_ip = ?
                    WHERE id = ?
                ''', (ip_address, admin['id']))
            except Exception:
                # 回退到簡單更新
                cursor.execute(
                    'UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (admin['id'],)
                )
            conn.commit()
            
            # 檢查是否需要修改密碼（暫時禁用，等前端實現密碼修改頁面）
            must_change = admin.get('must_change_password', 0)  # 默認不強制
            
            # 生成 JWT（暫時總是返回正式 token）
            token_type = 'admin'  # 暫時禁用臨時 token
            token = jwt.encode({
                'admin_id': admin['id'],
                'username': admin['username'],
                'role': admin['role'],
                'type': token_type,
                'exp': int(time.time()) + JWT_EXPIRES_SECONDS
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # 記錄成功審計
            audit_log.log(
                action=AuditAction.ADMIN_LOGIN,
                admin_id=admin['id'],
                admin_username=username,
                description="登錄成功",
                ip_address=ip_address,
                status="success"
            )
            
            response_data = {
                'token': token,
                'user': {
                    'id': admin['id'],
                    'username': admin['username'],
                    'role': admin['role'],
                    'name': admin.get('name') or admin['username']
                }
            }
            
            # 暫時不強制修改密碼，等前端實現相關頁面
            # if must_change:
            #     response_data['require_password_change'] = True
            #     response_data['password_rules'] = PasswordPolicy().to_dict()
            
            return success_response(response_data)
            
        finally:
            conn.close()
    
    @handle_exception
    async def change_password(self, request: web.Request) -> web.Response:
        """修改密碼"""
        admin = self._require_auth(request)
        data = await request.json()
        
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')
        
        # 驗證輸入
        if not old_password or not new_password:
            return error_response(
                ErrorCode.VALIDATION_REQUIRED_FIELD,
                details={'fields': ['old_password', 'new_password']}
            )
        
        if new_password != confirm_password:
            return error_response(
                ErrorCode.VALIDATION_INVALID_FORMAT,
                message="兩次輸入的密碼不一致"
            )
        
        # 驗證密碼強度
        validation = password_validator.validate(new_password, admin['username'])
        if not validation.is_valid:
            return error_response(
                ErrorCode.AUTH_PASSWORD_TOO_WEAK,
                message="密碼強度不足",
                details=validation.to_dict()
            )
        
        conn = self.adapter.get_connection()
        cursor = conn.cursor()
        ip_address = self._get_client_ip(request)
        
        try:
            # 驗證舊密碼
            cursor.execute('SELECT password_hash FROM admins WHERE id = ?', (admin['admin_id'],))
            row = cursor.fetchone()
            
            if not row:
                return error_response(ErrorCode.AUTH_USER_NOT_FOUND)
            
            old_hash = password_validator.hash_password(old_password)
            if row['password_hash'] != old_hash:
                audit_log.log(
                    action=AuditAction.ADMIN_PASSWORD_CHANGE,
                    admin_id=admin['admin_id'],
                    admin_username=admin['username'],
                    description="密碼修改失敗：舊密碼錯誤",
                    ip_address=ip_address,
                    status="failed",
                    error_message="舊密碼錯誤"
                )
                return error_response(ErrorCode.AUTH_PASSWORD_INCORRECT, message="舊密碼錯誤")
            
            # 檢查密碼歷史
            new_hash = password_validator.hash_password(new_password)
            if password_history.check_history(admin['admin_id'], new_hash):
                return error_response(
                    ErrorCode.AUTH_PASSWORD_TOO_WEAK,
                    message="不能使用最近使用過的密碼"
                )
            
            # 更新密碼
            success = password_history.update_admin_password(
                admin_id=admin['admin_id'],
                new_password_hash=new_hash,
                ip_address=ip_address,
                clear_must_change=True
            )
            
            if not success:
                return error_response(ErrorCode.SYSTEM_INTERNAL_ERROR, message="密碼更新失敗")
            
            # 生成新 Token
            token = jwt.encode({
                'admin_id': admin['admin_id'],
                'username': admin['username'],
                'role': admin['role'],
                'type': 'admin',
                'exp': int(time.time()) + JWT_EXPIRES_SECONDS
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            audit_log.log(
                action=AuditAction.ADMIN_PASSWORD_CHANGE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                description="密碼修改成功",
                ip_address=ip_address,
                status="success"
            )
            
            return success_response({
                'token': token,
                'message': '密碼修改成功'
            })
            
        finally:
            conn.close()
    
    # ==================== 用戶管理 ====================
    
    @handle_exception
    async def get_users(self, request: web.Request) -> web.Response:
        """獲取用戶列表（包含錢包餘額）"""
        admin = self._require_auth(request)
        
        conn = self.adapter.get_connection()
        try:
            schema = self.adapter.detect_schema(conn)
            
            # 添加分頁
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 50)), 200)
            offset = (page - 1) * page_size
            
            cursor = conn.cursor()
            
            # 獲取總數
            cursor.execute('SELECT COUNT(*) as count FROM users')
            total = cursor.fetchone()['count']
            
            # 檢查 wallets/user_wallets 表是否存在
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='wallets'")
            has_wallets = cursor.fetchone() is not None
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_wallets'")
            has_user_wallets = cursor.fetchone() is not None
            
            # 構建查詢（帶錢包信息的 LEFT JOIN）
            # 構建錢包選擇字段
            wallet_select = '''
                NULL as wallet_balance,
                NULL as wallet_bonus,
                NULL as wallet_frozen,
                NULL as wallet_consumed,
                NULL as wallet_status
            '''
            if has_wallets:
                wallet_select = '''
                    w.main_balance as wallet_balance,
                    w.bonus_balance as wallet_bonus,
                    w.frozen_balance as wallet_frozen,
                    w.total_consumed as wallet_consumed,
                    w.status as wallet_status
                '''
            elif has_user_wallets:
                wallet_select = '''
                    w.balance as wallet_balance,
                    w.bonus_balance as wallet_bonus,
                    w.frozen_balance as wallet_frozen,
                    w.total_consumed as wallet_consumed,
                    w.status as wallet_status
                '''

            if schema == SchemaType.SAAS:
                id_field = 'u.id'
                user_query = f'''
                    SELECT u.*, 
                           {wallet_select}
                    FROM users u
                '''
            else:
                id_field = 'u.user_id'
                user_query = f'''
                    SELECT u.*, 
                           {wallet_select}
                    FROM users u
                '''
            
            if has_wallets:
                user_query += f' LEFT JOIN wallets w ON {id_field} = w.user_id'
            elif has_user_wallets:
                user_query += f' LEFT JOIN user_wallets w ON {id_field} = w.user_id'
            
            user_query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
            
            # 獲取用戶列表
            cursor.execute(user_query, (page_size, offset))
            users = []
            for row in cursor.fetchall():
                user = self.adapter.normalize_user(row)
                user_dict = user.to_dict()
                
                # 添加錢包數據
                row_dict = dict(row)
                wallet_balance = row_dict.get('wallet_balance', 0) or 0
                wallet_bonus = row_dict.get('wallet_bonus', 0) or 0
                wallet_consumed = row_dict.get('wallet_consumed', 0) or 0
                
                user_dict['walletBalance'] = wallet_balance
                user_dict['walletBalanceDisplay'] = f"${wallet_balance / 100:.2f}"
                user_dict['walletBonus'] = wallet_bonus
                user_dict['walletBonusDisplay'] = f"${wallet_bonus / 100:.2f}"
                user_dict['walletStatus'] = row_dict.get('wallet_status', 'none')
                user_dict['totalConsumed'] = wallet_consumed
                user_dict['totalConsumedDisplay'] = f"${wallet_consumed / 100:.2f}"
                
                users.append(user_dict)
            
            return success_response({
                'users': users,
                'pagination': {
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total + page_size - 1) // page_size
                }
            })
            
        finally:
            conn.close()
    
    @handle_exception
    async def extend_user(self, request: web.Request) -> web.Response:
        """延長用戶會員"""
        admin = self._require_auth(request)
        user_id = request.match_info.get('user_id')
        data = await request.json()
        
        days = int(data.get('days', 30))
        new_level = data.get('level', '')
        
        if days <= 0 or days > 3650:
            return error_response(
                ErrorCode.VALIDATION_OUT_OF_RANGE,
                details={'field': 'days', 'min': 1, 'max': 3650}
            )
        
        conn = self.adapter.get_connection()
        ip_address = self._get_client_ip(request)
        
        try:
            # 獲取原始用戶數據
            old_user = self.adapter.get_user_by_id(user_id, conn)
            if not old_user:
                return error_response(ErrorCode.USER_NOT_FOUND)
            
            schema = self.adapter.detect_schema(conn)
            cursor = conn.cursor()
            
            # 更新到期時間
            query, id_field = self.adapter.get_update_expires_query(schema)
            cursor.execute(query, (days, user_id))
            
            # 更新等級（如果指定）
            if new_level:
                query, id_field = self.adapter.get_update_level_query(schema)
                cursor.execute(query, (new_level, user_id))
            
            conn.commit()
            
            # 獲取新數據
            new_user = self.adapter.get_user_by_id(user_id, conn)
            
            # 記錄審計
            audit_log.log(
                action=AuditAction.USER_EXTEND,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="user",
                resource_id=user_id,
                old_value={'expires_at': old_user.expires_at, 'level': old_user.level},
                new_value={'expires_at': new_user.expires_at, 'level': new_user.level},
                description=f"延長用戶會員 {days} 天" + (f"，升級為 {new_level}" if new_level else ""),
                ip_address=ip_address,
                status="success"
            )
            
            return success_response(
                message=f"已延長 {days} 天" + (f"，等級升級為 {new_level}" if new_level else "")
            )
            
        except Exception as e:
            audit_log.log(
                action=AuditAction.USER_EXTEND,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="user",
                resource_id=user_id,
                description=f"延長用戶會員失敗",
                ip_address=ip_address,
                status="failed",
                error_message=str(e)
            )
            raise
        finally:
            conn.close()
    
    @handle_exception
    async def ban_user(self, request: web.Request) -> web.Response:
        """封禁/解封用戶"""
        admin = self._require_auth(request)
        user_id = request.match_info.get('user_id')
        data = await request.json()
        
        is_banned = data.get('is_banned', True)
        reason = data.get('reason', '')
        
        conn = self.adapter.get_connection()
        ip_address = self._get_client_ip(request)
        
        try:
            # 獲取原始用戶數據
            old_user = self.adapter.get_user_by_id(user_id, conn)
            if not old_user:
                return error_response(ErrorCode.USER_NOT_FOUND)
            
            schema = self.adapter.detect_schema(conn)
            cursor = conn.cursor()
            
            # 更新封禁狀態
            query, id_field, invert = self.adapter.get_update_ban_query(schema)
            ban_value = (0 if is_banned else 1) if invert else (1 if is_banned else 0)
            cursor.execute(query, (ban_value, user_id))
            
            conn.commit()
            
            action = AuditAction.USER_BAN if is_banned else AuditAction.USER_UNBAN
            action_text = "封禁" if is_banned else "解封"
            
            audit_log.log(
                action=action,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="user",
                resource_id=user_id,
                old_value={'is_banned': old_user.is_banned},
                new_value={'is_banned': is_banned, 'reason': reason},
                description=f"{action_text}用戶" + (f"：{reason}" if reason else ""),
                ip_address=ip_address,
                status="success"
            )
            
            return success_response(message=f"用戶已{action_text}")
            
        except Exception as e:
            audit_log.log(
                action=AuditAction.USER_BAN,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="user",
                resource_id=user_id,
                status="failed",
                error_message=str(e)
            )
            raise
        finally:
            conn.close()
    
    # ==================== 儀表盤 ====================
    
    @handle_exception
    async def get_dashboard(self, request: web.Request) -> web.Response:
        """獲取儀表盤數據"""
        admin = self._require_auth(request)
        
        conn = self.adapter.get_connection()
        try:
            schema = self.adapter.detect_schema(conn)
            queries = self.adapter.get_user_count_query(schema)
            cursor = conn.cursor()
            
            # 用戶統計
            cursor.execute(queries['total'])
            total_users = cursor.fetchone()['count']
            
            cursor.execute(queries['today'])
            new_today = cursor.fetchone()['count']
            
            cursor.execute(queries['paid'])
            paid_users = cursor.fetchone()['count']
            
            # 等級分布
            cursor.execute(queries['level_dist'])
            level_dist = {row['level']: row['count'] for row in cursor.fetchall()}
            
            # 卡密統計（可能沒有表）
            license_stats = {}
            try:
                cursor.execute('SELECT COUNT(*) as total FROM licenses')
                total_licenses = cursor.fetchone()['total']
                
                cursor.execute("SELECT COUNT(*) as unused FROM licenses WHERE status = 'unused'")
                unused_licenses = cursor.fetchone()['unused']
                
                license_stats = {
                    'total': total_licenses,
                    'unused': unused_licenses
                }
            except:
                pass
            
            return success_response({
                'stats': {
                    'totalUsers': total_users,
                    'newUsersToday': new_today,
                    'paidUsers': paid_users,
                    'conversionRate': round(paid_users / max(total_users, 1) * 100, 1),
                    'totalLicenses': license_stats.get('total', 0),
                    'unusedLicenses': license_stats.get('unused', 0)
                },
                'levelDistribution': level_dist,
                'licenseStats': license_stats
            })
            
        finally:
            conn.close()
    
    # ==================== 審計日誌 ====================
    
    @handle_exception
    async def get_audit_logs(self, request: web.Request) -> web.Response:
        """獲取審計日誌"""
        admin = self._require_auth(request)
        
        # 解析查詢參數
        params = {
            'admin_id': request.query.get('admin_id'),
            'action': request.query.get('action'),
            'action_category': request.query.get('category'),
            'resource_type': request.query.get('resource_type'),
            'status': request.query.get('status'),
            'start_date': request.query.get('start_date'),
            'end_date': request.query.get('end_date'),
            'page': int(request.query.get('page', 1)),
            'page_size': min(int(request.query.get('page_size', 20)), 100)
        }
        
        # 過濾 None 值
        params = {k: v for k, v in params.items() if v is not None}
        
        result = audit_log.query(**params)
        return success_response(result)
    
    @handle_exception
    async def get_audit_stats(self, request: web.Request) -> web.Response:
        """獲取審計統計"""
        admin = self._require_auth(request)
        
        days = int(request.query.get('days', 7))
        stats = audit_log.get_stats(days)
        
        return success_response(stats)
    
    # ==================== 卡密管理 ====================
    
    @handle_exception
    async def get_licenses(self, request: web.Request) -> web.Response:
        """獲取卡密列表"""
        admin = self._require_auth(request)
        
        conn = self.adapter.get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查 licenses 表是否存在
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='licenses'")
            if not cursor.fetchone():
                return success_response({
                    'licenses': [],
                    'stats': {'total': 0, 'unused': 0, 'used': 0, 'disabled': 0}
                })
            
            # 獲取卡密列表
            cursor.execute('''
                SELECT license_key, level, duration_days, status, 
                       created_at, used_at, used_by, notes
                FROM licenses 
                ORDER BY created_at DESC 
                LIMIT 500
            ''')
            
            level_config = {
                'S': {'name': '白銀精英', 'icon': '🥈'},
                'G': {'name': '黃金大師', 'icon': '🥇'},
                'D': {'name': '鑽石王牌', 'icon': '💎'},
                'T': {'name': '星耀傳說', 'icon': '🌟'},
                'K': {'name': '榮耀王者', 'icon': '👑'},
                'silver': {'name': '白銀精英', 'icon': '🥈'},
                'gold': {'name': '黃金大師', 'icon': '🥇'},
                'diamond': {'name': '鑽石王牌', 'icon': '💎'},
                'star': {'name': '星耀傳說', 'icon': '🌟'},
                'king': {'name': '榮耀王者', 'icon': '👑'}
            }
            
            licenses = []
            for row in cursor.fetchall():
                l = dict(row)
                level = l.get('level', 'S')
                config = level_config.get(level, {'name': level, 'icon': '🎫'})
                licenses.append({
                    'key': l.get('license_key', ''),
                    'level': level,
                    'levelName': config['name'],
                    'levelIcon': config['icon'],
                    'durationDays': l.get('duration_days', 30),
                    'status': l.get('status', 'unused'),
                    'createdAt': l.get('created_at', ''),
                    'usedAt': l.get('used_at', ''),
                    'usedBy': l.get('used_by', ''),
                    'notes': l.get('notes', '')
                })
            
            # 統計
            cursor.execute("SELECT status, COUNT(*) as count FROM licenses GROUP BY status")
            stats_raw = {row['status']: row['count'] for row in cursor.fetchall()}
            
            return success_response({
                'licenses': licenses,
                'stats': {
                    'total': sum(stats_raw.values()),
                    'unused': stats_raw.get('unused', 0),
                    'used': stats_raw.get('used', 0),
                    'disabled': stats_raw.get('disabled', 0)
                }
            })
            
        finally:
            conn.close()
    
    @handle_exception
    async def generate_licenses(self, request: web.Request) -> web.Response:
        """生成卡密"""
        import secrets
        import string
        
        admin = self._require_auth(request)
        data = await request.json()
        
        level = data.get('level', 'S')
        duration_days = int(data.get('duration', data.get('duration_days', 30)))
        count = min(int(data.get('count', 1)), 100)  # 最多一次生成 100 個
        notes = data.get('notes', '')
        
        conn = self.adapter.get_connection()
        ip_address = self._get_client_ip(request)
        
        try:
            cursor = conn.cursor()
            
            # 確保 licenses 表存在
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS licenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    license_key TEXT UNIQUE NOT NULL,
                    level TEXT NOT NULL,
                    duration_days INTEGER DEFAULT 30,
                    status TEXT DEFAULT 'unused',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    used_at TIMESTAMP,
                    used_by TEXT,
                    notes TEXT
                )
            ''')
            
            # 生成卡密
            generated = []
            alphabet = string.ascii_uppercase + string.digits
            
            for _ in range(count):
                # 格式: XXXX-XXXX-XXXX-XXXX
                key = '-'.join([''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4)])
                
                try:
                    cursor.execute('''
                        INSERT INTO licenses (license_key, level, duration_days, created_by, notes)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (key, level, duration_days, admin['admin_id'], notes))
                    generated.append(key)
                except Exception as e:
                    logger.warning(f"Failed to insert license {key}: {e}")
            
            conn.commit()
            
            # 審計日誌
            audit_log.log(
                action=AuditAction.LICENSE_GENERATE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="license",
                new_value={
                    'level': level,
                    'duration_days': duration_days,
                    'count': len(generated)
                },
                description=f"生成 {len(generated)} 張 {level} 級卡密",
                ip_address=ip_address,
                status="success"
            )
            
            return success_response({
                'generated': generated,
                'count': len(generated)
            }, message=f"成功生成 {len(generated)} 張卡密")
            
        except Exception as e:
            audit_log.log(
                action=AuditAction.LICENSE_GENERATE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="license",
                status="failed",
                error_message=str(e)
            )
            raise
        finally:
            conn.close()
    
    @handle_exception
    async def disable_license(self, request: web.Request) -> web.Response:
        """禁用卡密"""
        admin = self._require_auth(request)
        data = await request.json()
        
        license_key = data.get('license_key', data.get('key', ''))
        if not license_key:
            return error_response(ErrorCode.VALIDATION_REQUIRED_FIELD, details={'field': 'license_key'})
        
        conn = self.adapter.get_connection()
        ip_address = self._get_client_ip(request)
        
        try:
            cursor = conn.cursor()
            
            # 獲取原始狀態
            cursor.execute('SELECT status FROM licenses WHERE license_key = ?', (license_key,))
            row = cursor.fetchone()
            
            if not row:
                return error_response(ErrorCode.LICENSE_NOT_FOUND)
            
            old_status = row['status']
            
            # 更新狀態
            cursor.execute(
                "UPDATE licenses SET status = 'disabled' WHERE license_key = ?",
                (license_key,)
            )
            conn.commit()
            
            # 審計日誌
            audit_log.log(
                action=AuditAction.LICENSE_DISABLE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="license",
                resource_id=license_key,
                old_value={'status': old_status},
                new_value={'status': 'disabled'},
                description=f"禁用卡密 {license_key[:8]}...",
                ip_address=ip_address,
                status="success"
            )
            
            return success_response(message="卡密已禁用")
            
        finally:
            conn.close()
    
    # ==================== 訂單管理 ====================
    
    @handle_exception
    async def get_orders(self, request: web.Request) -> web.Response:
        """獲取訂單列表"""
        admin = self._require_auth(request)
        
        status_filter = request.query.get('status', '')
        
        conn = self.adapter.get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查 orders 表是否存在
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
            if not cursor.fetchone():
                return success_response({
                    'orders': [],
                    'stats': {'total': 0, 'pending': 0, 'paid': 0, 'cancelled': 0}
                })
            
            # 構建查詢
            if status_filter:
                cursor.execute('''
                    SELECT * FROM orders 
                    WHERE status = ?
                    ORDER BY created_at DESC 
                    LIMIT 500
                ''', (status_filter,))
            else:
                cursor.execute('''
                    SELECT * FROM orders 
                    ORDER BY created_at DESC 
                    LIMIT 500
                ''')
            
            orders = []
            for row in cursor.fetchall():
                o = dict(row)
                orders.append({
                    'orderId': o.get('order_id', o.get('id', '')),
                    'userId': o.get('user_id', ''),
                    'level': o.get('level', o.get('product_level', '')),
                    'duration': o.get('duration_days', o.get('duration', 30)),
                    'amount': o.get('amount', 0),
                    'status': o.get('status', 'pending'),
                    'paymentMethod': o.get('payment_method', ''),
                    'createdAt': o.get('created_at', ''),
                    'paidAt': o.get('paid_at', '')
                })
            
            # 統計
            cursor.execute("SELECT status, COUNT(*) as count FROM orders GROUP BY status")
            stats_raw = {row['status']: row['count'] for row in cursor.fetchall()}
            
            return success_response({
                'orders': orders,
                'stats': {
                    'total': sum(stats_raw.values()),
                    'pending': stats_raw.get('pending', 0),
                    'paid': stats_raw.get('paid', 0),
                    'cancelled': stats_raw.get('cancelled', 0)
                }
            })
            
        finally:
            conn.close()
    
    @handle_exception
    async def confirm_order(self, request: web.Request) -> web.Response:
        """確認訂單支付"""
        admin = self._require_auth(request)
        data = await request.json()
        
        order_id = data.get('order_id', data.get('orderId', ''))
        if not order_id:
            return error_response(ErrorCode.VALIDATION_REQUIRED_FIELD, details={'field': 'order_id'})
        
        conn = self.adapter.get_connection()
        ip_address = self._get_client_ip(request)
        
        try:
            cursor = conn.cursor()
            
            # 獲取訂單信息
            cursor.execute('SELECT * FROM orders WHERE order_id = ? OR id = ?', (order_id, order_id))
            order = cursor.fetchone()
            
            if not order:
                return error_response(ErrorCode.ORDER_NOT_FOUND)
            
            order = dict(order)
            
            if order['status'] == 'paid':
                return error_response(ErrorCode.ORDER_ALREADY_PAID)
            
            # 更新訂單狀態
            cursor.execute('''
                UPDATE orders SET 
                    status = 'paid',
                    paid_at = CURRENT_TIMESTAMP,
                    confirmed_by = ?
                WHERE order_id = ? OR id = ?
            ''', (admin['admin_id'], order_id, order_id))
            
            # 更新用戶會員（如果有 user_id）
            user_id = order.get('user_id')
            if user_id:
                schema = self.adapter.detect_schema(conn)
                duration = order.get('duration_days', order.get('duration', 30))
                level = order.get('level', order.get('product_level', 'silver'))
                
                # 更新到期時間
                query, id_field = self.adapter.get_update_expires_query(schema)
                cursor.execute(query, (duration, user_id))
                
                # 更新等級
                query, id_field = self.adapter.get_update_level_query(schema)
                cursor.execute(query, (level, user_id))
            
            conn.commit()
            
            # 審計日誌
            audit_log.log(
                action=AuditAction.ORDER_CONFIRM,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="order",
                resource_id=str(order_id),
                old_value={'status': order['status']},
                new_value={'status': 'paid'},
                description=f"確認訂單支付 {order_id}",
                ip_address=ip_address,
                status="success"
            )
            
            return success_response(message="訂單已確認支付")
            
        except Exception as e:
            audit_log.log(
                action=AuditAction.ORDER_CONFIRM,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="order",
                resource_id=str(order_id),
                status="failed",
                error_message=str(e)
            )
            raise
        finally:
            conn.close()

    # ============ 代理池管理 ============

    @handle_exception
    async def get_proxies(self, request: web.Request) -> web.Response:
        """獲取代理列表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        # 查詢參數
        status = request.query.get('status')
        page = int(request.query.get('page', 1))
        page_size = int(request.query.get('page_size', 50))
        
        result = pool.get_proxies(status=status, page=page, page_size=page_size)
        
        return success_response(data=result)

    @handle_exception
    async def add_proxies(self, request: web.Request) -> web.Response:
        """批量添加代理"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        data = await request.json()
        ip_address = request.headers.get('X-Forwarded-For', request.remote)
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        proxies = data.get('proxies', [])
        if not proxies:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="請提供代理列表")
        
        result = pool.add_proxies_batch(proxies)
        
        # 審計日誌
        audit_log.log(
            action=AuditAction.PROXY_ADD,
            admin_id=admin['admin_id'],
            admin_username=admin['username'],
            resource_type="proxy",
            description=f"批量添加代理: 成功 {result['success']} 個, 失敗 {result['failed']} 個",
            ip_address=ip_address,
            status="success"
        )
        
        return success_response(data=result, message=f"成功添加 {result['success']} 個代理")

    @handle_exception
    async def delete_proxy(self, request: web.Request) -> web.Response:
        """刪除代理"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        ip_address = request.headers.get('X-Forwarded-For', request.remote)
        
        proxy_id = request.match_info.get('proxy_id')
        if not proxy_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少代理 ID")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        success = pool.delete_proxy(proxy_id)
        
        if success:
            audit_log.log(
                action=AuditAction.PROXY_DELETE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="proxy",
                resource_id=proxy_id,
                description=f"刪除代理 {proxy_id}",
                ip_address=ip_address,
                status="success"
            )
            return success_response(message="代理已刪除")
        else:
            raise AdminError(ErrorCode.RESOURCE_NOT_FOUND, message="代理不存在")

    @handle_exception
    async def test_proxy(self, request: web.Request) -> web.Response:
        """測試代理連通性"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        proxy_id = request.match_info.get('proxy_id')
        if not proxy_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少代理 ID")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        result = await pool.test_proxy(proxy_id)
        
        return success_response(data=result)

    @handle_exception
    async def assign_proxy(self, request: web.Request) -> web.Response:
        """手動分配代理給帳號"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        data = await request.json()
        ip_address = request.headers.get('X-Forwarded-For', request.remote)
        
        account_id = data.get('account_id')
        phone = data.get('phone')
        proxy_id = data.get('proxy_id')  # 可選，為空則自動分配
        
        if not account_id and not phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號ID或手機號")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        proxy = pool.assign_proxy_to_account(
            account_id=account_id or '',
            phone=phone or '',
            proxy_id=proxy_id
        )
        
        if proxy:
            audit_log.log(
                action=AuditAction.PROXY_ASSIGN,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="proxy",
                resource_id=proxy.id,
                description=f"分配代理 {proxy.host}:{proxy.port} 給帳號 {phone or account_id}",
                ip_address=ip_address,
                status="success"
            )
            return success_response(data=proxy.to_dict(), message="代理已分配")
        else:
            raise AdminError(ErrorCode.RESOURCE_NOT_FOUND, message="沒有可用的代理")

    @handle_exception
    async def release_proxy(self, request: web.Request) -> web.Response:
        """釋放帳號的代理"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        data = await request.json()
        ip_address = request.headers.get('X-Forwarded-For', request.remote)
        
        account_id = data.get('account_id')
        phone = data.get('phone')
        
        if not account_id and not phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號ID或手機號")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        success = pool.release_proxy(account_id=account_id, phone=phone)
        
        if success:
            audit_log.log(
                action=AuditAction.PROXY_RELEASE,
                admin_id=admin['admin_id'],
                admin_username=admin['username'],
                resource_type="proxy",
                description=f"釋放帳號 {phone or account_id} 的代理",
                ip_address=ip_address,
                status="success"
            )
            return success_response(message="代理已釋放")
        else:
            return success_response(message="該帳號沒有綁定代理")

    @handle_exception
    async def get_account_proxy(self, request: web.Request) -> web.Response:
        """獲取帳號綁定的代理"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        account_id = request.query.get('account_id')
        phone = request.query.get('phone')
        
        if not account_id and not phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號ID或手機號")
        
        from .proxy_pool import get_proxy_pool
        pool = get_proxy_pool()
        
        proxy = pool.get_proxy_for_account(account_id=account_id, phone=phone)
        
        if proxy:
            return success_response(data=proxy.to_dict())
        else:
            return success_response(data=None, message="該帳號沒有綁定代理")

    # ==================== API 對接池管理 ====================

    async def list_api_pool(self, request: web.Request) -> web.Response:
        """列出所有 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        status = request.query.get('status')
        include_hash = request.query.get('include_hash', 'false').lower() == 'true'
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        try:
            pool.sync_allocations_with_accounts()
        except Exception:
            pass

        apis = pool.list_apis(status=status, include_hash=include_hash)
        stats = pool.get_pool_stats()
        
        return success_response(data={
            "apis": apis,
            "stats": stats
        })

    async def add_api_to_pool(self, request: web.Request) -> web.Response:
        """添加 API 憑據到池"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        api_id = data.get('api_id', '').strip()
        api_hash = data.get('api_hash', '').strip()
        name = data.get('name', '')
        source_phone = data.get('source_phone')
        max_accounts = data.get('max_accounts', 5)
        note = data.get('note')
        
        if not api_id or not api_hash:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="API ID 和 API Hash 不能為空")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg, cred = pool.add_api(
            api_id=api_id,
            api_hash=api_hash,
            name=name,
            source_phone=source_phone,
            max_accounts=max_accounts,
            note=note
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "add_api", "name": name},
                ip_address=ip_address
            )
            return success_response(data=cred.to_dict(include_hash=True) if cred else None, message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def add_apis_batch(self, request: web.Request) -> web.Response:
        """
        批量添加 API 憑據
        
        支持兩種模式：
        1. apis: List[Dict] - 直接傳入 API 列表
        2. text: str - 傳入文本，自動解析多種格式（CSV、JSON、簡單格式）
        """
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        # 模式 1：直接傳入 API 列表
        apis = data.get('apis', [])
        # 模式 2：傳入文本自動解析
        text = data.get('text', '')
        default_max_accounts = data.get('default_max_accounts', 5)
        
        if text:
            # 使用文本導入模式
            result = pool.import_from_text(text, default_max_accounts)
        elif apis:
            result = pool.add_apis_batch(apis)
        else:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="請提供 API 列表或文本")
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="batch",
            details={
                "action": "add_apis_batch", 
                "mode": "text" if text else "list",
                "parsed": result.get('parsed', len(apis)),
                "success": result['success'], 
                "failed": result['failed'],
                "duplicates": result.get('duplicates', 0)
            },
            ip_address=ip_address
        )
        
        return success_response(data=result)

    async def update_api_in_pool(self, request: web.Request) -> web.Response:
        """更新 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        api_id = request.match_info.get('api_id')
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 API ID")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.update_api(
            api_id=api_id,
            name=data.get('name'),
            api_hash=data.get('api_hash'),
            source_phone=data.get('source_phone'),
            max_accounts=data.get('max_accounts'),
            note=data.get('note'),
            status=data.get('status'),
            # 🆕 會員等級相關字段
            min_member_level=data.get('min_member_level'),
            priority=data.get('priority'),
            is_premium=data.get('is_premium'),
            group_id=data.get('group_id')
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "update_api", "changes": data},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def delete_api_from_pool(self, request: web.Request) -> web.Response:
        """刪除 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        api_id = request.match_info.get('api_id')
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 API ID")
        
        force = request.query.get('force', 'false').lower() == 'true'
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.remove_api(api_id, force=force)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "delete_api", "force": force},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def disable_api_in_pool(self, request: web.Request) -> web.Response:
        """禁用 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        api_id = request.match_info.get('api_id')
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 API ID")
        
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.disable_api(api_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "disable_api"},
                ip_address=ip_address
            )
        
        return success_response(message=msg) if success else error_response(ErrorCode.OPERATION_FAILED, msg)

    async def enable_api_in_pool(self, request: web.Request) -> web.Response:
        """啟用 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        api_id = request.match_info.get('api_id')
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 API ID")
        
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.enable_api(api_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "enable_api"},
                ip_address=ip_address
            )
        
        return success_response(message=msg) if success else error_response(ErrorCode.OPERATION_FAILED, msg)

    async def allocate_api(self, request: web.Request) -> web.Response:
        """為帳號分配 API 憑據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        account_phone = data.get('phone') or data.get('account_phone')
        account_id = data.get('account_id')
        preferred_api_id = data.get('api_id')  # 可選，手動指定
        strategy = data.get('strategy')  # 🆕 可選，指定分配策略
        
        if not account_phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號手機號")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        # 如果未指定策略，使用默認策略
        if not strategy:
            strategy = pool.get_allocation_strategy()
        
        success, msg, result = pool.allocate_api(
            account_phone=account_phone,
            account_id=account_id,
            preferred_api_id=preferred_api_id,
            strategy=strategy
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=account_phone,
                details={"action": "allocate_api", "api_id": result.get('api_id') if result else None},
                ip_address=ip_address
            )
            return success_response(data=result, message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def release_api(self, request: web.Request) -> web.Response:
        """釋放帳號的 API 分配"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        account_phone = data.get('phone') or data.get('account_phone')
        
        if not account_phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號手機號")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.release_api(account_phone)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=account_phone,
                details={"action": "release_api"},
                ip_address=ip_address
            )
        
        return success_response(message=msg) if success else error_response(ErrorCode.OPERATION_FAILED, msg)

    async def get_account_api(self, request: web.Request) -> web.Response:
        """獲取帳號綁定的 API"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        account_phone = request.query.get('phone') or request.query.get('account_phone')
        
        if not account_phone:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供帳號手機號")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        allocation = pool.get_allocation_for_phone(account_phone)
        
        if allocation:
            return success_response(data=allocation)
        else:
            return success_response(data=None, message="該帳號沒有綁定 API")

    async def set_api_pool_strategy(self, request: web.Request) -> web.Response:
        """🆕 設置 API 池分配策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        strategy = data.get('strategy')
        if not strategy:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="需要提供策略名稱")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.set_allocation_strategy(strategy)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id="api_pool_strategy",
                details={"action": "set_strategy", "strategy": strategy},
                ip_address=ip_address
            )
            return success_response(message=msg, data={"strategy": strategy})
        else:
            raise AdminError(ErrorCode.VALIDATION_INVALID_VALUE, message=msg)

    async def get_api_pool_strategies(self, request: web.Request) -> web.Response:
        """🆕 獲取可用的分配策略列表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        return success_response(data={
            "current_strategy": pool.get_allocation_strategy(),
            "available_strategies": pool.get_available_strategies()
        })

    async def get_api_allocation_history(self, request: web.Request) -> web.Response:
        """🆕 獲取 API 分配歷史記錄"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        # 查詢參數
        account_phone = request.query.get('phone') or request.query.get('account_phone')
        api_id = request.query.get('api_id')
        action = request.query.get('action')
        limit = int(request.query.get('limit', 100))
        offset = int(request.query.get('offset', 0))
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.get_allocation_history(
            account_phone=account_phone,
            api_id=api_id,
            action=action,
            limit=limit,
            offset=offset
        )
        
        return success_response(data=result)

    async def get_api_pool_alerts(self, request: web.Request) -> web.Response:
        """🆕 獲取 API 池容量告警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        # 可選的自定義閾值
        thresholds = {}
        if request.query.get('critical_available'):
            thresholds['critical_available'] = int(request.query.get('critical_available'))
        if request.query.get('warning_available'):
            thresholds['warning_available'] = int(request.query.get('warning_available'))
        if request.query.get('critical_utilization'):
            thresholds['critical_utilization'] = int(request.query.get('critical_utilization'))
        if request.query.get('warning_utilization'):
            thresholds['warning_utilization'] = int(request.query.get('warning_utilization'))
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.check_capacity_alerts(thresholds if thresholds else None)
        
        return success_response(data=result)

    async def get_api_pool_forecast(self, request: web.Request) -> web.Response:
        """🆕 獲取 API 池容量預測"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        days = int(request.query.get('days', 7))
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.get_capacity_forecast(days)
        
        return success_response(data=result)

    # ==================== 🆕 告警服務 API ====================

    async def get_alert_config(self, request: web.Request) -> web.Response:
        """獲取告警配置"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_service import get_alert_service
        service = get_alert_service()
        
        return success_response(data={
            "config": service.get_config(),
            "channels": service.test_channels()
        })

    async def update_alert_config(self, request: web.Request) -> web.Response:
        """更新告警配置"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .alert_service import get_alert_service
        service = get_alert_service()
        
        service.configure(data)
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="alert_config",
            details={"action": "update_alert_config"},
            ip_address=ip_address
        )
        
        return success_response(message="告警配置已更新", data=service.get_config())

    async def test_alert_channel(self, request: web.Request) -> web.Response:
        """測試告警渠道"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        channel = data.get('channel', 'webhook')
        
        from .alert_service import get_alert_service, AlertLevel
        service = get_alert_service()
        
        # 發送測試告警
        result = await service.send_alert(
            alert_type="test",
            message=f"這是一條測試告警消息 - {channel}",
            level=AlertLevel.INFO,
            suggestion="無需處理，這只是測試",
            details={"test": True, "channel": channel, "admin": admin.get('sub')}
        )
        
        if result.get('sent'):
            return success_response(message=f"測試告警已發送到 {channel}", data=result)
        else:
            return error_response(ErrorCode.OPERATION_FAILED, f"發送失敗: {result.get('reason', 'unknown')}")

    async def get_alert_history(self, request: web.Request) -> web.Response:
        """獲取告警歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        limit = int(request.query.get('limit', 50))
        
        from .alert_service import get_alert_service
        service = get_alert_service()
        
        return success_response(data={"history": service.get_history(limit)})

    async def trigger_capacity_check(self, request: web.Request) -> web.Response:
        """手動觸發容量檢查和告警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_service import check_and_send_capacity_alerts
        
        result = await check_and_send_capacity_alerts()
        
        if result:
            return success_response(message="容量檢查完成", data=result)
        else:
            return error_response(ErrorCode.OPERATION_FAILED, "容量檢查失敗")

    # ==================== 🆕 API 分組管理 ====================

    async def list_api_groups(self, request: web.Request) -> web.Response:
        """獲取所有 API 分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        groups = pool.list_groups()
        return success_response(data={"groups": groups})

    async def create_api_group(self, request: web.Request) -> web.Response:
        """創建 API 分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        name = data.get('name')
        if not name:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="分組名稱不能為空")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg, group = pool.create_group(
            name=name,
            description=data.get('description'),
            color=data.get('color', '#3B82F6'),
            icon=data.get('icon', '📁')
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=group['id'],
                details={"action": "create_group", "name": name},
                ip_address=ip_address
            )
            return success_response(message=msg, data=group)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def update_api_group(self, request: web.Request) -> web.Response:
        """更新 API 分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        group_id = request.match_info.get('group_id')
        if not group_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少分組 ID")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.update_group(
            group_id=group_id,
            name=data.get('name'),
            description=data.get('description'),
            color=data.get('color'),
            icon=data.get('icon'),
            sort_order=data.get('sort_order')
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=group_id,
                details={"action": "update_group", "changes": data},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def delete_api_group(self, request: web.Request) -> web.Response:
        """刪除 API 分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        group_id = request.match_info.get('group_id')
        if not group_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少分組 ID")
        
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.delete_group(group_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=group_id,
                details={"action": "delete_group"},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def assign_api_to_group(self, request: web.Request) -> web.Response:
        """將 API 分配到分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        api_id = data.get('api_id')
        group_id = data.get('group_id')
        
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 API ID")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.assign_api_to_group(api_id, group_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "assign_to_group", "group_id": group_id},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def batch_assign_to_group(self, request: web.Request) -> web.Response:
        """批量分配 API 到分組"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        api_ids = data.get('api_ids', [])
        group_id = data.get('group_id')
        
        if not api_ids:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="請提供 API 列表")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.batch_assign_to_group(api_ids, group_id)
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="batch",
            details={"action": "batch_assign_to_group", "group_id": group_id, "count": len(api_ids)},
            ip_address=ip_address
        )
        
        return success_response(data=result)

    # ==================== 🆕 定時任務管理 ====================

    async def list_scheduled_tasks(self, request: web.Request) -> web.Response:
        """獲取所有定時任務"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .scheduler import get_scheduler
        scheduler = get_scheduler()
        
        return success_response(data={
            "tasks": scheduler.list_tasks(),
            "is_running": scheduler.is_running
        })

    async def update_scheduled_task(self, request: web.Request) -> web.Response:
        """更新定時任務設置"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        task_id = request.match_info.get('task_id')
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .scheduler import get_scheduler
        scheduler = get_scheduler()
        
        # 更新啟用狀態
        if 'enabled' in data:
            if data['enabled']:
                scheduler.enable_task(task_id)
            else:
                scheduler.disable_task(task_id)
        
        # 更新間隔
        if 'interval_minutes' in data:
            scheduler.update_interval(task_id, data['interval_minutes'])
        
        task = scheduler.get_task(task_id)
        if not task:
            raise AdminError(ErrorCode.NOT_FOUND, message=f"任務 {task_id} 不存在")
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id=task_id,
            details={"action": "update_scheduled_task", "changes": data},
            ip_address=ip_address
        )
        
        return success_response(message="任務設置已更新", data=task)

    async def run_scheduled_task_now(self, request: web.Request) -> web.Response:
        """立即執行定時任務"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        task_id = request.match_info.get('task_id')
        ip_address = self._get_client_ip(request)
        
        from .scheduler import get_scheduler
        scheduler = get_scheduler()
        
        result = await scheduler.run_task_now(task_id)
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id=task_id,
            details={"action": "run_task_now", "result": result},
            ip_address=ip_address
        )
        
        return success_response(data=result)

    # ==================== 🆕 數據導出 ====================

    async def export_api_pool(self, request: web.Request) -> web.Response:
        """導出 API 池數據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        format_type = request.query.get('format', 'json')  # json or csv
        include_hash = request.query.get('include_hash', 'false').lower() == 'true'
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        import csv
        import io
        
        pool = get_api_pool_manager()
        apis = pool.get_all_apis(include_hash=include_hash)
        
        await audit_log(
            action=AuditAction.DATA_EXPORT,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="api_pool",
            details={"format": format_type, "count": len(apis), "include_hash": include_hash},
            ip_address=ip_address
        )
        
        if format_type == 'csv':
            output = io.StringIO()
            if apis:
                fieldnames = ['api_id', 'name', 'status', 'max_accounts', 'current_accounts', 
                              'success_count', 'fail_count', 'group_id', 'min_member_level', 
                              'priority', 'is_premium', 'created_at']
                if include_hash:
                    fieldnames.insert(1, 'api_hash')
                
                writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
                writer.writeheader()
                for api in apis:
                    writer.writerow(api)
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="api_pool_export.csv"'}
            )
        else:
            return success_response(data={"apis": apis, "total": len(apis)})

    async def export_allocation_history(self, request: web.Request) -> web.Response:
        """導出分配歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        format_type = request.query.get('format', 'json')
        limit = int(request.query.get('limit', 1000))
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        import csv
        import io
        
        pool = get_api_pool_manager()
        history = pool.get_allocation_history(limit=limit)
        
        await audit_log(
            action=AuditAction.DATA_EXPORT,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="allocation_history",
            details={"format": format_type, "limit": limit},
            ip_address=ip_address
        )
        
        if format_type == 'csv':
            output = io.StringIO()
            if history:
                fieldnames = ['id', 'action', 'api_id', 'api_name', 'account_phone', 
                              'operator_name', 'strategy_used', 'created_at']
                writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
                writer.writeheader()
                for record in history:
                    writer.writerow(record)
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="allocation_history.csv"'}
            )
        else:
            return success_response(data={"history": history, "total": len(history)})

    async def export_alert_history(self, request: web.Request) -> web.Response:
        """導出告警歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        format_type = request.query.get('format', 'json')
        limit = int(request.query.get('limit', 500))
        ip_address = self._get_client_ip(request)
        
        from .alert_service import get_alert_service
        import csv
        import io
        
        service = get_alert_service()
        history = service.get_history(limit=limit)
        
        await audit_log(
            action=AuditAction.DATA_EXPORT,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="alert_history",
            details={"format": format_type, "limit": limit},
            ip_address=ip_address
        )
        
        if format_type == 'csv':
            output = io.StringIO()
            if history:
                fieldnames = ['id', 'type', 'level', 'message', 'suggestion', 'sent_at']
                writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
                writer.writeheader()
                for record in history:
                    writer.writerow(record)
            
            return web.Response(
                text=output.getvalue(),
                content_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="alert_history.csv"'}
            )
        else:
            return success_response(data={"history": history, "total": len(history)})

    # ==================== 🆕 P6: 統計與可視化 ====================

    async def get_api_hourly_stats(self, request: web.Request) -> web.Response:
        """獲取小時統計數據"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        hours = int(request.query.get('hours', 24))
        api_id = request.query.get('api_id')
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        stats = pool.get_hourly_stats(hours=hours, api_id=api_id)
        
        return success_response(data={"stats": stats, "hours": hours})

    async def get_api_load_distribution(self, request: web.Request) -> web.Response:
        """獲取 API 負載分布"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        distribution = pool.get_api_load_distribution()
        
        return success_response(data={"distribution": distribution})

    async def get_daily_trend(self, request: web.Request) -> web.Response:
        """獲取每日趨勢"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        days = int(request.query.get('days', 7))
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        trend = pool.get_daily_trend(days=days)
        
        return success_response(data={"trend": trend, "days": days})

    # ==================== 🆕 P6: 故障轉移 ====================

    async def record_api_result(self, request: web.Request) -> web.Response:
        """記錄 API 使用結果"""
        # 此 API 可由系統內部調用，不需要管理員驗證
        data = await request.json()
        
        api_id = data.get('api_id')
        success = data.get('success', True)
        error_message = data.get('error')
        
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 api_id")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.record_api_result(api_id, success, error_message)
        
        return success_response(data=result)

    async def get_failed_apis(self, request: web.Request) -> web.Response:
        """獲取失敗/封禁的 API 列表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        include_banned = request.query.get('include_banned', 'true').lower() == 'true'
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        apis = pool.get_failed_apis(include_banned=include_banned)
        
        return success_response(data={"apis": apis, "total": len(apis)})

    async def reset_api_failures(self, request: web.Request) -> web.Response:
        """重置 API 失敗計數"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        api_id = data.get('api_id')
        reactivate = data.get('reactivate', True)
        ip_address = self._get_client_ip(request)
        
        if not api_id:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="缺少 api_id")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.reset_api_failures(api_id, reactivate)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "reset_failures", "reactivate": reactivate},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    # ==================== 🆕 P6: 分配規則引擎 ====================

    async def list_allocation_rules(self, request: web.Request) -> web.Response:
        """獲取分配規則列表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        rule_type = request.query.get('type')
        include_disabled = request.query.get('include_disabled', 'true').lower() == 'true'
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        rules = pool.list_rules(rule_type=rule_type, include_disabled=include_disabled)
        
        return success_response(data={
            "rules": rules,
            "total": len(rules),
            "rule_types": pool.RULE_TYPES,
            "target_types": pool.TARGET_TYPES,
            "actions": pool.RULE_ACTIONS
        })

    async def create_allocation_rule(self, request: web.Request) -> web.Response:
        """創建分配規則"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg, rule = pool.create_rule(
            rule_type=data.get('rule_type'),
            target_type=data.get('target_type'),
            target_value=data.get('target_value'),
            action=data.get('action'),
            api_id=data.get('api_id'),
            priority=data.get('priority', 0),
            expires_at=data.get('expires_at'),
            note=data.get('note')
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=rule['id'],
                details={"action": "create_rule", "rule": rule},
                ip_address=ip_address
            )
            return success_response(message=msg, data=rule)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def delete_allocation_rule(self, request: web.Request) -> web.Response:
        """刪除分配規則"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        rule_id = request.match_info.get('rule_id')
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.delete_rule(rule_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=rule_id,
                details={"action": "delete_rule"},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def toggle_allocation_rule(self, request: web.Request) -> web.Response:
        """啟用/禁用規則"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        rule_id = request.match_info.get('rule_id')
        data = await request.json()
        enabled = data.get('enabled', True)
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.toggle_rule(rule_id, enabled)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=rule_id,
                details={"action": "toggle_rule", "enabled": enabled},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    # ==================== 🆕 P6: 備份與恢復 ====================

    async def create_api_pool_backup(self, request: web.Request) -> web.Response:
        """創建 API 池備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        include_allocations = request.query.get('include_allocations', 'false').lower() == 'true'
        include_history = request.query.get('include_history', 'false').lower() == 'true'
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        backup = pool.create_backup(
            include_allocations=include_allocations,
            include_history=include_history
        )
        
        await audit_log(
            action=AuditAction.DATA_EXPORT,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="api_pool_backup",
            details={"action": "create_backup", "stats": backup.get("stats")},
            ip_address=ip_address
        )
        
        return success_response(data=backup)

    async def restore_api_pool_backup(self, request: web.Request) -> web.Response:
        """恢復 API 池備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        backup_data = data.get('backup')
        overwrite = data.get('overwrite', False)
        restore_allocations = data.get('restore_allocations', False)
        ip_address = self._get_client_ip(request)
        
        if not backup_data:
            raise AdminError(ErrorCode.VALIDATION_REQUIRED_FIELD, message="請提供備份數據")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        result = pool.restore_backup(
            backup_data=backup_data,
            overwrite=overwrite,
            restore_allocations=restore_allocations
        )
        
        await audit_log(
            action=AuditAction.SYSTEM_CONFIG_CHANGE,
            admin_id=admin.get('id') or admin.get('sub'),
            target_id="api_pool_backup",
            details={"action": "restore_backup", "result": result},
            ip_address=ip_address
        )
        
        if result.get("success"):
            return success_response(message="備份已恢復", data=result)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=result.get("error", "恢復失敗"))

    # ==================== 🆕 P6: 多租戶支持 ====================

    async def list_tenants(self, request: web.Request) -> web.Response:
        """獲取租戶列表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        tenants = pool.list_tenants()
        
        return success_response(data={"tenants": tenants, "total": len(tenants)})

    async def create_tenant(self, request: web.Request) -> web.Response:
        """創建租戶"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg, tenant = pool.create_tenant(
            tenant_id=data.get('id'),
            name=data.get('name'),
            description=data.get('description'),
            api_quota=data.get('api_quota', 100)
        )
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=tenant['id'],
                details={"action": "create_tenant", "tenant": tenant},
                ip_address=ip_address
            )
            return success_response(message=msg, data=tenant)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def get_tenant_stats(self, request: web.Request) -> web.Response:
        """獲取租戶統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        stats = pool.get_tenant_stats(tenant_id)
        
        if "error" in stats:
            raise AdminError(ErrorCode.NOT_FOUND, message=stats["error"])
        
        return success_response(data=stats)

    async def assign_api_to_tenant(self, request: web.Request) -> web.Response:
        """分配 API 到租戶"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        api_id = data.get('api_id')
        tenant_id = data.get('tenant_id')
        ip_address = self._get_client_ip(request)
        
        from .api_pool import get_api_pool_manager
        pool = get_api_pool_manager()
        
        success, msg = pool.assign_api_to_tenant(api_id, tenant_id)
        
        if success:
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=api_id,
                details={"action": "assign_to_tenant", "tenant_id": tenant_id},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    # ==================== 🆕 P7: 健康評分系統 ====================

    async def get_health_scores(self, request: web.Request) -> web.Response:
        """獲取所有 API 健康評分"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        from .health_score import HealthMonitor
        
        pool = get_api_pool_manager()
        monitor = HealthMonitor(pool)
        
        scores = monitor.get_all_health_scores()
        
        return success_response(data={"scores": scores, "total": len(scores)})

    async def get_health_summary(self, request: web.Request) -> web.Response:
        """獲取健康摘要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        from .health_score import HealthMonitor
        
        pool = get_api_pool_manager()
        monitor = HealthMonitor(pool)
        
        summary = monitor.get_health_summary()
        
        return success_response(data=summary)

    async def detect_anomalies(self, request: web.Request) -> web.Response:
        """檢測異常 API"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        from .health_score import HealthMonitor
        
        pool = get_api_pool_manager()
        monitor = HealthMonitor(pool)
        
        anomalies = monitor.detect_anomalies()
        
        return success_response(data={"anomalies": anomalies, "count": len(anomalies)})

    # ==================== 🆕 P7: 智能預測系統 ====================

    async def get_usage_prediction(self, request: web.Request) -> web.Response:
        """獲取使用量預測"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        days = int(request.query.get('days', 14))
        
        from .api_pool import get_api_pool_manager
        from .prediction import UsagePredictor
        
        pool = get_api_pool_manager()
        predictor = UsagePredictor(pool)
        
        prediction = predictor.predict_daily_usage(days)
        
        return success_response(data=prediction)

    async def get_capacity_prediction(self, request: web.Request) -> web.Response:
        """獲取容量需求預測"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        days = int(request.query.get('days', 30))
        
        from .api_pool import get_api_pool_manager
        from .prediction import UsagePredictor
        
        pool = get_api_pool_manager()
        predictor = UsagePredictor(pool)
        
        prediction = predictor.predict_capacity_needs(days)
        
        return success_response(data=prediction)

    async def get_optimal_timing(self, request: web.Request) -> web.Response:
        """獲取最佳分配時間"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        from .prediction import UsagePredictor
        
        pool = get_api_pool_manager()
        predictor = UsagePredictor(pool)
        
        timing = predictor.find_optimal_allocation_time()
        
        return success_response(data=timing)

    async def get_prediction_report(self, request: web.Request) -> web.Response:
        """獲取完整預測報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_pool import get_api_pool_manager
        from .prediction import UsagePredictor
        
        pool = get_api_pool_manager()
        predictor = UsagePredictor(pool)
        
        report = predictor.get_prediction_report()
        
        return success_response(data=report)

    # ==================== 🆕 P7: Webhook 事件訂閱 ====================

    async def list_webhook_subscribers(self, request: web.Request) -> web.Response:
        """列出 Webhook 訂閱者"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        active_only = request.query.get('active_only', 'false').lower() == 'true'
        subscribers = system.list_subscribers(active_only)
        
        return success_response(data={"subscribers": subscribers, "total": len(subscribers)})

    async def add_webhook_subscriber(self, request: web.Request) -> web.Response:
        """添加 Webhook 訂閱者"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .webhook_events import get_webhook_system, WebhookSubscriber
        system = get_webhook_system()
        
        subscriber = WebhookSubscriber(
            id=str(uuid.uuid4()),
            name=data.get('name', 'Unnamed'),
            url=data.get('url'),
            secret=data.get('secret', ''),
            events=data.get('events', ['*']),
            is_active=data.get('is_active', True),
            headers=data.get('headers', {}),
            retry_count=data.get('retry_count', 3),
            timeout=data.get('timeout', 30)
        )
        
        if not subscriber.url:
            raise AdminError(ErrorCode.INVALID_PARAMS, message="URL 為必填項")
        
        success = system.add_subscriber(subscriber)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=subscriber.id,
                details={"action": "add_webhook_subscriber", "name": subscriber.name},
                ip_address=ip_address
            )
            return success_response(data={"id": subscriber.id}, message="訂閱者已添加")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="添加訂閱者失敗")

    async def update_webhook_subscriber(self, request: web.Request) -> web.Response:
        """更新 Webhook 訂閱者"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        subscriber_id = request.match_info.get('subscriber_id')
        data = await request.json()
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        success = system.update_subscriber(subscriber_id, data)
        
        if success:
            return success_response(message="訂閱者已更新")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="更新訂閱者失敗")

    async def remove_webhook_subscriber(self, request: web.Request) -> web.Response:
        """刪除 Webhook 訂閱者"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        subscriber_id = request.match_info.get('subscriber_id')
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        success = system.remove_subscriber(subscriber_id)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=subscriber_id,
                details={"action": "remove_webhook_subscriber"},
                ip_address=ip_address
            )
            return success_response(message="訂閱者已刪除")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="刪除訂閱者失敗")

    async def get_webhook_events(self, request: web.Request) -> web.Response:
        """獲取 Webhook 事件歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        event_type = request.query.get('event_type')
        subscriber_id = request.query.get('subscriber_id')
        status = request.query.get('status')
        limit = int(request.query.get('limit', 100))
        
        events = system.get_event_history(event_type, subscriber_id, status, limit)
        
        return success_response(data={"events": events, "total": len(events)})

    async def get_webhook_stats(self, request: web.Request) -> web.Response:
        """獲取 Webhook 推送統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        stats = system.get_delivery_stats()
        
        return success_response(data=stats)

    async def test_webhook(self, request: web.Request) -> web.Response:
        """測試 Webhook 推送"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        subscriber_id = request.match_info.get('subscriber_id')
        
        from .webhook_events import get_webhook_system, EventType
        system = get_webhook_system()
        
        subscriber = system.get_subscriber(subscriber_id)
        if not subscriber:
            raise AdminError(ErrorCode.NOT_FOUND, message="訂閱者不存在")
        
        # 發送測試事件
        event_id = await system.emit(EventType.SYSTEM_ALERT, {
            "type": "test",
            "message": "這是一個測試事件",
            "timestamp": datetime.now().isoformat()
        })
        
        return success_response(data={"event_id": event_id}, message="測試事件已發送")

    async def retry_failed_webhooks(self, request: web.Request) -> web.Response:
        """重試失敗的 Webhook"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .webhook_events import get_webhook_system
        system = get_webhook_system()
        
        max_age = int(request.query.get('max_age_hours', 24))
        retried = await system.retry_failed_events(max_age)
        
        return success_response(data={"retried": retried}, message=f"已重試 {retried} 個失敗事件")

    # ==================== 🆕 P7: API 使用計費 ====================

    async def list_billing_plans(self, request: web.Request) -> web.Response:
        """列出計費方案"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        active_only = request.query.get('active_only', 'true').lower() == 'true'
        plans = billing.list_plans(active_only)
        
        return success_response(data={"plans": plans})

    async def create_billing_plan(self, request: web.Request) -> web.Response:
        """創建計費方案"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .billing import get_billing_manager, BillingPlan, BillingPlanType
        billing = get_billing_manager()
        
        plan = BillingPlan(
            id=data.get('id') or str(uuid.uuid4()),
            name=data.get('name', 'Unnamed Plan'),
            plan_type=BillingPlanType(data.get('plan_type', 'pay_per_use')),
            base_price=data.get('base_price', 0),
            per_allocation=data.get('per_allocation', 0),
            per_hour=data.get('per_hour', 0),
            included_allocations=data.get('included_allocations', 0),
            included_hours=data.get('included_hours', 0),
            overage_rate=data.get('overage_rate', 0),
            tier_config=data.get('tier_config', {})
        )
        
        success = billing.create_plan(plan)
        
        if success:
            return success_response(data={"id": plan.id}, message="計費方案已創建")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="創建計費方案失敗")

    async def assign_billing_plan(self, request: web.Request) -> web.Response:
        """為租戶分配計費方案"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        tenant_id = data.get('tenant_id')
        plan_id = data.get('plan_id')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        success = billing.assign_plan_to_tenant(tenant_id, plan_id)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=tenant_id,
                details={"action": "assign_billing_plan", "plan_id": plan_id},
                ip_address=ip_address
            )
            return success_response(message="計費方案已分配")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="分配計費方案失敗")

    async def get_tenant_billing(self, request: web.Request) -> web.Response:
        """獲取租戶計費信息"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        info = billing.get_tenant_billing(tenant_id)
        
        if info:
            return success_response(data=info)
        else:
            raise AdminError(ErrorCode.NOT_FOUND, message="租戶計費信息不存在")

    async def get_usage_summary(self, request: web.Request) -> web.Response:
        """獲取使用量摘要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        start_date = request.query.get('start_date')
        end_date = request.query.get('end_date')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        summary = billing.get_usage_summary(tenant_id, start_date, end_date)
        
        return success_response(data=summary)

    async def calculate_charges(self, request: web.Request) -> web.Response:
        """計算費用"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        tenant_id = data.get('tenant_id')
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        charges = billing.calculate_charges(tenant_id, period_start, period_end)
        
        return success_response(data=charges)

    async def generate_invoice(self, request: web.Request) -> web.Response:
        """生成帳單"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        tenant_id = data.get('tenant_id')
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        invoice = billing.generate_invoice(tenant_id, period_start, period_end)
        
        if invoice:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=invoice.id,
                details={"action": "generate_invoice", "tenant_id": tenant_id, "amount": invoice.total_amount},
                ip_address=ip_address
            )
            return success_response(data={
                "id": invoice.id,
                "total_amount": invoice.total_amount
            }, message="帳單已生成")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="生成帳單失敗")

    async def list_invoices(self, request: web.Request) -> web.Response:
        """列出帳單"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.query.get('tenant_id')
        status = request.query.get('status')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        invoices = billing.list_invoices(tenant_id, status)
        
        return success_response(data={"invoices": invoices, "total": len(invoices)})

    async def mark_invoice_paid(self, request: web.Request) -> web.Response:
        """標記帳單已支付"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        invoice_id = request.match_info.get('invoice_id')
        
        from .billing import get_billing_manager
        billing = get_billing_manager()
        
        success = billing.mark_invoice_paid(invoice_id)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=invoice_id,
                details={"action": "mark_invoice_paid"},
                ip_address=ip_address
            )
            return success_response(message="帳單已標記為已支付")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="操作失敗")

    # ==================== 🆕 P7: 自動擴縮容 ====================

    async def list_scaling_policies(self, request: web.Request) -> web.Response:
        """列出擴縮容策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .auto_scaling import get_scaling_manager
        manager = get_scaling_manager()
        
        active_only = request.query.get('active_only', 'false').lower() == 'true'
        policies = manager.list_policies(active_only)
        
        return success_response(data={"policies": policies})

    async def create_scaling_policy(self, request: web.Request) -> web.Response:
        """創建擴縮容策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .auto_scaling import get_scaling_manager, ScalingPolicy
        manager = get_scaling_manager()
        
        scale_up = data.get('scale_up', {})
        scale_down = data.get('scale_down', {})
        settings = data.get('settings', {})
        
        policy = ScalingPolicy(
            id=data.get('id') or str(uuid.uuid4()),
            name=data.get('name', 'Unnamed Policy'),
            is_active=data.get('is_active', True),
            scale_up_threshold=scale_up.get('threshold', 80),
            scale_up_cooldown=scale_up.get('cooldown', 300),
            scale_up_increment=scale_up.get('increment', 10),
            scale_up_max=scale_up.get('max', 100),
            scale_down_threshold=scale_down.get('threshold', 30),
            scale_down_cooldown=scale_down.get('cooldown', 600),
            scale_down_decrement=scale_down.get('decrement', 5),
            scale_down_min=scale_down.get('min', 10),
            evaluation_period=settings.get('evaluation_period', 60),
            consecutive_breaches=settings.get('consecutive_breaches', 3),
            target_utilization=settings.get('target_utilization', 60),
            group_id=data.get('group_id')
        )
        
        success = manager.create_policy(policy)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=policy.id,
                details={"action": "create_scaling_policy", "name": policy.name},
                ip_address=ip_address
            )
            return success_response(data={"id": policy.id}, message="擴縮容策略已創建")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="創建策略失敗")

    async def update_scaling_policy(self, request: web.Request) -> web.Response:
        """更新擴縮容策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        policy_id = request.match_info.get('policy_id')
        data = await request.json()
        
        from .auto_scaling import get_scaling_manager
        manager = get_scaling_manager()
        
        success = manager.update_policy(policy_id, data)
        
        if success:
            return success_response(message="策略已更新")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="更新策略失敗")

    async def delete_scaling_policy(self, request: web.Request) -> web.Response:
        """刪除擴縮容策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        policy_id = request.match_info.get('policy_id')
        
        from .auto_scaling import get_scaling_manager
        manager = get_scaling_manager()
        
        success = manager.delete_policy(policy_id)
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=policy_id,
                details={"action": "delete_scaling_policy"},
                ip_address=ip_address
            )
            return success_response(message="策略已刪除")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="刪除策略失敗")

    async def evaluate_scaling(self, request: web.Request) -> web.Response:
        """評估擴縮容需求"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .auto_scaling import get_scaling_manager
        from .api_pool import get_api_pool_manager
        
        manager = get_scaling_manager()
        pool = get_api_pool_manager()
        
        recommendations = manager.evaluate(pool)
        
        return success_response(data={"recommendations": recommendations})

    async def execute_scaling(self, request: web.Request) -> web.Response:
        """執行擴縮容"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        policy_id = data.get('policy_id')
        action = data.get('action')
        capacity_change = data.get('capacity_change', 0)
        trigger_value = data.get('trigger_value', 0)
        
        from .auto_scaling import get_scaling_manager, ScalingAction
        from .api_pool import get_api_pool_manager
        
        manager = get_scaling_manager()
        pool = get_api_pool_manager()
        
        scaling_action = ScalingAction(action)
        success, msg = manager.execute_scaling(
            pool, policy_id, scaling_action, capacity_change, trigger_value
        )
        
        if success:
            ip_address = self._get_client_ip(request)
            await audit_log(
                action=AuditAction.SYSTEM_CONFIG_CHANGE,
                admin_id=admin.get('id') or admin.get('sub'),
                target_id=policy_id,
                details={"action": "execute_scaling", "scaling_action": action, "change": capacity_change},
                ip_address=ip_address
            )
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def get_scaling_history(self, request: web.Request) -> web.Response:
        """獲取擴縮容歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .auto_scaling import get_scaling_manager
        manager = get_scaling_manager()
        
        limit = int(request.query.get('limit', 100))
        policy_id = request.query.get('policy_id')
        
        history = manager.get_scaling_history(limit, policy_id)
        
        return success_response(data={"events": history, "total": len(history)})

    async def get_scaling_stats(self, request: web.Request) -> web.Response:
        """獲取擴縮容統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .auto_scaling import get_scaling_manager
        manager = get_scaling_manager()
        
        stats = manager.get_scaling_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P8: 審計合規系統 ====================

    async def query_audit_logs(self, request: web.Request) -> web.Response:
        """查詢審計日誌"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        logs, total = manager.query_logs(
            start_date=request.query.get('start_date'),
            end_date=request.query.get('end_date'),
            actor_id=request.query.get('actor_id'),
            category=request.query.get('category'),
            resource_type=request.query.get('resource_type'),
            limit=int(request.query.get('limit', 100)),
            offset=int(request.query.get('offset', 0))
        )
        
        return success_response(data={"logs": logs, "total": total})

    async def get_resource_history(self, request: web.Request) -> web.Response:
        """獲取資源操作歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        resource_type = request.match_info.get('resource_type')
        resource_id = request.match_info.get('resource_id')
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        history = manager.get_resource_history(resource_type, resource_id)
        
        return success_response(data={"history": history})

    async def generate_compliance_report(self, request: web.Request) -> web.Response:
        """生成合規報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        report = manager.generate_compliance_report(
            report_type=data.get('report_type', 'custom'),
            period_start=data.get('period_start'),
            period_end=data.get('period_end'),
            generated_by=admin.get('id') or admin.get('sub')
        )
        
        return success_response(data={
            "id": report.id,
            "compliance_score": report.compliance_score,
            "findings": report.findings
        })

    async def list_compliance_reports(self, request: web.Request) -> web.Response:
        """列出合規報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        reports = manager.list_reports()
        
        return success_response(data={"reports": reports})

    async def get_compliance_report(self, request: web.Request) -> web.Response:
        """獲取合規報告詳情"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        report_id = request.match_info.get('report_id')
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        report = manager.get_report(report_id)
        
        if report:
            return success_response(data=report)
        else:
            raise AdminError(ErrorCode.NOT_FOUND, message="報告不存在")

    async def export_audit_logs(self, request: web.Request) -> web.Response:
        """導出審計日誌"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        csv_content = manager.export_logs_csv(
            start_date=request.query.get('start_date'),
            end_date=request.query.get('end_date'),
            category=request.query.get('category')
        )
        
        return web.Response(
            body=csv_content,
            content_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename="audit_logs.csv"'}
        )

    async def get_audit_storage_stats(self, request: web.Request) -> web.Response:
        """獲取審計存儲統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .audit_compliance import get_audit_manager
        manager = get_audit_manager()
        
        stats = manager.get_storage_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P8: 多集群管理 ====================

    async def list_clusters(self, request: web.Request) -> web.Response:
        """列出集群"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        region = request.query.get('region')
        status = request.query.get('status')
        
        clusters = manager.list_clusters(region, status)
        
        return success_response(data={"clusters": clusters})

    async def register_cluster(self, request: web.Request) -> web.Response:
        """註冊集群"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .cluster_manager import get_cluster_manager, ClusterNode, ClusterStatus
        manager = get_cluster_manager()
        
        node = ClusterNode(
            id=data.get('id') or str(uuid.uuid4()),
            name=data.get('name'),
            region=data.get('region'),
            endpoint=data.get('endpoint'),
            api_key=data.get('api_key', ''),
            priority=data.get('priority', 0),
            weight=data.get('weight', 100),
            max_capacity=data.get('max_capacity', 1000)
        )
        
        success = manager.register_cluster(node)
        
        if success:
            return success_response(data={"id": node.id}, message="集群已註冊")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="註冊集群失敗")

    async def update_cluster(self, request: web.Request) -> web.Response:
        """更新集群"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        cluster_id = request.match_info.get('cluster_id')
        data = await request.json()
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        success = manager.update_cluster(cluster_id, data)
        
        if success:
            return success_response(message="集群已更新")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="更新集群失敗")

    async def remove_cluster(self, request: web.Request) -> web.Response:
        """移除集群"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        cluster_id = request.match_info.get('cluster_id')
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        success = manager.remove_cluster(cluster_id)
        
        if success:
            return success_response(message="集群已移除")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="移除集群失敗")

    async def check_cluster_health(self, request: web.Request) -> web.Response:
        """檢查集群健康"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        cluster_id = request.match_info.get('cluster_id')
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        healthy, info = await manager.check_cluster_health(cluster_id)
        
        return success_response(data={"healthy": healthy, "info": info})

    async def trigger_failover(self, request: web.Request) -> web.Response:
        """觸發故障轉移"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        cluster_id = data.get('cluster_id')
        reason = data.get('reason', '手動觸發')
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        success, msg, new_cluster = await manager.trigger_failover(cluster_id, reason)
        
        if success:
            return success_response(data={"new_cluster_id": new_cluster}, message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def get_cluster_stats(self, request: web.Request) -> web.Response:
        """獲取集群統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cluster_manager import get_cluster_manager
        manager = get_cluster_manager()
        
        stats = manager.get_cluster_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P8: 告警升級 ====================

    async def list_on_call_schedules(self, request: web.Request) -> web.Response:
        """列出值班表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        level = request.query.get('level')
        schedules = manager.list_schedules(level)
        
        return success_response(data={"schedules": schedules})

    async def list_escalation_policies(self, request: web.Request) -> web.Response:
        """列出升級策略"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        policies = manager.list_policies()
        
        return success_response(data={"policies": policies})

    async def list_escalation_alerts(self, request: web.Request) -> web.Response:
        """列出升級告警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        status = request.query.get('status')
        level = request.query.get('level')
        
        alerts = manager.list_alerts(status, level)
        
        return success_response(data={"alerts": alerts})

    async def acknowledge_escalation(self, request: web.Request) -> web.Response:
        """確認升級告警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        alert_id = request.match_info.get('alert_id')
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        success, msg = await manager.acknowledge_alert(alert_id, admin.get('id') or admin.get('sub'))
        
        if success:
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def resolve_escalation(self, request: web.Request) -> web.Response:
        """解決升級告警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        alert_id = request.match_info.get('alert_id')
        data = await request.json()
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        success, msg = await manager.resolve_alert(
            alert_id,
            admin.get('id') or admin.get('sub'),
            data.get('resolution', '')
        )
        
        if success:
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    async def get_escalation_stats(self, request: web.Request) -> web.Response:
        """獲取升級統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .alert_escalation import get_escalation_manager
        manager = get_escalation_manager()
        
        stats = manager.get_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P8: API 版本管理 ====================

    async def list_api_versions(self, request: web.Request) -> web.Response:
        """列出 API 版本"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_versioning import get_versioning_manager
        manager = get_versioning_manager()
        
        api_id = request.query.get('api_id')
        status = request.query.get('status')
        
        versions = manager.list_versions(api_id, status)
        
        return success_response(data={"versions": versions})

    async def create_api_version(self, request: web.Request) -> web.Response:
        """創建 API 版本"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .api_versioning import get_versioning_manager, ApiVersion
        manager = get_versioning_manager()
        
        version = ApiVersion(
            id=str(uuid.uuid4()),
            api_id=data.get('api_id'),
            version=data.get('version'),
            name=data.get('name', ''),
            description=data.get('description', ''),
            config=data.get('config', {})
        )
        
        success = manager.create_version(version)
        
        if success:
            return success_response(data={"id": version.id}, message="版本已創建")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="創建版本失敗")

    async def list_rollouts(self, request: web.Request) -> web.Response:
        """列出發布計劃"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .api_versioning import get_versioning_manager
        manager = get_versioning_manager()
        
        status = request.query.get('status')
        rollouts = manager.list_rollouts(status)
        
        return success_response(data={"rollouts": rollouts})

    async def create_rollout(self, request: web.Request) -> web.Response:
        """創建發布計劃"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        import uuid
        
        from .api_versioning import get_versioning_manager, RolloutPlan, RolloutStrategy
        manager = get_versioning_manager()
        
        plan = RolloutPlan(
            id=str(uuid.uuid4()),
            name=data.get('name'),
            from_version_id=data.get('from_version_id'),
            to_version_id=data.get('to_version_id'),
            strategy=RolloutStrategy(data.get('strategy', 'percentage')),
            target_percentage=data.get('target_percentage', 100),
            step_size=data.get('step_size', 10),
            step_interval=data.get('step_interval', 60)
        )
        
        success = manager.create_rollout(plan)
        
        if success:
            return success_response(data={"id": plan.id}, message="發布計劃已創建")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="創建發布計劃失敗")

    async def control_rollout(self, request: web.Request) -> web.Response:
        """控制發布"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        plan_id = request.match_info.get('plan_id')
        action = request.match_info.get('action')
        
        from .api_versioning import get_versioning_manager
        manager = get_versioning_manager()
        
        if action == 'start':
            success, msg = manager.start_rollout(plan_id)
        elif action == 'advance':
            success, msg = manager.advance_rollout(plan_id)
        elif action == 'pause':
            success, msg = manager.pause_rollout(plan_id)
        elif action == 'complete':
            success, msg = manager.complete_rollout(plan_id)
        elif action == 'rollback':
            data = await request.json()
            success, msg = manager.rollback(plan_id, data.get('reason', ''))
        else:
            raise AdminError(ErrorCode.INVALID_PARAMS, message="無效的操作")
        
        if success:
            return success_response(message=msg)
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message=msg)

    # ==================== 🆕 P8: 異常檢測 ====================

    async def list_anomaly_detectors(self, request: web.Request) -> web.Response:
        """列出異常檢測器"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .anomaly_detection import get_anomaly_manager
        manager = get_anomaly_manager()
        
        detectors = manager.list_detectors()
        
        return success_response(data={"detectors": detectors})

    async def list_anomalies(self, request: web.Request) -> web.Response:
        """列出異常"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .anomaly_detection import get_anomaly_manager
        manager = get_anomaly_manager()
        
        anomalies = manager.list_anomalies(
            metric_name=request.query.get('metric'),
            severity=request.query.get('severity'),
            hours=int(request.query.get('hours', 24)),
            limit=int(request.query.get('limit', 100))
        )
        
        return success_response(data={"anomalies": anomalies})

    async def acknowledge_anomaly(self, request: web.Request) -> web.Response:
        """確認異常"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        anomaly_id = request.match_info.get('anomaly_id')
        
        from .anomaly_detection import get_anomaly_manager
        manager = get_anomaly_manager()
        
        success = manager.acknowledge_anomaly(anomaly_id, admin.get('id') or admin.get('sub'))
        
        if success:
            return success_response(message="異常已確認")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="確認失敗")

    async def get_anomaly_stats(self, request: web.Request) -> web.Response:
        """獲取異常統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .anomaly_detection import get_anomaly_manager
        manager = get_anomaly_manager()
        
        hours = int(request.query.get('hours', 24))
        stats = manager.get_anomaly_stats(hours)
        
        return success_response(data=stats)

    async def get_detector_status(self, request: web.Request) -> web.Response:
        """獲取檢測器狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .anomaly_detection import get_anomaly_manager
        manager = get_anomaly_manager()
        
        status = manager.get_detector_status()
        
        return success_response(data=status)

    # ==================== 🆕 P9: 可觀測性平台 ====================

    async def get_current_metrics(self, request: web.Request) -> web.Response:
        """獲取當前指標"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        metrics = manager.get_current_metrics()
        
        return success_response(data={"metrics": metrics})

    async def query_metrics(self, request: web.Request) -> web.Response:
        """查詢指標歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        name = request.query.get('name')
        if not name:
            raise AdminError(ErrorCode.INVALID_PARAMS, message="缺少指標名稱")
        
        metrics = manager.query_metrics(
            name=name,
            start_time=request.query.get('start'),
            end_time=request.query.get('end'),
            limit=int(request.query.get('limit', 1000))
        )
        
        return success_response(data={"metrics": metrics})

    async def get_metric_aggregation(self, request: web.Request) -> web.Response:
        """獲取指標聚合"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        name = request.query.get('name')
        if not name:
            raise AdminError(ErrorCode.INVALID_PARAMS, message="缺少指標名稱")
        
        aggregation = manager.get_metric_aggregation(
            name=name,
            hours=int(request.query.get('hours', 24)),
            interval=request.query.get('interval', 'hour')
        )
        
        return success_response(data={"aggregation": aggregation})

    async def get_trace(self, request: web.Request) -> web.Response:
        """獲取追蹤"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        trace_id = request.match_info.get('trace_id')
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        spans = manager.get_trace(trace_id)
        
        return success_response(data={"trace_id": trace_id, "spans": spans})

    async def search_traces(self, request: web.Request) -> web.Response:
        """搜索追蹤"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        traces = manager.search_traces(
            service_name=request.query.get('service'),
            operation_name=request.query.get('operation'),
            min_duration_ms=float(request.query.get('min_duration', 0)) if request.query.get('min_duration') else None,
            status=request.query.get('status'),
            hours=int(request.query.get('hours', 24)),
            limit=int(request.query.get('limit', 100))
        )
        
        return success_response(data={"traces": traces})

    async def list_dashboards(self, request: web.Request) -> web.Response:
        """列出儀表盤"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        dashboards = manager.list_dashboards()
        
        return success_response(data={"dashboards": dashboards})

    async def get_system_overview(self, request: web.Request) -> web.Response:
        """獲取系統概覽"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .observability import get_observability_manager
        manager = get_observability_manager()
        
        overview = manager.get_system_overview()
        
        return success_response(data=overview)

    # ==================== 🆕 P9: 多租戶增強 ====================

    async def list_tenants_enhanced(self, request: web.Request) -> web.Response:
        """列出租戶（增強版）"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        tenants = manager.list_tenants()
        
        return success_response(data={"tenants": tenants})

    async def get_tenant_quotas(self, request: web.Request) -> web.Response:
        """獲取租戶配額"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        quotas = manager.get_quotas(tenant_id)
        
        return success_response(data={"quotas": quotas})

    async def set_tenant_quota(self, request: web.Request) -> web.Response:
        """設置租戶配額"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        data = await request.json()
        
        from .tenant_enhanced import get_tenant_enhanced_manager, QuotaType
        manager = get_tenant_enhanced_manager()
        
        success = manager.set_quota(
            tenant_id=tenant_id,
            quota_type=QuotaType(data['quota_type']),
            limit_value=data['limit_value'],
            warning_threshold=data.get('warning_threshold', 75),
            critical_threshold=data.get('critical_threshold', 90),
            reset_period=data.get('reset_period', 'monthly')
        )
        
        if success:
            return success_response(message="配額已設置")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="設置配額失敗")

    async def get_quota_alerts(self, request: web.Request) -> web.Response:
        """獲取配額預警"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        tenant_id = request.query.get('tenant_id')
        
        alerts = manager.get_quota_alerts(tenant_id)
        
        return success_response(data={"alerts": alerts})

    async def generate_tenant_report(self, request: web.Request) -> web.Response:
        """生成租戶報表"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        data = await request.json()
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        report = manager.generate_report(
            tenant_id=tenant_id,
            report_type=data.get('report_type', 'monthly')
        )
        
        return success_response(data=report)

    async def get_tenant_summary(self, request: web.Request) -> web.Response:
        """獲取租戶概要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        tenant_id = request.match_info.get('tenant_id')
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        summary = manager.get_tenant_summary(tenant_id)
        
        return success_response(data=summary)

    async def get_tenants_overview(self, request: web.Request) -> web.Response:
        """獲取所有租戶概覽"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .tenant_enhanced import get_tenant_enhanced_manager
        manager = get_tenant_enhanced_manager()
        
        overview = manager.get_all_tenants_overview()
        
        return success_response(data=overview)

    # ==================== 🆕 P9: 安全增強 ====================

    async def list_user_roles(self, request: web.Request) -> web.Response:
        """列出用戶角色"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        user_id = request.match_info.get('user_id')
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        roles = manager.get_user_roles(user_id)
        
        return success_response(data=roles)

    async def assign_user_role(self, request: web.Request) -> web.Response:
        """分配用戶角色"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        user_id = request.match_info.get('user_id')
        data = await request.json()
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        success = manager.assign_role(
            user_id=user_id,
            roles=data['roles'],
            tenant_id=data.get('tenant_id'),
            custom_permissions=data.get('custom_permissions')
        )
        
        if success:
            return success_response(message="角色已分配")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="分配角色失敗")

    async def create_access_token(self, request: web.Request) -> web.Response:
        """創建訪問令牌"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        user_id = data.get('user_id', admin.get('id') or admin.get('sub'))
        
        token_id, raw_token = manager.create_token(
            user_id=user_id,
            name=data.get('name', ''),
            scopes=data.get('scopes'),
            expires_in_days=data.get('expires_in_days', 30)
        )
        
        return success_response(data={
            "token_id": token_id,
            "token": raw_token,
            "message": "請妥善保存令牌，此令牌只顯示一次"
        })

    async def list_access_tokens(self, request: web.Request) -> web.Response:
        """列出訪問令牌"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        user_id = request.query.get('user_id', admin.get('id') or admin.get('sub'))
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        tokens = manager.list_tokens(user_id)
        
        return success_response(data={"tokens": tokens})

    async def revoke_access_token(self, request: web.Request) -> web.Response:
        """撤銷訪問令牌"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        token_id = request.match_info.get('token_id')
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        success = manager.revoke_token(token_id)
        
        if success:
            return success_response(message="令牌已撤銷")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="撤銷失敗")

    async def query_security_events(self, request: web.Request) -> web.Response:
        """查詢安全事件"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        events = manager.query_events(
            event_type=request.query.get('event_type'),
            user_id=request.query.get('user_id'),
            result=request.query.get('result'),
            hours=int(request.query.get('hours', 24)),
            limit=int(request.query.get('limit', 100))
        )
        
        return success_response(data={"events": events})

    async def get_security_summary(self, request: web.Request) -> web.Response:
        """獲取安全概要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        summary = manager.get_security_summary()
        
        return success_response(data=summary)

    async def rotate_secrets(self, request: web.Request) -> web.Response:
        """輪換密鑰"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .security_enhanced import get_security_manager
        manager = get_security_manager()
        
        count = manager.rotate_secrets(data.get('secret_type'))
        
        return success_response(data={"rotated_count": count}, message=f"已輪換 {count} 個密鑰")

    # ==================== 🆕 P9: 智能根因分析 ====================

    async def create_incident(self, request: web.Request) -> web.Response:
        """創建事件"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .root_cause_analysis import get_rca_analyzer
        analyzer = get_rca_analyzer()
        
        incident_id = analyzer.create_incident(
            title=data['title'],
            symptoms=data.get('symptoms', []),
            description=data.get('description', '')
        )
        
        return success_response(data={"incident_id": incident_id}, message="事件已創建")

    async def list_incidents(self, request: web.Request) -> web.Response:
        """列出事件"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .root_cause_analysis import get_rca_analyzer, IncidentStatus, IncidentSeverity
        analyzer = get_rca_analyzer()
        
        status = request.query.get('status')
        severity = request.query.get('severity')
        
        incidents = analyzer.list_incidents(
            status=IncidentStatus(status) if status else None,
            severity=IncidentSeverity(severity) if severity else None,
            limit=int(request.query.get('limit', 50))
        )
        
        return success_response(data={"incidents": incidents})

    async def get_incident(self, request: web.Request) -> web.Response:
        """獲取事件詳情"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        incident_id = request.match_info.get('incident_id')
        
        from .root_cause_analysis import get_rca_analyzer
        analyzer = get_rca_analyzer()
        
        incident = analyzer.get_incident(incident_id)
        
        if incident:
            return success_response(data=incident)
        else:
            raise AdminError(ErrorCode.RESOURCE_NOT_FOUND, message="事件不存在")

    async def analyze_root_cause(self, request: web.Request) -> web.Response:
        """分析根因"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        incident_id = request.match_info.get('incident_id')
        
        from .root_cause_analysis import get_rca_analyzer
        analyzer = get_rca_analyzer()
        
        result = analyzer.analyze_root_cause(incident_id)
        
        return success_response(data=result)

    async def update_incident_status(self, request: web.Request) -> web.Response:
        """更新事件狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        incident_id = request.match_info.get('incident_id')
        data = await request.json()
        
        from .root_cause_analysis import get_rca_analyzer, IncidentStatus
        analyzer = get_rca_analyzer()
        
        success = analyzer.update_incident_status(
            incident_id=incident_id,
            status=IncidentStatus(data['status']),
            root_cause=data.get('root_cause'),
            recommendations=data.get('recommendations')
        )
        
        if success:
            return success_response(message="狀態已更新")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="更新失敗")

    async def predict_issues(self, request: web.Request) -> web.Response:
        """預測問題"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .root_cause_analysis import get_rca_analyzer
        analyzer = get_rca_analyzer()
        
        predictions = analyzer.predict_issues(data.get('recent_events', []))
        
        return success_response(data={"predictions": predictions})

    async def get_rca_stats(self, request: web.Request) -> web.Response:
        """獲取根因分析統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .root_cause_analysis import get_rca_analyzer
        analyzer = get_rca_analyzer()
        
        stats = analyzer.get_rca_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P9: 服務健康儀表盤 ====================

    async def get_service_dashboard(self, request: web.Request) -> web.Response:
        """獲取服務儀表盤"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        dashboard = manager.get_dashboard_overview()
        
        return success_response(data=dashboard)

    async def list_service_components(self, request: web.Request) -> web.Response:
        """列出服務組件"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        components = manager.list_components()
        
        return success_response(data={"components": components})

    async def update_component_status(self, request: web.Request) -> web.Response:
        """更新組件狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        component_id = request.match_info.get('component_id')
        data = await request.json()
        
        from .service_dashboard import get_dashboard_manager, ServiceStatus
        manager = get_dashboard_manager()
        
        success = manager.update_component_status(
            component_id=component_id,
            status=ServiceStatus(data['status']) if data.get('status') else None,
            uptime_percent=data.get('uptime_percent'),
            response_time_ms=data.get('response_time_ms'),
            error_rate=data.get('error_rate')
        )
        
        if success:
            return success_response(message="組件狀態已更新")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="更新失敗")

    async def get_sla_status(self, request: web.Request) -> web.Response:
        """獲取 SLA 狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        sla = manager.get_sla_status()
        
        return success_response(data={"sla": sla})

    async def create_status_update(self, request: web.Request) -> web.Response:
        """創建狀態更新"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .service_dashboard import get_dashboard_manager, ServiceStatus
        manager = get_dashboard_manager()
        
        update_id = manager.create_status_update(
            title=data['title'],
            message=data['message'],
            status=ServiceStatus(data['status']),
            affected_components=data.get('affected_components')
        )
        
        return success_response(data={"update_id": update_id}, message="狀態更新已創建")

    async def resolve_status_update(self, request: web.Request) -> web.Response:
        """解決狀態更新"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        update_id = request.match_info.get('update_id')
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        success = manager.resolve_status_update(update_id)
        
        if success:
            return success_response(message="狀態已解決")
        else:
            raise AdminError(ErrorCode.OPERATION_FAILED, message="解決失敗")

    async def list_maintenance_windows(self, request: web.Request) -> web.Response:
        """列出維護窗口"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        status = request.query.get('status')
        windows = manager.list_maintenance_windows(status)
        
        return success_response(data={"maintenance_windows": windows})

    async def schedule_maintenance(self, request: web.Request) -> web.Response:
        """計劃維護"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        maintenance_id = manager.schedule_maintenance(
            title=data['title'],
            scheduled_start=data['scheduled_start'],
            scheduled_end=data['scheduled_end'],
            description=data.get('description', ''),
            affected_components=data.get('affected_components')
        )
        
        return success_response(data={"maintenance_id": maintenance_id}, message="維護已計劃")

    async def get_status_page(self, request: web.Request) -> web.Response:
        """獲取公共狀態頁面"""
        # 此端點不需要認證
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        page = manager.generate_status_page()
        
        return success_response(data=page)

    async def get_component_history(self, request: web.Request) -> web.Response:
        """獲取組件歷史"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        component_id = request.match_info.get('component_id')
        
        from .service_dashboard import get_dashboard_manager
        manager = get_dashboard_manager()
        
        hours = int(request.query.get('hours', 24))
        history = manager.get_component_history(component_id, hours)
        
        return success_response(data={"history": history})

    # ==================== 🆕 P10: 智能預測引擎 ====================

    async def predict_usage(self, request: web.Request) -> web.Response:
        """預測使用量"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .ml_prediction import get_ml_engine
        engine = get_ml_engine()
        
        metric_name = request.query.get('metric', 'api_calls')
        periods = int(request.query.get('periods', 24))
        
        result = engine.predict_usage(metric_name, periods)
        
        return success_response(data={
            "prediction": {
                "type": result.prediction_type.value,
                "values": result.predicted_values,
                "timestamps": result.timestamps,
                "confidence": result.confidence,
                "model_info": result.model_info
            }
        })

    async def predict_capacity(self, request: web.Request) -> web.Response:
        """預測容量"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .ml_prediction import get_ml_engine
        engine = get_ml_engine()
        
        result = engine.predict_capacity(
            current_usage=data['current_usage'],
            total_capacity=data['total_capacity'],
            metric_name=data.get('metric_name', 'default')
        )
        
        return success_response(data=result)

    async def analyze_patterns(self, request: web.Request) -> web.Response:
        """分析使用模式"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        metric_name = request.query.get('metric', 'api_calls')
        
        from .ml_prediction import get_ml_engine
        engine = get_ml_engine()
        
        patterns = engine.analyze_patterns(metric_name)
        
        return success_response(data=patterns)

    async def get_adaptive_threshold(self, request: web.Request) -> web.Response:
        """獲取自適應閾值"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        metric_name = request.query.get('metric')
        if not metric_name:
            raise AdminError(ErrorCode.INVALID_PARAMS, message="缺少 metric 參數")
        
        from .ml_prediction import get_ml_engine
        engine = get_ml_engine()
        
        threshold = engine.get_adaptive_threshold(metric_name)
        
        return success_response(data={"threshold": threshold})

    async def get_model_performance(self, request: web.Request) -> web.Response:
        """獲取模型性能"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .ml_prediction import get_ml_engine
        engine = get_ml_engine()
        
        metric_name = request.query.get('metric')
        performance = engine.get_model_performance(metric_name)
        
        return success_response(data=performance)

    # ==================== 🆕 P10: 災備恢復 ====================

    async def create_backup(self, request: web.Request) -> web.Response:
        """創建備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .disaster_recovery import get_dr_manager, BackupType
        manager = get_dr_manager()
        
        backup_id = manager.create_backup(
            source_path=data['source_path'],
            backup_type=BackupType(data.get('backup_type', 'full')),
            compress=data.get('compress', True)
        )
        
        return success_response(data={"backup_id": backup_id}, message="備份已創建")

    async def list_backups(self, request: web.Request) -> web.Response:
        """列出備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .disaster_recovery import get_dr_manager, BackupStatus
        manager = get_dr_manager()
        
        status = request.query.get('status')
        backups = manager.list_backups(
            status=BackupStatus(status) if status else None,
            limit=int(request.query.get('limit', 50))
        )
        
        return success_response(data={"backups": backups})

    async def verify_backup(self, request: web.Request) -> web.Response:
        """驗證備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        backup_id = request.match_info.get('backup_id')
        
        from .disaster_recovery import get_dr_manager
        manager = get_dr_manager()
        
        result = manager.verify_backup(backup_id)
        
        return success_response(data=result)

    async def restore_backup(self, request: web.Request) -> web.Response:
        """恢復備份"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        backup_id = request.match_info.get('backup_id')
        data = await request.json()
        
        from .disaster_recovery import get_dr_manager
        manager = get_dr_manager()
        
        recovery_id = manager.restore_backup(
            backup_id=backup_id,
            target_path=data.get('target_path'),
            verify_first=data.get('verify_first', True)
        )
        
        return success_response(data={"recovery_id": recovery_id}, message="恢復已開始")

    async def get_rpo_status(self, request: web.Request) -> web.Response:
        """獲取 RPO 狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .disaster_recovery import get_dr_manager
        manager = get_dr_manager()
        
        status = manager.get_rpo_status()
        
        return success_response(data=status)

    async def get_dr_stats(self, request: web.Request) -> web.Response:
        """獲取災備統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .disaster_recovery import get_dr_manager
        manager = get_dr_manager()
        
        stats = manager.get_dr_stats()
        
        return success_response(data=stats)

    async def list_recovery_plans(self, request: web.Request) -> web.Response:
        """列出恢復計劃"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .disaster_recovery import get_dr_manager
        manager = get_dr_manager()
        
        plans = manager.list_recovery_plans()
        
        return success_response(data={"plans": plans})

    # ==================== 🆕 P10: 成本優化 ====================

    async def get_cost_summary(self, request: web.Request) -> web.Response:
        """獲取成本摘要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        days = int(request.query.get('days', 30))
        tenant_id = request.query.get('tenant_id')
        
        summary = optimizer.get_cost_summary(tenant_id, days)
        
        return success_response(data=summary)

    async def get_cost_breakdown(self, request: web.Request) -> web.Response:
        """獲取成本分解"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        breakdown = optimizer.get_cost_breakdown(
            tenant_id=request.query.get('tenant_id'),
            group_by=request.query.get('group_by', 'resource_type'),
            days=int(request.query.get('days', 30))
        )
        
        return success_response(data=breakdown)

    async def forecast_cost(self, request: web.Request) -> web.Response:
        """預測成本"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        forecast = optimizer.forecast_cost(
            tenant_id=request.query.get('tenant_id'),
            forecast_days=int(request.query.get('days', 30))
        )
        
        return success_response(data=forecast)

    async def get_budget_status(self, request: web.Request) -> web.Response:
        """獲取預算狀態"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        budgets = optimizer.get_budget_status(
            tenant_id=request.query.get('tenant_id')
        )
        
        return success_response(data={"budgets": budgets})

    async def get_cost_recommendations(self, request: web.Request) -> web.Response:
        """獲取成本優化建議"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        # 先生成建議
        optimizer.generate_recommendations(request.query.get('tenant_id'))
        
        # 列出建議
        recommendations = optimizer.list_recommendations()
        
        return success_response(data={"recommendations": recommendations})

    async def get_cost_stats(self, request: web.Request) -> web.Response:
        """獲取成本統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .cost_optimizer import get_cost_optimizer
        optimizer = get_cost_optimizer()
        
        stats = optimizer.get_cost_stats()
        
        return success_response(data=stats)

    # ==================== 🆕 P10: 性能分析 ====================

    async def get_latency_stats(self, request: web.Request) -> web.Response:
        """獲取延遲統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        stats = analyzer.get_latency_stats(
            endpoint=request.query.get('endpoint'),
            hours=int(request.query.get('hours', 1))
        )
        
        return success_response(data=stats)

    async def get_endpoint_performance(self, request: web.Request) -> web.Response:
        """獲取端點性能"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        endpoint = request.match_info.get('endpoint')
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        performance = analyzer.get_endpoint_performance(endpoint)
        
        return success_response(data=performance)

    async def detect_bottlenecks(self, request: web.Request) -> web.Response:
        """檢測瓶頸"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        bottlenecks = analyzer.detect_bottlenecks()
        
        return success_response(data={"bottlenecks": bottlenecks})

    async def list_bottlenecks(self, request: web.Request) -> web.Response:
        """列出瓶頸"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        bottlenecks = analyzer.list_bottlenecks(
            hours=int(request.query.get('hours', 24))
        )
        
        return success_response(data={"bottlenecks": bottlenecks})

    async def list_regressions(self, request: web.Request) -> web.Response:
        """列出性能回歸"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        regressions = analyzer.list_regressions(
            hours=int(request.query.get('hours', 24))
        )
        
        return success_response(data={"regressions": regressions})

    async def get_performance_summary(self, request: web.Request) -> web.Response:
        """獲取性能摘要"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .performance_analyzer import get_performance_analyzer
        analyzer = get_performance_analyzer()
        
        summary = analyzer.get_performance_summary()
        
        return success_response(data=summary)

    # ==================== 🆕 P10: 報告生成 ====================

    async def generate_daily_report(self, request: web.Request) -> web.Response:
        """生成每日報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .report_generator import get_report_generator
        generator = get_report_generator()
        
        report_id = generator.generate_daily_summary(
            date=data.get('date'),
            tenant_id=data.get('tenant_id', '')
        )
        
        return success_response(data={"report_id": report_id}, message="報告已生成")

    async def generate_weekly_report(self, request: web.Request) -> web.Response:
        """生成每週報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        data = await request.json()
        
        from .report_generator import get_report_generator
        generator = get_report_generator()
        
        report_id = generator.generate_weekly_review(
            week_start=data.get('week_start'),
            tenant_id=data.get('tenant_id', '')
        )
        
        return success_response(data={"report_id": report_id}, message="報告已生成")

    async def get_report(self, request: web.Request) -> web.Response:
        """獲取報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        report_id = request.match_info.get('report_id')
        
        from .report_generator import get_report_generator
        generator = get_report_generator()
        
        report = generator.get_report(report_id)
        
        if report:
            return success_response(data=report)
        else:
            raise AdminError(ErrorCode.RESOURCE_NOT_FOUND, message="報告不存在")

    async def list_reports(self, request: web.Request) -> web.Response:
        """列出報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .report_generator import get_report_generator, ReportType
        generator = get_report_generator()
        
        report_type = request.query.get('type')
        reports = generator.list_reports(
            report_type=ReportType(report_type) if report_type else None,
            tenant_id=request.query.get('tenant_id'),
            limit=int(request.query.get('limit', 50))
        )
        
        return success_response(data={"reports": reports})

    async def export_report(self, request: web.Request) -> web.Response:
        """導出報告"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        report_id = request.match_info.get('report_id')
        format_str = request.query.get('format', 'json')
        
        from .report_generator import get_report_generator, ReportFormat
        generator = get_report_generator()
        
        content = generator.export_report(report_id, ReportFormat(format_str))
        
        if not content:
            raise AdminError(ErrorCode.RESOURCE_NOT_FOUND, message="報告不存在")
        
        # 根據格式設置響應類型
        content_types = {
            'json': 'application/json',
            'html': 'text/html',
            'markdown': 'text/markdown',
            'csv': 'text/csv'
        }
        
        return web.Response(
            text=content,
            content_type=content_types.get(format_str, 'text/plain')
        )

    async def list_report_templates(self, request: web.Request) -> web.Response:
        """列出報告模板"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .report_generator import get_report_generator
        generator = get_report_generator()
        
        templates = generator.list_templates()
        
        return success_response(data={"templates": templates})

    async def get_report_stats(self, request: web.Request) -> web.Response:
        """獲取報告統計"""
        admin = self._verify_token(request)
        if not admin:
            raise AdminError(ErrorCode.AUTH_INVALID_TOKEN, message="無效的認證令牌")
        
        from .report_generator import get_report_generator
        generator = get_report_generator()
        
        stats = generator.get_report_stats()
        
        return success_response(data=stats)


# 全局實例
admin_handlers = AdminHandlers()

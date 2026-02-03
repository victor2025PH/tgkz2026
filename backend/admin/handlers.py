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
        """獲取用戶列表"""
        admin = self._require_auth(request)
        
        conn = self.adapter.get_connection()
        try:
            schema = self.adapter.detect_schema(conn)
            query = self.adapter.get_user_select_query(schema)
            
            # 添加分頁
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 50)), 200)
            offset = (page - 1) * page_size
            
            cursor = conn.cursor()
            
            # 獲取總數
            cursor.execute('SELECT COUNT(*) as count FROM users')
            total = cursor.fetchone()['count']
            
            # 獲取用戶列表
            cursor.execute(f'{query} LIMIT ? OFFSET ?', (page_size, offset))
            users = []
            for row in cursor.fetchall():
                user = self.adapter.normalize_user(row)
                users.append(user.to_dict())
            
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


# 全局實例
admin_handlers = AdminHandlers()

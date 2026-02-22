"""
管理員 API

優化設計：
1. 用戶管理
2. 系統配置
3. 數據統計
4. 安全審計
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from functools import wraps

logger = logging.getLogger(__name__)


def require_admin(func):
    """要求管理員權限"""
    @wraps(func)
    async def wrapper(self, request, *args, **kwargs):
        tenant = request.get('tenant')
        
        if not tenant or not tenant.user_id:
            from aiohttp import web
            return web.json_response({
                'success': False,
                'error': '需要登入'
            }, status=401)
        
        if tenant.role != 'admin':
            from aiohttp import web
            return web.json_response({
                'success': False,
                'error': '需要管理員權限'
            }, status=403)
        
        return await func(self, request, *args, **kwargs)
    
    return wrapper


class AdminService:
    """管理員服務"""
    
    def __init__(self, db_path: str = None):
        if db_path:
            self.db_path = db_path
        else:
            try:
                from config import DATABASE_PATH
                self.db_path = str(DATABASE_PATH)
            except Exception:
                self.db_path = os.environ.get(
                    'DATABASE_PATH',
                    os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
                )
    
    # ==================== 用戶管理 ====================
    
    def _row_to_user_dict(self, row: dict) -> dict:
        """將 users 表的一行轉為管理後台需要的格式（與 auth 同表，掃碼登錄用戶可見）"""
        uid = row.get('user_id') or row.get('id', '')
        return {
            'user_id': uid,
            'id': uid,
            'email': row.get('email') or '',
            'username': row.get('username') or row.get('telegram_username') or '',
            'display_name': row.get('display_name') or row.get('telegram_first_name') or '',
            'subscription_tier': row.get('subscription_tier') or 'free',
            'subscription_expires': row.get('subscription_expires') or '',
            'created_at': row.get('created_at') or '',
            'status': 'active' if row.get('is_active', 1) else 'inactive',
            'auth_provider': row.get('auth_provider') or 'local',
            'telegram_id': row.get('telegram_id') or '',
            'telegram_username': row.get('telegram_username') or '',
        }
    
    async def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        tier: str = None
    ) -> Dict[str, Any]:
        """獲取用戶列表（從 users 表讀取，與 auth 一致，掃碼登錄用戶會出現在後台）"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            # 確保查詢 users 表（掃碼登錄寫入此表）
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            if not cursor.fetchone():
                conn.close()
                return {'users': [], 'total': 0, 'page': page, 'page_size': page_size, 'total_pages': 0}
            
            query = 'SELECT * FROM users WHERE 1=1'
            count_query = 'SELECT COUNT(*) FROM users WHERE 1=1'
            params = []
            if search:
                query += ' AND (email LIKE ? OR username LIKE ? OR display_name LIKE ? OR telegram_username LIKE ?)'
                count_query += ' AND (email LIKE ? OR username LIKE ? OR display_name LIKE ? OR telegram_username LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term, search_term, search_term])
            if status:
                if status == 'active':
                    query += ' AND COALESCE(is_active, 1) = 1'
                    count_query += ' AND COALESCE(is_active, 1) = 1'
                else:
                    query += ' AND COALESCE(is_active, 1) = 0'
                    count_query += ' AND COALESCE(is_active, 1) = 0'
            if tier:
                query += ' AND subscription_tier = ?'
                count_query += ' AND subscription_tier = ?'
                params.append(tier)
            
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]
            offset = (page - 1) * page_size
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            cursor.execute(query, params + [page_size, offset])
            users = [self._row_to_user_dict(dict(row)) for row in cursor.fetchall()]
            conn.close()
            return {
                'users': users,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size if page_size else 0
            }
        except Exception as e:
            logger.error(f"Get users error: {e}")
            return {'users': [], 'total': 0, 'page': page, 'page_size': page_size, 'total_pages': 0}
    
    async def get_user_detail(self, user_id: str) -> Optional[Dict]:
        """獲取用戶詳情（先 user_profiles，再 fallback 到 users，掃碼用戶可見）"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            row = None
            cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="user_profiles"')
            if cursor.fetchone():
                cursor.execute('SELECT * FROM user_profiles WHERE user_id = ?', (user_id,))
                row = cursor.fetchone()
            if not row:
                cursor.execute('SELECT * FROM users WHERE id = ? OR user_id = ?', (user_id, user_id))
                row = cursor.fetchone()
            if not row:
                conn.close()
                return None
            user = dict(row)
            user.pop('password_hash', None)
            if 'id' in user and 'user_id' not in user:
                user['user_id'] = user['id']
            # 訂閱信息（若有 subscriptions 表）
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions'")
            if cursor.fetchone():
                cursor.execute('SELECT * FROM subscriptions WHERE user_id = ?', (user_id,))
                sub_row = cursor.fetchone()
                if sub_row:
                    user['subscription'] = dict(sub_row)
            user.setdefault('accounts_count', 0)
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
            if cursor.fetchone():
                cursor.execute('SELECT COUNT(*) FROM accounts WHERE user_id = ?', (user_id,))
                user['accounts_count'] = cursor.fetchone()[0]
            user.setdefault('recent_logins', [])
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_history'")
            if cursor.fetchone():
                cursor.execute('''
                    SELECT * FROM login_history WHERE user_id = ? AND success = 1 ORDER BY created_at DESC LIMIT 5
                ''', (user_id,))
                user['recent_logins'] = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return user
        except Exception as e:
            logger.error(f"Get user detail error: {e}")
            return None
    
    async def update_user(self, user_id: str, data: Dict) -> Dict[str, Any]:
        """更新用戶信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 允許更新的字段
            allowed_fields = [
                'status', 'subscription_tier', 'max_accounts',
                'max_api_calls', 'role'
            ]
            
            updates = []
            params = []
            
            for field in allowed_fields:
                if field in data:
                    updates.append(f'{field} = ?')
                    params.append(data[field])
            
            if not updates:
                conn.close()
                return {'success': False, 'error': '沒有可更新的字段'}
            
            updates.append('updated_at = ?')
            params.append(datetime.utcnow().isoformat())
            params.append(user_id)
            
            cursor.execute(f'''
                UPDATE user_profiles 
                SET {', '.join(updates)} 
                WHERE user_id = ?
            ''', params)
            
            updated = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            return {'success': updated}
        except Exception as e:
            logger.error(f"Update user error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def suspend_user(self, user_id: str, reason: str = '') -> Dict[str, Any]:
        """暫停用戶"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE user_profiles 
                SET status = 'suspended', updated_at = ? 
                WHERE user_id = ?
            ''', (datetime.utcnow().isoformat(), user_id))
            
            # 記錄操作
            cursor.execute('''
                INSERT INTO admin_logs 
                (id, admin_id, action, target_user, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                '', 'suspend_user', user_id, reason, datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            return {'success': True}
        except Exception as e:
            logger.error(f"Suspend user error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 系統統計 ====================
    
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """獲取儀表板統計"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            stats = {}
            
            # 用戶統計
            cursor.execute('SELECT COUNT(*) FROM user_profiles')
            stats['total_users'] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM user_profiles WHERE status = 'active'")
            stats['active_users'] = cursor.fetchone()[0]
            
            # 今日新用戶
            today = datetime.utcnow().date().isoformat()
            cursor.execute(
                "SELECT COUNT(*) FROM user_profiles WHERE created_at LIKE ?",
                (f'{today}%',)
            )
            stats['new_users_today'] = cursor.fetchone()[0]
            
            # 訂閱統計
            cursor.execute('''
                SELECT subscription_tier, COUNT(*) 
                FROM user_profiles 
                GROUP BY subscription_tier
            ''')
            stats['users_by_tier'] = {row[0]: row[1] for row in cursor.fetchall()}
            
            # 帳號統計
            cursor.execute('SELECT COUNT(*) FROM accounts')
            stats['total_accounts'] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM accounts WHERE status = 'online'")
            stats['online_accounts'] = cursor.fetchone()[0]
            
            # 交易統計
            cursor.execute('''
                SELECT SUM(amount) FROM transactions 
                WHERE status = 'completed' AND created_at LIKE ?
            ''', (f'{today}%',))
            revenue_today = cursor.fetchone()[0]
            stats['revenue_today'] = revenue_today or 0
            
            # 本月收入
            month_start = datetime.utcnow().replace(day=1).date().isoformat()
            cursor.execute('''
                SELECT SUM(amount) FROM transactions 
                WHERE status = 'completed' AND created_at >= ?
            ''', (month_start,))
            revenue_month = cursor.fetchone()[0]
            stats['revenue_month'] = revenue_month or 0
            
            # API 調用統計
            cursor.execute('''
                SELECT SUM(api_calls) FROM usage_stats WHERE date = ?
            ''', (today,))
            api_calls = cursor.fetchone()[0]
            stats['api_calls_today'] = api_calls or 0
            
            conn.close()
            return stats
        except Exception as e:
            logger.error(f"Get dashboard stats error: {e}")
            return {}
    
    async def get_usage_trends(self, days: int = 30) -> List[Dict]:
        """獲取使用趨勢"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            start_date = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
            
            cursor.execute('''
                SELECT date, SUM(api_calls), SUM(messages_sent), COUNT(DISTINCT user_id)
                FROM usage_stats 
                WHERE date >= ?
                GROUP BY date
                ORDER BY date
            ''', (start_date,))
            
            trends = []
            for row in cursor.fetchall():
                trends.append({
                    'date': row[0],
                    'api_calls': row[1] or 0,
                    'messages': row[2] or 0,
                    'active_users': row[3] or 0
                })
            
            conn.close()
            return trends
        except Exception as e:
            logger.error(f"Get usage trends error: {e}")
            return []
    
    # ==================== 安全審計 ====================
    
    async def get_security_overview(self) -> Dict[str, Any]:
        """獲取安全概覽"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            overview = {}
            
            # 未解決告警
            cursor.execute("SELECT COUNT(*) FROM security_alerts WHERE resolved = 0")
            overview['unresolved_alerts'] = cursor.fetchone()[0]
            
            # 按嚴重程度
            cursor.execute('''
                SELECT severity, COUNT(*) FROM security_alerts 
                WHERE resolved = 0 
                GROUP BY severity
            ''')
            overview['alerts_by_severity'] = {row[0]: row[1] for row in cursor.fetchall()}
            
            # 被鎖定帳戶
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "SELECT COUNT(*) FROM account_lockouts WHERE locked_until > ?",
                (now,)
            )
            overview['locked_accounts'] = cursor.fetchone()[0]
            
            # 今日失敗登入
            today = datetime.utcnow().date().isoformat()
            cursor.execute('''
                SELECT COUNT(*) FROM login_history 
                WHERE success = 0 AND created_at LIKE ?
            ''', (f'{today}%',))
            overview['failed_logins_today'] = cursor.fetchone()[0]
            
            # 活躍 IP 規則
            cursor.execute("SELECT COUNT(*) FROM ip_rules")
            overview['active_ip_rules'] = cursor.fetchone()[0]
            
            conn.close()
            return overview
        except Exception as e:
            logger.error(f"Get security overview error: {e}")
            return {}
    
    async def get_audit_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        action: str = None
    ) -> Dict[str, Any]:
        """獲取審計日誌"""
        try:
            # 確保表存在
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_logs (
                    id TEXT PRIMARY KEY,
                    admin_id TEXT,
                    action TEXT,
                    target_user TEXT,
                    reason TEXT,
                    details TEXT,
                    created_at TEXT
                )
            ''')
            conn.commit()
            
            # 查詢
            query = 'SELECT * FROM admin_logs WHERE 1=1'
            count_query = 'SELECT COUNT(*) FROM admin_logs WHERE 1=1'
            params = []
            
            if action:
                query += ' AND action = ?'
                count_query += ' AND action = ?'
                params.append(action)
            
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]
            
            offset = (page - 1) * page_size
            query += f' ORDER BY created_at DESC LIMIT {page_size} OFFSET {offset}'
            
            cursor.execute(query, params)
            logs = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'logs': logs,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        except Exception as e:
            logger.error(f"Get audit logs error: {e}")
            return {'logs': [], 'total': 0, 'page': page, 'page_size': page_size}
    
    # ==================== 系統配置 ====================
    
    async def get_system_config(self) -> Dict[str, Any]:
        """獲取系統配置"""
        # 從統一配置服務獲取等級配置
        try:
            from ..core.level_config import get_level_config_service
            service = get_level_config_service()
            levels = service.get_all_levels()
            
            # 生成 API 限制配置
            api_rate_limits = {}
            level_quotas = {}
            
            for level_config in levels:
                level_name = level_config.level.value
                api_rate_limits[level_name] = level_config.quotas.ai_calls
                level_quotas[level_name] = level_config.quotas.to_dict()
            
            return {
                'max_login_attempts': 5,
                'lockout_duration': 30,
                'default_subscription': 'bronze',
                'api_rate_limits': api_rate_limits,
                'level_quotas': level_quotas,
                'features': {
                    'registration_enabled': True,
                    'email_verification_required': False,
                    '2fa_required': False
                }
            }
        except Exception as e:
            logger.warning(f"Failed to load level config: {e}")
            # Fallback
            return {
                'max_login_attempts': 5,
                'lockout_duration': 30,
                'default_subscription': 'free',
                'api_rate_limits': {
                    'free': 100,
                    'basic': 1000,
                    'pro': 10000,
                    'enterprise': -1
                },
                'features': {
                    'registration_enabled': True,
                    'email_verification_required': False,
                    '2fa_required': False
                }
            }
    
    async def update_system_config(self, config: Dict) -> Dict[str, Any]:
        """更新系統配置"""
        # 實現配置更新邏輯
        return {'success': True}
    
    # ==================== 等級與配額管理 ====================
    
    async def get_all_levels(self) -> Dict[str, Any]:
        """獲取所有會員等級配置"""
        try:
            from ..core.level_config import get_level_config_service
            service = get_level_config_service()
            levels = service.get_all_levels()
            
            return {
                'success': True,
                'data': {
                    'levels': [level.to_dict() for level in levels],
                    'quota_types': [
                        {'id': 'tg_accounts', 'name': 'TG 帳號', 'daily_reset': False},
                        {'id': 'daily_messages', 'name': '每日消息', 'daily_reset': True},
                        {'id': 'ai_calls', 'name': 'AI 調用', 'daily_reset': True},
                        {'id': 'devices', 'name': '設備數', 'daily_reset': False},
                        {'id': 'groups', 'name': '群組數', 'daily_reset': False},
                        {'id': 'keyword_sets', 'name': '關鍵詞集', 'daily_reset': False},
                        {'id': 'auto_reply_rules', 'name': '自動回覆', 'daily_reset': False},
                        {'id': 'scheduled_tasks', 'name': '定時任務', 'daily_reset': False},
                        {'id': 'data_retention_days', 'name': '數據保留天數', 'daily_reset': False},
                    ]
                }
            }
        except Exception as e:
            logger.error(f"Get all levels error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_quota_usage(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶配額使用情況"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 獲取用戶等級
            cursor.execute('''
                SELECT subscription_tier, max_accounts, max_api_calls 
                FROM user_profiles WHERE user_id = ?
            ''', (user_id,))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {'success': False, 'error': '用戶不存在'}
            
            user_tier = row['subscription_tier'] or 'bronze'
            
            # 獲取配額限制
            from ..core.level_config import get_level_config_service, MembershipLevel
            service = get_level_config_service()
            level = MembershipLevel.from_string(user_tier)
            config = service.get_level_config(level)
            
            if not config:
                conn.close()
                return {'success': False, 'error': '等級配置不存在'}
            
            # 統計使用量
            # TG 帳號數
            cursor.execute('SELECT COUNT(*) FROM accounts WHERE user_id = ?', (user_id,))
            accounts_used = cursor.fetchone()[0]
            
            # 今日消息數
            today = datetime.utcnow().date().isoformat()
            cursor.execute('''
                SELECT SUM(messages_sent) FROM usage_stats 
                WHERE user_id = ? AND date = ?
            ''', (user_id, today))
            messages_today = cursor.fetchone()[0] or 0
            
            # 今日 AI 調用
            cursor.execute('''
                SELECT SUM(ai_calls) FROM usage_stats 
                WHERE user_id = ? AND date = ?
            ''', (user_id, today))
            ai_calls_today = cursor.fetchone()[0] or 0
            
            # 群組數
            cursor.execute('''
                SELECT COUNT(*) FROM monitored_groups 
                WHERE owner_user_id = ?
            ''', (user_id,))
            groups_used = cursor.fetchone()[0]
            
            conn.close()
            
            # 構建使用情況
            quotas = config.quotas
            usage = {
                'tg_accounts': {
                    'limit': quotas.tg_accounts,
                    'used': accounts_used,
                    'unlimited': quotas.tg_accounts == -1
                },
                'daily_messages': {
                    'limit': quotas.daily_messages,
                    'used': messages_today,
                    'unlimited': quotas.daily_messages == -1
                },
                'ai_calls': {
                    'limit': quotas.ai_calls,
                    'used': ai_calls_today,
                    'unlimited': quotas.ai_calls == -1
                },
                'groups': {
                    'limit': quotas.groups,
                    'used': groups_used,
                    'unlimited': quotas.groups == -1
                }
            }
            
            return {
                'success': True,
                'data': {
                    'user_id': user_id,
                    'tier': user_tier,
                    'tier_name': config.name,
                    'tier_icon': config.icon,
                    'usage': usage
                }
            }
        except Exception as e:
            logger.error(f"Get user quota usage error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def adjust_user_quota(
        self, 
        user_id: str, 
        quota_type: str, 
        new_value: int,
        admin_id: str = None,
        reason: str = ''
    ) -> Dict[str, Any]:
        """調整用戶配額（管理員操作）"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 確保 custom_quotas 表存在
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_custom_quotas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    quota_type TEXT NOT NULL,
                    custom_value INTEGER NOT NULL,
                    original_value INTEGER,
                    adjusted_by TEXT,
                    reason TEXT,
                    created_at TEXT,
                    expires_at TEXT,
                    UNIQUE(user_id, quota_type)
                )
            ''')
            
            # 插入或更新自定義配額
            cursor.execute('''
                INSERT OR REPLACE INTO user_custom_quotas 
                (user_id, quota_type, custom_value, adjusted_by, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id, quota_type, new_value, 
                admin_id, reason, datetime.utcnow().isoformat()
            ))
            
            # 記錄操作日誌
            cursor.execute('''
                INSERT INTO admin_logs 
                (id, admin_id, action, target_user, reason, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                admin_id, 'adjust_quota', user_id, reason,
                f'{quota_type}={new_value}',
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Admin {admin_id} adjusted {quota_type}={new_value} for user {user_id}")
            
            return {'success': True, 'message': '配額已調整'}
        except Exception as e:
            logger.error(f"Adjust user quota error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 配額監控（管理員）====================
    
    async def get_quota_overview(self) -> Dict[str, Any]:
        """獲取配額使用總覽"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            today = datetime.now().date().isoformat()
            yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
            week_ago = (datetime.now().date() - timedelta(days=7)).isoformat()
            
            overview = {
                'total_users': 0,
                'active_today': 0,
                'by_tier': {},
                'quotas': {},
                'alerts': {
                    'total': 0,
                    'critical': 0,
                    'warning': 0,
                    'exceeded': 0
                },
                'trends': {}
            }
            
            # 用戶統計
            try:
                cursor.execute('SELECT COUNT(*) FROM users')
                overview['total_users'] = cursor.fetchone()[0]
                
                cursor.execute('''
                    SELECT COUNT(DISTINCT user_id) FROM quota_usage 
                    WHERE date = ?
                ''', (today,))
                overview['active_today'] = cursor.fetchone()[0]
                
                # 按等級分布
                cursor.execute('''
                    SELECT subscription_tier, COUNT(*) as count 
                    FROM users 
                    GROUP BY subscription_tier
                ''')
                for row in cursor.fetchall():
                    overview['by_tier'][row['subscription_tier'] or 'bronze'] = row['count']
            except sqlite3.OperationalError:
                pass
            
            # 配額使用統計
            quota_types = ['daily_messages', 'ai_calls', 'tg_accounts', 'groups']
            for qt in quota_types:
                overview['quotas'][qt] = {
                    'total_used': 0,
                    'today_used': 0,
                    'avg_per_user': 0,
                    'max_used': 0,
                    'users_exceeded': 0
                }
                
                try:
                    # 今日總使用量
                    cursor.execute('''
                        SELECT SUM(used) as total, MAX(used) as max_used, AVG(used) as avg
                        FROM quota_usage 
                        WHERE quota_type = ? AND date = ?
                    ''', (qt, today))
                    row = cursor.fetchone()
                    if row:
                        overview['quotas'][qt]['today_used'] = row['total'] or 0
                        overview['quotas'][qt]['max_used'] = row['max_used'] or 0
                        overview['quotas'][qt]['avg_per_user'] = round(row['avg'] or 0, 1)
                except sqlite3.OperationalError:
                    pass
            
            # 告警統計
            try:
                cursor.execute('''
                    SELECT alert_type, COUNT(*) as count 
                    FROM quota_alerts_v2 
                    WHERE created_at >= ? AND acknowledged = 0
                    GROUP BY alert_type
                ''', (week_ago,))
                for row in cursor.fetchall():
                    alert_type = row['alert_type']
                    count = row['count']
                    overview['alerts']['total'] += count
                    if alert_type in overview['alerts']:
                        overview['alerts'][alert_type] = count
            except sqlite3.OperationalError:
                pass
            
            # 7 天趨勢
            for qt in ['daily_messages', 'ai_calls']:
                overview['trends'][qt] = []
                try:
                    cursor.execute('''
                        SELECT date, SUM(used) as total
                        FROM quota_usage 
                        WHERE quota_type = ? AND date >= ?
                        GROUP BY date
                        ORDER BY date
                    ''', (qt, week_ago))
                    for row in cursor.fetchall():
                        overview['trends'][qt].append({
                            'date': row['date'],
                            'value': row['total'] or 0
                        })
                except sqlite3.OperationalError:
                    pass
            
            conn.close()
            return {'success': True, 'data': overview}
            
        except Exception as e:
            logger.error(f"Get quota overview error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_quota_rankings(
        self, 
        quota_type: str = 'daily_messages',
        period: str = 'today',
        limit: int = 20
    ) -> Dict[str, Any]:
        """獲取配額使用排行"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 確定日期範圍
            today = datetime.now().date()
            if period == 'today':
                start_date = today.isoformat()
            elif period == 'week':
                start_date = (today - timedelta(days=7)).isoformat()
            elif period == 'month':
                start_date = (today - timedelta(days=30)).isoformat()
            else:
                start_date = today.isoformat()
            
            rankings = []
            
            try:
                cursor.execute('''
                    SELECT 
                        q.user_id,
                        u.email,
                        u.username,
                        u.subscription_tier,
                        SUM(q.used) as total_used,
                        COUNT(DISTINCT q.date) as active_days
                    FROM quota_usage q
                    LEFT JOIN users u ON q.user_id = u.id
                    WHERE q.quota_type = ? AND q.date >= ?
                    GROUP BY q.user_id
                    ORDER BY total_used DESC
                    LIMIT ?
                ''', (quota_type, start_date, limit))
                
                for rank, row in enumerate(cursor.fetchall(), 1):
                    rankings.append({
                        'rank': rank,
                        'user_id': row['user_id'],
                        'email': row['email'] or 'N/A',
                        'username': row['username'] or 'N/A',
                        'tier': row['subscription_tier'] or 'bronze',
                        'total_used': row['total_used'],
                        'active_days': row['active_days'],
                        'daily_avg': round(row['total_used'] / max(row['active_days'], 1), 1)
                    })
            except sqlite3.OperationalError as e:
                logger.warning(f"Quota rankings query error: {e}")
            
            conn.close()
            
            return {
                'success': True,
                'data': {
                    'quota_type': quota_type,
                    'period': period,
                    'rankings': rankings
                }
            }
            
        except Exception as e:
            logger.error(f"Get quota rankings error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_quota_alerts_admin(
        self,
        page: int = 1,
        page_size: int = 50,
        alert_type: str = None,
        acknowledged: bool = None
    ) -> Dict[str, Any]:
        """獲取所有用戶的配額告警（管理員）"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            alerts = []
            total = 0
            
            try:
                # 構建查詢
                query = '''
                    SELECT 
                        a.*,
                        u.email,
                        u.username,
                        u.subscription_tier
                    FROM quota_alerts_v2 a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE 1=1
                '''
                count_query = 'SELECT COUNT(*) FROM quota_alerts_v2 WHERE 1=1'
                params = []
                
                if alert_type:
                    query += ' AND a.alert_type = ?'
                    count_query += ' AND alert_type = ?'
                    params.append(alert_type)
                
                if acknowledged is not None:
                    query += ' AND a.acknowledged = ?'
                    count_query += ' AND acknowledged = ?'
                    params.append(1 if acknowledged else 0)
                
                # 總數
                cursor.execute(count_query, params)
                total = cursor.fetchone()[0]
                
                # 分頁
                offset = (page - 1) * page_size
                query += f' ORDER BY a.created_at DESC LIMIT {page_size} OFFSET {offset}'
                
                cursor.execute(query, params)
                
                for row in cursor.fetchall():
                    alerts.append({
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'email': row['email'] or 'N/A',
                        'username': row['username'] or 'N/A',
                        'tier': row['subscription_tier'] or 'bronze',
                        'alert_type': row['alert_type'],
                        'quota_type': row['quota_type'],
                        'message': row['message'],
                        'percentage': row['percentage'],
                        'acknowledged': bool(row['acknowledged']),
                        'created_at': row['created_at']
                    })
            except sqlite3.OperationalError as e:
                logger.warning(f"Quota alerts query error: {e}")
            
            conn.close()
            
            return {
                'success': True,
                'data': {
                    'alerts': alerts,
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total + page_size - 1) // page_size
                }
            }
            
        except Exception as e:
            logger.error(f"Get quota alerts admin error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def batch_adjust_quotas(
        self,
        user_ids: List[str],
        quota_type: str,
        new_value: int,
        admin_id: str = None,
        reason: str = ''
    ) -> Dict[str, Any]:
        """批量調整用戶配額"""
        try:
            success_count = 0
            failed = []
            
            for user_id in user_ids:
                result = await self.adjust_user_quota(
                    user_id, quota_type, new_value, admin_id, reason
                )
                if result['success']:
                    success_count += 1
                else:
                    failed.append({'user_id': user_id, 'error': result.get('error')})
            
            return {
                'success': True,
                'data': {
                    'total': len(user_ids),
                    'success': success_count,
                    'failed': len(failed),
                    'failed_details': failed
                }
            }
            
        except Exception as e:
            logger.error(f"Batch adjust quotas error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def export_quota_report(
        self,
        start_date: str = None,
        end_date: str = None,
        quota_types: List[str] = None,
        format: str = 'json'
    ) -> Dict[str, Any]:
        """導出配額使用報表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 默認時間範圍
            if not end_date:
                end_date = datetime.now().date().isoformat()
            if not start_date:
                start_date = (datetime.now().date() - timedelta(days=30)).isoformat()
            
            if not quota_types:
                quota_types = ['daily_messages', 'ai_calls', 'tg_accounts', 'groups']
            
            report_data = {
                'generated_at': datetime.utcnow().isoformat(),
                'period': {'start': start_date, 'end': end_date},
                'summary': {},
                'daily': [],
                'by_user': [],
                'by_tier': {}
            }
            
            try:
                # 總覽統計
                for qt in quota_types:
                    cursor.execute('''
                        SELECT 
                            SUM(used) as total,
                            AVG(used) as avg,
                            MAX(used) as max,
                            COUNT(DISTINCT user_id) as users
                        FROM quota_usage 
                        WHERE quota_type = ? AND date BETWEEN ? AND ?
                    ''', (qt, start_date, end_date))
                    row = cursor.fetchone()
                    report_data['summary'][qt] = {
                        'total': row['total'] or 0,
                        'avg_per_day': round(row['avg'] or 0, 1),
                        'max_single_day': row['max'] or 0,
                        'unique_users': row['users'] or 0
                    }
                
                # 每日統計
                cursor.execute('''
                    SELECT 
                        date,
                        quota_type,
                        SUM(used) as total,
                        COUNT(DISTINCT user_id) as users
                    FROM quota_usage 
                    WHERE date BETWEEN ? AND ? AND quota_type IN ({})
                    GROUP BY date, quota_type
                    ORDER BY date
                '''.format(','.join('?' * len(quota_types))),
                (start_date, end_date, *quota_types))
                
                daily_data = {}
                for row in cursor.fetchall():
                    date = row['date']
                    if date not in daily_data:
                        daily_data[date] = {'date': date}
                    daily_data[date][row['quota_type']] = {
                        'total': row['total'],
                        'users': row['users']
                    }
                report_data['daily'] = list(daily_data.values())
                
                # 按用戶統計（Top 100）
                cursor.execute('''
                    SELECT 
                        q.user_id,
                        u.email,
                        u.subscription_tier,
                        SUM(q.used) as total_used
                    FROM quota_usage q
                    LEFT JOIN users u ON q.user_id = u.id
                    WHERE q.date BETWEEN ? AND ?
                    GROUP BY q.user_id
                    ORDER BY total_used DESC
                    LIMIT 100
                ''', (start_date, end_date))
                
                for row in cursor.fetchall():
                    report_data['by_user'].append({
                        'user_id': row['user_id'],
                        'email': row['email'] or 'N/A',
                        'tier': row['subscription_tier'] or 'bronze',
                        'total_used': row['total_used']
                    })
                
                # 按等級統計
                cursor.execute('''
                    SELECT 
                        COALESCE(u.subscription_tier, 'bronze') as tier,
                        q.quota_type,
                        SUM(q.used) as total,
                        COUNT(DISTINCT q.user_id) as users
                    FROM quota_usage q
                    LEFT JOIN users u ON q.user_id = u.id
                    WHERE q.date BETWEEN ? AND ?
                    GROUP BY tier, q.quota_type
                ''', (start_date, end_date))
                
                for row in cursor.fetchall():
                    tier = row['tier']
                    if tier not in report_data['by_tier']:
                        report_data['by_tier'][tier] = {}
                    report_data['by_tier'][tier][row['quota_type']] = {
                        'total': row['total'],
                        'users': row['users']
                    }
                    
            except sqlite3.OperationalError as e:
                logger.warning(f"Export report query error: {e}")
            
            conn.close()
            
            return {
                'success': True,
                'data': report_data,
                'format': format
            }
            
        except Exception as e:
            logger.error(f"Export quota report error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def reset_daily_quotas(self, admin_id: str = None) -> Dict[str, Any]:
        """手動重置每日配額（管理員操作）"""
        try:
            from ..core.quota_service import get_quota_service
            service = get_quota_service()
            
            result = service.reset_daily_quotas()
            
            # 記錄操作日誌
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO admin_logs (id, admin_id, action, target_type, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                admin_id, 'reset_daily_quotas', 'system',
                f"Reset count: {result.get('reset_count', 0)}",
                datetime.utcnow().isoformat()
            ))
            conn.commit()
            conn.close()
            
            logger.info(f"Admin {admin_id} triggered daily quota reset")
            
            return {
                'success': True,
                'data': result,
                'message': '每日配額已重置'
            }
            
        except Exception as e:
            logger.error(f"Reset daily quotas error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 計費管理 ====================
    
    async def get_billing_overview(self) -> Dict[str, Any]:
        """獲取計費總覽"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 總收入
            cursor.execute('''
                SELECT COALESCE(SUM(amount), 0) as total
                FROM billing_items
                WHERE status = 'paid' AND amount > 0
            ''')
            total_revenue = cursor.fetchone()['total']
            
            # 本月收入
            cursor.execute('''
                SELECT COALESCE(SUM(amount), 0) as total
                FROM billing_items
                WHERE status = 'paid' AND amount > 0
                  AND created_at >= date('now', 'start of month')
            ''')
            monthly_revenue = cursor.fetchone()['total']
            
            # 待支付賬單
            cursor.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
                FROM billing_items
                WHERE status = 'pending'
            ''')
            pending = cursor.fetchone()
            
            # 活躍配額包
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM user_quota_packages
                WHERE is_active = 1 AND expires_at > datetime('now')
            ''')
            active_packs = cursor.fetchone()['count']
            
            # 退款統計
            cursor.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(ABS(amount)), 0) as total
                FROM billing_items
                WHERE billing_type = 'refund'
            ''')
            refunds = cursor.fetchone()
            
            # 各類型收入分佈
            cursor.execute('''
                SELECT billing_type, COALESCE(SUM(amount), 0) as total
                FROM billing_items
                WHERE status = 'paid' AND amount > 0
                GROUP BY billing_type
            ''')
            by_type = {row['billing_type']: row['total'] for row in cursor.fetchall()}
            
            conn.close()
            
            return {
                'success': True,
                'data': {
                    'total_revenue': total_revenue,
                    'monthly_revenue': monthly_revenue,
                    'pending_bills': {
                        'count': pending['count'],
                        'total': pending['total']
                    },
                    'active_packs': active_packs,
                    'refunds': {
                        'count': refunds['count'],
                        'total': refunds['total']
                    },
                    'revenue_by_type': by_type
                }
            }
            
        except Exception as e:
            logger.error(f"Get billing overview error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_all_bills(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str = None,
        billing_type: str = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """獲取所有賬單"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            where_clauses = ['1=1']
            params = []
            
            if status:
                where_clauses.append('status = ?')
                params.append(status)
            
            if billing_type:
                where_clauses.append('billing_type = ?')
                params.append(billing_type)
            
            if user_id:
                where_clauses.append('user_id = ?')
                params.append(user_id)
            
            where_sql = ' AND '.join(where_clauses)
            
            # 總數
            cursor.execute(f'SELECT COUNT(*) as total FROM billing_items WHERE {where_sql}', params)
            total = cursor.fetchone()['total']
            
            # 分頁數據
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT b.*, u.email as user_email
                FROM billing_items b
                LEFT JOIN users u ON b.user_id = u.id
                WHERE {where_sql}
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            bills = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return {
                'success': True,
                'data': {
                    'bills': bills,
                    'total': total,
                    'page': page,
                    'page_size': page_size
                }
            }
            
        except Exception as e:
            logger.error(f"Get all bills error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def process_refund(
        self,
        bill_id: str,
        refund_amount: int,
        reason: str,
        admin_id: str = None
    ) -> Dict[str, Any]:
        """處理退款"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 獲取原賬單
            cursor.execute('SELECT * FROM billing_items WHERE id = ?', (bill_id,))
            original = cursor.fetchone()
            
            if not original:
                conn.close()
                return {'success': False, 'error': '賬單不存在'}
            
            if original['status'] != 'paid':
                conn.close()
                return {'success': False, 'error': '只能對已支付賬單進行退款'}
            
            if refund_amount > original['amount']:
                conn.close()
                return {'success': False, 'error': '退款金額超過原賬單金額'}
            
            conn.close()
            
            from ..core.billing_service import get_billing_service
            billing = get_billing_service()
            
            result = billing.process_refund(
                original['user_id'],
                bill_id,
                refund_amount,
                reason
            )
            
            # 記錄管理員操作
            if result.get('success') and admin_id:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                    admin_id, 'process_refund', 'billing', bill_id,
                    f"Refund amount: {refund_amount}, Reason: {reason}",
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                conn.close()
            
            return result
            
        except Exception as e:
            logger.error(f"Process refund error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def freeze_user_quota(
        self,
        user_id: str,
        reason: str,
        duration_hours: int = 24,
        admin_id: str = None
    ) -> Dict[str, Any]:
        """凍結用戶配額"""
        try:
            from ..core.billing_service import get_billing_service
            billing = get_billing_service()
            
            success = billing.freeze_quota(
                user_id,
                freeze_type='admin',
                reason=reason,
                duration_hours=duration_hours
            )
            
            if success and admin_id:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                    admin_id, 'freeze_quota', 'user', user_id,
                    f"Duration: {duration_hours}h, Reason: {reason}",
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                conn.close()
            
            return {
                'success': success,
                'message': '用戶配額已凍結' if success else '凍結失敗'
            }
            
        except Exception as e:
            logger.error(f"Freeze user quota error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def unfreeze_user_quota(self, user_id: str, admin_id: str = None) -> Dict[str, Any]:
        """解凍用戶配額"""
        try:
            from ..core.billing_service import get_billing_service
            billing = get_billing_service()
            
            success = billing.unfreeze_quota(user_id)
            
            if success and admin_id:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    f"log_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                    admin_id, 'unfreeze_quota', 'user', user_id,
                    'Quota unfrozen',
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                conn.close()
            
            return {
                'success': success,
                'message': '用戶配額已解凍' if success else '解凍失敗'
            }
            
        except Exception as e:
            logger.error(f"Unfreeze user quota error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_frozen_users(self) -> Dict[str, Any]:
        """獲取被凍結的用戶列表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT f.*, u.email as user_email
                FROM quota_freezes f
                LEFT JOIN users u ON f.user_id = u.id
                WHERE f.is_active = 1 AND f.unfreeze_at > datetime('now')
                ORDER BY f.frozen_at DESC
            ''')
            
            frozen_users = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return {
                'success': True,
                'data': frozen_users
            }
            
        except Exception as e:
            logger.error(f"Get frozen users error: {e}")
            return {'success': False, 'error': str(e)}


# ==================== 單例訪問 ====================

_admin_service: Optional[AdminService] = None


def get_admin_service() -> AdminService:
    global _admin_service
    if _admin_service is None:
        _admin_service = AdminService()
    return _admin_service

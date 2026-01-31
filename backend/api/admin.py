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
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
    
    # ==================== 用戶管理 ====================
    
    async def get_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str = None,
        status: str = None,
        tier: str = None
    ) -> Dict[str, Any]:
        """獲取用戶列表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 構建查詢
            query = 'SELECT * FROM user_profiles WHERE 1=1'
            count_query = 'SELECT COUNT(*) FROM user_profiles WHERE 1=1'
            params = []
            
            if search:
                query += ' AND (email LIKE ? OR username LIKE ?)'
                count_query += ' AND (email LIKE ? OR username LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term])
            
            if status:
                query += ' AND status = ?'
                count_query += ' AND status = ?'
                params.append(status)
            
            if tier:
                query += ' AND subscription_tier = ?'
                count_query += ' AND subscription_tier = ?'
                params.append(tier)
            
            # 獲取總數
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]
            
            # 分頁
            offset = (page - 1) * page_size
            query += f' ORDER BY created_at DESC LIMIT {page_size} OFFSET {offset}'
            
            cursor.execute(query, params)
            
            users = []
            for row in cursor.fetchall():
                user = dict(row)
                # 移除敏感字段
                user.pop('password_hash', None)
                users.append(user)
            
            conn.close()
            
            return {
                'users': users,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        except Exception as e:
            logger.error(f"Get users error: {e}")
            return {'users': [], 'total': 0, 'page': page, 'page_size': page_size}
    
    async def get_user_detail(self, user_id: str) -> Optional[Dict]:
        """獲取用戶詳情"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 用戶基本信息
            cursor.execute('SELECT * FROM user_profiles WHERE user_id = ?', (user_id,))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return None
            
            user = dict(row)
            user.pop('password_hash', None)
            
            # 訂閱信息
            cursor.execute('SELECT * FROM subscriptions WHERE user_id = ?', (user_id,))
            sub_row = cursor.fetchone()
            if sub_row:
                user['subscription'] = dict(sub_row)
            
            # 帳號數量
            cursor.execute('SELECT COUNT(*) FROM accounts WHERE user_id = ?', (user_id,))
            user['accounts_count'] = cursor.fetchone()[0]
            
            # 最近登入
            cursor.execute('''
                SELECT * FROM login_history 
                WHERE user_id = ? AND success = 1 
                ORDER BY created_at DESC LIMIT 5
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


# ==================== 單例訪問 ====================

_admin_service: Optional[AdminService] = None


def get_admin_service() -> AdminService:
    global _admin_service
    if _admin_service is None:
        _admin_service = AdminService()
    return _admin_service

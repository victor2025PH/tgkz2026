"""
Phase 9-2: Users, licenses, referrals, stats, admin, settings, AI settings, knowledge, conversation effectiveness, API logs, IP history
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional, Tuple
import sys
import secrets
import sqlite3
from datetime import datetime, timedelta


def _get_membership_levels():
    """延遲導入避免與 database.py 循環依賴"""
    from database import MEMBERSHIP_LEVELS
    return MEMBERSHIP_LEVELS

def _get_referral_rewards():
    """延遲導入避免與 database.py 循環依賴"""
    from database import REFERRAL_REWARDS
    return REFERRAL_REWARDS


class UserAdminMixin:
    """Users, licenses, referrals, stats, admin, settings, AI settings, knowledge, conversation effectiveness, API logs, IP history"""

    # ============ 用戶操作 ============
    
    def create_user(self, user_id: str = None, email: str = None, machine_id: str = None,
                   invited_by: str = None, **kwargs) -> Optional[Dict]:
        """創建用戶"""
        if not user_id:
            user_id = f"U{secrets.token_hex(8).upper()}"
        
        invite_code = f"TG{secrets.token_hex(4).upper()}"
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (user_id, email, machine_id, invite_code, invited_by, nickname)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, email, machine_id, invite_code, invited_by, kwargs.get('nickname')))
            
            conn.commit()
            
            # 如果有邀請人，記錄邀請獎勵
            if invited_by:
                self._process_referral_registration(invited_by, user_id, invite_code)
            
            cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
            user = dict(cursor.fetchone())
            conn.close()
            return user
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    def get_user(self, user_id: str = None, email: str = None, machine_id: str = None,
                invite_code: str = None) -> Optional[Dict]:
        """獲取用戶"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        elif email:
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        elif machine_id:
            cursor.execute('SELECT * FROM users WHERE machine_id = ?', (machine_id,))
        elif invite_code:
            cursor.execute('SELECT * FROM users WHERE invite_code = ?', (invite_code,))
        else:
            conn.close()
            return None
        
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def update_user(self, user_id: str, **kwargs) -> bool:
        """更新用戶信息"""
        if not kwargs:
            return False
        
        allowed_fields = ['email', 'phone', 'nickname', 'avatar', 'machine_id',
                         'membership_level', 'expires_at', 'is_lifetime', 'status',
                         'is_banned', 'ban_reason', 'balance', 'last_login_at', 'last_active_at']
        
        updates = []
        values = []
        for key, value in kwargs.items():
            if key in allowed_fields:
                updates.append(f"{key} = ?")
                values.append(value)
        
        if not updates:
            return False
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(f'''
            UPDATE users SET {', '.join(updates)} WHERE user_id = ?
        ''', values)
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    def get_users(self, level: str = None, status: str = None, 
                 limit: int = 500, offset: int = 0) -> List[Dict]:
        """獲取用戶列表"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT u.*, 
                (SELECT COUNT(*) FROM referrals r WHERE r.inviter_id = u.user_id) as referral_count
            FROM users u 
            WHERE 1=1
        '''
        params = []
        
        if level:
            query += ' AND u.membership_level = ?'
            params.append(level)
        
        if status:
            query += ' AND u.status = ?'
            params.append(status)
        
        query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return users
    
    # ============ 卡密操作 ============
    
    def create_license(self, level: str, duration_type: str, price: float = None,
                      batch_id: str = None, notes: str = None, created_by: str = 'system') -> Optional[str]:
        """創建卡密"""
        # 時長映射
        duration_map = {'week': 7, 'month': 30, 'quarter': 90, 'year': 365, 'lifetime': 36500}
        duration_days = duration_map.get(duration_type, 30)
        
        # 等級代碼映射
        level_codes = {'silver': 'B', 'gold': 'G', 'diamond': 'D', 'star': 'S', 'king': 'K'}
        duration_codes = {'week': '1', 'month': '2', 'quarter': '3', 'year': 'Y', 'lifetime': 'L'}
        
        type_code = f"{level_codes.get(level, 'G')}{duration_codes.get(duration_type, '2')}"
        
        # 生成卡密
        license_key = f"TGAI-{type_code}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
        
        # 價格
        if price is None:
            price = _get_membership_levels().get(level, {}).get('prices', {}).get(duration_type, 0)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO licenses (license_key, type_code, level, duration_type, duration_days, price, batch_id, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (license_key, type_code, level, duration_type, duration_days, price, batch_id, notes, created_by))
            conn.commit()
            conn.close()
            return license_key
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    def generate_licenses(self, level: str, duration_type: str, count: int,
                         price: float = None, notes: str = None, 
                         created_by: str = 'admin') -> List[str]:
        """批量生成卡密"""
        batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
        
        keys = []
        for _ in range(count):
            key = self.create_license(level, duration_type, price, batch_id, notes, created_by)
            if key:
                keys.append(key)
        
        return keys
    
    def validate_license(self, license_key: str) -> Tuple[bool, str, Optional[Dict]]:
        """驗證卡密"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM licenses WHERE license_key = ?', (license_key.upper(),))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return False, "卡密不存在", None
        
        license_data = dict(row)
        
        if license_data['status'] == 'used':
            return False, "卡密已被使用", license_data
        
        if license_data['status'] == 'disabled':
            return False, "卡密已被禁用", license_data
        
        if license_data['status'] == 'expired':
            return False, "卡密已過期", license_data
        
        return True, "卡密有效", license_data
    
    def activate_license(self, license_key: str, user_id: str = None, machine_id: str = None,
                        device_id: str = None, ip_address: str = None) -> Tuple[bool, str, Optional[Dict]]:
        """激活卡密"""
        valid, message, license_data = self.validate_license(license_key)
        
        if not valid:
            return False, message, license_data
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        now = datetime.now()
        duration_days = license_data['duration_days']
        expires_at = now + timedelta(days=duration_days)
        
        # 如果是終身，設置很久以後的時間
        if license_data['duration_type'] == 'lifetime':
            expires_at = now + timedelta(days=36500)
        
        # 獲取或創建用戶
        if not user_id and machine_id:
            cursor.execute('SELECT user_id FROM users WHERE machine_id = ?', (machine_id,))
            user_row = cursor.fetchone()
            if user_row:
                user_id = user_row['user_id']
            else:
                # 創建新用戶
                user_id = f"U{secrets.token_hex(8).upper()}"
                invite_code = f"TG{secrets.token_hex(4).upper()}"
                cursor.execute('''
                    INSERT INTO users (id, user_id, machine_id, invite_code, membership_level, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, user_id, machine_id, invite_code, license_data['level'], expires_at.isoformat()))
        
        # 更新卡密狀態
        cursor.execute('''
            UPDATE licenses SET 
                status = 'used',
                used_by = ?,
                used_at = ?,
                machine_id = ?,
                activated_at = ?,
                expires_at = ?
            WHERE license_key = ?
        ''', (user_id, now.isoformat(), machine_id, now.isoformat(), expires_at.isoformat(), license_key))
        
        # 更新用戶會員等級和過期時間
        level_order = _get_membership_levels().get(license_data['level'], {}).get('order', 0)
        
        cursor.execute('SELECT membership_level, expires_at FROM users WHERE user_id = ?', (user_id,))
        user_row = cursor.fetchone()
        
        if user_row:
            current_level = user_row['membership_level']
            current_expires = user_row['expires_at']
            current_level_order = _get_membership_levels().get(current_level, {}).get('order', 0)
            
            # 如果新等級更高或當前已過期，直接使用新過期時間
            if level_order > current_level_order or not current_expires or datetime.fromisoformat(current_expires) < now:
                new_expires = expires_at
                new_level = license_data['level']
            else:
                # 同等級或更低，疊加時間
                new_expires = datetime.fromisoformat(current_expires) + timedelta(days=duration_days)
                new_level = current_level if current_level_order >= level_order else license_data['level']
            
            cursor.execute('''
                UPDATE users SET 
                    membership_level = ?,
                    expires_at = ?,
                    is_lifetime = ?,
                    total_spent = total_spent + ?,
                    last_active_at = ?
                WHERE user_id = ? OR id = ?
            ''', (new_level, new_expires.isoformat(), 
                  1 if license_data['duration_type'] == 'lifetime' else 0,
                  license_data['price'], now.isoformat(),
                  user_id, user_id))
        
        # 記錄激活
        cursor.execute('''
            INSERT INTO activations (license_key, user_id, machine_id, device_id, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ''', (license_key, user_id, machine_id, device_id, ip_address))
        
        conn.commit()
        
        # 返回更新後的數據
        cursor.execute('SELECT * FROM licenses WHERE license_key = ?', (license_key,))
        updated_license = dict(cursor.fetchone())
        
        conn.close()
        
        return True, f"激活成功，有效期至 {expires_at.strftime('%Y-%m-%d')}", updated_license
    
    def get_activation_history(self, user_id: str = None, machine_id: str = None,
                              limit: int = 50, offset: int = 0) -> List[Dict]:
        """獲取用戶激活記錄"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                a.id,
                a.license_key,
                a.activated_at,
                a.is_active,
                l.level,
                l.duration_type,
                l.price,
                l.status as license_status
            FROM activations a
            LEFT JOIN licenses l ON a.license_key = l.license_key
            WHERE 1=1
        '''
        params = []
        
        if user_id:
            query += ' AND a.user_id = ?'
            params.append(user_id)
        
        if machine_id:
            query += ' AND a.machine_id = ?'
            params.append(machine_id)
        
        query += ' ORDER BY a.activated_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        activations = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            # 解析等級名稱
            level = row_dict.get('level', 'bronze')
            level_config = _get_membership_levels().get(level, {})
            row_dict['level_name'] = level_config.get('name', level)
            row_dict['level_icon'] = level_config.get('icon', '🎫')
            
            # 解析時長類型
            duration_type = row_dict.get('duration_type', 'month')
            duration_map = {
                'week': '周卡',
                'month': '月卡',
                'quarter': '季卡',
                'year': '年卡',
                'lifetime': '終身'
            }
            row_dict['duration_name'] = duration_map.get(duration_type, '月卡')
            
            activations.append(row_dict)
        
        conn.close()
        return activations
    
    def get_licenses(self, status: str = None, level: str = None,
                    limit: int = 500, offset: int = 0) -> List[Dict]:
        """獲取卡密列表"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = 'SELECT * FROM licenses WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        if level:
            query += ' AND level = ?'
            params.append(level)
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        licenses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return licenses
    
    # ============ 邀請獎勵 ============
    
    def _process_referral_registration(self, inviter_code: str, invitee_id: str, 
                                       invitee_code: str) -> bool:
        """處理邀請註冊獎勵"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 找到邀請人
        cursor.execute('SELECT user_id FROM users WHERE invite_code = ?', (inviter_code,))
        inviter_row = cursor.fetchone()
        
        if not inviter_row:
            conn.close()
            return False
        
        inviter_id = inviter_row['user_id']
        rewards = _get_referral_rewards()['register']
        
        # 記錄邀請
        cursor.execute('''
            INSERT INTO referrals (inviter_id, invitee_id, invite_code, reward_type, 
                                  inviter_reward_days, invitee_reward_days, status)
            VALUES (?, ?, ?, 'registration', ?, ?, 'completed')
        ''', (inviter_id, invitee_id, inviter_code, rewards['inviter_days'], rewards['invitee_days']))
        
        # 更新邀請人的邀請數
        cursor.execute('''
            UPDATE users SET total_invites = total_invites + 1 WHERE user_id = ?
        ''', (inviter_id,))
        
        # TODO: 實際發放獎勵天數
        
        conn.commit()
        conn.close()
        return True
    
    def process_referral_payment(self, order_id: str, invitee_id: str, 
                                order_amount: float, level: str) -> bool:
        """處理邀請付費獎勵"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 找到邀請人
        cursor.execute('SELECT invited_by FROM users WHERE user_id = ?', (invitee_id,))
        row = cursor.fetchone()
        
        if not row or not row['invited_by']:
            conn.close()
            return False
        
        inviter_code = row['invited_by']
        cursor.execute('SELECT user_id FROM users WHERE invite_code = ?', (inviter_code,))
        inviter_row = cursor.fetchone()
        
        if not inviter_row:
            conn.close()
            return False
        
        inviter_id = inviter_row['user_id']
        
        # 檢查是否首次付費
        cursor.execute('''
            SELECT COUNT(*) as count FROM referrals 
            WHERE invitee_id = ? AND reward_type = 'first_payment'
        ''', (invitee_id,))
        is_first = cursor.fetchone()['count'] == 0
        
        if is_first:
            rewards = _get_referral_rewards()['first_payment'].get(level, {})
            inviter_days = rewards.get('inviter_days', 0)
            inviter_cash = rewards.get('inviter_cash', 0)
            
            cursor.execute('''
                INSERT INTO referrals (inviter_id, invitee_id, invite_code, reward_type,
                                      inviter_reward_days, inviter_reward_cash, order_id, order_amount, status)
                VALUES (?, ?, ?, 'first_payment', ?, ?, ?, ?, 'completed')
            ''', (inviter_id, invitee_id, inviter_code, inviter_days, inviter_cash, order_id, order_amount))
            
            # 更新邀請人收益
            cursor.execute('''
                UPDATE users SET invite_earnings = invite_earnings + ? WHERE user_id = ?
            ''', (inviter_cash, inviter_id))
        else:
            # 重複付費返傭
            commission_rate = _get_referral_rewards()['repeat_payment']['commission_rate']
            commission = order_amount * commission_rate
            
            cursor.execute('''
                INSERT INTO referrals (inviter_id, invitee_id, invite_code, reward_type,
                                      inviter_reward_cash, order_id, order_amount, commission_rate, commission_amount, status)
                VALUES (?, ?, ?, 'repeat_payment', ?, ?, ?, ?, ?, 'completed')
            ''', (inviter_id, invitee_id, inviter_code, commission, order_id, order_amount, commission_rate, commission))
            
            cursor.execute('''
                UPDATE users SET invite_earnings = invite_earnings + ? WHERE user_id = ?
            ''', (commission, inviter_id))
        
        conn.commit()
        conn.close()
        return True
    
    def get_referrals(self, inviter_id: str = None, limit: int = 100) -> List[Dict]:
        """獲取邀請記錄"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if inviter_id:
            cursor.execute('''
                SELECT r.*, u.nickname, u.email, u.membership_level as invitee_level
                FROM referrals r
                LEFT JOIN users u ON r.invitee_id = u.user_id
                WHERE r.inviter_id = ?
                ORDER BY r.created_at DESC
                LIMIT ?
            ''', (inviter_id, limit))
        else:
            cursor.execute('''
                SELECT r.*, 
                    u1.nickname as inviter_name, u1.email as inviter_email,
                    u2.nickname as invitee_name, u2.email as invitee_email
                FROM referrals r
                LEFT JOIN users u1 ON r.inviter_id = u1.user_id
                LEFT JOIN users u2 ON r.invitee_id = u2.user_id
                ORDER BY r.created_at DESC
                LIMIT ?
            ''', (limit,))
        
        referrals = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return referrals
    
    # ============ 統計 ============
    
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """獲取儀表盤統計"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 用戶統計
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total_users = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = ?', (today,))
        new_users_today = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM users WHERE membership_level NOT IN ('bronze', 'free')")
        paid_users = cursor.fetchone()['total']
        
        # 收入統計
        cursor.execute("SELECT COALESCE(SUM(price), 0) as total FROM licenses WHERE status = 'used'")
        total_revenue = cursor.fetchone()['total']
        
        cursor.execute("SELECT COALESCE(SUM(price), 0) as total FROM licenses WHERE status = 'used' AND DATE(used_at) = ?", (today,))
        revenue_today = cursor.fetchone()['total']
        
        # 卡密統計
        cursor.execute('SELECT COUNT(*) as total FROM licenses')
        total_licenses = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE status = 'unused'")
        unused_licenses = cursor.fetchone()['total']
        
        # 會員等級分布
        cursor.execute('''
            SELECT membership_level, COUNT(*) as count 
            FROM users 
            GROUP BY membership_level
        ''')
        level_distribution = {}
        for row in cursor.fetchall():
            level = row['membership_level'] or 'bronze'
            level_distribution[level] = row['count']
        
        # 近7天收入趨勢
        revenue_trend = []
        for i in range(6, -1, -1):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            cursor.execute("SELECT COALESCE(SUM(price), 0) as total FROM licenses WHERE status = 'used' AND DATE(used_at) = ?", (date,))
            revenue_trend.append({
                'date': date,
                'revenue': cursor.fetchone()['total']
            })
        
        # 各等級卡密統計
        license_stats = {}
        for level, config in _get_membership_levels().items():
            if level == 'bronze':
                continue
            cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE level = ?", (level,))
            total = cursor.fetchone()['total']
            cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE level = ? AND status = 'unused'", (level,))
            unused = cursor.fetchone()['total']
            license_stats[level] = {
                'name': config['name'],
                'icon': config['icon'],
                'total': total,
                'unused': unused
            }
        
        # 邀請統計
        cursor.execute('SELECT COUNT(*) as total FROM referrals')
        total_referrals = cursor.fetchone()['total']
        
        cursor.execute('SELECT COALESCE(SUM(inviter_reward_cash + commission_amount), 0) as total FROM referrals')
        total_referral_earnings = cursor.fetchone()['total']
        
        conn.close()
        
        return {
            'stats': {
                'totalUsers': total_users,
                'newUsersToday': new_users_today,
                'paidUsers': paid_users,
                'conversionRate': round((paid_users / total_users * 100) if total_users > 0 else 0, 1),
                'totalRevenue': total_revenue,
                'revenueToday': revenue_today,
                'totalLicenses': total_licenses,
                'unusedLicenses': unused_licenses,
                'totalReferrals': total_referrals,
                'totalReferralEarnings': total_referral_earnings
            },
            'levelDistribution': level_distribution,
            'revenueTrend': revenue_trend,
            'licenseStats': license_stats
        }
    
    # ============ 管理員 ============
    
    def get_admin(self, username: str) -> Optional[Dict]:
        """獲取管理員"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM admins WHERE username = ? AND is_active = 1', (username,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def log_admin_action(self, username: str, action: str, action_type: str = None,
                        target_type: str = None, target_id: str = None,
                        details: str = None, ip_address: str = None):
        """記錄管理員操作"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO admin_logs (username, action, action_type, target_type, target_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (username, action, action_type, target_type, target_id, details, ip_address))
        conn.commit()
        conn.close()
    
    def get_admin_logs(self, limit: int = 100) -> List[Dict]:
        """獲取管理員日誌"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ?', (limit,))
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return logs
    
    # ============ 設置 ============
    
    def get_setting(self, key: str, default: str = None) -> str:
        """獲取設置"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT setting_value FROM settings WHERE setting_key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        return row['setting_value'] if row else default
    
    def set_setting(self, key: str, value: str, updated_by: str = 'system'):
        """保存設置"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO settings (setting_key, setting_value, updated_at, updated_by)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(setting_key) DO UPDATE SET 
                setting_value = excluded.setting_value,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = excluded.updated_by
        ''', (key, value, updated_by))
        conn.commit()
        conn.close()
    
    async def get_all_settings(self, category: str = None) -> Dict[str, Any]:
        """獲取所有設置"""
        try:
            if category:
                rows = await self.fetch_all('SELECT * FROM settings WHERE category = ?', (category,))
            else:
                rows = await self.fetch_all('SELECT * FROM settings')
            
            settings = {}
            for row in rows:
                settings[row['setting_key']] = {
                    'value': row['setting_value'],
                    'type': row['setting_type'],
                    'category': row['category'],
                    'description': row['description']
                }
            
            return settings
        except Exception as e:
            print(f"Error getting all settings: {e}")
            return {}
    
    # ============ AI Settings Methods ============
    
    async def get_ai_settings(self) -> Dict[str, Any]:
        """獲取 AI 相關設置"""
        try:
            rows = await self.fetch_all('''
                SELECT setting_key, setting_value FROM settings 
                WHERE category = 'ai' OR setting_key LIKE 'auto_chat%' 
                   OR setting_key LIKE 'local_ai%' OR setting_key LIKE 'auto_greeting%'
            ''')
            
            settings = {}
            for row in rows:
                key = row['setting_key']
                value = row['setting_value']
                # 嘗試轉換數值
                if value is not None:
                    if value.isdigit():
                        value = int(value)
                    elif value.lower() in ('true', 'false'):
                        value = 1 if value.lower() == 'true' else 0
                settings[key] = value
            
            # 設置默認值
            if 'auto_chat_enabled' not in settings:
                settings['auto_chat_enabled'] = 0
            if 'auto_chat_mode' not in settings:
                settings['auto_chat_mode'] = 'semi'
            if 'auto_greeting' not in settings:
                settings['auto_greeting'] = 0
            if 'local_ai_endpoint' not in settings:
                settings['local_ai_endpoint'] = ''
            if 'local_ai_model' not in settings:
                settings['local_ai_model'] = ''
            
            return settings
        except Exception as e:
            import sys
            print(f"[Database] Error getting AI settings: {e}", file=sys.stderr)
            # 返回默認設置
            return {
                'auto_chat_enabled': 0,
                'auto_chat_mode': 'semi',
                'auto_greeting': 0,
                'local_ai_endpoint': '',
                'local_ai_model': ''
            }
    
    async def update_ai_settings(self, settings: Dict[str, Any]) -> bool:
        """更新 AI 相關設置"""
        import sys
        try:
            for key, value in settings.items():
                # 將值轉換為字符串存儲
                str_value = str(value) if value is not None else ''
                
                await self.execute('''
                    INSERT INTO settings (setting_key, setting_value, category, updated_at)
                    VALUES (?, ?, 'ai', CURRENT_TIMESTAMP)
                    ON CONFLICT(setting_key) DO UPDATE SET
                        setting_value = excluded.setting_value,
                        category = 'ai',
                        updated_at = CURRENT_TIMESTAMP
                ''', (key, str_value))
            
            print(f"[Database] AI settings updated: {list(settings.keys())}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[Database] Error updating AI settings: {e}", file=sys.stderr)
            return False
    
    # ============ 🆕 AI 知識庫 Methods ============
    
    async def get_knowledge_items(self, category: str = None, active_only: bool = True) -> List[Dict]:
        """獲取知識庫條目"""
        try:
            where_clauses = []
            params = []
            
            if active_only:
                where_clauses.append("is_active = 1")
            if category:
                where_clauses.append("category = ?")
                params.append(category)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            rows = await self.fetch_all(f'''
                SELECT * FROM ai_knowledge_base 
                WHERE {where_sql}
                ORDER BY priority DESC, use_count DESC
            ''', tuple(params))
            
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            import sys
            print(f"[Database] Error getting knowledge items: {e}", file=sys.stderr)
            return []
    
    async def add_knowledge_item(self, title: str, content: str, 
                                  category: str = 'general', keywords: str = None,
                                  priority: int = 1) -> int:
        """添加知識庫條目"""
        try:
            await self.execute('''
                INSERT INTO ai_knowledge_base (title, content, category, keywords, priority)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, content, category, keywords, priority))
            
            # 獲取新插入的 ID
            row = await self.fetch_one("SELECT last_insert_rowid() as id")
            return row['id'] if row else 0
        except Exception as e:
            import sys
            print(f"[Database] Error adding knowledge item: {e}", file=sys.stderr)
            return 0
    
    async def update_knowledge_item(self, item_id: int, updates: Dict) -> bool:
        """更新知識庫條目"""
        try:
            set_clauses = []
            params = []
            
            for key, value in updates.items():
                if key in ['title', 'content', 'category', 'keywords', 'priority', 'is_active']:
                    set_clauses.append(f"{key} = ?")
                    params.append(value)
            
            if not set_clauses:
                return False
            
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            params.append(item_id)
            
            await self.execute(f'''
                UPDATE ai_knowledge_base 
                SET {", ".join(set_clauses)}
                WHERE id = ?
            ''', tuple(params))
            
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating knowledge item: {e}", file=sys.stderr)
            return False
    
    async def delete_knowledge_item(self, item_id: int) -> bool:
        """刪除知識庫條目"""
        try:
            await self.execute("DELETE FROM ai_knowledge_base WHERE id = ?", (item_id,))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error deleting knowledge item: {e}", file=sys.stderr)
            return False
    
    async def search_knowledge(self, query: str, limit: int = 5) -> List[Dict]:
        """搜索知識庫"""
        try:
            # 簡單的關鍵詞匹配搜索
            search_term = f"%{query}%"
            rows = await self.fetch_all('''
                SELECT * FROM ai_knowledge_base 
                WHERE is_active = 1 
                  AND (title LIKE ? OR content LIKE ? OR keywords LIKE ?)
                ORDER BY priority DESC, use_count DESC
                LIMIT ?
            ''', (search_term, search_term, search_term, limit))
            
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            import sys
            print(f"[Database] Error searching knowledge: {e}", file=sys.stderr)
            return []
    
    async def increment_knowledge_use(self, item_id: int):
        """增加知識條目使用次數"""
        try:
            await self.execute('''
                UPDATE ai_knowledge_base 
                SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (item_id,))
        except Exception as e:
            pass
    
    # ============ 🆕 對話效果追蹤 Methods ============
    
    async def track_ai_response(self, user_id: str, ai_message: str, 
                                 triggered_keyword: str = None, source_group: str = None) -> int:
        """記錄 AI 回覆，等待用戶響應"""
        try:
            await self.execute('''
                INSERT INTO conversation_effectiveness 
                (user_id, ai_message, triggered_keyword, source_group)
                VALUES (?, ?, ?, ?)
            ''', (user_id, ai_message, triggered_keyword, source_group))
            
            row = await self.fetch_one("SELECT last_insert_rowid() as id")
            return row['id'] if row else 0
        except Exception as e:
            import sys
            print(f"[Database] Error tracking AI response: {e}", file=sys.stderr)
            return 0
    
    async def update_response_effectiveness(self, user_id: str, user_response: str):
        """當用戶回覆時，更新效果評估"""
        try:
            # 找到最近的未評估記錄
            record = await self.fetch_one('''
                SELECT id, ai_message, created_at FROM conversation_effectiveness
                WHERE user_id = ? AND user_response IS NULL
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id,))
            
            if not record:
                return
            
            record_id = record['id']
            created_at = record['created_at']
            
            # 計算響應時間
            from datetime import datetime
            try:
                if isinstance(created_at, str):
                    created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_time = created_at
                response_time = int((datetime.now() - created_time.replace(tzinfo=None)).total_seconds())
            except:
                response_time = 0
            
            # 簡單評估響應質量
            response_lower = user_response.lower()
            positive_indicators = ['好', '可以', '行', '嗯', '对', '是', 'yes', 'ok', 'good', '谢谢', '謝謝', '了解', '明白']
            negative_indicators = ['不', '没', '沒', '算了', '再说', '再見', 'no', 'bye']
            
            is_positive = any(ind in response_lower for ind in positive_indicators)
            is_negative = any(ind in response_lower for ind in negative_indicators)
            is_continued = len(user_response) > 5  # 回覆有內容表示對話繼續
            
            # 計算效果分數
            score = 0.5  # 基礎分
            if is_positive:
                score += 0.3
            if is_negative:
                score -= 0.3
            if is_continued:
                score += 0.2
            if response_time < 60:  # 快速回覆加分
                score += 0.1
            
            score = max(0, min(1, score))  # 限制在 0-1
            
            await self.execute('''
                UPDATE conversation_effectiveness
                SET user_response = ?,
                    response_time_seconds = ?,
                    is_positive_response = ?,
                    is_continued_conversation = ?,
                    effectiveness_score = ?
                WHERE id = ?
            ''', (user_response, response_time, 1 if is_positive else 0, 1 if is_continued else 0, score, record_id))
            
            # 如果效果很好，標記為可學習
            if score >= 0.8:
                await self.execute('''
                    UPDATE conversation_effectiveness SET learned = 0 WHERE id = ?
                ''', (record_id,))
            
            import sys
            print(f"[Database] Response effectiveness updated: user={user_id}, score={score}", file=sys.stderr)
            
        except Exception as e:
            import sys
            print(f"[Database] Error updating effectiveness: {e}", file=sys.stderr)
    
    async def get_effective_responses(self, min_score: float = 0.7, limit: int = 20) -> List[Dict]:
        """獲取高效的回覆用於學習"""
        try:
            rows = await self.fetch_all('''
                SELECT * FROM conversation_effectiveness
                WHERE effectiveness_score >= ? AND user_response IS NOT NULL
                ORDER BY effectiveness_score DESC
                LIMIT ?
            ''', (min_score, limit))
            
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            import sys
            print(f"[Database] Error getting effective responses: {e}", file=sys.stderr)
            return []
    
    async def learn_from_effective_responses(self) -> int:
        """從高效回覆中自動學習，加入知識庫"""
        try:
            # 獲取未學習的高效回覆
            rows = await self.fetch_all('''
                SELECT * FROM conversation_effectiveness
                WHERE effectiveness_score >= 0.8 AND learned = 0 AND user_response IS NOT NULL
                LIMIT 10
            ''')
            
            learned_count = 0
            for row in rows:
                row_dict = dict(row) if hasattr(row, 'keys') else row
                ai_message = row_dict.get('ai_message', '')
                triggered_keyword = row_dict.get('triggered_keyword', '')
                
                if ai_message and len(ai_message) > 10:
                    # 添加到知識庫
                    await self.add_knowledge_item(
                        title=f"高效回覆 - {triggered_keyword or '通用'}",
                        content=ai_message,
                        category='learned_responses',
                        keywords=triggered_keyword,
                        priority=2  # 學習到的內容優先級稍高
                    )
                    
                    # 標記為已學習
                    await self.execute('''
                        UPDATE conversation_effectiveness SET learned = 1 WHERE id = ?
                    ''', (row_dict.get('id'),))
                    
                    learned_count += 1
            
            if learned_count > 0:
                import sys
                print(f"[Database] Learned {learned_count} effective responses", file=sys.stderr)
            
            return learned_count
        except Exception as e:
            import sys
            print(f"[Database] Error learning from responses: {e}", file=sys.stderr)
            return 0
    
    # ============ API Credential Logs (Phase 2) ============
    
    def add_credential_log(
        self,
        account_id: int,
        phone: str,
        action: str,
        status: str,
        api_id: Optional[str] = None,
        api_hash: Optional[str] = None,
        error_message: Optional[str] = None,
        details_json: Optional[str] = None
    ) -> int:
        """添加 API 憑據獲取日誌"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO api_credential_logs 
                (account_id, phone, action, api_id, api_hash, status, error_message, created_at, details_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            ''', (account_id, phone, action, api_id, api_hash, status, error_message, details_json))
            
            conn.commit()
            log_id = cursor.lastrowid
            conn.close()
            return log_id
        except Exception as e:
            conn.close()
            print(f"Error adding credential log: {e}")
            raise
    
    def get_credential_logs(
        self,
        account_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict]:
        """獲取 API 憑據獲取日誌"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            if account_id:
                cursor.execute('''
                    SELECT * FROM api_credential_logs 
                    WHERE account_id = ?
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (account_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM api_credential_logs 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (limit,))
            
            logs = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return logs
        except Exception as e:
            conn.close()
            print(f"Error getting credential logs: {e}")
            return []
    
    # ============ IP Change History (Phase 2) ============
    
    def add_ip_change_record(
        self,
        account_id: int,
        phone: str,
        old_proxy: Optional[str],
        new_proxy: str,
        old_ip: Optional[str],
        new_ip: str,
        reason: str,
        details_json: Optional[str] = None
    ) -> int:
        """添加 IP 更換記錄"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO ip_change_history 
                (account_id, phone, old_proxy, new_proxy, old_ip, new_ip, reason, changed_at, details_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            ''', (account_id, phone, old_proxy, new_proxy, old_ip, new_ip, reason, details_json))
            
            conn.commit()
            record_id = cursor.lastrowid
            conn.close()
            return record_id
        except Exception as e:
            conn.close()
            print(f"Error adding IP change record: {e}")
            raise
    
    def get_ip_change_history(
        self,
        account_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict]:
        """獲取 IP 更換歷史"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            if account_id:
                cursor.execute('''
                    SELECT * FROM ip_change_history 
                    WHERE account_id = ?
                    ORDER BY changed_at DESC 
                    LIMIT ?
                ''', (account_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM ip_change_history 
                    ORDER BY changed_at DESC 
                    LIMIT ?
                ''', (limit,))
            
            records = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return records
        except Exception as e:
            conn.close()
            print(f"Error getting IP change history: {e}")
            return []
    
    # ============ 帳號管理方法（操作 tgmatrix.db）============

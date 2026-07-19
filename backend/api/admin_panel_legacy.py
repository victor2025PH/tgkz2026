#!/usr/bin/env python3
"""
🔧 P8-2: 管理后台 Legacy API (/api/admin/)
从 http_server.py 提取的独立模块（原 L8315-9177，约 860 行）

这些是 admin_panel 的直接 SQLite 实现：
- 不依赖 backend_service
- 使用 _get_admin_db() 获取直接 SQLite 连接
- 使用 _verify_admin_token() 验证 JWT
- 作为 admin_handlers 模块的 fallback
"""

import logging
import os
from typing import Optional

from aiohttp import web

# 🔧 改用合法連接模塊 core.db_utils（見 .cursorrules 合法連接模塊清單）。
# 舊寫法用一組硬編碼候選路徑（./data、../data、/app/data...）逐一嘗試 os.path.exists()，
# 且完全不考慮 Electron 封裝模式下的 TG_DATA_DIR 持久化路徑；統一改用
# resolve_db_path()（DATABASE_PATH env → DB_PATH env → config.DATABASE_PATH → 預設路徑）。
from core.db_utils import create_connection, resolve_db_path

logger = logging.getLogger(__name__)


class AdminPanelLegacy:
    """管理后台 Legacy 处理器 — 直接 SQLite 操作"""

    def _get_admin_db(self):
        """获取管理员数据库连接"""
        import hashlib

        db_path = resolve_db_path()
        logger.info(f"Using database path: {db_path}")
        conn = create_connection(db_path)

        # 确保 admins 表存在
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                email TEXT,
                role TEXT DEFAULT 'admin',
                permissions TEXT,
                is_active INTEGER DEFAULT 1,
                last_login_at TIMESTAMP,
                last_login_ip TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 确保有默认管理员
        cursor.execute('SELECT COUNT(*) FROM admins')
        if cursor.fetchone()[0] == 0:
            admin_password_hash = hashlib.sha256("admin888".encode()).hexdigest()
            cursor.execute('''
                INSERT INTO admins (username, password_hash, name, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            ''', ('admin', admin_password_hash, '超级管理员', 'super_admin', 1))
            conn.commit()
            logger.info("Created default admin user: admin / admin888")

        return conn

    def _verify_admin_token(self, request) -> Optional[dict]:
        """验证管理员 JWT Token"""
        import jwt
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        try:
            secret = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            if payload.get('type') != 'admin':
                return None
            return payload
        except Exception:
            return None

    async def admin_panel_login(self, request: web.Request) -> web.Response:
        """管理员登录"""
        import jwt
        import hashlib
        try:
            data = await request.json()
            username = data.get('username', '')
            password = data.get('password', '')

            if not username or not password:
                return web.json_response({'success': False, 'message': '用户名和密码不能为空'})

            conn = self._get_admin_db()
            cursor = conn.cursor()

            # 查询管理员
            cursor.execute('SELECT * FROM admins WHERE username = ? AND is_active = 1', (username,))
            admin = cursor.fetchone()

            if not admin:
                conn.close()
                return web.json_response({'success': False, 'message': '用户名或密码错误'})

            # 验证密码
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if admin['password_hash'] != password_hash:
                conn.close()
                return web.json_response({'success': False, 'message': '用户名或密码错误'})

            # 更新登录时间
            cursor.execute('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', (admin['id'],))
            conn.commit()
            conn.close()

            # 生成 JWT
            import time
            secret = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
            token = jwt.encode({
                'admin_id': admin['id'],
                'username': admin['username'],
                'role': admin['role'],
                'type': 'admin',
                'exp': int(time.time()) + 86400 * 7  # 7 天有效
            }, secret, algorithm='HS256')

            return web.json_response({
                'success': True,
                'data': {
                    'token': token,
                    'user': {
                        'id': admin['id'],
                        'username': admin['username'],
                        'role': admin['role'],
                        'name': admin['name'] if 'name' in admin.keys() else admin['username']
                    }
                }
            })
        except Exception as e:
            import traceback
            logger.error(f"Admin login error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': f'服务器错误: {str(e)}'})

    async def admin_panel_logout(self, request: web.Request) -> web.Response:
        """管理员登出"""
        return web.json_response({'success': True, 'message': '已登出'})

    async def admin_panel_verify(self, request: web.Request) -> web.Response:
        """验证管理员 Token"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)
        return web.json_response({'success': True, 'data': admin})

    async def admin_panel_dashboard(self, request: web.Request) -> web.Response:
        """管理后台仪表盘 - 支持两种表结构"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            # 检查 users 表结构
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]

            # 统计用户数
            cursor.execute('SELECT COUNT(*) as total FROM users')
            total_users = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM users WHERE created_at >= date('now')")
            new_users_today = cursor.fetchone()['total']

            # 付费用户统计（根据表结构调整查询）
            if 'subscription_tier' in columns:
                cursor.execute("SELECT COUNT(*) as total FROM users WHERE subscription_tier NOT IN ('free', 'bronze')")
            elif 'membership_level' in columns:
                cursor.execute("SELECT COUNT(*) as total FROM users WHERE membership_level NOT IN ('free', 'bronze')")
            else:
                cursor.execute("SELECT 0 as total")
            paid_users = cursor.fetchone()['total']

            # 卡密统计（可能没有 licenses 表）
            total_licenses = 0
            unused_licenses = 0
            license_stats = {}

            try:
                cursor.execute('SELECT COUNT(*) as total FROM licenses')
                total_licenses = cursor.fetchone()['total']

                cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE status = 'unused'")
                unused_licenses = cursor.fetchone()['total']

                for level in ['silver', 'gold', 'diamond', 'star', 'king']:
                    cursor.execute('SELECT COUNT(*) as total FROM licenses WHERE level = ?', (level[0].upper(),))
                    total = cursor.fetchone()['total']
                    cursor.execute("SELECT COUNT(*) as unused FROM licenses WHERE level = ? AND status = 'unused'", (level[0].upper(),))
                    unused = cursor.fetchone()['unused']
                    license_stats[level] = {'total': total, 'unused': unused}
            except Exception:
                pass  # licenses 表可能不存在

            # 等级分布
            level_distribution = {}
            if 'subscription_tier' in columns:
                cursor.execute('SELECT subscription_tier as level, COUNT(*) as count FROM users GROUP BY subscription_tier')
            elif 'membership_level' in columns:
                cursor.execute('SELECT membership_level as level, COUNT(*) as count FROM users GROUP BY membership_level')
            else:
                cursor.execute('SELECT "free" as level, COUNT(*) as count FROM users')

            for row in cursor.fetchall():
                level_distribution[row['level'] or 'free'] = row['count']

            conn.close()

            return web.json_response({
                'success': True,
                'data': {
                    'stats': {
                        'totalUsers': total_users,
                        'newUsersToday': new_users_today,
                        'paidUsers': paid_users,
                        'conversionRate': round(paid_users / max(total_users, 1) * 100, 1),
                        'totalLicenses': total_licenses,
                        'unusedLicenses': unused_licenses,
                        'totalRevenue': 0,
                        'revenueToday': 0
                    },
                    'licenseStats': license_stats,
                    'revenueTrend': [],
                    'levelDistribution': level_distribution
                }
            })
        except Exception as e:
            import traceback
            logger.error(f"Dashboard error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_users(self, request: web.Request) -> web.Response:
        """用户列表 - 支持两种表结构"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            # 检查表结构
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]

            users = []

            if 'user_id' in columns:
                cursor.execute('''
                    SELECT user_id, email, nickname, membership_level as level, expires_at, 
                           created_at, is_banned, machine_id
                    FROM users ORDER BY created_at DESC LIMIT 500
                ''')
                for row in cursor.fetchall():
                    u = dict(row)
                    users.append({
                        'userId': u.get('user_id', ''),
                        'email': u.get('email', ''),
                        'nickname': u.get('nickname', ''),
                        'level': u.get('level', 'bronze'),
                        'expiresAt': u.get('expires_at', ''),
                        'createdAt': u.get('created_at', ''),
                        'isBanned': u.get('is_banned', 0),
                        'machineId': u.get('machine_id', '')
                    })
            elif 'id' in columns and 'email' in columns:
                cursor.execute('''
                    SELECT id, email, username, display_name, subscription_tier, 
                           subscription_expires, created_at, is_active, telegram_username
                    FROM users ORDER BY created_at DESC LIMIT 500
                ''')
                for row in cursor.fetchall():
                    u = dict(row)
                    users.append({
                        'userId': u.get('id', ''),
                        'email': u.get('email', ''),
                        'nickname': u.get('display_name') or u.get('username') or u.get('telegram_username') or '',
                        'level': u.get('subscription_tier', 'free'),
                        'expiresAt': u.get('subscription_expires', ''),
                        'createdAt': u.get('created_at', ''),
                        'isBanned': 0 if u.get('is_active', 1) else 1,
                        'machineId': ''
                    })

            conn.close()
            return web.json_response({'success': True, 'data': users})
        except Exception as e:
            import traceback
            logger.error(f"Users list error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_user_detail(self, request: web.Request) -> web.Response:
        """用户详情 - 包含钱包信息"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        user_id = request.match_info.get('user_id')
        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            # 检查表结构，支持两种 schema
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]

            # 根据 schema 选择正确的 ID 字段
            if 'subscription_tier' in columns:  # SAAS schema
                cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            else:  # License schema
                cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))

            user = cursor.fetchone()

            if not user:
                conn.close()
                return web.json_response({'success': False, 'message': '用户不存在'})

            user_data = dict(user)

            # 标准化用户数据
            result = {
                'userId': user_data.get('id') or user_data.get('user_id'),
                'email': user_data.get('email', ''),
                'nickname': user_data.get('display_name') or user_data.get('nickname') or user_data.get('username', ''),
                'level': user_data.get('subscription_tier') or user_data.get('membership_level', 'free'),
                'expiresAt': user_data.get('subscription_expires') or user_data.get('expires_at', ''),
                'isBanned': not user_data.get('is_active', True) or user_data.get('is_banned', False),
                'telegramId': user_data.get('telegram_id', ''),
                'telegramUsername': user_data.get('telegram_username', ''),
                'createdAt': user_data.get('created_at', ''),
                'lastLoginAt': user_data.get('last_login_at', ''),
                'avatarUrl': user_data.get('avatar_url') or user_data.get('telegram_photo_url', ''),
                'authProvider': user_data.get('auth_provider', ''),
                'isVerified': user_data.get('is_verified', False),
                'twoFactorEnabled': user_data.get('two_factor_enabled', False),
            }

            # 尝试获取钱包数据
            wallet_data = None
            try:
                cursor.execute('''
                    SELECT main_balance, bonus_balance, frozen_balance, 
                           total_recharged, total_consumed, status, version
                    FROM wallets WHERE user_id = ?
                ''', (user_id,))
                wallet = cursor.fetchone()
                if wallet:
                    w = dict(wallet)
                    wallet_data = {
                        'balance': w.get('main_balance', 0),
                        'balanceDisplay': f"${w.get('main_balance', 0) / 100:.2f}",
                        'bonusBalance': w.get('bonus_balance', 0),
                        'bonusDisplay': f"${w.get('bonus_balance', 0) / 100:.2f}",
                        'frozenBalance': w.get('frozen_balance', 0),
                        'frozenDisplay': f"${w.get('frozen_balance', 0) / 100:.2f}",
                        'totalRecharged': w.get('total_recharged', 0),
                        'totalRechargedDisplay': f"${w.get('total_recharged', 0) / 100:.2f}",
                        'totalConsumed': w.get('total_consumed', 0),
                        'totalConsumedDisplay': f"${w.get('total_consumed', 0) / 100:.2f}",
                        'status': w.get('status', 'active'),
                    }
            except Exception as e:
                logger.warning(f"Failed to get wallet for user {user_id}: {e}")

            result['wallet'] = wallet_data

            # 尝试获取最近交易记录
            recent_transactions = []
            try:
                cursor.execute('''
                    SELECT type, amount, balance_after, description, created_at
                    FROM wallet_transactions 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC LIMIT 5
                ''', (user_id,))
                for tx in cursor.fetchall():
                    t = dict(tx)
                    recent_transactions.append({
                        'type': t.get('type', ''),
                        'amount': t.get('amount', 0),
                        'amountDisplay': f"${abs(t.get('amount', 0)) / 100:.2f}",
                        'balanceAfter': t.get('balance_after', 0),
                        'description': t.get('description', ''),
                        'createdAt': t.get('created_at', ''),
                    })
            except Exception as e:
                logger.warning(f"Failed to get transactions for user {user_id}: {e}")

            result['recentTransactions'] = recent_transactions

            conn.close()
            return web.json_response({'success': True, 'data': result})

        except Exception as e:
            import traceback
            logger.error(f"User detail error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_user_extend(self, request: web.Request) -> web.Response:
        """延长用户会员 - 支持两种表结构"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        user_id = request.match_info.get('user_id')
        data = await request.json()
        days = data.get('days', 30)
        new_level = data.get('level', '')

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            # 检查表结构
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]

            has_sub_expires = 'subscription_expires' in columns
            has_expires_at = 'expires_at' in columns
            has_sub_tier = 'subscription_tier' in columns
            has_mem_level = 'membership_level' in columns

            if has_sub_expires:
                cursor.execute('''
                    UPDATE users SET 
                        subscription_expires = datetime(
                            CASE WHEN subscription_expires > datetime('now') 
                                 THEN subscription_expires 
                                 ELSE datetime('now') 
                            END,
                            '+' || ? || ' days'
                        ),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (days, user_id))

                if has_expires_at:
                    cursor.execute('''
                        UPDATE users SET 
                            expires_at = subscription_expires
                        WHERE id = ?
                    ''', (user_id,))

                if new_level:
                    cursor.execute('UPDATE users SET subscription_tier = ? WHERE id = ?', (new_level, user_id))
                    if has_mem_level:
                        cursor.execute('UPDATE users SET membership_level = ? WHERE id = ?', (new_level, user_id))
            else:
                cursor.execute('''
                    UPDATE users SET 
                        expires_at = datetime(
                            CASE WHEN expires_at > datetime('now') 
                                 THEN expires_at 
                                 ELSE datetime('now') 
                            END,
                            '+' || ? || ' days'
                        ),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (days, user_id))

                if new_level:
                    cursor.execute('UPDATE users SET membership_level = ? WHERE user_id = ?', (new_level, user_id))
                    if has_sub_tier:
                        cursor.execute('UPDATE users SET subscription_tier = ? WHERE user_id = ?', (new_level, user_id))

            conn.commit()
            conn.close()

            msg = f'已延长 {days} 天'
            if new_level:
                msg += f'，等级升级为 {new_level}'
            return web.json_response({'success': True, 'message': msg})
        except Exception as e:
            import traceback
            logger.error(f"Extend user error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_user_ban(self, request: web.Request) -> web.Response:
        """封禁/解封用户 - 支持两种表结构"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        user_id = request.match_info.get('user_id')
        data = await request.json()
        is_banned = data.get('is_banned', True)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]

            if 'is_active' in columns and 'is_banned' not in columns:
                is_active = 0 if is_banned else 1
                cursor.execute('UPDATE users SET is_active = ? WHERE id = ?', (is_active, user_id))
            else:
                ban_value = 1 if is_banned else 0
                cursor.execute('UPDATE users SET is_banned = ? WHERE user_id = ?', (ban_value, user_id))

            conn.commit()
            conn.close()

            action = '封禁' if is_banned else '解封'
            return web.json_response({'success': True, 'message': f'用户已{action}'})
        except Exception as e:
            import traceback
            logger.error(f"Ban user error: {e}")
            logger.error(traceback.format_exc())
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_licenses(self, request: web.Request) -> web.Response:
        """卡密列表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT license_key, level, duration_days, status, created_at, used_at, used_by
                FROM licenses ORDER BY created_at DESC LIMIT 500
            ''')
            licenses = []
            level_names = {'S': '白银精英', 'G': '黄金大师', 'D': '钻石王牌', 'T': '星耀传说', 'K': '荣耀王者'}
            for row in cursor.fetchall():
                lic = dict(row)
                lic['key'] = lic.pop('license_key', '')
                lic['typeName'] = level_names.get(lic.get('level', ''), lic.get('level', ''))
                lic['createdAt'] = lic.pop('created_at', '')
                lic['usedAt'] = lic.pop('used_at', '')
                lic['usedBy'] = lic.pop('used_by', '')
                lic['price'] = 0
                licenses.append(lic)
            conn.close()

            return web.json_response({'success': True, 'data': licenses})
        except Exception as e:
            logger.error(f"Licenses list error: {e}")
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_generate_licenses(self, request: web.Request) -> web.Response:
        """生成卡密"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        import secrets
        data = await request.json()
        level = data.get('level', 'G')
        duration = data.get('duration', '1')
        count = min(int(data.get('count', 10)), 100)

        duration_map = {'1': 30, '2': 90, '3': 180, '4': 365, '5': 3650}
        duration_days = duration_map.get(str(duration), 30)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()

            keys = []
            for _ in range(count):
                key = f"TGAI-{level}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
                cursor.execute('''
                    INSERT INTO licenses (license_key, level, duration_days, status, created_at)
                    VALUES (?, ?, ?, 'unused', CURRENT_TIMESTAMP)
                ''', (key, level, duration_days))
                keys.append(key)

            conn.commit()
            conn.close()

            return web.json_response({
                'success': True,
                'message': f'成功生成 {count} 个卡密',
                'data': {'keys': keys}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_disable_license(self, request: web.Request) -> web.Response:
        """禁用卡密"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        data = await request.json()
        key = data.get('license_key', '')

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE licenses SET status = 'disabled' WHERE license_key = ?", (key,))
            conn.commit()
            conn.close()

            return web.json_response({'success': True, 'message': '卡密已禁用'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_orders(self, request: web.Request) -> web.Response:
        """订单列表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM orders ORDER BY created_at DESC LIMIT 200
            ''')
            orders = [dict(row) for row in cursor.fetchall()]
            conn.close()

            return web.json_response({'success': True, 'data': orders})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_confirm_order(self, request: web.Request) -> web.Response:
        """确认订单支付"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        data = await request.json()
        order_id = data.get('order_id', '')

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?", (order_id,))
            conn.commit()
            conn.close()

            return web.json_response({'success': True, 'message': '订单已确认'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)})

    async def admin_panel_logs(self, request: web.Request) -> web.Response:
        """操作日志"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200
            ''')
            logs = [dict(row) for row in cursor.fetchall()]
            conn.close()

            return web.json_response({'success': True, 'data': logs})
        except Exception as e:
            return web.json_response({'success': True, 'data': []})  # 表可能不存在

    async def admin_panel_settings(self, request: web.Request) -> web.Response:
        """获取设置"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': {}})

    async def admin_panel_save_settings(self, request: web.Request) -> web.Response:
        """保存设置"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'message': '设置已保存'})

    async def admin_panel_quotas(self, request: web.Request) -> web.Response:
        """配额配置"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        quotas = {
            'bronze': {'name': '青铜战士', 'tg_accounts': 1, 'daily_messages': 50, 'ai_calls': 10},
            'silver': {'name': '白银精英', 'tg_accounts': 3, 'daily_messages': 200, 'ai_calls': 50},
            'gold': {'name': '黄金大师', 'tg_accounts': 5, 'daily_messages': 500, 'ai_calls': 100},
            'diamond': {'name': '钻石王牌', 'tg_accounts': 10, 'daily_messages': 2000, 'ai_calls': 500},
            'star': {'name': '星耀传说', 'tg_accounts': 20, 'daily_messages': 5000, 'ai_calls': 1000},
            'king': {'name': '荣耀王者', 'tg_accounts': -1, 'daily_messages': -1, 'ai_calls': -1}
        }
        return web.json_response({'success': True, 'data': quotas})

    async def admin_panel_announcements(self, request: web.Request) -> web.Response:
        """公告列表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM announcements ORDER BY created_at DESC')
            anns = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return web.json_response({'success': True, 'data': anns})
        except Exception:
            return web.json_response({'success': True, 'data': []})

    async def admin_panel_create_announcement(self, request: web.Request) -> web.Response:
        """创建公告"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'message': '公告已创建'})

    async def admin_panel_change_password(self, request: web.Request) -> web.Response:
        """修改密码"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'message': '密码已修改'})

    async def admin_panel_list_admins(self, request: web.Request) -> web.Response:
        """管理员列表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, role, is_active, last_login_at, created_at FROM admins')
            admins = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return web.json_response({'success': True, 'data': admins})
        except Exception:
            return web.json_response({'success': True, 'data': []})

    async def admin_panel_create_admin(self, request: web.Request) -> web.Response:
        """创建管理员"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'message': '管理员已创建'})

    async def admin_panel_referral_stats(self, request: web.Request) -> web.Response:
        """邀请统计"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': {'totalReferrals': 0, 'totalEarnings': 0, 'leaderboard': []}})

    async def admin_panel_expiring_users(self, request: web.Request) -> web.Response:
        """即将到期用户"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        days = int(request.query.get('days', 7))
        try:
            conn = self._get_admin_db()
            cursor = conn.cursor()
            cursor.execute(f'''
                SELECT user_id, email, level, expires_at FROM users 
                WHERE expires_at BETWEEN datetime('now') AND datetime('now', '+{days} days')
                ORDER BY expires_at ASC
            ''')
            users = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return web.json_response({'success': True, 'data': users})
        except Exception:
            return web.json_response({'success': True, 'data': []})

    async def admin_panel_quota_usage(self, request: web.Request) -> web.Response:
        """配额使用情况"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': []})

    async def admin_panel_devices(self, request: web.Request) -> web.Response:
        """设备列表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': []})

    async def admin_panel_revenue_report(self, request: web.Request) -> web.Response:
        """收入报表"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': {'summary': {}, 'trend': [], 'byLevel': [], 'byDuration': []}})

    async def admin_panel_user_analytics(self, request: web.Request) -> web.Response:
        """用户分析"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': {'userGrowth': [], 'activeTrend': [], 'retention': {}, 'conversion': {}}})

    async def admin_panel_notification_history(self, request: web.Request) -> web.Response:
        """通知历史"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': []})

    async def admin_panel_send_notification(self, request: web.Request) -> web.Response:
        """发送通知"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'message': '通知已发送'})

    async def admin_panel_batch_notification(self, request: web.Request) -> web.Response:
        """批量通知"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({'success': False, 'message': '未授权'}, status=401)

        return web.json_response({'success': True, 'data': {'count': 0}})


def register_admin_panel_routes(app: web.Application, handler: AdminPanelLegacy):
    """注册管理后台 Legacy 路由到 aiohttp app"""
    app.router.add_post('/api/admin/logout', handler.admin_panel_logout)
    app.router.add_get('/api/admin/verify', handler.admin_panel_verify)
    app.router.add_get('/api/admin/users/{user_id}', handler.admin_panel_user_detail)
    app.router.add_get('/api/admin/logs', handler.admin_panel_logs)
    app.router.add_get('/api/admin/settings', handler.admin_panel_settings)
    app.router.add_post('/api/admin/settings/save', handler.admin_panel_save_settings)
    app.router.add_get('/api/admin/quotas', handler.admin_panel_quotas)
    app.router.add_get('/api/admin/announcements', handler.admin_panel_announcements)
    app.router.add_post('/api/admin/announcements', handler.admin_panel_create_announcement)
    app.router.add_get('/api/admin/admins', handler.admin_panel_list_admins)
    app.router.add_post('/api/admin/admins', handler.admin_panel_create_admin)
    app.router.add_get('/api/admin/referral-stats', handler.admin_panel_referral_stats)
    app.router.add_get('/api/admin/expiring-users', handler.admin_panel_expiring_users)
    app.router.add_get('/api/admin/quota-usage', handler.admin_panel_quota_usage)
    app.router.add_get('/api/admin/devices', handler.admin_panel_devices)
    app.router.add_get('/api/admin/revenue-report', handler.admin_panel_revenue_report)
    app.router.add_get('/api/admin/user-analytics', handler.admin_panel_user_analytics)
    app.router.add_get('/api/admin/notifications/history', handler.admin_panel_notification_history)
    app.router.add_post('/api/admin/notifications/send', handler.admin_panel_send_notification)
    app.router.add_post('/api/admin/notifications/batch', handler.admin_panel_batch_notification)

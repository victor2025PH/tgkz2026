"""
TG-Matrix License Server API
卡密在線驗證服務器

功能：
- 卡密驗證和激活
- 機器碼綁定
- 心跳檢測
- 防重複使用
- 用量統計
"""

import json
import hashlib
import secrets
import time
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, asdict
import asyncio
import aiohttp
from aiohttp import web
import jwt

# JWT 密鑰（生產環境應從環境變量讀取）
JWT_SECRET = "tg-matrix-license-secret-2026"
JWT_ALGORITHM = "HS256"

# 數據庫路徑
DB_PATH = Path(__file__).parent / "data" / "license_server.db"


class LicenseDatabase:
    """卡密數據庫管理"""
    
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """初始化數據庫表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 卡密表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                type_code TEXT NOT NULL,
                level TEXT NOT NULL,
                duration_days INTEGER NOT NULL,
                price REAL DEFAULT 0,
                status TEXT DEFAULT 'unused',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP,
                expires_at TIMESTAMP,
                machine_id TEXT,
                email TEXT,
                batch_id TEXT,
                notes TEXT
            )
        ''')
        
        # 激活記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                ip_address TEXT,
                activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_heartbeat TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (license_key) REFERENCES licenses(license_key)
            )
        ''')
        
        # 心跳記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS heartbeats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usage_data TEXT,
                FOREIGN KEY (license_key) REFERENCES licenses(license_key)
            )
        ''')
        
        # 用戶表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                machine_id TEXT,
                invite_code TEXT UNIQUE,
                invited_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP,
                total_spent REAL DEFAULT 0,
                membership_level TEXT DEFAULT 'free'
            )
        ''')
        
        # 支付記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE NOT NULL,
                user_email TEXT,
                machine_id TEXT,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'CNY',
                payment_method TEXT,
                license_key TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP,
                gateway_response TEXT
            )
        ''')
        
        # 統計表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stats_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                new_users INTEGER DEFAULT 0,
                new_activations INTEGER DEFAULT 0,
                new_payments INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                trial_to_paid INTEGER DEFAULT 0,
                churn_count INTEGER DEFAULT 0
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ============ 卡密操作 ============
    
    def create_license(self, license_key: str, type_code: str, level: str, 
                       duration_days: int, price: float = 0, 
                       batch_id: str = "", notes: str = "") -> bool:
        """創建卡密"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO licenses (license_key, type_code, level, duration_days, price, batch_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (license_key, type_code, level, duration_days, price, batch_id, notes))
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False
    
    def validate_license(self, license_key: str) -> Tuple[bool, str, Optional[Dict]]:
        """驗證卡密"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM licenses WHERE license_key = ?', (license_key,))
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
    
    def activate_license(self, license_key: str, machine_id: str, 
                        email: str = "", ip_address: str = "") -> Tuple[bool, str, Optional[Dict]]:
        """激活卡密"""
        valid, message, license_data = self.validate_license(license_key)
        
        if not valid:
            return False, message, license_data
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        now = datetime.now()
        expires_at = now + timedelta(days=license_data['duration_days'])
        
        # 更新卡密狀態
        cursor.execute('''
            UPDATE licenses SET 
                status = 'used',
                used_at = ?,
                expires_at = ?,
                machine_id = ?,
                email = ?
            WHERE license_key = ?
        ''', (now.isoformat(), expires_at.isoformat(), machine_id, email, license_key))
        
        # 記錄激活
        cursor.execute('''
            INSERT INTO activations (license_key, machine_id, ip_address)
            VALUES (?, ?, ?)
        ''', (license_key, machine_id, ip_address))
        
        # 更新或創建用戶
        cursor.execute('SELECT * FROM users WHERE machine_id = ?', (machine_id,))
        user = cursor.fetchone()
        
        if user:
            cursor.execute('''
                UPDATE users SET 
                    email = COALESCE(?, email),
                    last_seen = ?,
                    total_spent = total_spent + ?,
                    membership_level = ?
                WHERE machine_id = ?
            ''', (email, now.isoformat(), license_data['price'], license_data['level'], machine_id))
        else:
            invite_code = secrets.token_hex(4).upper()
            cursor.execute('''
                INSERT INTO users (email, machine_id, invite_code, membership_level)
                VALUES (?, ?, ?, ?)
            ''', (email, machine_id, invite_code, license_data['level']))
        
        # 更新統計
        today = now.strftime('%Y-%m-%d')
        cursor.execute('SELECT * FROM stats_daily WHERE date = ?', (today,))
        if cursor.fetchone():
            cursor.execute('''
                UPDATE stats_daily SET 
                    new_activations = new_activations + 1,
                    revenue = revenue + ?
                WHERE date = ?
            ''', (license_data['price'], today))
        else:
            cursor.execute('''
                INSERT INTO stats_daily (date, new_activations, revenue)
                VALUES (?, 1, ?)
            ''', (today, license_data['price']))
        
        conn.commit()
        
        # 獲取更新後的數據
        cursor.execute('SELECT * FROM licenses WHERE license_key = ?', (license_key,))
        updated_license = dict(cursor.fetchone())
        
        conn.close()
        
        return True, f"激活成功，有效期至 {expires_at.strftime('%Y-%m-%d')}", updated_license
    
    def check_heartbeat(self, license_key: str, machine_id: str, 
                       usage_data: Dict = None) -> Tuple[bool, str, Optional[Dict]]:
        """心跳檢測"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 獲取卡密信息
        cursor.execute('SELECT * FROM licenses WHERE license_key = ?', (license_key,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return False, "卡密不存在", None
        
        license_data = dict(row)
        
        # 檢查是否過期
        if license_data['expires_at']:
            expires_at = datetime.fromisoformat(license_data['expires_at'])
            if datetime.now() > expires_at:
                cursor.execute('UPDATE licenses SET status = ? WHERE license_key = ?', 
                             ('expired', license_key))
                conn.commit()
                conn.close()
                return False, "會員已過期", license_data
        
        # 檢查機器碼是否匹配
        if license_data['machine_id'] and license_data['machine_id'] != machine_id:
            conn.close()
            return False, "機器碼不匹配", None
        
        # 記錄心跳
        now = datetime.now()
        cursor.execute('''
            INSERT INTO heartbeats (license_key, machine_id, usage_data)
            VALUES (?, ?, ?)
        ''', (license_key, machine_id, json.dumps(usage_data) if usage_data else None))
        
        # 更新最後心跳時間
        cursor.execute('''
            UPDATE activations SET last_heartbeat = ?
            WHERE license_key = ? AND machine_id = ?
        ''', (now.isoformat(), license_key, machine_id))
        
        conn.commit()
        conn.close()
        
        return True, "心跳成功", license_data
    
    # ============ 統計查詢 ============
    
    def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """獲取統計數據"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 總計
        cursor.execute('SELECT COUNT(*) as total FROM licenses')
        total_licenses = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE status = 'unused'")
        unused_licenses = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE status = 'used'")
        used_licenses = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total_users = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM users WHERE membership_level != 'free'")
        paid_users = cursor.fetchone()['total']
        
        cursor.execute('SELECT SUM(price) as total FROM licenses WHERE status = ?', ('used',))
        row = cursor.fetchone()
        total_revenue = row['total'] or 0
        
        # 每日數據
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT * FROM stats_daily 
            WHERE date >= ? 
            ORDER BY date ASC
        ''', (start_date,))
        daily_stats = [dict(row) for row in cursor.fetchall()]
        
        # 會員等級分布
        cursor.execute('''
            SELECT membership_level, COUNT(*) as count 
            FROM users 
            GROUP BY membership_level
        ''')
        level_distribution = {row['membership_level']: row['count'] for row in cursor.fetchall()}
        
        conn.close()
        
        return {
            'total_licenses': total_licenses,
            'unused_licenses': unused_licenses,
            'used_licenses': used_licenses,
            'total_users': total_users,
            'paid_users': paid_users,
            'total_revenue': total_revenue,
            'conversion_rate': (paid_users / total_users * 100) if total_users > 0 else 0,
            'daily_stats': daily_stats,
            'level_distribution': level_distribution
        }


class LicenseServer:
    """卡密驗證服務器"""
    
    def __init__(self, host: str = '0.0.0.0', port: int = 8080):
        self.host = host
        self.port = port
        self.db = LicenseDatabase()
        self.app = web.Application()
        self._setup_routes()
    
    def _setup_routes(self):
        """設置路由"""
        # 公開 API
        self.app.router.add_post('/api/license/validate', self.handle_validate)
        self.app.router.add_post('/api/license/activate', self.handle_activate)
        self.app.router.add_post('/api/license/heartbeat', self.handle_heartbeat)
        self.app.router.add_get('/api/stats', self.handle_stats)
        self.app.router.add_post('/api/payment/create', self.handle_create_payment)
        self.app.router.add_post('/api/payment/callback', self.handle_payment_callback)
        self.app.router.add_get('/api/health', self.handle_health)
        
        # 管理員 API
        self.app.router.add_get('/api/admin/dashboard', self.handle_admin_dashboard)
        self.app.router.add_get('/api/admin/users', self.handle_admin_users)
        self.app.router.add_get('/api/admin/licenses', self.handle_admin_licenses)
        self.app.router.add_get('/api/admin/orders', self.handle_admin_orders)
        self.app.router.add_post('/api/admin/licenses/generate', self.handle_admin_generate)
        self.app.router.add_post('/api/admin/licenses/disable', self.handle_admin_disable)
        self.app.router.add_post('/api/admin/settings/save', self.handle_admin_save_settings)
        self.app.router.add_get('/api/admin/settings', self.handle_admin_get_settings)
    
    def _generate_token(self, license_key: str, machine_id: str, expires_in: int = 86400) -> str:
        """生成 JWT token"""
        payload = {
            'license_key': license_key,
            'machine_id': machine_id,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def _verify_token(self, token: str) -> Optional[Dict]:
        """驗證 JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _get_client_ip(self, request: web.Request) -> str:
        """獲取客戶端 IP"""
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.remote or 'unknown'
    
    async def handle_validate(self, request: web.Request) -> web.Response:
        """驗證卡密"""
        try:
            data = await request.json()
            license_key = data.get('license_key', '').upper()
            
            if not license_key:
                return web.json_response({'success': False, 'message': '缺少卡密'}, status=400)
            
            valid, message, license_data = self.db.validate_license(license_key)
            
            return web.json_response({
                'success': valid,
                'message': message,
                'data': {
                    'level': license_data.get('level') if license_data else None,
                    'duration_days': license_data.get('duration_days') if license_data else None,
                    'status': license_data.get('status') if license_data else None
                } if license_data else None
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_activate(self, request: web.Request) -> web.Response:
        """激活卡密"""
        try:
            data = await request.json()
            license_key = data.get('license_key', '').upper()
            machine_id = data.get('machine_id', '')
            email = data.get('email', '')
            
            if not license_key or not machine_id:
                return web.json_response({'success': False, 'message': '缺少必要參數'}, status=400)
            
            ip_address = self._get_client_ip(request)
            
            success, message, license_data = self.db.activate_license(
                license_key, machine_id, email, ip_address
            )
            
            response_data = {
                'success': success,
                'message': message,
            }
            
            if success and license_data:
                # 生成 token
                token = self._generate_token(license_key, machine_id)
                response_data['data'] = {
                    'token': token,
                    'level': license_data.get('level'),
                    'expires_at': license_data.get('expires_at'),
                    'duration_days': license_data.get('duration_days')
                }
            
            return web.json_response(response_data)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_heartbeat(self, request: web.Request) -> web.Response:
        """心跳檢測"""
        try:
            data = await request.json()
            license_key = data.get('license_key', '').upper()
            machine_id = data.get('machine_id', '')
            token = data.get('token', '')
            usage_data = data.get('usage', {})
            
            # 優先使用 token 驗證
            if token:
                payload = self._verify_token(token)
                if not payload:
                    return web.json_response({'success': False, 'message': 'Token 無效或已過期'}, status=401)
                license_key = payload.get('license_key')
                machine_id = payload.get('machine_id')
            
            if not license_key or not machine_id:
                return web.json_response({'success': False, 'message': '缺少必要參數'}, status=400)
            
            success, message, license_data = self.db.check_heartbeat(
                license_key, machine_id, usage_data
            )
            
            response_data = {
                'success': success,
                'message': message,
            }
            
            if success and license_data:
                # 刷新 token
                new_token = self._generate_token(license_key, machine_id)
                response_data['data'] = {
                    'token': new_token,
                    'level': license_data.get('level'),
                    'expires_at': license_data.get('expires_at'),
                    'status': license_data.get('status')
                }
            
            return web.json_response(response_data)
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_stats(self, request: web.Request) -> web.Response:
        """獲取統計數據"""
        try:
            days = int(request.query.get('days', 30))
            stats = self.db.get_stats(days)
            return web.json_response({'success': True, 'data': stats})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_create_payment(self, request: web.Request) -> web.Response:
        """創建支付訂單"""
        try:
            data = await request.json()
            product_id = data.get('product_id', '')
            email = data.get('email', '')
            machine_id = data.get('machine_id', '')
            payment_method = data.get('payment_method', 'alipay')  # alipay, wechat, stripe, usdt
            
            # 產品價格表
            products = {
                'vip_week': {'price': 49, 'level': 'vip', 'days': 7, 'name': 'VIP 周卡'},
                'vip_month': {'price': 99, 'level': 'vip', 'days': 30, 'name': 'VIP 月卡'},
                'vip_quarter': {'price': 249, 'level': 'vip', 'days': 90, 'name': 'VIP 季卡'},
                'vip_year': {'price': 699, 'level': 'vip', 'days': 365, 'name': 'VIP 年卡'},
                'svip_month': {'price': 299, 'level': 'svip', 'days': 30, 'name': 'SVIP 月卡'},
                'svip_year': {'price': 1999, 'level': 'svip', 'days': 365, 'name': 'SVIP 年卡'},
                'mvp_month': {'price': 999, 'level': 'mvp', 'days': 30, 'name': 'MVP 月卡'},
                'mvp_year': {'price': 6999, 'level': 'mvp', 'days': 365, 'name': 'MVP 年卡'},
            }
            
            if product_id not in products:
                return web.json_response({'success': False, 'message': '無效的產品ID'}, status=400)
            
            product = products[product_id]
            order_id = f"TGM{int(time.time())}{secrets.token_hex(4).upper()}"
            
            # USDT 匯率和計算
            usdt_rate = 7.2  # 1 USDT = 7.2 CNY
            usdt_amount = round(product['price'] / usdt_rate, 2)
            
            # 創建訂單
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO payments (order_id, user_email, machine_id, amount, payment_method)
                VALUES (?, ?, ?, ?, ?)
            ''', (order_id, email, machine_id, product['price'], payment_method))
            conn.commit()
            conn.close()
            
            # 根據支付方式生成不同的支付鏈接
            if payment_method == 'usdt':
                # USDT TRC20 支付
                # TODO: 集成實際的加密貨幣支付網關 (如 CoinPayments, NOWPayments 等)
                usdt_address = "TYourTRC20WalletAddressHere"  # 替換為實際錢包地址
                payment_url = f"https://pay.example.com/crypto?order_id={order_id}&amount={usdt_amount}&currency=USDT&network=TRC20&address={usdt_address}"
            else:
                # 傳統支付方式
                payment_url = f"https://pay.example.com/checkout?order_id={order_id}"
            
            response_data = {
                'order_id': order_id,
                'product': product,
                'payment_url': payment_url,
                'amount': product['price'],
                'currency': 'CNY'
            }
            
            # USDT 額外信息
            if payment_method == 'usdt':
                response_data['usdt'] = {
                    'amount': usdt_amount,
                    'network': 'TRC20',
                    'address': 'TYourTRC20WalletAddressHere',  # 替換為實際錢包地址
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
        try:
            data = await request.json()
            order_id = data.get('order_id', '')
            status = data.get('status', '')
            gateway_response = data.get('gateway_response', {})
            
            # TODO: 驗證支付網關簽名
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 獲取訂單
            cursor.execute('SELECT * FROM payments WHERE order_id = ?', (order_id,))
            order = cursor.fetchone()
            
            if not order:
                conn.close()
                return web.json_response({'success': False, 'message': '訂單不存在'}, status=404)
            
            order_data = dict(order)
            
            if status == 'success':
                # 生成卡密
                from license_generator import LicenseGenerator
                generator = LicenseGenerator()
                
                # 根據金額確定類型
                type_map = {
                    49: 'W', 99: 'V', 249: 'Q', 699: 'Y',
                    299: 'S', 1999: 'S', 999: 'P', 6999: 'P'
                }
                type_code = type_map.get(int(order_data['amount']), 'V')
                
                keys = generator.generate(type_code, 1, f"Payment-{order_id}")
                license_key = keys[0] if keys else None
                
                # 更新訂單
                cursor.execute('''
                    UPDATE payments SET 
                        status = 'paid',
                        paid_at = ?,
                        license_key = ?,
                        gateway_response = ?
                    WHERE order_id = ?
                ''', (datetime.now().isoformat(), license_key, json.dumps(gateway_response), order_id))
                
                # 自動激活
                if license_key and order_data['machine_id']:
                    self.db.activate_license(
                        license_key, 
                        order_data['machine_id'],
                        order_data['user_email']
                    )
                
                conn.commit()
                conn.close()
                
                return web.json_response({
                    'success': True,
                    'message': '支付成功',
                    'data': {'license_key': license_key}
                })
            else:
                cursor.execute('''
                    UPDATE payments SET status = ?, gateway_response = ?
                    WHERE order_id = ?
                ''', (status, json.dumps(gateway_response), order_id))
                conn.commit()
                conn.close()
                
                return web.json_response({'success': False, 'message': '支付失敗'})
                
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_health(self, request: web.Request) -> web.Response:
        """健康檢查"""
        return web.json_response({'status': 'ok', 'timestamp': datetime.now().isoformat()})
    
    # ============ 管理員 API ============
    
    async def handle_admin_dashboard(self, request: web.Request) -> web.Response:
        """管理儀表盤數據"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # 總用戶數
            cursor.execute('SELECT COUNT(*) as total FROM users')
            total_users = cursor.fetchone()['total']
            
            # 今日新增用戶
            today = datetime.now().strftime('%Y-%m-%d')
            cursor.execute('SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = ?', (today,))
            new_users_today = cursor.fetchone()['total']
            
            # 付費用戶
            cursor.execute("SELECT COUNT(*) as total FROM users WHERE membership_level != 'free' AND membership_level != 'bronze'")
            paid_users = cursor.fetchone()['total']
            
            # 總收入
            cursor.execute("SELECT COALESCE(SUM(price), 0) as total FROM licenses WHERE status = 'used'")
            total_revenue = cursor.fetchone()['total']
            
            # 今日收入
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
            level_distribution = {row['membership_level'] or 'bronze': row['count'] for row in cursor.fetchall()}
            
            # 近7天收入趨勢
            revenue_trend = []
            for i in range(6, -1, -1):
                date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                cursor.execute("SELECT COALESCE(SUM(price), 0) as total FROM licenses WHERE status = 'used' AND DATE(used_at) = ?", (date,))
                revenue_trend.append({
                    'date': date,
                    'revenue': cursor.fetchone()['total']
                })
            
            # 卡密分類統計
            license_stats = {}
            levels = [('silver', '白銀精英', '🥈'), ('gold', '黃金大師', '🥇'), 
                     ('diamond', '鑽石王牌', '💎'), ('star', '星耀傳說', '🌟'), ('king', '榮耀王者', '👑')]
            for level, name, icon in levels:
                cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE level = ?", (level,))
                total = cursor.fetchone()['total']
                cursor.execute("SELECT COUNT(*) as total FROM licenses WHERE level = ? AND status = 'unused'", (level,))
                unused = cursor.fetchone()['total']
                license_stats[level] = {'name': name, 'icon': icon, 'total': total, 'unused': unused}
            
            conn.close()
            
            return web.json_response({
                'success': True,
                'data': {
                    'stats': {
                        'totalUsers': total_users,
                        'newUsersToday': new_users_today,
                        'paidUsers': paid_users,
                        'conversionRate': round((paid_users / total_users * 100) if total_users > 0 else 0, 1),
                        'totalRevenue': total_revenue,
                        'revenueToday': revenue_today,
                        'totalLicenses': total_licenses,
                        'unusedLicenses': unused_licenses
                    },
                    'levelDistribution': level_distribution,
                    'revenueTrend': revenue_trend,
                    'licenseStats': license_stats
                }
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_users(self, request: web.Request) -> web.Response:
        """獲取所有用戶"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT u.*, 
                    (SELECT MAX(expires_at) FROM licenses l WHERE l.machine_id = u.machine_id) as expires_at
                FROM users u 
                ORDER BY u.created_at DESC
                LIMIT 500
            ''')
            
            users = []
            for row in cursor.fetchall():
                user = dict(row)
                users.append({
                    'id': user['id'],
                    'email': user['email'],
                    'machineId': user['machine_id'],
                    'level': user['membership_level'] or 'bronze',
                    'expiresAt': user.get('expires_at'),
                    'totalSpent': user['total_spent'] or 0,
                    'createdAt': user['created_at'],
                    'inviteCode': user['invite_code']
                })
            
            conn.close()
            
            return web.json_response({'success': True, 'data': users})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_licenses(self, request: web.Request) -> web.Response:
        """獲取所有卡密"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM licenses ORDER BY created_at DESC LIMIT 1000')
            
            licenses = []
            level_names = {
                'silver': '🥈 白銀月卡', 'gold': '🥇 黃金月卡',
                'diamond': '💎 鑽石月卡', 'star': '🌟 星耀月卡', 'king': '👑 王者月卡'
            }
            
            for row in cursor.fetchall():
                lic = dict(row)
                days = lic['duration_days']
                duration_suffix = '周卡' if days == 7 else '月卡' if days == 30 else '季卡' if days == 90 else '年卡'
                level_icon = {'silver': '🥈', 'gold': '🥇', 'diamond': '💎', 'star': '🌟', 'king': '👑'}.get(lic['level'], '🎫')
                level_name = {'silver': '白銀', 'gold': '黃金', 'diamond': '鑽石', 'star': '星耀', 'king': '王者'}.get(lic['level'], lic['level'])
                
                licenses.append({
                    'key': lic['license_key'],
                    'typeName': f"{level_icon} {level_name}{duration_suffix}",
                    'level': lic['level'],
                    'days': days,
                    'price': lic['price'] or 0,
                    'status': lic['status'],
                    'createdAt': lic['created_at'][:10] if lic['created_at'] else '',
                    'usedAt': lic['used_at'][:10] if lic['used_at'] else None
                })
            
            conn.close()
            
            return web.json_response({'success': True, 'data': licenses})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_orders(self, request: web.Request) -> web.Response:
        """獲取所有訂單"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM payments ORDER BY created_at DESC LIMIT 500')
            
            orders = []
            for row in cursor.fetchall():
                order = dict(row)
                orders.append({
                    'id': order['id'],
                    'orderId': order['order_id'],
                    'productName': f"會員卡 ¥{order['amount']}",
                    'amount': order['amount'],
                    'paymentMethod': order['payment_method'] or '未知',
                    'status': order['status'],
                    'createdAt': order['created_at']
                })
            
            conn.close()
            
            return web.json_response({'success': True, 'data': orders})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_generate(self, request: web.Request) -> web.Response:
        """生成卡密"""
        try:
            data = await request.json()
            level_code = data.get('level', 'G')  # B, G, D, S, K
            duration_code = data.get('duration', '2')  # 1, 2, 3, Y
            count = min(int(data.get('count', 10)), 100)  # 最多100個
            notes = data.get('notes', '')
            
            # 等級映射
            levels = {'B': 'silver', 'G': 'gold', 'D': 'diamond', 'S': 'star', 'K': 'king'}
            durations = {'1': 7, '2': 30, '3': 90, 'Y': 365}
            prices = {
                'B': {'1': 15, '2': 49, '3': 129, 'Y': 399},
                'G': {'1': 29, '2': 99, '3': 249, 'Y': 799},
                'D': {'1': 59, '2': 199, '3': 499, 'Y': 1599},
                'S': {'1': 119, '2': 399, '3': 999, 'Y': 2999},
                'K': {'1': 299, '2': 999, '3': 2499, 'Y': 6999}
            }
            
            level = levels.get(level_code, 'gold')
            days = durations.get(duration_code, 30)
            price = prices.get(level_code, {}).get(duration_code, 99)
            type_code = f"{level_code}{duration_code}"
            batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            generated = []
            for _ in range(count):
                key = f"TGM-{type_code}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
                if self.db.create_license(key, type_code, level, days, price, batch_id, notes):
                    generated.append(key)
            
            return web.json_response({
                'success': True,
                'message': f'成功生成 {len(generated)} 個卡密',
                'data': {'keys': generated, 'batchId': batch_id}
            })
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_disable(self, request: web.Request) -> web.Response:
        """禁用卡密"""
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
            
            return web.json_response({'success': True, 'message': '卡密已禁用'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_save_settings(self, request: web.Request) -> web.Response:
        """保存系統設置"""
        try:
            data = await request.json()
            # TODO: 保存到配置文件或數據庫
            return web.json_response({'success': True, 'message': '設置已保存'})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    async def handle_admin_get_settings(self, request: web.Request) -> web.Response:
        """獲取系統設置"""
        try:
            # TODO: 從配置文件或數據庫讀取
            settings = {
                'prices': {
                    'silver': {'name': '🥈 白銀精英', 'monthly': 49},
                    'gold': {'name': '🥇 黃金大師', 'monthly': 99},
                    'diamond': {'name': '💎 鑽石王牌', 'monthly': 199},
                    'star': {'name': '🌟 星耀傳說', 'monthly': 399},
                    'king': {'name': '👑 榮耀王者', 'monthly': 999}
                },
                'payment': {
                    'alipayAppId': '',
                    'wechatMchId': '',
                    'usdtAddress': ''
                }
            }
            return web.json_response({'success': True, 'data': settings})
        except Exception as e:
            return web.json_response({'success': False, 'message': str(e)}, status=500)
    
    def run(self):
        """啟動服務器"""
        print(f"🚀 License Server starting on http://{self.host}:{self.port}")
        web.run_app(self.app, host=self.host, port=self.port)


# ============ 客戶端 SDK ============

class LicenseClient:
    """卡密驗證客戶端"""
    
    def __init__(self, server_url: str = "http://localhost:8080"):
        self.server_url = server_url.rstrip('/')
        self._token: Optional[str] = None
        self._license_key: Optional[str] = None
        self._machine_id: Optional[str] = None
    
    async def validate(self, license_key: str) -> Tuple[bool, str, Optional[Dict]]:
        """驗證卡密"""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.server_url}/api/license/validate",
                    json={'license_key': license_key}
                ) as resp:
                    result = await resp.json()
                    return result.get('success', False), result.get('message', ''), result.get('data')
            except Exception as e:
                return False, f"連接服務器失敗: {e}", None
    
    async def activate(self, license_key: str, machine_id: str, 
                      email: str = "") -> Tuple[bool, str, Optional[Dict]]:
        """激活卡密"""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.server_url}/api/license/activate",
                    json={
                        'license_key': license_key,
                        'machine_id': machine_id,
                        'email': email
                    }
                ) as resp:
                    result = await resp.json()
                    
                    if result.get('success'):
                        data = result.get('data', {})
                        self._token = data.get('token')
                        self._license_key = license_key
                        self._machine_id = machine_id
                    
                    return result.get('success', False), result.get('message', ''), result.get('data')
            except Exception as e:
                return False, f"連接服務器失敗: {e}", None
    
    async def heartbeat(self, usage_data: Dict = None) -> Tuple[bool, str, Optional[Dict]]:
        """心跳檢測"""
        if not self._token and not (self._license_key and self._machine_id):
            return False, "未激活", None
        
        async with aiohttp.ClientSession() as session:
            try:
                payload = {'usage': usage_data or {}}
                
                if self._token:
                    payload['token'] = self._token
                else:
                    payload['license_key'] = self._license_key
                    payload['machine_id'] = self._machine_id
                
                async with session.post(
                    f"{self.server_url}/api/license/heartbeat",
                    json=payload
                ) as resp:
                    result = await resp.json()
                    
                    if result.get('success'):
                        data = result.get('data', {})
                        self._token = data.get('token', self._token)
                    
                    return result.get('success', False), result.get('message', ''), result.get('data')
            except Exception as e:
                return False, f"連接服務器失敗: {e}", None


# ============ 命令行 ============

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='TG-Matrix License Server')
    parser.add_argument('command', choices=['run', 'init', 'stats'], help='命令')
    parser.add_argument('--host', default='0.0.0.0', help='綁定地址')
    parser.add_argument('--port', type=int, default=8080, help='端口')
    
    args = parser.parse_args()
    
    if args.command == 'run':
        server = LicenseServer(args.host, args.port)
        server.run()
    elif args.command == 'init':
        db = LicenseDatabase()
        print("✅ 數據庫初始化完成")
    elif args.command == 'stats':
        db = LicenseDatabase()
        stats = db.get_stats()
        print("\n📊 統計數據")
        print(f"  總卡密: {stats['total_licenses']}")
        print(f"  未使用: {stats['unused_licenses']}")
        print(f"  已使用: {stats['used_licenses']}")
        print(f"  總用戶: {stats['total_users']}")
        print(f"  付費用戶: {stats['paid_users']}")
        print(f"  轉化率: {stats['conversion_rate']:.1f}%")
        print(f"  總收入: ¥{stats['total_revenue']:.2f}")


if __name__ == '__main__':
    main()

"""
TG-AI智控王 數據庫模塊
完整的數據庫架構，支持六級會員系統、邀請獎勵、配額管理等

表結構：
- users: 用戶表
- licenses: 卡密表
- orders: 訂單表
- referrals: 邀請記錄表
- user_quotas: 用戶配額表
- usage_logs: 使用日誌表
- devices: 設備表
- settings: 系統設置表
- admin_logs: 管理員操作日誌表
- announcements: 公告表
"""

import sqlite3
import secrets
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# 異步數據庫支持（用於遷移系統）
try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False
    aiosqlite = None

# 數據庫路徑
DB_PATH = Path(__file__).parent / "data" / "tgai_server.db"
# 帳號管理數據庫路徑（TG-Matrix 主數據庫）
ACCOUNTS_DB_PATH = Path(__file__).parent / "data" / "tgmatrix.db"


# ============ 會員等級配置 (價格單位: USDT) ============
# 基於市場分析的定價策略：
# - 入門價格低門檻 ($4.99) 吸引轉化
# - 黃金級別為主力營收產品 ($19.9)
# - 高級別強調功能價值差異
# - 年付享受約17%折扣，終身約為年付的2.5倍
MEMBERSHIP_LEVELS = {
    'bronze': {
        'name': '青銅戰士',
        'name_en': 'Bronze Warrior',
        'icon': '⚔️',
        'color': '#CD7F32',
        'order': 0,
        'prices': {'week': 0, 'month': 0, 'quarter': 0, 'year': 0, 'lifetime': 0},
        'quotas': {
            'tg_accounts': 2,
            'daily_messages': 20,
            'ai_calls': 10,
            'devices': 1,
            'groups': 3,
            'auto_reply_rules': 1,
            'scheduled_tasks': 0,
            'data_retention_days': 7,
            'platform_api_quota': 0,
            'platform_api_max_accounts': 0
        },
        'features': ['basic_messaging', 'manual_reply']
    },
    'silver': {
        'name': '白銀精英',
        'name_en': 'Silver Elite',
        'icon': '🥈',
        'color': '#C0C0C0',
        'order': 1,
        # 入門級：低價策略吸引首次付費
        'prices': {'week': 1.99, 'month': 4.99, 'quarter': 12.99, 'year': 49.9, 'lifetime': 129},
        'quotas': {
            'tg_accounts': 5,
            'daily_messages': 100,
            'ai_calls': 50,
            'devices': 2,
            'groups': 10,
            'auto_reply_rules': 5,
            'scheduled_tasks': 10,
            'data_retention_days': 30,
            'platform_api_quota': 1,
            'platform_api_max_accounts': 3
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send', 'ad_broadcast']
    },
    'gold': {
        'name': '黃金大師',
        'name_en': 'Gold Master',
        'icon': '🥇',
        'color': '#FFD700',
        'order': 2,
        # 主力產品：性價比最高，功能完整
        'prices': {'week': 6.99, 'month': 19.9, 'quarter': 49.9, 'year': 199, 'lifetime': 499},
        'quotas': {
            'tg_accounts': 15,
            'daily_messages': 500,
            'ai_calls': 300,
            'devices': 3,
            'groups': 50,
            'auto_reply_rules': 20,
            'scheduled_tasks': 30,
            'data_retention_days': 60,
            'platform_api_quota': 3,
            'platform_api_max_accounts': 9
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply']
    },
    'diamond': {
        'name': '鑽石王牌',
        'name_en': 'Diamond Ace',
        'icon': '💎',
        'color': '#B9F2FF',
        'order': 3,
        # 專業級：高級功能解鎖
        'prices': {'week': 19.9, 'month': 59.9, 'quarter': 149, 'year': 599, 'lifetime': 1499},
        'quotas': {
            'tg_accounts': 50,
            'daily_messages': 2000,
            'ai_calls': -1,  # 無限
            'devices': 5,
            'groups': 200,
            'auto_reply_rules': -1,
            'scheduled_tasks': 100,
            'data_retention_days': 90,
            'platform_api_quota': 10,
            'platform_api_max_accounts': 30
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply',
                     'smart_routing', 'analytics', 'multi_role', 'ai_sales_funnel', 'advanced_analytics']
    },
    'star': {
        'name': '星耀傳說',
        'name_en': 'Star Legend',
        'icon': '🌟',
        'color': '#9B59B6',
        'order': 4,
        # 團隊級：適合代理商和團隊
        'prices': {'week': 59.9, 'month': 199, 'quarter': 499, 'year': 1999, 'lifetime': 4999},
        'quotas': {
            'tg_accounts': 100,
            'daily_messages': -1,  # 無限
            'ai_calls': -1,
            'devices': 10,
            'groups': -1,
            'auto_reply_rules': -1,
            'scheduled_tasks': -1,
            'data_retention_days': 180,
            'platform_api_quota': 30,
            'platform_api_max_accounts': 90
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply',
                     'smart_routing', 'analytics', 'multi_role', 'ai_sales_funnel', 'advanced_analytics',
                     'smart_anti_block', 'team_management', 'priority_support']
    },
    'king': {
        'name': '榮耀王者',
        'name_en': 'Glory King',
        'icon': '👑',
        'color': '#FF6B6B',
        'order': 5,
        # 企業級：無限一切 + 專屬服務
        'prices': {'week': 199, 'month': 599, 'quarter': 1499, 'year': 5999, 'lifetime': 14999},
        'quotas': {
            'tg_accounts': -1,  # 無限
            'daily_messages': -1,
            'ai_calls': -1,
            'devices': -1,
            'groups': -1,
            'auto_reply_rules': -1,
            'scheduled_tasks': -1,
            'data_retention_days': 365,
            'platform_api_quota': -1,  # 無限（專屬池）
            'platform_api_max_accounts': -1
        },
        'features': ['all']  # 所有功能
    }
}

# 邀請獎勵配置 (現金獎勵單位: USDT)
REFERRAL_REWARDS = {
    'register': {  # 邀請人註冊獎勵
        'inviter_days': 3,  # 邀請者獲得會員天數
        'invitee_days': 1   # 被邀請者獲得會員天數
    },
    'first_payment': {  # 首次付費獎勵
        'silver': {'inviter_days': 7, 'inviter_cash': 1},
        'gold': {'inviter_days': 15, 'inviter_cash': 3},
        'diamond': {'inviter_days': 30, 'inviter_cash': 10},
        'star': {'inviter_days': 45, 'inviter_cash': 30},
        'king': {'inviter_days': 60, 'inviter_cash': 100}
    },
    'repeat_payment': {  # 重複付費返傭
        'commission_rate': 0.10  # 10% 返傭
    }
}


class Database:
    """數據庫管理類"""
    
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection: Optional[Any] = None  # 異步連接（用於遷移）
        self._init_db()
    
    async def connect(self):
        """建立異步連接（用於遷移系統）"""
        if not HAS_AIOSQLITE:
            raise ImportError("aiosqlite is required for async database operations. Install it with: pip install aiosqlite")
        if self._connection is None:
            self._connection = await aiosqlite.connect(str(self.db_path))
            self._connection.row_factory = aiosqlite.Row
    
    async def initialize(self):
        """異步初始化（用於遷移系統）"""
        await self.connect()
        # 異步初始化邏輯（如果需要）
    
    async def close(self):
        """關閉異步連接"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    def get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _migrate_db(self):
        """數據庫遷移：添加缺失的字段"""
        import sys
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # 檢查 admins 表是否有 last_login_ip 字段
            cursor.execute("PRAGMA table_info(admins)")
            columns = [col[1] for col in cursor.fetchall()]

            if 'last_login_ip' not in columns:
                print("[Database] Adding column: admins.last_login_ip", file=sys.stderr)
                cursor.execute('ALTER TABLE admins ADD COLUMN last_login_ip TEXT')
                conn.commit()
            
            # 檢查 discovered_resources 表的字段
            cursor.execute("PRAGMA table_info(discovered_resources)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'type_verified' not in columns:
                print("[Database] Adding column: discovered_resources.type_verified", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN type_verified INTEGER DEFAULT 0')
                conn.commit()
            
            if 'details_fetched' not in columns:
                print("[Database] Adding column: discovered_resources.details_fetched", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN details_fetched INTEGER DEFAULT 0')
                conn.commit()
            
            # 添加監控相關字段
            if 'monitoring_keywords' not in columns:
                print("[Database] Adding column: discovered_resources.monitoring_keywords", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN monitoring_keywords TEXT DEFAULT ""')
                conn.commit()
            
            if 'monitoring_enabled' not in columns:
                print("[Database] Adding column: discovered_resources.monitoring_enabled", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN monitoring_enabled INTEGER DEFAULT 0')
                conn.commit()
            
            # 檢查 monitored_groups 表的字段
            cursor.execute("PRAGMA table_info(monitored_groups)")
            mg_columns = [col[1] for col in cursor.fetchall()]
            
            if mg_columns:  # 表存在
                if 'phone' not in mg_columns:
                    print("[Database] Adding column: monitored_groups.phone", file=sys.stderr)
                    cursor.execute('ALTER TABLE monitored_groups ADD COLUMN phone TEXT')
                    conn.commit()
                
                if 'keywords' not in mg_columns:
                    print("[Database] Adding column: monitored_groups.keywords", file=sys.stderr)
                    cursor.execute('ALTER TABLE monitored_groups ADD COLUMN keywords TEXT DEFAULT ""')
                    conn.commit()
                
                if 'last_active' not in mg_columns:
                    print("[Database] Adding column: monitored_groups.last_active", file=sys.stderr)
                    cursor.execute('ALTER TABLE monitored_groups ADD COLUMN last_active TIMESTAMP')
                    conn.commit()
                
                if 'keyword_set_ids' not in mg_columns:
                    print("[Database] Adding column: monitored_groups.keyword_set_ids", file=sys.stderr)
                    cursor.execute("ALTER TABLE monitored_groups ADD COLUMN keyword_set_ids TEXT DEFAULT '[]'")
                    conn.commit()
            
            # 檢查 extracted_members 表的字段（Lead 意圖評分）
            cursor.execute("PRAGMA table_info(extracted_members)")
            em_columns = [col[1] for col in cursor.fetchall()]
            
            if em_columns:  # 表存在
                if 'intent_score' not in em_columns:
                    print("[Database] Adding column: extracted_members.intent_score", file=sys.stderr)
                    cursor.execute('ALTER TABLE extracted_members ADD COLUMN intent_score INTEGER DEFAULT 0')
                    conn.commit()
                
                if 'intent_level' not in em_columns:
                    print("[Database] Adding column: extracted_members.intent_level", file=sys.stderr)
                    cursor.execute("ALTER TABLE extracted_members ADD COLUMN intent_level TEXT DEFAULT 'none'")
                    conn.commit()
                
                if 'auto_tags' not in em_columns:
                    print("[Database] Adding column: extracted_members.auto_tags", file=sys.stderr)
                    cursor.execute("ALTER TABLE extracted_members ADD COLUMN auto_tags TEXT DEFAULT '[]'")
                    conn.commit()
                
        except Exception as e:
            print(f"[Database] Migration warning: {e}", file=sys.stderr)
        finally:
            conn.close()
    
    def _init_db(self):
        """初始化數據庫表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # ============ 用戶表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                email TEXT,
                phone TEXT,
                nickname TEXT,
                avatar TEXT,
                machine_id TEXT,
                
                -- 會員信息
                membership_level TEXT DEFAULT 'bronze',
                expires_at TIMESTAMP,
                is_lifetime INTEGER DEFAULT 0,
                
                -- 邀請信息
                invite_code TEXT UNIQUE,
                invited_by TEXT,
                total_invites INTEGER DEFAULT 0,
                invite_earnings REAL DEFAULT 0,
                
                -- 財務信息
                total_spent REAL DEFAULT 0,
                balance REAL DEFAULT 0,
                
                -- 狀態
                status TEXT DEFAULT 'active',
                is_banned INTEGER DEFAULT 0,
                ban_reason TEXT,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP,
                last_active_at TIMESTAMP,
                
                -- 索引字段
                FOREIGN KEY (invited_by) REFERENCES users(invite_code)
            )
        ''')
        
        # ============ 卡密表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                
                -- 卡密類型
                type_code TEXT NOT NULL,
                level TEXT NOT NULL,
                duration_type TEXT NOT NULL,
                duration_days INTEGER NOT NULL,
                price REAL DEFAULT 0,
                
                -- 狀態
                status TEXT DEFAULT 'unused',
                
                -- 使用信息
                used_by TEXT,
                used_at TIMESTAMP,
                machine_id TEXT,
                
                -- 有效期
                activated_at TIMESTAMP,
                expires_at TIMESTAMP,
                
                -- 批次信息
                batch_id TEXT,
                notes TEXT,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT DEFAULT 'system',
                
                FOREIGN KEY (used_by) REFERENCES users(user_id)
            )
        ''')
        
        # ============ 訂單表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                
                -- 產品信息
                product_type TEXT NOT NULL,
                product_level TEXT NOT NULL,
                product_duration TEXT NOT NULL,
                product_name TEXT NOT NULL,
                
                -- 金額
                original_price REAL NOT NULL,
                discount_amount REAL DEFAULT 0,
                final_price REAL NOT NULL,
                currency TEXT DEFAULT 'CNY',
                
                -- 支付信息
                payment_method TEXT,
                payment_gateway TEXT,
                transaction_id TEXT,
                
                -- 狀態
                status TEXT DEFAULT 'pending',
                
                -- 關聯
                license_key TEXT,
                coupon_code TEXT,
                referrer_code TEXT,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP,
                expired_at TIMESTAMP,
                refunded_at TIMESTAMP,
                
                -- 元數據
                ip_address TEXT,
                user_agent TEXT,
                gateway_response TEXT,
                
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (license_key) REFERENCES licenses(license_key)
            )
        ''')
        
        # ============ 邀請記錄表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inviter_id TEXT NOT NULL,
                invitee_id TEXT NOT NULL,
                invite_code TEXT NOT NULL,
                
                -- 獎勵信息
                reward_type TEXT NOT NULL,
                inviter_reward_days INTEGER DEFAULT 0,
                inviter_reward_cash REAL DEFAULT 0,
                invitee_reward_days INTEGER DEFAULT 0,
                
                -- 關聯訂單
                order_id TEXT,
                order_amount REAL DEFAULT 0,
                commission_rate REAL DEFAULT 0,
                commission_amount REAL DEFAULT 0,
                
                -- 狀態
                status TEXT DEFAULT 'pending',
                settled_at TIMESTAMP,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (inviter_id) REFERENCES users(user_id),
                FOREIGN KEY (invitee_id) REFERENCES users(user_id),
                FOREIGN KEY (order_id) REFERENCES orders(order_id)
            )
        ''')
        
        # ============ 用戶配額表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_quotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                quota_date TEXT NOT NULL,
                
                -- 配額使用量
                tg_accounts_used INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                ai_calls_used INTEGER DEFAULT 0,
                groups_joined INTEGER DEFAULT 0,
                
                -- 配額限制（從會員等級繼承，可個別調整）
                tg_accounts_limit INTEGER,
                messages_limit INTEGER,
                ai_calls_limit INTEGER,
                groups_limit INTEGER,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(user_id, quota_date),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        ''')
        
        # ============ 使用日誌表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                
                -- 操作信息
                action_type TEXT NOT NULL,
                action_detail TEXT,
                
                -- 資源使用
                resource_type TEXT,
                resource_count INTEGER DEFAULT 1,
                
                -- 設備信息
                device_id TEXT,
                ip_address TEXT,
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        ''')
        
        # ============ 設備表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                
                -- 設備信息
                device_name TEXT,
                device_type TEXT,
                os_name TEXT,
                os_version TEXT,
                app_version TEXT,
                
                -- 狀態
                is_active INTEGER DEFAULT 1,
                is_primary INTEGER DEFAULT 0,
                
                -- 時間
                first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP,
                
                -- IP 記錄
                last_ip TEXT,
                
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        ''')
        
        # ============ 系統設置表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                category TEXT DEFAULT 'general',
                description TEXT,
                is_public INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )
        ''')
        
        # ============ 管理員表 ============
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
                failed_login_count INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 管理員操作日誌表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                username TEXT NOT NULL,
                action TEXT NOT NULL,
                action_type TEXT,
                target_type TEXT,
                target_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (admin_id) REFERENCES admins(id)
            )
        ''')
        
        # ============ 公告表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                announcement_type TEXT DEFAULT 'info',
                priority INTEGER DEFAULT 0,
                
                -- 顯示設置
                is_popup INTEGER DEFAULT 0,
                is_pinned INTEGER DEFAULT 0,
                
                -- 狀態
                status TEXT DEFAULT 'draft',
                
                -- 時間
                publish_at TIMESTAMP,
                expire_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            )
        ''')
        
        # ============ 通知表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                target_level TEXT,
                target_users TEXT,
                sent_count INTEGER DEFAULT 0,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 用戶通知表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                notification_id INTEGER NOT NULL,
                is_read INTEGER DEFAULT 0,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(user_id, notification_id),
                FOREIGN KEY (notification_id) REFERENCES notifications(id)
            )
        ''')
        
        # ============ 優惠券表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coupon_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                
                -- 折扣類型
                discount_type TEXT NOT NULL,
                discount_value REAL NOT NULL,
                
                -- 使用限制
                min_order_amount REAL DEFAULT 0,
                max_discount_amount REAL,
                applicable_levels TEXT,
                applicable_durations TEXT,
                
                -- 數量限制
                total_count INTEGER DEFAULT -1,
                used_count INTEGER DEFAULT 0,
                per_user_limit INTEGER DEFAULT 1,
                
                -- 時間
                start_at TIMESTAMP,
                expire_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- 狀態
                is_active INTEGER DEFAULT 1
            )
        ''')
        
        # ============ 每日統計表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stats_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                
                -- 用戶統計
                new_users INTEGER DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                new_paid_users INTEGER DEFAULT 0,
                
                -- 收入統計
                total_orders INTEGER DEFAULT 0,
                paid_orders INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0,
                refunds REAL DEFAULT 0,
                
                -- 卡密統計
                licenses_generated INTEGER DEFAULT 0,
                licenses_activated INTEGER DEFAULT 0,
                
                -- 邀請統計
                new_referrals INTEGER DEFAULT 0,
                referral_earnings REAL DEFAULT 0,
                
                -- 使用統計
                total_messages INTEGER DEFAULT 0,
                total_ai_calls INTEGER DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 心跳記錄表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS heartbeats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                license_key TEXT,
                machine_id TEXT NOT NULL,
                device_id TEXT,
                ip_address TEXT,
                usage_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (license_key) REFERENCES licenses(license_key)
            )
        ''')
        
        # ============ 激活記錄表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT NOT NULL,
                user_id TEXT,
                machine_id TEXT NOT NULL,
                device_id TEXT,
                ip_address TEXT,
                activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deactivated_at TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                
                FOREIGN KEY (license_key) REFERENCES licenses(license_key),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        ''')
        
        # ============ 資源發現表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS discovered_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_type TEXT NOT NULL,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                title TEXT,
                description TEXT,
                member_count INTEGER DEFAULT 0,
                activity_score REAL DEFAULT 0.5,
                relevance_score REAL DEFAULT 0.5,
                overall_score REAL DEFAULT 0.5,
                discovery_source TEXT DEFAULT 'search',
                discovery_keyword TEXT,
                discovered_by_phone TEXT,
                status TEXT DEFAULT 'discovered',
                is_public INTEGER DEFAULT 1,
                has_discussion INTEGER DEFAULT 0,
                discussion_id TEXT,
                invite_link TEXT,
                join_attempts INTEGER DEFAULT 0,
                last_join_attempt TIMESTAMP,
                joined_at TIMESTAMP,
                joined_by_phone TEXT,
                error_code TEXT,
                error_message TEXT,
                tags TEXT DEFAULT '[]',
                notes TEXT,
                metadata TEXT DEFAULT '{}',
                type_verified INTEGER DEFAULT 0,
                details_fetched INTEGER DEFAULT 0,
                monitoring_keywords TEXT DEFAULT '',
                monitoring_enabled INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 發現關鍵詞表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS discovery_keywords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT UNIQUE NOT NULL,
                category TEXT DEFAULT 'general',
                priority INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1,
                last_searched_at TIMESTAMP,
                total_found INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 資源加入隊列表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resource_join_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_id INTEGER NOT NULL,
                assigned_phone TEXT,
                priority INTEGER DEFAULT 5,
                status TEXT DEFAULT 'pending',
                scheduled_at TIMESTAMP,
                attempted_at TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (resource_id) REFERENCES discovered_resources(id)
            )
        ''')
        
        # ============ 發現日誌表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS discovery_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                search_type TEXT,
                search_query TEXT,
                account_phone TEXT,
                resources_found INTEGER DEFAULT 0,
                resources_new INTEGER DEFAULT 0,
                resources_updated INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                status TEXT DEFAULT 'completed',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # ============ 自定義搜索渠道表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_search_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                query_format TEXT DEFAULT '{keyword}',
                priority TEXT DEFAULT 'backup',
                status TEXT DEFAULT 'unknown',
                enabled INTEGER DEFAULT 1,
                success_count INTEGER DEFAULT 0,
                fail_count INTEGER DEFAULT 0,
                last_test_at TIMESTAMP,
                last_success_at TIMESTAMP,
                avg_response_time REAL DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # ============ 提取成員表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS extracted_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                
                -- 狀態信息
                online_status TEXT DEFAULT 'hidden',
                last_online TIMESTAMP,
                is_bot INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 0,
                
                -- 來源信息
                source_chat_id TEXT,
                source_chat_title TEXT,
                extracted_at TIMESTAMP,
                extracted_by_phone TEXT,
                
                -- 評分
                value_level TEXT DEFAULT 'C',
                activity_score REAL DEFAULT 0.5,
                
                -- 營銷狀態
                contacted INTEGER DEFAULT 0,
                contacted_at TIMESTAMP,
                invited INTEGER DEFAULT 0,
                invited_at TIMESTAMP,
                response_status TEXT DEFAULT 'none',
                
                -- 標籤和備註
                tags TEXT DEFAULT '[]',
                notes TEXT,
                
                -- 所屬群組列表
                groups TEXT DEFAULT '[]',
                
                -- 時間
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 成員提取日誌表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS member_extraction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT,
                chat_title TEXT,
                total_members INTEGER DEFAULT 0,
                extracted_count INTEGER DEFAULT 0,
                online_count INTEGER DEFAULT 0,
                recently_count INTEGER DEFAULT 0,
                new_count INTEGER DEFAULT 0,
                updated_count INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                account_phone TEXT,
                status TEXT DEFAULT 'success',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 營銷活動表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                campaign_type TEXT NOT NULL,
                target_group TEXT,
                message_template TEXT,
                
                -- 統計
                total_targets INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                
                -- 狀態
                status TEXT DEFAULT 'draft',
                
                -- 時間
                scheduled_at TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 活動目標表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS campaign_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                result TEXT,
                executed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id)
            )
        ''')
        
        # ============ 日誌表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 消息隊列表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS message_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                user_id TEXT NOT NULL,
                text TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending',
                scheduled_at TIMESTAMP,
                sent_at TIMESTAMP,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ============ 創建索引 ============
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_machine_id ON users(machine_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_level ON users(membership_level)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_licenses_level ON licenses(level)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at)')
        
        # 資源發現相關索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_resources_telegram_id ON discovered_resources(telegram_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_resources_status ON discovered_resources(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_resources_score ON discovered_resources(overall_score)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_user_id ON extracted_members(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_status ON extracted_members(online_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_value ON extracted_members(value_level)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status)')
        
        # 日誌和消息隊列索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_message_queue_phone ON message_queue(phone)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_message_queue_created ON message_queue(created_at)')
        
        # ============ 初始化默認設置 ============
        default_settings = [
            ('site_name', 'TG-AI智控王', 'string', 'general', '網站名稱'),
            ('site_version', 'v2.0', 'string', 'general', '版本號'),
            ('maintenance_mode', '0', 'boolean', 'general', '維護模式'),
            ('registration_enabled', '1', 'boolean', 'general', '開放註冊'),
            ('usdt_trc20_address', '', 'string', 'payment', 'USDT TRC20 地址'),
            ('usdt_rate', '7.2', 'number', 'payment', 'USDT 匯率'),
            ('alipay_enabled', '0', 'boolean', 'payment', '支付寶開關'),
            ('wechat_enabled', '0', 'boolean', 'payment', '微信支付開關'),
            ('trial_days', '3', 'number', 'membership', '試用天數'),
            ('referral_enabled', '1', 'boolean', 'referral', '邀請獎勵開關'),
        ]
        
        for key, value, type_, category, desc in default_settings:
            cursor.execute('''
                INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, category, description)
                VALUES (?, ?, ?, ?, ?)
            ''', (key, value, type_, category, desc))
        
        # ============ 創建默認管理員 ============
        import hashlib
        admin_password_hash = hashlib.sha256("admin888".encode()).hexdigest()
        cursor.execute('''
            INSERT OR IGNORE INTO admins (username, password_hash, name, role, permissions)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', admin_password_hash, '超級管理員', 'super_admin', json.dumps(['all'])))
        
        conn.commit()
        conn.close()
        
        # 執行數據庫遷移（添加缺失的字段）
        self._migrate_db()
    
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
            price = MEMBERSHIP_LEVELS.get(level, {}).get('prices', {}).get(duration_type, 0)
        
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
                    INSERT INTO users (user_id, machine_id, invite_code, membership_level, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, machine_id, invite_code, license_data['level'], expires_at.isoformat()))
        
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
        level_order = MEMBERSHIP_LEVELS.get(license_data['level'], {}).get('order', 0)
        
        cursor.execute('SELECT membership_level, expires_at FROM users WHERE user_id = ?', (user_id,))
        user_row = cursor.fetchone()
        
        if user_row:
            current_level = user_row['membership_level']
            current_expires = user_row['expires_at']
            current_level_order = MEMBERSHIP_LEVELS.get(current_level, {}).get('order', 0)
            
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
                WHERE user_id = ?
            ''', (new_level, new_expires.isoformat(), 
                  1 if license_data['duration_type'] == 'lifetime' else 0,
                  license_data['price'], now.isoformat(), user_id))
        
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
            level_config = MEMBERSHIP_LEVELS.get(level, {})
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
        rewards = REFERRAL_REWARDS['register']
        
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
            rewards = REFERRAL_REWARDS['first_payment'].get(level, {})
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
            commission_rate = REFERRAL_REWARDS['repeat_payment']['commission_rate']
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
        for level, config in MEMBERSHIP_LEVELS.items():
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
    
    def _get_accounts_db_path(self) -> Path:
        """獲取帳號管理數據庫路徑"""
        return ACCOUNTS_DB_PATH
    
    async def get_account_by_phone(self, phone: str) -> Optional[Dict]:
        """根據電話號碼獲取帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            
            # 標準化電話號碼格式
            phone = str(phone).strip()
            if phone.startswith('+'):
                normalized_phone = '+' + ''.join(c for c in phone[1:] if c.isdigit())
            else:
                normalized_phone = '+' + ''.join(c for c in phone if c.isdigit())
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # 嘗試兩種格式（有 + 和沒有 +）
                cursor.execute('SELECT * FROM accounts WHERE phone = ? OR phone = ?', 
                              (normalized_phone, normalized_phone[1:]))
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                # 嘗試兩種格式（有 + 和沒有 +）
                cursor = await conn.execute('SELECT * FROM accounts WHERE phone = ? OR phone = ?', 
                                           (normalized_phone, normalized_phone[1:]))
                row = await cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            print(f"Error getting account by phone {phone}: {e}")
            return None
    
    async def add_account(self, account_data: Dict[str, Any]) -> int:
        """添加帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            accounts_db_path.parent.mkdir(parents=True, exist_ok=True)

            # 確保 accounts 表存在
            await self._ensure_accounts_table(accounts_db_path)

            # 標準化電話號碼格式（確保有 + 前綴）
            if 'phone' in account_data:
                phone = str(account_data['phone']).strip()
                # 移除所有非數字字符（除了開頭的 +）
                if phone.startswith('+'):
                    phone = '+' + ''.join(c for c in phone[1:] if c.isdigit())
                else:
                    phone = '+' + ''.join(c for c in phone if c.isdigit())
                account_data['phone'] = phone

            # SQL 保留關鍵字需要用方括號轉義
            def escape_column(col):
                reserved_keywords = {'group', 'order', 'select', 'insert', 'update', 'delete', 'from', 'where', 'table', 'index', 'key'}
                if col.lower() in reserved_keywords:
                    return f'[{col}]'
                return col

            # 定義有效的列名（與表結構匹配）
            valid_columns = {
                'phone', 'apiId', 'apiHash', 'proxy', 'group', 'role', 'status',
                'twoFactorPassword', 'deviceModel', 'systemVersion', 'appVersion',
                'langCode', 'platform', 'deviceId', 'proxyType', 'proxyHost',
                'proxyPort', 'proxyUsername', 'proxyPassword', 'proxyCountry',
                'proxyRotationEnabled', 'enableWarmup', 'warmupStatus',
                'dailySendCount', 'dailySendLimit', 'healthScore',
                'nickname', 'notes', 'aiEnabled', 'aiModel', 'aiPersonality',
                'firstName', 'lastName', 'username', 'bio', 'avatarPath', 'telegramId',
                'tags'  # 標籤（JSON 字符串）
            }

            # tags 需要轉換為 JSON 字符串
            if 'tags' in account_data and isinstance(account_data['tags'], list):
                account_data['tags'] = json.dumps(account_data['tags'])

            # 過濾掉不存在的列
            filtered_data = {k: v for k, v in account_data.items() if k in valid_columns}

            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                # 構建插入語句（轉義保留關鍵字）
                columns = list(filtered_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [filtered_data[col] for col in columns]

                cursor.execute(f'''
                    INSERT INTO accounts ({','.join(escaped_columns)})
                    VALUES ({placeholders})
                ''', values)
                conn.commit()
                account_id = cursor.lastrowid
                conn.close()
                return account_id

            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                # 構建插入語句（轉義保留關鍵字）
                columns = list(filtered_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [filtered_data[col] for col in columns]

                cursor = await conn.execute(f'''
                    INSERT INTO accounts ({','.join(escaped_columns)})
                    VALUES ({placeholders})
                ''', values)
                await conn.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error adding account: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    async def get_all_accounts(self) -> List[Dict]:
        """獲取所有帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                # 確保數據庫和表存在
                await self._ensure_accounts_table(accounts_db_path)
                return []
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM accounts ORDER BY id')
                rows = cursor.fetchall()
                conn.close()
                return [dict(row) for row in rows]
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute('SELECT * FROM accounts ORDER BY id')
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error getting all accounts: {e}")
            return []
    
    async def update_account(self, account_id: int, updates: Dict[str, Any]) -> bool:
        """更新帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return False

            # SQL 保留關鍵字需要用方括號轉義
            def escape_column(col):
                reserved_keywords = {'group', 'order', 'select', 'insert', 'update', 'delete', 'from', 'where', 'table', 'index', 'key'}
                if col.lower() in reserved_keywords:
                    return f'[{col}]'
                return col

            # 定義有效的列名（與表結構匹配）
            valid_columns = {
                'phone', 'apiId', 'apiHash', 'proxy', 'group', 'role', 'status',
                'twoFactorPassword', 'deviceModel', 'systemVersion', 'appVersion',
                'langCode', 'platform', 'deviceId', 'proxyType', 'proxyHost',
                'proxyPort', 'proxyUsername', 'proxyPassword', 'proxyCountry',
                'proxyRotationEnabled', 'enableWarmup', 'warmupStatus',
                'dailySendCount', 'dailySendLimit', 'healthScore',
                'nickname', 'notes', 'aiEnabled', 'aiModel', 'aiPersonality',
                'firstName', 'lastName', 'username', 'bio', 'avatarPath', 'telegramId',
                'tags'  # 標籤（JSON 字符串）
            }

            # tags 需要轉換為 JSON 字符串
            if 'tags' in updates and isinstance(updates['tags'], list):
                updates['tags'] = json.dumps(updates['tags'])

            # 過濾掉不存在的列
            filtered_updates = {k: v for k, v in updates.items() if k in valid_columns}
            
            if not filtered_updates:
                return True  # 沒有有效的更新

            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                cursor = conn.cursor()

                set_clause = ','.join([f"{escape_column(k)} = ?" for k in filtered_updates.keys()])
                values = list(filtered_updates.values()) + [account_id]

                cursor.execute(f'''
                    UPDATE accounts SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                conn.commit()
                success = cursor.rowcount > 0
                conn.close()
                return success

            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                set_clause = ','.join([f"{escape_column(k)} = ?" for k in filtered_updates.keys()])
                values = list(filtered_updates.values()) + [account_id]

                cursor = await conn.execute(f'''
                    UPDATE accounts SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating account {account_id}: {e}")
            return False
    
    async def get_account(self, account_id: int) -> Optional[Dict]:
        """根據 ID 獲取帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return None
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM accounts WHERE id = ?', (account_id,))
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute('SELECT * FROM accounts WHERE id = ?', (account_id,))
                row = await cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            print(f"Error getting account {account_id}: {e}")
            return None
    
    async def remove_account(self, account_id: int) -> bool:
        """刪除帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return False
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                cursor = conn.cursor()
                cursor.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
                conn.commit()
                success = cursor.rowcount > 0
                conn.close()
                return success
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                cursor = await conn.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error removing account {account_id}: {e}")
            return False
    
    async def _ensure_accounts_table(self, db_path: Path):
        """確保 accounts 表存在（如果不存在則創建），並自動添加缺失的欄位"""
        try:
            # 注意：[group] 使用方括號轉義，因為 group 是 SQL 保留關鍵字
            create_table_sql = '''
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT UNIQUE NOT NULL,
                    apiId TEXT,
                    apiHash TEXT,
                    proxy TEXT,
                    [group] TEXT,
                    role TEXT DEFAULT 'Unassigned',
                    status TEXT DEFAULT 'Offline',
                    twoFactorPassword TEXT,
                    deviceModel TEXT,
                    systemVersion TEXT,
                    appVersion TEXT,
                    langCode TEXT,
                    platform TEXT,
                    deviceId TEXT,
                    proxyType TEXT,
                    proxyHost TEXT,
                    proxyPort INTEGER,
                    proxyUsername TEXT,
                    proxyPassword TEXT,
                    proxyCountry TEXT,
                    proxyRotationEnabled INTEGER DEFAULT 0,
                    enableWarmup INTEGER DEFAULT 0,
                    warmupStatus TEXT,
                    dailySendCount INTEGER DEFAULT 0,
                    dailySendLimit INTEGER DEFAULT 50,
                    healthScore REAL DEFAULT 100.0,
                    nickname TEXT,
                    notes TEXT,
                    aiEnabled INTEGER DEFAULT 0,
                    aiModel TEXT,
                    aiPersonality TEXT,
                    firstName TEXT,
                    lastName TEXT,
                    username TEXT,
                    bio TEXT,
                    avatarPath TEXT,
                    telegramId TEXT,
                    tags TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''
            
            # 定義所有需要的欄位（用於自動添加缺失欄位）
            required_columns = [
                ("proxyHost", "TEXT"),
                ("proxyPort", "INTEGER"),
                ("proxyUsername", "TEXT"),
                ("proxyPassword", "TEXT"),
                ("proxyCountry", "TEXT"),
                ("proxyRotationEnabled", "INTEGER DEFAULT 0"),
                ("enableWarmup", "INTEGER DEFAULT 0"),
                ("warmupStatus", "TEXT"),
                ("dailySendCount", "INTEGER DEFAULT 0"),
                ("dailySendLimit", "INTEGER DEFAULT 50"),
                ("healthScore", "REAL DEFAULT 100.0"),
                ("nickname", "TEXT"),
                ("notes", "TEXT"),
                ("aiEnabled", "INTEGER DEFAULT 0"),
                ("aiModel", "TEXT"),
                ("aiPersonality", "TEXT"),
                ("firstName", "TEXT"),
                ("lastName", "TEXT"),
                ("username", "TEXT"),
                ("bio", "TEXT"),
                ("avatarPath", "TEXT"),
                ("telegramId", "TEXT"),
                ("tags", "TEXT"),
            ]
            
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute(create_table_sql)
                conn.commit()
                
                # 檢查並添加缺失的欄位
                cursor.execute("PRAGMA table_info(accounts)")
                existing_columns = {row[1] for row in cursor.fetchall()}
                
                for col_name, col_type in required_columns:
                    if col_name not in existing_columns:
                        try:
                            cursor.execute(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}")
                            print(f"[Database] Added missing column: {col_name}", file=sys.stderr)
                        except Exception as col_err:
                            # 欄位可能已存在
                            pass
                
                conn.commit()
                conn.close()
                return
            
            # 異步方式
            async with aiosqlite.connect(str(db_path)) as conn:
                await conn.execute(create_table_sql)
                await conn.commit()
                
                # 檢查並添加缺失的欄位
                cursor = await conn.execute("PRAGMA table_info(accounts)")
                rows = await cursor.fetchall()
                existing_columns = {row[1] for row in rows}
                
                for col_name, col_type in required_columns:
                    if col_name not in existing_columns:
                        try:
                            await conn.execute(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}")
                            print(f"[Database] Added missing column: {col_name}", file=sys.stderr)
                        except Exception as col_err:
                            # 欄位可能已存在
                            pass
                
                await conn.commit()
        except Exception as e:
            print(f"Error ensuring accounts table: {e}")
    
    # ============ 異步 SQL 執行方法 ============
    
    async def fetch_all(self, query: str, params: tuple = None) -> List[Dict]:
        """異步執行 SQL 查詢並返回所有結果"""
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(self.db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                rows = cursor.fetchall()
                conn.close()
                return [dict(row) for row in rows]
            
            # 異步方式
            await self.connect()
            if params:
                cursor = await self._connection.execute(query, params)
            else:
                cursor = await self._connection.execute(query)
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error in fetch_all: {e}")
            return []
    
    async def fetch_one(self, query: str, params: tuple = None) -> Optional[Dict]:
        """異步執行 SQL 查詢並返回單個結果"""
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(self.db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            await self.connect()
            if params:
                cursor = await self._connection.execute(query, params)
            else:
                cursor = await self._connection.execute(query)
            row = await cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            print(f"Error in fetch_one: {e}")
            return None
    
    async def execute(self, query: str, params: tuple = None) -> int:
        """異步執行 SQL 語句並返回影響的行數"""
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(self.db_path))
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                conn.commit()
                affected = cursor.rowcount
                conn.close()
                return affected
            
            # 異步方式
            await self.connect()
            if params:
                cursor = await self._connection.execute(query, params)
            else:
                cursor = await self._connection.execute(query)
            await self._connection.commit()
            return cursor.rowcount
        except Exception as e:
            print(f"Error in execute: {e}")
            return 0
    
    async def execute_insert(self, query: str, params: tuple = None) -> int:
        """異步執行 INSERT 語句並返回新插入行的 ID"""
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(self.db_path))
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                conn.commit()
                last_id = cursor.lastrowid
                conn.close()
                return last_id
            
            # 異步方式
            await self.connect()
            if params:
                cursor = await self._connection.execute(query, params)
            else:
                cursor = await self._connection.execute(query)
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f"Error in execute_insert: {e}")
            raise e
    
    # ============ 日誌操作 ============
    
    async def add_log(self, message: str, log_type: str = "info") -> Optional[int]:
        """添加日誌"""
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(self.db_path))
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO logs (message, type, timestamp)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                ''', (message, log_type))
                conn.commit()
                log_id = cursor.lastrowid
                conn.close()
                return log_id
            
            # 異步方式
            await self.connect()
            cursor = await self._connection.execute('''
                INSERT INTO logs (message, type, timestamp)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (message, log_type))
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f"Error adding log: {e}")
            return None
    
    async def get_logs(self, limit: int = 100, log_type: str = None) -> List[Dict]:
        """獲取日誌"""
        try:
            if log_type:
                query = 'SELECT * FROM logs WHERE type = ? ORDER BY timestamp DESC LIMIT ?'
                params = (log_type, limit)
            else:
                query = 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?'
                params = (limit,)
            
            return await self.fetch_all(query, params)
        except Exception as e:
            print(f"Error getting logs: {e}")
            return []
    
    async def clear_logs(self) -> bool:
        """清除日誌"""
        try:
            await self.execute('DELETE FROM logs')
            return True
        except Exception as e:
            print(f"Error clearing logs: {e}")
            return False
    
    async def get_recent_logs(self, limit: int = 100) -> List[Dict]:
        """獲取最近的日誌"""
        return await self.get_logs(limit=limit)
    
    # ============ 關鍵詞集操作 ============
    
    async def _ensure_keyword_tables(self):
        """確保關鍵詞相關表存在"""
        try:
            # 關鍵詞集表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS keyword_sets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 關鍵詞表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword_set_id INTEGER NOT NULL,
                    keyword TEXT NOT NULL,
                    match_type TEXT DEFAULT 'contains',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE CASCADE
                )
            ''')
            
            # 監控群組表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS monitored_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    link TEXT,
                    telegram_id TEXT,
                    keyword_set_id INTEGER,
                    keyword_set_ids TEXT DEFAULT '[]',
                    account_phone TEXT,
                    phone TEXT,
                    keywords TEXT DEFAULT '',
                    is_active INTEGER DEFAULT 1,
                    member_count INTEGER DEFAULT 0,
                    last_active TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE SET NULL
                )
            ''')
            
            # 消息模板表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS message_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    is_active INTEGER DEFAULT 1,
                    use_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
        except Exception as e:
            print(f"Error creating keyword tables: {e}")
    
    async def add_keyword_set(self, name: str, description: str = '') -> int:
        """添加關鍵詞集"""
        await self._ensure_keyword_tables()
        try:
            return await self.execute_insert(
                'INSERT INTO keyword_sets (name, description) VALUES (?, ?)',
                (name, description)
            )
        except Exception as e:
            print(f"Error adding keyword set: {e}")
            raise e
    
    async def get_all_keyword_sets(self) -> List[Dict]:
        """獲取所有關鍵詞集"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all('SELECT * FROM keyword_sets ORDER BY created_at DESC')
            # 為每個關鍵詞集添加關鍵詞列表
            result = []
            for row in rows:
                row_dict = dict(row) if hasattr(row, 'keys') else row
                keywords = await self.get_keywords_by_set(row_dict['id'])
                row_dict['keywords'] = keywords
                result.append(row_dict)
            return result
        except Exception as e:
            print(f"Error getting keyword sets: {e}")
            return []
    
    async def get_keyword_set(self, set_id: int) -> Optional[Dict]:
        """獲取單個關鍵詞集"""
        await self._ensure_keyword_tables()
        try:
            row = await self.fetch_one('SELECT * FROM keyword_sets WHERE id = ?', (set_id,))
            if row:
                row_dict = dict(row) if hasattr(row, 'keys') else row
                row_dict['keywords'] = await self.get_keywords_by_set(set_id)
                return row_dict
            return None
        except Exception as e:
            print(f"Error getting keyword set: {e}")
            return None
    
    async def remove_keyword_set(self, set_id: int) -> bool:
        """刪除關鍵詞集"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM keyword_sets WHERE id = ?', (set_id,))
            return True
        except Exception as e:
            print(f"Error removing keyword set: {e}")
            return False
    
    async def add_keyword(self, set_id_or_data, keyword: str = None, is_regex: bool = False) -> int:
        """添加關鍵詞到關鍵詞集
        
        支持兩種調用方式:
        1. add_keyword(set_id, keyword, is_regex) - 直接傳入參數
        2. add_keyword(keyword_data_dict) - 傳入字典
        """
        await self._ensure_keyword_tables()
        try:
            # 處理不同的調用方式
            if isinstance(set_id_or_data, dict):
                # 舊方式：傳入字典
                set_id = set_id_or_data.get('keywordSetId') or set_id_or_data.get('keyword_set_id')
                keyword = set_id_or_data.get('keyword') or set_id_or_data.get('text')
                is_regex = set_id_or_data.get('isRegex', False)
            else:
                # 新方式：直接傳入參數
                set_id = set_id_or_data
            
            match_type = 'regex' if is_regex else 'contains'
            
            return await self.execute_insert(
                'INSERT INTO keywords (keyword_set_id, keyword, match_type) VALUES (?, ?, ?)',
                (set_id, keyword, match_type)
            )
        except Exception as e:
            import sys
            print(f"Error adding keyword: {e}", file=sys.stderr)
            raise e
    
    async def get_keywords_by_set(self, set_id: int) -> List[Dict]:
        """獲取關鍵詞集中的所有關鍵詞"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all(
                'SELECT * FROM keywords WHERE keyword_set_id = ? ORDER BY id',
                (set_id,)
            )
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            print(f"Error getting keywords: {e}")
            return []
    
    async def remove_keyword(self, keyword_id: int) -> bool:
        """刪除關鍵詞"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM keywords WHERE id = ?', (keyword_id,))
            return True
        except Exception as e:
            print(f"Error removing keyword: {e}")
            return False
    
    # ============ 監控群組操作 ============
    
    async def add_group(self, url_or_data, name: str = None, keyword_set_ids: list = None) -> int:
        """添加或更新監控群組
        
        支持兩種調用方式:
        1. add_group(url, name, keyword_set_ids) - 直接傳入參數
        2. add_group(group_data_dict) - 傳入字典
        """
        await self._ensure_keyword_tables()
        import json
        
        # 處理不同的調用方式
        if isinstance(url_or_data, dict):
            # 舊方式：傳入字典
            url = url_or_data.get('link', url_or_data.get('url', ''))
            name = url_or_data.get('name', url)
            keyword_set_ids = url_or_data.get('keywordSetIds', [])
            telegram_id = url_or_data.get('telegramId', '')
            account_phone = url_or_data.get('accountPhone', '')
        else:
            # 新方式：直接傳入參數
            url = url_or_data
            name = name or url
            keyword_set_ids = keyword_set_ids or []
            telegram_id = ''
            account_phone = ''
        
        try:
            # 檢查群組是否已存在
            existing = await self.get_group_by_url(url)
            
            if existing:
                # 更新現有群組的關鍵詞集綁定
                keyword_set_ids_json = json.dumps(keyword_set_ids) if keyword_set_ids else '[]'
                await self.execute('''
                    UPDATE monitored_groups 
                    SET name = ?, keyword_set_ids = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (name, keyword_set_ids_json, existing['id']))
                return existing['id']
            else:
                # 新增群組
                keyword_set_ids_json = json.dumps(keyword_set_ids) if keyword_set_ids else '[]'
                first_keyword_set_id = keyword_set_ids[0] if keyword_set_ids else None
                return await self.execute_insert('''
                    INSERT INTO monitored_groups (name, link, telegram_id, keyword_set_id, keyword_set_ids, account_phone)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    name,
                    url,
                    telegram_id,
                    first_keyword_set_id,
                    keyword_set_ids_json,
                    account_phone
                ))
        except Exception as e:
            import sys
            print(f"Error adding/updating group: {e}", file=sys.stderr)
            raise e
    
    async def get_all_groups(self) -> List[Dict]:
        """獲取所有監控群組"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all('SELECT * FROM monitored_groups ORDER BY created_at DESC')
            groups = []
            for row in rows:
                group = dict(row) if hasattr(row, 'keys') else dict(row) if isinstance(row, dict) else {}
                
                # 確保 url 欄位存在（可能是 link 欄位）
                if 'url' not in group and 'link' in group:
                    group['url'] = group['link']
                
                # 將 keyword_set_id 轉換為 keywordSetIds 陣列格式（前端期望的格式）
                keyword_set_id = group.get('keyword_set_id')
                keyword_set_ids_str = group.get('keyword_set_ids', '[]')
                
                # 嘗試解析 keyword_set_ids JSON 字符串
                keywordSetIds = []
                if keyword_set_ids_str and keyword_set_ids_str != '[]':
                    try:
                        import json
                        parsed = json.loads(keyword_set_ids_str)
                        if isinstance(parsed, list):
                            keywordSetIds = parsed
                    except:
                        pass
                
                # 如果有單個 keyword_set_id 且不在列表中，添加進去
                if keyword_set_id and keyword_set_id not in keywordSetIds:
                    keywordSetIds.append(keyword_set_id)
                
                group['keywordSetIds'] = keywordSetIds
                # 確保 memberCount 欄位存在（前端期望的格式）
                group['memberCount'] = group.get('member_count', 0) or 0
                groups.append(group)
            
            return groups
        except Exception as e:
            import sys
            print(f"[Database] Error getting groups: {e}", file=sys.stderr)
            return []
    
    async def remove_group(self, group_id: int) -> bool:
        """刪除監控群組"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM monitored_groups WHERE id = ?', (group_id,))
            return True
        except Exception as e:
            print(f"Error removing group: {e}")
            return False
    
    async def get_all_monitored_groups(self) -> List[Dict]:
        """獲取所有監控群組（get_all_groups 的別名）"""
        return await self.get_all_groups()
    
    async def update_group_member_count(self, url: str, member_count: int) -> bool:
        """更新群組成員數"""
        try:
            await self.execute('''
                UPDATE monitored_groups 
                SET member_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE link = ? OR link LIKE ?
            ''', (member_count, url, f'%{url.split("/")[-1]}%'))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating group member count: {e}", file=sys.stderr)
            return False
    
    async def get_group_by_url(self, url: str) -> Optional[Dict]:
        """根據 URL 獲取群組"""
        try:
            # 提取群組標識符
            import re
            match = re.search(r'(?:t\.me|telegram\.me)/(?:joinchat/)?([^/\s]+)', url)
            identifier = match.group(1) if match else url
            
            row = await self.fetch_one('''
                SELECT * FROM monitored_groups 
                WHERE link = ? OR link LIKE ? OR link LIKE ?
            ''', (url, f'%/{identifier}', f'%/{identifier}%'))
            
            if row:
                return dict(row) if hasattr(row, 'keys') else row
            return None
        except Exception as e:
            import sys
            print(f"[Database] Error getting group by URL: {e}", file=sys.stderr)
            return None
    
    # ============ 消息模板操作 ============
    
    async def add_template(self, template_data: Dict) -> int:
        """添加消息模板"""
        await self._ensure_keyword_tables()
        try:
            return await self.execute_insert('''
                INSERT INTO message_templates (name, content, category)
                VALUES (?, ?, ?)
            ''', (
                template_data.get('name', ''),
                template_data.get('content', ''),
                template_data.get('category', 'general')
            ))
        except Exception as e:
            print(f"Error adding template: {e}")
            raise e
    
    async def get_all_templates(self) -> List[Dict]:
        """獲取所有消息模板"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all('SELECT * FROM message_templates ORDER BY created_at DESC')
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            print(f"Error getting templates: {e}")
            return []
    
    async def remove_template(self, template_id: int) -> bool:
        """刪除消息模板"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM message_templates WHERE id = ?', (template_id,))
            return True
        except Exception as e:
            print(f"Error removing template: {e}")
            return False
    
    async def toggle_template_status(self, template_id: int, is_active: bool) -> bool:
        """切換模板狀態"""
        await self._ensure_keyword_tables()
        try:
            await self.execute(
                'UPDATE message_templates SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (1 if is_active else 0, template_id)
            )
            return True
        except Exception as e:
            print(f"Error toggling template status: {e}")
            return False
    
    # ============ 營銷活動操作 ============
    
    async def get_all_campaigns(self) -> List[Dict]:
        """獲取所有營銷活動"""
        try:
            return await self.fetch_all('SELECT * FROM marketing_campaigns ORDER BY created_at DESC')
        except Exception as e:
            print(f"Error getting campaigns: {e}")
            return []
    
    async def remove_campaign(self, campaign_id: int) -> bool:
        """刪除營銷活動"""
        try:
            await self.execute('DELETE FROM marketing_campaigns WHERE id = ?', (campaign_id,))
            return True
        except Exception as e:
            print(f"Error removing campaign: {e}")
            return False
    
    async def get_all_leads(self, limit: int = 50) -> List[Dict]:
        """獲取潛在客戶（優化：初始載入減少數量）"""
        try:
            return await self.fetch_all(f'SELECT * FROM extracted_members ORDER BY created_at DESC LIMIT {limit}')
        except Exception as e:
            print(f"Error getting leads: {e}")
            return []
    
    async def get_leads_paginated(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """分頁獲取潛在客戶"""
        try:
            return await self.fetch_all(
                'SELECT * FROM extracted_members ORDER BY created_at DESC LIMIT ? OFFSET ?',
                (limit, offset)
            )
        except Exception as e:
            print(f"Error getting leads paginated: {e}")
            return []
    
    async def get_lead(self, lead_id: int) -> Optional[Dict]:
        """獲取單個 Lead"""
        try:
            result = await self.fetch_one('SELECT * FROM extracted_members WHERE id = ?', (lead_id,))
            return result
        except Exception as e:
            print(f"Error getting lead: {e}")
            return None
    
    async def delete_lead(self, lead_id: int) -> bool:
        """刪除單個 Lead"""
        try:
            await self.execute('DELETE FROM extracted_members WHERE id = ?', (lead_id,))
            return True
        except Exception as e:
            print(f"Error deleting lead: {e}")
            return False
    
    async def batch_delete_leads(self, lead_ids: List[int]) -> Dict:
        """批量刪除 Leads"""
        try:
            deleted = 0
            for lead_id in lead_ids:
                await self.execute('DELETE FROM extracted_members WHERE id = ?', (lead_id,))
                deleted += 1
            return {'success': True, 'deleted': deleted}
        except Exception as e:
            print(f"Error batch deleting leads: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_users_with_profiles(
        self,
        stage: Optional[str] = None,
        tags: Optional[List[str]] = None,
        interest_min: Optional[int] = None,
        interest_max: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """獲取用戶列表（含畫像），支持篩選"""
        try:
            query = 'SELECT * FROM extracted_members WHERE 1=1'
            params = []
            
            if stage:
                query += ' AND status = ?'
                params.append(stage)
            
            if interest_min is not None:
                query += ' AND COALESCE(intent_score, 0) >= ?'
                params.append(interest_min)
            
            if interest_max is not None:
                query += ' AND COALESCE(intent_score, 100) <= ?'
                params.append(interest_max)
            
            if search:
                query += ' AND (username LIKE ? OR first_name LIKE ? OR user_id LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term, search_term])
            
            query += f' ORDER BY created_at DESC LIMIT {limit} OFFSET {offset}'
            
            return await self.fetch_all(query, tuple(params))
        except Exception as e:
            print(f"Error getting users with profiles: {e}")
            return []
    
    async def get_detailed_funnel_stats(self) -> Dict:
        """獲取詳細漏斗統計"""
        try:
            from datetime import datetime, timedelta
            
            # 獲取所有 leads
            all_leads = await self.fetch_all('SELECT * FROM extracted_members')
            
            today = datetime.now().date()
            week_ago = today - timedelta(days=7)
            
            # 計算統計
            today_new = sum(1 for l in all_leads if l.get('created_at') and 
                          datetime.fromisoformat(str(l['created_at']).replace('Z', '')).date() == today)
            
            week_converted = sum(1 for l in all_leads if 
                                l.get('status') == 'Closed-Won' and 
                                l.get('created_at') and
                                datetime.fromisoformat(str(l['created_at']).replace('Z', '')).date() >= week_ago)
            
            # 按狀態統計
            stages = {}
            status_mapping = {
                'New': 'new',
                'Contacted': 'contacted', 
                'Replied': 'replied',
                'Follow-up': 'follow_up',
                'Interested': 'interested',
                'Negotiating': 'negotiating',
                'Closed-Won': 'closed_won',
                'Closed-Lost': 'closed_lost'
            }
            
            for lead in all_leads:
                status = lead.get('status', 'New')
                stage_key = status_mapping.get(status, status.lower().replace('-', '_'))
                if stage_key not in stages:
                    stages[stage_key] = {'count': 0, 'value': 0}
                stages[stage_key]['count'] += 1
            
            # 收集標籤
            tags = {}
            for lead in all_leads:
                lead_tags = lead.get('auto_tags') or lead.get('tags') or ''
                if lead_tags:
                    try:
                        import json
                        tag_list = json.loads(lead_tags) if isinstance(lead_tags, str) else lead_tags
                        for tag in tag_list:
                            tags[tag] = tags.get(tag, 0) + 1
                    except:
                        pass
            
            sorted_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)
            
            return {
                'today_new': today_new,
                'week_converted': week_converted,
                'total': len(all_leads),
                'stages': stages,
                'tags': sorted_tags[:10]
            }
            
        except Exception as e:
            print(f"Error getting detailed funnel stats: {e}")
            return {
                'today_new': 0,
                'week_converted': 0,
                'total': 0,
                'stages': {},
                'tags': []
            }
    
    async def check_lead_and_dnc(self, user_id) -> tuple:
        """檢查用戶是否已存在於 Lead 列表及是否在黑名單中
        
        Args:
            user_id: 用戶 ID
            
        Returns:
            tuple: (existing_lead, is_dnc) - 現有 Lead 記錄和是否在黑名單中
        """
        try:
            # 查詢現有 Lead
            existing_lead = await self.fetch_one(
                'SELECT * FROM extracted_members WHERE user_id = ?',
                (str(user_id),)
            )
            
            # 檢查是否在黑名單中（response_status = 'blocked' 或 contacted = -1 表示不要聯繫）
            is_dnc = False
            if existing_lead:
                is_dnc = (
                    existing_lead.get('response_status') == 'blocked' or 
                    existing_lead.get('contacted') == -1
                )
            
            return (existing_lead, is_dnc)
        except Exception as e:
            import sys
            print(f"Error checking lead and DNC: {e}", file=sys.stderr)
            return (None, False)
    
    async def add_lead(self, lead_data: Dict) -> int:
        """添加新的潛在客戶
        
        Args:
            lead_data: Lead 數據字典
            
        Returns:
            int: 新創建的 Lead ID
        """
        try:
            user_id = str(lead_data.get('userId', ''))
            username = lead_data.get('username', '')
            first_name = lead_data.get('firstName', '')
            last_name = lead_data.get('lastName', '')
            source_group = lead_data.get('sourceGroup', '')
            triggered_keyword = lead_data.get('triggeredKeyword', '')
            online_status = lead_data.get('onlineStatus', 'Unknown')
            
            await self.execute('''
                INSERT INTO extracted_members 
                (user_id, username, first_name, last_name, source_chat_title, notes, online_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    username = COALESCE(excluded.username, username),
                    first_name = COALESCE(excluded.first_name, first_name),
                    last_name = COALESCE(excluded.last_name, last_name),
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, username, first_name, last_name, source_group, f'觸發詞: {triggered_keyword}', online_status))
            
            # 獲取插入的 ID
            result = await self.fetch_one(
                'SELECT id FROM extracted_members WHERE user_id = ?',
                (user_id,)
            )
            return result['id'] if result else 0
        except Exception as e:
            import sys
            print(f"Error adding lead: {e}", file=sys.stderr)
            return 0
    
    async def add_interaction(self, lead_id: int, action: str, details: str) -> bool:
        """添加 Lead 互動記錄
        
        Args:
            lead_id: Lead ID
            action: 動作類型
            details: 詳細信息
            
        Returns:
            bool: 是否成功
        """
        try:
            # 更新 Lead 的備註（追加互動記錄）
            current = await self.fetch_one(
                'SELECT notes FROM extracted_members WHERE id = ?',
                (lead_id,)
            )
            current_notes = current.get('notes', '') if current else ''
            import datetime
            new_note = f"\n[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}] {action}: {details}"
            
            await self.execute(
                'UPDATE extracted_members SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (current_notes + new_note, lead_id)
            )
            return True
        except Exception as e:
            import sys
            print(f"Error adding interaction: {e}", file=sys.stderr)
            return False
    
    async def update_lead(self, lead_id: int, updates: Dict) -> bool:
        """更新 Lead 信息
        
        Args:
            lead_id: Lead ID
            updates: 要更新的字段字典
            
        Returns:
            bool: 是否成功
        """
        try:
            # 構建 UPDATE 語句
            fields = []
            values = []
            
            # 映射前端字段名到數據庫字段名
            field_mapping = {
                'status': 'response_status',
                'contacted': 'contacted',
                'notes': 'notes',
                'tags': 'tags',
                'value_level': 'value_level'
            }
            
            for key, value in updates.items():
                db_field = field_mapping.get(key, key)
                fields.append(f"{db_field} = ?")
                values.append(value)
            
            if not fields:
                return True  # 沒有需要更新的字段
            
            # 添加更新時間
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(lead_id)
            
            query = f"UPDATE extracted_members SET {', '.join(fields)} WHERE id = ?"
            await self.execute(query, tuple(values))
            return True
        except Exception as e:
            import sys
            print(f"Error updating lead: {e}", file=sys.stderr)
            return False

    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """根據 user_id 獲取用戶資料"""
        try:
            result = await self.fetch_one(
                'SELECT * FROM user_profiles WHERE user_id = ?',
                (user_id,)
            )
            return result
        except Exception as e:
            # 表可能不存在，忽略錯誤
            return None

    async def get_monitoring_config(self) -> Dict:
        """獲取監控配置"""
        try:
            is_active = self.get_setting('monitoring_active', '0')
            return {
                'isActive': is_active == '1' or is_active == 'true'
            }
        except Exception as e:
            print(f"Error getting monitoring config: {e}")
            return {'isActive': False}
    
    async def set_monitoring_active(self, is_active: bool) -> bool:
        """設置監控狀態"""
        try:
            self.set_setting('monitoring_active', '1' if is_active else '0')
            return True
        except Exception as e:
            print(f"Error setting monitoring active: {e}")
            return False
    
    # ============ 消息隊列統計 ============
    
    async def get_message_sending_stats(self, days: int = 7, phone: str = None) -> List[Dict]:
        """獲取消息發送統計"""
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            if phone:
                query = '''
                    SELECT 
                        DATE(created_at) as date,
                        phone,
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                    FROM message_queue
                    WHERE created_at >= ? AND phone = ?
                    GROUP BY DATE(created_at), phone
                    ORDER BY date DESC
                '''
                params = (since, phone)
            else:
                query = '''
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                    FROM message_queue
                    WHERE created_at >= ?
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                '''
                params = (since,)
            
            return await self.fetch_all(query, params)
        except Exception as e:
            print(f"Error getting message sending stats: {e}")
            return []

    # ==================== 自定義搜索渠道 ====================
    
    async def get_custom_search_channels(self, enabled_only: bool = False) -> List[Dict]:
        """獲取自定義搜索渠道列表"""
        try:
            if enabled_only:
                query = "SELECT * FROM custom_search_channels WHERE enabled = 1 ORDER BY priority, created_at"
            else:
                query = "SELECT * FROM custom_search_channels ORDER BY priority, created_at"
            return await self.fetch_all(query)
        except Exception as e:
            print(f"Error getting custom search channels: {e}")
            return []
    
    async def add_custom_search_channel(
        self,
        bot_username: str,
        display_name: str = None,
        query_format: str = "{keyword}",
        priority: str = "backup",
        notes: str = None
    ) -> Optional[int]:
        """添加自定義搜索渠道"""
        try:
            # 移除 @ 前綴
            bot_username = bot_username.lstrip('@')
            
            query = """
                INSERT INTO custom_search_channels 
                (bot_username, display_name, query_format, priority, notes)
                VALUES (?, ?, ?, ?, ?)
            """
            return await self.execute(query, (
                bot_username,
                display_name or bot_username,
                query_format,
                priority,
                notes
            ))
        except Exception as e:
            print(f"Error adding custom search channel: {e}")
            return None
    
    async def update_custom_search_channel(
        self,
        channel_id: int,
        **kwargs
    ) -> bool:
        """更新自定義搜索渠道"""
        try:
            allowed_fields = ['display_name', 'query_format', 'priority', 'enabled', 'notes', 'status']
            updates = []
            params = []
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    updates.append(f"{field} = ?")
                    params.append(value)
            
            if not updates:
                return False
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(channel_id)
            
            query = f"UPDATE custom_search_channels SET {', '.join(updates)} WHERE id = ?"
            await self.execute(query, tuple(params))
            return True
        except Exception as e:
            print(f"Error updating custom search channel: {e}")
            return False
    
    async def delete_custom_search_channel(self, channel_id: int) -> bool:
        """刪除自定義搜索渠道"""
        try:
            query = "DELETE FROM custom_search_channels WHERE id = ?"
            await self.execute(query, (channel_id,))
            return True
        except Exception as e:
            print(f"Error deleting custom search channel: {e}")
            return False
    
    async def update_channel_test_result(
        self,
        bot_username: str,
        success: bool,
        response_time: float = 0
    ) -> bool:
        """更新渠道測試結果"""
        try:
            bot_username = bot_username.lstrip('@')
            
            if success:
                query = """
                    UPDATE custom_search_channels SET
                        status = 'online',
                        success_count = success_count + 1,
                        last_test_at = CURRENT_TIMESTAMP,
                        last_success_at = CURRENT_TIMESTAMP,
                        avg_response_time = (avg_response_time * success_count + ?) / (success_count + 1),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bot_username = ?
                """
                await self.execute(query, (response_time, bot_username))
            else:
                query = """
                    UPDATE custom_search_channels SET
                        status = 'offline',
                        fail_count = fail_count + 1,
                        last_test_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bot_username = ?
                """
                await self.execute(query, (bot_username,))
            return True
        except Exception as e:
            print(f"Error updating channel test result: {e}")
            return False


# 創建全局實例
db = Database()

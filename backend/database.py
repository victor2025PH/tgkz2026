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
        'prices': {'week': 2.9, 'month': 9.9, 'quarter': 24.9, 'year': 99, 'lifetime': 299},
        'quotas': {
            'tg_accounts': 5,
            'daily_messages': 50,
            'ai_calls': 50,
            'devices': 2,
            'groups': 10,
            'auto_reply_rules': 3,
            'scheduled_tasks': 5,
            'data_retention_days': 15,
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
        'prices': {'week': 9.9, 'month': 29.9, 'quarter': 79, 'year': 299, 'lifetime': 799},
        'quotas': {
            'tg_accounts': 15,
            'daily_messages': 200,
            'ai_calls': 200,
            'devices': 3,
            'groups': 30,
            'auto_reply_rules': 10,
            'scheduled_tasks': 20,
            'data_retention_days': 30,
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
        'prices': {'week': 29, 'month': 99.9, 'quarter': 249, 'year': 999, 'lifetime': 2999},
        'quotas': {
            'tg_accounts': 50,
            'daily_messages': 1000,
            'ai_calls': -1,  # 無限
            'devices': 5,
            'groups': 100,
            'auto_reply_rules': -1,
            'scheduled_tasks': 50,
            'data_retention_days': 60,
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
        'prices': {'week': 89, 'month': 299, 'quarter': 749, 'year': 2999, 'lifetime': 7999},
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
        'prices': {'week': 299, 'month': 999, 'quarter': 2499, 'year': 9999, 'lifetime': 29999},
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
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 檢查 admins 表是否有 last_login_ip 字段
            cursor.execute("PRAGMA table_info(admins)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'last_login_ip' not in columns:
                print("🔄 添加缺失字段: admins.last_login_ip")
                cursor.execute('ALTER TABLE admins ADD COLUMN last_login_ip TEXT')
                conn.commit()
                print("✅ 字段添加成功")
        except Exception as e:
            print(f"⚠️ 遷移警告: {e}")
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
    
    def get_all_settings(self, category: str = None) -> Dict[str, Any]:
        """獲取所有設置"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if category:
            cursor.execute('SELECT * FROM settings WHERE category = ?', (category,))
        else:
            cursor.execute('SELECT * FROM settings')
        
        settings = {}
        for row in cursor.fetchall():
            settings[row['setting_key']] = {
                'value': row['setting_value'],
                'type': row['setting_type'],
                'category': row['category'],
                'description': row['description']
            }
        
        conn.close()
        return settings
    
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
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM accounts WHERE phone = ?', (phone,))
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute('SELECT * FROM accounts WHERE phone = ?', (phone,))
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
            
            # SQL 保留關鍵字需要用方括號轉義
            def escape_column(col):
                reserved_keywords = {'group', 'order', 'select', 'insert', 'update', 'delete', 'from', 'where', 'table', 'index', 'key'}
                if col.lower() in reserved_keywords:
                    return f'[{col}]'
                return col
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # 構建插入語句（轉義保留關鍵字）
                columns = list(account_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [account_data[col] for col in columns]
                
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
                columns = list(account_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [account_data[col] for col in columns]
                
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
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                cursor = conn.cursor()
                
                set_clause = ','.join([f"{escape_column(k)} = ?" for k in updates.keys()])
                values = list(updates.values()) + [account_id]
                
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
                set_clause = ','.join([f"{escape_column(k)} = ?" for k in updates.keys()])
                values = list(updates.values()) + [account_id]
                
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
        """確保 accounts 表存在（如果不存在則創建）"""
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
                    proxyCountry TEXT,
                    proxyRotationEnabled INTEGER DEFAULT 0,
                    enableWarmup INTEGER DEFAULT 0,
                    warmupStatus TEXT,
                    dailySendCount INTEGER DEFAULT 0,
                    dailySendLimit INTEGER DEFAULT 50,
                    healthScore REAL DEFAULT 100.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''
            
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                cursor.execute(create_table_sql)
                conn.commit()
                conn.close()
                return
            
            # 異步方式
            async with aiosqlite.connect(str(db_path)) as conn:
                await conn.execute(create_table_sql)
                await conn.commit()
        except Exception as e:
            print(f"Error ensuring accounts table: {e}")


# 創建全局實例
db = Database()

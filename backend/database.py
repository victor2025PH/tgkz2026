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

# 🆕 從 config 導入持久化數據庫路徑
from config import DATABASE_DIR, DATABASE_PATH

# 數據庫路徑 - 使用用戶數據目錄（打包後會從環境變量獲取）
DB_PATH = DATABASE_DIR / "tgai_server.db"
# 帳號管理數據庫路徑（TG-Matrix 主數據庫）
ACCOUNTS_DB_PATH = DATABASE_PATH  # 使用 config.py 中的路徑


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
            'groups': 30,
            'keyword_sets': 20,
            'auto_reply_rules': 20,
            'scheduled_tasks': 30,
            'data_retention_days': 60,
            'platform_api_quota': 3,
            'platform_api_max_accounts': 9
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply',
                     'smart_mode', 'ai_insights', 'data_insights_basic']  # 解鎖智能模式和洞察
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
            'groups': 100,
            'keyword_sets': 50,
            'auto_reply_rules': -1,
            'scheduled_tasks': 100,
            'data_retention_days': 90,
            'platform_api_quota': 10,
            'platform_api_max_accounts': 30
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply',
                     'smart_mode', 'ai_insights', 'data_insights_basic',
                     'strategy_planning', 'auto_execution', 'data_insights_advanced', 'ab_testing',
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
            'daily_messages': 10000,
            'ai_calls': -1,
            'devices': 10,
            'groups': 300,
            'keyword_sets': 100,
            'auto_reply_rules': -1,
            'scheduled_tasks': -1,
            'data_retention_days': 180,
            'platform_api_quota': 30,
            'platform_api_max_accounts': 90
        },
        'features': ['basic_messaging', 'manual_reply', 'auto_reply', 'basic_ai', 'scheduled_send',
                     'ad_broadcast', 'batch_send', 'data_export', 'keyword_reply',
                     'smart_mode', 'ai_insights', 'data_insights_basic',
                     'strategy_planning', 'auto_execution', 'data_insights_advanced', 'ab_testing',
                     'smart_routing', 'analytics', 'multi_role', 'ai_sales_funnel', 'advanced_analytics',
                     'smart_anti_block', 'api_access', 'team_management', 'priority_support']
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
            # 🆕 設置超時時間，避免 database is locked 錯誤
            self._connection = await aiosqlite.connect(str(self.db_path), timeout=30.0)
            self._connection.row_factory = aiosqlite.Row
            # 🆕 啟用 WAL 模式（減少鎖競爭，提高並發性能）
            await self._connection.execute("PRAGMA journal_mode=WAL")
            await self._connection.execute("PRAGMA synchronous=NORMAL")  # 平衡性能和安全性
            await self._connection.execute("PRAGMA cache_size=-64000")  # 64MB 緩存
            await self._connection.execute("PRAGMA busy_timeout=30000")  # 🆕 30秒等待鎖釋放
    
    async def initialize(self):
        """異步初始化（用於遷移系統）"""
        await self.connect()
        # 🔧 性能優化：在啟動時一次性創建所有表
        await self._ensure_keyword_tables()
        await self._ensure_knowledge_tables()  # 🆕 確保知識庫表存在
    
    async def close(self):
        """關閉異步連接"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    def get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接（帶鎖競爭保護）"""
        # 🆕 設置超時時間，避免 database is locked 錯誤
        conn = sqlite3.connect(self.db_path, timeout=30.0)  # 30秒超時
        conn.row_factory = sqlite3.Row
        # 🆕 啟用 WAL 模式（減少鎖競爭）
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=30000")  # 30秒等待鎖釋放
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
            
            # 🆕 D方案：添加搜索會話字段
            if 'search_session_id' not in columns:
                print("[Database] Adding column: discovered_resources.search_session_id", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN search_session_id TEXT')
                conn.commit()
            
            if 'search_keyword' not in columns:
                print("[Database] Adding column: discovered_resources.search_keyword", file=sys.stderr)
                cursor.execute('ALTER TABLE discovered_resources ADD COLUMN search_keyword TEXT')
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
                
                # 🔧 FIX: 添加缺失的 bio 和 has_photo 列
                if 'bio' not in em_columns:
                    print("[Database] Adding column: extracted_members.bio", file=sys.stderr)
                    cursor.execute('ALTER TABLE extracted_members ADD COLUMN bio TEXT')
                    conn.commit()
                
                if 'has_photo' not in em_columns:
                    print("[Database] Adding column: extracted_members.has_photo", file=sys.stderr)
                    cursor.execute('ALTER TABLE extracted_members ADD COLUMN has_photo INTEGER DEFAULT 0')
                    conn.commit()
            
            # 🔧 FIX: 創建 leads 表（如果不存在）
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='leads'")
            if not cursor.fetchone():
                print("[Database] Creating table: leads", file=sys.stderr)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS leads (
                        id INTEGER PRIMARY KEY,
                        telegram_id TEXT,
                        username TEXT,
                        first_name TEXT,
                        last_name TEXT,
                        source TEXT,
                        status TEXT DEFAULT 'new',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                conn.commit()
            
            # 🔧 FIX: unified_contacts 表遷移
            cursor.execute("PRAGMA table_info(unified_contacts)")
            uc_columns = [col[1] for col in cursor.fetchall()]
            
            if uc_columns:  # 表存在
                uc_migrations = [
                    ('source_type', "TEXT DEFAULT 'extracted'"),
                    ('source_id', "TEXT"),
                    ('source_group_name', "TEXT"),
                    ('contact_type', "TEXT DEFAULT 'lead'"),
                    ('activity_score', "REAL DEFAULT 0.5"),
                    ('ai_score', "REAL DEFAULT 0"),
                    ('intent_score', "INTEGER DEFAULT 0"),
                    ('intent_level', "TEXT DEFAULT 'none'"),
                    ('online_status', "TEXT DEFAULT 'hidden'"),
                    ('last_online', "TIMESTAMP"),
                    ('contacted', "INTEGER DEFAULT 0"),
                    ('contacted_at', "TIMESTAMP"),
                    ('response_status', "TEXT DEFAULT 'none'"),
                    ('auto_tags', "TEXT DEFAULT '[]'"),
                    ('discovered_at', "TIMESTAMP"),
                    # 🔧 FIX: 添加同步所需的列
                    ('display_name', "TEXT"),
                    ('source_name', "TEXT"),
                    ('last_seen', "TIMESTAMP"),
                    ('synced_at', "TIMESTAMP"),
                ]
                
                for col_name, col_def in uc_migrations:
                    if col_name not in uc_columns:
                        print(f"[Database] Adding column: unified_contacts.{col_name}", file=sys.stderr)
                        cursor.execute(f'ALTER TABLE unified_contacts ADD COLUMN {col_name} {col_def}')
                        conn.commit()
            
            # ============ funnel_stages 表遷移 ============
            cursor.execute("PRAGMA table_info(funnel_stages)")
            fs_columns = cursor.fetchall()
            fs_column_names = [col[1] for col in fs_columns]
            
            if fs_column_names:  # 表存在
                # 檢查並記錄 phone 列的 NOT NULL 狀態
                for col in fs_columns:
                    if col[1] == 'phone' and col[3] == 1:  # col[3] 是 notnull 標記
                        print("[Database] Warning: funnel_stages.phone has NOT NULL constraint - will use default value", file=sys.stderr)
                
                if 'reason' not in fs_column_names:
                    print("[Database] Adding column: funnel_stages.reason", file=sys.stderr)
                    cursor.execute('ALTER TABLE funnel_stages ADD COLUMN reason TEXT')
                    conn.commit()
                
                if 'updated_at' not in fs_column_names:
                    print("[Database] Adding column: funnel_stages.updated_at", file=sys.stderr)
                    cursor.execute('ALTER TABLE funnel_stages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
                    conn.commit()
                
        except Exception as e:
            print(f"[Database] Migration warning: {e}", file=sys.stderr)
        finally:
            conn.close()
    
    def _init_db(self):
        """初始化數據庫表"""
        conn = sqlite3.connect(self.db_path)
        # 🆕 啟用 WAL 模式
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
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
        
        # ============ 🆕 AI 知識庫表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_knowledge_base (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL DEFAULT 'general',
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                keywords TEXT,
                priority INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                use_count INTEGER DEFAULT 0,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 創建知識庫索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_category ON ai_knowledge_base(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_active ON ai_knowledge_base(is_active)')
        
        # ============ 🆕 對話效果追蹤表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversation_effectiveness (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                ai_message TEXT NOT NULL,
                user_response TEXT,
                response_time_seconds INTEGER,
                is_positive_response INTEGER DEFAULT 0,
                is_continued_conversation INTEGER DEFAULT 0,
                triggered_keyword TEXT,
                source_group TEXT,
                effectiveness_score REAL DEFAULT 0,
                learned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_user ON conversation_effectiveness(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_learned ON conversation_effectiveness(learned)')
        
        # ============ 系統告警表 ============
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                acknowledged INTEGER DEFAULT 0,
                acknowledged_at TIMESTAMP,
                resolved INTEGER DEFAULT 0,
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        
        # ============ 統一聯繫人表（唯一定義） ============
        # 注意：此表是資源中心的核心數據表，整合來自多個來源的聯繫人
        # 數據來源：extracted_members, discovered_resources, collected_users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS unified_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                
                -- 核心標識
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                display_name TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                
                -- 類型：user/group/channel
                contact_type TEXT DEFAULT 'user',
                
                -- 來源信息
                source_type TEXT DEFAULT 'member',
                source_id TEXT,
                source_name TEXT,
                source_group_id TEXT,
                source_group_title TEXT,
                source_group_name TEXT,
                source TEXT DEFAULT 'keyword_match',
                matched_keywords TEXT DEFAULT '[]',
                
                -- 狀態和標籤
                status TEXT DEFAULT 'new',
                funnel_stage TEXT DEFAULT 'awareness',
                tags TEXT DEFAULT '[]',
                
                -- 評分
                ai_score REAL DEFAULT 0.5,
                activity_score REAL DEFAULT 0.5,
                value_level TEXT DEFAULT 'C',
                intent_score INTEGER DEFAULT 0,
                intent_level TEXT DEFAULT 'none',
                lead_score INTEGER DEFAULT 0,
                quality_score INTEGER DEFAULT 0,
                interest_level INTEGER DEFAULT 1,
                
                -- 在線狀態
                is_online INTEGER DEFAULT 0,
                online_status TEXT DEFAULT 'hidden',
                last_seen TIMESTAMP,
                last_online TIMESTAMP,
                
                -- 屬性
                is_bot INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 0,
                has_photo INTEGER DEFAULT 0,
                member_count INTEGER DEFAULT 0,
                account_age_days INTEGER,
                
                -- 風險評估
                ad_risk_score REAL DEFAULT 0,
                is_ad_account INTEGER,
                is_blacklisted INTEGER DEFAULT 0,
                risk_factors TEXT DEFAULT '{}',
                
                -- 互動統計
                message_count INTEGER DEFAULT 0,
                interactions_count INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                messages_received INTEGER DEFAULT 0,
                last_contact_at TIMESTAMP,
                last_message_at TIMESTAMP,
                last_interaction_at TEXT,
                
                -- 營銷狀態
                contacted INTEGER DEFAULT 0,
                contacted_at TIMESTAMP,
                response_status TEXT DEFAULT 'none',
                auto_tags TEXT DEFAULT '[]',
                
                -- 分配信息
                assigned_account_phone TEXT,
                assigned_at TEXT,
                captured_by_account TEXT,
                
                -- 元數據
                bio TEXT,
                notes TEXT DEFAULT '',
                custom_fields TEXT DEFAULT '{}',
                metadata TEXT DEFAULT '{}',
                
                -- 時間戳（captured_at 不設 NOT NULL，避免同步失敗）
                captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                discovered_at TIMESTAMP,
                synced_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                deleted_by TEXT
            )
        ''')
        
        # 創建 unified_contacts 索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_unified_contacts_telegram_id ON unified_contacts(telegram_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_unified_contacts_status ON unified_contacts(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_unified_contacts_source_type ON unified_contacts(source_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_unified_contacts_created_at ON unified_contacts(created_at DESC)')
        
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
        
        # 🆕 P3 優化：額外索引提升查詢性能
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_source ON extracted_members(source_chat_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_extracted_at ON extracted_members(extracted_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_contacted ON extracted_members(contacted)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_members_composite ON extracted_members(online_status, value_level, contacted)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_extraction_logs_phone ON member_extraction_logs(account_phone)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON member_extraction_logs(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_extraction_logs_created ON member_extraction_logs(created_at DESC)')
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
    
    async def batch_update_account_status(self, account_ids: List[int], status: str) -> int:
        """
        🆕 批量更新帳號狀態（優化性能）
        使用單一 SQL 語句更新多個帳號，避免多次數據庫調用
        
        Args:
            account_ids: 要更新的帳號 ID 列表
            status: 新狀態值
            
        Returns:
            更新的帳號數量
        """
        if not account_ids:
            return 0
            
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return 0
            
            # 使用 IN 子句一次性更新所有帳號
            placeholders = ','.join(['?' for _ in account_ids])
            values = [status] + account_ids
            
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(accounts_db_path))
                cursor = conn.cursor()
                cursor.execute(f'''
                    UPDATE accounts 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id IN ({placeholders})
                ''', values)
                conn.commit()
                count = cursor.rowcount
                conn.close()
                return count
            
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                cursor = await conn.execute(f'''
                    UPDATE accounts 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id IN ({placeholders})
                ''', values)
                await conn.commit()
                return cursor.rowcount
                
        except Exception as e:
            print(f"Error batch updating account status: {e}")
            return 0
    
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
        import sys
        import os
        # 🆕 只在 DEBUG 模式下打印日志，避免日志過多
        debug_mode = os.environ.get('DB_DEBUG', '').lower() == 'true'
        
        try:
            if not HAS_AIOSQLITE:
                # 同步回退
                if debug_mode:
                    print(f"[Database] execute (sync): {query[:60]}...", file=sys.stderr)
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
            if debug_mode:
                print(f"[Database] execute (async): {query[:60]}...", file=sys.stderr)
            await self.connect()
            if params:
                cursor = await self._connection.execute(query, params)
            else:
                cursor = await self._connection.execute(query)
            await self._connection.commit()
            return cursor.rowcount
        except Exception as e:
            # 只在真正出錯時打印錯誤日志
            print(f"[Database] execute ERROR: {e}", file=sys.stderr)
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
    
    # 🔧 性能優化：使用標誌位確保表只創建一次
    _keyword_tables_initialized = False
    
    async def _ensure_keyword_tables(self):
        """確保關鍵詞相關表存在（只執行一次）"""
        # 🔧 性能優化：如果已初始化，直接返回
        if Database._keyword_tables_initialized:
            return
        
        try:
            # 關鍵詞集表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS keyword_sets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    keywords TEXT DEFAULT '[]',
                    match_mode TEXT DEFAULT 'fuzzy',
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 🔧 遷移：添加 match_mode 字段（如果不存在）
            # 使用更可靠的方法：直接嘗試 SELECT 該列
            try:
                # 如果列不存在，這個查詢會失敗
                await self.fetch_one("SELECT match_mode FROM keyword_sets LIMIT 1")
            except Exception as check_error:
                # 列不存在，嘗試添加
                error_str = str(check_error).lower()
                if 'no such column' in error_str or 'no column' in error_str:
                    try:
                        await self.execute('ALTER TABLE keyword_sets ADD COLUMN match_mode TEXT DEFAULT "fuzzy"')
                        import sys
                        print("[Database] Added match_mode column to keyword_sets", file=sys.stderr)
                    except Exception:
                        pass  # 可能同時有其他進程添加了，忽略
            
            # 聊天模板表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS chat_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT DEFAULT 'custom',
                    content TEXT NOT NULL,
                    variables TEXT DEFAULT '[]',
                    usage_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0,
                    last_used TIMESTAMP,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 營銷策略表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_strategies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    strategy_json TEXT NOT NULL,
                    is_active INTEGER DEFAULT 0,
                    total_leads INTEGER DEFAULT 0,
                    contacted INTEGER DEFAULT 0,
                    converted INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 模型配置表 - 持久化存儲 API Key 和模型配置
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    display_name TEXT,
                    api_key TEXT,
                    api_endpoint TEXT,
                    is_local INTEGER DEFAULT 0,
                    is_default INTEGER DEFAULT 0,
                    priority INTEGER DEFAULT 0,
                    is_connected INTEGER DEFAULT 0,
                    last_tested_at TIMESTAMP,
                    config_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 設置表 - 存儲模型用途分配等 AI 相關設置
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
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
                    resource_type TEXT DEFAULT 'group',
                    can_extract_members INTEGER DEFAULT 1,
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
            
            # 觸發規則表 - 定義關鍵詞匹配後的響應動作
            await self.execute('''
                CREATE TABLE IF NOT EXISTS trigger_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    priority INTEGER DEFAULT 2,
                    is_active INTEGER DEFAULT 1,
                    
                    source_type TEXT DEFAULT 'all',
                    source_group_ids TEXT DEFAULT '[]',
                    keyword_set_ids TEXT NOT NULL DEFAULT '[]',
                    conditions TEXT DEFAULT '{}',
                    
                    response_type TEXT NOT NULL DEFAULT 'ai_chat',
                    response_config TEXT DEFAULT '{}',
                    
                    sender_type TEXT DEFAULT 'auto',
                    sender_account_ids TEXT DEFAULT '[]',
                    delay_min INTEGER DEFAULT 30,
                    delay_max INTEGER DEFAULT 120,
                    daily_limit INTEGER DEFAULT 50,
                    
                    auto_add_lead INTEGER DEFAULT 1,
                    notify_me INTEGER DEFAULT 0,
                    
                    trigger_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    last_triggered TIMESTAMP,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # ==================== 收集用戶與廣告識別相關表 ====================
            
            # 收集的用戶表 - 存儲從群組收集的活躍用戶
            await self.execute('''
                CREATE TABLE IF NOT EXISTS collected_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    bio TEXT,
                    phone TEXT,
                    
                    -- 廣告風險評估
                    ad_risk_score REAL DEFAULT 0,
                    risk_factors TEXT DEFAULT '{}',
                    is_ad_account INTEGER DEFAULT NULL,
                    is_blacklisted INTEGER DEFAULT 0,
                    
                    -- 帳號特徵
                    has_photo INTEGER DEFAULT 0,
                    is_premium INTEGER DEFAULT 0,
                    is_verified INTEGER DEFAULT 0,
                    is_bot INTEGER DEFAULT 0,
                    account_age_days INTEGER,
                    
                    -- 來源信息
                    source_groups TEXT DEFAULT '[]',
                    collected_by TEXT,
                    
                    -- 活躍度統計
                    message_count INTEGER DEFAULT 0,
                    groups_count INTEGER DEFAULT 0,
                    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_message_at TIMESTAMP,
                    
                    -- 評分
                    value_level TEXT DEFAULT 'C',
                    activity_score REAL DEFAULT 0.5,
                    
                    -- 營銷狀態
                    contacted INTEGER DEFAULT 0,
                    contacted_at TIMESTAMP,
                    response_status TEXT DEFAULT 'none',
                    
                    -- 標籤和備註
                    tags TEXT DEFAULT '[]',
                    notes TEXT,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 用戶消息樣本表 - 存儲用戶的消息樣本用於分析
            await self.execute('''
                CREATE TABLE IF NOT EXISTS user_messages_sample (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_telegram_id TEXT NOT NULL,
                    group_id TEXT,
                    group_name TEXT,
                    message_text TEXT,
                    message_time TIMESTAMP,
                    
                    -- 內容分析結果
                    contains_link INTEGER DEFAULT 0,
                    contains_contact INTEGER DEFAULT 0,
                    ad_keywords_matched TEXT DEFAULT '[]',
                    content_risk_score REAL DEFAULT 0,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_telegram_id) REFERENCES collected_users(telegram_id) ON DELETE CASCADE
                )
            ''')
            
            # 廣告識別規則表 - 存儲可配置的識別規則
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ad_detection_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    rule_config TEXT NOT NULL,
                    weight REAL DEFAULT 0.1,
                    is_active INTEGER DEFAULT 1,
                    match_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 廣告關鍵詞表 - 存儲廣告識別關鍵詞
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ad_keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword TEXT NOT NULL UNIQUE,
                    category TEXT DEFAULT 'general',
                    risk_weight REAL DEFAULT 0.1,
                    match_count INTEGER DEFAULT 0,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            try:
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_telegram_id ON collected_users(telegram_id)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_ad_risk ON collected_users(ad_risk_score)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_value_level ON collected_users(value_level)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages_sample(user_telegram_id)')
            except Exception:
                pass  # 索引可能已存在
            
            # 🔧 性能優化：標記為已初始化
            Database._keyword_tables_initialized = True
            
        except Exception as e:
            print(f"Error creating keyword tables: {e}")
            # 即使出錯也標記為已嘗試，避免重複嘗試
            Database._keyword_tables_initialized = True
    
    # 🆕 知識庫表初始化標誌
    _knowledge_tables_initialized = False
    
    async def _ensure_knowledge_tables(self):
        """🆕 確保知識庫相關表存在（只執行一次）"""
        if Database._knowledge_tables_initialized:
            return
        
        try:
            import sys
            print("[Database] Ensuring knowledge tables exist...", file=sys.stderr)
            
            # AI 知識庫表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL DEFAULT 'general',
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    keywords TEXT,
                    priority INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1,
                    use_count INTEGER DEFAULT 0,
                    last_used_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            await self.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_category ON ai_knowledge_base(category)')
            await self.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_active ON ai_knowledge_base(is_active)')
            
            # 對話效果追蹤表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS conversation_effectiveness (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    ai_message TEXT NOT NULL,
                    user_response TEXT,
                    response_time_seconds INTEGER,
                    is_positive_response INTEGER DEFAULT 0,
                    is_continued_conversation INTEGER DEFAULT 0,
                    triggered_keyword TEXT,
                    source_group TEXT,
                    effectiveness_score REAL DEFAULT 0,
                    learned INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            await self.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_user ON conversation_effectiveness(user_id)')
            await self.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_learned ON conversation_effectiveness(learned)')
            
            Database._knowledge_tables_initialized = True
            print("[Database] ✓ Knowledge tables created/verified", file=sys.stderr)
            
        except Exception as e:
            print(f"[Database] Error creating knowledge tables: {e}", file=sys.stderr)
            Database._knowledge_tables_initialized = True
    
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
        """獲取所有關鍵詞集
        
        🔧 修復：同時從兩個來源讀取關鍵詞並合併：
        1. keyword_sets.keywords JSON 字段（新格式）
        2. keywords 關聯表（舊格式）
        
        🔧 格式統一：同時包含 'keyword' 和 'text' 字段，確保匹配器和前端都能使用
        """
        await self._ensure_keyword_tables()
        import sys
        
        try:
            rows = await self.fetch_all('SELECT * FROM keyword_sets ORDER BY created_at DESC')
            result = []
            
            for row in rows:
                row_dict = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0], 'name': row[1], 'description': row[2],
                    'keywords': row[3], 'match_mode': row[4] if len(row) > 4 else 'fuzzy',
                    'is_active': row[5] if len(row) > 5 else 1,
                    'created_at': row[6] if len(row) > 6 else None,
                    'updated_at': row[7] if len(row) > 7 else None
                }
                
                set_id = row_dict['id']
                all_keywords = []
                seen_texts = set()  # 用於去重
                
                # ========== 來源 1: 從 JSON 字段解析 ==========
                keywords_raw = row_dict.get('keywords', '[]')
                try:
                    if isinstance(keywords_raw, str):
                        json_keywords = json.loads(keywords_raw) if keywords_raw else []
                    else:
                        json_keywords = keywords_raw or []
                except (json.JSONDecodeError, TypeError):
                    json_keywords = []
                
                for i, kw in enumerate(json_keywords):
                    if isinstance(kw, dict):
                        text = kw.get('text', kw.get('keyword', ''))
                    elif isinstance(kw, str):
                        text = kw
                    else:
                        continue
                    
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        all_keywords.append({
                            'id': kw.get('id', f"kw-{set_id}-{i}") if isinstance(kw, dict) else f"kw-{set_id}-{i}",
                            'keyword': text,  # 🔧 匹配器使用
                            'text': text,     # 🔧 前端顯示使用
                            'isRegex': kw.get('isRegex', False) if isinstance(kw, dict) else False,
                            'matchCount': kw.get('matchCount', 0) if isinstance(kw, dict) else 0
                        })
                
                # ========== 來源 2: 從 keywords 關聯表讀取（舊數據） ==========
                try:
                    table_keywords = await self.fetch_all(
                        'SELECT * FROM keywords WHERE keyword_set_id = ?',
                        (set_id,)
                    )
                    for j, tk in enumerate(table_keywords):
                        tk_dict = dict(tk) if hasattr(tk, 'keys') else {
                            'id': tk[0], 'keyword_set_id': tk[1], 'keyword': tk[2],
                            'match_type': tk[3] if len(tk) > 3 else 'contains'
                        }
                        text = tk_dict.get('keyword', '')
                        if text and text not in seen_texts:
                            seen_texts.add(text)
                            all_keywords.append({
                                'id': f"kw-table-{tk_dict.get('id', j)}",
                                'keyword': text,  # 🔧 匹配器使用
                                'text': text,     # 🔧 前端顯示使用
                                'isRegex': tk_dict.get('match_type') == 'regex',
                                'matchCount': 0
                            })
                except Exception as table_err:
                    # keywords 表可能不存在，忽略錯誤
                    pass
                
                row_dict['keywords'] = all_keywords
                result.append(row_dict)
            
            print(f"[Database] get_all_keyword_sets: returning {len(result)} sets", file=sys.stderr)
            for s in result:
                kw_texts = [k.get('text', k.get('keyword', '')) for k in s.get('keywords', [])]
                print(f"[Database]   - {s.get('name')}: {len(s.get('keywords', []))} keywords: {kw_texts[:5]}{'...' if len(kw_texts) > 5 else ''}", file=sys.stderr)
            
            return result
        except Exception as e:
            print(f"[Database] Error getting keyword sets: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return []
    
    async def get_keyword_set(self, set_id: int) -> Optional[Dict]:
        """獲取單個關鍵詞集
        
        🔧 修復：同時從 JSON 字段和 keywords 表讀取並合併
        """
        await self._ensure_keyword_tables()
        import sys
        
        try:
            row = await self.fetch_one('SELECT * FROM keyword_sets WHERE id = ?', (set_id,))
            if row:
                row_dict = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0], 'name': row[1], 'description': row[2],
                    'keywords': row[3], 'match_mode': row[4] if len(row) > 4 else 'fuzzy',
                    'is_active': row[5] if len(row) > 5 else 1
                }
                
                all_keywords = []
                seen_texts = set()
                
                # 來源 1: JSON 字段
                keywords_raw = row_dict.get('keywords', '[]')
                try:
                    if isinstance(keywords_raw, str):
                        json_keywords = json.loads(keywords_raw) if keywords_raw else []
                    else:
                        json_keywords = keywords_raw or []
                except (json.JSONDecodeError, TypeError):
                    json_keywords = []
                
                for i, kw in enumerate(json_keywords):
                    if isinstance(kw, dict):
                        text = kw.get('text', kw.get('keyword', ''))
                    elif isinstance(kw, str):
                        text = kw
                    else:
                        continue
                    
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        all_keywords.append({
                            'id': kw.get('id', f"kw-{set_id}-{i}") if isinstance(kw, dict) else f"kw-{set_id}-{i}",
                            'keyword': text,
                            'text': text,
                            'isRegex': kw.get('isRegex', False) if isinstance(kw, dict) else False,
                            'matchCount': kw.get('matchCount', 0) if isinstance(kw, dict) else 0
                        })
                
                # 來源 2: keywords 關聯表
                try:
                    table_keywords = await self.fetch_all(
                        'SELECT * FROM keywords WHERE keyword_set_id = ?',
                        (set_id,)
                    )
                    for j, tk in enumerate(table_keywords):
                        tk_dict = dict(tk) if hasattr(tk, 'keys') else {
                            'id': tk[0], 'keyword_set_id': tk[1], 'keyword': tk[2],
                            'match_type': tk[3] if len(tk) > 3 else 'contains'
                        }
                        text = tk_dict.get('keyword', '')
                        if text and text not in seen_texts:
                            seen_texts.add(text)
                            all_keywords.append({
                                'id': f"kw-table-{tk_dict.get('id', j)}",
                                'keyword': text,
                                'text': text,
                                'isRegex': tk_dict.get('match_type') == 'regex',
                                'matchCount': 0
                            })
                except Exception:
                    pass
                
                row_dict['keywords'] = all_keywords
                return row_dict
            return None
        except Exception as e:
            print(f"[Database] Error getting keyword set {set_id}: {e}", file=sys.stderr)
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
        import sys
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
                
                print(f"[Database] Group {group.get('id')} raw keyword_set_ids: {keyword_set_ids_str}", file=sys.stderr)
                
                # 嘗試解析 keyword_set_ids JSON 字符串
                keywordSetIds = []
                if keyword_set_ids_str and keyword_set_ids_str != '[]':
                    try:
                        import json
                        parsed = json.loads(keyword_set_ids_str)
                        if isinstance(parsed, list):
                            keywordSetIds = parsed
                    except Exception as parse_err:
                        print(f"[Database] Failed to parse keyword_set_ids: {parse_err}", file=sys.stderr)
                
                # 如果有單個 keyword_set_id 且不在列表中，添加進去
                if keyword_set_id and keyword_set_id not in keywordSetIds:
                    keywordSetIds.append(keyword_set_id)
                
                group['keywordSetIds'] = keywordSetIds
                print(f"[Database] Group {group.get('id')} final keywordSetIds: {keywordSetIds}", file=sys.stderr)
                # 確保 memberCount 欄位存在（前端期望的格式）
                group['memberCount'] = group.get('member_count', 0) or 0
                # 🆕 添加群組類型和提取權限（前端期望的格式）
                group['resourceType'] = group.get('resource_type', 'group') or 'group'
                group['canExtractMembers'] = bool(group.get('can_extract_members', 1))
                groups.append(group)
            
            return groups
        except Exception as e:
            import sys
            print(f"[Database] Error getting groups: {e}", file=sys.stderr)
            return []
    
    async def remove_group(self, group_id: Any) -> bool:
        """刪除監控群組 - 支持多種標識符"""
        await self._ensure_keyword_tables()
        try:
            import sys
            deleted = False
            
            # 方式1: 按 ID 刪除（如果是數字）
            if isinstance(group_id, int) or (isinstance(group_id, str) and group_id.lstrip('-').isdigit()):
                numeric_id = int(group_id) if isinstance(group_id, str) else group_id
                result = await self.execute('DELETE FROM monitored_groups WHERE id = ?', (numeric_id,))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by id: {numeric_id}", file=sys.stderr)
            
            # 方式2: 按 telegram_id 刪除
            if not deleted:
                result = await self.execute('DELETE FROM monitored_groups WHERE telegram_id = ?', (str(group_id),))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by telegram_id: {group_id}", file=sys.stderr)
            
            # 方式3: 按 link 刪除
            if not deleted:
                result = await self.execute('DELETE FROM monitored_groups WHERE link LIKE ?', (f'%{group_id}%',))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by link: {group_id}", file=sys.stderr)
            
            return deleted
        except Exception as e:
            import sys
            print(f"[Database] Error removing group: {e}", file=sys.stderr)
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
    
    # ============ 觸發規則操作 ============
    
    async def get_all_trigger_rules(self) -> List[Dict]:
        """獲取所有觸發規則"""
        await self._ensure_keyword_tables()
        try:
            # 🔧 FIX: 執行 WAL checkpoint 確保讀取最新數據
            await self.connect()
            try:
                await self._connection.execute("PRAGMA wal_checkpoint(PASSIVE)")
            except Exception:
                pass  # 忽略 checkpoint 錯誤，繼續查詢
            
            rows = await self.fetch_all('SELECT * FROM trigger_rules ORDER BY priority DESC, created_at DESC')
            result = []
            for row in rows:
                rule = dict(row) if hasattr(row, 'keys') else row
                # 解析 JSON 字段
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                # 轉換字段名稱以匹配前端
                rule['isActive'] = bool(rule.get('is_active', 1))
                rule['sourceType'] = rule.get('source_type', 'all')
                rule['sourceGroupIds'] = rule.get('source_group_ids', [])
                rule['keywordSetIds'] = rule.get('keyword_set_ids', [])
                rule['responseType'] = rule.get('response_type', 'ai_chat')
                rule['responseConfig'] = rule.get('response_config', {})
                rule['senderType'] = rule.get('sender_type', 'auto')
                rule['senderAccountIds'] = rule.get('sender_account_ids', [])
                rule['delayMin'] = rule.get('delay_min', 30)
                rule['delayMax'] = rule.get('delay_max', 120)
                rule['dailyLimit'] = rule.get('daily_limit', 50)
                rule['autoAddLead'] = bool(rule.get('auto_add_lead', 1))
                rule['notifyMe'] = bool(rule.get('notify_me', 0))
                rule['triggerCount'] = rule.get('trigger_count', 0)
                rule['successCount'] = rule.get('success_count', 0)
                rule['lastTriggered'] = rule.get('last_triggered')
                rule['createdAt'] = rule.get('created_at')
                rule['updatedAt'] = rule.get('updated_at')
                result.append(rule)
            return result
        except Exception as e:
            print(f"Error getting trigger rules: {e}")
            return []
    
    async def get_trigger_rule(self, rule_id: int) -> Optional[Dict]:
        """獲取單個觸發規則"""
        await self._ensure_keyword_tables()
        try:
            row = await self.fetch_one('SELECT * FROM trigger_rules WHERE id = ?', (rule_id,))
            if row:
                rule = dict(row) if hasattr(row, 'keys') else row
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                return rule
            return None
        except Exception as e:
            print(f"Error getting trigger rule: {e}")
            return None
    
    async def add_trigger_rule(self, rule_data: Dict) -> int:
        """添加觸發規則"""
        import sys
        print(f"[Database] add_trigger_rule called with data: {rule_data}", file=sys.stderr)
        await self._ensure_keyword_tables()
        try:
            print(f"[Database] Executing INSERT for trigger rule: {rule_data.get('name')}", file=sys.stderr)
            return await self.execute_insert('''
                INSERT INTO trigger_rules (
                    name, description, priority, is_active,
                    source_type, source_group_ids, keyword_set_ids, conditions,
                    response_type, response_config,
                    sender_type, sender_account_ids, delay_min, delay_max, daily_limit,
                    auto_add_lead, notify_me
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule_data.get('name', ''),
                rule_data.get('description', ''),
                rule_data.get('priority', 2),
                1 if rule_data.get('isActive', True) else 0,
                rule_data.get('sourceType', 'all'),
                json.dumps(rule_data.get('sourceGroupIds', [])),
                json.dumps(rule_data.get('keywordSetIds', [])),
                json.dumps(rule_data.get('conditions', {})),
                rule_data.get('responseType', 'ai_chat'),
                json.dumps(rule_data.get('responseConfig', {})),
                rule_data.get('senderType', 'auto'),
                json.dumps(rule_data.get('senderAccountIds', [])),
                rule_data.get('delayMin', 30),
                rule_data.get('delayMax', 120),
                rule_data.get('dailyLimit', 50),
                1 if rule_data.get('autoAddLead', True) else 0,
                1 if rule_data.get('notifyMe', False) else 0
            ))
        except Exception as e:
            print(f"Error adding trigger rule: {e}")
            raise e
    
    async def update_trigger_rule(self, rule_id: int, rule_data: Dict) -> bool:
        """更新觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('''
                UPDATE trigger_rules SET
                    name = ?, description = ?, priority = ?, is_active = ?,
                    source_type = ?, source_group_ids = ?, keyword_set_ids = ?, conditions = ?,
                    response_type = ?, response_config = ?,
                    sender_type = ?, sender_account_ids = ?, delay_min = ?, delay_max = ?, daily_limit = ?,
                    auto_add_lead = ?, notify_me = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                rule_data.get('name', ''),
                rule_data.get('description', ''),
                rule_data.get('priority', 2),
                1 if rule_data.get('isActive', True) else 0,
                rule_data.get('sourceType', 'all'),
                json.dumps(rule_data.get('sourceGroupIds', [])),
                json.dumps(rule_data.get('keywordSetIds', [])),
                json.dumps(rule_data.get('conditions', {})),
                rule_data.get('responseType', 'ai_chat'),
                json.dumps(rule_data.get('responseConfig', {})),
                rule_data.get('senderType', 'auto'),
                json.dumps(rule_data.get('senderAccountIds', [])),
                rule_data.get('delayMin', 30),
                rule_data.get('delayMax', 120),
                rule_data.get('dailyLimit', 50),
                1 if rule_data.get('autoAddLead', True) else 0,
                1 if rule_data.get('notifyMe', False) else 0,
                rule_id
            ))
            return True
        except Exception as e:
            print(f"Error updating trigger rule: {e}")
            return False
    
    async def delete_trigger_rule(self, rule_id: int) -> bool:
        """刪除觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM trigger_rules WHERE id = ?', (rule_id,))
            return True
        except Exception as e:
            print(f"Error deleting trigger rule: {e}")
            return False
    
    async def toggle_trigger_rule(self, rule_id: int, is_active: bool) -> bool:
        """啟用/停用觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute(
                'UPDATE trigger_rules SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (1 if is_active else 0, rule_id)
            )
            return True
        except Exception as e:
            print(f"Error toggling trigger rule: {e}")
            return False
    
    async def increment_trigger_rule_stats(self, rule_id: int, success: bool = True) -> bool:
        """更新觸發規則統計"""
        await self._ensure_keyword_tables()
        try:
            if success:
                await self.execute('''
                    UPDATE trigger_rules SET 
                        trigger_count = trigger_count + 1,
                        success_count = success_count + 1,
                        last_triggered = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (rule_id,))
            else:
                await self.execute('''
                    UPDATE trigger_rules SET 
                        trigger_count = trigger_count + 1,
                        last_triggered = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (rule_id,))
            return True
        except Exception as e:
            print(f"Error updating trigger rule stats: {e}")
            return False
    
    async def get_active_trigger_rules(self) -> List[Dict]:
        """獲取所有活躍的觸發規則"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all(
                'SELECT * FROM trigger_rules WHERE is_active = 1 ORDER BY priority DESC, created_at DESC'
            )
            result = []
            for row in rows:
                rule = dict(row) if hasattr(row, 'keys') else row
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                result.append(rule)
            return result
        except Exception as e:
            print(f"Error getting active trigger rules: {e}")
            return []
    
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
        """獲取所有消息模板（統一讀取 chat_templates 表）"""
        await self._ensure_keyword_tables()
        try:
            # 改為讀取 chat_templates 表，這是實際存儲用戶創建模板的表
            rows = await self.fetch_all('SELECT * FROM chat_templates ORDER BY usage_count DESC, created_at DESC')
            import json
            templates = []
            for row in rows:
                template = dict(row) if hasattr(row, 'keys') else row
                # 轉換字段名以匹配前端期望
                template['isActive'] = bool(template.get('is_active', 1))
                template['usageCount'] = template.get('usage_count', 0)
                template['successRate'] = template.get('success_rate', 0)
                template['lastUsed'] = template.get('last_used')
                template['createdAt'] = template.get('created_at')
                template['updatedAt'] = template.get('updated_at')
                
                if template.get('variables'):
                    try:
                        template['variables'] = json.loads(template['variables'])
                    except:
                        template['variables'] = []
                templates.append(template)
            return templates
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
    
    async def get_all_leads(self, limit: int = 500) -> List[Dict]:
        """獲取潛在客戶（🔧 FIX: 從 unified_contacts 讀取）"""
        import sys
        try:
            # 🔧 FIX: 優先從 unified_contacts 表讀取（與資源中心同步）
            results = await self.fetch_all(f'''
                SELECT 
                    id, telegram_id as user_id, username, first_name, last_name, phone,
                    display_name, contact_type, source_type, source_id as source_chat_id, 
                    source_name as source_chat_title, status, tags, ai_score, activity_score,
                    value_level, is_online, last_seen, is_premium, is_verified,
                    created_at, updated_at
                FROM unified_contacts 
                WHERE contact_type = 'user'
                ORDER BY created_at DESC 
                LIMIT {limit}
            ''')
            print(f"[Database] get_all_leads: Returning {len(results)} records from unified_contacts (limit={limit})", file=sys.stderr)
            return results
        except Exception as e:
            print(f"Error getting leads: {e}", file=sys.stderr)
            # 備用：嘗試從舊表讀取
            try:
                results = await self.fetch_all(f'SELECT * FROM extracted_members ORDER BY created_at DESC LIMIT {limit}')
                return results
            except:
                return []
    
    async def get_leads_with_total(self, limit: int = 500, initial_load: bool = False) -> Dict:
        """
        獲取潛在客戶及總數
        
        Args:
            limit: 最大返回數量
            initial_load: 🆕 是否為初始加載（true 時只返回 limit 條，用於快速啟動）
        """
        import sys
        try:
            # 🔧 FIX: 從 unified_contacts 表讀取（與資源中心同步）
            count_result = await self.fetch_one("SELECT COUNT(*) as total FROM unified_contacts WHERE contact_type = 'user'")
            total_count = count_result['total'] if count_result else 0
            
            # 🆕 初始加載時只返回 limit 條，否則返回所有
            if initial_load:
                actual_limit = limit
            else:
                actual_limit = max(limit, total_count)
            
            # 🔧 FIX: 從 unified_contacts 讀取並轉換字段名
            results = await self.fetch_all(f'''
                SELECT 
                    id, telegram_id as user_id, username, first_name, last_name, phone,
                    display_name, contact_type, source_type, source_id as source_chat_id, 
                    source_name as source_chat_title, status, tags, ai_score, activity_score,
                    value_level, is_online, last_seen, is_premium, is_verified,
                    created_at, updated_at
                FROM unified_contacts 
                WHERE contact_type = 'user'
                ORDER BY created_at DESC 
                LIMIT {actual_limit}
            ''')
            print(f"[Database] get_leads_with_total: Total={total_count}, Returning {len(results)} records from unified_contacts (initial_load={initial_load})", file=sys.stderr)
            
            return {
                'leads': results,
                'total': total_count,
                'hasMore': len(results) < total_count
            }
        except Exception as e:
            print(f"Error getting leads with total: {e}", file=sys.stderr)
            return {'leads': [], 'total': 0, 'hasMore': False}
    
    async def get_leads_paginated(self, limit: int = 50, offset: int = 0, status: str = None, search: str = None) -> Dict:
        """
        🆕 分頁獲取潛在客戶（帶篩選和總數）
        🔧 FIX: 改為從 unified_contacts 讀取
        
        Args:
            limit: 每頁數量
            offset: 偏移量
            status: 狀態篩選
            search: 搜索關鍵詞
            
        Returns:
            Dict: { leads: [...], total: N, page: P, pageSize: S }
        """
        import sys
        try:
            # 🔧 FIX: 從 unified_contacts 讀取
            base_query = "FROM unified_contacts WHERE contact_type = 'user'"
            params = []
            
            if status and status != 'all':
                base_query += ' AND status = ?'
                params.append(status)
            
            if search:
                base_query += ' AND (username LIKE ? OR first_name LIKE ? OR display_name LIKE ? OR telegram_id LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term, search_term, search_term])
            
            # 獲取總數
            count_result = await self.fetch_one(f'SELECT COUNT(*) as total {base_query}', tuple(params))
            total = count_result['total'] if count_result else 0
            
            # 獲取分頁數據（轉換字段名以兼容前端）
            data_query = f'''
                SELECT 
                    id, telegram_id as user_id, username, first_name, last_name, phone,
                    display_name, contact_type, source_type, source_id as source_chat_id, 
                    source_name as source_chat_title, status, tags, ai_score, activity_score,
                    value_level, is_online, last_seen, is_premium, is_verified,
                    created_at, updated_at
                {base_query} 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            '''
            params.extend([limit, offset])
            leads = await self.fetch_all(data_query, tuple(params))
            
            page = (offset // limit) + 1 if limit > 0 else 1
            
            print(f"[Database] get_leads_paginated: total={total}, page={page}, returning {len(leads)} records", file=sys.stderr)
            
            return {
                'leads': leads,
                'total': total,
                'page': page,
                'pageSize': limit,
                'hasMore': offset + len(leads) < total
            }
        except Exception as e:
            print(f"Error getting leads paginated: {e}", file=sys.stderr)
            return {'leads': [], 'total': 0, 'page': 1, 'pageSize': limit, 'hasMore': False}
    
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
        import sys
        try:
            # 先確認記錄存在
            existing = await self.fetch_one('SELECT id, user_id FROM extracted_members WHERE id = ?', (lead_id,))
            print(f"[Database] delete_lead: looking for id={lead_id}, found={existing}", file=sys.stderr)
            
            if not existing:
                print(f"[Database] delete_lead: Lead {lead_id} not found in database", file=sys.stderr)
                return False
            
            # 執行刪除
            affected = await self.execute('DELETE FROM extracted_members WHERE id = ?', (lead_id,))
            print(f"[Database] delete_lead: DELETE affected {affected} rows", file=sys.stderr)
            
            # 確認刪除成功
            check = await self.fetch_one('SELECT id FROM extracted_members WHERE id = ?', (lead_id,))
            if check:
                print(f"[Database] delete_lead: WARNING - Lead {lead_id} still exists after DELETE!", file=sys.stderr)
                return False
            
            print(f"[Database] delete_lead: Successfully deleted Lead {lead_id}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[Database] delete_lead ERROR: {e}", file=sys.stderr)
            return False
    
    async def batch_delete_leads(self, lead_ids: List[int]) -> Dict:
        """批量刪除 Leads"""
        import sys
        try:
            print(f"[Database] batch_delete_leads: Deleting {len(lead_ids)} leads: {lead_ids}", file=sys.stderr)
            deleted = 0
            failed = []
            for lead_id in lead_ids:
                result = await self.delete_lead(lead_id)
                if result:
                    deleted += 1
                else:
                    failed.append(lead_id)
            
            print(f"[Database] batch_delete_leads: Deleted {deleted}/{len(lead_ids)}, failed: {failed}", file=sys.stderr)
            return {'success': True, 'deleted': deleted, 'failed': failed}
        except Exception as e:
            print(f"[Database] batch_delete_leads ERROR: {e}", file=sys.stderr)
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
    
    async def get_lead_by_user_id(self, user_id: str) -> Optional[Dict]:
        """根據 user_id 獲取 Lead
        
        Args:
            user_id: Telegram 用戶 ID
            
        Returns:
            Optional[Dict]: Lead 數據或 None
        """
        try:
            result = await self.fetch_one(
                '''SELECT id, user_id, username, first_name, last_name, 
                          source_chat_title, notes, online_status, 
                          contacted, response_status, created_at, updated_at
                   FROM extracted_members 
                   WHERE user_id = ?''',
                (str(user_id),)
            )
            return dict(result) if result else None
        except Exception as e:
            import sys
            print(f"Error getting lead by user_id: {e}", file=sys.stderr)
            return None
    
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

    # ============ 消息隊列相關 ============
    
    async def update_queue_message_status(
        self,
        message_id: str,
        status: Optional[str] = None,
        last_error: Optional[str] = None,
        priority: Optional[str] = None
    ) -> bool:
        """更新消息隊列中消息的狀態
        
        Args:
            message_id: 消息 ID
            status: 新狀態
            last_error: 錯誤信息
            priority: 優先級
            
        Returns:
            bool: 是否成功
        """
        try:
            # 消息隊列狀態主要在內存中管理
            # 這裡可以選擇持久化到數據庫以支持重啟恢復
            # 暫時只記錄日誌，不做實際數據庫操作
            import sys
            print(f"[Database] Queue message status update: id={message_id}, status={status}, error={last_error}", file=sys.stderr)
            return True
        except Exception as e:
            import sys
            print(f"Error updating queue message status: {e}", file=sys.stderr)
            return False
    
    async def increment_queue_message_attempts(self, message_id: str) -> bool:
        """增加消息嘗試次數
        
        Args:
            message_id: 消息 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            # 消息嘗試次數主要在內存中管理
            import sys
            print(f"[Database] Queue message attempts incremented: id={message_id}", file=sys.stderr)
            return True
        except Exception as e:
            import sys
            print(f"Error incrementing queue message attempts: {e}", file=sys.stderr)
            return False
    
    async def save_queue_message(
        self,
        message_id: str,
        phone: str,
        user_id: str,
        text: str,
        attachment: Optional[str] = None,
        priority: str = 'NORMAL',
        status: str = 'pending',
        scheduled_at: Optional[str] = None,
        attempts: int = 0,
        max_attempts: int = 3
    ) -> bool:
        """保存消息到隊列（用於持久化）
        
        Args:
            message_id: 消息 ID
            phone: 發送帳號
            user_id: 目標用戶 ID
            text: 消息內容
            attachment: 附件路徑
            priority: 優先級
            status: 狀態
            scheduled_at: 計劃發送時間
            attempts: 嘗試次數
            max_attempts: 最大嘗試次數
            
        Returns:
            bool: 是否成功
        """
        try:
            # 消息隊列主要在內存中管理
            # 這裡可以選擇持久化到數據庫以支持重啟恢復
            import sys
            print(f"[Database] Queue message saved: id={message_id}, phone={phone}, user_id={user_id}", file=sys.stderr)
            return True
        except Exception as e:
            import sys
            print(f"Error saving queue message: {e}", file=sys.stderr)
            return False
    
    # ============ 系統告警相關 ============
    
    async def add_alert(
        self,
        alert_type: str,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> int:
        """添加系統告警
        
        Args:
            alert_type: 告警類型
            level: 告警級別 (info, warning, error, critical)
            message: 告警消息
            details: 詳細信息
            
        Returns:
            int: 告警 ID
        """
        try:
            await self.connect()
            import json
            details_str = json.dumps(details) if details else None
            
            cursor = await self._connection.execute(
                """INSERT INTO system_alerts (alert_type, level, message, details)
                   VALUES (?, ?, ?, ?)""",
                (alert_type, level, message, details_str)
            )
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            import sys
            print(f"Error adding alert: {e}", file=sys.stderr)
            return 0
    
    async def acknowledge_alert(self, alert_id: int) -> bool:
        """確認告警
        
        Args:
            alert_id: 告警 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE system_alerts 
                   SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP 
                   WHERE id = ?""",
                (alert_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error acknowledging alert: {e}", file=sys.stderr)
            return False
    
    async def resolve_alert(self, alert_id: int) -> bool:
        """解決告警
        
        Args:
            alert_id: 告警 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE system_alerts 
                   SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
                   WHERE id = ?""",
                (alert_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error resolving alert: {e}", file=sys.stderr)
            return False
    
    async def get_alerts(
        self,
        limit: int = 50,
        level: Optional[str] = None,
        include_resolved: bool = False
    ) -> List[Dict[str, Any]]:
        """獲取告警列表
        
        Args:
            limit: 最大返回數量
            level: 篩選告警級別
            include_resolved: 是否包含已解決的告警
            
        Returns:
            List[Dict]: 告警列表
        """
        try:
            await self.connect()
            query = "SELECT * FROM system_alerts WHERE 1=1"
            params = []
            
            if not include_resolved:
                query += " AND resolved = 0"
            
            if level:
                query += " AND level = ?"
                params.append(level)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor = await self._connection.execute(query, tuple(params))
            rows = await cursor.fetchall()
            
            import json
            alerts = []
            for row in rows:
                alert = dict(row)
                if alert.get('details'):
                    try:
                        alert['details'] = json.loads(alert['details'])
                    except:
                        pass
                alerts.append(alert)
            
            return alerts
        except Exception as e:
            import sys
            print(f"Error getting alerts: {e}", file=sys.stderr)
            return []
    
    # ============ 聊天模板相關 ============
    
    async def get_chat_templates(self) -> List[Dict[str, Any]]:
        """獲取所有聊天模板
        
        Returns:
            List[Dict]: 模板列表
        """
        try:
            await self.connect()
            # 🔧 FIX: 執行 WAL checkpoint 確保讀取最新數據
            try:
                await self._connection.execute("PRAGMA wal_checkpoint(PASSIVE)")
            except Exception:
                pass  # 忽略 checkpoint 錯誤，繼續查詢
            
            cursor = await self._connection.execute(
                "SELECT * FROM chat_templates ORDER BY usage_count DESC, created_at DESC"
            )
            rows = await cursor.fetchall()
            
            templates = []
            import json
            for row in rows:
                template = dict(row)
                # 轉換字段名以匹配前端期望
                template['isEnabled'] = bool(template.get('is_active', 1))
                template['usageCount'] = template.get('usage_count', 0)
                template['successRate'] = template.get('success_rate', 0)
                template['lastUsed'] = template.get('last_used')
                template['createdAt'] = template.get('created_at')
                template['updatedAt'] = template.get('updated_at')
                
                if template.get('variables'):
                    try:
                        template['variables'] = json.loads(template['variables'])
                    except:
                        template['variables'] = []
                templates.append(template)
            
            return templates
        except Exception as e:
            import sys
            print(f"Error getting chat templates: {e}", file=sys.stderr)
            return []
    
    async def save_chat_template(
        self,
        template_id: Optional[int],
        name: str,
        category: str,
        content: str,
        variables: List[str],
        is_active: bool = True
    ) -> Dict[str, Any]:
        """保存聊天模板
        
        Args:
            template_id: 模板 ID（如果是更新）
            name: 模板名稱
            category: 分類
            content: 內容
            variables: 變量列表
            is_active: 是否啟用
            
        Returns:
            Dict: 保存結果
        """
        try:
            await self.connect()
            import json
            variables_str = json.dumps(variables)
            
            if template_id:
                # 更新
                await self._connection.execute(
                    """UPDATE chat_templates 
                       SET name=?, category=?, content=?, variables=?, is_active=?, updated_at=CURRENT_TIMESTAMP
                       WHERE id=?""",
                    (name, category, content, variables_str, 1 if is_active else 0, template_id)
                )
            else:
                # 新增
                cursor = await self._connection.execute(
                    """INSERT INTO chat_templates (name, category, content, variables, is_active)
                       VALUES (?, ?, ?, ?, ?)""",
                    (name, category, content, variables_str, 1 if is_active else 0)
                )
                template_id = cursor.lastrowid
            
            await self._connection.commit()
            return {'success': True, 'id': template_id}
        except Exception as e:
            import sys
            print(f"Error saving chat template: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}
    
    async def delete_chat_template(self, template_id: int) -> bool:
        """刪除聊天模板
        
        Args:
            template_id: 模板 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                "DELETE FROM chat_templates WHERE id=?", (template_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error deleting chat template: {e}", file=sys.stderr)
            return False
    
    async def increment_template_usage(self, template_id: int) -> bool:
        """增加模板使用次數
        
        Args:
            template_id: 模板 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE chat_templates 
                   SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
                   WHERE id=?""",
                (template_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error incrementing template usage: {e}", file=sys.stderr)
            return False
    
    # ========== 聊天記錄管理 ==========
    
    async def add_chat_message(
        self,
        user_id: int,
        role: str,  # 'user' or 'assistant'
        content: str,
        account_phone: str = None,
        source_group: str = None,
        message_id: str = None
    ) -> Optional[int]:
        """添加聊天記錄
        
        Args:
            user_id: 用戶 ID
            role: 消息角色 ('user' 或 'assistant')
            content: 消息內容
            account_phone: 帳號手機號
            source_group: 來源群組
            message_id: Telegram 消息 ID
            
        Returns:
            int: 記錄 ID，失敗返回 None
        """
        try:
            await self.connect()
            
            # 確保表存在
            await self._connection.execute('''
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT,
                    account_phone TEXT,
                    source_group TEXT,
                    message_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            await self._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
                ON chat_messages(user_id)
            ''')
            
            cursor = await self._connection.execute(
                '''INSERT INTO chat_messages (user_id, role, content, account_phone, source_group, message_id)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (user_id, role, content, account_phone, source_group, message_id)
            )
            await self._connection.commit()
            
            return cursor.lastrowid
        except Exception as e:
            import sys
            print(f"[Database] Error adding chat message: {e}", file=sys.stderr)
            return None
    
    async def get_chat_messages(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """獲取聊天記錄
        
        Args:
            user_id: 用戶 ID
            limit: 返回數量限制
            offset: 偏移量
            
        Returns:
            List[Dict]: 聊天記錄列表
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT * FROM chat_messages 
                   WHERE user_id = ?
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?''',
                (user_id, limit, offset)
            )
            rows = await cursor.fetchall()
            
            messages = []
            for row in rows:
                messages.append(dict(row))
            
            return messages
        except Exception as e:
            import sys
            print(f"[Database] Error getting chat messages: {e}", file=sys.stderr)
            return []
    
    # ========== 🔧 P2 優化: 話題追蹤管理 ==========
    
    async def get_covered_topics(self, user_id: str, limit: int = 10) -> List[Dict]:
        """獲取用戶已涵蓋的話題"""
        try:
            await self.connect()
            
            cursor = await self._connection.execute("""
                SELECT topic_name, depth_level, key_points, last_user_question, 
                       last_ai_response, covered_at
                FROM conversation_topics
                WHERE user_id = ?
                ORDER BY covered_at DESC
                LIMIT ?
            """, (str(user_id), limit))
            
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            import sys
            print(f"[Database] Error getting covered topics: {e}", file=sys.stderr)
            return []
    
    async def update_topic(
        self,
        user_id: str,
        topic_name: str,
        depth_level: int = 1,
        key_points: List[str] = None,
        last_question: str = None,
        last_response: str = None
    ) -> bool:
        """更新或創建話題記錄"""
        try:
            await self.connect()
            
            # 確保表存在
            await self._connection.execute("""
                CREATE TABLE IF NOT EXISTS conversation_topics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    topic_name TEXT NOT NULL,
                    covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    depth_level INTEGER DEFAULT 1,
                    key_points TEXT,
                    last_user_question TEXT,
                    last_ai_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            import json
            key_points_json = json.dumps(key_points or [])
            
            # UPSERT: 如果存在則更新，否則插入
            await self._connection.execute("""
                INSERT INTO conversation_topics 
                (user_id, topic_name, depth_level, key_points, last_user_question, last_ai_response, covered_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, topic_name) DO UPDATE SET
                    depth_level = MAX(depth_level, excluded.depth_level),
                    key_points = excluded.key_points,
                    last_user_question = excluded.last_user_question,
                    last_ai_response = excluded.last_ai_response,
                    covered_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            """, (str(user_id), topic_name, depth_level, key_points_json, last_question, last_response))
            
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating topic: {e}", file=sys.stderr)
            return False
    
    async def get_topic_depth(self, user_id: str, topic_name: str) -> int:
        """獲取特定話題的深入程度"""
        try:
            await self.connect()
            
            cursor = await self._connection.execute("""
                SELECT depth_level FROM conversation_topics
                WHERE user_id = ? AND topic_name = ?
            """, (str(user_id), topic_name))
            
            row = await cursor.fetchone()
            return row['depth_level'] if row else 0
        except Exception as e:
            return 0
    
    # ========== 銷售漏斗管理 ==========
    
    async def update_funnel_stage(
        self,
        user_id: int,
        stage: str,
        reason: str = None
    ) -> bool:
        """更新用戶的銷售漏斗階段
        
        Args:
            user_id: 用戶 ID
            stage: 漏斗階段 ('new', 'interested', 'engaged', 'qualified', 'converted', 'replied' 等)
            reason: 更新原因
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            
            # 🔧 確保表存在並有正確的約束
            # 先嘗試創建表（如果不存在）
            await self._connection.execute('''
                CREATE TABLE IF NOT EXISTS funnel_stages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    stage TEXT NOT NULL DEFAULT 'new',
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 🔧 確保 user_id 有唯一索引（用於 UPSERT）
            try:
                await self._connection.execute('''
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_stages_user_id 
                    ON funnel_stages(user_id)
                ''')
            except Exception:
                pass  # 索引可能已存在
            
            # 🔧 遷移：添加 reason 列（如果不存在）
            try:
                await self._connection.execute("SELECT reason FROM funnel_stages LIMIT 1")
            except Exception:
                try:
                    await self._connection.execute("ALTER TABLE funnel_stages ADD COLUMN reason TEXT")
                    print("[Database] Added 'reason' column to funnel_stages", file=sys.stderr)
                except Exception:
                    pass
            
            # 🔧 檢測舊表是否有 phone 列（處理向後兼容）
            has_phone_column = False
            try:
                cursor = await self._connection.execute("PRAGMA table_info(funnel_stages)")
                columns = await cursor.fetchall()
                for col in columns:
                    if col[1] == 'phone':  # col[1] 是列名
                        has_phone_column = True
                        break
            except Exception:
                pass
            
            # 🔧 使用更兼容的 UPSERT 方式
            # 先嘗試更新，如果沒有更新任何行則插入
            cursor = await self._connection.execute(
                '''UPDATE funnel_stages SET stage = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE user_id = ?''',
                (stage, reason, user_id)
            )
            
            if cursor.rowcount == 0:
                # 沒有更新，說明記錄不存在，執行插入
                if has_phone_column:
                    # 舊表有 phone 列，插入時提供默認值
                    await self._connection.execute(
                        '''INSERT INTO funnel_stages (user_id, stage, reason, phone) VALUES (?, ?, ?, ?)''',
                        (user_id, stage, reason, 'unknown')
                    )
                else:
                    await self._connection.execute(
                        '''INSERT INTO funnel_stages (user_id, stage, reason) VALUES (?, ?, ?)''',
                        (user_id, stage, reason)
                    )
            await self._connection.commit()
            
            import sys
            print(f"[Database] Updated funnel stage: user_id={user_id}, stage={stage}", file=sys.stderr)
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating funnel stage: {e}", file=sys.stderr)
            return False
    
    async def get_funnel_stage(
        self,
        user_id: int
    ) -> Optional[Dict]:
        """獲取用戶的銷售漏斗階段
        
        Args:
            user_id: 用戶 ID
            
        Returns:
            Dict: 漏斗階段信息，不存在返回 None
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT * FROM funnel_stages WHERE user_id = ?''',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return dict(row)
            return None
        except Exception as e:
            import sys
            print(f"[Database] Error getting funnel stage: {e}", file=sys.stderr)
            return None
    
    async def get_funnel_statistics(self) -> Dict:
        """獲取銷售漏斗統計
            
        Returns:
            Dict: 各階段的用戶數量
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT stage, COUNT(*) as count FROM funnel_stages GROUP BY stage'''
            )
            
            rows = await cursor.fetchall()
            
            stats = {
                'new': 0,
                'interested': 0,
                'engaged': 0,
                'qualified': 0,
                'converted': 0,
                'replied': 0,
                'total': 0
            }
            
            for row in rows:
                stage = row['stage']
                count = row['count']
                if stage in stats:
                    stats[stage] = count
                stats['total'] += count
            
            return stats
        except Exception as e:
            import sys
            print(f"[Database] Error getting funnel statistics: {e}", file=sys.stderr)
            return {'new': 0, 'interested': 0, 'engaged': 0, 'qualified': 0, 'converted': 0, 'replied': 0, 'total': 0}
    
    # ==================== 收集用戶管理 ====================
    
    async def upsert_collected_user(self, user_data: Dict[str, Any]) -> int:
        """插入或更新收集的用戶
        
        Args:
            user_data: 用戶數據字典
            
        Returns:
            用戶 ID
        """
        await self._ensure_keyword_tables()
        try:
            telegram_id = str(user_data.get('telegram_id', ''))
            if not telegram_id:
                raise ValueError("telegram_id is required")
            
            # 檢查是否已存在
            existing = await self.fetch_one(
                "SELECT id, message_count, source_groups FROM collected_users WHERE telegram_id = ?",
                (telegram_id,)
            )
            
            import json
            
            if existing:
                # 更新現有記錄
                existing_dict = dict(existing) if hasattr(existing, 'keys') else {
                    'id': existing[0], 'message_count': existing[1], 'source_groups': existing[2]
                }
                
                # 合併來源群組
                old_groups = json.loads(existing_dict.get('source_groups', '[]') or '[]')
                new_groups = user_data.get('source_groups', [])
                if isinstance(new_groups, str):
                    new_groups = json.loads(new_groups)
                merged_groups = list(set(old_groups + new_groups))
                
                # 更新消息計數
                new_count = existing_dict.get('message_count', 0) + user_data.get('message_increment', 1)
                
                await self.execute('''
                    UPDATE collected_users SET
                        username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        bio = COALESCE(?, bio),
                        has_photo = COALESCE(?, has_photo),
                        is_premium = COALESCE(?, is_premium),
                        is_verified = COALESCE(?, is_verified),
                        is_bot = COALESCE(?, is_bot),
                        source_groups = ?,
                        message_count = ?,
                        groups_count = ?,
                        last_seen_at = CURRENT_TIMESTAMP,
                        last_message_at = COALESCE(?, last_message_at),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                ''', (
                    user_data.get('username'),
                    user_data.get('first_name'),
                    user_data.get('last_name'),
                    user_data.get('bio'),
                    user_data.get('has_photo'),
                    user_data.get('is_premium'),
                    user_data.get('is_verified'),
                    user_data.get('is_bot'),
                    json.dumps(merged_groups),
                    new_count,
                    len(merged_groups),
                    user_data.get('last_message_at'),
                    telegram_id
                ))
                return existing_dict['id']
            else:
                # 插入新記錄
                source_groups = user_data.get('source_groups', [])
                if isinstance(source_groups, list):
                    source_groups = json.dumps(source_groups)
                
                return await self.execute_insert('''
                    INSERT INTO collected_users (
                        telegram_id, username, first_name, last_name, bio,
                        has_photo, is_premium, is_verified, is_bot,
                        source_groups, collected_by, message_count, groups_count,
                        last_message_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    telegram_id,
                    user_data.get('username', ''),
                    user_data.get('first_name', ''),
                    user_data.get('last_name', ''),
                    user_data.get('bio', ''),
                    1 if user_data.get('has_photo') else 0,
                    1 if user_data.get('is_premium') else 0,
                    1 if user_data.get('is_verified') else 0,
                    1 if user_data.get('is_bot') else 0,
                    source_groups,
                    user_data.get('collected_by', ''),
                    1,
                    1,
                    user_data.get('last_message_at')
                ))
        except Exception as e:
            import sys
            print(f"[Database] Error upserting collected user: {e}", file=sys.stderr)
            raise e
    
    async def update_user_risk_score(self, telegram_id: str, risk_score: float, risk_factors: Dict, value_level: str) -> bool:
        """更新用戶的風險評分"""
        try:
            import json
            await self.execute('''
                UPDATE collected_users SET
                    ad_risk_score = ?,
                    risk_factors = ?,
                    value_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            ''', (risk_score, json.dumps(risk_factors), value_level, str(telegram_id)))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating risk score: {e}", file=sys.stderr)
            return False
    
    async def add_user_message_sample(self, telegram_id: str, group_id: str, group_name: str, 
                                       message_text: str, analysis: Dict) -> int:
        """添加用戶消息樣本"""
        await self._ensure_keyword_tables()
        try:
            import json
            return await self.execute_insert('''
                INSERT INTO user_messages_sample (
                    user_telegram_id, group_id, group_name, message_text,
                    contains_link, contains_contact, ad_keywords_matched, content_risk_score,
                    message_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                str(telegram_id),
                group_id,
                group_name,
                message_text[:1000] if message_text else '',  # 限制長度
                1 if analysis.get('contains_link') else 0,
                1 if analysis.get('contains_contact') else 0,
                json.dumps(analysis.get('ad_keywords_matched', [])),
                analysis.get('content_risk_score', 0)
            ))
        except Exception as e:
            import sys
            print(f"[Database] Error adding message sample: {e}", file=sys.stderr)
            return 0
    
    async def get_collected_users(self, filters: Dict = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """獲取收集的用戶列表"""
        await self._ensure_keyword_tables()
        try:
            filters = filters or {}
            
            where_clauses = ["1=1"]
            params = []
            
            # 風險等級篩選
            if 'min_risk' in filters:
                where_clauses.append("ad_risk_score >= ?")
                params.append(filters['min_risk'])
            if 'max_risk' in filters:
                where_clauses.append("ad_risk_score <= ?")
                params.append(filters['max_risk'])
            
            # 價值等級篩選
            if 'value_levels' in filters and filters['value_levels']:
                placeholders = ','.join(['?' for _ in filters['value_levels']])
                where_clauses.append(f"value_level IN ({placeholders})")
                params.extend(filters['value_levels'])
            
            # 排除廣告號
            if filters.get('exclude_ads'):
                where_clauses.append("(is_ad_account IS NULL OR is_ad_account = 0)")
            
            # 排除黑名單
            if filters.get('exclude_blacklist'):
                where_clauses.append("is_blacklisted = 0")
            
            # 只看有用戶名的
            if filters.get('has_username'):
                where_clauses.append("username IS NOT NULL AND username != ''")
            
            # 來源群組篩選
            if 'source_group' in filters:
                where_clauses.append("source_groups LIKE ?")
                params.append(f'%{filters["source_group"]}%')
            
            where_sql = " AND ".join(where_clauses)
            
            # 排序
            order_by = filters.get('order_by', 'last_seen_at DESC')
            
            query = f'''
                SELECT * FROM collected_users 
                WHERE {where_sql}
                ORDER BY {order_by}
                LIMIT ? OFFSET ?
            '''
            params.extend([limit, offset])
            
            rows = await self.fetch_all(query, tuple(params))
            
            import json
            result = []
            for row in rows:
                user = dict(row) if hasattr(row, 'keys') else row
                # 解析 JSON 字段
                for field in ['source_groups', 'risk_factors', 'tags']:
                    if user.get(field):
                        try:
                            user[field] = json.loads(user[field])
                        except:
                            user[field] = []
                result.append(user)
            
            return result
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users: {e}", file=sys.stderr)
            return []
    
    async def get_collected_users_count(self, filters: Dict = None) -> int:
        """獲取收集用戶總數"""
        await self._ensure_keyword_tables()
        try:
            filters = filters or {}
            
            where_clauses = ["1=1"]
            params = []
            
            if filters.get('exclude_ads'):
                where_clauses.append("(is_ad_account IS NULL OR is_ad_account = 0)")
            if filters.get('exclude_blacklist'):
                where_clauses.append("is_blacklisted = 0")
            
            where_sql = " AND ".join(where_clauses)
            
            row = await self.fetch_one(
                f"SELECT COUNT(*) as cnt FROM collected_users WHERE {where_sql}",
                tuple(params)
            )
            return row['cnt'] if row else 0
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users count: {e}", file=sys.stderr)
            return 0
    
    async def mark_user_as_ad(self, telegram_id: str, is_ad: bool) -> bool:
        """標記用戶為廣告號"""
        try:
            await self.execute(
                "UPDATE collected_users SET is_ad_account = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
                (1 if is_ad else 0, str(telegram_id))
            )
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error marking user as ad: {e}", file=sys.stderr)
            return False
    
    async def blacklist_user(self, telegram_id: str, blacklist: bool) -> bool:
        """將用戶加入/移出黑名單"""
        try:
            await self.execute(
                "UPDATE collected_users SET is_blacklisted = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
                (1 if blacklist else 0, str(telegram_id))
            )
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error blacklisting user: {e}", file=sys.stderr)
            return False
    
    async def get_user_message_samples(self, telegram_id: str, limit: int = 10) -> List[Dict]:
        """獲取用戶的消息樣本"""
        try:
            rows = await self.fetch_all(
                "SELECT * FROM user_messages_sample WHERE user_telegram_id = ? ORDER BY message_time DESC LIMIT ?",
                (str(telegram_id), limit)
            )
            import json
            result = []
            for row in rows:
                sample = dict(row) if hasattr(row, 'keys') else row
                if sample.get('ad_keywords_matched'):
                    try:
                        sample['ad_keywords_matched'] = json.loads(sample['ad_keywords_matched'])
                    except:
                        sample['ad_keywords_matched'] = []
                result.append(sample)
            return result
        except Exception as e:
            import sys
            print(f"[Database] Error getting message samples: {e}", file=sys.stderr)
            return []
    
    async def get_collected_users_stats(self) -> Dict:
        """獲取收集用戶統計"""
        await self._ensure_keyword_tables()
        try:
            stats = {
                'total': 0,
                'by_value_level': {'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0},
                'by_risk': {'low': 0, 'medium': 0, 'high': 0},
                'ad_accounts': 0,
                'blacklisted': 0,
                'with_username': 0,
                'premium': 0
            }
            
            # 總數
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users")
            stats['total'] = row['cnt'] if row else 0
            
            # 按價值等級
            rows = await self.fetch_all(
                "SELECT value_level, COUNT(*) as cnt FROM collected_users GROUP BY value_level"
            )
            for row in rows:
                level = row['value_level'] if hasattr(row, 'keys') else row[0]
                count = row['cnt'] if hasattr(row, 'keys') else row[1]
                if level in stats['by_value_level']:
                    stats['by_value_level'][level] = count
            
            # 按風險等級
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score < 0.4")
            stats['by_risk']['low'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score >= 0.4 AND ad_risk_score < 0.7")
            stats['by_risk']['medium'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score >= 0.7")
            stats['by_risk']['high'] = row['cnt'] if row else 0
            
            # 其他統計
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_ad_account = 1")
            stats['ad_accounts'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_blacklisted = 1")
            stats['blacklisted'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE username IS NOT NULL AND username != ''")
            stats['with_username'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_premium = 1")
            stats['premium'] = row['cnt'] if row else 0
            
            return stats
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users stats: {e}", file=sys.stderr)
            return {'total': 0, 'by_value_level': {}, 'by_risk': {}, 'ad_accounts': 0, 'blacklisted': 0}


# 創建全局實例
db = Database()

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
from config import DATABASE_PATH

# 數據庫路徑 - 統一使用 tgmatrix.db（合併 auth.db 後單一主庫）
# 原 tgai_server.db 已合併到 tgmatrix.db，避免數據混亂
DB_PATH = DATABASE_PATH
# 帳號管理數據庫路徑（與主庫統一）
ACCOUNTS_DB_PATH = DATABASE_PATH


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


# 🔧 Phase 9-2: Import mixin classes for method delegation
from db import UserAdminMixin, AccountMixin, KeywordGroupMixin, CampaignQueueMixin, ChatFunnelMixin


class Database(UserAdminMixin, AccountMixin, KeywordGroupMixin, CampaignQueueMixin, ChatFunnelMixin):
    """數據庫管理類 — 核心連接 + Schema 管理，業務方法由 Mixin 提供"""
    
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
        
        try:
            # ============ 🆕 P2.2: users 表 Telegram 綁定字段遷移 ============
            cursor.execute("PRAGMA table_info(users)")
            users_columns = [col[1] for col in cursor.fetchall()]
            
            telegram_migrations = [
                ('telegram_id', "TEXT UNIQUE"),
                ('telegram_username', "TEXT"),
                ('telegram_first_name', "TEXT"),
                ('telegram_photo_url', "TEXT"),
                ('telegram_auth_date', "INTEGER"),
            ]
            
            for col_name, col_def in telegram_migrations:
                if col_name not in users_columns:
                    print(f"[Database] Adding column: users.{col_name}", file=sys.stderr)
                    cursor.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_def}')
                    conn.commit()
            
            # 創建 telegram_id 索引
            try:
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)')
                conn.commit()
            except Exception:
                pass  # 索引可能已存在
                
        except Exception as e:
            print(f"[Database] Telegram migration warning: {e}", file=sys.stderr)
        
        # ====================================================================
        # 🔧 P6-2: Schema 一致性修复 — 补齐缺失的列和表
        # ====================================================================
        try:
            # --- chat_history 表缺失列 (member_handlers_impl / analytics 需要) ---
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history'")
            if cursor.fetchone():
                cursor.execute("PRAGMA table_info(chat_history)")
                ch_columns = [col[1] for col in cursor.fetchall()]
                
                ch_migrations = [
                    ('sender_id', "TEXT"),
                    ('sender_name', "TEXT"),
                    ('sender_username', "TEXT"),
                    ('chat_id', "TEXT"),
                ]
                for col_name, col_def in ch_migrations:
                    if col_name not in ch_columns:
                        print(f"[Database] P6 fix: Adding chat_history.{col_name}", file=sys.stderr)
                        cursor.execute(f'ALTER TABLE chat_history ADD COLUMN {col_name} {col_def}')
                        conn.commit()
            
            # --- captured_leads 表 (discussion_watcher 需要) ---
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='captured_leads'")
            if not cursor.fetchone():
                print("[Database] P6 fix: Creating table captured_leads", file=sys.stderr)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS captured_leads (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT,
                        username TEXT,
                        first_name TEXT,
                        last_name TEXT,
                        source_group TEXT,
                        source_message TEXT,
                        interactions INTEGER DEFAULT 0,
                        lead_score REAL DEFAULT 0,
                        status TEXT DEFAULT 'new',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                conn.commit()
            
            # --- user_profiles 缺失列 (quota_service / admin 需要) ---
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'")
            if cursor.fetchone():
                cursor.execute("PRAGMA table_info(user_profiles)")
                up_columns = [col[1] for col in cursor.fetchall()]
                
                up_migrations = [
                    ('subscription_tier', "TEXT DEFAULT 'free'"),
                    ('max_accounts', "INTEGER DEFAULT 3"),
                    ('max_api_calls', "INTEGER DEFAULT 100"),
                    ('status', "TEXT DEFAULT 'active'"),
                    ('funnel_stage', "TEXT"),
                    ('interest_level', "REAL DEFAULT 0"),
                    ('last_interaction', "TIMESTAMP"),
                ]
                for col_name, col_def in up_migrations:
                    if col_name not in up_columns:
                        print(f"[Database] P6 fix: Adding user_profiles.{col_name}", file=sys.stderr)
                        cursor.execute(f'ALTER TABLE user_profiles ADD COLUMN {col_name} {col_def}')
                        conn.commit()
            
        except Exception as e:
            print(f"[Database] P6 schema fix warning: {e}", file=sys.stderr)
        
        # ====================================================================
        # 🔧 P7-2: owner_user_id 多租户列 fallback (Migration 0021 可能未执行)
        # ====================================================================
        try:
            _tenant_tables = [
                'keyword_sets', 'trigger_rules', 'message_templates',
                'chat_templates', 'collected_users', 'extracted_members',
                'monitored_groups', 'accounts', 'leads', 'campaigns',
                'discovered_resources', 'api_credentials',
            ]
            for tbl in _tenant_tables:
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{tbl}'")
                if not cursor.fetchone():
                    continue
                cursor.execute(f"PRAGMA table_info({tbl})")
                cols = [c[1] for c in cursor.fetchall()]
                if 'owner_user_id' not in cols:
                    print(f"[Database] P7 fix: Adding {tbl}.owner_user_id", file=sys.stderr)
                    cursor.execute(f'ALTER TABLE {tbl} ADD COLUMN owner_user_id TEXT')
                    conn.commit()
        except Exception as e:
            print(f"[Database] P7 owner_user_id fix warning: {e}", file=sys.stderr)
        
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
                
                -- 🆕 P2.2: Telegram 綁定信息
                telegram_id TEXT UNIQUE,
                telegram_username TEXT,
                telegram_first_name TEXT,
                telegram_photo_url TEXT,
                telegram_auth_date INTEGER,
                
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
        
        # ============ 自動補全缺失的列 ============
        # 🔧 修復：確保 users 表中有 machine_id 列（舊數據庫可能缺少）
        try:
            cursor.execute("PRAGMA table_info(users)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            
            users_missing_cols = {
                'machine_id': 'TEXT',
                'phone': 'TEXT',
                'nickname': 'TEXT',
                'avatar': 'TEXT',
                'status': "TEXT DEFAULT 'active'",
                'is_banned': 'INTEGER DEFAULT 0',
                'ban_reason': 'TEXT',
                'balance': 'REAL DEFAULT 0',
                'last_active_at': 'TIMESTAMP',
            }
            for col_name, col_def in users_missing_cols.items():
                if col_name not in existing_cols:
                    try:
                        cursor.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_def}')
                        print(f"[Database] Added missing column: users.{col_name}", file=sys.stderr)
                    except Exception:
                        pass  # 列可能已存在（並發情況）
            conn.commit()
        except Exception as e:
            print(f"[Database] Column migration warning: {e}", file=sys.stderr)
        
        # ============ 創建索引 ============
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)')
        # 🔧 修復：安全創建 machine_id 索引
        try:
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_machine_id ON users(machine_id)')
        except Exception:
            pass  # 如果列不存在，跳過索引創建
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
    
    # 🔧 Phase 9-2: Methods extracted to db/ mixin modules

    
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
    
    async def execute(self, query: str, params: tuple = None, auto_commit: bool = True) -> int:
        """異步執行 SQL 語句並返回影響的行數
        
        Args:
            query: SQL 語句
            params: 參數元組
            auto_commit: 是否自動提交（在事務中應設為 False）
        """
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
                if auto_commit:
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
            if auto_commit:
                await self._connection.commit()
            return cursor.rowcount
        except Exception as e:
            # 只在真正出錯時打印錯誤日志
            print(f"[Database] execute ERROR: {e}", file=sys.stderr)
            return 0

    async def begin_transaction(self):
        """開始一個數據庫事務"""
        await self.connect()
        await self._connection.execute("BEGIN IMMEDIATE")
    
    async def commit_transaction(self):
        """提交當前事務"""
        if self._connection:
            await self._connection.commit()
    
    async def rollback_transaction(self):
        """回滾當前事務"""
        if self._connection:
            await self._connection.rollback()
    
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
    
    # 🔧 Phase 9-2: Methods extracted to db/ mixin modules


# 創建全局實例
db = Database()

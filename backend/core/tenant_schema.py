"""
多租戶表定義 - 唯一數據源

🆕 優化設計：
1. 統一所有表定義在此文件
2. 其他模組引用此文件，避免重複定義
3. 提供表分類、驗證和查詢功能
4. 支持 Schema 版本管理

版本歷史：
- v1.0.0: 初始版本，整合現有表定義
"""

from typing import Set, Dict, Any, FrozenSet
from enum import Enum

# ============ Schema 版本 ============
SCHEMA_VERSION = "1.0.0"

# ============ 表分類枚舉 ============

class TableCategory(Enum):
    """表分類"""
    SYSTEM = "system"      # 系統級表（全局共享）
    TENANT = "tenant"      # 租戶級表（用戶隔離）
    SHARED = "shared"      # 共享表（模板等）


# ============ 系統級表（存儲在 system.db） ============

SYSTEM_TABLES: FrozenSet[str] = frozenset({
    # 用戶管理
    'users',              # 用戶帳戶
    'user_sessions',      # 登入會話
    'user_quotas',        # 用戶配額
    'devices',            # 設備綁定
    'verification_codes', # 驗證碼
    
    # 訂單與計費
    'orders',             # 訂單
    'licenses',           # 卡密
    'activations',        # 激活記錄
    'coupons',            # 優惠券
    
    # 管理員
    'admins',             # 管理員
    'admin_logs',         # 管理員日誌
    
    # 系統配置
    'settings',           # 系統設置
    'announcements',      # 公告
    'api_keys',           # API 密鑰
    
    # 統計與通知
    'stats_daily',        # 每日統計
    'notifications',      # 系統通知
    'user_notifications', # 用戶通知
    
    # 推薦系統
    'referrals',          # 邀請記錄
})


# ============ 租戶級表（存儲在 tenant_xxx.db） ============

TENANT_TABLES: FrozenSet[str] = frozenset({
    # Telegram 帳號管理
    'accounts',              # Telegram 帳號
    'heartbeats',            # 心跳記錄
    
    # 監控與關鍵詞
    'keyword_sets',          # 關鍵詞集
    'monitored_groups',      # 監控群組
    'discovery_keywords',    # 發現關鍵詞
    'custom_search_channels', # 自定義搜索渠道
    
    # 潛在客戶與聯繫人
    'leads',                 # 潛在客戶
    'unified_contacts',      # 統一聯繫人
    'extracted_members',     # 提取的成員
    'collected_users',       # 收集的用戶
    
    # 資源發現
    'discovered_resources',  # 發現的資源
    'resource_join_queue',   # 資源加入隊列
    'discovery_logs',        # 發現日誌
    'member_extraction_logs', # 成員提取日誌
    
    # 營銷與模板
    'campaigns',             # 營銷活動
    'campaign_targets',      # 活動目標
    'message_templates',     # 消息模板
    'chat_templates',        # 聊天模板
    'trigger_rules',         # 觸發規則
    
    # AI 功能
    'ai_knowledge_base',     # AI 知識庫
    'ai_strategies',         # AI 策略
    'ai_settings',           # AI 設置
    'conversation_effectiveness',  # 對話效果
    
    # 消息與日誌
    'message_queue',         # 消息隊列
    'logs',                  # 日誌
    
    # 🆕 擴展表（預留）
    'api_credentials',       # API 憑證（租戶級）
    'knowledge_items',       # 知識條目
})


# ============ 表元數據 ============

TABLE_METADATA: Dict[str, Dict[str, Any]] = {
    # 系統表元數據
    'users': {
        'category': TableCategory.SYSTEM,
        'description': '用戶帳戶',
        'primary_key': 'id',
        'indexed_columns': ['email', 'created_at'],
        'critical': True,  # 關鍵表，備份優先
    },
    'orders': {
        'category': TableCategory.SYSTEM,
        'description': '訂單記錄',
        'primary_key': 'id',
        'indexed_columns': ['user_id', 'status', 'created_at'],
        'critical': True,
    },
    'licenses': {
        'category': TableCategory.SYSTEM,
        'description': '卡密',
        'primary_key': 'id',
        'indexed_columns': ['code', 'status'],
        'critical': True,
    },
    
    # 租戶表元數據
    'accounts': {
        'category': TableCategory.TENANT,
        'description': 'Telegram 帳號',
        'primary_key': 'id',
        'indexed_columns': ['phone', 'status'],
        'critical': True,
    },
    'leads': {
        'category': TableCategory.TENANT,
        'description': '潛在客戶',
        'primary_key': 'id',
        'indexed_columns': ['user_id', 'status', 'created_at'],
        'critical': True,
    },
    'unified_contacts': {
        'category': TableCategory.TENANT,
        'description': '統一聯繫人',
        'primary_key': 'id',
        'indexed_columns': ['user_id'],
        'critical': True,
    },
    'message_templates': {
        'category': TableCategory.TENANT,
        'description': '消息模板',
        'primary_key': 'id',
        'indexed_columns': ['category', 'is_active'],
        'critical': False,
    },
    'campaigns': {
        'category': TableCategory.TENANT,
        'description': '營銷活動',
        'primary_key': 'id',
        'indexed_columns': ['status', 'created_at'],
        'critical': True,
    },
}


# ============ 輔助函數 ============

def is_system_table(table_name: str) -> bool:
    """檢查是否為系統級表"""
    return table_name in SYSTEM_TABLES


def is_tenant_table(table_name: str) -> bool:
    """檢查是否為租戶級表"""
    return table_name in TENANT_TABLES


def get_table_category(table_name: str) -> TableCategory:
    """獲取表分類"""
    if table_name in SYSTEM_TABLES:
        return TableCategory.SYSTEM
    elif table_name in TENANT_TABLES:
        return TableCategory.TENANT
    else:
        return TableCategory.TENANT  # 未知表默認為租戶表


def get_all_tables() -> Set[str]:
    """獲取所有表名"""
    return set(SYSTEM_TABLES) | set(TENANT_TABLES)


def get_critical_tables(category: TableCategory = None) -> Set[str]:
    """獲取關鍵表（需要優先備份）"""
    critical = set()
    for table, meta in TABLE_METADATA.items():
        if meta.get('critical', False):
            if category is None or meta.get('category') == category:
                critical.add(table)
    return critical


def validate_table_name(table_name: str) -> bool:
    """驗證表名是否合法"""
    # 檢查是否在已知表中
    if table_name in get_all_tables():
        return True
    
    # 檢查表名格式
    import re
    return bool(re.match(r'^[a-z][a-z0-9_]*$', table_name))


def get_tables_requiring_owner_user_id() -> Set[str]:
    """
    獲取需要 owner_user_id 字段的表
    
    注意：在新的數據庫級隔離架構下，租戶表不再需要此字段
    此函數主要用於向後兼容和遷移
    """
    return set(TENANT_TABLES)


# ============ Schema 定義 ============

def get_tenant_schema() -> str:
    """
    獲取租戶數據庫的 Schema 定義
    
    Returns:
        完整的 CREATE TABLE 語句
    """
    return TENANT_DB_SCHEMA


# 完整的租戶數據庫 Schema
TENANT_DB_SCHEMA = """
-- ============================================================
-- 多租戶數據庫 Schema
-- 版本: {version}
-- 生成時間: 自動生成
-- ============================================================

-- Telegram 帳號表
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    api_id TEXT,
    api_hash TEXT,
    proxy TEXT,
    group_name TEXT,
    role TEXT DEFAULT 'Unassigned',
    status TEXT DEFAULT 'Offline',
    two_factor_password TEXT,
    device_model TEXT,
    system_version TEXT,
    app_version TEXT,
    lang_code TEXT DEFAULT 'en',
    platform TEXT DEFAULT 'ios',
    device_id TEXT,
    proxy_type TEXT,
    proxy_host TEXT,
    proxy_port INTEGER,
    proxy_username TEXT,
    proxy_password TEXT,
    proxy_country TEXT,
    proxy_rotation_enabled INTEGER DEFAULT 0,
    enable_warmup INTEGER DEFAULT 0,
    warmup_status TEXT,
    daily_send_count INTEGER DEFAULT 0,
    daily_send_limit INTEGER DEFAULT 50,
    health_score REAL DEFAULT 100.0,
    nickname TEXT,
    notes TEXT,
    ai_enabled INTEGER DEFAULT 0,
    ai_model TEXT,
    ai_personality TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    bio TEXT,
    avatar_path TEXT,
    telegram_id TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 關鍵詞集表
CREATE TABLE IF NOT EXISTS keyword_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    keywords TEXT NOT NULL,
    match_mode TEXT DEFAULT 'any',
    is_active INTEGER DEFAULT 1,
    description TEXT,
    category TEXT,
    priority INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_matched TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 監控群組表
CREATE TABLE IF NOT EXISTS monitored_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT UNIQUE,
    title TEXT,
    username TEXT,
    member_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    last_message_at TIMESTAMP,
    keywords TEXT,
    notes TEXT,
    category TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 潛在客戶表
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    display_name TEXT,
    contact_type TEXT DEFAULT 'user',
    source_type TEXT,
    source_chat_id TEXT,
    source_chat_title TEXT,
    status TEXT DEFAULT 'new',
    tags TEXT,
    ai_score REAL DEFAULT 0.5,
    activity_score REAL DEFAULT 0.0,
    value_level TEXT DEFAULT 'C',
    is_online INTEGER DEFAULT 0,
    last_seen TIMESTAMP,
    is_premium INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 統一聯繫人表
CREATE TABLE IF NOT EXISTS unified_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    display_name TEXT,
    contact_type TEXT DEFAULT 'user',
    source_type TEXT,
    source_chat_id TEXT,
    source_chat_title TEXT,
    status TEXT DEFAULT 'new',
    tags TEXT,
    ai_score REAL DEFAULT 0.5,
    activity_score REAL DEFAULT 0.0,
    value_level TEXT DEFAULT 'C',
    is_online INTEGER DEFAULT 0,
    last_seen TIMESTAMP,
    is_premium INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 營銷活動表
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    config TEXT,
    target_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 活動目標表
CREATE TABLE IF NOT EXISTS campaign_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    target_user_id TEXT,
    target_chat_id TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP,
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- 消息模板表
CREATE TABLE IF NOT EXISTS message_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    content TEXT NOT NULL,
    variables TEXT,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_used TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 聊天模板表
CREATE TABLE IF NOT EXISTS chat_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    content TEXT NOT NULL,
    variables TEXT,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_used TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 觸發規則表
CREATE TABLE IF NOT EXISTS trigger_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    source_type TEXT DEFAULT 'all',
    source_group_ids TEXT,
    keyword_set_ids TEXT,
    conditions TEXT,
    response_type TEXT DEFAULT 'template',
    response_config TEXT,
    sender_type TEXT DEFAULT 'auto',
    sender_account_ids TEXT,
    delay_min INTEGER DEFAULT 1,
    delay_max INTEGER DEFAULT 5,
    daily_limit INTEGER DEFAULT 50,
    auto_add_lead INTEGER DEFAULT 1,
    notify_me INTEGER DEFAULT 0,
    trigger_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_triggered TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 知識庫表
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    keywords TEXT,
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 策略表
CREATE TABLE IF NOT EXISTS ai_strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    strategy_type TEXT,
    config TEXT,
    is_active INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 設置表
CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 對話效果表
CREATE TABLE IF NOT EXISTS conversation_effectiveness (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT,
    campaign_id INTEGER,
    account_id INTEGER,
    score REAL DEFAULT 0.0,
    response_rate REAL DEFAULT 0.0,
    conversion_status TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 發現關鍵詞表
CREATE TABLE IF NOT EXISTS discovery_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    category TEXT,
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    hit_count INTEGER DEFAULT 0,
    last_hit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 發現的資源表
CREATE TABLE IF NOT EXISTS discovered_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    title TEXT,
    username TEXT,
    member_count INTEGER DEFAULT 0,
    description TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    score REAL DEFAULT 0.0,
    joined_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 資源加入隊列表
CREATE TABLE IF NOT EXISTS resource_join_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER,
    account_id INTEGER,
    status TEXT DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    executed_at TIMESTAMP,
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 發現日誌表
CREATE TABLE IF NOT EXISTS discovery_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 自定義搜索渠道表
CREATE TABLE IF NOT EXISTS custom_search_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    channel_id TEXT,
    channel_type TEXT,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提取的成員表
CREATE TABLE IF NOT EXISTS extracted_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    source_chat_id TEXT,
    source_chat_title TEXT,
    is_premium INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    last_seen TIMESTAMP,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 成員提取日誌表
CREATE TABLE IF NOT EXISTS member_extraction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    chat_title TEXT,
    extracted_count INTEGER DEFAULT 0,
    account_id INTEGER,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收集的用戶表
CREATE TABLE IF NOT EXISTS collected_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    source TEXT,
    tags TEXT,
    notes TEXT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 知識條目表
CREATE TABLE IF NOT EXISTS knowledge_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API 憑證表
CREATE TABLE IF NOT EXISTS api_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    credentials TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日誌表
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    category TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 心跳記錄表
CREATE TABLE IF NOT EXISTS heartbeats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    status TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息隊列表
CREATE TABLE IF NOT EXISTS message_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    target_user_id TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 索引定義
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_accounts_phone ON accounts(phone);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_telegram_id ON accounts(telegram_id);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_unified_contacts_user_id ON unified_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign_id ON campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_status ON campaign_targets(status);

CREATE INDEX IF NOT EXISTS idx_trigger_rules_is_active ON trigger_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);

CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled_at ON message_queue(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_discovered_resources_status ON discovered_resources(status);
CREATE INDEX IF NOT EXISTS idx_extracted_members_user_id ON extracted_members(user_id);

-- ============================================================
-- Schema 元數據
-- ============================================================

CREATE TABLE IF NOT EXISTS _schema_info (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO _schema_info (id, version) VALUES (1, '{version}');
""".format(version=SCHEMA_VERSION)


# ============ 系統數據庫 Schema ============

SYSTEM_DB_SCHEMA = """
-- ============================================================
-- 系統數據庫 Schema
-- 版本: {version}
-- ============================================================

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'free',
    subscription_tier TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    max_accounts INTEGER DEFAULT 3,
    max_api_calls INTEGER DEFAULT 1000,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    is_active INTEGER DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用戶會話表
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用戶配額表
CREATE TABLE IF NOT EXISTS user_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    quota_type TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    max_allowed INTEGER NOT NULL,
    reset_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quota_type)
);

-- 訂單表
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_id TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 卡密表
CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    tier TEXT DEFAULT 'basic',
    status TEXT DEFAULT 'unused',
    used_by TEXT,
    used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 激活記錄表
CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    license_id INTEGER,
    activation_type TEXT NOT NULL,
    device_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 優惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理員表
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    permissions TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理員日誌表
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系統設置表
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_active INTEGER DEFAULT 1,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API 密鑰表
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions TEXT,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 每日統計表
CREATE TABLE IF NOT EXISTS stats_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系統通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    is_global INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用戶通知表
CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    notification_id INTEGER,
    is_read INTEGER DEFAULT 0,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 推薦記錄表
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reward_type TEXT,
    reward_value REAL,
    rewarded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 設備綁定表
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT,
    is_active INTEGER DEFAULT 1,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- 驗證碼表
CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'email',
    expires_at TIMESTAMP NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_code ON licenses(code);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stats_daily_date ON stats_daily(date);

-- Schema 元數據
CREATE TABLE IF NOT EXISTS _schema_info (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO _schema_info (id, version) VALUES (1, '{version}');
""".format(version=SCHEMA_VERSION)

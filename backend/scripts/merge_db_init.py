#!/usr/bin/env python3
"""
數據庫合併腳本：將 auth.db 與 tgmatrix.db 統一為單一 tgmatrix.db

使用場景：測試階段，不需保留原始數據，確保程序無數據混亂。

執行方式：
  python -m scripts.merge_db_init [--fresh]

  --fresh: 若存在 tgmatrix.db，先刪除再重建（完全重置）
"""

import os
import sys
from pathlib import Path

# 確保 backend 根目錄在 path 中
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.chdir(BACKEND_ROOT)

from config import DATABASE_PATH


def run_merge(fresh: bool = False):
    """執行合併初始化"""
    db_path = str(DATABASE_PATH)
    db_dir = Path(db_path).parent
    db_dir.mkdir(parents=True, exist_ok=True)

    if fresh and Path(db_path).exists():
        Path(db_path).unlink()
        print(f"[Merge] Removed existing {db_path}")

    import sqlite3
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=OFF")
    cursor = conn.cursor()

    # ========== 統一 users 表（認證 + 會員）==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE,
            email TEXT UNIQUE,
            username TEXT UNIQUE,
            password_hash TEXT,
            display_name TEXT,
            avatar_url TEXT,
            auth_provider TEXT DEFAULT 'local',
            oauth_id TEXT,
            telegram_id TEXT UNIQUE,
            telegram_username TEXT,
            telegram_first_name TEXT,
            telegram_photo_url TEXT,
            google_id TEXT UNIQUE,
            role TEXT DEFAULT 'free',
            subscription_tier TEXT DEFAULT 'free',
            subscription_expires TIMESTAMP,
            membership_level TEXT DEFAULT 'bronze',
            expires_at TIMESTAMP,
            is_lifetime INTEGER DEFAULT 0,
            max_accounts INTEGER DEFAULT 3,
            max_api_calls INTEGER DEFAULT 1000,
            is_active INTEGER DEFAULT 1,
            is_verified INTEGER DEFAULT 0,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_secret TEXT,
            invite_code TEXT UNIQUE,
            invited_by TEXT,
            total_invites INTEGER DEFAULT 0,
            invite_earnings REAL DEFAULT 0,
            total_spent REAL DEFAULT 0,
            balance REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            is_banned INTEGER DEFAULT 0,
            ban_reason TEXT,
            machine_id TEXT,
            phone TEXT,
            nickname TEXT,
            avatar TEXT,
            telegram_auth_date INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP,
            last_active_at TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)')
    print("[Merge] users table ready")

    # ========== Auth 表 ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT,
            device_id TEXT,
            device_name TEXT,
            device_type TEXT,
            ip_address TEXT,
            user_agent TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            last_activity_at TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT,
            key_hash TEXT UNIQUE,
            prefix TEXT,
            scopes TEXT,
            rate_limit INTEGER DEFAULT 100,
            allowed_ips TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            last_used_at TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            email TEXT,
            code TEXT,
            type TEXT,
            expires_at TIMESTAMP,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS auth_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("[Merge] auth tables ready")

    # ========== Auth 子模塊表（原 auth.db）==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            device_name TEXT,
            device_type TEXT DEFAULT 'unknown',
            ip_address TEXT,
            location TEXT,
            user_agent TEXT,
            refresh_token_hash TEXT,
            last_active TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            status TEXT DEFAULT 'active'
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id)')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL,
            identifier_type TEXT NOT NULL,
            success INTEGER DEFAULT 0,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lockouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL,
            identifier_type TEXT NOT NULL,
            reason TEXT,
            locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unlock_at TIMESTAMP NOT NULL,
            consecutive_lockouts INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS geo_cache (
            ip TEXT PRIMARY KEY,
            country TEXT,
            country_code TEXT,
            region TEXT,
            city TEXT,
            latitude REAL,
            longitude REAL,
            isp TEXT,
            is_vpn INTEGER DEFAULT 0,
            is_proxy INTEGER DEFAULT 0,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trusted_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            country_code TEXT,
            city TEXT,
            ip_prefix TEXT,
            trusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, country_code, city)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            severity TEXT DEFAULT 'low',
            ip_address TEXT,
            location TEXT,
            details TEXT,
            acknowledged INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("[Merge] auth submodule tables (device_sessions, login_attempts, lockouts, geo_cache, trusted_locations, security_events) ready")

    # ========== 卡密 / 訂單 / 管理員 ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT UNIQUE NOT NULL,
            type_code TEXT NOT NULL,
            level TEXT NOT NULL,
            duration_type TEXT NOT NULL,
            duration_days INTEGER NOT NULL,
            price REAL DEFAULT 0,
            status TEXT DEFAULT 'unused',
            used_by TEXT,
            used_at TIMESTAMP,
            machine_id TEXT,
            activated_at TIMESTAMP,
            expires_at TIMESTAMP,
            batch_id TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            product_type TEXT NOT NULL,
            product_level TEXT NOT NULL,
            product_duration TEXT NOT NULL,
            product_name TEXT NOT NULL,
            original_price REAL NOT NULL,
            discount_amount REAL DEFAULT 0,
            final_price REAL NOT NULL,
            currency TEXT DEFAULT 'CNY',
            payment_method TEXT,
            payment_gateway TEXT,
            transaction_id TEXT,
            status TEXT DEFAULT 'pending',
            license_key TEXT,
            coupon_code TEXT,
            referrer_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP,
            expired_at TIMESTAMP,
            refunded_at TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            gateway_response TEXT
        )
    ''')
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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            type TEXT DEFAULT 'info',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("[Merge] licenses, orders, admins, announcements ready")

    conn.commit()

    # 若 fresh 且 admins 為空，創建默認管理員
    cursor.execute('SELECT COUNT(*) FROM admins')
    if cursor.fetchone()[0] == 0:
        import hashlib
        h = hashlib.sha256("admin888".encode()).hexdigest()
        cursor.execute(
            'INSERT INTO admins (username, password_hash, name, role, is_active) VALUES (?,?,?,?,?)',
            ('admin', h, '超級管理員', 'super_admin', 1)
        )
        conn.commit()
        print("[Merge] default admin created: admin / admin888")

    conn.close()
    print(f"[Merge] Done. Unified DB: {db_path}")


if __name__ == '__main__':
    fresh = '--fresh' in sys.argv
    run_merge(fresh=fresh)

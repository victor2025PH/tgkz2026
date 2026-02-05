"""
Migration: Add Platform APIs Table

創建平台 API 池表，用於存儲平台提供的公共 API 憑據。

表結構：
- platform_apis: 存儲 API 憑據和使用狀態
- api_account_bindings: 記錄 API 和賬號的綁定關係
"""

import sqlite3
import sys
from datetime import datetime


MIGRATION_ID = "0024_add_platform_apis"
MIGRATION_NAME = "Add Platform APIs Table"


def migrate(conn: sqlite3.Connection) -> bool:
    """
    執行遷移
    """
    cursor = conn.cursor()
    
    try:
        # 1. 創建平台 API 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS platform_apis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_id TEXT UNIQUE NOT NULL,
                api_hash TEXT NOT NULL,
                name TEXT,
                description TEXT,
                
                -- 狀態
                status TEXT DEFAULT 'active',
                is_active INTEGER DEFAULT 1,
                
                -- 容量控制
                max_accounts INTEGER DEFAULT 15,
                current_accounts INTEGER DEFAULT 0,
                
                -- 優先級和權重
                priority INTEGER DEFAULT 50,
                
                -- 錯誤追踪
                error_count INTEGER DEFAULT 0,
                last_error TEXT,
                last_error_at REAL,
                cooldown_until REAL DEFAULT 0,
                
                -- 統計
                total_allocations INTEGER DEFAULT 0,
                total_success INTEGER DEFAULT 0,
                total_errors INTEGER DEFAULT 0,
                
                -- 時間戳
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print(f"[{MIGRATION_ID}] ✅ 創建 platform_apis 表", file=sys.stderr)
        
        # 2. 創建 API 賬號綁定表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_account_bindings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_id TEXT NOT NULL,
                account_phone TEXT NOT NULL,
                user_id INTEGER,
                
                -- 狀態
                status TEXT DEFAULT 'active',
                
                -- 時間戳
                bound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                
                -- 確保唯一性
                UNIQUE(api_id, account_phone)
            )
        """)
        print(f"[{MIGRATION_ID}] ✅ 創建 api_account_bindings 表", file=sys.stderr)
        
        # 3. 創建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_platform_apis_status 
            ON platform_apis(status, is_active)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_platform_apis_usage 
            ON platform_apis(current_accounts, max_accounts)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_bindings_api 
            ON api_account_bindings(api_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_bindings_phone 
            ON api_account_bindings(account_phone)
        """)
        
        print(f"[{MIGRATION_ID}] ✅ 創建索引", file=sys.stderr)
        
        # 4. 插入一些示例 API（可選，生產環境應手動添加）
        # 這裡不插入任何數據，由管理員手動添加
        
        conn.commit()
        print(f"[{MIGRATION_ID}] ✅ 遷移完成", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"[{MIGRATION_ID}] ❌ 遷移失敗: {e}", file=sys.stderr)
        conn.rollback()
        return False


def rollback(conn: sqlite3.Connection) -> bool:
    """
    回滾遷移
    """
    cursor = conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS api_account_bindings")
        cursor.execute("DROP TABLE IF EXISTS platform_apis")
        conn.commit()
        print(f"[{MIGRATION_ID}] ✅ 回滾完成", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[{MIGRATION_ID}] ❌ 回滾失敗: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    # 測試遷移
    import os
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'system.db')
    
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        if migrate(conn):
            print("Migration successful!")
        else:
            print("Migration failed!")
        
        conn.close()
    else:
        print(f"Database not found: {db_path}")

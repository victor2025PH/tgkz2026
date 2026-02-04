#!/usr/bin/env python3
"""檢查多租戶配置和數據"""
import sqlite3
import os

print("=== Environment ===")
print(f"ELECTRON_MODE: {os.environ.get('ELECTRON_MODE', 'not set')}")

db_path = '/app/data/tgmatrix.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 檢查 accounts 表結構
    print("\n=== Accounts Table Schema ===")
    cursor.execute("PRAGMA table_info(accounts)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col['name']}: {col['type']}")
    
    # 檢查是否有 owner_user_id 列
    col_names = [col['name'] for col in columns]
    has_owner = 'owner_user_id' in col_names
    print(f"\nHas owner_user_id column: {has_owner}")
    
    # 檢查 accounts 數據
    print("\n=== Accounts Data ===")
    if has_owner:
        cursor.execute('SELECT id, phone, owner_user_id FROM accounts')
    else:
        cursor.execute('SELECT id, phone FROM accounts')
    
    for row in cursor.fetchall():
        if has_owner:
            print(f"  ID: {row['id']}, Phone: {row['phone']}, Owner: {row['owner_user_id']}")
        else:
            print(f"  ID: {row['id']}, Phone: {row['phone']}, Owner: NO COLUMN")
    
    # 檢查 users 表
    print("\n=== Users ===")
    cursor.execute('SELECT id, username, email FROM users LIMIT 10')
    for row in cursor.fetchall():
        print(f"  ID: {row['id']}, Username: {row['username']}, Email: {row['email']}")
    
    conn.close()
else:
    print(f"Database not found: {db_path}")

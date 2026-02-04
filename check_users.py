#!/usr/bin/env python3
"""查看系统用户和账号归属"""
import sqlite3

# 检查 tgmatrix.db 的 users 表
print("=== tgmatrix.db users table structure ===")
conn = sqlite3.connect("/app/data/tgmatrix.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print(f"  Columns: {[c[1] for c in columns]}")

# 查询用户
cursor.execute("SELECT * FROM users LIMIT 10")
users = cursor.fetchall()
print(f"\n=== Users ===")
for u in users:
    print(f"  {u}")
conn.close()

# 检查账号归属
print("\n=== Accounts ===")
conn = sqlite3.connect("/app/data/tgmatrix.db")
cursor = conn.cursor()
cursor.execute("SELECT id, phone, owner_user_id FROM accounts")
accounts = cursor.fetchall()
for a in accounts:
    print(f"  ID: {a[0]}, Phone: {a[1]}, Owner: {a[2]}")
conn.close()

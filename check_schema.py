#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect("/app/data/tgmatrix.db")
cursor = conn.cursor()

# 获取 accounts 表结构
cursor.execute("PRAGMA table_info(accounts)")
columns = cursor.fetchall()
print("=== accounts table columns ===")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# 检查是否有 owner_user_id 列
has_owner = any(col[1] == 'owner_user_id' for col in columns)
print(f"\nHas owner_user_id: {has_owner}")

# 获取现有数据的 owner_user_id 值
cursor.execute("SELECT DISTINCT owner_user_id FROM accounts LIMIT 10")
owners = cursor.fetchall()
print(f"\nExisting owner_user_id values: {[o[0] for o in owners] if owners else 'Column not found or empty'}")

conn.close()

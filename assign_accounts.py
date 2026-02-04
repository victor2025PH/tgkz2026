#!/usr/bin/env python3
"""將測試帳號分配給 fordbrend 用戶"""
import sqlite3

# fordbrend (Chaya) 的用戶 ID
FORDBREND_USER_ID = "418f6210-41ef-4afa-9313-f126fdbfd769"

print("=== 分配測試帳號給 fordbrend ===")

conn = sqlite3.connect("/app/data/tgmatrix.db")
cursor = conn.cursor()

# 更新帳號的 owner_user_id
cursor.execute(
    "UPDATE accounts SET owner_user_id = ? WHERE owner_user_id = 'local_user'",
    (FORDBREND_USER_ID,)
)
updated = cursor.rowcount
conn.commit()

print(f"  已更新 {updated} 個帳號")

# 驗證結果
cursor.execute("SELECT id, phone, owner_user_id FROM accounts")
accounts = cursor.fetchall()
print("\n=== 更新後的帳號歸屬 ===")
for a in accounts:
    print(f"  ID: {a[0]}, Phone: {a[1]}, Owner: {a[2]}")

conn.close()
print("\n✓ 完成！")

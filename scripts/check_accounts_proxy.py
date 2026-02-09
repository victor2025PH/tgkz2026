#!/usr/bin/env python3
"""检查账号代理绑定状态"""
import sqlite3, json, os, glob

def check_db(db_path, label):
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
    if not c.fetchone():
        conn.close()
        return
    print(f"\n=== {label} ({db_path}) ===")
    c.execute("SELECT id, phone, status, proxy, proxyType, proxyHost, proxyPort, proxyUsername FROM accounts")
    rows = c.fetchall()
    for r in rows:
        print(json.dumps(dict(r), ensure_ascii=False))
    if not rows:
        print("No accounts")
    conn.close()

# 主数据库
check_db("/app/data/tgmatrix.db", "主数据库帐号")

# 代理池
print("\n=== 代理池绑定状态 ===")
conn = sqlite3.connect("/app/data/tgmatrix.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT id, host, port, status, assigned_account_id, assigned_phone FROM static_proxies")
for r in c.fetchall():
    print(json.dumps(dict(r), ensure_ascii=False))
conn.close()

# 租户数据库
tenant_dir = "/app/data/tenants"
if os.path.isdir(tenant_dir):
    for f in glob.glob(os.path.join(tenant_dir, "*.db")):
        check_db(f, "租户帐号")

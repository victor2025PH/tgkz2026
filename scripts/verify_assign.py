#!/usr/bin/env python3
"""验证代理分配结果"""
import sqlite3, json

conn = sqlite3.connect("/app/data/tgmatrix.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=== 帐号代理绑定 ===")
c.execute("SELECT id, phone, proxy, proxyType, proxyHost, proxyPort FROM accounts")
for r in c.fetchall():
    print(json.dumps(dict(r), ensure_ascii=False))

print("\n=== 代理池状态 ===")
c.execute("SELECT id, host, port, status, assigned_account_id, assigned_phone FROM static_proxies")
for r in c.fetchall():
    print(json.dumps(dict(r), ensure_ascii=False))

conn.close()

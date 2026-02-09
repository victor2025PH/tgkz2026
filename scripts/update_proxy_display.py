#!/usr/bin/env python3
"""
更新 accounts 表的 proxy 字段为实际代理 URL，
让前端能看到具体 IP 而不是 'auto'。
"""
import sqlite3
import json

DB_PATH = "/app/data/tgmatrix.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 查找所有 proxy='auto' 且已有 proxyHost 的账号
    c.execute("""
        SELECT id, phone, proxy, proxyType, proxyHost, proxyPort, proxyUsername, proxyPassword
        FROM accounts
        WHERE proxy = 'auto' AND proxyHost IS NOT NULL AND proxyHost != ''
    """)
    accounts = [dict(r) for r in c.fetchall()]

    print(f"需要更新 proxy 字段的帐号: {len(accounts)} 个")

    for acct in accounts:
        ptype = acct.get("proxyType", "socks5")
        host = acct["proxyHost"]
        port = acct["proxyPort"]
        user = acct.get("proxyUsername") or ""
        pwd = acct.get("proxyPassword") or ""

        auth = f"{user}:{pwd}@" if user and pwd else ""
        proxy_url = f"{ptype}://{auth}{host}:{port}"

        c.execute("UPDATE accounts SET proxy = ? WHERE id = ?", (proxy_url, acct["id"]))
        print(f"  {acct['phone']} -> {proxy_url}")

    conn.commit()

    # 验证
    print("\n=== 验证结果 ===")
    c.execute("SELECT id, phone, proxy, proxyType, proxyHost, proxyPort FROM accounts")
    for r in c.fetchall():
        d = dict(r)
        print(json.dumps(d, ensure_ascii=False))

    conn.close()

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
将代理池里的 3 个代理分别分配给 3 个账号（一对一）。
同时更新 accounts 表中的 proxyHost/proxyPort 等字段，让 Telegram 登录时使用。
"""
import sqlite3
import json

DB_PATH = "/app/data/tgmatrix.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 获取所有可用代理
    c.execute("SELECT id, host, port, username, password, proxy_type FROM static_proxies WHERE status = 'available' ORDER BY id")
    proxies = [dict(r) for r in c.fetchall()]

    # 获取所有 proxy=auto 且未分配的账号
    c.execute("SELECT id, phone FROM accounts WHERE proxy = 'auto' ORDER BY id")
    accounts = [dict(r) for r in c.fetchall()]

    print(f"可用代理: {len(proxies)} 个")
    print(f"待分配帐号: {len(accounts)} 个")

    assigned = 0
    for i, acct in enumerate(accounts):
        if i >= len(proxies):
            print(f"  代理不够，帐号 {acct['phone']} 未分配")
            break

        proxy = proxies[i]
        proxy_id = proxy["id"]
        phone = acct["phone"]
        acct_id = acct["id"]

        # 1. 更新 static_proxies 表：标记为已分配
        c.execute("""
            UPDATE static_proxies 
            SET status = 'assigned', assigned_account_id = ?, assigned_phone = ?
            WHERE id = ?
        """, (str(acct_id), phone, proxy_id))

        # 2. 更新 accounts 表：写入代理详情
        proxy_type = proxy.get("proxy_type", "socks5")
        c.execute("""
            UPDATE accounts 
            SET proxyType = ?, proxyHost = ?, proxyPort = ?,
                proxyUsername = ?, proxyPassword = ?
            WHERE id = ?
        """, (proxy_type, proxy["host"], proxy["port"],
              proxy.get("username"), proxy.get("password"), acct_id))

        assigned += 1
        print(f"  {phone} -> {proxy['host']}:{proxy['port']} ({proxy_type})")

    conn.commit()
    conn.close()
    print(f"\n完成：成功分配 {assigned} 个")

if __name__ == "__main__":
    main()

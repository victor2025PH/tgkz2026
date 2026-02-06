#!/usr/bin/env python3
"""
查詢登錄詳細情況
在服務器上執行：cd /opt/tg-matrix && python3 scripts/query_login_details.py
或在項目根目錄：python3 scripts/query_login_details.py
"""
import os
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

def get_data_dir():
    """項目根目錄下的 data"""
    for base in [Path(__file__).resolve().parent.parent, Path("/opt/tg-matrix"), Path(".")]:
        d = base / "data"
        if d.exists():
            return d
    return Path("data")

def run(db_path: Path, sql: str, params=()):
    if not db_path.exists():
        return []
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def main():
    data_dir = get_data_dir()
    auth_db = data_dir / "auth.db"
    tgmatrix_db = data_dir / "tgmatrix.db"

    print("=" * 60)
    print("  登錄詳細情況查詢")
    print("  數據目錄:", data_dir)
    print("=" * 60)

    # ---------- 1. 網站用戶最近登錄 ----------
    print("\n【1】網站用戶登錄時間（auth.db → users）")
    print("-" * 50)
    if auth_db.exists():
        rows = run(auth_db, """
            SELECT id, email, role,
                   datetime(last_login_at) AS last_login_at,
                   datetime(created_at) AS created_at
            FROM users
            ORDER BY CASE WHEN last_login_at IS NULL THEN 1 ELSE 0 END, last_login_at DESC
            LIMIT 20
        """)
        for r in rows:
            print(f"  id={r.get('id')}  email={r.get('email')}  role={r.get('role')}")
            print(f"    最後登錄: {r.get('last_login_at') or '(從未)'}  註冊: {r.get('created_at')}")
        if not rows:
            print("  (無用戶或表不存在)")
    else:
        print("  auth.db 不存在")

    # ---------- 2. 登錄審計（掃碼/Token 等）----------
    print("\n【2】登錄審計記錄（auth.db → login_audit，最近 20 條）")
    print("-" * 50)
    if auth_db.exists():
        try:
            rows = run(auth_db, """
                SELECT id, telegram_id, success, ip_address,
                       datetime(created_at) AS created_at
                FROM login_audit
                ORDER BY created_at DESC
                LIMIT 20
            """)
            for r in rows:
                ok = "成功" if r.get("success") else "失敗"
                print(f"  {r.get('created_at')}  telegram_id={r.get('telegram_id')}  {ok}  ip={r.get('ip_address')}")
            if not rows:
                print("  (無記錄)")
        except Exception as e:
            print("  查詢失敗:", e)
    else:
        print("  auth.db 不存在")

    # ---------- 3. Telegram 帳號及更新時間 ----------
    print("\n【3】Telegram 帳號列表及時間（tgmatrix.db → accounts）")
    print("-" * 50)
    if tgmatrix_db.exists():
        rows = run(tgmatrix_db, """
            SELECT id, phone, status, owner_user_id,
                   datetime(created_at) AS created_at,
                   datetime(updated_at) AS updated_at
            FROM accounts
            ORDER BY updated_at DESC
            LIMIT 30
        """)
        for r in rows:
            print(f"  id={r.get('id')}  phone={r.get('phone')}  status={r.get('status')}")
            print(f"    owner_user_id={r.get('owner_user_id')}")
            print(f"    創建: {r.get('created_at')}  更新: {r.get('updated_at')}")
        if not rows:
            print("  (無帳號)")
    else:
        print("  tgmatrix.db 不存在")

    # ---------- 4. 今日有登錄的網站用戶 ----------
    print("\n【4】今日有登錄的網站用戶")
    print("-" * 50)
    if auth_db.exists():
        try:
            rows = run(auth_db, """
                SELECT id, email, datetime(last_login_at) AS last_login_at
                FROM users
                WHERE date(last_login_at) = date('now', 'localtime')
                ORDER BY last_login_at DESC
            """)
            for r in rows:
                print(f"  {r.get('email')}  最後登錄: {r.get('last_login_at')}")
            if not rows:
                print("  (今日無網站登錄記錄)")
        except Exception as e:
            print("  查詢失敗:", e)

    # ---------- 5. 今日有更新的 Telegram 帳號 ----------
    print("\n【5】今日有創建或更新的 Telegram 帳號")
    print("-" * 50)
    if tgmatrix_db.exists():
        try:
            rows = run(tgmatrix_db, """
                SELECT id, phone, status,
                       datetime(created_at) AS created_at,
                       datetime(updated_at) AS updated_at
                FROM accounts
                WHERE date(updated_at) = date('now', 'localtime')
                   OR date(created_at) = date('now', 'localtime')
                ORDER BY updated_at DESC
            """)
            for r in rows:
                print(f"  {r.get('phone')}  status={r.get('status')}  更新: {r.get('updated_at')}")
            if not rows:
                print("  (今日無帳號創建或更新)")
        except Exception as e:
            print("  查詢失敗:", e)

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()

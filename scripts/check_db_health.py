#!/usr/bin/env python3
"""检查所有 SQLite 数据库的完整性"""
import sqlite3
import os
import glob

DATA_DIR = "/app/data"

def check_db(db_path):
    name = os.path.basename(db_path)
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        # integrity check
        c.execute("PRAGMA integrity_check")
        result = c.fetchone()
        status = result[0] if result else "unknown"
        # journal mode
        c.execute("PRAGMA journal_mode")
        journal = c.fetchone()[0]
        # page size
        c.execute("PRAGMA page_size")
        page_size = c.fetchone()[0]
        # WAL checkpoint
        if journal == "wal":
            try:
                c.execute("PRAGMA wal_checkpoint(PASSIVE)")
                wal_result = c.fetchone()
                wal_info = f"wal_pages={wal_result[1]}, checkpointed={wal_result[2]}"
            except Exception as e:
                wal_info = f"checkpoint error: {e}"
        else:
            wal_info = "N/A"
        conn.close()
        print(f"  {name}: integrity={status}, journal={journal}, page_size={page_size}, {wal_info}")
        return status == "ok"
    except Exception as e:
        print(f"  {name}: ERROR - {e}")
        return False

print("=== 数据库健康检查 ===\n")

all_ok = True
for db_file in sorted(glob.glob(os.path.join(DATA_DIR, "*.db"))):
    if not check_db(db_file):
        all_ok = False

# tenant databases
tenant_dir = os.path.join(DATA_DIR, "tenants")
if os.path.isdir(tenant_dir):
    print()
    for db_file in sorted(glob.glob(os.path.join(tenant_dir, "*.db"))):
        if not check_db(db_file):
            all_ok = False

print(f"\n总体状态: {'全部正常' if all_ok else '存在问题!'}")

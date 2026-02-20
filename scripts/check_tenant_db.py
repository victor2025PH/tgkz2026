#!/usr/bin/env python3
"""Check accounts in both main and tenant databases."""
import sqlite3
import os
import glob

DATA_DIR = '/app/data'

# Check main DB
main_db = os.path.join(DATA_DIR, 'tgmatrix.db')
conn = sqlite3.connect(main_db)
rows = conn.execute("SELECT phone, owner_user_id, status FROM accounts").fetchall()
print(f"Main DB ({main_db}): {len(rows)} accounts")
for r in rows:
    print(f"  phone={r[0]}, owner={r[1]}, status={r[2]}")
conn.close()

# Check all tenant DBs
tenant_dir = os.path.join(DATA_DIR, 'tenants')
for db_file in sorted(glob.glob(os.path.join(tenant_dir, '*.db'))):
    if '-shm' in db_file or '-wal' in db_file:
        continue
    conn = sqlite3.connect(db_file)
    try:
        rows = conn.execute("SELECT phone, owner_user_id, status FROM accounts").fetchall()
        print(f"\nTenant DB ({os.path.basename(db_file)}): {len(rows)} accounts")
        for r in rows:
            print(f"  phone={r[0]}, owner={r[1]}, status={r[2]}")
    except Exception as e:
        print(f"\nTenant DB ({os.path.basename(db_file)}): Error - {e}")
    conn.close()

# Check which DB the app actually uses
print("\n--- Checking database.py get_all_accounts logic ---")
try:
    import sys
    sys.path.insert(0, '/app')
    from database import db
    print(f"DB instance: {db}")
    print(f"DB path: {getattr(db, 'db_path', 'unknown')}")
except Exception as e:
    print(f"Could not import db: {e}")

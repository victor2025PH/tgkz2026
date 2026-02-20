#!/usr/bin/env python3
"""Fix owner_user_id for accounts that have 'local_user' as owner."""
import sqlite3
import sys

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else '/opt/tg-matrix/data/tgmatrix.db'
TENANT_ID = '037affdb-d948-41fe-8f76-10f1c2d8207e'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check current state
cur.execute("SELECT phone, owner_user_id FROM accounts")
rows = cur.fetchall()
print(f"Found {len(rows)} accounts:")
for phone, owner in rows:
    print(f"  {phone}: owner_user_id = {owner}")

# Update accounts with wrong owner
cur.execute(
    "UPDATE accounts SET owner_user_id = ? WHERE owner_user_id IN ('local_user', '', NULL) OR owner_user_id IS NULL",
    (TENANT_ID,)
)
updated = cur.rowcount
conn.commit()
print(f"\nUpdated {updated} accounts to owner_user_id = {TENANT_ID}")

# Also update monitored_groups, keyword_sets, leads, etc.
for table in ['monitored_groups', 'keyword_sets', 'leads', 'campaigns', 'settings', 'discovered_resources']:
    try:
        cur.execute(f"PRAGMA table_info({table})")
        cols = [row[1] for row in cur.fetchall()]
        if 'owner_user_id' in cols:
            cur.execute(
                f"UPDATE {table} SET owner_user_id = ? WHERE owner_user_id IN ('local_user', '', NULL) OR owner_user_id IS NULL",
                (TENANT_ID,)
            )
            print(f"  {table}: updated {cur.rowcount} rows")
            conn.commit()
    except Exception as e:
        print(f"  {table}: {e}")

# Verify
cur.execute("SELECT phone, owner_user_id FROM accounts")
rows = cur.fetchall()
print(f"\nAfter fix - {len(rows)} accounts:")
for phone, owner in rows:
    print(f"  {phone}: owner_user_id = {owner}")

conn.close()
print("\nDone!")

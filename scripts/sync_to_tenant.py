#!/usr/bin/env python3
"""Sync accounts from main tgmatrix.db to tenant database."""
import sqlite3
import sys

MAIN_DB = '/opt/tg-matrix/data/tgmatrix.db'
TENANT_DB = '/opt/tg-matrix/data/tenants/tenant_037affdbd94841fe8f7610f1c2d8207e.db'

main_conn = sqlite3.connect(MAIN_DB)
main_conn.row_factory = sqlite3.Row
tenant_conn = sqlite3.connect(TENANT_DB)

# Get accounts from main DB
accounts = main_conn.execute("SELECT * FROM accounts").fetchall()
print(f"Main DB: {len(accounts)} accounts")

if not accounts:
    print("No accounts to sync!")
    sys.exit(0)

# Get column names from main DB
main_cols = [desc[0] for desc in main_conn.execute("SELECT * FROM accounts LIMIT 1").description]

# Get column names from tenant DB
tenant_cols = [desc[0] for desc in tenant_conn.execute("SELECT * FROM accounts LIMIT 1").description]

# Find common columns
common_cols = [c for c in main_cols if c in tenant_cols]
print(f"Common columns: {len(common_cols)}")

# Insert accounts into tenant DB
for acc in accounts:
    values = [acc[c] for c in common_cols]
    placeholders = ','.join(['?' for _ in common_cols])
    cols_str = ','.join(common_cols)
    
    try:
        tenant_conn.execute(
            f"INSERT OR REPLACE INTO accounts ({cols_str}) VALUES ({placeholders})",
            values
        )
        print(f"  Synced account: {acc['phone']}")
    except Exception as e:
        print(f"  Error syncing {acc['phone']}: {e}")

tenant_conn.commit()

# Also sync other important tables
for table in ['monitored_groups', 'keyword_sets', 'keywords', 'leads', 'settings',
              'discovered_resources', 'collected_users', 'trigger_rules', 'campaigns',
              'static_proxies', 'logs']:
    try:
        # Check if table exists in both
        main_count = main_conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        if main_count == 0:
            continue
        
        try:
            tenant_count = tenant_conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        except:
            continue
        
        if tenant_count >= main_count:
            continue
        
        # Get common columns
        m_cols = [d[0] for d in main_conn.execute(f"SELECT * FROM {table} LIMIT 1").description]
        t_cols = [d[0] for d in tenant_conn.execute(f"SELECT * FROM {table} LIMIT 1").description]
        cc = [c for c in m_cols if c in t_cols]
        
        if not cc:
            continue
        
        rows = main_conn.execute(f"SELECT * FROM {table}").fetchall()
        synced = 0
        for row in rows:
            vals = [row[c] for c in cc]
            ph = ','.join(['?' for _ in cc])
            cs = ','.join(cc)
            try:
                tenant_conn.execute(f"INSERT OR IGNORE INTO {table} ({cs}) VALUES ({ph})", vals)
                synced += 1
            except:
                pass
        
        tenant_conn.commit()
        if synced > 0:
            print(f"  {table}: synced {synced}/{main_count} rows")
    except Exception as e:
        pass

# Verify
final_count = tenant_conn.execute("SELECT count(*) FROM accounts").fetchone()[0]
print(f"\nTenant DB accounts after sync: {final_count}")

main_conn.close()
tenant_conn.close()
print("Done!")

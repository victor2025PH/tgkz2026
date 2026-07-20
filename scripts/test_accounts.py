#!/usr/bin/env python3
import sys
sys.path.insert(0, '/app')
import asyncio
from database import db

async def main():
    accounts = await db.get_all_accounts()
    print(f"Total accounts: {len(accounts)}")
    for a in accounts:
        print(f"  phone={a.get('phone')}, status={a.get('status')}, owner={a.get('owner_user_id')}")
    
    # Also test with owner filter
    accounts2 = await db.get_all_accounts(owner_user_id='037affdb-d948-41fe-8f76-10f1c2d8207e')
    print(f"\nFiltered accounts (owner=037affdb...): {len(accounts2)}")
    for a in accounts2:
        print(f"  phone={a.get('phone')}, status={a.get('status')}")

asyncio.run(main())

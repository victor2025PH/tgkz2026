#!/usr/bin/env python
"""
執行多租戶數據遷移

使用方法：
    python run_migration.py scan      # 掃描用戶
    python run_migration.py migrate   # 執行遷移
    python run_migration.py status    # 查看狀態
    python run_migration.py local     # 遷移本地用戶
"""

import sys
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    from core.tenant_migration import (
        TenantMigrationService,
        get_migration_status,
        run_migration,
        run_local_migration
    )
    
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py [scan|migrate|status|local]")
        return
    
    command = sys.argv[1]
    
    if command == 'scan':
        service = TenantMigrationService()
        users = service.scan_users()
        print(f"Found {len(users)} users to migrate:")
        for u in users:
            print(f"  - {u}")
    
    elif command == 'migrate':
        print("Starting migration...")
        stats = run_migration(force='--force' in sys.argv)
        print(json.dumps(stats.to_dict(), indent=2, default=str))
    
    elif command == 'status':
        status = get_migration_status()
        print(json.dumps(status, indent=2, default=str))
    
    elif command == 'local':
        print("Migrating local user...")
        stats = run_local_migration()
        print(json.dumps(stats.to_dict(), indent=2, default=str))
    
    else:
        print(f"Unknown command: {command}")

if __name__ == '__main__':
    main()

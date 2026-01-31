#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TG-Matrix Database Migration Runner
數據庫遷移運行器

用法:
    python run_migrations.py              # 運行所有待執行的遷移
    python run_migrations.py --status     # 查看遷移狀態
    python run_migrations.py --target 11  # 遷移到指定版本
    python run_migrations.py --rollback 1 # 回滾 1 個版本
"""

import sys
import asyncio
import argparse
from pathlib import Path

# 設置輸出編碼
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# 添加 backend 目錄到路徑
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import Database, db
from migrations.migration_manager import MigrationManager


async def show_status(manager: MigrationManager):
    """顯示遷移狀態"""
    current = await manager.get_current_version()
    pending = await manager.get_pending_migrations()
    applied = await manager.get_applied_migrations()
    
    print("\n" + "=" * 60)
    print("數據庫遷移狀態")
    print("=" * 60)
    print(f"\n當前版本: {current}")
    print(f"待執行遷移: {len(pending)}")
    print(f"已執行遷移: {len(applied)}")
    
    if applied:
        print("\n已執行的遷移:")
        print("-" * 60)
        for m in applied:
            print(f"  v{m['version']:04d}: {m['description']}")
            print(f"         執行於 {m['applied_at']}")
    
    if pending:
        print("\n待執行的遷移:")
        print("-" * 60)
        for m in pending:
            print(f"  v{m.version:04d}: {m.description}")
    else:
        print("\n✓ 所有遷移已執行完畢")
    
    print("=" * 60 + "\n")


async def run_migrations(manager: MigrationManager, target_version: int = None):
    """運行遷移"""
    current = await manager.get_current_version()
    pending = await manager.get_pending_migrations()
    
    if not pending:
        print("\n✓ 沒有待執行的遷移")
        return True
    
    print("\n" + "=" * 60)
    print("開始執行數據庫遷移")
    print("=" * 60)
    print(f"\n當前版本: {current}")
    print(f"待執行遷移: {len(pending)}")
    
    if target_version:
        pending = [m for m in pending if m.version <= target_version]
        print(f"目標版本: {target_version}")
    
    print("\n開始遷移...")
    print("-" * 60)
    
    success_count = 0
    for migration in pending:
        print(f"\n執行 v{migration.version:04d}: {migration.description}")
        try:
            await manager.run_migration(migration)
            print(f"  ✓ 成功")
            success_count += 1
        except Exception as e:
            print(f"  ✗ 失敗: {e}")
            print("\n遷移中止。請修復問題後重試。")
            return False
    
    new_version = await manager.get_current_version()
    print("\n" + "=" * 60)
    print(f"遷移完成！")
    print(f"  執行了 {success_count} 個遷移")
    print(f"  新版本: {new_version}")
    print("=" * 60 + "\n")
    
    return True


async def rollback_migrations(manager: MigrationManager, count: int = 1):
    """回滾遷移"""
    current = await manager.get_current_version()
    
    if current == 0:
        print("\n已經是初始狀態，無法回滾")
        return False
    
    print("\n" + "=" * 60)
    print(f"開始回滾 {count} 個遷移")
    print("=" * 60)
    print(f"\n當前版本: {current}")
    
    target = max(0, current - count)
    print(f"目標版本: {target}")
    
    print("\n開始回滾...")
    print("-" * 60)
    
    try:
        await manager.rollback_to(target)
        new_version = await manager.get_current_version()
        print(f"\n✓ 回滾成功！新版本: {new_version}")
        return True
    except Exception as e:
        print(f"\n✗ 回滾失敗: {e}")
        return False


async def main():
    parser = argparse.ArgumentParser(description='TG-Matrix 數據庫遷移工具')
    parser.add_argument('--status', action='store_true', help='顯示遷移狀態')
    parser.add_argument('--target', type=int, help='遷移到指定版本')
    parser.add_argument('--rollback', type=int, help='回滾指定數量的遷移')
    parser.add_argument('--dry-run', action='store_true', help='模擬運行（不實際執行）')
    
    args = parser.parse_args()
    
    print("\nTG-Matrix 數據庫遷移工具")
    print("-" * 40)
    
    # 初始化數據庫
    try:
        await db.initialize()
        print("✓ 數據庫連接成功")
    except Exception as e:
        print(f"✗ 數據庫連接失敗: {e}")
        return 1
    
    # 初始化遷移管理器
    migrations_dir = Path(__file__).parent / 'migrations'
    manager = MigrationManager(db, migrations_dir)
    
    try:
        await manager.initialize()
        print("✓ 遷移管理器初始化成功")
    except Exception as e:
        print(f"✗ 遷移管理器初始化失敗: {e}")
        return 1
    
    # 執行操作
    if args.status:
        await show_status(manager)
    elif args.rollback:
        if args.dry_run:
            print(f"\n[模擬] 將回滾 {args.rollback} 個遷移")
        else:
            success = await rollback_migrations(manager, args.rollback)
            return 0 if success else 1
    else:
        if args.dry_run:
            pending = await manager.get_pending_migrations()
            print(f"\n[模擬] 將執行 {len(pending)} 個遷移")
            for m in pending:
                print(f"  - v{m.version:04d}: {m.description}")
        else:
            success = await run_migrations(manager, args.target)
            return 0 if success else 1
    
    return 0


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

#!/usr/bin/env python3
"""
清理共享數據腳本
刪除所有沒有 owner_user_id 或 owner_user_id 為空的租戶數據
使每個用戶從空白狀態開始

執行：python cleanup_shared_data.py
"""

import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime

# 數據目錄
DATA_DIR = Path('/app/data')
DB_PATH = DATA_DIR / 'tgmatrix.db'
API_CREDENTIALS_PATH = DATA_DIR / 'api_credentials.json'

# 需要清理的租戶表
TENANT_TABLES_TO_CLEAN = [
    'accounts',
    'leads',
    'extracted_members',
    'collected_users',
    'keyword_sets',
    'monitored_groups',
    'campaigns',
    'message_templates',
    'chat_templates',
    'trigger_rules',
    'discovered_resources',
    'resource_join_queue',
    'discovery_logs',
    'member_extraction_logs',
    'logs',
]

def backup_database():
    """備份數據庫"""
    if DB_PATH.exists():
        backup_path = DATA_DIR / f'tgmatrix_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
        import shutil
        shutil.copy(DB_PATH, backup_path)
        print(f"✅ 備份已創建: {backup_path}")
        return backup_path
    return None

def clean_database():
    """清理數據庫中的共享數據"""
    if not DB_PATH.exists():
        print(f"❌ 數據庫不存在: {DB_PATH}")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    print("\n=== 清理數據庫共享數據 ===\n")
    
    for table in TENANT_TABLES_TO_CLEAN:
        try:
            # 檢查表是否存在
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cursor.fetchone():
                print(f"⚠️ 表不存在，跳過: {table}")
                continue
            
            # 檢查是否有 owner_user_id 列
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in cursor.fetchall()]
            has_owner = 'owner_user_id' in columns
            
            # 獲取當前行數
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            before_count = cursor.fetchone()[0]
            
            if has_owner:
                # 刪除沒有 owner_user_id 或 owner_user_id 為空/local_user 的記錄
                cursor.execute(f"""
                    DELETE FROM {table} 
                    WHERE owner_user_id IS NULL 
                       OR owner_user_id = '' 
                       OR owner_user_id = 'local_user'
                """)
            else:
                # 如果沒有 owner_user_id 列，清空整個表
                cursor.execute(f"DELETE FROM {table}")
            
            # 獲取刪除後行數
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            after_count = cursor.fetchone()[0]
            
            deleted = before_count - after_count
            if deleted > 0:
                print(f"✅ {table}: 刪除 {deleted} 行 (剩餘 {after_count} 行)")
            else:
                print(f"ℹ️ {table}: 無需刪除 ({before_count} 行)")
                
        except Exception as e:
            print(f"❌ 清理 {table} 失敗: {e}")
    
    conn.commit()
    conn.close()
    print("\n✅ 數據庫清理完成")

def clean_api_credentials():
    """清理 API 憑據"""
    if not API_CREDENTIALS_PATH.exists():
        print("ℹ️ API 憑據文件不存在，跳過")
        return
    
    try:
        with open(API_CREDENTIALS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        credentials = data.get('credentials', [])
        before_count = len(credentials)
        
        # 只保留有 owner_user_id 的憑據
        filtered = [c for c in credentials if c.get('owner_user_id') and c.get('owner_user_id') not in ['', 'local_user']]
        
        data['credentials'] = filtered
        
        with open(API_CREDENTIALS_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        deleted = before_count - len(filtered)
        print(f"✅ API 憑據: 刪除 {deleted} 個共享憑據 (剩餘 {len(filtered)} 個)")
        
    except Exception as e:
        print(f"❌ 清理 API 憑據失敗: {e}")

def main():
    print("=" * 50)
    print("  多租戶數據清理腳本")
    print("  刪除所有共享數據，實現完全用戶隔離")
    print("=" * 50)
    
    # 1. 備份
    print("\n📦 步驟 1: 備份數據...")
    backup_database()
    
    # 2. 清理數據庫
    print("\n🧹 步驟 2: 清理數據庫...")
    clean_database()
    
    # 3. 清理 API 憑據
    print("\n🔑 步驟 3: 清理 API 憑據...")
    clean_api_credentials()
    
    print("\n" + "=" * 50)
    print("  ✅ 清理完成！")
    print("  所有共享數據已刪除")
    print("  用戶需要重新添加自己的數據")
    print("=" * 50)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
完整清理腳本 - 清理所有數據庫中的共享數據
"""
import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime
import shutil

DATA_DIR = Path('/app/data')

# 需要清理的數據庫和表
CLEANUP_CONFIG = {
    'tgmatrix.db': {
        'tables_with_owner': ['accounts'],  # 有 owner_user_id，刪除沒有 owner 的
        'tables_to_clear': [],  # 沒有 owner_user_id，完全清空
    },
    'tgai_server.db': {
        'tables_with_owner': [
            'chat_templates', 
            'extracted_members', 
            'keyword_sets', 
            'logs', 
            'monitored_groups', 
            'trigger_rules'
        ],
        'tables_to_clear': [
            'unified_contacts',
            'user_profiles',
            'user_tags',
            'discovery_logs',
            'member_extraction_logs',
            'system_alerts',
        ],
    },
    'search_history.db': {
        'tables_with_owner': [],
        'tables_to_clear': [
            'discovered_resources',
            'search_history',
            'search_result_items',
        ],
    },
}

def backup_db(db_path):
    """備份數據庫"""
    if db_path.exists():
        backup_path = db_path.parent / f'{db_path.stem}_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
        shutil.copy(db_path, backup_path)
        print(f'  📦 備份: {backup_path.name}')

def clean_database(db_name, config):
    """清理單個數據庫"""
    db_path = DATA_DIR / db_name
    if not db_path.exists():
        print(f'  ⚠️ 不存在: {db_name}')
        return
    
    # 備份
    backup_db(db_path)
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # 清理有 owner_user_id 的表
    for table in config.get('tables_with_owner', []):
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            before = cursor.fetchone()[0]
            
            cursor.execute(f"""
                DELETE FROM {table} 
                WHERE owner_user_id IS NULL 
                   OR owner_user_id = '' 
                   OR owner_user_id = 'local_user'
            """)
            
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            after = cursor.fetchone()[0]
            
            deleted = before - after
            if deleted > 0:
                print(f'  ✅ {table}: 刪除 {deleted} 行共享數據 (保留 {after} 行用戶數據)')
        except Exception as e:
            print(f'  ❌ {table}: {e}')
    
    # 完全清空沒有 owner_user_id 的表
    for table in config.get('tables_to_clear', []):
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            before = cursor.fetchone()[0]
            
            if before > 0:
                cursor.execute(f"DELETE FROM {table}")
                print(f'  🧹 {table}: 清空 {before} 行')
        except Exception as e:
            print(f'  ❌ {table}: {e}')
    
    conn.commit()
    conn.close()

def clean_api_credentials():
    """清理 API 憑據"""
    api_path = DATA_DIR / 'api_credentials.json'
    if not api_path.exists():
        return
    
    try:
        with open(api_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        credentials = data.get('credentials', [])
        before = len(credentials)
        
        # 只保留有 owner_user_id 的
        filtered = [c for c in credentials 
                   if c.get('owner_user_id') 
                   and c.get('owner_user_id') not in ['', 'local_user']]
        
        data['credentials'] = filtered
        
        with open(api_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        deleted = before - len(filtered)
        if deleted > 0:
            print(f'  ✅ api_credentials.json: 刪除 {deleted} 個共享憑據')
    except Exception as e:
        print(f'  ❌ api_credentials.json: {e}')

def main():
    print('=' * 60)
    print('  🧹 完整多租戶數據清理')
    print('  刪除所有共享數據，實現完全用戶隔離')
    print('=' * 60)
    
    for db_name, config in CLEANUP_CONFIG.items():
        print(f'\n📂 處理 {db_name}...')
        clean_database(db_name, config)
    
    print(f'\n📂 處理 API 憑據...')
    clean_api_credentials()
    
    print('\n' + '=' * 60)
    print('  ✅ 完成！所有共享數據已清理')
    print('  每個用戶現在有獨立的數據空間')
    print('=' * 60)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""檢查所有數據庫文件"""
import sqlite3
import os
from pathlib import Path

db_files = [
    '/app/data/tg_matrix.db',
    '/app/data/tgai_server.db',
    '/app/data/auth.db',
    '/app/data/search_history.db',
    '/app/data/system.db'
]

for db_path in db_files:
    if os.path.exists(db_path):
        print(f'\n=== {os.path.basename(db_path)} ===')
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = cursor.fetchall()
            
            for t in tables:
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM {t[0]}')
                    count = cursor.fetchone()[0]
                    if count > 0:  # 只顯示有數據的表
                        # 檢查是否有 owner_user_id 列
                        cursor.execute(f"PRAGMA table_info({t[0]})")
                        columns = [col[1] for col in cursor.fetchall()]
                        has_owner = 'owner_user_id' in columns
                        print(f'  {t[0]}: {count} 行, owner_user_id: {has_owner}')
                except:
                    pass
            conn.close()
        except Exception as e:
            print(f'  錯誤: {e}')
    else:
        print(f'\n=== {os.path.basename(db_path)} - 不存在 ===')

#!/usr/bin/env python3
"""檢查數據庫表結構"""
import sqlite3
import os
from pathlib import Path

# 檢查主數據庫的所有表
db_path = '/app/data/tgmatrix.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    print('=== tgmatrix.db 表列表 ===')
    for t in tables:
        try:
            cursor.execute(f'SELECT COUNT(*) FROM {t[0]}')
            count = cursor.fetchone()[0]
            
            # 檢查是否有 owner_user_id 列
            cursor.execute(f"PRAGMA table_info({t[0]})")
            columns = [col[1] for col in cursor.fetchall()]
            has_owner = 'owner_user_id' in columns
            
            print(f'  {t[0]}: {count} 行, owner_user_id: {has_owner}')
        except Exception as e:
            print(f'  {t[0]}: 錯誤 - {e}')
    conn.close()

# 檢查其他數據庫文件
print('\n=== data 目錄中的 .db 文件 ===')
for f in Path('/app/data').glob('*.db'):
    print(f'  {f.name}')

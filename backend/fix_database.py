#!/usr/bin/env python3
"""
数据库修复脚本
用于添加缺失的字段，修复数据库结构问题
"""

import sqlite3
from pathlib import Path

# 🔧 路徑改由 config.py 統一解析（不再硬編碼），與其他環境（開發/Electron/生產）保持一致
try:
    from config import DATABASE_DIR
    DB_PATH = DATABASE_DIR / "tgai_server.db"
except ImportError:
    DB_PATH = Path(__file__).parent / "data" / "tgai_server.db"

def fix_admin_table():
    """修复 admins 表，添加缺失的字段"""
    if not DB_PATH.exists():
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查 admins 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
        if not cursor.fetchone():
            print("❌ admins 表不存在，请先运行初始化命令")
            return False
        
        # 检查字段是否存在
        cursor.execute("PRAGMA table_info(admins)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'last_login_ip' not in columns:
            print("🔄 添加缺失字段: admins.last_login_ip")
            cursor.execute('ALTER TABLE admins ADD COLUMN last_login_ip TEXT')
            conn.commit()
            print("✅ 字段添加成功")
            return True
        else:
            print("✅ last_login_ip 字段已存在")
            return True
            
    except Exception as e:
        print(f"❌ 修复失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    print("🔧 开始修复数据库...")
    if fix_admin_table():
        print("✅ 数据库修复完成")
    else:
        print("❌ 数据库修复失败")

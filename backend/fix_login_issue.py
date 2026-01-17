#!/usr/bin/env python3
"""
修复登录问题脚本
自动检测并修复 last_login_ip 字段缺失问题
"""

import sqlite3
import sys
from pathlib import Path

# 可能的数据库路径
POSSIBLE_PATHS = [
    Path(__file__).parent / "data" / "tgai_server.db",
    Path("/opt/tg-matrix-server/backend/data/tgai_server.db"),
    Path("/opt/tg-matrix-server/backend/data/tgmatrix.db"),
    Path(__file__).parent.parent / "data" / "tgai_server.db",
]

def find_database():
    """查找数据库文件"""
    for db_path in POSSIBLE_PATHS:
        if db_path.exists():
            print(f"✅ 找到数据库: {db_path}")
            return db_path
    return None

def check_and_fix_table(db_path: Path):
    """检查并修复 admins 表"""
    print(f"\n🔍 检查数据库: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
        if not cursor.fetchone():
            print("❌ admins 表不存在！")
            print("   请先运行: python backend/license_server.py init")
            return False
        
        # 检查字段
        cursor.execute("PRAGMA table_info(admins)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"📋 当前字段: {', '.join(columns)}")
        
        if 'last_login_ip' in columns:
            print("✅ last_login_ip 字段已存在")
            return True
        
        # 添加缺失字段
        print("🔄 添加缺失字段: last_login_ip")
        cursor.execute('ALTER TABLE admins ADD COLUMN last_login_ip TEXT')
        conn.commit()
        
        # 验证
        cursor.execute("PRAGMA table_info(admins)")
        columns_after = [col[1] for col in cursor.fetchall()]
        if 'last_login_ip' in columns_after:
            print("✅ 字段添加成功！")
            return True
        else:
            print("❌ 字段添加失败")
            return False
            
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print("✅ 字段已存在（可能在其他位置）")
            return True
        else:
            print(f"❌ 错误: {e}")
            return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False
    finally:
        conn.close()

def main():
    print("=" * 60)
    print("🔧 TG-AI智控王 登录问题修复工具")
    print("=" * 60)
    
    # 查找数据库
    db_path = find_database()
    if not db_path:
        print("\n❌ 未找到数据库文件！")
        print("\n尝试的路径：")
        for path in POSSIBLE_PATHS:
            print(f"  - {path}")
        print("\n请确认数据库文件位置，或手动指定路径：")
        print("  python backend/fix_login_issue.py /path/to/database.db")
        return 1
    
    # 修复表
    if check_and_fix_table(db_path):
        print("\n" + "=" * 60)
        print("✅ 修复完成！")
        print("=" * 60)
        print("\n📝 下一步：")
        print("1. 重启服务: sudo systemctl restart tg-matrix-license")
        print("2. 检查服务状态: sudo systemctl status tg-matrix-license")
        print("3. 查看日志: sudo journalctl -u tg-matrix-license -f")
        return 0
    else:
        print("\n" + "=" * 60)
        print("❌ 修复失败！")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # 手动指定数据库路径
        db_path = Path(sys.argv[1])
        if not db_path.exists():
            print(f"❌ 数据库文件不存在: {db_path}")
            sys.exit(1)
        if check_and_fix_table(db_path):
            print("✅ 修复完成！")
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        sys.exit(main())

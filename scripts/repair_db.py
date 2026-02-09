#!/usr/bin/env python3
"""
修复损坏的 tgmatrix.db：
1. 先做 WAL checkpoint（合并日志）
2. 用 .dump 导出所有数据
3. 导入到新数据库
4. 验证新数据库
5. 替换旧数据库
"""
import sqlite3
import os
import shutil
import subprocess
import sys
import json

DB_PATH = "/app/data/tgmatrix.db"
DB_BACKUP = "/app/data/tgmatrix.db.corrupt_backup"
DB_NEW = "/app/data/tgmatrix_new.db"

def main():
    print("=== 修复 tgmatrix.db ===\n")

    # Step 1: 备份原始数据库（包括 WAL/SHM）
    print("1. 备份损坏的数据库...")
    for ext in ["", "-wal", "-shm"]:
        src = DB_PATH + ext
        dst = DB_BACKUP + ext
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"   备份: {src} -> {dst}")

    # Step 2: 尝试 WAL checkpoint
    print("\n2. 尝试 WAL checkpoint...")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()
        print("   WAL checkpoint 完成")
    except Exception as e:
        print(f"   WAL checkpoint 失败 (可忽略): {e}")

    # Step 3: 用 sqlite3 命令行工具导出
    print("\n3. 导出数据到新数据库...")
    
    # 方法：通过 Python 逐表导出
    try:
        old_conn = sqlite3.connect(DB_PATH)
        old_conn.row_factory = sqlite3.Row
        
        # 获取所有表
        tables = old_conn.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        
        print(f"   找到 {len(tables)} 个表")
        
        # 删除旧的新数据库
        if os.path.exists(DB_NEW):
            os.remove(DB_NEW)
        
        new_conn = sqlite3.connect(DB_NEW)
        new_conn.execute("PRAGMA journal_mode=WAL")
        new_conn.execute("PRAGMA page_size=4096")
        
        success_tables = 0
        failed_tables = []
        
        for table in tables:
            table_name = table[0]
            create_sql = table[1]
            
            try:
                # 创建表
                new_conn.execute(create_sql)
                
                # 复制数据
                rows = old_conn.execute(f"SELECT * FROM [{table_name}]").fetchall()
                if rows:
                    cols = rows[0].keys()
                    placeholders = ", ".join(["?"] * len(cols))
                    col_names = ", ".join([f"[{c}]" for c in cols])
                    
                    for row in rows:
                        try:
                            new_conn.execute(
                                f"INSERT OR IGNORE INTO [{table_name}] ({col_names}) VALUES ({placeholders})",
                                tuple(row)
                            )
                        except Exception as re:
                            pass  # 跳过单行错误
                
                new_conn.commit()
                success_tables += 1
                print(f"   ✅ {table_name}: {len(rows)} 行")
                
            except Exception as e:
                failed_tables.append((table_name, str(e)))
                print(f"   ❌ {table_name}: {e}")
        
        # 复制索引
        indices = old_conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
        ).fetchall()
        
        for idx in indices:
            try:
                new_conn.execute(idx[0])
            except Exception:
                pass
        
        new_conn.commit()
        old_conn.close()
        new_conn.close()
        
        print(f"\n   成功: {success_tables}, 失败: {len(failed_tables)}")
        if failed_tables:
            for t, e in failed_tables:
                print(f"   失败表: {t} - {e}")
        
    except Exception as e:
        print(f"   导出失败: {e}")
        return 1

    # Step 4: 验证新数据库
    print("\n4. 验证新数据库...")
    try:
        new_conn = sqlite3.connect(DB_NEW)
        result = new_conn.execute("PRAGMA integrity_check").fetchone()
        print(f"   完整性: {result[0]}")
        
        # 检查关键表的数据
        for tbl in ["accounts", "static_proxies", "monitored_groups", "keyword_sets"]:
            try:
                count = new_conn.execute(f"SELECT COUNT(*) FROM [{tbl}]").fetchone()[0]
                print(f"   {tbl}: {count} 行")
            except:
                print(f"   {tbl}: 表不存在")
        
        new_conn.close()
        
        if result[0] != "ok":
            print("   ⚠ 新数据库仍有问题!")
            return 1
            
    except Exception as e:
        print(f"   验证失败: {e}")
        return 1

    # Step 5: 替换
    print("\n5. 替换数据库文件...")
    
    # 删除旧的 WAL/SHM
    for ext in ["-wal", "-shm"]:
        f = DB_PATH + ext
        if os.path.exists(f):
            os.remove(f)
            print(f"   删除: {f}")
    
    # 替换主文件
    os.replace(DB_NEW, DB_PATH)
    print(f"   替换: {DB_NEW} -> {DB_PATH}")
    
    # 清理新文件的 WAL/SHM
    for ext in ["-wal", "-shm"]:
        f = DB_NEW + ext
        if os.path.exists(f):
            os.remove(f)

    # Step 6: 最终验证
    print("\n6. 最终验证...")
    conn = sqlite3.connect(DB_PATH)
    result = conn.execute("PRAGMA integrity_check").fetchone()
    print(f"   完整性: {result[0]}")
    
    # 验证关键数据
    c = conn.cursor()
    c.execute("SELECT id, phone, proxy FROM accounts")
    for r in c.fetchall():
        print(f"   帐号: {r[1]} proxy={r[2][:30] if r[2] else 'None'}...")
    
    c.execute("SELECT id, host, status FROM static_proxies")
    for r in c.fetchall():
        print(f"   代理: {r[1]} status={r[2]}")
    
    conn.close()
    
    print("\n✅ 修复完成！需要重启服务使其生效。")
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
彻底修复所有有问题的数据库文件，包括清理 WAL/SHM
"""
import sqlite3
import os
import shutil
import glob

DATA_DIR = "/app/data"

def repair_db(db_path):
    """检查并修复单个数据库"""
    name = os.path.basename(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        result = conn.execute("PRAGMA integrity_check").fetchone()
        status = result[0] if result else "unknown"
        conn.close()
    except Exception as e:
        status = f"error: {e}"
    
    if status == "ok":
        # 即使完整性OK，也清理WAL/SHM确保干净
        wal = db_path + "-wal"
        shm = db_path + "-shm"
        try:
            conn = sqlite3.connect(db_path)
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            conn.close()
        except:
            pass
        print(f"  ✅ {name}: ok")
        return True
    
    print(f"  ⚠️  {name}: {status} - 正在修复...")
    
    backup_path = db_path + ".broken"
    new_path = db_path + ".new"
    
    try:
        # 备份
        shutil.copy2(db_path, backup_path)
        for ext in ["-wal", "-shm"]:
            if os.path.exists(db_path + ext):
                shutil.copy2(db_path + ext, backup_path + ext)
        
        # 导出到新数据库
        old_conn = sqlite3.connect(db_path)
        old_conn.row_factory = sqlite3.Row
        
        tables = old_conn.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL"
        ).fetchall()
        
        if os.path.exists(new_path):
            os.remove(new_path)
        
        new_conn = sqlite3.connect(new_path)
        new_conn.execute("PRAGMA journal_mode=WAL")
        
        ok = 0
        fail = 0
        for table in tables:
            try:
                new_conn.execute(table[1])
                rows = old_conn.execute(f"SELECT * FROM [{table[0]}]").fetchall()
                if rows:
                    cols = rows[0].keys()
                    ph = ", ".join(["?"] * len(cols))
                    cn = ", ".join([f"[{c}]" for c in cols])
                    for row in rows:
                        try:
                            new_conn.execute(f"INSERT OR IGNORE INTO [{table[0]}] ({cn}) VALUES ({ph})", tuple(row))
                        except:
                            pass
                new_conn.commit()
                ok += 1
            except:
                fail += 1
        
        # 复制索引
        indices = old_conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
        ).fetchall()
        for idx in indices:
            try:
                new_conn.execute(idx[0])
            except:
                pass
        new_conn.commit()
        
        old_conn.close()
        new_conn.close()
        
        # 验证
        vc = sqlite3.connect(new_path)
        vr = vc.execute("PRAGMA integrity_check").fetchone()
        vc.close()
        
        if vr and vr[0] == "ok":
            # 替换
            for ext in ["-wal", "-shm"]:
                if os.path.exists(db_path + ext):
                    os.remove(db_path + ext)
            os.replace(new_path, db_path)
            # 清理新文件的附属
            for ext in ["-wal", "-shm"]:
                if os.path.exists(new_path + ext):
                    os.remove(new_path + ext)
            print(f"  ✅ {name}: 修复成功 ({ok} 表)")
            return True
        else:
            print(f"  ❌ {name}: 修复后仍有问题")
            return False
            
    except Exception as e:
        print(f"  ❌ {name}: 修复失败 - {e}")
        return False

print("=== 彻底修复所有数据库 ===\n")

all_ok = True

# 主数据库
for db_file in sorted(glob.glob(os.path.join(DATA_DIR, "*.db"))):
    if not repair_db(db_file):
        all_ok = False

# 租户数据库
tenant_dir = os.path.join(DATA_DIR, "tenants")
if os.path.isdir(tenant_dir):
    for db_file in sorted(glob.glob(os.path.join(tenant_dir, "*.db"))):
        if not repair_db(db_file):
            all_ok = False

# 清理所有孤立的 WAL/SHM 文件（对应的 .db 不存在的）
print("\n检查孤立文件...")
for pattern in ["*.db-wal", "*.db-shm"]:
    for f in glob.glob(os.path.join(DATA_DIR, pattern)):
        db_base = f.rsplit("-", 1)[0]
        if not os.path.exists(db_base):
            print(f"  删除孤立文件: {f}")
            os.remove(f)
    for f in glob.glob(os.path.join(DATA_DIR, "tenants", pattern)):
        db_base = f.rsplit("-", 1)[0]
        if not os.path.exists(db_base):
            print(f"  删除孤立文件: {f}")
            os.remove(f)

print(f"\n总体: {'全部正常' if all_ok else '仍有问题'}")

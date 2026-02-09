#!/usr/bin/env python3
"""在主机上修复 /opt/tg-matrix/data 下的所有数据库"""
import sqlite3
import os
import shutil
import glob

DATA_DIR = "/opt/tg-matrix/data"

def check_and_repair(db_path):
    name = os.path.relpath(db_path, DATA_DIR)
    
    # 检查完整性
    try:
        conn = sqlite3.connect(db_path)
        r = conn.execute("PRAGMA integrity_check").fetchone()
        status = r[0] if r else "unknown"
        conn.close()
    except Exception as e:
        status = f"error: {e}"
    
    if status == "ok":
        # WAL checkpoint + 清理
        try:
            conn = sqlite3.connect(db_path)
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            conn.close()
        except:
            pass
        
        # 删除 WAL/SHM 文件（服务已停止，安全操作）
        for ext in ["-wal", "-shm"]:
            f = db_path + ext
            if os.path.exists(f):
                sz = os.path.getsize(f)
                os.remove(f)
                print(f"  ✅ {name}: ok (清理 {ext} {sz}B)")
                return True
        print(f"  ✅ {name}: ok")
        return True
    
    # 需要修复
    print(f"  ⚠️  {name}: CORRUPT ({status[:60]}...) - 开始修复...")
    
    backup = db_path + ".broken2"
    new_path = db_path + ".repaired"
    
    try:
        shutil.copy2(db_path, backup)
        
        old_conn = sqlite3.connect(db_path)
        old_conn.row_factory = sqlite3.Row
        
        tables = old_conn.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL"
        ).fetchall()
        
        if os.path.exists(new_path):
            os.remove(new_path)
        
        new_conn = sqlite3.connect(new_path)
        new_conn.execute("PRAGMA journal_mode=WAL")
        
        ok_tables = 0
        for tbl_name, tbl_sql in tables:
            try:
                new_conn.execute(tbl_sql)
                rows = old_conn.execute(f'SELECT * FROM [{tbl_name}]').fetchall()
                if rows:
                    cols = rows[0].keys()
                    ph = ", ".join(["?"] * len(cols))
                    cn = ", ".join([f"[{c}]" for c in cols])
                    for row in rows:
                        try:
                            new_conn.execute(f"INSERT OR IGNORE INTO [{tbl_name}] ({cn}) VALUES ({ph})", tuple(row))
                        except:
                            pass
                new_conn.commit()
                ok_tables += 1
            except:
                pass
        
        # 复制索引
        indices = old_conn.execute("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchall()
        for idx_sql, in indices:
            try:
                new_conn.execute(idx_sql)
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
            for ext in ["-wal", "-shm"]:
                f = db_path + ext
                if os.path.exists(f):
                    os.remove(f)
            os.replace(new_path, db_path)
            for ext in ["-wal", "-shm"]:
                f = new_path + ext
                if os.path.exists(f):
                    os.remove(f)
            print(f"  ✅ {name}: 修复成功 ({ok_tables} 表)")
            return True
        else:
            print(f"  ❌ {name}: 修复后仍有问题")
            return False
    except Exception as e:
        print(f"  ❌ {name}: 修复异常 - {e}")
        return False


print("=== 主机数据库修复 (服务已停止) ===\n")

all_ok = True
for db in sorted(glob.glob(os.path.join(DATA_DIR, "*.db"))):
    if ".broken" in db or ".repaired" in db or ".corrupt" in db:
        continue
    if not check_and_repair(db):
        all_ok = False

for db in sorted(glob.glob(os.path.join(DATA_DIR, "tenants", "*.db"))):
    if ".broken" in db or ".repaired" in db:
        continue
    if not check_and_repair(db):
        all_ok = False

# 清理备份文件
print("\n清理旧备份...")
for pat in ["*.broken", "*.broken2", "*.corrupt_backup", "*.corrupt_backup-wal"]:
    for f in glob.glob(os.path.join(DATA_DIR, pat)):
        sz = os.path.getsize(f)
        os.remove(f)
        print(f"  删除: {os.path.basename(f)} ({sz}B)")

print(f"\n结果: {'✅ 全部正常' if all_ok else '❌ 仍有问题'}")

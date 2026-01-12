"""
數據庫重建腳本
用於修復損壞的數據庫或重新創建數據庫
"""
import sys
import asyncio
import shutil
from pathlib import Path
from datetime import datetime
from database import Database
from config import config

async def rebuild_database():
    """重建數據庫"""
    db_path = Path(config.DATABASE_URL)
    db_dir = db_path.parent
    
    print("=" * 60, file=sys.stderr)
    print("數據庫重建工具", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    # 步驟 1: 備份現有數據庫（如果存在）
    if db_path.exists():
        backup_path = db_dir / f"tgmatrix_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        print(f"[1/4] 備份現有數據庫...", file=sys.stderr)
        print(f"      源文件: {db_path}", file=sys.stderr)
        print(f"      備份到: {backup_path}", file=sys.stderr)
        
        try:
            shutil.copy2(db_path, backup_path)
            print(f"      ✓ 備份成功", file=sys.stderr)
        except Exception as e:
            print(f"      ✗ 備份失敗: {e}", file=sys.stderr)
            response = input("      是否繼續刪除數據庫？(y/n): ")
            if response.lower() != 'y':
                print("      已取消操作", file=sys.stderr)
                return False
    else:
        print(f"[1/4] 數據庫文件不存在，跳過備份", file=sys.stderr)
    
    # 步驟 2: 刪除舊數據庫文件
    print(f"[2/4] 刪除舊數據庫文件...", file=sys.stderr)
    try:
        if db_path.exists():
            # 也刪除 WAL 和 SHM 文件
            wal_path = Path(str(db_path) + "-wal")
            shm_path = Path(str(db_path) + "-shm")
            
            if wal_path.exists():
                wal_path.unlink()
                print(f"      已刪除 WAL 文件", file=sys.stderr)
            if shm_path.exists():
                shm_path.unlink()
                print(f"      已刪除 SHM 文件", file=sys.stderr)
            
            db_path.unlink()
            print(f"      ✓ 舊數據庫已刪除", file=sys.stderr)
        else:
            print(f"      數據庫文件不存在，無需刪除", file=sys.stderr)
    except Exception as e:
        print(f"      ✗ 刪除失敗: {e}", file=sys.stderr)
        return False
    
    # 步驟 3: 創建新數據庫
    print(f"[3/4] 創建新數據庫...", file=sys.stderr)
    try:
        db = Database()
        await db.initialize()
        print(f"      ✓ 數據庫結構已創建", file=sys.stderr)
        
        # 驗證數據庫完整性
        cursor = await db._connection.execute("PRAGMA integrity_check")
        result = await cursor.fetchone()
        if result and result[0] == 'ok':
            print(f"      ✓ 數據庫完整性檢查通過", file=sys.stderr)
        else:
            print(f"      ⚠ 數據庫完整性檢查警告: {result[0] if result else 'Unknown'}", file=sys.stderr)
        
        await db.close()
    except Exception as e:
        print(f"      ✗ 創建數據庫失敗: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False
    
    # 步驟 4: 初始化 FTS 索引
    print(f"[4/4] 初始化全文搜索索引...", file=sys.stderr)
    try:
        from fulltext_search import init_search_engine, get_search_engine
        search_engine = await init_search_engine(str(db_path))
        print(f"      ✓ 全文搜索索引已創建", file=sys.stderr)
    except Exception as e:
        print(f"      ⚠ 全文搜索索引創建失敗（可選）: {e}", file=sys.stderr)
        # 這不是致命錯誤，繼續
    
    print("=" * 60, file=sys.stderr)
    print("✓ 數據庫重建完成！", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(f"新數據庫位置: {db_path}", file=sys.stderr)
    if db_path.exists():
        file_size = db_path.stat().st_size
        print(f"數據庫大小: {file_size / 1024:.2f} KB", file=sys.stderr)
    
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(rebuild_database())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n操作已取消", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n錯誤: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

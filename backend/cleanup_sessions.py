"""
紧急清理脚本：强制关闭所有客户端并删除孤立的 session 文件

使用方法：
1. 确保后端进程已停止
2. 运行: python backend/cleanup_sessions.py
"""
import asyncio
import sys
from pathlib import Path
import re
from config import SESSIONS_DIR
from database import db

async def cleanup_orphaned_sessions():
    """清理所有孤立的 session 文件"""
    try:
        # 连接数据库
        await db.initialize()
        await db.connect()
        
        # 获取所有账户
        accounts = await db.get_all_accounts()
        valid_phones = {acc.get('phone', '').replace("+", "").replace("-", "").replace(" ", "") for acc in accounts}
        
        print(f"[清理] 数据库中有 {len(valid_phones)} 个有效账户")
        print(f"[清理] 有效电话号码: {valid_phones}")
        
        # 查找所有 session 文件
        session_files = list(SESSIONS_DIR.glob("*.session"))
        journal_files = list(SESSIONS_DIR.glob("*.session.journal"))
        
        print(f"[清理] 找到 {len(session_files)} 个 session 文件")
        print(f"[清理] 找到 {len(journal_files)} 个 journal 文件")
        
        deleted_count = 0
        deleted_files = []
        kept_count = 0
        kept_files = []
        
        # 模式：匹配带时间戳的文件 phone_timestamp.session
        timestamp_pattern = re.compile(r'^(\d+)_\d+\.session$')
        
        print("\n[清理] 开始清理带时间戳的文件...")
        for session_file in session_files:
            filename = session_file.name
            base_name = session_file.stem
            
            # 检查是否是带时间戳的文件
            match = timestamp_pattern.match(filename)
            if match:
                # 这是带时间戳的替代文件 - 应该删除
                phone_from_file = match.group(1)
                try:
                    session_file.unlink()
                    deleted_count += 1
                    deleted_files.append(filename)
                    print(f"  ✓ 已删除: {filename}")
                except PermissionError as pe:
                    print(f"  ✗ 无法删除（文件被锁定）: {filename} - {pe}")
                    print(f"    提示: 请确保后端进程已完全停止，然后重试")
                except Exception as e:
                    print(f"  ✗ 删除失败: {filename} - {e}")
            else:
                # 普通 session 文件 - 检查是否属于有效账户
                phone_from_file = base_name
                if phone_from_file not in valid_phones:
                    # 孤立的 session 文件（不在数据库中）
                    try:
                        session_file.unlink()
                        deleted_count += 1
                        deleted_files.append(filename)
                        print(f"  ✓ 已删除孤立文件: {filename}")
                    except PermissionError as pe:
                        print(f"  ✗ 无法删除（文件被锁定）: {filename} - {pe}")
                        print(f"    提示: 请确保后端进程已完全停止，然后重试")
                    except Exception as e:
                        print(f"  ✗ 删除失败: {filename} - {e}")
                else:
                    # 有效的 session 文件 - 保留
                    kept_count += 1
                    kept_files.append(filename)
                    print(f"  → 保留有效文件: {filename}")
        
        # 清理 journal 文件
        print("\n[清理] 开始清理 journal 文件...")
        for journal_file in journal_files:
            filename = journal_file.name
            base_name = journal_file.stem.replace('.journal', '')
            
            # 检查对应的 session 文件是否存在
            session_file = SESSIONS_DIR / f"{base_name}.session"
            if not session_file.exists():
                # Journal 文件没有对应的 session 文件 - 删除
                try:
                    journal_file.unlink()
                    deleted_count += 1
                    deleted_files.append(filename)
                    print(f"  ✓ 已删除孤立 journal: {filename}")
                except PermissionError as pe:
                    print(f"  ✗ 无法删除（文件被锁定）: {filename} - {pe}")
                except Exception as e:
                    print(f"  ✗ 删除失败: {filename} - {e}")
        
        # 关闭数据库连接
        await db.close()
        
        print(f"\n[清理] 清理完成！")
        print(f"  - 删除了 {deleted_count} 个文件")
        print(f"  - 保留了 {kept_count} 个有效文件")
        
        if deleted_files:
            print(f"\n已删除的文件列表:")
            for f in deleted_files:
                print(f"  - {f}")
        
        if kept_files:
            print(f"\n保留的文件列表:")
            for f in kept_files:
                print(f"  - {f}")
        
        return {
            "deleted_count": deleted_count,
            "deleted_files": deleted_files,
            "kept_count": kept_count,
            "kept_files": kept_files
        }
        
    except Exception as e:
        print(f"\n[清理] 错误: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("Session 文件清理工具")
    print("=" * 60)
    print("\n⚠️  重要提示：")
    print("1. 请确保后端进程已完全停止")
    print("2. 请确保没有其他程序正在使用这些文件")
    print("3. 此脚本会删除所有带时间戳的 session 文件")
    print("4. 此脚本会删除所有不在数据库中的 session 文件")
    print("\n" + "=" * 60 + "\n")
    
    result = asyncio.run(cleanup_orphaned_sessions())
    
    if result:
        print("\n" + "=" * 60)
        print("清理完成！")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("清理失败，请检查错误信息")
        print("=" * 60)
        sys.exit(1)


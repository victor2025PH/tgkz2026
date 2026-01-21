#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TG-AI智控王 管理後台服務器啟動器

功能：
- 啟動 License Server（包含管理後台 API + 靜態文件服務）
- 初始化數據庫和默認管理員帳號
- 顯示服務器訪問地址

使用方法：
    python start_admin_server.py [--port 8080] [--host 0.0.0.0]

訪問管理後台：
    http://localhost:8080/login.html
    
默認管理員帳號：
    用戶名: admin
    密碼: admin123
"""

import os
import sys
import argparse
import hashlib
import secrets

# 確保可以導入 backend 模塊
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Database
from license_server import LicenseServer


def init_default_admin(db: Database):
    """初始化默認管理員帳號"""
    import sqlite3
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # 檢查是否已有管理員
    cursor.execute("SELECT COUNT(*) FROM admins")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # 創建默認管理員（密碼使用無 salt 的 SHA256，與 license_server.py 一致）
        username = "admin"
        password = "admin123"
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        cursor.execute('''
            INSERT INTO admins (username, password_hash, name, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, password_hash, '超級管理員', 'super_admin', 1))
        
        conn.commit()
        print(f"✅ 已創建默認管理員帳號")
        print(f"   用戶名: {username}")
        print(f"   密碼: {password}")
        print(f"   ⚠️  請登錄後立即修改密碼！")
    else:
        print(f"✅ 已存在 {count} 個管理員帳號")
    
    conn.close()


def print_banner(host: str, port: int):
    """打印啟動信息"""
    print("\n" + "=" * 60)
    print("🤖 TG-AI智控王 管理後台服務器 v2.0")
    print("=" * 60)
    print()
    print("📡 服務地址:")
    print(f"   本地訪問: http://localhost:{port}/login.html")
    if host == "0.0.0.0":
        print(f"   局域網訪問: http://<您的IP>:{port}/login.html")
    print()
    print("🔧 API 端點:")
    print(f"   健康檢查: http://localhost:{port}/api/health")
    print(f"   管理員登錄: http://localhost:{port}/api/admin/login")
    print(f"   卡密驗證: http://localhost:{port}/api/license/validate")
    print()
    print("📋 管理功能:")
    print("   • 用戶管理：查看、封禁、延期")
    print("   • 卡密管理：生成、禁用、導出")
    print("   • 訂單管理：確認支付、查看記錄")
    print("   • 設備管理：查看綁定、撤銷授權")
    print("   • 公告管理：創建、編輯、刪除")
    print("   • 統計報表：收入、用戶、轉化率")
    print()
    print("💡 客戶端配置:")
    print(f"   在應用設置中配置 License Server URL:")
    print(f"   http://localhost:{port}")
    print()
    print("=" * 60)
    print("按 Ctrl+C 停止服務器")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='TG-AI智控王 管理後台服務器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
    # 默認啟動（端口 8080）
    python start_admin_server.py

    # 指定端口
    python start_admin_server.py --port 9090

    # 只允許本地訪問
    python start_admin_server.py --host 127.0.0.1
        '''
    )
    parser.add_argument('--host', default='0.0.0.0', 
                       help='綁定地址 (默認: 0.0.0.0，允許所有訪問)')
    parser.add_argument('--port', type=int, default=8080, 
                       help='端口號 (默認: 8080)')
    parser.add_argument('--init-only', action='store_true',
                       help='只初始化數據庫，不啟動服務器')
    
    args = parser.parse_args()
    
    # 初始化數據庫
    print("🔧 正在初始化數據庫...")
    db = Database()
    
    # 創建默認管理員
    print("👤 檢查管理員帳號...")
    init_default_admin(db)
    
    if args.init_only:
        print("\n✅ 數據庫初始化完成")
        return
    
    # 顯示啟動信息
    print_banner(args.host, args.port)
    
    # 啟動服務器
    try:
        server = LicenseServer(host=args.host, port=args.port)
        server.run()
    except KeyboardInterrupt:
        print("\n👋 服務器已停止")
    except Exception as e:
        print(f"\n❌ 服務器錯誤: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

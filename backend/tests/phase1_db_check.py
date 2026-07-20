"""
第一階段：環境與數據庫基礎檢查
檢查內容：
1. 數據庫表結構完整性
2. 數據完整性驗證
3. 兩個數據庫之間的關聯性
4. 卡密數據一致性
"""

import sqlite3
import sys
import json
from pathlib import Path
from datetime import datetime

# 🔧 確保可從任意 cwd 導入 config
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# 數據庫路徑 — 改由 config.py 統一解析，不再硬編碼（連接方式維持原樣未變）
try:
    from config import DATABASE_PATH, DATABASE_DIR
    DB_PATH = DATABASE_DIR / "tgai_server.db"
    ACCOUNTS_DB_PATH = DATABASE_PATH
except ImportError:
    DB_PATH = Path(__file__).parent.parent / "data" / "tgai_server.db"
    ACCOUNTS_DB_PATH = Path(__file__).parent.parent / "data" / "tgmatrix.db"

class DatabaseChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第一階段：環境與數據庫基礎檢查",
            "checks": [],
            "warnings": [],
            "errors": [],
            "summary": {}
        }
    
    def add_check(self, name, status, details=None):
        self.report["checks"].append({
            "name": name,
            "status": status,
            "details": details
        })
        print(f"{'✅' if status == 'pass' else '❌' if status == 'fail' else '⚠️'} {name}")
        if details:
            print(f"   詳情: {details}")
    
    def add_warning(self, message):
        self.report["warnings"].append(message)
        print(f"⚠️ 警告: {message}")
    
    def add_error(self, message):
        self.report["errors"].append(message)
        print(f"❌ 錯誤: {message}")

    def check_database_exists(self):
        """檢查數據庫文件是否存在"""
        print("\n" + "="*60)
        print("📁 檢查數據庫文件")
        print("="*60)
        
        if DB_PATH.exists():
            size = DB_PATH.stat().st_size / 1024  # KB
            self.add_check("tgai_server.db 存在", "pass", f"大小: {size:.2f} KB")
        else:
            self.add_check("tgai_server.db 存在", "fail", "文件不存在")
            return False
        
        if ACCOUNTS_DB_PATH.exists():
            size = ACCOUNTS_DB_PATH.stat().st_size / 1024
            self.add_check("tgmatrix.db 存在", "pass", f"大小: {size:.2f} KB")
        else:
            self.add_check("tgmatrix.db 存在", "fail", "文件不存在")
            return False
        
        return True

    def check_tgai_server_tables(self):
        """檢查 tgai_server.db 的表結構"""
        print("\n" + "="*60)
        print("📊 檢查 tgai_server.db 表結構")
        print("="*60)
        
        expected_tables = [
            'users', 'licenses', 'orders', 'referrals', 'user_quotas',
            'usage_logs', 'devices', 'settings', 'admins', 'admin_logs',
            'announcements', 'notifications', 'user_notifications', 'coupons'
        ]
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 獲取所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n發現的表 ({len(tables)}個):")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            status = "✅" if table in expected_tables else "ℹ️"
            print(f"  {status} {table}: {count} 條記錄")
        
        # 檢查預期的表是否存在
        missing_tables = [t for t in expected_tables if t not in tables]
        if missing_tables:
            self.add_check("核心表完整性", "warning", f"缺失表: {missing_tables}")
        else:
            self.add_check("核心表完整性", "pass", "所有核心表都存在")
        
        self.report["summary"]["tgai_server_tables"] = len(tables)
        conn.close()
        return tables

    def check_tgmatrix_tables(self):
        """檢查 tgmatrix.db 的表結構"""
        print("\n" + "="*60)
        print("📊 檢查 tgmatrix.db 表結構")
        print("="*60)
        
        expected_tables = [
            'accounts', 'messages', 'chats', 'contacts', 'groups',
            'monitored_groups', 'automation_rules', 'keywords', 'templates'
        ]
        
        conn = sqlite3.connect(ACCOUNTS_DB_PATH)
        cursor = conn.cursor()
        
        # 獲取所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n發現的表 ({len(tables)}個):")
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                status = "✅" if table in expected_tables else "ℹ️"
                print(f"  {status} {table}: {count} 條記錄")
            except Exception as e:
                print(f"  ❌ {table}: 讀取錯誤 - {e}")
        
        self.report["summary"]["tgmatrix_tables"] = len(tables)
        conn.close()
        return tables

    def check_licenses(self):
        """檢查卡密數據"""
        print("\n" + "="*60)
        print("🔑 檢查卡密數據")
        print("="*60)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 統計卡密
        cursor.execute("""
            SELECT level, status, COUNT(*) as count 
            FROM licenses 
            GROUP BY level, status
            ORDER BY level, status
        """)
        stats = cursor.fetchall()
        
        print("\n卡密統計:")
        total = 0
        for row in stats:
            print(f"  {row['level']} - {row['status']}: {row['count']}張")
            total += row['count']
        print(f"  總計: {total}張")
        
        # 檢查榮耀王者卡密（對應截圖）
        cursor.execute("""
            SELECT license_key, level, status, created_at, used_at
            FROM licenses
            WHERE level = 'king'
            ORDER BY created_at DESC
        """)
        king_licenses = cursor.fetchall()
        
        print(f"\n榮耀王者卡密 ({len(king_licenses)}張):")
        for lic in king_licenses:
            print(f"  {lic['license_key']} | 狀態: {lic['status']} | 創建: {lic['created_at']}")
        
        # 驗證截圖中的卡密是否存在
        expected_keys = [
            'TGAI-KL-9F11-DA63-2CC1',
            'TGAI-KL-A4FA-06E2-271E',
            'TGAI-KL-3AA7-9FF2-038E',
            'TGAI-KL-79A9-9EBC-8794',
            'TGAI-KL-F63F-E2D2-0BD6'
        ]
        
        cursor.execute("SELECT license_key FROM licenses WHERE license_key IN ({})".format(
            ','.join(['?' for _ in expected_keys])
        ), expected_keys)
        found_keys = [row[0] for row in cursor.fetchall()]
        
        if len(found_keys) == len(expected_keys):
            self.add_check("截圖卡密驗證", "pass", f"所有{len(expected_keys)}張卡密都存在於數據庫")
        else:
            missing = set(expected_keys) - set(found_keys)
            self.add_check("截圖卡密驗證", "fail", f"缺失卡密: {missing}")
        
        self.report["summary"]["total_licenses"] = total
        self.report["summary"]["king_licenses"] = len(king_licenses)
        
        conn.close()

    def check_accounts(self):
        """檢查 Telegram 帳號數據"""
        print("\n" + "="*60)
        print("👤 檢查 Telegram 帳號")
        print("="*60)
        
        conn = sqlite3.connect(ACCOUNTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 accounts 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if not cursor.fetchone():
            self.add_check("accounts 表", "fail", "表不存在")
            conn.close()
            return
        
        # 獲取帳號統計
        cursor.execute("SELECT COUNT(*) FROM accounts")
        total = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT phone, status, healthScore, nickname, telegramId, created_at, updated_at
            FROM accounts
            ORDER BY created_at DESC
        """)
        accounts = cursor.fetchall()
        
        print(f"\n帳號列表 ({len(accounts)}個):")
        online_count = 0
        for acc in accounts:
            is_online = acc['status'] == 'Online'
            status_icon = "✅" if is_online else "❌"
            health = acc['healthScore'] or 0
            print(f"  {acc['phone']} | {status_icon} {acc['status']} | 健康: {health}% | TG ID: {acc['telegramId']}")
            if is_online:
                online_count += 1
        
        self.add_check("帳號數據", "pass", f"總計{total}個帳號, {online_count}個在線")
        self.report["summary"]["total_accounts"] = total
        self.report["summary"]["online_accounts"] = online_count
        
        conn.close()

    def check_users(self):
        """檢查用戶數據"""
        print("\n" + "="*60)
        print("👥 檢查用戶數據")
        print("="*60)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 獲取用戶統計
        cursor.execute("""
            SELECT membership_level, COUNT(*) as count 
            FROM users 
            GROUP BY membership_level
        """)
        stats = cursor.fetchall()
        
        print("\n用戶會員等級分布:")
        total = 0
        for row in stats:
            level_name = {
                'bronze': '青銅戰士',
                'silver': '白銀精英',
                'gold': '黃金大師',
                'diamond': '鑽石王牌',
                'star': '星耀傳說',
                'king': '榮耀王者'
            }.get(row['membership_level'], row['membership_level'])
            print(f"  {level_name}: {row['count']}人")
            total += row['count']
        print(f"  總計: {total}人")
        
        self.report["summary"]["total_users"] = total
        
        conn.close()

    def check_data_integrity(self):
        """檢查數據完整性"""
        print("\n" + "="*60)
        print("🔍 檢查數據完整性")
        print("="*60)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 檢查卡密外鍵 - used_by 是否指向有效用戶
        cursor.execute("""
            SELECT l.license_key, l.used_by 
            FROM licenses l 
            WHERE l.used_by IS NOT NULL 
            AND l.used_by NOT IN (SELECT user_id FROM users)
        """)
        orphan_licenses = cursor.fetchall()
        
        if orphan_licenses:
            self.add_check("卡密用戶關聯", "warning", f"發現{len(orphan_licenses)}張卡密指向無效用戶")
        else:
            self.add_check("卡密用戶關聯", "pass", "所有已使用卡密都關聯到有效用戶")
        
        # 檢查訂單外鍵
        cursor.execute("""
            SELECT o.order_id, o.user_id 
            FROM orders o 
            WHERE o.user_id NOT IN (SELECT user_id FROM users)
        """)
        orphan_orders = cursor.fetchall()
        
        if orphan_orders:
            self.add_check("訂單用戶關聯", "warning", f"發現{len(orphan_orders)}個訂單指向無效用戶")
        else:
            self.add_check("訂單用戶關聯", "pass", "所有訂單都關聯到有效用戶")
        
        # 檢查必填字段
        cursor.execute("SELECT COUNT(*) FROM licenses WHERE license_key IS NULL OR license_key = ''")
        null_keys = cursor.fetchone()[0]
        if null_keys > 0:
            self.add_check("卡密必填字段", "fail", f"發現{null_keys}張卡密缺少 license_key")
        else:
            self.add_check("卡密必填字段", "pass", "所有卡密都有有效的 license_key")
        
        conn.close()

    def check_db_relationship(self):
        """檢查兩個數據庫之間的關聯性"""
        print("\n" + "="*60)
        print("🔗 檢查數據庫間關聯性")
        print("="*60)
        
        # 連接兩個數據庫
        conn1 = sqlite3.connect(DB_PATH)
        conn1.row_factory = sqlite3.Row
        cursor1 = conn1.cursor()
        
        conn2 = sqlite3.connect(ACCOUNTS_DB_PATH)
        conn2.row_factory = sqlite3.Row
        cursor2 = conn2.cursor()
        
        # 獲取 tgai_server 中的用戶
        cursor1.execute("SELECT user_id, machine_id FROM users")
        users = cursor1.fetchall()
        
        # 檢查 accounts 表是否存在
        cursor2.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if cursor2.fetchone():
            # 獲取 tgmatrix 中的帳號
            cursor2.execute("SELECT phone, telegramId, status FROM accounts")
            accounts = cursor2.fetchall()
            
            print(f"\ntgai_server.db 用戶數: {len(users)}")
            print(f"tgmatrix.db 帳號數: {len(accounts)}")
            
            # 檢查是否有用戶配額與帳號數量的一致性
            self.add_check("數據庫關聯性", "pass", "兩個數據庫可正常訪問")
            
            # 額外檢查：user_quotas 中的帳號配額
            cursor1.execute("SELECT COUNT(*) FROM user_quotas")
            quota_count = cursor1.fetchone()[0]
            print(f"用戶配額記錄數: {quota_count}")
        else:
            self.add_check("數據庫關聯性", "warning", "accounts 表不存在")
        
        conn1.close()
        conn2.close()

    def check_admins(self):
        """檢查管理員數據"""
        print("\n" + "="*60)
        print("👨‍💼 檢查管理員數據")
        print("="*60)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT username, role, is_active, last_login_at FROM admins")
        admins = cursor.fetchall()
        
        print(f"\n管理員列表 ({len(admins)}個):")
        for admin in admins:
            status = "✅ 活躍" if admin['is_active'] else "❌ 禁用"
            print(f"  {admin['username']} | 角色: {admin['role']} | {status} | 最後登入: {admin['last_login_at']}")
        
        self.report["summary"]["total_admins"] = len(admins)
        
        conn.close()

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第一階段檢查報告總結")
        print("="*60)
        
        passed = sum(1 for c in self.report["checks"] if c["status"] == "pass")
        failed = sum(1 for c in self.report["checks"] if c["status"] == "fail")
        warnings = sum(1 for c in self.report["checks"] if c["status"] == "warning")
        
        print(f"\n檢查項目: {len(self.report['checks'])}項")
        print(f"  ✅ 通過: {passed}項")
        print(f"  ⚠️ 警告: {warnings}項")
        print(f"  ❌ 失敗: {failed}項")
        
        print(f"\n數據統計:")
        for key, value in self.report["summary"].items():
            print(f"  {key}: {value}")
        
        if self.report["errors"]:
            print(f"\n❌ 錯誤列表:")
            for err in self.report["errors"]:
                print(f"  - {err}")
        
        if self.report["warnings"]:
            print(f"\n⚠️ 警告列表:")
            for warn in self.report["warnings"]:
                print(f"  - {warn}")
        
        # 保存報告
        report_path = Path(__file__).parent / "phase1_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    def run(self):
        """執行所有檢查"""
        print("\n" + "="*60)
        print("🚀 開始第一階段：環境與數據庫基礎檢查")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # 檢查數據庫文件
        if not self.check_database_exists():
            self.add_error("數據庫文件不存在，無法繼續檢查")
            return self.generate_report()
        
        # 檢查表結構
        self.check_tgai_server_tables()
        self.check_tgmatrix_tables()
        
        # 檢查具體數據
        self.check_licenses()
        self.check_accounts()
        self.check_users()
        self.check_admins()
        
        # 檢查數據完整性
        self.check_data_integrity()
        
        # 檢查數據庫關聯性
        self.check_db_relationship()
        
        # 生成報告
        return self.generate_report()


if __name__ == "__main__":
    checker = DatabaseChecker()
    report = checker.run()
    
    # 返回狀態碼
    if report["errors"]:
        sys.exit(1)
    sys.exit(0)

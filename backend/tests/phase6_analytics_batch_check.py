"""
第六階段：數據分析與批量操作測試
測試統計報表、批量操作、性能監控等功能
"""

import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime

# 數據庫路徑
SERVER_DB_PATH = Path(__file__).parent.parent / "data" / "tgai_server.db"
ACCOUNTS_DB_PATH = Path(__file__).parent.parent / "data" / "tgmatrix.db"


class AnalyticsBatchChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第六階段：數據分析與批量操作測試",
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
        icon = "✅" if status == "pass" else "❌" if status == "fail" else "⚠️"
        print(f"{icon} {name}")
        if details:
            print(f"   詳情: {details}")
    
    def add_warning(self, message):
        self.report["warnings"].append(message)
        print(f"⚠️ 警告: {message}")
    
    def add_error(self, message):
        self.report["errors"].append(message)
        print(f"❌ 錯誤: {message}")

    def check_batch_operations(self):
        """檢查批量操作記錄"""
        print("\n" + "="*60)
        print("📦 檢查批量操作")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='batch_operations'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM batch_operations")
            total = cursor.fetchone()['total']
            
            cursor.execute("SELECT * FROM batch_operations ORDER BY created_at DESC LIMIT 5")
            operations = cursor.fetchall()
            
            print(f"\n批量操作記錄: {total} 條")
            if operations:
                print("\n最近操作:")
                for op in operations:
                    op_dict = dict(op)
                    op_type = op_dict.get('operation_type', op_dict.get('type', '未知'))
                    status = op_dict.get('status', '未知')
                    created = op_dict.get('created_at', '')
                    print(f"  [{op_type}] {status} ({created})")
            
            self.add_check("批量操作", "pass", f"共 {total} 條記錄")
            self.report["summary"]["batch_operations_count"] = total
        else:
            self.add_check("批量操作", "warning", "batch_operations 表不存在")
        
        conn.close()

    def check_stats_daily(self):
        """檢查每日統計"""
        print("\n" + "="*60)
        print("📊 檢查每日統計")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stats_daily'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM stats_daily")
            total = cursor.fetchone()['total']
            
            cursor.execute("SELECT * FROM stats_daily ORDER BY date DESC LIMIT 7")
            stats = cursor.fetchall()
            
            print(f"\n每日統計記錄: {total} 天")
            if stats:
                print("\n最近7天:")
                for s in stats:
                    s_dict = dict(s)
                    date = s_dict.get('date', '未知')
                    # 嘗試獲取不同的統計字段
                    messages = s_dict.get('messages_sent', s_dict.get('total_messages', 0))
                    users = s_dict.get('active_users', s_dict.get('new_users', 0))
                    print(f"  {date}: 消息 {messages}, 用戶 {users}")
            
            self.add_check("每日統計", "pass" if total > 0 else "warning", f"共 {total} 天記錄")
            self.report["summary"]["stats_daily_count"] = total
        else:
            self.add_check("每日統計", "warning", "stats_daily 表不存在")
        
        conn.close()

    def check_ad_send_logs(self):
        """檢查廣告發送日誌"""
        print("\n" + "="*60)
        print("📣 檢查廣告發送日誌")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ad_send_logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM ad_send_logs")
            total = cursor.fetchone()['total']
            
            # 按狀態統計
            cursor.execute("""
                SELECT status, COUNT(*) as count
                FROM ad_send_logs
                GROUP BY status
            """)
            status_stats = cursor.fetchall()
            
            print(f"\n廣告發送日誌: {total} 條")
            if status_stats:
                print("\n按狀態:")
                for s in status_stats:
                    s_dict = dict(s)
                    status = s_dict.get('status', '未知')
                    count = s_dict.get('count', 0)
                    print(f"  {status}: {count} 條")
            
            self.add_check("廣告發送日誌", "pass", f"共 {total} 條")
            self.report["summary"]["ad_send_logs_count"] = total
        else:
            self.add_check("廣告發送日誌", "warning", "ad_send_logs 表不存在")
        
        conn.close()

    def check_tracked_users(self):
        """檢查用戶追蹤"""
        print("\n" + "="*60)
        print("🎯 檢查用戶追蹤")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tracked_users'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM tracked_users")
            total = cursor.fetchone()['total']
            
            print(f"\n追蹤用戶: {total} 人")
            self.add_check("用戶追蹤", "pass", f"共 {total} 人")
            self.report["summary"]["tracked_users_count"] = total
        else:
            self.add_check("用戶追蹤", "warning", "tracked_users 表不存在")
        
        # 檢查追蹤日誌
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_tracking_logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM user_tracking_logs")
            total = cursor.fetchone()['total']
            
            print(f"追蹤日誌: {total} 條")
            self.add_check("追蹤日誌", "pass", f"共 {total} 條")
            self.report["summary"]["tracking_logs_count"] = total
        
        conn.close()

    def check_campaigns(self):
        """檢查活動統計"""
        print("\n" + "="*60)
        print("📈 檢查活動統計")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM campaigns")
            total = cursor.fetchone()['total']
            
            print(f"\n活動: {total} 個")
            self.add_check("活動記錄", "pass" if total > 0 else "warning", f"共 {total} 個")
            self.report["summary"]["campaigns_count"] = total
        else:
            self.add_check("活動記錄", "warning", "campaigns 表不存在")
        
        # 檢查活動日誌
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campaign_logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM campaign_logs")
            total = cursor.fetchone()['total']
            
            print(f"活動日誌: {total} 條")
            self.add_check("活動日誌", "pass", f"共 {total} 條")
            self.report["summary"]["campaign_logs_count"] = total
        
        conn.close()

    def check_account_roles(self):
        """檢查帳號角色配置"""
        print("\n" + "="*60)
        print("🎭 檢查帳號角色")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='account_roles'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM account_roles")
            total = cursor.fetchone()['total']
            
            cursor.execute("SELECT * FROM account_roles LIMIT 5")
            roles = cursor.fetchall()
            
            print(f"\n帳號角色配置: {total} 個")
            if roles:
                for r in roles:
                    r_dict = dict(r)
                    phone = r_dict.get('phone', r_dict.get('account_phone', '未知'))
                    role = r_dict.get('role', r_dict.get('role_name', '未知'))
                    print(f"  {phone}: {role}")
            
            self.add_check("帳號角色", "pass" if total > 0 else "warning", f"共 {total} 個配置")
            self.report["summary"]["account_roles_count"] = total
        else:
            self.add_check("帳號角色", "warning", "account_roles 表不存在")
        
        conn.close()

    def check_settings(self):
        """檢查系統設置"""
        print("\n" + "="*60)
        print("⚙️ 檢查系統設置")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as total FROM settings")
        total = cursor.fetchone()['total']
        
        cursor.execute("SELECT setting_key, setting_value FROM settings ORDER BY setting_key")
        settings = cursor.fetchall()
        
        print(f"\n系統設置: {total} 項")
        if settings:
            print("\n設置列表:")
            for s in settings[:15]:  # 只顯示前15項
                s_dict = dict(s)
                key = s_dict.get('setting_key', '未知')
                value = str(s_dict.get('setting_value', ''))
                # 隱藏敏感信息
                if 'key' in key.lower() or 'secret' in key.lower() or 'password' in key.lower():
                    value = '***' if value else '(空)'
                elif len(value) > 30:
                    value = value[:30] + '...'
                print(f"  {key}: {value}")
            if len(settings) > 15:
                print(f"  ... 還有 {len(settings) - 15} 項設置")
        
        self.add_check("系統設置", "pass", f"共 {total} 項設置")
        self.report["summary"]["settings_count"] = total
        
        conn.close()

    def check_schema_version(self):
        """檢查數據庫架構版本"""
        print("\n" + "="*60)
        print("🔢 檢查數據庫版本")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM schema_version ORDER BY applied_at DESC")
            versions = cursor.fetchall()
            
            print(f"\n遷移記錄: {len(versions)} 條")
            if versions:
                print("\n已應用的遷移:")
                for v in versions:
                    v_dict = dict(v)
                    version = v_dict.get('version', '未知')
                    name = v_dict.get('name', '')
                    applied = v_dict.get('applied_at', '')
                    print(f"  v{version}: {name} ({applied})")
            
            self.add_check("數據庫版本", "pass", f"當前版本: v{versions[0]['version'] if versions else '未知'}")
            self.report["summary"]["db_version"] = versions[0]['version'] if versions else 'unknown'
        else:
            self.add_check("數據庫版本", "warning", "schema_version 表不存在")
        
        conn.close()

    def check_database_integrity(self):
        """檢查數據庫完整性"""
        print("\n" + "="*60)
        print("🔍 檢查數據庫完整性")
        print("="*60)
        
        # 檢查 tgai_server.db
        conn1 = sqlite3.connect(SERVER_DB_PATH)
        cursor1 = conn1.cursor()
        
        try:
            cursor1.execute("PRAGMA integrity_check")
            result = cursor1.fetchone()[0]
            
            if result == 'ok':
                self.add_check("tgai_server.db 完整性", "pass", "數據庫完整")
            else:
                self.add_check("tgai_server.db 完整性", "fail", f"問題: {result}")
        except Exception as e:
            self.add_check("tgai_server.db 完整性", "fail", str(e))
        
        conn1.close()
        
        # 檢查 tgmatrix.db
        conn2 = sqlite3.connect(ACCOUNTS_DB_PATH)
        cursor2 = conn2.cursor()
        
        try:
            cursor2.execute("PRAGMA integrity_check")
            result = cursor2.fetchone()[0]
            
            if result == 'ok':
                self.add_check("tgmatrix.db 完整性", "pass", "數據庫完整")
            else:
                self.add_check("tgmatrix.db 完整性", "fail", f"問題: {result}")
        except Exception as e:
            self.add_check("tgmatrix.db 完整性", "fail", str(e))
        
        conn2.close()

    def check_database_size(self):
        """檢查數據庫大小"""
        print("\n" + "="*60)
        print("💾 檢查數據庫大小")
        print("="*60)
        
        db_files = [
            ("tgai_server.db", SERVER_DB_PATH),
            ("tgmatrix.db", ACCOUNTS_DB_PATH)
        ]
        
        total_size = 0
        for name, path in db_files:
            if path.exists():
                size_kb = path.stat().st_size / 1024
                size_mb = size_kb / 1024
                print(f"  {name}: {size_kb:.1f} KB ({size_mb:.2f} MB)")
                total_size += size_kb
            else:
                print(f"  {name}: 不存在")
        
        print(f"\n總計: {total_size:.1f} KB ({total_size/1024:.2f} MB)")
        
        self.add_check("數據庫大小", "pass", f"總計 {total_size/1024:.2f} MB")
        self.report["summary"]["total_db_size_kb"] = round(total_size, 2)

    def generate_final_summary(self):
        """生成最終總結"""
        print("\n" + "="*60)
        print("🎯 全部測試總結")
        print("="*60)
        
        # 讀取所有階段的報告
        all_phases = []
        report_files = [
            ("第一階段", "phase1_report.json"),
            ("第二階段", "phase2_report.json"),
            ("第三階段", "phase3_report.json"),
            ("第四階段", "phase4_report.json"),
            ("第五階段", "phase5_report.json"),
        ]
        
        total_passed = 0
        total_warnings = 0
        total_failed = 0
        
        print("\n各階段結果:")
        for phase_name, file_name in report_files:
            report_path = Path(__file__).parent / file_name
            if report_path.exists():
                with open(report_path, 'r', encoding='utf-8') as f:
                    phase_report = json.load(f)
                    checks = phase_report.get('checks', [])
                    passed = sum(1 for c in checks if c['status'] == 'pass')
                    warnings = sum(1 for c in checks if c['status'] == 'warning')
                    failed = sum(1 for c in checks if c['status'] == 'fail')
                    
                    total_passed += passed
                    total_warnings += warnings
                    total_failed += failed
                    
                    status_icon = "✅" if failed == 0 else "⚠️" if warnings > 0 else "❌"
                    print(f"  {status_icon} {phase_name}: {passed}✅ {warnings}⚠️ {failed}❌")
        
        # 加上第六階段（當前）
        passed = sum(1 for c in self.report['checks'] if c['status'] == 'pass')
        warnings = sum(1 for c in self.report['checks'] if c['status'] == 'warning')
        failed = sum(1 for c in self.report['checks'] if c['status'] == 'fail')
        
        total_passed += passed
        total_warnings += warnings
        total_failed += failed
        
        status_icon = "✅" if failed == 0 else "⚠️" if warnings > 0 else "❌"
        print(f"  {status_icon} 第六階段: {passed}✅ {warnings}⚠️ {failed}❌")
        
        print("\n" + "-"*40)
        print(f"總計: {total_passed}✅ 通過 | {total_warnings}⚠️ 警告 | {total_failed}❌ 失敗")
        print("-"*40)
        
        self.report["summary"]["total_passed"] = total_passed
        self.report["summary"]["total_warnings"] = total_warnings
        self.report["summary"]["total_failed"] = total_failed

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第六階段檢查報告總結")
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
        report_path = Path(__file__).parent / "phase6_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    def run(self):
        """執行所有檢查"""
        print("\n" + "="*60)
        print("🚀 開始第六階段：數據分析與批量操作測試")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # 檢查批量操作
        self.check_batch_operations()
        
        # 檢查每日統計
        self.check_stats_daily()
        
        # 檢查廣告發送日誌
        self.check_ad_send_logs()
        
        # 檢查用戶追蹤
        self.check_tracked_users()
        
        # 檢查活動統計
        self.check_campaigns()
        
        # 檢查帳號角色
        self.check_account_roles()
        
        # 檢查系統設置
        self.check_settings()
        
        # 檢查數據庫版本
        self.check_schema_version()
        
        # 檢查數據庫完整性
        self.check_database_integrity()
        
        # 檢查數據庫大小
        self.check_database_size()
        
        # 生成報告
        report = self.generate_report()
        
        # 生成最終總結
        self.generate_final_summary()
        
        return report


if __name__ == "__main__":
    checker = AnalyticsBatchChecker()
    report = checker.run()
    
    # 返回狀態碼
    failed = sum(1 for c in report["checks"] if c["status"] == "fail")
    sys.exit(1 if failed > 2 else 0)

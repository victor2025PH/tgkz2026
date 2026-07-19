"""
第四階段：消息與自動化功能測試
測試消息發送、自動回覆、AI對話、定時任務等功能
"""

import asyncio
import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

# 🔧 確保可從任意 cwd 導入 config
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# 數據庫路徑 — 改由 config.py 統一解析，不再硬編碼（連接方式維持原樣未變）
try:
    from config import DATABASE_PATH, DATABASE_DIR
    ACCOUNTS_DB_PATH = DATABASE_PATH
    SERVER_DB_PATH = DATABASE_DIR / "tgai_server.db"
except ImportError:
    ACCOUNTS_DB_PATH = Path(__file__).parent.parent / "data" / "tgmatrix.db"
    SERVER_DB_PATH = Path(__file__).parent.parent / "data" / "tgai_server.db"


class MessagingAutomationChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第四階段：消息與自動化功能測試",
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

    def check_message_queue(self):
        """檢查消息隊列系統"""
        print("\n" + "="*60)
        print("📬 檢查消息隊列系統")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 message_queue 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='message_queue'")
        if cursor.fetchone():
            # 獲取隊列統計
            cursor.execute("""
                SELECT 
                    status,
                    COUNT(*) as count
                FROM message_queue
                GROUP BY status
            """)
            stats = cursor.fetchall()
            
            print("\n消息隊列狀態:")
            total = 0
            pending = 0
            for row in stats:
                print(f"  {row['status']}: {row['count']} 條")
                total += row['count']
                if row['status'] == 'pending':
                    pending = row['count']
            
            if total == 0:
                print("  (隊列為空)")
            
            self.add_check("消息隊列表", "pass", f"總計 {total} 條消息, {pending} 條待發送")
            self.report["summary"]["message_queue_total"] = total
            self.report["summary"]["message_queue_pending"] = pending
            
            # 檢查最近的消息
            cursor.execute("""
                SELECT phone, user_id, status, created_at, text
                FROM message_queue
                ORDER BY created_at DESC
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            if recent:
                print("\n最近消息:")
                for msg in recent:
                    text_preview = msg['text'][:30] + '...' if msg['text'] and len(msg['text']) > 30 else msg['text']
                    print(f"  {msg['phone']} -> {msg['user_id']}: {msg['status']} - {text_preview}")
        else:
            self.add_check("消息隊列表", "fail", "message_queue 表不存在")
        
        conn.close()

    def check_keyword_sets(self):
        """檢查關鍵詞集配置"""
        print("\n" + "="*60)
        print("🔤 檢查關鍵詞集配置")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 keyword_sets 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='keyword_sets'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM keyword_sets ORDER BY created_at DESC")
            sets = cursor.fetchall()
            
            print(f"\n關鍵詞集 ({len(sets)}個):")
            for s in sets:
                s_dict = dict(s)
                name = s_dict.get('name', '未命名')
                is_active = s_dict.get('is_active', 1)
                status = "✅ 啟用" if is_active else "❌ 停用"
                print(f"  [{s_dict.get('id', '?')}] {name}: {status}")
            
            self.add_check("關鍵詞集", "pass" if len(sets) > 0 else "warning", 
                          f"共 {len(sets)} 個關鍵詞集")
            self.report["summary"]["keyword_sets_count"] = len(sets)
            
            # 檢查 keywords 表
            cursor.execute("SELECT * FROM keywords ORDER BY keyword_set_id")
            keywords = cursor.fetchall()
            
            print(f"\n關鍵詞 ({len(keywords)}個):")
            for kw in keywords[:10]:  # 只顯示前10個
                kw_dict = dict(kw)
                keyword = kw_dict.get('keyword', kw_dict.get('word', ''))
                set_id = kw_dict.get('keyword_set_id', kw_dict.get('set_id', 0))
                print(f"  [{set_id}] {keyword}")
            if len(keywords) > 10:
                print(f"  ... 還有 {len(keywords) - 10} 個關鍵詞")
            
            self.report["summary"]["keywords_count"] = len(keywords)
        else:
            self.add_check("關鍵詞集", "warning", "keyword_sets 表不存在")
        
        conn.close()

    def check_monitored_groups(self):
        """檢查監控群組配置"""
        print("\n" + "="*60)
        print("👁️ 檢查監控群組")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 monitored_groups 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='monitored_groups'")
        if cursor.fetchone():
            cursor.execute("""
                SELECT id, name, link, is_active, member_count, phone
                FROM monitored_groups
                ORDER BY created_at DESC
            """)
            groups = cursor.fetchall()
            
            print(f"\n監控群組 ({len(groups)}個):")
            active_count = 0
            for g in groups:
                g_dict = dict(g)
                name = g_dict.get('name', '未命名')
                is_active = g_dict.get('is_active', 0)
                member_count = g_dict.get('member_count', 0)
                phone = g_dict.get('phone', '未分配')
                status = "✅" if is_active else "⏸️"
                print(f"  {status} {name}: {member_count} 成員 (帳號: {phone})")
                if is_active:
                    active_count += 1
            
            self.add_check("監控群組", "pass" if len(groups) > 0 else "warning",
                          f"共 {len(groups)} 個群組, {active_count} 個啟用")
            self.report["summary"]["monitored_groups_count"] = len(groups)
            self.report["summary"]["active_monitored_groups"] = active_count
        else:
            self.add_check("監控群組", "warning", "monitored_groups 表不存在")
        
        conn.close()

    def check_automation_rules(self):
        """檢查自動化規則"""
        print("\n" + "="*60)
        print("🤖 檢查自動化規則")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查設置中的自動化配置
        cursor.execute("""
            SELECT setting_key, setting_value
            FROM settings
            WHERE setting_key LIKE '%auto%' OR setting_key LIKE '%monitor%'
        """)
        auto_settings = cursor.fetchall()
        
        print("\n自動化相關設置:")
        for s in auto_settings:
            value = s['setting_value'][:50] + '...' if len(s['setting_value']) > 50 else s['setting_value']
            print(f"  {s['setting_key']}: {value}")
        
        if auto_settings:
            self.add_check("自動化設置", "pass", f"共 {len(auto_settings)} 項設置")
        else:
            self.add_check("自動化設置", "warning", "未找到自動化相關設置")
        
        # 檢查腳本模板
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='script_templates'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM script_templates ORDER BY created_at DESC")
            scripts = cursor.fetchall()
            
            print(f"\n腳本模板 ({len(scripts)}個):")
            for s in scripts:
                s_dict = dict(s)
                name = s_dict.get('name', '未命名')
                script_type = s_dict.get('type', s_dict.get('script_type', '未知'))
                print(f"  [{s_dict.get('id', '?')}] {name} ({script_type})")
            
            self.add_check("腳本模板", "pass" if len(scripts) > 0 else "warning",
                          f"共 {len(scripts)} 個模板")
            self.report["summary"]["script_templates_count"] = len(scripts)
        
        conn.close()

    def check_ai_settings(self):
        """檢查 AI 設置"""
        print("\n" + "="*60)
        print("🧠 檢查 AI 設置")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 AI 相關設置
        cursor.execute("""
            SELECT setting_key, setting_value
            FROM settings
            WHERE setting_key LIKE '%ai%' OR setting_key LIKE '%gemini%' OR setting_key LIKE '%gpt%'
        """)
        ai_settings = cursor.fetchall()
        
        print("\nAI 相關設置:")
        for s in ai_settings:
            # 隱藏敏感信息
            key = s['setting_key']
            value = s['setting_value']
            if 'key' in key.lower() or 'token' in key.lower() or 'api' in key.lower():
                value = value[:8] + '...' if len(value) > 8 else '(已配置)'
            print(f"  {key}: {value}")
        
        if ai_settings:
            self.add_check("AI 設置", "pass", f"共 {len(ai_settings)} 項設置")
        else:
            self.add_check("AI 設置", "warning", "未找到 AI 相關設置")
        
        conn.close()
        
        # 檢查帳號 AI 配置
        conn2 = sqlite3.connect(ACCOUNTS_DB_PATH)
        conn2.row_factory = sqlite3.Row
        cursor2 = conn2.cursor()
        
        cursor2.execute("""
            SELECT phone, aiEnabled, aiModel, aiPersonality
            FROM accounts
        """)
        accounts = cursor2.fetchall()
        
        print("\n帳號 AI 配置:")
        ai_enabled_count = 0
        for acc in accounts:
            acc_dict = dict(acc)
            ai_status = "✅ 啟用" if acc_dict.get('aiEnabled') else "❌ 關閉"
            model = acc_dict.get('aiModel', '未設置')
            print(f"  {acc_dict.get('phone', '?')}: {ai_status} | 模型: {model or '未設置'}")
            if acc_dict.get('aiEnabled'):
                ai_enabled_count += 1
        
        self.add_check("帳號 AI 配置", "pass" if ai_enabled_count > 0 else "warning",
                      f"{ai_enabled_count}/{len(accounts)} 帳號啟用 AI")
        self.report["summary"]["ai_enabled_accounts"] = ai_enabled_count
        
        conn2.close()

    def check_chat_history(self):
        """檢查聊天記錄"""
        print("\n" + "="*60)
        print("💬 檢查聊天記錄")
        print("="*60)
        
        conn = sqlite3.connect(ACCOUNTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 chat_history 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history'")
        if cursor.fetchone():
            # 獲取統計
            cursor.execute("SELECT COUNT(*) as total FROM chat_history")
            total = cursor.fetchone()['total']
            
            cursor.execute("""
                SELECT role, COUNT(*) as count
                FROM chat_history
                GROUP BY role
            """)
            role_stats = cursor.fetchall()
            
            print(f"\n聊天記錄總數: {total}")
            if role_stats:
                print("\n按角色分類:")
                for r in role_stats:
                    print(f"  {r['role']}: {r['count']} 條")
            
            # 獲取最近的聊天
            cursor.execute("""
                SELECT user_id, role, content, timestamp
                FROM chat_history
                ORDER BY timestamp DESC
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            if recent:
                print("\n最近聊天:")
                for msg in recent:
                    content = msg['content'][:40] + '...' if msg['content'] and len(msg['content']) > 40 else msg['content']
                    print(f"  [{msg['role']}] {msg['user_id']}: {content}")
            
            self.add_check("聊天記錄", "pass", f"共 {total} 條記錄")
            self.report["summary"]["chat_history_count"] = total
        else:
            self.add_check("聊天記錄", "fail", "chat_history 表不存在")
        
        conn.close()

    def check_user_profiles(self):
        """檢查用戶畫像"""
        print("\n" + "="*60)
        print("👤 檢查用戶畫像")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 user_profiles 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM user_profiles")
            total = cursor.fetchone()['total']
            
            # 按漏斗階段統計
            cursor.execute("""
                SELECT funnel_stage, COUNT(*) as count
                FROM user_profiles
                WHERE funnel_stage IS NOT NULL AND funnel_stage != ''
                GROUP BY funnel_stage
            """)
            stages = cursor.fetchall()
            
            print(f"\n用戶畫像總數: {total}")
            if stages:
                print("\n漏斗階段分布:")
                for s in stages:
                    print(f"  {s['funnel_stage']}: {s['count']} 人")
            
            self.add_check("用戶畫像", "pass", f"共 {total} 個用戶畫像")
            self.report["summary"]["user_profiles_count"] = total
        else:
            self.add_check("用戶畫像", "warning", "user_profiles 表不存在")
        
        # 檢查 extracted_members (潛在客戶)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='extracted_members'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM extracted_members")
            leads_total = cursor.fetchone()['total']
            
            cursor.execute("""
                SELECT response_status, COUNT(*) as count
                FROM extracted_members
                GROUP BY response_status
            """)
            lead_stats = cursor.fetchall()
            
            print(f"\n潛在客戶 (Leads): {leads_total}")
            if lead_stats:
                print("\n響應狀態分布:")
                for s in lead_stats:
                    s_dict = dict(s)
                    status = s_dict.get('response_status', '未分類')
                    print(f"  {status}: {s_dict.get('count', 0)} 人")
            
            self.add_check("潛在客戶", "pass", f"共 {leads_total} 個潛在客戶")
            self.report["summary"]["leads_count"] = leads_total
        
        conn.close()

    def check_scheduled_tasks(self):
        """檢查定時任務"""
        print("\n" + "="*60)
        print("⏰ 檢查定時任務")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 ad_schedules 表（廣告發送計劃）
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ad_schedules'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM ad_schedules")
            total = cursor.fetchone()['total']
            
            cursor.execute("""
                SELECT id, name, is_active, schedule_type, send_mode
                FROM ad_schedules
                ORDER BY created_at DESC
                LIMIT 5
            """)
            schedules = cursor.fetchall()
            
            print(f"\n廣告發送計劃: {total} 個")
            if schedules:
                for s in schedules:
                    s_dict = dict(s)
                    name = s_dict.get('name', '未命名')
                    is_active = s_dict.get('is_active', 0)
                    status = "✅ 啟用" if is_active else "❌ 停用"
                    schedule_type = s_dict.get('schedule_type', '未知')
                    print(f"  [{s_dict.get('id', '?')}] {name}: {status} ({schedule_type})")
            
            self.add_check("廣告發送計劃", "pass" if total > 0 else "warning",
                          f"共 {total} 個計劃")
            self.report["summary"]["ad_schedules_count"] = total
        else:
            self.add_check("廣告發送計劃", "warning", "ad_schedules 表不存在")
        
        # 檢查 follow_up_tasks 表（跟進任務）
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='follow_up_tasks'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM follow_up_tasks")
            total = cursor.fetchone()['total']
            
            print(f"\n跟進任務: {total} 個")
            self.add_check("跟進任務", "pass", f"共 {total} 個任務")
            self.report["summary"]["follow_up_tasks_count"] = total
        
        conn.close()

    def check_message_templates(self):
        """檢查消息模板"""
        print("\n" + "="*60)
        print("📝 檢查消息模板")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 message_templates 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='message_templates'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM message_templates ORDER BY created_at DESC")
            templates = cursor.fetchall()
            
            print(f"\n消息模板 ({len(templates)}個):")
            for t in templates[:5]:
                t_dict = dict(t)
                name = t_dict.get('name', '未命名')
                category = t_dict.get('category', '未分類')
                print(f"  {name} ({category})")
            if len(templates) > 5:
                print(f"  ... 還有 {len(templates) - 5} 個模板")
            
            self.add_check("消息模板", "pass" if len(templates) > 0 else "warning",
                          f"共 {len(templates)} 個模板")
            self.report["summary"]["message_templates_count"] = len(templates)
        else:
            self.add_check("消息模板", "warning", "message_templates 表不存在或為空")
        
        # 檢查 ad_templates 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ad_templates'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM ad_templates")
            total = cursor.fetchone()['total']
            
            print(f"\n廣告模板: {total} 個")
            self.add_check("廣告模板", "pass" if total > 0 else "warning",
                          f"共 {total} 個模板")
            self.report["summary"]["ad_templates_count"] = total
        
        conn.close()

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第四階段檢查報告總結")
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
        report_path = Path(__file__).parent / "phase4_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    def run(self):
        """執行所有檢查"""
        print("\n" + "="*60)
        print("🚀 開始第四階段：消息與自動化功能測試")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # 檢查消息隊列
        self.check_message_queue()
        
        # 檢查關鍵詞集
        self.check_keyword_sets()
        
        # 檢查監控群組
        self.check_monitored_groups()
        
        # 檢查自動化規則
        self.check_automation_rules()
        
        # 檢查 AI 設置
        self.check_ai_settings()
        
        # 檢查聊天記錄
        self.check_chat_history()
        
        # 檢查用戶畫像
        self.check_user_profiles()
        
        # 檢查定時任務
        self.check_scheduled_tasks()
        
        # 檢查消息模板
        self.check_message_templates()
        
        # 生成報告
        return self.generate_report()


if __name__ == "__main__":
    checker = MessagingAutomationChecker()
    report = checker.run()
    
    # 返回狀態碼
    failed = sum(1 for c in report["checks"] if c["status"] == "fail")
    sys.exit(1 if failed > 2 else 0)

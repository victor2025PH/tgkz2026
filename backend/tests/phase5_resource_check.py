"""
第五階段：群組與資源功能測試
測試群組搜索、資源發現、成員提取等功能
"""

import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime

# 🔧 確保可從任意 cwd 導入 config
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# 數據庫路徑 — 改由 config.py 統一解析，不再硬編碼（連接方式維持原樣未變）
try:
    from config import DATABASE_DIR
    SERVER_DB_PATH = DATABASE_DIR / "tgai_server.db"
except ImportError:
    SERVER_DB_PATH = Path(__file__).parent.parent / "data" / "tgai_server.db"


class ResourceChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第五階段：群組與資源功能測試",
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

    def check_discovered_resources(self):
        """檢查已發現的資源"""
        print("\n" + "="*60)
        print("🔍 檢查已發現的資源")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='discovered_resources'")
        if cursor.fetchone():
            # 獲取總數
            cursor.execute("SELECT COUNT(*) as total FROM discovered_resources")
            total = cursor.fetchone()['total']
            
            # 按類型統計
            cursor.execute("""
                SELECT resource_type, COUNT(*) as count
                FROM discovered_resources
                GROUP BY resource_type
            """)
            type_stats = cursor.fetchall()
            
            print(f"\n資源總數: {total}")
            if type_stats:
                print("\n按類型分布:")
                for t in type_stats:
                    t_dict = dict(t)
                    print(f"  {t_dict.get('resource_type', '未知')}: {t_dict.get('count', 0)}")
            
            # 按狀態統計
            cursor.execute("""
                SELECT status, COUNT(*) as count
                FROM discovered_resources
                GROUP BY status
            """)
            status_stats = cursor.fetchall()
            
            if status_stats:
                print("\n按狀態分布:")
                for s in status_stats:
                    s_dict = dict(s)
                    print(f"  {s_dict.get('status', '未知')}: {s_dict.get('count', 0)}")
            
            # 獲取最近發現的資源
            cursor.execute("""
                SELECT id, resource_type, title, username, member_count, status
                FROM discovered_resources
                ORDER BY created_at DESC
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            if recent:
                print("\n最近發現的資源:")
                for r in recent:
                    r_dict = dict(r)
                    title = r_dict.get('title', '未命名')[:30]
                    username = r_dict.get('username', '')
                    members = r_dict.get('member_count', 0)
                    status = r_dict.get('status', '未知')
                    print(f"  [{r_dict.get('id')}] {title} (@{username}): {members} 成員 ({status})")
            
            self.add_check("已發現資源", "pass", f"共 {total} 個資源")
            self.report["summary"]["discovered_resources_count"] = total
        else:
            self.add_check("已發現資源", "fail", "discovered_resources 表不存在")
        
        conn.close()

    def check_discovery_logs(self):
        """檢查發現日誌"""
        print("\n" + "="*60)
        print("📜 檢查發現日誌")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='discovery_logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM discovery_logs")
            total = cursor.fetchone()['total']
            
            # 獲取最近的日誌
            cursor.execute("""
                SELECT * FROM discovery_logs
                ORDER BY created_at DESC
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            print(f"\n發現日誌總數: {total}")
            if recent:
                print("\n最近日誌:")
                for r in recent:
                    r_dict = dict(r)
                    action = r_dict.get('action', r_dict.get('log_type', '未知'))
                    message = str(r_dict.get('message', r_dict.get('details', '')))[:50]
                    created = r_dict.get('created_at', '')
                    print(f"  [{action}] {message}... ({created})")
            
            self.add_check("發現日誌", "pass", f"共 {total} 條日誌")
            self.report["summary"]["discovery_logs_count"] = total
        else:
            self.add_check("發現日誌", "warning", "discovery_logs 表不存在")
        
        conn.close()

    def check_extracted_members(self):
        """檢查提取的成員"""
        print("\n" + "="*60)
        print("👥 檢查提取的成員")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='extracted_members'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM extracted_members")
            total = cursor.fetchone()['total']
            
            # 按來源群組統計
            cursor.execute("""
                SELECT source_chat_title, COUNT(*) as count
                FROM extracted_members
                WHERE source_chat_title IS NOT NULL AND source_chat_title != ''
                GROUP BY source_chat_title
                ORDER BY count DESC
                LIMIT 5
            """)
            source_stats = cursor.fetchall()
            
            print(f"\n提取成員總數: {total}")
            if source_stats:
                print("\n按來源群組:")
                for s in source_stats:
                    s_dict = dict(s)
                    title = s_dict.get('source_chat_title', '未知')[:30]
                    count = s_dict.get('count', 0)
                    print(f"  {title}: {count} 人")
            
            # 按價值等級統計
            cursor.execute("""
                SELECT value_level, COUNT(*) as count
                FROM extracted_members
                GROUP BY value_level
                ORDER BY count DESC
            """)
            value_stats = cursor.fetchall()
            
            if value_stats:
                print("\n按價值等級:")
                for v in value_stats:
                    v_dict = dict(v)
                    level = v_dict.get('value_level', '未分類')
                    count = v_dict.get('count', 0)
                    print(f"  {level}級: {count} 人")
            
            # 按聯繫狀態統計
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) as contacted,
                    SUM(CASE WHEN contacted = 0 THEN 1 ELSE 0 END) as not_contacted
                FROM extracted_members
            """)
            contact_stats = cursor.fetchone()
            
            if contact_stats:
                c_dict = dict(contact_stats)
                contacted = c_dict.get('contacted', 0) or 0
                not_contacted = c_dict.get('not_contacted', 0) or 0
                print(f"\n聯繫狀態:")
                print(f"  已聯繫: {contacted} 人")
                print(f"  未聯繫: {not_contacted} 人")
            
            self.add_check("提取成員", "pass", f"共 {total} 人")
            self.report["summary"]["extracted_members_count"] = total
        else:
            self.add_check("提取成員", "fail", "extracted_members 表不存在")
        
        conn.close()

    def check_member_extraction_logs(self):
        """檢查成員提取日誌"""
        print("\n" + "="*60)
        print("📋 檢查成員提取日誌")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='member_extraction_logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM member_extraction_logs")
            total = cursor.fetchone()['total']
            
            cursor.execute("""
                SELECT * FROM member_extraction_logs
                ORDER BY created_at DESC
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            print(f"\n提取日誌總數: {total}")
            if recent:
                print("\n最近提取:")
                for r in recent:
                    r_dict = dict(r)
                    source = r_dict.get('source_chat_title', r_dict.get('source_chat_id', '未知'))[:20]
                    count = r_dict.get('extracted_count', r_dict.get('member_count', 0))
                    created = r_dict.get('created_at', '')
                    print(f"  {source}: 提取 {count} 人 ({created})")
            
            self.add_check("提取日誌", "pass", f"共 {total} 條日誌")
            self.report["summary"]["extraction_logs_count"] = total
        else:
            self.add_check("提取日誌", "warning", "member_extraction_logs 表不存在")
        
        conn.close()

    def check_user_tags(self):
        """檢查用戶標籤"""
        print("\n" + "="*60)
        print("🏷️ 檢查用戶標籤")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查標籤定義表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tag_definitions'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM tag_definitions ORDER BY created_at DESC")
            definitions = cursor.fetchall()
            
            print(f"\n標籤定義 ({len(definitions)}個):")
            for d in definitions:
                d_dict = dict(d)
                tag = d_dict.get('tag', d_dict.get('name', '未知'))
                color = d_dict.get('color', '#888')
                print(f"  {tag} ({color})")
            
            self.add_check("標籤定義", "pass", f"共 {len(definitions)} 個標籤")
            self.report["summary"]["tag_definitions_count"] = len(definitions)
        else:
            self.add_check("標籤定義", "warning", "tag_definitions 表不存在")
        
        # 檢查用戶標籤表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_tags'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM user_tags")
            total = cursor.fetchone()['total']
            
            # 按標籤統計
            cursor.execute("""
                SELECT tag, COUNT(*) as count
                FROM user_tags
                GROUP BY tag
                ORDER BY count DESC
                LIMIT 10
            """)
            tag_stats = cursor.fetchall()
            
            print(f"\n用戶標籤關聯: {total} 條")
            if tag_stats:
                print("\n熱門標籤:")
                for t in tag_stats:
                    t_dict = dict(t)
                    tag = t_dict.get('tag', '未知')
                    count = t_dict.get('count', 0)
                    print(f"  {tag}: {count} 人")
            
            self.add_check("用戶標籤", "pass", f"共 {total} 條關聯")
            self.report["summary"]["user_tags_count"] = total
        else:
            self.add_check("用戶標籤", "warning", "user_tags 表不存在")
        
        conn.close()

    def check_custom_search_channels(self):
        """檢查自定義搜索渠道"""
        print("\n" + "="*60)
        print("🔎 檢查自定義搜索渠道")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_search_channels'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM custom_search_channels ORDER BY priority")
            channels = cursor.fetchall()
            
            print(f"\n搜索渠道 ({len(channels)}個):")
            for c in channels:
                c_dict = dict(c)
                name = c_dict.get('display_name', c_dict.get('bot_username', '未知'))
                enabled = "✅" if c_dict.get('enabled', 1) else "❌"
                status = c_dict.get('status', 'unknown')
                print(f"  {enabled} {name} ({status})")
            
            self.add_check("搜索渠道", "pass" if len(channels) > 0 else "warning",
                          f"共 {len(channels)} 個渠道")
            self.report["summary"]["search_channels_count"] = len(channels)
        else:
            self.add_check("搜索渠道", "warning", "custom_search_channels 表不存在")
        
        conn.close()

    def check_channel_discussions(self):
        """檢查頻道討論區"""
        print("\n" + "="*60)
        print("💬 檢查頻道討論區")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 檢查 channel_discussions 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_discussions'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM channel_discussions")
            total = cursor.fetchone()['total']
            
            print(f"\n頻道討論區: {total} 個")
            self.add_check("頻道討論區", "pass", f"共 {total} 個")
            self.report["summary"]["channel_discussions_count"] = total
        else:
            self.add_check("頻道討論區", "warning", "channel_discussions 表不存在")
        
        # 檢查 discussion_messages 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='discussion_messages'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM discussion_messages")
            total = cursor.fetchone()['total']
            
            print(f"討論消息: {total} 條")
            self.add_check("討論消息", "pass", f"共 {total} 條")
            self.report["summary"]["discussion_messages_count"] = total
        
        conn.close()

    def check_marketing_campaigns(self):
        """檢查營銷活動"""
        print("\n" + "="*60)
        print("📢 檢查營銷活動")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='marketing_campaigns'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM marketing_campaigns")
            total = cursor.fetchone()['total']
            
            cursor.execute("SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT 5")
            campaigns = cursor.fetchall()
            
            print(f"\n營銷活動: {total} 個")
            if campaigns:
                print("\n最近活動:")
                for c in campaigns:
                    c_dict = dict(c)
                    name = c_dict.get('name', '未命名')
                    status = c_dict.get('status', '未知')
                    print(f"  {name}: {status}")
            
            self.add_check("營銷活動", "pass" if total > 0 else "warning", f"共 {total} 個活動")
            self.report["summary"]["marketing_campaigns_count"] = total
        else:
            self.add_check("營銷活動", "warning", "marketing_campaigns 表不存在")
        
        conn.close()

    def check_logs(self):
        """檢查系統日誌"""
        print("\n" + "="*60)
        print("📝 檢查系統日誌")
        print("="*60)
        
        conn = sqlite3.connect(SERVER_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'")
        if cursor.fetchone():
            cursor.execute("SELECT COUNT(*) as total FROM logs")
            total = cursor.fetchone()['total']
            
            # 按類型統計
            cursor.execute("""
                SELECT type, COUNT(*) as count
                FROM logs
                GROUP BY type
                ORDER BY count DESC
            """)
            type_stats = cursor.fetchall()
            
            print(f"\n系統日誌: {total} 條")
            if type_stats:
                print("\n按類型:")
                for t in type_stats:
                    t_dict = dict(t)
                    log_type = t_dict.get('type', '未知')
                    count = t_dict.get('count', 0)
                    print(f"  {log_type}: {count} 條")
            
            self.add_check("系統日誌", "pass", f"共 {total} 條")
            self.report["summary"]["logs_count"] = total
        else:
            self.add_check("系統日誌", "warning", "logs 表不存在")
        
        conn.close()

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第五階段檢查報告總結")
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
        report_path = Path(__file__).parent / "phase5_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    def run(self):
        """執行所有檢查"""
        print("\n" + "="*60)
        print("🚀 開始第五階段：群組與資源功能測試")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # 檢查已發現的資源
        self.check_discovered_resources()
        
        # 檢查發現日誌
        self.check_discovery_logs()
        
        # 檢查提取的成員
        self.check_extracted_members()
        
        # 檢查提取日誌
        self.check_member_extraction_logs()
        
        # 檢查用戶標籤
        self.check_user_tags()
        
        # 檢查搜索渠道
        self.check_custom_search_channels()
        
        # 檢查頻道討論區
        self.check_channel_discussions()
        
        # 檢查營銷活動
        self.check_marketing_campaigns()
        
        # 檢查系統日誌
        self.check_logs()
        
        # 生成報告
        return self.generate_report()


if __name__ == "__main__":
    checker = ResourceChecker()
    report = checker.run()
    
    # 返回狀態碼
    failed = sum(1 for c in report["checks"] if c["status"] == "fail")
    sys.exit(1 if failed > 2 else 0)

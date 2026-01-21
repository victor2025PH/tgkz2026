"""
第二階段：遠程 API 對接測試
檢查本地應用與遠程服務器（tgkz.usdt2026.cc）的連接
"""

import asyncio
import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime

# 嘗試導入 HTTP 客戶端
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

# 數據庫路徑
ACCOUNTS_DB_PATH = Path(__file__).parent.parent / "data" / "tgmatrix.db"
SERVER_DB_PATH = Path(__file__).parent.parent / "data" / "tgai_server.db"

# 遠程服務器 URL（從截圖中獲取）
REMOTE_API_URL = "https://tgkz.usdt2026.cc"


class RemoteAPIChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第二階段：帳號管理與遠程 API 對接測試",
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

    def check_accounts_status(self):
        """檢查本地帳號狀態"""
        print("\n" + "="*60)
        print("👤 檢查本地 Telegram 帳號狀態")
        print("="*60)
        
        conn = sqlite3.connect(ACCOUNTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT phone, status, healthScore, nickname, telegramId,
                   proxyHost, proxyPort, proxyType, aiEnabled, warmupStatus
            FROM accounts
            ORDER BY created_at DESC
        """)
        accounts = cursor.fetchall()
        
        print(f"\n帳號列表 ({len(accounts)}個):")
        online_count = 0
        healthy_count = 0
        proxy_configured = 0
        ai_enabled = 0
        
        for acc in accounts:
            is_online = acc['status'] == 'Online'
            health = acc['healthScore'] or 0
            has_proxy = bool(acc['proxyHost'])
            has_ai = bool(acc['aiEnabled'])
            
            status_icon = "✅" if is_online else "❌"
            health_icon = "💚" if health >= 80 else "💛" if health >= 50 else "❤️"
            proxy_icon = "🌐" if has_proxy else "📵"
            ai_icon = "🤖" if has_ai else "👤"
            
            print(f"  {acc['phone']}")
            print(f"    狀態: {status_icon} {acc['status']} | 健康: {health_icon} {health}%")
            print(f"    代理: {proxy_icon} {acc['proxyType'] or '無'} | AI: {ai_icon} {'啟用' if has_ai else '關閉'}")
            print(f"    TG ID: {acc['telegramId']} | 暖號: {acc['warmupStatus'] or '無'}")
            print()
            
            if is_online:
                online_count += 1
            if health >= 80:
                healthy_count += 1
            if has_proxy:
                proxy_configured += 1
            if has_ai:
                ai_enabled += 1
        
        self.add_check("帳號在線狀態", 
                      "pass" if online_count == len(accounts) else "warning",
                      f"{online_count}/{len(accounts)} 在線")
        
        self.add_check("帳號健康狀態", 
                      "pass" if healthy_count == len(accounts) else "warning",
                      f"{healthy_count}/{len(accounts)} 健康")
        
        self.report["summary"]["total_accounts"] = len(accounts)
        self.report["summary"]["online_accounts"] = online_count
        self.report["summary"]["healthy_accounts"] = healthy_count
        self.report["summary"]["proxy_configured"] = proxy_configured
        self.report["summary"]["ai_enabled"] = ai_enabled
        
        conn.close()

    def check_session_files(self):
        """檢查 Session 文件"""
        print("\n" + "="*60)
        print("📁 檢查 Session 文件")
        print("="*60)
        
        sessions_dir = Path(__file__).parent.parent / "sessions"
        data_sessions = Path(__file__).parent.parent / "data" / "sessions"
        
        session_paths = [sessions_dir, data_sessions]
        total_sessions = 0
        
        for path in session_paths:
            if path.exists():
                sessions = list(path.glob("*.session"))
                print(f"\n{path}:")
                for session in sessions:
                    size_kb = session.stat().st_size / 1024
                    print(f"  📄 {session.name} ({size_kb:.1f} KB)")
                total_sessions += len(sessions)
            else:
                print(f"\n{path}: 目錄不存在")
        
        self.add_check("Session 文件", 
                      "pass" if total_sessions > 0 else "warning",
                      f"找到 {total_sessions} 個 session 文件")
        
        self.report["summary"]["session_files"] = total_sessions

    def check_database_methods(self):
        """檢查數據庫操作方法"""
        print("\n" + "="*60)
        print("🔧 檢查數據庫操作方法")
        print("="*60)
        
        # 檢查 tgmatrix.db 中的 chat_history 表
        conn = sqlite3.connect(ACCOUNTS_DB_PATH)
        cursor = conn.cursor()
        
        # 檢查必要的表
        required_tables = ['accounts', 'chat_history']
        missing_tables = []
        
        for table in required_tables:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cursor.fetchone():
                missing_tables.append(table)
        
        if missing_tables:
            self.add_check("必要數據表", "fail", f"缺失: {missing_tables}")
        else:
            self.add_check("必要數據表", "pass", f"所有表都存在: {required_tables}")
        
        # 測試 chat_history 表插入
        try:
            cursor.execute("""
                INSERT INTO chat_history (user_id, role, content, account_phone)
                VALUES ('test_user_123', 'user', '這是測試消息', '+1234567890')
            """)
            conn.commit()
            
            # 查詢驗證
            cursor.execute("SELECT * FROM chat_history WHERE user_id = 'test_user_123'")
            row = cursor.fetchone()
            
            if row:
                self.add_check("chat_history 插入測試", "pass", "成功插入測試記錄")
                
                # 清理測試數據
                cursor.execute("DELETE FROM chat_history WHERE user_id = 'test_user_123'")
                conn.commit()
            else:
                self.add_check("chat_history 插入測試", "fail", "插入後無法查詢到記錄")
        except Exception as e:
            self.add_check("chat_history 插入測試", "fail", str(e))
        
        conn.close()

    async def check_remote_api(self):
        """檢查遠程 API 連接"""
        print("\n" + "="*60)
        print("🌐 檢查遠程 API 連接")
        print("="*60)
        
        if not HAS_AIOHTTP and not HAS_HTTPX:
            self.add_warning("未安裝 aiohttp 或 httpx，跳過遠程 API 測試")
            return
        
        endpoints_to_check = [
            ("/", "首頁"),
            ("/api/health", "健康檢查"),
            ("/admin", "管理後台"),
        ]
        
        for endpoint, name in endpoints_to_check:
            url = f"{REMOTE_API_URL}{endpoint}"
            try:
                if HAS_AIOHTTP:
                    timeout = aiohttp.ClientTimeout(total=10)
                    async with aiohttp.ClientSession(timeout=timeout) as session:
                        async with session.get(url, ssl=False) as response:
                            status = response.status
                            self.add_check(f"遠程 API: {name}", 
                                          "pass" if status in [200, 302, 301] else "warning",
                                          f"狀態碼: {status}")
                elif HAS_HTTPX:
                    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                        response = await client.get(url)
                        status = response.status_code
                        self.add_check(f"遠程 API: {name}", 
                                      "pass" if status in [200, 302, 301] else "warning",
                                      f"狀態碼: {status}")
            except Exception as e:
                self.add_check(f"遠程 API: {name}", "fail", str(e)[:100])

    def check_license_api_config(self):
        """檢查卡密 API 配置"""
        print("\n" + "="*60)
        print("🔑 檢查卡密 API 配置")
        print("="*60)
        
        # 查找前端中的 API 配置
        src_dir = Path(__file__).parent.parent.parent / "src"
        
        config_files = [
            "license-client.service.ts",
            "membership.service.ts",
            "auth.service.ts"
        ]
        
        api_urls_found = []
        
        for config_file in config_files:
            file_path = src_dir / config_file
            if file_path.exists():
                try:
                    content = file_path.read_text(encoding='utf-8')
                    
                    # 搜索 API URL 配置
                    import re
                    urls = re.findall(r'https?://[^\s\'"]+', content)
                    for url in urls:
                        if 'tgkz' in url or 'usdt2026' in url or 'api' in url:
                            api_urls_found.append((config_file, url))
                    
                    print(f"  📄 {config_file}: 已檢查")
                except Exception as e:
                    print(f"  ❌ {config_file}: 讀取失敗 - {e}")
            else:
                print(f"  ⚠️ {config_file}: 文件不存在")
        
        if api_urls_found:
            print("\n發現的 API URL:")
            for file, url in api_urls_found:
                print(f"  {file}: {url}")
            self.add_check("API URL 配置", "pass", f"找到 {len(api_urls_found)} 個 API URL")
        else:
            self.add_check("API URL 配置", "warning", "未找到明確的 API URL 配置")
        
        self.report["summary"]["api_urls_found"] = len(api_urls_found)

    def check_electron_backend_integration(self):
        """檢查 Electron 與後端的集成"""
        print("\n" + "="*60)
        print("🔌 檢查 Electron-Backend 集成")
        print("="*60)
        
        # 檢查 electron.js
        electron_file = Path(__file__).parent.parent.parent / "electron.js"
        preload_file = Path(__file__).parent.parent.parent / "preload.js"
        
        if electron_file.exists():
            content = electron_file.read_text(encoding='utf-8')
            
            # 檢查關鍵配置
            checks = [
                ("後端進程啟動", "spawn" in content or "fork" in content),
                ("IPC 通信", "ipcMain" in content),
                ("主窗口創建", "BrowserWindow" in content),
            ]
            
            for check_name, result in checks:
                self.add_check(f"Electron: {check_name}", 
                              "pass" if result else "warning",
                              "已配置" if result else "未找到配置")
        else:
            self.add_check("Electron 主文件", "fail", "electron.js 不存在")
        
        if preload_file.exists():
            self.add_check("Preload 腳本", "pass", "preload.js 存在")
        else:
            self.add_check("Preload 腳本", "warning", "preload.js 不存在")

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第二階段檢查報告總結")
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
        report_path = Path(__file__).parent / "phase2_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    async def run(self):
        """執行所有檢查"""
        print("\n" + "="*60)
        print("🚀 開始第二階段：帳號管理與遠程 API 對接測試")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # 檢查帳號狀態
        self.check_accounts_status()
        
        # 檢查 Session 文件
        self.check_session_files()
        
        # 檢查數據庫方法
        self.check_database_methods()
        
        # 檢查遠程 API
        await self.check_remote_api()
        
        # 檢查卡密 API 配置
        self.check_license_api_config()
        
        # 檢查 Electron 集成
        self.check_electron_backend_integration()
        
        # 生成報告
        return self.generate_report()


if __name__ == "__main__":
    checker = RemoteAPIChecker()
    report = asyncio.run(checker.run())
    
    # 返回狀態碼
    if report["errors"]:
        sys.exit(1)
    sys.exit(0)

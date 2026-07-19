#!/usr/bin/env python3
"""
全系統測試腳本
Full System Test Script

執行所有測試並生成綜合報告
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Any

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class FullSystemTest:
    """全系統測試"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.results = {
            'test_time': self.start_time.isoformat(),
            'system_info': {},
            'database_test': {},
            'ipc_test': {},
            'frontend_check': {},
            'summary': {}
        }
        
    def check_system_info(self):
        """檢查系統信息"""
        print("\n📋 系統信息檢查...")
        
        import platform
        
        # 🔧 改由 config.py 統一解析（原硬編碼的 'tg_bot.db' 檔名已不存在，是歷史殘留錯誤路徑）
        try:
            from config import DATABASE_PATH
            database_path = str(DATABASE_PATH)
        except ImportError:
            database_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tgmatrix.db')

        self.results['system_info'] = {
            'platform': platform.system(),
            'platform_version': platform.version(),
            'python_version': platform.python_version(),
            'working_directory': os.getcwd(),
            'database_path': database_path
        }
        
        # 檢查數據庫文件
        db_exists = os.path.exists(self.results['system_info']['database_path'])
        self.results['system_info']['database_exists'] = db_exists
        
        if db_exists:
            db_size = os.path.getsize(self.results['system_info']['database_path'])
            self.results['system_info']['database_size_mb'] = round(db_size / 1024 / 1024, 2)
        
        print(f"   平台: {self.results['system_info']['platform']}")
        print(f"   Python: {self.results['system_info']['python_version']}")
        print(f"   數據庫: {'存在' if db_exists else '不存在'}")
        if db_exists:
            print(f"   數據庫大小: {self.results['system_info']['database_size_mb']} MB")
    
    def run_database_test(self):
        """執行數據庫測試"""
        print("\n🔬 執行數據庫完整性測試...")
        
        try:
            from test_database_integrity import DatabaseIntegrityTest
            
            tester = DatabaseIntegrityTest()
            db_results = tester.run_all_tests()
            
            self.results['database_test'] = {
                'status': db_results['summary'].get('status', 'ERROR'),
                'tables_checked': db_results['summary'].get('tables_checked', 0),
                'issues_count': db_results['summary'].get('issues_count', 0),
                'issues': db_results.get('issues', []),
                'tables': {}
            }
            
            # 簡化表信息
            for table_name, table_data in db_results.get('tables', {}).items():
                self.results['database_test']['tables'][table_name] = {
                    'status': table_data.get('status', 'unknown'),
                    'record_count': table_data.get('details', {}).get('record_count', 0)
                }
                
        except Exception as e:
            self.results['database_test'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print(f"   ❌ 數據庫測試失敗: {e}")
    
    async def run_ipc_test(self):
        """執行 IPC 測試"""
        print("\n🔬 執行 IPC 命令測試...")
        
        try:
            from test_ipc_commands import IPCCommandTester
            
            tester = IPCCommandTester()
            ipc_results = await tester.run_all_tests()
            
            self.results['ipc_test'] = {
                'status': 'PASS' if ipc_results['summary']['pass_rate'] >= 80 else 'WARNING',
                'total_tests': ipc_results['summary']['total_tests'],
                'passed': ipc_results['summary']['passed'],
                'failed': ipc_results['summary']['failed'],
                'errors': ipc_results['summary']['errors'],
                'pass_rate': ipc_results['summary']['pass_rate'],
                'modules': {}
            }
            
            # 簡化模塊信息
            for module_name, module_data in ipc_results.get('modules', {}).items():
                self.results['ipc_test']['modules'][module_name] = {
                    'passed': module_data.get('passed', 0),
                    'failed': module_data.get('failed', 0) + module_data.get('errors', 0)
                }
                
        except Exception as e:
            self.results['ipc_test'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print(f"   ❌ IPC 測試失敗: {e}")
    
    def check_frontend_files(self):
        """檢查前端文件"""
        print("\n📁 檢查前端文件...")
        
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        
        required_files = [
            'src/app.component.ts',
            'src/app.component.html',
            'src/models.ts',
            'src/i18n.service.ts',
            'src/multi-role/multi-role-center.component.ts',
            'src/multi-role/preset-roles.ts',
            'src/multi-role/preset-scenarios.ts',
            'src/automation/automation-center.component.ts',
            'electron.js',
            'package.json'
        ]
        
        file_check = {}
        for file_path in required_files:
            full_path = os.path.join(project_root, file_path)
            exists = os.path.exists(full_path)
            file_check[file_path] = exists
            status = "✅" if exists else "❌"
            print(f"   {status} {file_path}")
        
        # 檢查構建文件
        dist_path = os.path.join(project_root, 'dist', 'index.html')
        build_exists = os.path.exists(dist_path)
        file_check['dist/index.html'] = build_exists
        print(f"   {'✅' if build_exists else '❌'} dist/index.html (構建文件)")
        
        self.results['frontend_check'] = {
            'files': file_check,
            'missing_count': len([f for f, exists in file_check.items() if not exists]),
            'build_exists': build_exists
        }
    
    def check_menu_modules(self):
        """檢查菜單模塊對應"""
        print("\n📋 檢查菜單模塊對應...")
        
        menu_modules = {
            '會員中心': {
                'frontend': 'membership',
                'backend_methods': ['check_license'],
                'database_tables': ['settings']
            },
            '儀表盤': {
                'frontend': 'dashboard',
                'backend_methods': ['get_initial_state', 'get_dashboard_stats'],
                'database_tables': ['accounts', 'extracted_members', 'logs']
            },
            '賬戶管理': {
                'frontend': 'accounts',
                'backend_methods': ['get_all_accounts', 'add_account', 'delete_account'],
                'database_tables': ['accounts']
            },
            '資源發現': {
                'frontend': 'discovery',
                'backend_methods': ['search_groups', 'join_group', 'get_groups'],
                'database_tables': ['groups']
            },
            '自動化中心': {
                'frontend': 'automation',
                'backend_methods': ['get_keyword_sets', 'get_monitored_groups', 'get_queue_status'],
                'database_tables': ['keyword_sets', 'keywords', 'monitored_groups', 'message_queue']
            },
            '潛在客戶': {
                'frontend': 'leads',
                'backend_methods': ['get_all_leads', 'delete_lead', 'update_lead_status'],
                'database_tables': ['extracted_members']
            },
            '客戶培育': {
                'frontend': 'nurturing',
                'backend_methods': ['get_nurturing_plans'],
                'database_tables': ['nurturing_plans', 'nurturing_steps']
            },
            '數據分析': {
                'frontend': 'analytics',
                'backend_methods': ['get_analytics_data', 'get_conversion_funnel'],
                'database_tables': ['extracted_members', 'campaigns', 'message_logs']
            },
            '分析中心': {
                'frontend': 'analysis-center',
                'backend_methods': ['get_ai_insights', 'get_account_health'],
                'database_tables': ['accounts', 'alerts']
            },
            '廣告發送': {
                'frontend': 'ads',
                'backend_methods': ['get_ad_templates', 'get_ad_schedules'],
                'database_tables': ['ad_templates', 'ad_schedules', 'ad_send_logs']
            },
            '用戶追蹤': {
                'frontend': 'tracking',
                'backend_methods': ['get_tracked_users'],
                'database_tables': ['tracked_users', 'user_tracking_logs']
            },
            '營銷活動': {
                'frontend': 'campaigns',
                'backend_methods': ['get_campaigns', 'execute_campaign'],
                'database_tables': ['campaigns', 'campaign_logs']
            },
            '多角色協作': {
                'frontend': 'multi-role',
                'backend_methods': ['get_multi_roles', 'get_scripts', 'start_collaboration'],
                'database_tables': ['multi_roles', 'scripts', 'collaboration_groups']
            },
            'AI 中心': {
                'frontend': 'ai-center',
                'backend_methods': ['get_ai_settings', 'detect_ollama'],
                'database_tables': ['ai_settings', 'knowledge_base']
            },
            '運行日誌': {
                'frontend': 'logs',
                'backend_methods': ['get_logs'],
                'database_tables': ['logs']
            },
            '設置': {
                'frontend': 'settings',
                'backend_methods': ['get_all_settings', 'save_settings'],
                'database_tables': ['settings']
            }
        }
        
        self.results['menu_modules'] = menu_modules
        
        # 檢查數據庫表是否存在
        try:
            from database import db
            # 🔧 改用合法連接模塊 core.db_utils，取代直接 sqlite3.connect()
            from core.db_utils import create_connection
            
            conn = create_connection(db.db_path)
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            module_status = {}
            for module_name, module_info in menu_modules.items():
                tables = module_info['database_tables']
                missing_tables = [t for t in tables if t not in existing_tables]
                
                if len(missing_tables) == 0:
                    status = '✅ 完整'
                elif len(missing_tables) < len(tables):
                    status = f'⚠️ 部分缺失: {", ".join(missing_tables)}'
                else:
                    status = '❌ 缺失'
                
                module_status[module_name] = {
                    'status': status,
                    'missing_tables': missing_tables
                }
                print(f"   {status.split()[0]} {module_name}")
            
            self.results['menu_modules_status'] = module_status
            
        except Exception as e:
            print(f"   ❌ 檢查失敗: {e}")
    
    def generate_summary(self):
        """生成測試摘要"""
        print("\n" + "=" * 60)
        print("📊 測試摘要")
        print("=" * 60)
        
        # 計算總體狀態
        db_status = self.results.get('database_test', {}).get('status', 'ERROR')
        ipc_status = self.results.get('ipc_test', {}).get('status', 'ERROR')
        frontend_missing = self.results.get('frontend_check', {}).get('missing_count', 0)
        
        overall_status = 'PASS'
        if db_status == 'ERROR' or ipc_status == 'ERROR':
            overall_status = 'ERROR'
        elif db_status == 'WARNING' or ipc_status == 'WARNING' or frontend_missing > 0:
            overall_status = 'WARNING'
        
        self.results['summary'] = {
            'overall_status': overall_status,
            'database_status': db_status,
            'ipc_status': ipc_status,
            'frontend_missing': frontend_missing,
            'total_time_seconds': (datetime.now() - self.start_time).total_seconds()
        }
        
        print(f"\n   整體狀態: {self.get_status_emoji(overall_status)} {overall_status}")
        print(f"   數據庫: {self.get_status_emoji(db_status)} {db_status}")
        print(f"   IPC 通信: {self.get_status_emoji(ipc_status)} {ipc_status}")
        print(f"   前端文件缺失: {frontend_missing}")
        print(f"   總耗時: {self.results['summary']['total_time_seconds']:.2f} 秒")
        
        # 輸出問題摘要
        issues = []
        
        # 數據庫問題
        db_issues = self.results.get('database_test', {}).get('issues', [])
        issues.extend(db_issues)
        
        # IPC 失敗
        ipc_modules = self.results.get('ipc_test', {}).get('modules', {})
        for module, data in ipc_modules.items():
            if data.get('failed', 0) > 0:
                issues.append(f"{module}: {data['failed']} 個 IPC 命令失敗")
        
        # 前端缺失
        frontend_files = self.results.get('frontend_check', {}).get('files', {})
        for file, exists in frontend_files.items():
            if not exists:
                issues.append(f"前端文件缺失: {file}")
        
        if issues:
            print(f"\n   ⚠️  發現 {len(issues)} 個問題:")
            for issue in issues[:10]:  # 最多顯示 10 個
                print(f"      - {issue}")
            if len(issues) > 10:
                print(f"      ... 還有 {len(issues) - 10} 個問題")
        else:
            print("\n   ✅ 未發現問題!")
        
        print("\n" + "=" * 60)
    
    def get_status_emoji(self, status: str) -> str:
        """獲取狀態表情"""
        return {
            'PASS': '✅',
            'WARNING': '⚠️',
            'ERROR': '❌'
        }.get(status, '❓')
    
    async def run_all_tests(self) -> Dict:
        """執行所有測試"""
        print("=" * 60)
        print("🔍 TG-AI智控王 全系統測試")
        print("=" * 60)
        print(f"⏰ 測試時間: {self.start_time.isoformat()}")
        
        # 1. 系統信息
        self.check_system_info()
        
        # 2. 前端文件檢查
        self.check_frontend_files()
        
        # 3. 菜單模塊對應
        self.check_menu_modules()
        
        # 4. 數據庫測試
        self.run_database_test()
        
        # 5. IPC 測試
        await self.run_ipc_test()
        
        # 6. 生成摘要
        self.generate_summary()
        
        return self.results
    
    def save_report(self, output_path: str = None):
        """保存測試報告"""
        if output_path is None:
            output_path = os.path.join(
                os.path.dirname(__file__),
                f"full_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 完整報告已保存: {output_path}")
        
        # 同時生成 HTML 報告
        html_path = output_path.replace('.json', '.html')
        self.generate_html_report(html_path)
        
        return output_path
    
    def generate_html_report(self, output_path: str):
        """生成 HTML 報告"""
        html_content = f"""
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TG-AI智控王 測試報告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ 
            text-align: center; 
            color: #00d9ff; 
            margin-bottom: 30px;
            font-size: 2.5rem;
        }}
        .card {{
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .card h2 {{
            color: #00d9ff;
            margin-bottom: 16px;
            font-size: 1.5rem;
        }}
        .status-pass {{ color: #4ade80; }}
        .status-warning {{ color: #fbbf24; }}
        .status-error {{ color: #f87171; }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }}
        .summary-item {{
            background: rgba(255,255,255,0.05);
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }}
        .summary-item .value {{
            font-size: 2rem;
            font-weight: bold;
            color: #00d9ff;
        }}
        .summary-item .label {{
            color: #888;
            font-size: 0.9rem;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        th {{ color: #00d9ff; }}
        .issue-list {{
            list-style: none;
        }}
        .issue-list li {{
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }}
        .issue-list li:before {{
            content: "⚠️ ";
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 TG-AI智控王 測試報告</h1>
        
        <div class="card">
            <h2>📊 測試摘要</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="value {self.get_status_class(self.results.get('summary', {}).get('overall_status', 'ERROR'))}">
                        {self.results.get('summary', {}).get('overall_status', 'N/A')}
                    </div>
                    <div class="label">整體狀態</div>
                </div>
                <div class="summary-item">
                    <div class="value">{self.results.get('database_test', {}).get('tables_checked', 0)}</div>
                    <div class="label">數據庫表檢查</div>
                </div>
                <div class="summary-item">
                    <div class="value">{self.results.get('ipc_test', {}).get('pass_rate', 0)}%</div>
                    <div class="label">IPC 測試通過率</div>
                </div>
                <div class="summary-item">
                    <div class="value">{self.results.get('summary', {}).get('total_time_seconds', 0):.1f}s</div>
                    <div class="label">總耗時</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>🗄️ 數據庫測試</h2>
            <table>
                <tr>
                    <th>表名</th>
                    <th>狀態</th>
                    <th>記錄數</th>
                </tr>
                {self.generate_table_rows()}
            </table>
        </div>
        
        <div class="card">
            <h2>🔌 IPC 命令測試</h2>
            <table>
                <tr>
                    <th>模塊</th>
                    <th>通過</th>
                    <th>失敗</th>
                </tr>
                {self.generate_ipc_rows()}
            </table>
        </div>
        
        <div class="card">
            <h2>⚠️ 發現的問題</h2>
            <ul class="issue-list">
                {self.generate_issues_list()}
            </ul>
        </div>
        
        <p style="text-align: center; color: #666; margin-top: 40px;">
            生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </p>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"📄 HTML 報告已保存: {output_path}")
    
    def get_status_class(self, status: str) -> str:
        return {
            'PASS': 'status-pass',
            'WARNING': 'status-warning',
            'ERROR': 'status-error'
        }.get(status, '')
    
    def generate_table_rows(self) -> str:
        rows = []
        tables = self.results.get('database_test', {}).get('tables', {})
        for name, data in tables.items():
            status = data.get('status', 'unknown')
            count = data.get('record_count', 0)
            status_class = self.get_status_class('PASS' if status == 'ok' else 'WARNING')
            rows.append(f"<tr><td>{name}</td><td class='{status_class}'>{status}</td><td>{count}</td></tr>")
        return '\n'.join(rows) if rows else '<tr><td colspan="3">無數據</td></tr>'
    
    def generate_ipc_rows(self) -> str:
        rows = []
        modules = self.results.get('ipc_test', {}).get('modules', {})
        for name, data in modules.items():
            passed = data.get('passed', 0)
            failed = data.get('failed', 0)
            status_class = self.get_status_class('PASS' if failed == 0 else 'WARNING')
            rows.append(f"<tr><td>{name}</td><td class='status-pass'>{passed}</td><td class='{status_class}'>{failed}</td></tr>")
        return '\n'.join(rows) if rows else '<tr><td colspan="3">無數據</td></tr>'
    
    def generate_issues_list(self) -> str:
        issues = self.results.get('database_test', {}).get('issues', [])
        if not issues:
            return '<li style="color: #4ade80;">✅ 未發現問題</li>'
        return '\n'.join([f'<li>{issue}</li>' for issue in issues])


async def main():
    tester = FullSystemTest()
    results = await tester.run_all_tests()
    tester.save_report()


if __name__ == '__main__':
    asyncio.run(main())

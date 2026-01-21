#!/usr/bin/env python3
"""
IPC 命令測試腳本
IPC Command Test Script

驗證所有前後端 IPC 通信命令
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class IPCTestResult:
    """IPC 測試結果"""
    command: str
    status: str  # 'pass', 'fail', 'skip', 'error'
    message: str
    response_time_ms: float = 0
    response_data: Any = None
    error: str = None

@dataclass
class ModuleTestResult:
    """模塊測試結果"""
    module_name: str
    tests: List[IPCTestResult] = field(default_factory=list)
    
    @property
    def passed(self) -> int:
        return len([t for t in self.tests if t.status == 'pass'])
    
    @property
    def failed(self) -> int:
        return len([t for t in self.tests if t.status == 'fail'])
    
    @property
    def errors(self) -> int:
        return len([t for t in self.tests if t.status == 'error'])


class IPCCommandTester:
    """IPC 命令測試器"""
    
    def __init__(self):
        self.results: Dict[str, ModuleTestResult] = {}
        self.db = None
        self.backend_service = None
        
    async def initialize(self):
        """初始化測試環境"""
        try:
            from database import db
            self.db = db
            print("✅ 數據庫連接成功")
            
            # 嘗試導入後端服務（可能需要完整環境）
            try:
                from main import BackendService
                self.backend_service = BackendService()
                print("✅ 後端服務初始化成功")
            except Exception as e:
                print(f"⚠️  後端服務初始化失敗（將使用模擬測試）: {e}")
                
        except Exception as e:
            print(f"❌ 初始化失敗: {e}")
            raise
    
    def add_result(self, module: str, result: IPCTestResult):
        """添加測試結果"""
        if module not in self.results:
            self.results[module] = ModuleTestResult(module_name=module)
        self.results[module].tests.append(result)
    
    async def test_database_method(self, module: str, command: str, 
                                   method_name: str, args: tuple = (), 
                                   kwargs: dict = None) -> IPCTestResult:
        """測試數據庫方法"""
        if kwargs is None:
            kwargs = {}
            
        start_time = datetime.now()
        try:
            method = getattr(self.db, method_name, None)
            if method is None:
                return IPCTestResult(
                    command=command,
                    status='error',
                    message=f"數據庫方法不存在: {method_name}",
                    error=f"AttributeError: Database has no attribute '{method_name}'"
                )
            
            # 執行方法
            if asyncio.iscoroutinefunction(method):
                result = await method(*args, **kwargs)
            else:
                result = method(*args, **kwargs)
            
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            
            return IPCTestResult(
                command=command,
                status='pass',
                message=f"成功調用 {method_name}",
                response_time_ms=elapsed,
                response_data=self._summarize_data(result)
            )
            
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            return IPCTestResult(
                command=command,
                status='error',
                message=f"調用 {method_name} 失敗",
                response_time_ms=elapsed,
                error=str(e)
            )
    
    def _summarize_data(self, data: Any) -> Any:
        """摘要數據（避免過大）"""
        if data is None:
            return None
        if isinstance(data, (str, int, float, bool)):
            return data
        if isinstance(data, list):
            return f"List[{len(data)} items]"
        if isinstance(data, dict):
            return f"Dict[{len(data)} keys]"
        return str(type(data).__name__)
    
    # ============ 賬戶管理測試 ============
    async def test_account_management(self):
        """測試賬戶管理模塊"""
        module = "賬戶管理"
        print(f"\n🔍 測試 {module}...")
        
        # get-accounts
        result = await self.test_database_method(
            module, 'get-accounts', 'get_all_accounts'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-accounts: {result.message}")
        
        # get-account-stats (模擬)
        result = await self.test_database_method(
            module, 'get-account-stats', 'get_all_accounts_with_stats'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-account-stats: {result.message}")
    
    # ============ 潛在客戶測試 ============
    async def test_lead_management(self):
        """測試潛在客戶模塊"""
        module = "潛在客戶"
        print(f"\n🔍 測試 {module}...")
        
        # get-leads
        result = await self.test_database_method(
            module, 'get-leads', 'get_all_leads'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-leads: {result.message}")
        
        # get-leads-with-total
        result = await self.test_database_method(
            module, 'get-leads-with-total', 'get_leads_with_total'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-leads-with-total: {result.message}")
        
        # get-detailed-funnel-stats
        result = await self.test_database_method(
            module, 'get-detailed-funnel-stats', 'get_detailed_funnel_stats'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-detailed-funnel-stats: {result.message}")
    
    # ============ 自動化中心測試 ============
    async def test_automation_center(self):
        """測試自動化中心模塊"""
        module = "自動化中心"
        print(f"\n🔍 測試 {module}...")
        
        # get-keyword-sets
        result = await self.test_database_method(
            module, 'get-keyword-sets', 'get_keyword_sets'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-keyword-sets: {result.message}")
        
        # get-monitored-groups
        result = await self.test_database_method(
            module, 'get-monitored-groups', 'get_monitored_groups'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-monitored-groups: {result.message}")
        
        # get-message-templates
        result = await self.test_database_method(
            module, 'get-message-templates', 'get_message_templates'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-message-templates: {result.message}")
        
        # get-trigger-action-logs
        result = await self.test_database_method(
            module, 'get-trigger-action-logs', 'get_trigger_action_logs'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-trigger-action-logs: {result.message}")
    
    # ============ 營銷活動測試 ============
    async def test_campaigns(self):
        """測試營銷活動模塊"""
        module = "營銷活動"
        print(f"\n🔍 測試 {module}...")
        
        # get-campaigns
        result = await self.test_database_method(
            module, 'get-campaigns', 'get_campaigns'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-campaigns: {result.message}")
        
        # get-campaign-logs
        result = await self.test_database_method(
            module, 'get-campaign-logs', 'get_campaign_logs'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-campaign-logs: {result.message}")
    
    # ============ 廣告發送測試 ============
    async def test_ad_sending(self):
        """測試廣告發送模塊"""
        module = "廣告發送"
        print(f"\n🔍 測試 {module}...")
        
        # get-ad-templates
        result = await self.test_database_method(
            module, 'get-ad-templates', 'get_ad_templates'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-ad-templates: {result.message}")
        
        # get-ad-schedules
        result = await self.test_database_method(
            module, 'get-ad-schedules', 'get_ad_schedules'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-ad-schedules: {result.message}")
    
    # ============ 用戶追蹤測試 ============
    async def test_user_tracking(self):
        """測試用戶追蹤模塊"""
        module = "用戶追蹤"
        print(f"\n🔍 測試 {module}...")
        
        # get-tracked-users
        result = await self.test_database_method(
            module, 'get-tracked-users', 'get_tracked_users'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-tracked-users: {result.message}")
    
    # ============ 資源發現測試 ============
    async def test_resource_discovery(self):
        """測試資源發現模塊"""
        module = "資源發現"
        print(f"\n🔍 測試 {module}...")
        
        # get-groups
        result = await self.test_database_method(
            module, 'get-groups', 'get_groups'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-groups: {result.message}")
    
    # ============ 設置測試 ============
    async def test_settings(self):
        """測試設置模塊"""
        module = "設置"
        print(f"\n🔍 測試 {module}...")
        
        # get-settings
        result = await self.test_database_method(
            module, 'get-settings', 'get_all_settings'
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-settings: {result.message}")
    
    # ============ 日誌測試 ============
    async def test_logs(self):
        """測試日誌模塊"""
        module = "運行日誌"
        print(f"\n🔍 測試 {module}...")
        
        # get-logs
        result = await self.test_database_method(
            module, 'get-logs', 'get_logs', kwargs={'limit': 100}
        )
        self.add_result(module, result)
        print(f"   {'✅' if result.status == 'pass' else '❌'} get-logs: {result.message}")
    
    async def run_all_tests(self) -> Dict:
        """執行所有測試"""
        print("=" * 60)
        print("🔍 TG-AI智控王 IPC 命令測試")
        print("=" * 60)
        print(f"⏰ 測試時間: {datetime.now().isoformat()}")
        print("-" * 60)
        
        await self.initialize()
        
        # 執行所有模塊測試
        await self.test_account_management()
        await self.test_lead_management()
        await self.test_automation_center()
        await self.test_campaigns()
        await self.test_ad_sending()
        await self.test_user_tracking()
        await self.test_resource_discovery()
        await self.test_settings()
        await self.test_logs()
        
        # 生成報告
        return self.generate_report()
    
    def generate_report(self) -> Dict:
        """生成測試報告"""
        report = {
            'test_time': datetime.now().isoformat(),
            'modules': {},
            'summary': {
                'total_tests': 0,
                'passed': 0,
                'failed': 0,
                'errors': 0,
                'pass_rate': 0
            }
        }
        
        print("\n" + "=" * 60)
        print("📊 測試報告")
        print("=" * 60)
        
        for module_name, module_result in self.results.items():
            report['modules'][module_name] = {
                'passed': module_result.passed,
                'failed': module_result.failed,
                'errors': module_result.errors,
                'tests': []
            }
            
            for test in module_result.tests:
                report['modules'][module_name]['tests'].append({
                    'command': test.command,
                    'status': test.status,
                    'message': test.message,
                    'response_time_ms': test.response_time_ms,
                    'error': test.error
                })
            
            report['summary']['total_tests'] += len(module_result.tests)
            report['summary']['passed'] += module_result.passed
            report['summary']['failed'] += module_result.failed
            report['summary']['errors'] += module_result.errors
            
            status_emoji = "✅" if module_result.failed == 0 and module_result.errors == 0 else "⚠️"
            print(f"{status_emoji} {module_name}: {module_result.passed}/{len(module_result.tests)} 通過")
        
        total = report['summary']['total_tests']
        if total > 0:
            report['summary']['pass_rate'] = round(report['summary']['passed'] / total * 100, 1)
        
        print("-" * 60)
        print(f"📈 總計: {report['summary']['passed']}/{total} 通過 ({report['summary']['pass_rate']}%)")
        print(f"   ✅ 通過: {report['summary']['passed']}")
        print(f"   ❌ 失敗: {report['summary']['failed']}")
        print(f"   ⚠️  錯誤: {report['summary']['errors']}")
        print("=" * 60)
        
        return report
    
    def save_report(self, report: Dict, output_path: str = None):
        """保存測試報告"""
        if output_path is None:
            output_path = os.path.join(
                os.path.dirname(__file__),
                f"ipc_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 報告已保存: {output_path}")
        return output_path


async def main():
    tester = IPCCommandTester()
    report = await tester.run_all_tests()
    tester.save_report(report)


if __name__ == '__main__':
    asyncio.run(main())

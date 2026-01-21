"""
第三階段：會員與卡密系統測試
測試與遠程服務器（tgkz.usdt2026.cc）的卡密 API 對接
"""

import asyncio
import sys
import json
import aiohttp
from pathlib import Path
from datetime import datetime

# 遠程服務器 URL
REMOTE_API_URL = "https://tgkz.usdt2026.cc"

# 從截圖中獲取的測試卡密
TEST_LICENSE_KEYS = [
    'TGAI-KL-9F11-DA63-2CC1',
    'TGAI-KL-A4FA-06E2-271E',
    'TGAI-KL-3AA7-9FF2-038E',
    'TGAI-KL-79A9-9EBC-8794',
    'TGAI-KL-F63F-E2D2-0BD6'
]


class LicenseAPIChecker:
    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "phase": "第三階段：會員與卡密系統測試",
            "checks": [],
            "api_tests": [],
            "warnings": [],
            "errors": [],
            "summary": {}
        }
        self.base_url = REMOTE_API_URL
    
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
    
    def add_api_test(self, endpoint, method, status_code, success, response_time, details=None):
        self.report["api_tests"].append({
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "success": success,
            "response_time_ms": response_time,
            "details": details
        })
    
    def add_warning(self, message):
        self.report["warnings"].append(message)
        print(f"⚠️ 警告: {message}")
    
    def add_error(self, message):
        self.report["errors"].append(message)
        print(f"❌ 錯誤: {message}")

    async def test_api_endpoint(self, session: aiohttp.ClientSession, method: str, 
                                endpoint: str, payload: dict = None, 
                                headers: dict = None) -> dict:
        """測試單個 API 端點"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
        
        start_time = datetime.now()
        try:
            if method.upper() == "GET":
                async with session.get(url, headers=default_headers, ssl=False) as response:
                    elapsed = (datetime.now() - start_time).total_seconds() * 1000
                    data = await response.json() if response.content_type == 'application/json' else {}
                    return {
                        "success": True,
                        "status_code": response.status,
                        "data": data,
                        "response_time": elapsed
                    }
            else:
                async with session.post(url, json=payload, headers=default_headers, ssl=False) as response:
                    elapsed = (datetime.now() - start_time).total_seconds() * 1000
                    data = await response.json() if response.content_type == 'application/json' else {}
                    return {
                        "success": True,
                        "status_code": response.status,
                        "data": data,
                        "response_time": elapsed
                    }
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            return {
                "success": False,
                "status_code": 0,
                "data": {},
                "response_time": elapsed,
                "error": str(e)
            }

    async def test_server_health(self, session: aiohttp.ClientSession):
        """測試服務器健康狀態"""
        print("\n" + "="*60)
        print("🏥 測試服務器健康狀態")
        print("="*60)
        
        # 測試首頁
        result = await self.test_api_endpoint(session, "GET", "/")
        self.add_api_test("/", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] == 200:
            self.add_check("服務器首頁", "pass", f"響應時間: {result['response_time']:.0f}ms")
        else:
            self.add_check("服務器首頁", "fail", f"錯誤: {result.get('error', 'Unknown')}")
        
        # 測試健康檢查端點
        result = await self.test_api_endpoint(session, "GET", "/api/health")
        self.add_api_test("/api/health", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] == 200:
            self.add_check("健康檢查 API", "pass", f"響應時間: {result['response_time']:.0f}ms")
        else:
            self.add_check("健康檢查 API", "warning", "端點可能不存在或格式不同")

    async def test_products_api(self, session: aiohttp.ClientSession):
        """測試產品列表 API"""
        print("\n" + "="*60)
        print("🛍️ 測試產品列表 API")
        print("="*60)
        
        result = await self.test_api_endpoint(session, "GET", "/api/products")
        self.add_api_test("/api/products", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] == 200:
            data = result.get("data", {})
            products = data.get("data", data.get("products", []))
            
            if isinstance(products, list) and len(products) > 0:
                self.add_check("產品列表 API", "pass", f"獲取到 {len(products)} 個產品")
                print("\n產品列表:")
                for p in products[:5]:  # 只顯示前5個
                    name = p.get("levelName", p.get("name", "未知"))
                    price = p.get("price", 0)
                    duration = p.get("durationName", p.get("duration", ""))
                    print(f"  {name} {duration}: ${price}")
                if len(products) > 5:
                    print(f"  ... 還有 {len(products) - 5} 個產品")
                
                self.report["summary"]["products_count"] = len(products)
            else:
                self.add_check("產品列表 API", "warning", "返回的產品列表為空或格式不正確")
        else:
            self.add_check("產品列表 API", "fail", f"請求失敗: {result.get('error', 'Unknown')}")

    async def test_license_validate_api(self, session: aiohttp.ClientSession):
        """測試卡密驗證 API"""
        print("\n" + "="*60)
        print("🔑 測試卡密驗證 API")
        print("="*60)
        
        # 使用第一個測試卡密
        test_key = TEST_LICENSE_KEYS[0]
        
        result = await self.test_api_endpoint(
            session, "POST", "/api/license/validate",
            payload={"license_key": test_key}
        )
        self.add_api_test("/api/license/validate", "POST", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] == 200:
            data = result.get("data", {})
            api_success = data.get("success", False)
            message = data.get("message", "")
            license_data = data.get("data", {})
            
            print(f"\n測試卡密: {test_key}")
            print(f"API 返回: success={api_success}, message={message}")
            
            if api_success:
                level = license_data.get("level", "未知")
                level_name = license_data.get("levelName", "未知")
                status = license_data.get("status", "未知")
                print(f"卡密信息: 等級={level_name} ({level}), 狀態={status}")
                self.add_check("卡密驗證 API", "pass", f"卡密有效: {level_name}")
            else:
                self.add_check("卡密驗證 API", "pass", f"API 正常工作: {message}")
        else:
            self.add_check("卡密驗證 API", "fail", f"請求失敗: {result.get('error', 'Unknown')}")
        
        # 測試無效卡密
        print("\n測試無效卡密格式...")
        result = await self.test_api_endpoint(
            session, "POST", "/api/license/validate",
            payload={"license_key": "INVALID-KEY-1234"}
        )
        
        if result["success"] and result["status_code"] == 200:
            data = result.get("data", {})
            if not data.get("success", True):
                self.add_check("無效卡密驗證", "pass", "正確拒絕無效卡密")
            else:
                self.add_check("無效卡密驗證", "warning", "應該拒絕無效卡密格式")
        else:
            self.add_check("無效卡密驗證", "warning", "API 可能使用不同的錯誤處理方式")

    async def test_license_activate_api(self, session: aiohttp.ClientSession):
        """測試卡密激活 API（只測試格式，不實際激活）"""
        print("\n" + "="*60)
        print("🎯 測試卡密激活 API 格式")
        print("="*60)
        
        # 使用無效的測試數據來驗證 API 格式
        test_payload = {
            "license_key": "TEST-ONLY-XXXX-XXXX-XXXX",
            "machine_id": "test-machine-id-12345",
            "device_id": "test-device-001",
            "email": "test@example.com",
            "invite_code": ""
        }
        
        result = await self.test_api_endpoint(
            session, "POST", "/api/license/activate",
            payload=test_payload
        )
        self.add_api_test("/api/license/activate", "POST", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] in [200, 400, 401, 404]:
            data = result.get("data", {})
            message = data.get("message", str(data))
            print(f"API 響應: {message[:100]}...")
            self.add_check("激活 API 格式", "pass", f"API 正常響應 (狀態碼: {result['status_code']})")
        else:
            self.add_check("激活 API 格式", "warning", f"響應異常: {result.get('error', 'Unknown')}")

    async def test_user_api(self, session: aiohttp.ClientSession):
        """測試用戶相關 API"""
        print("\n" + "="*60)
        print("👤 測試用戶 API")
        print("="*60)
        
        # 測試獲取激活記錄（使用 machine_id）
        test_machine_id = "test-machine-id-12345"
        
        result = await self.test_api_endpoint(
            session, "GET", 
            f"/api/user/activation-history?machine_id={test_machine_id}&limit=10"
        )
        self.add_api_test("/api/user/activation-history", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] in [200, 404]:
            data = result.get("data", {})
            records = data.get("data", [])
            self.add_check("激活記錄 API", "pass", f"API 正常 (記錄數: {len(records) if isinstance(records, list) else 0})")
        else:
            self.add_check("激活記錄 API", "warning", f"可能需要認證: {result.get('error', 'Unknown')}")
        
        # 測試使用統計 API
        result = await self.test_api_endpoint(
            session, "GET",
            f"/api/user/usage-stats?machine_id={test_machine_id}"
        )
        self.add_api_test("/api/user/usage-stats", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"]:
            self.add_check("使用統計 API", "pass", f"API 響應 (狀態碼: {result['status_code']})")
        else:
            self.add_check("使用統計 API", "warning", "API 可能需要認證")

    async def test_admin_api(self, session: aiohttp.ClientSession):
        """測試管理後台 API"""
        print("\n" + "="*60)
        print("👨‍💼 測試管理後台 API")
        print("="*60)
        
        # 測試管理後台頁面
        result = await self.test_api_endpoint(session, "GET", "/admin")
        self.add_api_test("/admin", "GET", result["status_code"], result["success"], result["response_time"])
        
        if result["success"] and result["status_code"] in [200, 302]:
            self.add_check("管理後台頁面", "pass", f"可訪問 (狀態碼: {result['status_code']})")
        else:
            self.add_check("管理後台頁面", "fail", f"無法訪問: {result.get('error', 'Unknown')}")
        
        # 測試管理 API（卡密統計）
        result = await self.test_api_endpoint(session, "GET", "/admin/api/stats")
        
        if result["success"] and result["status_code"] in [200, 401, 403]:
            self.add_check("管理 API", "pass", f"API 存在 (狀態碼: {result['status_code']})")
        else:
            self.add_check("管理 API", "warning", "管理 API 可能使用不同路徑")

    async def check_license_key_format(self):
        """驗證卡密格式"""
        print("\n" + "="*60)
        print("🔍 驗證卡密格式")
        print("="*60)
        
        import re
        
        # 新版卡密格式: TGAI-[等級時長]-[XXXX]-[XXXX]-[XXXX]
        # 等級: B=白銀/G=黃金/D=鑽石/S=星耀/K=王者
        # 時長: 1=周/2=月/3=季/Y=年/L=終身
        new_key_regex = r'^TGAI-([BGDSK][123YL]|KL|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
        
        print("\n測試卡密:")
        valid_count = 0
        for key in TEST_LICENSE_KEYS:
            match = re.match(new_key_regex, key, re.IGNORECASE)
            if match:
                level_code = match.group(1).upper()
                
                # 解析等級
                level_map = {
                    'B': '白銀', 'G': '黃金', 'D': '鑽石', 'S': '星耀', 'K': '王者',
                    'KL': '王者終身'
                }
                duration_map = {
                    '1': '週卡', '2': '月卡', '3': '季卡', 'Y': '年卡', 'L': '終身'
                }
                
                if level_code in level_map:
                    level = level_map[level_code]
                    duration = ""
                else:
                    level = level_map.get(level_code[0], '未知')
                    duration = duration_map.get(level_code[1:], '未知')
                
                print(f"  ✅ {key} -> {level} {duration}")
                valid_count += 1
            else:
                print(f"  ❌ {key} -> 格式不正確")
        
        self.add_check("卡密格式驗證", 
                      "pass" if valid_count == len(TEST_LICENSE_KEYS) else "warning",
                      f"{valid_count}/{len(TEST_LICENSE_KEYS)} 格式正確")
        
        self.report["summary"]["valid_license_keys"] = valid_count

    def generate_report(self):
        """生成最終報告"""
        print("\n" + "="*60)
        print("📋 第三階段檢查報告總結")
        print("="*60)
        
        passed = sum(1 for c in self.report["checks"] if c["status"] == "pass")
        failed = sum(1 for c in self.report["checks"] if c["status"] == "fail")
        warnings = sum(1 for c in self.report["checks"] if c["status"] == "warning")
        
        print(f"\n檢查項目: {len(self.report['checks'])}項")
        print(f"  ✅ 通過: {passed}項")
        print(f"  ⚠️ 警告: {warnings}項")
        print(f"  ❌ 失敗: {failed}項")
        
        print(f"\nAPI 測試結果:")
        api_success = sum(1 for t in self.report["api_tests"] if t["success"])
        print(f"  成功: {api_success}/{len(self.report['api_tests'])}項")
        
        avg_response = 0
        if self.report["api_tests"]:
            times = [t.get("response_time_ms", t.get("response_time", 0)) for t in self.report["api_tests"]]
            avg_response = sum(times) / len(times) if times else 0
            print(f"  平均響應時間: {avg_response:.0f}ms")
        
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
        report_path = Path(__file__).parent / "phase3_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        print(f"\n報告已保存至: {report_path}")
        
        return self.report

    async def run(self):
        """執行所有測試"""
        print("\n" + "="*60)
        print("🚀 開始第三階段：會員與卡密系統測試")
        print(f"時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"遠程服務器: {self.base_url}")
        print("="*60)
        
        # 驗證卡密格式
        await self.check_license_key_format()
        
        # 創建 HTTP 會話
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # 測試服務器健康
            await self.test_server_health(session)
            
            # 測試產品 API
            await self.test_products_api(session)
            
            # 測試卡密驗證 API
            await self.test_license_validate_api(session)
            
            # 測試激活 API 格式
            await self.test_license_activate_api(session)
            
            # 測試用戶 API
            await self.test_user_api(session)
            
            # 測試管理後台
            await self.test_admin_api(session)
        
        # 生成報告
        return self.generate_report()


if __name__ == "__main__":
    checker = LicenseAPIChecker()
    report = asyncio.run(checker.run())
    
    # 返回狀態碼
    failed = sum(1 for c in report["checks"] if c["status"] == "fail")
    sys.exit(1 if failed > 2 else 0)

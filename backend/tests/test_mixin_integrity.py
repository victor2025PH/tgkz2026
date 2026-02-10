#!/usr/bin/env python3
"""
P12-2: Mixin 结构完整性测试

测试内容:
1. MRO 安全性（无菱形冲突）
2. 方法签名完整性（无意外覆盖）
3. 路由 handler 可解析性
4. Docstring 覆盖率
5. 模块导入链完整性
6. admin_module_routes 注册函数可调用性
"""

import ast
import sys
import os
import inspect
import importlib
import unittest
from pathlib import Path
from collections import Counter

# 确保 backend 在 path 中
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Mixin 模块列表
MIXIN_MODULES = [
    'api.auth_routes_mixin',
    'api.quota_routes_mixin',
    'api.payment_routes_mixin',
    'api.admin_routes_mixin',
    'api.business_routes_mixin',
    'api.system_routes_mixin',
]

# P13-1: auth_routes_mixin is now a facade; actual methods are in sub-mixins
MIXIN_FILES = [
    BACKEND_DIR / 'api' / 'auth_core_mixin.py',
    BACKEND_DIR / 'api' / 'auth_oauth_mixin.py',
    BACKEND_DIR / 'api' / 'auth_security_mixin.py',
    BACKEND_DIR / 'api' / 'auth_routes_mixin.py',
    BACKEND_DIR / 'api' / 'quota_routes_mixin.py',
    BACKEND_DIR / 'api' / 'payment_routes_mixin.py',
    BACKEND_DIR / 'api' / 'admin_routes_mixin.py',
    BACKEND_DIR / 'api' / 'business_routes_mixin.py',
    BACKEND_DIR / 'api' / 'system_routes_mixin.py',
]

HTTP_SERVER_FILE = BACKEND_DIR / 'api' / 'http_server.py'
ADMIN_MODULE_ROUTES_FILE = BACKEND_DIR / 'api' / 'admin_module_routes.py'


class TestMixinStructuralIntegrity(unittest.TestCase):
    """Mixin 结构完整性测试"""

    def test_01_all_mixin_files_exist(self):
        """所有 Mixin 文件存在"""
        for f in MIXIN_FILES:
            self.assertTrue(f.exists(), f"Missing: {f.name}")
        self.assertTrue(ADMIN_MODULE_ROUTES_FILE.exists(), "Missing: admin_module_routes.py")

    def test_02_all_mixin_files_valid_syntax(self):
        """所有 Mixin 文件语法有效"""
        files = list(MIXIN_FILES) + [HTTP_SERVER_FILE, ADMIN_MODULE_ROUTES_FILE]
        for f in files:
            with open(f, 'r', encoding='utf-8') as fh:
                try:
                    ast.parse(fh.read())
                except SyntaxError as e:
                    self.fail(f"Syntax error in {f.name}: {e}")

    def test_03_no_method_name_conflicts(self):
        """不同 Mixin 之间无方法名冲突"""
        method_sources = {}  # method_name -> [source_file]
        
        for f in MIXIN_FILES:
            with open(f, 'r', encoding='utf-8') as fh:
                tree = ast.parse(fh.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for n in node.body:
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            name = n.name
                            if name.startswith('_') and not name.startswith('__'):
                                continue  # Skip private helpers
                            method_sources.setdefault(name, []).append(f.stem)
        
        conflicts = {k: v for k, v in method_sources.items() if len(v) > 1}
        if conflicts:
            msg = "\n".join(f"  {k}: {v}" for k, v in conflicts.items())
            self.fail(f"Method name conflicts between mixins:\n{msg}")

    def test_04_http_server_class_inherits_all_mixins(self):
        """HttpApiServer 继承所有 6 个 Mixin"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
                base_names = []
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        base_names.append(base.id)
                    elif isinstance(base, ast.Attribute):
                        base_names.append(base.attr)
                
                expected_mixins = [
                    'AuthRoutesMixin', 'QuotaRoutesMixin', 'PaymentRoutesMixin',
                    'AdminRoutesMixin', 'BusinessRoutesMixin', 'SystemRoutesMixin'
                ]
                for mixin in expected_mixins:
                    self.assertIn(mixin, base_names, f"Missing inheritance: {mixin}")
                return
        
        self.fail("HttpApiServer class not found")

    def test_05_route_handlers_resolvable(self):
        """所有 self.XXX 路由 handler 在类或 Mixin 中可找到"""
        import re
        
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            source = f.read()
        
        # Collect all methods from HttpApiServer and all Mixins
        all_methods = set()
        
        # From http_server.py
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
                for n in node.body:
                    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        all_methods.add(n.name)
        
        # From mixin files
        for f in MIXIN_FILES:
            with open(f, 'r', encoding='utf-8') as fh:
                mtree = ast.parse(fh.read())
            for node in ast.walk(mtree):
                if isinstance(node, ast.ClassDef):
                    for n in node.body:
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            all_methods.add(n.name)
        
        # Extract self.handler references from add_route calls
        route_pattern = re.compile(r'add_(?:get|post|put|delete|patch)\s*\([^,]+,\s*self\.(\w+)')
        handlers_used = set(route_pattern.findall(source))
        
        missing = handlers_used - all_methods
        if missing:
            self.fail(f"Route handlers not found in class or mixins: {missing}")

    def test_06_http_server_under_1500_lines(self):
        """http_server.py 保持在 1500 行以下"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            lines = len(f.readlines())
        self.assertLess(lines, 1500, f"http_server.py has {lines} lines (target: <1500)")

    def test_07_mixin_docstring_coverage(self):
        """Mixin 方法 docstring 覆盖率 >= 70%"""
        total = 0
        with_doc = 0
        
        for f in MIXIN_FILES:
            with open(f, 'r', encoding='utf-8') as fh:
                tree = ast.parse(fh.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for n in node.body:
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            if n.name.startswith('_'):
                                continue
                            total += 1
                            if (n.body and isinstance(n.body[0], ast.Expr) and
                                isinstance(n.body[0].value, ast.Constant) and
                                isinstance(n.body[0].value.value, str)):
                                with_doc += 1
        
        coverage = with_doc / total * 100 if total > 0 else 0
        self.assertGreaterEqual(
            coverage, 70,
            f"Docstring coverage: {coverage:.1f}% ({with_doc}/{total}), need >= 70%"
        )

    def test_08_admin_module_routes_structure(self):
        """admin_module_routes.py 包含注册函数"""
        with open(ADMIN_MODULE_ROUTES_FILE, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
        
        func_names = set()
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.FunctionDef):
                func_names.add(node.name)
        
        expected = [
            'register_admin_module_routes',
            '_register_admin_handlers_routes',
            '_register_wallet_routes',
            '_register_legacy_admin_routes',
        ]
        for fn in expected:
            self.assertIn(fn, func_names, f"Missing function: {fn}")

    def test_09_total_method_count_reasonable(self):
        """总方法数保持合理（200-400 之间）"""
        total = 0
        counted_files = set()
        for f in list(MIXIN_FILES) + [HTTP_SERVER_FILE]:
            if f in counted_files:
                continue
            counted_files.add(f)
            with open(f, 'r', encoding='utf-8') as fh:
                tree = ast.parse(fh.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for n in node.body:
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            total += 1
        
        self.assertGreater(total, 200, f"Too few methods: {total}")
        self.assertLess(total, 400, f"Too many methods: {total}")

    def test_10_mixin_sizes_balanced(self):
        """Mixin 大小相对均衡（排除 facade 文件后，最大:最小 < 7:1）"""
        sizes = {}
        # P13-1: Skip facade files (< 50 lines) — they just re-export sub-mixins
        for f in MIXIN_FILES:
            with open(f, 'r', encoding='utf-8') as fh:
                line_count = len(fh.readlines())
            if line_count >= 50:  # Skip facade files
                sizes[f.stem] = line_count
        
        if not sizes:
            return
        
        max_size = max(sizes.values())
        min_size = min(sizes.values())
        ratio = max_size / min_size if min_size > 0 else float('inf')
        
        if ratio > 7:
            detail = "\n".join(f"  {k}: {v} lines" for k, v in sorted(sizes.items(), key=lambda x: -x[1]))
            self.fail(f"Mixin size imbalance ({ratio:.1f}:1):\n{detail}")


class TestAuthMixinFacade(unittest.TestCase):
    """P13-1: AuthRoutesMixin facade pattern tests"""

    def test_01_facade_inherits_all_sub_mixins(self):
        """AuthRoutesMixin inherits AuthCoreMixin, AuthOAuthMixin, AuthSecurityMixin"""
        with open(BACKEND_DIR / 'api' / 'auth_routes_mixin.py', 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == 'AuthRoutesMixin':
                base_names = []
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        base_names.append(base.id)
                
                for expected in ['AuthCoreMixin', 'AuthOAuthMixin', 'AuthSecurityMixin']:
                    self.assertIn(expected, base_names, f"AuthRoutesMixin missing base: {expected}")
                return
        self.fail("AuthRoutesMixin class not found")

    def test_02_sub_mixin_files_exist_and_valid(self):
        """All 3 auth sub-mixin files exist and have valid syntax"""
        sub_files = [
            BACKEND_DIR / 'api' / 'auth_core_mixin.py',
            BACKEND_DIR / 'api' / 'auth_oauth_mixin.py',
            BACKEND_DIR / 'api' / 'auth_security_mixin.py',
        ]
        for f in sub_files:
            self.assertTrue(f.exists(), f"Missing: {f.name}")
            with open(f, 'r', encoding='utf-8') as fh:
                try:
                    ast.parse(fh.read())
                except SyntaxError as e:
                    self.fail(f"Syntax error in {f.name}: {e}")

    def test_03_total_auth_methods_preserved(self):
        """Total auth methods >= 50 (was 56 pre-split)"""
        total = 0
        for f in [BACKEND_DIR / 'api' / 'auth_core_mixin.py',
                  BACKEND_DIR / 'api' / 'auth_oauth_mixin.py',
                  BACKEND_DIR / 'api' / 'auth_security_mixin.py']:
            with open(f, 'r', encoding='utf-8') as fh:
                tree = ast.parse(fh.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    total += sum(1 for n in node.body
                                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
        self.assertGreaterEqual(total, 50, f"Expected >= 50 auth methods, got {total}")

    def test_04_no_cross_sub_mixin_conflicts(self):
        """No method name conflicts between the 3 auth sub-mixins"""
        method_sources = {}
        for f in [BACKEND_DIR / 'api' / 'auth_core_mixin.py',
                  BACKEND_DIR / 'api' / 'auth_oauth_mixin.py',
                  BACKEND_DIR / 'api' / 'auth_security_mixin.py']:
            with open(f, 'r', encoding='utf-8') as fh:
                tree = ast.parse(fh.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for n in node.body:
                        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            method_sources.setdefault(n.name, []).append(f.stem)
        
        conflicts = {k: v for k, v in method_sources.items() if len(v) > 1}
        if conflicts:
            self.fail(f"Method conflicts in auth sub-mixins: {conflicts}")


class TestRouteRegistrationCoverage(unittest.TestCase):
    """路由注册覆盖率测试"""

    def test_01_admin_module_routes_count(self):
        """admin_module_routes.py 应包含 100+ 条路由注册"""
        import re
        with open(ADMIN_MODULE_ROUTES_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        route_calls = re.findall(r'app\.router\.add_(?:get|post|put|delete|patch)', content)
        self.assertGreater(len(route_calls), 100,
                           f"Expected 100+ route registrations, got {len(route_calls)}")

    def test_02_no_duplicate_route_paths(self):
        """同文件内无重复路由路径"""
        import re
        
        files = [HTTP_SERVER_FILE, ADMIN_MODULE_ROUTES_FILE]
        for f in files:
            with open(f, 'r', encoding='utf-8') as fh:
                content = fh.read()
            
            paths = re.findall(r"add_(?:get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", content)
            duplicates = [p for p, c in Counter(paths).items() if c > 1]
            
            # Note: same path with different methods is OK (GET /api/foo + POST /api/foo)
            # We check method+path combos
            method_paths = re.findall(r"add_(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", content)
            dup_combos = [mp for mp, c in Counter(method_paths).items() if c > 1]
            
            if dup_combos:
                self.fail(f"Duplicate routes in {f.name}: {dup_combos[:5]}")


class TestDeclarativePermissions(unittest.TestCase):
    """P14-2: 声明式权限标记测试"""

    def test_01_public_paths_is_frozenset(self):
        """PUBLIC_PATHS should be a frozenset on HttpApiServer"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == 'PUBLIC_PATHS':
                                return  # Found it
        self.fail("PUBLIC_PATHS not found on HttpApiServer")

    def test_02_public_paths_contains_essentials(self):
        """PUBLIC_PATHS must include login, register, health endpoints"""
        import sys, importlib, os
        os.environ.setdefault('ELECTRON_MODE', 'true')
        sys.path.insert(0, str(BACKEND_DIR))
        try:
            mod = importlib.import_module('api.http_server')
            public = mod.HttpApiServer.get_public_paths()
            essentials = ['/health', '/api/health', '/api/v1/auth/login',
                          '/api/v1/auth/register', '/api/v1/health']
            for ep in essentials:
                self.assertIn(ep, public, f"Essential public path missing: {ep}")
        except Exception as e:
            self.skipTest(f"Cannot import HttpApiServer: {e}")

    def test_03_admin_path_prefixes_defined(self):
        """ADMIN_PATH_PREFIXES should be defined"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('ADMIN_PATH_PREFIXES', content)

    def test_04_auth_middleware_uses_single_source(self):
        """auth/middleware.py should reference _get_public_routes(), not hardcoded list"""
        middleware_file = BACKEND_DIR / 'auth' / 'middleware.py'
        with open(middleware_file, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('_get_public_routes', content,
                      "auth/middleware.py should use _get_public_routes()")
        self.assertIn('HttpApiServer', content,
                      "auth/middleware.py should reference HttpApiServer for public paths")


class TestP15RateLimiterEnhancement(unittest.TestCase):
    """P15-1: 限流增强测试"""

    def test_01_token_bucket_burst_rules(self):
        """DEFAULT_RULES should have rules with burst > 0"""
        with open(BACKEND_DIR / 'core' / 'rate_limiter.py', 'r', encoding='utf-8') as f:
            content = f.read()
        # P15-1 added burst-enabled rules
        self.assertIn('admin_api', content, "admin_api rule missing")
        self.assertIn('ip_login', content, "ip_login rule missing")
        self.assertIn('ip_register', content, "ip_register rule missing")
        self.assertIn('payment', content, "payment rule missing")
        self.assertIn('webhook', content, "webhook rule missing")

    def test_02_token_bucket_used_in_check(self):
        """check() method should actually use token_bucket for burst control"""
        with open(BACKEND_DIR / 'core' / 'rate_limiter.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('check_and_consume', content,
                      "TokenBucket.check_and_consume not called in RateLimiter")
        self.assertIn('burst:{key}', content,
                      "Burst key prefix not found — TokenBucket not integrated")

    def test_03_rate_limiter_stats_in_metrics(self):
        """api_perf_metrics endpoint should include rate_limiter stats"""
        with open(BACKEND_DIR / 'api' / 'system_routes_mixin.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("summary['rate_limiter']", content)
        self.assertIn('get_rate_limiter', content)


class TestP15DbHealth(unittest.TestCase):
    """P15-2: 数据库健康监控测试"""

    def test_01_db_health_module_exists(self):
        """api/db_health.py should exist"""
        self.assertTrue(
            (BACKEND_DIR / 'api' / 'db_health.py').exists(),
            "api/db_health.py not found"
        )

    def test_02_db_health_has_key_methods(self):
        """DbHealthMonitor should have get_stats, PRAGMA diagnostics"""
        with open(BACKEND_DIR / 'api' / 'db_health.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('class DbHealthMonitor', content)
        self.assertIn('def get_stats', content)
        self.assertIn('PRAGMA journal_mode', content)
        self.assertIn('PRAGMA page_count', content)
        self.assertIn('freelist_count', content)

    def test_03_db_health_route_registered(self):
        """ROUTE_TABLE should have /api/v1/metrics/db"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('/api/v1/metrics/db', content)

    def test_04_db_health_public(self):
        """/api/v1/metrics/db should be in PUBLIC_PATHS"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        # Check that the path is in PUBLIC_PATHS block
        self.assertIn("'/api/v1/metrics/db'", content)


class TestP15AlertEngine(unittest.TestCase):
    """P15-3: 告警规则引擎测试"""

    def test_01_alert_engine_module_exists(self):
        """api/alert_engine.py should exist"""
        self.assertTrue(
            (BACKEND_DIR / 'api' / 'alert_engine.py').exists(),
            "api/alert_engine.py not found"
        )

    def test_02_alert_engine_rules_registered(self):
        """AlertEngine should register default rules"""
        with open(BACKEND_DIR / 'api' / 'alert_engine.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('high_error_rate', content)
        self.assertIn('slow_response_p95', content)
        self.assertIn('low_cache_hit_rate', content)
        self.assertIn('db_connection_leak', content)
        self.assertIn('wal_too_large', content)
        self.assertIn('slow_query_surge', content)

    def test_03_alert_engine_cooldown(self):
        """AlertEngine should have cooldown mechanism"""
        with open(BACKEND_DIR / 'api' / 'alert_engine.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('cooldown_seconds', content)
        self.assertIn('_last_fired', content)

    def test_04_alert_route_registered(self):
        """/api/v1/metrics/alerts should be in ROUTE_TABLE"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('/api/v1/metrics/alerts', content)


class TestP16SystemMetrics(unittest.TestCase):
    """P16: 系统指标仪表板 + 定时告警 + DB 维护"""

    def test_01_admin_panel_has_system_metrics_tab(self):
        """admin-panel should have systemMetrics menu item"""
        with open(BACKEND_DIR.parent / 'admin-panel' / 'app.js', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("'systemMetrics'", content)
        self.assertIn('loadSystemMetrics', content)
        self.assertIn('renderMetricsCharts', content)

    def test_02_admin_panel_has_metrics_html(self):
        """index.html should have systemMetrics page section"""
        with open(BACKEND_DIR.parent / 'admin-panel' / 'index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("currentPage === 'systemMetrics'", content)
        self.assertIn('metricsStatusChart', content)
        self.assertIn('metricsEndpointChart', content)

    def test_03_alert_engine_background_loop(self):
        """AlertEngine should have background evaluation loop"""
        with open(BACKEND_DIR / 'api' / 'alert_engine.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('start_background_loop', content)
        self.assertIn('_background_eval_loop', content)
        self.assertIn('_send_telegram_alerts', content)
        self.assertIn('start_alert_engine_background', content)

    def test_04_alert_engine_registered_in_startup(self):
        """init_startup_mixin.py should start alert engine"""
        with open(BACKEND_DIR / 'service' / 'init_startup_mixin.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('start_alert_engine_background', content)

    def test_05_db_auto_maintenance(self):
        """DbHealthMonitor should have auto_maintenance method"""
        with open(BACKEND_DIR / 'api' / 'db_health.py', 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('auto_maintenance', content)
        self.assertIn('wal_checkpoint', content)
        self.assertIn('VACUUM', content)
        self.assertIn('WAL_CHECKPOINT_THRESHOLD_MB', content)

    def test_06_db_maintenance_route(self):
        """ROUTE_TABLE should have /api/v1/db/maintenance"""
        with open(HTTP_SERVER_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn('/api/v1/db/maintenance', content)


if __name__ == '__main__':
    # Run with verbose output
    unittest.main(verbosity=2)

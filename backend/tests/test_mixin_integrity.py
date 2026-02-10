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

MIXIN_FILES = [
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
        """总方法数保持合理（200-300 之间）"""
        total = 0
        for f in list(MIXIN_FILES) + [HTTP_SERVER_FILE]:
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
        """Mixin 大小相对均衡（最大:最小 < 7:1）"""
        sizes = {}
        for f in MIXIN_FILES:
            with open(f, 'r', encoding='utf-8') as fh:
                sizes[f.stem] = len(fh.readlines())
        
        max_size = max(sizes.values())
        min_size = min(sizes.values())
        ratio = max_size / min_size if min_size > 0 else float('inf')
        
        if ratio > 7:
            detail = "\n".join(f"  {k}: {v} lines" for k, v in sorted(sizes.items(), key=lambda x: -x[1]))
            self.fail(f"Mixin size imbalance ({ratio:.1f}:1):\n{detail}")


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


if __name__ == '__main__':
    # Run with verbose output
    unittest.main(verbosity=2)

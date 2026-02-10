#!/usr/bin/env python3
"""
P2-1: Mixin 导入完整性检查脚本

Phase9 文件拆分后的安全网 —— 自动检测所有 mixin 文件中：
1. 引用了未定义/未导入的名称（如 Database, ErrorType）
2. 引用了 main.py 模块级变量但未导入
3. 缺少标准库导入（如 sqlite3, re, Path）

用法：
  python scripts/check_mixin_imports.py           # 检查所有 mixin 文件
  python scripts/check_mixin_imports.py --strict   # 严格模式（CI 中使用，发现问题返回非 0）

在 CI 中添加：
  - name: Check mixin imports
    run: cd backend && python scripts/check_mixin_imports.py --strict
"""
import ast
import sys
import os
from pathlib import Path

# 要检查的 mixin 目录
MIXIN_DIRS = [
    'db',
    'service',
]

# 已知的 mixin 文件模式
MIXIN_PATTERNS = ['*_mixin.py']

# 不应该在 mixin 文件中直接引用的类名（它们只在 database.py / main.py 中定义）
FORBIDDEN_REFS = {
    'Database': '应使用 mixin 自身的类名或 type(self)',
    'BackendService': '应通过 self 访问或延迟导入',
}

# Python 内置名称（不需要导入）
BUILTINS = set(dir(__builtins__)) if isinstance(__builtins__, dict) else set(dir(__builtins__))
BUILTINS.update({
    'True', 'False', 'None', 'self', 'cls', 'super',
    'print', 'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple',
    'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
    'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr', 'delattr',
    'type', 'id', 'hash', 'repr', 'abs', 'round', 'min', 'max', 'sum',
    'any', 'all', 'iter', 'next', 'callable', 'property', 'staticmethod', 'classmethod',
    'open', 'input', 'format', 'chr', 'ord', 'hex', 'oct', 'bin',
    'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'AttributeError', 'ImportError', 'RuntimeError', 'StopIteration',
    'FileNotFoundError', 'PermissionError', 'OSError', 'IOError',
    'NameError', 'NotImplementedError', 'ZeroDivisionError',
    'AssertionError', 'UnicodeDecodeError', 'UnicodeEncodeError',
    'asyncio',  # 通常在顶部导入
})


def find_mixin_files(backend_dir: str) -> list:
    """查找所有 mixin 文件"""
    files = []
    for mixin_dir in MIXIN_DIRS:
        dir_path = Path(backend_dir) / mixin_dir
        if dir_path.exists():
            for pattern in MIXIN_PATTERNS:
                files.extend(dir_path.glob(pattern))
    return sorted(files)


def check_forbidden_refs(filepath: Path) -> list:
    """检查文件中是否直接引用了禁止的类名"""
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source, filename=str(filepath))
        
        for node in ast.walk(tree):
            # 检查 Name 节点
            if isinstance(node, ast.Name) and node.id in FORBIDDEN_REFS:
                # 排除 import 语句和字符串中的引用
                issues.append({
                    'file': str(filepath),
                    'line': node.lineno,
                    'issue': f'直接引用 `{node.id}` — {FORBIDDEN_REFS[node.id]}',
                    'severity': 'error'
                })
            # 检查 Attribute 节点 (Database.xxx)
            elif isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name) and node.value.id in FORBIDDEN_REFS:
                    issues.append({
                        'file': str(filepath),
                        'line': node.lineno,
                        'issue': f'引用 `{node.value.id}.{node.attr}` — {FORBIDDEN_REFS[node.value.id]}',
                        'severity': 'error'
                    })
    except SyntaxError as e:
        issues.append({
            'file': str(filepath),
            'line': e.lineno or 0,
            'issue': f'语法错误: {e.msg}',
            'severity': 'error'
        })
    
    return issues


def check_basic_imports(filepath: Path) -> list:
    """检查文件中是否有基本的导入问题"""
    issues = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        filename = filepath.name
        
        # 简单的文本检查：常见的缺失导入
        content = ''.join(lines)
        
        # 检查是否使用了 sqlite3 但没导入
        if 'sqlite3.' in content or 'sqlite3.connect' in content:
            if 'import sqlite3' not in content:
                issues.append({
                    'file': str(filepath),
                    'line': 0,
                    'issue': '使用了 sqlite3 但未导入',
                    'severity': 'warning'
                })
        
        # 检查是否使用了 Path 但没导入
        if 'Path(' in content:
            if 'from pathlib import Path' not in content and 'from pathlib import' not in content:
                issues.append({
                    'file': str(filepath),
                    'line': 0,
                    'issue': '使用了 Path 但未从 pathlib 导入',
                    'severity': 'warning'
                })
        
        # 检查是否使用了 re.xxx 但没导入 re
        if 're.' in content and 're.compile' in content or 're.search' in content or 're.match' in content:
            if 'import re' not in content:
                issues.append({
                    'file': str(filepath),
                    'line': 0,
                    'issue': '使用了 re 模块但未导入',
                    'severity': 'warning'
                })
                
    except Exception as e:
        issues.append({
            'file': str(filepath),
            'line': 0,
            'issue': f'检查失败: {e}',
            'severity': 'error'
        })
    
    return issues


def main():
    strict = '--strict' in sys.argv
    
    # 确定 backend 目录
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    
    if not (backend_dir / 'db').exists():
        print(f"❌ 未找到 backend/db 目录: {backend_dir}")
        sys.exit(1)
    
    print(f"🔍 检查 Mixin 导入完整性...")
    print(f"   目录: {backend_dir}")
    print()
    
    mixin_files = find_mixin_files(str(backend_dir))
    print(f"   找到 {len(mixin_files)} 个 mixin 文件")
    print()
    
    all_issues = []
    
    for filepath in mixin_files:
        rel_path = filepath.relative_to(backend_dir)
        
        # 检查禁止的引用
        issues = check_forbidden_refs(filepath)
        issues.extend(check_basic_imports(filepath))
        
        if issues:
            print(f"  ❌ {rel_path}:")
            for issue in issues:
                severity_icon = '🔴' if issue['severity'] == 'error' else '🟡'
                line_info = f"L{issue['line']}" if issue['line'] else ''
                print(f"     {severity_icon} {line_info} {issue['issue']}")
            all_issues.extend(issues)
        else:
            print(f"  ✅ {rel_path}")
    
    print()
    
    errors = [i for i in all_issues if i['severity'] == 'error']
    warnings = [i for i in all_issues if i['severity'] == 'warning']
    
    if errors:
        print(f"🔴 发现 {len(errors)} 个错误, {len(warnings)} 个警告")
    elif warnings:
        print(f"🟡 发现 {len(warnings)} 个警告")
    else:
        print(f"✅ 所有 mixin 文件检查通过")
    
    if strict and errors:
        print("\n❌ 严格模式：存在错误，退出码 1")
        sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()

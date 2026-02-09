#!/usr/bin/env python3
"""
Deep static analysis: scan all _impl.py files for undefined names,
missing imports, and structural issues.
"""
import ast
import os
import sys
import py_compile

BACKEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')

# Standard builtins that are always available
BUILTINS = set(dir(__builtins__)) if isinstance(__builtins__, dict) else set(dir(__builtins__))
BUILTINS.update([
    'True', 'False', 'None', 'print', 'len', 'str', 'int', 'float', 'bool',
    'list', 'dict', 'set', 'tuple', 'range', 'enumerate', 'zip', 'map',
    'filter', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'round',
    'isinstance', 'issubclass', 'type', 'id', 'hash', 'repr', 'format',
    'open', 'input', 'super', 'property', 'staticmethod', 'classmethod',
    'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'AttributeError', 'ImportError', 'RuntimeError', 'StopIteration',
    'FileNotFoundError', 'OSError', 'IOError', 'NotImplementedError',
    'PermissionError', 'ConnectionError', 'TimeoutError',
    'hasattr', 'getattr', 'setattr', 'delattr', 'callable', 'iter', 'next',
    'any', 'all', 'chr', 'ord', 'hex', 'oct', 'bin', 'bytes', 'bytearray',
    'memoryview', 'object', 'complex', 'frozenset', 'slice',
    'breakpoint', 'compile', 'eval', 'exec', 'globals', 'locals', 'vars',
    'dir', 'help', 'ascii', 'divmod', 'pow',
    '__name__', '__file__', '__doc__', '__builtins__',
    'NotImplemented', 'Ellipsis', '__import__',
    'ArithmeticError', 'AssertionError', 'BaseException', 'BlockingIOError',
    'BrokenPipeError', 'BufferError', 'BytesWarning', 'ChildProcessError',
    'ConnectionAbortedError', 'ConnectionRefusedError', 'ConnectionResetError',
    'DeprecationWarning', 'EOFError', 'EnvironmentError', 'FloatingPointError',
    'FutureWarning', 'GeneratorExit', 'InterruptedError', 'IsADirectoryError',
    'KeyboardInterrupt', 'LookupError', 'MemoryError', 'ModuleNotFoundError',
    'NameError', 'NotADirectoryError', 'OverflowError', 'PendingDeprecationWarning',
    'ProcessLookupError', 'RecursionError', 'ReferenceError', 'ResourceWarning',
    'RuntimeWarning', 'StopAsyncIteration', 'SyntaxError', 'SyntaxWarning',
    'SystemError', 'SystemExit', 'TabError', 'UnicodeDecodeError',
    'UnicodeEncodeError', 'UnicodeError', 'UnicodeTranslationError',
    'UnicodeWarning', 'UserWarning', 'Warning', 'ZeroDivisionError',
])


class ImplFileAnalyzer(ast.NodeVisitor):
    """Analyze a single _impl.py file for undefined names."""

    def __init__(self, filepath):
        self.filepath = filepath
        self.module_level_names = set()  # Names defined at module level
        self.imports = {}  # name -> import source
        self.function_names = set()
        self.issues = []
        self.function_uses = {}  # func_name -> set of used names
        self.function_locals = {}  # func_name -> set of locally defined names
        self._current_func = None
        self._current_locals = set()
        self._current_uses = set()

    def analyze(self):
        with open(self.filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        try:
            tree = ast.parse(source)
        except SyntaxError as e:
            self.issues.append(('SYNTAX_ERROR', str(e), 0))
            return self.issues

        # First pass: collect module-level names (imports, assignments, functions)
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name.split('.')[0]
                    self.module_level_names.add(name)
                    self.imports[name] = f"import {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                for alias in node.names:
                    name = alias.asname or alias.name
                    self.module_level_names.add(name)
                    self.imports[name] = f"from {module} import {alias.name}"
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.module_level_names.add(node.name)
                self.function_names.add(node.name)
            elif isinstance(node, ast.ClassDef):
                self.module_level_names.add(node.name)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        self.module_level_names.add(target.id)

        # Second pass: analyze each function for undefined names
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self._analyze_function(node)

        return self.issues

    def _analyze_function(self, func_node):
        """Analyze a function for names used but not defined."""
        func_name = func_node.name
        local_names = set()
        used_names = set()
        imported_names = set()

        # Collect function params
        for arg in func_node.args.args:
            local_names.add(arg.arg)
        if func_node.args.vararg:
            local_names.add(func_node.args.vararg.arg)
        if func_node.args.kwarg:
            local_names.add(func_node.args.kwarg.arg)
        for arg in func_node.args.kwonlyargs:
            local_names.add(arg.arg)

        # Walk the function body
        self._collect_names(func_node.body, local_names, used_names, imported_names, depth=0)

        # Check for names that are used but not defined anywhere
        all_defined = BUILTINS | self.module_level_names | local_names | imported_names
        undefined = used_names - all_defined

        for name in sorted(undefined):
            # Skip common false positives
            if name.startswith('_') and name != '_logger':
                continue
            # Find the line where it's first used
            line = self._find_first_use(func_node, name)
            self.issues.append(('UNDEFINED_NAME', f"'{name}' in {func_name}()", line))

    def _collect_names(self, nodes, local_names, used_names, imported_names, depth):
        """Recursively collect local definitions and used names."""
        if not isinstance(nodes, list):
            nodes = [nodes]

        for node in nodes:
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name.split('.')[0]
                    imported_names.add(name)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_names.add(name)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    self._collect_assign_targets(target, local_names)
                self._collect_used(node.value, used_names)
            elif isinstance(node, ast.AugAssign):
                self._collect_used(node.value, used_names)
                if isinstance(node.target, ast.Name):
                    local_names.add(node.target.id)
            elif isinstance(node, ast.AnnAssign):
                if node.value:
                    self._collect_used(node.value, used_names)
                if node.target and isinstance(node.target, ast.Name):
                    local_names.add(node.target.id)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Nested function - just add its name as local
                local_names.add(node.name)
                # Don't recurse into nested function body (it has its own scope)
                # But collect decorator names
                for dec in node.decorator_list:
                    self._collect_used(dec, used_names)
            elif isinstance(node, ast.ClassDef):
                local_names.add(node.name)
            elif isinstance(node, (ast.For, ast.AsyncFor)):
                self._collect_assign_targets(node.target, local_names)
                self._collect_used(node.iter, used_names)
                self._collect_names(node.body, local_names, used_names, imported_names, depth+1)
                self._collect_names(node.orelse, local_names, used_names, imported_names, depth+1)
            elif isinstance(node, (ast.While,)):
                self._collect_used(node.test, used_names)
                self._collect_names(node.body, local_names, used_names, imported_names, depth+1)
                self._collect_names(node.orelse, local_names, used_names, imported_names, depth+1)
            elif isinstance(node, (ast.If,)):
                self._collect_used(node.test, used_names)
                self._collect_names(node.body, local_names, used_names, imported_names, depth+1)
                self._collect_names(node.orelse, local_names, used_names, imported_names, depth+1)
            elif isinstance(node, (ast.With, ast.AsyncWith)):
                for item in node.items:
                    self._collect_used(item.context_expr, used_names)
                    if item.optional_vars:
                        self._collect_assign_targets(item.optional_vars, local_names)
                self._collect_names(node.body, local_names, used_names, imported_names, depth+1)
            elif isinstance(node, ast.Try):
                self._collect_names(node.body, local_names, used_names, imported_names, depth+1)
                for handler in node.handlers:
                    if handler.type:
                        self._collect_used(handler.type, used_names)
                    if handler.name:
                        local_names.add(handler.name)
                    self._collect_names(handler.body, local_names, used_names, imported_names, depth+1)
                self._collect_names(node.orelse, local_names, used_names, imported_names, depth+1)
                self._collect_names(node.finalbody, local_names, used_names, imported_names, depth+1)
            elif isinstance(node, ast.Return):
                if node.value:
                    self._collect_used(node.value, used_names)
            elif isinstance(node, ast.Expr):
                self._collect_used(node.value, used_names)
            elif isinstance(node, ast.Assert):
                self._collect_used(node.test, used_names)
                if node.msg:
                    self._collect_used(node.msg, used_names)
            elif isinstance(node, ast.Raise):
                if node.exc:
                    self._collect_used(node.exc, used_names)
            elif isinstance(node, ast.Delete):
                for target in node.targets:
                    self._collect_used(target, used_names)
            elif isinstance(node, ast.Global):
                for name in node.names:
                    local_names.add(name)
            elif isinstance(node, ast.Nonlocal):
                for name in node.names:
                    local_names.add(name)

    def _collect_assign_targets(self, target, local_names):
        if isinstance(target, ast.Name):
            local_names.add(target.id)
        elif isinstance(target, (ast.Tuple, ast.List)):
            for elt in target.elts:
                self._collect_assign_targets(elt, local_names)
        elif isinstance(target, ast.Starred):
            self._collect_assign_targets(target.value, local_names)

    def _collect_used(self, node, used_names):
        """Collect all Name references in an expression."""
        if node is None:
            return
        if isinstance(node, ast.Name):
            used_names.add(node.id)
        elif isinstance(node, ast.Attribute):
            # Only collect the root name (e.g., for self.x, collect 'self')
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.Call):
            self._collect_used(node.func, used_names)
            for arg in node.args:
                self._collect_used(arg, used_names)
            for kw in node.keywords:
                self._collect_used(kw.value, used_names)
        elif isinstance(node, ast.BinOp):
            self._collect_used(node.left, used_names)
            self._collect_used(node.right, used_names)
        elif isinstance(node, ast.UnaryOp):
            self._collect_used(node.operand, used_names)
        elif isinstance(node, ast.BoolOp):
            for val in node.values:
                self._collect_used(val, used_names)
        elif isinstance(node, ast.Compare):
            self._collect_used(node.left, used_names)
            for comp in node.comparators:
                self._collect_used(comp, used_names)
        elif isinstance(node, (ast.List, ast.Tuple, ast.Set)):
            for elt in node.elts:
                self._collect_used(elt, used_names)
        elif isinstance(node, ast.Dict):
            for k in node.keys:
                if k:
                    self._collect_used(k, used_names)
            for v in node.values:
                self._collect_used(v, used_names)
        elif isinstance(node, ast.Subscript):
            self._collect_used(node.value, used_names)
            self._collect_used(node.slice, used_names)
        elif isinstance(node, ast.Index):
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.Slice):
            if node.lower:
                self._collect_used(node.lower, used_names)
            if node.upper:
                self._collect_used(node.upper, used_names)
            if node.step:
                self._collect_used(node.step, used_names)
        elif isinstance(node, ast.Starred):
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.IfExp):
            self._collect_used(node.test, used_names)
            self._collect_used(node.body, used_names)
            self._collect_used(node.orelse, used_names)
        elif isinstance(node, (ast.ListComp, ast.SetComp, ast.GeneratorExp)):
            # Comprehension vars are local
            comp_locals = set()
            for gen in node.generators:
                self._collect_assign_targets(gen.target, comp_locals)
                self._collect_used(gen.iter, used_names)
                for if_ in gen.ifs:
                    self._collect_used(if_, used_names)
            # Element expression - names not in comp_locals are external
            self._collect_used(node.elt, used_names)
            used_names -= comp_locals
        elif isinstance(node, ast.DictComp):
            comp_locals = set()
            for gen in node.generators:
                self._collect_assign_targets(gen.target, comp_locals)
                self._collect_used(gen.iter, used_names)
                for if_ in gen.ifs:
                    self._collect_used(if_, used_names)
            self._collect_used(node.key, used_names)
            self._collect_used(node.value, used_names)
            used_names -= comp_locals
        elif isinstance(node, ast.Await):
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.Yield):
            if node.value:
                self._collect_used(node.value, used_names)
        elif isinstance(node, ast.YieldFrom):
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.FormattedValue):
            self._collect_used(node.value, used_names)
        elif isinstance(node, ast.JoinedStr):
            for val in node.values:
                self._collect_used(val, used_names)
        elif isinstance(node, ast.Lambda):
            # Lambda args are local, body is expression
            lambda_locals = set()
            for arg in node.args.args:
                lambda_locals.add(arg.arg)
            self._collect_used(node.body, used_names)
            used_names -= lambda_locals

    def _find_first_use(self, func_node, name):
        """Find the line number of the first use of a name in a function."""
        for node in ast.walk(func_node):
            if isinstance(node, ast.Name) and node.id == name:
                return node.lineno
        return func_node.lineno


def find_all_impl_files():
    """Find all _impl.py files in the backend directory."""
    impl_files = []
    for root, dirs, files in os.walk(BACKEND):
        for f in sorted(files):
            if f.endswith('_impl.py'):
                impl_files.append(os.path.join(root, f))
    return impl_files


def main():
    impl_files = find_all_impl_files()
    print(f"Found {len(impl_files)} _impl.py files")
    print("=" * 80)

    all_issues = {}
    total_issues = 0

    for filepath in impl_files:
        relpath = os.path.relpath(filepath, BACKEND)
        analyzer = ImplFileAnalyzer(filepath)
        issues = analyzer.analyze()

        if issues:
            all_issues[relpath] = issues
            total_issues += len(issues)
            print(f"\n{'!'*3} {relpath} ({len(issues)} issues)")
            for issue_type, msg, line in issues:
                print(f"  [{issue_type}] Line {line}: {msg}")
        else:
            print(f"  OK: {relpath}")

    # Also do py_compile check
    print("\n" + "=" * 80)
    print("py_compile syntax check:")
    compile_errors = 0
    for filepath in impl_files:
        relpath = os.path.relpath(filepath, BACKEND)
        try:
            py_compile.compile(filepath, doraise=True)
        except py_compile.PyCompileError as e:
            print(f"  COMPILE ERROR: {relpath}: {e}")
            compile_errors += 1

    if compile_errors == 0:
        print("  All files compile OK.")

    # Summary
    print("\n" + "=" * 80)
    print(f"SUMMARY: {total_issues} potential issues in {len(all_issues)} files")
    print(f"         {compile_errors} compile errors")

    if all_issues:
        # Group by issue type
        by_name = {}
        for relpath, issues in all_issues.items():
            for issue_type, msg, line in issues:
                if issue_type == 'UNDEFINED_NAME':
                    # Extract the name
                    name = msg.split("'")[1] if "'" in msg else msg
                    if name not in by_name:
                        by_name[name] = []
                    by_name[name].append((relpath, line))

        if by_name:
            print(f"\nUNDEFINED NAMES (grouped):")
            for name in sorted(by_name.keys()):
                files = by_name[name]
                print(f"  '{name}' -> {len(files)} file(s):")
                for fp, line in files:
                    print(f"    - {fp}:{line}")


if __name__ == '__main__':
    main()

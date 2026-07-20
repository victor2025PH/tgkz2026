#!/usr/bin/env python3
"""P12-1 bonus: Extract debug and batch methods from http_server.py"""
import ast
import textwrap

SOURCE = 'api/http_server.py'

# Methods to extract
TO_SYSTEM = ['debug_modules', 'debug_deploy', 'debug_accounts']
TO_BUSINESS = ['batch_account_operations']

with open(SOURCE, 'r', encoding='utf-8') as f:
    source = f.read()
    lines = source.split('\n')

tree = ast.parse(source)

# Find method ranges
ranges = {}
for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
        for n in node.body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if n.name in TO_SYSTEM + TO_BUSINESS:
                    # Lines are 1-indexed in AST
                    ranges[n.name] = (n.lineno - 1, n.end_lineno)
        break

print("Found method ranges:")
for name, (start, end) in sorted(ranges.items(), key=lambda x: x[1][0]):
    print(f"  {name}: lines {start+1}-{end} ({end - start} lines)")

# Extract method bodies (keeping indentation)
system_methods = []
business_methods = []
for name in TO_SYSTEM:
    if name in ranges:
        start, end = ranges[name]
        body = '\n'.join(lines[start:end])
        system_methods.append(body)

for name in TO_BUSINESS:
    if name in ranges:
        start, end = ranges[name]
        body = '\n'.join(lines[start:end])
        business_methods.append(body)

# Append to system_routes_mixin.py
if system_methods:
    with open('api/system_routes_mixin.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    addition = '\n\n    # ==================== P12-1: Debug/Diagnostic Methods ====================\n\n'
    addition += '\n\n'.join(system_methods) + '\n'
    
    with open('api/system_routes_mixin.py', 'w', encoding='utf-8') as f:
        f.write(content.rstrip() + addition)
    print(f"\nAppended {len(system_methods)} debug methods to system_routes_mixin.py")

# Append to business_routes_mixin.py
if business_methods:
    with open('api/business_routes_mixin.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    addition = '\n\n    # ==================== P12-1: Batch Operations ====================\n\n'
    addition += '\n\n'.join(business_methods) + '\n'
    
    with open('api/business_routes_mixin.py', 'w', encoding='utf-8') as f:
        f.write(content.rstrip() + addition)
    print(f"Appended {len(business_methods)} batch methods to business_routes_mixin.py")

# Remove extracted methods from http_server.py
# Collect line ranges to remove (sorted descending to not shift indices)
remove_ranges = sorted(ranges.values(), key=lambda x: -x[0])
new_lines = list(lines)

for start, end in remove_ranges:
    # Remove lines, but also remove trailing blank line if present
    while end < len(new_lines) and new_lines[end].strip() == '':
        end += 1
    del new_lines[start:end]

with open(SOURCE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"\nhttp_server.py: {len(lines)} -> {len(new_lines)} lines (removed {len(lines) - len(new_lines)} lines)")

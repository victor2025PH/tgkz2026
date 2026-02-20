#!/usr/bin/env python3
"""P10-1 enhanced: Extract admin_* methods to AdminRoutesMixin"""

import ast

src_path = 'backend/api/http_server.py'
with open(src_path, 'r', encoding='utf-8') as f:
    source = f.read()
lines = source.split('\n')

tree = ast.parse(source)

# Find all admin_* methods in HttpApiServer
admin_ranges = []
for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == 'HttpApiServer':
        for n in node.body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name.startswith('admin_'):
                # Include the section comment above (if any)
                start = n.lineno - 1  # 0-indexed
                # Look upward for blank lines and section comments
                while start > 0 and (lines[start-1].strip() == '' or lines[start-1].strip().startswith('#')):
                    start -= 1
                start += 1  # Go back to the first blank/comment line
                # Only include if the comment is directly above (max 2 lines gap)
                if n.lineno - 1 - start > 3:
                    start = n.lineno - 1
                end = n.end_lineno  # 1-indexed inclusive -> 0-indexed exclusive
                admin_ranges.append((n.name, start, end))
        break

print(f"Found {len(admin_ranges)} admin methods")
for name, start, end in admin_ranges:
    print(f"  {name}: L{start+1}-{end} ({end-start} lines)")

# Extract method bodies
mixin_methods = []
for name, start, end in admin_ranges:
    method_lines = lines[start:end]
    mixin_methods.append('\n'.join(method_lines))

# Create mixin file
mixin_content = '''#!/usr/bin/env python3
"""
P10-1: Admin Routes Mixin
管理員 API 端點處理器 — 從 http_server.py 提取

包含: 管理員儀表板、用戶管理、配額監控、計費、安全、審計等
"""

import json
import logging
from aiohttp import web

logger = logging.getLogger(__name__)


class AdminRoutesMixin:
    """管理員 API 路由處理器 Mixin — 供 HttpApiServer 繼承使用"""

'''

for block in mixin_methods:
    mixin_content += block + '\n\n'

mixin_path = 'backend/api/admin_routes_mixin.py'
with open(mixin_path, 'w', encoding='utf-8') as f:
    f.write(mixin_content)

mixin_line_count = mixin_content.count('\n')
print(f"\nCreated {mixin_path}: {mixin_line_count} lines")

# Remove admin methods from http_server.py (reverse order to preserve indices)
# Build a set of lines to remove
remove_set = set()
for name, start, end in admin_ranges:
    for i in range(start, end):
        remove_set.add(i)

new_lines = []
i = 0
skip_count = 0
while i < len(lines):
    if i in remove_set:
        # At the start of each removed block, add a comment
        if i == 0 or (i-1) not in remove_set:
            new_lines.append(f'    # P10-1: {lines[i].strip()[:60]}... -> admin_routes_mixin.py')
        skip_count += 1
        i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open(src_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"http_server.py: {len(lines)} -> {len(new_lines)} lines (removed {skip_count})")

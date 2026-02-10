#!/usr/bin/env python3
"""P6-1: Fix hasattr-guarded handlers to return proper error responses"""
import re
import os

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

files_to_fix = [
    'domain/contacts/handlers.py',
    'domain/messaging/handlers.py',
]

total = 0
for rel_path in files_to_fix:
    fpath = os.path.join(BACKEND, rel_path)
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    fixed = 0
    for line in lines:
        # Match: "return await backend_service.handle_xxx(payload) if hasattr(backend_service, 'handle_xxx') else None"
        # or without payload
        m = re.match(
            r'^(\s+)return await backend_service\.(handle_\w+)\((payload)?\) if hasattr\(backend_service, \'handle_\w+\'\) else None$',
            line.rstrip()
        )
        if m:
            indent = m.group(1)
            method = m.group(2)
            has_payload = m.group(3)
            arg = 'payload' if has_payload else ''
            new_lines.append(f"{indent}if hasattr(backend_service, '{method}'):\n")
            new_lines.append(f"{indent}    return await backend_service.{method}({arg})\n")
            new_lines.append(f"{indent}return {{'success': False, 'error': 'Not implemented: {method}'}}\n")
            fixed += 1
        else:
            new_lines.append(line)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"  {rel_path}: fixed {fixed} hasattr patterns")
    total += fixed

print(f"\nTotal fixed: {total}")

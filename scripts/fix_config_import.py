#!/usr/bin/env python3
"""Fix missing `from config import config` in _impl.py files."""
import os
import re

BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend')

def find_impl_files(root):
    result = []
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f.endswith('_impl.py'):
                result.append(os.path.join(dirpath, f))
    return sorted(result)

def main():
    impl_files = find_impl_files(BACKEND_DIR)
    fixed = 0
    
    for fp in impl_files:
        rel = os.path.relpath(fp, BACKEND_DIR)
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_config_usage = bool(re.search(r'\bconfig\.', content))
        has_config_import = bool(re.search(r'from config import.*\bconfig\b', content))
        
        if has_config_usage and not has_config_import:
            # Add after db import if it exists, else after service_context import
            lines = content.split('\n')
            insert_idx = None
            for i, line in enumerate(lines):
                if line.strip().startswith('from database import db'):
                    insert_idx = i + 1
                    break
                elif line.strip().startswith('from service_context import'):
                    insert_idx = i + 1
            
            if insert_idx is None:
                for i, line in enumerate(lines):
                    if line.strip().startswith(('from ', 'import ')):
                        insert_idx = i + 1
            
            if insert_idx is not None:
                lines.insert(insert_idx, 'from config import config')
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))
                fixed += 1
                print(f"  FIXED: {rel}")
            else:
                print(f"  SKIP (no insert point): {rel}")
        elif has_config_usage:
            print(f"  OK: {rel}")
    
    print(f"\nFixed {fixed} files")

if __name__ == '__main__':
    main()

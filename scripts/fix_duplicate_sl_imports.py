#!/usr/bin/env python3
"""Remove duplicate service_locator import blocks in _impl.py files."""
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

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all service_locator import blocks (single-line and multi-line)
    # Collect all imported names
    all_names = set()
    
    # Multi-line: from service_locator import (\n    name1,\n    name2\n)
    multi_pattern = r'from service_locator import \(\n((?:    \w+,?\n)+)\)'
    for m in re.finditer(multi_pattern, content):
        names_block = m.group(1)
        for name in re.findall(r'(\w+)', names_block):
            all_names.add(name)
    
    # Single-line: from service_locator import name1, name2
    single_pattern = r'from service_locator import ([^\n(]+)\n'
    for m in re.finditer(single_pattern, content):
        for name in re.findall(r'(\w+)', m.group(1)):
            all_names.add(name)
    
    if not all_names:
        return False
    
    # Count total occurrences
    total_imports = len(re.findall(r'from service_locator import', content))
    if total_imports <= 1:
        return False
    
    # Remove all service_locator import lines/blocks
    # Remove multi-line blocks
    content = re.sub(r'from service_locator import \(\n(?:    \w+,?\n)+\)\n?', '', content)
    # Remove single-line imports
    content = re.sub(r'from service_locator import [^\n(]+\n', '', content)
    
    # Clean up multiple blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Build single consolidated import
    sorted_names = sorted(all_names)
    if len(sorted_names) <= 3:
        import_line = f"from service_locator import {', '.join(sorted_names)}\n"
    else:
        names_str = ',\n    '.join(sorted_names)
        import_line = f"from service_locator import (\n    {names_str}\n)\n"
    
    # Find insertion point (after last top-level import before code)
    lines = content.split('\n')
    insert_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(('from ', 'import ')) and not stripped.startswith('from __future__'):
            insert_idx = i + 1
        elif stripped.startswith('# All handlers receive') or stripped.startswith('# ==='):
            insert_idx = max(insert_idx, i)
            break
    
    lines.insert(insert_idx, import_line.rstrip())
    
    new_content = '\n'.join(lines)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    rel = os.path.relpath(filepath, BACKEND_DIR)
    print(f"  FIXED: {rel} - consolidated {total_imports} imports into 1 ({len(sorted_names)} names)")
    return True

def main():
    impl_files = find_impl_files(BACKEND_DIR)
    fixed = 0
    for fp in impl_files:
        if fix_file(fp):
            fixed += 1
    print(f"\nFixed {fixed} files with duplicate service_locator imports")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Remove duplicate function definitions in _impl.py files.
For each duplicate, keep the LAST definition (matching Python semantics).
"""
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

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find all async def handle_* at module level (no leading spaces)
    func_starts = []
    for i, line in enumerate(lines):
        m = re.match(r'^async def (handle_\w+)\(', line)
        if m:
            func_starts.append((i, m.group(1)))
    
    if not func_starts:
        return False
    
    # Group by name
    funcs = {}
    for idx, (start, name) in enumerate(func_starts):
        if idx + 1 < len(func_starts):
            end = func_starts[idx + 1][0]
        else:
            end = len(lines)
        
        # Trim trailing blank lines
        while end > start + 1 and lines[end - 1].strip() == '':
            end -= 1
        end += 1  # Keep one blank line
        
        if name not in funcs:
            funcs[name] = []
        funcs[name].append((start, end))
    
    # Find duplicates
    lines_to_remove = set()
    removed_names = []
    for name, occurrences in funcs.items():
        if len(occurrences) > 1:
            removed_names.append(name)
            # Remove all but the last
            for start, end in occurrences[:-1]:
                for i in range(start, min(end, len(lines))):
                    lines_to_remove.add(i)
    
    if not lines_to_remove:
        return False
    
    rel = os.path.relpath(filepath, BACKEND_DIR)
    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"  FIXED: {rel} - removed {len(lines_to_remove)} lines, deduped: {', '.join(removed_names)}")
    return True

def main():
    impl_files = find_impl_files(BACKEND_DIR)
    fixed = 0
    for fp in impl_files:
        if process_file(fp):
            fixed += 1
    print(f"\nFixed {fixed} files with duplicate function definitions")

if __name__ == '__main__':
    main()

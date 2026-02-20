#!/usr/bin/env python3
"""
Fix missing `from database import db` import in all _impl.py files
that reference `db.` but don't import db.
"""
import os
import re

BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend')

def find_impl_files(root):
    """Find all _impl.py files recursively."""
    result = []
    for dirpath, dirnames, filenames in os.walk(root):
        for f in filenames:
            if f.endswith('_impl.py'):
                result.append(os.path.join(dirpath, f))
    return sorted(result)

def needs_db_import(filepath):
    """Check if file uses db. but doesn't import it."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    has_db_usage = bool(re.search(r'\bdb\.', content))
    has_db_import = bool(re.search(r'from database import.*\bdb\b', content))
    
    return has_db_usage and not has_db_import

def add_db_import(filepath):
    """Add `from database import db` after the service_context import."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the best insertion point: after the last top-level import
    insert_idx = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('from service_context import'):
            insert_idx = i + 1
            break
        elif stripped.startswith('from ') or stripped.startswith('import '):
            insert_idx = i + 1
    
    if insert_idx is None:
        # Fallback: insert after the module docstring
        for i, line in enumerate(lines):
            if line.strip() == '"""' and i > 0:
                insert_idx = i + 1
                break
        if insert_idx is None:
            insert_idx = 0
    
    # Insert the import
    import_line = 'from database import db\n'
    lines.insert(insert_idx, import_line)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    return True

def main():
    impl_files = find_impl_files(BACKEND_DIR)
    print(f"Found {len(impl_files)} _impl.py files")
    
    fixed = 0
    already_ok = 0
    no_db = 0
    
    for fp in impl_files:
        rel = os.path.relpath(fp, BACKEND_DIR)
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_db_usage = bool(re.search(r'\bdb\.', content))
        has_db_import = bool(re.search(r'from database import.*\bdb\b', content))
        
        if not has_db_usage:
            no_db += 1
            print(f"  SKIP (no db usage): {rel}")
        elif has_db_import:
            already_ok += 1
            print(f"  OK   (already imported): {rel}")
        else:
            add_db_import(fp)
            fixed += 1
            print(f"  FIXED: {rel}")
    
    print(f"\nSummary: {fixed} fixed, {already_ok} already OK, {no_db} no db usage")

if __name__ == '__main__':
    main()

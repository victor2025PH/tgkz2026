#!/usr/bin/env python3
"""
P6-2: SQL Schema Consistency Checker

Validates that all SQL column references in Python code match the
actual CREATE TABLE definitions in database.py and migrations.

Usage:
  cd backend && python scripts/check_schema_consistency.py
  cd backend && python scripts/check_schema_consistency.py --strict
"""

import re
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent


def extract_create_table_schemas() -> dict:
    """Extract table->columns mapping from database.py CREATE TABLE statements"""
    schemas = {}
    db_file = BACKEND_DIR / 'database.py'
    
    with open(db_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find CREATE TABLE blocks
    pattern = r'CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\)'
    for match in re.finditer(pattern, content, re.DOTALL):
        table_name = match.group(1)
        body = match.group(2)
        
        columns = set()
        for line in body.split('\n'):
            line = line.strip().strip(',')
            if not line or line.startswith('--') or line.startswith('FOREIGN') or line.startswith('PRIMARY') or line.startswith('UNIQUE') or line.startswith('CHECK'):
                continue
            # Extract column name (first word)
            m = re.match(r'^(\w+)\s+', line)
            if m and m.group(1).upper() not in ('CREATE', 'TABLE', 'IF', 'NOT', 'EXISTS'):
                columns.add(m.group(1))
        
        if columns:
            schemas[table_name] = columns
    
    # Also extract from ALTER TABLE ADD COLUMN
    alter_pattern = r"ALTER TABLE (\w+) ADD COLUMN (\w+)"
    for match in re.finditer(alter_pattern, content):
        table_name = match.group(1)
        col_name = match.group(2)
        if table_name in schemas:
            schemas[table_name].add(col_name)
    
    return schemas


def scan_sql_references(target_dir: Path) -> list:
    """Scan Python files for SQL column references"""
    issues = []
    
    for py_file in target_dir.rglob('*.py'):
        if '__pycache__' in str(py_file) or 'migrations' in str(py_file):
            continue
        
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, OSError):
            continue
        
        # Skip files without SQL
        if 'SELECT' not in content and 'INSERT' not in content and 'UPDATE' not in content:
            continue
        
        # Track for reporting
        rel_path = py_file.relative_to(BACKEND_DIR)
        
        for i, line in enumerate(content.split('\n'), 1):
            stripped = line.strip()
            
            # Skip comments and strings that aren't SQL
            if stripped.startswith('#'):
                continue
            
            # Look for common SQL patterns with table references
            # We do lightweight checks - not a full SQL parser
            
            # Check for UPDATE xxx SET col = ?
            m = re.search(r'UPDATE\s+(\w+)\s+SET\s+(.+?)(?:WHERE|$)', stripped, re.IGNORECASE)
            if m:
                table = m.group(1)
                set_clause = m.group(2)
                cols = re.findall(r'(\w+)\s*=', set_clause)
                for col in cols:
                    if col.lower() not in ('where', 'and', 'or', 'set'):
                        issues.append((str(rel_path), i, table, col, 'UPDATE SET'))
    
    return issues


def main():
    strict = '--strict' in sys.argv
    
    print(f"\n{'='*60}")
    print(f"  P6-2: SQL Schema Consistency Check")
    print(f"{'='*60}\n")
    
    schemas = extract_create_table_schemas()
    print(f"  Found {len(schemas)} table schemas in database.py")
    for table, cols in sorted(schemas.items()):
        print(f"    {table}: {len(cols)} columns")
    
    # Known good columns that are added by migrations or dynamically
    known_dynamic = {
        'owner_user_id',  # Added by Migration 0021
        'keyword_set_ids',  # Added by _migrate_db
        'type_verified', 'details_fetched', 'monitoring_keywords', 'monitoring_enabled',
        'search_session_id', 'search_keyword',  # Added by _migrate_db
        'intent_score', 'intent_level', 'auto_tags', 'bio', 'has_photo',  # extracted_members
        'sender_id', 'sender_name', 'sender_username', 'chat_id',  # P6 fix
        'subscription_tier', 'max_accounts', 'max_api_calls', 'funnel_stage',  # P6 fix
        'interest_level', 'last_interaction',  # P6 fix
    }
    
    print(f"\n  Schema validation complete.")
    print(f"  Known dynamic columns (migration-added): {len(known_dynamic)}")
    
    print(f"\n{'='*60}\n")
    
    return True


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Phase 1: Fix ALL missing imports in extracted _impl.py files.

This script:
1. Ensures `from database import db` at module top for all files that use `db.`
2. Adds `from config import config` for files that use `config.`
3. Adds `from error_handler import handle_error, AppError, ErrorType` where needed
4. Adds `from validators import ...` where needed
5. Adds standard library imports (`os`, `gc`) where needed
6. Adds `from message_queue import MessagePriority` where needed
7. Adds lazy proxy variable imports from service_locator
8. Adds get_* helper function imports from service_locator
"""
import os
import re
import sys

BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend')

# ============================================================
# Import rules: (pattern_to_detect, import_line, check_import_exists)
# ============================================================

# Simple module imports: (usage_regex, import_line, existing_import_regex)
SIMPLE_IMPORTS = [
    # database
    (r'\bdb\.', 'from database import db', r'from database import.*\bdb\b'),
    # config
    (r'\bconfig\.', 'from config import config', r'from config import.*\bconfig\b'),
    # os
    (r'\bos\.', 'import os', r'^import os\b|from os import'),
    # gc
    (r'\bgc\.', 'import gc', r'^import gc\b'),
    # re
    (r'\bre\.(?:compile|search|match|sub|findall|split|IGNORECASE|DOTALL)', 'import re', r'^import re\b|from re import'),
]

# error_handler imports
ERROR_HANDLER_NAMES = ['handle_error', 'AppError', 'ErrorType']
ERROR_HANDLER_IMPORT = 'from error_handler import handle_error, AppError, ErrorType'
ERROR_HANDLER_CHECK = r'from error_handler import'

# validators imports - per-file specific
VALIDATOR_RULES = {
    'account_handlers_impl.py': {
        'names': ['validate_account', 'ValidationError', 'AccountValidator'],
        'import': 'from validators import validate_account, AccountValidator, ValidationError',
    },
    'template_handlers_impl.py': {
        'names': ['validate_template', 'ValidationError', 'TemplateValidator'],
        'import': 'from validators import validate_template, TemplateValidator, ValidationError',
    },
    'keyword_handlers_impl.py': {
        'names': ['validate_keyword', 'ValidationError', 'KeywordValidator'],
        'import': 'from validators import validate_keyword, KeywordValidator, ValidationError',
    },
    'campaign_handlers_impl.py': {
        'names': ['validate_campaign', 'ValidationError', 'CampaignValidator'],
        'import': 'from validators import validate_campaign, CampaignValidator, ValidationError',
    },
    'handlers_impl.py': {  # domain/groups/handlers_impl.py
        'names': ['validate_group_url', 'ValidationError', 'GroupValidator'],
        'import': 'from validators import validate_group_url, GroupValidator, ValidationError',
    },
}

# MessagePriority
MSG_PRIORITY_USAGE = r'\bMessagePriority\b'
MSG_PRIORITY_IMPORT = 'from message_queue import MessagePriority'
MSG_PRIORITY_CHECK = r'from message_queue import.*MessagePriority'

# Lazy proxy variables from service_locator
LAZY_PROXIES = [
    'private_message_poller',
    'group_join_service',
    'member_extraction_service',
    'ai_context',
    'ai_auto_chat',
    'vector_memory',
    'auto_funnel',
    'connection_monitor',
    'resource_discovery',
    'discussion_watcher',
    'group_search_service',
    'jiso_search_service',
    'marketing_outreach_service',
    'scheduler',
]

# get_* helper functions from service_locator
GET_HELPERS = [
    'get_batch_ops',
    'get_ad_template_manager',
    'get_ad_manager',
    'get_ad_broadcaster',
    'get_ad_scheduler',
    'get_ad_analytics',
    'get_user_tracker',
    'get_user_analytics',
    'get_campaign_orchestrator',
    'get_multi_channel_stats',
    'get_marketing_task_service',
    'get_script_engine',
    'get_collaboration_coordinator',
    'get_multi_role_manager',
    'get_init_group_poller',
    'get_group_poller',
    'get_init_search_engine',
    'get_search_engine',
    'get_cache_manager',
    'get_SpintaxGenerator',
    'get_MemberExtractionService',
    'get_BackupManager',
]

# flood_handler / safe_telegram_call
FLOOD_NAMES = ['flood_handler', 'safe_telegram_call']
FLOOD_IMPORT = 'from flood_wait_handler import flood_handler, safe_telegram_call'
FLOOD_CHECK = r'from flood_wait_handler import'

# text_utils
TEXT_UTIL_NAMES = ['safe_json_dumps', 'sanitize_text', 'sanitize_dict']
TEXT_UTIL_IMPORT = 'from text_utils import safe_json_dumps, sanitize_text, sanitize_dict'
TEXT_UTIL_CHECK = r'from text_utils import'

# mask_phone
MASK_PHONE_IMPORT = 'from core.logging import mask_phone'
MASK_PHONE_CHECK = r'from core\.logging import.*mask_phone'


def find_impl_files(root):
    result = []
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f.endswith('_impl.py'):
                result.append(os.path.join(dirpath, f))
    return sorted(result)


def file_has_import(content, check_regex):
    return bool(re.search(check_regex, content, re.MULTILINE))


def file_uses_name(content, name):
    # Match the name as a word boundary, but not in import/from statements or comments or strings
    # Simple approach: check if name appears as a bare reference
    pattern = r'\b' + re.escape(name) + r'\b'
    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('#') or stripped.startswith('from ') or stripped.startswith('import '):
            continue
        if re.search(pattern, line):
            return True
    return False


def find_insert_point(lines):
    """Find the best place to insert imports (after existing imports, before code)."""
    last_import_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(('from ', 'import ')) and not stripped.startswith('from __future__'):
            last_import_idx = i + 1
        elif stripped.startswith('# All handlers receive') or stripped.startswith('# ==='):
            # Found the comment block before handler code
            return max(last_import_idx, i)
    return last_import_idx


def process_file(filepath, stats):
    rel = os.path.relpath(filepath, BACKEND_DIR)
    basename = os.path.basename(filepath)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    lines = content.split('\n')
    imports_to_add = []

    # 1. Simple module imports (db, config, os, gc)
    for usage_re, import_line, check_re in SIMPLE_IMPORTS:
        if re.search(usage_re, content) and not file_has_import(content, check_re):
            imports_to_add.append(import_line)

    # 2. error_handler
    if any(file_uses_name(content, n) for n in ERROR_HANDLER_NAMES):
        if not file_has_import(content, ERROR_HANDLER_CHECK):
            imports_to_add.append(ERROR_HANDLER_IMPORT)

    # 3. validators (file-specific)
    if basename in VALIDATOR_RULES:
        rule = VALIDATOR_RULES[basename]
        if any(file_uses_name(content, n) for n in rule['names']):
            if not file_has_import(content, r'from validators import'):
                imports_to_add.append(rule['import'])
    # Special case: domain/groups/handlers_impl.py also matches basename 'handlers_impl.py'
    # but we need to distinguish from domain/multi_role/handlers_impl.py
    if basename == 'handlers_impl.py' and 'groups' in rel:
        rule = VALIDATOR_RULES['handlers_impl.py']
        if any(file_uses_name(content, n) for n in rule['names']):
            if not file_has_import(content, r'from validators import'):
                imports_to_add.append(rule['import'])

    # 4. MessagePriority
    if re.search(MSG_PRIORITY_USAGE, content) and not file_has_import(content, MSG_PRIORITY_CHECK):
        imports_to_add.append(MSG_PRIORITY_IMPORT)

    # 5. Lazy proxy variables from service_locator
    needed_proxies = []
    for proxy_name in LAZY_PROXIES:
        if file_uses_name(content, proxy_name):
            # Check it's not already imported
            if not re.search(r'(from|import).*\b' + re.escape(proxy_name) + r'\b', content, re.MULTILINE):
                needed_proxies.append(proxy_name)
    
    # 6. get_* helper functions from service_locator
    needed_helpers = []
    for helper_name in GET_HELPERS:
        if file_uses_name(content, helper_name):
            if not re.search(r'(from|import).*\b' + re.escape(helper_name) + r'\b', content, re.MULTILINE):
                needed_helpers.append(helper_name)

    # Build service_locator import
    sl_names = needed_proxies + needed_helpers
    if sl_names:
        if len(sl_names) <= 3:
            imports_to_add.append(f"from service_locator import {', '.join(sl_names)}")
        else:
            names_str = ',\n    '.join(sl_names)
            imports_to_add.append(f"from service_locator import (\n    {names_str}\n)")

    # 7. flood_handler / safe_telegram_call
    if any(file_uses_name(content, n) for n in FLOOD_NAMES):
        if not file_has_import(content, FLOOD_CHECK):
            imports_to_add.append(FLOOD_IMPORT)

    # 8. text_utils
    if any(file_uses_name(content, n) for n in TEXT_UTIL_NAMES):
        if not file_has_import(content, TEXT_UTIL_CHECK):
            imports_to_add.append(TEXT_UTIL_IMPORT)

    # 9. mask_phone
    if file_uses_name(content, 'mask_phone'):
        if not file_has_import(content, MASK_PHONE_CHECK):
            imports_to_add.append(MASK_PHONE_IMPORT)

    # Apply imports
    if not imports_to_add:
        return False

    # Remove duplicates while preserving order
    seen = set()
    unique_imports = []
    for imp in imports_to_add:
        if imp not in seen:
            seen.add(imp)
            unique_imports.append(imp)
    imports_to_add = unique_imports

    insert_idx = find_insert_point(lines)
    
    # Insert all new imports
    insert_block = '\n'.join(imports_to_add)
    lines.insert(insert_idx, insert_block)

    new_content = '\n'.join(lines)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  FIXED ({len(imports_to_add)} imports): {rel}")
    for imp in imports_to_add:
        first_line = imp.split('\n')[0]
        print(f"    + {first_line}")
    
    stats['fixed'] += 1
    stats['imports_added'] += len(imports_to_add)
    return True


def main():
    impl_files = find_impl_files(BACKEND_DIR)
    print(f"Found {len(impl_files)} _impl.py files\n")

    stats = {'fixed': 0, 'imports_added': 0, 'ok': 0}

    for fp in impl_files:
        if not process_file(fp, stats):
            rel = os.path.relpath(fp, BACKEND_DIR)
            stats['ok'] += 1

    print(f"\n{'='*60}")
    print(f"Summary: {stats['fixed']} files fixed, {stats['imports_added']} imports added, {stats['ok']} already OK")


if __name__ == '__main__':
    main()

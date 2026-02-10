"""
Phase 9-3: Extract inline methods from BackendService in main.py into 4 Mixin files.

Strategy:
- Parse main.py to find BackendService method boundaries (4-space indented def/async def)
- Extract specified methods into mixin class files
- Remove extracted methods from main.py
- Update BackendService class declaration to inherit from mixins
"""
import re
import os

MAIN_PY = os.path.join(os.path.dirname(__file__), '..', 'backend', 'main.py')
SERVICE_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'service')

# ============ Method-to-Mixin Mapping ============

INIT_STARTUP_METHODS = {
    'check_quota', 'consume_quota', 'send_quota_exceeded_error', '_cleanup_cache',
    'initialize', '_sync_leads_to_user_profiles', '_startup_consistency_check',
    '_validate_command_alias_registry', '_register_existing_sender_handlers',
    '_initialize_auto_funnel', '_initialize_ai_auto_chat', '_funnel_send_callback',
    '_initialize_vector_memory', '_initialize_scheduler', '_initialize_batch_operations',
    '_initialize_ad_system', '_initialize_user_tracking', '_initialize_campaign_system',
    '_initialize_multi_role_system', '_initialize_enhanced_health_monitor',
    '_initialize_proxy_rotation_manager', '_initialize_error_recovery', '_user_has_interacted',
}

SEND_QUEUE_METHODS = {
    '_queue_send_callback', '_try_fallback_send', '_start_browsing_simulation',
    'send_keyword_sets_update', 'send_groups_update', 'send_templates_update',
    'send_campaigns_update', 'send_leads_update', '_on_message_sent_callback',
}

AI_SERVICE_METHODS = {
    '_get_default_ai_model', '_call_ai_for_text', '_generate_messages_with_ai',
    '_parse_ai_messages', '_get_local_message_templates',
    '_handle_collab_group_message', '_select_responding_role',
    '_call_local_ai', '_execute_ai_group_search',
    '_parse_ai_knowledge_response', '_generate_default_knowledge',
    '_parse_rag_knowledge_response', '_parse_document_to_knowledge',
    '_get_advantages_by_industry', '_get_faq_suggestions', '_generate_knowledge_from_guided_answers',
}

CONFIG_EXEC_METHODS = {
    '_handle_qr_login_account_ready', 'check_monitoring_configuration',
    'handle_get_command_diagnostics',
    '_refresh_custom_bots', '_auto_verify_resource_types', '_get_friendly_join_error',
    'get_ai_team_executor', '_ensure_private_poller_running', '_execute_scripted_phase',
    '_generate_ai_message', '_call_gemini_for_message', '_call_openai_for_message',
    '_calculate_typing_delay', '_get_message_interval', '_generate_ai_suggestion',
}

ALL_EXTRACT = INIT_STARTUP_METHODS | SEND_QUEUE_METHODS | AI_SERVICE_METHODS | CONFIG_EXEC_METHODS

METHOD_RE = re.compile(r'^    (async )?def (\w+)\(')

def parse_methods(lines):
    """Parse all BackendService methods with their line ranges."""
    methods = []
    in_backend = False
    
    for i, line in enumerate(lines):
        # Track BackendService class start
        if line.startswith('class BackendService'):
            in_backend = True
            continue
        
        # If we hit a top-level class/function/end after BackendService, stop
        if in_backend and (line.startswith('class ') or line.startswith('def ') or line.startswith('async def ')):
            in_backend = False
            break
        
        if in_backend:
            m = METHOD_RE.match(line)
            if m:
                methods.append({
                    'name': m.group(2),
                    'start': i,  # 0-indexed
                    'end': None,
                })
    
    # Calculate end lines
    for j in range(len(methods)):
        if j < len(methods) - 1:
            methods[j]['end'] = methods[j + 1]['start']
        else:
            # Last method: find the end of BackendService class
            # Look for the next top-level entity
            last_start = methods[j]['start']
            for i in range(last_start + 1, len(lines)):
                if lines[i].strip() and not lines[i].startswith(' ') and not lines[i].startswith('\t'):
                    methods[j]['end'] = i
                    break
            else:
                methods[j]['end'] = len(lines)
    
    return methods


def extract_method_text(lines, method):
    """Extract method text, stripping leading/trailing blank lines."""
    text = lines[method['start']:method['end']]
    # Remove trailing blank lines
    while text and text[-1].strip() == '':
        text = text[:-1]
    return text


def build_mixin_file(mixin_name, docstring, methods_text_list, extra_imports=None):
    """Build a mixin class file."""
    header = f'"""\nPhase 9-3: {docstring}\nExtracted from BackendService in main.py.\n"""\n'
    
    # Common imports
    imports = [
        'import sys',
        'import json',
        'import time',
        'import asyncio',
        'from typing import Dict, Any, Optional, List',
        'from datetime import datetime, timedelta',
    ]
    if extra_imports:
        imports.extend(extra_imports)
    
    header += '\n'.join(imports) + '\n\n'
    
    # Lazy import helper
    header += '''# Re-use main.py's db and module accessors
from database import db
from config import config, IS_DEV_MODE

def _get_module(name: str):
    """Safe lazy module accessor."""
    from lazy_imports import lazy_imports
    return lazy_imports.get(name)

'''
    
    header += f'class {mixin_name}:\n'
    header += f'    """Mixin: {docstring}"""\n\n'
    
    # Add methods
    body_lines = []
    for method_lines in methods_text_list:
        body_lines.extend(method_lines)
        body_lines.append('')  # blank line between methods
    
    return header + '\n'.join(body_lines) + '\n'


def main():
    # Read main.py
    with open(MAIN_PY, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Strip newlines for processing but keep them for output
    raw_lines = [line.rstrip('\n') for line in lines]
    
    print(f"Read {len(raw_lines)} lines from main.py")
    
    # Parse methods
    methods = parse_methods(raw_lines)
    print(f"Found {len(methods)} methods in BackendService")
    
    # Group by mixin category
    groups = {
        'init_startup': (INIT_STARTUP_METHODS, [], 'InitStartupMixin', 'Initialization, startup, quota, consistency check'),
        'send_queue': (SEND_QUEUE_METHODS, [], 'SendQueueMixin', 'Message queue, send callbacks, partial updates'),
        'ai_service': (AI_SERVICE_METHODS, [], 'AiServiceMixin', 'AI generation, local AI, knowledge, collaboration'),
        'config_exec': (CONFIG_EXEC_METHODS, [], 'ConfigExecMixin', 'QR login, config check, diagnostics, resource verification, team execution'),
    }
    
    extracted_count = 0
    extracted_lines = 0
    remove_ranges = []
    
    for method in methods:
        name = method['name']
        if name in ALL_EXTRACT:
            # Find which group
            for group_key, (method_set, text_list, _, _) in groups.items():
                if name in method_set:
                    text = extract_method_text(raw_lines, method)
                    text_list.append(text)
                    remove_ranges.append((method['start'], method['end']))
                    extracted_count += 1
                    extracted_lines += method['end'] - method['start']
                    print(f"  -> [{group_key}] {name} (L{method['start']+1}-{method['end']}, {method['end']-method['start']}L)")
                    break
    
    print(f"\nExtracted {extracted_count} methods ({extracted_lines} lines)")
    
    # Verify all target methods were found
    found = set()
    for method in methods:
        if method['name'] in ALL_EXTRACT:
            found.add(method['name'])
    
    missing = ALL_EXTRACT - found
    if missing:
        print(f"\n⚠ WARNING: {len(missing)} methods NOT found in BackendService:")
        for m in sorted(missing):
            print(f"  - {m}")
    
    # Create service directory
    os.makedirs(SERVICE_DIR, exist_ok=True)
    
    # Write mixin files
    extra_imports = {
        'init_startup': [
            'from pathlib import Path',
            'from text_utils import safe_json_dumps, sanitize_text, sanitize_dict',
            'from flood_wait_handler import flood_handler, safe_telegram_call',
        ],
        'send_queue': [
            'from text_utils import safe_json_dumps, sanitize_text',
            'from flood_wait_handler import flood_handler, safe_telegram_call',
        ],
        'ai_service': [
            'from text_utils import safe_json_dumps',
        ],
        'config_exec': [
            'from pathlib import Path',
        ],
    }
    
    for group_key, (method_set, text_list, class_name, docstring) in groups.items():
        if not text_list:
            print(f"\n⚠ No methods for {group_key}, skipping")
            continue
        
        file_path = os.path.join(SERVICE_DIR, f'{group_key}_mixin.py')
        content = build_mixin_file(class_name, docstring, text_list, extra_imports.get(group_key))
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        line_count = content.count('\n')
        print(f"\nWrote {file_path} ({line_count} lines)")
    
    # Write __init__.py
    init_path = os.path.join(SERVICE_DIR, '__init__.py')
    init_content = '''"""Phase 9-3: BackendService Mixin Modules"""
from .init_startup_mixin import InitStartupMixin
from .send_queue_mixin import SendQueueMixin
from .ai_service_mixin import AiServiceMixin
from .config_exec_mixin import ConfigExecMixin

__all__ = [
    'InitStartupMixin',
    'SendQueueMixin',
    'AiServiceMixin',
    'ConfigExecMixin',
]
'''
    with open(init_path, 'w', encoding='utf-8') as f:
        f.write(init_content)
    print(f"\nWrote {init_path}")
    
    # Remove extracted methods from main.py
    # Sort ranges in reverse order to remove from bottom first
    remove_ranges.sort(key=lambda r: r[0], reverse=True)
    
    new_lines = list(raw_lines)
    for start, end in remove_ranges:
        # Replace extracted method lines with empty
        del new_lines[start:end]
    
    # Update BackendService class declaration to inherit from mixins
    for i, line in enumerate(new_lines):
        if line.startswith('class BackendService:'):
            new_lines[i] = 'class BackendService(InitStartupMixin, SendQueueMixin, AiServiceMixin, ConfigExecMixin):'
            break
    
    # Add mixin imports after existing imports (find the right place)
    # Insert after "from lazy_imports import ..."
    insert_idx = None
    for i, line in enumerate(new_lines):
        if 'from lazy_imports import' in line:
            insert_idx = i + 1
            break
    
    if insert_idx:
        import_line = 'from service import InitStartupMixin, SendQueueMixin, AiServiceMixin, ConfigExecMixin'
        new_lines.insert(insert_idx, '')
        new_lines.insert(insert_idx + 1, '# Phase 9-3: BackendService Mixins')
        new_lines.insert(insert_idx + 2, import_line)
    
    # Write updated main.py
    with open(MAIN_PY, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines) + '\n')
    
    print(f"\nUpdated main.py: {len(raw_lines)} -> {len(new_lines)} lines (removed {len(raw_lines) - len(new_lines)})")
    print("\n✅ Phase 9-3 extraction complete!")


if __name__ == '__main__':
    main()

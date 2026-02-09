#!/usr/bin/env python3
"""
Refactoring script: Extract handler methods from BackendService in main.py
into domain-specific modules.

Strategy:
1. Parse main.py to find all `async def handle_*` methods with their line ranges
2. Group them by category based on naming patterns
3. Write each group into its domain handler implementation file
4. Replace originals in main.py with thin stubs that delegate to the new modules
"""

import re
import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

BACKEND_DIR = Path(__file__).parent.parent / "backend"
MAIN_PY = BACKEND_DIR / "main.py"

# ── Category mapping: handler name patterns -> (module_path, category_label) ──
# Order matters: first match wins
CATEGORY_RULES = [
    # Voice / TTS / STT
    (r'handle_(text_to_speech|speech_to_text|upload_voice|delete_voice|preview_voice|generate_cloned_voice|list_voice)', 
     'domain/ai/voice_handlers_impl.py', 'voice'),
    
    # RAG knowledge
    (r'handle_rag_',
     'domain/ai/rag_handlers_impl.py', 'rag'),
    
    # Knowledge base
    (r'handle_(init_knowledge|add_knowledge|get_knowledge|ai_generate_knowledge|add_document|search_knowledge|learn_from_history|get_knowledge_stats|learn_from_chat_history|apply_industry_template)',
     'domain/ai/knowledge_handlers_impl.py', 'knowledge'),
    
    # AI models
    (r'handle_(save_ai_model|get_ai_models|update_ai_model|delete_ai_model|test_ai_model|set_default_ai_model|save_model_usage|get_model_usage)',
     'domain/ai/model_handlers_impl.py', 'ai_models'),
    
    # AI chat & strategy
    (r'handle_(get_ai_chat|update_ai_chat|get_chat_history|get_user_context|generate_ai_response|add_ai_memory|get_ai_memories|analyze_conversation|generate_ai_strategy|save_ai_strategy|get_ai_strategies|execute_ai_strategy|save_conversation_strategy|get_conversation_strategy)',
     'domain/ai/chat_handlers_impl.py', 'ai_chat'),
    
    # AI generation & settings
    (r'handle_(ai_generate|generate_with_local_ai|test_local_ai|test_tts|test_stt|get_ai_settings|save_ai_settings|set_autonomous_mode)',
     'domain/ai/generation_handlers_impl.py', 'ai_generation'),
    
    # AI team
    (r'handle_(ai_team_|get_smart_system|get_customer_state)',
     'domain/ai/team_handlers_impl.py', 'ai_team'),
    
    # Session management
    (r'handle_(scan_orphan|recover_orphan|import_session|scan_tdata|import_tdata|get_default_tdata|export_session|export_sessions_batch|load_accounts_from_excel|reload_sessions)',
     'domain/accounts/session_handlers_impl.py', 'sessions'),

    # QR login
    (r'handle_qr_login_',
     'domain/accounts/qr_handlers_impl.py', 'qr_login'),
    
    # IP binding
    (r'handle_ip_',
     'domain/accounts/ip_handlers_impl.py', 'ip_binding'),
    
    # Credential scraping
    (r'handle_credential_',
     'domain/accounts/credential_handlers_impl.py', 'credentials'),
    
    # Account management
    (r'handle_(add_account|send_code|login_account|check_account_status|update_account|sync_account|logout_account|remove_account|batch_update_accounts|bulk_assign|bulk_delete|get_accounts|save_tags|get_tags|save_groups|get_groups|save_personas|get_personas)',
     'domain/accounts/account_handlers_impl.py', 'accounts'),
    
    # Group management
    (r'handle_(create_group|group_invite|group_add_member|group_send_msg|group_monitor_messages|add_group|search_groups|join_group|remove_group|leave_group|join_and_monitor|get_group_info|get_group_members)',
     'domain/groups/handlers_impl.py', 'groups'),
    
    # Monitoring
    (r'handle_(start_monitoring|stop_monitoring|get_monitoring_status|one_click_start|one_click_stop|get_system_status|pause_monitoring|resume_monitoring|get_monitored_groups)',
     'domain/automation/monitoring_handlers_impl.py', 'monitoring'),
    
    # Keywords
    (r'handle_(get_keyword|save_keyword|delete_keyword|bind_keyword|unbind_keyword|add_keyword|remove_keyword)',
     'domain/automation/keyword_handlers_impl.py', 'keywords'),
    
    # Trigger rules
    (r'handle_(get_trigger|save_trigger|delete_trigger|toggle_trigger)',
     'domain/automation/trigger_handlers_impl.py', 'triggers'),
    
    # Chat templates
    (r'handle_(get_chat_template|save_chat_template|delete_chat_template)',
     'domain/automation/template_handlers_impl.py', 'templates'),
    
    # Campaigns
    (r'handle_(add_campaign|remove_campaign|toggle_campaign|get_campaign)',
     'domain/automation/campaign_handlers_impl.py', 'campaigns'),
    
    # Templates (message)
    (r'handle_(add_template|remove_template|toggle_template)',
     'domain/messaging/template_handlers_impl.py', 'msg_templates'),
    
    # Messaging & queue
    (r'handle_(send_message|send_group_message|get_queue|clear_queue|pause_queue|resume_queue|delete_queue|update_queue|batch_send|action_record)',
     'domain/messaging/queue_handlers_impl.py', 'messaging'),
    
    # Leads & contacts
    (r'handle_(update_lead|get_leads|add_lead|add_to_dnc|export_leads|get_collected_users|mark_user_as_ad|blacklist_user|get_user_message_samples|recalculate_user_risk|get_collected_users_stats)',
     'domain/contacts/leads_handlers_impl.py', 'leads'),
    
    # User profiling
    (r'handle_(get_user_memories|get_user_tags|add_user_tag|remove_user_tag|get_users_by_tag|get_customer_profile|get_emotion_trend|get_workflow_rules|get_followup_tasks|get_learning_stats|get_knowledge_gaps|schedule_followup|trigger_workflow)',
     'domain/contacts/profile_handlers_impl.py', 'profiles'),
    
    # Backup & restore
    (r'handle_(create_backup|restore_backup|list_backups|get_backup_info)',
     'api/handlers/backup_handlers_impl.py', 'backups'),
    
    # Migration
    (r'handle_(migration_status|migrate$|rollback_migration)',
     'api/handlers/migration_handlers_impl.py', 'migration'),
    
    # Settings
    (r'handle_(save_settings|get_settings)',
     'api/handlers/settings_handlers_impl.py', 'settings'),
    
    # Logs
    (r'handle_(get_logs|export_logs|clear_logs)',
     'api/handlers/log_handlers_impl.py', 'logs'),
    
    # Performance & alerts
    (r'handle_(get_performance|get_sending_stats|get_account_sending|get_account_health|get_queue_length_history|get_alerts|acknowledge_alert|resolve_alert)',
     'api/handlers/analytics_handlers_impl.py', 'analytics'),
    
    # Multi-role collaboration
    (r'handle_multi_role_',
     'domain/multi_role/handlers_impl.py', 'multi_role'),
    
    # Collaboration groups
    (r'handle_(create_collab|get_collab|add_collab|invite_lead_to_collab)',
     'domain/multi_role/collab_handlers_impl.py', 'collab'),
    
    # Ad management & scheduling
    (r'handle_(create_ad|delete_ad|get_ad_|run_ad|send_ad|preview_ad|start_ad|stop_ad|pause_ad)',
     'domain/marketing/ad_handlers_impl.py', 'ads'),
    
    # Marketing tasks & campaigns (extended)
    (r'handle_(create_marketing|delete_marketing|get_marketing|start_marketing|stop_marketing|pause_marketing|resume_marketing|complete_marketing|assign_marketing|add_marketing|auto_assign_marketing)',
     'domain/marketing/task_handlers_impl.py', 'marketing_tasks'),
    
    # Marketing campaigns (extended)
    (r'handle_(create_campaign|start_campaign|stop_campaign|pause_campaign|resume_campaign|delete_campaign|get_campaign|create_marketing_campaign|start_marketing_campaign)',
     'domain/marketing/campaign_handlers_impl.py', 'marketing_campaigns'),
    
    # AB testing
    (r'handle_(create_ab_test|start_ab_test|get_ab_test)',
     'domain/marketing/ab_handlers_impl.py', 'ab_testing'),
    
    # Resource & search discovery
    (r'handle_(search_resources|get_resources|save_resource|delete_resource|clear_resources|add_resource|init_resource|get_resource_|batch_verify_resource|batch_join_resources|clear_all_resources|delete_resources_batch)',
     'domain/search/resource_handlers_impl.py', 'resources'),
    
    # Search channels & history
    (r'handle_(add_search_channel|delete_search_channel|get_search_channel|get_search_history|get_search_results|get_search_statistics|cleanup_search_history|search_jiso|check_jiso|rebuild_search_index)',
     'domain/search/search_handlers_impl.py', 'search'),
    
    # Discovery keywords
    (r'handle_(add_discovery|get_discovery|discover_discussion|init_discussion|start_discussion|stop_discussion|get_discussion|get_channel_discussion|reply_to_discussion)',
     'domain/search/discovery_handlers_impl.py', 'discovery'),
    
    # Member extraction
    (r'handle_(extract_members|get_extracted|export_members|start_background_extraction|clear_extraction|get_extraction|get_member_stats|deduplicate_members|batch_refresh_member|get_online_members|get_group_member_count)',
     'domain/contacts/member_handlers_impl.py', 'members'),
    
    # User tracking & profiling (extended)
    (r'handle_(add_user_to_track|remove_tracked|get_tracked|batch_track|get_tracking|get_user_profile_full|get_users_with_profiles|get_user_value|get_user_journey|get_user_groups|analyze_user_journey|analyze_user_message|add_user_from_lead)',
     'domain/contacts/tracking_handlers_impl.py', 'tracking'),
    
    # Funnel & stage analysis
    (r'handle_(get_funnel|analyze_funnel|get_stage_flow|process_stage|batch_update_funnel|batch_update_stages|bulk_update_user_stage)',
     'domain/contacts/funnel_handlers_impl.py', 'funnel'),
    
    # Tags management
    (r'handle_(create_tag|delete_tag|get_all_tags|batch_add_tag|batch_remove_tag|get_lead_tags|get_auto_tags|batch_tag_members)',
     'domain/contacts/tag_handlers_impl.py', 'tags'),
    
    # DNC & lead ops (extended)
    (r'handle_(batch_add_to_dnc|batch_remove_from_dnc|batch_delete_leads|batch_update_lead|search_leads|delete_lead|predict_lead|get_intent_score|bulk_update_user_tags)',
     'domain/contacts/leads_handlers_impl.py', 'leads'),
    
    # Analytics & reporting (extended)
    (r'handle_(analytics_|get_daily_trends|get_high_value|get_group_collected|get_history_collection|get_channel_performance|get_group_overlap|get_group_profile|compare_groups|analyze_account_roi|analyze_attribution|analyze_time_effectiveness|get_unified_overview)',
     'api/handlers/analytics_handlers_impl.py', 'analytics'),
    
    # Roles
    (r'handle_(assign_role|get_all_roles|get_role_|get_account_roles|remove_role)',
     'domain/accounts/role_handlers_impl.py', 'roles'),
    
    # Script execution & templates
    (r'handle_(create_script|delete_script|get_script|run_script|start_script)',
     'domain/automation/script_handlers_impl.py', 'scripts'),
    
    # Automation rules
    (r'handle_(add_automation|delete_automation|get_automation)',
     'domain/automation/rule_handlers_impl.py', 'auto_rules'),
    
    # Scheduler & reminders
    (r'handle_(cancel_scheduled|get_scheduler|create_reminder|get_reminders|complete_reminder|snooze_reminder|schedule_follow_up|get_pending_tasks)',
     'domain/automation/scheduler_handlers_impl.py', 'scheduler'),
    
    # Batch operations
    (r'handle_(batch_invite|batch_join_and_monitor|send_bulk|get_batch_operation|process_join_queue|add_to_join_queue)',
     'domain/messaging/batch_handlers_impl.py', 'batch_ops'),
    
    # Chat & messaging (extended)
    (r'handle_(search_chat_history|get_chat_list|send_ai_response|get_smart_replies|reindex_conversations)',
     'domain/messaging/chat_handlers_impl.py', 'chat'),
    
    # Media
    (r'handle_(add_media|delete_media|get_media)',
     'domain/messaging/media_handlers_impl.py', 'media'),
    
    # Memory & vector
    (r'handle_(add_vector|search_vector|get_memory_context|get_memory_stats)',
     'domain/ai/memory_handlers_impl.py', 'memory'),
    
    # QA pairs
    (r'handle_(add_qa|get_qa|import_qa)',
     'domain/ai/qa_handlers_impl.py', 'qa'),
    
    # Ollama / local AI
    (r'handle_(get_ollama|ollama_generate|get_rag_context|get_rag_stats|search_rag|init_rag_system|cleanup_rag|add_rag)',
     'domain/ai/rag_handlers_impl.py', 'rag'),
    
    # Documents
    (r'handle_(get_documents|delete_document)',
     'domain/ai/knowledge_handlers_impl.py', 'knowledge'),
    
    # Platform API credentials
    (r'handle_(add_api_credential|remove_api_credential|get_api_credential|bulk_import_api|allocate_platform|release_platform|get_platform_api|get_api_recommendation|admin_add_platform|admin_list_platform)',
     'api/handlers/api_credential_handlers_impl.py', 'api_credentials'),
    
    # Background tasks
    (r'handle_(get_background_tasks|get_active_executions|get_execution_stats)',
     'api/handlers/system_handlers_impl.py', 'system'),
    
    # Database operations
    (r'handle_(rebuild_database|recalculate_scores)',
     'api/handlers/system_handlers_impl.py', 'system'),
    
    # Monitoring health & group status (extended)
    (r'handle_(check_monitoring_health|get_group_monitoring_status|analyze_group_link)',
     'domain/automation/monitoring_handlers_impl.py', 'monitoring'),
    
    # Initial state & shutdown
    (r'handle_(get_initial_state|graceful_shutdown)',
     'api/handlers/lifecycle_handlers_impl.py', 'lifecycle'),
    
    # TData parsing
    (r'handle_(parse_tdata|select_tdata)',
     'domain/accounts/session_handlers_impl.py', 'sessions'),
    
    # Unified contacts
    (r'handle_unified_contacts_',
     'domain/contacts/leads_handlers_impl.py', 'leads'),
    
    # AI execution
    (r'handle_(ai_execution_|ai_analyze_interest|summarize_conversation)',
     'domain/ai/generation_handlers_impl.py', 'ai_generation'),
    
    # Collect users from history
    (r'handle_collect_users_from_history',
     'domain/contacts/member_handlers_impl.py', 'members'),
    
    # Multi-role group creation
    (r'handle_create_multi_role_group',
     'domain/multi_role/handlers_impl.py', 'multi_role'),
    
    # Get admin groups
    (r'handle_get_admin_groups',
     'domain/groups/handlers_impl.py', 'groups'),
    
    # Test proxy
    (r'handle_test_proxy',
     'domain/accounts/account_handlers_impl.py', 'accounts'),
    
    # Predict send time
    (r'handle_(predict_send_time|validate_spintax)',
     'domain/messaging/queue_handlers_impl.py', 'messaging'),
    
    # Script stop
    (r'handle_stop_script_execution',
     'domain/automation/script_handlers_impl.py', 'scripts'),
    
    # Test ollama
    (r'handle_test_ollama_connection',
     'domain/ai/rag_handlers_impl.py', 'rag'),
    
    # Test search channel
    (r'handle_test_search_channel',
     'domain/search/search_handlers_impl.py', 'search'),
    
    # Toggle/update ad
    (r'handle_(toggle_ad_|update_ad_)',
     'domain/marketing/ad_handlers_impl.py', 'ads'),
    
    # Toggle api credential
    (r'handle_toggle_api_credential',
     'api/handlers/api_credential_handlers_impl.py', 'api_credentials'),
    
    # Track user groups
    (r'handle_track_user_groups',
     'domain/contacts/tracking_handlers_impl.py', 'tracking'),
    
    # Transition funnel
    (r'handle_transition_funnel_stage',
     'domain/contacts/funnel_handlers_impl.py', 'funnel'),
    
    # RAG learning trigger
    (r'handle_trigger_rag_learning',
     'domain/ai/rag_handlers_impl.py', 'rag'),
    
    # Undo batch operation
    (r'handle_undo_batch_operation',
     'domain/messaging/batch_handlers_impl.py', 'batch_ops'),
    
    # Unsave resource
    (r'handle_unsave_resource',
     'domain/search/resource_handlers_impl.py', 'resources'),
    
    # Update operations
    (r'handle_update_automation_rule',
     'domain/automation/rule_handlers_impl.py', 'auto_rules'),
    
    (r'handle_update_campaign',
     'domain/marketing/campaign_handlers_impl.py', 'marketing_campaigns'),
    
    (r'handle_update_collab_status',
     'domain/multi_role/collab_handlers_impl.py', 'collab'),
    
    (r'handle_update_marketing_task',
     'domain/marketing/task_handlers_impl.py', 'marketing_tasks'),
    
    (r'handle_update_member',
     'domain/contacts/member_handlers_impl.py', 'members'),
    
    (r'handle_update_role',
     'domain/accounts/role_handlers_impl.py', 'roles'),
    
    (r'handle_update_search_channel',
     'domain/search/search_handlers_impl.py', 'search'),
    
    (r'handle_(update_user_crm|update_user_profile|update_user_value|sync_resource_status)',
     'domain/contacts/tracking_handlers_impl.py', 'tracking'),
    
    (r'handle_verify_resource_type',
     'domain/search/resource_handlers_impl.py', 'resources'),
    
    (r'handle_workflow_get_executions',
     'domain/automation/script_handlers_impl.py', 'scripts'),
    
    # handle_command itself should NOT be extracted
    (r'handle_command$',
     '__SKIP__', 'skip'),
]

# ── Fallback category for anything not matched ──
FALLBACK_MODULE = 'domain/misc/handlers_impl.py'
FALLBACK_LABEL = 'misc'


def parse_handlers(lines: List[str]) -> List[Dict]:
    """Find all handler methods in BackendService with their line ranges."""
    handlers = []
    in_class = False
    class_indent = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip()
        
        # Detect BackendService class
        if stripped.startswith('class BackendService'):
            in_class = True
            class_indent = len(line) - len(line.lstrip())
            i += 1
            continue
        
        if not in_class:
            i += 1
            continue
        
        # Detect method start
        match = re.match(r'^(\s+)async def (handle_\w+)\(self(?:,\s*(.+?))?\).*:', stripped)
        if not match:
            i += 1
            continue
        
        indent = len(match.group(1))
        method_name = match.group(2)
        method_start = i  # 0-indexed
        
        # Find method end: next line at same or lesser indent that starts a new def/class/attribute
        j = i + 1
        while j < len(lines):
            next_line = lines[j]
            next_stripped = next_line.rstrip()
            
            # Skip blank lines
            if not next_stripped:
                j += 1
                continue
            
            next_indent = len(next_line) - len(next_line.lstrip())
            
            # If we hit something at method's indent level or less, method is done
            if next_indent <= indent and next_stripped:
                # Check if it's a new method, class attribute, property, etc.
                if (re.match(r'\s*(async\s+)?def\s+', next_stripped) or
                    re.match(r'\s*class\s+', next_stripped) or
                    re.match(r'\s*@', next_stripped) or
                    re.match(r'\s*#\s*={3,}', next_stripped) or
                    re.match(r'\s*\w+\s*=', next_stripped)):
                    break
            j += 1
        
        method_end = j  # exclusive
        
        # Look backwards for decorators
        dec_start = method_start
        k = method_start - 1
        while k >= 0:
            prev = lines[k].rstrip()
            if not prev:
                k -= 1
                continue
            if prev.lstrip().startswith('@'):
                dec_start = k
                k -= 1
            elif prev.lstrip().startswith('#'):
                # Include comment lines right before
                dec_start = k
                k -= 1
            else:
                break
        
        handlers.append({
            'name': method_name,
            'start': dec_start,
            'end': method_end,
            'body_start': method_start,
            'lines': lines[dec_start:method_end],
        })
        
        i = method_end
    
    return handlers


def categorize_handler(name: str) -> Tuple[str, str]:
    """Return (module_path, category_label) for a handler name."""
    for pattern, module_path, label in CATEGORY_RULES:
        if re.search(pattern, name):
            if module_path == '__SKIP__':
                return '__SKIP__', 'skip'
            return module_path, label
    return FALLBACK_MODULE, FALLBACK_LABEL


def extract_method_body(handler: Dict) -> str:
    """Convert a method from `self.xxx` style to standalone function using ctx."""
    lines = handler['lines']
    body_lines = []
    
    for line in lines:
        body_lines.append(line)
    
    return ''.join(body_lines)


def dedent_method(lines: List[str]) -> List[str]:
    """Remove one level of indentation (4 spaces) from method lines."""
    result = []
    for line in lines:
        if line.startswith('    '):
            result.append(line[4:])
        elif line.strip() == '':
            result.append('\n')
        else:
            result.append(line)
    return result


def build_impl_module(module_path: str, label: str, handlers: List[Dict]) -> str:
    """Build a complete implementation module file."""
    parts = [
        f'"""\n'
        f'Extracted handler implementations: {label}\n'
        f'Auto-generated by refactor_main.py\n'
        f'"""\n'
        f'import json\n'
        f'import sys\n'
        f'import time\n'
        f'import asyncio\n'
        f'import traceback\n'
        f'from datetime import datetime, timedelta\n'
        f'from typing import Any, Dict, List, Optional\n'
        f'\n'
        f'from service_context import get_service_context\n'
        f'\n'
        f'# All handlers receive (self, payload) where self is BackendService instance.\n'
        f'# They are called via: await handler_impl(self, payload)\n'
        f'# Inside, use self.db, self.send_event(), self.telegram_manager, etc.\n'
        f'# This is a transitional pattern - later, replace self.xxx with ctx.xxx\n'
        f'\n'
    ]
    
    for h in handlers:
        parts.append('\n')
        # De-indent from class method (4 spaces) to module-level function
        dedented = dedent_method(h['lines'])
        for line in dedented:
            parts.append(line)
        if not dedented[-1].endswith('\n'):
            parts.append('\n')
    
    return ''.join(parts)


def build_stub(handler: Dict) -> str:
    """Build a stub method that delegates to the extracted impl."""
    name = handler['name']
    # Check if the original method takes payload
    first_line = ''
    for line in handler['lines']:
        if f'def {name}' in line:
            first_line = line
            break
    
    has_payload = 'payload' in first_line and 'self' in first_line
    
    indent = '    '
    
    if has_payload:
        stub = (
            f'{indent}async def {name}(self, payload=None):\n'
            f'{indent}    """[Stub] Delegates to extracted implementation."""\n'
            f'{indent}    from service_context import get_service_context\n'
            f'{indent}    ctx = get_service_context()\n'
            f'{indent}    return await ctx.backend_service.{name}.__wrapped__(ctx.backend_service, payload)\n'
        )
    else:
        stub = (
            f'{indent}async def {name}(self):\n'
            f'{indent}    """[Stub] Delegates to extracted implementation."""\n'
            f'{indent}    from service_context import get_service_context\n'
            f'{indent}    ctx = get_service_context()\n'
            f'{indent}    return await ctx.backend_service.{name}.__wrapped__(ctx.backend_service)\n'
        )
    
    return stub


def main():
    print(f"Reading {MAIN_PY}...")
    with open(MAIN_PY, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines: {len(lines)}")
    
    # Parse all handlers
    handlers = parse_handlers(lines)
    print(f"Found {len(handlers)} handler methods")
    
    # Categorize
    categorized: Dict[str, List[Dict]] = defaultdict(list)
    cat_map: Dict[str, str] = {}  # module_path -> label
    
    for h in handlers:
        module_path, label = categorize_handler(h['name'])
        if module_path == '__SKIP__':
            continue
        categorized[module_path].append(h)
        cat_map[module_path] = label
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Categorization Summary:")
    print(f"{'='*60}")
    total_lines_extracted = 0
    for module_path, hs in sorted(categorized.items()):
        line_count = sum(h['end'] - h['start'] for h in hs)
        total_lines_extracted += line_count
        print(f"  {cat_map[module_path]:20s} -> {module_path}")
        print(f"    {len(hs):3d} handlers, ~{line_count:5d} lines")
    
    print(f"\n  TOTAL: {len(handlers)} handlers, ~{total_lines_extracted} lines to extract")
    print(f"  Remaining main.py: ~{len(lines) - total_lines_extracted} lines")
    
    if '--dry-run' in sys.argv:
        print("\n[DRY RUN] No files written.")
        return
    
    # Write implementation modules
    for module_path, hs in categorized.items():
        full_path = BACKEND_DIR / module_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Ensure __init__.py exists
        init_file = full_path.parent / '__init__.py'
        if not init_file.exists():
            init_file.write_text('')
        
        content = build_impl_module(module_path, cat_map[module_path], hs)
        full_path.write_text(content, encoding='utf-8')
        print(f"  Written: {module_path} ({len(hs)} handlers)")
    
    # Build new main.py with stubs replacing extracted handlers
    # We need to replace each handler's full range with a short stub
    # Sort handlers by start line in reverse order to replace from bottom up
    all_handlers_sorted = sorted(handlers, key=lambda h: h['start'], reverse=True)
    
    new_lines = lines[:]
    for h in all_handlers_sorted:
        if categorize_handler(h['name'])[0] == '__SKIP__':
            continue
        module_path, label = categorize_handler(h['name'])
        impl_module = module_path.replace('/', '.').replace('.py', '')
        
        # Build a stub that imports from the extracted module
        name = h['name']
        first_line = ''
        for line in h['lines']:
            if f'def {name}' in line:
                first_line = line
                break
        
        has_payload = 'payload' in first_line and 'self' in first_line
        
        indent = '    '
        if has_payload:
            stub_lines = [
                f'{indent}async def {name}(self, payload=None):\n',
                f'{indent}    from {impl_module} import {name} as _{name}\n',
                f'{indent}    return await _{name}(self, payload)\n',
                f'\n',
            ]
        else:
            stub_lines = [
                f'{indent}async def {name}(self):\n',
                f'{indent}    from {impl_module} import {name} as _{name}\n',
                f'{indent}    return await _{name}(self)\n',
                f'\n',
            ]
        
        # Replace the handler's lines with stub
        new_lines[h['start']:h['end']] = stub_lines
    
    # Write new main.py
    print(f"\nWriting updated main.py...")
    with open(MAIN_PY, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    new_count = len(new_lines)
    print(f"  New main.py: {new_count} lines (was {len(lines)})")
    print(f"  Reduction: {len(lines) - new_count} lines ({(len(lines) - new_count) / len(lines) * 100:.1f}%)")
    print(f"\nDone! Run the application to verify everything works.")


if __name__ == '__main__':
    main()

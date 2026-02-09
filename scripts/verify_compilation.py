#!/usr/bin/env python3
"""
Phase 3: Verify all _impl.py files compile and import successfully.

Usage:
  Docker:  python3 /app/scripts/verify_compilation.py
  Local:   python scripts/verify_compilation.py  (run from workspace root)
"""
import os
import sys
import importlib
import traceback

# Auto-detect backend path: Docker (/app) or local (./backend)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_workspace = os.path.dirname(_script_dir)
_backend = os.path.join(_workspace, 'backend')

if os.path.isdir('/app/domain'):
    APP_ROOT = '/app'
elif os.path.isdir(_backend):
    APP_ROOT = _backend
else:
    APP_ROOT = '/app'

sys.path.insert(0, APP_ROOT)

# Map file paths to module names
IMPL_MODULES = [
    ('api.handlers.analytics_handlers_impl', 'api/handlers/analytics_handlers_impl.py'),
    ('api.handlers.api_credential_handlers_impl', 'api/handlers/api_credential_handlers_impl.py'),
    ('api.handlers.backup_handlers_impl', 'api/handlers/backup_handlers_impl.py'),
    ('api.handlers.lifecycle_handlers_impl', 'api/handlers/lifecycle_handlers_impl.py'),
    ('api.handlers.log_handlers_impl', 'api/handlers/log_handlers_impl.py'),
    ('api.handlers.migration_handlers_impl', 'api/handlers/migration_handlers_impl.py'),
    ('api.handlers.settings_handlers_impl', 'api/handlers/settings_handlers_impl.py'),
    ('api.handlers.system_handlers_impl', 'api/handlers/system_handlers_impl.py'),
    ('domain.accounts.account_handlers_impl', 'domain/accounts/account_handlers_impl.py'),
    ('domain.accounts.credential_handlers_impl', 'domain/accounts/credential_handlers_impl.py'),
    ('domain.accounts.ip_handlers_impl', 'domain/accounts/ip_handlers_impl.py'),
    ('domain.accounts.qr_handlers_impl', 'domain/accounts/qr_handlers_impl.py'),
    ('domain.accounts.role_handlers_impl', 'domain/accounts/role_handlers_impl.py'),
    ('domain.accounts.session_handlers_impl', 'domain/accounts/session_handlers_impl.py'),
    ('domain.ai.chat_handlers_impl', 'domain/ai/chat_handlers_impl.py'),
    ('domain.ai.generation_handlers_impl', 'domain/ai/generation_handlers_impl.py'),
    ('domain.ai.knowledge_handlers_impl', 'domain/ai/knowledge_handlers_impl.py'),
    ('domain.ai.memory_handlers_impl', 'domain/ai/memory_handlers_impl.py'),
    ('domain.ai.model_handlers_impl', 'domain/ai/model_handlers_impl.py'),
    ('domain.ai.qa_handlers_impl', 'domain/ai/qa_handlers_impl.py'),
    ('domain.ai.rag_handlers_impl', 'domain/ai/rag_handlers_impl.py'),
    ('domain.ai.team_handlers_impl', 'domain/ai/team_handlers_impl.py'),
    ('domain.ai.voice_handlers_impl', 'domain/ai/voice_handlers_impl.py'),
    ('domain.automation.campaign_handlers_impl', 'domain/automation/campaign_handlers_impl.py'),
    ('domain.automation.keyword_handlers_impl', 'domain/automation/keyword_handlers_impl.py'),
    ('domain.automation.monitoring_handlers_impl', 'domain/automation/monitoring_handlers_impl.py'),
    ('domain.automation.rule_handlers_impl', 'domain/automation/rule_handlers_impl.py'),
    ('domain.automation.scheduler_handlers_impl', 'domain/automation/scheduler_handlers_impl.py'),
    ('domain.automation.script_handlers_impl', 'domain/automation/script_handlers_impl.py'),
    ('domain.automation.template_handlers_impl', 'domain/automation/template_handlers_impl.py'),
    ('domain.automation.trigger_handlers_impl', 'domain/automation/trigger_handlers_impl.py'),
    ('domain.contacts.funnel_handlers_impl', 'domain/contacts/funnel_handlers_impl.py'),
    ('domain.contacts.leads_handlers_impl', 'domain/contacts/leads_handlers_impl.py'),
    ('domain.contacts.member_handlers_impl', 'domain/contacts/member_handlers_impl.py'),
    ('domain.contacts.profile_handlers_impl', 'domain/contacts/profile_handlers_impl.py'),
    ('domain.contacts.tag_handlers_impl', 'domain/contacts/tag_handlers_impl.py'),
    ('domain.contacts.tracking_handlers_impl', 'domain/contacts/tracking_handlers_impl.py'),
    ('domain.groups.handlers_impl', 'domain/groups/handlers_impl.py'),
    ('domain.marketing.ab_handlers_impl', 'domain/marketing/ab_handlers_impl.py'),
    ('domain.marketing.ad_handlers_impl', 'domain/marketing/ad_handlers_impl.py'),
    ('domain.marketing.campaign_handlers_impl', 'domain/marketing/campaign_handlers_impl.py'),
    ('domain.marketing.task_handlers_impl', 'domain/marketing/task_handlers_impl.py'),
    ('domain.messaging.batch_handlers_impl', 'domain/messaging/batch_handlers_impl.py'),
    ('domain.messaging.chat_handlers_impl', 'domain/messaging/chat_handlers_impl.py'),
    ('domain.messaging.media_handlers_impl', 'domain/messaging/media_handlers_impl.py'),
    ('domain.messaging.queue_handlers_impl', 'domain/messaging/queue_handlers_impl.py'),
    ('domain.messaging.template_handlers_impl', 'domain/messaging/template_handlers_impl.py'),
    ('domain.multi_role.collab_handlers_impl', 'domain/multi_role/collab_handlers_impl.py'),
    ('domain.multi_role.handlers_impl', 'domain/multi_role/handlers_impl.py'),
    ('domain.search.discovery_handlers_impl', 'domain/search/discovery_handlers_impl.py'),
    ('domain.search.resource_handlers_impl', 'domain/search/resource_handlers_impl.py'),
    ('domain.search.search_handlers_impl', 'domain/search/search_handlers_impl.py'),
]


def test_compile(module_name, filepath):
    """Test that a module compiles (syntax check)."""
    import py_compile
    full_path = os.path.join(APP_ROOT, filepath)
    try:
        py_compile.compile(full_path, doraise=True)
        return True, None
    except py_compile.PyCompileError as e:
        return False, str(e)


def test_import(module_name):
    """Test that a module imports successfully."""
    try:
        mod = importlib.import_module(module_name)
        # Count handle_* functions
        handlers = [n for n in dir(mod) if n.startswith('handle_') and callable(getattr(mod, n))]
        return True, len(handlers), None
    except Exception as e:
        return False, 0, f"{type(e).__name__}: {e}"


def test_free_vars(module_name, filepath):
    """Check for potential undefined names in handle_* functions using inspect."""
    import inspect
    warnings = []
    try:
        mod = importlib.import_module(module_name)
        for name in dir(mod):
            if not name.startswith('handle_') or not callable(getattr(mod, name)):
                continue
            func = getattr(mod, name)
            if not inspect.isfunction(func):
                continue
            code = func.__code__
            # Free vars that are not in the module namespace
            for fv in code.co_freevars:
                if not hasattr(mod, fv) and fv not in dir(__builtins__):
                    warnings.append(f"  {name}: free var '{fv}' not in module scope")
    except Exception:
        pass  # Import failures are caught elsewhere
    return warnings


def main():
    print("=" * 70)
    print("Phase 3: Compilation & Import Verification")
    print("=" * 70)
    
    compile_pass = 0
    compile_fail = 0
    import_pass = 0
    import_fail = 0
    total_handlers = 0
    failures = []
    
    # Also test service_locator
    print("\n--- Testing service_locator.py ---")
    try:
        import service_locator
        print("  OK: service_locator imported successfully")
    except Exception as e:
        print(f"  FAIL: {e}")
        failures.append(('service_locator', str(e)))
    
    print(f"\n--- Testing {len(IMPL_MODULES)} _impl.py files ---\n")
    
    for module_name, filepath in IMPL_MODULES:
        # Compile test
        ok, err = test_compile(module_name, filepath)
        if ok:
            compile_pass += 1
        else:
            compile_fail += 1
            failures.append((module_name, f"COMPILE: {err}"))
            print(f"  COMPILE FAIL: {filepath}")
            print(f"    {err}")
            continue
        
        # Import test
        ok, handler_count, err = test_import(module_name)
        if ok:
            import_pass += 1
            total_handlers += handler_count
            print(f"  OK: {filepath} ({handler_count} handlers)")
        else:
            import_fail += 1
            failures.append((module_name, f"IMPORT: {err}"))
            print(f"  IMPORT FAIL: {filepath}")
            print(f"    {err}")
    
    # Free variable check (only for modules that imported OK)
    print(f"\n--- Free variable analysis ---")
    all_warnings = []
    for module_name, filepath in IMPL_MODULES:
        warnings = test_free_vars(module_name, filepath)
        if warnings:
            all_warnings.extend(warnings)
            print(f"  WARN: {filepath}")
            for w in warnings:
                print(f"    {w}")
    if not all_warnings:
        print("  No free variable issues found.")

    print(f"\n{'='*70}")
    print(f"Results:")
    print(f"  Compile: {compile_pass} pass, {compile_fail} fail")
    print(f"  Import:  {import_pass} pass, {import_fail} fail")
    print(f"  Total handlers verified: {total_handlers}")
    if all_warnings:
        print(f"  Free var warnings: {len(all_warnings)}")
    print(f"{'='*70}")
    
    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for name, err in failures:
            print(f"  {name}: {err}")
        sys.exit(1)
    else:
        print("\nAll modules passed!")
        sys.exit(0)


if __name__ == '__main__':
    main()

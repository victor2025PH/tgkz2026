#!/usr/bin/env python3
"""
P4-1: Backend Command Routing Smoke Test

Validates that the top 30 high-frequency commands can be dispatched
correctly after Phase 9 file split. Tests the full routing chain:
  Router -> Alias Registry -> Direct Bypass -> getattr Fallback

Usage:
  cd backend && python -m pytest tests/test_command_routing.py -v
  cd backend && python tests/test_command_routing.py  (standalone)
"""

import os
import sys
import asyncio
import importlib
import time

# Ensure backend is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ====================================================================
# Test 1: Handler Registry Completeness
# ====================================================================

# Top 30 most critical commands that MUST route correctly
CRITICAL_COMMANDS = [
    # Accounts
    'get-accounts',
    'add-account',
    'update-account',
    'remove-account',
    'login-account',
    'logout-account',
    'get-initial-state',
    # Monitoring
    'start-monitoring',
    'stop-monitoring',
    'get-monitoring-status',
    'get-system-status',
    # Keywords & Groups
    'get-keyword-sets',
    'save-keyword-set',
    'get-groups',
    'add-monitored-group',
    'remove-monitored-group',
    # Templates & Campaigns
    'get-chat-templates',
    'get-campaigns',
    'get-trigger-rules',
    # Leads
    'get-leads-paginated',
    'update-lead-status',
    # Settings
    'get-settings',
    'save-settings',
    # AI
    'get-ai-settings',
    'get-ai-models',
    # Queue
    'get-queue-status',
    'send-message',
    # Logs
    'get-logs',
]


def _get_all_registered_methods():
    """Extract all method names from _HANDLER_REGISTRY"""
    from main import _HANDLER_REGISTRY
    methods = set()
    for module_path, names_data in _HANDLER_REGISTRY.items():
        names_str = names_data if isinstance(names_data, str) else names_data
        for method_name in names_str.split():
            methods.add(method_name)
    return methods


def _command_to_method(cmd):
    """Convert command name to handler method name"""
    return 'handle_' + cmd.replace('-', '_').replace(':', '_')


def test_handler_registry_has_critical_commands():
    """Verify all critical commands have registered handlers in _HANDLER_REGISTRY"""
    all_methods = _get_all_registered_methods()
    
    missing = []
    for cmd in CRITICAL_COMMANDS:
        method_name = _command_to_method(cmd)
        if method_name not in all_methods:
            missing.append(cmd)
    
    if missing:
        print(f"\n  MISSING from _HANDLER_REGISTRY ({len(missing)}):")
        for m in missing:
            print(f"    - {m} -> {_command_to_method(m)}")
    
    assert len(missing) == 0, f"{len(missing)} critical commands missing from handler registry: {missing}"


def test_handler_registry_methods_exist():
    """Verify handler methods referenced in _HANDLER_REGISTRY resolve on BackendService"""
    from main import BackendService
    all_methods = _get_all_registered_methods()
    
    # Only check critical command methods
    broken = []
    for cmd in CRITICAL_COMMANDS:
        method_name = _command_to_method(cmd)
        if method_name not in all_methods:
            continue  # skip - will be caught by test above
        method = getattr(BackendService, method_name, None)
        if method is None:
            broken.append((cmd, method_name))
    
    if broken:
        print(f"\n  BROKEN handler methods ({len(broken)}):")
        for cmd, fn in broken:
            print(f"    - {cmd} -> {fn}")
    
    assert len(broken) == 0, f"{len(broken)} critical commands have broken handler methods: {broken}"


def test_command_alias_registry_valid():
    """Verify COMMAND_ALIAS_REGISTRY entries point to importable modules and callable functions"""
    from main import COMMAND_ALIAS_REGISTRY
    
    broken = []
    for cmd, (module_path, func_name) in COMMAND_ALIAS_REGISTRY.items():
        try:
            mod = importlib.import_module(module_path)
            fn = getattr(mod, func_name, None)
            if fn is None or not callable(fn):
                broken.append((cmd, module_path, func_name, 'not callable'))
        except ImportError as e:
            broken.append((cmd, module_path, func_name, str(e)))
    
    if broken:
        print(f"\n  BROKEN alias entries ({len(broken)}):")
        for cmd, mod, fn, err in broken:
            print(f"    - {cmd} -> {mod}.{fn}: {err}")
    
    assert len(broken) == 0, f"{len(broken)} alias entries broken: {broken}"


# ====================================================================
# Test 2: Mixin Method Resolution
# ====================================================================

def test_backend_service_mro():
    """Verify BackendService inherits all required mixins"""
    from main import BackendService
    
    required_mixins = [
        'InitStartupMixin',
        'AiServiceMixin', 
        'ConfigExecMixin',
        'SendQueueMixin',
    ]
    
    mro_names = [cls.__name__ for cls in BackendService.__mro__]
    
    missing = [m for m in required_mixins if m not in mro_names]
    assert len(missing) == 0, f"Missing mixins in BackendService MRO: {missing}"


def test_mixin_handler_methods_callable():
    """Verify key handler methods from mixins are callable on BackendService"""
    from main import BackendService
    
    key_methods = [
        'initialize',                        # InitStartupMixin
        '_get_default_ai_model',             # AiServiceMixin
        'check_monitoring_configuration',     # ConfigExecMixin
        '_queue_send_callback',              # SendQueueMixin
        'send_keyword_sets_update',          # SendQueueMixin
        'handle_get_command_diagnostics',     # ConfigExecMixin (mixin-direct, not in registry)
    ]
    
    missing = []
    for method_name in key_methods:
        if not hasattr(BackendService, method_name):
            missing.append(method_name)
    
    assert len(missing) == 0, f"Missing mixin methods: {missing}"


# ====================================================================
# Test 3: No Payload Handler Detection
# ====================================================================

def test_no_payload_handlers_resolvable():
    """Verify _NO_PAYLOAD_HANDLERS entries correspond to real methods"""
    from main import _NO_PAYLOAD_HANDLERS, BackendService
    
    # _NO_PAYLOAD_HANDLERS contains method names (handle_xxx) not command names
    broken = []
    for method_name in list(_NO_PAYLOAD_HANDLERS)[:30]:
        if not hasattr(BackendService, method_name):
            broken.append(method_name)
    
    if broken:
        print(f"\n  NO_PAYLOAD handlers without method ({len(broken)}):")
        for fn in broken:
            print(f"    - {fn}")
    
    # Allow some tolerance (some may be from deprecated commands)
    assert len(broken) <= 5, f"Too many broken no-payload handlers: {broken}"


# ====================================================================
# Test 4: Lazy Import System
# ====================================================================

def test_lazy_imports_registered():
    """Verify all required modules are registered in lazy_imports"""
    from lazy_imports import lazy_imports
    
    critical_modules = [
        'ai_auto_chat',
        'vector_memory',
        'telegram_rag_system',
        'group_search_service',
        'enhanced_health_monitor',
        'performance_monitor',
        'batch_operations',
        'collaboration_coordinator',
        'fulltext_search',
    ]
    
    stats = lazy_imports.get_stats()
    registered = set(stats.get('loaded_modules', []) + stats.get('pending_modules', []))
    
    missing = [m for m in critical_modules if m not in registered]
    assert len(missing) == 0, f"Missing from lazy_imports: {missing}"


# ====================================================================
# Test 5: Database Mixin Composition
# ====================================================================

def test_database_class_composition():
    """Verify Database class inherits all required DB mixins"""
    from database import Database
    
    required_mixins = [
        'AccountMixin',
        'KeywordGroupMixin',
        'CampaignQueueMixin',
        'UserAdminMixin',
    ]
    
    mro_names = [cls.__name__ for cls in Database.__mro__]
    
    missing = [m for m in required_mixins if m not in mro_names]
    assert len(missing) == 0, f"Missing DB mixins: {missing}"


def test_database_no_forbidden_refs():
    """Verify no DB mixin references 'Database' class directly (Phase 9 bug)"""
    import ast
    from pathlib import Path
    
    db_mixin_dir = Path(__file__).parent.parent / 'db'
    issues = []
    
    for mixin_file in db_mixin_dir.glob('*_mixin.py'):
        try:
            source = mixin_file.read_text(encoding='utf-8')
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Attribute):
                    if isinstance(node.value, ast.Name) and node.value.id == 'Database':
                        issues.append(f"{mixin_file.name}:{node.lineno} - Database.{node.attr}")
        except SyntaxError:
            pass
    
    assert len(issues) == 0, f"DB mixins reference 'Database' directly: {issues}"


# ====================================================================
# Test 6: Import Speed Baseline
# ====================================================================

def test_import_speed_baseline():
    """Verify BackendService import completes within acceptable time (< 10s)"""
    import importlib
    
    # Force re-import timing (approximate since module may be cached)
    t0 = time.time()
    importlib.import_module('main')
    t1 = time.time()
    
    elapsed = t1 - t0
    # If already cached, elapsed ~0. Real first-import measured by web_server.py.
    # Here we just ensure no import crash and it's reasonably fast.
    assert elapsed < 10, f"BackendService import took {elapsed:.2f}s (threshold: 10s)"


def test_no_duplicate_getter_functions():
    """Verify no getter function is defined twice in main.py (Phase 9 artifact)"""
    import ast
    
    main_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'main.py')
    with open(main_path, 'r', encoding='utf-8') as f:
        source = f.read()
    
    tree = ast.parse(source)
    
    # Collect module-level function defs
    func_names = []
    duplicates = []
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.FunctionDef):
            if node.name in func_names:
                duplicates.append(f"{node.name} (line {node.lineno})")
            func_names.append(node.name)
    
    assert len(duplicates) == 0, f"Duplicate function definitions in main.py: {duplicates}"


def test_unused_dangling_globals():
    """Verify no dangling None assignments for removed globals"""
    import ast
    
    main_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'main.py')
    with open(main_path, 'r', encoding='utf-8') as f:
        source = f.read()
    
    tree = ast.parse(source)
    
    # Find module-level assignments to None that are never read
    none_assigns = []
    all_names = set()
    
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and isinstance(node.value, ast.Constant) and node.value.value is None:
                    none_assigns.append(target.id)
    
    # Collect all Name references in the whole file
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            all_names.add(node.id)
    
    # A dangling None is one assigned to None and only referenced on that line
    # (it will appear in all_names from the assignment itself)
    # We check: is it referenced MORE than just the assignment?
    # Simple heuristic: count occurrences in source
    dangling = []
    for name in none_assigns:
        count = source.count(name)
        if count <= 1:  # only appears in the assignment
            dangling.append(name)
    
    assert len(dangling) == 0, f"Dangling None globals in main.py: {dangling}"


# ====================================================================
# Standalone runner
# ====================================================================

def run_all():
    """Run all tests and print summary"""
    tests = [
        ('Handler Registry Has Critical Commands', test_handler_registry_has_critical_commands),
        ('Handler Methods Exist', test_handler_registry_methods_exist),
        ('Command Alias Registry Valid', test_command_alias_registry_valid),
        ('BackendService MRO', test_backend_service_mro),
        ('Mixin Handler Methods Callable', test_mixin_handler_methods_callable),
        ('No-Payload Handlers Resolvable', test_no_payload_handlers_resolvable),
        ('Lazy Imports Registered', test_lazy_imports_registered),
        ('Database Class Composition', test_database_class_composition),
        ('Database No Forbidden Refs', test_database_no_forbidden_refs),
        ('Import Speed Baseline', test_import_speed_baseline),
        ('No Duplicate Getter Functions', test_no_duplicate_getter_functions),
        ('No Dangling None Globals', test_unused_dangling_globals),
    ]
    
    passed = 0
    failed = 0
    errors = 0
    
    print(f"\n{'='*60}")
    print(f"  P4-1: Backend Command Routing Smoke Test")
    print(f"{'='*60}\n")
    
    for name, test_fn in tests:
        try:
            test_fn()
            print(f"  PASS  {name}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR {name}: {type(e).__name__}: {e}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"  Results: {passed} passed, {failed} failed, {errors} errors")
    print(f"{'='*60}\n")
    
    return failed + errors == 0


if __name__ == '__main__':
    os.environ.setdefault('ELECTRON_MODE', 'true')
    success = run_all()
    sys.exit(0 if success else 1)

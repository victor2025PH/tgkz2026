"""
Phase 9-4: Build compact handler auto-registry from 551 delegated stubs in main.py.

Strategy:
1. Parse all delegated stubs to extract (method_name, module_path, func_name, has_payload)
2. Build a compact module-grouped registry
3. Generate the auto-registration code
4. Remove all stubs from main.py and insert the registry
"""
import re
import os
from collections import defaultdict

MAIN_PY = os.path.join(os.path.dirname(__file__), '..', 'backend', 'main.py')

def parse_stubs(lines):
    """Parse all delegated handler stubs from BackendService."""
    stub_re = re.compile(r'^\s{4}(async )?def (\w+)\(self(?:,\s*payload.*?)?\):')
    import_re = re.compile(r'from ([\w.]+) import (\w+) as _')
    
    stubs = []
    i = 0
    while i < len(lines):
        m = stub_re.match(lines[i])
        if m:
            method_name = m.group(2)
            has_payload = 'payload' in lines[i]
            line_start = i
            
            # Look for import in next 4 lines
            for j in range(i+1, min(i+5, len(lines))):
                im = import_re.search(lines[j])
                if im:
                    module_path = im.group(1)
                    func_name = im.group(2)
                    
                    # Find end of this stub (next method def or blank line pattern)
                    line_end = j + 1
                    while line_end < len(lines):
                        next_line = lines[line_end].rstrip()
                        if next_line and not next_line.startswith(' ' * 8) and not next_line.startswith(' ' * 4 + '#'):
                            break
                        if next_line.startswith('    async def ') or next_line.startswith('    def '):
                            break
                        line_end += 1
                    
                    stubs.append({
                        'method': method_name,
                        'module': module_path,
                        'func': func_name,
                        'has_payload': has_payload,
                        'start': line_start,
                        'end': line_end,
                    })
                    break
        i += 1
    
    return stubs


def build_registry_code(stubs):
    """Build the compact registry code."""
    # Group by module
    module_groups = defaultdict(list)
    no_payload = set()
    renames = {}
    
    for stub in stubs:
        module_groups[stub['module']].append(stub['method'])
        if not stub['has_payload']:
            no_payload.add(stub['method'])
        if stub['method'] != stub['func']:
            renames[stub['method']] = stub['func']
    
    # Build the registry string
    lines = []
    lines.append('# ========== Phase 9-4: Handler Auto-Registry ==========')
    lines.append('# Replaces 551 individual 3-line delegation stubs with compact registry.')
    lines.append('# Each module maps to a tuple of handler method names.')
    lines.append('# Default: method accepts payload, function name == method name.')
    lines.append('')
    lines.append('_HANDLER_REGISTRY = {')
    
    # Sort modules for readability
    for module_path in sorted(module_groups.keys()):
        methods = module_groups[module_path]
        methods_str = ' '.join(methods)
        if len(methods_str) + len(module_path) + 10 <= 100:
            lines.append(f"    '{module_path}': '{methods_str}',")
        else:
            # Multi-line: use parenthesized implicit string concatenation
            # IMPORTANT: each segment must end with a trailing space before the quote
            # to prevent adjacent names from merging during concatenation
            lines.append(f"    '{module_path}': (")
            current_seg = "        '"
            for method in methods:
                if len(current_seg) + len(method) + 2 > 92:
                    # Keep trailing space: 'name1 name2 ' (not rstripped!)
                    lines.append(current_seg + "'")
                    current_seg = "        '"
                current_seg += method + ' '
            if current_seg.strip("' "):
                lines.append(current_seg.rstrip() + "'")  # Last segment: strip ok
            lines.append("    ),")
    
    lines.append('}')
    lines.append('')
    
    # No-payload set
    lines.append('# Handlers that take NO payload argument (44 methods)')
    lines.append('_NO_PAYLOAD_HANDLERS = {')
    for method in sorted(no_payload):
        lines.append(f"    '{method}',")
    lines.append('}')
    lines.append('')
    
    # Renames
    if renames:
        lines.append('# Methods where impl function name differs from method name')
        lines.append('_HANDLER_RENAMES = {')
        for method, func in sorted(renames.items()):
            lines.append(f"    '{method}': '{func}',")
        lines.append('}')
    else:
        lines.append('_HANDLER_RENAMES = {}')
    lines.append('')
    
    # Generation function
    lines.append('')
    lines.append('def _register_all_handlers(cls):')
    lines.append('    """Auto-generate handler methods on BackendService from registry."""')
    lines.append('    import importlib')
    lines.append('')
    lines.append('    for module_path, names_data in _HANDLER_REGISTRY.items():')
    lines.append('        names_str = names_data if isinstance(names_data, str) else names_data')
    lines.append('        for method_name in names_str.split():')
    lines.append('            func_name = _HANDLER_RENAMES.get(method_name, method_name)')
    lines.append('            takes_payload = method_name not in _NO_PAYLOAD_HANDLERS')
    lines.append('')
    lines.append('            def _make(mp, fn, tp, mn):')
    lines.append('                _cached = [None]')
    lines.append('                if tp:')
    lines.append('                    async def handler(self, payload=None):')
    lines.append('                        if _cached[0] is None:')
    lines.append('                            _cached[0] = getattr(importlib.import_module(mp), fn)')
    lines.append('                        return await _cached[0](self, payload)')
    lines.append('                else:')
    lines.append('                    async def handler(self):')
    lines.append('                        if _cached[0] is None:')
    lines.append('                            _cached[0] = getattr(importlib.import_module(mp), fn)')
    lines.append('                        return await _cached[0](self)')
    lines.append("                handler.__name__ = mn")
    lines.append("                handler.__qualname__ = f'BackendService.{mn}'")
    lines.append('                return handler')
    lines.append('')
    lines.append('            setattr(cls, method_name, _make(module_path, func_name, takes_payload, method_name))')
    lines.append('')
    
    return lines


def main():
    with open(MAIN_PY, 'r', encoding='utf-8') as f:
        raw_lines = f.readlines()
    
    original_count = len(raw_lines)
    print(f"Read {original_count} lines from main.py")
    
    # Parse stubs
    stubs = parse_stubs(raw_lines)
    print(f"Found {len(stubs)} delegated stubs")
    
    if len(stubs) < 500:
        print("WARNING: Expected ~551 stubs, found fewer. Aborting.")
        return
    
    # Show stats
    module_groups = defaultdict(list)
    for s in stubs:
        module_groups[s['module']].append(s['method'])
    print(f"Across {len(module_groups)} modules")
    
    # Build registry code
    registry_lines = build_registry_code(stubs)
    print(f"Generated registry: {len(registry_lines)} lines")
    
    # Remove stubs from main.py
    # Sort ranges in reverse to remove from bottom first
    remove_ranges = [(s['start'], s['end']) for s in stubs]
    remove_ranges.sort(key=lambda r: r[0], reverse=True)
    
    new_lines = list(raw_lines)
    for start, end in remove_ranges:
        del new_lines[start:end]
    
    print(f"After removing stubs: {len(new_lines)} lines")
    
    # Find where to insert the registry
    # Insert right before 'class BackendService' and after the lazy module proxy
    insert_idx = None
    for i, line in enumerate(new_lines):
        if line.startswith('class BackendService'):
            insert_idx = i
            break
    
    if insert_idx is None:
        print("ERROR: Could not find 'class BackendService' line")
        return
    
    # Insert registry code before the class
    registry_text = '\n'.join(registry_lines) + '\n\n'
    new_lines.insert(insert_idx, registry_text)
    
    # Find the class closing / end of file to add _register_all_handlers call
    # Look for 'async def main():' which is the module-level function after the class
    for i in range(len(new_lines) - 1, -1, -1):
        if new_lines[i].startswith('async def main():'):
            # Insert registration call before this
            new_lines.insert(i, '\n# Phase 9-4: Apply handler auto-registry\n_register_all_handlers(BackendService)\n\n')
            break
    
    # Write
    with open(MAIN_PY, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    final_count = sum(1 for line in open(MAIN_PY, 'r', encoding='utf-8'))
    print(f"\nResult: {original_count} -> {final_count} lines (removed {original_count - final_count})")
    print("Phase 9-4 registry generation complete!")


if __name__ == '__main__':
    main()

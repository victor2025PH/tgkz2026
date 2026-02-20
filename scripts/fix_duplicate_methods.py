#!/usr/bin/env python3
"""
Remove duplicate method definitions in main.py.
For each duplicate handle_* method, keep the LAST definition (Python semantics).
"""
import re

MAIN_PY = 'backend/main.py'

def main():
    with open(MAIN_PY, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find all handle_* method definitions with their line numbers
    methods = {}  # name -> list of (start_line_idx, end_line_idx)
    
    method_starts = []
    for i, line in enumerate(lines):
        m = re.match(r'    async def (handle_\w+)\(', line)
        if m:
            method_starts.append((i, m.group(1)))
    
    # For each method start, find its end (next method at same indent or end of class)
    for idx, (start, name) in enumerate(method_starts):
        if idx + 1 < len(method_starts):
            end = method_starts[idx + 1][0]
        else:
            end = len(lines)
        
        # Trim trailing blank lines
        while end > start + 1 and lines[end - 1].strip() == '':
            end -= 1
        end += 1  # Include one trailing blank line
        
        if name not in methods:
            methods[name] = []
        methods[name].append((start, end))
    
    # Find duplicates - mark first occurrence for removal
    lines_to_remove = set()
    for name, occurrences in methods.items():
        if len(occurrences) > 1:
            # Keep the last one, remove all earlier ones
            for start, end in occurrences[:-1]:
                print(f"  Removing first {name} at lines {start+1}-{end}")
                for i in range(start, min(end, len(lines))):
                    lines_to_remove.add(i)
    
    if not lines_to_remove:
        print("No duplicates found")
        return
    
    # Remove marked lines
    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    
    with open(MAIN_PY, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"\nRemoved {len(lines_to_remove)} lines ({len(lines)} -> {len(new_lines)})")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Exact syntax check - find the REAL issue causing build failures
"""

import sys
import re
from pathlib import Path

def check_file_exact(file_path: Path):
    """Exact syntax check."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        issues = []
        
        # Find export default function
        main_pattern = r'export\s+default\s+function\s+\w+'
        main_match = re.search(main_pattern, content)
        
        if not main_match:
            return [{'type': 'No main function found', 'line': 0}]
        
        func_start_pos = main_match.start()
        
        # Find the function body start (after parameters)
        # Look for the pattern: ...): TypeName) {
        func_body_pattern = r'\)\s*\{'
        func_body_matches = list(re.finditer(func_body_pattern, content[func_start_pos:]))
        
        if not func_body_matches:
            return [{'type': 'Cannot find function body start', 'line': 0}]
        
        func_body_start = func_start_pos + func_body_matches[0].end() - 1
        func_content = content[func_body_start:]
        
        # Find return statement
        return_pattern = r'\n\s*return\s*\('
        return_match = re.search(return_pattern, func_content)
        
        if not return_match:
            return [{'type': 'Cannot find return statement', 'line': 0}]
        
        return_line = func_content[:return_match.start()].count('\n') + 1
        before_return = func_content[:return_match.start()]
        
        # Check for unclosed function calls, useEffect, useCallback, etc.
        # Look for patterns like: useEffect(() => { ... but no closing
        
        # Check for unclosed useEffect
        useEffect_pattern = r'useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{'
        matches = list(re.finditer(useEffect_pattern, before_return))
        for match in matches:
            start = match.end() - 1
            # Find the matching closing brace
            brace_count = 1
            i = start
            found_close = False
            while i < len(before_return):
                if before_return[i] == '{':
                    brace_count += 1
                elif before_return[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        found_close = True
                        break
                i += 1
            
            if not found_close:
                line_num = func_content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Unclosed useEffect',
                    'line': line_num,
                    'context': match.group(0)[:50]
                })
        
        # Check for unclosed useCallback
        useCallback_pattern = r'useCallback\s*\(\s*'
        matches = list(re.finditer(useCallback_pattern, before_return))
        for match in matches:
            start = match.end()
            # Find the matching closing paren
            paren_count = 1
            i = start
            found_close = False
            while i < len(before_return):
                if before_return[i] == '(':
                    paren_count += 1
                elif before_return[i] == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        found_close = True
                        break
                i += 1
            
            if not found_close:
                line_num = func_content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Unclosed useCallback',
                    'line': line_num,
                    'context': match.group(0)[:50]
                })
        
        # Simple brace count (ignoring strings)
        brace_count = 0
        in_string = False
        in_template = False
        string_char = None
        
        for i, char in enumerate(before_return):
            if not in_string and not in_template:
                if char == '"' or char == "'":
                    in_string = True
                    string_char = char
                elif char == '`':
                    in_template = True
            elif in_string:
                if char == string_char and (i == 0 or before_return[i-1] != '\\'):
                    in_string = False
                    string_char = None
            elif in_template:
                if char == '`' and (i == 0 or before_return[i-1] != '\\'):
                    in_template = False
            
            if not in_string and not in_template:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
        
        if brace_count != 0:
            issues.append({
                'type': f'Unbalanced braces before return: {brace_count}',
                'line': return_line,
                'severity': 'high'
            })
        
        return issues
        
    except Exception as e:
        return [{'type': f'Error: {str(e)}', 'line': 0}]

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Exact syntax check for build-breaking issues...")
    print("=" * 80)
    
    found_issues = False
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = check_file_exact(file_path)
            if issues:
                found_issues = True
                for issue in issues:
                    line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                    print(f"  [{issue.get('severity', 'HIGH').upper()}] {line_info}: {issue['type']}")
                    if 'context' in issue:
                        print(f"    {issue['context']}")
            else:
                print("  ✓ No issues found")
        else:
            print(f"\n{rel_path}: File not found")
    
    if not found_issues:
        print("\n✅ No syntax issues found!")
    
    return 0 if not found_issues else 1

if __name__ == '__main__':
    sys.exit(main())


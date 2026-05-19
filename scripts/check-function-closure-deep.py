#!/usr/bin/env python3
"""
Deep check for function closure issues before return statements
"""

import sys
import re
from pathlib import Path

def check_function_closure(file_path: Path):
    """Check if functions are properly closed before return statements."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the main exported function
        main_func_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
        main_match = re.search(main_func_pattern, content)
        
        if not main_match:
            return []
        
        func_start = main_match.end() - 1  # Position of opening brace
        func_content = content[func_start:]
        
        issues = []
        
        # Find all return statements
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, func_content))
        
        for match in return_matches:
            return_pos = match.start()
            before_return = func_content[:return_pos]
            
            # Count braces from function start to return
            brace_count = 1  # Start with 1 for the function opening brace
            for char in before_return:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
            
            # Count parentheses
            paren_count = before_return.count('(') - before_return.count(')')
            
            # Count brackets
            bracket_count = before_return.count('[') - before_return.count(']')
            
            line_num = func_content[:return_pos].count('\n') + 1
            
            if brace_count != 1:
                issues.append({
                    'line': line_num,
                    'type': 'Unbalanced braces before return',
                    'detail': f'Brace count: {brace_count} (should be 1)',
                    'severity': 'high'
                })
            
            if paren_count > 0:
                issues.append({
                    'line': line_num,
                    'type': 'Unclosed parentheses before return',
                    'detail': f'Unclosed parens: {paren_count}',
                    'severity': 'high'
                })
            
            if bracket_count > 0:
                issues.append({
                    'line': line_num,
                    'type': 'Unclosed brackets before return',
                    'detail': f'Unclosed brackets: {bracket_count}',
                    'severity': 'high'
                })
            
            # Check for unclosed function calls
            # Look for function calls that end with ( but no matching )
            func_call_pattern = r'(\w+)\s*\([^)]*$'
            if re.search(func_call_pattern, before_return[-200:]):
                issues.append({
                    'line': line_num,
                    'type': 'Possible unclosed function call before return',
                    'severity': 'high'
                })
            
            # Check for unclosed template strings
            # Count backticks
            backticks = before_return.count('`')
            if backticks % 2 != 0:
                issues.append({
                    'line': line_num,
                    'type': 'Unclosed template string before return',
                    'severity': 'high'
                })
        
        return issues
        
    except Exception as e:
        return [{'line': 0, 'type': f'Error: {str(e)}', 'severity': 'critical'}]

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Checking function closure before return statements...")
    print("=" * 80)
    
    found_issues = False
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = check_function_closure(file_path)
            if issues:
                found_issues = True
                for issue in issues:
                    print(f"  Line {issue['line']}: [{issue['severity'].upper()}] {issue['type']}")
                    if 'detail' in issue:
                        print(f"    {issue['detail']}")
            else:
                print("  ✓ Function structure looks correct")
        else:
            print(f"\n{rel_path}: File not found")
    
    if not found_issues:
        print("\n✅ No function closure issues found")
    else:
        print("\n⚠️  Found function closure issues")
    
    return 0 if not found_issues else 1

if __name__ == '__main__':
    sys.exit(main())


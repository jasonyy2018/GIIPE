#!/usr/bin/env python3
"""
Check if functions are properly closed before return statements
"""

import sys
import re
from pathlib import Path

def check_function_closure(file_path: Path):
    """Check if functions are properly closed."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all return statements
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, content))
        
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before_return = content[:match.start()]
            
            # Find the function that contains this return
            # Look backwards for function definition
            func_patterns = [
                r'(export\s+default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{',
                r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{',
                r'const\s+(\w+)\s*=\s*\([^)]*\)\s*\{',
            ]
            
            func_start = None
            func_name = None
            
            for pattern in func_patterns:
                func_matches = list(re.finditer(pattern, before_return))
                if func_matches:
                    # Find the last function before this return
                    for func_match in reversed(func_matches):
                        if func_match.end() < match.start():
                            func_start = func_match.end()
                            func_name = func_match.group(2) if len(func_match.groups()) > 1 else func_match.group(1) if func_match.groups() else 'unknown'
                            break
                    if func_start:
                        break
            
            if func_start:
                # Check the content between function start and return
                func_content = content[func_start:match.start()]
                
                # Count braces
                open_braces = func_content.count('{')
                close_braces = func_content.count('}')
                
                # Count parentheses
                open_paren = func_content.count('(')
                close_paren = func_content.count(')')
                
                # Check for unclosed structures
                if open_braces > close_braces:
                    issues.append({
                        'line': line_num,
                        'type': 'Unclosed braces in function',
                        'func_name': func_name,
                        'open': open_braces,
                        'close': close_braces,
                        'diff': open_braces - close_braces
                    })
                
                if open_paren > close_paren + 2:  # Allow some for JSX
                    issues.append({
                        'line': line_num,
                        'type': 'Unclosed parentheses in function',
                        'func_name': func_name,
                        'open': open_paren,
                        'close': close_paren,
                        'diff': open_paren - close_paren
                    })
        
        return issues
        
    except Exception as e:
        return [{'line': 0, 'type': f'Error: {str(e)}'}]

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/admin/SystemSettingsManager.tsx',
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Checking function closure...")
    print("=" * 80)
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = check_function_closure(file_path)
            if issues:
                for issue in issues:
                    print(f"  Line {issue['line']}: {issue['type']}")
                    if 'func_name' in issue:
                        print(f"    Function: {issue['func_name']}")
                    if 'diff' in issue:
                        print(f"    Difference: {issue['diff']}")
            else:
                print("  No closure issues found")
        else:
            print(f"\n{rel_path}: File not found")

if __name__ == '__main__':
    main()


#!/usr/bin/env python3
"""
Check code before return statements for syntax errors
"""

import sys
import re
from pathlib import Path

def check_before_return(file_path: Path):
    """Check code before return statements."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Find all return statements
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, content))
        
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before_return = content[:match.start()]
            
            # Get the last 200 characters before return
            last_200 = before_return[-200:]
            
            # Check for common issues:
            # 1. Unclosed function calls
            # 2. Unclosed parentheses
            # 3. Unclosed brackets
            # 4. Syntax errors
            
            # Count parentheses
            open_paren = last_200.count('(')
            close_paren = last_200.count(')')
            open_brace = last_200.count('{')
            close_brace = last_200.count('}')
            open_bracket = last_200.count('[')
            close_bracket = last_200.count(']')
            
            # Check for obvious syntax errors
            # Pattern: function call without closing paren before return
            func_call_pattern = r'\w+\([^)]*$'
            if re.search(func_call_pattern, last_200):
                issues.append({
                    'line': line_num,
                    'type': 'Possible unclosed function call before return',
                    'context': last_200[-100:]
                })
            
            # Check for unclosed template strings
            template_pattern = r'`[^`]*$'
            if re.search(template_pattern, last_200):
                issues.append({
                    'line': line_num,
                    'type': 'Possible unclosed template string before return',
                    'context': last_200[-100:]
                })
            
            # Check for comments breaking code
            # Pattern: code // comment followed by return
            comment_pattern = r'[a-zA-Z0-9_\)\]\}\.]+\)?\s*//[^\n]*\n\s*return'
            if re.search(comment_pattern, last_200):
                issues.append({
                    'line': line_num,
                    'type': 'Comment before return (may be breaking code)',
                    'context': last_200[-100:]
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
    
    print("Checking code before return statements...")
    print("=" * 80)
    
    found_issues = False
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = check_before_return(file_path)
            if issues:
                found_issues = True
                for issue in issues:
                    print(f"  Line {issue['line']}: {issue['type']}")
                    if 'context' in issue:
                        print(f"    Context: {issue['context']}")
            else:
                print("  No issues found before return statements")
        else:
            print(f"\n{rel_path}: File not found")
    
    if not found_issues:
        print("\nSUCCESS: No issues found before return statements")
    
    return 0 if not found_issues else 1

if __name__ == '__main__':
    sys.exit(main())


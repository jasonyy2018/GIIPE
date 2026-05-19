#!/usr/bin/env python3
"""
Validate TSX syntax by checking for unclosed blocks before return statements
"""

import sys
import re
from pathlib import Path

def validate_tsx_syntax(file_path: Path):
    """Validate TSX syntax."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Find export default function
        main_pattern = r'export\s+default\s+function\s+\w+'
        main_match = re.search(main_pattern, content)
        
        if not main_match:
            return {'error': 'No main function found'}
        
        func_start = main_match.start()
        
        # Find function body start (after parameters and return type)
        # Look for }: TypeName) {
        func_body_pattern = r'\}\s*:\s*\w+\s*\)\s*\{'
        func_body_match = re.search(func_body_pattern, content[func_start:])
        
        if not func_body_match:
            # Try simple pattern
            func_body_pattern2 = r'\)\s*\{'
            func_body_matches = list(re.finditer(func_body_pattern2, content[func_start:]))
            if not func_body_matches:
                return {'error': 'Cannot find function body start'}
            func_body_start_pos = func_start + func_body_matches[0].end() - 1
        else:
            func_body_start_pos = func_start + func_body_match.end() - 1
        
        func_body = content[func_body_start_pos + 1:]  # Skip opening brace
        
        # Find return statement
        return_pattern = r'\n\s*return\s*\('
        return_match = re.search(return_pattern, func_body)
        
        if not return_match:
            return {'error': 'Cannot find return statement'}
        
        before_return = func_body[:return_match.start()]
        
        # Count braces, ignoring strings and comments
        brace_count = 0
        paren_count = 0
        bracket_count = 0
        
        in_string = False
        in_template = False
        in_single_comment = False
        in_multi_comment = False
        string_char = None
        
        i = 0
        while i < len(before_return):
            char = before_return[i]
            next_char = before_return[i + 1] if i + 1 < len(before_return) else ''
            
            # Handle comments
            if not in_string and not in_template:
                if char == '/' and next_char == '/':
                    in_single_comment = True
                    i += 2
                    continue
                elif char == '/' and next_char == '*':
                    in_multi_comment = True
                    i += 2
                    continue
                elif in_single_comment:
                    if char == '\n':
                        in_single_comment = False
                    i += 1
                    continue
                elif in_multi_comment:
                    if char == '*' and next_char == '/':
                        in_multi_comment = False
                        i += 2
                        continue
                    i += 1
                    continue
            
            # Handle strings
            if not in_string and not in_template and not in_single_comment and not in_multi_comment:
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
            
            # Count braces only if not in string/comment
            if not in_string and not in_template and not in_single_comment and not in_multi_comment:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                elif char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                elif char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
            
            i += 1
        
        return {
            'brace_count': brace_count,
            'paren_count': paren_count,
            'bracket_count': bracket_count,
            'valid': brace_count == 0 and paren_count == 0 and bracket_count == 0
        }
        
    except Exception as e:
        return {'error': str(e)}

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Validating TSX syntax...")
    print("=" * 80)
    
    all_valid = True
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            result = validate_tsx_syntax(file_path)
            if 'error' in result:
                print(f"  ❌ {result['error']}")
                all_valid = False
            else:
                if result['valid']:
                    print(f"  ✅ Syntax is valid")
                else:
                    print(f"  ❌ Unbalanced:")
                    print(f"     Braces: {result['brace_count']}")
                    print(f"     Parens: {result['paren_count']}")
                    print(f"     Brackets: {result['bracket_count']}")
                    all_valid = False
        else:
            print(f"\n{rel_path}: File not found")
            all_valid = False
    
    if all_valid:
        print("\n✅ All files have valid syntax!")
    else:
        print("\n❌ Some files have syntax issues!")
    
    return 0 if all_valid else 1

if __name__ == '__main__':
    sys.exit(main())


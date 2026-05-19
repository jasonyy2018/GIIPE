#!/usr/bin/env python3
"""
Exact verification of function closure - check for real syntax issues
"""

import sys
import re
from pathlib import Path

def verify_function_exact(file_path: Path):
    """Verify function closure exactly."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find main export function with destructured parameters
        pattern = r'export\s+default\s+function\s+(\w+)\s*\(\{'
        match = re.search(pattern, content)
        
        if not match:
            print(f"  ⚠️  Function not found or different pattern")
            return False
        
        func_name = match.group(1)
        func_start = match.end() - 1  # Position of opening brace
        
        # Find the closing of parameters
        param_end = content.find('}:', func_start)
        if param_end == -1:
            print(f"  ❌ Cannot find parameter end")
            return False
        
        # Find return type annotation end
        return_type_end = content.find(')', param_end + 2)
        if return_type_end == -1:
            print(f"  ❌ Cannot find return type end")
            return False
        
        func_body_start = return_type_end + 1
        if func_body_start >= len(content) or content[func_body_start] != '{':
            print(f"  ❌ Function body doesn't start with {{")
            return False
        
        func_body = content[func_body_start + 1:]  # Skip opening brace
        
        # Find return statement
        return_match = re.search(r'\n\s*return\s*\(', func_body)
        if not return_match:
            print(f"  ❌ Cannot find return statement")
            return False
        
        before_return = func_body[:return_match.start()]
        
        # Count braces EXACTLY, ignoring strings and comments
        brace_count = 0  # We already skipped the opening brace
        paren_count = 0
        bracket_count = 0
        
        i = 0
        in_string = False
        in_template = False
        in_single_comment = False
        in_multi_comment = False
        string_char = None
        
        while i < len(before_return):
            char = before_return[i]
            next_char = before_return[i + 1] if i + 1 < len(before_return) else ''
            
            # Handle comments
            if not in_string and not in_template and not in_multi_comment:
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
        
        if brace_count != 0:
            print(f"  ❌ Unbalanced braces: {brace_count} (should be 0)")
            return False
        
        if paren_count != 0:
            print(f"  ⚠️  Unbalanced parens: {paren_count}")
        
        if bracket_count != 0:
            print(f"  ⚠️  Unbalanced brackets: {bracket_count}")
        
        print(f"  ✅ Function structure is correct")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Exact function verification...")
    print("=" * 80)
    
    all_ok = True
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            if not verify_function_exact(file_path):
                all_ok = False
        else:
            print(f"\n{rel_path}: File not found")
    
    if all_ok:
        print("\n✅ All functions are correctly structured!")
    else:
        print("\n❌ Some functions have issues!")
    
    return 0 if all_ok else 1

if __name__ == '__main__':
    sys.exit(main())


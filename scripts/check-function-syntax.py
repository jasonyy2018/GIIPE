#!/usr/bin/env python3
"""
Check function syntax precisely
"""

import sys
import re
from pathlib import Path

def check_function_syntax(file_path: Path):
    """Check function syntax."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Find the main export function
        main_pattern = r'export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{'
        main_match = re.search(main_pattern, content)
        
        if not main_match:
            # Try with destructured parameters
            main_pattern2 = r'export\s+default\s+function\s+(\w+)\s*\(\{'
            main_match = re.search(main_pattern2, content)
            
            if main_match:
                func_start = main_match.end() - 1
                # Find the closing of parameters
                param_end = content.find('}:', func_start)
                if param_end == -1:
                    print(f"  ❌ Cannot find parameter end")
                    return False
                
                # Check if there's a closing brace before the return type
                param_content = content[func_start:param_end]
                brace_count = param_content.count('{') - param_content.count('}')
                
                if brace_count != 0:
                    print(f"  ❌ Unbalanced braces in parameters: {brace_count}")
                    return False
                
                # Find return type annotation
                return_type_start = param_end + 2
                return_type_end = content.find(')', return_type_start)
                if return_type_end == -1:
                    print(f"  ❌ Cannot find return type end")
                    return False
                
                func_body_start = return_type_end + 1
                func_body = content[func_body_start:]
                
                # Find return statement
                return_match = re.search(r'\n\s*return\s*\(', func_body)
                if not return_match:
                    print(f"  ❌ Cannot find return statement")
                    return False
                
                before_return = func_body[:return_match.start()]
                
                # Count braces (simplified - doesn't handle strings well)
                brace_count = 1
                for char in before_return:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                
                if brace_count != 1:
                    print(f"  ❌ Unbalanced braces before return: {brace_count} (should be 1)")
                    return False
                
                print(f"  ✓ Function syntax looks correct")
                return True
            else:
                print(f"  ❌ Cannot find main function")
                return False
        else:
            print(f"  ✓ Function syntax looks correct (simple signature)")
            return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Checking function syntax...")
    print("=" * 80)
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            check_function_syntax(file_path)
        else:
            print(f"\n{rel_path}: File not found")

if __name__ == '__main__':
    main()


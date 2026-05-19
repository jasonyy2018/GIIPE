#!/usr/bin/env python3
"""
Check brace balance in problematic files
"""

import sys
import re
from pathlib import Path

def check_brace_balance(file_path: Path):
    """Check brace balance."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find main export function
        main_func_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
        main_match = re.search(main_func_pattern, content)
        
        if not main_match:
            return {'error': 'No main function found'}
        
        func_start = main_match.end() - 1  # Position of opening brace
        func_content = content[func_start:]
        
        # Find return statement
        return_pattern = r'\n\s*return\s*\('
        return_match = re.search(return_pattern, func_content)
        
        if not return_match:
            return {'error': 'No return statement found'}
        
        return_pos = return_match.start()
        before_return = func_content[:return_pos]
        
        # Count braces
        brace_count = 1  # Start with 1 for function opening brace
        paren_count = 0
        bracket_count = 0
        
        for i, char in enumerate(before_return):
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
            
            # If we're at a critical point, check
            if i > 0 and i % 500 == 0:
                if brace_count < 1:
                    return {
                        'error': f'Unclosed brace detected at position {i}',
                        'brace_count': brace_count,
                        'paren_count': paren_count,
                        'bracket_count': bracket_count
                    }
        
        return {
            'brace_count': brace_count,
            'paren_count': paren_count,
            'bracket_count': bracket_count,
            'before_return_length': len(before_return)
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
    
    print("Checking brace balance in problematic files...")
    print("=" * 80)
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            result = check_brace_balance(file_path)
            if 'error' in result:
                print(f"  ❌ Error: {result['error']}")
            else:
                print(f"  Brace count: {result['brace_count']} (should be 1)")
                print(f"  Paren count: {result['paren_count']}")
                print(f"  Bracket count: {result['bracket_count']}")
                if result['brace_count'] != 1:
                    print(f"  ⚠️  WARNING: Unbalanced braces!")
                if result['paren_count'] != 0:
                    print(f"  ⚠️  WARNING: Unbalanced parentheses!")
                if result['bracket_count'] != 0:
                    print(f"  ⚠️  WARNING: Unbalanced brackets!")
        else:
            print(f"\n{rel_path}: File not found")

if __name__ == '__main__':
    main()


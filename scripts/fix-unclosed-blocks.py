#!/usr/bin/env python3
"""
Fix unclosed code blocks in problematic files
"""

import sys
import re
from pathlib import Path

def analyze_and_fix_file(file_path: Path):
    """Analyze and fix unclosed blocks."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Find main export function
        main_func_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
        main_match = re.search(main_func_pattern, content)
        
        if not main_match:
            print(f"  ⚠️  No main function found")
            return False
        
        func_start = main_match.end() - 1
        func_content = content[func_start:]
        
        # Find return statement
        return_pattern = r'\n\s*return\s*\('
        return_match = re.search(return_pattern, func_content)
        
        if not return_match:
            print(f"  ⚠️  No return statement found")
            return False
        
        return_pos = return_match.start()
        before_return = func_content[:return_pos]
        
        # Count braces carefully
        brace_stack = []
        paren_stack = []
        
        for i, char in enumerate(before_return):
            if char == '{':
                brace_stack.append(i)
            elif char == '}':
                if brace_stack:
                    brace_stack.pop()
                else:
                    print(f"  ⚠️  Extra closing brace at position {i}")
            
            elif char == '(':
                paren_stack.append(i)
            elif char == ')':
                if paren_stack:
                    paren_stack.pop()
                else:
                    print(f"  ⚠️  Extra closing paren at position {i}")
        
        if brace_stack:
            print(f"  ⚠️  Found {len(brace_stack)} unclosed braces")
            for pos in brace_stack[-3:]:  # Show last 3
                line_num = func_content[:pos].count('\n') + 1
                context_start = max(0, pos - 100)
                context_end = min(len(before_return), pos + 100)
                context = before_return[context_start:context_end].replace('\n', ' ')
                print(f"    Line {line_num}: {context[:80]}")
            return True
        
        if paren_stack:
            print(f"  ⚠️  Found {len(paren_stack)} unclosed parens")
            return True
        
        print(f"  ✓ No unclosed blocks found")
        return False
        
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
    
    print("Analyzing unclosed blocks in problematic files...")
    print("=" * 80)
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            analyze_and_fix_file(file_path)
        else:
            print(f"\n{rel_path}: File not found")

if __name__ == '__main__':
    main()


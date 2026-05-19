#!/usr/bin/env python3
"""
Find unclosed code blocks before return statements
"""

import sys
import re
from pathlib import Path

def find_unclosed_blocks(file_path: Path):
    """Find unclosed blocks."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
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
        
        # Track brace positions
        brace_stack = []
        paren_stack = []
        bracket_stack = []
        
        issues = []
        
        for i, char in enumerate(before_return):
            line_num = func_content[:i].count('\n') + 1
            
            if char == '{':
                brace_stack.append((i, line_num, 'opening'))
            elif char == '}':
                if brace_stack:
                    brace_stack.pop()
                else:
                    issues.append({
                        'type': 'Extra closing brace',
                        'position': i,
                        'line': line_num
                    })
            
            elif char == '(':
                paren_stack.append((i, line_num, 'opening'))
            elif char == ')':
                if paren_stack:
                    paren_stack.pop()
                else:
                    issues.append({
                        'type': 'Extra closing paren',
                        'position': i,
                        'line': line_num
                    })
            
            elif char == '[':
                bracket_stack.append((i, line_num, 'opening'))
            elif char == ']':
                if bracket_stack:
                    bracket_stack.pop()
                else:
                    issues.append({
                        'type': 'Extra closing bracket',
                        'position': i,
                        'line': line_num
                    })
        
        # Report unclosed blocks
        if brace_stack:
            for pos, line, _ in brace_stack:
                context_start = max(0, pos - 100)
                context_end = min(len(before_return), pos + 100)
                context = before_return[context_start:context_end]
                issues.append({
                    'type': 'Unclosed brace',
                    'position': pos,
                    'line': line,
                    'context': context
                })
        
        if paren_stack:
            for pos, line, _ in paren_stack:
                context_start = max(0, pos - 100)
                context_end = min(len(before_return), pos + 100)
                context = before_return[context_start:context_end]
                issues.append({
                    'type': 'Unclosed paren',
                    'position': pos,
                    'line': line,
                    'context': context
                })
        
        if bracket_stack:
            for pos, line, _ in bracket_stack:
                context_start = max(0, pos - 100)
                context_end = min(len(before_return), pos + 100)
                context = before_return[context_start:context_end]
                issues.append({
                    'type': 'Unclosed bracket',
                    'position': pos,
                    'line': line,
                    'context': context
                })
        
        return {
            'brace_count': len(brace_stack),
            'paren_count': len(paren_stack),
            'bracket_count': len(bracket_stack),
            'issues': issues
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
    
    print("Finding unclosed blocks in problematic files...")
    print("=" * 80)
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            result = find_unclosed_blocks(file_path)
            if 'error' in result:
                print(f"  ❌ Error: {result['error']}")
            else:
                print(f"  Unclosed braces: {result['brace_count']}")
                print(f"  Unclosed parens: {result['paren_count']}")
                print(f"  Unclosed brackets: {result['bracket_count']}")
                
                if result['issues']:
                    print(f"\n  Issues found:")
                    for issue in result['issues'][:5]:  # Show first 5
                        print(f"    Line {issue['line']}: {issue['type']}")
                        if 'context' in issue:
                            context = issue['context'].replace('\n', '\\n')[:80]
                            print(f"      {context}")
        else:
            print(f"\n{rel_path}: File not found")

if __name__ == '__main__':
    main()


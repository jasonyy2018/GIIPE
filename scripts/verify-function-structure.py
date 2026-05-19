#!/usr/bin/env python3
"""
Verify function structure - check for unclosed functions
"""

import sys
import re
from pathlib import Path

def verify_function_structure(file_path: Path):
    """Verify function structure."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all function definitions
        function_patterns = [
            r'export\s+(default\s+)?function\s+(\w+)',
            r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>',
            r'const\s+(\w+)\s*=\s*function',
            r'function\s+(\w+)',
        ]
        
        functions = []
        for pattern in function_patterns:
            for match in re.finditer(pattern, content):
                func_name = match.group(1) if match.group(1) else match.group(2) if len(match.groups()) > 1 else match.group(0)
                func_start = match.start()
                line_num = content[:func_start].count('\n') + 1
                functions.append({
                    'name': func_name,
                    'start': func_start,
                    'line': line_num
                })
        
        # For each function, check if it's properly closed
        for func in functions:
            start_pos = func['start']
            
            # Find the opening brace after function definition
            after_func = content[start_pos:]
            brace_match = re.search(r'\{', after_func)
            if not brace_match:
                continue
            
            func_start = start_pos + brace_match.end()
            func_content = content[func_start:]
            
            # Count braces to find where function ends
            brace_count = 1
            pos = 0
            while brace_count > 0 and pos < len(func_content):
                if func_content[pos] == '{':
                    brace_count += 1
                elif func_content[pos] == '}':
                    brace_count -= 1
                pos += 1
            
            if brace_count > 0:
                # Function not closed
                func_line = func['line']
                issues.append({
                    'type': 'Unclosed function',
                    'function': func['name'],
                    'line': func_line,
                    'severity': 'high'
                })
        
        return issues
        
    except Exception as e:
        return [{'type': f'Error: {str(e)}', 'line': 0}]

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/admin/SystemSettingsManager.tsx',
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Verifying function structure...")
    print("=" * 80)
    
    found_issues = False
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = verify_function_structure(file_path)
            if issues:
                found_issues = True
                for issue in issues:
                    print(f"  Line {issue['line']}: {issue['type']} - {issue.get('function', 'N/A')}")
            else:
                print("  All functions are properly closed")
        else:
            print(f"\n{rel_path}: File not found")
    
    if not found_issues:
        print("\nSUCCESS: All functions are properly structured")
    
    return 0 if not found_issues else 1

if __name__ == '__main__':
    sys.exit(main())


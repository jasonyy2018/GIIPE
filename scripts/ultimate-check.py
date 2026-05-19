#!/usr/bin/env python3
"""
Ultimate comprehensive check for all possible issues
"""

import sys
import re
from pathlib import Path

def check_file(file_path: Path):
    """Comprehensive check for all possible issues."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # 1. Check for problematic Unicode characters
        problematic = {
            '\xa0': 'Non-breaking space',
            '\u200b': 'Zero-width space',
            '\ufeff': 'BOM',
            '\u200c': 'Zero-width non-joiner',
            '\u200d': 'Zero-width joiner',
        }
        
        for char, name in problematic.items():
            if char in content:
                issues.append({
                    'type': f'Invalid character: {name}',
                    'severity': 'high',
                    'line': content[:content.find(char)].count('\n') + 1
                })
        
        # 2. Check for syntax errors that cause "Unexpected token div"
        # Pattern: Missing closing brace before return
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, content))
        
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before_return = content[:match.start()]
            
            # Count open and close braces
            open_braces = before_return.count('{')
            close_braces = before_return.count('}')
            
            # Check if there's a function definition before return
            # Look for function/const/export default function
            func_pattern = r'(export\s+default\s+)?function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|const\s+\w+\s*=\s*\([^)]*\)\s*\{'
            func_matches = list(re.finditer(func_pattern, before_return))
            
            if func_matches:
                last_func = func_matches[-1]
                func_start = last_func.end()
                func_content = content[func_start:match.start()]
                
                # Check if function is properly closed
                func_open = func_content.count('{')
                func_close = func_content.count('}')
                
                if func_open > func_close:
                    issues.append({
                        'type': 'Possible unclosed function before return',
                        'severity': 'high',
                        'line': line_num,
                        'detail': f'Function starts at line {content[:last_func.start()].count(chr(10)) + 1}, open braces: {func_open}, close braces: {func_close}'
                    })
        
        # 3. Check for common syntax errors
        # Missing semicolon after statements before return
        # Pattern: statement without semicolon, then return
        error_patterns = [
            (r'(\w+)\s*\(\s*[^)]*\)\s*//[^\n]*\n\s*(\w+)\?\.\w+', 'Comment breaking statement'),
            (r'(\w+)\s*\(\s*[^)]*\)\s*//[^\n]*\n\s*(\w+)\?\.map', 'Comment breaking method chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*(\w+)\?\.', 'Comment breaking method chain'),
        ]
        
        for pattern, desc in error_patterns:
            if re.search(pattern, content):
                matches = list(re.finditer(pattern, content))
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    issues.append({
                        'type': desc,
                        'severity': 'high',
                        'line': line_num,
                        'detail': match.group(0)[:60]
                    })
        
        # 4. Check for double spaces in property access (real ones)
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        prop_matches = list(re.finditer(prop_pattern, content))
        for match in prop_matches:
            # Skip if it's spread operator
            start = match.start()
            context = content[max(0, start-10):start+20]
            if '...' not in context:
                line_num = content[:start].count('\n') + 1
                issues.append({
                    'type': 'Double spaces before property access',
                    'severity': 'high',
                    'line': line_num,
                    'detail': match.group(0)
                })
        
        # 5. Check for missing ternary operators
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        ternary_matches = list(re.finditer(ternary_pattern, content))
        for match in ternary_matches:
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            # Skip if in comment
            if '//' not in line_text[:line_text.find(match.group(1))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'severity': 'high',
                    'line': line_num,
                    'detail': match.group(0)[:60]
                })
        
        # 6. Check for unclosed parentheses/brackets before return
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before = content[:match.start()]
            
            # Count parentheses
            open_paren = before.count('(')
            close_paren = before.count(')')
            open_bracket = before.count('[')
            close_bracket = before.count(']')
            
            diff_paren = open_paren - close_paren
            diff_bracket = open_bracket - close_bracket
            
            if diff_paren > 2 or diff_bracket > 2:  # Allow some difference for JSX
                issues.append({
                    'type': 'Possible unclosed parentheses/brackets',
                    'severity': 'medium',
                    'line': line_num,
                    'detail': f'Parentheses diff: {diff_paren}, Brackets diff: {diff_bracket}'
                })
        
        return issues
        
    except UnicodeDecodeError:
        return [{'type': 'Invalid UTF-8 encoding', 'severity': 'critical', 'line': 0}]
    except Exception as e:
        return [{'type': f'Error reading file: {str(e)}', 'severity': 'critical', 'line': 0}]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Ultimate check of {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    critical_count = 0
    high_count = 0
    
    for file_path in all_files:
        issues = check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
            critical_count += sum(1 for i in issues if i['severity'] == 'critical')
            high_count += sum(1 for i in issues if i['severity'] == 'high')
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with issues:")
        print(f"  - Critical: {critical_count}")
        print(f"  - High severity: {high_count}")
        print()
        
        # Group by issue type
        issue_types = {}
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            for issue in issues:
                issue_type = issue['type']
                if issue_type not in issue_types:
                    issue_types[issue_type] = []
                
                issue_types[issue_type].append({
                    'file': rel_path,
                    'line': issue.get('line', 0),
                    'severity': issue.get('severity', 'medium'),
                    'detail': issue.get('detail', '')
                })
        
        # Print by severity
        print("ISSUES BY TYPE:")
        print("-" * 80)
        
        for issue_type in sorted(issue_types.keys()):
            files_list = issue_types[issue_type]
            severity = files_list[0]['severity']
            severity_marker = '!!!' if severity == 'critical' else '!!' if severity == 'high' else '!'
            
            print(f"\n{severity_marker} {issue_type} ({len(files_list)} occurrences):")
            for item in files_list[:15]:  # Show first 15
                line_info = f"line {item['line']}" if item['line'] > 0 else ""
                print(f"  - {item['file']} {line_info}")
                if item['detail']:
                    print(f"    {item['detail'][:70]}")
            if len(files_list) > 15:
                print(f"  ... and {len(files_list) - 15} more")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        
        return len(files_with_issues)
    else:
        print("\nSUCCESS: All files are clean! No issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


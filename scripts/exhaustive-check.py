#!/usr/bin/env python3
"""
Exhaustive check for all possible syntax and encoding issues
"""

import sys
import re
from pathlib import Path

def exhaustive_check(file_path: Path):
    """Exhaustive check for all possible issues."""
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
        }
        
        for char, name in problematic.items():
            if char in content:
                line_num = content[:content.find(char)].count('\n') + 1
                issues.append({
                    'type': f'Invalid character: {name}',
                    'line': line_num,
                    'severity': 'high'
                })
        
        # 2. Check for comments breaking method chains
        # Pattern: .method() // comment ?.nextMethod or .method() // comment .nextMethod
        patterns = [
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking slice chain'),
            (r'\.map\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking map chain'),
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking filter chain'),
            (r'\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking method chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*(\w+)\?\.', 'Comment breaking slice chain'),
            (r'\)\s*//[^\n]*\n\s*(\w+)\?\.map', 'Comment breaking method chain with map'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-50):match.end()+20].replace('\n', '\\n')
                issues.append({
                    'type': desc,
                    'line': line_num,
                    'severity': 'high',
                    'context': context[:100]
                })
        
        # 3. Check for missing ternary operators
        # Pattern: word, 3+ spaces, quote, text, quote, colon (but not in comments)
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        matches = list(re.finditer(ternary_pattern, content))
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            # Skip if in comment
            if '//' not in line_text[:max(0, line_text.find(match.group(1)))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)[:60]
                })
        
        # 4. Check for double spaces before property access (real ones, not spread)
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        matches = list(re.finditer(prop_pattern, content))
        for match in matches:
            start = match.start()
            context = content[max(0, start-10):start+20]
            # Skip if it's spread operator
            if '...' not in context:
                line_num = content[:start].count('\n') + 1
                issues.append({
                    'type': 'Double spaces before property access',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)
                })
        
        # 5. Check for syntax errors before return statements
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, content))
        
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before_return = content[:match.start()]
            
            # Check for unclosed functions
            # Look for function definition before return
            func_pattern = r'(export\s+default\s+)?function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*\{'
            func_matches = list(re.finditer(func_pattern, before_return))
            
            if func_matches:
                last_func = func_matches[-1]
                func_start = last_func.end()
                func_content = content[func_start:match.start()]
                
                # Count braces
                open_braces = func_content.count('{')
                close_braces = func_content.count('}')
                
                # Only report if significant difference
                if open_braces > close_braces + 1:  # Allow 1 for JSX
                    issues.append({
                        'type': 'Possible unclosed braces before return',
                        'line': line_num,
                        'severity': 'high',
                        'detail': f'Open: {open_braces}, Close: {close_braces}, Diff: {open_braces - close_braces}'
                    })
        
        # 6. Check for missing ? in URL query strings
        url_pattern = r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)'
        matches = list(re.finditer(url_pattern, content))
        for match in matches:
            url_part = match.group(1)
            if '?' not in url_part and '${' in match.group(0):
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Missing ? in URL query string',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)[:80]
                })
        
        return issues
        
    except UnicodeDecodeError:
        return [{'type': 'Invalid UTF-8 encoding', 'line': 0, 'severity': 'critical'}]
    except Exception as e:
        return [{'type': f'Error reading file: {str(e)}', 'line': 0, 'severity': 'critical'}]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Exhaustive check of {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    critical_count = 0
    high_count = 0
    
    for file_path in all_files:
        issues = exhaustive_check(file_path)
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
                    'context': issue.get('context', ''),
                    'detail': issue.get('detail', '')
                })
        
        # Print by issue type
        print("ISSUES BY TYPE:")
        print("-" * 80)
        
        for issue_type in sorted(issue_types.keys()):
            files_list = issue_types[issue_type]
            severity = files_list[0]['severity']
            marker = '!!!' if severity == 'critical' else '!!' if severity == 'high' else '!'
            
            print(f"\n{marker} {issue_type} ({len(files_list)} occurrences):")
            for item in files_list[:15]:
                line_info = f"line {item['line']}" if item['line'] > 0 else ""
                print(f"  - {item['file']} {line_info}")
                if item['context']:
                    print(f"    {item['context']}")
                if item['detail']:
                    print(f"    {item['detail']}")
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


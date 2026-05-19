#!/usr/bin/env python3
"""
Ultimate syntax check - find all possible build-breaking issues
"""

import sys
import re
from pathlib import Path

def check_file(file_path: Path):
    """Check a single file for all possible issues."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # 1. Invalid UTF-8 characters (that would cause "stream did not contain valid UTF-8")
        try:
            content.encode('utf-8')
        except UnicodeEncodeError as e:
            issues.append({
                'type': 'Invalid UTF-8 character',
                'line': 0,
                'severity': 'critical',
                'detail': str(e)
            })
        
        # 2. Comments breaking method chains (REAL syntax error)
        # Pattern: .method() // comment followed by ?. or .method
        chain_patterns = [
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking slice chain'),
            (r'\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking method chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\w+\?\.', 'Comment breaking slice chain'),
        ]
        
        for pattern, desc in chain_patterns:
            for match in re.finditer(pattern, content, re.MULTILINE):
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'type': desc,
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)[:60]
                })
        
        # 3. Missing ternary operator (REAL syntax error)
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        for match in re.finditer(ternary_pattern, content):
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            if '//' not in line_text[:max(0, line_text.find(match.group(1)))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)[:60]
                })
        
        # 4. Missing ? in URL query strings
        url_pattern = r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)'
        for match in re.finditer(url_pattern, content):
            url_part = match.group(1)
            if '?' not in url_part and '${' in match.group(0):
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Missing ? in URL query string',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)[:80]
                })
        
        # 5. Double spaces before property (not spread)
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        for match in re.finditer(prop_pattern, content):
            start = match.start()
            context = content[max(0, start-10):start+20]
            if '...' not in context:
                line_num = content[:start].count('\n') + 1
                issues.append({
                    'type': 'Double spaces before property access',
                    'line': line_num,
                    'severity': 'high',
                    'context': match.group(0)
                })
        
        # 6. BOM characters
        if content.startswith('\ufeff'):
            issues.append({
                'type': 'BOM character at start',
                'line': 1,
                'severity': 'high'
            })
        
        # 7. Non-breaking spaces (would cause issues)
        if '\xa0' in content:
            line_num = content[:content.find('\xa0')].count('\n') + 1
            issues.append({
                'type': 'Non-breaking space character',
                'line': line_num,
                'severity': 'high'
            })
        
        # 8. Zero-width spaces
        if '\u200b' in content:
            line_num = content[:content.find('\u200b')].count('\n') + 1
            issues.append({
                'type': 'Zero-width space character',
                'line': line_num,
                'severity': 'medium'
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
    
    print(f"Ultimate syntax check of {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    critical_count = 0
    high_count = 0
    
    for file_path in all_files:
        issues = check_file(file_path)
        if issues:
            # Filter out medium severity for now
            critical_issues = [i for i in issues if i['severity'] == 'critical']
            high_issues = [i for i in issues if i['severity'] == 'high']
            
            if critical_issues or high_issues:
                files_with_issues.append((file_path, critical_issues + high_issues))
                critical_count += len(critical_issues)
                high_count += len(high_issues)
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with issues:")
        print(f"  - Critical: {critical_count}")
        print(f"  - High severity: {high_count}")
        print()
        
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"{rel_path}:")
            for issue in issues:
                line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                print(f"  [{issue['severity'].upper()}] {line_info}: {issue['type']}")
                if 'context' in issue:
                    print(f"    {issue['context']}")
                if 'detail' in issue:
                    print(f"    {issue['detail']}")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        
        return len(files_with_issues)
    else:
        print("\n✅ SUCCESS: All files are clean! No real issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


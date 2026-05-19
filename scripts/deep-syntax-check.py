#!/usr/bin/env python3
"""
Deep syntax check focusing on real build-breaking issues
"""

import sys
import re
from pathlib import Path

def check_file(file_path: Path):
    """Deep check for real syntax issues."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # 1. Comments breaking method chains (REAL ISSUE)
        patterns = [
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice)', 'Comment breaking filter chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter)', 'Comment breaking slice chain'),
            (r'(\w+)\?\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.map', 'Comment breaking optional filter chain'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-30):match.end()+30].replace('\n', ' ')
                if '...' not in context:
                    issues.append({
                        'type': desc,
                        'severity': 'high',
                        'line': line_num,
                        'context': context[:80]
                    })
        
        # 2. Missing ternary operator (REAL ISSUE)
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        matches = list(re.finditer(ternary_pattern, content))
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            if '//' not in line_text[:max(0, line_text.find(match.group(1)))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)[:60]
                })
        
        # 3. Double spaces before property (not spread) - REAL ISSUE
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        matches = list(re.finditer(prop_pattern, content))
        for match in matches:
            start = match.start()
            context = content[max(0, start-10):start+20]
            if '...' not in context:
                line_num = content[:start].count('\n') + 1
                issues.append({
                    'type': 'Double spaces before property access',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)
                })
        
        # 4. Missing ? in URL query strings - REAL ISSUE
        url_pattern = r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)'
        matches = list(re.finditer(url_pattern, content))
        for match in matches:
            url_part = match.group(1)
            if '?' not in url_part and '${' in match.group(0):
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Missing ? in URL query string',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)[:80]
                })
        
        # 5. Check for invalid UTF-8 characters
        try:
            content.encode('utf-8')
        except UnicodeEncodeError:
            issues.append({
                'type': 'Invalid UTF-8 character',
                'severity': 'critical',
                'line': 0
            })
        
        # 6. Check for BOM
        if content.startswith('\ufeff'):
            issues.append({
                'type': 'BOM character',
                'severity': 'high',
                'line': 1
            })
        
        # 7. Check for problematic Unicode in strings
        problematic = ['\xa0', '\u200b']
        for char in problematic:
            if char in content:
                line_num = content[:content.find(char)].count('\n') + 1
                issues.append({
                    'type': f'Invalid character: {char}',
                    'severity': 'high',
                    'line': line_num
                })
        
        return issues
        
    except Exception as e:
        return [{
            'type': f'Error: {str(e)}',
            'severity': 'critical',
            'line': 0
        }]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Deep syntax check of {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    
    for file_path in all_files:
        issues = check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
    
    if files_with_issues:
        print(f"\n⚠️  Found {len(files_with_issues)} files with real issues:\n")
        
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"{rel_path}:")
            for issue in issues:
                line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                print(f"  [{issue['severity'].upper()}] {line_info}: {issue['type']}")
                if 'context' in issue:
                    print(f"    {issue['context']}")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        return len(files_with_issues)
    else:
        print("\n✅ SUCCESS: All files are clean! No real issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


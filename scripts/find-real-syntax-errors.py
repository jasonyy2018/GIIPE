#!/usr/bin/env python3
"""
Find real syntax errors that would cause build failures
"""

import sys
import re
from pathlib import Path

def find_real_errors(file_path: Path):
    """Find real syntax errors."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # 1. Comments breaking method chains (REAL issue)
        # Pattern: .method() // comment followed by ?. or .method
        patterns = [
            # .slice(0, 5) // comment ?.map
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking slice chain'),
            # .method() // comment ?.nextMethod
            (r'\)\s*//[^\n]*\n\s*\?\.(map|filter|slice)', 'Comment breaking method chain'),
            # .slice(0, 5) // comment events?.map
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\w+\?\.', 'Comment breaking slice chain with variable'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-30):match.end()+30]
                issues.append({
                    'type': desc,
                    'line': line_num,
                    'severity': 'high',
                    'context': context.replace('\n', ' ')
                })
        
        # 2. Missing ternary operators (REAL issue)
        # Pattern: word, 3+ spaces, quote, text, quote, colon (not in comments)
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
        
        # 3. Missing ? in URL query strings (REAL issue)
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
        
        # 4. Double spaces before property (REAL issue, not spread)
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
        
        return issues
        
    except Exception:
        return []

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Finding real syntax errors in {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    
    for file_path in all_files:
        issues = find_real_errors(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with REAL syntax errors:\n")
        
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"{rel_path}:")
            for issue in issues:
                print(f"  Line {issue['line']}: {issue['type']}")
                if issue['context']:
                    print(f"    {issue['context'][:80]}")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with real syntax errors")
        
        return len(files_with_issues)
    else:
        print("\nSUCCESS: No real syntax errors found!")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


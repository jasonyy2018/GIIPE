#!/usr/bin/env python3
"""
Comprehensive check for comments breaking method chains and other syntax issues
"""

import sys
import re
from pathlib import Path

def check_file(file_path: Path):
    """Check a file for method chain issues."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Pattern 1: Method call followed by comment, then another method call
        # .method() // comment ?.nextMethod or .method() // comment .nextMethod
        patterns = [
            # filter() // comment ?.map
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking filter chain'),
            # slice() // comment ?.map
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking slice chain'),
            # map() // comment ?.nextMethod
            (r'\.map\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking map chain'),
            # reduce() // comment ?.nextMethod
            (r'\.reduce\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking reduce chain'),
            # ) // comment ?.method (general pattern)
            (r'\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce|forEach)', 'Comment breaking method chain'),
            # filter() // comment .map (without ?)
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\.(map|filter|slice|reduce)', 'Comment breaking filter chain'),
            # slice() // comment .map (without ?)
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\.(map|filter|slice|reduce)', 'Comment breaking slice chain'),
            # Variable?.filter() // comment ?.map
            (r'(\w+)\?\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.map', 'Comment breaking optional filter chain'),
            # Variable?.slice() // comment ?.map
            (r'(\w+)\?\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.map', 'Comment breaking optional slice chain'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context_start = max(0, match.start() - 50)
                context_end = min(len(content), match.end() + 50)
                context = content[context_start:context_end].replace('\n', '\\n')
                
                issues.append({
                    'type': desc,
                    'line': line_num,
                    'severity': 'high',
                    'context': context
                })
        
        # Pattern 2: Missing ternary operator
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
        
        # Pattern 3: Double spaces before property (not spread)
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        matches = list(re.finditer(prop_pattern, content))
        for match in matches:
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
        
        return issues
        
    except Exception as e:
        return [{'type': f'Error reading file: {str(e)}', 'line': 0, 'severity': 'critical'}]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Comprehensive check of {len(all_files)} files for method chain issues...")
    print("=" * 80)
    
    files_with_issues = []
    
    for file_path in all_files:
        issues = check_file(file_path)
        if issues:
            # Filter out false positives (spread operators, etc.)
            real_issues = []
            for issue in issues:
                # Skip if context suggests it's a spread operator
                if '...' in issue.get('context', ''):
                    continue
                real_issues.append(issue)
            
            if real_issues:
                files_with_issues.append((file_path, real_issues))
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with method chain issues:\n")
        
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"{rel_path}:")
            for issue in issues:
                line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                print(f"  [{issue['severity'].upper()}] {line_info}: {issue['type']}")
                if 'context' in issue and issue['context']:
                    context = issue['context'][:100]
                    print(f"    Context: {context}")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        
        return len(files_with_issues)
    else:
        print("\n✅ SUCCESS: No method chain issues found in any files!")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


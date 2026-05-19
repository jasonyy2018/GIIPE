#!/usr/bin/env python3
"""
Find files with comments breaking method chains
"""

import sys
import re
from pathlib import Path

def find_issues(file_path: Path):
    """Find comments breaking method chains."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Pattern: method call, comment, then ?. or .method
        # Look for patterns like: .slice(0, 5) // comment ?.map
        patterns = [
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking slice chain'),
            (r'\)\s*//[^\n]*\n\s*(\w+)\?\.', 'Comment breaking method chain'),
            (r'\.map\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking map chain'),
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.', 'Comment breaking filter chain'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-30):match.end()+30]
                issues.append({
                    'type': desc,
                    'line': line_num,
                    'context': context.replace('\n', '\\n')[:100]
                })
        
        return issues
        
    except Exception as e:
        return []

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Searching for comments breaking method chains...")
    print("=" * 80)
    
    files_with_issues = []
    
    for file_path in all_files:
        issues = find_issues(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with issues:\n")
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"{rel_path}:")
            for issue in issues:
                print(f"  Line {issue['line']}: {issue['type']}")
                print(f"    {issue['context']}")
        print("\n" + "=" * 80)
        return len(files_with_issues)
    else:
        print("\nSUCCESS: No files with comments breaking method chains found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


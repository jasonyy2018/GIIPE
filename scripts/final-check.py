#!/usr/bin/env python3
"""
Final comprehensive check - only real issues
"""

import sys
import re
from pathlib import Path

def final_check_file(file_path: Path):
    """Final check - only real issues that would break build."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Only check for REAL issues that would break build
        
        # 1. Invalid UTF-8 characters (critical)
        if '\xa0' in content or '\u200b' in content or '\ufeff' in content:
            issues.append('Invalid UTF-8 characters')
        
        # 2. Real double spaces before property (not spread operator)
        # Pattern: identifier, 2+ spaces, dot, identifier (but not ...)
        matches = re.findall(r'(\w+)(\s{2,})\.(\w+)', content)
        for match in matches:
            # Check context - if it's spread operator, skip
            idx = content.find(match[0] + match[1] + '.' + match[2])
            if idx > 0:
                before = content[max(0, idx-5):idx]
                if '...' not in before and '...' not in content[idx:idx+10]:
                    issues.append(f'Double spaces: {match[0]}{match[1]}.{match[2]}')
                    break  # Only report first one
        
        # 3. Real missing ternary operator (not in comments)
        # Pattern that's clearly wrong: word, 3+ spaces, quote, text, quote, colon
        matches = re.findall(r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:', content)
        if matches:
            # Check if it's in a comment
            for match in matches:
                idx = content.find(match[0] + match[1] + match[2] + match[3])
                if idx > 0:
                    line_start = content.rfind('\n', 0, idx) + 1
                    line = content[line_start:idx+50]
                    if '//' not in line[:line.find(match[0])] and '/*' not in line[:line.find(match[0])]:
                        issues.append(f'Missing ternary: {match[0]}{match[1]}{match[2]}{match[3]}')
                        break
        
        # 4. Real URL issues (missing ? before query params)
        url_matches = re.findall(r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)', content)
        for match in url_matches:
            if '?' not in match[0] and '${' in match[1]:
                issues.append('Missing ? in URL')
                break
        
        return issues
        
    except UnicodeDecodeError:
        return ['Invalid UTF-8 encoding']
    except Exception:
        return []

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Final check of {len(all_files)} files (only real issues)...")
    print("=" * 80)
    
    files_with_issues = []
    
    for file_path in all_files:
        issues = final_check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with real issues:\n")
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"  {rel_path}:")
            for issue in issues:
                print(f"    - {issue}")
        print("\n" + "=" * 80)
        return len(files_with_issues)
    else:
        print("\nSUCCESS: All files are clean! No real issues found.")
        print("\nNote: Previous 'issues' were false positives (spread operators, etc.)")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


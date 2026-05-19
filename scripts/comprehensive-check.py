#!/usr/bin/env python3
"""
Comprehensive check for all types of encoding and syntax issues
"""

import sys
import re
from pathlib import Path

def check_file(file_path: Path):
    """Check a file for various issues."""
    issues = []
    
    try:
        # Try to read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for problematic characters
        if '\xa0' in content:
            issues.append(('Non-breaking space', content.count('\xa0')))
        if '\u200b' in content:
            issues.append(('Zero-width space', content.count('\u200b')))
        if '\ufeff' in content:
            issues.append(('BOM', 1))
        if '\u200c' in content or '\u200d' in content:
            issues.append(('Zero-width characters', content.count('\u200c') + content.count('\u200d')))
        
        # Check for double spaces before property access
        if re.search(r'\w+\s{2,}\.', content):
            matches = len(re.findall(r'\w+\s{2,}\.', content))
            issues.append(('Double spaces before property', matches))
        
        # Check for missing ternary operators
        if re.search(r'\w+\s{3,}[\'"]', content):
            matches = len(re.findall(r'\w+\s{3,}[\'"]', content))
            issues.append(('Possible missing ternary operator', matches))
        
        # Check for double spaces in type annotations
        if re.search(r'\w+\s{2,}:', content) and ('interface' in content or 'type' in content):
            matches = len(re.findall(r'\w+\s{2,}:', content))
            issues.append(('Double spaces in type annotation', matches))
        
        # Check for URL issues (missing ?)
        url_issues = 0
        for match in re.finditer(r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)', content):
            if '?' not in match.group(1):
                url_issues += 1
        if url_issues > 0:
            issues.append(('Missing ? in URL query string', url_issues))
        
        return issues
        
    except UnicodeDecodeError as e:
        return [('Invalid UTF-8 encoding', str(e))]
    except Exception as e:
        return [('Error reading file', str(e))]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    
    # Check all TypeScript/TSX files
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Comprehensive check of {len(all_files)} TypeScript/TSX files...")
    print("=" * 80)
    
    files_with_issues = []
    total_issues = 0
    
    for file_path in all_files:
        issues = check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
            total_issues += sum(count for _, count in issues)
    
    if files_with_issues:
        print(f"\nWARNING: Found {len(files_with_issues)} files with {total_issues} total issues:\n")
        
        # Group by issue type
        issue_types = {}
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            for issue_type, count in issues:
                if issue_type not in issue_types:
                    issue_types[issue_type] = []
                issue_types[issue_type].append((rel_path, count))
        
        # Print summary by issue type
        for issue_type, files in sorted(issue_types.items()):
            print(f"\n{issue_type} ({len(files)} files):")
            for rel_path, count in files[:10]:  # Show first 10
                print(f"  - {rel_path} ({count} occurrences)")
            if len(files) > 10:
                print(f"  ... and {len(files) - 10} more files")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        
        # Offer to fix
        print("\nTo fix these issues, run:")
        print("  python scripts/fix-all-jsx-errors.py")
        print("  python scripts/fix-bom.py")
        
        return len(files_with_issues)
    else:
        print("\nSUCCESS: All files are clean! No issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


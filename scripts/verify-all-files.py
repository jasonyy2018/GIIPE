#!/usr/bin/env python3
"""
Verify all TSX files are valid UTF-8 and have no encoding issues
"""

import sys
from pathlib import Path

def check_file(file_path: Path):
    """Check if a file has encoding issues."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for problematic characters
        issues = []
        if '\xa0' in content:
            issues.append('Non-breaking space')
        if '\u200b' in content:
            issues.append('Zero-width space')
        if '\ufeff' in content:
            issues.append('BOM')
        if '\u200c' in content or '\u200d' in content:
            issues.append('Zero-width characters')
        
        return issues
    except UnicodeDecodeError:
        return ['Invalid UTF-8 encoding']
    except Exception as e:
        return [f'Error: {str(e)}']

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_tsx = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Checking {len(all_tsx)} TypeScript/TSX files...")
    print("=" * 80)
    
    files_with_issues = []
    for file_path in all_tsx:
        issues = check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
    
    if files_with_issues:
        print(f"\n⚠️  Found {len(files_with_issues)} files with issues:\n")
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            print(f"  {rel_path}:")
            for issue in issues:
                print(f"    - {issue}")
    else:
        print("\n✅ All files are clean! No encoding issues found.")
    
    print("\n" + "=" * 80)
    return len(files_with_issues)

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


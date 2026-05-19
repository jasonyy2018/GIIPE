#!/usr/bin/env python3
"""
Script to find and fix encoding/syntax issues in TypeScript/TSX files
that cause "stream did not contain valid UTF-8" errors during build.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Common patterns that cause encoding/parsing issues
PATTERNS = [
    # Double spaces before property access (e.g., "data  .comments")
    (r'(\w+)\s{2,}\.', r'\1?.', 'Double spaces before property access'),
    
    # Missing ternary operator in template strings (placeholder)
    # Note: Complex ternary fixes are handled manually
    
    # Double spaces before ternary operator
    (r'(\w+)\s{2,}\?', r'\1 ?', 'Double spaces before ternary operator'),
    
    # Missing question mark in optional chaining
    (r'(\w+)\s{2,}\.', r'\1?.', 'Missing optional chaining'),
    
    # Double spaces in type annotations (e.g., "description  : string")
    (r'(\w+)\s{2,}:', r'\1:', 'Double spaces in type annotations'),
    
    # Incorrect URL concatenation (missing ?)
    (r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)', r'fetch(`\1?\2`)', 'Missing ? in URL query string'),
    
    # Double spaces in function parameters
    (r'(\w+)\s{2,},', r'\1,', 'Double spaces before comma in parameters'),
]

def find_tsx_files(root_dir: Path) -> List[Path]:
    """Find all TypeScript/TSX files in the project."""
    files = []
    for ext in ['*.ts', '*.tsx']:
        files.extend(root_dir.rglob(ext))
    return files

def check_file(file_path: Path) -> List[Tuple[int, str, str]]:
    """Check a file for issues and return list of (line_num, issue_type, suggestion)."""
    issues = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            # Check for double spaces before property access
            if re.search(r'\w+\s{2,}\.', line):
                issues.append((line_num, 'Double spaces before property', line.strip()[:80]))
            
            # Check for missing ternary operator
            if re.search(r'\w+\s{3,}[\'"]', line) or re.search(r'\w+\s{2,}\?', line):
                if '?' not in line and ('?' in line or ':' in line):
                    issues.append((line_num, 'Possible missing ternary operator', line.strip()[:80]))
            
            # Check for double spaces in type annotations
            if re.search(r'\w+\s{2,}:', line) and ('interface' in line or 'type' in line or ':' in line):
                issues.append((line_num, 'Double spaces in type annotation', line.strip()[:80]))
            
            # Check for URL issues
            if 'fetch' in line and '?' not in line and '${' in line:
                if re.search(r'`[^`]+\s+\$\{', line):
                    issues.append((line_num, 'Missing ? in URL query string', line.strip()[:80]))
            
    except UnicodeDecodeError as e:
        issues.append((0, f'ENCODING ERROR: {str(e)}', 'File may not be valid UTF-8'))
    except Exception as e:
        issues.append((0, f'ERROR reading file: {str(e)}', ''))
    
    return issues

def fix_file(file_path: Path, dry_run: bool = False) -> List[str]:
    """Fix issues in a file and return list of fixes applied."""
    fixes = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply fixes
        for pattern, replacement, description in PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                if content != original_content:
                    fixes.append(f"  - Fixed: {description}")
                    original_content = content
        
        # Write back if not dry run
        if not dry_run and content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return fixes
    
    except UnicodeDecodeError:
        return [f"  - ERROR: Cannot read file (encoding issue)"]
    except Exception as e:
        return [f"  - ERROR: {str(e)}"]

def main():
    """Main function to scan and fix files."""
    if len(sys.argv) > 1:
        root_dir = Path(sys.argv[1])
    else:
        # Default to frontend/src directory
        root_dir = Path(__file__).parent.parent / 'frontend' / 'src'
    
    if not root_dir.exists():
        print(f"Error: Directory {root_dir} does not exist")
        sys.exit(1)
    
    print(f"Scanning TypeScript/TSX files in: {root_dir}")
    print("=" * 80)
    
    files = find_tsx_files(root_dir)
    print(f"Found {len(files)} TypeScript/TSX files\n")
    
    # Check for issues
    total_issues = 0
    files_with_issues = []
    
    for file_path in files:
        issues = check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
            total_issues += len(issues)
    
    # Report findings
    if files_with_issues:
        print(f"Found {total_issues} potential issues in {len(files_with_issues)} files:\n")
        
        for file_path, issues in files_with_issues:
            print(f"\n{file_path.relative_to(root_dir.parent.parent)}:")
            for line_num, issue_type, context in issues:
                if line_num > 0:
                    print(f"  Line {line_num}: {issue_type}")
                    print(f"    {context}")
                else:
                    print(f"  {issue_type}: {context}")
        
        # Ask if user wants to fix
        print("\n" + "=" * 80)
        if '--fix' in sys.argv:
            print("Applying fixes...\n")
            for file_path, issues in files_with_issues:
                print(f"Fixing {file_path.name}...")
                fixes = fix_file(file_path, dry_run=False)
                if fixes:
                    for fix in fixes:
                        print(fix)
                else:
                    print("  - No auto-fixable issues found")
        else:
            print("\nTo automatically fix issues, run:")
            print(f"  python {sys.argv[0]} --fix")
            print("\nOr specify a directory:")
            print(f"  python {sys.argv[0]} <directory> --fix")
    else:
        print("✅ No issues found!")

if __name__ == '__main__':
    main()


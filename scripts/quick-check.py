#!/usr/bin/env python3
"""
Quick check - fast syntax and encoding validation
No Node.js dependencies required
"""

import os
import re
import sys
from pathlib import Path

def check_file(file_path: Path):
    """Quick check a single file."""
    issues = []
    
    try:
        # Read as binary first
        with open(file_path, 'rb') as f:
            content_bytes = f.read()
        
        # Check for encoding issues
        if b'\xef\xbf\xbd' in content_bytes:
            issues.append("Contains replacement character (U+FFFD)")
        
        # Decode and check syntax
        try:
            content = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            issues.append("Invalid UTF-8 encoding")
            return issues
        
        lines = content.split('\n')
        
        # Check for common issues
        for i, line in enumerate(lines, 1):
            # Unterminated strings
            if "'" in line and line.count("'") % 2 != 0:
                if '`' not in line and not line.strip().endswith('\\'):
                    issues.append(f"Line {i}: Possible unterminated string")
            
            # Comments breaking method chains
            if re.search(r'\)\s*//\s*[^/\n]*\?\.', line):
                issues.append(f"Line {i}: Comment breaking method chain")
        
        # Check for duplicate top-level exports
        exports = []
        for match in re.finditer(r'^export\s+(default\s+)?(function|const|class)\s+(\w+)', content, re.MULTILINE):
            name = match.group(3)
            line = content[:match.start()].count('\n') + 1
            if name in [e[0] for e in exports]:
                issues.append(f"Line {line}: Duplicate export '{name}'")
            else:
                exports.append((name, line))
        
    except Exception as e:
        issues.append(f"Error: {e}")
    
    return issues

def main():
    base_dir = Path(__file__).parent.parent
    frontend_src = base_dir / 'frontend' / 'src'
    
    if not frontend_src.exists():
        print(f"Error: {frontend_src} not found")
        return 1
    
    print("Quick Syntax & Encoding Check")
    print("=" * 80)
    print(f"Scanning: {frontend_src}\n")
    
    files = []
    for root, dirs, filenames in os.walk(frontend_src):
        if 'node_modules' in root or '.next' in root:
            continue
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')) and not filename.endswith('.d.ts'):
                files.append(Path(root) / filename)
    
    print(f"Found {len(files)} files\n")
    
    all_issues = {}
    for file_path in sorted(files):
        rel_path = file_path.relative_to(base_dir)
        issues = check_file(file_path)
        if issues:
            all_issues[rel_path] = issues
    
    if not all_issues:
        print("[OK] No issues found!")
        return 0
    
    print(f"[ERROR] Found issues in {len(all_issues)} files:\n")
    for file_path, issues in sorted(all_issues.items()):
        print(f"{file_path}:")
        for issue in issues:
            print(f"  - {issue}")
        print()
    
    return 1

if __name__ == '__main__':
    sys.exit(main())


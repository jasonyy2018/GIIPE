#!/usr/bin/env python3
"""
Ultimate comprehensive check for all TypeScript/TSX files
Similar to what would run in Ubuntu 24 Docker build
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

def find_tsx_files(base_dir: Path) -> List[Path]:
    """Find all TypeScript and TSX files."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        # Skip node_modules and other directories
        if 'node_modules' in root or '.next' in root or 'dist' in root:
            continue
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')) and not filename.endswith('.d.ts'):
                files.append(Path(root) / filename)
    return files

def check_file_encoding(file_path: Path) -> List[str]:
    """Check for encoding issues."""
    issues = []
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            # Check for BOM
            if content.startswith(b'\xef\xbb\xbf'):
                issues.append("BOM character detected")
            # Check for invalid UTF-8 sequences
            try:
                content.decode('utf-8')
            except UnicodeDecodeError as e:
                issues.append(f"Invalid UTF-8 encoding: {e}")
            # Check for replacement characters (indicates encoding issues)
            if b'\xef\xbf\xbd' in content:
                issues.append("Contains replacement character (U+FFFD) - possible encoding corruption")
    except Exception as e:
        issues.append(f"Error reading file: {e}")
    return issues

def check_duplicate_definitions(content: str, file_path: Path) -> List[str]:
    """Check for duplicate function/variable definitions."""
    issues = []
    
    # Find all const/function/let definitions
    patterns = [
        (r'const\s+(\w+)\s*=', 'const'),
        (r'function\s+(\w+)\s*\(', 'function'),
        (r'let\s+(\w+)\s*=', 'let'),
        (r'var\s+(\w+)\s*=', 'var'),
    ]
    
    for pattern, type_name in patterns:
        matches = list(re.finditer(pattern, content))
        names = {}
        for match in matches:
            name = match.group(1)
            if name in names:
                issues.append(f"Duplicate {type_name} definition: '{name}' (lines {names[name]} and {content[:match.start()].count(chr(10)) + 1})")
            else:
                names[name] = content[:match.start()].count(chr(10)) + 1
    
    return issues

def check_unterminated_strings(content: str, file_path: Path) -> List[str]:
    """Check for unterminated strings."""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # Check for single quotes
        single_quotes = line.count("'")
        if single_quotes % 2 != 0:
            # Check if it's a valid template literal or regex
            if not re.search(r'`[^`]*`', line) and not re.search(r'/[^/]*/', line):
                # Check if it's part of a multi-line string
                if i > 1:
                    prev_line = lines[i-2]
                    if not (prev_line.rstrip().endswith("'") or prev_line.rstrip().endswith('\\')):
                        issues.append(f"Line {i}: Possible unterminated single-quoted string")
        
        # Check for double quotes
        double_quotes = line.count('"')
        if double_quotes % 2 != 0:
            if not re.search(r'`[^`]*`', line):
                if i > 1:
                    prev_line = lines[i-2]
                    if not (prev_line.rstrip().endswith('"') or prev_line.rstrip().endswith('\\')):
                        issues.append(f"Line {i}: Possible unterminated double-quoted string")
    
    return issues

def check_comments_breaking_chains(content: str, file_path: Path) -> List[str]:
    """Check for comments breaking method chains."""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # Pattern: something.method() // comment?.something
        if re.search(r'\)\s*//\s*[^/]*\?\.', line):
            issues.append(f"Line {i}: Comment breaking method chain")
        # Pattern: something.method() // comment?.map
        if re.search(r'\)\s*//\s*[^/]*\?\.\w+', line):
            issues.append(f"Line {i}: Comment breaking method chain")
    
    return issues

def check_unclosed_blocks(content: str, file_path: Path) -> List[str]:
    """Check for unclosed blocks before return statements."""
    issues = []
    
    # Find all export default functions
    func_pattern = r'export\s+default\s+function\s+\w+'
    func_matches = list(re.finditer(func_pattern, content))
    
    for func_match in func_matches:
        func_start = func_match.end()
        # Find function body start
        body_match = re.search(r'\{', content[func_start:])
        if not body_match:
            continue
        
        body_start = func_start + body_match.start() + 1
        func_body = content[body_start:]
        
        # Find return statement
        return_match = re.search(r'\n\s*return\s*\(', func_body)
        if not return_match:
            continue
        
        before_return = func_body[:return_match.start()]
        
        # Count braces (simplified - ignoring strings and comments)
        brace_count = 0
        paren_count = 0
        bracket_count = 0
        
        in_string = False
        in_template = False
        string_char = None
        i = 0
        
        while i < len(before_return):
            char = before_return[i]
            next_char = before_return[i + 1] if i + 1 < len(before_return) else ''
            
            # Skip comments
            if not in_string and not in_template:
                if char == '/' and next_char == '/':
                    # Skip to end of line
                    while i < len(before_return) and before_return[i] != '\n':
                        i += 1
                    continue
                elif char == '/' and next_char == '*':
                    # Skip multi-line comment
                    i += 2
                    while i < len(before_return) - 1:
                        if before_return[i] == '*' and before_return[i + 1] == '/':
                            i += 2
                            break
                        i += 1
                    continue
            
            # Handle strings
            if not in_string and not in_template:
                if char in ('"', "'"):
                    in_string = True
                    string_char = char
                elif char == '`':
                    in_template = True
            elif in_string:
                if char == string_char and (i == 0 or before_return[i-1] != '\\'):
                    in_string = False
            elif in_template:
                if char == '`' and (i == 0 or before_return[i-1] != '\\'):
                    in_template = False
            
            # Count braces
            if not in_string and not in_template:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                elif char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                elif char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
            
            i += 1
        
        if brace_count != 0 or paren_count != 0 or bracket_count != 0:
            issues.append(f"Unbalanced blocks before return: braces={brace_count}, parens={paren_count}, brackets={bracket_count}")
    
    return issues

def check_corrupted_unicode(content: str, file_path: Path) -> List[str]:
    """Check for corrupted Unicode characters."""
    issues = []
    
    # Check for replacement characters
    if '\ufffd' in content:
        issues.append("Contains Unicode replacement character (U+FFFD)")
    
    # Check for common corrupted patterns
    corrupted_patterns = [
        (r'\?/kbd>', 'Corrupted kbd tag'),
        (r"icon:\s*'[^']*\?", 'Corrupted icon string'),
        (r"timing:\s*'[^']*\?", 'Corrupted timing string'),
    ]
    
    for pattern, description in corrupted_patterns:
        if re.search(pattern, content):
            issues.append(f"Found {description}")
    
    return issues

def check_file(file_path: Path) -> Dict[str, List[str]]:
    """Check a single file for all issues."""
    issues = {
        'encoding': [],
        'duplicates': [],
        'strings': [],
        'comments': [],
        'blocks': [],
        'unicode': []
    }
    
    try:
        # Encoding check
        issues['encoding'] = check_file_encoding(file_path)
        
        # Read file content
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # All other checks
        issues['duplicates'] = check_duplicate_definitions(content, file_path)
        issues['strings'] = check_unterminated_strings(content, file_path)
        issues['comments'] = check_comments_breaking_chains(content, file_path)
        issues['blocks'] = check_unclosed_blocks(content, file_path)
        issues['unicode'] = check_corrupted_unicode(content, file_path)
        
    except Exception as e:
        issues['encoding'].append(f"Error processing file: {e}")
    
    return issues

def main():
    """Main function."""
    base_dir = Path(__file__).parent.parent / 'frontend' / 'src'
    
    if not base_dir.exists():
        print(f"Error: {base_dir} does not exist")
        return 1
    
    print("=" * 80)
    print("Ultimate Comprehensive Check - All TypeScript/TSX Files")
    print("=" * 80)
    print(f"Scanning: {base_dir}")
    print()
    
    files = find_tsx_files(base_dir)
    print(f"Found {len(files)} TypeScript/TSX files\n")
    
    all_issues = {}
    total_issues = 0
    
    for file_path in sorted(files):
        rel_path = file_path.relative_to(Path(__file__).parent.parent)
        issues = check_file(file_path)
        
        # Count total issues for this file
        file_issue_count = sum(len(v) for v in issues.values())
        
        if file_issue_count > 0:
            all_issues[rel_path] = issues
            total_issues += file_issue_count
    
    # Report results
    if total_issues == 0:
        print("✅ All files passed comprehensive checks!")
        return 0
    
    print(f"\n❌ Found {total_issues} issues in {len(all_issues)} files:\n")
    
    for rel_path, issues in sorted(all_issues.items()):
        print(f"\n{rel_path}:")
        for category, issue_list in issues.items():
            if issue_list:
                print(f"  {category.upper()}:")
                for issue in issue_list:
                    print(f"    - {issue}")
    
    return 1

if __name__ == '__main__':
    sys.exit(main())


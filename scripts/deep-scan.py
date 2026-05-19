#!/usr/bin/env python3
"""
Deep scan for all types of encoding and syntax issues
"""

import sys
import re
from pathlib import Path

def deep_check_file(file_path: Path):
    """Deep check a file for all possible issues."""
    issues = []
    
    try:
        # Try to read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Check 1: Invalid UTF-8 characters
        problematic_chars = {
            '\xa0': 'Non-breaking space',
            '\u200b': 'Zero-width space',
            '\ufeff': 'BOM',
            '\u200c': 'Zero-width non-joiner',
            '\u200d': 'Zero-width joiner',
            '\u2028': 'Line separator',
            '\u2029': 'Paragraph separator',
        }
        
        for char, name in problematic_chars.items():
            count = content.count(char)
            if count > 0:
                issues.append({
                    'type': f'Invalid character: {name}',
                    'count': count,
                    'severity': 'high'
                })
        
        # Check 2: Double spaces before property access (real ones, not spread operators)
        # Pattern: word, 2+ spaces, dot, word (but not ... which is 3 dots)
        pattern1 = r'(\w+)(\s{2,})\.(\w+)'
        matches = list(re.finditer(pattern1, content))
        real_matches = []
        for match in matches:
            # Check if it's not a spread operator (...)
            start = match.start()
            # Look at the context - if there's a ... before, it's spread operator
            context_start = max(0, start - 10)
            context = content[context_start:start + match.end() - start]
            if '...' not in context and '. ' not in context:
                real_matches.append(match)
        
        if real_matches:
            issues.append({
                'type': 'Double spaces before property access',
                'count': len(real_matches),
                'severity': 'high',
                'examples': [content[m.start():m.end()] for m in real_matches[:3]]
            })
        
        # Check 3: Double spaces in type annotations
        # Pattern: word, 2+ spaces, colon (but not in comments or strings)
        pattern2 = r'(\w+)(\s{2,}):(\s*[^/\n])'
        matches = list(re.finditer(pattern2, content))
        real_matches = []
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line = lines[line_num - 1] if line_num <= len(lines) else ''
            # Skip if in comment
            if '//' in line[:match.start() - content[:match.start()].rfind('\n')] or '/*' in line:
                continue
            real_matches.append(match)
        
        if real_matches:
            issues.append({
                'type': 'Double spaces in type annotation',
                'count': len(real_matches),
                'severity': 'high',
                'examples': [content[m.start():m.end()] for m in real_matches[:3]]
            })
        
        # Check 4: Missing ternary operators (real ones)
        # Pattern: word, 3+ spaces, quote, text, quote, colon (but not in comments)
        pattern3 = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3(\s*):'
        matches = list(re.finditer(pattern3, content))
        if matches:
            issues.append({
                'type': 'Missing ternary operator',
                'count': len(matches),
                'severity': 'high',
                'examples': [content[m.start():m.end()] for m in matches[:3]]
            })
        
        # Check 5: Missing ? in URL query strings
        url_pattern = r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)'
        url_matches = list(re.finditer(url_pattern, content))
        real_url_issues = []
        for match in url_matches:
            url_part = match.group(1)
            if '?' not in url_part and '${' in match.group(0):
                real_url_issues.append(match)
        
        if real_url_issues:
            issues.append({
                'type': 'Missing ? in URL query string',
                'count': len(real_url_issues),
                'severity': 'high',
                'examples': [content[m.start():m.end()] for m in real_url_issues[:3]]
            })
        
        # Check 6: Unclosed JSX tags or brackets
        open_brackets = content.count('(') + content.count('[') + content.count('{')
        close_brackets = content.count(')') + content.count(']') + content.count('}')
        if abs(open_brackets - close_brackets) > 5:  # Allow some difference for JSX
            # More detailed check
            jsx_open = content.count('<') - content.count('</') - content.count('/>')
            jsx_close = content.count('>')
            if abs(jsx_open - jsx_close) > 3:
                issues.append({
                    'type': 'Possible unclosed JSX tags',
                    'count': abs(jsx_open - jsx_close),
                    'severity': 'medium'
                })
        
        # Check 7: Syntax errors in JSX (unclosed quotes, etc.)
        # Check for mismatched quotes in JSX attributes
        quote_pattern = r'className=["\']([^"\']*["\'])'
        quote_mismatches = []
        for match in re.finditer(quote_pattern, content):
            attr = match.group(0)
            if attr.count('"') % 2 != 0 and attr.count("'") % 2 != 0:
                quote_mismatches.append(match)
        
        if quote_mismatches:
            issues.append({
                'type': 'Mismatched quotes in JSX',
                'count': len(quote_mismatches),
                'severity': 'high'
            })
        
        return issues
        
    except UnicodeDecodeError as e:
        return [{
            'type': 'Invalid UTF-8 encoding',
            'count': 1,
            'severity': 'critical',
            'error': str(e)
        }]
    except Exception as e:
        return [{
            'type': 'Error reading file',
            'count': 1,
            'severity': 'critical',
            'error': str(e)
        }]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    
    # Check all TypeScript/TSX files
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Deep scanning {len(all_files)} TypeScript/TSX files...")
    print("=" * 80)
    
    files_with_issues = []
    total_issues = 0
    critical_issues = 0
    high_severity = 0
    
    for file_path in all_files:
        issues = deep_check_file(file_path)
        if issues:
            files_with_issues.append((file_path, issues))
            total_issues += sum(issue['count'] for issue in issues)
            critical_issues += sum(1 for issue in issues if issue['severity'] == 'critical')
            high_severity += sum(1 for issue in issues if issue['severity'] == 'high')
    
    if files_with_issues:
        print(f"\nFound {len(files_with_issues)} files with {total_issues} total issues:")
        print(f"  - Critical: {critical_issues}")
        print(f"  - High severity: {high_severity}")
        print()
        
        # Group by issue type
        issue_types = {}
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            for issue in issues:
                issue_type = issue['type']
                if issue_type not in issue_types:
                    issue_types[issue_type] = []
                
                example = issue.get('examples', [])
                issue_types[issue_type].append({
                    'file': rel_path,
                    'count': issue['count'],
                    'severity': issue['severity'],
                    'examples': example[:1]  # Just first example
                })
        
        # Print by severity
        print("ISSUES BY TYPE:")
        print("-" * 80)
        for issue_type in sorted(issue_types.keys()):
            files_list = issue_types[issue_type]
            severity = files_list[0]['severity']
            severity_marker = '!!!' if severity == 'critical' else '!!' if severity == 'high' else '!'
            
            print(f"\n{severity_marker} {issue_type} ({len(files_list)} files):")
            for item in files_list[:10]:  # Show first 10
                print(f"  - {item['file']} ({item['count']} occurrences)")
                if item['examples']:
                    print(f"    Example: {item['examples'][0][:60]}")
            if len(files_list) > 10:
                print(f"  ... and {len(files_list) - 10} more files")
        
        print("\n" + "=" * 80)
        print(f"Total: {len(files_with_issues)} files with issues")
        print("\nTo fix these issues, run:")
        print("  python scripts/fix-all-remaining-issues.py")
        print("  python scripts/fix-all-jsx-errors.py")
        
        return len(files_with_issues)
    else:
        print("\nSUCCESS: All files are clean! No issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


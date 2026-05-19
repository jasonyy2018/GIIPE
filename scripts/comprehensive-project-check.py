#!/usr/bin/env python3
"""
Comprehensive project-wide code check
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

def check_file(file_path: Path):
    """Check a single file for all possible issues."""
    issues = []
    
    try:
        # Try to read file
        content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                    content = f.read()
                break
            except:
                continue
        
        if content is None:
            issues.append({
                'type': 'Cannot read file',
                'severity': 'critical',
                'line': 0
            })
            return issues
        
        lines = content.split('\n')
        
        # 1. Check for invalid UTF-8 characters
        try:
            content.encode('utf-8')
        except UnicodeEncodeError as e:
            issues.append({
                'type': 'Invalid UTF-8 character',
                'severity': 'critical',
                'line': 0,
                'detail': str(e)
            })
        
        # 2. Check for BOM
        if content.startswith('\ufeff'):
            issues.append({
                'type': 'BOM character at start',
                'severity': 'high',
                'line': 1
            })
        
        # 3. Check for problematic Unicode characters
        problematic_chars = {
            '\xa0': 'Non-breaking space',
            '\u200b': 'Zero-width space',
            '\u200c': 'Zero-width non-joiner',
            '\u200d': 'Zero-width joiner',
        }
        
        for char, name in problematic_chars.items():
            if char in content:
                line_num = content[:content.find(char)].count('\n') + 1
                issues.append({
                    'type': f'Invalid character: {name}',
                    'severity': 'high',
                    'line': line_num
                })
        
        # 4. Check for comments breaking method chains
        chain_patterns = [
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter|slice)', 'Comment breaking filter chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter)', 'Comment breaking slice chain'),
            (r'\.map\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter)', 'Comment breaking map chain'),
            (r'\)\s*//[^\n]*\n\s*\?\.(map|filter|slice|reduce)', 'Comment breaking method chain'),
            (r'(\w+)\?\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.map', 'Comment breaking optional filter chain'),
        ]
        
        for pattern, desc in chain_patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-30):match.end()+30].replace('\n', ' ')
                # Skip if it's a spread operator
                if '...' not in context:
                    issues.append({
                        'type': desc,
                        'severity': 'high',
                        'line': line_num,
                        'context': context[:80]
                    })
        
        # 5. Check for missing ternary operators
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        matches = list(re.finditer(ternary_pattern, content))
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            # Skip if in comment
            if '//' not in line_text[:max(0, line_text.find(match.group(1)))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)[:60]
                })
        
        # 6. Check for double spaces before property (not spread)
        prop_pattern = r'(\w+)(\s{2,})\.(\w+)'
        matches = list(re.finditer(prop_pattern, content))
        for match in matches:
            start = match.start()
            context = content[max(0, start-10):start+20]
            if '...' not in context:
                line_num = content[:start].count('\n') + 1
                issues.append({
                    'type': 'Double spaces before property access',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)
                })
        
        # 7. Check for missing ? in URL query strings
        url_pattern = r'fetch\(`([^`]+)\s+(\$\{[^}]+\})`\)'
        matches = list(re.finditer(url_pattern, content))
        for match in matches:
            url_part = match.group(1)
            if '?' not in url_part and '${' in match.group(0):
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'type': 'Missing ? in URL query string',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)[:80]
                })
        
        # 8. Check for unclosed template strings (basic check)
        backticks = content.count('`')
        if backticks % 2 != 0:
            issues.append({
                'type': 'Possible unclosed template string',
                'severity': 'high',
                'line': 0
            })
        
        # 9. Check for function closure issues (only for TSX files)
        if file_path.suffix == '.tsx':
            # Find export default function
            main_func_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
            main_match = re.search(main_func_pattern, content)
            
            if main_match:
                func_start = main_match.end() - 1
                func_content = content[func_start:]
                
                # Find return statement
                return_pattern = r'\n\s*return\s*\('
                return_match = re.search(return_pattern, func_content)
                
                if return_match:
                    return_pos = return_match.start()
                    before_return = func_content[:return_pos]
                    
                    # Count braces (simplified - doesn't account for JSX expressions)
                    brace_count = 1
                    for char in before_return:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                    
                    # Only flag if significantly unbalanced (allowing for JSX)
                    if brace_count > 3:
                        issues.append({
                            'type': f'Possible unclosed braces before return (count: {brace_count})',
                            'severity': 'medium',
                            'line': return_pos + func_start
                        })
        
        return issues
        
    except Exception as e:
        return [{
            'type': f'Error checking file: {str(e)}',
            'severity': 'critical',
            'line': 0
        }]

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    
    if not root.exists():
        print(f"Error: {root} does not exist")
        return 1
    
    # Find all TypeScript/TSX files
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Comprehensive check of {len(all_files)} files...")
    print("=" * 80)
    
    files_with_issues = []
    issue_counts = defaultdict(int)
    
    for file_path in all_files:
        issues = check_file(file_path)
        
        # Filter out false positives
        real_issues = []
        for issue in issues:
            # Skip medium severity for now (they're often false positives with JSX)
            if issue['severity'] in ['critical', 'high']:
                real_issues.append(issue)
                issue_counts[issue['type']] += 1
        
        if real_issues:
            files_with_issues.append((file_path, real_issues))
    
    if files_with_issues:
        print(f"\n⚠️  Found {len(files_with_issues)} files with issues:\n")
        
        # Group by issue type
        by_type = defaultdict(list)
        for file_path, issues in files_with_issues:
            rel_path = file_path.relative_to(root)
            for issue in issues:
                by_type[issue['type']].append((rel_path, issue))
        
        # Print by issue type
        for issue_type in sorted(by_type.keys(), key=lambda x: len(by_type[x]), reverse=True):
            files_list = by_type[issue_type]
            severity = files_list[0][1]['severity']
            marker = '!!!' if severity == 'critical' else '!!' if severity == 'high' else '!'
            
            print(f"\n{marker} {issue_type} ({len(files_list)} occurrences):")
            for rel_path, issue in files_list[:20]:  # Show first 20
                line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                print(f"  - {rel_path} {line_info}")
                if 'context' in issue and issue['context']:
                    print(f"    {issue['context']}")
            if len(files_list) > 20:
                print(f"  ... and {len(files_list) - 20} more")
        
        print("\n" + "=" * 80)
        print(f"Summary:")
        print(f"  Files with issues: {len(files_with_issues)}")
        print(f"  Total issues: {sum(len(issues) for _, issues in files_with_issues)}")
        print(f"\nIssue breakdown:")
        for issue_type, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  - {issue_type}: {count}")
        
        return len(files_with_issues)
    else:
        print("\n✅ SUCCESS: All files are clean! No issues found.")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


#!/usr/bin/env python3
"""
Linux-compatible check - check for issues that might only appear on Linux
"""

import sys
import re
from pathlib import Path

def check_file_linux_compatible(file_path: Path):
    """Check file for Linux compatibility issues."""
    issues = []
    
    try:
        # Read as binary first to check for BOM and line endings
        with open(file_path, 'rb') as f:
            raw_bytes = f.read()
        
        # Check for BOM
        if raw_bytes.startswith(b'\xef\xbb\xbf'):
            issues.append({
                'type': 'BOM character detected (binary)',
                'severity': 'high',
                'line': 1
            })
        
        # Check line endings - should be LF only for Linux
        if b'\r\n' in raw_bytes:
            issues.append({
                'type': 'Windows line endings (CRLF) detected',
                'severity': 'high',
                'line': 0
            })
        
        # Check for null bytes
        if b'\x00' in raw_bytes:
            issues.append({
                'type': 'Null byte detected',
                'severity': 'critical',
                'line': 0
            })
        
        # Now read as text
        content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1']:
            try:
                with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                    content = f.read()
                break
            except:
                continue
        
        if content is None:
            issues.append({
                'type': 'Cannot read as text',
                'severity': 'critical',
                'line': 0
            })
            return issues
        
        lines = content.split('\n')
        
        # Check for problematic Unicode characters
        problematic_chars = {
            '\xa0': 'Non-breaking space',
            '\u200b': 'Zero-width space',
            '\u200c': 'Zero-width non-joiner',
            '\u200d': 'Zero-width joiner',
            '\ufeff': 'BOM',
            '\u2028': 'Line separator',
            '\u2029': 'Paragraph separator',
        }
        
        for char, name in problematic_chars.items():
            if char in content:
                line_num = content[:content.find(char)].count('\n') + 1
                issues.append({
                    'type': f'Invalid character: {name}',
                    'severity': 'high',
                    'line': line_num
                })
        
        # Check for comments breaking method chains (Linux might be stricter)
        patterns = [
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter)', 'Comment breaking filter chain'),
            (r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.(map|filter)', 'Comment breaking slice chain'),
            (r'(\w+)\?\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.map', 'Comment breaking optional filter chain'),
            (r'\)\s*//[^\n]*\n\s*\?\.(map|filter|slice)', 'Comment breaking method chain'),
        ]
        
        for pattern, desc in patterns:
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                context = content[max(0, match.start()-30):match.end()+30].replace('\n', ' ')
                if '...' not in context:
                    issues.append({
                        'type': desc,
                        'severity': 'high',
                        'line': line_num,
                        'context': context[:80]
                    })
        
        # Check for missing ternary operators
        ternary_pattern = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        matches = list(re.finditer(ternary_pattern, content))
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line_text = lines[line_num - 1] if line_num <= len(lines) else ''
            if '//' not in line_text[:max(0, line_text.find(match.group(1)))]:
                issues.append({
                    'type': 'Missing ternary operator',
                    'severity': 'high',
                    'line': line_num,
                    'context': match.group(0)[:60]
                })
        
        # Check for double spaces before property (not spread)
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
        
        # For TSX files, check function structure more carefully
        if file_path.suffix == '.tsx':
            # Find export default function
            main_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
            main_match = re.search(main_pattern, content)
            
            if main_match:
                func_start = main_match.end() - 1
                func_content = content[func_start:]
                
                # Find return statement
                return_pattern = r'\n\s*return\s*\('
                return_match = re.search(return_pattern, func_content)
                
                if return_match:
                    return_pos = return_match.start()
                    before_return = func_content[:return_pos]
                    
                    # Count braces (but ignore JSX expressions in strings/comments)
                    brace_count = 1
                    in_string = False
                    in_template = False
                    string_char = None
                    i = 0
                    
                    while i < len(before_return):
                        char = before_return[i]
                        
                        # Handle string literals
                        if not in_string and not in_template:
                            if char == '"' or char == "'":
                                in_string = True
                                string_char = char
                            elif char == '`':
                                in_template = True
                        elif in_string:
                            if char == string_char and before_return[i-1] != '\\':
                                in_string = False
                                string_char = None
                        elif in_template:
                            if char == '`' and before_return[i-1] != '\\':
                                in_template = False
                        
                        # Count braces only if not in string
                        if not in_string and not in_template:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                        
                        i += 1
                    
                    # Allow some tolerance for JSX (but not too much)
                    if brace_count > 3:
                        issues.append({
                            'type': f'Possible unclosed braces before return (count: {brace_count})',
                            'severity': 'high',
                            'line': return_match.start()
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
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Linux-compatible check for problematic files...")
    print("=" * 80)
    
    all_issues = []
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\n{rel_path}:")
            issues = check_file_linux_compatible(file_path)
            if issues:
                all_issues.extend([(rel_path, issue) for issue in issues])
                for issue in issues:
                    line_info = f"line {issue['line']}" if issue['line'] > 0 else ""
                    print(f"  [{issue['severity'].upper()}] {line_info}: {issue['type']}")
                    if 'context' in issue:
                        print(f"    {issue['context']}")
            else:
                print("  ✓ No issues found")
        else:
            print(f"\n{rel_path}: File not found")
    
    if all_issues:
        print("\n" + "=" * 80)
        print(f"⚠️  Found {len(all_issues)} issues")
        return len(all_issues)
    else:
        print("\n✅ All files are Linux-compatible!")
        return 0

if __name__ == '__main__':
    issues = main()
    sys.exit(0 if issues == 0 else 1)


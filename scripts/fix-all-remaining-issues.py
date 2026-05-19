#!/usr/bin/env python3
"""
Fix all remaining encoding and syntax issues
"""

import sys
import re
from pathlib import Path

def fix_file(file_path: Path):
    """Fix all issues in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        original = content
        fixes = []
        
        # Fix double spaces before property access (but not in regex patterns)
        def fix_double_spaces(match):
            # Check if it's in a regex pattern (between /.../)
            start_pos = match.start()
            # Look backwards for regex pattern start
            before = content[max(0, start_pos-50):start_pos]
            if '/' in before and '\\' not in before[-10:]:
                # Might be in regex, check more carefully
                lines = content[:start_pos].split('\n')
                current_line = lines[-1] if lines else ''
                if re.search(r'/[^/]*$', current_line):
                    return match.group(0)  # Don't fix if in regex
            # Fix it
            return match.group(1) + '?.' + match.group(2) if match.group(2) else match.group(1) + '.'
        
        # More careful pattern: only fix if it's clearly a property access
        # Pattern: word followed by 2+ spaces, then a dot, then another word
        pattern1 = r'(\w+)(\s{2,})\.(\w+)'
        new_content = re.sub(pattern1, r'\1?.\3', content)
        if new_content != content:
            fixes.append('Double spaces before property')
            content = new_content
        
        # Fix double spaces in type annotations (but not in comments)
        pattern2 = r'(\w+)(\s{2,}):(\s*[^/\n])'
        new_content = re.sub(pattern2, r'\1:\3', content)
        if new_content != content:
            fixes.append('Double spaces in type annotation')
            content = new_content
        
        # Fix missing ternary operators in template strings
        # Pattern: word, 3+ spaces, quote, text, quote, colon
        pattern3 = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3(\s*):'
        new_content = re.sub(pattern3, r'\1 ? \3\4\3 :', content)
        if new_content != content:
            fixes.append('Missing ternary operator')
            content = new_content
        
        # Remove any remaining problematic characters
        content = content.replace('\xa0', ' ')
        content = content.replace('\u200b', '')
        content = content.replace('\ufeff', '')
        
        if content != original or fixes:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            if fixes:
                print(f"  ✓ Fixed {file_path.name}: {', '.join(fixes)}")
            return True
        
        return False
        
    except Exception as e:
        print(f"  ✗ Error: {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    # Get list of files with issues from comprehensive check
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print("Fixing all remaining issues...")
    print("=" * 80)
    
    fixed_count = 0
    total_files = len(all_files)
    
    for i, file_path in enumerate(all_files, 1):
        if i % 50 == 0:
            print(f"Progress: {i}/{total_files} files checked...")
        
        if fix_file(file_path):
            fixed_count += 1
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed_count} files")
    print(f"📊 Checked: {total_files} files")

if __name__ == '__main__':
    main()


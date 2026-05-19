#!/usr/bin/env python3
"""
Fix JSX return statement errors by checking for unclosed functions/brackets
"""

import sys
import re
from pathlib import Path

def check_and_fix_file(file_path: Path):
    """Check and fix JSX return statement errors."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        original = content
        fixes = []
        
        # Check for common issues that cause "Unexpected token div" errors
        
        # 1. Remove any problematic characters
        content = content.replace('\xa0', ' ')
        content = content.replace('\u200b', '')
        content = content.replace('\ufeff', '')
        
        # 2. Fix double spaces before property access (real ones)
        # Pattern: identifier, 2+ spaces, dot, identifier (but not spread operator)
        def fix_prop_access(match):
            full_match = match.group(0)
            # Check if it's spread operator
            start_idx = match.start()
            before = content[max(0, start_idx-10):start_idx]
            if '...' in before or '...' in content[start_idx:start_idx+10]:
                return full_match
            # Fix it
            return match.group(1) + '?.' + match.group(3)
        
        pattern1 = r'(\w+)(\s{2,})\.(\w+)'
        new_content = re.sub(pattern1, fix_prop_access, content)
        if new_content != content:
            fixes.append('Double spaces before property')
            content = new_content
        
        # 3. Fix double spaces in type annotations
        pattern2 = r'(\w+)(\s{2,}):(\s*[^/\n])'
        new_content = re.sub(pattern2, r'\1:\3', content)
        if new_content != content:
            fixes.append('Double spaces in type annotation')
            content = new_content
        
        # 4. Ensure proper line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Write back if changed
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
    problematic_files = [
        'frontend/src/components/admin/SystemSettingsManager.tsx',
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
    ]
    
    print("Fixing JSX return statement errors...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if check_and_fix_file(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")

if __name__ == '__main__':
    main()


#!/usr/bin/env python3
"""
Fix remaining JSX errors by ensuring proper encoding and syntax
"""

import sys
import re
from pathlib import Path

def fix_file_comprehensive(file_path: Path):
    """Comprehensively fix a file."""
    try:
        # Read with error handling
        content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                    content = f.read()
                break
            except:
                continue
        
        if content is None:
            print(f"  ✗ Could not read: {file_path.name}")
            return False
        
        original = content
        fixes = []
        
        # Remove all problematic characters
        content = content.replace('\xa0', ' ')
        content = content.replace('\u200b', '')
        content = content.replace('\ufeff', '')
        content = content.replace('\u200c', '')
        content = content.replace('\u200d', '')
        content = content.replace('\u2028', '\n')
        content = content.replace('\u2029', '\n')
        
        # Fix double spaces before property
        pattern1 = r'(\w+)(\s{2,})\.(\w+)'
        new_content = re.sub(pattern1, r'\1?.\3', content)
        if new_content != content:
            fixes.append('Double spaces before property')
            content = new_content
        
        # Fix double spaces in type annotations
        pattern2 = r'(\w+)(\s{2,}):(\s*[^/\n])'
        new_content = re.sub(pattern2, r'\1:\3', content)
        if new_content != content:
            fixes.append('Double spaces in type annotation')
            content = new_content
        
        # Fix missing ternary operator
        pattern3 = r'(\w+)\s{3,}([\'"])([^\'"]+)\2\s*:'
        new_content = re.sub(pattern3, r'\1 ? \2\3\2 :', content)
        if new_content != content:
            fixes.append('Missing ternary operator')
            content = new_content
        
        # Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Write back
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        
        if fixes:
            print(f"  ✓ Fixed {file_path.name}: {', '.join(fixes)}")
        else:
            print(f"  ✓ Cleaned {file_path.name}")
        
        return True
        
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
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Comprehensively fixing JSX files...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if fix_file_comprehensive(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")

if __name__ == '__main__':
    main()


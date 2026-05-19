#!/usr/bin/env python3
"""
Force fix JSX files with encoding issues
"""

import sys
from pathlib import Path

def force_fix_file(file_path: Path):
    """Force fix a file by re-encoding it."""
    try:
        # Read with multiple encoding attempts
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
        
        # Clean all problematic characters
        content = content.replace('\xa0', ' ')
        content = content.replace('\u200b', '')
        content = content.replace('\ufeff', '')
        content = content.replace('\u200c', '')
        content = content.replace('\u200d', '')
        content = content.replace('\u2028', '\n')
        content = content.replace('\u2029', '\n')
        
        # Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Write back as clean UTF-8
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        
        print(f"  ✓ Fixed: {file_path.name}")
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
    ]
    
    print("Force fixing JSX files...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if force_fix_file(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")

if __name__ == '__main__':
    main()


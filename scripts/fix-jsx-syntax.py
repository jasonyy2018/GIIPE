#!/usr/bin/env python3
"""
Fix JSX syntax errors caused by encoding issues
"""

import sys
from pathlib import Path

def fix_file(file_path: Path):
    """Fix encoding and syntax issues in a file."""
    try:
        # Read with error replacement
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        # Remove any problematic characters
        # Replace non-breaking spaces with regular spaces
        content = content.replace('\xa0', ' ')
        # Replace other problematic unicode characters
        content = content.replace('\u200b', '')  # Zero-width space
        content = content.replace('\ufeff', '')   # BOM
        
        # Write back as clean UTF-8
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        
        print(f"  ✓ Fixed: {file_path.name}")
        return True
    except Exception as e:
        print(f"  ✗ Error fixing {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/admin/SystemSettingsManager.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Fixing JSX syntax errors...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if fix_file(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")

if __name__ == '__main__':
    main()


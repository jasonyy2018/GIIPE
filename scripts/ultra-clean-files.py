#!/usr/bin/env python3
"""
Ultra clean files - remove all problematic characters and normalize
"""

import sys
from pathlib import Path

def ultra_clean(file_path: Path):
    """Ultra clean a file."""
    try:
        # Read with multiple attempts
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
        
        # Remove ALL problematic characters
        problematic = {
            '\xa0': ' ',  # Non-breaking space -> space
            '\u200b': '',  # Zero-width space -> remove
            '\ufeff': '',  # BOM -> remove
            '\u200c': '',  # Zero-width non-joiner -> remove
            '\u200d': '',  # Zero-width joiner -> remove
            '\u2028': '\n',  # Line separator -> newline
            '\u2029': '\n',  # Paragraph separator -> newline
        }
        
        for old, new in problematic.items():
            content = content.replace(old, new)
        
        # Normalize line endings to LF only
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove trailing whitespace from each line
        lines = content.split('\n')
        cleaned_lines = [line.rstrip() for line in lines]
        content = '\n'.join(cleaned_lines)
        
        # Ensure file ends with exactly one newline
        if content and not content.endswith('\n'):
            content += '\n'
        
        # Write back with clean UTF-8, no BOM
        with open(file_path, 'wb') as f:
            f.write(content.encode('utf-8'))
        
        print(f"  ✓ Ultra cleaned: {file_path.name}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Ultra cleaning problematic files...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nCleaning: {rel_path}")
            if ultra_clean(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Ultra cleaned: {fixed} files")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())


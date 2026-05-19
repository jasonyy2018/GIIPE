#!/usr/bin/env python3
"""
Force re-encode problematic files to clean UTF-8
"""

import sys
from pathlib import Path

def force_reencode(file_path: Path):
    """Force re-encode file to clean UTF-8."""
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
        
        # Remove all problematic characters
        content = content.replace('\xa0', ' ')  # Non-breaking space
        content = content.replace('\u200b', '')  # Zero-width space
        content = content.replace('\ufeff', '')  # BOM
        content = content.replace('\u200c', '')  # Zero-width non-joiner
        content = content.replace('\u200d', '')  # Zero-width joiner
        content = content.replace('\u2028', '\n')  # Line separator
        content = content.replace('\u2029', '\n')  # Paragraph separator
        
        # Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove trailing whitespace from lines
        lines = content.split('\n')
        cleaned_lines = [line.rstrip() for line in lines]
        content = '\n'.join(cleaned_lines)
        
        # Ensure file ends with newline
        if not content.endswith('\n'):
            content += '\n'
        
        # Write back with clean UTF-8
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        
        print(f"  ✓ Re-encoded: {file_path.name}")
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
    
    print("Force re-encoding problematic files...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nRe-encoding: {rel_path}")
            if force_reencode(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Re-encoded: {fixed} files")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())


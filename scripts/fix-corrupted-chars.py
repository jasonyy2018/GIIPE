#!/usr/bin/env python3
"""
Fix corrupted characters in TSX files
"""

import sys
from pathlib import Path

def fix_file(file_path: Path):
    """Fix corrupted characters in a file."""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Fix corrupted kbd tag
        content = content.replace(b'>\xef\xbf\xbd?/kbd>', b'>Ctrl</kbd>')
        content = content.replace(b'>?/kbd>', b'>Ctrl</kbd>')
        
        # Fix corrupted validation icon (decode, fix, encode)
        try:
            text = content.decode('utf-8', errors='replace')
            # Fix various corrupted patterns
            import re
            text = re.sub(r"'validation', label: 'Validation', icon: '[^']*", "'validation', label: 'Validation', icon: '✓'", text)
            text = re.sub(r"'validation', label: 'Validation', icon: '.*?(?=',)", "'validation', label: 'Validation', icon: '✓'", text)
            content = text.encode('utf-8')
        except Exception as e:
            print(f"Error in text processing: {e}")
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        print(f"Fixed: {file_path}")
        return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    """Main function."""
    files = [
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
    ]
    
    base_path = Path(__file__).parent.parent
    
    for rel_path in files:
        file_path = base_path / rel_path
        if file_path.exists():
            fix_file(file_path)
        else:
            print(f"File not found: {rel_path}")

if __name__ == '__main__':
    main()


#!/usr/bin/env python3
"""
Fix line endings to LF only for Linux compatibility
"""

import sys
from pathlib import Path

def fix_line_endings(file_path: Path):
    """Fix line endings to LF only."""
    try:
        # Read as binary
        with open(file_path, 'rb') as f:
            raw_bytes = f.read()
        
        # Convert CRLF to LF
        if b'\r\n' in raw_bytes:
            raw_bytes = raw_bytes.replace(b'\r\n', b'\n')
            raw_bytes = raw_bytes.replace(b'\r', b'\n')
            
            # Remove BOM if present
            if raw_bytes.startswith(b'\xef\xbb\xbf'):
                raw_bytes = raw_bytes[3:]
            
            # Write back
            with open(file_path, 'wb') as f:
                f.write(raw_bytes)
            
            print(f"  ✓ Fixed line endings: {file_path.name}")
            return True
        else:
            print(f"  - Already LF: {file_path.name}")
            return False
        
    except Exception as e:
        print(f"  ✗ Error: {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print(f"Fixing line endings for {len(all_files)} files...")
    print("=" * 80)
    
    fixed = 0
    for file_path in all_files:
        if fix_line_endings(file_path):
            fixed += 1
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())


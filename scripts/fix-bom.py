#!/usr/bin/env python3
"""
Remove BOM from files
"""

import sys
from pathlib import Path

def remove_bom(file_path: Path):
    """Remove BOM from a file."""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Remove BOM if present
        if content.startswith(b'\xef\xbb\xbf'):
            content = content[3:]
            with open(file_path, 'wb') as f:
                f.write(content)
            print(f"  ✓ Removed BOM from: {file_path.name}")
            return True
        return False
    except Exception as e:
        print(f"  ✗ Error: {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    files_with_bom = [
        'frontend/src/hooks/useOffline.ts',
        'frontend/src/services/dataLoadingService.ts',
        'frontend/src/services/dataSynchronizationService.ts',
        'frontend/src/services/internationalizationService.ts',
        'frontend/src/services/searchAutocompleteService.ts',
        'frontend/src/utils/extractImage.ts',
        'frontend/src/app/api/admin/users/bulk/route.ts',
        'frontend/src/app/api/admin/users/bulk/activate/route.ts',
        'frontend/src/app/api/admin/users/bulk/change-role/route.ts',
        'frontend/src/app/api/admin/users/bulk/deactivate/route.ts',
    ]
    
    print("Removing BOM from files...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in files_with_bom:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            if remove_bom(file_path):
                fixed += 1
        else:
            print(f"  - Not found: {rel_path}")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")

if __name__ == '__main__':
    main()


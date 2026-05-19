#!/usr/bin/env python3
"""
Comprehensive fix for JSX syntax errors - removes all problematic characters and ensures clean UTF-8
"""

import sys
import re
from pathlib import Path

def clean_file(file_path: Path):
    """Clean a file of all problematic characters and encoding issues."""
    try:
        # Try to read with different encodings
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
        
        # Remove problematic characters
        # Non-breaking spaces and other whitespace issues
        content = content.replace('\xa0', ' ')  # Non-breaking space
        content = content.replace('\u200b', '')  # Zero-width space
        content = content.replace('\ufeff', '')   # BOM
        content = content.replace('\u200c', '')   # Zero-width non-joiner
        content = content.replace('\u200d', '')   # Zero-width joiner
        content = content.replace('\u2028', '\n')  # Line separator
        content = content.replace('\u2029', '\n')  # Paragraph separator
        
        # Fix common encoding issues in JSX
        # Replace curly quotes with straight quotes in JSX attributes
        content = re.sub(r'(["\'])([^"\']*)(["\'])', lambda m: 
            m.group(1) + m.group(2).replace('"', '"').replace('"', '"').replace(''', "'").replace(''', "'") + m.group(3),
            content)
        
        # Ensure proper line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Fix any double spaces before dots (common issue)
        content = re.sub(r'(\w+)\s{2,}\.', r'\1?.', content)
        
        # Fix missing ternary operators (common pattern)
        content = re.sub(r'(\w+)\s{3,}[\'"]([^\'"]+)[\'"]\s*:', r'\1 ? \'\2\' :', content)
        
        # Write back as clean UTF-8
        if content != original or True:  # Always rewrite to ensure clean encoding
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            print(f"  ✓ Fixed: {file_path.name}")
            return True
        else:
            print(f"  - No changes: {file_path.name}")
            return False
        
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
    
    print("Comprehensive JSX syntax fix...")
    print("=" * 80)
    
    fixed = 0
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if clean_file(file_path):
                fixed += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    # Also scan for other files with similar issues
    print("\n" + "=" * 80)
    print("Scanning for other potential issues...")
    
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_tsx = list(root.rglob('*.tsx'))
    
    issues_found = []
    for file_path in all_tsx:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            # Check for problematic patterns
            if '\xa0' in content or '\u200b' in content or '\ufeff' in content:
                issues_found.append(file_path)
                print(f"  Found encoding issues in: {file_path.relative_to(root)}")
                clean_file(file_path)
                fixed += 1
        except:
            pass
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")
    if issues_found:
        print(f"⚠️  Found {len(issues_found)} additional files with encoding issues")

if __name__ == '__main__':
    main()


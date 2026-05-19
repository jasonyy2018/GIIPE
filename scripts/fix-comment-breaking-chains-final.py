#!/usr/bin/env python3
"""
Find and fix comments breaking method chains
"""

import sys
import re
from pathlib import Path

def fix_file(file_path: Path):
    """Fix comments breaking method chains."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Pattern: method() // comment ?.nextMethod or method() // comment .nextMethod
        # More specific patterns
        patterns = [
            # .filter() // comment ?.map
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.', r'.filter(\1) // comment\n          .', True),
            # .filter() // comment .map
            (r'\.filter\([^)]+\)\s*//[^\n]*\n\s*(\.map|\.filter|\.slice)', r'.filter(\1) // comment\n          \2', True),
            # comments?.filter() // comment ?.map
            (r'(\w+)\?\.filter\(([^)]+)\)\s*//[^\n]*\n\s*\?\.map', r'\1?.filter(\2).map', False),
            # comments?.filter() // comment .map
            (r'(\w+)\?\.filter\(([^)]+)\)\s*//[^\n]*\n\s*\.map', r'\1?.filter(\2).map', False),
        ]
        
        # More general pattern: find method chains broken by comments
        # Pattern: method() // comment followed by ?. or .method
        def fix_chain_comment(match):
            before = match.group(1)
            comment = match.group(2)
            after = match.group(3)
            
            # If after starts with ?. or ., remove the ? from after
            if after.startswith('?.'):
                return f'{before} // {comment}\n          .{after[2:]}'
            elif after.startswith('.'):
                return f'{before} // {comment}\n          {after}'
            return match.group(0)
        
        # Find patterns like: ) // comment followed by ?.method
        pattern = r'(\))\s*//([^\n]*)\n\s*(\?\.\w+)'
        content = re.sub(pattern, lambda m: f'{m.group(1)} //{m.group(2)}\n          .{m.group(3)[2:]}', content)
        
        # Find patterns like: ) // comment followed by .method
        pattern2 = r'(\))\s*//([^\n]*)\n\s*(\.\w+)'
        content = re.sub(pattern2, lambda m: f'{m.group(1)} //{m.group(2)}\n          {m.group(3)}', content)
        
        # More specific: filter() // comment ?.map
        pattern3 = r'\.filter\(([^)]+)\)\s*//([^\n]*)\n\s*\?\.map'
        content = re.sub(pattern3, r'.filter(\1) //\2\n          .map', content)
        
        # More specific: filter() // comment .map
        pattern4 = r'\.filter\(([^)]+)\)\s*//([^\n]*)\n\s*\.map'
        content = re.sub(pattern4, r'.filter(\1) //\2\n          .map', content)
        
        # More specific: comments?.filter() // comment ?.map
        pattern5 = r'(\w+)\?\.filter\(([^)]+)\)\s*//([^\n]*)\n\s*\?\.map'
        content = re.sub(pattern5, r'\1?.filter(\2).map', content)
        
        changed = content != original
        
        if changed:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            print(f"  ✓ Fixed: {file_path.name}")
            return True
        else:
            print(f"  - No issues: {file_path.name}")
            return False
        
    except Exception as e:
        print(f"  ✗ Error: {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    root = Path(__file__).parent.parent / 'frontend' / 'src'
    all_files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts'))
    
    print("Finding comments breaking method chains...")
    print("=" * 80)
    
    fixed = 0
    for file_path in all_files:
        if fix_file(file_path):
            fixed += 1
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed} files")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())


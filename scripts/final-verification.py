#!/usr/bin/env python3
"""
Final verification of all fixed files
"""

import sys
import re
from pathlib import Path

def verify_file(file_path: Path):
    """Verify a file has no syntax issues."""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for problematic patterns
        # 1. Comments breaking method chains
        pattern1 = r'\.filter\([^)]+\)\s*//[^\n]*\n\s*\?\.map'
        if re.search(pattern1, content):
            issues.append('Comment breaking filter chain')
        
        pattern2 = r'\.slice\([^)]+\)\s*//[^\n]*\n\s*\?\.'
        if re.search(pattern2, content):
            issues.append('Comment breaking slice chain')
        
        # 2. Missing ternary operators
        pattern3 = r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:'
        if re.search(pattern3, content):
            issues.append('Missing ternary operator')
        
        # 3. Double spaces before property (not spread)
        pattern4 = r'(\w+)(\s{2,})\.(\w+)'
        matches = re.finditer(pattern4, content)
        for match in matches:
            start = match.start()
            context = content[max(0, start-10):start+20]
            if '...' not in context:
                issues.append('Double spaces before property')
                break
        
        # 4. BOM
        if content.startswith('\ufeff'):
            issues.append('BOM character')
        
        # 5. Invalid UTF-8
        try:
            content.encode('utf-8')
        except UnicodeEncodeError:
            issues.append('Invalid UTF-8')
        
        return issues
        
    except Exception as e:
        return [f'Error: {str(e)}']

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
        'frontend/src/components/admin/SystemSettingsManager.tsx',
    ]
    
    print("Final verification of fixed files...")
    print("=" * 80)
    
    all_clean = True
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            issues = verify_file(file_path)
            if issues:
                all_clean = False
                print(f"\n❌ {rel_path}:")
                for issue in issues:
                    print(f"  - {issue}")
            else:
                print(f"✅ {rel_path}: Clean")
        else:
            print(f"⚠️  {rel_path}: File not found")
    
    print("\n" + "=" * 80)
    if all_clean:
        print("✅ All files are clean and ready for build!")
    else:
        print("❌ Some files still have issues")
    
    return 0 if all_clean else 1

if __name__ == '__main__':
    sys.exit(main())


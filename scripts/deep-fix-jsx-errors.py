#!/usr/bin/env python3
"""
Deep fix for JSX "Unexpected token div" errors
This usually means there's a syntax error before the return statement
"""

import sys
import re
from pathlib import Path

def fix_file(file_path: Path):
    """Fix a file with JSX return errors."""
    try:
        # Read file with multiple encodings
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
        
        # 1. Remove all problematic Unicode characters
        replacements = {
            '\xa0': ' ',  # Non-breaking space
            '\u200b': '',  # Zero-width space
            '\ufeff': '',  # BOM
            '\u200c': '',  # Zero-width non-joiner
            '\u200d': '',  # Zero-width joiner
            '\u2028': '\n',  # Line separator
            '\u2029': '\n',  # Paragraph separator
        }
        
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        # 2. Fix double spaces before property (not spread)
        # Pattern: word + 2+ spaces + dot + word
        def fix_spaces(match):
            before = match.group(1)
            after = match.group(3)
            # Check if it's spread operator
            context = content[max(0, match.start()-5):match.end()+5]
            if '...' in context:
                return match.group(0)
            return f'{before}?.{after}'
        
        content = re.sub(r'(\w+)(\s{2,})\.(\w+)', fix_spaces, content)
        
        # 3. Fix missing ternary operators
        # Pattern: word + 3+ spaces + quote + text + quote + colon
        def fix_ternary(match):
            var = match.group(1)
            quote = match.group(3)
            text = match.group(4)
            return f'{var} ? {quote}{text}{quote} :'
        
        content = re.sub(r'(\w+)(\s{3,})([\'"])([^\'"]+)\3\s*:', fix_ternary, content)
        
        # 4. Check for unclosed function calls before return
        # Find all return statements
        return_pattern = r'\n\s*return\s*\('
        return_matches = list(re.finditer(return_pattern, content))
        
        for match in return_matches:
            line_num = content[:match.start()].count('\n') + 1
            before_return = content[:match.start()]
            
            # Get last 500 chars before return
            last_500 = before_return[-500:]
            
            # Check for unclosed parentheses
            paren_count = last_500.count('(') - last_500.count(')')
            if paren_count > 0:
                # Try to find where the unclosed paren is
                # Look for function calls that might be unclosed
                func_call_pattern = r'(\w+)\s*\([^)]*$'
                if re.search(func_call_pattern, last_500):
                    print(f"    Warning: Possible unclosed function call before return at line {line_num}")
        
        # 5. Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # 6. Remove BOM if present
        if content.startswith('\ufeff'):
            content = content[1:]
        
        # 7. Ensure proper encoding - write and read back to normalize
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        
        # Read back to verify
        with open(file_path, 'rb') as f:
            raw_bytes = f.read()
            try:
                raw_bytes.decode('utf-8')
            except UnicodeDecodeError:
                print(f"    Warning: File still has encoding issues")
                # Force re-encode
                with open(file_path, 'w', encoding='utf-8', errors='replace', newline='\n') as f:
                    f.write(content.encode('utf-8', errors='replace').decode('utf-8'))
        
        changed = content != original
        if changed:
            print(f"  ✓ Fixed: {file_path.name}")
        else:
            print(f"  ✓ Cleaned: {file_path.name}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error fixing {file_path.name}: {e}")
        return False

def main():
    """Main function."""
    problematic_files = [
        'frontend/src/components/public/CommentSection.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/settings/page.tsx',
    ]
    
    print("Deep fixing JSX files with 'Unexpected token div' errors...")
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
    
    return 0

if __name__ == '__main__':
    sys.exit(main())


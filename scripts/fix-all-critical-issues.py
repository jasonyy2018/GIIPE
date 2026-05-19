#!/usr/bin/env python3
"""
Fix all critical issues that would cause build failures
"""

import os
import re
import sys
from pathlib import Path

def find_tsx_files(base_dir: Path):
    """Find all TSX files."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        if 'node_modules' in root or '.next' in root or 'dist' in root:
            continue
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')) and not filename.endswith('.d.ts'):
                files.append(Path(root) / filename)
    return files

def fix_file(file_path: Path):
    """Fix critical issues in a file."""
    try:
        with open(file_path, 'rb') as f:
            content_bytes = f.read()
        
        # Check for replacement characters
        if b'\xef\xbf\xbd' in content_bytes:
            # Decode and fix
            try:
                content = content_bytes.decode('utf-8', errors='replace')
                # Replace common corrupted patterns
                content = content.replace('\ufffd', '')  # Remove replacement chars where possible
                
                # Fix specific corrupted patterns
                content = re.sub(r'\?/kbd>', 'Ctrl</kbd>', content)
                content = re.sub(r"icon:\s*'[^']*\?", lambda m: m.group(0).split("'")[0] + "'✓'", content)
                content = re.sub(r"timing:\s*'[^']*\?", "timing: '⏰'", content)
                
                # Re-encode
                content_bytes = content.encode('utf-8')
            except:
                pass
        
        # Fix comments breaking method chains
        content = content_bytes.decode('utf-8', errors='replace')
        
        # Pattern: ) // comment?.method
        content = re.sub(r'\)\s*//\s*[^/\n]*\?\.(\w+)', r').\1', content)
        
        # Pattern: ) // comment?.map
        content = re.sub(r'\)\s*//\s*[^/\n]*\?\.map', r').map', content)
        
        # Fix unterminated strings (common patterns)
        lines = content.split('\n')
        fixed_lines = []
        for i, line in enumerate(lines):
            # Check for single quote issues
            if "'" in line and line.count("'") % 2 != 0:
                # Check if it's a valid case (template literal, etc.)
                if not ('`' in line or line.strip().endswith('\\')):
                    # Try to fix common patterns
                    if re.search(r"icon:\s*'[^']*$", line):
                        line = re.sub(r"icon:\s*'[^']*$", "icon: '✓'", line)
                    elif re.search(r"timing:\s*'[^']*$", line):
                        line = re.sub(r"timing:\s*'[^']*$", "timing: '⏰'", line)
            
            fixed_lines.append(line)
        
        content = '\n'.join(fixed_lines)
        
        # Write back
        with open(file_path, 'wb') as f:
            f.write(content.encode('utf-8'))
        
        return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    import os
    base_dir = Path(__file__).parent.parent / 'frontend' / 'src'
    
    if not base_dir.exists():
        print(f"Error: {base_dir} does not exist")
        return 1
    
    files = find_tsx_files(base_dir)
    print(f"Scanning {len(files)} files for critical issues...")
    
    fixed_count = 0
    for file_path in files:
        if fix_file(file_path):
            fixed_count += 1
    
    print(f"\nProcessed {fixed_count} files")
    return 0

if __name__ == '__main__':
    sys.exit(main())


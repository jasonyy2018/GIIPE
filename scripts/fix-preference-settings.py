#!/usr/bin/env python3
"""Fix corrupted string in PreferenceLearningSettings.tsx"""

from pathlib import Path

def fix_file():
    file_path = Path(__file__).parent.parent / 'frontend/src/components/settings/PreferenceLearningSettings.tsx'
    
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Fix corrupted timing string
    text = content.decode('utf-8', errors='replace')
    text = text.replace("timing: '?", "timing: '⏰'")
    text = text.replace("timing: '?", "timing: '⏰'")
    
    with open(file_path, 'wb') as f:
        f.write(text.encode('utf-8'))
    
    print(f"Fixed: {file_path}")

if __name__ == '__main__':
    fix_file()


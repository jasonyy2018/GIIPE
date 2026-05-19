#!/usr/bin/env python3
"""Fix corrupted timing string"""

import re
from pathlib import Path

path = Path(__file__).parent.parent / 'frontend/src/components/settings/PreferenceLearningSettings.tsx'

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix corrupted timing string - replace any pattern that looks like timing: '? with proper closure
content = re.sub(r"timing:\s*'[^']*", "timing: '⏰'", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed timing string')


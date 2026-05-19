#!/usr/bin/env python3
import re

path = 'frontend/src/components/settings/PreferenceLearningSettings.tsx'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix corrupted icon string
content = re.sub(r"icon:\s*'[^']*\?", "icon: '✓'", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed')


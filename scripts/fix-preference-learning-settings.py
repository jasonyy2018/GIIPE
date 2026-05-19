#!/usr/bin/env python3
"""Fix PreferenceLearningSettings.tsx encoding and syntax issues"""

path = 'frontend/src/components/settings/PreferenceLearningSettings.tsx'

# Read file with error handling
with open(path, 'rb') as f:
    content_bytes = f.read()

# Decode and re-encode to clean UTF-8
content = content_bytes.decode('utf-8', errors='replace')

# Remove any replacement characters that shouldn't be there
# But keep valid emoji characters
import re

# Fix any corrupted patterns
content = re.sub(r'\ufffd', '', content)  # Remove replacement chars

# Ensure proper line endings
content = content.replace('\r\n', '\n').replace('\r', '\n')

# Write back with clean UTF-8
with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('Fixed encoding issues')


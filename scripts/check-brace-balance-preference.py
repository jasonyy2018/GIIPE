#!/usr/bin/env python3
"""Check brace balance for PreferenceLearningSettings.tsx"""

content = open('frontend/src/components/settings/PreferenceLearningSettings.tsx', 'r', encoding='utf-8', errors='replace').read()

# Find renderAnalyticsTab function
import re
match = re.search(r'const renderAnalyticsTab = \(\) => \(', content)
if match:
    func_start = match.end()
    # Find the closing ); for this function
    lines = content[:func_start].split('\n')
    start_line = len(lines)
    
    # Count braces from function start
    brace_count = 1  # Starting with (
    paren_count = 0
    bracket_count = 0
    
    i = func_start
    while i < len(content) - 1:
        if content[i:i+2] == ');':
            if brace_count == 1 and paren_count == 0 and bracket_count == 0:
                end_line = content[:i].count('\n') + 1
                print(f"Function closes at line {end_line}")
                print(f"Content before return:")
                lines_after = content[i+2:].split('\n')[:10]
                for j, line in enumerate(lines_after):
                    print(f"  {end_line + j + 1}: {line[:80]}")
                break
        elif content[i] == '(':
            paren_count += 1
        elif content[i] == ')':
            paren_count -= 1
        elif content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
        elif content[i] == '[':
            bracket_count += 1
        elif content[i] == ']':
            bracket_count -= 1
        i += 1


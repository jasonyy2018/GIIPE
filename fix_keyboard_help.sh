#!/bin/bash
# Fix KeyboardShortcutsHelp.tsx specifically

cd /root/dockerdata/GIIPE

# Fix the modifier symbols - handle both ? and replacement character
sed -i "s/'Alt': '\?/'Alt': '⌥'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Alt': '\?/'Alt': '⌥'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Ctrl': '\?/'Ctrl': '⌃'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Ctrl': '\?/'Ctrl': '⌃'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Shift': '\?/'Shift': '⇧'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Shift': '\?/'Shift': '⇧'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Meta': '\?/'Meta': '⌘'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Meta': '\?/'Meta': '⌘'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx

echo "KeyboardShortcutsHelp.tsx fixed!"
echo "Now rebuild: docker compose -f docker-compose.prod.yml build frontend"


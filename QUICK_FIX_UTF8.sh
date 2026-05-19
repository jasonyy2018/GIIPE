#!/bin/bash
# Quick fix for UTF-8 encoding errors in TypeScript files

cd /root/dockerdata/GIIPE

# Fix SystemMaintenanceTools.tsx
sed -i "s/🗄\?/🗄️/g" frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i "s/🗑\?/🗑️/g" frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i "s/?Optimize/⚙️ Optimize/g" frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i 's/<span className="text-green-600">?<\/span>/<span className="text-green-600">✓<\/span>/g' frontend/src/components/admin/SystemMaintenanceTools.tsx

# Fix SystemSettingsManager.tsx
sed -i 's/?{/• {/g' frontend/src/components/admin/SystemSettingsManager.tsx

# Fix SensitiveWordManager.tsx
sed -i 's/?{/• {/g' frontend/src/components/admin/SensitiveWordManager.tsx

# Fix KeyboardShortcutsHelp.tsx
sed -i "s/'Alt': '?/'Alt': '⌥'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Ctrl': '?/'Ctrl': '⌃'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Shift': '?/'Shift': '⇧'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx
sed -i "s/'Meta': '?/'Meta': '⌘'/g" frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx

echo "UTF-8 encoding fixed! Now rebuild:"
echo "docker compose -f docker-compose.prod.yml build frontend"


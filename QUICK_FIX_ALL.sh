#!/bin/bash
# Quick fix for all UTF-8 encoding errors
# Run this on the server

cd /root/dockerdata/GIIPE

echo "Fixing all UTF-8 encoding errors..."

# Fix SystemMaintenanceTools.tsx
sed -i 's/🗄\?/🗄️/g' frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i 's/🗑\?/🗑️ /g' frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i 's/?Optimize/⚙️ Optimize/g' frontend/src/components/admin/SystemMaintenanceTools.tsx
sed -i 's/<span className="text-green-600">?<\/span>/<span className="text-green-600">✓<\/span>/g' frontend/src/components/admin/SystemMaintenanceTools.tsx

# Fix SystemSettingsManager.tsx
sed -i 's/?{/• {/g' frontend/src/components/admin/SystemSettingsManager.tsx

# Fix SensitiveWordManager.tsx
sed -i 's/?{/• {/g' frontend/src/components/admin/SensitiveWordManager.tsx

# Fix KeyboardShortcutsHelp.tsx - replace the entire modifierSymbols object
cat > /tmp/modifier_symbols.txt << 'EOF'
    const modifierSymbols = {
      'Alt': '⌥',
      'Ctrl': '⌃',
      'Shift': '⇧',
      'Meta': '⌘'
    };
EOF

# Use sed to replace the modifierSymbols object
sed -i '/const modifierSymbols = {/,/};/c\
    const modifierSymbols = {\
      '\''Alt'\'': '\''⌥'\'',\
      '\''Ctrl'\'': '\''⌃'\'',\
      '\''Shift'\'': '\''⇧'\'',\
      '\''Meta'\'': '\''⌘'\''\
    };' frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx

# Fix internationalizationService.ts - fix unterminated string
sed -i "s/nativeName: '.*direction:/nativeName: '日本語',\n        direction:/g" frontend/src/services/internationalizationService.ts

# Fix ModerationQueue.tsx and EnhancedSearchInterface.tsx - remove any corrupted characters
# These files might have invisible corrupted characters, so we'll use Python for them
python3 -c "
import re
files = [
    'frontend/src/components/admin/ModerationQueue.tsx',
    'frontend/src/components/search/EnhancedSearchInterface.tsx'
]
for f in files:
    try:
        with open(f, 'rb') as file:
            content = file.read()
        try:
            text = content.decode('utf-8')
        except:
            text = content.decode('utf-8', errors='replace')
        # Remove any replacement characters at the start of lines or in strings
        text = re.sub(r'[^\x00-\x7F]', lambda m: m.group(0) if ord(m.group(0)) > 127 and ord(m.group(0)) < 0x10000 else '', text)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(text)
        print(f'Fixed: {f}')
    except Exception as e:
        print(f'Error fixing {f}: {e}')
"

echo ""
echo "✓ All files fixed! Now rebuild:"
echo "  docker compose -f docker-compose.prod.yml build frontend"


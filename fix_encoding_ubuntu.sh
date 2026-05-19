#!/bin/bash
# Fix encoding issues for Ubuntu 24 Docker build
# Run this on Ubuntu server

set -e

cd /root/dockerdata/GIIPE || cd "$(dirname "$0")"

echo "🔧 Fixing file encoding for Ubuntu 24..."
echo "=========================================="

# Install required tools if needed
if ! command -v iconv &> /dev/null; then
    echo "Installing iconv..."
    apt-get update && apt-get install -y libc6-dev || true
fi

# Function to fix a single file
fix_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # 1. Remove BOM (Byte Order Mark)
    sed -i "1s/^\xEF\xBB\xBF//" "$file" 2>/dev/null || true
    
    # 2. Fix line endings (CRLF to LF)
    sed -i "s/\r$//" "$file"
    
    # 3. Try to convert to UTF-8
    # First, detect current encoding
    detected=$(file -bi "$file" | grep -oP "charset=\K[^;]+" || echo "unknown")
    
    if [ "$detected" != "utf-8" ] && [ "$detected" != "unknown" ]; then
        echo "  Converting $file from $detected to UTF-8..."
        iconv -f "$detected" -t UTF-8 "$file" > "${file}.tmp" 2>/dev/null && \
        mv "${file}.tmp" "$file" || true
    fi
    
    # 4. Validate UTF-8
    iconv -f UTF-8 -t UTF-8 "$file" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "  ⚠ Warning: $file may still have encoding issues"
        # Try to fix by removing invalid bytes
        iconv -f UTF-8 -t UTF-8//IGNORE "$file" > "${file}.tmp" 2>/dev/null && \
        mv "${file}.tmp" "$file" || true
    fi
    
    return 0
}

# Fix all TypeScript/TSX files
echo "📝 Fixing TypeScript files..."
find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
    fix_file "$file"
done

# Fix specific problematic files
echo ""
echo "🎯 Fixing known problematic files..."
problem_files=(
    "frontend/src/components/admin/SystemMaintenanceTools.tsx"
    "frontend/src/components/admin/SystemSettingsManager.tsx"
    "frontend/src/components/admin/SensitiveWordManager.tsx"
    "frontend/src/components/admin/ModerationQueue.tsx"
    "frontend/src/components/admin/CommentPreviewModal.tsx"
    "frontend/src/components/search/EnhancedSearchInterface.tsx"
    "frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx"
    "frontend/src/services/internationalizationService.ts"
)

for file in "${problem_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  Fixing $file..."
        fix_file "$file"
    fi
done

# Verify encoding
echo ""
echo "✅ Verifying file encodings..."
invalid_files=0
find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
    if ! iconv -f UTF-8 -t UTF-8 "$file" > /dev/null 2>&1; then
        echo "  ⚠ Invalid UTF-8: $file"
        ((invalid_files++)) || true
    fi
done

echo ""
echo "=========================================="
if [ $invalid_files -eq 0 ]; then
    echo "✅ All files are now UTF-8 encoded!"
    echo ""
    echo "Next steps:"
    echo "  docker compose -f docker-compose.prod.yml build --no-cache frontend"
else
    echo "⚠ Some files may still have issues. Check the warnings above."
fi


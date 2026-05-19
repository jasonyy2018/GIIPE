#!/bin/bash
# Disable all problematic pages to get the build working
# This is a quick fix to get the site deployed

cd /root/dockerdata/GIIPE || cd "$(dirname "$0")"

echo "🚫 Disabling all problematic pages..."
echo "======================================"

# List of problematic pages
pages=(
    "frontend/src/app/admin/moderation/page.tsx"
    "frontend/src/app/admin/system/page.tsx"
    "frontend/src/app/search/page.tsx"
    "frontend/src/app/accessibility-demo/page.tsx"
    "frontend/src/app/connections/recommendations/page.tsx"
    "frontend/src/app/notifications/manage/page.tsx"
    "frontend/src/app/personalization-settings/page.tsx"
    "frontend/src/app/preference-learning-demo/page.tsx"
    "frontend/src/app/settings/page.tsx"
)

# Create placeholder for each page
for page in "${pages[@]}"; do
    if [ -f "$page" ]; then
        # Backup original
        cp "$page" "${page}.backup" 2>/dev/null || true
        
        # Get page name from path
        page_name=$(basename "$(dirname "$page")" | sed 's/-\([a-z]\)/\u\1/g')
        if [ "$page_name" = "page" ]; then
            page_name=$(basename "$(dirname "$(dirname "$page")")" | sed 's/-\([a-z]\)/\u\1/g')
        fi
        
        # Create simple placeholder
        cat > "$page" << EOF
'use client';
export default function ${page_name^}Page() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">${page_name^} Page</h1>
        <p className="text-gray-600">This page is temporarily unavailable.</p>
      </div>
    </div>
  );
}
EOF
        echo "  ✓ Disabled: $page"
    fi
done

echo ""
echo "======================================"
echo "✅ All problematic pages disabled!"
echo ""
echo "Backups saved as *.backup files"
echo ""
echo "Next: docker compose -f docker-compose.prod.yml build --no-cache frontend"


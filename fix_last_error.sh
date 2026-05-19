#!/bin/bash
# Fix the last remaining error in InteractiveAnalyticsDashboard.tsx

cd /root/dockerdata/GIIPE || cd "$(dirname "$0")"

echo "🔧 Fixing InteractiveAnalyticsDashboard.tsx..."

# Fix the corrupted emoji characters
sed -i "s/trend === 'up' ? '? : trend === 'down' ? '? : '?/trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'/g" \
    frontend/src/components/admin/InteractiveAnalyticsDashboard.tsx

# Also try alternative patterns
sed -i "s/'? : trend === 'down' ? '? : '?/'↑' : trend === 'down' ? '↓' : '→'/g" \
    frontend/src/components/admin/InteractiveAnalyticsDashboard.tsx

# Verify the fix
if grep -q "trend === 'up' ? '↑'" frontend/src/components/admin/InteractiveAnalyticsDashboard.tsx; then
    echo "✅ Fixed successfully!"
else
    echo "⚠ May need manual fix. Checking line 253..."
    sed -n '253p' frontend/src/components/admin/InteractiveAnalyticsDashboard.tsx
fi

echo ""
echo "Next: docker compose -f docker-compose.prod.yml build --no-cache frontend"


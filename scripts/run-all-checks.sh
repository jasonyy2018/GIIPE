#!/bin/bash
# Linux/Unix script to run all checks

set -e

echo "Running all build checks..."
echo

echo "[1/3] Quick syntax check..."
python3 scripts/quick-check.py

echo
echo "[2/3] Comprehensive check..."
python3 scripts/ultimate-build-check.py

echo
echo "[3/3] Full build check (requires Node.js)..."
if [ -d "frontend/node_modules" ]; then
    cd frontend
    python3 ../scripts/check-before-build.py
    cd ..
else
    echo "Skipping - node_modules not found. Run 'npm install' first."
fi

echo
echo "All checks completed!"


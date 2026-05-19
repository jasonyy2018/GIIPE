#!/bin/bash
# Quick syntax check using Next.js build
# This simulates the actual Docker build process

set -e

cd frontend

echo "Running TypeScript check..."
npx tsc --noEmit --skipLibCheck || echo "TypeScript check failed"

echo "Running ESLint..."
npx eslint src --ext .ts,.tsx --max-warnings 0 || echo "ESLint check failed"

echo "Running Next.js build check..."
npm run build || echo "Build check failed"


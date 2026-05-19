#!/bin/bash

# 深入检查代码是否真正更新

echo "=========================================="
echo "🔍 深入检查代码更新状态"
echo "=========================================="
echo ""

echo "[1/5] 检查编译后的 LocalStorageProvider 代码..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    if [ -f /app/dist/src/storage/providers/local-storage.provider.js ]; then
        echo '✅ 文件存在'
        echo ''
        echo '检查是否包含新的初始化日志：'
        grep -A 10 'LocalStorageProvider initialized' /app/dist/src/storage/providers/local-storage.provider.js | head -15 || echo '❌ 未找到初始化日志代码'
        echo ''
        echo '检查是否包含 path.resolve：'
        grep -n 'path.resolve' /app/dist/src/storage/providers/local-storage.provider.js | head -5 || echo '❌ 未找到 path.resolve'
    else
        echo '❌ 文件不存在'
    fi
"

echo ""
echo "[2/5] 检查完整的启动日志（查找 StorageModule 相关）..."
docker compose -f docker-compose.prod.yml logs backend --tail 300 | grep -E "StorageModule|LocalStorageProvider|InstanceLoader.*Storage" | head -20

echo ""
echo "[3/5] 检查所有日志级别（包括 DEBUG）..."
docker compose -f docker-compose.prod.yml logs backend --tail 500 | grep -i "storage\|upload" | head -30

echo ""
echo "[4/5] 检查 TypeScript 源文件（如果存在）..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    if [ -f /app/src/storage/providers/local-storage.provider.ts ]; then
        echo '✅ 源文件存在'
        echo '检查初始化代码：'
        grep -A 5 'LocalStorageProvider initialized' /app/src/storage/providers/local-storage.provider.ts | head -10 || echo '❌ 未找到'
    else
        echo '⚠️  源文件不存在（这是正常的，生产环境只有编译后的代码）'
    fi
"

echo ""
echo "[5/5] 检查环境变量 UPLOAD_PATH..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    echo 'UPLOAD_PATH='\''\$UPLOAD_PATH'\'
    echo 'process.cwd()='\''\$(pwd)'\'
"

echo ""
echo "=========================================="
echo "📋 如果代码没有更新，请运行："
echo "=========================================="
echo "1. 停止服务："
echo "   docker compose -f docker-compose.prod.yml stop backend"
echo ""
echo "2. 删除镜像并重新构建："
echo "   docker rmi conference-backend:latest"
echo "   docker compose -f docker-compose.prod.yml build --no-cache --pull backend"
echo ""
echo "3. 启动服务："
echo "   docker compose -f docker-compose.prod.yml up -d backend"
echo ""


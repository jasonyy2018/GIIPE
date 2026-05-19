#!/bin/bash

# 测试上传功能并检查日志

echo "=========================================="
echo "🧪 测试上传功能"
echo "=========================================="
echo ""

echo "[1/3] 检查 StorageModule 是否已加载..."
docker compose -f docker-compose.prod.yml logs backend --tail 500 | grep -E "InstanceLoader.*StorageModule|StorageModule dependencies initialized" | head -5

echo ""
echo "[2/3] 检查当前所有与 Storage 相关的日志..."
docker compose -f docker-compose.prod.yml logs backend --tail 1000 | grep -iE "storage|upload|LocalStorage" | head -20

echo ""
echo "[3/3] 检查环境变量 UPLOAD_PATH..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    echo 'UPLOAD_PATH='\''\$UPLOAD_PATH'\'
    echo 'Current directory: '\''\$(pwd)'\'
    echo ''
    echo '检查 /app/uploads 目录：'
    ls -la /app/uploads | head -5
"

echo ""
echo "=========================================="
echo "📋 下一步："
echo "=========================================="
echo "代码已经更新，现在需要："
echo ""
echo "1. 在前端尝试上传一个文件"
echo "2. 然后运行以下命令查看日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -E 'LocalStorageProvider|upload|EACCES|permission'"
echo ""
echo "如果看到 'LocalStorageProvider initialized' 日志，说明代码已生效"
echo "如果看到绝对路径（/app/uploads/...），说明路径修复已生效"
echo "如果仍然看到相对路径（uploads/...）或权限错误，请提供错误日志"
echo ""


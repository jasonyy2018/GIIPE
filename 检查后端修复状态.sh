#!/bin/bash

# 检查后端修复状态

echo "=========================================="
echo "🔍 检查后端修复状态"
echo "=========================================="
echo ""

# 1. 检查后端容器状态
echo "[1/4] 检查后端容器状态..."
docker compose -f docker-compose.prod.yml ps backend

echo ""
echo "[2/4] 检查 LocalStorageProvider 初始化日志..."
docker compose -f docker-compose.prod.yml logs backend --tail 200 | grep -E "LocalStorageProvider initialized|Current working directory|Raw UPLOAD_PATH" || echo "⚠️  未找到初始化日志"

echo ""
echo "[3/4] 检查后端启动状态..."
docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -E "Nest application successfully started|Application is running" || echo "⚠️  未找到启动成功日志"

echo ""
echo "[4/4] 检查最近的错误日志..."
docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -iE "error|EACCES|permission denied|remark|ERR_REQUIRE_ESM" | tail -10 || echo "✅ 没有发现错误"

echo ""
echo "=========================================="
echo "📋 详细检查命令："
echo "=========================================="
echo "1. 查看完整的 LocalStorageProvider 初始化日志："
echo "   docker compose -f docker-compose.prod.yml logs backend | grep -A 3 'LocalStorageProvider initialized'"
echo ""
echo "2. 查看所有错误："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -i error"
echo ""
echo "3. 测试上传功能（应该看到绝对路径）："
echo "   在前端上传一个文件，然后运行："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep 'File uploaded to local storage'"
echo ""


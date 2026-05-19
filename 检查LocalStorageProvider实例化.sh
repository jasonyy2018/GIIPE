#!/bin/bash

# 检查 LocalStorageProvider 为什么没有输出初始化日志

echo "=========================================="
echo "🔍 检查 LocalStorageProvider 实例化问题"
echo "=========================================="
echo ""

echo "[1/4] 检查完整的启动日志（查找 StorageModule 和 LocalStorageProvider）..."
docker compose -f docker-compose.prod.yml logs backend --tail 500 | grep -E "StorageModule|LocalStorageProvider|InstanceLoader.*Storage|StaticFilesController" | head -30

echo ""
echo "[2/4] 检查 LocalStorageProvider 是否被正确注册..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    if [ -f /app/dist/src/storage/storage.module.js ]; then
        echo '检查 StorageModule 的 providers：'
        grep -A 5 'providers:' /app/dist/src/storage/storage.module.js | head -10
    fi
"

echo ""
echo "[3/4] 检查 LocalStorageProvider 构造函数..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    echo '检查构造函数中的日志代码：'
    grep -B 5 -A 10 'LocalStorageProvider initialized' /app/dist/src/storage/providers/local-storage.provider.js | head -20
"

echo ""
echo "[4/4] 尝试手动触发 LocalStorageProvider 实例化（通过检查配置）..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    node -e \"
    const fs = require('fs');
    const code = fs.readFileSync('/app/dist/src/storage/providers/local-storage.provider.js', 'utf8');
    // 检查是否有 logger.log 调用
    const hasLog = code.includes('this.logger.log');
    const hasInitLog = code.includes('LocalStorageProvider initialized');
    console.log('Has logger.log:', hasLog);
    console.log('Has init log:', hasInitLog);
    // 检查构造函数
    const constructorMatch = code.match(/constructor\([^)]*\)\s*\{[^}]*\}/s);
    if (constructorMatch) {
        console.log('Constructor found, length:', constructorMatch[0].length);
        console.log('Constructor includes init log:', constructorMatch[0].includes('LocalStorageProvider initialized'));
    }
    \"
"

echo ""
echo "=========================================="
echo "📋 如果仍然没有日志，可能的原因："
echo "=========================================="
echo "1. LocalStorageProvider 在启动时没有被实例化（延迟加载）"
echo "2. 日志级别设置问题"
echo "3. 需要实际使用 StorageService 才会实例化 LocalStorageProvider"
echo ""
echo "测试方法：尝试上传一个文件，然后检查日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -E 'LocalStorageProvider|upload'"
echo ""


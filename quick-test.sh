#!/bin/bash

# 快速测试脚本 - 简化版

echo "=========================================="
echo "🐳 Docker快速测试"
echo "=========================================="
echo ""

# 1. 检查容器状态
echo "1. 检查容器状态..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "2. 测试后端健康..."
docker-compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3001/health && echo "✅ 后端健康" || echo "❌ 后端不健康"

echo ""
echo "3. 测试前端到后端连接..."
docker-compose -f docker-compose.prod.yml exec -T frontend curl -s http://backend:3001/health && echo "✅ 前端可以访问后端" || echo "❌ 前端无法访问后端"

echo ""
echo "4. 测试前端API代理..."
docker-compose -f docker-compose.prod.yml exec -T frontend curl -s "http://localhost:3000/api/events?status=PUBLISHED&limit=1" | head -c 100 && echo "..." && echo "✅ 前端API代理正常" || echo "❌ 前端API代理失败"

echo ""
echo "5. 检查环境变量..."
docker-compose -f docker-compose.prod.yml exec -T frontend env | grep SERVER_API_URL

echo ""
echo "=========================================="
echo "✅ 快速测试完成"
echo "=========================================="


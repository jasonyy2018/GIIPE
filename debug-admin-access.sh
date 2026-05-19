#!/bin/bash

# 调试管理员访问问题

echo "🔍 步骤 1: 验证管理员账号是否存在..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_db -c "SELECT id, email, username, role, \"isActive\", \"emailVerified\" FROM users WHERE email = 'admin@giip.info';"

echo ""
echo "🔍 步骤 2: 测试登录 API..."
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@giip.info","password":"admin123"}' \
  -v 2>&1 | grep -E "(HTTP|accessToken|user|role)"

echo ""
echo "🔍 步骤 3: 检查后端日志（最近10行）..."
docker compose -f docker-compose.prod.yml logs backend --tail 10

echo ""
echo "💡 如果登录成功但仍有访问问题，可能是："
echo "   1. JWT token 中没有包含角色信息"
echo "   2. 前端缓存了旧的 token"
echo "   3. 需要清除浏览器缓存和 cookies"


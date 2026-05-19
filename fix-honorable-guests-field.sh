#!/bin/bash
# 快速修复 honorableGuests 字段缺失问题
# 使用方法: ./fix-honorable-guests-field.sh

set -e

echo "=== 修复 honorableGuests 字段 ==="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查容器是否运行
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "conference-postgres-prod.*Up"; then
    echo "❌ 错误: PostgreSQL 容器未运行"
    exit 1
fi

echo "步骤 1: 检查字段是否已存在..."
FIELD_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_db -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'honorableGuests';" 2>/dev/null || echo "0")

if [ "$FIELD_EXISTS" = "1" ]; then
    echo "✅ 字段已存在，无需修复"
    exit 0
fi

echo "步骤 2: 添加 honorableGuests 字段..."
if docker-compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_db -c 'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;' 2>&1; then
    echo "✅ 字段添加成功"
else
    echo "❌ 字段添加失败"
    exit 1
fi

echo ""
echo "步骤 3: 验证字段..."
FIELD_CHECK=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_db -tAc "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'honorableGuests';" 2>/dev/null || echo "")

if [ -n "$FIELD_CHECK" ]; then
    echo "✅ 验证成功: $FIELD_CHECK"
else
    echo "⚠️  警告: 无法验证字段，但可能已添加成功"
fi

echo ""
echo "步骤 4: 重启后端服务..."
docker-compose -f docker-compose.prod.yml restart backend

echo ""
echo "=== 修复完成 ==="
echo "✅ honorableGuests 字段已添加"
echo "✅ 后端服务已重启"
echo ""
echo "提示: 可以检查后端日志确认没有错误:"
echo "  docker-compose -f docker-compose.prod.yml logs backend --tail=50"


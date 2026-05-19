#!/bin/bash

# 快速添加腾讯验证文件 - 无需重构
# 使用方法: ./快速添加验证文件.sh 文件名.txt

if [ -z "$1" ]; then
    echo "使用方法: $0 <验证文件名>"
    echo "示例: $0 MP_verify_abc123.txt"
    exit 1
fi

VERIFICATION_FILE="$1"
CONTAINER_NAME="conference-frontend-prod"

# 检查文件是否存在
if [ ! -f "$VERIFICATION_FILE" ]; then
    echo "错误: 文件 $VERIFICATION_FILE 不存在"
    exit 1
fi

echo "正在将 $VERIFICATION_FILE 复制到容器..."
docker cp "$VERIFICATION_FILE" "$CONTAINER_NAME:/app/public/"

if [ $? -eq 0 ]; then
    echo "✅ 文件复制成功"
    echo "正在重启前端容器..."
    docker-compose -f docker-compose.prod.yml restart frontend
    echo "✅ 完成！文件应该可以通过 https://giip.info/$VERIFICATION_FILE 访问"
else
    echo "❌ 文件复制失败"
    exit 1
fi


#!/bin/bash

# 修复 Next.js Hydration 错误 - 通过添加 Volume 挂载（无需重建）
# 适用于 Ubuntu 24 Docker 部署

set -e

echo "=========================================="
echo "修复 Hydration 错误 - 添加 Volume 挂载"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 备份原文件
if [ ! -f "docker-compose.prod.yml.backup" ]; then
    cp docker-compose.prod.yml docker-compose.prod.yml.backup
    echo "✓ 已备份 docker-compose.prod.yml"
fi

echo "步骤 1: 检查源文件是否已修复..."
if grep -q "suppressHydrationWarning" frontend/src/components/public/PublicLayout.tsx 2>/dev/null; then
    echo "✓ 源文件已包含修复"
else
    echo "修复源文件..."
    # 修复源文件
    if [ -f "frontend/src/components/public/PublicLayout.tsx" ]; then
        sed -i.bak 's/<p>&copy; {currentYear ?? 2024}/<p suppressHydrationWarning>&copy; {currentYear ?? 2024}/' frontend/src/components/public/PublicLayout.tsx
        echo "✓ 源文件已修复"
    else
        echo "错误: 找不到源文件 frontend/src/components/public/PublicLayout.tsx"
        exit 1
    fi
fi

echo ""
echo "步骤 2: 检查 docker-compose.prod.yml 是否已有 volume 挂载..."

# 检查 frontend 服务是否已有 volumes 配置
if grep -A 30 "frontend:" docker-compose.prod.yml | grep -q "^[[:space:]]*volumes:"; then
    echo "检测到已有 volumes 配置"
    
    # 检查是否已挂载 src 目录
    if grep -A 30 "frontend:" docker-compose.prod.yml | grep -q "frontend/src\|frontend/src:"; then
        echo "✓ 已挂载源代码目录"
        SKIP_VOLUME_ADD=true
    else
        echo "需要添加源代码挂载"
        SKIP_VOLUME_ADD=false
    fi
else
    echo "需要添加 volumes 配置"
    SKIP_VOLUME_ADD=false
fi

if [ "$SKIP_VOLUME_ADD" = false ]; then
    echo ""
    echo "步骤 3: 添加 volume 挂载到 docker-compose.prod.yml..."
    
    # 使用 Python 或 sed 添加 volume 配置
    # 这里使用更安全的方法：创建临时文件
    
    # 找到 frontend 服务的结束位置（下一个服务或文件结束）
    # 在 frontend 服务的 environment 部分之后添加 volumes
    
    # 创建修改脚本
    python3 << 'PYTHON_SCRIPT'
import re
import sys

file_path = 'docker-compose.prod.yml'
backup_path = 'docker-compose.prod.yml.volume_backup'

# 读取文件
with open(file_path, 'r') as f:
    content = f.read()

# 检查是否已存在 volumes
if re.search(r'frontend:.*?volumes:', content, re.DOTALL):
    print("已存在 volumes 配置")
    # 检查是否已挂载 src
    if re.search(r'frontend/src', content):
        print("已挂载源代码目录")
        sys.exit(0)
    else:
        # 在 volumes 部分添加 src 挂载
        pattern = r'(frontend:.*?volumes:\s*\n)((?:\s+-\s+[^\n]+\n)*)'
        replacement = r'\1\2      - ./frontend/src:/app/src:ro\n'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
else:
    # 在 environment 部分之后添加 volumes
    pattern = r'(frontend:.*?SERVER_API_URL: http://backend:3001\s*\n)(\s*networks:)'
    replacement = r'\1    volumes:\n      - ./frontend/src:/app/src:ro\n\2'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 备份并写入
with open(backup_path, 'w') as f:
    with open(file_path, 'r') as orig:
        f.write(orig.read())

with open(file_path, 'w') as f:
    f.write(content)

print("✓ 已添加 volume 挂载配置")
PYTHON_SCRIPT

    if [ $? -ne 0 ]; then
        echo "使用 sed 方法添加 volume..."
        # 备用方法：使用 sed
        # 在 SERVER_API_URL 行之后添加 volumes
        sed -i.volume_backup '/SERVER_API_URL: http:\/\/backend:3001/a\    volumes:\n      - ./frontend/src:/app/src:ro' docker-compose.prod.yml
        echo "✓ 已添加 volume 挂载配置（使用 sed）"
    fi
else
    echo "✓ Volume 配置已存在，跳过添加"
fi

echo ""
echo "步骤 4: 停止并重启前端容器..."
docker-compose -f docker-compose.prod.yml stop frontend
docker-compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "步骤 5: 等待容器启动并重新编译..."
echo "Next.js 会自动检测源文件变化并重新编译（开发模式）"
echo "如果是生产模式，可能需要触发重新编译..."

# 等待容器启动
sleep 5

# 检查容器状态
if docker ps | grep -q "conference-frontend-prod"; then
    echo "✓ 容器已启动"
    echo ""
    echo "查看编译日志:"
    echo "  docker logs conference-frontend-prod -f"
    echo ""
    echo "注意:"
    echo "  - 如果使用生产模式，可能需要进入容器手动触发编译"
    echo "  - 或者使用: docker exec conference-frontend-prod npm run build"
else
    echo "警告: 容器可能未正常启动，请检查日志"
    docker logs conference-frontend-prod --tail 50
fi

echo ""
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo ""
echo "后续步骤:"
echo "  1. 等待 Next.js 重新编译（约 1-2 分钟）"
echo "  2. 访问网站并检查浏览器控制台"
echo "  3. 确认不再有 hydration 错误"
echo ""
echo "如果使用生产模式，可能需要:"
echo "  docker exec conference-frontend-prod sh -c 'cd /app && npm run build'"
echo ""


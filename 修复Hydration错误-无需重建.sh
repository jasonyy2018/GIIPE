#!/bin/bash

# 修复 Next.js Hydration 错误 - 无需重新构建镜像
# 适用于 Ubuntu 24 Docker 部署

set -e

echo "=========================================="
echo "修复 Hydration 错误 - 无需重新构建"
echo "=========================================="
echo ""

# 检查容器是否运行
if ! docker ps | grep -q "conference-frontend-prod"; then
    echo "错误: 前端容器未运行"
    echo "请先启动容器: docker-compose -f docker-compose.prod.yml up -d frontend"
    exit 1
fi

CONTAINER_NAME="conference-frontend-prod"

echo "方法 1: 直接在容器内修改编译后的文件（快速修复）"
echo "=========================================="
echo ""

# 检查容器内文件路径
echo "步骤 1: 查找 PublicLayout 编译后的文件位置..."

# Next.js standalone 模式下，文件通常在 .next/standalone 目录
# 但编译后的文件路径可能不同，我们需要找到它

# 方法 1: 直接修改容器内的编译文件
echo ""
echo "正在查找并修复容器内的文件..."

# 尝试找到编译后的文件
FILE_PATHS=(
    "/app/.next/server/app/layout.js"
    "/app/.next/server/chunks/app/layout.js"
    "/app/.next/standalone/.next/server/app/layout.js"
    "/app/.next/standalone/.next/server/chunks/app/layout.js"
)

FOUND_FILE=""
for path in "${FILE_PATHS[@]}"; do
    if docker exec $CONTAINER_NAME test -f "$path" 2>/dev/null; then
        echo "找到文件: $path"
        # 检查是否包含需要修复的内容
        if docker exec $CONTAINER_NAME grep -q "currentYear ?? 2024" "$path" 2>/dev/null; then
            FOUND_FILE="$path"
            break
        fi
    fi
done

if [ -z "$FOUND_FILE" ]; then
    echo "警告: 未找到编译后的文件，尝试方法 2..."
    echo ""
    
    echo "方法 2: 添加临时 volume 挂载（推荐）"
    echo "=========================================="
    echo ""
    echo "此方法需要："
    echo "  1. 修改 docker-compose.prod.yml 添加 volume 挂载"
    echo "  2. 重启容器"
    echo "  3. Next.js 会自动重新编译"
    echo ""
    read -p "是否继续使用方法 2？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
    
    # 创建临时备份
    cp docker-compose.prod.yml docker-compose.prod.yml.backup
    
    # 检查是否已有 volume 挂载
    if ! grep -q "frontend:" -A 20 docker-compose.prod.yml | grep -q "volumes:"; then
        echo "添加 volume 挂载配置..."
        # 在 frontend 服务中添加 volumes
        # 这需要手动编辑，我们提供指导
        echo ""
        echo "请手动编辑 docker-compose.prod.yml，在 frontend 服务中添加："
        echo ""
        echo "  frontend:"
        echo "    # ... 其他配置 ..."
        echo "    volumes:"
        echo "      - ./frontend/src:/app/src:ro  # 只读挂载源代码"
        echo ""
        echo "然后运行: docker-compose -f docker-compose.prod.yml up -d frontend"
        exit 0
    fi
    
    echo "检测到已有 volume 配置，直接修改源文件..."
    # 如果已有 volume，直接修改源文件
    if [ -f "frontend/src/components/public/PublicLayout.tsx" ]; then
        echo "修复源文件..."
        # 使用 sed 添加 suppressHydrationWarning
        sed -i.bak 's/<p>&copy; {currentYear ?? 2024}/<p suppressHydrationWarning>&copy; {currentYear ?? 2024}/' frontend/src/components/public/PublicLayout.tsx
        echo "✓ 已修复源文件"
        echo ""
        echo "重启容器以应用更改..."
        docker-compose -f docker-compose.prod.yml restart frontend
        echo "✓ 容器已重启"
    fi
    
    exit 0
fi

# 方法 1: 直接修改容器内的文件
echo ""
echo "步骤 2: 修复容器内的文件..."

# 创建修复脚本
FIX_SCRIPT=$(cat <<'EOF'
#!/bin/sh
# 在容器内执行的修复脚本
FILE="$1"
# 使用 sed 添加 suppressHydrationWarning
sed -i 's/<p>&copy; {currentYear ?? 2024}/<p suppressHydrationWarning>&copy; {currentYear ?? 2024}/' "$FILE"
echo "修复完成"
EOF
)

# 将修复脚本复制到容器并执行
echo "$FIX_SCRIPT" | docker exec -i $CONTAINER_NAME sh -s -- "$FOUND_FILE"

if [ $? -eq 0 ]; then
    echo "✓ 文件已修复"
    echo ""
    echo "步骤 3: 重启容器以应用更改..."
    docker-compose -f docker-compose.prod.yml restart frontend
    echo "✓ 容器已重启"
    echo ""
    echo "修复完成！"
else
    echo "错误: 修复失败"
    echo ""
    echo "尝试方法 2..."
    exit 1
fi

echo ""
echo "验证修复:"
echo "  1. 等待容器启动完成（约 30-60 秒）"
echo "  2. 访问网站并检查浏览器控制台"
echo "  3. 应该不再有 hydration 错误"
echo ""
echo "查看日志: docker logs $CONTAINER_NAME -f"


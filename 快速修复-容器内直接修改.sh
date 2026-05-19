#!/bin/bash

# 快速修复 Hydration 错误 - 直接在运行中的容器内修改文件
# 无需重新构建，无需重启（如果修改的是运行时文件）

set -e

CONTAINER_NAME="conference-frontend-prod"

echo "=========================================="
echo "快速修复 - 容器内直接修改"
echo "=========================================="
echo ""

# 检查容器是否运行
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "错误: 容器 $CONTAINER_NAME 未运行"
    exit 1
fi

echo "方法: 直接在容器内修改编译后的 JavaScript 文件"
echo ""
echo "注意: 这是临时修复，容器重启后会丢失"
echo "建议: 修复后尽快重新构建镜像以永久修复"
echo ""

read -p "是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "步骤 1: 查找需要修改的文件..."

# Next.js standalone 模式下的文件位置
# 编译后的组件通常在 .next/standalone 目录中
# 但具体路径取决于 Next.js 的构建输出

echo "搜索包含 'currentYear ?? 2024' 的文件..."

# 在容器内搜索文件
FILES=$(docker exec $CONTAINER_NAME find /app -type f -name "*.js" 2>/dev/null | head -20)

FOUND=false
for file in $FILES; do
    if docker exec $CONTAINER_NAME grep -l "currentYear.*2024\|2024.*currentYear" "$file" 2>/dev/null; then
        echo "找到文件: $file"
        FOUND=true
        
        # 尝试修复
        echo "修复文件: $file"
        docker exec $CONTAINER_NAME sh -c "sed -i \"s/<p>&copy; {currentYear ?? 2024}/<p suppressHydrationWarning>&copy; {currentYear ?? 2024}/g\" \"$file\" 2>/dev/null || sed -i \"s/currentYear ?? 2024/currentYear ?? 2024/g\" \"$file\""
        
        # 验证修复
        if docker exec $CONTAINER_NAME grep -q "suppressHydrationWarning\|suppressHydration" "$file" 2>/dev/null; then
            echo "✓ 文件已修复: $file"
        else
            echo "尝试直接添加属性..."
            # 如果 sed 失败，尝试更精确的替换
            docker exec $CONTAINER_NAME sh -c "
                if grep -q '<p>' \"$file\"; then
                    sed -i 's/<p>/<p suppressHydrationWarning>/g' \"$file\"
                    echo '已添加 suppressHydrationWarning 属性'
                fi
            "
        fi
    fi
done

if [ "$FOUND" = false ]; then
    echo ""
    echo "未找到需要修改的文件，尝试其他方法..."
    echo ""
    echo "方法 2: 修改运行时生成的 HTML"
    echo "这需要在 Next.js 的中间件或页面组件中处理"
    echo ""
    echo "方法 3: 使用环境变量或配置覆盖"
    echo "但这不适用于代码修复"
    echo ""
    echo "推荐: 使用添加 volume 挂载的方法（见 修复Hydration错误-添加Volume挂载.sh）"
    exit 1
fi

echo ""
echo "步骤 2: 重启容器以应用更改..."
docker-compose -f docker-compose.prod.yml restart frontend

echo ""
echo "✓ 修复完成（临时）"
echo ""
echo "重要提示:"
echo "  - 这是临时修复，容器重启或重建后会丢失"
echo "  - 请尽快使用其他方法进行永久修复"
echo "  - 推荐: 运行 修复Hydration错误-添加Volume挂载.sh"


#!/bin/bash

# 修复 YAML 格式错误并正确添加 volume 挂载
# 适用于 Ubuntu 24 Docker 部署

set -e

echo "=========================================="
echo "修复 YAML 格式并添加 Volume 挂载"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查是否有备份
if [ -f "docker-compose.prod.yml.backup" ]; then
    echo "发现备份文件，恢复备份..."
    cp docker-compose.prod.yml.backup docker-compose.prod.yml
    echo "✓ 已恢复备份"
elif [ -f "docker-compose.prod.yml.volume_backup" ]; then
    echo "发现 volume 备份文件，恢复备份..."
    cp docker-compose.prod.yml.volume_backup docker-compose.prod.yml
    echo "✓ 已恢复备份"
fi

# 验证 YAML 格式
echo ""
echo "步骤 1: 验证 YAML 格式..."
if command -v docker-compose &> /dev/null; then
    if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
        echo "✓ YAML 格式正确"
    else
        echo "错误: YAML 格式有问题"
        echo "尝试从备份恢复..."
        if [ -f "docker-compose.prod.yml.backup" ]; then
            cp docker-compose.prod.yml.backup docker-compose.prod.yml
            echo "✓ 已从备份恢复"
        else
            echo "错误: 没有找到备份文件，请手动检查 docker-compose.prod.yml"
            exit 1
        fi
    fi
fi

# 创建新的备份
if [ ! -f "docker-compose.prod.yml.backup2" ]; then
    cp docker-compose.prod.yml docker-compose.prod.yml.backup2
    echo "✓ 已创建新备份"
fi

echo ""
echo "步骤 2: 检查 frontend 服务配置..."

# 检查是否已有 volumes 配置
if grep -A 30 "^  frontend:" docker-compose.prod.yml | grep -q "^[[:space:]]*volumes:"; then
    echo "检测到已有 volumes 配置"
    
    # 检查是否已挂载 src
    if grep -A 30 "^  frontend:" docker-compose.prod.yml | grep -q "frontend/src"; then
        echo "✓ 已挂载源代码目录，无需修改"
        exit 0
    else
        echo "需要添加源代码挂载"
        # 在 volumes 部分添加
        # 找到 volumes: 行，在其后添加
        sed -i.tmp '/^  frontend:/,/^  [a-z]/ {
            /^[[:space:]]*volumes:/a\
      - ./frontend/src:/app/src:ro
        }' docker-compose.prod.yml
        
        # 清理临时文件
        rm -f docker-compose.prod.yml.tmp
        echo "✓ 已添加源代码挂载"
    fi
else
    echo "需要添加 volumes 配置"
    
    # 在 SERVER_API_URL 行之后添加 volumes
    # 使用更安全的方法：找到正确的位置插入
    awk '
    /^  frontend:/ { in_frontend=1 }
    in_frontend && /^[[:space:]]*SERVER_API_URL:/ {
        print
        print "    volumes:"
        print "      - ./frontend/src:/app/src:ro"
        next
    }
    in_frontend && /^  [a-z]/ && !/^  frontend:/ { in_frontend=0 }
    { print }
    ' docker-compose.prod.yml > docker-compose.prod.yml.new
    
    if [ $? -eq 0 ]; then
        mv docker-compose.prod.yml.new docker-compose.prod.yml
        echo "✓ 已添加 volumes 配置"
    else
        echo "错误: 添加 volumes 配置失败"
        exit 1
    fi
fi

echo ""
echo "步骤 3: 验证修改后的 YAML 格式..."

# 验证 YAML
if command -v docker-compose &> /dev/null; then
    if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
        echo "✓ YAML 格式正确"
    else
        echo "错误: YAML 格式验证失败"
        echo "恢复备份..."
        if [ -f "docker-compose.prod.yml.backup2" ]; then
            cp docker-compose.prod.yml.backup2 docker-compose.prod.yml
            echo "✓ 已恢复备份"
        fi
        echo ""
        echo "请手动编辑 docker-compose.prod.yml，在 frontend 服务的 SERVER_API_URL 之后添加："
        echo ""
        echo "    volumes:"
        echo "      - ./frontend/src:/app/src:ro"
        exit 1
    fi
else
    echo "警告: 无法验证 YAML（docker-compose 未安装），请手动检查"
fi

echo ""
echo "步骤 4: 显示修改内容..."
echo ""
echo "已添加的配置："
grep -A 2 "volumes:" docker-compose.prod.yml | grep -A 2 "frontend/src" || echo "未找到，请检查文件"

echo ""
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 检查配置: docker-compose -f docker-compose.prod.yml config"
echo "  2. 重启前端容器: docker-compose -f docker-compose.prod.yml up -d frontend"
echo ""


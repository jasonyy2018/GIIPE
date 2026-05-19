#!/bin/bash

# 快速修复 YAML 格式错误
# 适用于 Ubuntu 24

set -e

echo "=========================================="
echo "快速修复 YAML 格式错误"
echo "=========================================="
echo ""

# 方法 1: 恢复备份
if [ -f "docker-compose.prod.yml.backup" ]; then
    echo "步骤 1: 恢复备份文件..."
    cp docker-compose.prod.yml.backup docker-compose.prod.yml
    echo "✓ 已恢复备份"
elif [ -f "docker-compose.prod.yml.volume_backup" ]; then
    echo "步骤 1: 恢复 volume 备份文件..."
    cp docker-compose.prod.yml.volume_backup docker-compose.prod.yml
    echo "✓ 已恢复备份"
else
    echo "警告: 未找到备份文件"
    echo "请手动检查 docker-compose.prod.yml 文件"
    exit 1
fi

# 验证 YAML
echo ""
echo "步骤 2: 验证 YAML 格式..."
if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "✓ YAML 格式正确"
else
    echo "错误: YAML 格式仍有问题"
    echo "请检查文件或使用 Python 脚本修复"
    exit 1
fi

# 使用 Python 脚本添加 volume（如果可用）
echo ""
echo "步骤 3: 添加 volume 配置..."

if command -v python3 &> /dev/null; then
    if [ -f "fix_yaml_add_volume.py" ]; then
        python3 fix_yaml_add_volume.py
    else
        echo "Python 脚本不存在，手动添加 volume 配置"
        echo ""
        echo "请编辑 docker-compose.prod.yml，在 frontend 服务的 SERVER_API_URL 之后添加："
        echo "    volumes:"
        echo "      - ./frontend/src:/app/src:ro"
    fi
else
    echo "Python3 未安装，手动添加 volume 配置"
    echo ""
    echo "请编辑 docker-compose.prod.yml，在 frontend 服务的 SERVER_API_URL 之后添加："
    echo "    volumes:"
    echo "      - ./frontend/src:/app/src:ro"
fi

echo ""
echo "完成！"


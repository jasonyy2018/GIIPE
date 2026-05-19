#!/bin/bash

# 设置定时重启前端容器（临时缓解内存泄漏问题）

set -e

echo "=========================================="
echo "⏰ 设置定时重启前端容器"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

PROJECT_DIR=$(pwd)
CRON_JOB="0 3 * * * cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart frontend >> /var/log/frontend-restart.log 2>&1"

echo "[1/3] 检查现有cron任务..."
if crontab -l 2>/dev/null | grep -q "docker-compose.*restart frontend"; then
    echo "   ⚠️  已存在定时重启任务"
    echo "   现有任务:"
    crontab -l | grep "docker-compose.*restart frontend"
    read -p "   是否替换? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   取消操作"
        exit 0
    fi
    # 删除旧任务
    crontab -l 2>/dev/null | grep -v "docker-compose.*restart frontend" | crontab -
fi

echo ""
echo "[2/3] 添加新的cron任务..."
echo "   任务: 每天凌晨3点重启前端容器"
echo "   命令: $CRON_JOB"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "   ✅ Cron任务已添加"
else
    echo "   ❌ 添加Cron任务失败"
    exit 1
fi

echo ""
echo "[3/3] 验证cron任务..."
echo "   当前所有cron任务:"
crontab -l

echo ""
echo "=========================================="
echo "✅ 定时重启已设置"
echo "=========================================="
echo ""
echo "定时任务:"
echo "  - 时间: 每天凌晨3点"
echo "  - 操作: 重启前端容器"
echo "  - 日志: /var/log/frontend-restart.log"
echo ""
echo "管理命令:"
echo "  # 查看所有cron任务"
echo "  crontab -l"
echo ""
echo "  # 编辑cron任务"
echo "  crontab -e"
echo ""
echo "  # 删除所有cron任务"
echo "  crontab -r"
echo ""
echo "  # 查看重启日志"
echo "  tail -f /var/log/frontend-restart.log"
echo ""
echo "⚠️  注意: 这只是临时缓解方案"
echo "   建议尽快应用代码修复（重构）以彻底解决问题"
echo ""


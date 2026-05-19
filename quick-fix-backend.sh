#!/bin/bash

# 快速修复后端编译问题

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔧 快速修复后端编译问题${NC}"
echo ""

# 检查容器
if ! docker ps -a --format "{{.Names}}" | grep -q "^conference_backend$"; then
    echo -e "${RED}❌ 容器 conference_backend 不存在${NC}"
    exit 1
fi

echo -e "${BLUE}[1/4] 停止后端进程...${NC}"
docker exec conference_backend sh -c "pkill -f 'nest start' || pkill -f 'node.*dist' || true" 2>/dev/null
sleep 2
echo -e "${GREEN}✅ 已停止${NC}"

echo -e "${BLUE}[2/4] 彻底清理编译文件...${NC}"
# 使用 find 命令更安全地删除
docker exec conference_backend sh -c "
    cd /app && \
    find dist -type f -delete 2>/dev/null || true && \
    find dist -type d -mindepth 1 -delete 2>/dev/null || true && \
    rm -f .tsbuildinfo 2>/dev/null || true && \
    echo '清理完成'
"
echo -e "${GREEN}✅ 已清理${NC}"

echo -e "${BLUE}[3/4] 重新编译...${NC}"
echo -e "${YELLOW}这可能需要几分钟...${NC}"

# 编译
docker exec conference_backend sh -c "cd /app && npm run build" 2>&1 | tee /tmp/build-output.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ 编译成功${NC}"
else
    echo -e "${RED}❌ 编译失败，查看错误:${NC}"
    tail -30 /tmp/build-output.log
    exit 1
fi

echo -e "${BLUE}[4/4] 检查编译结果...${NC}"
MAIN_FILE=$(docker exec conference_backend find /app/dist -name "main.js" -type f 2>/dev/null | head -1)

if [ -n "$MAIN_FILE" ]; then
    echo -e "${GREEN}✅ 找到主文件: $MAIN_FILE${NC}"
    docker exec conference_backend ls -lh "$MAIN_FILE"
else
    # 检查是否有其他位置的 main.js
    ALL_MAIN=$(docker exec conference_backend find /app/dist -name "main.js" 2>/dev/null)
    if [ -n "$ALL_MAIN" ]; then
        echo -e "${YELLOW}⚠️  找到 main.js 但路径可能不正确:${NC}"
        echo "$ALL_MAIN"
    else
        echo -e "${RED}❌ 未找到 main.js 文件${NC}"
        echo -e "${BLUE}查看 dist 目录结构:${NC}"
        docker exec conference_backend find /app/dist -type f -name "*.js" | head -10
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}重启后端容器...${NC}"
docker restart conference_backend

echo -e "${GREEN}✅ 容器已重启${NC}"
echo -e "${BLUE}等待 15 秒后检查状态...${NC}"
sleep 15

echo ""
echo "============================================================"
echo -e "${CYAN}检查启动日志${NC}"
echo "============================================================"
docker logs conference_backend --tail 30

echo ""
echo "============================================================"
echo -e "${CYAN}测试后端${NC}"
echo "============================================================"

# 检查进程
PROCESS=$(docker exec conference_backend ps aux | grep -E "node.*dist|nest" | grep -v grep)
if [ -n "$PROCESS" ]; then
    echo -e "${GREEN}✅ 后端进程正在运行${NC}"
else
    echo -e "${RED}❌ 后端进程未运行${NC}"
fi

# 测试端口（使用 curl 或 nc）
if docker exec conference_backend which curl >/dev/null 2>&1; then
    HEALTH=$(docker exec conference_backend curl -s http://localhost:3001/api/health 2>/dev/null)
    if [ -n "$HEALTH" ]; then
        echo -e "${GREEN}✅ 后端健康检查成功${NC}"
        echo "响应: $HEALTH"
    else
        echo -e "${YELLOW}⚠️  健康检查无响应${NC}"
    fi
elif docker exec conference_backend which nc >/dev/null 2>&1; then
    if docker exec conference_backend nc -z localhost 3001 2>/dev/null; then
        echo -e "${GREEN}✅ 端口 3001 正在监听${NC}"
    else
        echo -e "${RED}❌ 端口 3001 未监听${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  无法测试（需要 curl 或 nc）${NC}"
fi

echo ""
echo -e "${GREEN}修复完成！${NC}"


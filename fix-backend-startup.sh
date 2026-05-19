#!/bin/bash

# 修复后端启动问题脚本
# 问题：Cannot find module '/app/dist/main'

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "🔧 修复后端启动问题"
echo -e "${NC}"

# 检查容器是否存在
if ! docker ps -a --format "{{.Names}}" | grep -q "^conference_backend$"; then
    echo -e "${RED}❌ 容器 conference_backend 不存在${NC}"
    echo -e "${YELLOW}请先启动容器: docker-compose up -d backend${NC}"
    exit 1
fi

echo -e "${BLUE}[1/5] 检查后端容器状态...${NC}"
CONTAINER_STATUS=$(docker inspect conference_backend --format='{{.State.Status}}' 2>/dev/null)
echo -e "容器状态: $CONTAINER_STATUS"

if [ "$CONTAINER_STATUS" != "running" ]; then
    echo -e "${YELLOW}容器未运行，正在启动...${NC}"
    docker start conference_backend
    sleep 5
fi

echo -e "${BLUE}[2/5] 检查容器内文件结构...${NC}"
echo -e "${CYAN}检查 /app 目录:${NC}"
docker exec conference_backend ls -la /app | head -10

echo -e "${CYAN}检查 dist 目录:${NC}"
docker exec conference_backend ls -la /app/dist 2>/dev/null || echo -e "${RED}dist 目录不存在${NC}"

echo -e "${BLUE}[3/5] 在容器内编译后端代码...${NC}"
echo -e "${YELLOW}这可能需要几分钟...${NC}"

# 在容器内执行编译
docker exec conference_backend sh -c "
    cd /app && \
    echo '生成 Prisma Client...' && \
    npx prisma generate && \
    echo '编译 NestJS 应用...' && \
    npm run build && \
    echo '检查编译结果...' && \
    ls -la dist/ | head -5
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 编译成功${NC}"
else
    echo -e "${RED}❌ 编译失败${NC}"
    echo -e "${YELLOW}查看详细错误:${NC}"
    docker exec conference_backend npm run build
    exit 1
fi

echo -e "${BLUE}[4/5] 检查编译后的文件...${NC}"
MAIN_FILE=$(docker exec conference_backend ls /app/dist/main.js 2>/dev/null)
if [ -n "$MAIN_FILE" ]; then
    echo -e "${GREEN}✅ 找到 dist/main.js${NC}"
    docker exec conference_backend ls -lh /app/dist/main.js
else
    # 检查是否有 dist/src/main.js
    MAIN_FILE=$(docker exec conference_backend ls /app/dist/src/main.js 2>/dev/null)
    if [ -n "$MAIN_FILE" ]; then
        echo -e "${YELLOW}⚠️  找到 dist/src/main.js (可能是 nest-cli.json 配置问题)${NC}"
        echo -e "${BLUE}检查 nest-cli.json 配置...${NC}"
        docker exec conference_backend cat /app/nest-cli.json 2>/dev/null || echo "未找到 nest-cli.json"
    else
        echo -e "${RED}❌ 未找到 main.js 文件${NC}"
        echo -e "${YELLOW}查看 dist 目录内容:${NC}"
        docker exec conference_backend find /app/dist -name "*.js" | head -10
    fi
fi

echo -e "${BLUE}[5/5] 重启后端容器...${NC}"
docker restart conference_backend

echo -e "${GREEN}✅ 后端容器已重启${NC}"
echo ""
echo -e "${BLUE}等待 10 秒后检查后端状态...${NC}"
sleep 10

echo ""
echo "============================================================"
echo -e "${CYAN}检查后端启动日志${NC}"
echo "============================================================"
docker logs conference_backend --tail 30

echo ""
echo "============================================================"
echo -e "${CYAN}测试后端连接${NC}"
echo "============================================================"

# 测试后端健康检查
echo -e "${BLUE}从容器内测试:${NC}"
docker exec conference_backend wget -qO- http://localhost:3001/api/health 2>/dev/null && \
    echo -e "${GREEN}✅ 后端健康检查通过${NC}" || \
    echo -e "${RED}❌ 后端健康检查失败${NC}"

echo ""
echo -e "${BLUE}从宿主机测试:${NC}"
curl -s http://localhost:3001/api/health && \
    echo -e "\n${GREEN}✅ 后端可访问${NC}" || \
    echo -e "${RED}❌ 后端不可访问${NC}"

echo ""
echo "============================================================"
echo -e "${CYAN}修复完成${NC}"
echo "============================================================"
echo -e "${GREEN}如果后端仍然无法启动，请检查:${NC}"
echo -e "1. 查看完整日志: docker logs conference_backend"
echo -e "2. 检查环境变量: docker exec conference_backend env | grep -E 'DATABASE|REDIS|JWT'"
echo -e "3. 检查数据库连接: docker exec conference_backend ping -c 3 conference_postgres"
echo ""


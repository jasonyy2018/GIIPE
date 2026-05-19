#!/bin/bash

# 快速启动 Docker 容器脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 启动 GIIPE Docker 容器${NC}"
echo ""

# 检测 docker-compose 文件
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo -e "${BLUE}使用生产环境配置: docker-compose.prod.yml${NC}"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${BLUE}使用开发环境配置: docker-compose.yml${NC}"
else
    echo -e "${RED}❌ 未找到 docker-compose.yml 文件${NC}"
    exit 1
fi

# 检查 Docker
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 守护进程未运行${NC}"
    exit 1
fi

# 启动服务
echo ""
echo -e "${BLUE}正在启动服务...${NC}"

if command -v docker-compose &> /dev/null; then
    docker-compose -f "$COMPOSE_FILE" up -d --build
elif docker compose version &> /dev/null; then
    docker compose -f "$COMPOSE_FILE" up -d --build
else
    echo -e "${RED}❌ 未找到 docker-compose 命令${NC}"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 服务启动成功！${NC}"
    echo ""
    echo -e "${BLUE}等待 15 秒让容器完全启动...${NC}"
    sleep 15
    
    echo ""
    echo "============================================================"
    echo -e "${CYAN}容器状态${NC}"
    echo "============================================================"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|conference" || docker ps
    
    echo ""
    echo "============================================================"
    echo -e "${CYAN}服务地址${NC}"
    echo "============================================================"
    echo -e "${GREEN}前端: http://localhost:3000${NC}"
    echo -e "${GREEN}后端: http://localhost:3001${NC}"
    echo -e "${GREEN}后端健康检查: http://localhost:3001/api/health${NC}"
    echo ""
    echo -e "${BLUE}查看日志: docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "${BLUE}停止服务: docker-compose -f $COMPOSE_FILE down${NC}"
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    echo -e "${YELLOW}查看错误日志: docker-compose -f $COMPOSE_FILE logs${NC}"
    exit 1
fi


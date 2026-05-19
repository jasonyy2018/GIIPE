#!/bin/bash

# Docker 容器检查和启动脚本
# 用于诊断容器状态并启动服务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "🔍 Docker 容器检查和启动工具"
echo -e "${NC}"

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 守护进程未运行${NC}"
    echo -e "${YELLOW}请启动 Docker 服务: systemctl start docker${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 守护进程正在运行${NC}"
echo ""

# 检查所有容器
echo "============================================================"
echo -e "${CYAN}1. 检查容器状态${NC}"
echo "============================================================"

# 根据 docker-compose 文件确定容器名称
if [ "$COMPOSE_FILE" = "docker-compose.prod.yml" ]; then
    # 生产环境容器名称
    CONTAINERS=("conference-backend-prod" "conference-frontend-prod" "conference-postgres-prod" "conference-redis-prod")
    NETWORK_NAME="conference-network"
    BACKEND_NAME="conference-backend-prod"
    FRONTEND_NAME="conference-frontend-prod"
else
    # 开发环境容器名称
    CONTAINERS=("conference_backend" "conference_frontend" "conference_postgres" "conference_redis")
    NETWORK_NAME="conference_network"
    BACKEND_NAME="conference_backend"
    FRONTEND_NAME="conference_frontend"
fi

EXISTING_CONTAINERS=()
MISSING_CONTAINERS=()
RUNNING_CONTAINERS=()
STOPPED_CONTAINERS=()

for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        EXISTING_CONTAINERS+=("$container")
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            RUNNING_CONTAINERS+=("$container")
            STATUS=$(docker ps --filter "name=^${container}$" --format "{{.Status}}")
            echo -e "${GREEN}✅ $container: 运行中 - $STATUS${NC}"
        else
            STOPPED_CONTAINERS+=("$container")
            STATUS=$(docker ps -a --filter "name=^${container}$" --format "{{.Status}}")
            echo -e "${YELLOW}⚠️  $container: 已停止 - $STATUS${NC}"
        fi
    else
        MISSING_CONTAINERS+=("$container")
        echo -e "${RED}❌ $container: 容器不存在${NC}"
    fi
done

echo ""

# 检查网络（在确定网络名称后）
NETWORK_NAME=""
if [ "$COMPOSE_FILE" = "docker-compose.prod.yml" ]; then
    NETWORK_NAME="conference-network"
else
    NETWORK_NAME="conference_network"
fi

echo "============================================================"
echo -e "${CYAN}2. 检查网络${NC}"
echo "============================================================"

if docker network ls --format "{{.Name}}" | grep -q "^${NETWORK_NAME}$"; then
    echo -e "${GREEN}✅ ${NETWORK_NAME} 网络存在${NC}"
    NETWORK_EXISTS=true
else
    echo -e "${RED}❌ ${NETWORK_NAME} 网络不存在${NC}"
    NETWORK_EXISTS=false
fi

echo ""

# 检查 docker-compose 文件
echo "============================================================"
echo -e "${CYAN}3. 检查 Docker Compose 文件${NC}"
echo "============================================================"

COMPOSE_FILE=""
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo -e "${GREEN}✅ 找到生产环境配置: docker-compose.prod.yml${NC}"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo -e "${GREEN}✅ 找到开发环境配置: docker-compose.yml${NC}"
else
    echo -e "${RED}❌ 未找到 docker-compose.yml 文件${NC}"
    exit 1
fi

echo ""

# 诊断结果和建议
echo "============================================================"
echo -e "${CYAN}4. 诊断结果${NC}"
echo "============================================================"

if [ ${#MISSING_CONTAINERS[@]} -gt 0 ]; then
    echo -e "${RED}❌ 发现 ${#MISSING_CONTAINERS[@]} 个容器不存在:${NC}"
    for container in "${MISSING_CONTAINERS[@]}"; do
        echo -e "   - $container" -ForegroundColor Red
    done
    echo ""
    echo -e "${YELLOW}💡 建议: 启动 Docker Compose 服务${NC}"
    echo -e "${BLUE}   执行: docker-compose -f $COMPOSE_FILE up -d${NC}"
    echo -e "${BLUE}   或:    docker compose -f $COMPOSE_FILE up -d${NC}"
fi

if [ ${#STOPPED_CONTAINERS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 ${#STOPPED_CONTAINERS[@]} 个容器已停止:${NC}"
    for container in "${STOPPED_CONTAINERS[@]}"; do
        echo -e "   - $container"
    done
    echo ""
    echo -e "${YELLOW}💡 建议: 启动已停止的容器${NC}"
    echo -e "${BLUE}   执行: docker-compose -f $COMPOSE_FILE start${NC}"
    echo -e "${BLUE}   或:    docker compose -f $COMPOSE_FILE start${NC}"
fi

if [ ${#RUNNING_CONTAINERS[@]} -eq ${#CONTAINERS[@]} ] && [ ${#MISSING_CONTAINERS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 所有容器都在运行中！${NC}"
fi

echo ""

# 交互式启动选项
if [ ${#MISSING_CONTAINERS[@]} -gt 0 ] || [ ${#STOPPED_CONTAINERS[@]} -gt 0 ]; then
    echo "============================================================"
    echo -e "${CYAN}5. 启动选项${NC}"
    echo "============================================================"
    echo ""
    echo -e "${YELLOW}是否要现在启动服务? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}正在启动 Docker Compose 服务...${NC}"
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f "$COMPOSE_FILE" up -d
        elif docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" up -d
        else
            echo -e "${RED}❌ 未找到 docker-compose 命令${NC}"
            exit 1
        fi
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ 服务启动成功！${NC}"
            echo ""
            echo -e "${BLUE}等待 10 秒后检查容器状态...${NC}"
            sleep 10
            
            echo ""
            echo "============================================================"
            echo -e "${CYAN}容器状态${NC}"
            echo "============================================================"
            # 显示所有项目相关容器
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|conference" || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo -e "${RED}❌ 服务启动失败，请检查错误信息${NC}"
        fi
    else
        echo -e "${BLUE}跳过启动，请手动执行:${NC}"
        echo -e "${BLUE}  docker-compose -f $COMPOSE_FILE up -d${NC}"
    fi
fi

echo ""


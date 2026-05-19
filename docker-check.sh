#!/bin/bash

# Docker 诊断检查脚本
# 使用方法: ./docker-check.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "🐳 Docker 诊断检查工具"
echo -e "${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装或不在 PATH 中${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 已安装: $(docker --version)${NC}"
echo ""

# 1. Docker 服务状态
echo "============================================================"
echo -e "${CYAN}1. Docker 服务状态${NC}"
echo "============================================================"
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker 守护进程正在运行${NC}"
    docker info | grep -E "Server Version|Operating System|Kernel Version|Total Memory" | head -4
else
    echo -e "${RED}❌ Docker 守护进程未运行${NC}"
    echo -e "${YELLOW}提示: 请启动 Docker Desktop 或 Docker 服务${NC}"
fi
echo ""

# 2. 容器状态
echo "============================================================"
echo -e "${CYAN}2. 容器状态${NC}"
echo "============================================================"
echo -e "${BLUE}所有容器:${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
echo ""

echo -e "${BLUE}运行中的容器:${NC}"
RUNNING=$(docker ps -q | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo -e "${GREEN}✅ 有 $RUNNING 个容器正在运行${NC}"
else
    echo -e "${YELLOW}⚠️  没有运行中的容器${NC}"
fi
echo ""

echo -e "${BLUE}已停止的容器:${NC}"
STOPPED=$(docker ps -a -f "status=exited" -q | wc -l)
if [ "$STOPPED" -gt 0 ]; then
    docker ps -a -f "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    echo -e "${YELLOW}⚠️  有 $STOPPED 个容器已停止${NC}"
else
    echo -e "${GREEN}✅ 没有已停止的容器${NC}"
fi
echo ""

# 3. 项目相关容器
echo "============================================================"
echo -e "${CYAN}3. GIIPE 项目容器${NC}"
echo "============================================================"
CONTAINERS=("conference_backend" "conference_frontend" "conference_postgres" "conference_redis")

for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        STATUS=$(docker ps -a --filter "name=^${container}$" --format "{{.Status}}")
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            echo -e "${GREEN}✅ $container: $STATUS${NC}"
        else
            echo -e "${RED}❌ $container: $STATUS (已停止)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $container: 容器不存在${NC}"
    fi
done
echo ""

# 4. 容器资源使用
echo "============================================================"
echo -e "${CYAN}4. 容器资源使用${NC}"
echo "============================================================"
if [ "$RUNNING" -gt 0 ]; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
else
    echo -e "${YELLOW}⚠️  没有运行中的容器${NC}"
fi
echo ""

# 5. 镜像列表
echo "============================================================"
echo -e "${CYAN}5. Docker 镜像${NC}"
echo "============================================================"
IMAGE_COUNT=$(docker images -q | wc -l)
if [ "$IMAGE_COUNT" -gt 0 ]; then
    echo -e "${BLUE}项目相关镜像:${NC}"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -E "REPOSITORY|conference|giipe" || echo "未找到项目相关镜像"
    echo ""
    echo -e "${GREEN}✅ 共有 $IMAGE_COUNT 个镜像${NC}"
else
    echo -e "${YELLOW}⚠️  没有镜像${NC}"
fi
echo ""

# 6. 网络检查
echo "============================================================"
echo -e "${CYAN}6. Docker 网络${NC}"
echo "============================================================"
NETWORKS=$(docker network ls --format "{{.Name}}" | grep -E "conference|giipe" || echo "")
if [ -n "$NETWORKS" ]; then
    echo -e "${BLUE}项目相关网络:${NC}"
    docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" | grep -E "NETWORK|conference|giipe"
    echo ""
    for net in $NETWORKS; do
        echo -e "${BLUE}网络 $net 的容器:${NC}"
        docker network inspect "$net" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "无"
    done
else
    echo -e "${YELLOW}⚠️  未找到项目相关网络${NC}"
fi
echo ""

# 7. 数据卷
echo "============================================================"
echo -e "${CYAN}7. Docker 数据卷${NC}"
echo "============================================================"
VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "postgres|redis|conference|giipe" || echo "")
if [ -n "$VOLUMES" ]; then
    echo -e "${BLUE}项目相关数据卷:${NC}"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" | grep -E "VOLUME|postgres|redis|conference|giipe"
else
    echo -e "${YELLOW}⚠️  未找到项目相关数据卷${NC}"
fi
echo ""

# 8. 容器日志检查（最近错误）
echo "============================================================"
echo -e "${CYAN}8. 容器日志检查（最近错误）${NC}"
echo "============================================================"
for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        ERRORS=$(docker logs "$container" --tail 10 2>&1 | grep -i "error\|fail\|exception" | head -3)
        if [ -n "$ERRORS" ]; then
            echo -e "${RED}❌ $container 最近错误:${NC}"
            echo "$ERRORS" | sed 's/^/  /'
        else
            echo -e "${GREEN}✅ $container: 无最近错误${NC}"
        fi
    fi
done
echo ""

# 9. 端口占用检查
echo "============================================================"
echo -e "${CYAN}9. 端口占用检查${NC}"
echo "============================================================"
PORTS=(3000 3001 5432 6379)
for port in "${PORTS[@]}"; do
    CONTAINER=$(docker ps --format "{{.Names}}\t{{.Ports}}" | grep ":$port" | awk '{print $1}' | head -1)
    if [ -n "$CONTAINER" ]; then
        echo -e "${GREEN}✅ 端口 $port: 被容器 $CONTAINER 使用${NC}"
    else
        echo -e "${YELLOW}⚠️  端口 $port: 未被 Docker 容器使用${NC}"
    fi
done
echo ""

# 10. Docker Compose 状态（如果存在）
echo "============================================================"
echo -e "${CYAN}10. Docker Compose 状态${NC}"
echo "============================================================"
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.prod.yml" ]; then
        echo -e "${BLUE}使用 docker-compose ps 检查:${NC}"
        if command -v docker-compose &> /dev/null; then
            docker-compose ps 2>/dev/null || echo "无法获取 compose 状态"
        else
            docker compose ps 2>/dev/null || echo "无法获取 compose 状态"
        fi
    else
        echo -e "${YELLOW}⚠️  未找到 docker-compose.yml 文件${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker Compose 未安装${NC}"
fi
echo ""

# 总结
echo "============================================================"
echo -e "${CYAN}诊断总结${NC}"
echo "============================================================"

ALL_RUNNING=true
for container in "${CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        continue
    elif docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        ALL_RUNNING=false
        break
    fi
done

if $ALL_RUNNING && [ "$RUNNING" -ge 4 ]; then
    echo -e "${GREEN}✅ 所有项目容器运行正常！${NC}"
else
    echo -e "${YELLOW}⚠️  部分容器未运行，建议执行:${NC}"
    echo -e "${BLUE}  docker-compose up -d${NC}"
    echo -e "${BLUE}  或${NC}"
    echo -e "${BLUE}  docker compose up -d${NC}"
fi

echo ""


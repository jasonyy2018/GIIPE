#!/bin/bash

# Bash 诊断脚本 (Linux/Mac)
# 使用方法: ./diagnose.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "🔍 GIIPE 前后端诊断工具"
echo -e "${NC}"

# 检查端口
check_port() {
    local port=$1
    local service=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service (端口 $port): 正在运行${NC}"
            return 0
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            echo -e "${GREEN}✅ $service (端口 $port): 正在运行${NC}"
            return 0
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            echo -e "${GREEN}✅ $service (端口 $port): 正在运行${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}❌ $service (端口 $port): 未运行${NC}"
    return 1
}

# 检查 API 端点
check_api() {
    local url=$1
    local name=$2
    
    echo -e "${BLUE}ℹ️  检查 $name...${NC}"
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
        if [ "$response" -ge 200 ] && [ "$response" -lt 400 ]; then
            echo -e "${GREEN}✅ $name: 可访问 (状态码: $response)${NC}"
            return 0
        else
            echo -e "${RED}❌ $name: 不可访问 (状态码: $response)${NC}"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget -q --spider --timeout=5 "$url" 2>/dev/null; then
            echo -e "${GREEN}✅ $name: 可访问${NC}"
            return 0
        else
            echo -e "${RED}❌ $name: 不可访问${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  需要 curl 或 wget 来检查 API${NC}"
        return 1
    fi
}

# 检查 Docker 容器
check_docker() {
    local container=$1
    
    if command -v docker &> /dev/null; then
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            status=$(docker ps --filter "name=${container}" --format "{{.Status}}")
            echo -e "${GREEN}✅ Docker 容器 $container: $status${NC}"
            return 0
        else
            echo -e "${RED}❌ Docker 容器 $container: 未运行${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  无法检查 Docker 容器 $container (Docker 可能未安装)${NC}"
        return 1
    fi
}

# 检查环境变量文件
check_env_file() {
    local file=$1
    shift
    local required_vars=("$@")
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ 环境变量文件不存在: $file${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 环境变量文件存在: $file${NC}"
    
    if [ ${#required_vars[@]} -gt 0 ]; then
        missing=()
        for var in "${required_vars[@]}"; do
            if ! grep -q "$var" "$file" 2>/dev/null; then
                missing+=("$var")
            fi
        done
        
        if [ ${#missing[@]} -gt 0 ]; then
            echo -e "${YELLOW}⚠️  缺少环境变量: ${missing[*]}${NC}"
        else
            echo -e "${GREEN}✅ 必需的环境变量都已配置${NC}"
        fi
    fi
    
    return 0
}

# 1. 端口检查
echo ""
echo "============================================================"
echo -e "${CYAN}1. 端口检查${NC}"
echo "============================================================"

PORT_RESULTS=0
check_port 3000 "前端服务" && PORT_RESULTS=$((PORT_RESULTS + 1))
check_port 3001 "后端服务" && PORT_RESULTS=$((PORT_RESULTS + 1))
check_port 5432 "PostgreSQL 数据库" && PORT_RESULTS=$((PORT_RESULTS + 1))
check_port 6379 "Redis 缓存" && PORT_RESULTS=$((PORT_RESULTS + 1))

# 2. Docker 容器检查
echo ""
echo "============================================================"
echo -e "${CYAN}2. Docker 容器检查${NC}"
echo "============================================================"

DOCKER_AVAILABLE=0
if check_docker "conference_backend"; then
    DOCKER_AVAILABLE=1
    check_docker "conference_frontend"
    check_docker "conference_postgres"
    check_docker "conference_redis"
fi

# 3. API 端点检查
echo ""
echo "============================================================"
echo -e "${CYAN}3. API 端点检查${NC}"
echo "============================================================"

API_RESULTS=0
check_api "http://localhost:3001/api/health" "后端健康检查" && API_RESULTS=$((API_RESULTS + 1))
check_api "http://localhost:3000" "前端首页" && API_RESULTS=$((API_RESULTS + 1))
check_api "http://localhost:3001/api/events" "后端 Events API" && API_RESULTS=$((API_RESULTS + 1))

# 4. 环境变量文件检查
echo ""
echo "============================================================"
echo -e "${CYAN}4. 环境变量文件检查${NC}"
echo "============================================================"

check_env_file "backend/.env" "DATABASE_URL" "JWT_SECRET" "REDIS_HOST"
check_env_file "frontend/.env.local" "NEXT_PUBLIC_API_URL" "NEXTAUTH_SECRET"

# 5. 环境信息
echo ""
echo "============================================================"
echo -e "${CYAN}5. 环境信息${NC}"
echo "============================================================"

if command -v node &> /dev/null; then
    echo -e "${BLUE}ℹ️  Node.js 版本: $(node --version)${NC}"
fi
echo -e "${BLUE}ℹ️  平台: $(uname -s) $(uname -m)${NC}"

# 6. 总结
echo ""
echo "============================================================"
echo -e "${CYAN}诊断总结${NC}"
echo "============================================================"

if [ $PORT_RESULTS -eq 4 ] && [ $API_RESULTS -eq 3 ]; then
    echo -e "${GREEN}✅ 所有服务运行正常！${NC}"
else
    echo -e "${RED}❌ 发现问题，请检查上述错误信息${NC}"
    
    if ! check_port 3001 "test" &>/dev/null; then
        echo -e "${BLUE}ℹ️  建议: 运行 cd backend && npm run start:dev${NC}"
    fi
    if ! check_port 3000 "test" &>/dev/null; then
        echo -e "${BLUE}ℹ️  建议: 运行 cd frontend && npm run dev${NC}"
    fi
    if [ $DOCKER_AVAILABLE -eq 0 ] && ! check_port 5432 "test" &>/dev/null; then
        echo -e "${BLUE}ℹ️  建议: 启动 PostgreSQL 数据库或使用 Docker Compose${NC}"
    fi
fi

echo ""


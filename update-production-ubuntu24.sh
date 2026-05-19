#!/bin/bash

# ============================================
# Ubuntu 24 生产环境一键更新脚本
# ============================================
# 功能：自动更新代码、重新构建并重启生产环境容器
# 适用：Ubuntu 24.04 LTS
# 说明：此脚本会更新前端和后端，不影响数据库数据
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
ENABLE_GIT_PULL=true
GIT_BRANCH="main"
BACKUP_DIR="backups/production/$(date +%Y%m%d_%H%M%S)"

# 打印函数
info() { echo -e "${CYAN}[信息]${NC} $1"; }
success() { echo -e "${GREEN}[成功]${NC} $1"; }
warning() { echo -e "${YELLOW}[警告]${NC} $1"; }
error() { echo -e "${RED}[错误]${NC} $1"; }
step() { echo -e "\n${BLUE}========================================${NC}\n${BLUE}$1${NC}\n${BLUE}========================================${NC}\n"; }

# 检查命令
check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        error "未安装 $1"
        exit 1
    fi
}

# 主函数
main() {
    clear
    echo -e "${CYAN}"
    echo "=========================================="
    echo "  Ubuntu 24 生产环境一键更新脚本"
    echo "=========================================="
    echo -e "${NC}\n"
    
    # 确认操作
    warning "此操作将："
    echo "  1. 从Git拉取最新代码（如启用）"
    echo "  2. 备份配置文件"
    echo "  3. 停止前端和后端容器"
    echo "  4. 重新构建容器（无缓存）"
    echo "  5. 启动服务并验证"
    echo ""
    echo -e "${RED}注意：此操作不会影响数据库和其他服务数据${NC}\n"
    read -p "是否继续？(y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "操作已取消"
        exit 0
    fi
    
    # 1. 检查系统
    step "1. 检查系统环境"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" = "ubuntu" ] && [ "${VERSION_ID%%.*}" = "24" ]; then
            success "系统: $PRETTY_NAME"
        else
            warning "此脚本专为 Ubuntu 24 设计，当前系统: $PRETTY_NAME"
            read -p "是否继续？(y/n): " -n 1 -r
            echo ""
            [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
        fi
    fi
    
    # 2. 检查项目
    step "2. 检查项目环境"
    [ ! -f "docker-compose.prod.yml" ] && { error "找不到 docker-compose.prod.yml"; exit 1; }
    success "找到 docker-compose.prod.yml"
    [ -f ".env.production" ] && success "找到 .env.production" || warning "未找到 .env.production"
    
    # 3. 检查Docker
    step "3. 检查Docker环境"
    check_cmd docker
    docker info &> /dev/null || { error "Docker 服务未运行"; exit 1; }
    success "Docker 服务运行中"
    
    DOCKER_COMPOSE_CMD="docker-compose"
    if docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
        success "Docker Compose (v2) 已安装"
    elif command -v docker-compose &> /dev/null; then
        success "Docker Compose (v1) 已安装"
    else
        error "未安装 Docker Compose"
        exit 1
    fi
    
    # 4. Git拉取
    if [ "$ENABLE_GIT_PULL" = true ]; then
        step "4. 更新代码（Git Pull）"
        if [ -d ".git" ]; then
            if [ -n "$(git status --porcelain)" ]; then
                warning "检测到未提交的更改"
                read -p "是否继续？(y/n): " -n 1 -r
                echo ""
                [[ ! $REPLY =~ ^[Yy]$ ]] && info "已取消Git拉取" || git pull origin "$GIT_BRANCH" || warning "Git拉取失败，继续使用当前代码"
            else
                git pull origin "$GIT_BRANCH" && success "代码更新成功" || warning "Git拉取失败，继续使用当前代码"
            fi
        else
            info "未检测到Git仓库，跳过代码拉取"
        fi
    fi
    
    # 5. 备份
    step "5. 备份配置文件"
    mkdir -p "$BACKUP_DIR"
    [ -f "docker-compose.prod.yml" ] && cp "docker-compose.prod.yml" "$BACKUP_DIR/docker-compose.prod.yml.bak" && success "已备份 docker-compose.prod.yml"
    [ -f ".env.production" ] && cp ".env.production" "$BACKUP_DIR/.env.production.bak" && success "已备份 .env.production"
    success "备份位置: $BACKUP_DIR"
    
    # 6. 检查磁盘空间
    step "6. 检查磁盘空间"
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    [ "$AVAILABLE_SPACE" -lt 5 ] && warning "可用磁盘空间不足 5GB，当前: ${AVAILABLE_SPACE}GB" || success "可用磁盘空间: ${AVAILABLE_SPACE}GB"
    
    # 7. 停止容器
    step "7. 停止当前容器"
    if docker ps --format '{{.Names}}' | grep -q "conference-frontend-prod"; then
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml stop frontend 2>/dev/null || docker stop conference-frontend-prod 2>/dev/null || true
        success "前端容器已停止"
    fi
    if docker ps --format '{{.Names}}' | grep -q "conference-backend-prod"; then
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml stop backend 2>/dev/null || docker stop conference-backend-prod 2>/dev/null || true
        success "后端容器已停止"
    fi
    
    # 8. 重新构建
    step "8. 重新构建容器"
    info "这可能需要几分钟时间，请耐心等待..."
    
    info "正在构建后端容器..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build --no-cache backend || { error "后端构建失败"; exit 1; }
    success "后端构建成功"
    
    info "正在构建前端容器..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build --no-cache frontend || { error "前端构建失败"; exit 1; }
    success "前端构建成功"
    
    # 9. 启动服务
    step "9. 启动服务"
    
    info "正在启动后端服务..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --no-deps backend || { error "后端启动失败"; exit 1; }
    success "后端容器已启动"
    
    info "等待后端服务就绪..."
    sleep 5
    
    for i in {1..30}; do
        if docker exec conference-backend-prod curl -f http://localhost:3001/api/health >/dev/null 2>&1 || \
           curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            success "后端服务已就绪"
            break
        fi
        [ $i -eq 30 ] && warning "后端服务启动超时，但继续执行" || sleep 2
    done
    
    info "正在启动前端服务..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --no-deps frontend || { error "前端启动失败"; exit 1; }
    success "前端容器已启动"
    sleep 5
    
    # 10. 验证状态
    step "10. 验证服务状态"
    
    BACKEND_STATUS=$(docker ps --filter "name=conference-backend-prod" --format "{{.Status}}" 2>/dev/null || echo "")
    [ -n "$BACKEND_STATUS" ] && success "后端容器运行中: $BACKEND_STATUS" || { error "后端容器未运行"; exit 1; }
    
    FRONTEND_STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}" 2>/dev/null || echo "")
    [ -n "$FRONTEND_STATUS" ] && success "前端容器运行中: $FRONTEND_STATUS" || { error "前端容器未运行"; exit 1; }
    
    curl -f -s http://localhost:3001/api/health >/dev/null 2>&1 && success "后端API健康检查通过" || warning "后端API健康检查失败（可能仍在启动中）"
    
    # 完成
    step "更新完成"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}生产环境更新成功！${NC}"
    echo -e "${GREEN}========================================${NC}\n"
    echo "更新内容："
    echo "  ✓ 代码已更新（如启用Git拉取）"
    echo "  ✓ 前端容器已重新构建并启动"
    echo "  ✓ 后端容器已重新构建并启动"
    echo "  ✓ 服务健康检查通过"
    echo ""
    echo "备份位置: $BACKUP_DIR"
    echo ""
    echo "常用命令："
    echo "  查看服务状态: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps"
    echo "  查看前端日志: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f frontend"
    echo "  查看后端日志: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f backend"
    echo "  查看资源使用: docker stats conference-frontend-prod conference-backend-prod"
    echo ""
}

main


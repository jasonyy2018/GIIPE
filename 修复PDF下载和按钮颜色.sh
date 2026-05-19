#!/bin/bash

# 修复 PDF 下载功能和按钮颜色
# 1. 允许 PUBLISHED 和 COMPLETED 事件的 PDF 公开下载
# 2. 将下载按钮颜色改为主题绿色

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} ⚠️  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} ❌ $1"; }

echo "=========================================="
echo "🔧 修复 PDF 下载和按钮颜色"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/4] 停止后端和前端服务..."
docker compose -f docker-compose.prod.yml stop backend frontend
log_success "服务已停止"

log_info "[2/4] 重新构建后端（应用 PDF 下载权限修复）..."
docker compose -f docker-compose.prod.yml build --no-cache backend
log_success "后端构建完成"

log_info "[3/4] 重新构建前端（应用按钮颜色修复）..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
log_success "前端构建完成"

log_info "[4/4] 启动服务..."
docker compose -f docker-compose.prod.yml up -d backend frontend
log_success "服务已启动"

log_info "等待服务启动..."
sleep 20

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps backend frontend

# 测试后端健康
log_info "测试后端健康检查..."
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend wget -q -O- http://localhost:3001/api/health 2>/dev/null || echo "FAILED")
if echo "$BACKEND_HEALTH" | grep -q "ok\|healthy"; then
    log_success "后端健康检查通过"
else
    log_warning "后端健康检查失败，请检查日志"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ PDF 下载按钮颜色改为主题绿色（bg-primary）"
echo "2. ✅ PDF 附件框背景改为绿色主题（bg-primary/5）"
echo "3. ✅ PUBLISHED 和 COMPLETED 事件的 PDF 可以公开下载（无需登录）"
echo "4. ✅ 改进了 PDF 下载的错误处理和日志记录"
echo ""
echo "📋 访问规则："
echo "- PUBLISHED 事件: ✅ PDF 可公开下载"
echo "- COMPLETED 事件: ✅ PDF 可公开下载（新）"
echo "- DRAFT 事件: ❌ PDF 需要管理员权限"
echo ""
echo "📋 验证步骤："
echo "1. 检查后端日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i pdf"
echo ""
echo "2. 在浏览器中访问 PUBLISHED 或 COMPLETED 状态的事件"
echo "3. 检查下载按钮是否为绿色主题色"
echo "4. 尝试下载 PDF（应该可以公开下载）"
echo ""
echo "⚠️  注意：如果 PDF 文件不存在，请检查："
echo "   - 文件是否已上传到 /app/uploads/pdfs/ 目录"
echo "   - 数据库中的 pdfAttachment 路径是否正确"
echo "   - 查看后端日志中的文件路径信息"
echo ""


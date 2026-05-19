#!/bin/bash

# 修复 NestJS 配置和启动问题

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "🔧 修复 NestJS 配置和启动问题"
echo -e "${NC}"

# 检查容器
if ! docker ps -a --format "{{.Names}}" | grep -q "^conference_backend$"; then
    echo -e "${RED}❌ 容器 conference_backend 不存在${NC}"
    exit 1
fi

echo -e "${BLUE}[1/6] 检查当前配置...${NC}"
echo -e "${CYAN}nest-cli.json:${NC}"
docker exec conference_backend cat /app/nest-cli.json 2>/dev/null || echo "无法读取"

echo -e "${CYAN}tsconfig.json (outDir):${NC}"
docker exec conference_backend grep -A 2 "outDir" /app/tsconfig.json 2>/dev/null || echo "无法读取"

echo -e "${BLUE}[2/6] 检查编译输出目录...${NC}"
echo -e "${CYAN}检查 dist 目录:${NC}"
docker exec conference_backend ls -la /app/dist 2>/dev/null || echo -e "${RED}dist 目录不存在${NC}"

echo -e "${CYAN}查找 main.js 文件:${NC}"
docker exec conference_backend find /app/dist -name "main.js" -type f 2>/dev/null || echo -e "${YELLOW}未找到 main.js${NC}"

echo -e "${BLUE}[3/6] 清理旧的编译文件...${NC}"
# 更彻底的清理，先停止可能使用文件的进程
docker exec conference_backend sh -c "cd /app && pkill -f 'nest start' || true" 2>/dev/null
sleep 2
# 强制删除所有编译文件
docker exec conference_backend sh -c "cd /app && rm -rf dist .tsbuildinfo && mkdir -p dist" 2>/dev/null
echo -e "${GREEN}✅ 已清理${NC}"

echo -e "${BLUE}[4/6] 生成 Prisma Client...${NC}"
docker exec conference_backend sh -c "cd /app && npx prisma generate" 2>&1 | tail -5
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma Client 生成成功${NC}"
else
    echo -e "${RED}❌ Prisma Client 生成失败${NC}"
fi

echo -e "${BLUE}[5/6] 编译 NestJS 应用...${NC}"
echo -e "${YELLOW}这可能需要几分钟...${NC}"

# 先手动清理 dist 目录（避免 deleteOutDir 的问题）
docker exec conference_backend sh -c "cd /app && find dist -type f -delete && find dist -type d -empty -delete 2>/dev/null || true"

# 编译并显示输出
COMPILE_OUTPUT=$(docker exec conference_backend sh -c "cd /app && npm run build 2>&1")
COMPILE_EXIT=$?

echo "$COMPILE_OUTPUT" | tail -30

if [ $COMPILE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ 编译成功${NC}"
else
    echo -e "${RED}❌ 编译失败，尝试手动清理后重新编译...${NC}"
    # 如果失败，尝试更彻底的清理
    # 使用临时变量避免管道导致的退出状态问题
    RETRY_OUTPUT=$(docker exec conference_backend sh -c "cd /app && rm -rf dist && mkdir dist && npm run build" 2>&1)
    RETRY_EXIT=$?
    echo "$RETRY_OUTPUT" | tail -20
    if [ $RETRY_EXIT -eq 0 ]; then
        echo -e "${GREEN}✅ 重新编译成功${NC}"
    else
        echo -e "${RED}❌ 重新编译仍然失败${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}[6/6] 验证编译结果...${NC}"

# 检查编译后的文件
MAIN_FILE=$(docker exec conference_backend find /app/dist -name "main.js" -type f 2>/dev/null | head -1)

if [ -n "$MAIN_FILE" ]; then
    echo -e "${GREEN}✅ 找到主文件: $MAIN_FILE${NC}"
    docker exec conference_backend ls -lh "$MAIN_FILE"
    
    # 检查文件内容
    echo -e "${CYAN}检查文件开头:${NC}"
    docker exec conference_backend head -5 "$MAIN_FILE" 2>/dev/null
    
    # 确定正确的启动命令
    if echo "$MAIN_FILE" | grep -q "dist/src/main.js"; then
        echo -e "${YELLOW}⚠️  文件在 dist/src/main.js，但 package.json 使用 dist/main${NC}"
        echo -e "${BLUE}建议修复 package.json 中的 start:prod 命令${NC}"
    elif echo "$MAIN_FILE" | grep -q "dist/main.js"; then
        echo -e "${GREEN}✅ 文件位置正确: dist/main.js${NC}"
    fi
else
    echo -e "${RED}❌ 未找到 main.js 文件${NC}"
    echo -e "${YELLOW}查看 dist 目录结构:${NC}"
    docker exec conference_backend find /app/dist -type f -name "*.js" | head -10
fi

echo ""
echo "============================================================"
echo -e "${CYAN}重启后端容器${NC}"
echo "============================================================"

docker restart conference_backend
echo -e "${GREEN}✅ 容器已重启${NC}"

echo -e "${BLUE}等待编译完成（这可能需要 30-60 秒）...${NC}"
echo -e "${YELLOW}正在监控编译进度...${NC}"

# 等待编译完成，最多等待 90 秒
MAX_WAIT=90
WAITED=0
COMPILATION_STARTED=false

while [ $WAITED -lt $MAX_WAIT ]; do
    # 检查日志中是否有编译完成或错误的迹象
    LOG_TAIL=$(docker logs conference_backend --tail 20 2>/dev/null)
    
    # 检查是否开始编译
    if echo "$LOG_TAIL" | grep -q "Starting compilation\|Found.*errors"; then
        COMPILATION_STARTED=true
    fi
    
    # 检查编译是否完成（没有错误）
    if echo "$LOG_TAIL" | grep -q "Found 0 errors.*Watching for file changes"; then
        echo -e "${GREEN}✅ 编译完成${NC}"
        break
    fi
    
    # 检查是否有编译错误
    if echo "$LOG_TAIL" | grep -q "error TS\|Found.*error"; then
        echo -e "${RED}❌ 编译错误检测到${NC}"
        break
    fi
    
    # 检查是否已经启动（有监听端口或进程）
    if docker exec conference_backend sh -c "nc -z localhost 3001 2>/dev/null" 2>/dev/null; then
        echo -e "${GREEN}✅ 后端已启动（端口正在监听）${NC}"
        break
    fi
    
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done

echo ""
if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  等待超时，继续检查状态...${NC}"
fi

echo ""
echo "============================================================"
echo -e "${CYAN}检查启动日志${NC}"
echo "============================================================"
docker logs conference_backend --tail 50

echo ""
echo "============================================================"
echo -e "${CYAN}测试后端连接${NC}"
echo "============================================================"

# 检查进程
echo -e "${BLUE}检查 Node.js 进程:${NC}"
docker exec conference_backend ps aux | grep -E "node|nest" | grep -v grep || echo "未找到 Node.js 进程"

# 测试端口
echo -e "${BLUE}测试端口 3001:${NC}"
docker exec conference_backend sh -c "nc -z localhost 3001 && echo '✅ 端口 3001 正在监听' || echo '❌ 端口 3001 未监听'" 2>/dev/null || \
    docker exec conference_backend sh -c "timeout 2 bash -c '</dev/tcp/localhost/3001' && echo '✅ 端口可访问' || echo '❌ 端口不可访问'" 2>/dev/null || \
    echo "无法测试端口"

# 测试健康检查（使用 curl 或 wget，优先使用 curl）
echo -e "${BLUE}测试健康检查:${NC}"
HEALTH_RESPONSE=""
if docker exec conference_backend which curl >/dev/null 2>&1; then
    HEALTH_RESPONSE=$(docker exec conference_backend curl -s http://localhost:3001/api/health 2>/dev/null)
elif docker exec conference_backend which wget >/dev/null 2>&1; then
    HEALTH_RESPONSE=$(docker exec conference_backend wget -qO- http://localhost:3001/api/health 2>/dev/null)
else
    # 尝试使用 node 来测试
    HEALTH_RESPONSE=$(docker exec conference_backend sh -c "node -e \"require('http').get('http://localhost:3001/api/health', (r) => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>console.log(d)); }).on('error', ()=>process.exit(1));\" 2>/dev/null" 2>/dev/null || echo "")
fi

if [ -n "$HEALTH_RESPONSE" ] && [ "$HEALTH_RESPONSE" != "OCI runtime exec failed" ]; then
    echo -e "${GREEN}✅ 后端健康检查成功${NC}"
    echo "响应: $HEALTH_RESPONSE"
else
    echo -e "${YELLOW}⚠️  无法测试健康检查（可能需要更多时间启动）${NC}"
    echo -e "${BLUE}提示: 后端可能仍在编译中，请稍后手动检查${NC}"
fi

echo ""
echo "============================================================"
echo -e "${CYAN}修复完成${NC}"
echo "============================================================"

# 最终状态检查
PORT_LISTENING=false
PROCESS_RUNNING=false

if docker exec conference_backend sh -c "nc -z localhost 3001 2>/dev/null" 2>/dev/null; then
    PORT_LISTENING=true
fi

if docker exec conference_backend ps aux | grep -E "node.*dist|nest" | grep -v grep >/dev/null 2>&1; then
    PROCESS_RUNNING=true
fi

if [ "$PORT_LISTENING" = true ] || [ "$PROCESS_RUNNING" = true ]; then
    echo -e "${GREEN}✅ 后端正在运行！${NC}"
    if [ "$PORT_LISTENING" = true ]; then
        echo -e "${GREEN}  ✓ 端口 3001 正在监听${NC}"
    fi
    if [ "$PROCESS_RUNNING" = true ]; then
        echo -e "${GREEN}  ✓ Node.js 进程正在运行${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  后端可能仍在启动中或遇到问题${NC}"
    echo -e "${BLUE}建议操作:${NC}"
    echo -e "  1. 查看完整日志: ${CYAN}docker logs conference_backend${NC}"
    echo -e "  2. 检查编译状态: ${CYAN}docker logs conference_backend | grep -E 'error|Found.*errors'${NC}"
    echo -e "  3. 等待 30-60 秒后再次检查: ${CYAN}docker exec conference_backend nc -z localhost 3001${NC}"
fi

echo ""


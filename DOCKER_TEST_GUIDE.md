# Docker部署测试指南

本指南用于测试Docker部署后的各项功能，包括hydration修复验证。

## 快速测试

### 1. 检查容器状态

```bash
docker-compose -f docker-compose.prod.yml ps
```

所有容器应该显示为 `Up` 状态。

### 2. 运行完整测试脚本

```bash
# 在Linux服务器上运行
chmod +x test-docker-deployment.sh
./test-docker-deployment.sh
```

### 3. 手动测试步骤

#### 测试后端健康
```bash
docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:3001/health
```

应该返回 `200 OK`。

#### 测试前端到后端连接
```bash
docker-compose -f docker-compose.prod.yml exec frontend curl http://backend:3001/health
```

应该返回 `200 OK`。

#### 测试前端API代理
```bash
docker-compose -f docker-compose.prod.yml exec frontend curl "http://localhost:3000/api/events?status=PUBLISHED&limit=1"
```

应该返回JSON格式的事件数据。

#### 测试前端页面
```bash
docker-compose -f docker-compose.prod.yml exec frontend curl http://localhost:3000/
```

应该返回HTML内容。

### 4. 检查hydration修复

验证hydration修复是否已应用：

```bash
# 检查PublicLayout.tsx
grep -A 2 "currentYear" frontend/src/components/public/PublicLayout.tsx

# 检查EventCard.tsx
grep -A 2 "isRegistrationOpen" frontend/src/components/public/EventCard.tsx
```

应该看到 `useState` 和 `useEffect` 的使用。

### 5. 查看日志

#### 查看前端日志（检查hydration错误）
```bash
docker-compose -f docker-compose.prod.yml logs frontend | grep -i "hydration\|error"
```

不应该看到 "Text content does not match server-rendered HTML" 错误。

#### 查看后端日志
```bash
docker-compose -f docker-compose.prod.yml logs backend --tail 50
```

#### 查看所有服务日志
```bash
docker-compose -f docker-compose.prod.yml logs --tail 100
```

### 6. 测试环境变量

```bash
# 检查前端SERVER_API_URL
docker-compose -f docker-compose.prod.yml exec frontend env | grep SERVER_API_URL

# 应该显示: SERVER_API_URL=http://backend:3001
```

### 7. 网络连接测试

```bash
# 从前端容器ping后端
docker-compose -f docker-compose.prod.yml exec frontend ping -c 2 backend

# 从后端容器ping数据库
docker-compose -f docker-compose.prod.yml exec backend ping -c 2 postgres
```

### 8. 数据库连接测试

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma db pull
```

应该成功连接数据库。

## 预期结果

### ✅ 成功指标

1. 所有容器状态为 `Up`
2. 后端健康检查返回 `200 OK`
3. 前端可以访问后端API
4. 前端页面可以正常加载
5. 没有hydration错误（检查浏览器控制台）
6. 环境变量配置正确

### ❌ 常见问题

1. **后端连接失败 (ECONNREFUSED)**
   - 检查后端容器是否运行: `docker-compose -f docker-compose.prod.yml ps backend`
   - 查看后端日志: `docker-compose -f docker-compose.prod.yml logs backend`
   - 检查后端健康: `docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:3001/health`

2. **前端无法访问后端**
   - 检查 `SERVER_API_URL` 环境变量
   - 验证网络连接: `docker-compose -f docker-compose.prod.yml exec frontend ping backend`
   - 检查docker-compose网络配置

3. **Hydration错误仍然存在**
   - 确认代码已更新: 检查 `PublicLayout.tsx` 和 `EventCard.tsx`
   - 重新构建前端镜像: `docker-compose -f docker-compose.prod.yml build frontend`
   - 重启前端容器: `docker-compose -f docker-compose.prod.yml restart frontend`

## 浏览器测试

在浏览器中访问应用后，打开开发者工具（F12），检查：

1. **Console标签**: 不应该有hydration错误
2. **Network标签**: API请求应该返回200状态码
3. **Elements标签**: HTML应该正确渲染

## 性能测试

```bash
# 测试API响应时间
time docker-compose -f docker-compose.prod.yml exec frontend curl -o /dev/null -s -w "%{time_total}\n" http://backend:3001/api/events?status=PUBLISHED&limit=10
```

响应时间应该在1秒以内。

## 清理和重启

如果需要重新测试：

```bash
# 停止所有容器
docker-compose -f docker-compose.prod.yml down

# 重新构建并启动
docker-compose -f docker-compose.prod.yml up -d --build

# 等待服务启动
sleep 30

# 运行测试
./test-docker-deployment.sh
```


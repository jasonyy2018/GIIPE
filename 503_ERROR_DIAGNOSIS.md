# 503 Service Unavailable 错误诊断和修复

## 问题分析

503 错误表明：
- ✅ nginx 配置正确（可以路由请求）
- ❌ Next.js 服务器无法响应请求

## 可能的原因

1. **Next.js 服务器未启动或崩溃**
2. **资源不足**（内存/CPU 限制）
3. **构建问题**（server.js 文件缺失或损坏）
4. **端口绑定问题**
5. **启动时间过长**（超过健康检查等待时间）

## 诊断步骤

### 1. 检查容器状态

```bash
# 检查前端容器状态
docker-compose -f docker-compose.prod.yml ps frontend

# 检查容器日志
docker-compose -f docker-compose.prod.yml logs --tail=100 frontend

# 检查容器是否在运行
docker-compose -f docker-compose.prod.yml exec frontend ps aux
```

### 2. 检查 Next.js 服务器文件

```bash
# 进入容器检查文件
docker-compose -f docker-compose.prod.yml exec frontend sh

# 在容器内检查
ls -la /app/
ls -la /app/server.js
ls -la /app/.next/static/
ls -la /app/public/
```

### 3. 检查端口监听

```bash
# 检查端口是否监听
docker-compose -f docker-compose.prod.yml exec frontend netstat -tlnp
# 或
docker-compose -f docker-compose.prod.yml exec frontend ss -tlnp
```

### 4. 检查资源使用

```bash
# 检查容器资源使用
docker stats conference-frontend-prod
```

### 5. 测试直接访问

```bash
# 从 nginx 容器测试
docker-compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:3000/

# 从主机测试（如果端口暴露）
curl http://localhost:3000/
```

## 常见修复方法

### 方法 1: 重启前端容器

```bash
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 方法 2: 重新构建前端

```bash
# 停止服务
docker-compose -f docker-compose.prod.yml stop frontend

# 清除构建缓存
cd frontend
rm -rf .next
cd ..

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# 启动服务
docker-compose -f docker-compose.prod.yml up -d frontend

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 方法 3: 增加资源限制

如果资源不足，在 `docker-compose.prod.yml` 中增加：

```yaml
frontend:
  deploy:
    resources:
      limits:
        cpus: '4'  # 从 2 增加到 4
        memory: 4G  # 从 2G 增加到 4G
```

### 方法 4: 增加启动时间

如果启动时间过长，增加健康检查等待时间：

```yaml
frontend:
  healthcheck:
    start_period: 300s  # 从 180s 增加到 300s
```

### 方法 5: 检查 standalone 模式文件

确保 standalone 模式下的文件结构正确：

```bash
docker-compose -f docker-compose.prod.yml exec frontend ls -la /app/
# 应该看到：
# - server.js
# - .next/static/
# - public/
```

## 快速修复脚本

创建并运行以下脚本：

```bash
#!/bin/bash
echo "🔧 修复 503 错误..."

# 1. 停止前端
docker-compose -f docker-compose.prod.yml stop frontend

# 2. 检查日志
echo "📋 最近的错误日志："
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend

# 3. 重新构建（如果需要）
read -p "是否重新构建前端？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.prod.yml build --no-cache frontend
fi

# 4. 启动前端
docker-compose -f docker-compose.prod.yml up -d frontend

# 5. 等待并查看日志
echo "⏳ 等待前端启动..."
sleep 10
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## 预防措施

1. **添加启动检查脚本**
2. **监控资源使用**
3. **设置合理的健康检查**
4. **添加错误告警**


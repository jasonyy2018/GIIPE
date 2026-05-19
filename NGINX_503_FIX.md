# Nginx 503 错误修复指南

## 问题分析

503 Service Unavailable 错误通常与以下因素有关：

### 1. **Nginx 配置问题** ✅ 已修复
- **超时设置不足**：Next.js SSR 可能需要更长时间
- **错误处理不当**：`proxy_intercept_errors on` 可能导致问题
- **缺少重试机制**：静态资源路径缺少超时和重试配置

### 2. **Next.js 服务器状态**
- 服务器未启动或崩溃
- 资源不足（内存/CPU）
- 启动时间过长

### 3. **网络连接问题**
- 容器间网络不通
- DNS 解析失败
- 端口未正确监听

## 已完成的修复

### 1. 增加超时时间 ✅
- `/_next/` 路径：30s 超时
- 静态资源路径：30s 超时
- 主应用路径：120s 超时（SSR 需要更长时间）

### 2. 改进错误处理 ✅
- 将 `proxy_intercept_errors` 改为 `off`，让 Next.js 处理错误
- 添加 `proxy_next_upstream` 重试机制
- 减少重试次数（避免长时间等待）

### 3. 添加完整的超时配置 ✅
- 所有 Next.js 相关路径都添加了超时设置
- 统一了错误处理策略

## 需要执行的步骤

### 步骤 1: 重启 Nginx（应用新配置）

```bash
# 重启 nginx 容器
docker-compose -f docker-compose.prod.yml restart nginx

# 验证配置是否正确
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### 步骤 2: 检查前端服务状态

```bash
# 使用诊断脚本（Linux/Mac）
bash check-frontend-status.sh

# 或手动检查
docker-compose -f docker-compose.prod.yml ps frontend
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
```

### 步骤 3: 验证修复

```bash
# 测试静态文件访问
curl -I http://localhost/_next/static/chunks/main-app.js

# 测试图片访问
curl -I http://localhost/images/hero/hero-bg.jpg

# 测试主页
curl -I http://localhost/
```

## 如果问题仍然存在

### 检查 Next.js 服务器

```bash
# 1. 检查容器是否运行
docker-compose -f docker-compose.prod.yml ps frontend

# 2. 检查进程
docker-compose -f docker-compose.prod.yml exec frontend ps aux

# 3. 检查端口
docker-compose -f docker-compose.prod.yml exec frontend netstat -tlnp

# 4. 测试容器内访问
docker-compose -f docker-compose.prod.yml exec frontend wget -O- http://127.0.0.1:3000/
```

### 检查 Nginx 日志

```bash
# 查看 nginx 错误日志
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log

# 查看访问日志中的 503 错误
docker-compose -f docker-compose.prod.yml logs nginx | grep 503
```

### 检查资源使用

```bash
# 检查容器资源使用
docker stats conference-frontend-prod

# 如果内存不足，可能需要增加资源限制
```

### 重新构建前端

如果服务器持续崩溃：

```bash
# 停止服务
docker-compose -f docker-compose.prod.yml stop frontend

# 清除构建缓存
cd frontend && rm -rf .next && cd ..

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# 启动服务
docker-compose -f docker-compose.prod.yml up -d frontend

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## 配置说明

### 超时设置

- **静态文件**（`/_next/`, `/images/`）：30s
  - 静态资源应该快速响应
- **主应用**（`/`）：120s
  - SSR 渲染可能需要更长时间

### 错误处理

- **`proxy_intercept_errors off`**：让 Next.js 处理错误，返回正确的错误页面
- **`proxy_next_upstream`**：如果服务器返回 503，尝试重试（最多 2 次）
- **`proxy_next_upstream_timeout`**：重试超时时间（20s）

## 常见问题

### Q: 为什么静态文件也返回 503？
A: 可能是 Next.js 服务器未启动或无法响应。检查容器状态和日志。

### Q: 为什么增加超时时间？
A: Next.js SSR 渲染可能需要时间，特别是首次请求。120s 给服务器足够时间处理。

### Q: 为什么关闭 `proxy_intercept_errors`？
A: Next.js 有自己的错误处理机制，应该让它处理错误而不是 nginx 拦截。

## 预防措施

1. **监控容器健康状态**
2. **设置合理的资源限制**
3. **定期检查日志**
4. **使用健康检查**


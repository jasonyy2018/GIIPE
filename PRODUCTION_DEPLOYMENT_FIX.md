# 生产环境部署问题修复指南

## 问题描述

根据浏览器控制台错误，主要问题包括：

1. **Next.js chunk 文件 404 错误** - 多个 `/_next/static/chunks/...` 文件返回 404
2. **hero-bg.jpg 404 错误** - 背景图片未找到
3. **MIME 类型错误** - 脚本被当作 HTML 返回（通常是 404 页面）
4. **认证错误** - 用户凭据不合法

## 根本原因

1. **Next.js standalone 模式路径问题**
   - standalone 模式下，静态文件路径可能不正确
   - nginx 配置可能没有正确处理所有 Next.js 路径

2. **静态文件未正确复制**
   - Docker 构建时可能没有正确复制所有静态文件
   - public 文件夹中的图片可能没有正确部署

3. **nginx 配置顺序问题**
   - location 块的顺序很重要
   - 更具体的路径应该放在更通用的路径之前

## 修复措施

### 1. 修复 nginx 配置 ✅

**文件：** `nginx/conf.d/default.conf`

**改进：**
- 将 `/_next/` 路径配置改为更通用的匹配
- 确保静态资源路径正确代理到 Next.js
- 移除可能导致问题的错误拦截

```nginx
# Next.js static files - must be before other location blocks
location /_next/ {
    set $frontend_upstream "http://frontend:3000";
    proxy_pass $frontend_upstream;
    # ... 其他配置
    proxy_intercept_errors off;  # 让 Next.js 处理错误
}
```

### 2. 验证 Dockerfile 配置

**文件：** `frontend/Dockerfile.prod`

确保以下文件被正确复制：
- `.next/standalone` - Next.js 服务器文件
- `.next/static` - 静态 chunk 文件
- `public` - 公共静态资源（包括图片）

### 3. 重新构建和部署

执行以下步骤：

```bash
# 1. 停止现有容器
docker-compose -f docker-compose.prod.yml down

# 2. 清除 Next.js 构建缓存
cd frontend
rm -rf .next
cd ..

# 3. 重新构建前端镜像
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# 4. 重新构建 nginx 镜像（如果配置更改）
docker-compose -f docker-compose.prod.yml build nginx

# 5. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 6. 检查日志
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 4. 验证部署

1. **检查 Next.js 容器内的文件**
   ```bash
   docker-compose -f docker-compose.prod.yml exec frontend ls -la .next/static/chunks/
   docker-compose -f docker-compose.prod.yml exec frontend ls -la public/images/hero/
   ```

2. **检查 nginx 代理**
   ```bash
   # 测试静态文件访问
   curl -I http://localhost/_next/static/chunks/main-app.js
   curl -I http://localhost/images/hero/hero-bg.jpg
   ```

3. **检查浏览器控制台**
   - 清除浏览器缓存
   - 硬刷新页面（Ctrl+Shift+R）
   - 检查 Network 面板，确认文件是否成功加载

## 如果问题仍然存在

### 检查 Next.js 构建输出

```bash
# 进入前端容器
docker-compose -f docker-compose.prod.yml exec frontend sh

# 检查文件结构
ls -la .next/
ls -la .next/static/
ls -la public/images/hero/
```

### 检查 nginx 日志

```bash
# 查看 nginx 访问日志
docker-compose -f docker-compose.prod.yml logs nginx | grep "_next"

# 查看 nginx 错误日志
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### 检查 Next.js 服务器日志

```bash
# 查看前端容器日志
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 可能的其他问题

1. **环境变量未正确设置**
   - 检查 `SERVER_API_URL` 是否正确
   - 检查 `NEXT_PUBLIC_API_URL` 是否正确

2. **端口冲突**
   - 确认 frontend 容器在 3000 端口运行
   - 确认 nginx 可以访问 frontend:3000

3. **DNS 解析问题**
   - 在 nginx 容器中测试：`curl http://frontend:3000/_next/static/chunks/main-app.js`

## 临时解决方案

如果问题紧急，可以尝试：

1. **使用开发模式部署**（不推荐用于生产）
   ```yaml
   # 在 docker-compose.prod.yml 中
   frontend:
     command: npm run dev
   ```

2. **直接访问 Next.js 端口**（绕过 nginx）
   - 临时暴露 3000 端口
   - 直接访问 `http://your-server-ip:3000`

## 预防措施

1. **添加健康检查**
   - 确保 Next.js 健康检查端点正常工作
   - 监控静态文件可用性

2. **添加构建验证**
   - 在构建后验证关键文件是否存在
   - 添加自动化测试检查静态资源

3. **改进错误处理**
   - 在 Next.js 中添加更好的错误页面
   - 添加静态资源加载失败的降级方案


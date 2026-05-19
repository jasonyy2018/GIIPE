# 手动修复 YAML 格式错误指南

## 问题

运行脚本后出现错误：`yaml: line 3: did not find expected key`

这表示 `docker-compose.prod.yml` 文件的 YAML 格式被破坏了。

## 快速修复步骤

### 方法 1: 恢复备份（最简单）

```bash
# 恢复备份文件
cp docker-compose.prod.yml.backup docker-compose.prod.yml

# 或如果有其他备份
cp docker-compose.prod.yml.volume_backup docker-compose.prod.yml
```

### 方法 2: 手动添加 Volume 配置

1. **恢复备份文件**
   ```bash
   cp docker-compose.prod.yml.backup docker-compose.prod.yml
   ```

2. **编辑 docker-compose.prod.yml**

   找到 `frontend` 服务部分，在 `SERVER_API_URL: http://backend:3001` 这一行之后，`networks:` 之前，添加：

   ```yaml
   # Frontend
   frontend:
     build:
       context: ./frontend
       dockerfile: Dockerfile.prod
     image: conference-frontend:latest
     container_name: conference-frontend-prod
     restart: unless-stopped
     env_file:
       - .env.production
     environment:
       NODE_ENV: production
       PORT: 3000
       HOSTNAME: 0.0.0.0
       NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost/api}
       NEXT_PUBLIC_SITE_NAME: ${NEXT_PUBLIC_SITE_NAME:-Conference Platform}
       NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:-http://localhost}
       NEXTAUTH_URL: ${NEXTAUTH_URL:-${NEXT_PUBLIC_SITE_URL:-http://localhost}}
       NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
       SERVER_API_URL: http://backend:3001
     volumes:                    # ← 添加这一行
       - ./frontend/src:/app/src:ro  # ← 添加这一行
     networks:                   # ← 确保缩进正确
       - conference-network
     depends_on:
       backend:
         condition: service_healthy
     # ... 其他配置 ...
   ```

3. **验证 YAML 格式**
   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```
   
   如果没有错误输出，说明格式正确。

4. **重启容器**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

## 使用修复脚本

如果备份文件存在，可以运行：

```bash
chmod +x 修复YAML并添加Volume.sh
./修复YAML并添加Volume.sh
```

## 验证修复

```bash
# 1. 验证 YAML 格式
docker-compose -f docker-compose.prod.yml config

# 2. 检查 volume 配置
grep -A 2 "volumes:" docker-compose.prod.yml | grep "frontend/src"

# 3. 重启并查看日志
docker-compose -f docker-compose.prod.yml restart frontend
docker logs conference-frontend-prod -f
```

## 常见 YAML 错误

1. **缩进错误**: YAML 对缩进非常敏感，必须使用空格（不能用 Tab）
2. **冒号后缺少空格**: `key:value` 应该是 `key: value`
3. **列表项缩进**: 列表项必须正确缩进
4. **字符串引号**: 包含特殊字符的字符串需要引号

## 如果仍然有问题

1. **检查文件编码**: 确保是 UTF-8
   ```bash
   file docker-compose.prod.yml
   ```

2. **检查隐藏字符**: 
   ```bash
   cat -A docker-compose.prod.yml | head -20
   ```

3. **使用在线 YAML 验证器**: 
   - https://www.yamllint.com/
   - 复制文件内容进行验证

4. **手动重写 frontend 服务部分**: 如果问题复杂，可以删除 frontend 服务部分，重新添加


# Docker 容器快速启动指南

## 问题诊断

如果遇到以下错误：
```
Error response from daemon: No such container: conference_backend
Error response from daemon: No such container: conference_frontend
Error response from daemon: network conference_network not found
```

**原因**: Docker 容器未启动或不存在

## 快速解决方案

### 方法 1: 使用检查脚本（推荐）

```bash
# 运行检查和启动脚本
chmod +x check-and-start.sh
./check-and-start.sh
```

脚本会自动：
1. 检查容器状态
2. 检查网络配置
3. 检查 docker-compose 文件
4. 提供启动建议
5. 可选自动启动服务

### 方法 2: 手动启动

#### 检查当前状态
```bash
# 查看所有容器（包括已停止的）
docker ps -a

# 查看所有网络
docker network ls

# 查看所有数据卷
docker volume ls
```

#### 启动服务

**开发环境:**
```bash
docker-compose up -d
# 或
docker compose up -d
```

**生产环境:**
```bash
docker-compose -f docker-compose.prod.yml up -d
# 或
docker compose -f docker-compose.prod.yml up -d
```

#### 验证启动
```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker-compose logs -f

# 检查容器状态
docker-compose ps
```

## 常见问题

### 1. 容器启动失败

```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend

# 查看特定容器的错误
docker logs conference_backend
docker logs conference_frontend
```

### 2. 端口被占用

```bash
# 检查端口占用
netstat -tuln | grep -E ':(3000|3001|5432|6379)'
# 或
lsof -i :3000
lsof -i :3001

# 停止占用端口的进程或修改 docker-compose.yml 中的端口映射
```

### 3. 网络不存在

```bash
# 创建网络（通常 docker-compose 会自动创建）
docker network create conference_network

# 或直接启动 docker-compose，它会自动创建网络
docker-compose up -d
```

### 4. 数据卷问题

```bash
# 查看数据卷
docker volume ls

# 如果需要重新创建数据卷（会删除数据）
docker-compose down -v
docker-compose up -d
```

## 完整启动流程

```bash
# 1. 进入项目目录
cd /path/to/GIIPE

# 2. 检查 Docker 是否运行
docker info

# 3. 停止现有容器（如果有）
docker-compose down

# 4. 构建并启动所有服务
docker-compose up -d --build

# 5. 查看启动日志
docker-compose logs -f

# 6. 检查容器状态
docker-compose ps

# 7. 测试服务
curl http://localhost:3001/api/health
curl http://localhost:3000
```

## 生产环境启动

```bash
# 使用生产环境配置
docker-compose -f docker-compose.prod.yml up -d --build

# 查看生产环境日志
docker-compose -f docker-compose.prod.yml logs -f

# 检查生产环境状态
docker-compose -f docker-compose.prod.yml ps
```

## 容器管理命令

```bash
# 启动所有服务
docker-compose start

# 停止所有服务
docker-compose stop

# 重启所有服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 停止并删除容器、网络、数据卷
docker-compose down -v

# 查看资源使用
docker stats

# 进入容器
docker exec -it conference_backend sh
docker exec -it conference_frontend sh
```

## 验证服务运行

```bash
# 1. 检查容器状态
docker ps | grep conference

# 2. 检查后端健康
curl http://localhost:3001/api/health

# 3. 检查前端
curl http://localhost:3000

# 4. 检查数据库连接（从后端容器内）
docker exec conference_backend ping -c 3 conference_postgres

# 5. 检查网络
docker network inspect conference_network
```

## 故障排查

如果容器无法启动，按以下步骤排查：

1. **检查 Docker 服务**
   ```bash
   systemctl status docker
   ```

2. **检查磁盘空间**
   ```bash
   df -h
   docker system df
   ```

3. **检查日志**
   ```bash
   docker-compose logs --tail=100
   ```

4. **重新构建**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

5. **清理并重启**
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up -d --build
   ```


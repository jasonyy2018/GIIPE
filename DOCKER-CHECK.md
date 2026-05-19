# Docker 诊断检查命令

## 快速使用

### Windows (PowerShell)
```powershell
.\docker-check.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x docker-check.sh
./docker-check.sh
```

## 常用 Docker 检查命令

### 1. 基础检查

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker 服务状态
docker info

# 查看所有容器（运行和停止的）
docker ps -a

# 只查看运行中的容器
docker ps

# 查看容器数量
docker ps -q | wc -l
```

### 2. 项目容器检查

```bash
# 查看项目相关容器
docker ps -a | grep conference

# 检查特定容器状态
docker ps -a --filter "name=conference_backend"
docker ps -a --filter "name=conference_frontend"
docker ps -a --filter "name=conference_postgres"
docker ps -a --filter "name=conference_redis"

# 查看容器详细信息
docker inspect conference_backend
```

### 3. 容器日志

```bash
# 查看容器日志（最后100行）
docker logs conference_backend --tail 100

# 实时查看日志
docker logs conference_backend -f

# 查看最近10分钟的错误
docker logs conference_backend --since 10m | grep -i error

# 查看所有容器的错误日志
for container in conference_backend conference_frontend conference_postgres conference_redis; do
    echo "=== $container ==="
    docker logs $container --tail 20 2>&1 | grep -i error
done
```

### 4. 容器资源使用

```bash
# 实时查看资源使用
docker stats

# 查看一次资源使用（不持续）
docker stats --no-stream

# 查看特定容器的资源使用
docker stats conference_backend conference_frontend
```

### 5. 网络检查

```bash
# 查看所有网络
docker network ls

# 查看项目网络
docker network ls | grep conference

# 查看网络详细信息
docker network inspect conference_network

# 查看网络中的容器
docker network inspect conference_network --format '{{range .Containers}}{{.Name}} {{end}}'
```

### 6. 数据卷检查

```bash
# 查看所有数据卷
docker volume ls

# 查看项目相关数据卷
docker volume ls | grep -E "postgres|redis|conference"

# 查看数据卷详细信息
docker volume inspect postgres_data
```

### 7. 镜像检查

```bash
# 查看所有镜像
docker images

# 查看项目相关镜像
docker images | grep conference

# 查看镜像大小
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# 查看镜像详细信息
docker inspect conference_backend:latest
```

### 8. 端口检查

```bash
# 查看容器端口映射
docker ps --format "table {{.Names}}\t{{.Ports}}"

# 检查特定端口
docker ps --format "{{.Names}}\t{{.Ports}}" | grep ":3000"
docker ps --format "{{.Names}}\t{{.Ports}}" | grep ":3001"

# 查看端口映射详情
docker port conference_backend
```

### 9. Docker Compose 检查

```bash
# 查看 Compose 服务状态
docker-compose ps
# 或
docker compose ps

# 查看 Compose 服务日志
docker-compose logs
docker-compose logs backend
docker-compose logs frontend

# 查看 Compose 配置
docker-compose config

# 查看 Compose 服务资源使用
docker-compose top
```

### 10. 容器健康检查

```bash
# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' conference_backend

# 查看健康检查历史
docker inspect --format='{{json .State.Health}}' conference_backend | jq

# 进入容器检查
docker exec -it conference_backend sh
docker exec -it conference_backend /bin/bash
```

### 11. 快速诊断命令组合

```bash
# 一键检查所有项目容器
echo "=== 容器状态 ===" && \
docker ps -a --filter "name=conference" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" && \
echo -e "\n=== 资源使用 ===" && \
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep conference && \
echo -e "\n=== 最近错误 ===" && \
for c in conference_backend conference_frontend; do \
  echo "--- $c ---" && \
  docker logs $c --tail 5 2>&1 | grep -i error || echo "无错误"; \
done
```

### 12. 清理检查

```bash
# 查看未使用的资源
docker system df

# 查看未使用的容器
docker container ls -a --filter "status=exited"

# 查看未使用的镜像
docker images --filter "dangling=true"

# 查看未使用的网络
docker network ls --filter "dangling=true"

# 查看未使用的数据卷
docker volume ls --filter "dangling=true"
```

### 13. 性能检查

```bash
# 查看 Docker 系统事件
docker events

# 查看容器进程
docker top conference_backend

# 查看容器文件系统使用
docker exec conference_backend df -h
```

### 14. 故障排查

```bash
# 检查容器是否可访问
docker exec conference_backend ping -c 3 conference_postgres

# 检查容器内网络
docker exec conference_backend netstat -tuln

# 检查容器环境变量
docker exec conference_backend env

# 检查容器文件系统
docker exec conference_backend ls -la /app
```

## 常用问题排查

### 容器无法启动

```bash
# 查看启动失败的原因
docker logs conference_backend

# 查看容器退出代码
docker inspect conference_backend --format='{{.State.ExitCode}}'

# 尝试手动启动
docker start conference_backend
docker logs conference_backend -f
```

### 端口冲突

```bash
# 检查端口占用
netstat -ano | grep :3000  # Windows
lsof -i :3000              # Linux/Mac

# 查看容器端口映射
docker port conference_backend
```

### 网络问题

```bash
# 检查容器网络连接
docker exec conference_backend ping conference_postgres

# 检查 DNS 解析
docker exec conference_backend nslookup conference_postgres

# 查看网络配置
docker network inspect conference_network
```

### 数据卷问题

```bash
# 检查数据卷挂载
docker inspect conference_postgres --format='{{.Mounts}}'

# 检查数据卷内容
docker run --rm -v postgres_data:/data alpine ls -la /data
```

## 一键诊断脚本

运行提供的脚本可以自动执行以上所有检查：

- **Windows**: `.\docker-check.ps1`
- **Linux/Mac**: `./docker-check.sh`

这些脚本会生成完整的诊断报告，包括所有容器的状态、资源使用、日志错误等。


# Ubuntu 24 生产环境一键更新脚本

## 简介

这是一个专为 Ubuntu 24.04 LTS 设计的生产环境一键更新脚本，用于自动更新代码、重新构建并重启 Docker 容器。

## 功能特性

- ✅ 自动检查系统环境（Ubuntu 24）
- ✅ 可选从 Git 拉取最新代码
- ✅ 自动备份配置文件
- ✅ 停止、重建、启动前端和后端容器
- ✅ 自动健康检查和状态验证
- ✅ 彩色输出，清晰显示每个步骤

## 使用方法

### 1. 赋予执行权限

```bash
chmod +x update-production-ubuntu24.sh
```

### 2. 运行脚本

```bash
./update-production-ubuntu24.sh
```

### 3. 确认操作

脚本会显示更新步骤，输入 `y` 确认继续。

## 配置选项

脚本开头可以修改以下配置：

```bash
ENABLE_GIT_PULL=true  # 是否从Git拉取代码（true/false）
GIT_BRANCH="main"     # Git分支名称
```

## 执行流程

1. **系统检查** - 验证 Ubuntu 24 和 Docker 环境
2. **项目检查** - 检查必要文件是否存在
3. **Docker检查** - 验证 Docker 和 Docker Compose
4. **代码更新** - 从 Git 拉取最新代码（如启用）
5. **配置备份** - 备份 `docker-compose.prod.yml` 和 `.env.production`
6. **磁盘检查** - 检查可用磁盘空间
7. **停止容器** - 停止当前运行的前端和后端容器
8. **重新构建** - 使用 `--no-cache` 重新构建容器
9. **启动服务** - 按顺序启动后端和前端服务
10. **验证状态** - 检查容器状态和服务健康

## 注意事项

⚠️ **重要提示**:

- 此脚本**不会影响数据库和其他服务数据**，只更新代码和容器
- 更新过程中前端和后端服务会短暂中断（通常3-5分钟）
- 重新构建容器可能需要5-15分钟时间
- 建议至少保留 5GB 可用磁盘空间

## 常用命令

### 查看服务状态

```bash
docker compose -f docker-compose.prod.yml ps
```

### 查看服务日志

```bash
# 前端日志
docker compose -f docker-compose.prod.yml logs -f frontend

# 后端日志
docker compose -f docker-compose.prod.yml logs -f backend
```

### 查看容器资源使用

```bash
docker stats conference-frontend-prod conference-backend-prod
```

### 重启服务

```bash
docker compose -f docker-compose.prod.yml restart frontend backend
```

## 故障排查

### 构建失败

```bash
# 查看详细构建日志
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml build --no-cache backend

# 检查磁盘空间
df -h

# 清理Docker缓存
docker system prune -a
```

### 容器启动失败

```bash
# 查看容器日志
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs backend

# 检查端口占用
sudo netstat -tulpn | grep -E '3000|3001'
```

### 权限错误

```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER
newgrp docker

# 或使用sudo运行脚本
sudo ./update-production-ubuntu24.sh
```

## 回滚方法

如果需要回滚：

```bash
# 1. 停止容器
docker compose -f docker-compose.prod.yml stop frontend backend

# 2. 从备份恢复配置
cp backups/production/YYYYMMDD_HHMMSS/docker-compose.prod.yml.bak docker-compose.prod.yml
cp backups/production/YYYYMMDD_HHMMSS/.env.production.bak .env.production

# 3. 重新构建和启动
docker compose -f docker-compose.prod.yml build --no-cache frontend backend
docker compose -f docker-compose.prod.yml up -d frontend backend
```

## 备份说明

脚本会自动备份以下文件到 `backups/production/YYYYMMDD_HHMMSS/`：

- `docker-compose.prod.yml`
- `.env.production`

---

**适用系统**: Ubuntu 24.04 LTS  
**脚本版本**: 1.0.0


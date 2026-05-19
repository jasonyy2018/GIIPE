# 生产环境数据库迁移指南

## 问题描述

生产环境数据库缺少 `honorableGuests` 字段，导致事件查询失败。

## 解决方案

### 方法 1：使用 Docker Compose 执行迁移（推荐）

在 Ubuntu 服务器上，进入项目目录，执行：

```bash
# 进入项目目录
cd /path/to/your/project

# 在运行的 backend 容器中执行迁移
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 方法 2：直接进入容器执行

```bash
# 进入 backend 容器
docker-compose -f docker-compose.prod.yml exec backend sh

# 在容器内执行迁移
cd /app
npx prisma migrate deploy

# 退出容器
exit
```

### 方法 3：使用 Docker 命令

```bash
# 直接执行迁移命令
docker exec conference-backend-prod npx prisma migrate deploy
```

### 方法 4：手动执行 SQL（推荐 - 最简单快速）

如果迁移文件不存在或迁移失败，直接执行 SQL 是最快的方法：

```bash
# 一行命令直接执行 SQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_db -c 'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;'
```

或者分步执行：

```bash
# 进入 PostgreSQL 容器
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_db

# 在 PostgreSQL 中执行
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;

# 退出 PostgreSQL
\q
```

### 方法 5：使用 prisma db push（如果迁移系统有问题）

如果迁移系统有问题，可以使用 db push（不推荐用于生产，但可以快速修复）：

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma db push --accept-data-loss --skip-generate
```

## 验证迁移

迁移完成后，验证字段是否已添加：

```bash
# 进入 PostgreSQL 容器
docker-compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d conference_db

# 检查表结构
\d events

# 或者查询字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'honorableGuests';

# 退出
\q
```

## 重启服务（如果需要）

迁移完成后，建议重启 backend 服务以确保应用使用新的数据库结构：

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

## 注意事项

1. **备份数据库**：在执行迁移前，建议先备份数据库
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U conference_user conference_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **检查容器状态**：确保容器正在运行
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **查看日志**：如果迁移失败，查看容器日志
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend
   ```

## 故障排除

### 问题：找不到 prisma 命令

**解决方案**：确保在容器内的 `/app` 目录执行，并且已安装依赖
```bash
docker-compose -f docker-compose.prod.yml exec backend sh -c "cd /app && npx prisma migrate deploy"
```

### 问题：数据库连接失败

**解决方案**：检查环境变量和数据库容器状态
```bash
# 检查数据库容器
docker-compose -f docker-compose.prod.yml ps postgres

# 检查环境变量
docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE_URL
```

### 问题：权限错误

**解决方案**：确保容器有正确的权限
```bash
# 检查容器用户
docker-compose -f docker-compose.prod.yml exec backend whoami
```


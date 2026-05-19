# 后端启动问题修复指南

## 问题诊断

### 错误信息
```
Error: Cannot find module '/app/dist/main'
```

### 根本原因

1. **编译路径不匹配**：
   - `tsconfig.json` 中 `outDir: "./dist"` 但 `rootDir` 未设置
   - 默认情况下，TypeScript 会保留源文件目录结构
   - 编译后文件实际在 `dist/src/main.js`，而不是 `dist/main.js`

2. **启动命令错误**：
   - `package.json` 中 `start:prod` 使用 `node dist/main`
   - 但实际文件在 `dist/src/main.js`

3. **NestJS Watch 模式问题**：
   - `nest start --watch` 编译成功但启动失败
   - 因为找不到预期的入口文件

## 已应用的修复

### 1. 修复 `tsconfig.json`
- 添加 `"rootDir": "./src"`
- 确保编译后文件在 `dist/main.js` 而不是 `dist/src/main.js`

### 2. 修复 `nest-cli.json`
- 添加 `"entryFile": "main"`
- 明确指定入口文件

## 修复步骤

### 方法 1: 使用修复脚本（推荐）

```bash
chmod +x fix-nestjs-config.sh
./fix-nestjs-config.sh
```

脚本会自动：
1. 检查当前配置
2. 清理旧的编译文件
3. 重新生成 Prisma Client
4. 重新编译代码
5. 验证编译结果
6. 重启容器并测试

### 方法 2: 手动修复

```bash
# 1. 进入后端容器
docker exec -it conference_backend sh

# 2. 清理旧的编译文件
cd /app
rm -rf dist .tsbuildinfo

# 3. 生成 Prisma Client
npx prisma generate

# 4. 编译代码
npm run build

# 5. 检查编译结果
ls -la dist/
ls -la dist/main.js  # 应该存在

# 6. 退出容器
exit

# 7. 重启容器
docker restart conference_backend

# 8. 查看日志
docker logs conference_backend --tail 50
```

### 方法 3: 重新构建容器

```bash
# 停止并删除容器
docker-compose stop backend
docker-compose rm -f backend

# 重新构建（会应用新的配置）
docker-compose build --no-cache backend
docker-compose up -d backend

# 查看日志
docker-compose logs -f backend
```

## 验证修复

修复后运行以下命令验证：

```bash
# 1. 检查编译文件
docker exec conference_backend ls -la /app/dist/main.js

# 2. 检查后端进程
docker exec conference_backend ps aux | grep node

# 3. 测试健康检查
curl http://localhost:3001/api/health

# 4. 查看启动日志
docker logs conference_backend --tail 30

# 5. 检查前端连接
docker exec conference_frontend ping -c 3 conference_backend
```

## 预期结果

修复成功后，应该看到：

1. **编译文件存在**：
   ```
   /app/dist/main.js
   ```

2. **后端启动成功**：
   ```
   [Nest] Application is running on: http://[::1]:3001
   ```

3. **健康检查通过**：
   ```json
   {"status":"ok","database":"connected"}
   ```

4. **前端可以连接**：
   - 不再出现 `ECONNREFUSED` 错误
   - API 请求成功

## 如果仍然失败

1. **检查文件权限**：
   ```bash
   docker exec conference_backend ls -la /app/dist/
   ```

2. **检查 Node.js 版本**：
   ```bash
   docker exec conference_backend node --version
   ```

3. **查看完整错误**：
   ```bash
   docker logs conference_backend
   ```

4. **检查环境变量**：
   ```bash
   docker exec conference_backend env | grep -E 'DATABASE|REDIS|JWT'
   ```

5. **手动测试启动**：
   ```bash
   docker exec conference_backend sh -c "cd /app && node dist/main.js"
   ```

## 预防措施

1. **确保配置一致**：
   - `tsconfig.json` 中 `rootDir` 和 `outDir` 正确设置
   - `nest-cli.json` 中 `entryFile` 正确设置
   - `package.json` 中启动命令路径正确

2. **在 Dockerfile 中添加编译步骤**：
   ```dockerfile
   RUN npm run build
   ```

3. **添加健康检查**：
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
   ```


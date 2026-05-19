# 构建优化总结

本文档总结了为提高项目构建速度所做的优化。

## 优化内容

### 1. 后端依赖优化

#### 移除未使用的依赖
- **移除 `rehype`、`rehype-sanitize`、`rehype-stringify`、`remark-rehype`**
  - 这些库在代码中未被使用，仅保留了实际使用的 `remark`、`remark-html`、`remark-parse`
  - 减少依赖安装时间和构建时间

- **移除 `xss` 库**
  - 代码中已被注释掉，不再需要
  - 使用 `sanitize-html` 已足够

**影响**: 减少约 4-5 个依赖包，加快 `npm install` 速度

### 2. TypeScript 配置优化

#### 后端 (`backend/tsconfig.json`)
- **添加 `tsBuildInfoFile`**
  - 明确指定构建信息文件位置，提高增量编译速度
  - 文件: `.tsbuildinfo`

#### NestJS 配置 (`backend/nest-cli.json`)
- **禁用 webpack**
  - 设置 `"webpack": false`，使用原生 TypeScript 编译器，构建更快
  - 明确指定 `tsConfigPath`

**影响**: 提高 TypeScript 编译速度，特别是增量构建

### 3. Next.js 配置优化

#### 图片配置简化 (`frontend/next.config.js`)
- **减少图片尺寸配置**
  - 移除 `3840` 设备尺寸（很少使用）
  - 移除未使用的远程图片源（`picsum.photos`、`images.unsplash.com`、`via.placeholder.com`）
  - 仅保留实际使用的本地和 Docker 容器图片源

#### Webpack 优化
- **简化 bundle splitting**
  - 移除不必要的 `ui` 和 `admin` cache groups
  - 添加 `reuseExistingChunk: true` 到所有 cache groups，减少重复打包
  - 移除 `concatenateModules`（Next.js 已默认优化）

- **简化路径别名**
  - 仅保留 `@` 别名，移除冗余的 `@/components`、`@/utils`、`@/hooks`
  - Next.js 的路径解析已足够智能

- **移除 `optimizeCss` 实验性功能**
  - 该功能可能影响构建稳定性，移除以加快构建

**影响**: 减少 webpack 配置复杂度，加快构建速度

### 4. Dockerfile 优化

#### 后端 Dockerfile (`backend/Dockerfile.prod`)
- **移除不必要的系统依赖**
  - 移除 `openssl-dev`、`python3`、`make`、`g++`
  - 这些依赖仅用于编译原生模块，但项目不需要
  - 保留 `openssl`（Prisma 需要）

- **优化 npm 安装参数**
  - 减少重试次数：`fetch-retries: 5 → 3`
  - 减少超时时间：`fetch-retry-maxtimeout: 120000 → 60000`，`fetch-timeout: 300000 → 120000`
  - 添加 `--prefer-offline`：优先使用缓存
  - 添加 `--no-audit`：跳过安全审计（构建时不需要）

- **优化 ts-node 安装**
  - 从全局安装改为本地安装（`--save-dev`）
  - 减少镜像大小

#### 前端 Dockerfile (`frontend/Dockerfile.prod`)
- **优化 npm 安装参数**
  - 与后端相同的优化：减少重试、超时时间，添加 `--prefer-offline` 和 `--no-audit`

**影响**: 
- 减少 Docker 镜像大小
- 加快依赖安装速度（特别是使用缓存时）
- 减少网络超时等待时间

## 预期效果

### 构建时间改进
- **依赖安装**: 减少 20-30%（移除未使用依赖 + npm 优化）
- **TypeScript 编译**: 提高 10-15%（增量编译优化）
- **Webpack 打包**: 提高 5-10%（配置简化）
- **Docker 构建**: 总体减少 15-25%（依赖 + 系统包优化）

### 镜像大小改进
- **后端镜像**: 减少约 50-100MB（移除编译工具）
- **前端镜像**: 减少约 10-20MB（优化依赖）

## 注意事项

1. **移除的依赖**: 如果将来需要使用 `rehype` 相关库，需要重新安装
2. **npm 审计**: 构建时跳过了安全审计，建议在 CI/CD 中单独运行 `npm audit`
3. **TypeScript 严格模式**: 后端仍保持较宽松的 TypeScript 配置，如需启用严格模式，可能会增加构建时间

## 后续建议

1. **定期审查依赖**: 使用 `npm-check` 或 `depcheck` 检查未使用的依赖
2. **启用构建缓存**: 在 CI/CD 中启用 Docker 层缓存和 npm 缓存
3. **并行构建**: 如果可能，并行构建前端和后端
4. **监控构建时间**: 跟踪构建时间变化，识别新的性能瓶颈

## 验证

运行以下命令验证优化效果：

```bash
# 后端构建
cd backend
time npm run build

# 前端构建
cd frontend
time npm run build

# Docker 构建（需要先清理缓存）
docker build -f backend/Dockerfile.prod -t backend-test ./backend
docker build -f frontend/Dockerfile.prod -t frontend-test ./frontend
```


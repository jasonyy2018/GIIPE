# 前后端诊断工具使用说明

本项目提供了多个诊断工具来检查前后端服务的运行状态。

## 使用方法

### 方法 1: Node.js 脚本（推荐，跨平台）

```bash
# 使用 npm 命令
npm run diagnose

# 或直接运行
node diagnose.js
```

### 方法 2: PowerShell 脚本（Windows）

```powershell
.\diagnose.ps1
```

### 方法 3: Bash 脚本（Linux/Mac）

```bash
# 首次使用需要添加执行权限（Linux/Mac）
chmod +x diagnose.sh

# 运行脚本
./diagnose.sh
```

## 诊断内容

诊断工具会检查以下内容：

### 1. 端口检查
- ✅ 前端服务 (端口 3000)
- ✅ 后端服务 (端口 3001)
- ✅ PostgreSQL 数据库 (端口 5432)
- ✅ Redis 缓存 (端口 6379)

### 2. Docker 容器检查（如果使用 Docker）
- ✅ conference_backend
- ✅ conference_frontend
- ✅ conference_postgres
- ✅ conference_redis

### 3. API 端点检查
- ✅ 后端健康检查: `http://localhost:3001/api/health`
- ✅ 前端首页: `http://localhost:3000`
- ✅ 后端 Events API: `http://localhost:3001/api/events`

### 4. 数据库连接检查
- ✅ 通过 API 检查数据库连接状态

### 5. 环境变量文件检查
- ✅ `backend/.env` - 检查必需的环境变量
- ✅ `frontend/.env.local` - 检查必需的环境变量

### 6. 环境信息
- ✅ Node.js 版本
- ✅ 操作系统平台

## 常见问题解决

### 后端服务未运行

```bash
cd backend
npm install
npm run start:dev
```

### 前端服务未运行

```bash
cd frontend
npm install
npm run dev
```

### 数据库未运行

**使用 Docker Compose:**
```bash
docker-compose up -d postgres redis
```

**或手动启动 PostgreSQL:**
```bash
# 根据你的系统配置启动 PostgreSQL
```

### API 不可访问

1. 检查后端服务是否正在运行
2. 检查端口 3001 是否被占用
3. 检查防火墙设置
4. 检查环境变量配置

### 环境变量缺失

1. 复制示例环境变量文件：
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. 编辑环境变量文件，填入正确的配置值

## 输出说明

- ✅ 绿色：检查通过
- ❌ 红色：检查失败，需要修复
- ⚠️ 黄色：警告信息
- ℹ️ 蓝色：信息提示

## 注意事项

1. 确保 Node.js 已安装（建议 v18+）
2. 确保所有依赖已安装（运行 `npm install`）
3. 如果使用 Docker，确保 Docker 已安装并运行
4. 某些检查可能需要管理员权限（端口检查）

## 快速诊断命令

```bash
# 一键诊断
npm run diagnose

# 或使用 PowerShell (Windows)
.\diagnose.ps1

# 或使用 Bash (Linux/Mac)
./diagnose.sh
```


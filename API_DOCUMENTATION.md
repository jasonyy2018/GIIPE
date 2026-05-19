
# API统一文档

## 概述
本文档描述了系统中所有API端点的统一规范和调用方式。

## 基础URL
- 开发环境: `http://localhost:3001`
- 生产环境: `https://your-domain.com`

## 认证
大部分API端点需要JWT认证，在请求头中包含：
```
Authorization: Bearer <your-jwt-token>
```

## API端点

### 认证相关 (`/api/auth`)
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册  
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新token
- `GET /api/auth/profile` - 获取用户资料

### 用户管理 (`/api/users`)
- `GET /api/users` - 获取用户列表 (需要管理员权限)
- `POST /api/users` - 创建用户 (需要管理员权限)
- `GET /api/users/profile` - 获取当前用户资料
- `GET /api/users/:id` - 获取指定用户信息
- `PATCH /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户

### 事件管理 (`/api/events`)
- `GET /api/events` - 获取事件列表
- `POST /api/events` - 创建事件 (需要编辑权限)
- `GET /api/events/:id` - 获取事件详情
- `PATCH /api/events/:id` - 更新事件
- `DELETE /api/events/:id` - 删除事件

### 新闻管理 (`/api/news`)
- `GET /api/news` - 获取新闻列表
- `POST /api/news` - 创建新闻 (需要编辑权限)
- `GET /api/news/:id` - 获取新闻详情
- `PATCH /api/news/:id` - 更新新闻
- `DELETE /api/news/:id` - 删除新闻

### 存储服务 (`/api/storage`)
- `POST /api/storage/upload` - 上传文件
- `GET /api/storage/info` - 获取存储配置信息
- `GET /api/uploads/:path` - 访问上传的文件 (公开访问)

### 管理员功能 (`/api/admin`)
- `GET /api/admin/settings` - 获取系统设置
- `POST /api/admin/settings` - 更新系统设置
- `GET /api/admin/dashboard` - 获取管理员仪表板数据

## 前端页面API调用规范

### Admin页面
- `/admin/users` → 使用 `/api/users`
- `/admin/events` → 使用 `/api/events`  
- `/admin/news` → 使用 `/api/news`
- `/admin/dashboard` → 使用 `/api/admin/*`

### 公共页面
- `/events` → 使用 `/api/events`
- `/news` → 使用 `/api/news`
- `/dashboard` → 使用 `/api/users/profile`

## 错误处理
所有API端点遵循统一的错误响应格式：
```json
{
  "statusCode": 400,
  "timestamp": "2025-11-03T10:00:00.000Z",
  "path": "/api/endpoint",
  "method": "GET",
  "error": "Bad Request",
  "message": "详细错误信息"
}
```

## 状态码
- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器错误

## 分页
支持分页的端点使用以下查询参数：
- `limit` - 每页数量 (默认: 20)
- `offset` - 偏移量 (默认: 0)
- `sortBy` - 排序字段
- `sortOrder` - 排序方向 (asc/desc)

响应格式：
```json
{
  "data": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

## 更新日志
- 2025-11-03: API统一规范制定
- 修复了admin页面API调用不一致问题
- 统一了前端API调用路径

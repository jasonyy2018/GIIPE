# 修复首页SSR卡住 - 关键问题发现

## 问题确认

用户反馈：
- ✅ SSR已经重构过了
- ❌ 但问题依旧（15分钟后首页打不开）
- ✅ 其他页面都正常

这说明问题**不是通用的SSR问题**，而是**首页特定的问题**。

## 关键问题发现

### 问题：AbortController没有被使用

在 `page.tsx` 中：
1. ✅ 创建了 `AbortController`
2. ✅ 设置了 `setTimeout` 来调用 `abortController.abort()`
3. ❌ **但是 `getHomepageData()` 函数没有接收或使用这个 abort signal！**

**结果**：
- 即使调用了 `abort()`，`getHomepageData()` 内部的请求也不会被取消
- `Promise.allSettled` 会等待所有请求完成，即使超时了也不会取消
- 导致SSR卡住，15分钟后累积到临界点

## 已应用的修复

### 修复1: 简化超时逻辑

**文件**: `frontend/src/app/page.tsx`

**改进**:
- 移除未使用的 `AbortController`（因为 `getHomepageData()` 没有使用它）
- 使用简单的 `Promise.race` 与超时 Promise
- 超时 Promise 直接 resolve 空数据，不等待
- 减少超时时间到 5 秒（从 6 秒）

**关键改进**:
```typescript
// 创建超时Promise，直接resolve空数据
const timeoutPromise = new Promise<{events: Event[], conferences: Event[]}>((resolve) => {
  setTimeout(() => {
    console.warn('[Homepage SSR] Timeout reached after 5s, rendering with empty data');
    resolve({ events: [], conferences: [] });
  }, SSR_TIMEOUT);
});

// Race between data fetch and timeout
// 如果超时，立即返回空数据，不等待
const homepageData = await Promise.race([
  getHomepageData(),
  timeoutPromise
]);
```

### 修复2: 统一API超时时间

**文件**: `frontend/src/lib/server-api.ts`

**改进**:
- 统一所有API请求超时为 4 秒
- 确保 `getHomepageData()` 总时间不超过 4 秒（因为两个请求并行）

## 为什么这个修复有效

1. **Promise.race 真正工作**
   - 超时 Promise 直接 resolve，不等待
   - 如果超时，立即返回空数据
   - 不会卡住

2. **API请求有自己的超时**
   - 每个API请求有 4 秒超时
   - `getHomepageData()` 总时间不超过 4 秒
   - 加上 5 秒的 SSR 超时，总共最多 5 秒

3. **不会累积**
   - 每次SSR最多5秒
   - 超时后立即返回，不会累积
   - 不会导致15分钟后卡住

## 应用修复

运行修复脚本：

```bash
bash 应用崩溃修复.sh
```

或者手动执行：

```bash
# 重新构建前端（包含SSR修复）
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# 重启前端容器
docker-compose -f docker-compose.prod.yml up -d frontend

# 等待启动
sleep 30

# 测试首页响应（应该在5秒内响应）
timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ | head -c 200
```

## 验证修复

修复后，首页应该：
1. 在 5 秒内响应（即使 API 慢）
2. 超时后立即渲染（使用空数据）
3. 不会累积卡住的请求
4. 15 分钟后仍然正常

测试：
```bash
# 测试首页响应时间
time docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ > /dev/null

# 应该小于10秒
```

## 关键改进总结

| 修复前 | 修复后 |
|--------|--------|
| AbortController创建但未使用 | 使用Promise.race，超时立即返回 |
| getHomepageData()可能永远等待 | getHomepageData()最多4秒 |
| SSR可能卡住 | SSR最多5秒 |
| 15分钟后累积卡住 | 不会累积 |


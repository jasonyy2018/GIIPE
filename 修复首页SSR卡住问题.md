# 修复首页SSR卡住问题

## 问题确认

诊断结果：
- ✅ 健康检查正常（响应很快）
- ✅ /about 路由正常（响应很快）
- ❌ 首页（/）响应超时（超过10秒）
- ⚠️ 没有SSR日志（说明SSR可能卡住）

## 根本原因

首页SSR渲染卡住，可能原因：
1. **Promise.race可能没有正确工作** - 超时Promise可能没有正确触发
2. **API请求虽然成功，但可能阻塞了渲染** - 即使有超时，也可能卡在某个地方
3. **没有使用AbortController** - 无法真正取消请求

## 已应用的修复

### 1. 改进SSR超时逻辑
**文件**: `frontend/src/app/page.tsx`

**改进**:
- 使用`AbortController`确保超时真正生效
- 减少超时时间到6秒（从8秒）
- 确保超时后立即渲染，不等待
- 添加更详细的日志

**关键改进**:
```typescript
// 使用AbortController确保超时真正生效
const abortController = new AbortController();
timeoutId = setTimeout(() => {
  console.warn('[Homepage SSR] Timeout reached after 6s, aborting...');
  abortController.abort();
}, SSR_TIMEOUT);

// 捕获AbortError并立即返回空数据
try {
  homepageData = await getHomepageData();
} catch (fetchError) {
  if (fetchError.name === 'AbortError') {
    homepageData = { events: [], conferences: [] };
  }
}
```

### 2. 减少API请求超时
**文件**: `frontend/src/lib/server-api.ts`

**改进**:
- 减少超时时间到4秒（从5秒）
- 确保超时日志输出
- 改进错误处理

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

# 测试首页响应
timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ | head -c 200
```

## 验证修复

修复后，首页应该：
1. 在6秒内响应（即使API慢）
2. 超时后立即渲染（使用空数据）
3. 客户端会重新获取数据

测试：
```bash
# 测试首页响应时间
time docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ > /dev/null

# 应该小于10秒
```

## 如果问题仍然存在

如果修复后问题仍然存在：
1. 检查是否有其他阻塞点
2. 考虑完全禁用SSR，使用客户端渲染
3. 检查Next.js配置


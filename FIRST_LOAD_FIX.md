# 首次加载图片和数据不显示问题修复

## 问题描述

网站首页第一次打开时，图片和数据总是不加载，需要刷新才能显示。

## 根本原因分析

1. **SSR 数据获取失败时客户端未正确回退**
   - 如果服务器端数据获取失败，返回空数组
   - 客户端组件可能没有正确检测到 SSR 失败并触发重新获取

2. **LazyLoadSection 在 eager 模式下未立即渲染**
   - 当 `eager={true}` 时，组件应该立即显示内容
   - 但某些情况下 Intersection Observer 可能延迟触发

3. **useEffect 依赖项问题**
   - 依赖项设置不当可能导致数据获取逻辑不执行
   - 如果 SSR 返回空数组，客户端可能不会触发获取

4. **图片懒加载优先级问题**
   - LazyImage 组件在 priority 模式下可能没有立即显示

## 修复措施

### 1. 修复 LazyLoadSection 的 eager 模式 ✅

**文件：** `frontend/src/components/performance/LazyLoadSection.tsx`

**修复：**
- 确保当 `eager={true}` 时，立即设置 `isVisible` 和 `hasLoaded` 为 `true`
- 在 useEffect 开始时就检查 eager 标志，而不是等到后续逻辑

```typescript
useEffect(() => {
  // 如果设置为立即加载，确保立即显示
  if (eager) {
    setIsVisible(true);
    setHasLoaded(true);
    onLoad?.();
    return;
  }
  // ... 其他逻辑
}, [rootMargin, eager, hasLoaded, onLoad]);
```

### 2. 改进 SSR 数据获取的错误处理 ✅

**文件：** `frontend/src/lib/server-api.ts`

**修复：**
- 使用 `Promise.allSettled` 替代 `Promise.all`，确保一个请求失败不会阻塞另一个
- 添加详细的错误日志
- 即使部分请求失败，也返回成功获取的数据

```typescript
const [eventsResult, conferencesResult] = await Promise.allSettled([
  getUpcomingEvents(6),
  getPastConferences(3),
]);

const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
const conferences = conferencesResult.status === 'fulfilled' ? conferencesResult.value : [];
```

### 3. 修复客户端数据获取逻辑 ✅

**文件：** `frontend/src/components/public/FeaturedContentClient.tsx`

**修复：**
- 分离数据初始化和获取逻辑
- 确保即使 SSR 数据为空，客户端也会尝试获取
- 添加开发环境日志以便调试

```typescript
// 初始化 state 时立即使用 SSR 数据
const [events, setEvents] = useState<Event[]>(initialEvents);
const [conferences, setConferences] = useState<Event[]>(initialConferences);

// 如果 SSR 数据不完整，立即触发客户端获取
useEffect(() => {
  const shouldFetch = initialEvents.length === 0 || initialConferences.length === 0;
  if (!shouldFetch) {
    // 有完整 SSR 数据，直接使用
    return;
  }
  // 否则触发客户端获取
  fetchData();
}, []);
```

### 4. 修复图片懒加载优先级 ✅

**文件：** `frontend/src/components/performance/LazyImage.tsx`

**修复：**
- 确保当 `priority={true}` 时，立即设置 `isVisible` 为 `true`
- 在 useEffect 开始时就检查 priority 标志

```typescript
useEffect(() => {
  // 如果设置了priority，立即显示
  if (priority) {
    setIsVisible(true);
    return;
  }
  // ... 其他逻辑
}, [priority, rootMargin, isVisible]);
```

### 5. 添加调试日志 ✅

**文件：** `frontend/src/app/page.tsx`, `frontend/src/components/public/FeaturedContentClient.tsx`

**修复：**
- 在开发环境下添加详细的日志
- 记录 SSR 数据加载状态
- 记录客户端获取决策

## 预期效果

修复后，首页首次加载应该：

1. **立即显示 SSR 数据**：如果服务器端成功获取数据，内容会立即显示
2. **自动回退到客户端获取**：如果 SSR 失败，客户端会自动获取数据
3. **图片立即加载**：首屏图片会立即加载，不需要等待 Intersection Observer
4. **更好的错误处理**：部分请求失败不会影响其他数据的显示

## 测试建议

1. **清除浏览器缓存后测试**
   - 打开开发者工具
   - 清除缓存和 Cookie
   - 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）

2. **检查控制台日志**
   - 查看是否有 `[Homepage SSR]` 日志
   - 查看是否有 `[FeaturedContentClient]` 日志
   - 检查是否有错误信息

3. **网络条件测试**
   - 在慢速网络下测试（Chrome DevTools > Network > Throttling）
   - 测试 SSR 失败的情况（可以临时断开后端服务）

4. **检查数据加载**
   - 打开 Network 面板
   - 查看 `/api/events` 请求是否成功
   - 检查响应数据是否正确

## 如果问题仍然存在

如果修复后问题仍然存在，请检查：

1. **后端服务是否正常运行**
   - 检查后端 API 是否可访问
   - 检查环境变量 `SERVER_API_URL` 是否正确配置

2. **浏览器控制台错误**
   - 查看是否有 JavaScript 错误
   - 查看是否有网络请求失败

3. **Next.js 构建问题**
   - 重新构建前端：`npm run build`
   - 清除 `.next` 目录后重新构建

4. **环境变量配置**
   - 确认 `SERVER_API_URL` 在生产环境正确设置
   - 确认 `NEXT_PUBLIC_API_URL` 在客户端正确设置


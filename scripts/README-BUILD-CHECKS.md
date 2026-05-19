# 构建前检测脚本说明

这些脚本模拟 Ubuntu 24 Docker 构建环境，帮助在本地发现构建问题。

## 推荐使用顺序

### 1. 快速语法检测（推荐）
```bash
python scripts/ultimate-build-check.py
```
- 快速扫描所有文件
- 检查编码问题、语法错误、JSX结构
- 不依赖 Node.js 环境

### 2. 完整构建检测（最准确）
```bash
# 在 frontend 目录下
cd frontend
npm install  # 如果还没安装依赖
python ../scripts/check-before-build.py
```
- 运行 TypeScript 编译器
- 运行 ESLint
- 运行实际的 Next.js 构建
- **最接近 Docker 构建环境**

### 3. Docker 构建模拟器
```bash
python scripts/docker-build-simulator.py
```
- 完全模拟 Docker 构建过程
- 运行所有检查

## 各脚本功能对比

| 脚本 | 速度 | 准确性 | 依赖 | 推荐场景 |
|------|------|--------|------|----------|
| `ultimate-build-check.py` | ⚡⚡⚡ 快 | ⭐⭐ 中等 | 无 | 快速检查 |
| `check-before-build.py` | ⚡⚡ 中等 | ⭐⭐⭐ 高 | Node.js | 提交前检查 |
| `docker-build-simulator.py` | ⚡ 慢 | ⭐⭐⭐ 最高 | Node.js | 最终验证 |

## 在 Windows 上使用

如果遇到路径或编码问题：

```powershell
# 设置 UTF-8 编码
$env:PYTHONIOENCODING="utf-8"
python scripts/ultimate-build-check.py
```

## 在 Ubuntu/Linux 上使用

```bash
# 直接运行
python3 scripts/check-before-build.py

# 或使用 Docker 模拟器
python3 scripts/docker-build-simulator.py
```

## 常见问题

### Q: TypeScript 编译器找不到？
A: 需要先安装依赖：`cd frontend && npm install`

### Q: ESLint 检查失败？
A: ESLint 警告不会阻止构建，但建议修复

### Q: Next.js 构建很慢？
A: 这是正常的，实际 Docker 构建也会这么慢。这是最准确的检测方法。

## 最佳实践

1. **开发时**：使用 `ultimate-build-check.py` 快速检查
2. **提交前**：使用 `check-before-build.py` 完整检查
3. **部署前**：使用 `docker-build-simulator.py` 最终验证


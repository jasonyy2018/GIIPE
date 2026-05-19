# 强制刷新登录页面指南

## 🔍 问题诊断

如果你仍然看到通用登录表单而不是GIIP品牌登录页面，请按以下步骤操作：

## 🛠️ 解决方案

### 方法1: 强制硬刷新
1. 在登录页面按 `Ctrl + F5` (Windows) 或 `Cmd + Shift + R` (Mac)
2. 或者按 `Ctrl + Shift + R` (Windows/Linux)
3. 这会强制重新下载所有资源，忽略缓存

### 方法2: 无痕浏览模式
1. **Chrome**: 按 `Ctrl + Shift + N`
2. **Firefox**: 按 `Ctrl + Shift + P`
3. **Edge**: 按 `Ctrl + Shift + N`
4. 在无痕窗口中访问: http://localhost:3000/login

### 方法3: 禁用浏览器扩展
1. 打开浏览器扩展管理页面
2. 暂时禁用所有扩展
3. 刷新登录页面
4. 如果问题解决，逐个启用扩展找出问题扩展

### 方法4: 尝试不同浏览器
- Chrome
- Firefox
- Edge
- Safari (如果在Mac上)

### 方法5: 检查开发者工具
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

## ✅ 正确的GIIP登录页面特征

你应该看到：
- 🎨 深蓝色顶部横幅，包含白色GIIP logo
- 📝 "Welcome Back" 大标题（白色文字）
- 💬 "Sign in to your GIIP account" 副标题
- 📧 带邮件图标的邮箱输入框
- 🔒 带锁图标的密码输入框（有显示/隐藏按钮）
- ☑️ "Remember me for 30 days" 复选框
- 🔵 蓝色 "Sign In" 按钮（带右箭头图标）
- 🔗 "Don't have an account? Create one" 链接
- 🦶 底部GIIP版权信息和链接

## ❌ 错误的通用登录表单特征

如果你看到以下内容，说明是缓存问题：
- ❌ 简单的白色背景
- ❌ "Sign in to your account" 标题
- ❌ 预填充的邮箱地址
- ❌ 简单的蓝色按钮，没有图标
- ❌ "Sign up here" 链接

## 🔧 技术验证

运行以下命令验证服务器返回正确内容：
\`\`\`bash
node test-login-page.js
\`\`\`

应该显示：
- ✅ All expected content found
- ✅ Custom GIIP login page is working correctly

## 📞 如果问题仍然存在

1. **重启Docker容器**:
   \`\`\`bash
   docker-compose restart frontend
   \`\`\`

2. **检查URL**: 确保访问的是 `http://localhost:3000/login`

3. **检查网络**: 确保没有代理或VPN干扰

4. **检查防火墙**: 确保端口3000没有被阻止

5. **重启浏览器**: 完全关闭浏览器后重新打开

## 🎯 预期结果

完成上述步骤后，你应该看到美观的GIIP品牌登录页面，而不是通用的登录表单。

如果仍有问题，可能需要检查是否有其他软件或扩展在修改网页内容。
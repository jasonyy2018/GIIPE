# 验证文件说明

## 腾讯验证文件放置位置

腾讯的验证文件（如域名验证、微信小程序验证等）应该放在此目录（`frontend/public/`）下。

### 放置位置
```
frontend/public/
├── MP_verify_xxxxx.txt          # 微信小程序验证文件
├── xxxxx.txt                     # 腾讯域名验证文件
└── ...                          # 其他验证文件
```

### 访问方式

文件放在 `frontend/public/` 目录后，可以通过以下URL直接访问：

- `https://giip.info/MP_verify_xxxxx.txt`
- `https://giip.info/xxxxx.txt`
- `https://www.giip.info/xxxxx.txt`

### 注意事项

1. **文件名必须完全匹配**：验证文件的名字必须与腾讯提供的文件名完全一致（包括大小写）
2. **文件内容不能修改**：验证文件的内容必须与腾讯提供的内容完全一致
3. **部署后生效**：文件放置后需要重新构建和部署前端才能生效

### 部署步骤

1. 将验证文件复制到 `frontend/public/` 目录
2. 重新构建前端：
   ```bash
   docker-compose -f docker-compose.prod.yml build frontend
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```
3. 验证文件是否可以访问：
   ```bash
   curl https://giip.info/文件名.txt
   ```

### 常见验证文件类型

- **微信小程序验证**：`MP_verify_xxxxx.txt`
- **腾讯域名验证**：通常是随机字符串的`.txt`文件
- **其他腾讯服务验证**：根据具体服务要求


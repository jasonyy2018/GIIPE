# 生产环境赞助商图片文件名（避免 & 和逗号）

经 Nginx 代理到 Next 时，URL 路径里的 **`&`** 会被当成查询串分隔符，导致图片路径被截断、404。

请在服务器 `frontend/public/images/sponsors/` 下使用下面**安全文件名**（或把原文件复制/重命名为同名）：

| 原文件名（易出问题） | 请改为 |
|---------------------|--------|
| `Penn Global Research & Engagement Grant Program.png` | `penn-global-research-engagement-grant-program.png` |
| `College of Business, Shanghai University of Finance and Economics.jpeg` | `college-business-shufe.jpeg` |
| `SHU-UTS SILC Business School, Shanghai University.png` | `shu-uts-silc-shanghai-university.png` |

```bash
cd /root/dockerdata/GIIPE/frontend/public/images/sponsors/
cp "Penn Global Research & Engagement Grant Program.png" penn-global-research-engagement-grant-program.png
cp "College of Business, Shanghai University of Finance and Economics.jpeg" college-business-shufe.jpeg
cp "SHU-UTS SILC Business School, Shanghai University.png" shu-uts-silc-shanghai-university.png
```

部署新前端代码后，页面会请求上述三个安全文件名。

# Nginx Proxy Manager (NPM) — GIIP 生产环境一键配置

## 502 急救（网站已挂，先做这几步）

**原因常见有两类**：

1. NPM 仍转发 **`http://公网IP:3000`**（宿主机 3000 只绑 `127.0.0.1` 时，从 NPM 容器连不上）→ **502**。  
2. NPM 界面已是 **`conference-frontend-prod:3000`**，但 **NPM 容器与前端容器不在同一个 Docker 网络**（例如 NPM 在 `172.18.x`，前端在 `172.20.x`）→ 容器名 **解析不到 / 路由不通** → **502**。  
   （你还可能出现 **`giipe_conference-network`** 与 **`giipe_conference_network`** 两个网段，栈被拆到 `172.19` / `172.20`，更易踩坑。）

控制台里 `favicon` 的 SSL 报错多为副现象，先按下面排查。

### 办法 A：一条命令把 NPM 拉进 GIIP 网络（最快）

在服务器上（GIIP 仓库目录，已 `git pull` 后）：

```bash
cd ~/dockerdata/GIIPE
chmod +x scripts/giip-npm-fix-502.sh
sudo bash scripts/giip-npm-fix-502.sh
```

然后去 **NPM 网页** → 对应 Proxy Host → **Details**。

**上游（Docker 内网）完整地址 = `http://conference-frontend-prod:3000`**（首选；NPM 里拆成两格填）：

| 项 | 值 |
|----|-----|
| Scheme | `http` |
| Forward Hostname / IP | **`conference-frontend-prod`**（首选；仅在 DNS 不通时再试 `frontend`） |
| Forward Port | **`3000`** |

保存后刷新 `https://www.giip.info`。

**手动等价命令**（脚本不好用时；**不要把字面量 `YOUR_NPM_CONTAINER` 粘贴进终端**，须换成真实容器名）：

```bash
# 0) 记 NPM 容器名（示例：1Panel-nginx-proxy-manager-zfxx）
NPM=$(docker ps --format '{{.Names}}' | grep -Ei 'nginx-proxy-manager|proxy-manager' | head -1)
echo "NPM=$NPM"

# 1) 前端所在网络（应有 giipe_conference_network 或类似）
docker inspect conference-frontend-prod --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# 2) NPM 所在网络（若与上面没有重名网络 = 互不可见 → 必 502）
docker inspect "$NPM" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# 3) 把 NPM 接入「前端所在」网络（名称以前端 inspect 为准，常见为 giipe_conference_network）
FRONT_NET=$(docker inspect conference-frontend-prod --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' | grep -E 'giipe_conference|conference' | head -1)
echo "接入选定网络: $FRONT_NET"
docker network connect "$FRONT_NET" "$NPM"

# 4) 从 NPM 内测上游（ jc21/npm 镜像常无 wget，优先用 curl 或临时 curl 容器）
docker exec "$NPM" sh -c 'curl -sS --max-time 5 http://conference-frontend-prod:3000/api/health' 2>/dev/null || \
docker run --rm --network giipe_conference_network curlimages/curl:8.5.0 -sS --max-time 5 http://conference-frontend-prod:3000/api/health
```

**看日志**（compose 里服务名是 `frontend`，不是容器名）：

```bash
cd ~/dockerdata/GIIPE
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=120 frontend
```

### 办法 B：临时恢复旧行为（不推荐，仅应急）

若必须立刻恢复且暂时不能改 NPM：把 `docker-compose.prod.yml` 里 `ports` 改回 **`"3000:3000"`** 并 `docker compose ... up -d`，公网会再次能扫到 3000。**应尽快改回 127.0.0.1 + 办法 A。**

### 更新 compose 后：固定网络名

本仓库已为 `conference-network` 设置 **`name: giipe_conference_network`**。拉代码后请在 GIIP 目录执行一次：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

NPM 的 `docker-compose` 里 **`external: true`** 可写 **`name: giipe_conference_network`**（与下面第二节一致）。

---

## FAQ：浏览器打开 `http://公网IP:3000` 显示 ERR_EMPTY_RESPONSE？

**正常。** 映射为 `127.0.0.1:3000:3000` 后，**公网不能再访问宿主机的 3000**。请用 **`https://www.giip.info`**；本机调试用 `curl http://127.0.0.1:3000` 或 SSH 端口转发。

---

## 是否与「关闭 3000 公网」有关？

**是的。** 仓库里已将前端端口改为 **`127.0.0.1:3000:3000`**，含义是：

- 只有**宿主机本机**能连 `http://127.0.0.1:3000`
- **公网 IP:3000**、以及从别的容器用 **宿主机 IP:3000** 访问，多数情况下会失败

若 NPM 里仍填写 **`http://<公网IP>:3000`** 或 **`http://<宿主机局域网IP>:3000`**（且未走 Docker 内网），就会出现 **502 Bad Gateway**。

**修复方向**：NPM **反代目标必须改为 Docker 内网里的前端容器**（下面整段照做即可）。

---

## 第一步：查出 GIIP 的 Docker 网络全名

在跑 GIIP 的服务器上执行：

```bash
docker network ls | grep -Ei 'conference|giipe_conference'
```

- **已拉最新 compose**：网络名应为 **`giipe_conference_network`**（固定名）。
- 若仍是旧栈，也可能是 `xxx_conference-network`；以 **`docker network ls`** 为准，或用 **502 急救办法 A** 自动从容器解析。

前端容器名（本仓库 compose）：**`conference-frontend-prod`**  
compose **服务名**（DNS 名）：**`frontend`** — 与 NPM **在同一网络**时，二者一般都可作为 Forward 主机名。

---

## 第二步：让 NPM 加入 GIIP 网络（复制到你的 NPM `docker-compose.yml`）

在 **Nginx Proxy Manager** 对应的服务（常见名为 `app`，以你实际为准）上增加 `networks`，并声明 **external** 网络：

```yaml
services:
  app:
    image: jc21/nginx-proxy-manager:latest
    # ... 你原有的 ports、volumes、environment 等保持不变 ...
    networks:
      - default
      - giip_conference

networks:
  giip_conference:
    external: true
    name: giipe_conference_network
```

（若你尚未更新 GIIP compose、网络名不同，仍把 `name:` 改成 `docker network ls` 里前端所在网络的**全称**。）

保存后执行：

```bash
cd /你的NPM目录
docker compose up -d
```

---

## 第三步：NPM 网页界面（Proxy Hosts → 你的 www.giip.info）

**一键核对**：对外域名走 HTTPS，**转发到内部** **`http://conference-frontend-prod:3000`**（= 主机名 `conference-frontend-prod` + 端口 `3000` + Scheme `http`）。

| 项 | 填写 |
|----|------|
| **Domain Names** | `www.giip.info`（另可添加 `giip.info` 等） |
| **Scheme** | `http` |
| **Forward Hostname / IP** | **`conference-frontend-prod`**（首选；备用 **`frontend`**） |
| **Forward Port** | **`3000`** |
| **Block Common Exploits** | 可按需开启（与下面 Advanced 不冲突即可） |
| **Websockets Support** | 若 Next / HMR 无特殊需求可关；有实时功能可开 |

**不要**再填：`127.0.0.1`、公网 IP、仅适合旧方式的 `host.docker.internal`（在仅绑定 loopback 时不可靠）。  
**不要**在 Hostname 里写 `conference-frontend-prod:3000`（带端口）— 端口单独填在 **Forward Port**。

---

## 第四步：SSL

在 NPM 里为该 Proxy Host 申请/续签 Let’s Encrypt（`SSL` 标签），保持 **Force SSL** 与惯例设置即可。

---

## 第五步：Advanced — 自定义 Nginx（整段复制粘贴）

在对应 Proxy Host → **Advanced** → **Custom Nginx Configuration**，粘贴下面**整块**（已合并 WAF；与「仅绑定 127.0.0.1:3000」无冲突）：

```nginx
# ---- GIIP: security headers (safe defaults) ----
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# ---- Drop scanners / secret probes ----
location ~* ^/(wp-admin|wp-login\.php|phpmyadmin|pma|cgi-bin|vendor/phpunit)\b { return 444; }
location ~* ^/(\.env|\.git|\.svn|\.hg|\.DS_Store)\b { return 444; }

# ---- POST to site root only (reduce exploit spray); /api/* unchanged ----
location = / {
  if ($request_method !~ ^(GET|HEAD|OPTIONS)$) { return 405; }
}

# ---- Block obvious command-injection (path + query) ----
set $giip_block 0;
if ($request_uri ~* "(base64(%20|\\+)*-d|chmod(%20|\\+)*\\+x|/bin/sh|sh(%20|\\+)+-c|%2Fbin%2Fsh|%2Fsh|%3B|%7C|\|\||&&|\$\(|`|stratum\\+tcp|crontab|systemctl|nohup)") {
  set $giip_block 1;
}
if ($giip_block = 1) { return 403; }

# ---- Optional rate limit (needs limit_req_zone in main nginx.conf — omit if未配置 zone) ----
# limit_req zone=giip_ratelimit burst=30 nodelay;
```

**说明：**

- 这些规则若命中，多为 **403 / 444 / 405**，不是 502。出现 **502** 时优先查 **Forward 主机是否已改为容器名 + NPM 是否加入 `conference-network`**。
- 若 NPM 全局已加过相同 `add_header`，可能重复响应头，一般无碍；若冲突可删掉重复项。

---

## 自检命令（修复 502 后建议跑一遍）

```bash
# 1) 宿主机上前端仍应可读（loopback 映射）
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/

# 2) 测前端（NPM 内常无 wget；用 curl 或临时容器）
NPM=$(docker ps --format '{{.Names}}' | grep -Ei 'nginx-proxy-manager|proxy-manager' | head -1)
docker exec "$NPM" sh -c 'curl -sS --max-time 5 http://conference-frontend-prod:3000/api/health' || \
docker run --rm --network giipe_conference_network curlimages/curl:8.5.0 -sS --max-time 5 http://conference-frontend-prod:3000/api/health
```

第二条成功且 NPM 配置正确后，`https://www.giip.info/about` 应不再 502。

---

## 第六步（推荐）：间歇性 `ECONNRESET` / 大量 API 报错时的「自动恢复」与配置

### 自动恢复机制说明（代码层，已内置）

- **浏览器 → 你的站点（NPM → Next）**：无内置「无限重试」；页面/客户端部分接口有**有限次重试**或降级（例如首页 SSR 失败时返回空数据，由客户端再拉）。
- **Next 服务端 → Backend（`http://backend:3001`）**：`/api/*` 路由里通过 **`backendProxyFetch`** 转发时：
  - **GET/HEAD**：对超时、连接被重置等会**自动重试**（默认最多约 **3 次** 请求，可调）。
  - **POST/PATCH/PUT/DELETE**：**不会在超时后重试**（避免重复提交）；仅在**明显是连接层失败**（如 `ECONNRESET`）时**最多再试 1 次**（可关闭）。

因此：**短抖动**往往可自动恢复；**Backend 长时间宕机、OOM、网络持续不通**不会靠前端「刷爆重试」解决，需看 Backend 日志与资源。

### 环境变量（写在 GIIP 的 `.env.production`，由 `frontend` 容器读取）

在 **`docker-compose.prod.yml`** 里，`frontend` 已使用 `env_file: .env.production`，且 **`SERVER_API_URL: http://backend:3001`** 在 compose 里写死（一般无需改）。  
下面变量可**追加到 `.env.production`**（或通过 compose 的 `environment` 注入，二选一即可，不要重复冲突）：

| 变量 | 推荐生产值 | 含义 |
|------|------------|------|
| `SERVER_API_TIMEOUT` | `8000`～`15000` | 单次转发 Backend 的超时（毫秒）。上传大文件或慢查询可适当加大。 |
| `SERVER_API_RETRIES` | `2` | **只影响 GET/HEAD** 的额外重试次数（总次数 ≈ `1 + RETRIES`）。 |
| `SERVER_API_WRITE_RETRIES` | `1` 或 `0` | **写请求**是否在连接被掐断时**再试 1 次**：`1`=默认（更抗抖），`0`=最保守（绝不重试写）。 |

### 具体操作步骤（服务器上执行）

1. **SSH 登录**到跑 GIIP 的机器，进入仓库目录（与文档前文一致，例如）：
   ```bash
   cd ~/dockerdata/GIIPE
   ```

2. **备份**当前环境文件：
   ```bash
   cp -a .env.production .env.production.bak.$(date +%Y%m%d%H%M)
   ```

3. **编辑** `.env.production`，在文件**末尾追加**（可按需调整数值）：
   ```bash
   # Next 服务端转发 Backend：超时与重试（抗 ECONNRESET 抖动）
   SERVER_API_TIMEOUT=12000
   SERVER_API_RETRIES=2
   SERVER_API_WRITE_RETRIES=1
   ```
   - 若你希望**写操作绝对不自动重试**：把最后一行改为 `SERVER_API_WRITE_RETRIES=0`。

4. **只重建并启动 frontend**（使新环境变量生效；Backend 已在跑时可不动）：
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate frontend
   ```

5. **验证**
   - 健康检查：
     ```bash
     curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health
     ```
   - 看前端日志是否还有成片的 `ECONNRESET`（允许偶发；持续则需查 Backend）：
     ```bash
     docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 frontend
     ```

6. **若仍频繁报错**，在**同一台机**上继续排查（不属于 NPM 界面配置，但和「大量错误」直接相关）：
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production ps
   docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 backend
   ```
   关注 Backend **重启、OOM、数据库连接错误**；有则先修 Backend/资源，而不是无限加大重试。

### NPM 侧（可选）：避免长请求被网关提前掐断

若出现 **504 / 上游超时**（常见于大文件上传、慢报表），可在对应 Proxy Host → **Advanced** 中**酌情**增加（与上文 WAF 块并存即可）：

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
```

这与前端的 `SERVER_API_TIMEOUT` 是两层：**NPM 超时**须 **≥** 前端对 Backend 的超时，否则仍可能先被 NPM 断开。

---

## 若你暂时必须让 NPM 用「宿主机 IP」（不推荐）

只能把 compose 里端口改回公网暴露（**不推荐**，会再次被扫描）。**推荐始终用本文 Docker 内网方式**，与 `127.0.0.1:3000` 绑定策略一致。

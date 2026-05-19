#!/usr/bin/env bash
# 502 急救：把 Nginx Proxy Manager 容器接入 GIIP 前端所在 Docker 网络（无需改 NPM 的 compose 文件也可执行）。
# 用法：在 Ubuntu 服务器上 chmod +x 后执行
#   sudo bash scripts/giip-npm-fix-502.sh
#
# 然后在 NPM 界面把 Forward Host 改为：conference-frontend-prod（或 frontend），Port 3000，Scheme http。

set -euo pipefail

FRONTEND="${FRONTEND_CONTAINER:-conference-frontend-prod}"

if ! docker inspect "$FRONTEND" >/dev/null 2>&1; then
  echo "ERROR: 找不到前端容器: $FRONTEND"
  echo "请确认 GIIP 已启动: docker ps | grep frontend"
  exit 1
fi

# 前端容器当前连接的、第一个非 bridge/host/none 的网络名（通常是 conference-network）
NET=""
while IFS= read -r line; do
  case "$line" in
    bridge|host|none) continue ;;
    *)
      NET="$line"
      break
      ;;
  esac
done < <(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$FRONTEND" | sed '/^$/d')

if [[ -z "${NET:-}" ]]; then
  echo "ERROR: 无法从前端容器解析 Docker 网络名"
  exit 1
fi

echo "前端容器: $FRONTEND"
echo "将使用的网络: $NET"

NPM_CANDIDATES=$(docker ps --format '{{.Names}}' | grep -Ei 'nginx-proxy-manager|proxy-manager|^npm' || true)
if [[ -z "${NPM_CANDIDATES}" ]]; then
  echo "ERROR: 找不到 NPM 容器，请手动: docker ps"
  exit 1
fi

echo "检测到 NPM 相关容器："
echo "$NPM_CANDIDATES"
NPM=$(echo "$NPM_CANDIDATES" | head -1)
echo "将接入网络的 NPM 容器: $NPM（若不对请编辑脚本或手动 docker network connect）"

if docker network inspect "$NET" >/dev/null 2>&1; then
  if docker network connect "$NET" "$NPM" 2>/dev/null; then
    echo "OK: 已将 $NPM 接入网络 $NET"
  else
    echo "提示: 可能已接入过或失败，检查: docker network inspect $NET | grep -A2 $NPM"
  fi
else
  echo "ERROR: 网络不存在: $NET"
  exit 1
fi

echo ""
echo "---- 请在 NPM 修改 Proxy Host ----"
echo "  Scheme: http"
echo "  Forward Hostname: conference-frontend-prod   （或 frontend）"
echo "  Forward Port: 3000"
echo ""
echo "---- 自检（应能拿到 health 响应）----"
echo "docker exec -it $NPM wget -qO- --timeout=5 http://conference-frontend-prod:3000/api/health || echo FAIL"

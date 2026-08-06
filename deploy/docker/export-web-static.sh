#!/usr/bin/env bash
# 构建前端静态产物到 ./web-dist（给公司网关挂载；不启动 Nginx 容器）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/web-dist}"

cd "$ROOT"
docker build -f web/Dockerfile --target static -t cdt-web-static:local .
cid="$(docker create cdt-web-static:local)"
rm -rf "$OUT"
docker cp "$cid:/app/dist" "$OUT"
docker rm "$cid"
echo "静态文件已导出：$OUT"
echo "网关请将站点根指到该目录，并把 /api/、/currencies/、/rates/、/openapi 反代到 backend。"

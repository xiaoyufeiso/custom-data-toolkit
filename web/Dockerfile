# tendata-customs-tools frontend
#
# 构建上下文须为仓库根目录（见 docker-compose.yml）。
#
# 目标阶段：
#   build / static — 仅静态产物（公司网关挂载）
#   runtime        — Nginx 托管静态 + 反代 API（Compose profile=web）
#
# 导出静态示例：
#   docker build -f web/Dockerfile --target static -t cdt-web-static .
#   docker create --name cdt-web-tmp cdt-web-static \
#     && docker cp cdt-web-tmp:/app/dist ./web-dist && docker rm cdt-web-tmp

FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV HUSKY=0 \
    CI=true

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# .npmrc 指向公司 npm 源（repo.tendata.net）；构建机须能访问该 registry
COPY web/package.json web/pnpm-lock.yaml web/.npmrc ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm build:pro

FROM build AS static

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

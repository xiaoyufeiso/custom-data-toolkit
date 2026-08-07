# tendata-customs-tools frontend
# 构建上下文：web/（见仓库根 docker-compose.yml）

ARG HARBOR_REGISTRY=harbor-dev.tendata.com.cn
ARG NPM_REGISTRY=https://repo.tendata.net/repository/npm-public/

# Stage 1: Node 基础（Harbor）
FROM ${HARBOR_REGISTRY}/basic/nodejs:20 AS base

USER root

ARG NPM_REGISTRY
RUN npm config set registry ${NPM_REGISTRY}

# 创建非 root 用户（UID/GID 1680），已存在则复用
RUN (getent group 1680 || groupadd -g 1680 tendata) && \
    (id -u 1680 > /dev/null 2>&1 || useradd -u 1680 -g 1680 -m -s /bin/bash tendata)

# Stage 2: 构建静态产物
FROM base AS builder

USER root
# 镜像默认 NODE_ENV=production 会跳过 devDependencies（构建需要 vite/tsc）；HUSKY=0 跳过 git 钩子
ENV NODE_ENV=development \
    HUSKY=0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:pro

# Stage 3: Nginx 运行（反代 API；目前用官方镜像，待公司 nginx 镜像）
FROM nginx:1.27-alpine AS runtime

COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

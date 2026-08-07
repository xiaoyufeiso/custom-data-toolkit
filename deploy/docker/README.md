# Docker 部署说明

面向运维 / 发布：构建与运行 `tendata-customs-tools`。  
变量语义清单见 `backend/.env.example`；总览见 `docs/operations.md`。

## 1. 交付物

| 产物 | 说明 |
|---|---|
| 后端镜像 | `backend/Dockerfile`（Harbor `python-devel` 构建 / `python-runtime` 运行） |
| 管理端静态（推荐） | `./deploy/docker/export-web-static.sh` → `web-dist/`，由公司网关托管 |
| 管理端容器（可选） | Compose `--profile web`：Nginx 托管静态并反代 API |

生产推荐：外部 MySQL / Redis + 后端镜像 + 网关静态；不必启用 Compose 内 `mysql` / `redis`。

## 2. 前置条件

- 构建机能拉取：
  - `${HARBOR_REGISTRY}/basic/python-devel:3.12`
  - `${HARBOR_REGISTRY}/basic/python-runtime:3.12`  
  默认 `HARBOR_REGISTRY=harbor-dev.tendata.com.cn`
- 构建管理端静态或 `web` 镜像时：
  - 能拉取 `${HARBOR_REGISTRY}/basic/nodejs:20`
  - 能访问公司 npm 源（`web/.npmrc` → `repo.tendata.net`；可用 `NPM_REGISTRY` build-arg 覆盖）
- 已准备 MySQL、Redis，并注入运行时环境变量（见 §4）
- 外部表 `currency` / `rate` 已按 `deploy/sql/schema.sql` 与 `docs/data-contract.md` 就绪

## 3. 构建后端镜像

```bash
docker build -t <registry>/tendata-customs-tools-backend:<tag> ./backend
```

可选 build-arg：`PYTHON_VERSION`、`HARBOR_REGISTRY`、`PIP_INDEX_URL`。

镜像约定：

- 运行用户 UID `1680`
- 监听 `8000`
- 工作目录 `/tendata`（含 `alembic.ini`、`migrations/`）
- 启动命令为 uvicorn；`python-runtime` 入口负责 OTEL 注入
- **进程启动时不执行数据库迁移**

## 4. 运行时配置

从 `deploy/docker/compose.env.example` 复制为环境配置（或由配置中心 / 编排注入同名变量）。勿将含真实密钥的文件提交仓库。

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | MySQL（必填） |
| `REDIS_URL` | Redis（必填） |
| `APP_ENV` | `production`（HTTPS）或 `development`（HTTP；影响 Session Cookie `Secure`） |
| `CORS_ALLOWED_ORIGINS` | 管理端前端 Origin |
| `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` | 空库首启管理员（生产须强密码） |
| `PUBLIC_API_AUTH_ENABLED` | 对外 globiz 是否强制 `X-API-Key` |
| `SESSION_*` | Session Cookie 名与 TTL |

完整列表以 `backend/.env.example` 为准。

## 5. 发布顺序

```text
1. 确认 MySQL / Redis 可达，注入环境变量
2. 执行迁移：alembic upgrade head（流水线或运维；见 §6）
3. 滚动发布后端容器 / 副本
4. 发布管理端静态至网关（或更新 web 镜像）
5. 探活与冒烟（见 §7）
```

Compose 示例（外部库已就绪时）：

```bash
cp deploy/docker/compose.env.example deploy/docker/compose.env
# 填入生产/UAT 连接与密钥后：
docker compose --env-file deploy/docker/compose.env up -d --build
```

可选 profile：`web`、`mysql`、`redis`、`local-deps`、`full`（见仓库根目录 `docker-compose.yml`）。启用 Compose 内数据库时，`DATABASE_URL` / `REDIS_URL` 主机名须为服务名 `mysql` / `redis`。

## 6. 数据库迁移

迁移在**发布流程中**执行，不由容器 ENTRYPOINT/CMD 自动触发。

在已注入 `DATABASE_URL` 的后端容器内：

```bash
alembic upgrade head
```

镜像内路径：`/tendata/alembic.ini`，`script_location=migrations`。

外部表结构变更须与数据方确认，并更新 `docs/data-contract.md`；应用迁移只管自有管理表。

## 7. 健康检查与验收

| 检查 | 地址 |
|---|---|
| 存活 | `GET /api/v1/health` |
| 就绪（含 DB） | `GET /api/v1/ready` |
| 对外汇率（示例） | `GET /rates/`（按 `PUBLIC_API_AUTH_ENABLED` 携带 API Key） |

管理端：登录后访问货币 / 汇率列表。

## 8. 管理端镜像与静态产物

`web/Dockerfile` 为多阶段：

- `base`：Harbor `nodejs:20`，创建 UID 1680 用户
- `builder`：按锁文件装依赖（pnpm `--frozen-lockfile`）→ `pnpm build:pro` → `dist/`
- `static`：仅供导出静态产物
- `runtime`：Nginx 托管 `dist/` 并反代 API（目前无公司 nginx 基础镜像，暂用官方 `nginx:1.27-alpine`；非 root 待公司镜像就绪后再对齐）

```bash
# 构建管理端容器（Compose profile=web / full 时自动执行）
docker compose --env-file deploy/docker/compose.env build web
```

导出静态产物给网关：

```bash
./deploy/docker/export-web-static.sh
# 产出 web-dist/
```

网关建议：

| 路径 | 目标 |
|---|---|
| 站点根 / SPA | `web-dist/`（fallback `index.html`） |
| `/api/` | backend:8000 |
| `/currencies/`、`/rates/`、`/openapi` | backend:8000 |

参考配置：`deploy/docker/nginx.conf`。  
若 globiz 的 `GET /` 与管理端首页冲突，公开 API 使用独立域名或直连后端。

## 9. 常用命令

```bash
docker compose --env-file deploy/docker/compose.env ps
docker compose --env-file deploy/docker/compose.env logs -f backend
docker compose --env-file deploy/docker/compose.env down
```

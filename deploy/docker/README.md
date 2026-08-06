# Docker 部署说明

给公司部署人员：用镜像/Compose 跑本项目。权威环境变量清单仍见 `backend/.env.example`；运维总述见 `docs/operations.md`。

## 组件一览

| 组件 | 默认 | 如何启用 |
|---|---|---|
| `backend` | **始终构建** | `docker compose up` |
| `web`（Nginx + 静态管理端） | 可选 | `--profile web` 或 `full` |
| `mysql`（空库 + `schema.sql`） | 可选 | `--profile mysql` / `local-deps` / `full` |
| `redis` | 可选 | `--profile redis` / `local-deps` / `full` |
| 仅静态 `dist`（给现有网关） | 可选 | `./deploy/docker/export-web-static.sh` |

**推荐生产：** 只起 `backend`（+ 可选不启 Compose 内 DB），MySQL/Redis 用公司已有实例；前端静态交给公司网关，或使用 `export-web-static.sh`。

**本地演示：** `--profile full`，并在 `compose.env` 里把 `DATABASE_URL`/`REDIS_URL` 改成服务名 `mysql` / `redis`。

## 前置条件

- 构建机可访问公司 npm：`web/.npmrc`（`repo.tendata.net`），否则 `web` 镜像/`export-web-static` 装依赖会 404
- MySQL / Redis：默认连外部；或用下文 profile 起空库
- 本地用 `http://` 访问时务必 `APP_ENV=development`。设为 `production` 时 Session Cookie 带 `Secure`，浏览器在明文 HTTP 下不保存，会出现「提示登录成功却仍停在登录页 / 要点两次」

## 快速开始

```bash
# 1. 环境文件
cp deploy/docker/compose.env.example deploy/docker/compose.env
# 编辑 compose.env：密码、DATABASE_URL、REDIS_URL、CORS、ADMIN_BOOTSTRAP_*

# 2a. 仅后端（连外部库）
docker compose --env-file deploy/docker/compose.env up -d --build

# 2b. 后端 + 自带 Nginx 管理端
docker compose --env-file deploy/docker/compose.env --profile web up -d --build

# 2c. 一键演示（web + 空 MySQL + Redis）
# 先把 compose.env 中 DATABASE_URL/REDIS_URL 改为：
#   DATABASE_URL=mysql+pymysql://customs_app:change-me@mysql:3306/customs_data_toolkit
#   REDIS_URL=redis://redis:6379/0
docker compose --env-file deploy/docker/compose.env --profile full up -d --build
```

- 管理端（profile web/full）：http://localhost:8080  
- 后端健康：http://localhost:8000/api/v1/health  
- 对外 globiz：http://localhost:8000/rates/ （或经 web 反代的同名路径）

## 可选：静态产物交给公司网关

```bash
chmod +x deploy/docker/export-web-static.sh
./deploy/docker/export-web-static.sh
# 产出目录 web-dist/
```

网关需配置（与 `deploy/docker/nginx.conf` 同思路）：

- 站点根 → `web-dist/`
- `/api/` → backend:8000
- `/currencies/`、`/rates/`、`/openapi` → backend:8000  
- 其余路径 SPA fallback → `index.html`  
- 注意：globiz 的 `GET /` 与管理端首页冲突时，公开根路径请直连 backend 或单独域名

## 环境变量

| 文件 | 用途 |
|---|---|
| `deploy/docker/compose.env.example` | Compose 模板（可提交） |
| `deploy/docker/compose.env` | 运行时（gitignore，勿提交） |
| `backend/.env.example` | 变量语义权威清单 |

启用 Compose 内 MySQL/Redis 时，必须把 URL 主机名改成 `mysql` / `redis`，不能用 `127.0.0.1`（那是容器自己）。

连宿主机库时可用 `host.docker.internal`（Docker Desktop；Linux 视版本而定，必要时加 `extra_hosts`）。

## 迁移

容器入口默认 `alembic upgrade head`（`RUN_MIGRATIONS=true`）。  
若由发布流水线迁库，设 `RUN_MIGRATIONS=false`。

空库首次还需外部表：`deploy/sql/schema.sql`（Compose `mysql` profile 会自动执行该文件）。

## 常用命令

```bash
docker compose --env-file deploy/docker/compose.env ps
docker compose --env-file deploy/docker/compose.env logs -f backend
docker compose --env-file deploy/docker/compose.env down
# 连同演示数据卷删除（慎用）：
docker compose --env-file deploy/docker/compose.env --profile full down -v
```

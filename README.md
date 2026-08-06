# Tendata Customs Tools

海关数据处理工具：管理端维护货币、汇率与海关字典，并对外提供 globiz 风格只读查询 API。

| 项 | 说明 |
|---|---|
| 产品名 | `tendata-customs-tools` |
| 后端包名 | `custom_data_toolkit` |
| 启动入口 | `uvicorn custom_data_toolkit.main:app` |

## 能力概览

- **管理端**（Session + CSRF）：货币、汇率、海关字典（类型 / 标准 / 缺失）、API Key、用户管理、操作审计
- **角色**：`admin` 全量；`viewer` 只读（含字典导出）
- **对外只读 API**（根路径，契约见 [`deploy/api/globiz-rates-api.md`](deploy/api/globiz-rates-api.md)）：`/currencies/`、`/rates/` 等；鉴权由 `PUBLIC_API_AUTH_ENABLED` 控制
- **字典同步**：MySQL 权威数据 + Redis 增量（`HSET` / `HDEL`）

## 技术栈

- 前端：React + TypeScript + Vite + pnpm（`web/`）
- 后端：Python 3.12+ / FastAPI / SQLModel / uv（`backend/`）
- 数据：MySQL 8（复用 `currency` / `rate`）；Redis（海关字典）

## 仓库结构

```text
├─ web/          # 管理端前端
├─ backend/      # FastAPI（src/custom_data_toolkit）
├─ docs/         # 产品 / 架构 / 开发 / 运维
├─ openspec/     # 行为 Spec 与变更
├─ deploy/       # schema、对外 API 契约、环境与 Docker 说明
├─ scripts/      # 全栈联调脚本
└─ README.md
```

## 本地快速开始

前置：可用的 MySQL 与 Redis。详细步骤见 [`docs/development.md`](docs/development.md)。

```bash
# 后端
cd backend
cp -n .env.example .env   # 配置 DATABASE_URL / REDIS_URL 等
uv sync --group dev --group test
uv run alembic upgrade head
uv run uvicorn custom_data_toolkit.main:app --reload --host 127.0.0.1 --port 8000

# 前端（另开终端）
cd web
pnpm install
pnpm start:uat
```

- 管理端：http://127.0.0.1:5173 （Vite 代理后端）
- 健康检查：http://127.0.0.1:8000/api/v1/health
- 对外 API 示例：http://127.0.0.1:8000/rates/

环境变量模板见 [`backend/.env.example`](backend/.env.example)；部署说明见 [`deploy/env/README.md`](deploy/env/README.md)、[`docs/operations.md`](docs/operations.md)。

## Docker 部署（可选）

详见 [`deploy/docker/README.md`](deploy/docker/README.md)。

```bash
cp deploy/docker/compose.env.example deploy/docker/compose.env
# 编辑 DATABASE_URL / REDIS_URL 等
docker compose --env-file deploy/docker/compose.env up -d --build
# 可选：--profile web | mysql | redis | local-deps | full
```

## 文档

| 文档 | 说明 |
|---|---|
| [`docs/product.md`](docs/product.md) | 产品边界 |
| [`docs/architecture.md`](docs/architecture.md) | 架构 |
| [`docs/development.md`](docs/development.md) | 本地开发与测试 |
| [`docs/operations.md`](docs/operations.md) | 部署与环境变量 |
| [`docs/data-contract.md`](docs/data-contract.md) | 外部表 `currency` / `rate` |
| [`docs/api.md`](docs/api.md) | API 摘要 |
| [`deploy/api/globiz-rates-api.md`](deploy/api/globiz-rates-api.md) | 对外公开 API 契约 |
| [`docs/README.md`](docs/README.md) | 完整文档索引 |

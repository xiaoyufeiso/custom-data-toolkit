# 环境配置约定（部署）

## 结构

```text
backend/.env.example     # 仓库模板：变量名 + 占位值 + 注释（唯一权威变量清单）
backend/.env             # 本地/服务器运行时，gitignore，禁止提交
deploy/env/README.md     # 本说明：如何给他人部署
```

不在仓库中提交带真实密码的 `.env`、`.env.uat`、`.env.pro`。

## 他人部署最小步骤

1. 克隆仓库（目录名可为 `customs-tools` / `tendata-customs-tools`，与 Python 包名无关）
2. `cd backend && cp .env.example .env`
3. 编辑 `.env`：填目标环境的 `DATABASE_URL`、`REDIS_URL`、`CORS_ALLOWED_ORIGINS`、`ADMIN_BOOTSTRAP_*`、`APP_ENV=production` 等
4. `uv sync --group dev --group test`（或生产依赖策略）
5. `uv run alembic upgrade head`
6. 启动 uvicorn：`uv run uvicorn custom_data_toolkit.main:app --host 0.0.0.0 --port 8000`
7. 前端按 `web/` 文档配置代理到后端

**或使用 Docker：** 见 [`deploy/docker/README.md`](../docker/README.md)（Compose 默认仅 backend；`web` / `mysql` / `redis` 均为 profile 可选项）。

## 分层原则（以后遵循）

| 层 | 放什么 | 是否进 Git |
|---|---|---|
| 代码与契约 | 源码、`docs/`、`openspec/` | 是 |
| 配置模板 | `.env.example`（仅占位） | 是 |
| 运行时密钥 | `.env` / K8s Secret / CI Variables | **否** |
| 环境差异 | 主机、库名、CORS、是否强制 API Key | 运行时覆盖，不写死在代码 |

Python **import 路径**保持 `custom_data_toolkit`；产品/仓库名使用 `tendata-customs-tools`（或公司仓名 `customs-tools`）。二者故意分离，避免大规模改包名。

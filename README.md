# Tendata Customs Tools

海关数据处理工具：管理端维护货币 / 汇率 / 海关字典，对外提供 globiz 风格只读查询 API。

| 名称 | 值 |
|---|---|
| 产品名 | `tendata-customs-tools` |
| 公司 Git 仓 | `customs-tools`（`git.tendata.com.cn/xiaoyufei/customs-tools`） |
| Python 包（勿改） | `custom_data_toolkit` |
| 启动入口 | `uvicorn custom_data_toolkit.main:app` |

前端展示文案仍可为「海关数据处理工具」；与仓库产品名可不同。

## 能力概览

- **管理端**（Session + CSRF）：货币、汇率、海关字典（类型 / 标准 / 缺失）、API Key、用户管理、操作审计  
- **角色**：`admin` 全量；`viewer` 只读（含字典导出）  
- **对外只读**（根路径，契约见 [`deploy/api/globiz-rates-api.md`](deploy/api/globiz-rates-api.md)）：`/currencies/`、`/rates/` 等；鉴权由 `PUBLIC_API_AUTH_ENABLED` 控制  
- **字典同步**：MySQL 权威 + Redis 增量（`HSET` / `HDEL`）

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
├─ deploy/       # schema.sql、对外 API 文档、env 说明
├─ scripts/      # 全栈联调脚本（若可用）
├─ AGENTS.md     # AI 协作约束
└─ README.md
```

## 本地快速开始

前置：MySQL、Redis（本地可用 `docker start cdt-redis`，见 [`docs/development.md`](docs/development.md)）。

```bash
# 后端
cd backend
cp -n .env.example .env          # 再编辑为本机 DATABASE_URL / REDIS_URL 等（勿提交 .env）
uv sync --group dev --group test
uv run alembic upgrade head
uv run uvicorn custom_data_toolkit.main:app --reload --host 127.0.0.1 --port 8000

# 前端（另开终端）
cd web
pnpm install
pnpm start:uat
```

- 管理端默认：http://127.0.0.1:5173 （经 Vite 代理访问后端）  
- 健康检查：http://127.0.0.1:8000/api/v1/health  
- 对外 API 示例：http://127.0.0.1:8000/rates/ （需按环境配置 API Key）

配置约定：只提交 [`backend/.env.example`](backend/.env.example)；真实密钥放运行时 `.env` 或部署环境。详见 [`deploy/env/README.md`](deploy/env/README.md)、[`docs/operations.md`](docs/operations.md)。

## 文档索引

| 文档 | 说明 |
|---|---|
| [`docs/README.md`](docs/README.md) | 文档索引与更新矩阵 |
| [`docs/product.md`](docs/product.md) | 产品边界 |
| [`docs/architecture.md`](docs/architecture.md) | 架构 |
| [`docs/development.md`](docs/development.md) | 本地开发、Redis、测试 |
| [`docs/operations.md`](docs/operations.md) | 部署与环境变量 |
| [`docs/data-contract.md`](docs/data-contract.md) | 外部表 `currency` / `rate` |
| [`docs/api.md`](docs/api.md) | API 摘要（管理端 + 对外） |
| [`deploy/api/globiz-rates-api.md`](deploy/api/globiz-rates-api.md) | 对外公开 API 权威契约 |
| [`AGENTS.md`](AGENTS.md) | AI / 切片工作流 |

## Git Remote（双远程示例）

```text
origin   → GitHub（个人备份，可选）
tendata  → https://git.tendata.com.cn/xiaoyufei/customs-tools.git   # 公司仓
```

公司仓推荐 **HTTPS + Personal Access Token**（SSH 需管理员确认公钥生效后再用）：

```bash
git remote add tendata https://git.tendata.com.cn/xiaoyufei/customs-tools.git
git push -u tendata main
# Username: GitLab 用户名
# Password: Personal Access Token（write_repository）
```

## 当前状态

管理端与对外 globiz API、用户 / viewer / 审计、Session 守卫已落地并归档。进度见 [`docs/progress.md`](docs/progress.md)。

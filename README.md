# Tendata Customs Tools（tendata-customs-tools）

海关数据处理辅助工具后台管理系统。MVP：货币/汇率管理 + 对外汇率查询 API。海关字典见 `openspec/specs/customs-dict/spec.md`。

> 产品/仓库名：`tendata-customs-tools`（公司仓可为 `customs-tools`）  
> Python 包路径（勿随意改）：`custom_data_toolkit` — uvicorn：`custom_data_toolkit.main:app`

## 技术栈

- 前端：React + TypeScript + Vite（`web/`）
- 后端：Python FastAPI（`backend/`）
- 数据库：MySQL 8（本地自建；见 `docs/development.md` / `docs/operations.md`）

## 工程结构

```text
tendata-customs-tools/   # 或克隆目录 customs-tools；与 Python 包名无关
├─ web/                 # Tendata React 前端
├─ backend/             # FastAPI（包目录 src/custom_data_toolkit）
├─ docs/                # 稳定项目真相（见 docs/README.md）
├─ openspec/            # 行为变更与领域 Spec
├─ deploy/              # 部署相关（sql、对外 API 文档、env 说明）
├─ scripts/             # 全栈联调脚本
├─ profile.json         # scaffold-kit 生成配置
├─ AGENTS.md
└─ README.md
```

## 文档

索引与**阶段更新矩阵**：[`docs/README.md`](docs/README.md)。  
环境变量与部署约定：[`docs/operations.md`](docs/operations.md)、[`deploy/env/README.md`](deploy/env/README.md)。

| 权威文档 | 用途 |
|---|---|
| `docs/product.md` | 产品边界 |
| `docs/architecture.md` | 架构 |
| `docs/development.md` | 本地开发与测试 |
| `docs/operations.md` | 运维交付 |
| `docs/data-contract.md` | 外部表语义 |
| `AGENTS.md` | AI 约束 |

## 推荐工作区（WSL）

当前开发机路径示例（目录名可与产品名不同）：

```text
/home/fei/custom-data-toolkit
```

Agent / CLI 请在此目录打开；勿长期依赖 `/mnt/d/实习/...`。

## 本地启动

1. MySQL 可达；导入 `deploy/sql/schema.sql`（见 `docs/development.md`）
2. 启动 Redis：`docker start cdt-redis`（首次创建命令见 `docs/development.md` §2.1）
3. `cd backend && cp -n .env.example .env` — **编辑 `.env` 为本机值**（勿提交）
4. `cd backend && uv sync --group dev --group test`
5. `cd backend && uv run alembic upgrade head`
6. `cd web && pnpm install`
7. 分别启动 backend / web，或 `node scripts/tendata-fullstack.mjs dev`（若脚本可用）

## 当前阶段

```text
文档/骨架 ✓ → 认证 ✓ → 货币 ✓ → 汇率 ✓ → API Key/公开查询 ✓
→ 进行中：平台能力（用户/viewer/审计/globiz）与发布整理
```

进度见 `docs/progress.md`。

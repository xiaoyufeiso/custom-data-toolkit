# Custom Data Toolkit

海关数据处理辅助工具后台管理系统。MVP：货币/汇率管理 + 对外汇率查询 API。海关字典见 `openspec/specs/customs-dict/spec.md`。

## 技术栈

- 前端：React + TypeScript + Vite（`web/`）
- 后端：Python FastAPI（`backend/`）
- 数据库：MySQL 8（本地自建；见 `docs/development.md` / `docs/operations.md`）

## 工程结构

```text
custom-data-toolkit/
├─ web/                 # Tendata React 前端
├─ backend/             # Tendata Python FastAPI（已对齐 MySQL）
├─ docs/                # 稳定项目真相（见 docs/README.md）
├─ openspec/            # 行为变更与领域 Spec
├─ scripts/             # 全栈联调脚本
├─ profile.json         # scaffold-kit 生成配置
├─ AGENTS.md
└─ README.md
```

## 文档

索引与**阶段更新矩阵**：[`docs/README.md`](docs/README.md)。

| 权威文档 | 用途 |
|---|---|
| `docs/product.md` | 产品边界 |
| `docs/architecture.md` | 架构 |
| `docs/development.md` | 本地开发与测试 |
| `docs/operations.md` | 运维交付 |
| `docs/data-contract.md` | 外部表语义 |
| `AGENTS.md` | AI 约束 |

## 推荐工作区（WSL）

```text
/home/fei/custom-data-toolkit
```

Agent / CLI 请在此目录打开；勿长期依赖 `/mnt/d/实习/...`。

## 本地启动

1. MySQL 可达；导入 `deploy/sql/schema.sql`（见 `docs/development.md`）
2. `cd backend && cp -n .env.example .env && uv sync --group dev --group test`
3. `cd backend && uv run alembic upgrade head`
4. `cd web && pnpm install`
5. 分别启动前后端，或 `node scripts/tendata-fullstack.mjs dev`（若脚本可用）

## 当前阶段

```text
文档/骨架 ✓ → 认证 ✓ → 货币 ✓ → 汇率 ✓ → API Key/公开查询 ✓
→ 进行中：M6 发布整理（验收、OpenSpec 归档、骨架裁剪）
```

进度见 `docs/progress.md`。

# Custom Data Toolkit

海关数据处理辅助工具后台管理系统。MVP：货币/汇率管理 + 对外汇率查询 API。海关字典本轮仅文档占位。

## 技术栈

- 前端：React + TypeScript + Vite（`web/`）
- 后端：Python FastAPI（`backend/`）
- 数据库：MySQL 8（本地自建；见 `docs/deployment.md`）

## 工程结构

```text
custom-data-toolkit/
├─ web/                 # Tendata React 前端骨架
├─ backend/             # Tendata Python FastAPI 骨架（已对齐 MySQL）
├─ docs/                # 产品/工程文档
├─ openspec/            # SDD / Spec
├─ scripts/             # 全栈联调脚本
├─ profile.json         # scaffold-kit 生成配置
├─ AGENTS.md
└─ README.md
```

骨架由 `scaffold-kit` 生成并 merge；已去 Hero 示例与 Dockerfile，属轻量壳，不含业务功能。

## 文档索引

见 `docs/` 与 `openspec/`；Agent 入口：`AGENTS.md`。

## 本地启动（骨架就绪后）

1. 启动 MySQL 8，建库并执行 `docs/database.md` 中 `currency`/`rate` DDL  
2. `cd backend && cp .env.example .env && uv sync --group dev --group test`  
3. `cd web && pnpm install`  
4. 联调：`node scripts/tendata-fullstack.mjs dev`（或分别启动前后端）

## 当前阶段

```text
S0 文档 ✓ → S3 骨架 ✓ → S4 纵向切片（认证 → 货币 → 汇率 → API Key）
```

按 `openspec/changes/add-currency-rate-mgmt/tasks.md` 推进。

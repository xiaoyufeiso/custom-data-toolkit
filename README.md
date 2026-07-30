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

## 推荐工作区（WSL）

```text
/home/fei/custom-data-toolkit
```

Agent / CLI 请在此目录打开；勿长期依赖 `/mnt/d/实习/...`（跨文件系统慢且易热更新异常）。

## 本地启动

1. MySQL 可达（见 `docs/deployment.md`）；业务表可用 `deploy/sql/schema.sql` + 种子数据  
2. `cd backend && cp -n .env.example .env && uv sync --group dev --group test`  
3. `cd web && pnpm install`  
4. 分别启动前后端，或 `node scripts/tendata-fullstack.mjs dev`（若脚本可用）

## 当前阶段

```text
文档/骨架 ✓ → 认证 ✓ → 货币 ✓ → 汇率 ✓ → API Key/公开查询 ✓
→ 待办：按 fullstack-ai-development-workflow 收敛文档、裁剪骨架、归档 OpenSpec
```

进度见 `docs/progress.md`；Agent 约束见 `AGENTS.md`。

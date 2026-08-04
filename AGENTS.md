# Custom Data Toolkit — AI Coding Instructions

## Workspace

- Canonical checkout (WSL): `/home/fei/custom-data-toolkit`
- Windows mirror (legacy): `D:\实习\custom-data-toolkit` — prefer WSL path for Agent / CLI
- Process skill (outside repo): `D:\实习\fullstack-ai-development-workflow\SKILL.md`  
  （或本机 skill 目录中的 `fullstack-ai-development-workflow`）

## Read Before Editing

按优先级读取：

1. `fullstack-ai-development-workflow` skill（流程与分层门禁）
2. `README.md` — 仓库入口与启动
3. `docs/README.md` — 文档索引与更新矩阵
4. `docs/product.md` — 稳定产品边界
5. `docs/architecture.md` — 技术结构
6. `docs/data-contract.md` — 外部表 `currency`/`rate` 语义
7. `docs/api.md` — API 契约摘要（过渡；目标 OpenAPI）
8. 当前 OpenSpec change 或归档后的 `openspec/specs/<domain>/`
9. `docs/development.md`、`docs/operations.md` — 本地开发与运维
10. `openspec/specs/customs-dict/spec.md`（字典领域权威；已归档 import/types）
11. 领域权威：`openspec/specs/{auth,currency,rate}/`；活跃 change 见 `openspec/specs/README.md`

冲突时：可执行代码与迁移优先于过时 Markdown；项目内权威文档优先于外部通用习惯。  
同一事实只在一个权威层维护（公司标准 / 稳定项目真相 / OpenSpec / 可执行产物）。

## Mandatory Workflow

每个功能切片**必须**按 skill 门禁推进，**禁止跳步、禁止未确认就写业务代码**：

```text
plan →（用户确认）→ implement → verify → test → review → document → commit
```

对齐 skill 生命周期时，一次只做一个可独立评审的纵向切片。

### Plan（必须先完成并等人确认）

- 读相关 Product / Architecture / Data-contract / API / 当前 OpenSpec change。
- 列出：影响的表、接口、页面、测试、正常/异常/边界场景。
- 明确本切片 In/Out of Scope。
- **输出简短 Plan；未获确认不得 Implement。**

### Implement

- 一次只做一个可验收纵向切片。
- 后端：model → repository → service → router。
- 前端：type → service → view → page。

### Verify / Test / Review / Document

- 对照 OpenSpec Scenario 与 `development.md` 清单逐条核对；实际跑相关测试。
- 标出 BLOCKER / MAJOR / MINOR；有 BLOCKER 不得宣称完成。
- 行为变化写回权威层（见 `docs/README.md` 更新矩阵）；更新 change `tasks.md` 与可选 `docs/progress.md`。
- 提交信息：`类型(范围): 中文简述`（如 `feat(rate): 实现汇率列表筛选`）。

## Stack

- Frontend: React + TypeScript + Vite + pnpm；tendata-ui 优先
- Backend: Python 3.12+、FastAPI、SQLModel、uv、Ruff、Pytest、Alembic
- DB: **MySQL**；复用 `currency` / `rate`
- Admin auth: Session + CSRF
- Public auth: `X-API-Key`

## Backend Rules

- 依赖方向：`routers → services → repositories → models`
- Router 不直接访问 DB；Service 不写裸查询
- 密码与 API Key 只存哈希；日志禁止打印明文密钥
- JSON camelCase / Python snake_case

## Frontend Rules

- `pages` 只做路由壳；业务在 `views/<domain>`
- 组件禁止散写 Axios；统一请求层
- API Key 明文仅创建弹窗展示，禁止持久化到 localStorage

## Scope Guard

MUST NOT：Casdoor/Casbin、自助注册、爬虫逻辑、无鉴权对外写接口。  
海关字典：仅允许在已确认 Plan 的相关 change 切片内实现；Redis **仅增量同步**，禁止擅自做整表覆盖；禁止实现已搁置的处理历史/操作日志。

## Known follow-ups（交接）

- 字典搁置：整表覆盖全量、操作日志、处理历史
- （可选）`standardize-admin-ui-components` 登录页 / i18n / 视觉收口后归档
- （可选）API 契约迁 OpenAPI 后降级 `docs/api.md`
- **前端 API Key 管理 UI 已搁置并移除**（2026-07-31）；恢复时需重建路由/页面/服务，并继续筛选/批量删除与 BizTable 对齐（见 archive `add-page-bulk-delete` §4）

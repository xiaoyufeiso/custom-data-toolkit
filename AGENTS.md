# Custom Data Toolkit — AI Coding Instructions

## Read Before Editing

按优先级读取：

1. `docs/requirements.md` — 产品范围
2. `docs/spec.md` — 业务行为
3. `docs/database.md` — 数据模型
4. `docs/api.md` — 前后端契约
5. `docs/architecture.md` — 技术结构
6. `docs/testing.md` — 验收
7. `docs/ai-coding.md` — 工作流
8. 当前变更：`openspec/changes/add-currency-rate-mgmt/`（若在实现该变更）
9. `openspec/specs/customs-dict/spec.md` — 字典仅占位，禁止实现

冲突时：项目内文档优先；不得按外部通用习惯改已确认行为。

## Mandatory Workflow

每个功能切片**必须**按下列顺序执行，**禁止跳步、禁止未门禁确认就写业务代码**：

```text
plan → implement → verify → test → review → document
```

### Plan（必须先完成并等人确认）

- 读取相关 Requirement、Spec、API、Database、当前 OpenSpec change / Delta。
- 列出：影响的表、接口、页面、测试、正常/异常/边界场景。
- 明确本切片 In/Out of Scope。
- **输出简短 Plan 给用户；未获确认不得进入 Implement。**

### Implement

- 一次只做一个可验收纵向切片。
- 先对齐契约与类型，再写实现（后端 model→repo→service→router；前端 type→service→hook→view→page）。

### Verify

- 对照本切片 Spec 的 Scenario 与 Verification Checklist **逐条核对**（写明通过/未通过）。

### Test

- 实际跑相关测试；不以“代码看起来对”代替。
- 环境未就绪时：说明哪些测试 skip、阻塞项是什么，不得假装已验收。

### Review

- 标出 BLOCKER / MAJOR / MINOR；Session、CSRF、密码、迁移等高风险点必须点名。
- 有 BLOCKER 不得宣称切片完成。

### Document

- 行为/API/表/决策变化同步回写 docs 与 openspec；更新 `progress.md` 与 change `tasks.md` 勾选。

OpenSpec 变更：实现前须有 proposal/design/tasks/delta；完成后按规范归档合并，不得只改代码不改 Spec。

## Stack

- Frontend: React + TypeScript + Vite + pnpm；SWR；tendata-ui 优先
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

MVP MUST NOT：海关字典、Casdoor/Casbin、自助注册、爬虫逻辑、无鉴权对外写接口。

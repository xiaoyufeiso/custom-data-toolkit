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
3. `docs/architecture.md` — 技术结构
4. `docs/requirements.md` — 产品范围（稳定真相收敛前暂用；目标为 `docs/product.md`）
5. `docs/database.md` — 数据模型（外部表语义；目标补 `docs/data-contract.md`）
6. `docs/api.md` — 契约摘要（目标迁 OpenAPI）
7. `docs/spec.md` / 当前 OpenSpec change — 行为与变更 delta
8. `docs/testing.md`、`docs/deployment.md` — 验收与本地运行
9. `openspec/specs/customs-dict/spec.md` — 字典仅占位，**禁止实现**
10. 当前变更：`openspec/changes/add-currency-rate-mgmt/`（未归档前）

冲突时：可执行代码与迁移优先于过时 Markdown；项目内文档优先于外部通用习惯。  
同一事实只在一个权威层维护（skill：公司标准 / 稳定项目真相 / OpenSpec / 可执行产物）。

## Mandatory Workflow

每个功能切片**必须**按 skill 门禁推进，**禁止跳步、禁止未确认就写业务代码**：

```text
plan →（用户确认）→ implement → verify → test → review → document → commit
```

对齐 skill 生命周期时，一次只做一个可独立评审的纵向切片。

### Plan（必须先完成并等人确认）

- 读相关 Requirement / Spec / API / Database / 当前 OpenSpec change。
- 列出：影响的表、接口、页面、测试、正常/异常/边界场景。
- 明确本切片 In/Out of Scope。
- **输出简短 Plan；未获确认不得 Implement。**

### Implement

- 一次只做一个可验收纵向切片。
- 后端：model → repository → service → router。
- 前端：type → service → view → page。

### Verify / Test / Review / Document

- 对照 Spec Scenario 逐条核对；实际跑相关测试。
- 标出 BLOCKER / MAJOR / MINOR；有 BLOCKER 不得宣称完成。
- 行为变化写回权威文档层；更新 `docs/progress.md` 与 change `tasks.md`。
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

MVP MUST NOT：海关字典、Casdoor/Casbin、自助注册、爬虫逻辑、无鉴权对外写接口。

## Known follow-ups（交接）

- 文档按 skill 收敛：`product.md` / `development.md` / `operations.md` / `data-contract.md`；削减与 OpenSpec 双写。
- 删除前端未使用骨架（home/about/counter demo 等）。
- 归档 `openspec/changes/add-currency-rate-mgmt`。
- 当前功能基线提交：`chore(baseline): 保存货币汇率与 API Key 功能基线`。

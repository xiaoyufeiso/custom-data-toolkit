# Custom Data Toolkit AI Coding 研发规范

> 状态：Engineering Reference Baseline  
> 将公司 React、Python 工程规范与 AI 原生研发方法裁剪为本项目执行规则。

## 1. 参考来源

- `D:\实习\技术方案\前端技术方案\React 前端项目模版技术方案.md`
- `D:\实习\技术方案\后端技术方案\Python 项目工程化规范.md`
- `D:\实习\技术方案\项目 Spec 管理规范.md`
- `D:\实习\技术方案\企业级 AI 原生研发方法论 —— 架构设计规范.md`

冲突时：**项目内** `docs/` 与 `openspec/` 优先。

## 2. 端到端阶段

```text
S0 文档基线 → S1 需求冻结 → S2 架构契约 → S3 骨架生成
→ S4 纵向切片 → S5 测试 → S6 评审归档 → S7 联调发布
```

当前处于 **S0**。骨架使用 scaffold-kit / Tendata；业务按 OpenSpec change 的 `tasks.md` 推进。

## 3. 切片工作流（强制）

每个纵向功能切片：

### Plan

- 读相关 Requirement、Spec、API、Database、当前 change。
- 列出影响的表、接口、页面与测试。
- 确认不包含 MVP 外功能（尤其海关字典）。
- **写出 Plan 并等待用户确认；未确认不得 Implement。**

### Implement

- 先对齐类型与契约，再写实现。
- 后端：model → repository → service → router。
- 前端：type → service → hook → component → page。
- 一次只做一个可验收切片。

### Verify

- 鉴权分区（Session vs API Key）正确。
- 唯一约束与删除保护。
- 前后端字段与错误码一致。

### Test

- 单测覆盖纯逻辑；集成测覆盖 MySQL 约束与鉴权；组件测从用户视角验证。

### Review

- BLOCKER / MAJOR / MINOR / SUGGESTION。
- Session、CSRF、密码、API Key、迁移属高风险，必须人工看一眼。

### Document

- 行为变 → `spec.md` / openspec  
- 表变 → `database.md`  
- 接口变 → `api.md`  
- 决策变 → `decisions.md`  
- 当日进展 → `progress.md`

## 4. 前端规范摘要

- React 18、TypeScript、Vite、pnpm。
- `pages` 仅路由壳；业务在 `views/<domain>`。
- SWR 管服务端数据；Zustand 只管 UI 状态。
- 统一 Axios 层；组件禁止散写请求。
- 优先 tendata-ui。
- Vitest + RTL + MSW；Mock 不进生产代码。

## 5. 后端规范摘要

- Python 3.12+、FastAPI、SQLModel、uv、Ruff、Pytest、Alembic。
- src layout；依赖单向：routers → services → repositories → models。
- MySQL；同步 Session（MVP）。
- Settings 统一配置；领域异常 + 统一错误响应。
- JSON camelCase / Python snake_case。

## 6. Spec 变更

新需求走 `openspec/changes/<change-id>/`：

1. `proposal.md`
2. `design.md` + `tasks.md` + Delta `specs/`
3. 评审通过后实现
4. 归档合并到 `openspec/specs/`

## 7. Scope Guard

MVP MUST NOT：

- 海关字典业务
- Casdoor/Casbin
- 自助注册
- 爬虫采集逻辑
- 无鉴权的对外写接口

# 文档索引与更新矩阵

对齐公司 `fullstack-ai-development-workflow`：同一事实只在一个权威层维护，其它文档只链接。

## 1. 权威文档

| 文档 | 职责 |
|---|---|
| [`product.md`](./product.md) | 稳定产品边界、角色、不变量、范围 |
| [`architecture.md`](./architecture.md) | 系统结构、模块边界、鉴权模型、技术选型 |
| [`development.md`](./development.md) | 本地搭建、命令、切片流程、测试与验收清单 |
| [`operations.md`](./operations.md) | 环境变量名、部署顺序、迁移、健康检查 |
| [`data-contract.md`](./data-contract.md) | 外部表 `currency`/`rate` 语义 |
| [`decisions.md`](./decisions.md) | ADR |
| [`api.md`](./api.md) | API 契约（**过渡**；目标迁 OpenAPI） |
| [`progress.md`](./progress.md) | 可选状态：里程碑/阻塞/下一步（不替代 `tasks.md`） |
| `../openspec/` | 行为 delta 与归档后的领域 spec |
| `../AGENTS.md` | AI 执行约束 |

## 2. 已删除停用文档

原 `requirements.md` / `spec.md` / `ai-coding.md` / `testing.md` / `deployment.md` / `database.md` 已删除。迁移对照见 [`archive/README.md`](./archive/README.md)。

## 3. 何时更新哪份文档

### 按生命周期阶段

| 阶段 | 更新 / 产出 |
|---|---|
| Discover / 产品边界变化 | `product.md`；必要时新 ADR |
| 架构与骨架 | `architecture.md`、`profile.json`；脚手架后裁剪见 skill |
| 开一个变更 | `openspec/changes/<id>/`（proposal、design、tasks、delta specs） |
| 实现纵向切片 | 代码 + 测试；行为变 → OpenSpec；外部表 → `data-contract.md`；API → `api.md`/未来 OpenAPI；自有表 → migration |
| Verify / Test | 对照 OpenSpec Scenario + `development.md` 清单；实跑测试 |
| Review | 标 BLOCKER/MAJOR/MINOR；高风险鉴权/密钥/迁移人工看 |
| Document | 写回上表权威层；更新 change `tasks.md`；精简更新 `progress.md` |
| 归档 change | Delta 合并进 `openspec/specs/<domain>/`；关闭 change |
| 发布 / 环境 | `operations.md`、`.env.example`；执行迁移与健康检查 |

### 按事件（skill 更新矩阵）

| 事件 | 更新 |
|---|---|
| 产品范围、角色、词汇、稳定规则 | `product.md` |
| 模块边界、依赖方向、安全架构 | `architecture.md` |
| 本地命令、测试、分支、迁移流程 | `development.md` |
| 部署、配置名、监控、备份、回滚 | `operations.md` |
| API 请求/响应 | `api.md`（过渡）或 OpenAPI |
| 应用自有库表 | Alembic + model |
| 外部表语义 | `data-contract.md` |
| 提出一项功能/行为 | OpenSpec change |
| 重要技术选择 | `decisions.md`，并在 architecture 链接 |
| 切片进度 | change `tasks.md`；可选 `progress.md`（仅里程碑/阻塞/下一步） |

## 4. 禁止双写

- 不要在 `product.md` 写任务状态。
- 不要恢复已删除的全局功能 `spec.md`；行为只写在 OpenSpec。
- 不要在 Markdown 里复制公司标准全文（链到 skill / 公司规范）。
- 不要把 README 写成第二份产品/架构/运维手册。

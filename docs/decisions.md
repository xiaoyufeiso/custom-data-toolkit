# Custom Data Toolkit 决策记录

> 记录「选择了什么、为什么、有什么后果」。  
> 已接受决策如需改变，应新增决策，不直接抹去历史。

## 状态定义

- Proposed：提议中
- Accepted：已采用
- Superseded：已被新决策替代
- Rejected：未采用

## ADR-001：React + FastAPI

- 日期：2026-07-29
- 状态：Accepted
- 背景：后台管理系统，需要快速交付管理 UI 与 REST API。
- 决策：前端 React+TS+Vite；后端 Python FastAPI。
- 原因：符合公司前后端工程规范与 scaffold-kit 能力。
- 后果：需维护清晰 REST 契约与联调流程。

## ADR-002：使用 MySQL 并复用既有表

- 日期：2026-07-29
- 状态：Accepted
- 背景：爬虫已写入 `currency` / `rate`，DDL 已给定且要求复用。
- 决策：数据库采用 MySQL；ORM 映射既有表，不迁移到 PostgreSQL。
- 后果：与部分公司示例项目（PostgreSQL）不同；连接串、迁移与类型映射按 MySQL 处理；`rate.data` 保持字符串语义。

## ADR-003：鉴权双轨（Session + API Key）

- 日期：2026-07-29
- 状态：Accepted
- 背景：管理端是浏览器后台；对外查询是系统间调用。
- 决策：管理端 Session Cookie + CSRF；对外 `/public/*` 使用 `X-API-Key`。
- 原因：浏览器场景适合 Cookie；服务调用适合静态 Key；二者隔离降低误用风险。
- 后果：需实现会话表与 api_keys 表；Key 只存哈希；文档与中间件需分区清晰。
- 扩展：未来可换 Casdoor，但业务资源不绑定外部 ID 细节。

## ADR-004：首版不开放自助注册

- 日期：2026-07-29
- 状态：Accepted
- 决策：仅预置管理员（环境变量种子）。
- 后果：无注册页；运维通过环境/脚本管理账号。

## ADR-005：管理端允许维护汇率

- 日期：2026-07-29
- 状态：Accepted
- 背景：爬虫入库可能需人工核对与修正。
- 决策：允许管理员创建/更新/删除汇率，并维护 `checked`。
- 后果：需处理与爬虫并发写入的唯一键冲突（409）。

## ADR-006：海关字典延期

- 日期：2026-07-29
- 状态：Accepted
- 背景：需求仍为 TODO。
- 决策：本轮仅 OpenSpec/Requirement 占位，不实现。
- 后果：后续以 Delta Spec 变更引入，不阻塞汇率 MVP。

## ADR-007：对外查询返回空列表而非 404（无数据时）

- 日期：2026-07-29
- 状态：Accepted
- 决策：货币存在但无匹配汇率时返回 200 + `items: []`；货币 code 不存在才 404。
- 后果：调用方可用空列表表示「无数据」。

## ADR-008：本地开发使用 MySQL，自行建表

- 日期：2026-07-29
- 状态：Accepted
- 背景：本机无公司库；需要空库自建表以开发联调。项目要求简单、效率优先，并与既有 DDL 对齐。
- 决策：本地继续使用 **MySQL 8**（推荐 Docker 一键起）；空库先执行 `docs/database.md` 中的 `currency`/`rate` DDL，再跑 Alembic 创建管理表。不改用 PostgreSQL / SQLite。
- 原因：与公司存量表结构一致，避免方言差异；简单项目不值得双库适配。
- 后果：开发者需本机或 Docker 提供 MySQL；无公司数据时用管理端或种子脚本录入少量样例即可。

## ADR-009：对外汇率 API 只按 code 查询

- 日期：2026-07-29
- 状态：Accepted
- 背景：调用方可按货币名或 code 查询；海关字典未来可能承担「名称 ↔ code」映射，但需求未定。
- 决策：对外 `GET /public/rates` **只接受 `code`**，不接受 `name`。管理端列表可用 `q` 按 name/code 搜索。
- 原因：名称易重名/多语言/不规范；code 稳定。名称映射留给后续字典能力，避免现在猜需求。
- 后果：调用方若只有中文名，需先在管理端或未来字典服务解析出 code；本系统 MVP 不提供按名查汇率。

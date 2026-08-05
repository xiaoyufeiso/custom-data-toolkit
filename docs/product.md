# Tendata Customs Tools — 产品真相

> 权威层：稳定产品边界与业务不变量。  
> 交付级需求与行为场景见 OpenSpec change / 领域 spec，不在本文展开字段级细节。

## 1. 问题与目标

海关数据处理链路中，爬虫已将全球货币汇率写入现有 MySQL，但缺少统一后台维护界面与稳定的对外查询 API。

**Tendata Customs Tools** 提供：

- 管理端维护货币、汇率与对外 API Key；
- 外部系统通过 globiz 风格公开 API 查询货币/汇率（鉴权可由运维开关）；
- 管理端维护海关数据字典（国家 / 洲：原始值 → 标准值），增量同步至与第三方共用的 Redis，并处理缺失数据。

## 2. 用户与角色

| 角色 | 职责 |
|---|---|
| `admin` | 全量后台能力，含用户管理与业务写操作（货币/汇率/字典/API Key） |
| `viewer` | 只读：查询数据管理与海关字典；可导出字典；**无**写操作、**无**系统管理（用户管理/操作审计） |
| 外部调用方 | 系统间调用：携带 API Key 查询汇率；下游也可消费 Redis 中的字典映射（非本系统 HTTP） |

管理端账号软停用（`enabled=false`）后禁止登录并失效全部 Session；可再启用。前端对 Session 失效会尽快踢回登录（轮询/聚焦/接口 401）。禁止物理删除用户。
首启 bootstrap 用户为 `admin` 且启用。**不开放自助注册**；不做 Casdoor/Casbin/细粒度权限点。
既有 `operator` 角色已更名为 `viewer`（只读）。

## 3. 领域词汇

| 术语 | 含义 |
|---|---|
| `code` | 货币字母码（如 `CNY`、`MYR_IM`），对外汇率查询主键 |
| `rate.data` | 汇率值，字符串存储与传输 |
| `checked` | 汇率是否已人工核对 |
| API Key | 对外 globiz 根路径 API 鉴权凭证（受 `PUBLIC_API_AUTH_ENABLED` 控制）；服务端只存哈希 |
| 原始值 | 海关数据中实际出现的字符串（字典侧） |
| 标准值 | 映射后的统一值（单字段；内容审核不在范围，由管理员填写） |
| 字典类型 | 表 `customs_dict_type` 管理；种子 `country`/`continent`；可新建/改名/启停；编码不可改；映射表仍单表按 `dict_type` 存 |

## 4. 系统职责

- 管理端：Session + CSRF 鉴权下的货币/汇率/API Key、海关字典（类型/标准/缺失）、用户管理与操作审计（仅 admin）。
- 对外 HTTP：根路径只读货币/汇率（契约 `deploy/api/globiz-rates-api.md`；`PUBLIC_API_AUTH_ENABLED` 控制是否要求 `X-API-Key`）。
- 字典：MySQL 为本系统映射权威；启用映射**增量**同步至共用 Redis Hash；缺失读第三方 ZSET（ADR-011）。
- 兼容既有爬虫写入的 `currency` / `rate` 表语义（见 `data-contract.md`）。
- **不**运行爬虫；**不**做汇率换算引擎。

## 5. 稳定业务不变量

- 管理端写操作 MUST 鉴权；对外查询 MUST 校验 API Key。
- `rate` 在 `(currency_id, date)` 上唯一。
- 删除货币前 MUST 确认无关联汇率。
- 对外汇率查询只按货币 `code`，不按货币名称（ADR-009）；海关字典第一版**不**承担货币名称映射。
- 无匹配汇率时返回空列表；货币不存在才 404（ADR-007）。
- 字典映射：同类型原始值唯一；标准值单字段且不审内容；原始值不可改；无物理删除，停用则对本 field 做 Redis `HDEL`（不整表覆盖）（ADR-011）。

## 6. 范围

### In Scope（已交付 MVP）

- 预置管理员登录 / 退出 /（可选）改密；角色 `admin`/`viewer` 与软停用
- 用户管理（admin）：列表/创建/改角色启停/重置密码
- viewer：业务只读 + 字典导出；不可写
- 管理端操作审计：成功写操作落库；**仅 admin** 查询；viewer 不可见系统管理整组
- 货币 CRUD、汇率列表与维护、API Key 管理（后端仅 admin；前端 API Key UI 搁置）
- 对外 globiz：`GET /currencies/`、`GET /rates/` 等（见 `deploy/api/globiz-rates-api.md`）；旧 `/api/v1/public/rates` 已废弃
- 工程文档与 OpenSpec 基线

### In Scope（海关字典 — 已归档至 `openspec/specs/customs-dict/spec.md`）

- 字典类型管理（创建/改名/启停；`/options` 供下拉）
- 标准字典映射管理 + 增量 Redis 同步
- 标准字典 xlsx 导出 / 导入 / 模板（upsert；`source=import`）
- 缺失字典（读 ZSET、未选类型聚合全部启用类型、处理、导出）

### Out of Scope（除非新 change / 明确解冻）

- 字典处理历史、整表覆盖式全量同步
- 货币名称字典、物理删除映射、标准值强制列表、改类型编码
- 爬虫采集逻辑
- Casdoor / Casbin / SSO / 自助注册
- 多租户、复杂 RBAC、审计导出
- 公网生产级高可用
- 交叉汇率计算

## 7. 成功标准

- 管理员可完成货币与汇率日常维护闭环。
- 外部系统可按 globiz 契约查询货币/汇率（鉴权开启时需有效 API Key）。
- 管理员可维护类型与映射并处理缺失；启用项增量同步至约定 Redis key。
- 文档分层足以驱动 AI Coding 切片，无需口头补充核心边界。

## 8. 相关权威文档

| 主题 | 权威位置 |
|---|---|
| 行为场景 / 交付需求 | `openspec/changes/` 或归档后的 `openspec/specs/<domain>/` |
| 系统结构 | `docs/architecture.md` |
| 外部表语义 | `docs/data-contract.md` |
| API 契约（过渡） | `docs/api.md`（目标迁 OpenAPI） |
| 决策 | `docs/decisions.md` |
| 海关字典 | `openspec/specs/customs-dict/spec.md` |
| UI 交互 | `openspec/specs/ui.md` |

# Custom Data Toolkit — 产品真相

> 权威层：稳定产品边界与业务不变量。  
> 交付级需求与行为场景见 OpenSpec change / 领域 spec，不在本文展开字段级细节。

## 1. 问题与目标

海关数据处理链路中，爬虫已将全球货币汇率写入现有 MySQL，但缺少统一后台维护界面与稳定的对外查询 API。

**Custom Data Toolkit** 提供：

- 管理端维护货币、汇率与对外 API Key；
- 外部系统通过 API Key 按货币 `code` 查询汇率。

## 2. 用户与角色

| 角色 | 职责 |
|---|---|
| 管理员 | 使用后台：登录、维护货币/汇率/API Key |
| 外部调用方 | 系统间调用：携带 API Key 查询汇率，不使用管理 UI |

MVP 仅预置管理员账号，**不开放自助注册**。

## 3. 领域词汇

| 术语 | 含义 |
|---|---|
| `code` | 货币字母码（如 `CNY`、`MYR_IM`），对外查询主键 |
| `rate.data` | 汇率值，字符串存储与传输 |
| `checked` | 汇率是否已人工核对 |
| API Key | 对外 `/public/*` 鉴权凭证；服务端只存哈希 |

## 4. 系统职责

- 管理端：Session + CSRF 鉴权下的货币/汇率/API Key 维护。
- 对外：只读汇率查询（`X-API-Key`）。
- 兼容既有爬虫写入的 `currency` / `rate` 表语义（见 `data-contract.md`）。
- **不**运行爬虫；**不**做汇率换算引擎。

## 5. 稳定业务不变量

- 管理端写操作 MUST 鉴权；对外查询 MUST 校验 API Key。
- `rate` 在 `(currency_id, date)` 上唯一。
- 删除货币前 MUST 确认无关联汇率。
- 对外查询只按 `code`，不按货币名称（名称映射留给海关字典，见占位 spec）。
- 无匹配汇率时返回空列表；货币不存在才 404（ADR-007）。

## 6. 范围

### In Scope（MVP）

- 预置管理员登录 / 退出 /（可选）改密
- 货币 CRUD、汇率列表与维护、API Key 管理
- 对外 `GET /public/rates`（单日或日期区间）
- 工程文档与 OpenSpec 基线

### Out of Scope（MVP 及当前永久不做，除非新 change）

- 海关字典业务实现
- 爬虫采集逻辑
- Casdoor / Casbin / SSO / 自助注册
- 多租户、复杂 RBAC、审计导出
- 公网生产级高可用
- 交叉汇率计算

## 7. 成功标准

- 管理员可完成货币与汇率日常维护闭环。
- 外部系统可用有效 API Key 查询指定货币汇率。
- 文档分层足以驱动 AI Coding 切片，无需口头补充核心边界。

## 8. 相关权威文档

| 主题 | 权威位置 |
|---|---|
| 行为场景 / 交付需求 | `openspec/changes/` 或归档后的 `openspec/specs/<domain>/` |
| 系统结构 | `docs/architecture.md` |
| 外部表语义 | `docs/data-contract.md` |
| API 契约（过渡） | `docs/api.md`（目标迁 OpenAPI） |
| 决策 | `docs/decisions.md` |
| 海关字典占位 | `openspec/specs/customs-dict/spec.md` |

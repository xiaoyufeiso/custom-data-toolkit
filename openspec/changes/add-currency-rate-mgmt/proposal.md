# Proposal: 货币汇率管理与对外查询 API

## Intent

建立海关数据处理辅助后台的首个可交付能力：管理货币与汇率，并向外部系统提供基于 API Key 的汇率查询接口；同时建立管理端登录与 API Key 管理能力。

## Scope

In Scope:

- 预置管理员登录（Session + CSRF）
- 货币 CRUD
- 汇率列表/维护（含 checked）
- API Key 创建/停用/删除
- 对外 `GET /api/v1/public/rates`

Out of Scope:

- 海关字典管理
- 爬虫采集
- Casdoor/Casbin、自助注册
- 交叉汇率计算

## Related Specs

- `openspec/specs/prd.md` — 产品范围
- `openspec/specs/tech.md` — 技术基线
- `openspec/specs/ui.md` — 管理端交互
- `openspec/specs/customs-dict/spec.md` — 明确排除
- 传统契约：`docs/api.md`、`docs/data-contract.md`；行为 Delta 在本 change `specs/`；产品边界 `docs/product.md`

## Approach

复用 MySQL 既有 `currency`/`rate`；新增管理员与 API Key 表。先骨架与认证，再货币、汇率，最后 API Key 与对外查询。前后端按纵向切片交付。

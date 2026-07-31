# Custom Data Toolkit 开发进展

> 可选状态板（无看板时使用）。不替代 Git 历史，不复述 OpenSpec `tasks.md` 每一项。

## 当前状态

- 阶段：M6 发布整理完成
- 整体状态：MVP + 已验收增量已归档；等待字典需求澄清
- 最后更新：2026-07-31

## 里程碑

| 里程碑 | 状态 |
|---|---|
| M0–M5 文档/骨架/认证/货币/汇率/API Key（后端） | 完成 |
| 前端 API Key 管理模块 | 搁置（2026-07-31 从前端移除路由/页面/服务） |
| M6 发布整理（验收勾选、OpenSpec 归档、骨架裁剪） | 完成 |

## 阻塞

无。

## 下一步

1. 澄清海关字典需求后，新建 OpenSpec change（建议 `add-customs-dict-mgmt`）；**未批准前禁止实现**
2. （可选）完成 `standardize-admin-ui-components` 登录页切片
3. （可选）API 契约迁 OpenAPI 后降级 `docs/api.md`
4. （可选）恢复前端 API Key UI（需重建模块，并继续 deferred 筛选/批量删除）

活跃 change 见：`openspec/specs/README.md`  
领域权威：`openspec/specs/{auth,currency,rate}/spec.md`

## 日志（摘录）

### 2026-07-31（M6）

- 质量收口：登录页 Button 宽度修复；删除未用 home/about/workspace 骨架；`tsc` / 前端 51 测 / UAT build 通过
- 验收：`docs/development.md` §5 核心项已勾选；公开汇率测试改为合法字母 code；前端 API Key UI 豁免
- 归档 MVP：`add-currency-rate-mgmt` → `openspec/changes/archive/`，合并 `auth`/`currency`/`rate` 领域 spec
- 归档增量：`add-page-bulk-delete`（currency/rate）、`add-rate-batch-check`、`add-currency-prefix-suggestions`
- 保留 proposed：`standardize-admin-ui-components`（登录页未完成）、`improve-rate-create-currency-picker`
- Deferred 不变：同名软提醒、汇率数量、前端 API Key UI

### 2026-07-31

- 搁置全部前端 API Key 相关内容：删除 `web` 路由 `/api-keys`、`pages/api-keys`、`views/apiKeys`、`services/apiKey` 与菜单文案。
- 后端 API Key 管理接口与对外 `X-API-Key` 公开查询仍保留。

### 2026-07-30

- 文档按 skill 收敛；删除 `docs/` 停用重定向文件（对照见 `docs/archive/README.md`）

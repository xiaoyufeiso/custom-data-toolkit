# Spec Registry

| 领域 | 文件 | 版本 | 状态 | Owner | 最后更新 |
|------|------|------|------|-------|----------|
| 海关字典（占位） | customs-dict/spec.md | 0.1 | draft | TBD | 2026-07-29 |
| UI 交互摘要 | ui.md | — | draft | TBD | 2026-07-29 |

稳定产品/架构正文已迁出 OpenSpec 全局文件，见 `docs/product.md`、`docs/architecture.md`。

## 活跃变更

| 变更 | 路径 | 状态 |
|------|------|------|
| 汇率与货币管理 MVP | `openspec/changes/add-currency-rate-mgmt/` | proposed（实现完成，待归档） |
| 新建汇率货币选择器首字母索引 | `openspec/changes/improve-rate-create-currency-picker/` | proposed（仅文档，未实现） |
| 货币与汇率搜索前缀推荐 | `openspec/changes/add-currency-prefix-suggestions/` | proposed（两页已实现，待完整验收） |
| 货币同名软提醒 | `openspec/changes/add-duplicate-currency-name-warnings/` | deferred（已澄清，暂不实现） |
| 货币列表关联汇率数量 | `openspec/changes/add-currency-rate-counts/` | deferred（已澄清，暂不实现） |
| 管理端 UI 组件库化与视觉统一 | `openspec/changes/standardize-admin-ui-components/` | proposed（货币/汇率完成；API Key 页搁置；登录页待实施） |
| 管理页面内批量删除与 API Key 筛选 | `openspec/changes/add-page-bulk-delete/` | proposed（货币/汇率完成；API Key 筛选与批量删除搁置） |
| 汇率批量核对与列表操作分区 | `openspec/changes/add-rate-batch-check/` | proposed（两切片已实现，待全量验收） |

## 说明

- 领域级 `auth` / `currency` / `rate` 正式 spec：归档时从 change Delta 合并到 `openspec/specs/<domain>/`。
- 行为冲突时：已归档领域 spec > 活跃 change delta > 其它草稿。
- `prd.md` / `tech.md` 仅为重定向，勿再写入事实。

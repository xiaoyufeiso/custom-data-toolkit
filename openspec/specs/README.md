# Spec Registry

| 领域 | 文件 | 版本 | 状态 | Owner | 最后更新 |
|------|------|------|------|-------|----------|
| 认证 | auth/spec.md | 1.0 | active | TBD | 2026-08-04（用户管理 delta 见 change） |
| 货币 | currency/spec.md | 1.1 | active | TBD | 2026-07-31 |
| 汇率 / 对外查询 / API Key（后端） | rate/spec.md | 1.2 | active | TBD | 2026-08-04 |
| 海关字典 | customs-dict/spec.md | 0.3 | active | TBD | 2026-08-04 |
| UI 交互摘要 | ui.md | — | active | TBD | 2026-08-04 |
| 操作审计（delta） | changes/add-admin-audit-log/ | — | implemented | TBD | 2026-08-04 |

稳定产品/架构正文已迁出 OpenSpec 全局文件，见 `docs/product.md`、`docs/architecture.md`。

## 活跃变更

| 变更 | 路径 | 状态 |
|------|------|------|
| 管理端用户管理（角色 + 软停用） | `openspec/changes/add-admin-user-mgmt/` | implemented（待归档；角色已由 viewer change 覆盖） |
| viewer 只读角色 | `openspec/changes/add-viewer-readonly-role/` | implemented（待归档） |
| 管理端操作审计 | `openspec/changes/add-admin-audit-log/` | implemented（待归档） |
| 管理端 UI 组件库化与视觉统一 | `openspec/changes/standardize-admin-ui-components/` | proposed（货币/汇率完成；登录页/i18n/视觉收口待实施） |
| 货币同名软提醒 | `openspec/changes/add-duplicate-currency-name-warnings/` | deferred |
| 货币列表关联汇率数量 | `openspec/changes/add-currency-rate-counts/` | deferred |

## 已归档变更

| 变更 | 路径 | 归档日期 |
|------|------|----------|
| 管理端列表 UI 统一 | `openspec/changes/archive/unify-admin-list-ui/` | 2026-08-04 |
| 字典类型管理 | `openspec/changes/archive/add-customs-dict-types/` | 2026-08-04 |
| 标准字典导入/导出 | `openspec/changes/archive/add-customs-dict-import/` | 2026-08-04 |
| 新建汇率货币选择器首字母索引 | `openspec/changes/archive/improve-rate-create-currency-picker/` | 2026-08-04 |
| 海关数据字典管理（第一版） | `openspec/changes/archive/add-customs-dict-mgmt/` | 2026-08-03 |
| 汇率与货币管理 MVP | `openspec/changes/archive/add-currency-rate-mgmt/` | 2026-07-31 |
| 管理页面内批量删除（currency/rate） | `openspec/changes/archive/add-page-bulk-delete/` | 2026-07-31（api-key §4 仍 deferred） |
| 汇率批量核对与列表操作分区 | `openspec/changes/archive/add-rate-batch-check/` | 2026-07-31 |
| 货币与汇率搜索前缀推荐 | `openspec/changes/archive/add-currency-prefix-suggestions/` | 2026-07-31 |

## Deferred（无活跃实现）

- 前端 API Key 管理 UI（含筛选 / 批量删除 / BizTable 对齐）
- 字典：整表覆盖全量 / 处理历史
- `add-duplicate-currency-name-warnings`
- `add-currency-rate-counts`

## 说明

- 领域级正式 spec 在 `openspec/specs/<domain>/`；活跃 change Delta 为准直至归档。
- 行为冲突时：已归档领域 spec > 活跃 change delta > 其它草稿。
- `prd.md` / `tech.md` 仅为重定向，勿再写入事实。

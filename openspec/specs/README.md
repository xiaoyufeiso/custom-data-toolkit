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

## 说明

- 领域级 `auth` / `currency` / `rate` 正式 spec：归档时从 change Delta 合并到 `openspec/specs/<domain>/`。
- 行为冲突时：已归档领域 spec > 活跃 change delta > 其它草稿。
- `prd.md` / `tech.md` 仅为重定向，勿再写入事实。

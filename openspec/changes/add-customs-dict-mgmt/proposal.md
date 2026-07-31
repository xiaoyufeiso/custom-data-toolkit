# Proposal: 海关数据字典管理（第一版）

## Intent

维护海关**原始值 → 标准值**映射（类型：国家 / 洲），以 MySQL 为本系统权威，将启用映射**增量**同步至与第三方共用的 Redis，并处理第三方写入的缺失数据。

纠正旧占位：第一版**不是**货币名称 ↔ 货币 code。

## Scope

### In Scope（第一版已确认）

- **单表**映射 + 预置 `dict_type`：`country` | `continent`（不拆国家表/洲表；**不提供类型编辑**；列表**可按类型筛选**）
- 标准字典：
  - 字段：类型、原始值、标准值（单字段）、启停、来源、审计字段、Redis 同步状态
  - 同类型下原始值唯一；标准值可一对多
  - **内容审核不在范围**：不做 ISO/洲码表/标准值列表校验；管理员自由填写（非空、长度、trim、唯一性除外）
  - **原始值创建后不可改**；无物理删除；**停用**代替删除
  - 全部由管理员填写（来源以手工 / 缺失处理为主；**导入搁置**）
- Redis（与第三方共用）：
  - 正式 Hash **按类型拆 key**：`customs:country:dict` / `customs:continent:dict`
  - 缺失 ZSET：**按类型拆 key**：`customs:country:dict:missing` / `customs:continent:dict:missing`（member=原始值，score=出现次数）
  - **第三方也会写正式 Hash**；本系统对约定 key **有读写权**
  - **默认同步策略：仅增量** `HSET`/`HDEL`，**不做**临时 key + RENAME 整表覆盖（避免误伤第三方 field）
  - MySQL 写成功后同步 Redis；失败不回滚 MySQL；可单条重试
  - 可选「重放同步」：按 MySQL 启用集逐条 upsert + 对已停用做 HDEL，**不得**删除 Redis 中 MySQL 不存在的 field
- 缺失字典：
  - 列表读第三方 ZSET；支持类型/原始值筛选、分页、刷新；**可导出**当前筛选全量 xlsx（不改 Redis）
  - 处理：填标准值 → 写 MySQL → 正式 Hash 同步**成功后**再 `ZREM` missing
  - 正式同步失败：missing **不删**，映射标待同步/失败，可重试
- 管理端：标准字典 + 缺失字典；Session + CSRF

### Out of Scope / Deferred

- **标准字典导入** / 模板下载（明确搁置）
- 缺失处理历史独立页
- 通用操作日志
- 标准值强制列表 / 内容审核
- 字典类型管理页
- **整表覆盖式**全量 Redis 同步（非默认；若对接后改为「仅本系统写正式 Hash」可再加）
- 货币名称字典、细粒度 RBAC、物理删除

## Related Specs

- `docs/product.md`、`docs/architecture.md`、`docs/decisions.md`（ADR-011）
- `openspec/specs/customs-dict/spec.md`
- Delta：`openspec/changes/add-customs-dict-mgmt/specs/customs-dict/spec.md`

## Approach

应用自有映射表（Alembic）+ Redis 客户端。切片顺序：模型/迁移 → 标准字典 API 与增量同步 → 缺失读/处理/导出 → 前端。导入不阻塞本 change。

## Assumptions（对接默认，已采纳）

见 design「Redis 共用假设」。后续若权限/写入方变化，优先改同步适配层，避免整表覆盖实现。

## Open Questions（非阻塞）

1. 与第三方的书面 Redis 字段约定（规范化、冲突时口头规则）— 无约定时按本文 key/结构实现，联调微调适配器。
2. 字段长度上限（技术默认可定，如 255）。

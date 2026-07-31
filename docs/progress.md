# Custom Data Toolkit 开发进展

> 可选状态板（无看板时使用）。不替代 Git 历史，不复述 OpenSpec `tasks.md` 每一项。

## 当前状态

- 阶段：海关字典第一版 — 包 3（缺失字典）已完成，待包 4 Plan
- 整体状态：进行中
- 最后更新：2026-07-31

## 里程碑

| 里程碑 | 状态 |
|---|---|
| M0–M6 汇率 MVP 及发布整理 | 完成 |
| 海关字典第一版文档 / Redis 默认假设 | 完成 |
| 海关字典第一版开发 | 进行中（包 1–3 完成） |

## 阻塞

无（导入搁置；整表覆盖全量不做；与第三方书面约定非阻塞，联调微调）。

## 下一步

1. **包 4**：前端标准字典 + 缺失页 — 先出 Plan
2. 包 5 验收归档

切片：`openspec/changes/add-customs-dict-mgmt/tasks.md`

## 日志（摘录）

### 2026-07-31（包 3）

- 缺失列表/处理/导出；正式同步成功后 ZREM；失败保留 missing；openpyxl 导出

### 2026-07-31（包 2）

- 标准字典 API + 增量 Redis（HSET/HDEL、resync、replay-sync）；fakeredis 集成测试；`REDIS_URL` 写入 operations / .env.example

### 2026-07-31（包 1）

- 新增 `customs_dict_mapping` 模型与迁移 `0003`；常量/trim/dict_type 校验；单元 4 测通过；`alembic upgrade head` 通过
- 原始值不可变规则留包 2 service

### 2026-07-31（字典默认假设）

- 采纳：第三方写正式 Hash；按类型拆 key；仅增量同步；缺失正式同步成功后 ZREM；导入搁置；内容不审核；单表+类型筛选
- 明确不做：整表覆盖全量、导入、处理历史、操作日志

### 2026-07-31（M6 / 初版字典文档）

- M6 收尾完成；废止货币名称字典占位；ADR-011；新建 `add-customs-dict-mgmt`

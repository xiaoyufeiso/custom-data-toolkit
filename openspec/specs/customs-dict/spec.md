# 海关字典管理 Specification

> 权威摘要。交付行为以 `openspec/changes/add-customs-dict-mgmt/` Delta 为准，归档后合并回本文。

## Purpose

维护海关业务**原始值 → 标准值**映射，MySQL 为本系统权威；与第三方共用 Redis（正式 Hash + 缺失 ZSET）。

第一版类型：`country` / `continent`（单表 + 类型字段，可筛选）。**不是**货币名称字典。

## Scope

### In Scope

- 标准字典维护（自由填写；内容审核不在范围）
- 增量同步 Redis 正式 Hash（按类型拆 key）；第三方也可写正式 Hash
- 缺失：读第三方 ZSET；处理成功且正式同步成功后删除 missing；可导出
- 原始值不可改；停用代替物理删除；无类型编辑

### Deferred

- 标准字典**导入**
- 整表覆盖式全量同步
- 处理历史、操作日志、标准值强制列表

## Constraints & Assumptions

- 详见 ADR-011 与 change design「Redis 共用假设」。
- Plan 未确认不得写业务代码。

## Requirements

（归档前见 change Delta。）

## Decisions

### Decision: 共用 Redis 默认增量同步
- 第三方写正式 Hash；本系统有权；按类型拆 key；仅 HSET/HDEL；正式同步成功后 ZREM missing；导入搁置

# 海关字典管理 Specification

> 归档自 `openspec/changes/add-customs-dict-mgmt`（2026-08-03）。导入等 Deferred 项不在本版。

## Purpose

维护海关业务**原始值 → 标准值**映射，MySQL 为本系统权威；与第三方共用 Redis（正式 Hash + 缺失 ZSET）。

第一版类型：`country` / `continent`（单表 + 类型字段，可筛选）。**不是**货币名称字典。

## Scope

### In Scope

- 标准字典维护（自由填写；内容审核不在范围）
- 增量同步 Redis 正式 Hash（按类型拆 key）；第三方也可写正式 Hash
- 缺失：读第三方 ZSET；处理成功且正式同步成功后删除 missing；可导出
- 原始值不可改；停用代替物理删除（UI「删除」= 软删）；无类型编辑
- 管理端：标准字典 / 缺失字典；Session + CSRF；详情 Drawer；批量停用 / 批量同步

### Deferred

- 标准字典**导入** / 模板
- 整表覆盖式全量同步
- 处理历史、操作日志、标准值强制列表、字典类型管理

## Constraints & Assumptions

- 详见 ADR-011 与归档 change design「Redis 共用假设」。
- Redis 正式 Hash：`customs:{type}:dict`；缺失 ZSET：`customs:{type}:dict:missing`。

## Requirements

### Requirement: Single Mapping Table with Preset Types

The system MUST store country and continent mappings in one application table keyed by `dict_type` (`country` | `continent`).
The system MUST NOT create separate physical tables per type.
The system MUST NOT allow administrators to create, delete, or edit dictionary types.
List APIs and UI MUST support filtering by `dict_type`.

#### Scenario: Filter by dictionary type
- GIVEN mappings of both country and continent exist
- WHEN the admin lists mappings with dict type `country`
- THEN only country mappings are returned

### Requirement: Free-Form Raw and Standard Values

The system MUST map `raw_value` to a single-field `standard_value`.
Content validation of whether values are “correct” business codes is OUT OF SCOPE.
The system MUST only enforce non-empty values after trim, max length, exact case-sensitive uniqueness of `(dict_type, raw_value)`, and immutability of `raw_value` after create.
New mappings MUST default to enabled.
V1 creation sources are manual admin entry and missing-handling; **import is deferred**.

#### Scenario: Create mapping without code-list check
- GIVEN an authenticated admin
- WHEN the admin creates any non-empty trimmed raw and standard values within length limits
- THEN the mapping is accepted
- AND no ISO or continent enum check is applied

### Requirement: No Physical Delete; Raw Value Immutable

The system MUST NOT provide physical delete.
Disabling MUST keep the MySQL row and MUST `HDEL` that raw value from the formal Redis Hash when sync succeeds.
Admin UI “批量删除” MUST map to batch disable (soft delete).
Updating `raw_value` MUST be rejected with 400.
Standard dictionary list UI MAY hide disabled rows (query `enabled=true`).

#### Scenario: Disable removes only this system field via HDEL
- GIVEN an enabled mapping synced to Redis
- WHEN the admin disables it and sync succeeds
- THEN MySQL keeps the disabled row
- AND Redis no longer contains that field
- AND other Redis fields not present in MySQL remain untouched

### Requirement: Shared Redis with Incremental Sync Only

Redis formal dictionaries and missing sets are shared with a third party.
Formal Hash keys MUST be split by type: `customs:country:dict`, `customs:continent:dict`.
Missing ZSET keys MUST be split by type: `customs:country:dict:missing`, `customs:continent:dict:missing`.
The third party MAY also write formal Hash fields.
This system MUST have read/write permission on the agreed keys.
MySQL is the system of record for mappings managed in this admin UI.
Sync MUST use incremental `HSET` / `HDEL` only in v1.
The system MUST NOT replace the entire formal Hash via temporary key rename in v1 (to avoid deleting third-party fields).
An optional replay sync MAY upsert all enabled MySQL mappings and HDEL disabled ones without deleting Redis fields unknown to MySQL.
On Redis failure, MySQL changes MUST remain with pending/failed status and retry support.
Errors MUST NOT expose Redis credentials.

#### Scenario: Sync failure keeps MySQL change
- GIVEN Redis is unavailable
- WHEN the admin updates a standard value
- THEN MySQL stores the new value with pending or failed sync status
- AND the admin can retry later

### Requirement: Missing Dictionary from Third-Party Redis

The admin UI MUST list missing members from the type-specific ZSET (member = raw value, score = occurrence count).
Missing lists MUST support filter by dict type and raw value, pagination, refresh, and export of the full filtered set as xlsx without modifying Redis.
Handling a missing item MUST: create or reject duplicate MySQL mapping → sync formal Hash → **only after successful formal sync** `ZREM` the member from the missing ZSET.
If formal sync fails, the missing member MUST remain and the mapping MUST be pending/failed.

#### Scenario: Handle missing removes ZSET only after formal sync
- GIVEN a missing raw value in Redis ZSET
- WHEN the admin submits a standard value and formal Hash sync succeeds
- THEN MySQL contains an enabled mapping
- AND the ZSET member is removed

#### Scenario: Failed formal sync keeps missing member
- GIVEN a missing raw value
- WHEN MySQL save succeeds but formal Hash sync fails
- THEN sync status is pending or failed
- AND the ZSET member is still present

### Requirement: Admin UI Areas

V1 MUST provide standard-dictionary and missing-dictionary areas for authenticated admins (Session + CSRF).
V1 MUST NOT provide import UI, processing-history UI, operation-log UI, type-edit UI, or whole-hash replace full sync UI.
Standard and missing UIs SHOULD use detail Drawer (row / raw-value click) with in-drawer edit or handle actions.
Standard dictionary SHOULD support batch disable and batch resync with selection UX aligned to currency management.

## Decisions

### Decision: 共用 Redis 默认增量同步
- 第三方写正式 Hash；本系统有权；按类型拆 key；仅 HSET/HDEL；正式同步成功后 ZREM missing；导入搁置

### Decision: UI 删除 = 软删
- 「批量删除」调用 `batch-disable`；MySQL 原子停用；Redis 可部分失败并标 sync 状态后重试

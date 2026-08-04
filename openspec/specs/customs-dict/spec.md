# 海关字典管理 Specification

> 归档自 `add-customs-dict-mgmt`（2026-08-03）+ `add-customs-dict-import` / `add-customs-dict-types`（2026-08-04）。

## Purpose

维护海关业务**原始值 → 标准值**映射，MySQL 为本系统权威；与第三方共用 Redis（正式 Hash + 缺失 ZSET）。

类型存于 `customs_dict_type`（种子含 `country` / `continent`，可扩展）。**不是**货币名称字典。

## Scope

### In Scope

- 字典类型管理（创建 / 改名 / 启停；`code` 创建后不可改）
- 标准字典维护（自由填写；内容审核不在范围）
- 标准字典 xlsx 导出 / 导入 / 模板（与缺失导出同表头；upsert；`source=import`）
- 增量同步 Redis 正式 Hash（按类型拆 key）；第三方也可写正式 Hash
- 缺失：读第三方 ZSET；未选类型时聚合全部启用类型；处理成功且正式同步成功后删除 missing；可导出
- 原始值不可改；停用代替物理删除（UI「删除」= 软删）
- 管理端：类型 / 标准字典 / 缺失字典；Session + CSRF；详情 Drawer；批量停用 / 批量同步

### Deferred

- 整表覆盖式全量同步
- 处理历史、操作日志、标准值强制列表

## Constraints & Assumptions

- 详见 ADR-011 与归档 change design「Redis 共用假设」。
- Redis 正式 Hash：`customs:{code}:dict`；缺失 ZSET：`customs:{code}:dict:missing`。

## Requirements

### Requirement: Dictionary Types Are Manageable

The system MUST store dictionary types in application table `customs_dict_type` with unique `code`, display `name`, and `enabled`.
The system MUST seed `country` and `continent` on migration.
Administrators MUST be able to create types, rename (`name` only), enable, and disable types.
`code` MUST be immutable after create.
Disable MUST be rejected with 409 when any mapping row exists for that code (including disabled mappings).
The system MUST NOT physically delete types.
Write paths for mappings, missing handle, and import MUST accept only existing **enabled** types.
Standard/missing UI type selectors MUST load enabled types from API (MUST NOT hardcode country/continent only).
Redis formal/missing keys remain `customs:{code}:dict` and `customs:{code}:dict:missing`.

#### Scenario: Create type and use in mapping
- GIVEN an authenticated admin
- WHEN the admin creates type `port` with a name and then creates a mapping with dictType `port`
- THEN the mapping is accepted
- AND Redis HSET uses key `customs:port:dict`

#### Scenario: Disable blocked when mappings exist
- GIVEN type `country` has at least one mapping row
- WHEN the admin disables that type
- THEN the API returns 409 `CustomsDictType.HasMappings`
- AND the type remains enabled

#### Scenario: Options exclude disabled types
- GIVEN type `port` is disabled and has zero mappings
- WHEN the admin requests type options
- THEN `port` is not listed
- AND creating a mapping with `port` returns 400 `CustomsDict.InvalidType`

### Requirement: Single Mapping Table Filtered by Type

The system MUST store mappings in one application table keyed by `dict_type` (FK/logic to `customs_dict_type.code`).
The system MUST NOT create separate physical tables per type.
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
Creation sources include manual admin entry, missing-handling, and import (`source=import`).

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
Formal Hash keys MUST be split by type code: `customs:{code}:dict`.
Missing ZSET keys MUST be split by type code: `customs:{code}:dict:missing`.
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

The admin UI MUST list missing members from type-specific ZSETs (member = raw value, score = occurrence count).
When `dictType` is omitted, the list MUST aggregate missing members across all **enabled** types, sorted by occurrence descending.
Missing lists MUST support optional filter by dict type and raw value, pagination, refresh, and export of the full filtered set as xlsx without modifying Redis.
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

#### Scenario: List all enabled types when dict type omitted
- GIVEN missing members exist for both `country` and `continent`
- WHEN the admin lists missing without `dictType`
- THEN members from both types are returned
- AND results are ordered by occurrence count descending

### Requirement: Shared XLSX Schema for Mapping Import/Export

Standard dictionary export/import MUST use the same header row as missing export:
`字典类型编码`, `字典类型名称`, `原始值`, `出现次数`, `标准值`, `备注`.
Import MUST require dict type code, raw value, and standard value (trimmed, non-empty).
Import MUST ignore type label, occurrence count, and remark columns.
Import MUST NOT automatically remove members from the missing ZSET.
Import creates or updates mappings with source `import` and MUST sync Redis incrementally on success.

#### Scenario: Round-trip export then import updates standard value
- GIVEN an enabled mapping exists
- WHEN the admin exports mappings, changes the standard value in the file, and imports
- THEN the mapping's standard value is updated
- AND Redis formal Hash is synced incrementally when sync succeeds

#### Scenario: Import creates new mapping from filled missing export
- GIVEN a row with valid type, raw value, and standard value not already in MySQL
- WHEN the admin imports the file on the standard dictionary page
- THEN a new enabled mapping is created with source `import`
- AND the missing ZSET member is NOT removed by import alone

#### Scenario: Bad rows do not block other rows
- GIVEN a file with one invalid row and one valid row
- WHEN import runs
- THEN the valid row is applied
- AND the invalid row appears in the failed errors list

### Requirement: Admin UI Areas

The system MUST provide type-management, standard-dictionary, and missing-dictionary areas for authenticated admins (Session + CSRF).
V1 MUST NOT provide processing-history UI, operation-log UI, or whole-hash replace full sync UI.
Standard dictionary create UX MAY combine single create and batch import in one dialog; list page need not expose a separate export entry.
Standard and missing UIs SHOULD use detail Drawer with edit/handle actions.
Standard dictionary SHOULD support batch disable and batch resync with selection UX aligned to currency management.

## Decisions

### Decision: 共用 Redis 默认增量同步
- 第三方写正式 Hash；本系统有权；按类型拆 key；仅 HSET/HDEL；正式同步成功后 ZREM missing

### Decision: UI 删除 = 软删
- 「批量删除」调用 `batch-disable`；MySQL 原子停用；Redis 可部分失败并标 sync 状态后重试

### Decision: 类型可扩展
- `customs_dict_type` 管理类型；写路径仅接受启用类型；有映射时禁止停用

# Delta for Customs Dict

## ADDED Requirements

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
Updating `raw_value` MUST be rejected with 400.

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

## REMOVED / SUPERSEDED

- Prior draft assumptions that missing is deferred, that full sync uses atomic Hash replace, and that only this system writes formal Hash are superseded by this Delta.

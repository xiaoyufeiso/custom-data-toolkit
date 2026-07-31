# Rate Specification

> 权威层：汇率管理与对外查询（复用表 `rate`）。来源：`add-currency-rate-mgmt` + `add-page-bulk-delete` + `add-rate-batch-check`（2026-07-31 归档）。

## Requirements

### Requirement: Admin Rate Management
The system MUST allow authenticated admins to list (filter + paginate), create, update, and delete rows in the existing `rate` table.
Admins MUST be able to maintain `data` and `checked`.
The pair `(currency_id, date)` MUST remain unique.

#### Scenario: List by code and date range
- GIVEN rates for code `CNY` across multiple dates
- WHEN the admin lists rates with code `CNY` and a date range
- THEN only matching rows are returned in pages

#### Scenario: Duplicate currency date rejected
- GIVEN a rate already exists for currency C on date D
- WHEN the admin creates another rate for C on D
- THEN the system returns 409 `Rate.DuplicateCurrencyDate`

#### Scenario: Update checked flag
- GIVEN an existing rate
- WHEN the admin sets `checked` to true
- THEN the row is updated and `update_time` changes

### Requirement: Atomic Current-Page Rate Batch Delete
Authenticated administrators MUST be able to submit 1 to 100 selected rate IDs for atomic batch deletion.
The existing single-rate delete API and rate filtering behavior MUST remain available.

#### Scenario: Delete selected rates
- GIVEN the administrator selects rates on the current filtered page
- AND every selected rate still exists
- WHEN the administrator confirms batch deletion
- THEN all selected rates are deleted in one transaction
- AND the API returns 204

#### Scenario: Selection contains a missing rate
- GIVEN one selected rate no longer exists
- WHEN batch deletion is requested
- THEN the API returns 409 `BatchDelete.StaleSelection`
- AND the response identifies the missing ID
- AND no selected rate is deleted

### Requirement: Atomic Current-Page Rate Batch Check
Authenticated administrators MUST be able to submit 1 to 100 selected rate IDs to atomically mark them checked (`POST /api/v1/rates/batch-check`).
Rates already marked checked MUST be accepted idempotently.
The existing single-rate update and batch-delete APIs MUST remain available.

#### Scenario: Mark selected rates checked
- GIVEN selected rates exist and at least one is unchecked
- WHEN the administrator confirms batch check
- THEN all selected unchecked rates become checked in one transaction
- AND their `update_time` values are refreshed
- AND the API returns 204

#### Scenario: Already checked rates are idempotent
- GIVEN one or more selected rates are already checked
- WHEN batch check is requested
- THEN those rates remain checked
- AND their `update_time` values are not changed solely because of the retry
- AND the request succeeds

#### Scenario: Selection contains a missing rate on batch check
- GIVEN one selected rate no longer exists
- WHEN batch check is requested
- THEN the API returns 409 `BatchCheck.StaleSelection`
- AND `details.missingIds` identifies the missing ID
- AND no selected rate is updated

### Requirement: Public Rate Query with API Key
The system MUST expose `GET /api/v1/public/rates` authenticated by `X-API-Key`.
Callers MUST supply `code` and either `date` or `dateFrom`+`dateTo`.
If the currency code does not exist, the system MUST return 404.
If the currency exists but no rates match, the system MUST return 200 with an empty `items` list.
Public endpoints MUST NOT allow writes.

#### Scenario: Query with valid key
- GIVEN an enabled API key and rates for `CNY` on 2026-07-29
- WHEN the client calls public rates with that key, code `CNY`, and date `2026-07-29`
- THEN the response is 200 and includes the rate data

#### Scenario: Invalid key rejected
- GIVEN a missing, wrong, or disabled API key
- WHEN the client calls public rates
- THEN the system returns 401 `Auth.InvalidApiKey`

### Requirement: API Key Administration
Authenticated admins MUST be able to create, list, enable/disable, and delete API keys via admin HTTP API.
The plaintext key MUST be returned only once at creation time; the server MUST store only a hash (and optional prefix).
Frontend API Key management UI is deferred and MUST NOT be required for this capability.

#### Scenario: Create key shows plaintext once
- GIVEN an authenticated admin
- WHEN the admin creates an API key named `etl`
- THEN the response includes the full plaintext key
- AND subsequent list responses MUST NOT include the full plaintext key

#### Scenario: Disabled key cannot query
- GIVEN a previously working API key that has been disabled
- WHEN it is used on public rates
- THEN the system returns 401

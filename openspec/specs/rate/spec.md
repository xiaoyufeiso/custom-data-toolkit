# Rate Specification

> 权威层：汇率管理与对外查询（复用表 `rate`）。来源：`add-currency-rate-mgmt` + `add-page-bulk-delete` + `add-rate-batch-check`（2026-07-31 归档）+ `improve-rate-create-currency-picker`（2026-08-04 归档）。

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

### Requirement: Create-Rate Currency Picker with Code Initial Index
When an authenticated admin opens the **create rate** form, the system MUST present a currency picker that:

- Loads **all** currencies available via the existing admin `GET /currencies` pagination API (client MAY issue multiple page requests; MUST NOT rely on a new sort-specific endpoint for this requirement);
- Sorts and groups options by the first character of `code` (case-insensitive; display grouping MUST use uppercase Latin letters where applicable);
- Places currencies with **null/empty** `code` into a `#` group;
- Replaces the native HTML select with a **custom** dropdown panel that includes a **right-hand letter index**;
- When the admin clicks a letter (or `#`) on the index, MUST scroll the option list to the corresponding group section.
- Option labels MUST display as `code (name)` when `code` is present (e.g. `CNY (人民币)`); when `code` is null/empty, MUST display the name only.
- The option list MUST support mouse-wheel scrolling; the list scrollbar MAY be hidden. The right-hand letter index MUST remain visible.

Selecting a currency MUST still bind to the existing create-rate `currencyId` field and MUST NOT change create-rate API request/response contracts.
The picker scope MUST be limited to the create-rate form (MUST NOT be required on currency list page or rate filter controls by this requirement).

#### Scenario: Options sorted by code initial
- GIVEN the admin is on the create rate form
- AND currencies exist with codes `USD`, `CNY`, and `EUR`
- WHEN the currency picker options are shown
- THEN the options are ordered by `code` initial (e.g. `C` then `E` then `U` groups)
- AND within the same initial, options are ordered by full `code` ascending

#### Scenario: Currencies without code go to hash group
- GIVEN a currency with empty or null `code` and name `历史币种`
- WHEN the currency picker options are shown
- THEN that currency appears under the `#` group

#### Scenario: Letter index scrolls to section
- GIVEN the picker is open and there is at least one currency whose `code` starts with `C`
- WHEN the admin clicks `C` on the right-hand index
- THEN the option list scrolls so the `C` section is brought into view

#### Scenario: All currencies loaded beyond one page
- GIVEN total currencies exceed one `pageSize` page of `GET /currencies`
- WHEN the admin opens the create rate currency picker
- THEN currencies from all pages are available in the picker (not truncated to the first page only)

#### Scenario: Option label shows code then name
- GIVEN a currency with name `人民币` and code `CNY`
- WHEN the currency picker options are shown
- THEN the option label is `CNY (人民币)`

#### Scenario: Create rate API unchanged
- GIVEN the admin selects a currency from the new picker and submits a valid create rate form
- WHEN the client calls the existing create rate API
- THEN the request still uses `currencyId` (and other existing fields) with no new required fields for this change

### Requirement: Public Globiz Read API
The system MUST expose root-path read-only currency/rate APIs per `deploy/api/globiz-rates-api.md`
(`GET /`, `/currencies/`, `/currencies/{id}/`, `/rates/`, `/rates/{id}/`, `/openapi`).
Pagination MUST use `page`/`size` (default size 5, max 1000) and respond with `count`/`next`/`previous`/`results`.
Rate list MAY filter by optional `currencyCode`, `dateStart`, `dateEnd`.
When `PUBLIC_API_AUTH_ENABLED` is true, callers MUST supply a valid `X-API-Key`; when false, anonymous read is allowed.
`GET /api/v1/public/rates` MUST NOT be available.
Public endpoints MUST NOT allow writes.

#### Scenario: Query rates with valid key
- GIVEN auth enabled, an enabled API key, and rates for `CNY`
- WHEN the client calls `GET /rates/?currencyCode=CNY&size=20` with that key
- THEN the response is 200 with globiz page shape and matching `results`

#### Scenario: Invalid key rejected when auth enabled
- GIVEN `PUBLIC_API_AUTH_ENABLED=true` and a missing/wrong/disabled API key
- WHEN the client calls a globiz public endpoint
- THEN the system returns 401 with `detail`

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

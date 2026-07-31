# Currency Specification

> 权威层：货币管理（复用表 `currency`）。来源：`add-currency-rate-mgmt` + `add-page-bulk-delete` + `add-currency-prefix-suggestions`（2026-07-31 归档）。

## Requirements

### Requirement: Currency CRUD
The system MUST allow authenticated admins to list, create, update, and delete currencies stored in the existing `currency` table.
`name` MUST be required; `code` MAY be null.
When `code` is provided it MUST be 1–10 uppercase letters or underscores (`^[A-Z_]{1,10}$`, case-insensitive input normalized to uppercase, e.g. `CNY`, `MYR_IM`), and MUST be unique at the application layer.

#### Scenario: Create currency
- GIVEN an authenticated admin
- WHEN the admin creates a currency with name and code `CNY`
- THEN the currency is persisted and returned with an id

#### Scenario: Reject invalid code format
- GIVEN an authenticated admin
- WHEN the admin creates a currency with code `123` or `CN-Y` or `ABCDEFGHIJK` (11 chars)
- THEN the system rejects the request with 400 `Currency.InvalidCode`

#### Scenario: Delete blocked when rates exist
- GIVEN a currency that has at least one rate row
- WHEN the admin deletes that currency
- THEN the system rejects the request with 409 `Currency.HasRates`

#### Scenario: Delete allowed when no rates
- GIVEN a currency with zero rate rows
- WHEN the admin deletes that currency
- THEN the currency is removed

### Requirement: Atomic Current-Page Currency Batch Delete
Authenticated administrators MUST be able to submit 1 to 100 selected currency IDs for atomic batch deletion.
The system MUST retain the existing rule that a currency with associated rates cannot be deleted.
The existing single-currency delete API MUST remain available.

#### Scenario: Delete selected currencies
- GIVEN the administrator selects currencies on the current page
- AND every selected currency exists and has no associated rates
- WHEN the administrator confirms batch deletion
- THEN all selected currencies are deleted in one transaction
- AND the API returns 204

#### Scenario: One selected currency has rates
- GIVEN multiple currencies are selected
- AND at least one selected currency has associated rates
- WHEN batch deletion is requested
- THEN the API returns 409 `Currency.HasRates`
- AND the response identifies the blocked currency IDs
- AND none of the selected currencies are deleted

#### Scenario: Selection contains a missing currency
- GIVEN one selected currency no longer exists
- WHEN batch deletion is requested
- THEN the API returns 409 `BatchDelete.StaleSelection`
- AND the response identifies the missing ID
- AND no currency is deleted

#### Scenario: Reject invalid batch size
- GIVEN the request contains no IDs, duplicate IDs, invalid IDs, or more than 100 IDs
- WHEN batch deletion is requested
- THEN the API returns 422
- AND no currency is deleted

### Requirement: Currency Prefix Suggestions
The system MUST provide authenticated admins with bounded, case-insensitive prefix suggestions from existing currencies via `GET /api/v1/currencies/suggestions`.
For the currency management search input, a suggestion MUST match when the trimmed input is a prefix of either `name` or `code`.
For the rate management code filter, a suggestion MUST match only when the trimmed input is a prefix of `code`.
Selecting a suggestion MUST fill the corresponding input and MUST NOT automatically execute the search.
The existing substring behavior of `GET /currencies?q=` MUST remain unchanged.
The system MUST return at most 10 suggestions.
Exact matches MUST sort before code-prefix matches, followed by name-prefix matches.

#### Scenario: Currency page recommends by name prefix
- GIVEN currencies named `人民币` and `人民币（离岸）`
- WHEN the admin types the prefix `人民` in the currency search input
- THEN both matching currencies are offered as bounded suggestions

#### Scenario: Rate page recommends only by code prefix
- GIVEN a currency named `人民币` with code `CNY`
- WHEN the admin types `CN` in the rate code filter
- THEN that currency is offered
- WHEN the admin types `人民`
- THEN it is not offered by the code-only suggestion mode

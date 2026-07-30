# Delta for Currency

## ADDED Requirements

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

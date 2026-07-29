# Delta for Currency

## ADDED Requirements

### Requirement: Currency CRUD
The system MUST allow authenticated admins to list, create, update, and delete currencies stored in the existing `currency` table.
`name` MUST be required; `code` MAY be null but non-empty codes SHOULD be unique at the application layer.

#### Scenario: Create currency
- GIVEN an authenticated admin
- WHEN the admin creates a currency with name and code `USD`
- THEN the currency is persisted and returned with an id

#### Scenario: Delete blocked when rates exist
- GIVEN a currency that has at least one rate row
- WHEN the admin deletes that currency
- THEN the system rejects the request with 409 `Currency.HasRates`

#### Scenario: Delete allowed when no rates
- GIVEN a currency with zero rate rows
- WHEN the admin deletes that currency
- THEN the currency is removed

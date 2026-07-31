# Delta for Rate

## ADDED Requirements

### Requirement: Admin Rate Management
The system MUST allow authenticated admins to list (filter + paginate), create, update, and delete rows in the existing `rate` table.
Admins MUST be able to maintain `data` and `checked`.
The pair `(currency_id, date)` MUST remain unique.

#### Scenario: List by code and date range
- GIVEN rates for code `156` across multiple dates
- WHEN the admin lists rates with code `156` and a date range
- THEN only matching rows are returned in pages

#### Scenario: Duplicate currency date rejected
- GIVEN a rate already exists for currency C on date D
- WHEN the admin creates another rate for C on D
- THEN the system returns 409 `Rate.DuplicateCurrencyDate`

#### Scenario: Update checked flag
- GIVEN an existing rate
- WHEN the admin sets `checked` to true
- THEN the row is updated and `update_time` changes

### Requirement: Public Rate Query with API Key
The system MUST expose `GET /api/v1/public/rates` authenticated by `X-API-Key`.
Callers MUST supply `code` and either `date` or `dateFrom`+`dateTo`.
If the currency code does not exist, the system MUST return 404.
If the currency exists but no rates match, the system MUST return 200 with an empty `items` list.
Public endpoints MUST NOT allow writes.

#### Scenario: Query with valid key
- GIVEN an enabled API key and rates for `156` on 2026-07-29
- WHEN the client calls public rates with that key, code `156`, and date `2026-07-29`
- THEN the response is 200 and includes the rate data

#### Scenario: Invalid key rejected
- GIVEN a missing, wrong, or disabled API key
- WHEN the client calls public rates
- THEN the system returns 401 `Auth.InvalidApiKey`

### Requirement: API Key Administration
Authenticated admins MUST be able to create, list, enable/disable, and delete API keys.
The plaintext key MUST be returned only once at creation time; the server MUST store only a hash (and optional prefix).

#### Scenario: Create key shows plaintext once
- GIVEN an authenticated admin
- WHEN the admin creates an API key named `etl`
- THEN the response includes the full plaintext key
- AND subsequent list responses MUST NOT include the full plaintext key

#### Scenario: Disabled key cannot query
- GIVEN a previously working API key that has been disabled
- WHEN it is used on public rates
- THEN the system returns 401

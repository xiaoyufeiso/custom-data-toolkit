# Delta for Currency

## ADDED Requirements

### Requirement: Currency List Rate Count

Each item returned by the authenticated admin currency list MUST include `rateCount`, a non-negative integer equal to the number of all `rate` rows associated with that currency.
The currency management list MUST display this value.
The count MUST NOT be clickable or navigate to the rate page in this change.

#### Scenario: Currency with rates shows total count

- GIVEN a currency has 7 associated rate rows across checked and unchecked states
- WHEN the admin lists currencies
- THEN that currency item has `rateCount: 7`
- AND the list displays `7`

#### Scenario: Currency without rates shows zero

- GIVEN a currency has no associated rate rows
- WHEN the admin lists currencies
- THEN that currency item has `rateCount: 0`
- AND the list displays `0`

#### Scenario: Existing pagination and search remain unchanged

- GIVEN the admin applies the existing currency search and pagination
- WHEN the list is returned with `rateCount`
- THEN the same currencies are selected and ordered as before this change
- AND each returned item has its own accurate count

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

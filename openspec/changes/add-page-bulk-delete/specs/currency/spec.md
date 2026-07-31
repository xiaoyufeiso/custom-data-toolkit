# Delta for Currency

## ADDED Requirements

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

#### Scenario: Batch deletion requires admin write authentication

- GIVEN the request has no valid admin Session or CSRF token
- WHEN currency batch deletion is requested
- THEN the request is rejected with 401 or 403
- AND no currency is deleted

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

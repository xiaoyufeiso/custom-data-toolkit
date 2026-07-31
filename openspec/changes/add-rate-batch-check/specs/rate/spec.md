# Delta for Rate

## ADDED Requirements

### Requirement: Atomic Current-Page Rate Batch Check

Authenticated administrators MUST be able to submit 1 to 100 selected rate IDs to atomically mark them checked.
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

#### Scenario: Selection contains a missing rate

- GIVEN one selected rate no longer exists
- WHEN batch check is requested
- THEN the API returns 409 `BatchCheck.StaleSelection`
- AND `details.missingIds` identifies the missing ID
- AND no selected rate is updated

#### Scenario: Reject invalid batch IDs

- GIVEN the request has no IDs, duplicate IDs, invalid IDs, or more than 100 IDs
- WHEN batch check is requested
- THEN the API returns 422
- AND no rate is updated

#### Scenario: Batch check requires admin write authentication

- GIVEN the request has no valid admin Session or CSRF token
- WHEN batch check is requested
- THEN the request is rejected with 401 or 403
- AND no rate is updated

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

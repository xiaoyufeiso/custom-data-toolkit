# Delta for Rate

## ADDED Requirements

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

#### Scenario: Reject invalid batch size

- GIVEN the request contains no IDs, duplicate IDs, invalid IDs, or more than 100 IDs
- WHEN rate batch deletion is requested
- THEN the API returns 422
- AND no rate is deleted

#### Scenario: Batch deletion requires admin write authentication

- GIVEN the request has no valid admin Session or CSRF token
- WHEN rate batch deletion is requested
- THEN the request is rejected with 401 or 403
- AND no rate is deleted

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

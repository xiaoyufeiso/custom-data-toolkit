# Delta for API Key

## ADDED Requirements

### Requirement: API Key Name and Status Filtering

Authenticated administrators MUST be able to filter API Keys by optional name and enabled status.
Name filtering MUST trim surrounding whitespace and use case-insensitive contains matching.
When both filters are provided, the system MUST apply them with AND semantics.
API Key list responses MUST NOT expose plaintext keys.

#### Scenario: Filter by partial name

- GIVEN API Keys named `etl-service` and `reporting`
- WHEN the administrator filters by name `ETL`
- THEN the result includes `etl-service`
- AND the result excludes `reporting`

#### Scenario: Filter by status

- GIVEN enabled and disabled API Keys exist
- WHEN the administrator filters for disabled keys
- THEN only disabled keys are returned

#### Scenario: Combine name and status

- GIVEN API Keys vary by name and status
- WHEN both name and enabled filters are supplied
- THEN only records matching both filters are returned

#### Scenario: Blank name does not filter

- GIVEN the name filter contains only whitespace
- WHEN the list is requested
- THEN the name filter is treated as absent

### Requirement: Atomic Current-Page API Key Batch Delete

Authenticated administrators MUST be able to submit 1 to 100 selected API Key IDs for atomic batch deletion.
Deleting API Keys MUST immediately invalidate those credentials.
The existing single-key delete API MUST remain available.

#### Scenario: Delete selected API Keys

- GIVEN the administrator selects API Keys on the current page
- AND every selected key still exists
- WHEN the administrator confirms batch deletion
- THEN all selected keys are deleted in one transaction
- AND the API returns 204
- AND those credentials can no longer access public endpoints

#### Scenario: Selection contains a missing API Key

- GIVEN one selected API Key no longer exists
- WHEN batch deletion is requested
- THEN the API returns 409 `BatchDelete.StaleSelection`
- AND the response identifies the missing ID
- AND no selected API Key is deleted

#### Scenario: Reject invalid batch size

- GIVEN the request contains no IDs, duplicate IDs, invalid IDs, or more than 100 IDs
- WHEN API Key batch deletion is requested
- THEN the API returns 422
- AND no API Key is deleted

#### Scenario: Batch deletion requires admin write authentication

- GIVEN the request has no valid admin Session or CSRF token
- WHEN API Key batch deletion is requested
- THEN the request is rejected with 401 or 403
- AND no API Key is deleted

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

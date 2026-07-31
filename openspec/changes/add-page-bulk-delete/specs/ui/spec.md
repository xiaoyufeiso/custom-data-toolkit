# Delta for UI

## ADDED Requirements

### Requirement: Current-Page Row Selection for Destructive Actions

The currency, rate, and API Key management lists MUST use BizTable row selection for destructive batch actions.
Selection and confirmation controls MUST use approved tendata-ui components.

#### Scenario: Select individual rows

- GIVEN an administrator is viewing a management list
- WHEN one or more current-page rows are checked
- THEN the page-top delete button shows the selected count
- AND the delete button is enabled

#### Scenario: Select all applies only to the current page

- GIVEN the current page contains selectable rows
- WHEN the administrator uses the table select-all control
- THEN only rows on the current page are selected
- AND records on other pages are not selected

#### Scenario: Selection is cleared when result context changes

- GIVEN one or more rows are selected
- WHEN the administrator changes page, page size, applied filters, or refreshes the list
- THEN the previous selection is cleared
- AND the delete button becomes disabled

### Requirement: Batch Delete Uses a Page-Top Confirmed Action

Delete actions for currency, rate, and API Key lists MUST be placed in the page-top action area rather than each row's operation column.
The action MUST identify the selected count and require explicit confirmation.

#### Scenario: No selected rows

- GIVEN no rows are selected
- WHEN the page is rendered
- THEN the page-top batch delete button is disabled
- AND no per-row delete action is shown

#### Scenario: Confirm irreversible batch deletion

- GIVEN rows are selected
- WHEN the administrator activates the page-top delete action
- THEN a tendata-ui confirmation interaction shows the selected count
- AND it states that deletion cannot be undone
- AND no request is sent until the administrator confirms

#### Scenario: Successful deletion refreshes a valid page

- GIVEN selected rows are deleted successfully
- WHEN the current page still has rows
- THEN selection is cleared and the current page is refreshed
- AND if the current page becomes empty and is not page 1, the previous page is loaded

#### Scenario: Atomic deletion fails

- GIVEN the server rejects the batch because a record is blocked or stale
- WHEN the error is returned
- THEN the UI reports that no selected record was deleted
- AND it displays the server-provided user message without appending the error code

### Requirement: API Key Filter Controls Use Approved Components

The API Key page MUST use tendata-ui controls for name and enabled-status filtering.
All new user-facing text MUST use the existing react-intl infrastructure.

#### Scenario: Apply API Key filters

- GIVEN the administrator enters a name and selects a status
- WHEN filters are applied
- THEN the list is refreshed with both filters
- AND pagination returns to page 1
- AND any previous row selection is cleared

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

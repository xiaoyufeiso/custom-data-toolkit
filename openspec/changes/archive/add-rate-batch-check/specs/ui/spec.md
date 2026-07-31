# Delta for UI

## ADDED Requirements

### Requirement: Rate Filters and Batch Actions Are Separate

The rate management page MUST render filter controls and selection-dependent batch actions in separately labeled sections of one white module above the table.

#### Scenario: Page layout distinguishes action types

- GIVEN the rate page is rendered
- THEN the page title action contains only “新建汇率”
- AND a “筛选条件” region contains code, date, status, filter, and reset controls
- AND a “批量操作” section directly below it contains a current-page select control, selected count, batch check, and batch delete

#### Scenario: Batch action region is stable

- GIVEN no rate is selected
- THEN the batch action region remains visible
- AND it shows “已选择 0 项”
- AND batch check and batch delete are disabled
- AND batch check uses the default gray disabled appearance until a row is selected

#### Scenario: Reset rate filters

- GIVEN one or more filters or non-default date sorting are applied
- WHEN the administrator activates reset
- THEN code is empty
- AND date and status return to their “全部” placeholders
- AND date sorting returns to its default
- AND pagination returns to page 1
- AND previous row selection is cleared

### Requirement: Batch Check Uses a Confirmed Table Action

The rate page MUST offer a secondary batch-check action for selected current-page rows.

#### Scenario: Confirm batch check

- GIVEN one or more current-page rates are selected
- WHEN the administrator activates “批量核对”
- THEN a centered tendata-ui confirmation displays the selected count
- AND no request is sent before confirmation

#### Scenario: Cancel batch check

- GIVEN the confirmation is open
- WHEN the administrator cancels
- THEN no batch-check request is sent
- AND selection is preserved

#### Scenario: Batch check succeeds

- GIVEN the administrator confirms a valid selection
- WHEN the API returns 204
- THEN the page reports success
- AND selection is cleared
- AND the current valid page is refreshed

#### Scenario: Batch check has a stale selection

- GIVEN the API returns `BatchCheck.StaleSelection`
- WHEN the error is handled
- THEN the server-provided message is displayed without appending the code
- AND selection is cleared
- AND the list is refreshed

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

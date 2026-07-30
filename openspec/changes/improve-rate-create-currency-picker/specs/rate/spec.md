# Delta for Rate（新建汇率 — 货币选择器）

## ADDED Requirements

### Requirement: Create-Rate Currency Picker with Code Initial Index
When an authenticated admin opens the **create rate** form, the system MUST present a currency picker that:

- Loads **all** currencies available via the existing admin `GET /currencies` pagination API (client MAY issue multiple page requests; MUST NOT rely on a new sort-specific endpoint for this requirement);
- Sorts and groups options by the first character of `code` (case-insensitive; display grouping MUST use uppercase Latin letters where applicable);
- Places currencies with **null/empty** `code` into a `#` group;
- Replaces the native HTML select with a **custom** dropdown panel that includes a **right-hand letter index**;
- When the admin clicks a letter (or `#`) on the index, MUST scroll the option list to the corresponding group section.
- Option labels MUST display as `code (name)` when `code` is present (e.g. `CNY (人民币)`); when `code` is null/empty, MUST display the name only.
- The option list MUST support mouse-wheel scrolling; the list scrollbar MAY be hidden. The right-hand letter index MUST remain visible.

Selecting a currency MUST still bind to the existing create-rate `currencyId` field and MUST NOT change create-rate API request/response contracts.
The picker scope MUST be limited to the create-rate form (MUST NOT be required on currency list page or rate filter controls by this requirement).

#### Scenario: Options sorted by code initial
- GIVEN the admin is on the create rate form
- AND currencies exist with codes `USD`, `CNY`, and `EUR`
- WHEN the currency picker options are shown
- THEN the options are ordered by `code` initial (e.g. `C` then `E` then `U` groups)
- AND within the same initial, options are ordered by full `code` ascending

#### Scenario: Currencies without code go to hash group
- GIVEN a currency with empty or null `code` and name `历史币种`
- WHEN the currency picker options are shown
- THEN that currency appears under the `#` group

#### Scenario: Letter index scrolls to section
- GIVEN the picker is open and there is at least one currency whose `code` starts with `C`
- WHEN the admin clicks `C` on the right-hand index
- THEN the option list scrolls so the `C` section is brought into view

#### Scenario: All currencies loaded beyond one page
- GIVEN total currencies exceed one `pageSize` page of `GET /currencies`
- WHEN the admin opens the create rate currency picker
- THEN currencies from all pages are available in the picker (not truncated to the first page only)

#### Scenario: Option label shows code then name
- GIVEN a currency with name `人民币` and code `CNY`
- WHEN the currency picker options are shown
- THEN the option label is `CNY (人民币)`

#### Scenario: Create rate API unchanged
- GIVEN the admin selects a currency from the new picker and submits a valid create rate form
- WHEN the client calls the existing create rate API
- THEN the request still uses `currencyId` (and other existing fields) with no new required fields for this change

## MODIFIED Requirements

（无。本变更不修改既有 Admin Rate Management / Public Rate 的 API 语义。）

## REMOVED Requirements

（无。）

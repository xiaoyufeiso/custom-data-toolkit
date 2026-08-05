# Delta for UI

## ADDED Requirements

### Requirement: Core Admin Pages Use Approved UI Components

The currency, rate, and API Key management pages MUST use `@tendata-biz-components/biz-table` for business lists and `tendata-ui Pagination` for pagination.
Generic buttons, selects, date inputs, checkboxes, forms, dialogs, confirmations, loading states, and empty states MUST prefer available tendata-ui components rather than custom equivalents.
The pages MUST use the component library default theme; custom styles MUST be limited to layout and domain-specific behavior.

#### Scenario: Currency page uses consistent list and form components

- GIVEN the admin opens currency management
- WHEN the list and create/edit interactions are rendered
- THEN the list uses BizTable and component-library pagination
- AND create/edit uses a tendata-ui Modal and form controls
- AND delete confirmation does not use the browser `window.confirm`

#### Scenario: Rate page preserves behavior after component replacement

- GIVEN the admin opens rate management
- WHEN the admin filters, paginates, sorts, creates, edits, or deletes a rate
- THEN tendata-ui/BizTable components provide the UI
- AND existing request parameters and business results remain unchanged

#### Scenario: API Key plaintext remains one-time

- GIVEN the admin creates an API Key from the component-library Modal
- WHEN creation succeeds
- THEN the plaintext key is shown only in that creation interaction
- AND closing it removes the plaintext from UI state
- AND later list responses and views do not reveal the plaintext

### Requirement: Indexed Currency Picker Uses Library Primitives

The create-rate currency picker MUST preserve its confirmed indexed navigation behavior while using tendata-ui primitives for generic controls and visual states.

#### Scenario: Indexed picker behavior is preserved

- GIVEN currencies span multiple code initials
- WHEN the admin opens the create-rate currency picker
- THEN options remain grouped and sorted by code initial
- AND the right-hand index contains only groups with data
- AND clicking an initial scrolls to that group
- AND selecting an option still supplies the existing `currencyId`

### Requirement: Scoped Internationalization and Accessibility

After the large page-level component replacements, user-facing text in the currency, rate, API Key, and login pages MUST use the existing `react-intl` infrastructure.
Form fields MUST have complete labels, interactive controls MUST have discernible names, and dialogs/tables MUST retain appropriate component-provided accessibility semantics.

#### Scenario: Scoped pages pass accessibility and localization checks

- GIVEN one of the scoped pages is rendered
- WHEN labels, buttons, dialogs, inputs, and empty/loading states are inspected
- THEN user-facing text comes from locale messages
- AND controls have complete accessible names and labels

## MODIFIED Requirements

### Requirement: Core Page Interaction Container

New and edit flows for currency, rate, and API Key management MUST use Modal dialogs instead of page-inline form Cards.

## REMOVED Requirements

（无。）

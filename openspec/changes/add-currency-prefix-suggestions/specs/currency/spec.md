# Delta for Currency

## ADDED Requirements

### Requirement: Currency Prefix Suggestions

The system MUST provide authenticated admins with bounded, case-insensitive prefix suggestions from existing currencies.

For the currency management search input, a suggestion MUST match when the trimmed input is a prefix of either `name` or `code`.
For the rate management code filter, a suggestion MUST match only when the trimmed input is a prefix of `code`.
Selecting a suggestion MUST fill the corresponding input and MUST NOT automatically execute the search.
The existing substring behavior of `GET /currencies?q=` MUST remain unchanged.
The system MUST return at most 10 suggestions.
Exact matches MUST sort before code-prefix matches, followed by name-prefix matches.
Suggestions in the same group MUST use stable case-insensitive code/name ordering.
The dropdown MUST support vertical mouse-wheel scrolling without horizontal scrolling.

#### Scenario: Currency page recommends by name prefix

- GIVEN currencies named `人民币` and `人民币（离岸）`
- WHEN the admin types the prefix `人民` in the currency search input
- THEN both matching currencies are offered as bounded suggestions

#### Scenario: Currency page recommends by code prefix ignoring case

- GIVEN currencies with codes `CNY` and `CNH`
- WHEN the admin types `cn`
- THEN both currencies are offered as suggestions

#### Scenario: Rate page recommends only by code prefix

- GIVEN a currency named `人民币` with code `CNY`
- WHEN the admin types `CN` in the rate code filter
- THEN that currency is offered
- WHEN the admin types `人民`
- THEN it is not offered by the code-only suggestion mode

#### Scenario: Selecting suggestion does not search

- GIVEN the suggestion list is visible
- WHEN the admin selects `CNY`
- THEN the input value becomes `CNY`
- AND the existing result list is not refreshed until the admin explicitly searches

#### Scenario: Recommendations are bounded and ordered

- GIVEN exact, code-prefix, and name-prefix matches exist
- WHEN recommendations are requested
- THEN exact matches appear first
- AND remaining code-prefix matches appear before name-prefix matches
- AND no more than 10 items are returned

#### Scenario: Recommendation dropdown scrolls vertically

- GIVEN the recommendation results exceed the dropdown's visible height
- WHEN the admin uses the mouse wheel over the dropdown
- THEN the options scroll vertically
- AND no horizontal scrolling is required

## MODIFIED Requirements

（无。）

## REMOVED Requirements

（无。）

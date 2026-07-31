# Delta for Currency

## ADDED Requirements

### Requirement: Duplicate Currency Name Soft Warning

The system MUST warn authenticated admins about existing currencies with the same name while continuing to allow duplicate names.

Names MUST be considered identical after trimming surrounding whitespace and comparing case-insensitively.
Name-prefix recommendations MUST use prefix matching only.
In edit mode, the current currency MUST be excluded from recommendations, counts, and duplicate-save checks.

#### Scenario: Selected recommendation shows same-name count

- GIVEN three existing currencies have the same normalized name `人民币`
- WHEN the admin selects the recommended name `人民币`
- THEN the form shows subdued helper text `已存在 3 条同名货币`

#### Scenario: Count is shown only after selecting recommendation

- GIVEN currencies with names matching the typed prefix
- WHEN the admin types a name but does not select a recommendation
- THEN the same-name count helper is not shown

#### Scenario: Editing excludes current currency

- GIVEN the admin edits a currency named `人民币`
- AND one other currency has the same normalized name
- WHEN the admin selects the recommendation `人民币`
- THEN the helper text says `已存在 1 条同名货币`

#### Scenario: Duplicate name can still be saved

- GIVEN at least one other currency has the same normalized name
- WHEN the admin attempts to create or update the currency
- THEN the UI asks for explicit confirmation
- AND when the admin confirms, the existing create or update request proceeds
- AND when the admin cancels, no write request is sent

#### Scenario: Manually typed duplicate is checked at save

- GIVEN the admin manually types a complete duplicate name without selecting a recommendation
- WHEN the admin attempts to save
- THEN the UI still asks for explicit confirmation

## MODIFIED Requirements

（无。货币名称仍不唯一。）

## REMOVED Requirements

（无。）

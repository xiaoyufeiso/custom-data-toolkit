# Delta: Customs Dict Import/Export

## ADDED Requirements

### Requirement: Shared XLSX Schema for Mapping Import/Export

Standard dictionary export/import MUST use the same header row as missing export:
`字典类型编码`, `字典类型名称`, `原始值`, `出现次数`, `标准值`, `备注`.
Import MUST require dict type code, raw value, and standard value (trimmed, non-empty).
Import MUST ignore type label, occurrence count, and remark columns.
Import MUST NOT automatically remove members from the missing ZSET.

#### Scenario: Round-trip export then import updates standard value
- GIVEN an enabled mapping exists
- WHEN the admin exports mappings, changes the standard value in the file, and imports
- THEN the mapping's standard value is updated
- AND Redis formal Hash is synced incrementally when sync succeeds

#### Scenario: Import creates new mapping from filled missing export
- GIVEN a row with valid type, raw value, and standard value not already in MySQL
- WHEN the admin imports the file on the standard dictionary page
- THEN a new enabled mapping is created with source `import`
- AND the missing ZSET member is NOT removed by import alone

#### Scenario: Bad rows do not block other rows
- GIVEN a file with one invalid row and one valid row
- WHEN import runs
- THEN the valid row is applied
- AND the invalid row appears in the failed errors list

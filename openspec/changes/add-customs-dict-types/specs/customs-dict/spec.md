## MODIFIED Requirements

### Requirement: Dictionary Types Are Manageable

The system MUST store dictionary types in application table `customs_dict_type` with unique `code`, display `name`, and `enabled`.
The system MUST seed `country` and `continent` on migration.
Administrators MUST be able to create types, rename (`name` only), enable, and disable types.
`code` MUST be immutable after create.
Disable MUST be rejected with 409 when any mapping row exists for that code (including disabled mappings).
The system MUST NOT physically delete types.
Write paths for mappings, missing handle, and import MUST accept only existing **enabled** types.
Standard/missing UI type selectors MUST load enabled types from API (MUST NOT hardcode country/continent only).
Redis formal/missing keys remain `customs:{code}:dict` and `customs:{code}:dict:missing`.

#### Scenario: Create type and use in mapping
- GIVEN an authenticated admin
- WHEN the admin creates type `port` with a name and then creates a mapping with dictType `port`
- THEN the mapping is accepted
- AND Redis HSET uses key `customs:port:dict`

#### Scenario: Disable blocked when mappings exist
- GIVEN type `country` has at least one mapping row
- WHEN the admin disables that type
- THEN the API returns 409 `CustomsDictType.HasMappings`
- AND the type remains enabled

#### Scenario: Options exclude disabled types
- GIVEN type `port` is disabled and has zero mappings
- WHEN the admin requests type options
- THEN `port` is not listed
- AND creating a mapping with `port` returns 400 `CustomsDict.InvalidType`

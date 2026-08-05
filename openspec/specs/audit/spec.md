# Audit Specification

> 权威层：管理端操作审计。来源：`add-admin-audit-log`（2026-08-05 归档）。UI 细节见 `openspec/specs/ui.md`。

## Requirements

### Requirement: Record Impactful Admin Writes
The system MUST append an audit log row after a successful mutating admin operation in scope:
currency, rate, customs-dict (types/mappings/import/batch/resync/enable-disable, missing handle),
api-keys writes, admin-users writes, and `POST /auth/change-password`.
The system MUST NOT record login, logout, read-only GETs, dictionary export, or import-template download.
Failed or forbidden requests MUST NOT create audit rows.
`summary` MUST NOT contain passwords or API Key plaintext.
Batch APIs MUST produce exactly one audit row per request.
Audit write failure MUST NOT fail the primary business request.

#### Scenario: Currency create is audited
- GIVEN an authenticated admin
- WHEN the admin successfully creates a currency
- THEN `GET /audit-logs` includes a row with action `currency.create`

#### Scenario: Batch delete is one row
- GIVEN an authenticated admin
- WHEN the admin successfully batch-deletes N rates
- THEN exactly one audit row is created with resource count N

#### Scenario: Change password is audited without secrets
- GIVEN an authenticated viewer
- WHEN the viewer successfully changes password
- THEN an audit row with action `auth.change_password` exists
- AND `summary` does not contain password fields

### Requirement: Audit Log Read API
Authenticated administrators with role `admin` MUST be able to list and get audit logs.
Viewer and unauthenticated callers MUST NOT access audit-log APIs (viewer: 403 `AdminUser.Forbidden`; unauthenticated: 401).
There MUST be no write/delete audit-log endpoints for MVP.

#### Scenario: Viewer cannot list audit logs
- GIVEN an authenticated viewer
- WHEN the viewer calls `GET /audit-logs`
- THEN the API returns 403 `AdminUser.Forbidden`

### Requirement: Audit Log UI
The admin UI MUST provide a sidebar「系统管理」group with `/audit-logs` visible only to admin.
Viewer MUST NOT see the system management group.
The list MUST show columns: time, actor, action (no separate actions column).
Clicking the action label MUST open a read-only detail drawer.

#### Scenario: Viewer has no system menu
- GIVEN an authenticated viewer
- WHEN the sidebar is rendered
- THEN neither user management nor audit logs entries are shown

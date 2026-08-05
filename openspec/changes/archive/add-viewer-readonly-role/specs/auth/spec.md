# Delta: Viewer Readonly Role

## MODIFIED Requirements

### Requirement: Admin User Administration
Authenticated administrators with role `admin` MUST be able to list, create, update role/enabled, and reset passwords for admin users.
Role MUST be one of `admin` or `viewer`.
Users MUST NOT be physically deleted; disable (`enabled=false`) MUST prevent login and invalidate all sessions for that user.
The system MUST reject disabling oneself and MUST reject disabling or demoting the last enabled admin.
Username MUST be immutable after create.
Viewer role MUST NOT access user-management APIs or UI.
Business write APIs (currency/rate/customs-dict mutations, API keys, import) MUST be available only to `admin`.
Business read APIs and customs-dict export MUST be available to both `admin` and `viewer`.

#### Scenario: Admin creates viewer
- GIVEN an authenticated admin
- WHEN the admin creates a user with role `viewer` and a password
- THEN the user can log in
- AND `/auth/me` returns role `viewer`

#### Scenario: Viewer cannot manage users
- GIVEN an authenticated viewer
- WHEN the viewer calls `GET /admin-users`
- THEN the API returns 403 `AdminUser.Forbidden`

#### Scenario: Viewer cannot write business data
- GIVEN an authenticated viewer
- WHEN the viewer calls `POST /currencies` or other business write endpoints
- THEN the API returns 403 `Auth.Forbidden`

#### Scenario: Viewer can export missing dictionary
- GIVEN an authenticated viewer
- WHEN the viewer calls `GET /customs-dict/missing/export`
- THEN the API returns 200 with an xlsx body

## ADDED Requirements

### Requirement: Writer Guard for Business Mutations
State-changing business admin endpoints MUST require role `admin`.
Import template download MUST require role `admin`.
Customs dictionary export endpoints MUST allow any authenticated enabled admin or viewer.

#### Scenario: Viewer blocked from import template
- GIVEN an authenticated viewer
- WHEN the viewer calls `GET /customs-dict/mappings/import-template`
- THEN the API returns 403 `Auth.Forbidden`

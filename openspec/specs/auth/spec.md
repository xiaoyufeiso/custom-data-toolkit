# Auth Specification

> 权威层：管理端 Session + CSRF、角色与用户管理。来源：`add-currency-rate-mgmt`（2026-07-31）+ `add-admin-user-mgmt` / `add-viewer-readonly-role`（2026-08-05 归档）。

## Requirements

### Requirement: Admin Session Login
The system MUST allow a pre-provisioned administrator to log in with username and password and receive an HttpOnly session cookie.
Login MUST fail for disabled users using the same generic failure response as invalid credentials.
`GET /auth/me` MUST return `id`, `username`, `role`, and `enabled` without password.
The system MUST NOT provide self-service registration in MVP.

#### Scenario: Successful login
- GIVEN a valid enabled admin account
- WHEN the user submits correct credentials to `POST /api/v1/auth/login`
- THEN a session cookie is set
- AND `GET /api/v1/auth/me` returns the admin profile including role and enabled

#### Scenario: Failed login
- GIVEN invalid credentials
- WHEN the user attempts login
- THEN the system returns 401
- AND the error MUST NOT reveal whether the username exists

### Requirement: CSRF Protection for Admin Writes
All admin state-changing requests MUST include a valid CSRF token bound to the session, except where `docs/api.md` explicitly documents an exception.

#### Scenario: Missing CSRF on write
- GIVEN an authenticated admin session
- WHEN the client calls a write API without `X-CSRF-Token`
- THEN the system returns 403 with `Auth.CsrfFailed`

### Requirement: Logout
The system MUST allow the admin to logout and invalidate the current session only.

#### Scenario: Logout
- GIVEN an authenticated session
- WHEN the user calls logout
- THEN subsequent admin API calls with that cookie return 401

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

#### Scenario: Disable user blocks login and sessions
- GIVEN an enabled user with an active session
- WHEN an admin sets `enabled=false`
- THEN that user's sessions are invalidated
- AND subsequent login with correct password fails with the same generic login-failed response as wrong password

#### Scenario: Cannot disable last admin
- GIVEN only one enabled admin remains
- WHEN an admin attempts to disable or demote that user
- THEN the API returns 409 `AdminUser.LastAdmin`

### Requirement: Writer Guard for Business Mutations
State-changing business admin endpoints MUST require role `admin`.
Import template download MUST require role `admin`.
Customs dictionary export endpoints MUST allow any authenticated enabled admin or viewer.

#### Scenario: Viewer blocked from import template
- GIVEN an authenticated viewer
- WHEN the viewer calls `GET /customs-dict/mappings/import-template`
- THEN the API returns 403 `Auth.Forbidden`

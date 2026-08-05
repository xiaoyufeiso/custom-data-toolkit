# Delta: Admin User Management

## ADDED Requirements

### Requirement: Admin User Administration
Authenticated administrators with role `admin` MUST be able to list, create, update role/enabled, and reset passwords for admin users.
Role MUST be one of `admin` or `operator`.
Users MUST NOT be physically deleted; disable (`enabled=false`) MUST prevent login and invalidate all sessions for that user.
The system MUST reject disabling oneself and MUST reject disabling or demoting the last enabled admin.
Username MUST be immutable after create.
Operator role MUST NOT access user-management APIs or UI.
Business admin APIs (currency/rate/customs-dict) MUST remain available to both `admin` and `operator`.

#### Scenario: Admin creates operator
- GIVEN an authenticated admin
- WHEN the admin creates a user with role `operator` and a password
- THEN the user can log in
- AND `/auth/me` returns role `operator`

#### Scenario: Operator cannot manage users
- GIVEN an authenticated operator
- WHEN the operator calls `GET /admin-users`
- THEN the API returns 403 `AdminUser.Forbidden`

#### Scenario: Disable user blocks login and sessions
- GIVEN an enabled user with an active session
- WHEN an admin sets `enabled=false`
- THEN that user's sessions are invalidated
- AND subsequent login with correct password fails with the same generic login-failed response as wrong password

#### Scenario: Cannot disable last admin
- GIVEN only one enabled admin remains
- WHEN an admin attempts to disable or demote that user
- THEN the API returns 409 `AdminUser.LastAdmin`

## MODIFIED Requirements

### Requirement: Admin Session Login
The system MUST allow a pre-provisioned administrator to log in with username and password and receive an HttpOnly session cookie.
Login MUST fail for disabled users using the same generic failure response as invalid credentials.
`GET /auth/me` MUST return `id`, `username`, `role`, and `enabled` without password.
The system MUST NOT provide self-service registration.

#### Scenario: Successful login
- GIVEN a valid enabled admin account
- WHEN the user submits correct credentials to `POST /api/v1/auth/login`
- THEN a session cookie is set
- AND `GET /api/v1/auth/me` returns the admin profile including role and enabled

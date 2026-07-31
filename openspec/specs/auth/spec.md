# Auth Specification

> 权威层：管理端 Session + CSRF。来源：`add-currency-rate-mgmt`（2026-07-31 归档）。

## Requirements

### Requirement: Admin Session Login
The system MUST allow a pre-provisioned administrator to log in with username and password and receive an HttpOnly session cookie.
The system MUST NOT provide self-service registration in MVP.

#### Scenario: Successful login
- GIVEN a valid bootstrap admin account
- WHEN the user submits correct credentials to `POST /api/v1/auth/login`
- THEN a session cookie is set
- AND `GET /api/v1/auth/me` returns the admin profile without password

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

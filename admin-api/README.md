# AIBawaal Admin API — Phase 5A

Separate, authenticated Fastify service. This is **not** an extension of the public read-only API. No automated production migrations or admin bootstrap.

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/health` | Public liveness |
| GET | `/ready` | Private health, checks PostgreSQL |
| POST | `/api/v1/admin/auth/login` | Same-origin POST, IP rate limited, JSON `{email,password,remember?}` |
| GET | `/api/v1/admin/auth/session` | Authenticated, returns user, CSRF token and expiry |
| POST | `/api/v1/admin/auth/logout` | Authenticated, exact Origin and `X-CSRF-Token` |
| GET | `/api/v1/admin/overview` | `super_admin` only, real read-only counts/recent businesses/audit actions |

Login responses contain no passwords or session tokens. Authentication is an opaque 256-bit random cookie whose SHA-256 digest alone is stored in PostgreSQL. Cookies are `__Host-` prefixed, HttpOnly, Secure, SameSite=Strict, Path=/, no Domain. Default lifetime 8 hours; an explicit "keep me signed in" selection uses a seven-day absolute expiry. Sessions are revocable and checked against the administrator's current active status on every protected request. Logout requires a session-derived HMAC CSRF header and an exact configured Origin. Login also requires the exact Origin; only the admin web origin receives credentialed CORS responses. Each client IP is limited to five login attempts/minute in a single instance; email-digest audit history limits repeated failures across IPs to ten per fifteen minutes.

## Environment variables

| Name | Requirement |
|---|---|
| `ADMIN_DATABASE_URL` | Mandatory; separate least-privilege admin-service PostgreSQL role on Coolify private network, **not public API role** |
| `ADMIN_WEB_ORIGIN` | Mandatory; exact `https://admin.smartqr.liquifyplus.in` |
| `ADMIN_CSRF_SECRET` | Mandatory; base64-encoded random 32+ bytes from `openssl rand -base64 32` |
| `HOST` | Default `0.0.0.0` |
| `PORT` | Default `3000` |
| `TRUST_PROXY` | `1` only if behind one trusted Coolify proxy; do not expose container port directly |
| `LOG_LEVEL` | Default `info` |

Never place these secrets in the React app, source code, GitHub Actions production secrets or logs. Use Coolify's runtime secret store. Use TLS at the Coolify proxy, require HTTPS for both admin web/API origins, and keep PostgreSQL private. Rate limiting uses local memory; run **one admin-api replica** until a distributed limiter is implemented.

### PostgreSQL privileges

Provision a **dedicated** admin API role with `USAGE` on `public`, `SELECT` on `admin_users`, `admin_sessions`, `businesses`, `business_locations`, `qr_codes`, `audit_logs`, `INSERT` on `admin_sessions` and `audit_logs`, and `UPDATE (revoked_at)` on `admin_sessions`. The bootstrap role is separate and can insert an initial `admin_users` record. Do not reuse the existing public API's read-only login. Make schema grants through an approved DBA operation, not at application startup.

## Local isolated database tests

Use a disposable PostgreSQL 16 database named `test_*` or `*_test`. **Never** set `TEST_DATABASE_URL` to the production database or its server.

```bash
npm ci --prefix database
npm ci --prefix admin-api
npm run typecheck --prefix admin-api
TEST_DATABASE_URL='postgresql://localhost:5432/smartqr_admin_test' npm test --prefix admin-api
npm run build --prefix admin-api
```

The integration suite applies migrations **only** against the supplied isolated `TEST_DATABASE_URL`. Existing production migration tooling remains unchanged.

## One-time bootstrap

Only after separately approving production provisioning, use a dedicated **bootstrap** database role with `ADMIN_BOOTSTRAP_DATABASE_URL` and permission to read/insert `admin_users`. Prepare a private password file (0600) containing a strong 12+ character password; never put it on the command line or into committed files. Provide `ADMIN_BOOTSTRAP_EMAIL` and set `ADMIN_BOOTSTRAP_CONFIRM=CREATE_INITIAL_SUPER_ADMIN` to explicitly authorize the one-time operation.

```bash
ADMIN_BOOTSTRAP_CONFIRM=CREATE_INITIAL_SUPER_ADMIN \
ADMIN_BOOTSTRAP_DATABASE_URL='postgresql://bootstrap-role:SECRET@private-postgres:5432/smart_ai_qr_prod' \
ADMIN_BOOTSTRAP_EMAIL='your-operator@example.com' \
ADMIN_BOOTSTRAP_PASSWORD_FILE=/run/secrets/first-admin-password \
node ../dist/admin-api/src/bootstrap.js
```

Run this command **inside the built admin API container** using a temporary, explicitly authorized provisioning job and a mounted secret file. Development/source checkouts may use `npm run bootstrap --prefix admin-api` after installing dev dependencies; the production Docker runtime intentionally does not contain `tsx`.

This is a reference command, **not executed**. Supply URLs via a secret store instead of entering them in shell history. The CLI obtains a PostgreSQL advisory transaction lock and rejects bootstrapping when any administrator exists. Remove the bootstrap credentials and password file after success. There are no hardcoded accounts.

## Coolify separate application (manual)

Create a new application from the repository; Docker build context `/`, Dockerfile `/admin-api/Dockerfile`, internal port `3000`, hostname `https://admin-api.smartqr.liquifyplus.in`, health `/ready`. Set all runtime secrets; verify the private PostgreSQL connection and role grants first. Use the managed Coolify HTTPS reverse proxy with `TRUST_PROXY=1` only when the incoming connection is through its trusted single hop. Do not publish PostgreSQL port 5432 or modify shared Coolify proxy settings. Do not run migrations or bootstrap in Docker build/start scripts. Keep the admin API separate from the public Fastify service. Roll back by redeploying the previous reviewed admin-api image; no database schema changes are required for Phase 5A.

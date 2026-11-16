# Smart AI QR — PostgreSQL foundation

This directory is isolated from the existing React/Vite frontend. It contains PostgreSQL/Drizzle table definitions, an initial versioned SQL migration, a repeatable demonstration-data seed, a business-configuration mapper, deterministic phrase inheritance, and database tests. No API, admin dashboard, credentials, or customer-authored reviews are stored.

## Requirements

Node.js 22, PostgreSQL 16 or newer, and a separate database with restricted application credentials. Never run tests against production or an existing Coolify application database. Do not expose port 5432 publicly.

```sh
cd database
npm ci
npm run typecheck
DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/smart_ai_qr_staging' npm run migrate
DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/smart_ai_qr_staging' npm run seed
TEST_DATABASE_URL='postgres://TEST_USER:TEST_PASSWORD@HOST:5432/smart_ai_qr_test' npm test
```

Store connection strings in local environment variables or Coolify secrets; never commit `.env` files. The migration runner uses Drizzle's PostgreSQL migrator, tracks applied files in `drizzle.__drizzle_migrations`, and is rerunnable. `migrations/0000_database_foundation.sql` is the reviewed baseline migration; future schema changes must add a new numbered migration and update the journal rather than modifying an applied migration.

Seed uses the existing `src/config/business.ts` demo choices and `src/review/phrases.ts` phrase library. It inserts only missing records, leaves the demo destination unset, and never creates real admin accounts. Asset `storage_key` values refer to source-controlled frontend files; a later API must map those keys to safe public URLs. No URLs are served by this database package.

QR identifiers must be generated with `randomBytes(24).toString('base64url')` or an equally secure CSPRNG at the time the future API creates them. The database enforces unique, base64url-shaped identifiers but cannot prove that every caller used a CSPRNG. Location and choice ownership are enforced with composite foreign keys. Business/industry/global phrase inheritance is resolved per phrase category. Inactive business records are rejected by the public configuration mapper.

Database tests fail closed unless `TEST_DATABASE_URL` points to a database named `test_*` or `*_test`, and refuse to use the exact `DATABASE_URL` value. Pull-request CI starts a temporary PostgreSQL 16 service and runs migration, seed, constraint, and phrase tests. Creating or applying staging migrations is a separate, explicit operation.

## Production migration preflight

The CLI entry point in `src/migrate.ts` reads **only** `process.env.DATABASE_URL` and passes that connection string directly to `createDatabase()`. The PostgreSQL connection pool is created with that single URL. Drizzle tracks migrations in the `drizzle.__drizzle_migrations` schema of that database. There is no automatic production URL, fallback hostname, or connection to any other database. The migration runner does **not** validate that the target is a staging or production database; the operator is responsible for verifying the host and database name before execution.

Before a first production migration, confirm the exact target database and approved maintenance window, take and verify a restorable backup, check that the database account has the necessary schema privileges, and inspect the pending SQL migration. Supply `DATABASE_URL` only through the runtime's secret configuration; do not paste credentials into a tracked file or terminal history. Execute `npm run migrate` separately and deliberately, not during app builds or in CI. The demo seed is a separate operation and is not automatically invoked by migration.

For isolated tests, use `TEST_DATABASE_URL` pointing to a dedicated database named `test_*` or `*_test`. The tests reject a matching `DATABASE_URL` string, but database names and hosts should still be verified to avoid accidentally testing against real data.

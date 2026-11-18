# Smart AI QR — Public Fastify API

The API is isolated from the existing React customer frontend. It reads the existing PostgreSQL schema through the Drizzle helpers under `database/src/`. It does not run migrations, seed data, create customer reviews, or provide administrator endpoints.

## Endpoints

| Method | Route | Response |
| --- | --- | --- |
| GET | `/health` | `200 {"status":"ok"}` without a DB call |
| GET | `/ready` | `200 {"status":"ok"}` if `SELECT 1` succeeds; otherwise `503` |
| GET | `/api/v1/public/businesses/:slug` | Public business config, enabled languages, deterministic phrase library |
| GET | `/api/v1/public/qr/:publicId` | Public business configuration scoped to active QR and its optional active location |
| GET | `/api/v1/public/assets/:id` | Public active-business image by opaque asset UUID |

The business response contains `business` (the established `BusinessConfig` shape), `languages`, and `phraseLibrary[language][rating]` with `opening`, `details`, `item`, and `closing` arrays. Ratings are `0`–`5`. The QR response adds `qr: {publicId, label}`. Inactive resources return `404`; invalid path identifiers return `400`. Database failures return generic `500` responses. No internal UUIDs (except opaque media IDs), database storage paths, sessions, admin records, or customer reviews are exposed.

The existing `resolvePhraseSet()` helper applies **business → industry → global** inheritance per phrase category, without generating or storing customer review text. The React review generator can continue using these arrays locally. The current frontend is **not connected** to this API by this PR.

Image URLs are constructed from verified database asset IDs and `PUBLIC_API_ORIGIN`. Image bytes are served only for active businesses/choices and safe files within `src/assets`. This stage supports source-controlled SVG/WebP/PNG/JPEG assets; hosted uploads and an asset CDN are future work. In particular, the API does not expose `storage_key` fields.

## Required environment

- `DATABASE_URL`: PostgreSQL connection string for a **least-privileged, read-only** account. It needs SELECT on `businesses`, `business_locations`, `business_choices`, `business_assets`, `review_settings`, `phrase_templates`, and `qr_codes`. No access to admin tables, migrations, or seed operations is required. Provision the account separately; no credentials are committed.
- `PUBLIC_API_ORIGIN`: canonical HTTPS origin used in absolute media URLs, e.g. `https://api.smartqr.liquifyplus.in`.
- `CORS_ORIGINS`: one or more comma-separated HTTPS origins allowed to read API responses from browsers, e.g. `https://smartqr.liquifyplus.in`.

Optional:

- `PORT=3000`, `HOST=0.0.0.0`, `LOG_LEVEL=info`
- `TRUST_PROXY=0`: set to `1` only when direct traffic to the container is blocked and the immediate trusted hop is Coolify's proxy (used for accurate IP rate limiting).
- `RATE_LIMIT_PER_MINUTE=90`: in-memory per-process limit; use shared storage when running more than one replica.
- `ASSET_ROOT=../src/assets`: path to the source-controlled assets, relative to the process working directory.

`DATABASE_URL` is not a frontend `VITE_` setting. Store it as a Coolify runtime secret. Do not expose PostgreSQL port `5432` to the public network. CORS is an origin restriction for browsers, not authorization; public routes intentionally contain only published data.

## Local checks

Use Node.js 22 and a disposable PostgreSQL 16 database named `*_test` or `test_*`. The test script rejects `TEST_DATABASE_URL` equal to `DATABASE_URL` and never connects to production.

```sh
npm ci --prefix database
npm ci --prefix server
npm run typecheck --prefix server
TEST_DATABASE_URL='postgresql://USER:PASS@localhost:5432/smart_ai_qr_test' npm test --prefix server
npm run build --prefix server
```

To run locally, set `DATABASE_URL`, `PUBLIC_API_ORIGIN`, and `CORS_ORIGINS` in the runtime environment, then `npm run dev --prefix server`. The API does not automatically migrate or seed the database. The CI workflow provisions an ephemeral PostgreSQL 16 service, applies the existing migration to that test database, and runs the API tests, the previous review tests, and the frontend staging build.

## Coolify 4.7.5 — separate backend application

1. Create **a new application** in a separate Coolify project/environment. Select GitHub repository `liquifypluss/smart-ai-qr` and the reviewed backend branch after approval. Do not reuse or alter the current frontend application.
2. Choose **Dockerfile** as the build pack. Set **Base Directory** to `/` (repository root as Docker build context) and **Dockerfile Location** to `/server/Dockerfile`. The build needs access to `server/`, `database/src/`, and the existing public source assets.
3. Set **Ports Exposes / internal application port** to `3000` and set the application's domain to `https://api.smartqr.liquifyplus.in`. Do not publish a host port; use the existing Coolify reverse proxy and its HTTPS provisioning.
4. Create a separate read-only PostgreSQL role for the existing `smart_ai_qr_prod` database. Restrict it to the seven public tables listed above; deny write and admin-table privileges. Configure the private `DATABASE_URL` in the *new API application's* environment, plus `PUBLIC_API_ORIGIN` and `CORS_ORIGINS`.
5. Configure health path `/ready` on port `3000` (or rely on the Dockerfile `HEALTHCHECK`). Ensure the API container can reach the PostgreSQL private network; do not configure a public database route.
6. Disable automatic deployment until approval; deploy manually after PR merge and review of access grants and backups. Verify DNS A/AAAA for the API subdomain, a valid TLS certificate, `GET /health`, `GET /ready`, a known active business, invalid identifiers, asset loading, CORS, and that admin tables cannot be queried using the API database role.
7. Confirm the existing `https://smartqr.liquifyplus.in` frontend and all unrelated Coolify services are unchanged. This API PR does not modify any frontend routes or deploy services.

For image URLs, access may be cross-origin but does not require browser cookies. Proxy configuration is managed by Coolify; this application does not alter shared proxy settings. Keep the app at one replica until rate limiting is backed by shared storage.

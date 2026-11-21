# Phase 5B — AIBawaal Management API, Dashboard and Branded QR Codes

This is an **unmerged implementation proposal**. The current customer site, public API, PostgreSQL and Coolify resources must not be changed until an explicitly approved, separately scheduled migration and deployment.

## Architecture and relationships

- Keep `admin-api/` as the only administrative write API with Argon2id, server sessions, role-based `super_admin` authorization, Origin and CSRF protection on every mutation.
- Keep `admin/` as the separate React app using the approved Direction B tokens. Navigation: Overview, Businesses, Phrase Library, Activity. QR Codes are only inside business details.
- Reuse existing `businesses`, `business_locations`, `business_choices`, `review_settings`, `business_assets`, `qr_codes` and `audit_logs` tables.
- Add `phrase_libraries` with an optional exclusive `owner_business_id`, `phrase_library_assignments` with a composite business/library primary key, priorities and one default assignment per business, `phrase_templates.library_id` (nullable), and `qr_codes.template` (`signature`, `minimal`, `business`). Existing phrase records retain null `library_id`; no existing review content is copied or changed.
- Existing global/industry/business phrase rows remain separate. **Per section, precedence is explicit business override → active assigned libraries (priority ascending, all compatible phrases combined) → industry fallback → global fallback.** Inactive libraries and incompatible/exclusive assignments do not contribute. When no assignments exist, old resolution is unchanged.
- Shared library changes immediately affect assigned businesses after public API reads the updated rows. Deactivation removes that library from future review generation without deleting assignments or phrases.
- The DB migration uses a trigger to reject library assignment to the wrong exclusive owner or incompatible industry. Assignments and QR locations are also validated in the API; existing composite QR foreign keys still enforce location ownership.

## API endpoints

All paths start with `/api/v1/admin`. All GETs require an active Super Admin session. Every mutation additionally requires the exact approved HTTPS Origin and valid session CSRF token.

| Method | Endpoint | Action |
|---|---|---|
| GET/POST | `/businesses` | Search/paginate, create business |
| GET/PATCH | `/businesses/:id` | Details, edit or deactivate |
| POST/PATCH | `/businesses/:id/locations[/:childId]` | Add/update location |
| POST/PATCH | `/businesses/:id/choices[/:childId]` | Add/update/reorder/deactivate choice |
| PATCH | `/businesses/:id/review-settings` | Prompt and enabled languages |
| POST | `/businesses/:id/assets?kind=...&choiceId=...` | Validated upload to persistent volume |
| POST/PATCH | `/businesses/:id/qr-codes[/:childId]` | Generate/update/status/template |
| GET/POST | `/phrase-libraries` | Search, create library |
| GET/PATCH | `/phrase-libraries/:id` | Detail, edit or deactivate |
| POST | `/phrase-libraries/:id/duplicate` | Copy phrase records to an initially inactive library |
| POST/PATCH | `/phrase-libraries/:id/phrases[/:childId]` | Add/edit/deactivate phrase |
| POST/DELETE | `/businesses/:id/phrase-libraries[/:childId]` | Assign/unassign without copying phrases |
| GET | `/businesses/:id/review-preview` | Deterministic preview (not saved) |
| GET | `/activity` | Server-paginated audit history |

Inputs have Fastify JSON schemas and DB constraints. Business slugs, URLs, ownership, language, rating and phrase sort order are validated server-side. New public QR IDs use 24 random bytes (32 base64url characters), never internal UUIDs.

## Branded QR design

Three safe templates — Signature, Minimal and Business Branded — use actual QR matrices encoded at H error correction. Modules and finder patterns stay square and unchanged, with a four-module quiet zone. The design changes the perimeter, label and safe foreground; SVG is vector; PNG exports at 2160×2550px. The approved **AIBawaal name** is used, not an invented official logo asset (no separate official file exists in this repository). The customer URL is exactly `https://smartqr.liquifyplus.in/q/:publicId` (configure `VITE_CUSTOMER_ORIGIN` if changed). Test exports with multiple real device cameras before printing in bulk. Only active QR codes resolve publicly.

## Asset storage

- Admin API: `ADMIN_UPLOAD_DIR=/mnt/smartqr-assets/uploads` (private **persistent shared** filesystem); mount before allowing uploads. MIME whitelist JPEG/PNG/WebP; `@fastify/multipart` 3MB limit; Sharp decodes, strips metadata, resizes and rewrites WebP with a pixel limit. No uploaded SVG/HTML.
- Public API: `UPLOAD_ASSET_ROOT=/mnt/smartqr-assets/uploads` to read `uploads/{randomUUID}.webp` **only for public active-business/active-choice asset records**. Its existing source-controlled `src/assets` lookup remains unchanged.
- Both services must receive read/write access as appropriate. Never use an ephemeral app filesystem or expose the storage directory as a raw Nginx static folder. Add off-server backups and periodic orphan cleanup later; do not delete old files before successful DB updates.

## Coolify 4.7.5 — controlled rollout checklist

1. Review PR, migration and backup plan. **No production migration has been run.** Run migrations only with explicit approval, verified database backup and a correctly scoped migration role. PostgreSQL database name: `smart_ai_qr_prod` — never use it in CI.
2. Create a dedicated isolated staging PostgreSQL 16 database, apply `npm ci --prefix database && npm run migrate --prefix database` there, then run the disposable test suite. Do not point tests to the production DB.
3. Before production approval inspect the existing role grants from the server (`\dp` in psql); grants have **not** been inspected remotely by this task. For the admin service, minimum table permissions are SELECT, INSERT and UPDATE on businesses, locations, choices, QR codes, review settings, assets, libraries and phrase templates; additionally DELETE on `phrase_library_assignments` only; SELECT and INSERT on `audit_logs`; SELECT on admin_users/admin_sessions for authentication and only needed INSERT/UPDATE on admin_sessions. Avoid schema ownership or production DDL grants. The bootstrap role remains NOLOGIN.
4. The public API read-only role additionally needs SELECT on `phrase_libraries` and `phrase_library_assignments` after migration. Preserve all other existing public API read grants and credentials. Do not enable writes for the public API.
5. Migrate with a separate one-time migration job using an approved role. SQL migration: `database/migrations/0001_management_libraries.sql`. A manual, destructive down script is documented at `0001_management_libraries.down.sql`; never run it after creating live library data without a full backup and impact review.
6. Deploy the reviewed admin API image from `admin-api/Dockerfile` as a separate application, using internal port 3000 and `/ready`; mount persistent upload volume; supply `ADMIN_DATABASE_URL` (admin write account), `ADMIN_WEB_ORIGIN=https://admin.smartqr.liquifyplus.in`, `ADMIN_CSRF_SECRET`, `ADMIN_UPLOAD_DIR`, `TRUST_PROXY=1` only behind trusted proxy, optional `PORT`, `HOST`, `LOG_LEVEL`. Keep one replica until distributed throttling is implemented.
7. Deploy the public API image from `server/Dockerfile` only after review, with its existing read-only `DATABASE_URL`, public origin/CORS settings, plus the read-only `UPLOAD_ASSET_ROOT` mount. Its customer routes remain unchanged; verify Gadget Gallery and all legacy phrases after migration. The admin API and public API must have **distinct** DB roles.
8. Deploy the admin frontend from `admin/Dockerfile` at `admin.smartqr.liquifyplus.in` with build args `VITE_ADMIN_API_ORIGIN=https://admin-api.smartqr.liquifyplus.in`, `VITE_PUBLIC_API_ORIGIN=https://api.smartqr.liquifyplus.in`, and `VITE_CUSTOMER_ORIGIN=https://smartqr.liquifyplus.in`; internal port 8080; Nginx SPA fallback. No public customer frontend rebuild is needed.
9. Verify login/logout, CSRF, user role separation, business creation/edit, QR deactivation, QR scan on iPhone/Android, SVG/PNG downloads, language/rating previews, shared assignment propagation, image access and audit history from authorized test accounts before production use.

## Rollback

Application rollback: redeploy previous known-good admin frontend/admin API/public API revisions in Coolify. If the **additive** migration has already run, leaving the new unused tables/columns in place is safer than immediately dropping them; the previous app versions ignore them. Before any destructive schema reversal, first remove new library assignments and phrases, confirm business review behavior, and restore from verified backup if needed. Never rerun the demonstration seed against production as part of rollback.

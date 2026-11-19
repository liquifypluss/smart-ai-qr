# AIBawaal Super Admin — Phase 5A

Protected React 19 + Vite 7 application following the approved Direction B `MASTER.md` and design tokens. Not the public customer app.

## Functionality

Login, password visibility, remembered-session option, session validation/expiry, authenticated overview with **real database-backed counts**, recent businesses and audit events, mobile navigation drawer with Escape/focus return, and server-side logout. Unimplemented business/QR/phrase navigation is explicitly disabled. No mock authentication or fabricated metrics are included in the deployable app.

## Environment

`VITE_ADMIN_API_ORIGIN=https://admin-api.smartqr.liquifyplus.in` must be supplied **at build time**. This URL is public configuration, not a secret. Never set `ADMIN_DATABASE_URL`, CSRF secret, session tokens or password values as `VITE_*` environment variables.

## Build

```bash
npm ci --prefix admin
npm run typecheck --prefix admin
npm run build --prefix admin
```

## Coolify (manual approval only)

Create a separate Dockerfile-based frontend application from repository root with Dockerfile `admin/Dockerfile`, internal port `8080`, domain `https://admin.smartqr.liquifyplus.in`. Set Docker build argument `VITE_ADMIN_API_ORIGIN=https://admin-api.smartqr.liquifyplus.in` under Coolify build-time variables (not only runtime environment). The Dockerfile refuses to build without it. Set the public API origin before building. The static image uses private Nginx config and SPA fallback. Set the admin API `ADMIN_WEB_ORIGIN` to exactly this HTTPS origin and enable HTTPS on both. Verify login, logout, expired sessions, mobile drawer and CORS from the new subdomain before approving release. Roll back by redeploying the previous reviewed frontend image. Do not change the current customer website or public Fastify API.

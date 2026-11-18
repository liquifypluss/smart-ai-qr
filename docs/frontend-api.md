# Phase 4 — Dynamic customer review pages

The root `/` retains the local Gadget Gallery demonstration. `/b/:slug` and `/q/:publicId` load their configuration from the existing read-only Fastify public API. Unknown or inactive resources show a not-found state; network errors offer Retry and never fall back to the demo business. Editing, rewriting and copying remain in the browser and customer reviews are not sent to the API.

## Routes

| URL | Source |
| --- | --- |
| `/` | Existing bundled Gadget Gallery demonstration |
| `/b/gadget-gallery` | `GET /api/v1/public/businesses/gadget-gallery` |
| `/q/<publicId>` | `GET /api/v1/public/qr/<publicId>` |

The last two paths must be served with SPA history fallback. The backend determines whether a QR code, business or location is active. API responses include the existing `BusinessConfig` shape, languages and resolved phrase templates. Image URLs are returned by the API; do not reconstruct storage paths in the browser.

## Frontend configuration

Configure the **build-time** environment variable in the **frontend's** Coolify application:

```sh
VITE_PUBLIC_API_ORIGIN=https://api.smartqr.liquifyplus.in
```

This is public information and is embedded in the JavaScript build. Do not configure `DATABASE_URL`, admin credentials, or private secrets in any `VITE_` variable. For local development, set `VITE_PUBLIC_API_ORIGIN` in an untracked `.env.local` file. The root demo does not need network access. Restart Vite after changing environment variables.

## Coolify 4.7.5 deployment checklist

1. Review this PR and confirm `https://api.smartqr.liquifyplus.in/ready` succeeds before changing the live frontend.
2. In the **existing frontend** application, verify the existing GitHub repository and branch; only after explicit approval select the merged revision. Keep the existing Nixpacks setup and use the `npm run build:staging` command, `dist` publish directory, and root base path `/`.
3. Under **General → Build pipeline → Site type**, choose **SPA (single-page application)**. The site must serve `/index.html` when a client-side route such as `/b/gadget-gallery` or `/q/<publicId>` is requested directly. On a custom Nginx setup, the equivalent location rule is `try_files $uri $uri/ /index.html;`. Do not modify shared proxy settings.
4. Set the build-time `VITE_PUBLIC_API_ORIGIN` and confirm the API server `CORS_ORIGINS` already permits `https://smartqr.liquifyplus.in`. Do not change the API unless its current CORS configuration demonstrably needs its own reviewed fix.
5. Build and test in an isolated preview/staging environment first. Confirm the homepage matches the existing demo, browser refresh works at both dynamic paths, Safari/Android browsers load images, all three languages and rating/Rewrite actions work, manual textarea edits remain intact until Rewrite, and the copy/redirect flow works.
6. Deploy only after approval. Confirm a direct `/b/gadget-gallery` request returns HTML rather than an Nginx 404, unknown IDs show the app's not-found state, and a disconnected API shows Retry without leaking demo data.

The new frontend does not call the API on `/`. Dynamic responses are cached in memory for at most 15 seconds, and errors are not cached. The API's existing public media URLs are used as provided.

## Rollback

If issues appear after an approved deployment, restore the previous known-good frontend revision through Coolify's deployment history, or redeploy the exact pre-merge commit that is currently serving the root demo. Keep the existing API and PostgreSQL unchanged. Revert only the frontend deployment and confirm `/` works before retrying. Dynamic `/b/` and `/q/` URLs require the new revision and will not be supported by the previous frontend.

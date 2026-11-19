# AIBawaal Super Admin — static design review previews

**Direction B — Structured Operations. Design artifacts only.** These screens are not part of the deployable customer or admin app. There is **no login, API connection, business mutation, or production data access**. Names and all numeric values are illustrative and are visibly marked DEMO DATA / DESIGN PREVIEW.

## Open in a browser

From this folder, open `login.html`, `dashboard.html` or `businesses.html` in any modern browser. They share `preview.css` and `preview.js` and load the approved `tokens.css` from `../../../design-system/aibawaal-super-admin/tokens.css`. The pages can also be served with `python3 -m http.server 8765` from the repository root and visited under `/docs/admin/previews/`.

| Page | Desktop | Mobile |
|---|---|---|
| Login | `screenshots/login-1440.webp` | `screenshots/login-390.webp` |
| Dashboard | `screenshots/dashboard-1440.webp` | `screenshots/dashboard-390.webp` |
| Business list | `screenshots/businesses-1440.webp` | `screenshots/businesses-390.webp` |

These screenshots were rendered from the actual HTML using headless Chromium at CSS viewport widths of 1440 and 390 pixels. Test both rendered previews and source before approving Phase 5A implementation.

## Preview interactions

Navigation links switch between the three HTML previews. The mobile navigation button opens a real accessible drawer (Escape/backdrop close and focus return). Login's submit control displays a design-only notice rather than authenticating. Business table filters operate exclusively on the illustrative rows. Buttons that would normally write data are visually marked preview-only and cannot mutate records.

## Review checkpoints

Confirm overall visual hierarchy, density, typography, readability at 390px, active navigation style, the customer-facing brand separation, table scanability and login privacy. Check touch targets, focus visibility, no page-level horizontal scroll, and contrast. The approved master design system is in `design-system/aibawaal-super-admin/MASTER.md`.

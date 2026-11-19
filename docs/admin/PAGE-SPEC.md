# AIBawaal Super Admin — page and component specification

**Status:** design proposal only; requires explicit approval before Phase 5A implementation.

## Proposed global system (Direction B)
- Navigation: 232px desktop sidebar, collapsed to a topbar-triggered modal drawer at tablet/mobile; no fixed desktop sidebar consuming 320px viewport width.
- Header: 64px height desktop, 56px mobile; product name on left, breadcrumbs in the workspace, profile/logout at the right.
- Background `#F8FAFC`, work surfaces `#FFFFFF`, nav `#0F172A`; 1px border `#E2E8F0`, minimal shadows only for popovers.
- Text `#0F172A` and muted `#475569`, actions `#0369A1`, focus ring `#38BDF8`, success `#166534`, warning `#92400E`, error `#B91C1C`. Recheck contrast for all foreground/background combinations in a browser.
- Headings Plus Jakarta Sans, body/data Inter; base 14–16px, table content 13–14px only when WCAG legibility and zoom are maintained. 4/8px spacing multiples, radii 6px (inputs) and 10px (surfaces), 44px minimum interactive touch target.
- Table and filter controls share consistent heights, 1px borders, no gradient fills. Table action menus use explicit keyboard and touch interaction.
- No chart until an actual useful historical metric exists. Never insert example stats into an authenticated view.

## Page 1 — Login (Phase 5A)
- AIBawaal admin product identity, restrained centered form `max-width: 400px`; single form column.
- Visible email/password labels, password visibility control, clear submit/loading/error feedback; no public registration.
- Generic failure text avoids account enumeration. Support keyboard, browser password managers, autofocus only when appropriate, and Caps Lock hint if useful.
- Explicit note that access is restricted to AIBawaal operators. The UI is not authentication: it must be connected only to approved server-side Argon2id/session/CSRF-protected endpoints.

## Page 2 — Dashboard (Phase 5B)
- Heading "Overview", breadcrumb, optional last-updated timestamp from real data.
- Metrics: total businesses, active/inactive businesses, total locations, total QR codes, active QR codes; count values only from real API responses.
- "Recently added businesses" and "Recent activity" tables using genuine timestamps. No dummy visits, scans, revenue or conversion charts.
- At 320px, cards stack; at desktop use compact two/three-column grid, constrained by content width, not decorative empty space.
- Loading skeleton maintains dimensions; errors have Retry; empty data explains how to create a first business.

## Page 3 — Business list (Phase 5B)
- Desktop: heading, secondary description, primary "Add business" action; search field, status filter and category filter.
- Column order: business/name, slug, category, status, locations, created date, row actions. Keep names fully accessible; avoid excessive horizontal columns.
- Server pagination (25 per page by default, optional 50), total count and explicit filter reset; sorting only on backed fields.
- Mobile: concise result rows with business name, status, category and open action; controls wrap, no global horizontal scrolling.
- Empty/filtered-empty/no-access and network-error states differ. Search is debounced; query filters sync with history only when required and proven.

## Page 4 — Business details (Phase 5B–D)
- Header with business name and ID-safe actions: preview, edit, activate/deactivate with confirmation.
- Sections/tabs: General, Locations, Choices, Review Settings, Branding, QR Codes, Phrase Templates, Activity.
- Forms: explicit labels, required markers, inline help for slug and public destination, browser-safe image preview, field-specific validation.
- Unsaved changes prompt on navigation; destructive confirmations identify affected business and scope; protect optimistic state against API failure.
- At mobile widths, tabs become accessible overflow tabs or a select control; preserve the primary action and headings.

## Page 5 — QR management (Phase 5C)
- Search and filter by business/location/status; table of label, business, branch, status, public URL, created date, actions.
- New QR dialog: business required, location optional, label optional. The server creates a cryptographically secure identifier, never the browser.
- QR preview with clear full URL, active/inactive state, accessible copy/download actions for SVG/PNG; disabled QR messaging is unambiguous.
- Download should be print-friendly and verified; avoid a QR scan count until actual persisted event tracking exists.

## Shared components and states
- `AdminShell`, `SidebarNav`, `PageHeader`, `Breadcrumbs`, `DataTable`, `FilterBar`, `FormField`, `StatusLabel`, `Dialog`, `Toast`, `EmptyState`, `LoadingSkeleton`, `Pagination`.
- Keyboard: visible focus, Skip to content, Escape closes overlays, return focus on dismissal, dialog focus trap, tab ordering and correct ARIA roles.
- Feedback: default, hover (fine pointer only), focus, active, selected, disabled, loading, success, error, empty; no hover-only actions.
- Motion: 120–180ms opacity/transform only where useful. Respect `prefers-reduced-motion`; no scroll reveals on admin data tables.
- Test widths 280, 320, 360, 375, 390, 768, 1024, 1280, 1440; verify 200% browser zoom and text scaling.

## Architecture boundary
Admin React app planned under `admin/` only **after approval**. Secure write API is a separate reviewed backend phase with scoped DB credentials. Existing public read-only API stays unchanged. No admin credentials, sessions, customer reviews, or production data in design assets.

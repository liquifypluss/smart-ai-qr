# Smart AI QR — repository instructions for Codex and coding agents

## Scope and safety
- The existing `src/` customer page and `server/` public API are deployed. Do not modify their UI, review-generation rules, existing database schema, production data, or Coolify configuration during Super Admin design tasks.
- Work on a feature branch with reviewed pull requests. No automatic merge, deployment, admin bootstrap, or migrations against production.
- No fake dashboard numbers, fabricated businesses, mock authentication that resembles production login, customer review storage, or LLM-based review generation.

## Mandatory Super Admin UI UX Pro Max skill
- Before any admin UI design, implementation, review, or refactor, **read** `.agents/skills/ui-ux-pro-max/SKILL.md`. Follow its recommendations with React-specific guidance.
- Generate or review a complete design system using `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`. For React implementation guidance run `--stack react`; use `--domain ux` for navigation, accessibility, tables and forms.
- Treat design-system search results as design research. Do not mechanically copy marketing page patterns, gradients, charts, or animations into administrative screens.
- Direction B — **Structured Operations is APPROVED** by the product owner (2026-11-19). The canonical source of truth is `design-system/aibawaal-super-admin/MASTER.md`, followed by `tokens.json` and `tokens.css`. The research in `docs/admin/design-research/` and former proposals is supporting evidence, not an overriding style system.
- **Design approval gate:** The visual direction (B) is approved, but **Phase 5A implementation is NOT authorized yet**. First review `docs/admin/previews/` HTML previews and screenshots with the product owner. Do not create `admin/`, authentication UI or admin API until the preview is approved in a new explicit request. Then implement Phase 5A on a separate branch and PR. Page-specific design overrides belong in `design-system/aibawaal-super-admin/pages/`; never introduce ad hoc colors, spacing, icons, fonts or component styling.
- Respect the approved design system in all subsequent Phase 5A–5D UI work; request approval before any material design-system changes.

## UI design and quality gates
- Design for 100+ businesses: dense but readable data tables, server-side pagination, debounced search, accessible filters, useful empty/error/loading states, and predictable navigation.
- Mobile-first at 280, 320, 360, 375, 390px and larger; no horizontal overflow of the page. Complex tables may use accessible horizontal scroll within a labeled region, or responsive row summaries.
- Inline SVG icons only; no emoji UI, icon fonts, unnecessary icon libraries or decorative data charts.
- Keyboard focus, labels, validation near fields, escape and focus return in dialogs, 44px touch targets, contrast of at least 4.5:1 for normal text, and reduced-motion support.
- Prefer native semantics, maintainable React/TypeScript components, minimal dependencies and CSS tokens.
- Preserve the customer frontend independently: customer colors and components are not admin design references unless explicitly approved.

## Validation
- Inspect the relevant repository code and dependencies before editing.
- Run the applicable TypeScript, test, build and keyboard/responsive checks, documenting untested device/browser cases.
- Keep authentication and admin data access on isolated backend write credentials, with Argon2id, secure sessions, CSRF protection and authorization, when Phase 5A is separately approved.

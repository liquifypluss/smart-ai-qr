# AIBawaal Super Admin — MASTER Design System

**Status: APPROVED.** Direction B — Structured Operations, explicitly approved by the product owner on 2026-11-19.

This is the canonical visual and interaction specification for all future AIBawaal Super Admin screens, including Phase 5A through 5D. It does **not** authorize implementation, production changes, authentication bypasses, or deployment; design preview approval remains a separate checkpoint before starting Phase 5A.

## Provenance and precedence

1. Product owner's approved Direction B and the Smart AI QR project constraints.
2. This `MASTER.md` and accompanying `tokens.json` / `tokens.css`.
3. Page-level exceptions in `pages/*.md`, only when explicitly approved and documented.
4. Official UI UX Pro Max skill `.agents/skills/ui-ux-pro-max/SKILL.md`, using its `--design-system`, `--stack react`, and targeted `--domain ux` commands.
5. Generated design research in `docs/admin/design-research/02-structured-generated.md` (evidence, not a source of mandatory hero/marketing patterns).

Never copy the generator's conversion-focused hero, marketing CTA, GSAP scroll reveal, or carousel patterns into operations interfaces. Do not add arbitrary tokens in components.

## Product and user needs

AIBawaal operators, initially managing 100+ business records, need fast onboarding, precise search/filter, location and QR management, safe settings changes, phrase configuration and audit review. Screens should prioritize real information and low-error operations over decorative impact. No fabricated analytics, mock backend success states, stored customer review text, or LLM-generated content.

## Identity and visual principles

- Deep-navy persistent desktop navigation; deliberately quiet light work area.
- One primary action color, `--admin-primary` (`#0369A1`), reserved for actionable controls and links. Avoid generic purple or gradients.
- Crisp 1px neutral borders separate sections. Surfaces are white; background is light gray.
- Typography and spacing convey hierarchy. No glowing cards, excessive shadows, broad empty hero sections or ornamental data visualizations.
- All admin-specific colors, sizes, and component states use `--admin-*` CSS variables and `tokens.json` values.
- Icons must be inline SVG (stroke 1.7–2, size 18–20px) and represent actual actions. Do not use emoji, icon fonts or new icon packages by default.

## Colors

| Usage | Token | Value |
| --- | --- | --- |
| Sidebar | `--admin-nav` | `#0F172A` |
| Sidebar elevated | `--admin-nav-elevated` | `#18243B` |
| Sidebar inactive text | `--admin-nav-text` | `#CBD5E1` |
| Sidebar active row | `--admin-nav-active-bg` | `#253551` |
| Workspace | `--admin-bg` | `#F8FAFC` |
| Surface | `--admin-surface` | `#FFFFFF` |
| Text | `--admin-text` | `#0F172A` |
| Secondary | `--admin-text-secondary` | `#475569` |
| Muted | `--admin-text-subtle` | `#64748B` |
| Border | `--admin-border` | `#E2E8F0` |
| Primary action | `--admin-primary` | `#0369A1` |
| Primary hover | `--admin-primary-hover` | `#075985` |
| Focus | `--admin-focus` | `#0284C7` |
| Success foreground/tint | `--admin-success`, `--admin-success-soft` | `#166534` / `#F0FDF4` |
| Warning foreground/tint | `--admin-warning`, `--admin-warning-soft` | `#92400E` / `#FFFBEB` |
| Error foreground/tint | `--admin-danger`, `--admin-danger-soft` | `#B91C1C` / `#FEF2F2` |

Contrast: normal text at least 4.5:1, large text/icons at least 3:1 where applicable. Status labels contain literal text, not color alone. Focus indicators must be visible against light and navy backgrounds. Audit all token pairings in the rendered app (static preview checks do not replace this).

## Typography

- Headings: Plus Jakarta Sans, font weights 600/700; body, controls, tables: Inter, weights 400/500/600.
- Google Fonts with preconnect, `display=swap`; request only needed weights. System sans fallbacks. Avoid third-party font/icon packages.
- Page title 30px/1.25 desktop, 24px/1.3 mobile; section title 18px/1.35; body 14–16px/1.5; table rows 13–14px/1.5; overline 11–12px/1.4 uppercase with limited letter spacing.
- Form inputs at least 16px on iOS to prevent browser zoom. No artificial text tracking in body labels.
- Reserve sufficient line height and allow zoom/text size enlargement to 200% without truncating essential information.

## Spacing and dimensions

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Standard page gutters: 32px desktop, 20px tablet, 16px mobile (12px down to 280px).
- Desktop sidebar width 236px; topbar height 68px; mobile topbar 60px. Main content constrained to a practical 1440px max.
- Controls/interactive touch areas at least 44px tall; small visual icon buttons still have 44px hit targets.
- Cards and panels 10px radius; inputs and buttons 6px; larger dialog 14px. Borders 1px. Avoid shadows except needed popovers.
- Dense tables approximately 64px per row; clearly separated headings, text labels and supporting metadata.

## Shared navigation

- Desktop: persistent deep-navy sidebar with wordmark, Overview, Businesses, QR Codes, Phrase Library, Activity. The current section has a distinct background, visible label, and `aria-current="page"`.
- Topbar: breadcrumb, environment context where relevant, authenticated operator menu. No fictional notification count.
- At 1023px and below: sidebar becomes an accessible drawer opened from a 44px mobile menu button. Trap focus while open, close on Escape and backdrop, restore focus to its trigger.
- Provide skip-to-main, semantic headings and predictable back links. Do not rely on a bottom tab bar for an administration tool with many sections.

## Core component specifications

**Button:** primary blue fill/white text, secondary white/neutral border, destructive danger foreground with explicit confirmation. All states: hover only on fine pointer, focus-visible, active, disabled, loading, success/error. No gratuitous motion.

**Form field:** persistent visible label, optional hint, border, placeholder only as example; clear inline validation message and error border. Show/hide password control must have accessible name. Accept paste/password managers and no public self-registration.

**Data table:** real column headings, row selection semantics, useful per-row actions, fixed ordering of essential fields, server pagination (25 default; 50 optional), search debounced when backed by API, sortable fields only if supported. Mobile: concise accessible row summaries rather than clipped wide tables; no page-level horizontal scrolling.

**Filter toolbar:** search with clear button, status/category selects, clear-filters action, result count. Preserve filter states on pagination where supported. All controls need labels.

**Status label:** small type and mild tint, always display text (`Active`, `Inactive`), no color-only meaning and no promotional pill colors.

**Dialog:** focus-managed, Escape and cancel, 44px controls, descriptive action text, explicit destructive scope. If saving fails retain input and show recovery. Confirm irreversible actions with product-safe labels.

**Feedback:** skeletons with consistent height, clear empty/filtered-empty/not-found/error/retry variants; never display placeholder metrics as real. Toast after successful saved changes only.

## Screen blueprints

- **Login:** reserved standalone product identity and single form; no signup. State clearly that only AIBawaal operators may log in. Credential verification and session handling only after separately approved Phase 5A backend is implemented.
- **Overview:** actual business/active/location/QR counts; recent businesses and administrative events, no fabricated scans/reviews/revenue.
- **Businesses:** heading, add action, compact search and filters, 25-row pagination, status, categories, location count and dates. Keep 100+ entities navigable.
- **Business details:** General, Locations, Choices, Review Settings, Branding, QR and Activity sections; visible save states, unsaved changes, safe publish/deactivate confirmations.
- **QR management:** label, business, optional location, active state, public URL, copy/download/preview actions; secure server-generated public identifiers.

Approved previews of Login, Overview and Business Table are under `docs/admin/previews/`, with sample data clearly marked. Those HTML files are **static visual artifacts only**, not implementations and not deployable authentication.

## Interaction, responsiveness and performance

- Functional keyboard navigation, visible focus, correctly managed menus/dialogs, accessible text labels and meaningful SVG semantics.
- Pointer feedback 120–180ms (opacity/color/transform); hover only under `(hover: hover) and (pointer: fine)`; respect `prefers-reduced-motion: reduce`.
- Test widths 280, 320, 360, 375, 390, 768, 1024, 1280, 1440, including 200% zoom and iOS Safari/Android Chrome before shipping UI.
- Mobile safe areas and soft keyboards; no horizontal document overflow or clipped action buttons.
- Render first content quickly. Avoid heavy chart/UI libraries and unnecessary route hydration; profile performance before adding optimization abstractions.

## Phase boundary

Current task: master system, reusable tokens and high-fidelity previews only. Phase 5A (Argon2id, server sessions/CSRF, secure bootstrap, isolated admin React shell and tests) requires a **separate approval after the previews** and a separate feature branch/PR. Do not touch `src/`, deployed public API, PostgreSQL, Coolify or production data in this design PR.

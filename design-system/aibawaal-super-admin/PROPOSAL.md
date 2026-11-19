# AIBawaal Super Admin — design directions (PROPOSED)

**Status: Direction B — Structured Operations APPROVED on 2026-11-19.** Directions A/C remain archived alternatives. The approved master system and tokens are in `design-system/aibawaal-super-admin/`; browser-renderable previews remain pending product owner sign-off. Phase 5A implementation is not part of PR #6.

## Research provenance
Official Codex installation: `npx ui-ux-pro-max-cli init --ai codex`.
Skill: `.agents/skills/ui-ux-pro-max/SKILL.md`; search implementation: `.agents/skills/ui-ux-pro-max/scripts/search.py`.
Saved generated results: `docs/admin/design-research/` with three `--design-system` runs (variance 3/4/5, motion 2/2/3, density 8/8/7), plus React stack and UX accessibility/navigation searches.

These generator results are evidence and starting points, not product-ready recommendations. Its generic landing-page hero/CTA patterns are **rejected** for a data-management product. The suggested glassmorphism blur and scroll-reveal motion are likewise rejected for administrative tasks.

## Audience and jobs
Internal AIBawaal operators managing approximately 100 or more businesses. Daily tasks: find a business, onboard a business, update locations and choices, manage QR statuses, edit phrase templates, preview business pages, inspect audit history. Keep operations fast and comprehensible; never display fabricated scan/revenue analytics.

## Direction A — Operational Clarity
- Based on generated "AIBawaal Clarity": minimal Swiss-style layout, white surfaces, slate text, restrained blue actions.
- Flat white sidebar, slate dividers, compact rows, Plus Jakarta Sans headings and Inter body.
- Suggested identity: slate `#0F172A`, action blue `#2563EB`, background `#F8FAFC`, border `#E2E8F0`.
- Strength: minimal implementation cost, light and familiar. Risk: can feel like a generic admin template without strong typographic hierarchy and navigation rhythm.

## Direction B — Structured Operations (APPROVED)
- Based on generated "AIBawaal Structured": accessible/ethical style, high contrast and controlled information density.
- Persistent deep-navy sidebar on desktop, neutral-white working canvas, blue primary actions, limited semantic status colors.
- Suggested identity: sidebar `#0F172A`, background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`, secondary `#475569`, action `#0369A1`, border `#E2E8F0`.
- Plus Jakarta Sans for headings (weight 600–700), Inter for dense form/table text (400–600). This body-font choice adapts the generator pairing to the project's data density.
- Strength: credible AIBawaal identity, clear navigation, well suited for real business tables and secure admin work. Risk: dark sidebar must avoid visual dominance and support clear mobile navigation.
- Decision: recommend this direction for approval, subject to an actual browser-based contrast/accessibility and responsive review.

## Direction C — Modern Workbench
- Research basis: generated "AIBawaal Workbench"; original glassmorphism recommendation **not adopted**, because blurred layers and decorative effects are unsuitable for 100+ entity management.
- Adaptation: compact slate utility rail, warm-neutral main canvas, clear editing workspace and right-side context panels only on wide screens.
- Suggested identity: ink `#1E293B`, steel `#334155`, background `#FAFAF9`, cool action blue `#2563EB`, light borders.
- Strength: effective for power-user editing flows, phrase previews and QR management. Risk: side panels can reduce table space at 1024px and add responsive complexity.

## Approval criteria and design constraints
Evaluate each option for clarity at 320px and 1440px, accessibility, 100+ business search/filter speed, ease of maintenance and differentiation from generic dashboards. Avoid purple gradients, translucent overlays, large decorative charts, invented analytics, bright saturated status pills, gratuitous rounded corners, emoji icons and unnecessary motion.

**Approval record:** The product owner explicitly selected Direction B. Its master specification is now `design-system/aibawaal-super-admin/MASTER.md`. Approval of this visual direction does not authorize authentication or UI implementation; static previews are submitted for separate review.

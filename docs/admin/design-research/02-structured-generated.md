## Design System: AIBawaal Structured

### Design Dials
- **Variance:** 4/10 — Balanced / Modern
- **Motion:** 2/10 — Subtle
- **Density:** 8/10 — Dense / Dashboard

### Pattern
- **Name:** Trust & Authority + Conversion
- **Conversion Focus:** Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.
- **CTA Placement:** Contact Sales / Get Quote (primary) + Nav
- **Color Strategy:** Navy/Grey corporate. Trust blue. Accent for CTA only.
- **Sections:** Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path

### Style
- **Name:** Accessible & Ethical
- **Mode Support:** Light supported | Dark supported
- **Keywords:** Accessible, inclusive interface, high contrast, large text (16px+), keyboard navigation, screen reader friendly, accessibility standards aware, focus state, semantic
- **Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public
- **Performance:** cost:low|drivers:none | **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion

### Colors
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#0369A1` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#020617` | `--color-card-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0F172A` | `--color-ring` |

*Notes: Professional navy + blue CTA*

### Typography
- **Heading:** Plus Jakarta Sans
- **Body:** Plus Jakarta Sans
- **Mood:** enterprise, saas, b2b, professional, indigo, modern, approachable, legible, ios dynamic type, android scaling
- **Best For:** B2B SaaS apps, productivity tools, government and finance mobile apps, admin dashboards, enterprise onboarding
- **Google Fonts:** https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');
```

### Key Effects
Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Motion
**Scroll Reveal** (Subtle) — Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: `power1.out`
```js
gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } });
```
*Framework notes: Requires the ScrollTrigger plugin registered once via gsap.registerPlugin(ScrollTrigger); Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately*
- ✅ Keep the y offset small (8-16px) so it reads as a fade, not a slide
- ❌ Don't reveal below-the-fold content needed for SEO/crawlers as invisible-by-default without a no-JS fallback

### Avoid (Anti-patterns)
- Playful design
- Hidden credentials
- AI purple/pink gradients

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px


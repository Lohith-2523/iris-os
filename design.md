# Design — IrisOS

This file records the locked IrisOS system and its geometry-aware composition rules. The visual identity remains unchanged; only spatial composition and information density vary by viewport family.

## Genre

Modern-minimal enterprise software with restrained graphite, titanium, silver, and porcelain surfaces.

## Macrostructure families

- Authentication pages: Centered Glass ? black procedural wireframes fade to white across the upper 60% behind a centered, rounded rectangular frosted-glass form.
- Application pages: Geometry-aware Workbench — the existing sidebar, topbar, feature components, and domain layouts are composed through shared viewport modes and route families.
- Touch application pages: Touch-first Workbench — phone bottom navigation, one-task canvases, safe-area sheets, and tablet rail/master-detail compositions. The platform-neutral specification is `docs/mobile-native-design-language.md`.
- Marketing pages: Geometry-aware Workbench — the narrative remains vertical on standard screens and becomes a split editorial/product composition on ultrawide screens.
- Content pages: retain the existing typographic and reporting structures.

## Theme

- Paper: cool porcelain, expressed through `--color-auth-paper`.
- Ink: cool graphite, expressed through `--color-auth-ink`.
- Accent: monochrome; focus is a restrained cool graphite signal.
- Background treatment: white canvas with a black procedural triangulated surface, contour texture, vertices, connections, and restrained reconstruction motion.

## Typography

- Display: Clash Display, weight 700, upright.
- Body: Sansation, weight 400.
- Mono: Geist Mono for compact system labels only.

## Spacing and motion

- Four-point named spacing scale in `tokens.css`.
- Motion uses a slow procedural surface-state cycle plus restrained control transforms.
- Reduced-motion users receive a static generated geometry frame.

## Layout modes

- Compact phone: 320–359 px; one-column content and role-aware bottom navigation.
- Standard phone: 360–413 px; one-column content and role-aware bottom navigation.
- Large phone: 414–599 px; one-column content and role-aware bottom navigation.
- Small tablet: 600–767 px; compact navigation rail and one/two-column workbench.
- Tablet portrait: 768–899 px portrait; navigation rail and two-up summaries.
- Tablet landscape: 768–1439 px landscape on coarse input; rail with master/detail or multi-panel workbench.
- Large tablet: 900–1439 px portrait on coarse input; bounded rail/canvas composition.
- Compact desktop: 768–1199 px with precision input; reduced gutters and conservative grids.
- Standard: 1200–1599 px below 2:1; two-up dashboard summaries prevent compressed four-card rows.
- Wide: 1600–2199 px below 2:1; working rails and primary canvases separate deliberately.
- Large: 2200 px and above below 2:1; wider multi-panel workbenches with bounded measures.
- Ultrawide: any desktop viewport at 2:1 or wider; information is arranged laterally instead of merely stretched.

Application routes are additionally grouped as dashboard, planner, records, studio, or settings so each mode can tune the appropriate rail/canvas relationship without duplicating feature components.

## Authentication performance contract

- The form and logo render independently from the client-only WebGL canvas.
- The background uses adaptive vertex density and device-pixel-ratio limits.
- Geometry updates use typed buffers and a small, fixed number of draw calls.
- Reduced-motion mode renders a static frame without a continuous animation loop.

## Shared requirements

- Login and signup share one auth shell and the same control states.
- Supabase remains the identity provider; email signup requires verification before workspace activation.
- The frosted-glass card stays centered at every viewport, with a bounded width and internal padding. The form must remain readable at 320, 375, 414, and 768 px widths.
- Every workspace route inherits the shared layout-mode and route-family attributes from the application shell.
- Geometry overrides remain in labelled additive CSS blocks and must not alter routing, permissions, state, data fetching, or integrations.
- The pre-redesign language and exact reversion recipe live in `docs/design-language-original-2026-08-25.md`.

## Exports

The existing colour, typography, spacing, radius, and motion variables remain
the canonical brand exports. The geometry layer adds the following portable
layout tokens.

### tokens.css

```css
:root {
  --layout-workspace-compact-max: 78rem;
  --layout-workspace-standard-max: 94rem;
  --layout-workspace-wide-max: 112rem;
  --layout-workspace-large-max: 132rem;
  --layout-workspace-ultrawide-max: 148rem;
  --layout-touch-nav-height: 4.25rem;
  --layout-touch-target: 2.75rem;
  --layout-phone-gutter: 0.875rem;
  --layout-tablet-gutter: 1.125rem;
  --radius-touch-card: 0.875rem;
  --shadow-touch-nav: 0 -1rem 2.5rem oklch(0.02 0.005 255 / 0.3);
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --container-workspace-compact: 78rem;
  --container-workspace-standard: 94rem;
  --container-workspace-wide: 112rem;
  --container-workspace-large: 132rem;
  --container-workspace-ultrawide: 148rem;
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "layout": {
    "workspace-compact-max": { "$value": "78rem", "$type": "dimension" },
    "workspace-standard-max": { "$value": "94rem", "$type": "dimension" },
    "workspace-wide-max": { "$value": "112rem", "$type": "dimension" },
    "workspace-large-max": { "$value": "132rem", "$type": "dimension" },
    "workspace-ultrawide-max": { "$value": "148rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

Geometry tokens are additive and do not remap shadcn colour roles. The existing
`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--input`,
`--ring`, and `--radius` variables in `src/app/globals.css` remain canonical;
the five `--layout-workspace-*` variables above sit beside them at `:root`.

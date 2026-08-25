# Iris OS design language — pre-redesign snapshot

Captured on 2026-08-25 before the geometry-aware workspace, landing, and
authentication redesign. This is the rollback reference for the visual layer;
application logic, routes, data loading, permissions, and integrations are not
part of the redesign.

## Product character

- Modern-minimal enterprise software with a premium, executive tone.
- Dark mode is graphite/obsidian with titanium and metallic-silver highlights.
- Light mode is porcelain content inside the same permanently dark navigation
  structure.
- Colour is restrained. Semantic status colours are limited to functional
  labels, validation, and provider-specific marks.
- Interfaces are dense, direct, and tool-like; decorative illustration, emoji,
  neon colour, and playful consumer styling are outside the language.

## Typography

- Display and primary workspace headings: Clash Display, upright, usually bold.
- Body and control copy: Sansation with Geist/system fallbacks.
- Compact system labels and identifiers: Geist Mono.
- Financial and tabular numerals: JetBrains Mono or the heading face for large,
  standalone metrics; tabular lining figures are enabled.
- Headings use tight tracking and remain roman, never italic.

## Surfaces and controls

- Workspace base: near-black graphite; raised cards: charcoal; inset controls:
  darker graphite; borders: low-opacity white in dark mode.
- Light workspace base: cool porcelain; cards: white; borders: slate-tinted;
  navigation rail remains near black.
- Cards use subtle borders, restrained shadows, and approximately 12–16 px
  corner radii. Controls generally use 8–10 px radii; primary public/auth CTAs
  are pill-shaped.
- Focus is a visible cool graphite/silver outline. Pressed controls translate or
  scale by roughly one pixel; loading, disabled, error, and success states keep
  the control geometry stable.

## Existing composition

- Application routes share a fixed-height shell: collapsible left sidebar,
  topbar, and one independently scrolling main column.
- Every application route is wrapped by `.workspace-page`; most route-specific
  compositions are authored with local Tailwind grid/flex utilities.
- The shared main canvas uses fluid page gutters and caps content at 100 rem on
  large screens. Cards and controls scale proportionally, but route composition
  is predominantly one responsive desktop layout.
- Landing page macrostructure is a dark metallic Workbench: navigation, hero
  product scene, sequential operating-system story, Atlas, governance, FAQ,
  final CTA, and statement footer.
- Login and signup share the Split Studio auth shell: supplied full-height video
  on the left and a porcelain orbit containing the form on the right. Mobile
  removes the media panel and presents the form directly.

## Motion and accessibility

- Motion is restrained to opacity and transform transitions plus one
  requestAnimationFrame landing parallax primitive.
- Workspace hover/press feedback is short and non-bouncy.
- Reduced motion converts spatial animation to short opacity transitions and
  prevents authentication video download.
- Current responsive safeguards include overflow clipping, minimum target sizes
  on coarse pointers, non-wrapping interactive labels, min-width resets for
  flex/grid children, and chart/table containment.

## Source-of-truth files before redesign

- `design.md` — existing locked system, especially the authentication contract.
- `tokens.css` — landing, authentication, and daily-briefing token groups.
- `src/app/globals.css` — workspace light/dark materials, primitives, shell, and
  the previous proportional responsive refinement.
- `src/components/landing/iris-landing.module.css` — public landing composition.
- `src/components/auth/auth-shell.module.css` — shared login/signup composition.
- `src/app/(app)/layout.tsx` — application shell and universal route wrapper.

## Reversion recipe

The geometry-aware redesign is intentionally isolated behind
`data-layout-mode` attributes and a final, labelled CSS layer. To revert it:

1. Restore `src/app/(app)/layout.tsx` to the version before the layout-mode
   attribute was added.
2. Remove the final `Iris geometry-aware composition system` block from
   `src/app/globals.css`.
3. Remove the final matching geometry-aware blocks from the landing and auth CSS
   modules.
4. Remove `src/lib/workspace-layout-mode.ts` and its test.
5. Restore the prior `design.md`, `tokens.css`, and `.hallmark/log.json` entries.

No route tree, production component directory, feature component, backend
integration, or data model needs to be removed to restore this design language.

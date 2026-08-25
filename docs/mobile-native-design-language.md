# Iris OS Touch Design Language

Version 1.0 · 2026-08-25

This is the portable source of truth for Iris OS phone, tablet, and future native-app surfaces. It extends the locked graphite, titanium, silver, porcelain, Clash Display, and Sansation language in `design.md`; it does not replace it.

## Product posture

Iris on touch devices is an operational app, not a compressed website. Preserve the same routes, permissions, data, and workflows, but reveal one primary task at a time on phones and a compact workbench on tablets. Function carries the interface: no decorative illustration, neon accent, emoji, or invented metrics.

## Adaptive modes

| Mode | Web rule | Native equivalent | Composition |
| --- | --- | --- | --- |
| Compact phone | 320–359 pt | smallest handset | One column, 14 pt edge inset, bottom navigation |
| Standard phone | 360–413 pt | common handset | One column, 14 pt edge inset, bottom navigation |
| Large phone | 414–599 pt | large/foldable cover display | One column, 14 pt edge inset, bottom navigation |
| Small tablet | 600–767 pt | compact tablet | 80 pt navigation rail, one or two columns |
| Tablet portrait | 768–899 pt portrait | portrait tablet | Rail + primary canvas, two-up summaries |
| Tablet landscape | 768–1439 pt landscape on coarse input | landscape tablet | Rail + master/detail or two/three columns |
| Large tablet | 900–1439 pt portrait on coarse input | large portrait tablet | Rail + bounded workbench, two columns |

Classify with usable width and height, orientation, safe-area insets, and input precision. A 1280 px precision-pointer laptop remains desktop; the same geometry with coarse input is a tablet.

## Navigation

- Phones use four primary role-aware destinations plus **More**. The bar is fixed to the bottom safe area and is never a second scroll container.
- Tablets use the existing 80 pt collapsed rail. The full drawer remains available when a navigation set exceeds the rail.
- Admin defaults: Home, Clients, Projects, Calendar, More.
- Client defaults: Home, Leads, Calendar, Messages when entitled, More.
- Member defaults: Home, Tasks, Calendar, Messages when entitled, More.
- Active state uses a filled neutral surface, label, and icon; color alone is insufficient.

## Surfaces and hierarchy

- Canvas: `--background`; raised work: `--card`; selection: `--accent`; rules: `--border`.
- Cards use `--radius-touch-card` (14 pt) on phones and the existing desktop radius on tablets.
- Phone pages show one primary region. Secondary insight rails move below the primary action or open as sheets.
- Tablet portrait favors two-up summaries. Tablet landscape may use master/detail, rail/canvas, or three-column planning boards when the content supports it.
- Tables remain semantic tables. On phones their viewport pans horizontally edge-to-edge; product-specific routes may replace them with record cards only when all row actions and labels are preserved.

## Typography

- Display: Clash Display 700, upright. Body: Sansation 400/700. Numeric data: JetBrains Mono or the existing numeric token.
- Phone title: 24–28 pt; section title: 18–20 pt; body/control: at least 16 px on the web; metadata: 11–13 pt only when non-interactive.
- Labels are sentence case unless an existing compact system label is intentionally uppercase.
- Titles must wrap safely; interactive labels stay on one line.

## Spacing and touch

- Base grid: 4 pt.
- Phone edge inset: `--layout-phone-gutter` (14 pt web equivalent).
- Tablet edge inset: `--layout-tablet-gutter` (18 pt web equivalent).
- Minimum interactive target: `--layout-touch-target` (44 pt).
- Bottom navigation: `--layout-touch-nav-height` (68 pt) plus the platform safe-area inset.
- Bottom-navigation elevation: `--shadow-touch-nav`, a cool graphite shadow token.
- Use one vertical page scroller. Nested scrolling is reserved for horizontal tables/boards, modal content, and bounded pickers.

## Components

- Forms are one column on phones and may be two columns on tablets. Use native select/picker behavior for specialization, dates, and enumerated values.
- Dialogs become bottom sheets or full-screen covers on phones. Destructive decisions keep explicit confirmation; ordinary saves use inline success.
- Tabs remain visible and horizontally pannable only when they cannot fit without truncation. Do not hide the active tab.
- Charts keep labels and summaries outside the plot at compact widths. Never rely on hover.
- Loading, empty, error, disabled, success, focus-visible, pressed, and selected states are mandatory.

## Platform mapping

| Iris primitive | SwiftUI | Jetpack Compose |
| --- | --- | --- |
| Phone bottom navigation | `TabView` / custom safe-area bar | `NavigationBar` |
| Tablet rail | `NavigationSplitView` sidebar | `NavigationRail` / adaptive scaffold |
| Bottom sheet | `.sheet` with detents | `ModalBottomSheet` |
| Full-screen task | `.fullScreenCover` | dedicated navigation destination |
| Safe area | `safeAreaInset` | `WindowInsets.safeDrawing` |
| 44 pt target | framed control/content shape | minimum interactive component size |
| Reduced motion | accessibility reduce-motion environment | animator duration scale / accessibility setting |

Native implementations should export the semantic tokens, not copy CSS selectors. Keep token names stable so web, SwiftUI, and Compose can share generated values later.

## Scroll contract

The root shell owns viewport locking only to keep navigation stationary. `.workspace-main` is the single vertical scroller and must retain `min-height: 0`, `overflow-y: auto`, `touch-action: pan-y`, momentum scrolling, and bottom safe-area clearance. No route may override that contract with a full-page `overflow: hidden` container unless it supplies its own verified primary scroller.

## Reversion

Remove the labelled **Touch-first Workbench** block from `src/app/globals.css`, remove `MobileBottomNavigation` from the shared app layout, and restore the previous mode union in `src/lib/workspace-layout-mode.ts`. The pre-redesign visual language and broader rollback recipe remain in `docs/design-language-original-2026-08-25.md`.

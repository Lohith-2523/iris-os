# Scroll animation patterns

## Pattern selection

| Need | Prefer | Notes |
| --- | --- | --- |
| Fade/slide content into view | IntersectionObserver | Add a class once; stagger with a CSS variable. |
| Hero or decorative layer parallax | RAF + CSS custom property | Use one passive listener and clamp travel. |
| Page progress bar | Scroll progress + `scaleX` | Set `transform-origin: left`; hide for reduced motion. |
| Element-linked fade/scale/depth | Viewport-relative progress | Define explicit entry, focus, and exit ranges. |
| Sticky narrative | CSS sticky, then GSAP if needed | Keep the scroll length proportional to the story. |
| Horizontal narrative | GSAP ScrollTrigger | Preserve touch/mobile fallback and keyboard access. |
| Multi-step pinned timeline | GSAP ScrollTrigger | Use only when ordinary vertical flow cannot communicate it. |

## Native reveal

Mark semantic wrappers with `data-reveal` and optionally set `--reveal-delay`. Start slightly translated and transparent only when JavaScript has added a root enhancement class. Add `is-visible` through IntersectionObserver. This prevents invisible content when JavaScript fails.

Recommended observer defaults:

- `threshold: 0.12`
- `rootMargin: "0px 0px -8% 0px"`
- observe once for ordinary landing-page entrances

## Native parallax

For each `[data-parallax]` element, compute:

```text
progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1)
offset = (progress - 0.5) * distance
```

Write the result to `--parallax-y`. Compose it inside the element's existing transform or apply it to a dedicated child wrapper. Use positive and negative distances to separate foreground and background layers.

## Depth entrance

Combine a small `translateY`, scale from `0.94–0.98`, and a perspective-safe `rotateX` of at most `4–8deg`. Settle all values at the center of the active range. Avoid rotating body text.

## Scroll-linked text

Prefer line or phrase reveals over per-character effects. If individual words are animated, preserve the full sentence for assistive technology and keep delay short enough that reading does not feel throttled.

## Reduced motion

CSS should reset animated opacity and transform to their final values. JavaScript should skip continuous listeners when the media query matches. Re-evaluate if the preference changes during the session.


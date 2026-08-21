---
name: scroll-storytelling
description: Design, implement, audit, and refine performant scroll-triggered animation, parallax, depth, reveal-on-scroll, sticky storytelling, progress indicators, and scroll-linked transitions for web interfaces. Use when a page should respond to scrolling, feel more dimensional or fluid, reveal content in sequence, or coordinate motion with viewport progress using native browser APIs, Motion, or GSAP.
---

# Scroll Storytelling

Build motion that explains structure and strengthens hierarchy. Preserve usability, performance, and accessibility before adding spectacle.

## Workflow

1. Inspect the page structure, existing animation code, dependencies, breakpoints, and reduced-motion behavior.
2. Define a small motion system before editing: entrance distance, stagger, easing, duration, depth layers, and scroll ranges.
3. Choose the least complex implementation that satisfies the effect.
4. Implement shared primitives instead of one-off listeners on every component.
5. Verify desktop, mobile, keyboard use, reduced motion, and behavior after resizing.

## Choose the Engine

- Prefer native `IntersectionObserver` for one-shot or repeatable viewport reveals.
- Prefer passive scroll listeners plus one `requestAnimationFrame` loop for lightweight continuous parallax. Write CSS custom properties and let CSS compose transforms.
- Use Motion when it is already installed or when spring orchestration and declarative scroll transforms materially simplify the page.
- Use GSAP ScrollTrigger when the design requires pinned timelines, complex scrubbing, horizontal narrative sections, or precise multi-step sequencing.
- Do not add a dependency for effects that native APIs can express clearly.

Read [patterns.md](references/patterns.md) when selecting or implementing a pattern.

## Motion System

Establish shared values and keep variation intentional:

- Micro feedback: 120–200ms.
- Standard transitions: 240–420ms.
- Large entrances: 500–800ms.
- Staggers: 45–90ms per sibling; cap long lists so the final item does not lag.
- Reveal travel: 12–32px for interface elements; 40–72px only for major editorial moments.
- Parallax travel: usually 3–12% of the element size or 30–120px across its active range.
- Easing: use a smooth ease-out for entrances and linear interpolation for scroll-scrubbed values.

Limit each section to one dominant motion idea. Coordinate layers with different distances, not arbitrary directions.

## Implement Safely

- Keep layout in normal document flow. Animate `transform`, `opacity`, filters used sparingly, and CSS custom properties.
- Never animate layout-critical dimensions during scroll when a transform can create the effect.
- Batch reads before writes. Use one scroll source, cache element bounds when practical, and recalculate on resize.
- Clamp progress to `[0, 1]`; map it through named ranges rather than scattering magic numbers.
- Apply `will-change` only while useful or to a very small number of major animated layers.
- Avoid perspective transforms on text that harm legibility.
- Do not hijack scroll, introduce long pinned dead zones, or make essential content depend on animation completion.
- Prevent cumulative layout shift by reserving image and media dimensions.

## Accessibility

- Honor `prefers-reduced-motion: reduce` in both CSS and JavaScript.
- Under reduced motion, show all content immediately and disable parallax, scrubbing, smooth scrolling, and nonessential loops.
- Keep semantic reading order identical to the visual order.
- Do not hide focusable content with unrevealed opacity or transforms.
- Ensure motion never blocks navigation, controls, or reading.

## Recommended Native Architecture

For a React client component, install one effect that:

1. Selects declarative targets such as `[data-reveal]` and `[data-parallax]`.
2. Uses `IntersectionObserver` to add an `is-visible` class to reveal targets.
3. Uses one passive scroll listener to schedule a single animation frame.
4. Computes viewport-relative progress for active parallax targets and writes `--scroll-progress` or `--parallax-y`.
5. Removes listeners, cancels the frame, and disconnects the observer during cleanup.

Use data attributes for per-element parameters such as axis, speed, delay, and depth. Keep default values in CSS so the page remains stable before hydration.

## Quality Bar

- Make the first viewport feel composed on initial load without waiting for a scroll event.
- Reveal headings, body copy, and groups as coherent units; stagger only meaningful siblings.
- Use depth to reinforce foreground, midground, and background relationships.
- Let scroll-linked motion settle to a visually correct resting state at section boundaries.
- Keep interactive hover and press feedback independent from scroll transforms by nesting elements when both need `transform`.
- Test fast scrolling and reverse scrolling; no flicker, jumps, or stale state should appear.

## Verification

Run the project’s lint and build checks. Then inspect the page in a real browser at desktop and mobile sizes. Confirm:

- reveals occur at sensible thresholds;
- parallax remains subtle and does not expose container edges;
- sticky elements release correctly;
- animation remains smooth during rapid scrolling;
- mobile uses reduced travel and simpler depth;
- reduced-motion mode exposes every piece of content without transitions.


# Baseline performance summary

## Environment

- Audited 2026-08-02 in a local production-like environment on Windows.
- Next.js 16.2.9 App Router with Turbopack; React 19.2.4; TypeScript; npm.
- Prisma 7.9.1 with PostgreSQL 17.6; Supabase SSR/Auth.
- 34 page routes and 39 route handlers discovered; 72 static build outputs.
- Baseline production compile: 4.5 s; TypeScript: 7.9 s; static generation: 447 ms.
- Playwright Chromium desktop and a custom cold-cache Fast 4G / 4× CPU profile.
- Lighthouse JSON and HTML reports for every anonymously reachable page plus the two redirecting route URLs.

## Baseline slowest public routes

| Route | Fast 4G cold settle | Transfer | Dominant baseline issue |
|---|---:|---:|---|
| `/` | 5,982 ms | 735 KB | Four duplicate remote Figma fonts plus self-hosted Next fonts; large client page. |
| `/terms` | 5,809 ms | 727 KB | Duplicate fonts and client hydration for static legal content. |
| `/privacy` | 5,769 ms | 730 KB | Duplicate fonts and client hydration for static legal content. |
| `/pricing` | 5,299 ms | 636 KB | Client page, duplicate fonts, images, animations. |
| `/login` | 5,034 ms | 581 KB | Supabase/auth JS plus duplicate fonts and logo/icon assets. |
| `/coming-soon` | 4,581 ms | 510 KB | Shared client/fonts/CSS payload dominates a small page. |

Raw baseline: `reports/playwright/route-performance-baseline.json`.

## Baseline bottlenecks

1. Four fonts were loaded twice: once through `next/font` and again from `static.figma.com`, adding up to 308 KB on pages that used all four.
2. Auth/session sync, file-input security, and Meta SDK loader components lived in the root layout, making their client modules eligible for every public page.
3. The landing hero hid above-fold content until hydration plus IntersectionObserver state changes.
4. Public/static pages were implemented as full Client Components.
5. Public pages transferred 510–735 KB on the baseline mobile run.
6. The authenticated shell blocks rendering while warming as many as 18 APIs.
7. Static `xlsx` imports produce 399 KB and 909 KB raw chunks; Recharts produces multiple 378 KB raw chunks; OpenPGP produces a 372 KB raw chunk.
8. Task status updates show 9.4–10.0 s mean database execution due to lock waiting.
9. Invite swaps a full-screen loader for the final UI, producing CLS 0.49.
10. `/waitlist` redirects to Login under middleware, so the intended page is unreachable anonymously.

## Load baseline

The safe local load test used only static public GETs. Across 40 requests per stage, p95 was 4 ms at concurrency 1, 9 ms at 5, 22 ms at 10, and 38 ms at 25, with zero failures. This validates static serving only; authenticated API capacity remains untested.

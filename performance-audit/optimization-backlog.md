# Performance optimization backlog

Implementation status as of 2026-08-02 is recorded in [implementation-results.md](./implementation-results.md). Completed: non-blocking bounded workspace warm-up, task optimistic concurrency/lock timeout, Terms/Privacy/Pricing server rendering, lazy Supabase/XLSX, chart chunk splitting on Dashboard/Clients, optimized logos/favicon/font preloads, prefetch controls, `/home` canonical redirect, and public Waitlist access. Remaining structural work: landing client-island extraction, route-group CSS splitting, Finance inline chart islands, field Web Vitals, authenticated load validation, and server-side invite token lookup.

Priority score follows user impact × frequency × severity ÷ implementation cost.

## P0

### Eliminate task-save lock contention

- **Evidence:** 150 task status/progress updates average 9.4–10.0 s; maximum 49.5 s; non-contentious variants average 4.6 ms; zero disk-read time.
- **Affected:** Tasks, Teams Dashboard, Team, Client Detail Dashboard.
- **Fix:** capture `pg_blocking_pids()` for slow requests; deduplicate/debounce client saves per task; add optimistic version checks; shorten any surrounding transaction; return conflict responses instead of queuing stale writes.
- **Risk/effort:** medium; concurrency semantics require tests.
- **Validation:** 50 controlled disposable task updates; p95 below 800 ms; no lost updates.

## P1

### Stop blocking every authenticated route on the full workspace warm-up

- **Evidence:** app layout sequentially requests user → workspace, then awaits up to 18 API warm-up requests before clearing its full-screen loading state.
- **Fix:** render after identity/workspace plus current-route critical data; background other warm-ups with bounded concurrency; keep cache deduplication; measure cold and warm navigations.
- **Risk/effort:** medium-high; validate all roles and plans.

### Server-render static public content and use client islands

- **Evidence:** every public route exceeds 2 s mobile LCP; 28–100 KB unused JS; TTFB and TBT are low.
- **Routes:** `/`, `/home`, `/pricing`, `/terms`, `/privacy`, `/coming-soon`.
- **Fix:** Server Components for content; client islands for menus, FAQ, and demos.
- **Expected gain:** 50–150 KB less initial JS, earlier LCP, less hydration.

### Stabilize invite/onboarding loading geometry

- **Evidence:** Invite CLS 0.49 and client-only token validation; both onboarding routes exceed 3.6 s Lighthouse LCP.
- **Fix:** server token lookup; stable skeleton/card dimensions; lazy auth SDK.

## P2

### Optimize logos and metadata icon

- **Evidence:** 45 KB visible logo plus 46 KB metadata icon on many routes; Lighthouse estimates 41 KB saving on the landing logo.
- **Fix:** `next/image` with explicit dimensions and AVIF/WebP; add a purpose-sized favicon; avoid loading two logo variants on Pricing.

### Reduce initial font set

- **Evidence:** duplicate remote fonts are fixed, but four self-hosted files still total roughly 114 KB.
- **Fix:** preload only the primary above-fold family; load mono/display faces on demand; subset weights/glyphs where supported.

### Split heavy feature libraries

- **Evidence:** raw chunks include ExcelJS/XLSX at 909/399 KB, Recharts at 378 KB per route chunk, and OpenPGP at 372 KB.
- **Fix:** dynamically import XLSX only on import/export actions; lazy-load charts below fold; load OpenPGP only inside Messaging; verify Turbopack deduplication.

### Review link prefetch policy

- **Evidence:** strict settle occurs 1–3 s after visual LCP because background route chunks are prefetched.
- **Fix:** disable prefetch for low-probability auth/legal routes on the marketing page or delay it until idle/intent; compare navigation p95 before adopting.

## P3

### Add field performance monitoring

- Capture LCP, INP, CLS, FCP, and TTFB by route/device/deployment without message content, form values, tokens, or private query parameters.

### Repair and expand performance CI

- Confirm a test user in a disposable Supabase project.
- Store Playwright auth state outside source control.
- Run limited public Lighthouse and critical authenticated Playwright flows on pull requests; full route/multi-browser audits nightly.

### Resolve Waitlist access intent

- `/waitlist` currently redirects to Login because middleware does not classify it as public. Decide whether this is intentional before performance testing the actual page.

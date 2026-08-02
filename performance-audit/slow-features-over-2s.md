# IrisOS features exceeding two seconds

## Result

All ten anonymously reachable page features exceed the 2,000 ms cold-load budget on the mobile test profile. None exceeds two seconds on desktop; desktop Lighthouse LCP is 651–932 ms.

The table uses two independent measurements against the local Next.js production server:

- **Lighthouse LCP**: simulated mobile measurement of when the largest visible content renders.
- **Cold settle**: Playwright Fast 4G (1.6 Mbps down, 150 ms latency, 4× CPU slowdown), cache disabled, measured until the resource count is quiet for 750 ms. This includes background route prefetches, so it is intentionally stricter than visual readiness.

| Rank | Feature / route | Lighthouse LCP | Cold settle | Transfer / requests | Exact measured reason | What will reduce it |
|---:|---|---:|---:|---:|---|---|
| 1 | Pricing `/pricing` | 4,320 ms | 4,481 ms | 483 KB / 31 | Client-rendered pricing UI, 82 KB of unused JavaScript, two logo PNGs totaling about 88 KB, shared font/CSS cost, and multiple entrance animations. TTFB is negligible, so the server is not the bottleneck. | Render plan content as a Server Component; keep only the menu/FAQ as client islands; use `next/image` or AVIF/WebP logos; remove non-critical route prefetch and defer below-fold animation code. |
| 2 | Client invite `/invite` | 3,915 ms | 3,714 ms | 414 KB / 20 | The page first renders a full-screen verification state, then a client effect reads the token and swaps in the form/error UI. That swap produces CLS **0.49**. The initial bundle includes about 100 KB unused JS and Supabase auth code before submit. | Validate the token in a Server Component; reserve the final card geometry in the loading state; lazy-load the Supabase submit path; optimize the logo. |
| 3 | Login `/login` | 3,814 ms | 4,090 ms | 427 KB / 26 | 74 KB unused JS, the 56 KB compressed Supabase browser chunk, multiple preloaded fonts, a 45 KB displayed logo plus a 46 KB metadata icon, and background prefetch. TBT is only 8 ms, ruling out CPU as the main cause. | Lazy-load the auth SDK when the form is used or move password auth to a server endpoint/action; ship one primary font initially; provide a small favicon; optimize the visible logo; disable low-value auth-route prefetch. |
| 4 | Signup `/signup` | 3,807 ms | 4,085 ms | 427 KB / 26 | Same shared auth payload as login: Supabase SDK, fonts, duplicate logo/icon bytes, 74 KB unused JS, and background prefetch. | Apply the login changes and split OAuth/password actions into on-demand modules. |
| 5 | Member onboarding `/onboarding/member` | 3,615 ms | 3,153 ms | 370 KB / 18 | Token validation begins only after hydration; the initial full-screen loader is replaced with an error/form. The route ships about 100 KB unused JS and Supabase before the user submits. | Validate token data on the server, use a geometry-stable shell, and load auth/OAuth code only when selected. |
| 6 | Landing `/` | 3,398 ms | 4,405 ms | 431 KB / 26 | The marketing page is one large Client Component. Lighthouse finds 79 KB unused JS, 41 KB potential logo-image savings, and about 410 ms render-blocking CSS opportunity. Background links also prefetch auth-route code. | Convert static sections to Server Components, isolate menu/interactive demos, use `next/image`, split critical CSS, and disable or delay non-critical prefetch on constrained connections. |
| 7 | Landing alias `/home` | 3,391 ms | 4,409 ms | 431 KB / 26 | `/home` re-exports the same large client landing page and therefore has the same payload and dependency chain. | Apply the `/` changes once; both routes benefit. Prefer a redirect or canonical route if the alias is not required. |
| 8 | Terms `/terms` | 3,390 ms | 3,836 ms | 360 KB / 22 | A static legal document is implemented as a Client Component, so it hydrates unnecessarily. It also pays the global font, CSS, metadata icon, and logo cost. | Make the document a Server Component, extract only interactive navigation into a small client island, and optimize the logo/favicon. |
| 9 | Privacy `/privacy` | 3,387 ms | 3,863 ms | 363 KB / 22 | Same architecture as Terms: static content hydrates on the client and downloads shared fonts/images/CSS; 28 KB JS is unused during the audited load. | Apply the Terms-page conversion and shared asset changes. |
| 10 | Coming soon `/coming-soon` | 3,164 ms | 2,792 ms | 292 KB / 15 | Smallest public payload, but still carries shared CSS, four self-hosted font files, core client chunks, and 50 KB unused JavaScript. | Use a server-rendered static shell, preload only the primary above-fold font, and remove client code that is not needed for the initial state. |

## Shared root causes proven by the traces

1. **Transfer/hydration, not backend latency.** Local production TTFB is 3–12 ms and Lighthouse TBT is 0–21 ms. The routes transfer 292–483 KB before background work settles.
2. **Too much public-route JavaScript.** Lighthouse reports 28–100 KB unused JavaScript per route. The 56 KB compressed Supabase chunk appears on routes that import auth behavior or prefetch an auth route.
3. **Global assets are expensive.** Four local font files total roughly 114 KB, the displayed logo is about 45 KB, and the metadata icon is another 46 KB. Lighthouse estimates roughly 41 KB can be saved on the displayed landing logo alone.
4. **Static content is client-rendered.** Landing, legal, invite, onboarding, login, signup, and pricing pages are Client Components. Several do not need full-page hydration.
5. **Animations can redefine LCP.** The landing hero originally stayed transparent until hydration and IntersectionObserver callbacks. Rendering the above-fold elements eagerly reduced Lighthouse LCP from 4,079 ms to 3,398 ms.
6. **Background prefetch extends strict settle time.** `<Link>` prefetch downloads route chunks after the page is visually useful. This explains why Playwright settle is later than its observed LCP on most routes.

## Authenticated features: measurement blocker and high-risk startup path

The supplied seeded client login reaches Supabase but returns **“Email not confirmed.”** No confirmed administrator/member/client account or reusable storage state was available. Therefore timings for Dashboard, Finance, Clients, Projects, Tasks, Team, Calendar, Messages, Reporting, Atlas, Settings, and related authenticated actions are not presented as measured browser results.

Static tracing shows a likely cross-feature startup bottleneck that must be validated with a confirmed test account: [`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx) performs `/api/user`, then `/api/workspace`, then waits for a warm-up of up to 18 API URLs before clearing the full-screen “Loading workspace” state. That makes every protected feature depend on the slowest warm-up request. The safe redesign is to render after identity plus current-route critical data, warm other modules in the background with bounded concurrency, and retain request deduplication.

## Database-backed feature over two seconds

`pg_stat_statements` proves that task status/progress saves are a separate severe bottleneck:

| Operation | Calls | Mean | Maximum | Disk read time | Exact interpretation |
|---|---:|---:|---:|---:|---|
| `UPDATE "ClientTask" SET status, progress ... WHERE id = $4` | 131 | 9,994.4 ms | 49,518.5 ms | 0 ms | Primary-key update with no table scan, no trigger, and no disk reads; elapsed time is dominated by row/transaction lock waiting from concurrent writes. |
| Same query shape (second normalized statement) | 19 | 9,420.9 ms | 22,535.3 ms | 0 ms | Same contention pattern. |
| Non-contentious task update variants | 8 | 4.6 ms | 12.0 ms | 0 ms | Confirms the update itself is fast when it does not wait. |

Recommended fix: instrument `pg_blocking_pids()` around slow saves, attach a request/interaction ID, prevent duplicate in-flight saves per task, debounce slider/status writes, use optimistic concurrency/version checks, keep write transactions short, and return a 409 for conflicting stale writes. Do not add an index: the primary-key lookup already works and an index cannot fix lock contention.

## Routes that were not the pages their URL suggests

- `/waitlist` redirects anonymously to `/login` because it is absent from the public-route allowlist in `src/lib/middleware.ts`. Its earlier performance trace measured Login, not Waitlist.
- `/oauth/consent` also redirects to Login when anonymous, which is consistent with a protected consent screen.

These are excluded from the ten-feature table. If Waitlist is intended to be public, fix the allowlist before benchmarking the actual page.

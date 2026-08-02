# Performance optimization implementation results

Updated: 2026-08-02

## Outcome

The evidence-backed loading fixes from the audit have been implemented, except for the remaining structural work listed below. Production build, TypeScript, and all 126 unit/component tests pass.

The mobile Lighthouse pass improved every directly comparable public route. The routes remain above the audit's aggressive 2,000 ms Lighthouse LCP budget, but the bottleneck is now predominantly the shared Next.js/CSS/font baseline rather than backend latency, oversized logos, eager Supabase/XLSX payloads, page-wide hydration on legal/pricing pages, or invite layout shift.

| Route | Previous Lighthouse LCP | Current Lighthouse LCP | Change | Current transfer | Current unused JS |
|---|---:|---:|---:|---:|---:|
| `/pricing` | 4,320 ms | 2,905 ms | -33% | 325 KB | 29 KB |
| `/login` | 3,814 ms | 2,940 ms | -23% | 310 KB | 52 KB |
| `/signup` | 3,807 ms | 2,943 ms | -23% | 311 KB | 52 KB |
| `/invite` | 3,915 ms | 2,868 ms | -27% | 307 KB | 46 KB |
| `/onboarding/member` | 3,615 ms | 2,875 ms | -20% | 261 KB | 48 KB |
| `/terms` | 3,390 ms | 2,863 ms | -16% | 327 KB | 50 KB |
| `/privacy` | 3,387 ms | 3,017 ms | -11% | 336 KB | 50 KB |
| `/coming-soon` | 3,164 ms | 2,714 ms | -14% | 282 KB | 51 KB |
| `/` | 3,398 ms | 3,090 ms | -9% | 341 KB | 48 KB |
| `/waitlist` | previously redirected to Login | 2,793 ms | now measurable/public | 321 KB | 29 KB |

`/home` is now a permanent redirect to the canonical `/` route and is no longer a duplicate feature payload.

## Implemented changes

### Authenticated startup

- The authenticated shell now renders as soon as identity and workspace scope are ready.
- Its 18-endpoint cross-module warm-up runs in the background instead of holding the full-screen loader open.
- Background warming is capped at three concurrent requests, retains cache deduplication, suppresses global loading UI, and treats failures as opportunistic.
- Secure messaging preparation remains dynamically imported and no longer blocks shell readiness.

### Task-save contention

- Task writes now use the row's `updatedAt` value as an optimistic version where the UI has one.
- Duplicate in-flight writes for the same task are rejected in the Tasks and Teams Dashboard interaction paths.
- The final task update and update-log insert execute in one short transaction.
- PostgreSQL `lock_timeout` is set locally to 750 ms for that transaction. Lock waits and stale versions return HTTP 409 instead of queuing a stale request for 10-50 seconds.
- No index was added because telemetry proved the primary-key lookup was already fast and disk reads were zero.

The code-level contention guard is complete. A confirmed disposable authenticated account is still required for the audit's 50-write p95 validation without risking real task data.

### Public rendering and payload

- Terms, Privacy, and Pricing are Server Components. Only the shared marketing header remains an interactive client island; Pricing uses native `details` controls for its mobile menu and FAQ.
- Coming Soon was already a Server Component and was left unchanged.
- `/home` now redirects permanently to `/`.
- Login, Signup, Invite, and Member Onboarding dynamically import the Supabase browser client only after an auth action.
- Missing invite/onboarding tokens render a stable error state immediately. Invite CLS fell from 0.49 to effectively zero in the Fast 4G trace.
- `/waitlist` is included in the anonymous middleware allowlist and audit inventory.
- Low-value marketing/auth/legal link prefetches are disabled.

### Assets, fonts, and feature libraries

- Public-route wordmarks use `next/image` with explicit dimensions and above-fold priority where appropriate.
- The two 47-48 KB logo favicons were replaced by one purpose-sized SVG favicon.
- Geist Mono and JetBrains Mono no longer preload globally; the two above-fold proportional families remain preloaded.
- XLSX is dynamically imported only when a user downloads or parses a spreadsheet in Agency Leads or Team.
- Dashboard and Clients chart modules are split behind dynamic loading states.
- ExcelJS was already dynamically loaded in Finance, and OpenPGP was already scoped to the dynamically imported messaging protocol, so those completed implementations were retained.

## Current features above two seconds

All ten canonical public pages in the table above remain over 2,000 ms under Lighthouse's simulated mobile profile. Their TTFB is 4-6 ms and TBT is 3-12 ms, so neither the local server nor main-thread blocking is the current constraint.

The remaining shared reason is a 261-341 KB initial transfer consisting primarily of global CSS, two proportional font files, Next/React runtime chunks, and 29-52 KB of route-unused JavaScript under simulation. The landing route additionally remains a large Client Component because its interactive demo, reveal, video, navigation, and wedge visualizations currently share one client boundary.

The next changes capable of moving these routes below two seconds are:

1. Split the 71 KB source global stylesheet into marketing, auth, and authenticated-workspace route-group styles so public pages do not parse workspace selectors.
2. Break the landing page into Server Component sections with small header, video, and interactive-demo islands.
3. Move password authentication behind server endpoints/actions to eliminate the remaining browser auth surface from initial auth-route graphs.
4. Extract Finance's five inline Recharts blocks into below-fold dynamically loaded chart islands.
5. Add field Web Vitals collection before further font removal; both Space Grotesk and Geist are used above the fold on the marketing/legal routes.

## Validation

- TypeScript: passed (`npx tsc --noEmit`).
- Production build: passed (`npm run build`, 72 static pages generated).
- Unit/component tests: 33 files, 126 tests passed.
- Fast 4G route trace: 22 public route/profile combinations measured; 10 valid public traces (including the former `/home` alias) showed observed visual LCP below 2 seconds before strict network-settle accounting.
- Lighthouse: mobile reports regenerated for all public routes; the corrected member-onboarding report renders `ONBOARDING LINK INVALID`, not the Next.js error boundary.
- Public static load: 160 requests, zero failures; concurrency-25 p95 38 ms.
- ESLint: repository baseline remains red. The targeted run reported pre-existing errors in Dashboard, Teams Dashboard, and Waitlist plus existing warnings; no new type/build/test failure was introduced.
- In-app browser visual verification was unavailable because no browser instance was exposed in this session. Production Playwright traces and server-render checks were used instead.

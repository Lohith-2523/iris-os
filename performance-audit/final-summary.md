# Final performance summary

> A second implementation pass is documented in [implementation-results.md](./implementation-results.md). It supersedes the remaining-risk statements below where startup warming, task contention guards, public Server Components, asset delivery, and library splitting have now been implemented.

## Changes made

1. Removed the four duplicate remote `static.figma.com` font faces and reused the existing `next/font` variables.
2. Moved authenticated-only session sync, Meta SDK loading, and file-input security guards from the root layout into the authenticated app layout.
3. Rendered the landing hero’s above-the-fold reveal content eagerly instead of waiting for hydration/IntersectionObserver.
4. Removed the page-wide opacity animation from Pricing so Lighthouse and paint metrics can observe the page reliably.
5. Added route discovery, Playwright profiling, Lighthouse, bundle analysis, safe public load testing, budgets, and reports under `performance-audit/`.

## Before and after

| Area | Metric | Before | After | Change |
|---|---:|---:|---:|---:|
| Landing `/` | Fast 4G transfer | 735 KB | 431 KB | -41% |
| Landing `/` | Fast 4G cold settle | 5,982 ms | 4,405 ms | -26% |
| Landing `/` | Lighthouse LCP | 4,079 ms | 3,398 ms | -17% |
| Landing `/` | Lighthouse performance | 87 | 92 | +5 points |
| Terms | Fast 4G transfer | 727 KB | 360 KB | -50% |
| Terms | Fast 4G cold settle | 5,809 ms | 3,836 ms | -34% |
| Privacy | Fast 4G transfer | 730 KB | 363 KB | -50% |
| Privacy | Fast 4G cold settle | 5,769 ms | 3,863 ms | -33% |
| Coming Soon | Fast 4G transfer | 510 KB | 292 KB | -43% |
| Coming Soon | Fast 4G cold settle | 4,581 ms | 2,792 ms | -39% |
| Login | Fast 4G transfer | 581 KB | 427 KB | -27% |
| Login | Fast 4G cold settle | 5,034 ms | 4,090 ms | -19% |
| Pricing paint audit | Lighthouse | No FCP | Valid report, score 85 | Fixed observability/render risk |

The original `/home` baseline used a warmed font cache, so its apparent regression is not a valid before/after comparison. Final `/home` and `/` results match, as expected from the re-export.

## Final mobile results

All ten anonymously reachable routes still exceed the 2,000 ms Lighthouse LCP budget on simulated mobile. See [slow-features-over-2s.md](./slow-features-over-2s.md) for the ranked, reasoned list.

Desktop is healthy: all public-route Lighthouse LCP results are below one second. Local static GET load testing also passed at concurrency 25 with p95 38 ms and zero failures.

## Authenticated and database results

Authenticated browser flows remain blocked by the seeded test account’s Supabase “Email not confirmed” state. The existing `tests/e2e/client-login.spec.ts` fails for the same reason. No authenticated timings have been invented.

Read-only database telemetry was available. Normal application reads are generally sub-10 ms, but task status/progress updates average 9.4–10.0 seconds and peak at 49.5 seconds. Zero block-read time, a primary-key predicate, and no trigger identify lock contention—not missing indexes—as the cause.

## Validation

- Production build: passed after both optimization groups.
- Unit/component tests: 33 files, 126 tests passed.
- Route budget: correctly fails 10 mobile route/profile combinations over 2,000 ms.
- Lighthouse: 24 JSON/HTML report pairs generated; Pricing re-audited after its paint fix.
- Database: Prisma schema valid; read-only PostgreSQL statistics collected.
- Load: 160 local public GETs across four concurrency stages, zero failures.

## Remaining risks

- A confirmed, representative test user is required to finish authenticated route, API waterfall, workspace switching, form-save, chart/table, messaging, upload, and logout measurements.
- The authenticated shell’s 18-endpoint blocking warm-up is a probable cross-feature bottleneck but was not changed without runtime evidence.
- No meaningful load was applied to authenticated APIs or production infrastructure.
- No production index or database setting was changed.
- Repository-wide ESLint remains red with 13 errors and 197 warnings in pre-existing application/backup code; the production build and 126 tests pass.
- The repository was already dirty before the audit. Work was isolated on `performance/full-app-audit`, but no audit commit was created because it would risk mixing unrelated user changes.

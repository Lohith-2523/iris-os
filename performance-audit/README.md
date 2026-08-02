# IrisOS performance audit

Post-audit implementation and re-measurement: [implementation-results.md](./implementation-results.md)

This directory contains the reproducible local production audit requested on 2026-08-02.

## Primary report

- [Features over two seconds](./slow-features-over-2s.md)
- [Baseline summary](./baseline-summary.md)
- [Final summary](./final-summary.md)
- [Optimization backlog](./optimization-backlog.md)
- [Route inventory](./route-inventory.md)

## Reproduction

Run a production server first:

```powershell
npm.cmd run build
npm.cmd run start
```

Then, in another terminal:

```powershell
npm.cmd run perf:routes
npm.cmd run perf:playwright
npm.cmd run perf:lighthouse
npm.cmd run perf:bundle
npm.cmd run perf:load
npm.cmd run perf:budget
```

Set `PERF_TEST_EMAIL` and `PERF_TEST_PASSWORD` only in the shell when using a confirmed disposable test account. Never add credentials or generated storage state to source control.

## Artifacts

- `reports/lighthouse/`: JSON and HTML Lighthouse reports.
- `reports/playwright/`: baseline and final route runtime measurements.
- `reports/network/`: slow-request extraction.
- `reports/load/`: safe local public GET load test.
- `reports/screenshots/`: screenshots retained for routes over budget or failures.

## Scope caveat

Public routes, production builds, bundles, local static load, and read-only database telemetry were completed. Authenticated browser workflows could not be completed because the available seeded client account is unconfirmed in Supabase. The report separates measured facts from authenticated-route recommendations.

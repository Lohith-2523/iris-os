# Performance regression coverage

The executable regression checks live in `performance-audit/scripts/`:

- `audit-routes.mjs` performs cold desktop and Fast 4G route measurements.
- `run-lighthouse.mjs` writes route-level Lighthouse JSON/HTML reports.
- `load-test.mjs` performs the safe local public GET load stages.
- `check-performance-budget.mjs` reports every route/profile over budget and exits non-zero in CI.

Authenticated performance tests must use an externally supplied, confirmed disposable account. Credentials and browser storage state must not be committed here.

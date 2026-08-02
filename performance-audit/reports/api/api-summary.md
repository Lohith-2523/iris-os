# API and server summary

Anonymous public page TTFB is 3–12 ms locally. Static-route concurrency up to 25 completed with zero failures and p95 38 ms.

Authenticated API response distributions could not be measured because the available seeded account is unconfirmed. The middleware/auth boundary was exercised: protected routes redirect to Login and the known client login returns “Email not confirmed.”

Code-level waterfall risks to validate with a confirmed account:

- App shell: `/api/user` → `/api/workspace` → up to 18 awaited warm-up APIs.
- Dashboard: up to 11 page-level API paths.
- Finance: up to 13 page-level API paths plus dynamic ExcelJS operations.
- Client onboarding: five page-level API paths.
- Projects/Tasks/Team/Teams Dashboard: four to seven page-level API paths each.

Do not change caching or authorization behavior until authenticated timings and user/workspace isolation regression tests exist.

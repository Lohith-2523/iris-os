# Iris OS architecture

Status: server-first execution architecture, 31 August 2026  
Style: domain-oriented modular monolith  
Runtime: Next.js 16.2.9, React 19.2.4, Prisma 7.9.1, PostgreSQL, Supabase Auth

Rollback copy: `backup-features/architecture-docs-before-server-first-refactor-2026-08-27/`

The standalone Mermaid source is available in [`iris-os-architecture.mmd`](./iris-os-architecture.mmd).

## Architecture outcome

Normal authenticated reads for the workspace shell, Dashboard, Projects, Tasks, Clients, Finance, Team, Reporting, Security, Messaging, and Atlas now follow this path:

```text
request
-> minimal proxy and Supabase cookie refresh
-> App Router Server Component
-> request-deduplicated RequestSecurityContext
-> route authorization
-> parallel page read model
-> tenant-scoped domain services
-> Prisma/PostgreSQL
-> populated RSC payload
-> interactive Client Component
```

API handlers remain the HTTP boundary for mutations, browser refreshes, realtime activity, integrations, and external callers. Server Components call shared services directly; they do not call Iris OS API routes over HTTP.

## Previous request path

Before this migration, the authenticated shell and primary pages were broad Client Components:

```text
browser
-> static page shell
-> hydrate layout
-> GET /api/workspace
-> Supabase getUser
-> Prisma User + Organization
-> hydrate page
-> page useEffect
-> several internal APIs
-> repeated Supabase getUser and User/Organization lookup per API
-> page state updates
-> critical data becomes visible
```

Representative initial browser requests before migration:

| Page | Initial read pattern |
| --- | --- |
| Dashboard | workspace plus dashboard, clients, tasks, Meta, calendar, leads, notifications |
| Projects | workspace plus projects, clients, team, workspace repeat |
| Tasks | workspace plus projects, team, user, tasks |
| Clients | workspace plus clients, team, user |
| Finance | workspace plus finance, clients, transactions, organization, invoices, subscriptions, integrations, Atlas |

## Request security context

`getRequestSecurityContext()` is server-only and wrapped in React `cache()`. Next.js 16 documentation guarantees this cache is scoped to the current request, so identity cannot be reused across requests or users.

It resolves:

- verified Supabase identity;
- Prisma User mapping;
- organization and tenant ID;
- role and client scope;
- preferences and onboarding state;
- normalized plan and entitlements.

`getAuthenticatedIdentity()` and `getRequestUser()` are also request-deduplicated. There is no global identity or cross-tenant data cache.

## Domain services and read models

Server-only services own reusable read behavior:

- `WorkspaceService`: workspace, preferences, onboarding, integration status, entitlements;
- `ProjectService`: bounded project pages and delivery-delay summaries;
- `TaskService`: bounded task pages with client/member visibility predicates;
- `WorkspaceDirectoryService`: tenant-scoped clients and team;
- `FinanceReadService`: dashboard and finance metrics;
- page read models: Dashboard, Projects, Tasks, Clients, Finance, Team, Reporting, Security, Messaging, and Atlas orchestration.

API GET handlers for workspace, projects, tasks, dashboard/finance data, clients, and team use these same services. Mutations retain existing Zod parsing, authorization, transactions, locks, and response semantics.

## Server/client ownership

Server Components now own authentication, route authorization, initial critical reads, and page composition for migrated pages. Client files preserve existing UX and interaction behavior:

- dialogs, drawers, forms, filters, tables, charts, optimistic state, and refreshes remain client-side;
- critical initial collections, summaries, Atlas sessions, and chat messages arrive as props;
- post-mutation refreshes continue through existing APIs and `workspaceFetch`;
- secondary provider, notification, activity, and integration reads may load after hydration;
- messaging ciphertext and conversation indexes arrive with the server payload, while private-key operations and plaintext remain browser-only.

## Security invariants

These boundaries remain mandatory:

1. Supabase owns browser sessions, secure cookies, verification, refresh, sign-in, and sign-out.
2. Every server read resolves a request-scoped authenticated principal.
3. `orgId` remains mandatory on tenant-rooted reads and writes.
4. Client users retain client scope; members retain assignment or membership scope where existing APIs enforced it.
5. Admin, sub-admin, member, and client route restrictions use one shared policy in server pages and the client shell.
6. Plan and Atlas capability gates remain unchanged.
7. Prisma remains the only ORM/data boundary; existing transactions, advisory locks, unique constraints, capacity checks, and deletion semantics remain.
8. Zod and file/request validation remain at mutation and integration boundaries.
9. Provider credentials remain encrypted/server-only and are never included in RSC props.
10. Messaging private keys remain in browser IndexedDB; the server persists ciphertext only.
11. Atlas retains tenant context, consent, permissions, token reservation/reconciliation, provider budgets, and confirmation boundaries.
12. Webhook signatures, OAuth state, Meta association, and financial permissions remain unchanged.

## Proxy

`src/proxy.ts` remains lightweight. It handles the coming-soon gate and delegates Supabase session refresh/route protection to `shared/lib/middleware.ts`. It performs no Prisma domain query, organization hydration, page read, or provider request.

## Caching

- Request cache: React `cache()` for identity, User/Organization resolution, security context, workspace model, and page models.
- Server data cache: no cross-request tenant data cache was introduced. Sensitive data therefore cannot leak through a missing tenant key.
- Client cache: `workspaceFetch` remains for refreshes, navigation reuse, invalidation, and background checks, but migrated pages no longer depend on it for useful first render.

## Pagination and query plans

Projects and tasks retain cursor pagination with a default 50-row page and bounded nested collections. Prisma's existing global guard caps `findMany` at 250 rows.

Measured local PostgreSQL plans:

| Query | Execution | Planning | Change |
| --- | ---: | ---: | --- |
| tenant projects, 51 rows | 3.903 ms | 16.326 ms | no index added |
| tenant clients, 51 rows | 1.347 ms | 5.203 ms | no index added |
| tenant tasks through client | 4.355 ms | 20.528 ms | no index added |

Execution was already below 5 ms on current data. No speculative index was added. Reproduce with `npm run perf:query-plans`.

## Observability

Server spans record duration only; they never include IDs, tokens, message contents, credentials, or tenant payloads. Instrumented spans include:

- `identity.supabase.get-user`;
- `identity.workspace-user`;
- `security.request-context`;
- `read-model.workspace`.

The in-process bounded sample registry exposes average, p50, p75, p95, and p99 summaries. Set `IRIS_PERFORMANCE_LOGS=1` to emit structured duration events.

## Baseline and measurement limits

The pre-refactor build passed. Build phases were 7.4 s compile, 14.1 s TypeScript, and 565 ms static generation. Public/auth-boundary Playwright baselines were saved for development and production.

| Login metric | Development before | Production before | Production after |
| --- | ---: | ---: | ---: |
| Desktop TTFB | 33.6 ms | 4.6 ms | 5.7 ms |
| Desktop feature settle | 1,064 ms | 940 ms | 940 ms |
| Mobile Fast 4G TTFB | 36.4 ms | 3.9 ms | 3.6 ms |
| Mobile Fast 4G feature settle | 4,011 ms | 3,409 ms | 3,469 ms |

Public login request count remained 24 desktop and 23 mobile. Differences are within local-run noise; the authenticated refactor did not regress the public auth surface in this sample.

Authenticated browser timings could not be captured: all repository test credentials were invalid or Supabase reported `Email not confirmed`. No external account was created, confirmed, or modified for the audit. Authenticated before/after latency fields must remain unclaimed until a disposable confirmed test account is supplied.

## Migration map

| Page | Previous boundary | Current boundary | Benefit | Risk |
| --- | --- | --- | --- | --- |
| Workspace shell | client `/api/workspace` after hydration | server context + workspace model, client shell interactions | removes blocking shell API/auth waterfall | high, verified by build and auth policy tests |
| Dashboard | client seven-request batch | server critical dashboard/clients/tasks/workspace; secondary provider/activity reads client-side | critical cards and lists in RSC | high |
| Projects | client four-request batch | server parallel projects/clients/team/workspace model | no critical browser API waterfall | high |
| Tasks | client projects/team/user/tasks sequence | server parallel tasks/projects/team/context | immediate first task list | high |
| Clients | client clients/team/user sequence | server parallel clients/team/context | immediate portfolio data | high |
| Finance | client finance/workspace/clients plus secondary reads | server finance/workspace/clients; secondary/manual/provider reads client-side | immediate finance summary | high |
| Messaging | client E2EE and SSE | unchanged security-first client boundary | preserves private-key boundary | critical security exception |
| Atlas | client sessions request followed by selected-message request | tenant-scoped server snapshot containing visible sessions and their messages; client streaming retained | removes chat waterfall and makes existing chat selection local | high |
| Team, Reporting, Security | client mount-time API reads | server page read models with interactive client components | populated first render and fewer browser requests | high |
| Remaining interactive modules | client reads with workspace cache | route-matched skeleton boundaries plus local loading gates; reads remain client-side where not yet migrated | prevents partial empty UI while preserving complex integration behavior | medium |

## Removed waterfalls and duplicate work

- workspace shell render no longer waits for browser hydration and `/api/workspace`;
- Projects initial `/api/projects`, clients, team, and workspace requests removed;
- Tasks initial projects, team, user, and tasks requests removed;
- Clients initial clients, team, and user requests removed;
- Dashboard critical dashboard, clients, tasks, and workspace requests removed;
- Finance critical finance, clients, and workspace requests removed;
- Atlas initial sessions, selected chat, and avatar requests removed;
- Team initial workspace, directory, and projects requests removed;
- Reporting initial reports and clients requests removed;
- Security initial users request removed;
- layout and page calls share one request security context;
- independent domain reads run in `Promise.all`;
- API handlers and Server Components share domain functions rather than internal HTTP.

## Verification

| Guarantee | Proof |
| --- | --- |
| Supabase authentication | existing auth implementation retained; request context calls verified `getUser()` |
| Tenant isolation | `tenant-isolation.test.ts` checks consecutive org A/org B predicates for projects, tasks, clients, and team |
| Roles and membership | shared route-policy tests plus client/member service predicate tests |
| Cache isolation | only request-scoped React cache; consecutive-context tenant tests prove query scope is not reused |
| Plan gates | existing plan entitlement tests pass |
| Prisma invariants | no mutation transaction, advisory lock, capacity, or deletion path changed |
| Messaging E2EE | OpenPGP tests pass; messaging implementation unchanged |
| Workspace client cache | cache-policy and workspace-data-cache tests pass |
| Provider/Atlas secrets | only sanitized workspace fields enter RSC props; provider services unchanged |
| Type/build | `tsc --noEmit` and production Next.js build pass |

## Performance report status

| Metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Workspace authenticated cold load | unavailable | unavailable | pending confirmed test account |
| Project navigation | unavailable | unavailable | pending confirmed test account |
| Task navigation | unavailable | unavailable | pending confirmed test account |
| Critical browser API requests: Projects | 4 page reads plus shell | 0 | four page requests removed |
| Critical browser API requests: Tasks | 4 page reads plus shell | 0 | four page requests removed |
| Critical browser API requests: Clients | 3 page reads plus shell | 0 | three page requests removed |
| Critical browser API requests: Dashboard | 4 critical page reads plus shell | 0 | critical reads moved to RSC |
| Critical browser API requests: Finance | 3 critical page reads plus shell | 0 | critical reads moved to RSC |
| Supabase calls for migrated critical read | one per previous API | 1 per RSC request | request-deduplicated |
| User/Organization lookup | one per previous API | 1 per RSC request | request-deduplicated |
| Production build compile | 7.4 s | 6.7 s | 0.7 s |
| Production TypeScript phase | 14.1 s | 13.2 s | 0.9 s |

Actual authenticated latency and browser bundle deltas must be measured after a confirmed disposable account is available. Loading indicators were not manipulated to manufacture a faster result.

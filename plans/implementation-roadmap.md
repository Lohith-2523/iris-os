# Iris OS Implementation Roadmap

## Phase 1: Foundation

Create the application foundation before feature work:

- Initialize Next.js App Router with TypeScript.
- Configure Tailwind CSS and shared theme tokens.
- Add shadcn/Radix-style component primitives.
- Add app shell with sidebar navigation, top bar, organization switcher, search, command entry, and user menu.
- Add Prisma ORM, PostgreSQL configuration, and seed script.
- Add Auth.js structure with mocked demo login.
- Add shared table, chart, metric card, score badge, insight panel, empty state, drawer, modal, tabs, and filter components.
- Add deterministic seed data for all main domains.
- Add Atlas AI mock service.
- Add Vitest and Playwright setup.

Acceptance:

- Every main nav item exists and routes to a non-placeholder page shell.
- Seed data can be loaded locally.
- App shell works on desktop and mobile.
- Tests can run without external credentials.

## Phase 2: Executive Core

Build the product's decision-making center:

- Dashboard
- Atlas
- Finance
- Clients
- Forecasting

Acceptance:

- Agency Command Center shows health, revenue, churn, profit leaks, capacity, and executive recommendations.
- Ask Atlas returns deterministic contextual answers.
- Finance and client pages share real seeded metrics.
- Forecasting uses the same data model as finance, clients, team, and projects.

## Phase 3: Delivery And Reporting

Build operational management:

- Projects
- Team
- Reporting
- Analytics
- Operations

Acceptance:

- Projects connect to clients, team capacity, profitability, and risks.
- Reporting can generate client and executive report views from seeded data.
- Analytics provides cross-module business intelligence.
- Operations exposes approvals, queues, and process health.

## Phase 4: Creative Operations

Build Design Hub as a first-class module:

- Basic plan design workspace.
- Pro plan creative operations and intelligence.
- Advanced plan enterprise asset, governance, automation, and API console surfaces.
- Mock Canva adapter, social publishing adapter, and asset workflows.

Acceptance:

- Design Hub includes dashboard, library, publishing center, content calendar, brand center, approval queue, creative analytics, asset manager, governance, automation builder, and design API console.
- Canva is represented as the workflow provider without making Iris OS feel secondary.

## Phase 5: Automation, Integrations, And Settings

Complete SaaS operating surfaces:

- Automations
- Integrations
- Settings
- Cross-module polish

Acceptance:

- Automation builder supports realistic trigger/action/run states.
- Integrations include connected, disconnected, syncing, failed, and log states.
- Settings includes organization, users, roles, brands, notifications, billing-plan flags, and security basics.
- No main route contains placeholder content.

## Phase 6: Quality Pass

Finish the MVP with product-grade consistency:

- Audit every route for visual consistency.
- Check desktop and mobile layouts.
- Verify no prohibited colors or visual styles dominate.
- Ensure Atlas insights appear across major modules.
- Run Playwright navigation and workflow tests.
- Run unit tests for seed data, forecasts, scoring, and adapters.


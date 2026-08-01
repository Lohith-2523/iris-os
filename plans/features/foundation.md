# Feature Plan: Foundation And App Shell

## Goal

Create the full-stack base for CrystalOS so feature agents can add modules without re-deciding stack, layout, data patterns, or test setup.

## Build

- Initialize Next.js App Router with TypeScript, Tailwind CSS, ESLint, Vitest, and Playwright.
- Create a premium app shell with sidebar navigation, top bar, global search, Ask Atlas entry, organization switcher, user menu, and responsive mobile navigation.
- Add shared UI primitives for cards, buttons, tabs, dialogs, drawers, tables, charts, metric cards, score badges, filters, insight panels, and page headers.
- Configure Prisma ORM with PostgreSQL and a seed script.
- Add Auth.js structure with demo authentication.
- Add deterministic seed data for all modules.
- Add internal mocked Atlas AI service.
- Add mocked integration adapter interfaces.

## Data

Seed at least one organization, three brands, six users, twelve clients, twenty projects, finance records, reports, design assets, campaigns, automation runs, integration connections, and Atlas insights.

## Acceptance Checks

- App starts locally with all main routes registered.
- Every nav item opens a non-placeholder page shell.
- Demo user can access the app.
- Seed script produces coherent cross-domain data.
- Desktop and mobile shells have no overlapping text or controls.

